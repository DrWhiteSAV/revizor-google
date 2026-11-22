import { dispatchTaskTelegramNotification, rescheduleTaskCascade } from '../taskManager';
import { sendWebPushToUser } from '../../../server/routes/push/service';
import {
  sendTelegramRichMessage,
  isTelegramClientError,
  buildMorningBriefRichPayload,
  buildEveningRadarRichPayload
} from '../telegram';
import { ensureRevisorSchema } from './schema';
import {
  calculateTaskRisk,
  computeTaskProgress,
  findNextWorkingSlotWithLowLoad,
  getCadenceIntervalHours,
  getLocalTimeParts,
  isEmployeeWorkingToday,
  isWithinQuietHours,
  matchesSimpleCron
} from './scheduleUtils';

let isMonitorRunning = false;
let isDigestRunning = false;

function parseEscalationStages(raw: any): Set<string> {
  if (!raw) return new Set();
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function isDemoTask(task: any): boolean {
  const id = String(task.id || '');
  const pid = String(task.projectId || task.project_id || '');
  return (
    id.startsWith('task-zinaida') ||
    pid === 'proj-zinaida-1' ||
    pid === 'proj-zinaida-2' ||
    task.is_demo === 1 ||
    task.isDemo === 1
  );
}

/**
 * Warn owners of downstream dependent tasks when an upstream task enters high/critical risk.
 */
async function warnDependentTasksOnUpstreamRisk(
  db: any,
  upstreamTask: any,
  allActiveTasks: any[],
  projectMap: Map<string, any>,
  riskScore: number
) {
  const nowIso = new Date().toISOString();
  const lastWarned = upstreamTask.upstream_warned_at ? new Date(upstreamTask.upstream_warned_at).getTime() : 0;
  if (Date.now() - lastWarned < 24 * 3600 * 1000) return;

  const dependentTasks = allActiveTasks.filter((t: any) => {
    if (String(t.id) === String(upstreamTask.id)) return false;
    let deps: string[] = [];
    try {
      deps = typeof t.dependencies === 'string' ? JSON.parse(t.dependencies) : (t.dependencies || []);
    } catch {}
    if (t.dependentOnTaskId && !deps.includes(String(t.dependentOnTaskId))) {
      deps.push(String(t.dependentOnTaskId));
    }
    return deps.map(String).includes(String(upstreamTask.id));
  });

  if (dependentTasks.length === 0) return;

  await db.run('UPDATE tasks SET upstream_warned_at = ? WHERE id = ?', [nowIso, upstreamTask.id]).catch(() => {});

  for (const dep of dependentTasks) {
    const proj = projectMap.get(String(dep.projectId || dep.project_id || '')) || null;
    await dispatchTaskTelegramNotification({
      db,
      task: dep,
      project: proj,
      eventType: 'task_upstream_risk',
      extra: {
        upstreamTaskTitle: upstreamTask.title || upstreamTask.taskTitle || 'Связанная задача',
        riskScore,
        reasonText: `Задача-предшественник «${upstreamTask.title || upstreamTask.taskTitle}» имеет высокий риск задержки (${riskScore}/100). Рекомендуется подготовить промежуточные материалы или согласовать сдвиг.`
      }
    }).catch(() => {});

    await db.run(
      `INSERT INTO task_ai_interactions (
        id, task_id, project_id, company_id, user_id, user_name, kind,
        message, ai_advice, risk_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'upstream_warning', ?, ?, ?, ?)`,
      [
        `int_up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        dep.id,
        dep.projectId || null,
        dep.company_id || null,
        dep.executorId || null,
        dep.executorName || 'Исполнитель',
        `Предупреждение о риске по предшествующей задаче «${upstreamTask.title || upstreamTask.taskTitle}»`,
        `Индекс риска предшествующей задачи достиг ${riskScore}/100. Проверьте готовность к старту или запросите корректировку срока.`,
        riskScore,
        nowIso
      ]
    ).catch(() => {});
  }
}

/**
 * Main Proactive Task Supervisor Loop (runs every 5 minutes via Cron + manual trigger).
 */
export async function runProactiveTaskMonitor(db: any): Promise<{
  scanned: number;
  checkinsSent: number;
  remindersSent: number;
  escalationsSent: number;
  upstreamWarnings: number;
  autoShifted: number;
}> {
  const stats = {
    scanned: 0,
    checkinsSent: 0,
    remindersSent: 0,
    escalationsSent: 0,
    upstreamWarnings: 0,
    autoShifted: 0
  };

  if (isMonitorRunning) return stats;
  isMonitorRunning = true;

  try {
    await ensureRevisorSchema(db);

    const activeTasks = await db.all(
      `SELECT * FROM tasks WHERE status NOT IN ('completed', 'cancelled', 'verification') AND submitted_at IS NULL`
    );
    if (!activeTasks || activeTasks.length === 0) return stats;

    const projects = await db.all('SELECT * FROM projects').catch(() => []);
    const projectMap = new Map<string, any>();
    for (const p of projects) projectMap.set(String(p.id), p);

    const users = await db.all('SELECT id, name, timezone, role FROM users').catch(() => []);
    const userMap = new Map<string, any>();
    for (const u of users) userMap.set(String(u.id), u);

    // Precompute active task counts per executor
    const activeCountByEmp = new Map<string, number>();
    for (const t of activeTasks) {
      if (isDemoTask(t)) continue;
      const eid = String(t.executorId || t.executor_id || '');
      if (eid) activeCountByEmp.set(eid, (activeCountByEmp.get(eid) || 0) + 1);
    }

    // Past rescheduled count lookup per executor
    const rescheduledByEmp = new Map<string, number>();
    const allRescheduled = await db.all(
      `SELECT executorId, COALESCE(rescheduled_count, 0) as rc FROM tasks WHERE COALESCE(rescheduled_count, 0) > 0`
    ).catch(() => []);
    for (const r of allRescheduled) {
      const eid = String(r.executorId || r.executorid || '');
      if (eid) rescheduledByEmp.set(eid, (rescheduledByEmp.get(eid) || 0) + Number(r.rc || 0));
    }

    const now = new Date();
    const nowIso = now.toISOString();

    for (const task of activeTasks) {
      if (isDemoTask(task)) continue;
      stats.scanned++;

      const project = projectMap.get(String(task.projectId || task.project_id || '')) || null;
      const execId = String(task.executorId || task.executor_id || '');
      const execUser = execId ? userMap.get(execId) : null;
      const tz = execUser?.timezone || project?.timezone || 'Europe/Moscow';
      const localParts = getLocalTimeParts(now, tz);

      const autonomyMode: string = task.autonomy_mode || project?.autonomy_mode || 'controller';
      const checkCadence: string = task.check_cadence || project?.check_cadence || 'daily';
      const quietStart = project?.quiet_hours_start || '21:00';
      const quietEnd = project?.quiet_hours_end || '08:30';
      const inQuietHours = isWithinQuietHours(localParts.totalMinutes, quietStart, quietEnd);

      const shiftStatus = await isEmployeeWorkingToday(
        db,
        execId || null,
        localParts.dateKey,
        localParts.totalMinutes,
        localParts.dayOfWeek
      );

      const progressPercent = computeTaskProgress(task);
      const { riskScore, riskLevel, elapsedRatio, hoursUntilDeadline, reasons } = calculateTaskRisk({
        task,
        now,
        progressPercent,
        concurrentActiveTasks: activeCountByEmp.get(execId) || 1,
        employeePastOverdueCount: rescheduledByEmp.get(execId) || 0
      });

      // Persist updated risk metrics quietly
      if (
        Number(task.risk_score || 0) !== riskScore ||
        String(task.risk_level || 'low') !== riskLevel ||
        Number(task.progress_percent || 0) !== progressPercent
      ) {
        await db.run(
          `UPDATE tasks SET risk_score = ?, risk_level = ?, progress_percent = ? WHERE id = ?`,
          [riskScore, riskLevel, progressPercent, task.id]
        ).catch(() => {});
      }

      // Upstream risk warning for downstream tasks (even outside quiet hours if critical)
      if (riskScore >= 65) {
        const beforeWarn = task.upstream_warned_at;
        await warnDependentTasksOnUpstreamRisk(db, task, activeTasks, projectMap, riskScore);
        if (!beforeWarn && riskScore >= 65) stats.upstreamWarnings++;
      }

      // Respect quiet hours & non-working days for routine check-ins and reminders
      const canSendRoutineMessage = !inQuietHours && shiftStatus.isWorkingDay;
      const sentStages = parseEscalationStages(task.escalation_log);
      let escalationChanged = false;

      // 1. Multi-day advance reminder (reminder_days_before)
      const daysBefore = Number(task.reminder_days_before || 0);
      if (
        canSendRoutineMessage &&
        daysBefore > 0 &&
        hoursUntilDeadline > 0 &&
        hoursUntilDeadline <= daysBefore * 24 &&
        hoursUntilDeadline > (task.reminder_minutes || 60) / 60 &&
        !sentStages.has('days_before')
      ) {
        sentStages.add('days_before');
        escalationChanged = true;
        stats.remindersSent++;
        await dispatchTaskTelegramNotification({
          db,
          task: { ...task, progress_percent: progressPercent },
          project,
          eventType: 'task_reminder',
          extra: { riskScore, progressPercent }
        }).catch(() => {});
      }

      // 2. Final deadline approaching reminder (reminder_minutes + deadline_time)
      const reminderHours = Math.max(0.25, Number(task.reminder_minutes || 60) / 60);
      if (
        canSendRoutineMessage &&
        hoursUntilDeadline > 0 &&
        hoursUntilDeadline <= reminderHours &&
        !sentStages.has('minutes_before')
      ) {
        sentStages.add('minutes_before');
        escalationChanged = true;
        stats.remindersSent++;
        await db.run('UPDATE tasks SET telegram_alert_sent = 1 WHERE id = ?', [task.id]).catch(() => {});
        await dispatchTaskTelegramNotification({
          db,
          task: { ...task, progress_percent: progressPercent },
          project,
          eventType: 'task_reminder',
          extra: { riskScore, progressPercent }
        }).catch(() => {});
      }

      // 3. Stagnation detector & Cadence-based proactive AI check-in
      if (canSendRoutineMessage && hoursUntilDeadline > 0) {
        const lastCheckinMs = task.last_checkin_at ? new Date(task.last_checkin_at).getTime() : 0;
        const hoursSinceCheckin = (now.getTime() - lastCheckinMs) / (1000 * 3600);
        const intervalHours = getCadenceIntervalHours(checkCadence);

        const isCadenceDue =
          (checkCadence === 'custom_cron' && matchesSimpleCron(task.custom_check_cron, localParts) && hoursSinceCheckin >= 0.9) ||
          (intervalHours !== null && hoursSinceCheckin >= intervalHours && shiftStatus.isWorkingHours);

        const isStagnationTrigger =
          elapsedRatio >= 0.45 &&
          progressPercent < 15 &&
          !sentStages.has('midpoint_stagnation') &&
          hoursSinceCheckin >= 3;

        if (isStagnationTrigger || (isCadenceDue && checkCadence !== 'before_deadline' && checkCadence !== 'daily')) {
          const checkinNote = isStagnationTrigger
            ? `Прошло уже ${Math.round(elapsedRatio * 100)}% времени до дедлайна, а заполнение составляет ${progressPercent}%. Все ли понятно или нужна подсказка ИИ?`
            : `Плановый чекин (${checkCadence}): текущий прогресс ${progressPercent}%. Отметьте статус или откройте черновую предпроверку.`;

          if (isStagnationTrigger) {
            sentStages.add('midpoint_stagnation');
            escalationChanged = true;
          }

          stats.checkinsSent++;
          await db.run(
            `UPDATE tasks SET last_checkin_at = ?, checkin_count = COALESCE(checkin_count, 0) + 1 WHERE id = ?`,
            [nowIso, task.id]
          ).catch(() => {});

          await db.run(
            `INSERT INTO task_ai_interactions (
              id, task_id, project_id, company_id, user_id, user_name, kind,
              message, ai_advice, risk_score, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'checkin_auto', ?, ?, ?, ?)`,
            [
              `int_chk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              task.id,
              task.projectId || null,
              task.company_id || null,
              execId || null,
              task.executorName || 'Исполнитель',
              isStagnationTrigger ? 'Автоматический чекин при отсутствии прогресса' : `Регулярный чекин (${checkCadence})`,
              checkinNote,
              riskScore,
              nowIso
            ]
          ).catch(() => {});

          await dispatchTaskTelegramNotification({
            db,
            task: { ...task, progress_percent: progressPercent },
            project,
            eventType: 'task_checkin_nudge',
            extra: {
              progressPercent,
              riskScore,
              aiSummary: checkinNote
            }
          }).catch(() => {});
        }
      }

      // 4. Escalation & Smart Autopilot Deadline Handling on Overdue
      if (hoursUntilDeadline < -1 && !sentStages.has('overdue_notified') && canSendRoutineMessage) {
        sentStages.add('overdue_notified');
        escalationChanged = true;
        stats.escalationsSent++;
        await dispatchTaskTelegramNotification({
          db,
          task,
          project,
          eventType: 'task_overdue',
          extra: { riskScore, reasonText: reasons.join('; ') }
        }).catch(() => {});
      }

      if (
        hoursUntilDeadline < -6 &&
        autonomyMode !== 'observer' &&
        !sentStages.has('manager_escalation') &&
        canSendRoutineMessage
      ) {
        sentStages.add('manager_escalation');
        escalationChanged = true;
        stats.escalationsSent++;
        await dispatchTaskTelegramNotification({
          db,
          task,
          project,
          eventType: 'task_escalation',
          extra: {
            riskScore,
            reasonText: reasons.join('; ') || 'Просрочка дедлайна свыше 6 рабочих часов.'
          }
        }).catch(() => {});
      }

      // 5. Smart Autopilot shift (strictly only in 'autopilot' mode, max 1 auto shift)
      if (
        autonomyMode === 'autopilot' &&
        hoursUntilDeadline < -24 &&
        Number(task.rescheduled_count || 0) < 1 &&
        !sentStages.has('autopilot_shifted')
      ) {
        const maxShift = Math.max(1, Math.min(5, Number(project?.max_auto_shift_days || 2)));
        const smartSlot = await findNextWorkingSlotWithLowLoad(
          db,
          execId || null,
          String(task.deadLine || localParts.dateKey),
          1,
          maxShift
        );

        const shiftResult = await rescheduleTaskCascade(
          db,
          task.id,
          smartSlot.shiftDays,
          `Умный автопилот ИИ: ${smartSlot.workloadNote}`,
          'ai'
        );

        sentStages.add('autopilot_shifted');
        escalationChanged = true;
        stats.autoShifted++;

        await db.run(
          `UPDATE tasks SET last_ai_check_at = ? WHERE id = ?`,
          [nowIso, task.id]
        ).catch(() => {});

        await dispatchTaskTelegramNotification({
          db,
          task,
          project,
          eventType: 'task_rescheduled',
          extra: {
            previousDeadline: shiftResult.previousDeadline,
            newDeadline: shiftResult.newDeadline,
            shiftDays: smartSlot.shiftDays,
            cascadedCount: shiftResult.cascadedTasksCount
          }
        }).catch(() => {});
      }

      if (escalationChanged) {
        await db.run(
          `UPDATE tasks SET escalation_log = ?, escalation_level = ? WHERE id = ?`,
          [JSON.stringify(Array.from(sentStages)), sentStages.size, task.id]
        ).catch(() => {});
      }
    }

    return stats;
  } catch (err: any) {
    console.error('[Proactive Task Monitor Error]:', err?.message || err);
    return stats;
  } finally {
    isMonitorRunning = false;
  }
}

/**
 * Outbound-only Morning Employee Focus Brief & Evening Executive Summary.
 * Deduplicated per user/company/day via revisor_digest_logs.
 */
export async function sendMorningAndEveningDigests(db: any) {
  if (isDigestRunning) return;
  isDigestRunning = true;

  try {
    await ensureRevisorSchema(db);
    const now = new Date();
    const localParts = getLocalTimeParts(now, 'Europe/Moscow');

    const isMorningWindow = localParts.totalMinutes >= 9 * 60 && localParts.totalMinutes <= 10 * 60 + 15;
    const isEveningWindow = localParts.totalMinutes >= 18 * 60 && localParts.totalMinutes <= 19 * 60 + 15;
    if (!isMorningWindow && !isEveningWindow) return;

    const configRow = await db.get("SELECT * FROM telegram_bot_config WHERE id = 'default'").catch(() => null);
    const botToken = configRow?.botToken || process.env.TELEGRAM_BOT_TOKEN || '8598472380:AAEfgSiqsOJx4mA3Jk5DKYW8AUFgLGV4Sc8';
    const appOrigin = process.env.APP_URL || 'https://ii-rr.ru';

    const activeTasks = await db.all(
      `SELECT * FROM tasks WHERE status NOT IN ('completed', 'cancelled')`
    ).catch(() => []);
    const cleanTasks = activeTasks.filter((t: any) => !isDemoTask(t));
    if (cleanTasks.length === 0) return;

    // 1. Morning Focus Brief per employee with active tasks
    if (isMorningWindow) {
      const byExecutor = new Map<string, any[]>();
      for (const t of cleanTasks) {
        const eid = String(t.executorId || t.executor_id || '');
        if (!eid) continue;
        if (!byExecutor.has(eid)) byExecutor.set(eid, []);
        byExecutor.get(eid)!.push(t);
      }

      for (const [eid, empTasks] of byExecutor.entries()) {
        const shift = await isEmployeeWorkingToday(db, eid, localParts.dateKey, localParts.totalMinutes, localParts.dayOfWeek);
        if (!shift.isWorkingDay) continue;

        const alreadySent = await db.get(
          `SELECT id FROM revisor_digest_logs WHERE user_id = ? AND digest_type = 'morning' AND date_key = ? LIMIT 1`,
          [eid, localParts.dateKey]
        ).catch(() => null);
        if (alreadySent) continue;

        const u = await db.get('SELECT id, name, telegram_id, company_id FROM users WHERE id = ?', [eid]).catch(() => null);
        if (!u) continue;

        const sorted = [...empTasks].sort((a, b) => String(a.deadLine || '').localeCompare(String(b.deadLine || ''))).slice(0, 5);
        const lines = sorted.map((t, i) => {
          const dl = String(t.deadLine || '—').slice(0, 10);
          const riskTag = Number(t.risk_score || 0) >= 55 ? ' ⚠️ высокий риск' : '';
          return `${i + 1}. **${t.title || t.taskTitle}** — срок ${dl}${riskTag}`;
        });

        await db.run(
          `INSERT INTO revisor_digest_logs (id, company_id, user_id, digest_type, date_key, sent_at) VALUES (?, ?, ?, 'morning', ?, ?)`,
          [`dig_m_${Date.now()}_${eid}`, u.company_id || null, eid, localParts.dateKey, now.toISOString()]
        ).catch(() => {});

        const morningTitle = '☀️ Утренний фокус ИИ-Ревизора на сегодня';
        const morningBody = `Активных задач: ${empTasks.length}. Главные: ${sorted.slice(0, 2).map(t => t.title || t.taskTitle).join(', ')}.`;
        await db.run(
          `INSERT INTO notifications (id, userId, title, message, type, isRead, timestamp, actionUrl)
           VALUES (?, ?, ?, ?, 'task_digest', 0, CURRENT_TIMESTAMP, '/cabinet/revisor')`,
          [
            `notif_mb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            eid,
            morningTitle,
            morningBody
          ]
        ).catch(() => {});

        sendWebPushToUser(db, String(eid), {
          title: morningTitle,
          body: morningBody,
          url: '/cabinet/revisor',
          tag: `revisor-morning-${eid}-${localParts.dateKey}`,
          category: 'tasks'
        }).catch(() => {});

        if (u.telegram_id) {
          const morningBuilt = buildMorningBriefRichPayload({
            employeeName: u.name || 'коллега',
            totalActive: empTasks.length,
            tasks: sorted.map(t => ({
              title: t.title || t.taskTitle || 'Задача',
              deadline: String(t.deadLine || '—').slice(0, 10),
              riskScore: Number(t.risk_score || 0)
            })),
            revisorUrl: `${appOrigin}/cabinet/revisor`
          });
          await sendTelegramRichMessage({
            chatId: String(u.telegram_id),
            blocks: morningBuilt.blocks,
            markdown: morningBuilt.fallbackMarkdown,
            buttons: morningBuilt.buttonsString,
            botToken
          }).catch((e) => {
            if (!isTelegramClientError(e?.message)) console.warn('[Morning Brief TG]', e?.message);
          });
        }
      }
    }

    // 2. Evening Executive Summary per company director/manager
    if (isEveningWindow) {
      const companies = await db.all('SELECT DISTINCT company_id FROM tasks WHERE company_id IS NOT NULL').catch(() => []);
      for (const row of companies) {
        const compId = String(row.company_id || '');
        if (!compId) continue;

        const alreadySent = await db.get(
          `SELECT id FROM revisor_digest_logs WHERE company_id = ? AND digest_type = 'evening' AND date_key = ? LIMIT 1`,
          [compId, localParts.dateKey]
        ).catch(() => null);
        if (alreadySent) continue;

        const compTasks = cleanTasks.filter((t: any) => String(t.company_id || '') === compId);
        const highRisk = compTasks.filter((t: any) => Number(t.risk_score || 0) >= 55);
        const stuckTasks = compTasks.filter((t: any) => t.blocker_status && t.blocker_status !== 'none');

        const director = await db.get(
          `SELECT id, name, telegram_id FROM users WHERE (company_id = ? OR company_id = ?) AND role IN ('DIRECTOR', 'ADMIN', 'SUPER_ADMIN') LIMIT 1`,
          [compId, compId.replace(/^com-/, '')]
        ).catch(() => null);
        if (!director) continue;

        await db.run(
          `INSERT INTO revisor_digest_logs (id, company_id, user_id, digest_type, date_key, sent_at) VALUES (?, ?, ?, 'evening', ?, ?)`,
          [`dig_e_${Date.now()}_${compId}`, compId, director.id, localParts.dateKey, now.toISOString()]
        ).catch(() => {});

        const msg = `Активных задач: ${compTasks.length}, в зоне повышенного риска: ${highRisk.length}, с отмеченными затруднениями: ${stuckTasks.length}.`;
        const eveningTitle = '🌙 Вечерний радар руководителя (ИИ-Ревизор)';
        await db.run(
          `INSERT INTO notifications (id, userId, title, message, type, isRead, timestamp, actionUrl)
           VALUES (?, ?, ?, ?, 'task_digest', 0, CURRENT_TIMESTAMP, '/cabinet/revisor/doctor')`,
          [
            `notif_eb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            director.id,
            eveningTitle,
            msg
          ]
        ).catch(() => {});

        sendWebPushToUser(db, String(director.id), {
          title: eveningTitle,
          body: msg,
          url: '/cabinet/revisor/doctor',
          tag: `revisor-evening-${compId}-${localParts.dateKey}`,
          category: 'tasks'
        }).catch(() => {});

        if (director.telegram_id) {
          const radarBuilt = buildEveningRadarRichPayload({
            activeCount: compTasks.length,
            highRiskCount: highRisk.length,
            stuckCount: stuckTasks.length,
            riskTasks: highRisk.slice(0, 5).map((t: any) => ({
              title: t.title || t.taskTitle || 'Задача',
              executorName: t.executorName || 'Исполнитель',
              riskScore: Number(t.risk_score || 60),
              deadline: String(t.deadLine || '').slice(0, 10)
            })),
            doctorUrl: `${appOrigin}/cabinet/revisor/doctor`
          });

          await sendTelegramRichMessage({
            chatId: String(director.telegram_id),
            blocks: radarBuilt.blocks,
            markdown: radarBuilt.fallbackMarkdown,
            buttons: radarBuilt.buttonsString,
            botToken
          }).catch(() => {});
        }
      }
    }
  } catch (err: any) {
    console.error('[Revisor Digest Error]:', err?.message || err);
  } finally {
    isDigestRunning = false;
  }
}

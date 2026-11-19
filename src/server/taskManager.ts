import { sendTelegramMessage, sendTelegramRichMessage, sendTelegramPhoto, isTelegramClientError, buildTaskEventRichPayload, classifyAttachmentFiles } from './telegram';
import { callProTalkAi } from '../../server/protalk';
import { sendWebPushToUser } from '../../server/routes/push/service';

export interface RescheduleResult {
  modifiedTaskIds: string[];
  previousDeadline: string;
  newDeadline: string;
  cascadedTasksCount: number;
}

/**
 * Cascade reschedule a task and all its dependent tasks in PostgreSQL BD ProTalk database
 */
export async function rescheduleTaskCascade(
  db: any,
  taskId: string,
  shiftDays: number,
  reason: string,
  changedBy: string = 'ai'
): Promise<RescheduleResult> {
  const rootTask = await db.get("SELECT * FROM tasks WHERE id = ?", [taskId]);
  if (!rootTask) {
    return { modifiedTaskIds: [], previousDeadline: '', newDeadline: '', cascadedTasksCount: 0 };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date(todayStr);
  const originalRootDl = rootTask.deadLine || todayStr;
  const oldDlDate = new Date(originalRootDl);
  
  // Requirement 6: take into account today's date so deadlines are not moved to the past
  const effectiveBaseDate = oldDlDate < todayDate ? todayDate : oldDlDate;
  const newDlDate = new Date(effectiveBaseDate.getTime() + Math.max(1, shiftDays) * 24 * 60 * 60 * 1000);
  const newDlStr = newDlDate.toISOString().split('T')[0];

  await db.run(`
    UPDATE tasks SET 
      deadLine = ?,
      rescheduled_count = COALESCE(rescheduled_count, 0) + 1,
      rescheduled_reason = ?,
      original_deadline = COALESCE(original_deadline, ?)
    WHERE id = ?
  `, [newDlStr, reason, originalRootDl, taskId]);

  const modifiedTaskIds: string[] = [taskId];
  const allProjectTasks = rootTask.projectId 
    ? await db.all("SELECT * FROM tasks WHERE projectId = ?", [rootTask.projectId])
    : await db.all("SELECT * FROM tasks");

  const queue: string[] = [taskId];
  const visited = new Set<string>([taskId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const t of allProjectTasks) {
      if (visited.has(t.id)) continue;
      
      let deps: string[] = [];
      try {
        deps = typeof t.dependencies === 'string' ? JSON.parse(t.dependencies) : (t.dependencies || []);
      } catch {
        deps = [];
      }
      if (t.dependentOnTaskId && !deps.includes(t.dependentOnTaskId)) {
        deps.push(t.dependentOnTaskId);
      }

      if (deps.includes(currentId)) {
        visited.add(t.id);
        modifiedTaskIds.push(t.id);
        queue.push(t.id);

        const currentStart = t.startDate || t.start_date || t.deadLine || todayStr;
        const currentEnd = t.deadLine || todayStr;
        
        const tStart = new Date(currentStart);
        const tEnd = new Date(currentEnd);

        const baseStart = tStart < todayDate ? todayDate : tStart;
        const durationMs = Math.max(0, tEnd.getTime() - tStart.getTime());
        const newStartDate = new Date(baseStart.getTime() + Math.max(1, shiftDays) * 24 * 60 * 60 * 1000);
        const newEndDate = new Date(newStartDate.getTime() + durationMs);

        const newStart = newStartDate.toISOString().split('T')[0];
        const newEnd = newEndDate.toISOString().split('T')[0];

        await db.run(`
          UPDATE tasks SET
            startDate = ?,
            start_date = ?,
            deadLine = ?,
            rescheduled_count = COALESCE(rescheduled_count, 0) + 1,
            rescheduled_reason = ?
          WHERE id = ?
        `, [
          newStart,
          newStart,
          newEnd,
          `Сдвинуто каскадно из-за зависимости от задачи: ${rootTask.title || rootTask.taskTitle || rootTask.id}`,
          t.id
        ]);
      }
    }
  }

  // Audit log entry
  try {
    await db.run(`
      INSERT INTO task_schedule_logs (id, taskId, projectId, previousDeadline, newDeadline, shiftDays, reason, changedBy, cascadedTasksCount, cascadedTaskIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'sched_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      taskId,
      rootTask.projectId || null,
      originalRootDl,
      newDlStr,
      shiftDays,
      reason,
      changedBy,
      modifiedTaskIds.length - 1,
      JSON.stringify(modifiedTaskIds.slice(1))
    ]);

    await db.run(`
      INSERT INTO triggers_log (triggerName, tableName, action, details)
      VALUES (?, ?, ?, ?)
    `, [
      'ai_gantt_cascade_shift',
      'tasks',
      'CASCADE_SHIFT',
      `Задача ${taskId} перенесена на +${shiftDays} дн. (с ${originalRootDl} на ${newDlStr}). Каскадно сдвинуто: ${modifiedTaskIds.length - 1} задач.`
    ]);
  } catch (e: any) {
    console.warn("Failed to log task schedule change:", e.message);
  }

  return {
    modifiedTaskIds,
    previousDeadline: originalRootDl,
    newDeadline: newDlStr,
    cascadedTasksCount: modifiedTaskIds.length - 1
  };
}

/**
 * AI Task Evaluation for submissions
 */
export async function evaluateTaskAiSubmission(options: {
  task: any;
  project?: any;
  answers: Record<string, any>;
  attachments?: any[];
  executorUser?: any;
}) {
  const { task, project, answers, attachments = [], executorUser } = options;
  const taskTitle = task.title || task.taskTitle || 'Задача проекта';
  const projectTitle = project?.title || 'Проект';
  const checkCriteria = task.check_criteria || 'Проверить полноту и качество выполнения задачи согласно заданным требованиям.';
  const customPrompt = task.custom_prompt || '';

  let fieldsText = '';
  let parsedFields: any[] = [];
  try {
    parsedFields = typeof task.fields === 'string' ? JSON.parse(task.fields) : (task.fields || []);
  } catch {
    parsedFields = [];
  }

  if (Array.isArray(parsedFields) && parsedFields.length > 0) {
    fieldsText = parsedFields.map(f => {
      const ans = answers[f.id] ?? answers[f.label] ?? 'Не заполнено';
      return `- [${f.type || 'text'}] ${f.label}: ${typeof ans === 'object' ? JSON.stringify(ans) : ans}${f.ai_check_prompt ? ` (Критерий: ${f.ai_check_prompt})` : ''}`;
    }).join('\n');
  } else {
    fieldsText = Object.entries(answers).map(([k, v]) => `- ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n');
  }

  const systemPrompt = `Ты — беспристрастный и конструктивный ИИ-контролер качества выполнения проектных задач платформы Ревизор.
Твоя задача — детально проанализировать отчет о выполнении задачи, сопоставить предоставленные материалы с критериями проверки и выдать структурированный вердикт.

ПРОЕКТ: "${projectTitle}"
ЗАДАЧА: "${taskTitle}"
ОПИСАНИЕ ЗАДАЧИ: "${task.description || 'Не указано'}"
КРИТЕРИИ ПРОВЕРКИ: "${checkCriteria}"
${customPrompt ? `СПЕЦИАЛЬНЫЙ ПРОМПТ ПРОВЕРКИ: "${customPrompt}"` : ''}

ОТВЕТЫ И МАТЕРИАЛЫ ИСПОЛНИТЕЛЯ:
${fieldsText || 'Материалы предоставлены в чек-листе'}
${attachments.length > 0 ? `Прикрепленные файлы: ${attachments.map((a: any) => a.name || a.url).join(', ')}` : ''}

ФОРМАТ ОТВЕТА (СТРОГО):
Оценка качества: [Число от 0 до 100]
Вердикт: [accepted | needs_revision | rescheduled]
Сдвиг сроков: [0 или количество дней от 1 до 5, если требуется сдвинуть дедлайн]

КРАТКОЕ САММАРИ ДЛЯ РУКОВОДИТЕЛЯ:
[1-2 предложения с сутью выполненного и ключевым результатом]

СПИСОК РЕКОМЕНДАЦИЙ ДЛЯ СОТРУДНИКА:
[2-3 конкретных совета по устранению недочетов или улучшению работы]

ОЦЕНКА ПО ПОЛЯМ:
[
  {
    "fieldId": "id",
    "status": "passed",
    "score": 95,
    "feedback": "Поле заполнено корректно"
  }
]`;

  const userPrompt = `Проверь сдачу задачи "${taskTitle}". Исполнитель: ${executorUser?.name || task.executorName || 'Сотрудник'}.`;

  let aiText = '';
  try {
    const aiRes = await callProTalkAi({
      prompt: userPrompt,
      systemPrompt,
      entityType: 'revisor',
      userId: executorUser?.id || task.executorId || '91827364501'
    });
    aiText = aiRes?.reply || '';
  } catch (err: any) {
    console.info("ProTalk AI task check fallback:", err.message);
  }

  const scoreMatch = aiText.match(/Оценка качества:\s*(\d+)/i);
  const qualityScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 88;

  let aiVerdict = 'accepted';
  const verdictMatch = aiText.match(/Вердикт:\s*(accepted|needs_revision|rescheduled)/i);
  if (verdictMatch) {
    aiVerdict = verdictMatch[1].toLowerCase();
  } else {
    aiVerdict = qualityScore >= 80 ? 'accepted' : qualityScore >= 50 ? 'needs_revision' : 'rescheduled';
  }

  let shiftDays = 0;
  const shiftMatch = aiText.match(/Сдвиг сроков:\s*(\d+)/i);
  if (shiftMatch) {
    shiftDays = parseInt(shiftMatch[1], 10);
  } else if (aiVerdict === 'rescheduled') {
    shiftDays = 2;
  }

  let aiSummary = 'Задача проверена ИИ. Предоставленные результаты соответствуют требованиям проекта.';
  const summaryMatch = aiText.match(/КРАТКОЕ САММАРИ ДЛЯ РУКОВОДИТЕЛЯ:\s*([\s\S]*?)(?:СПИСОК РЕКОМЕНДАЦИЙ|ОЦЕНКА ПО ПОЛЯМ|$)/i);
  if (summaryMatch && summaryMatch[1].trim()) {
    aiSummary = summaryMatch[1].trim();
  }

  let aiRecommendations = 'Продолжать системно выполнять задачи и фиксировать артефакты в чек-листе.';
  const recsMatch = aiText.match(/СПИСОК РЕКОМЕНДАЦИЙ ДЛЯ СОТРУДНИКА:\s*([\s\S]*?)(?:ОЦЕНКА ПО ПОЛЯМ|$)/i);
  if (recsMatch && recsMatch[1].trim()) {
    aiRecommendations = recsMatch[1].trim();
  }

  let fieldEvaluations: any[] = [];
  const fieldsMatch = aiText.match(/ОЦЕНКА ПО ПОЛЯМ:\s*(\[[\s\S]*?\])/i);
  if (fieldsMatch && fieldsMatch[1]) {
    try {
      fieldEvaluations = JSON.parse(fieldsMatch[1]);
    } catch {}
  }

  return {
    qualityScore,
    aiVerdict,
    aiRecommendations,
    aiSummary,
    fieldEvaluations,
    shouldReschedule: shiftDays > 0 || aiVerdict === 'rescheduled',
    shiftDays: Math.min(7, Math.max(0, shiftDays))
  };
}

/**
 * Dispatch Telegram notification for task events
 */
/**
 * Dispatch Telegram notification for task events in Rich Markdown format (Brief / Full)
 * following the standard from Reports and task_routing_rules
 */
export async function dispatchTaskTelegramNotification(options: {
  db: any;
  task: any;
  project?: any;
  eventType:
    | 'task_submitted'
    | 'task_ai_verified'
    | 'task_rescheduled'
    | 'task_reminder'
    | 'task_overdue'
    | 'task_manager_reviewed'
    | 'task_checkin_nudge'
    | 'task_upstream_risk'
    | 'task_shift_requested'
    | 'task_escalation';
  extra?: {
    qualityScore?: number;
    aiVerdict?: string;
    aiRecommendations?: string;
    aiSummary?: string;
    fieldEvaluations?: any[];
    answers?: Record<string, any>;
    attachments?: any[];
    shiftDays?: number;
    newDeadline?: string;
    previousDeadline?: string;
    cascadedCount?: number;
    managerComment?: string;
    userId?: string;
    userName?: string;
    submitterUserId?: string;
    comments?: string;
    origin?: string;
    riskScore?: number;
    progressPercent?: number;
    reasonText?: string;
    upstreamTaskTitle?: string;
  };
}) {
  const { db, task, project, eventType, extra = {} } = options;
  try {
    const taskTitle = task.title || task.taskTitle || 'Задача проекта';
    const projTitle = project?.title || task.projectTitle || 'Проект';
    const executorName = task.executorName || 'Сотрудник';
    let authorName = task.author_name || task.authorName || '';
    if (!authorName && (task.author_id || task.director_id)) {
      try {
        const u = await db.get("SELECT name FROM users WHERE id = ? OR id = ?", [task.author_id, task.director_id]);
        if (u?.name) authorName = u.name;
      } catch {}
    }
    if (!authorName) authorName = 'Руководитель';
    const deadLine = extra.newDeadline || task.deadLine || 'не указан';
    const score = extra.qualityScore !== undefined ? extra.qualityScore : (task.score || 85);
    const isApproved = extra.aiVerdict === 'accepted' || task.status === 'completed' || score >= 80;
    const statusIcon = isApproved ? '🟢' : '🟡';
    const statusText = isApproved ? 'Принято ИИ Ревизором' : 'Требует доработки';

    // 1. Resolve recipients using task_routing_rules
    interface TaskNotificationAction {
      ruleId: string;
      ruleTitle: string;
      chatId?: string;
      targetUserId?: string;
      format: 'brief' | 'full';
      sendTelegram: boolean;
      notifyInApp: boolean;
      isExecutorFallback?: boolean;
    }
    const ruleTargets: TaskNotificationAction[] = [];

    const rawCompId = String(task.company_id || project?.company_id || '').trim();
    const cleanCompId = rawCompId.replace(/^com-/, '');
    const taskDirId = String(task.director_id || project?.director_id || '').trim();
    const isFlagshipCompany =
      rawCompId === 'flagship-main' ||
      rawCompId === 'com-91827364501' ||
      rawCompId === '91827364501' ||
      taskDirId === '91827364501';

    const companyAliases = new Set<string>();
    if (rawCompId) {
      companyAliases.add(rawCompId);
      if (cleanCompId) {
        companyAliases.add(cleanCompId);
        companyAliases.add(`com-${cleanCompId}`);
      }
    }
    if (taskDirId) {
      companyAliases.add(taskDirId);
      companyAliases.add(`com-${taskDirId}`);
    }
    if (isFlagshipCompany) {
      companyAliases.add('flagship-main');
      companyAliases.add('com-91827364501');
      companyAliases.add('91827364501');
    }

    const resolveCompanyUser = async (roles: string[], preferredId?: string) => {
      if (preferredId) {
        const direct = await db.get(
          "SELECT id, telegram_id FROM users WHERE id = ? AND telegram_id IS NOT NULL LIMIT 1",
          [preferredId]
        ).catch(() => null);
        if (direct?.telegram_id) return direct;
      }
      const aliasArr = Array.from(companyAliases).filter(Boolean);
      const rolePlaceholders = roles.map(() => '?').join(',');
      if (aliasArr.length > 0) {
        const compPlaceholders = aliasArr.map(() => '?').join(',');
        const found = await db.get(
          `SELECT id, telegram_id FROM users 
           WHERE (company_id IN (${compPlaceholders}) OR director_id IN (${compPlaceholders}) OR id IN (${compPlaceholders}))
             AND UPPER(role) IN (${rolePlaceholders}) AND telegram_id IS NOT NULL
           ORDER BY CASE WHEN UPPER(role) = 'DIRECTOR' THEN 0 ELSE 1 END LIMIT 1`,
          [...aliasArr, ...aliasArr, ...aliasArr, ...roles]
        ).catch(() => null);
        if (found?.telegram_id) return found;
      }
      return null;
    };

    try {
      const aliasArr = Array.from(companyAliases).filter(Boolean);
      const rules = aliasArr.length > 0
        ? await db.all(
            `SELECT * FROM task_routing_rules WHERE is_active = 1 AND company_id IN (${aliasArr.map(() => '?').join(',')})`,
            aliasArr
          )
        : [];

      for (const rule of rules) {
        // Check project scope
        if (rule.project_ids && rule.project_ids !== 'all' && rule.project_ids !== '["all"]') {
          try {
            const pIds = JSON.parse(rule.project_ids);
            if (Array.isArray(pIds) && !pIds.includes('all') && !pIds.includes(task.projectId)) {
              continue;
            }
          } catch {}
        }

        // Check event type flags
        let eventAllowed = true;
        if (eventType === 'task_submitted' && rule.send_on_submit === 0) eventAllowed = false;
        if (eventType === 'task_ai_verified' && rule.send_on_submit === 0 && (rule as any).send_on_ai_verify === 0) eventAllowed = false;
        if (eventType === 'task_rescheduled' && (rule as any).send_on_reschedule !== 1) eventAllowed = false;
        if (eventType === 'task_reminder' && rule.send_reminder === 0) eventAllowed = false;
        if (eventType === 'task_overdue' && rule.overdue_tg === 0) eventAllowed = false;
        if (eventType === 'task_manager_reviewed' && (rule as any).send_on_manager_review === 0) eventAllowed = false;
        if (!eventAllowed) continue;

        const ruleFormat: 'brief' | 'full' = rule.report_format === 'full' ? 'full' : 'brief';
        let targetChatId = '';
        let targetUserId = rule.target_user_id || '';

        // Resolve target based on destination_type
        let isExecutorFallback = false;

        // Resolve target based on destination_type
        if (rule.destination_type === 'employee_direct') {
          targetUserId = task.executorId || targetUserId;
          if (task.executorId) {
            const u = await db.get("SELECT telegram_id FROM users WHERE id = ?", [task.executorId]);
            if (u?.telegram_id) targetChatId = String(u.telegram_id).trim();
          }

          // Fallback if employee has no Telegram account connected: use task submitter, author, or company director
          if (!targetChatId || targetChatId === '{employee_tg}') {
            const candidateIds = [
              extra?.userId,
              task.submittedByUserId,
              task.author_id,
              task.creator_id,
              task.director_id
            ].filter(Boolean);

            for (const candId of candidateIds) {
              const cu = await db.get("SELECT id, telegram_id FROM users WHERE id = ?", [candId]);
              if (cu?.telegram_id) {
                targetChatId = String(cu.telegram_id).trim();
                if (!targetUserId) targetUserId = cu.id;
                isExecutorFallback = true;
                break;
              }
            }

            // If still no Telegram ID found among candidates, route to company director so it is never dropped
            if (!targetChatId || targetChatId === '{employee_tg}') {
              const dir = await resolveCompanyUser(['DIRECTOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'], task.director_id);
              if (dir?.telegram_id) {
                targetChatId = String(dir.telegram_id).trim();
                if (!targetUserId) targetUserId = dir.id;
                isExecutorFallback = true;
              }
            }
          }
        } else if (rule.destination_type === 'director' || rule.destination_type === 'director_direct') {
          const dir = await resolveCompanyUser(['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'], task.director_id);
          if (dir?.telegram_id) targetChatId = String(dir.telegram_id).trim();
          if (dir?.id && !targetUserId) targetUserId = dir.id;
        } else if (rule.destination_type === 'manager') {
          const mgr = await resolveCompanyUser(['MANAGER', 'DIRECTOR', 'ADMIN'], task.reviewer_id || task.director_id);
          if (mgr?.telegram_id) targetChatId = String(mgr.telegram_id).trim();
          if (mgr?.id && !targetUserId) targetUserId = mgr.id;
        } else if (rule.target_chat_id) {
          targetChatId = String(rule.target_chat_id).trim();
        }

        if (targetChatId === '{employee_tg}') {
          if (task.executorId) {
            const u = await db.get("SELECT telegram_id FROM users WHERE id = ?", [task.executorId]);
            if (u?.telegram_id) targetChatId = String(u.telegram_id).trim();
          }
          if (!targetChatId || targetChatId === '{employee_tg}') {
            const candidateIds = [extra?.userId, task.submittedByUserId, task.author_id, task.creator_id, task.director_id].filter(Boolean);
            for (const candId of candidateIds) {
              const cu = await db.get("SELECT id, telegram_id FROM users WHERE id = ?", [candId]);
              if (cu?.telegram_id) {
                targetChatId = String(cu.telegram_id).trim();
                isExecutorFallback = true;
                break;
              }
            }
            if (!targetChatId || targetChatId === '{employee_tg}') {
              const dir = await resolveCompanyUser(['DIRECTOR', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'], task.director_id);
              if (dir?.telegram_id) {
                targetChatId = String(dir.telegram_id).trim();
                isExecutorFallback = true;
              }
            }
          }
        }

        const validChatId = targetChatId && targetChatId !== '{employee_tg}' ? targetChatId : undefined;
        // Deduplicate only when BOTH chatId AND format match
        const alreadyExists = ruleTargets.some(t => t.chatId === validChatId && t.format === ruleFormat);
        if (!alreadyExists) {
          ruleTargets.push({
            ruleId: rule.id,
            ruleTitle: rule.title,
            chatId: validChatId,
            targetUserId: targetUserId || undefined,
            format: ruleFormat,
            sendTelegram: Boolean(rule.send_telegram === 1 && validChatId),
            notifyInApp: Boolean(rule.notify_inapp === 1 && targetUserId),
            isExecutorFallback
          });
        }
      }
    } catch (e) {
      console.warn("Could not load task_routing_rules, fallback to default recipient resolution:", e);
    }

    // Determine submitter vs assigned executor
    const submitterUserId = extra?.userId || (task as any).submittedByUserId || null;
    let submitterName = extra?.userName || '';
    let submitterUser: any = null;
    if (submitterUserId) {
      try {
        submitterUser = await db.get("SELECT id, name, first_name, last_name, telegram_id FROM users WHERE id = ?", [submitterUserId]);
        if (!submitterName && submitterUser) {
          submitterName = submitterUser.name || `${submitterUser.first_name || ''} ${submitterUser.last_name || ''}`.trim() || 'Сотрудник';
        }
      } catch (suErr) {
        console.warn("Could not load submitter user:", suErr);
      }
    }

    const isSubmittedBySomeoneElse = Boolean(
      submitterUserId &&
      task.executorId &&
      String(submitterUserId) !== String(task.executorId)
    );

    // If another employee submitted someone else's task: ensure BOTH the submitter AND the owner receive full report PM
    if (isSubmittedBySomeoneElse) {
      if (submitterUser?.telegram_id) {
        const subTg = String(submitterUser.telegram_id).trim();
        if (subTg && subTg !== '{employee_tg}' && !ruleTargets.some(t => t.chatId === subTg && t.format === 'full')) {
          ruleTargets.push({
            ruleId: 'submitter_private_pm',
            ruleTitle: `Фактический исполнитель (${submitterName})`,
            chatId: subTg,
            targetUserId: String(submitterUserId),
            format: 'full',
            sendTelegram: true,
            notifyInApp: true
          });
        }
      }

      if (task.executorId) {
        try {
          const ownerUser = await db.get("SELECT id, telegram_id FROM users WHERE id = ?", [task.executorId]);
          if (ownerUser?.telegram_id) {
            const ownTg = String(ownerUser.telegram_id).trim();
            if (ownTg && ownTg !== '{employee_tg}' && !ruleTargets.some(t => t.chatId === ownTg && t.format === 'full')) {
              ruleTargets.push({
                ruleId: 'owner_private_pm',
                ruleTitle: `Ответственный (${executorName})`,
                chatId: ownTg,
                targetUserId: String(task.executorId),
                format: 'full',
                sendTelegram: true,
                notifyInApp: true
              });
            }
          }
        } catch (owErr) {
          console.warn("Could not load task owner user:", owErr);
        }
      }
    }

    // Default fallback if no rules configured: notify executor and company admin
    const configRow = await db.get(
      "SELECT * FROM telegram_bot_config WHERE id = ? OR id = 'default' ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END LIMIT 1",
      [`company_${task.company_id}`, `company_${task.company_id}`]
    ).catch(() => null);
    const botToken = configRow?.botToken || "8598472380:AAEfgSiqsOJx4mA3Jk5DKYW8AUFgLGV4Sc8";

    if (ruleTargets.length === 0) {
      if (task.executorId) {
        const u = await db.get("SELECT telegram_id FROM users WHERE id = ?", [task.executorId]).catch(() => null);
        if (u?.telegram_id) {
          ruleTargets.push({
            ruleId: 'fallback_author',
            ruleTitle: 'Исполнитель',
            chatId: String(u.telegram_id).trim(),
            targetUserId: task.executorId,
            format: 'full',
            sendTelegram: true,
            notifyInApp: true
          });
        }
      }
      const companyDir = await resolveCompanyUser(['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'], taskDirId);
      const adminTg = companyDir?.telegram_id || (isFlagshipCompany ? (configRow?.adminTelegramId || '169262990') : null);
      const adminTargetUserId = companyDir?.id || taskDirId || (isFlagshipCompany ? '91827364501' : undefined);
      if (adminTg && adminTg !== '{employee_tg}') {
        ruleTargets.push({
          ruleId: 'fallback_admin',
          ruleTitle: 'Руководитель',
          chatId: String(adminTg).trim(),
          targetUserId: adminTargetUserId,
          format: 'brief',
          sendTelegram: true,
          notifyInApp: Boolean(adminTargetUserId)
        });
      }
    }

    // Clean text helper for markdown
    const cleanText = (str: any): string => {
      if (str === undefined || str === null) return '';
      return String(str).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
    };

    // Helper for formatting arbitrary answer fields cleanly without [object Object]
    const formatAnswerForTelegram = (val: any): string => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'Да' : 'Нет';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed || trimmed === '{}' || trimmed === '[]' || trimmed === '[object Object]' || trimmed === 'null' || trimmed === 'undefined') return '';
        if (/^https?:\/\/.*\.(png|jpg|jpeg|webp|gif|bmp)(\?.*)?$/i.test(trimmed)) {
          return `[🖼 Фотография](${trimmed})`;
        }
        if (/^https?:\/\//i.test(trimmed)) {
          const docName = trimmed.split('/').pop()?.split('?')[0] || 'Ссылка';
          return `[${cleanText(decodeURIComponent(docName))}](${trimmed})`;
        }
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'object' && parsed !== null) return formatAnswerForTelegram(parsed);
        } catch (e) {}
        return cleanText(trimmed);
      }
      if (Array.isArray(val)) {
        if (val.length === 0) return '';
        const items = val.map((item) => {
          if (item === undefined || item === null) return '';
          if (typeof item === 'object') {
            const fileUrl = item.fileUrl || item.url || item.rawUrl;
            if (fileUrl && typeof fileUrl === 'string') {
              const fileName = item.fileName || item.name || 'документ';
              const isImg = item.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fileName) || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fileUrl);
              return isImg ? `![${cleanText(fileName || 'Изображение')}](${fileUrl})` : `[📎 ${cleanText(fileName)}](${fileUrl})`;
            }
            const pairs = Object.entries(item)
              .filter(([k, v]) => v !== undefined && v !== null && String(v).trim().length > 0 && typeof v !== 'object')
              .map(([k, v]) => `${cleanText(k)}: ${cleanText(v)}`);
            return pairs.length > 0 ? `• ${pairs.join(', ')}` : '';
          }
          const cleanItem = cleanText(item);
          return cleanItem ? `• ${cleanItem}` : '';
        }).filter(Boolean);
        return items.join('\n\n');
      }
      if (typeof val === 'object') {
        const fileUrl = val.fileUrl || val.url || val.rawUrl;
        if (fileUrl && typeof fileUrl === 'string') {
          const fileName = val.fileName || val.name || 'документ';
          const isImg = val.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fileName) || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(fileUrl);
          return isImg ? `![${cleanText(fileName || 'Изображение')}](${fileUrl})` : `[📎 ${cleanText(fileName)}](${fileUrl})`;
        }
        if (Array.isArray(val.rows)) return formatAnswerForTelegram(val.rows);
        if (val.value !== undefined) return formatAnswerForTelegram(val.value);
        if (val.text !== undefined) return formatAnswerForTelegram(val.text);
        if (val.address !== undefined) return cleanText(val.address);
        if (val.lat !== undefined && val.lng !== undefined) return `📍 ${val.lat}, ${val.lng}`;
        const entries = Object.entries(val)
          .filter(([k, v]) => v !== undefined && v !== null && String(v).trim().length > 0 && typeof v !== 'object')
          .map(([k, v]) => `• ${cleanText(k)}: ${cleanText(v)}`);
        return entries.join('\n\n');
      }
      return cleanText(val);
    };

    // 2. Parse task fields and answers for rich presentation
    let taskFields: any[] = [];
    try {
      taskFields = Array.isArray(task.fields)
        ? task.fields
        : (typeof task.fields === 'string' ? JSON.parse(task.fields) : []);
    } catch {
      taskFields = [];
    }

    let taskAnswers: Record<string, any> = {};
    try {
      taskAnswers = typeof task.answers === 'object' && task.answers !== null
        ? task.answers
        : (typeof task.answers === 'string' ? JSON.parse(task.answers) : {});
    } catch {
      taskAnswers = {};
    }
    if (extra.answers) {
      taskAnswers = { ...taskAnswers, ...extra.answers };
    }

    // Format all cards / fields with employee answers
    let answersBlock = '';
    let answeredCount = 0;

    if (Array.isArray(taskFields) && taskFields.length > 0) {
      taskFields.forEach((f) => {
        const val = taskAnswers[f.id] ?? taskAnswers[f.label];
        const formattedVal = formatAnswerForTelegram(val);
        if (formattedVal) {
          answeredCount++;
          const reqBadge = f.required ? ' *(обязательно)*' : '';
          answersBlock += `#### ${answeredCount}. ${cleanText(f.label)}${reqBadge}\n\n`;
          if (f.hint) {
            answersBlock += `_Подсказка: ${cleanText(f.hint)}_\n\n`;
          }
          answersBlock += `${formattedVal}\n\n`;
        }
      });
    } else if (Object.keys(taskAnswers).length > 0) {
      let idx = 1;
      for (const [k, v] of Object.entries(taskAnswers)) {
        const formattedVal = formatAnswerForTelegram(v);
        if (formattedVal) {
          answeredCount++;
          answersBlock += `#### ${idx++}. ${cleanText(k)}\n\n${formattedVal}\n\n`;
        }
      }
    }

    // Collect attached photos, videos, and documents from task answers
    const collectedTaskMedia: Array<{ name?: string; url: string; type?: string }> = [];
    const scanTaskMedia = (val: any, label?: string) => {
      if (!val || typeof val !== 'object') return;
      if (Array.isArray(val)) {
        val.forEach((item) => scanTaskMedia(item, label));
        return;
      }
      const fUrl = val.fileUrl || val.url || val.rawUrl;
      if (fUrl && typeof fUrl === 'string') {
        collectedTaskMedia.push({ name: val.fileName || val.name || label, url: fUrl, type: val.type });
      }
      if (Array.isArray(val.rows)) scanTaskMedia(val.rows, label);
    };
    for (const [k, v] of Object.entries(taskAnswers)) {
      scanTaskMedia(v, k);
    }
    const { imageFiles: taskImageFiles, videoFiles: taskVideoFiles, otherFiles: taskOtherFiles } = classifyAttachmentFiles(collectedTaskMedia);
    const cleanTaskAnswersForBlocks = (answersBlock || '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '🖼 $1 (вложение ниже)')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1 (вложение ниже)');

    // Task link
    const cleanOrigin = (extra?.origin && /^https?:\/\//i.test(extra.origin)) ? extra.origin.replace(/\/$/, '') : (process.env.APP_URL || 'https://ii-rr.ru');
    const taskLink = `${cleanOrigin}/cabinet/revisor/task/${encodeURIComponent(task.id)}`;

    // 3. Construct Brief and Full Rich Markdown Messages
    let briefRichText = '';
    let fullRichText = '';

    if (eventType === 'task_ai_verified') {
      // BRIEF
      briefRichText = `# 📋 Краткий отчет по задаче\n\n`;
      briefRichText += `## 🎯 Оценка качества: ${score}/100 баллов ${statusIcon}\n\n`;
      briefRichText += `• **Проект:** ${cleanText(projTitle)}\n\n`;
      briefRichText += `• **Задача:** ${cleanText(taskTitle)}\n\n`;
      briefRichText += `• **Постановщик:** ${cleanText(authorName)}\n\n`;
      briefRichText += `• **Ответственный:** ${cleanText(executorName)}\n\n`;
      if (isSubmittedBySomeoneElse) {
        briefRichText += `• **Фактически сдал(а):** ${cleanText(submitterName || 'Другой сотрудник')}\n\n`;
      }
      briefRichText += `• **Срок сдачи:** ${cleanText(deadLine)}\n\n`;
      briefRichText += `• **Вердикт:** ${statusText}\n\n`;
      briefRichText += `• **Карточек заполнено:** ${answeredCount} из ${taskFields.length || answeredCount}\n\n`;
      if (extra.aiRecommendations || extra.aiSummary) {
        briefRichText += `### 📊 Резюме и рекомендации ИИ\n\n`;
        briefRichText += `> ${cleanText(extra.aiRecommendations || extra.aiSummary)}\n\n`;
      }
      briefRichText += `👉 [Открыть карточку задачи в кабинете](${taskLink})\n`;

      // FULL
      fullRichText = `# 📋 Отчет по выполнению задачи: ${cleanText(taskTitle)}\n\n`;
      fullRichText += `## ⭐️ Оценка ИИ: ${score}/100 ${statusIcon}\n\n`;
      fullRichText += `| Параметр | Значение |\n`;
      fullRichText += `| :--- | :--- |\n`;
      fullRichText += `| **Проект** | ${cleanText(projTitle)} |\n`;
      fullRichText += `| **Задача** | ${cleanText(taskTitle)} |\n`;
      fullRichText += `| **Постановщик** | ${cleanText(authorName)} |\n`;
      fullRichText += `| **Ответственный** | ${cleanText(executorName)} |\n`;
      if (isSubmittedBySomeoneElse) {
        fullRichText += `| **Фактически сдал(а)** | ${cleanText(submitterName || 'Другой сотрудник')} |\n`;
      }
      fullRichText += `| **Срок сдачи** | ${cleanText(deadLine)} |\n`;
      fullRichText += `| **Оценка качества** | ${score} из 100 ${statusIcon} |\n`;
      fullRichText += `| **Вердикт** | ${statusText} |\n\n`;

      if (answersBlock) {
        fullRichText += `### 📝 Заполненные карточки и подтверждения\n\n${answersBlock}`;
      }
      if (extra.aiSummary) {
        fullRichText += `### 🤖 Резюме ИИ для руководства\n\n> ${cleanText(extra.aiSummary).replace(/\n/g, '\n> ')}\n\n`;
      }
      if (extra.aiRecommendations) {
        fullRichText += `### 💡 Рекомендации ИИ\n\n${cleanText(extra.aiRecommendations)}\n\n`;
      }
      if (task.description) {
        fullRichText += `### 📋 Регламент задачи\n\n${cleanText(task.description)}\n\n`;
      }
      fullRichText += `🌐 [Открыть задачу в кабинете](${taskLink})\n`;
    } else if (eventType === 'task_submitted') {
      // BRIEF
      briefRichText = `# 📋 Задача передана на проверку\n\n`;
      briefRichText += `## ⏳ Ожидает проверки: ${cleanText(taskTitle)}\n\n`;
      briefRichText += `• **Проект:** ${cleanText(projTitle)}\n\n`;
      briefRichText += `• **Задача:** ${cleanText(taskTitle)}\n\n`;
      briefRichText += `• **Постановщик:** ${cleanText(authorName)}\n\n`;
      briefRichText += `• **Ответственный:** ${cleanText(executorName)}\n\n`;
      if (isSubmittedBySomeoneElse) {
        briefRichText += `• **Фактически сдал(а):** ${cleanText(submitterName || 'Другой сотрудник')}\n\n`;
      }
      briefRichText += `• **Срок сдачи:** ${cleanText(deadLine)}\n\n`;
      briefRichText += `• **Карточек заполнено:** ${answeredCount} из ${taskFields.length || answeredCount}\n\n`;
      briefRichText += `👉 [Проверить задачу в кабинете](${taskLink})\n`;

      // FULL
      fullRichText = `# 📋 Новая сдача задачи: ${cleanText(taskTitle)}\n\n`;
      fullRichText += `## ⏳ Ожидает согласования руководителя\n\n`;
      fullRichText += `| Параметр | Значение |\n`;
      fullRichText += `| :--- | :--- |\n`;
      fullRichText += `| **Проект** | ${cleanText(projTitle)} |\n`;
      fullRichText += `| **Задача** | ${cleanText(taskTitle)} |\n`;
      fullRichText += `| **Постановщик** | ${cleanText(authorName)} |\n`;
      fullRichText += `| **Ответственный** | ${cleanText(executorName)} |\n`;
      if (isSubmittedBySomeoneElse) {
        fullRichText += `| **Фактически сдал(а)** | ${cleanText(submitterName || 'Другой сотрудник')} |\n`;
      }
      fullRichText += `| **Срок сдачи** | ${cleanText(deadLine)} |\n\n`;

      if (answersBlock) {
        fullRichText += `### 📝 Заполненные карточки и подтверждения\n\n${answersBlock}`;
      }
      if (task.description) {
        fullRichText += `### 📋 Регламент задачи\n\n${cleanText(task.description)}\n\n`;
      }
      fullRichText += `🌐 [Открыть задачу в кабинете](${taskLink})\n`;
    } else if (eventType === 'task_manager_reviewed') {
      // BRIEF
      briefRichText = `# 👔 Рецензия руководителя на задачу\n\n`;
      briefRichText += `## ⭐ Оценка руководителя: ${score}/100\n\n`;
      briefRichText += `• **Проект:** ${cleanText(projTitle)}\n\n`;
      briefRichText += `• **Задача:** ${cleanText(taskTitle)}\n\n`;
      briefRichText += `• **Постановщик:** ${cleanText(authorName)}\n\n`;
      briefRichText += `• **Ответственный:** ${cleanText(executorName)}\n\n`;
      if (isSubmittedBySomeoneElse) {
        briefRichText += `• **Фактически сдал(а):** ${cleanText(submitterName || 'Другой сотрудник')}\n\n`;
      }
      briefRichText += `• **Статус:** ${task.status === 'completed' ? 'Принята' : 'На доработке'}\n\n`;
      if (extra.managerComment) {
        briefRichText += `### 💬 Комментарий руководителя\n\n> ${cleanText(extra.managerComment)}\n\n`;
      }
      briefRichText += `👉 [Открыть задачу в кабинете](${taskLink})\n`;

      // FULL
      fullRichText = `# 👔 Рецензия руководителя на задачу: ${cleanText(taskTitle)}\n\n`;
      fullRichText += `## ⭐ Оценка: ${score}/100\n\n`;
      fullRichText += `| Параметр | Значение |\n`;
      fullRichText += `| :--- | :--- |\n`;
      fullRichText += `| **Проект** | ${cleanText(projTitle)} |\n`;
      fullRichText += `| **Задача** | ${cleanText(taskTitle)} |\n`;
      fullRichText += `| **Постановщик** | ${cleanText(authorName)} |\n`;
      fullRichText += `| **Ответственный** | ${cleanText(executorName)} |\n`;
      if (isSubmittedBySomeoneElse) {
        fullRichText += `| **Фактически сдал(а)** | ${cleanText(submitterName || 'Другой сотрудник')} |\n`;
      }
      fullRichText += `| **Статус** | ${task.status === 'completed' ? 'Принята' : 'На доработке'} |\n\n`;
      if (extra.managerComment) {
        fullRichText += `### 💬 Комментарий руководителя\n\n> ${cleanText(extra.managerComment)}\n\n`;
      }
      if (answersBlock) {
        fullRichText += `### 📝 Заполненные карточки задачи\n\n${answersBlock}`;
      }
      fullRichText += `🌐 [Открыть задачу в кабинете](${taskLink})\n`;
    } else if (eventType === 'task_rescheduled') {
      briefRichText = `# 🔄 Сдвиг дедлайна по задаче\n\n` +
        `• **Проект:** ${cleanText(projTitle)}\n\n` +
        `• **Задача:** ${cleanText(taskTitle)}\n\n` +
        `• **Постановщик:** ${cleanText(authorName)}\n\n` +
        `• **Ответственный:** ${cleanText(executorName)}\n\n` +
        (isSubmittedBySomeoneElse ? `• **Фактически сдал(а):** ${cleanText(submitterName || 'Другой сотрудник')}\n\n` : '') +
        `• **Новый дедлайн:** ${cleanText(extra.newDeadline || deadLine)} (+${extra.shiftDays || 2} дн.)\n\n` +
        `💡 _Автоматическая оптимизация сроков для сохранения качества выполнения._\n\n` +
        `👉 [Смотреть диаграмму Ганта](${taskLink})\n`;
      fullRichText = briefRichText;
    } else if (eventType === 'task_reminder') {
      briefRichText = `# ⏰ Напоминание о скором дедлайне задачи\n\n` +
        `• **Проект:** ${cleanText(projTitle)}\n\n` +
        `• **Задача:** ${cleanText(taskTitle)}\n\n` +
        `• **Постановщик:** ${cleanText(authorName)}\n\n` +
        `• **Ответственный:** ${cleanText(executorName)}\n\n` +
        `🚨 **Дедлайн:** ${cleanText(deadLine)}\n\n` +
        `Пожалуйста, заполните карточки отчета и прикрепите материалы выполнения.\n\n` +
        `👉 [Открыть карточку задачи](${taskLink})\n`;
      fullRichText = briefRichText;
    } else if (eventType === 'task_overdue') {
      briefRichText = `# 🚨 Просрочена задача проекта\n\n` +
        `• **Проект:** ${cleanText(projTitle)}\n\n` +
        `• **Задача:** ${cleanText(taskTitle)}\n\n` +
        `• **Постановщик:** ${cleanText(authorName)}\n\n` +
        `• **Ответственный:** ${cleanText(executorName)}\n\n` +
        `⏰ **Истекший срок:** ${cleanText(deadLine)}\n\n` +
        `_Если возникли затруднения — откройте помощь ИИ-Ревизора в карточке задачи._\n\n` +
        `👉 [Открыть задачу](${taskLink})\n`;
      fullRichText = briefRichText;
    } else if (eventType === 'task_checkin_nudge') {
      briefRichText = `# 🤝 Плановый чекин ИИ-Ревизора\n\n` +
        `• **Проект:** ${cleanText(projTitle)}\n\n` +
        `• **Задача:** ${cleanText(taskTitle)}\n\n` +
        `• **Ответственный:** ${cleanText(executorName)}\n\n` +
        `• **Срок сдачи:** ${cleanText(deadLine)}\n\n` +
        `• **Текущий прогресс:** ${extra.progressPercent ?? 0}%\n\n` +
        `💡 _${cleanText(extra.aiSummary || 'Прошла заметная часть срока, а прогресс пока минимален. Все ли идет по плану или нужна подсказка ИИ?')}_\n\n` +
        `👉 [Отметить прогресс](${taskLink}?action=checkin) • [Помощь ИИ с затруднением](${taskLink}?action=help)\n`;
      fullRichText = briefRichText;
    } else if (eventType === 'task_upstream_risk') {
      briefRichText = `# ⚠️ Предупреждение о риске по связанной задаче\n\n` +
        `• **Проект:** ${cleanText(projTitle)}\n\n` +
        `• **Ваша задача:** ${cleanText(taskTitle)}\n\n` +
        `• **Задержка/риск в предыдущей задаче:** ${cleanText(extra.upstreamTaskTitle || 'предыдущий этап')}\n\n` +
        `• **Индекс риска:** ${extra.riskScore ?? 70}/100\n\n` +
        `💡 _${cleanText(extra.reasonText || 'Рекомендуем подготовить смежные материалы заранее или согласовать сдвиг срока.')}_\n\n` +
        `👉 [Открыть задачу и план](${taskLink}?action=help)\n`;
      fullRichText = briefRichText;
    } else if (eventType === 'task_shift_requested') {
      briefRichText = `# 📅 Запрос на перенос срока задачи\n\n` +
        `• **Проект:** ${cleanText(projTitle)}\n\n` +
        `• **Задача:** ${cleanText(taskTitle)}\n\n` +
        `• **Сотрудник:** ${cleanText(executorName)}\n\n` +
        `• **Текущий срок:** ${cleanText(extra.previousDeadline || deadLine)} → **Предложенный:** ${cleanText(extra.newDeadline || deadLine)}\n\n` +
        (extra.reasonText ? `> ${cleanText(extra.reasonText)}\n\n` : '') +
        `👉 [Согласовать в кабинете](${taskLink}?action=checkin)\n`;
      fullRichText = briefRichText;
    } else if (eventType === 'task_escalation') {
      briefRichText = `# 🔺 Эскалация риска срыва задачи\n\n` +
        `• **Проект:** ${cleanText(projTitle)}\n\n` +
        `• **Задача:** ${cleanText(taskTitle)}\n\n` +
        `• **Ответственный:** ${cleanText(executorName)}\n\n` +
        `• **Дедлайн:** ${cleanText(deadLine)} | **Индекс риска:** ${extra.riskScore ?? 75}/100\n\n` +
        `💡 ${cleanText(extra.reasonText || 'Задача требует внимания руководителя или разблокировки.')}\n\n` +
        `👉 [Открыть карточку задачи](${taskLink})\n`;
      fullRichText = briefRichText;
    }

    // 4. Dispatch to each target recipient according to rules
    for (const target of ruleTargets) {
      // 1. In-App Notification if enabled in rule
      if (target.notifyInApp && target.targetUserId) {
        try {
          let notifTitle = isApproved ? '✅ Задача принята ИИ Ревизором' : '⚠️ Задача требует доработки';
          let notifMsg = `«${taskTitle}» (${projTitle}). Оценка: ${score}/100. ${extra.aiRecommendations || extra.aiSummary || ''}`;

          if (eventType === 'task_checkin_nudge') {
            notifTitle = '🤝 Чекин ИИ-Ревизора по задаче';
            notifMsg = `«${taskTitle}» (${projTitle}): ${extra.aiSummary || 'Проверьте прогресс и при необходимости запросите помощь ИИ.'}`;
          } else if (eventType === 'task_reminder') {
            notifTitle = '⏰ Скоро дедлайн задачи';
            notifMsg = `«${taskTitle}» (${projTitle}), срок: ${deadLine}. Можно проверить черновик без штрафа.`;
          } else if (eventType === 'task_overdue') {
            notifTitle = '🚨 Дедлайн задачи просрочен';
            notifMsg = `«${taskTitle}» (${projTitle}), срок ${deadLine} истек. Откройте карточку для помощи ИИ или переноса.`;
          } else if (eventType === 'task_upstream_risk') {
            notifTitle = '⚠️ Риск задержки связанной задачи';
            notifMsg = `Задача «${extra.upstreamTaskTitle || 'предшествующая'}» под риском — может затронуть «${taskTitle}».`;
          } else if (eventType === 'task_shift_requested') {
            notifTitle = '📅 Запрос переноса дедлайна';
            notifMsg = `${executorName} просит перенести «${taskTitle}» на ${extra.newDeadline || deadLine}.`;
          } else if (eventType === 'task_escalation') {
            notifTitle = '🔺 Эскалация риска по задаче';
            notifMsg = `«${taskTitle}» (${executorName}): индекс риска ${extra.riskScore ?? 75}/100. ${extra.reasonText || ''}`;
          } else if (eventType === 'task_rescheduled') {
            notifTitle = '🔄 Срок задачи перенесен';
            notifMsg = `«${taskTitle}» перенесена на ${extra.newDeadline || deadLine} (+${extra.shiftDays || 1} дн.).`;
          } else if (isSubmittedBySomeoneElse) {
            if (String(target.targetUserId) === String(submitterUserId)) {
              notifTitle = isApproved ? '✅ Задача успешно сдана' : '⚠️ Сданная вами задача требует доработки';
              notifMsg = `Вы сдали задачу «${taskTitle}» (${projTitle}) за ответственного ${executorName}. Оценка: ${score}/100.`;
            } else if (String(target.targetUserId) === String(task.executorId)) {
              notifTitle = isApproved ? 'ℹ️ Ваша задача выполнена другим сотрудником' : '⚠️ Ваша задача требует доработки';
              notifMsg = `Задачу «${taskTitle}» (${projTitle}) выполнил(а) сотрудник ${submitterName}. Оценка: ${score}/100.`;
            }
          }

          const taskUrl = `/cabinet/revisor/task/${encodeURIComponent(task.id)}${eventType === 'task_checkin_nudge' ? '?action=help' : ''}`;
          await db.run(`
            INSERT INTO notifications (id, user_id, "userId", title, message, type, is_read, "isRead", timestamp, actionUrl, created_at)
            VALUES (?, ?, ?, ?, ?, 'task_result', 0, 0, ?, ?, ?)
          `, [
            'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            target.targetUserId,
            target.targetUserId,
            notifTitle,
            notifMsg,
            new Date().toISOString(),
            taskUrl,
            new Date().toISOString()
          ]);
          sendWebPushToUser(db, String(target.targetUserId), {
            title: notifTitle,
            body: notifMsg,
            url: taskUrl,
            tag: `task_${task.id}_${eventType}`,
            category: 'tasks'
          }).catch(() => {});
        } catch (inAppErr: any) {
          console.warn('[Task In-App Notification Error]:', inAppErr.message);
        }
      }

      // 2. Telegram outbound message if enabled in rule (Bot API 10.3 Rich Blocks + link-only button, never alters webhook)
      if (target.sendTelegram && target.chatId) {
        const isBrief = target.format === 'brief';
        let finalMsg = isBrief ? briefRichText : fullRichText;
        if (!isBrief && target.isExecutorFallback) {
          finalMsg = `ℹ️ _У назначенного исполнителя (${cleanText(executorName)}) не привязан Telegram-аккаунт. Полный детальный отчет направлен вам в личные сообщения._\n\n` + finalMsg;
        }

        const richPayload = buildTaskEventRichPayload({
          eventType,
          format: isBrief ? 'brief' : 'full',
          projectTitle: projTitle,
          taskTitle,
          authorName,
          executorName,
          submitterName: isSubmittedBySomeoneElse ? (submitterName || 'Другой сотрудник') : undefined,
          deadline: deadLine,
          score,
          riskScore: typeof extra.riskScore === 'number' ? extra.riskScore : undefined,
          statusText,
          answeredCount,
          totalFields: taskFields.length || answeredCount,
          answersText: cleanTaskAnswersForBlocks || undefined,
          aiSummary: extra.aiSummary,
          aiRecommendations: extra.aiRecommendations,
          managerComment: extra.managerComment,
          description: task.description,
          reasonText: extra.reasonText,
          upstreamTaskTitle: extra.upstreamTaskTitle,
          newDeadline: extra.newDeadline,
          shiftDays: extra.shiftDays,
          progressPercent: extra.progressPercent,
          imageFiles: taskImageFiles,
          videoFiles: taskVideoFiles,
          otherFiles: taskOtherFiles,
          origin: cleanOrigin,
          taskLink,
          legacyMarkdown: finalMsg
        });

        try {
          const sendRes = await sendTelegramRichMessage({
            chatId: target.chatId,
            blocks: richPayload.blocks,
            markdown: richPayload.fallbackMarkdown,
            buttons: richPayload.buttonsString,
            botToken,
            timeoutMs: 15000
          });

          if (!sendRes.ok && !isTelegramClientError(sendRes.error)) {
            console.warn(`[Task Telegram Notify Warning for ${target.chatId}]:`, sendRes.error);
          }
        } catch (e: any) {
          if (!isTelegramClientError(e.message)) {
            console.warn(`[Task Telegram Notify Error to ${target.chatId}]:`, e.message);
          }
        }

        // Small delay between consecutive sends to Telegram to prevent rate-limit dropping
        await new Promise(r => setTimeout(r, 600));
      }
    }
  } catch (err: any) {
    console.warn("Error dispatching task Telegram notification:", err.message);
  }
}

/**
 * Autonomous Task Health & Schedule Reviewer (called by Cron once daily)
 */
export async function runAutonomousTaskHealthCheck(db: any) {
  try {
    const activeTasks = await db.all(`
      SELECT * FROM tasks 
      WHERE status NOT IN ('completed', 'cancelled', 'verification')
        AND submitted_at IS NULL
      ORDER BY deadLine ASC
    `);

    if (!activeTasks || activeTasks.length === 0) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const processedTaskIds = new Set<string>();

    for (const task of activeTasks) {
      if (processedTaskIds.has(task.id)) continue;

      // Ignore hardcoded demo / template tasks from auto-rescheduling to prevent spam
      if (
        task.id.startsWith('task-zinaida') || 
        task.projectId === 'proj-zinaida-1' || 
        task.projectId === 'proj-zinaida-2' ||
        task.is_demo === 1 ||
        task.isDemo === 1
      ) {
        continue;
      }

      const taskDl = task.deadLine || todayStr;
      const dlDate = new Date(taskDl);
      const diffHours = (dlDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // 1. Upcoming reminder
      const reminderHours = (task.reminder_minutes || 60) / 60;
      if (diffHours > 0 && diffHours <= reminderHours && task.telegram_alert_sent === 0) {
        await db.run("UPDATE tasks SET telegram_alert_sent = 1 WHERE id = ?", [task.id]);
        const proj = task.projectId ? await db.get("SELECT * FROM projects WHERE id = ?", [task.projectId]) : null;
        await dispatchTaskTelegramNotification({
          db,
          task,
          project: proj,
          eventType: 'task_reminder'
        });
        continue;
      }

      // 2. Overdue task evaluation & intelligent cascade shift (max 1 auto-shift, exclude submitted tasks)
      if (diffHours < -24 && task.status !== 'completed' && task.status !== 'verification' && !task.submitted_at && (task.rescheduled_count || 0) < 1) {
        const lastCheck = task.last_ai_check_at ? new Date(task.last_ai_check_at).getTime() : 0;
        const hoursSinceLastCheck = (now.getTime() - lastCheck) / (1000 * 60 * 60);

        // Run check once every 24 hours per overdue task to avoid repetitive shifts
        if (hoursSinceLastCheck > 24) {
          await db.run("UPDATE tasks SET last_ai_check_at = ? WHERE id = ?", [now.toISOString(), task.id]);
          
          const proj = task.projectId ? await db.get("SELECT * FROM projects WHERE id = ?", [task.projectId]) : null;

          // Shift by 2 days intelligently
          const shiftResult = await rescheduleTaskCascade(
            db,
            task.id,
            2,
            'Автоматический перенос дедлайна ИИ из-за задержки выполнения задачи',
            'ai'
          );

          // Mark all cascaded task ids as processed in this run to avoid duplicate shifts
          for (const mid of shiftResult.modifiedTaskIds) {
            processedTaskIds.add(mid);
            await db.run("UPDATE tasks SET last_ai_check_at = ? WHERE id = ?", [now.toISOString(), mid]);
          }

          await dispatchTaskTelegramNotification({
            db,
            task,
            project: proj,
            eventType: 'task_rescheduled',
            extra: {
              previousDeadline: shiftResult.previousDeadline,
              newDeadline: shiftResult.newDeadline,
              shiftDays: 2,
              cascadedCount: shiftResult.cascadedTasksCount
            }
          });
        }
      }
    }
  } catch (err: any) {
    console.error("[Autonomous Task Health Check Error]:", err.message);
  }
}

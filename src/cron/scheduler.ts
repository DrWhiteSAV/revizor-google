import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/initDb';
import { executeDatabaseBackup } from '../server/backup';
import { sendTelegramMessage, sendTelegramRichMessage, buildCronReportAlertRichPayload, isTelegramClientError } from '../server/telegram';
import { runAutonomousTaskHealthCheck } from '../server/taskManager';
import { processPendingOffboardingJobs } from '../server/offboarding/runner';
import { auditReportWithAiAndTasks, generateCompanyRevisorInsights } from '../server/revisor/aiMentor';
import { runProactiveTaskMonitor, sendMorningAndEveningDigests } from '../server/revisor/proactiveMonitor';
import { sendWebPushToUser } from '../../server/routes/push/service';

export async function checkReportRemindersAndDeadlines() {
  try {
    const db = await getDb();
    const templates = await db.all("SELECT * FROM report_templates WHERE is_active = 1");
    if (!templates || templates.length === 0) return;

    for (const tpl of templates) {
      const tz = tpl.timezone || 'Europe/Moscow';
      let hours = 0;
      let minutes = 0;
      let dayOfWeek = '';
      let dayOfMonth = 1;
      let dateKey = '';

      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: 'numeric',
          weekday: 'short',
          day: '2-digit',
          year: 'numeric',
          month: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const map: Record<string, string> = {};
        for (const p of parts) map[p.type] = p.value;
        hours = parseInt(map.hour || '0', 10);
        minutes = parseInt(map.minute || '0', 10);
        dayOfWeek = (map.weekday || '').toLowerCase(); // mon, tue, wed, thu, fri, sat, sun
        dayOfMonth = parseInt(map.day || '1', 10);
        const year = map.year || String(now.getUTCFullYear());
        const month = String(map.month || '01').padStart(2, '0');
        const day = String(map.day || '01').padStart(2, '0');
        dateKey = `${year}-${month}-${day}`;
      } catch (e) {
        // Fallback to MSK
        const now = new Date();
        const msk = new Date(now.getTime() + 3 * 3600 * 1000);
        hours = msk.getUTCHours();
        minutes = msk.getUTCMinutes();
        dayOfMonth = msk.getUTCDate();
        dateKey = msk.toISOString().slice(0, 10);
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        dayOfWeek = days[msk.getUTCDay()];
      }

      // Check frequency schedule condition
      const tplType = tpl.type || 'PLAN_DAY';
      if (tplType === 'WEEKLY') {
        let scheduleDays: string[] = ['fri'];
        try {
          scheduleDays = typeof tpl.schedule_days === 'string' ? JSON.parse(tpl.schedule_days) : (tpl.schedule_days || ['fri']);
        } catch(e) {}
        const isTodayScheduled = scheduleDays.some(d => d.toLowerCase().startsWith(dayOfWeek.slice(0, 3)));
        if (!isTodayScheduled) continue;
      } else if (tplType === 'MONTHLY') {
        const targetDay = tpl.monthly_day || 25;
        if (dayOfMonth !== targetDay) continue;
      }

      // Determine target deadline in minutes from midnight
      let deadlineHours = 18;
      let deadlineMinutes = 0;
      if (tpl.schedule_mode === 'work_schedule') {
        if (tplType === 'PLAN_DAY') {
          deadlineHours = 10;
          deadlineMinutes = 0;
        } else {
          deadlineHours = 18;
          deadlineMinutes = 0;
        }
      } else if (tpl.deadline_time) {
        const [dh, dm] = tpl.deadline_time.split(':').map((v: string) => parseInt(v, 10));
        if (!isNaN(dh)) deadlineHours = dh;
        if (!isNaN(dm)) deadlineMinutes = dm;
      }

      const deadlineTotalMinutes = deadlineHours * 60 + deadlineMinutes;
      const currentTotalMinutes = hours * 60 + minutes;

      // Determine when to send reminder (default 15 minutes before deadline)
      let reminderTargetMinutes = deadlineTotalMinutes - (tpl.reminderMinutes || 15);
      if (tpl.reminder_mode === 'custom_time' && tpl.reminder_time) {
        const [rh, rm] = tpl.reminder_time.split(':').map((v: string) => parseInt(v, 10));
        if (!isNaN(rh) && !isNaN(rm)) {
          reminderTargetMinutes = rh * 60 + rm;
        }
      }

      // Overdue check: 15 minutes after deadline
      const overdueTargetMinutes = deadlineTotalMinutes + 15;

      // Check triggers with a narrow 1-minute window
      const isReminderTime = (currentTotalMinutes >= reminderTargetMinutes && currentTotalMinutes <= reminderTargetMinutes + 1);
      const isDeadlineTime = (currentTotalMinutes >= deadlineTotalMinutes && currentTotalMinutes <= deadlineTotalMinutes + 1);
      const isOverdueTime = (currentTotalMinutes >= overdueTargetMinutes && currentTotalMinutes <= overdueTargetMinutes + 1);

      if (!isReminderTime && !isDeadlineTime && !isOverdueTime) continue;

      // Find company routing rules
      const companyId = tpl.company_id || 'flagship-main';
      const routingRules = await db.all(`
        SELECT * FROM telegram_routing_rules 
        WHERE (company_id = ? OR company_id = ? OR company_id IS NULL OR company_id = '' OR company_id = 'flagship-main')
          AND is_active = 1
      `, [companyId, `com-${companyId.replace(/^com-/, '')}`]);

      // Helper to check if a rule matches this template
      const matchingRules = routingRules.filter((r: any) => {
        if (!r.template_ids || r.template_ids === '["all"]' || r.template_ids === 'all') return true;
        try {
          const arr = typeof r.template_ids === 'string' ? JSON.parse(r.template_ids) : r.template_ids;
          if (Array.isArray(arr)) {
            return arr.includes('all') || arr.includes(tpl.id);
          }
        } catch (e) {}
        return false;
      });

      // Find employees assigned to this report
      let targetEmployees: any[] = [];
      let targetEmpIds: string[] = [];
      let targetDeptIds: string[] = [];
      try {
        targetEmpIds = typeof tpl.target_employees === 'string' ? JSON.parse(tpl.target_employees) : (tpl.target_employees || []);
      } catch (e) {}
      try {
        targetDeptIds = typeof tpl.target_departments === 'string' ? JSON.parse(tpl.target_departments) : (tpl.target_departments || []);
      } catch (e) {}

      let empQuery = "SELECT id, name, telegram_id, telegram_handle, telegram_handle as telegramHandle, department_id, company_id FROM employees WHERE 1=1";
      const empParams: any[] = [];
      if (tpl.company_id) {
        empQuery += " AND (company_id = ? OR company_id = ?)";
        empParams.push(tpl.company_id, `com-${tpl.company_id.replace(/^com-/, '')}`);
      }

      const allCompanyEmps = await db.all(empQuery, empParams);

      if (targetEmpIds.length > 0 && !targetEmpIds.includes('all')) {
        targetEmployees = allCompanyEmps.filter(e => targetEmpIds.includes(e.id));
      } else if (targetDeptIds.length > 0 && !targetDeptIds.includes('all')) {
        targetEmployees = allCompanyEmps.filter(e => targetDeptIds.includes(e.department_id));
      } else {
        targetEmployees = allCompanyEmps;
      }

      // -------------------------------------------------------------
      // 1 & 2. REMINDER (15 min before) and DEADLINE REMINDER
      // -------------------------------------------------------------
      if (isReminderTime || isDeadlineTime) {
        const triggerType = isDeadlineTime ? 'DEADLINE' : 'REMINDER';

        for (const emp of targetEmployees) {
          // Check if employee already submitted the report today
          const alreadySubmitted = await db.get(`
            SELECT id FROM reports 
            WHERE (templateId = ? OR templateTitle = ?) 
              AND (employeeId = ? OR employee_id = ?) 
              AND (
                date(timestamp) = ? 
                OR CAST(timestamp AS TEXT) LIKE ? 
                OR targetDate = ?
                OR (createdAt IS NOT NULL AND date(createdAt) = ?)
              )
            LIMIT 1
          `, [tpl.id, tpl.title, emp.id, emp.id, dateKey, `${dateKey}%`, dateKey, dateKey]);

          // If report is already submitted, NO reminder should be sent!
          if (alreadySubmitted) continue;

          // Deduplication: check if reminder has ALREADY been sent today for this trigger
          const logKey = `log-${tpl.id}-${emp.id}-${triggerType}-${dateKey}`;
          const alreadySent = await db.get(
            "SELECT id FROM report_reminder_logs WHERE (id = ? OR (template_id = ? AND employee_id = ? AND date_key = ? AND channel = ?))",
            [logKey, tpl.id, emp.id, dateKey, triggerType]
          );
          if (alreadySent) continue;

          // Determine rule permissions for this trigger
          // Default to enabled if not explicitly disabled
          let sendTg = tpl.send_telegram_reminder !== 0;
          let sendInApp = tpl.send_inapp_notification !== 0;

          if (matchingRules.length > 0) {
            // Check if any matching rule controls this
            for (const r of matchingRules) {
              if (r.send_telegram === 0) sendTg = false;
              if (r.notify_inapp === 0) sendInApp = false;
              if (triggerType === 'REMINDER' && r.reminder_15m_tg === 0) sendTg = false;
              if (triggerType === 'REMINDER' && r.reminder_15m_inapp === 0) sendInApp = false;
              if (triggerType === 'DEADLINE' && r.deadline_tg === 0) sendTg = false;
              if (triggerType === 'DEADLINE' && r.deadline_inapp === 0) sendInApp = false;
            }
          }

          const reminderMsg = tpl.reminderText || (triggerType === 'DEADLINE' 
            ? `Время сдачи отчета «${tpl.title}» истекает! Пожалуйста, сдайте отчет.` 
            : `Напоминаем о необходимости сдать отчет «${tpl.title}» за 15 минут до дедлайна.`);

          // 1. In-app notification
          if (sendInApp) {
            const notifId = 'notif-rem-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const remTitle = triggerType === 'DEADLINE' ? `Дедлайн отчета: ${tpl.title}` : `Напоминание об отчете: ${tpl.title}`;
            const remUrl = `/cabinet/raport/fill/${tpl.id}`;
            await db.run(`
              INSERT INTO notifications (id, userId, title, message, type, isRead, timestamp, actionUrl)
              VALUES (?, ?, ?, ?, 'REPORT_REMINDER', 0, CURRENT_TIMESTAMP, ?)
            `, [
              notifId,
              emp.id,
              remTitle,
              reminderMsg,
              remUrl
            ]);
            sendWebPushToUser(db, String(emp.id), {
              title: remTitle,
              body: reminderMsg,
              url: remUrl,
              tag: `rem_${tpl.id}_${triggerType}`,
              category: 'reports'
            }).catch(() => {});
          }

          const fillUrl = `${(process.env.APP_URL || 'https://ii-rr.ru').replace(/\/+$/, '')}/cabinet/raport/fill/${encodeURIComponent(tpl.id)}`;
          const reminderRich = buildCronReportAlertRichPayload({
            kind: triggerType === 'DEADLINE' ? 'deadline' : 'reminder',
            templateTitle: tpl.title,
            deadlineTime: tpl.deadline_time || '18:00',
            timezone: tz,
            employeeName: emp.name,
            reminderMessage: reminderMsg,
            actionUrl: fillUrl
          });

          // 2. Telegram message directly to employee (Bot API 10.3 Rich Blocks)
          if (sendTg && emp.telegram_id) {
            try {
              const sendRes = await sendTelegramRichMessage({
                chatId: emp.telegram_id,
                blocks: reminderRich.blocks,
                markdown: reminderRich.fallbackMarkdown,
                buttons: reminderRich.buttonsString
              });
              if (!sendRes.ok && !isTelegramClientError(sendRes.error)) {
                console.warn(`[Cron Telegram Reminder Warning for ${emp.name}]:`, sendRes.error);
              }
            } catch (tgErr: any) {
              if (!isTelegramClientError(tgErr.message)) {
                console.warn(`[Cron Telegram Reminder Error for ${emp.name}]:`, tgErr.message);
              }
            }
          }

          // 3. Telegram routing to group/channels if configured
          let tgDestinations: any[] = [];
          try {
            tgDestinations = typeof tpl.telegram_destinations === 'string' ? JSON.parse(tpl.telegram_destinations) : (tpl.telegram_destinations || []);
          } catch(e) {}

          for (const dest of tgDestinations) {
            if (dest.chatId && dest.sendReminder !== false && sendTg) {
              try {
                const sendRes = await sendTelegramRichMessage({
                  chatId: dest.chatId,
                  blocks: reminderRich.blocks,
                  markdown: reminderRich.fallbackMarkdown,
                  buttons: reminderRich.buttonsString
                });
                if (!sendRes.ok && !isTelegramClientError(sendRes.error)) {
                  console.warn(`[Cron Telegram Group Reminder Warning]:`, sendRes.error);
                }
              } catch (destErr: any) {
                if (!isTelegramClientError(destErr.message)) {
                  console.warn(`[Cron Telegram Group Reminder Error]:`, destErr.message);
                }
              }
            }
          }

          // Mark sent in logs with deterministic primary key to prevent any duplicate sends
          await db.run(
            "INSERT OR REPLACE INTO report_reminder_logs (id, template_id, employee_id, date_key, channel, sent_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
            [logKey, tpl.id, emp.id, dateKey, triggerType]
          );
        }
      }

      // -------------------------------------------------------------
      // 3. OVERDUE LIST (+15 minutes after deadline)
      // -------------------------------------------------------------
      if (isOverdueTime) {
        const overdueLogKey = `log-${tpl.id}-ALL_OVERDUE-OVERDUE_15MIN-${dateKey}`;
        const alreadySentOverdue = await db.get(
          "SELECT id FROM report_reminder_logs WHERE (id = ? OR (template_id = ? AND employee_id = 'ALL_OVERDUE' AND date_key = ? AND channel = 'OVERDUE_15MIN'))",
          [overdueLogKey, tpl.id, dateKey]
        );

        if (!alreadySentOverdue) {
          // Check if overdue sending is enabled in rules or template
          let sendOverdue = tpl.overdue_15m_tg !== 0;
          if (matchingRules.length > 0) {
            // If any matching rule explicitly enables overdue_15m_tg
            const hasExplicitOverdueRule = matchingRules.some((r: any) => r.overdue_15m_tg === 1);
            if (hasExplicitOverdueRule) sendOverdue = true;
          }

          if (sendOverdue) {
            const unsubmittedEmployees: any[] = [];
            for (const emp of targetEmployees) {
              const alreadySubmitted = await db.get(`
                SELECT id FROM reports 
                WHERE (templateId = ? OR templateTitle = ?) 
                  AND (employeeId = ? OR employee_id = ?) 
                  AND (
                    date(timestamp) = ? 
                    OR CAST(timestamp AS TEXT) LIKE ? 
                    OR targetDate = ?
                    OR (createdAt IS NOT NULL AND date(createdAt) = ?)
                  )
                LIMIT 1
              `, [tpl.id, tpl.title, emp.id, emp.id, dateKey, `${dateKey}%`, dateKey, dateKey]);

              if (!alreadySubmitted) {
                unsubmittedEmployees.push(emp);
              }
            }

            if (unsubmittedEmployees.length > 0) {
              const appBase = (process.env.APP_URL || 'https://ii-rr.ru').replace(/\/+$/, '');
              const mappedOverdue = unsubmittedEmployees.map((emp) => {
                const systemUrl = `${appBase}/cabinet/company?employeeId=${encodeURIComponent(emp.id)}`;
                let tgLabel = 'не привязан';
                if (emp.telegramHandle) {
                  tgLabel = `@${emp.telegramHandle.replace(/^@/, '')}`;
                } else if (emp.telegram_id) {
                  tgLabel = `TG: ${emp.telegram_id}`;
                }
                return {
                  name: emp.name,
                  profileUrl: systemUrl,
                  tgLabel
                };
              });

              const overdueRich = buildCronReportAlertRichPayload({
                kind: 'overdue_list',
                templateTitle: tpl.title,
                deadlineTime: tpl.deadline_time || '18:00',
                timezone: tz,
                unsubmittedEmployees: mappedOverdue,
                actionUrl: `${appBase}/cabinet/analytics`
              });

              // Collect target chats for overdue list: director, managers, or rules with overdue_15m_tg
              const overdueTargetChats = new Set<string>();

              // 1. From matching rules
              for (const r of matchingRules) {
                if (r.send_telegram !== 0 && r.overdue_15m_tg !== 0) {
                  if (r.target_chat_id && r.target_chat_id !== '{employee_tg}') {
                    overdueTargetChats.add(String(r.target_chat_id).trim());
                  } else if (r.destination_type === 'director') {
                    // Find company director TG
                    const dir = await db.get("SELECT telegram_id FROM users WHERE (company_id = ? OR id = ?) AND role IN ('DIRECTOR', 'ADMIN', 'SUPER_ADMIN') AND telegram_id IS NOT NULL LIMIT 1", [companyId, companyId]);
                    if (dir?.telegram_id) overdueTargetChats.add(String(dir.telegram_id).trim());
                  }
                }
              }

              // 2. Default to director if no specific chat configured
              if (overdueTargetChats.size === 0) {
                const dir = await db.get("SELECT telegram_id FROM users WHERE (company_id = ? OR id = ?) AND role IN ('DIRECTOR', 'ADMIN', 'SUPER_ADMIN') AND telegram_id IS NOT NULL LIMIT 1", [companyId, companyId]);
                if (dir?.telegram_id) {
                  overdueTargetChats.add(String(dir.telegram_id).trim());
                } else {
                  // Fallback to bot admin id
                  const configRow = await db.get("SELECT adminTelegramId FROM telegram_bot_config WHERE id = ? OR id = 'default' LIMIT 1", [`company_${companyId}`]);
                  if (configRow?.adminTelegramId) overdueTargetChats.add(String(configRow.adminTelegramId).trim());
                }
              }

              // Dispatch overdue list via Bot API 10.3 Rich Blocks
              for (const targetChat of overdueTargetChats) {
                try {
                  const sendRes = await sendTelegramRichMessage({
                    chatId: targetChat,
                    blocks: overdueRich.blocks,
                    markdown: overdueRich.fallbackMarkdown,
                    buttons: overdueRich.buttonsString
                  });
                  if (!sendRes.ok && !isTelegramClientError(sendRes.error)) {
                    console.warn(`[Cron Overdue List Telegram Warning to ${targetChat}]:`, sendRes.error);
                  }
                } catch (oe: any) {
                  if (!isTelegramClientError(oe.message)) {
                    console.warn(`[Cron Overdue List Telegram Error to ${targetChat}]:`, oe.message);
                  }
                }
              }
            }

            // Mark overdue list logged for today so it will not repeat
            await db.run(
              "INSERT OR REPLACE INTO report_reminder_logs (id, template_id, employee_id, date_key, channel, sent_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
              [overdueLogKey, tpl.id, 'ALL_OVERDUE', dateKey, 'OVERDUE_15MIN']
            );
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[Cron Report Reminders Error]:', err.message);
  }
}

let lastBackupMskDay = -1;

export function initBackupCronJob() {
  console.log('[Cron] Daily 06:00 MSK Telegram Backup Service initialized');
  setInterval(async () => {
    try {
      const now = new Date();
      const mskTime = new Date(now.getTime() + 3 * 3600 * 1000);
      const mskHour = mskTime.getUTCHours();
      const mskMinute = mskTime.getUTCMinutes();
      const currentMskDay = mskTime.getUTCDate();

      if (mskHour === 6 && mskMinute === 0 && lastBackupMskDay !== currentMskDay) {
        lastBackupMskDay = currentMskDay;
        console.log('[Cron] 06:00 MSK reached. Starting scheduled database backup to Telegram...');
        const res = await executeDatabaseBackup('Ежедневный автобэкап в 06:00 МСК');
        
        const db = await getDb();
        await db.run(
          'UPDATE cron_jobs SET lastRun = ?, lastResult = ? WHERE id = ?',
          [
            new Date().toISOString(),
            res.success 
              ? `Успешно отправлен в Telegram (${res.totalRows} строк, ${res.tablesCount} табл.)`
              : `Ошибка отправки: ${res.error}`,
            'cron-6'
          ]
        );
      }
    } catch (err: any) {
      console.error('[Cron 06:00 MSK Backup Error]:', err.message);
    }
  }, 30000);
}

export function startCronScheduler() {
  console.log('⏰ Starting background Cron Scheduler (Node.js + PostgreSQL BD ProTalk)...');
  initBackupCronJob();

  // Job 1: Every 15 minutes - Report Quality Audit & AI Review
  cron.schedule('*/15 * * * *', async () => {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      console.log(`[Cron Job 1] Executing Report Audit at ${now}...`);
      
      const unreviewedReports = await db.all('SELECT * FROM reports WHERE qualityScore = 0 OR qualityScore IS NULL LIMIT 15');
      let updatedCount = 0;
      let linkedCount = 0;
      for (const report of unreviewedReports) {
        try {
          const audit = await auditReportWithAiAndTasks(db, report);
          updatedCount++;
          linkedCount += audit.linkedTaskIds.length;
        } catch (repErr: any) {
          console.warn(`[Cron Job 1] Audit skipped for ${report.id}:`, repErr?.message);
        }
      }

      await db.run(
        'UPDATE cron_jobs SET lastRun = ?, lastResult = ? WHERE id = ?',
        [now, `ИИ проверил отчетов: ${updatedCount} (связей с задачами: ${linkedCount})`, 'cron-1']
      );
    } catch (err: any) {
      console.error('[Cron Job 1 Error]:', err.message);
    }
  });

  // Job 2: Hourly Project Deadline Check
  cron.schedule('0 * * * *', async () => {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      console.log(`[Cron Job 2] Executing Project & Task Deadline Check at ${now}...`);
      
      const activeTasks = await db.all("SELECT * FROM tasks WHERE status != 'completed'");
      const todayStr = new Date().toISOString().slice(0, 10);
      let delayedCount = 0;

      for (const t of activeTasks) {
        if (t.deadLine && t.deadLine < todayStr) {
          delayedCount++;
          // Log trigger audit
          await db.run(
            'INSERT INTO triggers_log (triggerName, tableName, action, details) VALUES (?, ?, ?, ?)',
            ['cron_deadline_check', 'tasks', 'WARNING', `Task ${t.id} '${t.title}' passed deadline (${t.deadLine})`]
          );
        }
      }

      await db.run(
        'UPDATE cron_jobs SET lastRun = ?, lastResult = ? WHERE id = ?',
        [now, `Проверено задач. Выявлено просроченных: ${delayedCount}`, 'cron-2']
      );
    } catch (err: any) {
      console.error('[Cron Job 2 Error]:', err.message);
    }
  });

  // Job 3: Daily midnight Log Cleanup
  cron.schedule('0 0 * * *', async () => {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      console.log(`[Cron Job 3] Executing Daily Log Cleanup at ${now}...`);
      
      const res = await db.run("DELETE FROM triggers_log WHERE timestamp < datetime('now', '-30 days')");
      await db.run(
        'UPDATE cron_jobs SET lastRun = ?, lastResult = ? WHERE id = ?',
        [now, `Очистка завершена. Удалено устаревших записей: ${res.changes || 0}`, 'cron-3']
      );
    } catch (err: any) {
      console.error('[Cron Job 3 Error]:', err.message);
    }
  });

  // Job 4: Daily 03:00 AM Automatic PostgreSQL Database Backup
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log(`[Cron Job 4] 💾 Automatic daily 03:00 MSK PostgreSQL DB backup initiated...`);
      await executeDatabaseBackup("Ежедневный регламентный бэкап PostgreSQL в 03:00 МСК");
    } catch (err: any) {
      console.error('[Cron Job 4 Error]:', err.message);
    }
  });

  // Job 5: Daily 00:00 (Midnight) Past Schedule Locker
  cron.schedule('0 0 * * *', async () => {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      console.log(`[Cron Job 5] 🔒 Locking past shifts at ${now}...`);
      
      const res = await db.run("UPDATE employee_shifts SET is_locked = 1 WHERE shift_date < DATE('now') AND is_locked = 0");
      const lockedCount = res.changes || 0;
      
      await db.run(
        'UPDATE cron_jobs SET lastRun = ?, lastResult = ? WHERE id = ?',
        [now, `Успешно зафиксировано прошедших смен: ${lockedCount}`, 'cron-5']
      );

      if (lockedCount > 0) {
        await db.run(
          'INSERT INTO triggers_log (triggerName, tableName, action, details) VALUES (?, ?, ?, ?)',
          ['cron_midnight_schedule_lock', 'employee_shifts', 'LOCK_PAST', `Зафиксировано смен прошедших дней: ${lockedCount}`]
        );
      }
    } catch (err: any) {
      console.error('[Cron Job 5 Error]:', err.message);
    }
  });

  // Job 6: Every minute - Report Reminders and Deadlines Check
  cron.schedule('* * * * *', async () => {
    try {
      await checkReportRemindersAndDeadlines();
    } catch (err: any) {
      console.error('[Cron Job 6 Error]:', err.message);
    }
  });

  // Job 7: Every 5 minutes - Proactive AI Revisor Task Cadence, Risk, Stagnation & Dependency Monitor
  cron.schedule('*/5 * * * *', async () => {
    try {
      const db = await getDb();
      const summary = await runProactiveTaskMonitor(db);
      await db.run(
        'UPDATE cron_jobs SET lastRun = ?, lastResult = ? WHERE id = ?',
        [
          new Date().toISOString(),
          `Проверено: ${summary.scanned}, чекинов: ${summary.checkinsSent}, напоминаний: ${summary.remindersSent}, эскалаций: ${summary.escalationsSent}`,
          'cron-7'
        ]
      ).catch(() => {});
    } catch (err: any) {
      console.error('[Cron Job 7 Proactive Monitor Error]:', err.message);
    }
  });

  // Job 7b: Every 15 minutes - Morning Employee Focus Brief & Evening Executive Digest (outbound-only)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const db = await getDb();
      await sendMorningAndEveningDigests(db);
    } catch (err: any) {
      console.error('[Cron Job 7b Digest Error]:', err.message);
    }
  });

  // Job 7c: Weekly Monday 09:00 AM - Systemic Company Bottlenecks & Improvement Insights
  cron.schedule('0 9 * * 1', async () => {
    try {
      const db = await getDb();
      const companies = await db.all('SELECT DISTINCT company_id FROM tasks WHERE company_id IS NOT NULL').catch(() => []);
      for (const c of companies) {
        if (c.company_id) {
          await generateCompanyRevisorInsights(db, String(c.company_id)).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('[Cron Job 7c Weekly Insights Error]:', err.message);
    }
  });

  // Keep reference to legacy helper exported for manual invocations if needed
  void runAutonomousTaskHealthCheck;

  // Job 8: Daily at 02:00 AM - Tariff Active Seats Audit & Auto-Renewal Check
  cron.schedule('0 2 * * *', async () => {
    try {
      const db = await getDb();
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      console.log(`[Cron Job 8] 💳 Running Tariff & Active Seats Audit at ${todayIso}...`);

      const directors = await db.all(
        "SELECT id, email, name, company_id, payment_balance, revizor_paid_until, recruiter_paid_until, revisor_seats_current, revisor_seats_next_period FROM users WHERE role IN ('DIRECTOR', 'SUPER_ADMIN') OR director_id IS NULL"
      );

      for (const dir of directors) {
        // Count ONLY active staff (paused and dismissed are excluded from tariff billing!)
        const activeEmpRow = await db.get(
          `SELECT COUNT(DISTINCT id) as cnt FROM employees WHERE (director_id = ? OR company_id = ?) AND (status = 'active' OR status IS NULL OR status = '')`,
          [dir.id, dir.company_id || `com-${dir.id}`]
        );
        const activeSeats = Math.max(1, activeEmpRow?.cnt || 1);

        // Update active seats on director record
        await db.run(
          "UPDATE users SET active_employees_count = ?, revisor_seats_next_period = COALESCE(revisor_seats_next_period, ?), recruiter_seats_next_period = COALESCE(recruiter_seats_next_period, ?) WHERE id = ?",
          [activeSeats, activeSeats, activeSeats, dir.id]
        );

        // Check if Revisor subscription expires today
        if (dir.revizor_paid_until && dir.revizor_paid_until.slice(0, 10) <= todayIso) {
          const seatsToRenew = dir.revisor_seats_next_period || activeSeats;
          const costRR = seatsToRenew * 690;
          const currentBal = Number(dir.payment_balance || 0);
          const hasExplicitPermission = Boolean(dir.auto_renew === 1 || dir.auto_renewal_enabled === 1 || dir.auto_renew === true);

          if (!hasExplicitPermission) {
            console.log(`[Cron Job 8] ℹ️ Auto-renew permission NOT granted for ${dir.email}. Balance deduction prohibited.`);
            // Inform user via notification without deducting funds
            const notifId = `notif_exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const nowIsoStr = new Date().toISOString();
            const expBody = `Срок действия тарифа ИИ Ревизор истекает сегодня. Вы можете продлить его вручную в разделе «Тарифы». Автоматическое списание без вашего подтверждения отключено.`;
            await db.run(
              `INSERT INTO notifications (id, user_id, "userId", title, message, type, is_read, "isRead", timestamp, created_at)
               VALUES (?, ?, ?, 'Срок тарифа завершается', ?, 'tariff', 0, 0, ?, ?)`,
              [
                notifId,
                dir.id,
                dir.id,
                expBody,
                nowIsoStr,
                nowIsoStr
              ]
            ).catch(() => {});
            sendWebPushToUser(db, String(dir.id), {
              title: 'Срок тарифа завершается',
              body: expBody,
              url: '/cabinet/tariff',
              tag: `tariff_exp_${dir.id}`,
              category: 'system'
            }).catch(() => {});
          } else if (currentBal >= costRR) {
            // Auto-renew for 1 month only when user explicitly enabled it
            const nextExpires = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
            const txId = `tx_cron_renew_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            
            await db.run(
              `INSERT INTO transactions (id, user_id, amount, amount_rub, amount_rr, currency, type, description, status, timestamp)
               VALUES (?, ?, ?, 0, ?, 'RR', 'debit', ?, 'completed', ?)`,
              [
                txId,
                dir.id,
                -costRR,
                -costRR,
                `Автопродление тарифа ИИ Ревизор на 1 месяц (${seatsToRenew} активных сотр. × 690 RR = -${costRR} RR).`,
                Date.now()
              ]
            );

            await db.run(
              `UPDATE users SET 
                payment_balance = payment_balance - ?,
                revizor_paid_until = ?,
                revisor_expires_at = ?,
                revizor_seats_current = ?,
                projects_used = 0,
                tasks_used = 0
               WHERE id = ?`,
              [costRR, nextExpires, nextExpires, seatsToRenew, dir.id]
            );

            console.log(`[Cron Job 8] ✅ Subscription renewed with explicit permission for ${dir.email}: ${seatsToRenew} seats, -${costRR} RR.`);
          } else {
            console.log(`[Cron Job 8] ⚠️ Insufficient RR balance for ${dir.email} to auto-renew (${currentBal} < ${costRR} RR).`);
          }
        }
      }
    } catch (err: any) {
      console.error('[Cron Job 8 Error]:', err.message);
    }
  });

  // Job 9: Every minute - Background Offboarding Queue & Stale Job Recovery
  cron.schedule('* * * * *', async () => {
    try {
      const db = await getDb();
      await processPendingOffboardingJobs(db);
    } catch (err: any) {
      console.error('[Cron Job 9 Offboarding Error]:', err.message);
    }
  });

  // Recover any interrupted offboarding jobs shortly after server startup
  setTimeout(async () => {
    try {
      const db = await getDb();
      await processPendingOffboardingJobs(db);
    } catch {}
  }, 5000);
}

import express from 'express';
import { ensureRevisorSchema } from './schema';
import {
  decomposeTaskIntoSteps,
  generateCompanyRevisorInsights,
  requestTaskHelp,
  runPreflightDraftCheck
} from './aiMentor';
import { runProactiveTaskMonitor } from './proactiveMonitor';
import { calculateTaskRisk, computeTaskProgress, findNextWorkingSlotWithLowLoad } from './scheduleUtils';
import { dispatchTaskTelegramNotification, rescheduleTaskCascade } from '../taskManager';

export function registerRevisorProactiveRoutes(app: express.Express, getDb: () => Promise<any>) {
  // 1. Task AI Timeline, Risk & Shift Requests
  app.get('/api/tasks/:id/timeline', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { id } = req.params;

      const task = await db.get(
        'SELECT * FROM tasks WHERE id = ? OR id = ? LIMIT 1',
        [id, `task-${id}`]
      );
      if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });

      const project = task.projectId
        ? await db.get('SELECT * FROM projects WHERE id = ?', [task.projectId]).catch(() => null)
        : null;

      const interactions = await db.all(
        'SELECT * FROM task_ai_interactions WHERE task_id = ? ORDER BY created_at DESC LIMIT 40',
        [task.id]
      ).catch(() => []);

      const shiftRequests = await db.all(
        'SELECT * FROM task_shift_requests WHERE task_id = ? ORDER BY created_at DESC LIMIT 15',
        [task.id]
      ).catch(() => []);

      const scheduleLogs = await db.all(
        'SELECT * FROM task_schedule_logs WHERE taskId = ? ORDER BY id DESC LIMIT 10',
        [task.id]
      ).catch(() => []);

      const progressPercent = computeTaskProgress(task);
      const concurrentRow = task.executorId
        ? await db.get(
            `SELECT COUNT(*) as cnt FROM tasks WHERE executorId = ? AND status NOT IN ('completed', 'cancelled')`,
            [task.executorId]
          ).catch(() => ({ cnt: 1 }))
        : { cnt: 1 };

      const risk = calculateTaskRisk({
        task,
        now: new Date(),
        progressPercent,
        concurrentActiveTasks: Number(concurrentRow?.cnt || 1),
        employeePastOverdueCount: Number(task.rescheduled_count || 0)
      });

      return res.json({
        success: true,
        risk,
        progressPercent,
        autonomyMode: task.autonomy_mode || project?.autonomy_mode || 'controller',
        checkCadence: task.check_cadence || project?.check_cadence || 'daily',
        blockerStatus: task.blocker_status || 'none',
        blockerNote: task.blocker_note || '',
        interactions: interactions.map((it: any) => ({
          ...it,
          suggested_steps: (() => {
            try { return typeof it.suggested_steps === 'string' ? JSON.parse(it.suggested_steps) : it.suggested_steps; }
            catch { return null; }
          })()
        })),
        shiftRequests,
        scheduleLogs
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка загрузки ленты задачи' });
    }
  });

  // 2. Employee Check-in (Progress % + Status Note)
  app.post('/api/tasks/:id/checkin', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { id } = req.params;
      const { progressPercent, note, blockerStatus = 'none', userId, userName } = req.body || {};

      const task = await db.get('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id]);
      if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });

      const cleanProgress = Math.min(100, Math.max(0, Number(progressPercent ?? task.progress_percent ?? 0)));
      const nowIso = new Date().toISOString();
      const nextStatus = task.status === 'pending' && cleanProgress > 0 ? 'in_progress' : task.status;

      await db.run(
        `UPDATE tasks SET 
          progress_percent = ?,
          blocker_status = ?,
          blocker_note = ?,
          status = ?,
          last_activity_at = ?,
          last_checkin_at = ?,
          checkin_count = COALESCE(checkin_count, 0) + 1
         WHERE id = ?`,
        [
          cleanProgress,
          blockerStatus || 'none',
          blockerStatus !== 'none' ? (note || task.blocker_note || '') : null,
          nextStatus,
          nowIso,
          nowIso,
          task.id
        ]
      );

      const intId = `int_upd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await db.run(
        `INSERT INTO task_ai_interactions (
          id, task_id, project_id, company_id, user_id, user_name, kind, blocker_type,
          message, ai_advice, risk_score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'employee_update', ?, ?, ?, ?)`,
        [
          intId,
          task.id,
          task.projectId || null,
          task.company_id || null,
          userId || task.executorId || null,
          userName || task.executorName || 'Сотрудник',
          blockerStatus,
          note || `Прогресс обновлен до ${cleanProgress}%`,
          cleanProgress >= 80
            ? 'Отличный темп! Перед финальной сдачей можно прогнать черновую предпроверку ИИ.'
            : 'Прогресс зафиксирован ИИ-Ревизором в журнале задачи.',
          task.risk_score || 0,
          nowIso
        ]
      );

      return res.json({ success: true, progressPercent: cleanProgress, interactionId: intId });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка сохранения чекина' });
    }
  });

  // 3. Interactive AI Help ("Застрял / Нужен совет ИИ")
  app.post('/api/tasks/:id/ai-help', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { id } = req.params;
      const { blockerType, question, answers, userId, userName } = req.body || {};

      const task = await db.get('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id]);
      if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });

      const project = task.projectId
        ? await db.get('SELECT * FROM projects WHERE id = ?', [task.projectId]).catch(() => null)
        : null;

      const result = await requestTaskHelp(db, {
        task,
        project,
        blockerType: blockerType || 'stuck',
        question: question || '',
        currentAnswers: answers,
        userId,
        userName
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка получения совета ИИ' });
    }
  });

  // 4. Zero-penalty Pre-flight Draft Check
  app.post('/api/tasks/:id/preflight-check', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { id } = req.params;
      const { answers, checklist, attachments, userId, userName } = req.body || {};

      const task = await db.get('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id]);
      if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });

      const project = task.projectId
        ? await db.get('SELECT * FROM projects WHERE id = ?', [task.projectId]).catch(() => null)
        : null;

      const result = await runPreflightDraftCheck(db, {
        task,
        project,
        answers: answers || {},
        checklist: Array.isArray(checklist) ? checklist : [],
        attachments: Array.isArray(attachments) ? attachments : [],
        userId,
        userName
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка черновой предпроверки' });
    }
  });

  // 5. AI Task Decomposition into 3-5 Checklist Micro-Steps
  app.post('/api/tasks/:id/ai-decompose', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { id } = req.params;
      const { applyToChecklist = false, userId, userName } = req.body || {};

      const task = await db.get('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id]);
      if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });

      const project = task.projectId
        ? await db.get('SELECT * FROM projects WHERE id = ?', [task.projectId]).catch(() => null)
        : null;

      const result = await decomposeTaskIntoSteps(db, {
        task,
        project,
        applyToChecklist: Boolean(applyToChecklist),
        userId,
        userName
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка декомпозиции задачи' });
    }
  });

  // 6. Helpfulness Vote on AI Advice (+1 / -1)
  app.post('/api/tasks/:id/interactions/:interactionId/vote', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { interactionId } = req.params;
      const vote = Number(req.body?.vote || 0) >= 1 ? 1 : -1;
      await db.run('UPDATE task_ai_interactions SET helpful_vote = ? WHERE id = ?', [vote, interactionId]);
      return res.json({ success: true, vote });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка сохранения оценки' });
    }
  });

  // 7. Request Smart Deadline Shift
  app.post('/api/tasks/:id/shift-request', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { id } = req.params;
      const { shiftDays = 1, proposedDeadline, reason, userId, userName } = req.body || {};

      const task = await db.get('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id]);
      if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });

      const project = task.projectId
        ? await db.get('SELECT * FROM projects WHERE id = ?', [task.projectId]).catch(() => null)
        : null;

      const smart = await findNextWorkingSlotWithLowLoad(
        db,
        task.executorId || userId,
        task.deadLine || new Date().toISOString().slice(0, 10),
        Math.max(1, Number(shiftDays) || 1),
        5
      );

      const finalProposedDate = proposedDeadline || smart.proposedDeadline;
      const reqId = `sreq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nowIso = new Date().toISOString();

      await db.run(
        `INSERT INTO task_shift_requests (
          id, task_id, project_id, company_id, requester_id, requester_name,
          current_deadline, proposed_deadline, shift_days, reason, ai_workload_note, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          reqId,
          task.id,
          task.projectId || null,
          task.company_id || null,
          userId || task.executorId || null,
          userName || task.executorName || 'Сотрудник',
          task.deadLine || '',
          finalProposedDate,
          smart.shiftDays,
          reason || 'Требуется дополнительное время для качественного выполнения',
          smart.workloadNote,
          nowIso
        ]
      );

      await dispatchTaskTelegramNotification({
        db,
        task,
        project,
        eventType: 'task_shift_requested',
        extra: {
          previousDeadline: task.deadLine,
          newDeadline: finalProposedDate,
          shiftDays: smart.shiftDays,
          reasonText: `${reason || ''}. ${smart.workloadNote}`
        }
      }).catch(() => {});

      return res.json({
        success: true,
        requestId: reqId,
        proposedDeadline: finalProposedDate,
        shiftDays: smart.shiftDays,
        workloadNote: smart.workloadNote
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка создания запроса переноса' });
    }
  });

  // 8. Manager Resolves Shift Request
  app.post('/api/tasks/:id/shift-request/:reqId/resolve', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const { id, reqId } = req.params;
      const { decision, reviewerName } = req.body || {};

      const shiftReq = await db.get('SELECT * FROM task_shift_requests WHERE id = ? LIMIT 1', [reqId]);
      if (!shiftReq) return res.status(404).json({ success: false, error: 'Запрос не найден' });

      const nowIso = new Date().toISOString();
      const approved = decision === 'approve' || decision === 'approved';

      await db.run(
        `UPDATE task_shift_requests SET status = ?, reviewed_by = ?, resolved_at = ? WHERE id = ?`,
        [approved ? 'approved' : 'rejected', reviewerName || 'Руководитель', nowIso, reqId]
      );

      if (approved) {
        await rescheduleTaskCascade(
          db,
          id,
          Number(shiftReq.shift_days || 1),
          `Согласованный перенос: ${shiftReq.reason || 'по запросу исполнителя'}`,
          reviewerName || 'manager'
        );
      }

      return res.json({ success: true, status: approved ? 'approved' : 'rejected' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка обработки запроса' });
    }
  });

  // 9. Company Live Doctor Overview & Pending Shift Requests
  app.get('/api/revisor/doctor/overview', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const companyId = String(req.query.companyId || '');
      const companyVariants = companyId ? [companyId, `com-${companyId.replace(/^com-/, '')}`] : [];

      const tasks = companyId
        ? await db.all('SELECT * FROM tasks WHERE company_id IN (?, ?) OR company_id IS NULL', companyVariants)
        : await db.all('SELECT * FROM tasks LIMIT 300');

      const cleanTasks = (tasks || []).filter((t: any) => !String(t.id || '').startsWith('task-zinaida'));
      const total = cleanTasks.length;
      const completed = cleanTasks.filter((t: any) => t.status === 'completed');
      const active = cleanTasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
      const highRisk = active.filter((t: any) => Number(t.risk_score || 0) >= 55);
      const stuck = active.filter((t: any) => t.blocker_status && t.blocker_status !== 'none');

      const scored = cleanTasks.filter((t: any) => Number(t.score || 0) > 0);
      const avgScore = scored.length > 0
        ? Math.round(scored.reduce((acc: number, t: any) => acc + Number(t.score || 0), 0) / scored.length)
        : 0;

      const onTimeRate = total > 0
        ? Math.max(0, Math.round(((total - highRisk.length) / total) * 100))
        : 100;

      const healthIndex = total > 0
        ? Math.max(45, Math.min(99, Math.round(100 - highRisk.length * 4 - stuck.length * 5)))
        : 92;

      const pendingShiftRequests = companyId
        ? await db.all(
            `SELECT r.*, t.title as task_title FROM task_shift_requests r 
             LEFT JOIN tasks t ON t.id = r.task_id
             WHERE r.status = 'pending' AND (r.company_id IN (?, ?) OR r.company_id IS NULL)
             ORDER BY r.created_at DESC LIMIT 20`,
            companyVariants
          ).catch(() => [])
        : await db.all(
            `SELECT r.*, t.title as task_title FROM task_shift_requests r
             LEFT JOIN tasks t ON t.id = r.task_id
             WHERE r.status = 'pending' ORDER BY r.created_at DESC LIMIT 20`
          ).catch(() => []);

      return res.json({
        success: true,
        metrics: {
          totalTasks: total,
          activeTasks: active.length,
          completedTasks: completed.length,
          highRiskCount: highRisk.length,
          stuckCount: stuck.length,
          avgScore,
          onTimeRate,
          healthIndex
        },
        pendingShiftRequests,
        riskTasks: highRisk.slice(0, 10).map((t: any) => ({
          id: t.id,
          title: t.title || t.taskTitle,
          executorName: t.executorName || 'Исполнитель',
          deadLine: t.deadLine,
          riskScore: Number(t.risk_score || 0),
          riskLevel: t.risk_level || 'medium',
          blockerStatus: t.blocker_status || 'none',
          progressPercent: Number(t.progress_percent || 0)
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка загрузки аналитики' });
    }
  });

  // 10. Company Revisor Insights (Read & Generate)
  app.get('/api/revisor/insights', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const companyId = String(req.query.companyId || '');
      const rows = companyId
        ? await db.all(
            `SELECT * FROM revisor_insights WHERE company_id = ? OR company_id = ? ORDER BY created_at DESC LIMIT 8`,
            [companyId, `com-${companyId.replace(/^com-/, '')}`]
          )
        : await db.all('SELECT * FROM revisor_insights ORDER BY created_at DESC LIMIT 8');

      const parsed = (rows || []).map((r: any) => ({
        ...r,
        top_blockers: (() => { try { return JSON.parse(r.top_blockers || '[]'); } catch { return []; } })(),
        workload_alerts: (() => { try { return JSON.parse(r.workload_alerts || '[]'); } catch { return []; } })(),
        recommendations: (() => { try { return JSON.parse(r.recommendations || '[]'); } catch { return []; } })()
      }));

      return res.json({ success: true, insights: parsed });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка загрузки инсайтов' });
    }
  });

  app.post('/api/revisor/insights/generate', async (req, res) => {
    try {
      const db = await getDb();
      await ensureRevisorSchema(db);
      const companyId = String(req.body?.companyId || 'flagship-main');
      const projectId = req.body?.projectId ? String(req.body.projectId) : undefined;
      const insight = await generateCompanyRevisorInsights(db, companyId, projectId);
      return res.json({ success: true, insight });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка генерации анализа' });
    }
  });

  // 11. Manual Proactive Monitor Scan Trigger
  app.post('/api/revisor/monitor/run-now', async (_req, res) => {
    try {
      const db = await getDb();
      const summary = await runProactiveTaskMonitor(db);
      return res.json({ success: true, summary });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка запуска проверки' });
    }
  });
}

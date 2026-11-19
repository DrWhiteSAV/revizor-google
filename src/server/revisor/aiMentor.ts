import { callProTalkAi } from '../../../server/protalk';
import { computeTaskProgress } from './scheduleUtils';

function safeParseJson<T = any>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function extractJsonObject(text: string): any | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Finds anonymized successful past tasks from the same company/project (score >= 85)
 * to act as proven reference examples ("эталоны") when mentoring an employee.
 */
async function findReferenceCompletedExamples(db: any, task: any): Promise<string[]> {
  try {
    const companyId = task.company_id || task.companyId || '';
    const projectId = task.projectId || task.project_id || '';
    const completed = await db.all(
      `SELECT id, title, check_criteria, ai_summary, score FROM tasks 
       WHERE status = 'completed' AND COALESCE(score, 0) >= 85 AND id != ?
         AND (company_id = ? OR projectId = ?)
       ORDER BY COALESCE(score, 0) DESC LIMIT 4`,
      [task.id, companyId, projectId]
    );
    return (completed || []).map((c: any) => {
      const title = c.title || 'Выполненная задача';
      const summary = c.ai_summary ? String(c.ai_summary).slice(0, 220) : 'Полное заполнение карточек и фотоподтверждений';
      return `• «${title}» (оценка ${c.score}/100): ${summary}`;
    });
  } catch {
    return [];
  }
}

/**
 * Interactive AI Mentoring when an employee is stuck or asks for advice.
 */
export async function requestTaskHelp(db: any, options: {
  task: any;
  project?: any;
  userId?: string;
  userName?: string;
  blockerType?: string;
  question?: string;
  currentAnswers?: Record<string, any>;
}) {
  const { task, project, userId, userName, blockerType = 'stuck', question = '', currentAnswers } = options;
  const taskTitle = task.title || task.taskTitle || 'Задача проекта';
  const projTitle = project?.title || task.projectTitle || 'Проект';
  const fields = safeParseJson<any[]>(task.fields, []);
  const checklist = safeParseJson<any[]>(task.checklist, []);
  const answers = currentAnswers || safeParseJson<Record<string, any>>(task.answers, {});

  const history = await db.all(
    `SELECT kind, blocker_type, message, ai_advice, helpful_vote, created_at 
     FROM task_ai_interactions WHERE task_id = ? ORDER BY created_at DESC LIMIT 5`,
    [task.id]
  ).catch(() => []);

  const examples = await findReferenceCompletedExamples(db, task);

  const blockerLabels: Record<string, string> = {
    waiting_data: 'Не хватает входных данных или материалов от коллег/руководителя',
    unclear_criteria: 'Неясны критерии приемки или формат результата',
    technical_blocker: 'Техническое ограничение или ошибка инструмента',
    overload: 'Нехватка времени / высокая загрузка другими задачами',
    stuck: 'Трудность с выполнением задачи'
  };

  const fieldsSummary = fields.map((f: any, idx: number) => {
    const val = answers?.[f.id];
    const hasVal = val !== undefined && val !== null && val !== '';
    return `${idx + 1}. ${f.label} (${hasVal ? 'частично/заполнено' : 'пусто'})`;
  }).join('\n');

  const checklistSummary = checklist.map((c: any) => `- [${c.done ? 'x' : ' '}] ${c.text}`).join('\n');

  const systemPrompt = `Ты — опытный операционный наставник и ИИ-Ревизор платформы ИИ-Ревизор RR.
Твоя задача — помочь сотруднику преодолеть затруднение по конкретной рабочей задаче, НЕ оценивая его строго, а давая ясный, практический план действий, шаблон результата или конкретный вопрос руководителю/смежнику.

КОНТЕКСТ ЗАДАЧИ:
- Проект: ${projTitle}
- Задача: ${taskTitle}
- Описание: ${task.description || 'Не указано'}
- Критерии приемки: ${task.check_criteria || 'Выполнить пункты чек-листа и приложить подтверждение'}
- Дедлайн: ${task.deadLine || task.deadline || 'Не задан'}
- Тип затруднения: ${blockerLabels[blockerType] || blockerType}
- Состояние полей:\n${fieldsSummary || 'Поля не заданы'}
- Чек-лист:\n${checklistSummary || 'Чек-лист пуст'}
${examples.length > 0 ? `\nПРИМЕРЫ УСПЕШНЫХ ПОХОЖИХ ЗАДАЧ В ЭТОЙ КОМПАНИИ:\n${examples.join('\n')}` : ''}
${history.length > 0 ? `\nПРЕДЫДУЩИЕ ВЗАИМОДЕЙСТВИЯ ПО ЗАДАЧЕ:\n${history.map((h: any) => `- [${h.kind}] ${h.message || ''} -> ${String(h.ai_advice || '').slice(0, 140)}`).join('\n')}` : ''}

Верни СТРОГО валидный JSON без markdown-обрамления:
{
  "advice": "Развернутый, но четкий и дружелюбный ответ на русском языке (3-6 предложений) с конкретным решением именно этой проблемы",
  "actionSteps": ["Шаг 1...", "Шаг 2...", "Шаг 3..."],
  "readyTemplate": "Короткий готовый шаблон текста/сообщения или структуры отчета, который сотрудник может сразу использовать (или пустая строка)",
  "questionForManager": "Если не хватает данных или нужно согласование — сформулированный вопрос руководителю (или пустая строка)",
  "recommendShiftDays": 0
}`;

  const userPrompt = question.trim()
    ? `Сотрудник ${userName || task.executorName || 'исполнитель'} пишет: "${question.trim()}". Помоги разблокировать задачу.`
    : `Сотрудник ${userName || task.executorName || 'исполнитель'} отметил затруднение (${blockerLabels[blockerType] || blockerType}). Помоги составить понятный план действий.`;

  let parsed: any = null;
  try {
    const aiRes = await callProTalkAi({
      prompt: userPrompt,
      systemPrompt,
      entityType: 'revisor',
      userId: userId || task.executorId || '91827364501',
      jsonOutput: true
    });
    parsed = extractJsonObject(aiRes?.reply || '');
  } catch (err: any) {
    console.warn('[AI Mentor] Fallback for requestTaskHelp:', err?.message || err);
  }

  const fallbackAdvice =
    blockerType === 'waiting_data'
      ? `Зафиксируйте, каких именно данных не хватает для задачи «${taskTitle}», и отправьте руководителю конкретный запрос с указанием срока ответа, чтобы не терять время.`
      : blockerType === 'unclear_criteria'
        ? `Опирайтесь на критерии приемки: «${task.check_criteria || 'полнота результата и подтверждающий материал'}». Выполните минимальный рабочий черновик и прогоните его через черновую предпроверку ИИ.`
        : `Разбейте задачу «${taskTitle}» на 3 коротких этапа по 25–30 минут: сначала соберите базовые факты в текстовую карточку, затем приложите скриншот/подтверждение и проверьте черновик перед сдачей.`;

  const advice = parsed?.advice || fallbackAdvice;
  const actionSteps: string[] = Array.isArray(parsed?.actionSteps) && parsed.actionSteps.length > 0
    ? parsed.actionSteps.slice(0, 5)
    : [
        'Сформулируйте промежуточный результат по первому обязательному полю',
        'Приложите подтверждающий файл или ссылку на рабочий документ',
        'Запустите черновую предпроверку без оценки перед финальной сдачей'
      ];
  const readyTemplate = typeof parsed?.readyTemplate === 'string' ? parsed.readyTemplate : '';
  const questionForManager = typeof parsed?.questionForManager === 'string' ? parsed.questionForManager : '';

  const nowIso = new Date().toISOString();
  const interactionId = `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.run(
    `INSERT INTO task_ai_interactions (
      id, task_id, project_id, company_id, user_id, user_name, kind, blocker_type,
      message, ai_advice, suggested_steps, risk_score, helpful_vote, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'stuck_help', ?, ?, ?, ?, ?, 0, ?)`,
    [
      interactionId,
      task.id,
      task.projectId || null,
      task.company_id || null,
      userId || task.executorId || null,
      userName || task.executorName || 'Сотрудник',
      blockerType,
      question.trim() || blockerLabels[blockerType] || 'Запрос помощи ИИ',
      advice,
      JSON.stringify({ actionSteps, readyTemplate, questionForManager, examplesCount: examples.length }),
      task.risk_score || 0,
      nowIso
    ]
  );

  await db.run(
    `UPDATE tasks SET blocker_status = ?, blocker_note = ?, last_activity_at = ? WHERE id = ?`,
    [blockerType, (question.trim() || blockerLabels[blockerType]).slice(0, 400), nowIso, task.id]
  );

  return {
    interactionId,
    advice,
    actionSteps,
    readyTemplate,
    questionForManager,
    referenceExamples: examples
  };
}

/**
 * Zero-penalty pre-flight draft verification against check_criteria.
 * Helps employee polish their submission BEFORE final grading.
 */
export async function runPreflightDraftCheck(db: any, options: {
  task: any;
  project?: any;
  answers: Record<string, any>;
  checklist?: any[];
  attachments?: any[];
  userId?: string;
  userName?: string;
}) {
  const { task, project, answers, checklist = [], attachments = [], userId, userName } = options;
  const fields = safeParseJson<any[]>(task.fields, []);
  const checkCriteria = task.check_criteria || 'Соответствие регламенту и полнота ответов';

  const requiredFields = fields.filter(f => f.required !== false);
  const missingFields = requiredFields.filter(f => {
    const val = answers?.[f.id];
    return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
  });

  const filledSummary = fields.map((f: any) => {
    const v = answers?.[f.id];
    return `- ${f.label} [${f.required !== false ? 'обяз.' : 'доп.'}]: ${v ? (typeof v === 'object' ? (v.name || v.url || JSON.stringify(v)) : String(v).slice(0, 300)) : 'НЕ ЗАПОЛНЕНО'}`;
  }).join('\n');

  const checklistDone = checklist.filter((c: any) => c.done).length;

  const systemPrompt = `Ты — доброжелательный ИИ-Ревизор в режиме ЧЕРНОВОЙ ПРЕДПРОВЕРКИ (без выставления итоговой оценки в журнал).
Помоги сотруднику понять, готов ли его черновик к приемке с первого раза (порог 80 баллов), и что именно нужно доделать прямо сейчас.

Проект: ${project?.title || 'Проект'}
Задача: ${task.title || task.taskTitle}
Описание: ${task.description || '—'}
Критерии приемки: ${checkCriteria}
Чек-лист: выполнено ${checklistDone} из ${checklist.length}
Текущие поля:\n${filledSummary || 'Поля не настроены'}
Файлов прикреплено: ${attachments.length}

Верни СТРОГО валидный JSON:
{
  "estimatedScore": 75,
  "readyToSubmit": false,
  "summary": "Короткий вывод о готовности черновика",
  "metCriteria": ["Что уже сделано хорошо..."],
  "missingItems": ["Чего не хватает до 80+ баллов..."],
  "improvementTips": ["Конкретная рекомендация как улучшить..."]
}`;

  let parsed: any = null;
  try {
    const aiRes = await callProTalkAi({
      prompt: `Проверь черновик задачи «${task.title || task.taskTitle}» без штрафа и подскажи, что доработать.`,
      systemPrompt,
      entityType: 'revisor',
      userId: userId || task.executorId || '91827364501',
      jsonOutput: true
    });
    parsed = extractJsonObject(aiRes?.reply || '');
  } catch (err: any) {
    console.warn('[Pre-flight Check] AI fallback:', err?.message || err);
  }

  const baseProgress = computeTaskProgress({ ...task, fields, answers, checklist });
  const estimatedScore = typeof parsed?.estimatedScore === 'number'
    ? Math.min(100, Math.max(0, Math.round(parsed.estimatedScore)))
    : Math.max(20, Math.min(95, Math.round(baseProgress * 0.92)));
  const readyToSubmit = typeof parsed?.readyToSubmit === 'boolean'
    ? parsed.readyToSubmit
    : (missingFields.length === 0 && estimatedScore >= 80);

  const missingItems: string[] = Array.isArray(parsed?.missingItems) && parsed.missingItems.length > 0
    ? parsed.missingItems
    : missingFields.map((f: any) => `Заполните обязательный раздел: «${f.label}»`);

  const metCriteria: string[] = Array.isArray(parsed?.metCriteria) && parsed.metCriteria.length > 0
    ? parsed.metCriteria
    : (baseProgress > 0 ? [`Заполнено ${baseProgress}% разделов и чек-листа`] : []);

  const improvementTips: string[] = Array.isArray(parsed?.improvementTips) && parsed.improvementTips.length > 0
    ? parsed.improvementTips
    : ['Убедитесь, что все ответы содержат конкретные факты, цифры или скриншот результата'];

  const summary = parsed?.summary || (readyToSubmit
    ? `Черновик выглядит уверенно (~${estimatedScore}/100). Можно отправлять на финальную проверку.`
    : `Предварительная готовность ~${estimatedScore}/100. Перед сдачей закройте ${Math.max(1, missingItems.length)} недочет(а).`);

  const nowIso = new Date().toISOString();
  const interactionId = `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.run(
    `INSERT INTO task_ai_interactions (
      id, task_id, project_id, company_id, user_id, user_name, kind,
      message, ai_advice, suggested_steps, risk_score, helpful_vote, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'preflight_check', ?, ?, ?, ?, 0, ?)`,
    [
      interactionId,
      task.id,
      task.projectId || null,
      task.company_id || null,
      userId || task.executorId || null,
      userName || task.executorName || 'Сотрудник',
      `Черновая предпроверка (${baseProgress}% заполнения)`,
      summary,
      JSON.stringify({ estimatedScore, readyToSubmit, metCriteria, missingItems, improvementTips }),
      task.risk_score || 0,
      nowIso
    ]
  );

  await db.run(
    `UPDATE tasks SET progress_percent = ?, last_activity_at = ? WHERE id = ?`,
    [baseProgress, nowIso, task.id]
  );

  return {
    interactionId,
    estimatedScore,
    readyToSubmit,
    summary,
    metCriteria,
    missingItems,
    improvementTips
  };
}

/**
 * AI Decomposes a complex or stuck task into 3-5 actionable checklist micro-steps.
 */
export async function decomposeTaskIntoSteps(db: any, options: {
  task: any;
  project?: any;
  userId?: string;
  userName?: string;
  applyToChecklist?: boolean;
}) {
  const { task, project, userId, userName, applyToChecklist = false } = options;
  const taskTitle = task.title || task.taskTitle || 'Задача';
  const existingChecklist = safeParseJson<Array<{ id: string; text: string; done: boolean }>>(task.checklist, []);

  const systemPrompt = `Ты — проджект-наставник ИИ-Ревизора. Разбей рабочую задачу на 3–5 конкретных, последовательных микро-шагов, которые сотрудник может закрывать один за другим.

Проект: ${project?.title || 'Проект'}
Задача: ${taskTitle}
Описание: ${task.description || '—'}
Критерии приемки: ${task.check_criteria || '—'}
Дедлайн: ${task.deadLine || task.deadline || 'не указан'}

Верни СТРОГО валидный JSON:
{
  "steps": [
    { "title": "Краткое действие 1 (до 90 символов)", "hint": "Как выполнить быстро" },
    { "title": "Краткое действие 2", "hint": "..." }
  ]
}`;

  let parsed: any = null;
  try {
    const aiRes = await callProTalkAi({
      prompt: `Разбей задачу «${taskTitle}» на 4 понятных микро-шага для чек-листа.`,
      systemPrompt,
      entityType: 'revisor',
      userId: userId || task.executorId || '91827364501',
      jsonOutput: true
    });
    parsed = extractJsonObject(aiRes?.reply || '');
  } catch (err: any) {
    console.warn('[AI Decompose] Fallback:', err?.message || err);
  }

  const rawSteps: Array<{ title: string; hint?: string }> = Array.isArray(parsed?.steps) && parsed.steps.length > 0
    ? parsed.steps.slice(0, 5)
    : [
        { title: `Проверить вводные данные и критерии по задаче «${taskTitle.slice(0, 40)}»`, hint: 'Уточнить непонятные детали до старта' },
        { title: 'Подготовить основной рабочий черновик и структуру результата', hint: 'Зафиксировать ключевые факты' },
        { title: 'Собрать подтверждающие материалы (скриншот, файл или цифры)', hint: 'Приложить в карточки подтверждения' },
        { title: 'Прогнать черновик через предпроверку ИИ и сдать задачу', hint: 'Устранить замечания до дедлайна' }
      ];

  let updatedChecklist = [...existingChecklist];
  if (applyToChecklist) {
    const newItems = rawSteps.map((s, idx) => ({
      id: `ai_step_${Date.now()}_${idx}`,
      text: s.title,
      done: false
    }));
    updatedChecklist = [...existingChecklist, ...newItems];
    await db.run(
      `UPDATE tasks SET checklist = ?, last_activity_at = ? WHERE id = ?`,
      [JSON.stringify(updatedChecklist), new Date().toISOString(), task.id]
    );
  }

  const interactionId = `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.run(
    `INSERT INTO task_ai_interactions (
      id, task_id, project_id, company_id, user_id, user_name, kind,
      message, ai_advice, suggested_steps, risk_score, helpful_vote, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'ai_decomposition', ?, ?, ?, ?, 0, ?)`,
    [
      interactionId,
      task.id,
      task.projectId || null,
      task.company_id || null,
      userId || task.executorId || null,
      userName || task.executorName || 'Сотрудник',
      applyToChecklist ? 'Микро-шаги добавлены в чек-лист' : 'Запрошена декомпозиция задачи',
      `Задача разбита на ${rawSteps.length} последовательных шага(ов).`,
      JSON.stringify({ steps: rawSteps, applied: applyToChecklist }),
      task.risk_score || 0,
      new Date().toISOString()
    ]
  );

  return { interactionId, steps: rawSteps, checklist: updatedChecklist };
}

/**
 * Replaces the old random qualityScore stub in Cron-1 with real AI evaluation
 * and detects mentions of task delays/blockers inside employee daily reports.
 */
export async function auditReportWithAiAndTasks(db: any, report: any): Promise<{ qualityScore: number; recommendations: string; linkedTaskIds: string[] }> {
  const empId = report.employeeId || report.employee_id || '';
  const empName = report.employeeName || report.employee_name || 'Сотрудник';
  const reportText = [
    report.content || '',
    report.answers ? (typeof report.answers === 'string' ? report.answers : JSON.stringify(report.answers)) : ''
  ].filter(Boolean).join('\n').slice(0, 2200);

  const activeTasks = empId
    ? await db.all(
        `SELECT id, title, deadLine, status, risk_score FROM tasks WHERE (executorId = ? OR executor_id = ?) AND status NOT IN ('completed', 'cancelled') LIMIT 8`,
        [String(empId), String(empId)]
      ).catch(() => [])
    : [];

  let qualityScore = 84;
  let recommendations = 'Отчет принят и проанализирован ИИ-Ревизором.';
  let detectedBlockerTaskIds: string[] = [];
  let blockerReason = '';

  if (reportText.trim().length < 15) {
    qualityScore = 62;
    recommendations = 'Отчет слишком краткий: добавьте конкретные результаты, метрики и статус по текущим задачам.';
  } else {
    try {
      const aiRes = await callProTalkAi({
        prompt: `Проанализируй ежедневный отчет сотрудника ${empName} и сверь с его активными задачами.\n\nОТЧЕТ:\n${reportText}\n\nАКТИВНЫЕ ЗАДАЧИ СОТРУДНИКА:\n${activeTasks.map((t: any) => `- [${t.id}] ${t.title} (срок: ${t.deadLine}, риск: ${t.risk_score || 0})`).join('\n') || 'нет активных задач'}`,
        systemPrompt: `Ты — ИИ-Ревизор. Оцени полноту ежедневного отчета (от 0 до 100) и проверь, не упоминает ли сотрудник задержку, затруднение или нехватку данных по одной из своих задач.
Верни СТРОГО валидный JSON:
{
  "qualityScore": 88,
  "recommendations": "1-2 конкретных предложения: оценка отчета и совет",
  "blockerTaskIds": [],
  "blockerSummary": ""
}`,
        entityType: 'raport',
        userId: empId || '91827364501',
        jsonOutput: true
      });
      const parsed = extractJsonObject(aiRes?.reply || '');
      if (parsed) {
        if (typeof parsed.qualityScore === 'number') {
          qualityScore = Math.min(100, Math.max(25, Math.round(parsed.qualityScore)));
        }
        if (parsed.recommendations) recommendations = String(parsed.recommendations).slice(0, 600);
        if (Array.isArray(parsed.blockerTaskIds)) {
          const validSet = new Set(activeTasks.map((t: any) => String(t.id)));
          detectedBlockerTaskIds = parsed.blockerTaskIds.map(String).filter((id: string) => validSet.has(id));
        }
        if (parsed.blockerSummary) blockerReason = String(parsed.blockerSummary).slice(0, 300);
      }
    } catch (err: any) {
      console.warn('[AI Report Audit Fallback]:', err?.message || err);
    }
  }

  await db.run(
    'UPDATE reports SET qualityScore = ?, aiRecommendations = ? WHERE id = ?',
    [qualityScore, recommendations, report.id]
  );

  // Cross-link detected report blocker directly into Revisor task timeline
  for (const tid of detectedBlockerTaskIds) {
    const note = blockerReason || `В отчете сотрудника отмечено затруднение по задаче (${report.templateTitle || 'Рапорт'})`;
    await db.run(
      `UPDATE tasks SET blocker_status = COALESCE(NULLIF(blocker_status, 'none'), 'stuck'), blocker_note = ?, risk_score = GREATEST(COALESCE(risk_score, 0), 65) WHERE id = ?`,
      [note, tid]
    ).catch(() => {});
    await db.run(
      `INSERT INTO task_ai_interactions (
        id, task_id, company_id, user_id, user_name, kind, blocker_type,
        message, ai_advice, created_at
      ) VALUES (?, ?, ?, ?, ?, 'report_link', 'stuck', ?, ?, ?)`,
      [
        `int_rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tid,
        report.company_id || null,
        empId || null,
        empName,
        `Автоматически связано с рапортом: ${note}`,
        recommendations,
        new Date().toISOString()
      ]
    ).catch(() => {});
  }

  return { qualityScore, recommendations, linkedTaskIds: detectedBlockerTaskIds };
}

/**
 * Generates company-wide systemic insights & improvement recommendations
 * based on task blockers, overdue patterns, and helpfulness votes.
 */
export async function generateCompanyRevisorInsights(db: any, companyId: string, projectId?: string) {
  const companyVariants = [companyId, `com-${companyId.replace(/^com-/, '')}`];
  const tasks = await db.all(
    `SELECT id, title, status, priority, deadLine, executorId, executorName, risk_score, risk_level, blocker_status, rescheduled_count, score 
     FROM tasks WHERE company_id IN (?, ?) OR company_id IS NULL`,
    companyVariants
  ).catch(() => []);

  const interactions = await db.all(
    `SELECT kind, blocker_type, helpful_vote, message FROM task_ai_interactions WHERE company_id IN (?, ?) OR company_id IS NULL ORDER BY created_at DESC LIMIT 60`,
    companyVariants
  ).catch(() => []);

  const blockerCounts: Record<string, number> = {};
  const workloadByUser: Record<string, { name: string; active: number; highRisk: number }> = {};

  for (const t of tasks) {
    if (t.blocker_status && t.blocker_status !== 'none') {
      blockerCounts[t.blocker_status] = (blockerCounts[t.blocker_status] || 0) + 1;
    }
    if (t.status !== 'completed' && t.status !== 'cancelled') {
      const uid = String(t.executorId || t.executorName || 'unknown');
      if (!workloadByUser[uid]) {
        workloadByUser[uid] = { name: t.executorName || 'Сотрудник', active: 0, highRisk: 0 };
      }
      workloadByUser[uid].active++;
      if ((t.risk_score || 0) >= 55) workloadByUser[uid].highRisk++;
    }
  }

  const workloadAlerts = Object.values(workloadByUser)
    .filter(w => w.active >= 4 || w.highRisk >= 2)
    .sort((a, b) => b.highRisk - a.highRisk || b.active - a.active)
    .slice(0, 6);

  const helpfulVotes = interactions.filter((i: any) => Number(i.helpful_vote) === 1).length;
  const unhelpfulVotes = interactions.filter((i: any) => Number(i.helpful_vote) === -1).length;

  const topBlockers = Object.entries(blockerCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  let summary = `Проанализировано задач: ${tasks.length}. Выявлено зон повышенной нагрузки: ${workloadAlerts.length}, зафиксировано затруднений: ${topBlockers.reduce((s, b) => s + b.count, 0)}.`;
  let recommendations: string[] = [
    'Добавляйте четкие критерии приемки (check_criteria) и пример эталонного результата при постановке задач.',
    'Перераспределите задачи у перегруженных исполнителей (от 4+ одновременных задач в работе).',
    'Поощряйте использование черновой предпроверки перед финальной сдачей, чтобы снизить число доработок.'
  ];

  try {
    const aiRes = await callProTalkAi({
      prompt: `Сформируй еженедельный управленческий анализ для директора компании по работе ИИ-Ревизора.\nЗадач всего: ${tasks.length}\nТоп затруднений: ${JSON.stringify(topBlockers)}\nПерегруженные сотрудники: ${JSON.stringify(workloadAlerts)}\nПолезность советов ИИ: +${helpfulVotes} / -${unhelpfulVotes}\nПоследние запросы помощи: ${interactions.slice(0, 10).map((i: any) => i.message).join('; ')}`,
      systemPrompt: `Ты — системный бизнес-аналитик ИИ-Ревизора. На основе статистики затруднений, перегрузок и обратной связи дай 3–4 конкретные управленческие рекомендации по улучшению процессов, регламентов и формулировки задач.
Верни СТРОГО валидный JSON:
{
  "summary": "2 емких предложения об общей картине и тренде",
  "recommendations": ["Рекомендация 1...", "Рекомендация 2...", "Рекомендация 3..."]
}`,
      entityType: 'revisor',
      userId: '91827364501',
      jsonOutput: true
    });
    const parsed = extractJsonObject(aiRes?.reply || '');
    if (parsed?.summary) summary = String(parsed.summary);
    if (Array.isArray(parsed?.recommendations) && parsed.recommendations.length > 0) {
      recommendations = parsed.recommendations.slice(0, 5).map(String);
    }
  } catch (err: any) {
    console.warn('[Revisor Insights Fallback]:', err?.message || err);
  }

  const insightId = `ins_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const periodKey = new Date().toISOString().slice(0, 10);
  const createdAt = new Date().toISOString();

  await db.run(
    `INSERT INTO revisor_insights (id, company_id, project_id, period_key, summary, top_blockers, workload_alerts, recommendations, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      insightId,
      companyId,
      projectId || null,
      periodKey,
      summary,
      JSON.stringify(topBlockers),
      JSON.stringify(workloadAlerts),
      JSON.stringify(recommendations),
      createdAt
    ]
  );

  return {
    id: insightId,
    company_id: companyId,
    period_key: periodKey,
    summary,
    top_blockers: topBlockers,
    workload_alerts: workloadAlerts,
    recommendations,
    helpfulVotes,
    unhelpfulVotes,
    created_at: createdAt
  };
}

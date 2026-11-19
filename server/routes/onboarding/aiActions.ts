import { callProTalkAi, safeParseAiJson } from "../../protalk";
import { checkTelegramBotInChat } from "../../../src/utils/telegramProxy";
import { evaluateTaskAiSubmission } from "../../../src/server/taskManager";
import {
  auditOnboardingSteps,
  buildStepsPayload,
  parseDutiesArray,
  safeParseJson,
  seedOnboardingForUser,
} from "./audit";

export async function executeOnboardingAiAction(db: any, userId: string, body: any) {
  const { step_id, action = "ai_generate", input = "", payload = {} } = body || {};

  if (!step_id) {
    return { status: 400, payload: { success: false, error: "Не указан step_id" } };
  }

  const audited = await auditOnboardingSteps(db, userId);
  const { scope } = audited;
  const effectiveId = scope.effectiveUserId;
  const compId = scope.companyId;
  const dirId = scope.directorId;

  let row = await db.get("SELECT * FROM user_onboarding WHERE id = ? LIMIT 1", [effectiveId]);
  if (!row) {
    row = await seedOnboardingForUser(db, { id: effectiveId, role: scope.role });
  }

  const artifacts = safeParseJson<Record<string, any>>(row?.test_artifacts, {});
  const companyContext = `${audited.company?.name || "Компания"}: ${audited.company?.description || audited.company?.products || "Бизнес-процессы компании"}`;

  let resultData: any = {};
  let message = "Настройка выполнена и сохранена в базу данных.";

  // STEP: PROFILE
  if (step_id === "profile") {
    const name = String(payload.name || audited.userName || "Руководитель").trim();
    const position = String(
      payload.position || audited.userPosition || (scope.isBoss ? "Генеральный директор" : "Сотрудник")
    ).trim();
    const phone = String(payload.phone || audited.userPhone || "+7 (999) 000-00-00").trim();
    const timezone = String(payload.timezone || audited.userTimezone || "+03:00").trim();

    await db.run("UPDATE users SET name = ?, position = ?, phone = ?, timezone = ? WHERE id = ?", [
      name,
      position,
      phone,
      timezone,
      effectiveId,
    ]);
    await db.run(
      "UPDATE employees SET name = ?, position = ?, phone = ?, timezone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, position, phone, timezone, effectiveId]
    );
    resultData = { name, position, phone, timezone };
    message = `Профиль «${name}» (${position}) сохранен.`;
  }

  // STEP: DUTIES
  else if (step_id === "duties") {
    let dutiesList: string[] = Array.isArray(payload.duties)
      ? payload.duties.map((d: any) => String(d).trim()).filter(Boolean)
      : [];

    if (action === "ai_generate" || dutiesList.length === 0) {
      const promptText =
        input.trim() ||
        `Сформируй список ключевых должностных обязанностей для должности «${audited.userPosition || scope.role}» в компании «${companyContext}».`;
      let parsed: any = null;
      try {
        const aiRes = await callProTalkAi({
          prompt: `${promptText}\nВерни JSON-массив из 5–7 конкретных должностных обязанностей (строки на русском языке). Формат: {"duties": ["...", "..."]}`,
          systemPrompt:
            "Ты — HR-методолог платформы ИИ Ревизор. Генерируй четкие, измеримые должностные обязанности для контроля работы.",
          entityType: "employee_duties",
          userId: effectiveId,
          jsonOutput: true,
          timeoutMs: 75000,
        });
        parsed = safeParseAiJson<any>(aiRes.reply, null);
      } catch (aiErr) {
        console.warn("Onboarding duties AI fallback:", aiErr);
      }

      if (Array.isArray(parsed?.duties) && parsed.duties.length > 0) {
        dutiesList = parsed.duties.map((s: any) => String(s).trim()).filter(Boolean);
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        dutiesList = parsed.map((s: any) => String(s).trim()).filter(Boolean);
      } else {
        dutiesList = input.trim()
          ? parseDutiesArray(input)
          : scope.onboardingType === "director"
          ? [
              "Стратегическое управление развитием компании и ключевыми показателями",
              "Утверждение оргструктуры, проектов и целевых дедлайнов по отделам",
              "Контроль ежедневной отчетности руководителей подразделений и KPI",
              "Оценка эффективности команды и оптимизация бизнес-процессов",
            ]
          : scope.onboardingType === "manager"
          ? [
              "Координация работы сотрудников подразделения и распределение задач",
              "Ежедневный аудит рапортов команды и контроль сроков проектов",
              "Проведение планерок, устранение блокеров и эскалация рисков директору",
              "Соблюдение регламентов качества ИИ Ревизора по своему направлению",
            ]
          : [
              "Качественное и своевременное выполнение назначенных проектных задач",
              "Ежедневное заполнение и сдача плановых и фактических рапортов",
              "Фиксация результатов работы с подтверждающими комментариями и файлами",
              "Соблюдение рабочего графика смен и оперативная реакция на замечания ИИ",
            ];
      }
    }

    const dutiesJson = JSON.stringify(dutiesList);
    await db.run("UPDATE users SET duties = ? WHERE id = ?", [dutiesJson, effectiveId]);
    await db.run("UPDATE employees SET duties = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
      dutiesJson,
      effectiveId,
    ]);
    resultData = { duties: dutiesList };
    message = `Сохранено ${dutiesList.length} должностных обязанностей.`;
  }

  // STEP: TELEGRAM
  else if (step_id === "telegram") {
    let cleanHandle = String(payload.telegramHandle || "").trim();
    if (cleanHandle && !cleanHandle.startsWith("@")) cleanHandle = `@${cleanHandle}`;
    const tgId = String(payload.telegram_id || "").trim() || null;

    await db.run(
      "UPDATE users SET telegramHandle = COALESCE(?, telegramHandle), telegram_id = COALESCE(?, telegram_id) WHERE id = ?",
      [cleanHandle || null, tgId, effectiveId]
    );
    await db.run(
      "UPDATE employees SET telegram_handle = COALESCE(?, telegram_handle), telegram_id = COALESCE(?, telegram_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [cleanHandle || null, tgId, effectiveId]
    );

    const chatIdInput = String(payload.chat_id || "").trim();
    let chatSaved = null;
    if (chatIdInput) {
      const botCheck = await checkTelegramBotInChat(chatIdInput).catch(() => ({
        ok: false,
        error: "Бот не в чате",
      }));
      const savedId = `tgchat_onb_${Date.now()}`;
      const chatTitle = String(payload.chat_title || (botCheck as any)?.chat?.title || chatIdInput);
      await db.run(
        `INSERT OR REPLACE INTO telegram_saved_chats (id, company_id, chat_id, title, type, bot_present, bot_status, updated_at)
         VALUES (?, ?, ?, ?, 'group', ?, ?, CURRENT_TIMESTAMP)`,
        [savedId, compId, chatIdInput, chatTitle, botCheck.ok ? 1 : 0, (botCheck as any).status || "pending"]
      );
      chatSaved = { chat_id: chatIdInput, title: chatTitle, bot_ok: botCheck.ok };
    }
    resultData = { telegramHandle: cleanHandle, telegram_id: tgId, chatSaved };
    message = "Настройки Telegram сохранены.";
  }

  // STEP: COMPANY & DEPARTMENTS (DIRECTOR)
  else if (step_id === "company") {
    const promptText = input.trim() || String(payload.description || "").trim();
    let compName = String(payload.name || audited.company?.name || "").trim();
    let compDesc = String(payload.description || audited.company?.description || promptText).trim();
    let compProducts = String(payload.products || audited.company?.products || "").trim();
    let generatedDepts: { name: string; description: string; lead_name?: string }[] = Array.isArray(
      payload.departments
    )
      ? payload.departments
      : [];

    if (action === "ai_generate" && (promptText || compName)) {
      try {
        const aiRes = await callProTalkAi({
          prompt: `Создай структуру компании на основе описания: "${promptText || compName}".
Верни JSON формата:
{
  "companyName": "Короткое название до 20 символов",
  "description": "Краткое описание бизнеса (2-3 предложения)",
  "products": "Ключевые продукты или услуги",
  "departments": [
    {"name": "Название до 20 симв", "description": "Функции отдела", "lead_name": "Руководитель"}
  ]
}`,
          systemPrompt: "Ты — бизнес-архитектор ИИ Ревизор. Проектируй лаконичную оргструктуру из 3–4 ключевых отделов.",
          entityType: "company",
          userId: effectiveId,
          jsonOutput: true,
          timeoutMs: 75000,
        });
        const parsed = safeParseAiJson<any>(aiRes.reply, null);
        if (parsed) {
          if (parsed.companyName && (!payload.name || payload.name === "Моя Организация")) {
            compName = String(parsed.companyName).slice(0, 20);
          }
          if (parsed.description) compDesc = String(parsed.description);
          if (parsed.products) compProducts = String(parsed.products);
          if (Array.isArray(parsed.departments) && parsed.departments.length > 0) {
            generatedDepts = parsed.departments;
          }
        }
      } catch (aiErr) {
        console.warn("Onboarding company AI fallback:", aiErr);
      }
    }

    if (!compName) compName = "Моя Компания";
    if (!compDesc) compDesc = promptText || "Системное управление проектами, задачами и отчетами команды.";
    if (!compProducts) compProducts = "Основные услуги и продукты компании";
    if (generatedDepts.length === 0 && audited.departments.length === 0) {
      generatedDepts = [
        { name: "Отдел продаж", description: "Привлечение клиентов и выполнение плана продаж", lead_name: "Руководитель продаж" },
        { name: "Отдел исполнения", description: "Реализация проектов и контроль качества", lead_name: "Руководитель проектов" },
        { name: "Администрация", description: "Финансы, аналитика и поддержка процессов", lead_name: audited.userName || "Директор" },
      ];
    }

    const shortCompName = compName.slice(0, 20);
    if (audited.company?.id) {
      await db.run(
        "UPDATE companies SET name = ?, description = ?, products = ?, product_description = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
        [shortCompName, compDesc, compProducts, compDesc, audited.company.id]
      );
    } else {
      await db.run(
        "INSERT INTO companies (id, director_id, name, description, products, product_description, status, is_active, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'Триал (7 дней)', 1, CURRENT_TIMESTAMP)",
        [compId, dirId, shortCompName, compDesc, compProducts, compDesc]
      );
    }
    await db.run("UPDATE users SET company = ?, company_id = ? WHERE id = ?", [shortCompName, compId, effectiveId]);

    const createdDepts: any[] = [];
    for (let i = 0; i < generatedDepts.length; i++) {
      const d = generatedDepts[i];
      const deptId = `dept-onb-${Date.now().toString(36)}-${i}`;
      const deptName = String(d.name || `Отдел ${i + 1}`).trim().slice(0, 20);
      await db.run(
        `INSERT OR REPLACE INTO departments (id, company_id, director_id, name, type, lead_name, description, x, y, updated_at)
         VALUES (?, ?, ?, ?, 'department', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [deptId, compId, dirId, deptName, d.lead_name || "", d.description || "", (i % 3) * 260, Math.floor(i / 3) * 180]
      );
      createdDepts.push({ id: deptId, name: deptName, description: d.description });
    }
    resultData = {
      company: { id: compId, name: shortCompName, description: compDesc, products: compProducts },
      departments: createdDepts,
    };
    message = `Компания «${shortCompName}» сохранена${createdDepts.length ? ` (добавлено отделов: ${createdDepts.length})` : ""}.`;
  }

  // STEP: EMPLOYEES
  else if (step_id === "employees") {
    const empName = String(payload.name || "").trim();
    const empPos = String(payload.position || "Специалист").trim();
    const empRole = String(payload.role || "EMPLOYEE").toUpperCase();
    const empDeptId = payload.department_id || audited.departments[0]?.id || null;
    const empEmail = String(payload.email || "").trim() || null;
    const empPhone = String(payload.phone || "").trim() || null;

    if (!empName) {
      return { status: 400, payload: { success: false, error: "Укажите ФИО сотрудника" } };
    }
    const empId = `emp-onb-${Date.now().toString(36)}`;
    await db.run(
      `INSERT INTO employees (id, company_id, company, director_id, department_id, name, position, role, email, phone, duties, timezone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        empId,
        compId,
        audited.company?.name || "",
        dirId,
        empDeptId,
        empName,
        empPos,
        empRole,
        empEmail,
        empPhone,
        JSON.stringify(payload.duties || ["Выполнение задач отдела", "Ежедневная отчетность"]),
        audited.userTimezone || "+03:00",
      ]
    );
    resultData = { employee: { id: empId, name: empName, position: empPos, role: empRole } };
    message = `Сотрудник «${empName}» добавлен в структуру.`;
  }

  // STEP: SCHEDULES / SCHEDULE
  else if (step_id === "schedules" || step_id === "schedule") {
    const targetEmpId = String(payload.employee_id || effectiveId);
    const pattern = String(
      payload.pattern_type ||
        (input.includes("2/2") ? "2/2" : input.includes("3/3") ? "3/3" : input.includes("6/1") ? "6/1" : "5/2")
    );
    let wStart = String(payload.work_start || "09:00");
    let wEnd = String(payload.work_end || "18:00");
    let lStart = String(payload.lunch_start || "13:00");
    let lEnd = String(payload.lunch_end || "14:00");
    let finalPattern = pattern;

    if (action === "ai_generate" && input.trim()) {
      try {
        const aiRes = await callProTalkAi({
          prompt: `Разбери описание рабочего графика: "${input.trim()}".
Верни JSON: {"patternType": "5/2|2/2|3/3|6/1|1/3", "workStart": "HH:MM", "workEnd": "HH:MM", "lunchStart": "HH:MM", "lunchEnd": "HH:MM", "summary": "Краткое описание"}`,
          systemPrompt: "Ты — ИИ-диспетчер графиков работы платформы ИИ Рапорт.",
          entityType: "schedule_ai",
          userId: effectiveId,
          jsonOutput: true,
          timeoutMs: 75000,
        });
        const parsed = safeParseAiJson<any>(aiRes.reply, null);
        if (parsed) {
          if (parsed.patternType) finalPattern = String(parsed.patternType);
          if (parsed.workStart) wStart = String(parsed.workStart);
          if (parsed.workEnd) wEnd = String(parsed.workEnd);
          if (parsed.lunchStart) lStart = String(parsed.lunchStart);
          if (parsed.lunchEnd) lEnd = String(parsed.lunchEnd);
        }
      } catch (err) {
        console.warn("Onboarding schedule AI fallback:", err);
      }
    }

    const schedId = `sched-${targetEmpId}`;
    await db.run(
      `INSERT OR REPLACE INTO employee_schedules (
        id, user_id, employee_id, company_id, director_id, name, role, timezone,
        pattern_type, default_work_start, default_work_end, default_lunch_start, default_lunch_end,
        cycle_start_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        schedId,
        targetEmpId,
        targetEmpId,
        compId,
        dirId,
        audited.userName || "График работы",
        scope.role,
        audited.userTimezone || "+03:00",
        finalPattern,
        wStart,
        wEnd,
        lStart,
        lEnd,
        new Date().toISOString().slice(0, 10),
      ]
    );

    if (scope.isBoss) {
      const tplId = `stpl-onb-${effectiveId}`;
      await db.run(
        `INSERT OR REPLACE INTO schedule_templates (id, company_id, user_id, name, pattern_type, work_start, work_end, lunch_start, lunch_end, is_default, description, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
        [
          tplId,
          compId,
          effectiveId,
          `Стандарт ${finalPattern}`,
          finalPattern,
          wStart,
          wEnd,
          lStart,
          lEnd,
          `Создано в онбординге (${wStart}–${wEnd})`,
        ]
      );
    }

    resultData = {
      scheduleId: schedId,
      pattern_type: finalPattern,
      work_start: wStart,
      work_end: wEnd,
      lunch_start: lStart,
      lunch_end: lEnd,
    };
    message = `График ${finalPattern} (${wStart}–${wEnd}) сохранен.`;
  }

  // STEP: REPORTS TEMPLATE (DIRECTOR)
  else if (step_id === "reports") {
    let title = String(payload.title || "").trim();
    let fields = Array.isArray(payload.fields) ? payload.fields : [];
    const deadlineTime = String(payload.deadline_time || "18:00");
    const rType = String(payload.type || "FACT_DAY");

    if (action === "ai_generate" || fields.length === 0) {
      const descPrompt = input.trim() || `Создай шаблон ежедневного отчета сотрудника для компании ${companyContext}.`;
      try {
        const aiRes = await callProTalkAi({
          prompt: `${descPrompt}
Верни JSON:
{
  "title": "Название шаблона отчета",
  "check_criteria": "Критерии оценки отчета ИИ",
  "fields": [
    {"id": "f1", "label": "Название поля", "type": "text|number|boolean|checklist", "required": true}
  ]
}`,
          systemPrompt: "Ты — методолог отчетности ИИ Рапорт. Создавай 4–5 практичных полей отчета.",
          entityType: "raport",
          userId: effectiveId,
          jsonOutput: true,
          timeoutMs: 75000,
        });
        const parsed = safeParseAiJson<any>(aiRes.reply, null);
        if (parsed) {
          if (!title && parsed.title) title = String(parsed.title);
          if (Array.isArray(parsed.fields) && parsed.fields.length > 0) fields = parsed.fields;
        }
      } catch (err) {
        console.warn("Onboarding reports AI fallback:", err);
      }
    }

    if (!title) title = "Ежедневный рапорт смены";
    if (fields.length === 0) {
      fields = [
        { id: "f_done", label: "Что ключевого выполнено за день", type: "text", required: true },
        { id: "f_kpi", label: "Ключевой количественный результат (цифры)", type: "number", required: true },
        { id: "f_blockers", label: "Сложности и что требуется от руководителя", type: "text", required: false },
        { id: "f_plan", label: "План на следующий рабочий день", type: "text", required: true },
      ];
    }

    const tplId = `tpl-onb-${Date.now().toString(36)}`;
    await db.run(
      `INSERT INTO report_templates (
        id, company_id, director_id, departmentId, title, description, type, fields,
        target_departments, target_employees, checker_type, check_criteria, deadline_time, is_active, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '["all"]', '["all"]', 'ai', ?, ?, 1, CURRENT_TIMESTAMP)`,
      [
        tplId,
        compId,
        dirId,
        audited.departments[0]?.id || "dep-1",
        title,
        input.trim() || "Создано в мастере запуска",
        rType,
        JSON.stringify(fields),
        payload.check_criteria || "Проверить конкретность фактов, измеримость цифр и наличие плана на завтра",
        deadlineTime,
      ]
    );
    resultData = { template: { id: tplId, title, fields, deadline_time: deadlineTime } };
    message = `Шаблон отчета «${title}» (${fields.length} полей) создан.`;
  }

  // STEP: REPORT RULES (DIRECTOR)
  else if (step_id === "report_rules") {
    const ruleId = `rule-onb-${Date.now().toString(36)}`;
    const title = String(payload.title || "Уведомления о ежедневных рапортах").trim();
    const destType = String(payload.destination_type || "director");
    const targetChatId = String(payload.target_chat_id || audited.tgId || "").trim();
    const sendTg = payload.send_telegram !== false ? 1 : 0;

    await db.run(
      `INSERT INTO telegram_routing_rules (
        id, company_id, title, template_ids, department_ids, destination_type, report_format,
        target_user_id, target_chat_id, send_on_submit, send_reminder, notify_inapp, send_telegram,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, '["all"]', '["all"]', ?, 'full', ?, ?, 1, 1, 1, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [ruleId, compId, title, destType, dirId, targetChatId, sendTg]
    );
    resultData = { rule: { id: ruleId, title, destination_type: destType } };
    message = `Правило «${title}» создано и активировано.`;
  }

  // STEP: PROJECTS (DIRECTOR)
  else if (step_id === "projects") {
    let title = String(payload.title || "").trim();
    let promptBody = String(input || payload.description || "").trim();
    if (action === "ai_generate" && (promptBody || title)) {
      try {
        const aiRes = await callProTalkAi({
          prompt: `Сформулируй паспорт проекта для компании ${companyContext}. Идея: "${promptBody || title}".
Верни JSON: {"title": "Короткое название (до 20 символов)", "goal": "Цель и измеримый результат (2-3 предложения)"}`,
          systemPrompt: "Ты — проектный директор ИИ Ревизор.",
          entityType: "project",
          userId: effectiveId,
          jsonOutput: true,
          timeoutMs: 75000,
        });
        const parsed = safeParseAiJson<any>(aiRes.reply, null);
        if (parsed) {
          if (!title && parsed.title) title = String(parsed.title);
          if (parsed.goal) promptBody = String(parsed.goal);
        }
      } catch (err) {
        console.warn("Onboarding project AI fallback:", err);
      }
    }
    if (!title) title = "Запуск роста";
    if (!promptBody) promptBody = "Систематизация ключевого направления компании и выход на плановые показатели.";
    const projId = `proj-onb-${Date.now().toString(36)}`;
    const sDate = new Date().toISOString().slice(0, 10);
    const eDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    await db.run(
      `INSERT INTO projects (id, title, prompt, status, manager, budget, startDate, endDate, evaluation, recommendations, author_id, director_id, company_id)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projId,
        title.slice(0, 20),
        promptBody,
        audited.userName || "Руководитель",
        Number(payload.budget || 0),
        sDate,
        eDate,
        "Проект создан в рамках быстрого старта.",
        "Декомпозируйте проект на 3–5 конкретных задач.",
        effectiveId,
        dirId,
        compId,
      ]
    );
    resultData = { project: { id: projId, title: title.slice(0, 20), prompt: promptBody } };
    message = `Проект «${title.slice(0, 20)}» создан.`;
  }

  // STEP: TASKS (DIRECTOR)
  else if (step_id === "tasks") {
    const targetProjId = payload.project_id || audited.projects[0]?.id || null;
    const projTitle =
      audited.projects.find((p: any) => p.id === targetProjId)?.title ||
      audited.projects[0]?.title ||
      "Проект компании";
    let tasksToCreate: any[] = Array.isArray(payload.tasks) ? payload.tasks : [];

    if (action === "ai_generate" || tasksToCreate.length === 0) {
      const promptText = input.trim() || `Декомпозируй проект «${projTitle}» на 3 конкретные задачи с чек-листами.`;
      try {
        const aiRes = await callProTalkAi({
          prompt: `${promptText}
Верни JSON: {"tasks": [{"title": "Название", "description": "Что сделать", "checklist": ["Шаг 1", "Шаг 2"], "priority": "high|medium"}]}`,
          systemPrompt: "Ты — ИИ-проджект-менеджер ИИ Ревизор.",
          entityType: "tasks",
          userId: effectiveId,
          jsonOutput: true,
          timeoutMs: 75000,
        });
        const parsed = safeParseAiJson<any>(aiRes.reply, null);
        if (Array.isArray(parsed?.tasks) && parsed.tasks.length > 0) {
          tasksToCreate = parsed.tasks.slice(0, 5);
        }
      } catch (err) {
        console.warn("Onboarding tasks AI fallback:", err);
      }
    }

    if (tasksToCreate.length === 0) {
      tasksToCreate = [
        {
          title: input.trim().slice(0, 80) || "Подготовить план и материалы проекта",
          description: "Сформировать список ресурсов, ответственных и контрольных точек.",
          checklist: ["Определить цели", "Согласовать ресурсы", "Зафиксировать дедлайны"],
          priority: "high",
        },
        {
          title: "Выполнить первый контрольный этап",
          description: "Реализовать базовые действия и прикрепить подтверждение результата.",
          checklist: ["Провести работу", "Подготовить отчет с цифрами"],
          priority: "medium",
        },
      ];
    }

    const created: any[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const dlStr = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    for (let i = 0; i < tasksToCreate.length; i++) {
      const t = tasksToCreate[i];
      const tId = `task-onb-${Date.now().toString(36)}-${i}`;
      const tTitle = String(t.title || `Задача ${i + 1}`).slice(0, 95);
      await db.run(
        `INSERT INTO tasks (id, projectId, title, executorId, executorName, executorRole, status, priority, startDate, start_date, deadLine, score, description, checklist, checker_type, author_id, director_id, company_id)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 85, ?, ?, 'ai', ?, ?, ?)`,
        [
          tId,
          targetProjId,
          tTitle,
          payload.executorId || effectiveId,
          payload.executorName || audited.userName || "Исполнитель",
          scope.role,
          t.priority || "medium",
          todayStr,
          todayStr,
          dlStr,
          t.description || "",
          JSON.stringify(Array.isArray(t.checklist) ? t.checklist : ["Выполнить задачу", "Приложить результат"]),
          effectiveId,
          dirId,
          compId,
        ]
      );
      created.push({ id: tId, title: tTitle });
    }
    resultData = { tasks: created };
    message = `Создано задач: ${created.length}.`;
  }

  // STEP: PROJECT RULES (DIRECTOR)
  else if (step_id === "project_rules") {
    const ruleId = `taskrule-onb-${Date.now().toString(36)}`;
    const title = String(payload.title || "Уведомления и контроль сроков по задачам").trim();
    const destType = String(payload.destination_type || "director");
    const targetChatId = String(payload.target_chat_id || audited.tgId || "").trim();

    await db.run(
      `INSERT INTO task_routing_rules (
        id, company_id, title, project_ids, department_ids, destination_type, report_format,
        target_user_id, target_chat_id, send_on_create, send_on_submit, send_reminder,
        notify_inapp, send_telegram, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, '["all"]', '["all"]', ?, 'brief', ?, ?, 1, 1, 1, 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [ruleId, compId, title, destType, dirId, targetChatId]
    );
    resultData = { rule: { id: ruleId, title } };
    message = `Правило задач «${title}» активировано.`;
  }

  // STEP: TEST REPORT (MANAGER & EMPLOYEE)
  else if (step_id === "test_report") {
    const reportText = String(input || payload.reportText || "").trim();
    if (!reportText) {
      return { status: 400, payload: { success: false, error: "Напишите или надиктуйте текст тестового рапорта" } };
    }

    let aiScore = 88;
    let aiSummary = "Тестовый рапорт успешно проверен ИИ-методологом.";
    let aiRecs =
      "Отлично указаны выполненные действия. Для максимальной оценки добавляйте измеримые цифры и план на завтра.";

    try {
      const aiRes = await callProTalkAi({
        prompt: `Оцени учебный тестовый рапорт сотрудника (${scope.role}, обязанности: ${audited.duties.join("; ") || "общие"}):
"${reportText}"
Верни JSON: {"score": 0..100, "summary": "Краткое резюме (1-2 предл.)", "recommendations": "2 конкретные рекомендации"}`,
        systemPrompt: "Ты — доброжелательный и точный ИИ-аналитик рапортов.",
        entityType: "raport",
        userId: effectiveId,
        jsonOutput: true,
        timeoutMs: 75000,
      });
      const parsed = safeParseAiJson<any>(aiRes.reply, null);
      if (parsed) {
        if (typeof parsed.score === "number") aiScore = Math.min(100, Math.max(40, Math.round(parsed.score)));
        if (parsed.summary) aiSummary = String(parsed.summary);
        if (parsed.recommendations) aiRecs = String(parsed.recommendations);
      }
    } catch (err) {
      console.warn("Onboarding test_report AI fallback:", err);
    }

    const repId = `rep-onb-test-${Date.now().toString(36)}`;
    const tpl = audited.reportTemplates[0];
    await db.run(
      `INSERT INTO reports (
        id, templateId, templateTitle, type, employeeId, employee_id, employeeName,
        departmentId, departmentName, company_id, director_id, timestamp, answers, files,
        qualityScore, aiRecommendations, statusColor, status, checker_type, voiceInputUsed, aiSummary
      ) VALUES (?, ?, ?, 'FACT_DAY', ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, 'gold', 'submitted', 'ai', ?, ?)`,
      [
        repId,
        tpl?.id || "tpl-onb-test",
        tpl?.title || "Учебный тестовый рапорт",
        effectiveId,
        effectiveId,
        audited.userName || "Сотрудник",
        scope.emp?.department_id || audited.departments[0]?.id || "dep-1",
        audited.departments[0]?.name || "Основной отдел",
        compId,
        dirId,
        new Date().toISOString(),
        JSON.stringify({ text: reportText, onboardingTest: true }),
        aiScore,
        aiRecs,
        payload.voiceInputUsed ? 1 : 0,
        aiSummary,
      ]
    );
    artifacts.test_report_id = repId;
    resultData = { reportId: repId, score: aiScore, summary: aiSummary, recommendations: aiRecs };
    message = `Тестовый рапорт проверен ИИ: оценка ${aiScore}/100!`;
  }

  // STEP: TEST PROJECT (MANAGER & EMPLOYEE)
  else if (step_id === "test_project") {
    const existingProj = audited.projects[0];
    let projId = existingProj?.id;
    let projTitle = existingProj?.title;
    let aiPlanSummary = "";

    const userIdea = String(input || payload.idea || "").trim();
    try {
      const aiRes = await callProTalkAi({
        prompt: `Сформируй краткий чек-лист роли ${scope.role} в проекте «${projTitle || userIdea || "Учебный проект онбординга"}».
Запрос пользователя: "${userIdea || "Понять ключевые контрольные точки и как отчитываться по этапам"}".
Верни JSON: {"title": "Название проекта", "summary": "План действий в 2-3 предложениях"}`,
        systemPrompt: "Ты — наставник ИИ Ревизора по проектной работе.",
        entityType: "revisor",
        userId: effectiveId,
        jsonOutput: true,
        timeoutMs: 75000,
      });
      const parsed = safeParseAiJson<any>(aiRes.reply, null);
      if (parsed?.summary) aiPlanSummary = String(parsed.summary);
      if (!projTitle && parsed?.title) projTitle = String(parsed.title);
    } catch {}

    if (!existingProj) {
      projId = `proj-onb-test-${Date.now().toString(36)}`;
      projTitle = (projTitle || userIdea || "Тестовый проект").slice(0, 20);
      const sDate = new Date().toISOString().slice(0, 10);
      const eDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      await db.run(
        `INSERT INTO projects (id, title, prompt, status, manager, startDate, endDate, evaluation, recommendations, author_id, director_id, company_id)
         VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projId,
          projTitle,
          userIdea || "Ознакомительный проект мастера запуска",
          audited.userName || "Участник",
          sDate,
          eDate,
          aiPlanSummary || "Учебный проект для тестирования ИИ Ревизора.",
          "Пройдите тестовую задачу на следующем шаге.",
          effectiveId,
          dirId,
          compId,
        ]
      );
      artifacts.test_project_id = projId;
    }
    resultData = {
      projectId: projId,
      title: projTitle || "Проект компании",
      summary: aiPlanSummary || "Вы разобрали структуру проекта, этапы и контрольные точки.",
    };
    message = `Проект «${resultData.title}» разобран с ИИ!`;
  }

  // STEP: TEST TASKS (MANAGER & EMPLOYEE)
  else if (step_id === "test_tasks") {
    const submissionText = String(input || payload.answer || "").trim();
    if (!submissionText) {
      return {
        status: 400,
        payload: { success: false, error: "Опишите или надиктуйте результат выполнения тестовой задачи" },
      };
    }

    const taskId = `task-onb-test-${Date.now().toString(36)}`;
    const taskTitle = String(
      payload.taskTitle ||
        (scope.onboardingType === "manager"
          ? "Тестовая проверка этапа отдела"
          : "Тестовое выполнение проектной задачи")
    );
    const projId = audited.projects[0]?.id || artifacts.test_project_id || null;
    const todayStr = new Date().toISOString().slice(0, 10);

    const mockTask = {
      id: taskId,
      title: taskTitle,
      description: "Учебная задача для проверки работы ИИ-контролера.",
      check_criteria: "Наличие конкретного описанного результата, фактов или плана доработки.",
      fields: [{ id: "result", label: "Результат выполнения", type: "text" }],
    };

    const evalRes = await evaluateTaskAiSubmission({
      task: mockTask,
      project: audited.projects[0],
      answers: { result: submissionText },
      executorUser: { id: effectiveId, name: audited.userName },
    });

    const verdict = evalRes?.aiVerdict || "accepted";
    const score = evalRes?.qualityScore ?? 90;
    const summary = evalRes?.aiSummary || "Тестовая задача успешно проверена ИИ Ревизором.";
    const recs = evalRes?.aiRecommendations || "Результат зафиксирован корректно.";

    await db.run(
      `INSERT INTO tasks (
        id, projectId, title, executorId, executorName, executorRole, status, priority,
        startDate, start_date, deadLine, score, description, checklist, answers,
        checker_type, ai_evaluation, ai_recommendations, ai_verdict, ai_quality_score,
        author_id, director_id, company_id
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', 'medium', ?, ?, ?, ?, ?, ?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        projId,
        taskTitle.slice(0, 95),
        effectiveId,
        audited.userName || "Сотрудник",
        scope.role,
        todayStr,
        todayStr,
        todayStr,
        score,
        mockTask.description,
        JSON.stringify(["Изучить задание", "Сдать отчет с результатом"]),
        JSON.stringify({ result: submissionText }),
        summary,
        typeof recs === "string" ? recs : JSON.stringify(recs),
        verdict,
        score,
        effectiveId,
        dirId,
        compId,
      ]
    );

    artifacts.test_task_id = taskId;
    resultData = { taskId, score, verdict, summary, recommendations: recs };
    message = `Задача оценена ИИ Ревизором: ${score}/100 (${verdict === "accepted" ? "Принято" : "Есть рекомендации"}).`;
  }

  // Mark step completed & store test artifacts
  const stepsState = safeParseJson<Record<string, string>>(row?.steps_state, {});
  let skippedSteps = safeParseJson<string[]>(row?.skipped_steps, []);
  stepsState[step_id] = "completed";
  skippedSteps = skippedSteps.filter((s) => s !== step_id);

  await db.run(
    `UPDATE user_onboarding SET
      steps_state = ?,
      skipped_steps = ?,
      test_artifacts = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      JSON.stringify(stepsState),
      JSON.stringify(skippedSteps),
      JSON.stringify(artifacts),
      new Date().toISOString(),
      effectiveId,
    ]
  );

  const latestAudit = await auditOnboardingSteps(db, effectiveId);
  const steps = buildStepsPayload(scope.onboardingType, latestAudit.stepAudit, stepsState, skippedSteps);

  return {
    status: 200,
    payload: {
      success: true,
      step_id,
      message,
      data: resultData,
      steps,
    },
  };
}

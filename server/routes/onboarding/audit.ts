import { DIRECTOR_STEP_IDS, TEAM_STEP_IDS, type OnboardingType } from "./constants";

export { DIRECTOR_STEP_IDS, TEAM_STEP_IDS, type OnboardingType };

let tableInitialized = false;

export async function ensureOnboardingTable(db: any) {
  if (tableInitialized) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_onboarding (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        onboarding_type TEXT DEFAULT 'director',
        role TEXT DEFAULT 'DIRECTOR',
        current_step_id TEXT DEFAULT 'profile',
        steps_state TEXT DEFAULT '{}',
        skipped_steps TEXT DEFAULT '[]',
        draft_inputs TEXT DEFAULT '{}',
        test_artifacts TEXT DEFAULT '{}',
        is_completed INTEGER DEFAULT 0,
        is_minimized INTEGER DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        updated_at TEXT
      );
    `);
    tableInitialized = true;
  } catch (err) {
    console.warn("ensureOnboardingTable warning:", err);
  }
}

export function resolveOnboardingType(role?: string): OnboardingType {
  const r = String(role || "DIRECTOR").trim().toUpperCase();
  if (r === "MANAGER" || r === "РУКОВОДИТЕЛЬ" || r === "LEADER" || r === "МЕНЕДЖЕР") {
    return "manager";
  }
  if (r === "EMPLOYEE" || r === "СОТРУДНИК" || r === "EMPLOYER" || r === "СПЕЦИАЛИСТ") {
    return "employee";
  }
  return "director";
}

export function safeParseJson<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "object") return val as T;
  try {
    return JSON.parse(String(val));
  } catch {
    return fallback;
  }
}

export function parseDutiesArray(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      } catch {}
    }
    return trimmed
      .split(/[\n;]+/)
      .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
  return [];
}

export async function resolveUserScope(db: any, userId: string) {
  let [user, emp] = await Promise.all([
    db.get("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]),
    db.get("SELECT * FROM employees WHERE id = ? LIMIT 1", [userId]),
  ]);
  if (!user) {
    user = await db.get("SELECT * FROM users WHERE email = ? OR telegram_id = ? LIMIT 1", [userId, userId]);
  }
  if (!emp) {
    emp = await db.get("SELECT * FROM employees WHERE email = ? OR telegram_id = ? LIMIT 1", [userId, userId]);
  }

  const effectiveUserId = String(user?.id || emp?.id || userId);
  const role = String(user?.role || emp?.role || "DIRECTOR").toUpperCase();
  const onboardingType = resolveOnboardingType(role);
  const isBoss = onboardingType === "director";

  const directorId = isBoss
    ? effectiveUserId
    : String(user?.director_id || emp?.director_id || effectiveUserId);

  let company = null;
  const candidateCompId =
    user?.company_id || emp?.company_id || (directorId ? `com-${directorId}` : `com-${effectiveUserId}`);

  if (candidateCompId && candidateCompId !== "flagship-main") {
    company = await db.get(
      "SELECT * FROM companies WHERE id = ? OR director_id = ? LIMIT 1",
      [candidateCompId, directorId]
    );
  } else if (directorId) {
    company = await db.get(
      "SELECT * FROM companies WHERE director_id = ? OR id = ? LIMIT 1",
      [directorId, `com-${directorId}`]
    );
  }

  const companyId = company?.id || candidateCompId || `com-${directorId}`;

  return {
    user,
    emp,
    effectiveUserId,
    role,
    onboardingType,
    isBoss,
    directorId,
    companyId,
    company,
  };
}

export async function seedOnboardingForUser(db: any, user: any) {
  if (!user || !user.id) return null;
  await ensureOnboardingTable(db);
  const userId = String(user.id);
  const existing = await db.get("SELECT * FROM user_onboarding WHERE id = ? OR user_id = ? LIMIT 1", [
    userId,
    userId,
  ]);
  if (existing) return existing;

  const onboardingType = resolveOnboardingType(user.role);
  const nowIso = new Date().toISOString();
  await db.run(
    `INSERT OR IGNORE INTO user_onboarding (
      id, user_id, onboarding_type, role, current_step_id, steps_state,
      skipped_steps, draft_inputs, test_artifacts, is_completed, is_minimized,
      started_at, updated_at
    ) VALUES (?, ?, ?, ?, 'profile', '{}', '[]', '{}', '{}', 0, 0, ?, ?)`,
    [userId, userId, onboardingType, String(user.role || "DIRECTOR"), nowIso, nowIso]
  );
  return db.get("SELECT * FROM user_onboarding WHERE id = ?", [userId]);
}

export async function auditOnboardingSteps(db: any, rawUserId: string) {
  const scope = await resolveUserScope(db, rawUserId);
  const { user, emp, effectiveUserId, role, directorId, companyId, company } = scope;

  const userName = String(user?.name || emp?.name || "").trim();
  const userPosition = String(user?.position || emp?.position || "").trim();
  const userPhone = String(user?.phone || emp?.phone || "").trim();
  const userEmail = String(user?.email || emp?.email || "").trim();
  const userTimezone = String(user?.timezone || emp?.timezone || "+03:00").trim();
  const duties =
    parseDutiesArray(user?.duties).length > 0
      ? parseDutiesArray(user?.duties)
      : parseDutiesArray(emp?.duties);

  const rawTgHandle =
    user?.telegramHandle ?? user?.telegramhandle ?? emp?.telegram_handle ?? (user?.username ? `@${user.username}` : "");
  const tgHandle = String(rawTgHandle || "").trim();
  const tgId = String(user?.telegram_id || emp?.telegram_id || "").trim();

  const [
    departments,
    employees,
    scheduleTemplates,
    employeeSchedules,
    reportTemplates,
    reportRules,
    savedChats,
    projects,
    tasks,
    taskRules,
    reports,
  ] = await Promise.all([
    db.all("SELECT * FROM departments WHERE company_id = ? OR company_id = ?", [companyId, `com-${directorId}`]),
    db.all("SELECT * FROM employees WHERE company_id = ? OR director_id = ?", [companyId, directorId]),
    db.all("SELECT * FROM schedule_templates WHERE company_id = ? OR user_id = ?", [companyId, effectiveUserId]),
    db.all("SELECT * FROM employee_schedules WHERE user_id = ? OR employee_id = ? OR director_id = ? OR company_id = ?", [effectiveUserId, effectiveUserId, directorId, companyId]),
    db.all("SELECT * FROM report_templates WHERE is_active = 1 AND (company_id = ? OR director_id = ?)", [companyId, directorId]),
    db.all("SELECT * FROM telegram_routing_rules WHERE is_active = 1 AND company_id = ?", [companyId]),
    db.all("SELECT * FROM telegram_saved_chats WHERE company_id = ?", [companyId]),
    db.all("SELECT * FROM projects WHERE company_id = ? OR director_id = ? OR author_id = ?", [companyId, directorId, effectiveUserId]),
    db.all("SELECT * FROM tasks WHERE company_id = ? OR director_id = ? OR executorId = ? OR author_id = ?", [companyId, directorId, effectiveUserId, effectiveUserId]),
    db.all("SELECT * FROM task_routing_rules WHERE is_active = 1 AND company_id = ?", [companyId]),
    db.all("SELECT * FROM reports WHERE employeeId = ? OR employee_id = ? OR director_id = ? OR company_id = ?", [effectiveUserId, effectiveUserId, directorId, companyId]),
  ]);

  const mySchedule = employeeSchedules.find(
    (s: any) =>
      String(s.user_id) === effectiveUserId ||
      String(s.employee_id) === effectiveUserId ||
      s.id === `sched-${effectiveUserId}`
  );

  const myReports = reports.filter(
    (r: any) =>
      String(r.employeeId ?? r.employee_id ?? r.employeeid ?? "") === effectiveUserId
  );
  const myTasks = tasks.filter(
    (t: any) =>
      String(t.executorId ?? t.executorid ?? "") === effectiveUserId ||
      String(t.author_id || "") === effectiveUserId
  );

  const otherEmployees = employees.filter((e: any) => String(e.id) !== directorId);

  const profileOk = Boolean(userName && userPosition && (userPhone || userEmail));
  const dutiesOk = duties.length >= 2;
  const tgOk = Boolean(tgId || tgHandle || savedChats.length > 0);
  const companyOk =
    Boolean(
      company?.name &&
        company.name.trim() &&
        (company.description || company.products || company.product_description)
    ) && departments.length > 0;
  const employeesOk = otherEmployees.length > 0 || employees.length > 1;
  const schedulesOk = scheduleTemplates.length > 0 || employeeSchedules.length > 0;
  const myScheduleOk = Boolean(mySchedule);
  const reportsOk = reportTemplates.length > 0;
  const reportRulesOk = reportRules.length > 0;
  const projectsOk = projects.length > 0;
  const tasksOk = tasks.length > 0;
  const projectRulesOk = taskRules.length > 0;
  const tariffsOk = Boolean(
    user?.trial_ends_at || user?.is_trial_active || user?.revisor_active || user?.raport_active
  );
  const refCode = user?.referralCode ?? user?.referralcode ?? user?.referral_code;
  const invitedCount = Number(user?.invitedUsersCount ?? user?.inviteduserscount ?? 0);
  const referralOk = Boolean(refCode || effectiveUserId);

  const stepAudit: Record<string, { dbReady: boolean; summary: string; count?: number }> = {
    profile: {
      dbReady: profileOk,
      summary: profileOk
        ? `${userName} (${userPosition}), часовой пояс ${userTimezone}`
        : "Укажите ФИО, должность и контакты",
    },
    duties: {
      dbReady: dutiesOk,
      count: duties.length,
      summary: dutiesOk
        ? `Задано обязанностей: ${duties.length}`
        : "Добавьте или сгенерируйте обязанности",
    },
    telegram: {
      dbReady: tgOk,
      summary: tgId
        ? `Telegram ID ${tgId}${tgHandle ? ` (${tgHandle})` : ""} привязан`
        : tgHandle
        ? `Ник ${tgHandle} указан`
        : "Укажите @username или Telegram ID / чат",
    },
    company: {
      dbReady: companyOk,
      count: departments.length,
      summary: companyOk
        ? `«${company?.name}», отделов: ${departments.length}`
        : `Отделов: ${departments.length}. Заполните описание и отделы`,
    },
    employees: {
      dbReady: employeesOk,
      count: employees.length,
      summary: `В команде: ${employees.length} чел.`,
    },
    schedules: {
      dbReady: schedulesOk,
      count: employeeSchedules.length + scheduleTemplates.length,
      summary: `Шаблонов: ${scheduleTemplates.length}, графиков: ${employeeSchedules.length}`,
    },
    schedule: {
      dbReady: myScheduleOk,
      summary: myScheduleOk
        ? `График ${mySchedule.pattern_type || "5/2"} (${mySchedule.default_work_start || "09:00"}–${mySchedule.default_work_end || "18:00"})`
        : "Настройте ваш личный рабочий график",
    },
    reports: {
      dbReady: reportsOk,
      count: reportTemplates.length,
      summary: reportsOk
        ? `Шаблонов рапортов: ${reportTemplates.length}`
        : "Создайте первый шаблон отчета",
    },
    report_rules: {
      dbReady: reportRulesOk,
      count: reportRules.length,
      summary: reportRulesOk
        ? `Правил маршрутизации: ${reportRules.length}`
        : "Создайте правило уведомлений рапортов",
    },
    projects: {
      dbReady: projectsOk,
      count: projects.length,
      summary: projectsOk ? `Активных проектов: ${projects.length}` : "Создайте первый проект",
    },
    tasks: {
      dbReady: tasksOk,
      count: tasks.length,
      summary: tasksOk ? `Задач по проектам: ${tasks.length}` : "Сгенерируйте или добавьте задачи",
    },
    project_rules: {
      dbReady: projectRulesOk,
      count: taskRules.length,
      summary: projectRulesOk
        ? `Правил проектов/задач: ${taskRules.length}`
        : "Настройте правила уведомлений по задачам",
    },
    tariffs: {
      dbReady: tariffsOk,
      summary: user?.trial_ends_at
        ? `Триал активен до ${String(user.trial_ends_at).slice(0, 10)}, баланс ${Number(user?.payment_balance || 0)} RR`
        : "Тарифный план настроен",
    },
    referral: {
      dbReady: referralOk,
      summary: `Код ${refCode || "ref" + effectiveUserId.slice(-4)}, партнеров: ${invitedCount}`,
    },
    test_report: {
      dbReady: myReports.length > 0,
      count: myReports.length,
      summary:
        myReports.length > 0
          ? `Сдано рапортов: ${myReports.length}`
          : "Пройдите тестовую сдачу рапорта с ИИ",
    },
    test_project: {
      dbReady: projects.length > 0,
      count: projects.length,
      summary:
        projects.length > 0
          ? `Доступно проектов: ${projects.length}, ролевых прав: ${role}`
          : "Проверьте доступ к проектам и разберите тестовый проект",
    },
    test_tasks: {
      dbReady: myTasks.some((t: any) => t.status === "completed" || t.ai_verdict),
      count: myTasks.length,
      summary:
        myTasks.length > 0
          ? `Задач назначено/доступно: ${myTasks.length}`
          : "Выполните и проверьте тестовую задачу через ИИ",
    },
  };

  return {
    scope,
    userName,
    userPosition,
    userPhone,
    userEmail,
    userTimezone,
    duties,
    tgHandle,
    tgId,
    refCode: refCode || `ref${effectiveUserId.slice(-4)}`,
    invitedCount,
    company,
    departments,
    employees,
    scheduleTemplates,
    employeeSchedules,
    mySchedule,
    reportTemplates,
    reportRules,
    savedChats,
    projects,
    tasks,
    taskRules,
    reports,
    stepAudit,
  };
}

export function buildStepsPayload(
  onboardingType: OnboardingType,
  stepAudit: Record<string, { dbReady: boolean; summary: string; count?: number }>,
  stepsState: Record<string, string>,
  skippedSteps: string[]
) {
  const ids = onboardingType === "director" ? DIRECTOR_STEP_IDS : TEAM_STEP_IDS;
  return ids.map((id) => {
    const audit = stepAudit[id] || { dbReady: false, summary: "" };
    const persisted = stepsState[id];
    const isSkipped = skippedSteps.includes(id) || persisted === "skipped";
    const status =
      persisted === "completed"
        ? "completed"
        : isSkipped
        ? "skipped"
        : audit.dbReady
        ? "completed"
        : "pending";
    return {
      id,
      status,
      dbReady: audit.dbReady,
      summary: audit.summary,
      count: audit.count,
    };
  });
}

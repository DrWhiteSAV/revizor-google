import { sendTelegramRichMessage } from "../../../src/utils/telegramProxy";
import { auditOnboardingSteps, buildStepsPayload, safeParseJson } from "./audit";

export async function verifyOnboardingStep(db: any, userId: string, body: any) {
  const { step_id, send_test_telegram, test_chat_id } = body || {};

  if (!step_id) {
    return { status: 400, payload: { success: false, error: "Укажите step_id для проверки" } };
  }

  const audited = await auditOnboardingSteps(db, userId);
  const { scope, stepAudit } = audited;
  const baseAudit = stepAudit[step_id] || { dbReady: false, summary: "Неизвестный шаг" };

  let passed = baseAudit.dbReady;
  let testOutput = baseAudit.summary;
  const checks: { label: string; ok: boolean; detail: string }[] = [];

  if (step_id === "profile") {
    checks.push({
      label: "ФИО и должность",
      ok: Boolean(audited.userName && audited.userPosition),
      detail: audited.userName ? `${audited.userName} — ${audited.userPosition}` : "Не заполнено",
    });
    checks.push({
      label: "Контакты и часовой пояс",
      ok: Boolean(audited.userPhone || audited.userEmail),
      detail: `${audited.userPhone || audited.userEmail || "—"} (${audited.userTimezone})`,
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? "Профиль заполнен и синхронизирован с базой данных."
      : "Заполните обязательные поля профиля.";
  } else if (step_id === "duties") {
    checks.push({
      label: "Должностные обязанности",
      ok: audited.duties.length >= 2,
      detail: `Пунктов: ${audited.duties.length}`,
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? `ИИ будет опираться на ${audited.duties.length} должностных обязанностей при проверке отчетов и задач.`
      : "Добавьте минимум 2 обязанности (вручную или через ИИ).";
  } else if (step_id === "telegram") {
    const targetId = String(test_chat_id || audited.tgId || audited.savedChats[0]?.chat_id || "").trim();
    checks.push({
      label: "Telegram ID / Username",
      ok: Boolean(audited.tgId || audited.tgHandle),
      detail: audited.tgId ? `ID: ${audited.tgId}` : audited.tgHandle || "Не указан",
    });
    if (send_test_telegram && targetId) {
      try {
        const tgRes = await sendTelegramRichMessage({
          chatId: targetId,
          markdown: `✅ *Проверка онбординга ИИ Ревизор & Рапорт*\n\nСвязь с вашим Telegram настроена успешно!\nПользователь: ${audited.userName || scope.effectiveUserId}`,
        });
        checks.push({
          label: "Тестовая отправка сообщения",
          ok: Boolean(tgRes.ok),
          detail: tgRes.ok ? `Сообщение доставлено в ${targetId}` : tgRes.error || "Бот не получил доступ к чату",
        });
        passed = Boolean(tgRes.ok);
        testOutput = tgRes.ok
          ? `Тестовое уведомление отправлено в Telegram (${targetId})!`
          : `Не удалось отправить: ${tgRes.error || "нажмите /start в боте @ii_rrbot"}`;
      } catch (tgErr: any) {
        checks.push({ label: "Тестовая отправка", ok: false, detail: tgErr.message });
        passed = false;
        testOutput = `Ошибка отправки в Telegram: ${tgErr.message}`;
      }
    } else {
      passed = Boolean(audited.tgId || audited.tgHandle || audited.savedChats.length > 0);
      testOutput = passed
        ? "Telegram привязан к аккаунту. Вы можете отправить тестовый пинг для полной проверки."
        : "Привяжите Telegram ID / @username или добавьте корпоративный чат.";
    }
  } else if (step_id === "company") {
    checks.push({
      label: "Карточка компании",
      ok: Boolean(audited.company?.name),
      detail: audited.company?.name || "Не указана",
    });
    checks.push({
      label: "Отделы оргструктуры",
      ok: audited.departments.length > 0,
      detail: `Отделов: ${audited.departments.length}`,
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? `Компания «${audited.company?.name}» и ${audited.departments.length} отдел(а) готовы к работе.`
      : "Сохраните описание бизнеса и создайте хотя бы 1 отдел.";
  } else if (step_id === "employees") {
    checks.push({
      label: "Команда в системе",
      ok: audited.employees.length > 0,
      detail: `Сотрудников: ${audited.employees.length}`,
    });
    checks.push({
      label: "Инвайт-ссылки готовы",
      ok: true,
      detail: "Доступны ссылки для Сотрудника и Руководителя",
    });
    passed = audited.employees.length > 1 || audited.departments.length > 0;
    testOutput = passed
      ? `В оргструктуре ${audited.employees.length} участник(ов). Инвайт-ссылки привяжут новичков сразу в вашу компанию.`
      : "Пригласите сотрудника по ссылке или добавьте карточку сотрудника.";
  } else if (step_id === "schedules" || step_id === "schedule") {
    const targetSched = audited.mySchedule || audited.employeeSchedules[0];
    const wStart = targetSched?.default_work_start || "09:00";
    const wEnd = targetSched?.default_work_end || "18:00";
    const pat = targetSched?.pattern_type || "5/2";
    const preview: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(Date.now() + i * 86400000);
      const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      const isOff = pat === "5/2" ? d.getDay() === 0 || d.getDay() === 6 : i % 4 >= 2;
      preview.push(`${d.toISOString().slice(5, 10)} (${dayNames[d.getDay()]}): ${isOff ? "Выходной" : `${wStart}–${wEnd}`}`);
    }
    checks.push({
      label: "График в базе данных",
      ok: Boolean(targetSched || audited.scheduleTemplates.length > 0),
      detail: targetSched ? `Режим ${pat}, ${wStart}–${wEnd}` : "График еще не задан",
    });
    checks.push({
      label: "Прогноз ближайших 5 смен",
      ok: true,
      detail: preview.join(" | "),
    });
    passed = Boolean(targetSched || audited.scheduleTemplates.length > 0);
    testOutput = passed
      ? `График активен (${pat}). Ближайшие дни: ${preview.slice(0, 3).join(", ")}`
      : "Настройте график текстом, голосом или выберите стандартный 5/2.";
  } else if (step_id === "reports") {
    checks.push({
      label: "Шаблоны отчетов",
      ok: audited.reportTemplates.length > 0,
      detail: `Активно шаблонов: ${audited.reportTemplates.length}`,
    });
    const tpl = audited.reportTemplates[0];
    let fieldsCount = 0;
    if (tpl?.fields) {
      const f = safeParseJson<any[]>(tpl.fields, []);
      fieldsCount = Array.isArray(f) ? f.length : 0;
    }
    checks.push({
      label: "Поля шаблона и дедлайн",
      ok: fieldsCount > 0,
      detail: tpl
        ? `«${tpl.title}»: полей ${fieldsCount}, дедлайн ${tpl.deadline_time || "18:00"}`
        : "Нет активного шаблона",
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? `Шаблон «${tpl.title}» готов к ежедневной сдаче сотрудниками.`
      : "Создайте хотя бы 1 шаблон отчета с помощью ИИ или формы.";
  } else if (step_id === "report_rules") {
    checks.push({
      label: "Правила маршрутизации отчетов",
      ok: audited.reportRules.length > 0,
      detail: `Правил: ${audited.reportRules.length}`,
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? `Уведомления о сданных рапортах и напоминания настроены (${audited.reportRules.length}).`
      : "Создайте правило доставки рапортов.";
  } else if (step_id === "projects") {
    checks.push({
      label: "Проекты в ИИ Ревизор",
      ok: audited.projects.length > 0,
      detail: `Проектов: ${audited.projects.length}`,
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? `Создан проект «${audited.projects[0]?.title}».`
      : "Создайте первый проект через текст или голос.";
  } else if (step_id === "tasks") {
    checks.push({
      label: "Задачи по проектам",
      ok: audited.tasks.length > 0,
      detail: `Задач: ${audited.tasks.length}`,
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? `В проектах ${audited.tasks.length} задач с чек-листами и дедлайнами.`
      : "Создайте или сгенерируйте задачи через ИИ.";
  } else if (step_id === "project_rules") {
    checks.push({
      label: "Правила уведомлений по задачам",
      ok: audited.taskRules.length > 0,
      detail: `Правил: ${audited.taskRules.length}`,
    });
    passed = checks.every((c) => c.ok);
    testOutput = passed
      ? `Правила эскалации и уведомлений ИИ Ревизора активны (${audited.taskRules.length}).`
      : "Создайте правило маршрутизации задач.";
  } else if (step_id === "tariffs") {
    checks.push({
      label: "Лимиты тарифа",
      ok: true,
      detail: `Проектов ${scope.user?.projects_limit || 10}, задач ${scope.user?.tasks_limit || 50}, отчетов ${scope.user?.reports_limit || 50}`,
    });
    passed = true;
    testOutput = "Баланс, триал и лимиты проверены успешно.";
  } else if (step_id === "referral") {
    checks.push({
      label: "Партнерский код",
      ok: true,
      detail: `${audited.refCode} (+1000 RR за приглашенного директора)`,
    });
    passed = true;
    testOutput = "Ваша реферальная ссылка готова к распространению.";
  } else if (step_id === "test_report") {
    const hasRep = audited.reports.some(
      (r: any) =>
        String(r.employeeId ?? r.employee_id ?? r.employeeid ?? "") === scope.effectiveUserId
    );
    checks.push({
      label: "Сдача тестового рапорта",
      ok: hasRep,
      detail: hasRep ? "Тестовый рапорт сдан и проверен ИИ" : "Рапорт еще не отправлен",
    });
    passed = hasRep;
    testOutput = hasRep
      ? "Отлично! Вы успешно прошли цикл сдачи и ИИ-оценки рапорта."
      : "Напишите или надиктуйте тестовый рапорт и нажмите «Сдать и проверить ИИ».";
  } else if (step_id === "test_project") {
    checks.push({
      label: "Осмотр проектной среды",
      ok: audited.projects.length > 0,
      detail: `Проектов компании: ${audited.projects.length}`,
    });
    passed = audited.projects.length > 0;
    testOutput = passed
      ? `Вы ознакомились со структурой проекта «${audited.projects[0]?.title}».`
      : "Создайте учебный тестовый проект для освоения ИИ Ревизора.";
  } else if (step_id === "test_tasks") {
    const completed = audited.tasks.some(
      (t: any) =>
        String(t.executorId ?? t.executorid ?? "") === scope.effectiveUserId &&
        (t.status === "completed" || t.ai_verdict)
    );
    checks.push({
      label: "Проверка выполнения задачи",
      ok: completed,
      detail: completed ? "Задача сдана и оценена ИИ" : "Выполните тестовую сдачу задачи",
    });
    passed = completed;
    testOutput = completed
      ? "Задача проверена ИИ-Ревизором! Навык работы с задачами подтвержден."
      : "Отправьте результат тестовой задачи для проверки ИИ.";
  }

  if (passed) {
    const row = await db.get("SELECT * FROM user_onboarding WHERE id = ? LIMIT 1", [scope.effectiveUserId]);
    const stepsState = safeParseJson<Record<string, string>>(row?.steps_state, {});
    let skippedSteps = safeParseJson<string[]>(row?.skipped_steps, []);
    stepsState[step_id] = "completed";
    skippedSteps = skippedSteps.filter((s) => s !== step_id);
    await db.run(
      "UPDATE user_onboarding SET steps_state = ?, skipped_steps = ?, updated_at = ? WHERE id = ?",
      [JSON.stringify(stepsState), JSON.stringify(skippedSteps), new Date().toISOString(), scope.effectiveUserId]
    );
  }

  const latestAudit = await auditOnboardingSteps(db, scope.effectiveUserId);
  const latestRow = await db.get("SELECT * FROM user_onboarding WHERE id = ? LIMIT 1", [scope.effectiveUserId]);
  const steps = buildStepsPayload(
    scope.onboardingType,
    latestAudit.stepAudit,
    safeParseJson(latestRow?.steps_state, {}),
    safeParseJson(latestRow?.skipped_steps, [])
  );

  return {
    status: 200,
    payload: {
      success: true,
      passed,
      step_id,
      output: testOutput,
      checks,
      steps,
    },
  };
}

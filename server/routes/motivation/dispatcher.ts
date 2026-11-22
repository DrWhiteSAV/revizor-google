import { generateId } from '../../../src/db/initDb';
import {
  sendTelegramRichMessage,
  buildMotivationAccrualRichPayload
} from '../../../src/server/telegram';
import { sendWebPushToUser } from '../push/service';
import {
  calculateMotivationForReport,
  findActiveCalculatorForEmployee,
  MotivationCalculationResult
} from './calculatorEngine';
import { ensureMotivationSchema } from './schema';

function formatRub(val: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Math.round(val * 100) / 100) + ' ₽';
}

export async function processReportMotivationAndNotify(
  db: any,
  reportPayload: {
    id: string;
    templateId?: string;
    templateTitle?: string;
    type?: string;
    employeeId?: string;
    employee_id?: string;
    employeeName?: string;
    departmentId?: string;
    company_id?: string;
    director_id?: string;
    timestamp?: string;
    answers?: any;
  },
  origin?: string,
  options?: { skipNotifications?: boolean }
): Promise<MotivationCalculationResult | null> {
  try {
    await ensureMotivationSchema(db);

    const reportType = String(reportPayload.type || 'FACT_DAY').toUpperCase();
    // Morning reports (PLAN_DAY) establish shift start and daily numeric plan; accrual runs on evening/period reports
    if (reportType === 'PLAN_DAY') {
      return null;
    }

    const empId = String(reportPayload.employeeId || reportPayload.employee_id || '').trim();
    if (!empId) return null;

    const userRow = await db
      .get(`SELECT id, name, position, department_id, telegram_id, company_id, director_id FROM users WHERE id = ? LIMIT 1`, [empId])
      .catch(() => null);
    const empRow = await db
      .get(`SELECT id, name, position, department_id, telegram_id, company_id, director_id FROM employees WHERE id = ? OR telegram_id = ? LIMIT 1`, [empId, empId])
      .catch(() => null);

    const empName = reportPayload.employeeName || userRow?.name || empRow?.name || 'Специалист';
    const companyId = reportPayload.company_id || userRow?.company_id || empRow?.company_id || 'flagship-main';
    const directorId = reportPayload.director_id || userRow?.director_id || empRow?.director_id || '91827364501';
    const positionName = userRow?.position || empRow?.position || '';
    const departmentId = reportPayload.departmentId || userRow?.department_id || empRow?.department_id || '';

    const calculator = await findActiveCalculatorForEmployee(
      db,
      empId,
      companyId,
      directorId,
      positionName,
      departmentId,
      reportPayload.templateId
    );
    if (!calculator) return null;

    const result = await calculateMotivationForReport(db, {
      calculator,
      employeeId: empId,
      employeeName: empName,
      eveningReport: reportPayload
    });

    const accrualId = `acc_${empId}_${result.accrualDate}_${calculator.id}`;
    const existingAccrual = await db
      .get(
        `SELECT id, evening_report_id, total_earned_rub FROM motivation_accruals WHERE id = ? LIMIT 1`,
        [accrualId]
      )
      .catch(() => null);
    const existingNotifForReport = reportPayload.id
      ? await db
          .get(
            `SELECT id FROM notifications WHERE type = 'MOTIVATION_ACCRUAL' AND "reportId" = ? LIMIT 1`,
            [reportPayload.id]
          )
          .catch(() => null)
      : null;

    const sameAccrualAlreadyProcessed =
      Boolean(existingAccrual) &&
      String(existingAccrual.evening_report_id || '') === String(result.eveningReportId || '') &&
      Math.abs(Number(existingAccrual.total_earned_rub || 0) - Number(result.totalEarnedRub || 0)) < 0.01;

    // Save/upsert daily accrual row
    await db.run(
      `
      INSERT INTO motivation_accruals (
        id, company_id, director_id, employee_id, employee_name,
        calculator_id, calculator_title, calculator_snapshot_json,
        accrual_date, period_month, morning_report_id, evening_report_id,
        missing_morning_report, shift_type, working_shifts_in_month,
        planned_hours, worked_hours, overtime_hours, undertime_hours,
        fixed_base_rub, overtime_bonus_rub, undertime_penalty_rub,
        kpi_total_rub, kpi_breakdown_json, plan_completion_pct, schedule_pace_pct,
        total_earned_rub, notes, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        calculator_title = EXCLUDED.calculator_title,
        calculator_snapshot_json = EXCLUDED.calculator_snapshot_json,
        morning_report_id = EXCLUDED.morning_report_id,
        evening_report_id = EXCLUDED.evening_report_id,
        missing_morning_report = EXCLUDED.missing_morning_report,
        shift_type = EXCLUDED.shift_type,
        working_shifts_in_month = EXCLUDED.working_shifts_in_month,
        planned_hours = EXCLUDED.planned_hours,
        worked_hours = EXCLUDED.worked_hours,
        overtime_hours = EXCLUDED.overtime_hours,
        undertime_hours = EXCLUDED.undertime_hours,
        fixed_base_rub = EXCLUDED.fixed_base_rub,
        overtime_bonus_rub = EXCLUDED.overtime_bonus_rub,
        undertime_penalty_rub = EXCLUDED.undertime_penalty_rub,
        kpi_total_rub = EXCLUDED.kpi_total_rub,
        kpi_breakdown_json = EXCLUDED.kpi_breakdown_json,
        plan_completion_pct = EXCLUDED.plan_completion_pct,
        schedule_pace_pct = EXCLUDED.schedule_pace_pct,
        total_earned_rub = EXCLUDED.total_earned_rub,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        accrualId,
        companyId,
        directorId,
        empId,
        empName,
        calculator.id,
        calculator.title,
        JSON.stringify(calculator),
        result.accrualDate,
        result.periodMonth,
        result.morningReportId,
        result.eveningReportId,
        result.missingMorningReport ? 1 : 0,
        result.shiftType,
        result.workingShiftsInMonth,
        result.plannedHours,
        result.workedHours,
        result.overtimeHours,
        result.undertimeHours,
        result.fixedBaseRub,
        result.overtimeBonusRub,
        result.undertimePenaltyRub,
        result.kpiTotalRub,
        JSON.stringify(result.kpiBreakdown),
        result.overallPlanCompletionPct,
        result.schedulePacePct,
        result.totalEarnedRub,
        result.notes.join(' ')
      ]
    );

    if (options?.skipNotifications || sameAccrualAlreadyProcessed || existingNotifForReport) {
      return result;
    }

    // 1. Personal in-app notification for the employee
    const kpiSummaryLine =
      result.kpiBreakdown.length > 0
        ? result.kpiBreakdown.map((k) => `${k.title}: ${formatRub(k.deltaTodayRub)} (${k.completionPct}%)`).join('; ')
        : 'Без KPI-переменной';

    const notifTitle = result.missingMorningReport
      ? `Расчет мотивации за ${result.accrualDate}: требуется утренний отчет`
      : `Заработано сегодня: ${formatRub(result.totalEarnedRub)}`;

    const notifMessage = [
      `Схема «${calculator.title}» (${result.shiftLabel}).`,
      `Оклад за смену: ${formatRub(result.fixedBaseRub)}`,
      result.overtimeBonusRub > 0 ? `Переработка (+${result.overtimeHours} ч): +${formatRub(result.overtimeBonusRub)}` : '',
      result.undertimePenaltyRub > 0 ? `Недоработка (-${result.undertimeHours} ч): -${formatRub(result.undertimePenaltyRub)}` : '',
      `KPI (${kpiSummaryLine}): ${formatRub(result.kpiTotalRub)}.`,
      `Итого за день: ${formatRub(result.totalEarnedRub)}. Накоплено за месяц: ${formatRub(result.monthToDateTotalRub)}.`,
      result.morningWarning || ''
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const notifId = generateId('notif_mot');
      await db.run(
        `
        INSERT INTO notifications (id, user_id, userId, title, message, type, isRead, timestamp, actionUrl, reportId)
        VALUES (?, ?, ?, ?, ?, 'MOTIVATION_ACCRUAL', 0, CURRENT_TIMESTAMP, '/cabinet/raport/motivation/history', ?)
        `,
        [notifId, empId, empId, notifTitle, notifMessage, reportPayload.id]
      );
    } catch (nErr) {
      console.warn('Could not save motivation notification:', nErr);
    }

    // 1b. Dispatch Web Push for mobile/PWA users (respects user_notification_settings)
    sendWebPushToUser(db, empId, {
      title: notifTitle,
      body: notifMessage,
      url: '/cabinet/raport/motivation/history',
      tag: `motivation_${accrualId}`,
      category: 'motivation'
    }).catch(() => {});

    // 2. Direct Telegram Rich Message (Bot API 10.3) with inline action buttons
    const targetTelegramId = String(userRow?.telegram_id || empRow?.telegram_id || (/^\d{6,14}$/.test(empId) ? empId : '')).trim();
    if (targetTelegramId) {
      const baseOrigin = (origin || 'https://ii-rr.ru').replace(/\/+$/, '');
      const historyUrl = `${baseOrigin}/cabinet/raport/motivation/history`;
      const motivationUrl = `${baseOrigin}/cabinet/raport/motivation`;

      const richPayload = buildMotivationAccrualRichPayload({
        accrualDate: result.accrualDate,
        periodMonth: result.periodMonth,
        employeeName: empName,
        calculatorTitle: calculator.title,
        shiftLabel: result.shiftLabel,
        workedHours: result.workedHours,
        plannedHours: result.plannedHours,
        workingShiftsInMonth: result.workingShiftsInMonth,
        schedulePacePct: result.schedulePacePct,
        overtimeHours: result.overtimeHours,
        undertimeHours: result.undertimeHours,
        fixedBaseStr: formatRub(result.fixedBaseRub),
        overtimeBonusStr: result.overtimeBonusRub > 0 ? formatRub(result.overtimeBonusRub) : undefined,
        undertimePenaltyStr: result.undertimePenaltyRub > 0 ? formatRub(result.undertimePenaltyRub) : undefined,
        kpiTotalStr: formatRub(result.kpiTotalRub),
        totalEarnedStr: formatRub(result.totalEarnedRub),
        monthToDateTotalStr: formatRub(result.monthToDateTotalRub),
        kpiItems: result.kpiBreakdown.map((k) => ({
          title: k.title,
          deltaTodayStr: formatRub(k.deltaTodayRub),
          completionPct: k.completionPct,
          matchedGradeLabel: k.matchedGradeLabel
        })),
        missingMorningReport: result.missingMorningReport,
        morningWarning: result.morningWarning,
        historyUrl,
        motivationUrl
      });

      try {
        await sendTelegramRichMessage({
          chatId: targetTelegramId,
          blocks: richPayload.blocks,
          markdown: richPayload.fallbackMarkdown,
          buttons: richPayload.buttonsString
        });
      } catch (tgErr) {
        console.warn('Could not dispatch motivation Telegram Rich DM:', tgErr);
      }
    }

    return result;
  } catch (err) {
    console.error('❌ Error in processReportMotivationAndNotify:', err);
    return null;
  }
}

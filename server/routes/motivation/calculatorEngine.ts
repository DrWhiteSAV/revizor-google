import { computeDynamicShiftForDate, calcDailyWorkHours } from '../schedules';
import {
  MotivationFixedConfig,
  MotivationKpiRule,
  MotivationKpiGrade,
  safeJsonParse,
  buildDefaultFixedConfig
} from './schema';

export interface CalculatorRecord {
  id: string;
  company_id: string;
  director_id?: string;
  title: string;
  description?: string;
  target_scope: 'company' | 'departments' | 'positions' | 'employees';
  target_department_ids: string[];
  target_positions: string[];
  target_employee_ids: string[];
  is_template: boolean;
  morning_report_template_id?: string | null;
  evening_report_template_id?: string | null;
  require_morning_report: boolean;
  schedule_link_mode: 'employee_schedule' | 'custom_21';
  fixed_config: MotivationFixedConfig;
  kpi_rules: MotivationKpiRule[];
  is_archived?: boolean;
}

export interface KpiBreakdownItem {
  ruleId: string;
  title: string;
  fieldId: string;
  fieldLabel: string;
  period: 'day' | 'week' | 'month';
  calcMode: 'volume_grades' | 'plan_percent_grades';
  currentDayValue: number;
  periodCumulativeValue: number;
  planTarget: number;
  completionPct: number;
  schedulePacePct: number;
  baseRevenuePeriod: number;
  matchedGradeLabel: string;
  earnedRub: number;
  deltaTodayRub: number;
}

export interface MotivationCalculationResult {
  accrualDate: string;
  periodMonth: string;
  calculatorId: string;
  calculatorTitle: string;
  employeeId: string;
  employeeName: string;
  morningReportId: string | null;
  eveningReportId: string | null;
  missingMorningReport: boolean;
  morningWarning: string | null;
  shiftType: string;
  shiftLabel: string;
  workingShiftsInMonth: number;
  workedShiftsInMonthSoFar: number;
  schedulePacePct: number;
  plannedHours: number;
  workedHours: number;
  overtimeHours: number;
  undertimeHours: number;
  perShiftBaseRub: number;
  fixedBaseRub: number;
  overtimeBonusRub: number;
  undertimePenaltyRub: number;
  kpiTotalRub: number;
  kpiBreakdown: KpiBreakdownItem[];
  overallPlanCompletionPct: number;
  totalEarnedRub: number;
  monthToDateTotalRub: number;
  notes: string[];
}

export function normalizeCalculatorRow(row: any): CalculatorRecord {
  const fixedParsed = safeJsonParse<Partial<MotivationFixedConfig>>(row.fixed_config, {});
  const fixed: MotivationFixedConfig = { ...buildDefaultFixedConfig(), ...fixedParsed };
  const kpiRules = safeJsonParse<MotivationKpiRule[]>(row.kpi_rules, []);
  return {
    id: String(row.id),
    company_id: String(row.company_id || 'flagship-main'),
    director_id: row.director_id ? String(row.director_id) : undefined,
    title: String(row.title || 'Калькулятор мотивации'),
    description: row.description ? String(row.description) : '',
    target_scope: (row.target_scope || 'employees') as any,
    target_department_ids: safeJsonParse<string[]>(row.target_department_ids, []),
    target_positions: safeJsonParse<string[]>(row.target_positions, []),
    target_employee_ids: safeJsonParse<string[]>(row.target_employee_ids, []),
    is_template: Number(row.is_template ?? 1) === 1,
    morning_report_template_id: row.morning_report_template_id || null,
    evening_report_template_id: row.evening_report_template_id || null,
    require_morning_report: Number(row.require_morning_report ?? 1) === 1,
    schedule_link_mode: (row.schedule_link_mode || 'employee_schedule') as any,
    fixed_config: fixed,
    kpi_rules: Array.isArray(kpiRules) ? kpiRules : [],
    is_archived: Number(row.is_archived ?? 0) === 1
  };
}

export function buildCompanyAliases(companyId?: string, directorId?: string): string[] {
  const set = new Set<string>();
  const c = String(companyId || '').trim();
  const d = String(directorId || '').trim();
  if (c) {
    set.add(c);
    const clean = c.replace(/^com-/, '');
    if (clean) {
      set.add(clean);
      set.add(`com-${clean}`);
    }
  }
  if (d) {
    set.add(d);
    set.add(`com-${d}`);
  }
  if (c === 'flagship-main' || c === 'com-91827364501' || d === '91827364501') {
    set.add('flagship-main');
    set.add('com-91827364501');
    set.add('91827364501');
  }
  return Array.from(set).filter(Boolean);
}

export async function findActiveCalculatorForEmployee(
  db: any,
  employeeId: string,
  companyId?: string,
  directorId?: string,
  positionName?: string,
  departmentId?: string,
  eveningTemplateId?: string
): Promise<CalculatorRecord | null> {
  const aliases = buildCompanyAliases(companyId, directorId);
  const ph = aliases.length > 0 ? aliases.map(() => '?').join(',') : `'flagship-main'`;
  const rows = aliases.length > 0
    ? await db.all(
        `SELECT * FROM motivation_calculators WHERE (company_id IN (${ph}) OR director_id IN (${ph})) AND COALESCE(is_archived, 0) = 0 ORDER BY updated_at DESC`,
        [...aliases, ...aliases]
      )
    : await db.all(`SELECT * FROM motivation_calculators WHERE COALESCE(is_archived, 0) = 0 ORDER BY updated_at DESC`);

  if (!rows || rows.length === 0) return null;

  const calcs = rows.map(normalizeCalculatorRow);
  const assignRows = await db
    .all(`SELECT * FROM motivation_assignments WHERE employee_id = ? AND is_active = 1`, [String(employeeId)])
    .catch(() => []);
  const assignedIds = new Set((assignRows || []).map((a: any) => String(a.calculator_id)));

  // Priority 1: Explicit assignment or direct target_employee_ids + matching evening template
  const scored = calcs.map((c) => {
    let priority = 0;
    if (assignedIds.has(c.id)) priority += 100;
    if (c.target_employee_ids.includes(String(employeeId))) priority += 80;
    if (positionName && c.target_positions.some((p) => p.toLowerCase() === positionName.toLowerCase())) priority += 50;
    if (departmentId && c.target_department_ids.includes(String(departmentId))) priority += 30;
    if (c.target_scope === 'company') priority += 10;
    if (eveningTemplateId && c.evening_report_template_id === eveningTemplateId) priority += 25;
    return { calc: c, priority };
  }).filter((x) => x.priority > 0).sort((a, b) => b.priority - a.priority);

  return scored[0]?.calc || null;
}

export async function getMonthShiftStats(
  db: any,
  employeeId: string,
  companyId: string,
  dateStr: string
): Promise<{
  workingShiftsInMonth: number;
  workedShiftsSoFar: number;
  dayShift: any;
  plannedHoursToday: number;
  schedulePacePct: number;
}> {
  const schedRow = await db
    .get(`SELECT * FROM employee_schedules WHERE user_id = ? OR id = ? LIMIT 1`, [String(employeeId), `sched-${employeeId}`])
    .catch(() => null);

  const patternType = schedRow?.pattern_type || '5/2';
  const shiftConfig = safeJsonParse<any>(schedRow?.shift_config, {
    work_start: schedRow?.default_work_start || '09:00',
    work_end: schedRow?.default_work_end || '18:00',
    lunch_start: schedRow?.default_lunch_start || '13:00',
    lunch_end: schedRow?.default_lunch_end || '14:00'
  });
  const calendarOverrides = safeJsonParse<Record<string, any>>(schedRow?.calendar_overrides, {});
  const cycleStartDate = schedRow?.cycle_start_date || '2026-01-01';

  const [yStr, mStr] = dateStr.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const daysInMonth = new Date(y, m, 0).getDate();

  let workingShiftsInMonth = 0;
  let workedShiftsSoFar = 0;
  let dayShift: any = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = `${yStr}-${mStr}-${String(d).padStart(2, '0')}`;
    const shift = computeDynamicShiftForDate({
      employeeId: String(employeeId),
      companyId: companyId || 'flagship-main',
      dateStr: curDate,
      patternType,
      shiftConfig,
      cycleStartDate,
      calendarOverrides
    });
    const isWorking = !['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(shift.type);
    if (isWorking) {
      workingShiftsInMonth++;
      if (curDate <= dateStr) {
        workedShiftsSoFar++;
      }
    }
    if (curDate === dateStr) {
      dayShift = shift;
    }
  }

  if (workingShiftsInMonth === 0) workingShiftsInMonth = 21;
  if (!dayShift) {
    dayShift = {
      type: 'day',
      work_start: shiftConfig.work_start || '09:00',
      work_end: shiftConfig.work_end || '18:00',
      lunch_start: shiftConfig.lunch_start || '13:00',
      lunch_end: shiftConfig.lunch_end || '14:00',
      work_hours: 8
    };
  }

  const isOff = ['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(dayShift.type);
  const plannedHoursToday = isOff
    ? 0
    : (Number(dayShift.work_hours) || calcDailyWorkHours(dayShift.work_start, dayShift.work_end, dayShift.lunch_start, dayShift.lunch_end, dayShift.type));

  const schedulePacePct = workingShiftsInMonth > 0
    ? Math.min(100, Math.round((workedShiftsSoFar / workingShiftsInMonth) * 1000) / 10)
    : 0;

  return {
    workingShiftsInMonth,
    workedShiftsSoFar,
    dayShift,
    plannedHoursToday,
    schedulePacePct
  };
}

function toNumeric(val: any): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/\s+/g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDateKey(ts: any): string {
  if (!ts) return '';
  if (ts instanceof Date) return ts.toISOString().slice(0, 10);
  const s = String(ts).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function getWeekBounds(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay() || 7; // 1..7 (Mon..Sun)
  const mon = new Date(dt);
  mon.setUTCDate(dt.getUTCDate() - (dow - 1));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10)
  };
}

function evaluateGradeReward(
  grades: MotivationKpiGrade[],
  calcMode: 'volume_grades' | 'plan_percent_grades',
  value: number,
  completionPct: number,
  baseRevenue: number
): { earnedRub: number; label: string } {
  if (!Array.isArray(grades) || grades.length === 0) return { earnedRub: 0, label: 'Без грейдов' };

  const sorted = [...grades].sort((a, b) => Number(a.threshold) - Number(b.threshold));
  const metricForThreshold = calcMode === 'plan_percent_grades' ? completionPct : value;

  let activeGrade: MotivationKpiGrade | null = null;
  for (const g of sorted) {
    if (metricForThreshold >= Number(g.threshold)) {
      activeGrade = g;
    }
  }

  if (!activeGrade) {
    return { earnedRub: 0, label: `Ниже минимального порога (${sorted[0].threshold})` };
  }

  const rv = Number(activeGrade.reward_value) || 0;
  let earnedRub = 0;

  if (activeGrade.reward_type === 'per_unit') {
    earnedRub = value * rv;
  } else if (activeGrade.reward_type === 'flat_bundle' || activeGrade.reward_type === 'fixed_bonus') {
    earnedRub = rv;
  } else if (activeGrade.reward_type === 'percent_of_base') {
    const revBase = baseRevenue > 0 ? baseRevenue : value;
    earnedRub = (revBase * rv) / 100;
  }

  const suffix =
    activeGrade.reward_type === 'per_unit'
      ? `₽/ед`
      : activeGrade.reward_type === 'percent_of_base'
      ? `% от базы`
      : `₽ за порог`;
  const unitSign = calcMode === 'plan_percent_grades' ? '%' : '';

  return {
    earnedRub: Math.round(earnedRub * 100) / 100,
    label: activeGrade.label || `От ${activeGrade.threshold}${unitSign}: ${rv} ${suffix}`
  };
}

export async function calculateMotivationForReport(
  db: any,
  {
    calculator,
    employeeId,
    employeeName,
    eveningReport,
    morningReport,
    dateStrOverride,
    overrideWorkedHours,
    overrideAnswers
  }: {
    calculator: CalculatorRecord;
    employeeId: string;
    employeeName: string;
    eveningReport?: any;
    morningReport?: any;
    dateStrOverride?: string;
    overrideWorkedHours?: number;
    overrideAnswers?: Record<string, any>;
  }
): Promise<MotivationCalculationResult> {
  const reportTs = eveningReport?.timestamp || new Date().toISOString();
  const accrualDate = dateStrOverride || String(reportTs).slice(0, 10);
  const periodMonth = accrualDate.slice(0, 7);

  // Locate morning report for the same date if not passed explicitly
  let resolvedMorning = morningReport || null;
  if (!resolvedMorning) {
    const allEmpReports = await db
      .all(
        `SELECT id, templateId, type, timestamp, answers FROM reports WHERE (employeeId = ? OR employee_id = ?) ORDER BY timestamp ASC`,
        [String(employeeId), String(employeeId)]
      )
      .catch(() => []);
    const morningCandidates = (allEmpReports || []).filter((r: any) => toDateKey(r.timestamp) === accrualDate);
    if (morningCandidates.length > 0) {
      resolvedMorning =
        morningCandidates.find((r: any) =>
          calculator.morning_report_template_id
            ? String(r.templateId || r.templateid || '') === String(calculator.morning_report_template_id)
            : String(r.type || '').toUpperCase() === 'PLAN_DAY'
        ) || morningCandidates.find((r: any) => String(r.type || '').toUpperCase() === 'PLAN_DAY') || null;
    }
  }

  const shiftStats = await getMonthShiftStats(db, String(employeeId), calculator.company_id, accrualDate);
  const fixed = calculator.fixed_config;
  const notes: string[] = [];

  // Morning report validation for time-based checks
  const usesTimeVerification = fixed.verification_mode === 'time';
  const missingMorningReport = usesTimeVerification && calculator.require_morning_report !== false && !resolvedMorning;
  let morningWarning: string | null = null;

  if (missingMorningReport) {
    morningWarning =
      'Утренний отчет (план дня) не найден: без него невозможно зафиксировать время начала смены. Создайте и сдавайте утренний отчет перед началом работы.';
    notes.push(morningWarning);
  }

  // Calculate worked hours
  let workedHours = 0;
  if (overrideWorkedHours !== undefined) {
    workedHours = Math.max(0, Number(overrideWorkedHours) || 0);
  } else if (usesTimeVerification && resolvedMorning && eveningReport) {
    const startMs = new Date(resolvedMorning.timestamp).getTime();
    const endMs = new Date(eveningReport.timestamp || Date.now()).getTime();
    const rawHours = Math.max(0, (endMs - startMs) / 3600000);
    const lunchStart = shiftStats.dayShift?.lunch_start || '13:00';
    const lunchEnd = shiftStats.dayShift?.lunch_end || '14:00';
    const [lh1, lm1] = lunchStart.split(':').map(Number);
    const [lh2, lm2] = lunchEnd.split(':').map(Number);
    let lunchH = ((lh2 * 60 + lm2) - (lh1 * 60 + lm1)) / 60;
    if (lunchH < 0 || lunchH > 3) lunchH = 1;
    workedHours = rawHours > 4 ? Math.max(0, Math.round((rawHours - lunchH) * 100) / 100) : Math.round(rawHours * 100) / 100;
  } else if (!usesTimeVerification) {
    workedHours = shiftStats.plannedHoursToday;
  }

  const plannedHours = shiftStats.plannedHoursToday;
  const effectiveShiftsDivisor =
    calculator.schedule_link_mode === 'custom_21' ? 21 : Math.max(1, shiftStats.workingShiftsInMonth);

  const fullShiftRub =
    fixed.salary_mode === 'per_shift'
      ? Number(fixed.base_amount || 0)
      : Number(fixed.base_amount || 0) / effectiveShiftsDivisor;

  const basePercentRatio = Math.max(0, Number(fixed.base_percent ?? 100)) / 100;
  const perShiftBaseRub = Math.round(fullShiftRub * basePercentRatio * 100) / 100;
  const hourlyRateRub = plannedHours > 0 ? perShiftBaseRub / plannedHours : perShiftBaseRub / 8;

  const currentAnswers = overrideAnswers || safeJsonParse<Record<string, any>>(eveningReport?.answers, {});
  const morningAnswers = safeJsonParse<Record<string, any>>(resolvedMorning?.answers, {});

  let fixedBaseRub = 0;
  let overtimeHours = 0;
  let undertimeHours = 0;
  let overtimeBonusRub = 0;
  let undertimePenaltyRub = 0;

  if (usesTimeVerification) {
    if (missingMorningReport) {
      fixedBaseRub = 0;
    } else if (plannedHours === 0) {
      // Shift on an off/holiday day counts fully as overtime or extra shift
      fixedBaseRub = perShiftBaseRub;
      overtimeHours = workedHours;
    } else {
      fixedBaseRub = perShiftBaseRub;
      if (workedHours > plannedHours) {
        overtimeHours = Math.round((workedHours - plannedHours) * 100) / 100;
      } else if (workedHours < plannedHours) {
        undertimeHours = Math.round((plannedHours - workedHours) * 100) / 100;
      }
    }
  } else {
    // Numeric norm verification against evening answers
    const normField = fixed.numeric_norm_field_id;
    const normTarget = Number(fixed.numeric_norm_target || 0);
    const actualNorm = normField ? toNumeric(currentAnswers[normField]) : 1;
    if (normTarget > 0) {
      const ratio = Math.min(1, actualNorm / normTarget);
      fixedBaseRub = Math.round(perShiftBaseRub * ratio * 100) / 100;
      if (actualNorm < normTarget) {
        undertimeHours = Math.round((1 - ratio) * (plannedHours || 8) * 100) / 100;
        notes.push(`Норма числа выполнена на ${Math.round(ratio * 100)}% (${actualNorm} из ${normTarget}).`);
      } else if (actualNorm > normTarget) {
        overtimeHours = Math.round(((actualNorm - normTarget) / normTarget) * (plannedHours || 8) * 100) / 100;
      }
    } else {
      fixedBaseRub = perShiftBaseRub;
    }
  }

  if (!missingMorningReport) {
    if (fixed.overtime_enabled && overtimeHours > 0) {
      const ovVal = Number(fixed.overtime_value || 0);
      if (fixed.overtime_unit === 'fixed_hour') overtimeBonusRub = overtimeHours * ovVal;
      else if (fixed.overtime_unit === 'fixed_shift') overtimeBonusRub = ovVal;
      else overtimeBonusRub = overtimeHours * hourlyRateRub * (1 + ovVal / 100);
    }

    if (fixed.undertime_enabled && undertimeHours > 0) {
      const unVal = Number(fixed.undertime_value || 0);
      if (fixed.undertime_unit === 'fixed_hour') undertimePenaltyRub = undertimeHours * unVal;
      else if (fixed.undertime_unit === 'fixed_shift') undertimePenaltyRub = unVal;
      else undertimePenaltyRub = undertimeHours * hourlyRateRub * (unVal / 100);
    }
  }

  fixedBaseRub = Math.round(fixedBaseRub * 100) / 100;
  overtimeBonusRub = Math.round(overtimeBonusRub * 100) / 100;
  undertimePenaltyRub = Math.round(undertimePenaltyRub * 100) / 100;

  // Gather employee reports for current month (to compute day / week / month cumulative KPI)
  const allMonthCandidates = await db
    .all(
      `SELECT id, templateId, type, timestamp, answers FROM reports WHERE (employeeId = ? OR employee_id = ?) ORDER BY timestamp ASC`,
      [String(employeeId), String(employeeId)]
    )
    .catch(() => []);
  const monthReports = (allMonthCandidates || []).filter((r: any) =>
    toDateKey(r.timestamp).startsWith(periodMonth)
  );

  const weekBounds = getWeekBounds(accrualDate);

  // Merge current evening report answers cleanly (in case previewing before saving to DB)
  const effectiveReportsList = [...(monthReports || [])];
  if (eveningReport?.id) {
    const idx = effectiveReportsList.findIndex((r: any) => String(r.id) === String(eveningReport.id));
    const entry = {
      id: eveningReport.id,
      templateId: eveningReport.templateId,
      type: eveningReport.type || 'FACT_DAY',
      timestamp: reportTs,
      answers: currentAnswers
    };
    if (idx >= 0) effectiveReportsList[idx] = entry;
    else effectiveReportsList.push(entry);
  } else if (overrideAnswers) {
    effectiveReportsList.push({
      id: 'preview-current',
      templateId: calculator.evening_report_template_id || '',
      type: 'FACT_DAY',
      timestamp: `${accrualDate}T18:00:00.000Z`,
      answers: currentAnswers
    });
  }

  const kpiBreakdown: KpiBreakdownItem[] = [];
  let kpiTotalRub = 0;

  for (const rule of calculator.kpi_rules) {
    const todayVal = toNumeric(currentAnswers[rule.field_id]);
    const todayRevBase = rule.base_revenue_field_id ? toNumeric(currentAnswers[rule.base_revenue_field_id]) : 0;

    // Filter reports in horizon up to accrualDate (excluding morning plan_day reports from fact sums)
    const inPeriod = effectiveReportsList.filter((r: any) => {
      const rDate = toDateKey(r.timestamp);
      if (!rDate || rDate > accrualDate) return false;
      if (String(r.type || '').toUpperCase() === 'PLAN_DAY') return false;
      if (rule.period === 'day') return rDate === accrualDate;
      if (rule.period === 'week') return rDate >= weekBounds.start && rDate <= weekBounds.end;
      return rDate.startsWith(periodMonth);
    });

    let cumulativeVal = 0;
    let cumulativeBaseRev = 0;
    for (const r of inPeriod) {
      const ans = safeJsonParse<Record<string, any>>(r.answers, {});
      cumulativeVal += toNumeric(ans[rule.field_id]);
      if (rule.base_revenue_field_id) {
        cumulativeBaseRev += toNumeric(ans[rule.base_revenue_field_id]);
      }
    }

    // If previewing without current report in DB, ensure today's value is counted
    if (inPeriod.length === 0) {
      cumulativeVal = todayVal;
      cumulativeBaseRev = todayRevBase;
    }

    let planTarget = Number(rule.plan_target || 0);
    if (rule.plan_source === 'morning_report_field' && rule.plan_field_id && resolvedMorning) {
      const mVal = toNumeric(morningAnswers[rule.plan_field_id]);
      if (mVal > 0) planTarget = mVal;
    }

    const completionPct =
      planTarget > 0 ? Math.round((cumulativeVal / planTarget) * 1000) / 10 : cumulativeVal > 0 ? 100 : 0;

    const evalRes = evaluateGradeReward(
      rule.grades || [],
      rule.calc_mode,
      cumulativeVal,
      completionPct,
      cumulativeBaseRev
    );

    // For week/month rules, calculate incremental delta earned strictly on this shift
    let prevVal = Math.max(0, cumulativeVal - todayVal);
    let prevRev = Math.max(0, cumulativeBaseRev - todayRevBase);
    let deltaTodayRub = evalRes.earnedRub;
    if (rule.period !== 'day' && inPeriod.length > 1) {
      const prevPct = planTarget > 0 ? Math.round((prevVal / planTarget) * 1000) / 10 : 0;
      const prevEval = evaluateGradeReward(rule.grades || [], rule.calc_mode, prevVal, prevPct, prevRev);
      deltaTodayRub = Math.round((evalRes.earnedRub - prevEval.earnedRub) * 100) / 100;
    }

    const dayContribution = rule.period === 'day' ? evalRes.earnedRub : Math.max(0, deltaTodayRub);
    kpiTotalRub += dayContribution;

    kpiBreakdown.push({
      ruleId: rule.id,
      title: rule.title || rule.field_label,
      fieldId: rule.field_id,
      fieldLabel: rule.field_label,
      period: rule.period,
      calcMode: rule.calc_mode,
      currentDayValue: todayVal,
      periodCumulativeValue: cumulativeVal,
      planTarget,
      completionPct,
      schedulePacePct: shiftStats.schedulePacePct,
      baseRevenuePeriod: cumulativeBaseRev,
      matchedGradeLabel: evalRes.label,
      earnedRub: evalRes.earnedRub,
      deltaTodayRub: dayContribution
    });
  }

  kpiTotalRub = Math.round(kpiTotalRub * 100) / 100;

  const overallPlanCompletionPct =
    kpiBreakdown.length > 0
      ? Math.round((kpiBreakdown.reduce((acc, item) => acc + item.completionPct, 0) / kpiBreakdown.length) * 10) / 10
      : shiftStats.schedulePacePct;

  const totalEarnedRub = Math.max(
    0,
    Math.round((fixedBaseRub + overtimeBonusRub - undertimePenaltyRub + kpiTotalRub) * 100) / 100
  );

  // Month-to-date sum from motivation_accruals (excluding today's row so it stays accurate)
  const prevAccruals = await db
    .all(
      `SELECT accrual_date, total_earned_rub FROM motivation_accruals WHERE employee_id = ? AND period_month = ?`,
      [String(employeeId), periodMonth]
    )
    .catch(() => []);

  const prevMonthSum = (prevAccruals || [])
    .filter((a: any) => String(a.accrual_date) !== accrualDate)
    .reduce((sum: number, a: any) => sum + Number(a.total_earned_rub || 0), 0);

  const monthToDateTotalRub = Math.round((prevMonthSum + totalEarnedRub) * 100) / 100;

  const shiftLabelMap: Record<string, string> = {
    day: 'Дневная смена',
    night: 'Ночная смена',
    daily: 'Суточная смена',
    holiday: 'Праздничная смена',
    weekend: 'Выходной день',
    vacation: 'Отпуск',
    sick: 'Больничный',
    dayoff: 'Отгул',
    trip: 'Командировка'
  };

  return {
    accrualDate,
    periodMonth,
    calculatorId: calculator.id,
    calculatorTitle: calculator.title,
    employeeId: String(employeeId),
    employeeName,
    morningReportId: resolvedMorning?.id ? String(resolvedMorning.id) : null,
    eveningReportId: eveningReport?.id ? String(eveningReport.id) : null,
    missingMorningReport,
    morningWarning,
    shiftType: shiftStats.dayShift?.type || 'day',
    shiftLabel: shiftLabelMap[shiftStats.dayShift?.type || 'day'] || 'Рабочая смена',
    workingShiftsInMonth: effectiveShiftsDivisor,
    workedShiftsInMonthSoFar: shiftStats.workedShiftsSoFar,
    schedulePacePct: shiftStats.schedulePacePct,
    plannedHours,
    workedHours,
    overtimeHours,
    undertimeHours,
    perShiftBaseRub,
    fixedBaseRub,
    overtimeBonusRub,
    undertimePenaltyRub,
    kpiTotalRub,
    kpiBreakdown,
    overallPlanCompletionPct,
    totalEarnedRub,
    monthToDateTotalRub,
    notes
  };
}

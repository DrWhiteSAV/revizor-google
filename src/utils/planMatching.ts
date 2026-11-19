import { SubmittedReport, ReportPlanItem, ReportTemplateType } from '../types';

export type PlanPeriodType = 'day' | 'week' | 'month';

export interface MatchedPlanGroup {
  reportId: string;
  sourceTemplateTitle: string;
  sourceReportDate: string;
  periodType: PlanPeriodType;
  periodLabel: string;
  targetDate?: string;
  employeeName?: string;
  items: ReportPlanItem[];
  allCompleted: boolean;
  completedCount: number;
  totalCount: number;
}

/**
 * Safely extracts YYYY-MM-DD from an ISO string, date or timestamp
 */
export function extractDateStr(dateOrIso?: string | null): string {
  if (!dateOrIso) return '';
  if (typeof dateOrIso !== 'string') return '';
  if (dateOrIso.includes('T')) return dateOrIso.split('T')[0];
  if (dateOrIso.length >= 10) return dateOrIso.substring(0, 10);
  return dateOrIso;
}

/**
 * Returns Monday and Sunday for the week containing a specific date
 */
export function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { start: fmt(monday), end: fmt(sunday) };
}

/**
 * Returns first and last day for the month containing a specific date
 */
export function getMonthRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { start: fmt(firstDay), end: fmt(lastDay) };
}

/**
 * Detects plan period type from report type or template title
 */
export function detectReportPeriodType(report: SubmittedReport): PlanPeriodType {
  const t = (report.type || '').toUpperCase();
  const title = (report.templateTitle || '').toLowerCase();

  if (t === 'WEEKLY' || title.includes('недел') || title.includes('неделя') || title.includes('weekly')) {
    return 'week';
  }
  if (t === 'MONTHLY' || title.includes('месяц') || title.includes('месячн') || title.includes('monthly')) {
    return 'month';
  }
  return 'day';
}

/**
 * Computes target period range for an accepted plan based on when the report was submitted
 */
export function getPlanPeriodRange(report: SubmittedReport): {
  periodType: PlanPeriodType;
  startDateStr: string;
  endDateStr: string;
  periodLabel: string;
} {
  const periodType = detectReportPeriodType(report);
  const repDateStr = extractDateStr(report.timestamp || (report as any).createdAt) || new Date().toISOString().split('T')[0];
  const repDate = new Date(repDateStr + 'T12:00:00');

  if (periodType === 'week') {
    // Target is the following week
    const nextWeekDate = new Date(repDate);
    nextWeekDate.setDate(repDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toISOString().split('T')[0];
    const { start, end } = getWeekRange(nextWeekStr);

    const sParts = start.split('-');
    const eParts = end.split('-');
    const label = `Недельный план (${sParts[2]}.${sParts[1]} - ${eParts[2]}.${eParts[1]})`;
    return { periodType: 'week', startDateStr: start, endDateStr: end, periodLabel: label };
  }

  if (periodType === 'month') {
    // Target is the following month
    const nextMonthDate = new Date(repDate.getFullYear(), repDate.getMonth() + 1, 1);
    const nextMonthStr = nextMonthDate.toISOString().split('T')[0];
    const { start, end } = getMonthRange(nextMonthStr);

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const label = `Месячный план на ${monthNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;
    return { periodType: 'month', startDateStr: start, endDateStr: end, periodLabel: label };
  }

  // Daily plan: target is the next day, and also active on creation day
  const nextDay = new Date(repDate);
  nextDay.setDate(repDate.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  const dParts = nextDayStr.split('-');
  const label = `План на смену ${dParts[2]}.${dParts[1]}.${dParts[0]}`;
  return { periodType: 'day', startDateStr: repDateStr, endDateStr: nextDayStr, periodLabel: label };
}

/**
 * Returns all accepted plan groups that apply to a given calendar date (YYYY-MM-DD)
 */
export function getAcceptedPlansForCalendarDate(
  reports: SubmittedReport[],
  targetDateStr: string,
  employeeFilter?: string
): MatchedPlanGroup[] {
  if (!reports || reports.length === 0 || !targetDateStr) return [];

  const matchedGroups: MatchedPlanGroup[] = [];

  for (const rep of reports) {
    const status = String(rep.aiPlanStatus || (rep as any).ai_plan_status || '').toLowerCase().trim();
    const isDeclined = status === 'declined' || status === 'rejected';
    if (isDeclined) continue;

    let rawPlan = rep.aiPlan || (rep as any).ai_plan;
    if (typeof rawPlan === 'string') {
      try {
        rawPlan = JSON.parse(rawPlan);
      } catch (e) {
        rawPlan = null;
      }
    }
    if (!rawPlan || !Array.isArray(rawPlan) || rawPlan.length === 0) continue;

    // Apply employee filter if provided and not 'All'
    if (employeeFilter && employeeFilter !== 'All') {
      const empName = rep.employeeName || (rep as any).employee_name || '';
      const empId = rep.employeeId || (rep as any).employee_id || '';
      const filterLower = employeeFilter.toLowerCase().trim();
      const matchesName = empName.toLowerCase().includes(filterLower);
      const matchesId = String(empId).toLowerCase() === filterLower;
      if (!matchesName && !matchesId) {
        continue;
      }
    }

    const { periodType, startDateStr, endDateStr, periodLabel } = getPlanPeriodRange(rep);

    // Check if targetDate falls within the plan's period
    const isInPeriod = targetDateStr >= startDateStr && targetDateStr <= endDateStr;

    // Check if any specific item has targetDate directly
    const hasItemWithDirectDate = rawPlan.some(item => {
      const itemDate = extractDateStr(item.date);
      return itemDate === targetDateStr;
    });

    // Check if rep targetDate or future_date matches
    const repTargetDate = extractDateStr(rep.targetDate || (rep as any).future_date);
    const hasTargetDateMatch = repTargetDate ? repTargetDate === targetDateStr : false;

    if (isInPeriod || hasItemWithDirectDate || hasTargetDateMatch) {
      const items: ReportPlanItem[] = rawPlan.map((item, idx) => ({
        id: item.id || `plan-item-${rep.id}-${idx}`,
        title: item.title || (item as any).task || 'Задача плана',
        date: item.date || repTargetDate || startDateStr,
        time: item.time,
        priority: item.priority || 'normal',
        completed: Boolean(item.completed)
      }));

      const completedCount = items.filter(it => it.completed).length;
      const totalCount = items.length;

      matchedGroups.push({
        reportId: rep.id,
        sourceTemplateTitle: rep.templateTitle || 'Рапорт',
        sourceReportDate: extractDateStr(rep.timestamp || (rep as any).createdAt),
        employeeName: rep.employeeName || (rep as any).employee_name || 'Сотрудник',
        targetDate: targetDateStr,
        periodType,
        periodLabel,
        items,
        allCompleted: totalCount > 0 && completedCount === totalCount,
        completedCount,
        totalCount
      });
    }
  }

  return matchedGroups;
}

/**
 * Returns the most relevant previous accepted plan to prefill the next report
 */
export function getAcceptedPlanForNextReport(
  reports: SubmittedReport[],
  templateType: ReportTemplateType | string,
  employeeId?: string,
  targetDateStr?: string
): MatchedPlanGroup | null {
  if (!reports || reports.length === 0) return null;

  const curDateStr = targetDateStr || new Date().toISOString().split('T')[0];
  const tType = (templateType || '').toUpperCase();
  const targetPeriodType: PlanPeriodType = 
    tType === 'WEEKLY' ? 'week' :
    tType === 'MONTHLY' ? 'month' : 'day';

  // Filter accepted reports for this employee
  const candidateReports = reports.filter(rep => {
    const isAccepted = rep.aiPlanStatus === 'accepted' || (rep as any).ai_plan_status === 'accepted';
    if (!isAccepted) return false;

    if (employeeId) {
      const repEmpId = rep.employeeId || (rep as any).employee_id;
      if (repEmpId && repEmpId !== employeeId) return false;
    }

    const rawPlan = rep.aiPlan || (rep as any).ai_plan;
    if (!rawPlan || !Array.isArray(rawPlan) || rawPlan.length === 0) return false;

    const repPeriodType = detectReportPeriodType(rep);
    return repPeriodType === targetPeriodType;
  });

  if (candidateReports.length === 0) {
    // Fallback: look for ANY accepted report for this employee with pending plan items
    const anyAccepted = reports.filter(rep => {
      const isAccepted = rep.aiPlanStatus === 'accepted' || (rep as any).ai_plan_status === 'accepted';
      if (!isAccepted) return false;
      if (employeeId) {
        const repEmpId = rep.employeeId || (rep as any).employee_id;
        if (repEmpId && repEmpId !== employeeId) return false;
      }
      const rawPlan = rep.aiPlan || (rep as any).ai_plan;
      return Boolean(rawPlan && Array.isArray(rawPlan) && rawPlan.length > 0);
    });

    if (anyAccepted.length === 0) return null;
    candidateReports.push(anyAccepted[0]);
  }

  // Sort by date descending (most recent first)
  candidateReports.sort((a, b) => {
    const tA = new Date(a.timestamp || (a as any).createdAt || 0).getTime();
    const tB = new Date(b.timestamp || (b as any).createdAt || 0).getTime();
    return tB - tA;
  });

  const rep = candidateReports[0];
  const { periodType, periodLabel, startDateStr } = getPlanPeriodRange(rep);
  const rawPlan = rep.aiPlan || (rep as any).ai_plan;

  const items: ReportPlanItem[] = rawPlan.map((item: any, idx: number) => ({
    id: item.id || `plan-item-${rep.id}-${idx}`,
    title: item.title || item.task || 'Задача плана',
    date: item.date || startDateStr,
    time: item.time,
    priority: item.priority || 'normal',
    completed: Boolean(item.completed)
  }));

  const completedCount = items.filter(it => it.completed).length;
  const totalCount = items.length;

  return {
    reportId: rep.id,
    sourceTemplateTitle: rep.templateTitle || 'Рапорт',
    sourceReportDate: extractDateStr(rep.timestamp || (rep as any).createdAt),
    employeeName: rep.employeeName || (rep as any).employee_name || 'Сотрудник',
    targetDate: curDateStr,
    periodType,
    periodLabel,
    items,
    allCompleted: totalCount > 0 && completedCount === totalCount,
    completedCount,
    totalCount
  };
}

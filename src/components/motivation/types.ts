export interface MotivationFixedConfig {
  salary_mode: 'per_shift' | 'monthly_divided';
  base_amount: number;
  base_percent: number;
  verification_mode: 'time' | 'numeric_norm';
  overtime_enabled: boolean;
  overtime_unit: 'fixed_hour' | 'fixed_shift' | 'percent_rate';
  overtime_value: number;
  undertime_enabled: boolean;
  undertime_unit: 'fixed_hour' | 'fixed_shift' | 'percent_rate';
  undertime_value: number;
  numeric_norm_field_id?: string;
  numeric_norm_target?: number;
}

export interface MotivationKpiGrade {
  id: string;
  threshold: number;
  reward_type: 'per_unit' | 'flat_bundle' | 'percent_of_base' | 'fixed_bonus';
  reward_value: number;
  label?: string;
}

export interface MotivationKpiRule {
  id: string;
  title: string;
  field_id: string;
  field_label: string;
  period: 'day' | 'week' | 'month';
  calc_mode: 'volume_grades' | 'plan_percent_grades';
  plan_source: 'fixed_target' | 'morning_report_field';
  plan_target: number;
  plan_field_id?: string;
  base_revenue_field_id?: string;
  base_revenue_field_label?: string;
  grades: MotivationKpiGrade[];
}

export interface MotivationCalculator {
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
  assigned_count?: number;
  accruals_count?: number;
  accruals_total_rub?: number;
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

export interface MotivationAccrualItem {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  calculator_id: string;
  calculator_title: string;
  accrual_date: string;
  period_month: string;
  morning_report_id?: string | null;
  evening_report_id?: string | null;
  missing_morning_report: number | boolean;
  shift_type: string;
  working_shifts_in_month: number;
  planned_hours: number;
  worked_hours: number;
  overtime_hours: number;
  undertime_hours: number;
  fixed_base_rub: number;
  overtime_bonus_rub: number;
  undertime_penalty_rub: number;
  kpi_total_rub: number;
  kpi_breakdown: KpiBreakdownItem[];
  plan_completion_pct: number;
  schedule_pace_pct: number;
  total_earned_rub: number;
  notes?: string;
}

export interface MissingFieldSuggestion {
  kind: 'missing_morning_template' | 'missing_evening_template' | 'missing_number_field';
  title: string;
  description: string;
  targetTemplateId?: string;
  targetTemplateTitle?: string;
  suggestedFieldLabel?: string;
  suggestedFieldHint?: string;
  kpiRuleIndex?: number;
}

export function formatRub(val: number | undefined | null): string {
  const num = Number(val || 0);
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Math.round(num * 100) / 100) + ' ₽';
}

export function getPeriodLabel(p: 'day' | 'week' | 'month'): string {
  if (p === 'day') return 'День';
  if (p === 'week') return 'Неделя';
  return 'Месяц';
}

export function getRewardTypeLabel(rt: MotivationKpiGrade['reward_type']): string {
  if (rt === 'per_unit') return '₽ за каждую единицу';
  if (rt === 'flat_bundle') return '₽ фиксированно за весь объем';
  if (rt === 'percent_of_base') return '% от выручки / базы';
  return '₽ фикс-премия';
}

export function createEmptyCalculator(companyId: string, directorId?: string): MotivationCalculator {
  return {
    id: '',
    company_id: companyId,
    director_id: directorId,
    title: '',
    description: '',
    target_scope: 'employees',
    target_department_ids: [],
    target_positions: [],
    target_employee_ids: [],
    is_template: true,
    morning_report_template_id: null,
    evening_report_template_id: null,
    require_morning_report: true,
    schedule_link_mode: 'employee_schedule',
    fixed_config: {
      salary_mode: 'monthly_divided',
      base_amount: 50000,
      base_percent: 100,
      verification_mode: 'time',
      overtime_enabled: true,
      overtime_unit: 'percent_rate',
      overtime_value: 25,
      undertime_enabled: true,
      undertime_unit: 'fixed_hour',
      undertime_value: 300
    },
    kpi_rules: []
  };
}

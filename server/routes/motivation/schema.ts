let schemaInitialized = false;

export interface MotivationFixedConfig {
  salary_mode: 'per_shift' | 'monthly_divided';
  base_amount: number; // Сумма за смену или оклад за месяц в ₽
  base_percent: number; // % выплаты основной части (по умолчанию 100%)
  verification_mode: 'time' | 'numeric_norm'; // По времени работы или по числовым нормам плана
  overtime_enabled: boolean;
  overtime_unit: 'fixed_hour' | 'fixed_shift' | 'percent_rate';
  overtime_value: number; // Рублей или % к ставке за переработку
  undertime_enabled: boolean;
  undertime_unit: 'fixed_hour' | 'fixed_shift' | 'percent_rate';
  undertime_value: number; // Вычет в рублях или % за недоработку
  numeric_norm_field_id?: string; // Поле нормы, если проверка идет по числовому плану дня
  numeric_norm_target?: number;
}

export interface MotivationKpiGrade {
  id: string;
  threshold: number; // Порог: количество единиц (для volume) или % выполнения плана (для plan_percent)
  reward_type: 'per_unit' | 'flat_bundle' | 'percent_of_base' | 'fixed_bonus';
  reward_value: number; // Сумма в ₽ или %
  label?: string;
}

export interface MotivationKpiRule {
  id: string;
  title: string;
  field_id: string; // ID числового поля из вечернего отчета
  field_label: string;
  period: 'day' | 'week' | 'month';
  calc_mode: 'volume_grades' | 'plan_percent_grades'; // По объему единиц или по % выполнения плана
  plan_source: 'fixed_target' | 'morning_report_field';
  plan_target: number; // Целевое числовое значение плана на период
  plan_field_id?: string; // Если план берется из поля утреннего отчета
  base_revenue_field_id?: string; // Поле выручки/базы, от которой считается % премии
  base_revenue_field_label?: string;
  grades: MotivationKpiGrade[];
}

export async function ensureMotivationSchema(db: any): Promise<void> {
  if (schemaInitialized) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS motivation_calculators (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        director_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        target_scope TEXT DEFAULT 'employees',
        target_department_ids TEXT DEFAULT '[]',
        target_positions TEXT DEFAULT '[]',
        target_employee_ids TEXT DEFAULT '[]',
        is_template SMALLINT DEFAULT 1,
        morning_report_template_id TEXT,
        evening_report_template_id TEXT,
        require_morning_report SMALLINT DEFAULT 1,
        schedule_link_mode TEXT DEFAULT 'employee_schedule',
        fixed_config TEXT NOT NULL DEFAULT '{}',
        kpi_rules TEXT NOT NULL DEFAULT '[]',
        is_archived SMALLINT DEFAULT 0,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS motivation_assignments (
        id TEXT PRIMARY KEY,
        calculator_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        employee_id TEXT,
        position_name TEXT,
        department_id TEXT,
        is_active SMALLINT DEFAULT 1,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unassigned_at TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS motivation_accruals (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        director_id TEXT,
        employee_id TEXT NOT NULL,
        employee_name TEXT,
        calculator_id TEXT,
        calculator_title TEXT,
        calculator_snapshot_json TEXT,
        accrual_date TEXT NOT NULL,
        period_month TEXT NOT NULL,
        morning_report_id TEXT,
        evening_report_id TEXT,
        missing_morning_report SMALLINT DEFAULT 0,
        shift_type TEXT,
        working_shifts_in_month INTEGER DEFAULT 21,
        planned_hours REAL DEFAULT 8,
        worked_hours REAL DEFAULT 0,
        overtime_hours REAL DEFAULT 0,
        undertime_hours REAL DEFAULT 0,
        fixed_base_rub REAL DEFAULT 0,
        overtime_bonus_rub REAL DEFAULT 0,
        undertime_penalty_rub REAL DEFAULT 0,
        kpi_total_rub REAL DEFAULT 0,
        kpi_breakdown_json TEXT DEFAULT '[]',
        plan_completion_pct REAL DEFAULT 0,
        schedule_pace_pct REAL DEFAULT 0,
        total_earned_rub REAL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    schemaInitialized = true;
  } catch (err: any) {
    console.error('❌ Failed to initialize motivation schema in PostgreSQL:', err?.message || err);
  }
}

export function safeJsonParse<T>(raw: any, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw === 'object') return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export function buildDefaultFixedConfig(): MotivationFixedConfig {
  return {
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
  };
}

export type OffboardingStageKey =
  | 'tasks'
  | 'projects_departments'
  | 'reports_templates'
  | 'schedules_files'
  | 'routing_telegram'
  | 'referrals'
  | 'finance_tariffs'
  | 'finalize_notify';

export const OFFBOARDING_STAGE_ORDER: OffboardingStageKey[] = [
  'tasks',
  'projects_departments',
  'reports_templates',
  'schedules_files',
  'routing_telegram',
  'referrals',
  'finance_tariffs',
  'finalize_notify',
];

export const OFFBOARDING_STAGE_LABELS: Record<OffboardingStageKey, string> = {
  tasks: 'Задачи и чек-листы',
  projects_departments: 'Проекты и отделы',
  reports_templates: 'Отчеты и шаблоны',
  schedules_files: 'Графики, смены и файлы',
  routing_telegram: 'Маршрутизация, Telegram и компания',
  referrals: 'Реферальная сеть',
  finance_tariffs: 'Балансы, оплаты и тарифы',
  finalize_notify: 'Закрытие доступа и уведомления',
};

export interface SuccessorMap {
  primary?: string;
  tasks?: string;
  management?: string;
  directorFinance?: string;
  referrals?: string;
}

export interface OffboardingOptions {
  transferOpenTasks?: boolean;
  transferCompletedTasks?: boolean;
  transferProjectsAndDepts?: boolean;
  transferTemplatesAndPendingReports?: boolean;
  transferSchedulesAndFiles?: boolean;
  transferRoutingRules?: boolean;
  transferReferrals?: boolean;
  transferBalancesAndTariffs?: boolean;
  replaceDirectorInCompany?: boolean;
  syncCompanyContactFromSuccessor?: boolean;
  generateAiHandoverBrief?: boolean;
  notifyTelegram?: boolean;
  simulateFailureStage?: string;
}

export type StageStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export interface StageStateEntry {
  status: StageStatus;
  updated_at?: string;
  details?: string;
  transferred_count?: number;
  error?: string;
}

let schemaEnsured = false;

export async function ensureOffboardingSchema(db: any): Promise<void> {
  if (schemaEnsured) return;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS offboarding_jobs (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      target_user_id TEXT NOT NULL,
      target_name TEXT,
      target_role TEXT,
      initiator_user_id TEXT,
      transfer_mode TEXT DEFAULT 'full_successor',
      successor_map_json TEXT DEFAULT '{}',
      options_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      current_stage TEXT,
      stages_state_json TEXT DEFAULT '{}',
      handover_brief TEXT,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 8,
      next_retry_at TEXT,
      last_error TEXT,
      created_at TEXT,
      updated_at TEXT,
      completed_at TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS offboarding_audit_log (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      company_id TEXT,
      stage TEXT NOT NULL,
      entity_table TEXT NOT NULL,
      from_user_id TEXT,
      to_user_id TEXT,
      affected_count INTEGER DEFAULT 0,
      reference_id TEXT,
      details TEXT,
      created_at TEXT
    );
  `);

  schemaEnsured = true;
}

export function safeJsonParse<T>(raw: any, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'object') return raw as T;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

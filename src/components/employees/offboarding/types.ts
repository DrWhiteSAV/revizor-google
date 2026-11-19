export type OffboardingStageKey =
  | 'tasks'
  | 'projects_departments'
  | 'reports_templates'
  | 'schedules_files'
  | 'routing_telegram'
  | 'referrals'
  | 'finance_tariffs'
  | 'finalize_notify';

export const STAGE_LABELS: Record<OffboardingStageKey, string> = {
  tasks: 'Задачи и чек-листы',
  projects_departments: 'Проекты и отделы',
  reports_templates: 'Отчеты и шаблоны',
  schedules_files: 'Графики, смены и файлы',
  routing_telegram: 'Маршрутизация, Telegram и компания',
  referrals: 'Реферальная сеть',
  finance_tariffs: 'Балансы, оплаты и тарифы',
  finalize_notify: 'Закрытие доступа и уведомления',
};

export const STAGE_ORDER: OffboardingStageKey[] = [
  'tasks',
  'projects_departments',
  'reports_templates',
  'schedules_files',
  'routing_telegram',
  'referrals',
  'finance_tariffs',
  'finalize_notify',
];

export interface SuccessorCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string;
  department_id?: string | null;
  status?: string;
}

export interface OffboardingPreflight {
  found: boolean;
  target: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    position: string;
    status: string;
    company_id: string;
    director_id: string;
    is_boss: boolean;
    is_main_platform_owner: boolean;
  };
  counts: {
    open_tasks: number;
    completed_tasks: number;
    authored_tasks: number;
    projects: number;
    managed_departments: number;
    member_departments: number;
    pending_reports: number;
    history_reports: number;
    report_templates: number;
    future_shifts: number;
    schedules: number;
    files: number;
    routing_rules: number;
    referrals: number;
    subordinates: number;
    owned_companies: number;
  };
  balances: {
    payment_balance: number;
    local_bonus: number;
    referral_bonus: number;
    welcome_bonus: number;
    referral_reward_balance: number;
    extra_projects_balance: number;
    extra_tasks_balance: number;
    extra_reports_balance: number;
    revizor_paid_until?: string | null;
    recruiter_paid_until?: string | null;
  };
  eligible_successors: SuccessorCandidate[];
}

export interface SuccessorMap {
  primary?: string;
  tasks?: string;
  management?: string;
  directorFinance?: string;
  referrals?: string;
}

export interface OffboardingOptions {
  transferOpenTasks: boolean;
  transferCompletedTasks: boolean;
  transferProjectsAndDepts: boolean;
  transferTemplatesAndPendingReports: boolean;
  transferSchedulesAndFiles: boolean;
  transferRoutingRules: boolean;
  transferReferrals: boolean;
  transferBalancesAndTariffs: boolean;
  replaceDirectorInCompany: boolean;
  syncCompanyContactFromSuccessor: boolean;
  generateAiHandoverBrief: boolean;
  notifyTelegram: boolean;
}

export interface StageStateItem {
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  updated_at?: string;
  details?: string;
  transferred_count?: number;
  error?: string;
}

export interface OffboardingJob {
  id: string;
  company_id: string;
  target_user_id: string;
  target_name: string;
  target_role: string;
  transfer_mode: string;
  status: 'pending' | 'running' | 'partial_retry' | 'completed' | 'failed';
  current_stage?: OffboardingStageKey;
  stages_state: Record<OffboardingStageKey, StageStateItem>;
  handover_brief?: string | null;
  attempts: number;
  max_attempts: number;
  next_retry_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export function formatRoleRu(role?: string): string {
  const r = String(role || '').toUpperCase();
  if (r === 'SUPER_ADMIN') return 'Супер-Администратор';
  if (r === 'DIRECTOR') return 'Директор';
  if (r === 'MANAGER') return 'Руководитель';
  if (r === 'ADMIN') return 'Администратор';
  return 'Сотрудник';
}

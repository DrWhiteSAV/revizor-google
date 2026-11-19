export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

export interface UserProfile {
  id: string; // 8-digit number string
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  telegramHandle?: string;
  position?: string;
  departmentId?: string;
  department_id?: string;
  invitedBy?: string; // ID of the inviting user
  referralCode: string; // strictly Latin, lowercase
  bonusesEarned: number;
  invitedUsersCount: number;
  duties?: string[]; // list of employee-specific responsibilities
  avatarUrl?: string;

  // Telegram WebApp & Referral Integration Fields
  telegram_id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  profile_link?: string;
  bio?: string;
  is_premium?: boolean | number;
  language_code?: string;
  allows_write_to_pm?: boolean | number;
  latitude?: number;
  longitude?: number;
  referred_by?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referral_reward_balance?: number;
  referral_bonus?: number;
  purchased_extra_projects?: number;
  purchased_extra_tasks?: number;
  purchased_extra_reports?: number;
  extra_projects_balance?: number;
  extra_tasks_balance?: number;
  extra_reports_balance?: number;
  payment_balance?: number;
  referral_clicks?: number;
  active_employees_count?: number;
  revisor_employees_count?: number;
  raport_employees_count?: number;
  revisor_expires_at?: string;
  raport_expires_at?: string;
  projects_used?: number;
  projects_limit?: number;
  tasks_used?: number;
  tasks_limit?: number;
  reports_used?: number;
  reports_limit?: number;
  employees_used?: number;
  timezone?: string;
  director_id?: string;
  company_id?: string;
  company?: string;
  last_login?: string | number;
  createdAt?: string | number;
  revizor_seats_current?: number;
  revizor_seats_next_period?: number;
  recruiter_seats_current?: number;
  recruiter_seats_next_period?: number;
  revizor_paid_until?: string;
  recruiter_paid_until?: string;
  is_trial_active?: boolean | number;
  trial_started_at?: string;
  trial_ends_at?: string;
}

export interface CompanyInfo {
  id?: string;
  director_id?: string;
  name: string;
  productDescription: string;
  workSystemDescription: string;
  website?: string;
  websites?: string[];
}

export interface Department {
  id: string;
  name: string;
  managerId: string; // ID of the manager
  employeeIds: string[]; // IDs of employees assigned to this department
  telegramChatId: string; // Chat or group ID where reports are posted
  parentId: string | null; // For hierarchical tree connections
  x?: number; // visual coordinates for node tree layout
  y?: number;
}

export type ReportType = 'PLAN_DAY' | 'FACT_DAY' | 'WEEKLY' | 'MONTHLY';
export type ReportTemplateType = ReportType;

export type ReportFieldType = 
  | 'voice'
  | 'text_short'
  | 'text_paragraph'
  | 'text'
  | 'number'
  | 'checkbox'
  | 'multiple_choice'
  | 'single_choice'
  | 'url'
  | 'google_drive'
  | 'screenshot'
  | 'photo'
  | 'camera_photo'
  | 'pdf'
  | 'table'
  | 'audio'
  | 'document'
  | 'presentation'
  | 'video'
  | 'camera_video'
  | 'file'
  | 'geolocation'
  | 'list'
  | 'checkboxes'
  | 'select'
  | 'image';

export interface ReportField {
  id: string;
  label: string;
  type: ReportFieldType;
  required: boolean;
  options?: string[]; // for select / multiple_choice options
  hint?: string;
  aiPrompt?: string; // Промпт проверки поля ИИ
  geoInstructions?: string; // Инструкции для нейросети по проверке геопозиции
  ai_check_prompt?: string; // Промпт/критерий для ИИ: что именно проверять в этом поле при сдаче отчета
  image_analysis_mode?: 'text' | 'visual_description'; // Режим анализа картинок: 'text' (извлечение текста) или 'visual_description' (не текст / описание объектов)
}

export interface ReportPlanItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD or date label
  time?: string;
  deadline?: string;
  priority?: 'high' | 'medium' | 'normal';
  completed?: boolean;
}

export interface TelegramDestination {
  id: string;
  type: 'bot_direct' | 'group' | 'channel' | 'direct' | 'employee_direct' | 'manager' | 'director';
  title: string;
  chatId: string;
  topicId?: string;
  recipientUserId?: string;
  recipientUserName?: string;
  recipientRole?: string;
  instructions?: string;
  sendOnSubmit: boolean;
  sendReminder: boolean;
}

export interface ReportTemplate {
  id: string;
  departmentId?: string;
  departmentName?: string;
  company_id?: string;
  director_id?: string;
  title: string;
  description?: string;
  type: ReportType;
  fields: ReportField[];
  employeeIds?: string[]; // assigned employees who must fill it
  managerId?: string; // manager who receives it
  target_departments?: string[]; // target departments / subdepartments
  target_employees?: string[]; // target specific employee IDs
  checker_type?: 'ai' | 'director' | 'manager' | 'manual' | 'hybrid' | 'manual_ai'; // who evaluates report
  reviewer_id?: string; // specific manager/director ID chosen to review
  reviewer_name?: string; // name of reviewer
  check_criteria?: string; // criteria rules and wishes for AI evaluation & plan
  history_depth_for_ai?: number; // number of past employee reports to analyze (1 to 5)
  ai_autofill_prompt?: string; // system prompt for employee AI autofill (optional/legacy)
  customPrompt?: string; // custom prompt for AI review
  reminderMinutes?: number; // minutes after deadline
  reminderText?: string; // notification message template
  telegram_destinations?: TelegramDestination[]; // telegram routing destinations
  schedule_mode?: 'work_schedule' | 'custom_time'; // согласно рабочему графику или свое время
  deadline_time?: string; // время сдачи, например "18:00"
  timezone?: string; // часовой пояс, например "Europe/Moscow"
  schedule_days?: string[]; // дни недели для WEEKLY отчетов (['mon', 'fri'])
  monthly_day?: number; // день месяца для MONTHLY отчетов (1-31)
  reminder_mode?: 'before_deadline' | 'custom_time';
  reminder_time?: string; // время напоминания при custom_time
  send_telegram_reminder?: boolean;
  send_inapp_notification?: boolean;
  is_active?: boolean;
}

export interface SubmittedReport {
  id: string;
  templateId: string;
  templateTitle: string;
  type: ReportType;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  departmentName?: string;
  company_id?: string;
  director_id?: string;
  timestamp: string; // ISO String
  answers: Record<string, string | boolean>;
  files?: Array<{ name: string; url: string; size?: number; type?: string }>;
  aiRecommendations: string; // AI recommendations for employee
  aiMotivation?: string; // motivational feedback & strengths analysis
  ai_motivation?: string; // alias for DB compatibility
  aiPlan?: ReportPlanItem[]; // generated action plan items
  ai_plan?: ReportPlanItem[]; // alias for DB compatibility
  aiPlanStatus?: 'pending' | 'accepted' | 'declined';
  ai_plan_status?: 'pending' | 'accepted' | 'declined';
  ai_past_reports_count_used?: number;
  qualityScore: number; // calculated quality score (1-100)
  voiceInputUsed: boolean;
  aiBriefReport?: string;
  ai_brief_report?: string;
  aiSummary?: string;
  managerComment?: string;
  managerTask?: string;
  managerReaction?: string;
  managerFeedbackQuick?: string; // fast click feedback choice
  fieldComments?: Record<string, string>;
  isReviewedByManager?: boolean;
  statusColor?: 'green' | 'yellow' | 'red'; // report color status
  status?: 'submitted' | 'reviewed' | 'needs_revision' | 'approved';
  checker_type?: 'ai' | 'director' | 'manager' | 'manual' | 'hybrid';
  reviewer_id?: string;
  reviewer_name?: string;
  reviewer_comment?: string;
  review_score?: number;
  customPromptUsed?: string;
  ai_verdict?: any; // детальный структурированный вердикт ИИ
  field_evaluations?: Record<string, any>; // оценка и анализ по каждому полю
  targetDate?: string;
  future_date?: string;
  reviewedAt?: string;
  reviewed_by_id?: string;
  reviewed_by_name?: string;
  manager_edits_accepted?: boolean | number;
  manager_edits_accepted_at?: string;
}

export type ScheduleTemplate = '5_2' | '2_2' | '6_1' | 'SHIFTS';
export type ShiftType = 'DAY' | 'NIGHT' | '24H' | 'OFF';

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  isHoliday?: boolean;
}

export interface EmployeeSchedule {
  employeeId: string;
  employeeName: string;
  template: ScheduleTemplate;
  schedules: Record<string, ShiftType>; // date -> shift type
}

export interface TariffState {
  activeEmployeesCount: number;
  expiresAt: string; // YYYY-MM-DD
  balance: number; // in rubles
}

export interface Transaction {
  id: string;
  amount: number;
  amount_rr?: number;
  amount_rub?: number;
  type: 'TOPUP' | 'SPENT' | 'REFERRAL' | 'EXCHANGE';
  date: string;
  description: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'REMINDER' | 'RECOMMENDATION' | 'SYSTEM' | 'REPORT_NEED_REVIEW' | 'REPORT_REVIEW_DONE' | 'REPORT_REVIEW' | 'PLAN_ACCEPTED';
  actionUrl?: string;
  reportId?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug?: string;
  seoTitle?: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  authorRole: string;
  image: string;
  summary: string;
  seoDesc: string;
  seoKeywords: string;
  content: string; // Markdown text
}

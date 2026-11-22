import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  User, Building, Layers, Users, FileText, Calendar as CalendarIcon, 
  Clock, BarChart3, Settings, CreditCard, Shield, Send, Mic, Sparkles, 
  Plus, Trash2, Check, HelpCircle, Edit3, Save, ArrowUpRight, MessageSquare, AlertCircle, Share2, Bell, X, Landmark, Menu, Bot, LogOut,
  Trophy, Flame, Coins, Award, Zap, ChevronDown, ChevronRight, ChevronsRight, ChevronsLeft, Activity, HeartPulse, ThumbsUp, CheckSquare, BookOpen, Database,
  Sun, Moon, Globe
} from 'lucide-react';
import { 
  UserRole, UserProfile, CompanyInfo, Department, ReportTemplate, 
  SubmittedReport, EmployeeSchedule, TariffState, Transaction, NotificationItem 
} from '../types';
import AIOverlay from '../components/AIOverlay';
import SatelliteOrbitsBackground from './cabinet/SatelliteOrbitsBackground';

// Import newly refactored subpage components
import CabinetProfile from './cabinet/CabinetProfile';
import CabinetCompany from './cabinet/CabinetCompany';
import CabinetDepartments from './cabinet/CabinetDepartments';
import CabinetEmployees from './cabinet/CabinetEmployees';
import CabinetFillReport from './cabinet/CabinetFillReport';
import CabinetCalendar from './cabinet/CabinetCalendar';
import CabinetScheduleGantt from './cabinet/CabinetScheduleGantt';
import CabinetAnalytics from './cabinet/CabinetAnalytics';
import CabinetNotifications from './cabinet/CabinetNotifications';
import CabinetTariff from './cabinet/CabinetTariff';
import CabinetSettings from './cabinet/CabinetSettings';
import CabinetCRM from './cabinet/CabinetCRM';
import CabinetBlogPosts from './cabinet/CabinetBlogPosts';
import CabinetRevisor from './cabinet/CabinetRevisor';
import CabinetExtendedFeatures from './cabinet/CabinetExtendedFeatures';
import CabinetReferral from './cabinet/CabinetReferral';

// Import newly refactored subpage modules
import ProfilePage from './cabinet/ProfilePage';
import CompanyPage from './cabinet/CompanyPage';
import RaportPage from './cabinet/RaportPage';
import RevisorPage from './cabinet/RevisorPage';
import AdminCRMPage from './cabinet/AdminCRMPage';
import SystemAdminPage from './SystemAdminPage';
import { useCascadeCheckStore } from '../store/useCascadeCheckStore';
import { AcademyHelpModal } from '../components/academy/AcademyHelpModal';
import { CabinetCopilot } from '../components/copilot/CabinetCopilot';
import { OnboardingModal, OnboardingHeaderTrigger } from '../components/onboarding/OnboardingModal';
import { PWAInstallBanner } from '../components/pwa/PWAInstallBanner';
import { OfflineIndicator } from '../components/pwa/PWAInstallProfileButton';
import { CommsWorkspace } from '../components/comms/CommsWorkspace';
import { VideoCallModal } from '../components/comms/VideoCallModal';
import { CommsGlobalOverlay } from '../components/comms/CommsGlobalOverlay';
import { useCommsSocket } from '../hooks/useCommsSocket';
import type { CommsColleague, IncomingCallInvite } from '../types/comms';

interface CabinetPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  currentUser: UserProfile | null;
  onUpdateUser: (user: UserProfile) => void;
  onLogout?: () => void;
}

// Fallback mascots for profile avatars
const MASCOT_AVATARS = [
  '/file/27/iirr1.png',
  '/file/28/iirr2.png',
  '/file/29/iirr3.png',
  '/file/30/iirr4.png',
  '/file/31/iirr5.png',
  '/file/32/iirr6.png',
  '/file/33/iirr7.png',
  '/file/34/iirr8.png',
  '/file/35/iirr9.png',
  '/file/23/iirr10.png',
  '/file/24/iirr11.png',
  '/file/25/iirr12.png',
  '/file/26/iirr13.png',
];

const getDeterministicMascot = (idOrName?: string) => {
  if (!idOrName) return MASCOT_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MASCOT_AVATARS.length;
  return MASCOT_AVATARS[index];
};

// Initial default state if server has nothing saved
const DEFAULT_COMPANY: CompanyInfo = {
  name: '',
  productDescription: '',
  workSystemDescription: ''
};

const DEFAULT_DEPARTMENTS: Department[] = [];

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: '1789592333863',
    departmentId: 'dep-1',
    title: 'Вечерний отчет менеджера по продажам жалюзи',
    type: 'FACT_DAY',
    fields: [
      { id: 'ai-field-1789592194085-0', label: 'Количество новых обращений за день', type: 'number', required: true, hint: 'Укажите количество новых обращений клиентов по жалюзи за текущий день', aiPrompt: 'Проверь указание точного количества новых лидов/обращений по жалюзи.' },
      { id: 'ai-field-1789592194085-1', label: 'Количество обработанных обращений и проведенных консультаций', type: 'number', required: true, hint: 'Укажите общее количество обращений, по которым проведена коммуникация или консультация', aiPrompt: 'Оцени полноту консультаций и динамику обработки лидов.' },
      { id: 'ai-field-1789592194085-2', label: 'Количество выполненных расчетов и подготовленных коммерческих предложений', type: 'number', required: true, hint: 'Укажите количество расчетов стоимости и отправленных коммерческих предложений', aiPrompt: 'Проверь объем подготовленных КП и расчетов клиентам.' },
      { id: 'ai-field-1789592194085-3', label: 'Количество оформленных заказов', type: 'number', required: true, hint: 'Укажите число заказов на жалюзи, оформленных за день', aiPrompt: 'Оцени фактическую конверсию в подтвержденные заказы.' },
      { id: 'ai-field-1789592194085-4', label: 'Сумма продаж за день', type: 'number', required: true, hint: 'Укажите фактическую сумму оформленных продаж в рублях', aiPrompt: 'Проверь сумму продаж относительно дневного плана (норматив 120 000 руб.).' },
      { id: 'ai-field-1789592194085-5', label: 'Количество полученных оплат', type: 'number', required: true, hint: 'Укажите количество клиентов, внесших оплату за день', aiPrompt: 'Проверь подтверждение поступления реальных оплат.' },
      { id: 'ai-field-1789592194085-6', label: 'Средний чек', type: 'number', required: false, hint: 'Укажите среднюю сумму одного оформленного заказа в рублях', aiPrompt: 'Оцени средний чек сделок на соответствие целевому диапазону.' },
      { id: 'ai-field-1789592194085-7', label: 'Статусы текущих сделок и следующие шаги', type: 'text_paragraph', required: true, hint: 'Перечислите ключевые сделки, текущий статус каждой и ближайшее действие менеджера', aiPrompt: 'Проверь конкретику следующих шагов по крупным объектам и замерам.' },
      { id: 'ai-field-1789592194085-8', label: 'Причины отказов и незавершенных продаж', type: 'text_paragraph', required: false, hint: 'Укажите количество отказов, основные причины и возможность повторного контакта', aiPrompt: 'Оцени глубину анализа причин отказов и возможности возврата клиентов.' },
      { id: 'ai-field-1789592194085-9', label: 'Ключевые результаты и достижения за день', type: 'voice', required: true, hint: 'Кратко сообщите фактические результаты, наиболее важные сделки и достижения за день', aiPrompt: 'Проанализируй аудиозапись или текст ключевых достижений смены.' },
      { id: 'ai-field-1789592194085-10', label: 'Сложности и блокеры', type: 'voice', required: false, hint: 'Опишите проблемы, которые повлияли на продажи или обработку клиентов', aiPrompt: 'Проверь наличие блокеров по поставкам, карнизам или монтажникам.' },
      { id: 'ai-field-1789592194085-11', label: 'План и приоритеты на следующий рабочий день', type: 'text_paragraph', required: true, hint: 'Укажите минимум 3 конкретные задачи с приоритетами и ожидаемым результатом', aiPrompt: 'Оцени четкость и реалистичность плана на следующую смену.' },
      { id: 'ai-field-1789592194085-12', label: 'Подтверждаю достоверность указанных показателей', type: 'checkbox', required: true, hint: 'Подтвердите, что сведения соответствуют фактическим данным за отчетный день', aiPrompt: 'Проверь факт подтверждения достоверности менеджером.' }
    ],
    employeeIds: ['91827364501'],
    managerId: '91827364501',
    checker_type: 'manual_ai',
    customPrompt: 'Оценка по шкале 1–100: полнота заполнения отчета — до 20 баллов; наличие конкретных показателей — до 25 баллов; соответствие плану — до 20 баллов; качество описания сделок — до 15 баллов; план на завтра — до 10 баллов; блокеры — до 10 баллов.',
    reminderMinutes: 15,
    reminderText: 'Внимание! Напоминаем о сдаче вечернего отчета менеджера по продажам жалюзи.'
  },
  {
    id: 'tpl-1',
    departmentId: 'dep-1',
    title: 'План на день (Отдел Разработки)',
    type: 'PLAN_DAY',
    fields: [
      { id: 'q1', label: 'Каковы ваши главные задачи на сегодня?', type: 'voice', required: true },
      { id: 'q2', label: 'Какие трудности или зависимости могут возникнуть?', type: 'voice', required: false },
      { id: 'q3', label: 'Ожидаемые рабочие часы за смену (число)', type: 'number', required: true }
    ],
    employeeIds: ['emp-1', 'emp-2'],
    managerId: 'mgr-1',
    customPrompt: 'Проверь соответствие плана архитектурным стандартам и полноту декомпозиции задач.',
    reminderMinutes: 15,
    reminderText: 'Внимание! Напоминаем о сдаче ежедневного плана. Пожалуйста, заполните рапорт в течение 15 минут.'
  },
  {
    id: 'tpl-2',
    departmentId: 'dep-1',
    title: 'Факт за день (Отдел Разработки)',
    type: 'FACT_DAY',
    fields: [
      { id: 'q4', label: 'Что было сделано по факту за сегодня?', type: 'text_paragraph', required: true },
      { id: 'q5', label: 'Все ли задачи из плана выполнены?', type: 'checkbox', required: true },
      { id: 'q6', label: 'Загрузить скриншот коммита / пуллреквеста', type: 'image', required: false },
      { id: 'q7', label: 'Ссылка на ветку или задачу в таск-трекере', type: 'text_short', required: false }
    ],
    employeeIds: ['emp-1', 'emp-2'],
    managerId: 'mgr-1',
    customPrompt: 'Обрати внимание на то, решены ли проблемы предыдущего дня и указаны ли конкретные коммиты/результаты.',
    reminderMinutes: 30,
    reminderText: 'Добрый вечер! Время сдавать факт за сегодня. Опоздание более 30 минут влияет на оценку.'
  },
  {
    id: 'tpl-3',
    departmentId: 'dep-2',
    title: 'Еженедельный отчет по рекламе (Отдел Маркетинга)',
    type: 'WEEKLY',
    fields: [
      { id: 'q8', label: 'Список запущенных рекламных кампаний и креативов за неделю', type: 'list', required: true },
      { id: 'q9', label: 'Итоговый расход рекламного бюджета (в рублях)', type: 'number', required: true },
      { id: 'q10', label: 'Количество полученных лидов и средний CPA', type: 'text_short', required: true },
      { id: 'q11', label: 'Загрузить еженедельный медиа-отчет (PDF/XLS)', type: 'document', required: false }
    ],
    employeeIds: ['emp-3'],
    managerId: 'mgr-2',
    customPrompt: 'Особое внимание удели стоимости лида (CPA), CTR рекламных кампаний и выполнению медиаплана.',
    reminderMinutes: 60,
    reminderText: 'Коллеги, не забываем предоставить недельный отчет по маркетингу. Срок сдачи истекает.'
  },
  {
    id: 'tpl-4',
    departmentId: 'dep-3',
    title: 'Ежемесячный аудит сделок и выручки (Отдел Продаж)',
    type: 'MONTHLY',
    fields: [
      { id: 'q12', label: 'Итоговая выручка за месяц по закрытым сделкам (руб)', type: 'number', required: true },
      { id: 'q13', label: 'Какая конверсия из лида в оплату была достигнута (%)', type: 'number', required: true },
      { id: 'q14', label: 'Список ключевых клиентов, заключивших договора', type: 'checkboxes', required: true },
      { id: 'q15', label: 'Загрузить скан подписанного акта сверки', type: 'photo', required: false },
      { id: 'q16', label: 'Главные выводы и узкие места в воронке продаж за месяц', type: 'text_paragraph', required: true }
    ],
    employeeIds: ['emp-4'],
    managerId: 'mgr-3',
    customPrompt: 'Проанализируй выполнение плана по выручке, конверсию на этапах воронки и средний чек.',
    reminderMinutes: 120,
    reminderText: 'Важно! Ждем ежемесячный отчет по продажам. Пожалуйста, загрузите акты сверки и показатели.'
  },
  {
    id: 'tpl-5',
    departmentId: 'dep-1',
    title: 'Рапорт о дежурстве (Служба Поддержки)',
    type: 'FACT_DAY',
    fields: [
      { id: 'q17', label: 'Количество принятых и обработанных обращений за смену', type: 'number', required: true },
      { id: 'q18', label: 'Были ли критические сбои оборудования или сервисов?', type: 'checkbox', required: true },
      { id: 'q19', label: 'Аудиозапись утренней передачи смены (голосовой отчет)', type: 'voice', required: false }
    ],
    employeeIds: ['emp-1'],
    managerId: 'mgr-1',
    customPrompt: 'Проверь среднее время ответа (SLA) и количество незакрытых тикетов повышенной сложности.',
    reminderMinutes: 15,
    reminderText: 'Системное уведомление: Напоминаем сдать утренний рапорт дежурной смены поддержки.'
  }
];

const DEFAULT_REPORTS: SubmittedReport[] = [];

const DEFAULT_EMPLOYEES: UserProfile[] = [];

const DEFAULT_TRANSACTIONS: Transaction[] = [];

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [];

const getTabIcon = (id: string) => {
  switch (id) {
    // Categories & Revisor
    case 'revisor':
      return <Shield size={18} className="text-[#E7C768]" />;
    case 'revisor_projects_map':
    case 'revisor_tasks_map':
    case 'revisor_tasks':
      return <Globe size={18} className="text-[#E7C768]" />;
    case 'revisor_projects_kanban':
    case 'revisor_tasks_kanban':
    case 'revisor_kanban':
      return <Layers size={18} className="text-[#E7C768]" />;
    case 'revisor_projects_table':
    case 'revisor_tasks_table':
      return <FileText size={18} className="text-[#E7C768]" />;
    case 'revisor_scrum':
      return <Trophy size={18} className="text-[#E7C768]" />;
    case 'revisor_gantt':
      return <CalendarIcon size={18} className="text-[#E7C768]" />;
    case 'revisor_analytics':
      return <BarChart3 size={18} className="text-[#E7C768]" />;
    case 'revisor_doctor':
      return <Activity size={18} className="text-[#E7C768]" />;
      
    // Raport
    case 'raport':
    case 'fill_report':
      return <Plus size={18} className="text-amber-300" />;
    case 'raport_calendar':
      return <CalendarIcon size={18} className="text-amber-300" />;
    case 'raport_builder':
      return <Settings size={18} className="text-amber-300" />;
    case 'raport_analytics':
      return <BarChart3 size={18} className="text-amber-300" />;
    case 'raport_notifications':
      return <Bell size={18} className="text-amber-300" />;
    case 'raport_integrations':
      return <Share2 size={18} className="text-amber-300" />;
    case 'raport_motivation':
      return <Coins size={18} className="text-[#F4EE8E]" />;
    case 'raport_motivation_history':
      return <Clock size={18} className="text-amber-300" />;
      
    // Company
    case 'company':
      return <Building size={18} className="text-emerald-400" />;
    case 'departments':
      return <Layers size={18} className="text-emerald-400" />;
    case 'employees':
      return <Users size={18} className="text-emerald-400" />;
    case 'employee_schedule':
      return <Clock size={18} className="text-emerald-400" />;
    case 'comms':
      return <MessageSquare size={18} className="text-emerald-400" />;
      

      
    // Profile
    case 'profile_info':
    case 'profile':
      return <User size={18} className="text-purple-400" />;
    case 'profile_referral':
      return <Award size={18} className="text-purple-400" />;
    case 'profile_prompts':
    case 'settings':
      return <Settings size={18} className="text-purple-400" />;
    case 'profile_tariff':
    case 'tariff':
      return <Zap size={18} className="text-purple-400" />;
    case 'profile_billing':
      return <CreditCard size={18} className="text-purple-400" />;

    // Admin
    case 'admin':
    case 'admin_crm':
    case 'crm':
      return <Database size={18} className="text-red-400" />;
    case 'admin_posts':
    case 'blog_posts':
      return <Edit3 size={18} className="text-red-400" />;
      
    default:
      return <HelpCircle size={18} />;
  }
};

const tabNamesMap: Record<string, string> = {
  revisor_projects_map: 'Карта Планет (Проекты)',
  revisor_projects_kanban: 'Канбан Проектов',
  revisor_projects_table: 'Таблица Проектов',
  revisor_tasks_map: 'Орбиты Задач (Задачи)',
  revisor_tasks_kanban: 'Канбан Задач',
  revisor_tasks_table: 'Таблица Задач',
  revisor_tasks: 'Карта Ревизора',
  revisor_kanban: 'ИИ Канбан-Доска',
  revisor_scrum: 'ИИ Скрам-Мастер',
  revisor_gantt: 'Диаграмма Ганта',
  revisor_analytics: 'Аналитика Ревизора',
  revisor_doctor: 'ИИ Доктор Проектов',
  fill_report: 'Сдать Рапорт',
  raport_calendar: 'Календарь Сдач',
  raport_builder: 'Редактор Шаблонов',
  raport_analytics: 'Аналитика Рапортов',
  raport_notifications: 'Напоминания ИИ',
  raport_integrations: 'Интеграция Телеграм',
  raport_motivation: 'Мотивация и KPI',
  raport_motivation_history: 'История расчетов',
  company: 'О Компании',
  departments: 'Органиграмма',
  employees: 'Сотрудники',
  employee_schedule: 'Графики Работы',
  comms: 'Чаты и Созвоны',

  profile_info: 'Мой Профиль',
  profile: 'Мой Профиль',
  profile_referral: 'Реферальная Система',
  profile_prompts: 'Системные Промпты ИИ',
  settings: 'Системные Промпты ИИ',
  profile_tariff: 'Тарифы & Оплата',
  tariff: 'Тарифы & Оплата',
  profile_billing: 'Биллинг & Счета',
  admin_crm: 'CRM Панель Админа',
  crm: 'CRM Панель Админа',
  admin_posts: 'Редактор постов блога',
  blog_posts: 'Редактор постов блога',
};

export const tabToPathMap: Record<string, string> = {
  profile: '/cabinet/profile',
  profile_info: '/cabinet/profile',
  profile_referral: '/cabinet/referral',
  profile_prompts: '/cabinet/prompts',
  settings: '/cabinet/prompts',
  profile_tariff: '/cabinet/tariff',
  tariff: '/cabinet/tariff',
  profile_billing: '/cabinet/tariff',
  profile_notifications: '/cabinet/profile/notifications',
  notifications: '/cabinet/profile/notifications',

  revisor_tasks: '/cabinet/revisor/task/map',
  revisor_projects_map: '/cabinet/revisor/map',
  revisor_projects_kanban: '/cabinet/revisor/kanban',
  revisor_projects_table: '/cabinet/revisor/table',
  revisor_tasks_map: '/cabinet/revisor/task/map',
  revisor_tasks_kanban: '/cabinet/revisor/task/kanban',
  revisor_tasks_table: '/cabinet/revisor/task/table',
  revisor_kanban: '/cabinet/revisor/kanban',
  revisor_scrum: '/cabinet/revisor/scrum',
  revisor_gantt: '/cabinet/revisor/gantt',
  revisor_analytics: '/cabinet/revisor/doctor',
  revisor_doctor: '/cabinet/revisor/doctor',
  revisor_integrations: '/cabinet/revisor/integration',
  revisor_review: '/cabinet/revisor/review',
  revisor_task_cards: '/cabinet/revisor/task',

  fill_report: '/cabinet/raport',
  raport_review: '/cabinet/raport/review',
  raport_calendar: '/cabinet/raport/calendar',
  raport_verdict: '/cabinet/raport/calendar',
  raport_builder: '/cabinet/raport',
  raport_analytics: '/cabinet/raport/analytics',
  raport_notifications: '/cabinet/raport/notifications',
  raport_summaries: '/cabinet/raport/analytics',
  raport_kpi: '/cabinet/raport/analytics',
  raport_templates: '/cabinet/raport',
  raport_integrations: '/cabinet/raport/integrations',
  raport_motivation: '/cabinet/raport/motivation',
  raport_motivation_history: '/cabinet/raport/motivation/history',

  company: '/cabinet/company/map',
  departments: '/cabinet/company/map',
  employees: '/cabinet/company/employers',
  employee_schedule: '/cabinet/company/schedule',
  comms: '/cabinet/comms',



  admin_crm: '/cabinet/admin/crm',
  crm: '/cabinet/admin/crm',
  admin_blog: '/cabinet/admin/blog',
  blog_posts: '/cabinet/admin/blog',
  admin_db: '/system-admin',
  system_admin: '/system-admin',
};

export const pathToTabMap: Record<string, string> = {
  '/cabinet': 'profile',
  '/cabinet/': 'profile',
  '/cabinet/profile': 'profile',
  '/cabinet/profile/notifications': 'profile_notifications',
  '/cabinet/notifications': 'profile_notifications',
  '/cabinet/referral': 'profile_referral',
  '/cabinet/prompts': 'settings',
  '/cabinet/settings': 'settings',
  '/cabinet/tariff': 'tariff',
  '/cabinet/billing': 'tariff',

  '/cabinet/revisor': 'revisor_projects_map',
  '/cabinet/revisor/map': 'revisor_projects_map',
  '/cabinet/revisor/kanban': 'revisor_projects_kanban',
  '/cabinet/revisor/table': 'revisor_projects_table',
  '/cabinet/revisor/task': 'revisor_tasks_map',
  '/cabinet/revisor/task/map': 'revisor_tasks_map',
  '/cabinet/revisor/task/kanban': 'revisor_tasks_kanban',
  '/cabinet/revisor/task/table': 'revisor_tasks_table',
  '/cabinet/revisor/tasks': 'revisor_tasks_map',
  '/cabinet/revisor/projects-builder': 'revisor_projects_map',
  '/cabinet/revisor/tasks-builder': 'revisor_tasks_map',
  '/cabinet/revisor/gantt': 'revisor_gantt',
  '/cabinet/revisor/analytics': 'revisor_doctor',
  '/cabinet/revisor/doctor': 'revisor_doctor',
  '/cabinet/revisor/integration': 'revisor_integrations',
  '/cabinet/revisor/integrations': 'revisor_integrations',
  '/cabinet/revisor/review': 'revisor_review',

  '/cabinet/raport': 'fill_report',
  '/cabinet/raport/fill': 'fill_report',
  '/cabinet/raport/calendar': 'raport_calendar',
  '/cabinet/raport/verdict': 'raport_verdict',
  '/cabinet/raport/review': 'raport_review',
  '/cabinet/review': 'raport_review',
  '/cabinet/raport/builder': 'fill_report',
  '/cabinet/raport/analytics': 'raport_analytics',
  '/cabinet/raport/notifications': 'profile_notifications',
  '/cabinet/raport/summaries': 'raport_analytics',
  '/cabinet/raport/kpi': 'raport_analytics',
  '/cabinet/raport/templates': 'fill_report',
  '/cabinet/raport/integrations': 'raport_integrations',
  '/cabinet/raport/motivation': 'raport_motivation',
  '/cabinet/raport/motivation/history': 'raport_motivation_history',

  '/cabinet/company': 'departments',
  '/cabinet/company/map': 'departments',
  '/cabinet/company/departments': 'departments',
  '/cabinet/company/employees': 'employees',
  '/cabinet/company/employers': 'employees',
  '/cabinet/company/schedule': 'employee_schedule',
  '/cabinet/company/schedules': 'employee_schedule',
  '/cabinet/schedule': 'employee_schedule',
  '/cabinet/schedules': 'employee_schedule',
  '/cabinet/raport/schedules': 'employee_schedule',
  '/cabinet/raport/schedule': 'employee_schedule',
  '/cabinet/raport/schedules_builder': 'employee_schedule',
  '/cabinet/comms': 'comms',
  '/cabinet/video': 'comms',



  '/cabinet/admin/crm': 'admin_crm',
  '/cabinet/admin/blog': 'admin_blog',
  '/system-admin': 'system_admin',
  '/system-admin/triggers': 'system_admin',
  '/system-admin/cron': 'system_admin',
  '/system-admin/kanban': 'system_admin',
  '/system-admin/table': 'system_admin',
  '/system-admin/analytic': 'system_admin',
  '/system-admin/product': 'system_admin',
};

export const getTabFromPath = (path?: string): string => {
  if (!path) return 'profile';
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (pathToTabMap[cleanPath]) return pathToTabMap[cleanPath];
  if (pathToTabMap[path]) return pathToTabMap[path];
  if (cleanPath.startsWith('/system-admin')) return 'system_admin';
  if (cleanPath === '/cabinet') return 'profile';
  if (cleanPath.startsWith('/cabinet/profile/')) {
    const sub = cleanPath.replace('/cabinet/profile/', '');
    if (sub && sub !== 'notifications') {
      return 'profile_view_only';
    }
  }
  if (cleanPath.startsWith('/cabinet/comms') || cleanPath.startsWith('/cabinet/video')) {
    return 'comms';
  }
  if (cleanPath.startsWith('/cabinet/company/schedule') || cleanPath.startsWith('/cabinet/company/schedules') || cleanPath.startsWith('/cabinet/schedule') || cleanPath.startsWith('/cabinet/schedules')) {
    return 'employee_schedule';
  }
  if (cleanPath.startsWith('/cabinet/company/employees') || cleanPath.startsWith('/cabinet/company/employers')) {
    return 'employees';
  }
  if (cleanPath.startsWith('/cabinet/company/map') || cleanPath.startsWith('/cabinet/company/departments') || cleanPath === '/cabinet/company') {
    return 'departments';
  }
  if (cleanPath.startsWith('/cabinet/revisor/review')) return 'revisor_review';
  if (cleanPath.startsWith('/cabinet/revisor/integration') || cleanPath.startsWith('/cabinet/revisor/integrations')) return 'revisor_integrations';
  if (cleanPath.startsWith('/cabinet/revisor/doctor') || cleanPath.startsWith('/cabinet/revisor/analytics')) return 'revisor_doctor';
  if (cleanPath === '/cabinet/revisor/task/kanban' || cleanPath.startsWith('/cabinet/revisor/task/kanban') || cleanPath.match(/\/cabinet\/revisor\/[^\/]+\/kanban/)) return 'revisor_tasks_kanban';
  if (cleanPath === '/cabinet/revisor/task/map' || cleanPath.startsWith('/cabinet/revisor/task/map') || cleanPath.match(/\/cabinet\/revisor\/[^\/]+\/map/)) return 'revisor_tasks_map';
  if (cleanPath === '/cabinet/revisor/task/table' || cleanPath.startsWith('/cabinet/revisor/task/table') || cleanPath.match(/\/cabinet\/revisor\/[^\/]+\/table/)) return 'revisor_tasks_table';
  if (cleanPath.match(/\/cabinet\/task[^\/]+/) || cleanPath.match(/\/cabinet\/revisor\/task\/[^\/]+/) || cleanPath.startsWith('/cabinet/task/') || cleanPath === '/cabinet/revisor/task/card') return 'revisor_task_cards';
  if (cleanPath.startsWith('/cabinet/revisor/table')) return 'revisor_projects_table';
  if (cleanPath.startsWith('/cabinet/revisor/kanban')) return 'revisor_projects_kanban';
  if (cleanPath.startsWith('/cabinet/revisor')) return 'revisor_projects_map';
  if (cleanPath.startsWith('/cabinet/raport/review') || cleanPath.startsWith('/cabinet/review')) return 'raport_review';
  if (cleanPath.startsWith('/cabinet/raport/verdict') || cleanPath.startsWith('/cabinet/raport/report/') || cleanPath.match(/\/cabinet\/raport\/(rep-[^\/]+|\d+)$/)) return 'raport_verdict';
  if (cleanPath.startsWith('/cabinet/raport/calendar')) return 'raport_calendar';
  if (cleanPath.startsWith('/cabinet/raport/schedule') || cleanPath.startsWith('/cabinet/raport/schedules')) return 'employee_schedule';
  if (cleanPath.startsWith('/cabinet/raport/motivation/history')) return 'raport_motivation_history';
  if (cleanPath.startsWith('/cabinet/raport/motivation')) return 'raport_motivation';
  if (cleanPath.startsWith('/cabinet/raport/integrations')) return 'raport_integrations';
  if (cleanPath.startsWith('/cabinet/raport/analytics')) return 'raport_analytics';
  if (cleanPath.startsWith('/cabinet/raport/summaries')) return 'raport_analytics';
  if (cleanPath.startsWith('/cabinet/raport')) return 'fill_report';
  if (cleanPath.startsWith('/cabinet/company')) return 'departments';

  if (cleanPath.startsWith('/cabinet/admin')) return 'admin_crm';
  return 'profile';
};

export default function CabinetPage({
  currentPath,
  onNavigate,
  currentUser,
  onUpdateUser,
  onLogout
}: CabinetPageProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cabinet_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('cabinet_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark', 'dark');
    } else {
      document.documentElement.classList.add('theme-dark', 'dark');
      document.documentElement.classList.remove('theme-light');
    }
    window.dispatchEvent(new CustomEvent('cabinet-theme-change', { detail: { theme } }));

    return () => {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('theme-dark', 'dark');
    };
  }, [theme]);

  const [activeTab, setActiveTab] = useState<string>(() => getTabFromPath(currentPath));
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [isAcademyHelpOpen, setIsAcademyHelpOpen] = useState<boolean>(false);
  const [selectedCategoryCollapsed, setSelectedCategoryCollapsed] = useState<string | null>(() => {
    const initTab = getTabFromPath(currentPath);
    if (initTab.startsWith('revisor')) return 'revisor';
    if (initTab.startsWith('raport') || initTab === 'fill_report') return 'raport';
    if (['departments', 'employees', 'employee_schedule', 'comms'].includes(initTab)) return 'company';
    if (initTab.startsWith('admin') || ['system_admin', 'crm', 'blog_posts'].includes(initTab)) return 'admin';
    return 'profile';
  });

  const syncCategoryForTab = (tab: string) => {
    if (!tab) return;
    if (tab.startsWith('revisor')) {
      setSelectedCategoryCollapsed('revisor');
    } else if (tab.startsWith('raport') || tab === 'fill_report') {
      setSelectedCategoryCollapsed('raport');
    } else if (['departments', 'employees', 'employee_schedule', 'comms'].includes(tab)) {
      setSelectedCategoryCollapsed('company');
    } else if (['profile', 'tariffs', 'recharge', 'profile_notifications', 'referrals', 'profile_tariff', 'profile_info', 'profile_prompts', 'profile_referral', 'tariff', 'billing'].includes(tab)) {
      setSelectedCategoryCollapsed('profile');
    } else if (tab.startsWith('admin') || ['system_admin', 'crm', 'blog_posts'].includes(tab)) {
      setSelectedCategoryCollapsed('admin');
    }
  };

  useEffect(() => {
    const targetTab = getTabFromPath(currentPath);
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
    syncCategoryForTab(targetTab || activeTab);
  }, [currentPath]);

  // When switching tabs while report check is running, forcibly send check to background
  useEffect(() => {
    const cascadeState = useCascadeCheckStore.getState();
    if (cascadeState.cascadeOverallStatus === 'running' && activeTab !== 'fill_report') {
      cascadeState.sendToBackground();
    }
  }, [activeTab]);

  const activeTabName = tabNamesMap[activeTab] || 'Личный кабинет';

  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY);
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<SubmittedReport[]>(DEFAULT_REPORTS);
  const [noticeModal, setNoticeModal] = useState<{ title: string; text: string; isError?: boolean } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(DEFAULT_TRANSACTIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);
  const [tariff, setTariff] = useState<TariffState>({
    activeEmployeesCount: 1,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    balance: 0
  });
  const [crmCompanies, setCrmCompanies] = useState<any[]>([]);
  const [mockEmployees, setMockEmployees] = useState<UserProfile[]>([]);
  const [editingCrmCompany, setEditingCrmCompany] = useState<any | null>(null);

  // Profile settings states
  const [telegramHandle, setTelegramHandle] = useState<string>(currentUser?.telegramHandle || '');
  const [userPosition, setUserPosition] = useState<string>(currentUser?.position || '');

  // Sync with currentUser
  useEffect(() => {
    if (currentUser) {
      setTelegramHandle(currentUser.telegramHandle || '');
      setUserPosition(currentUser.position || '');
    }
  }, [currentUser]);

  // Corporate Messenger & Video Call State + Deep Links (?chat= / ?room=)
  const [activeVideoRoom, setActiveVideoRoom] = useState<{ roomId: string; title: string; chatId?: string | null } | null>(null);
  const [commsColleagues, setCommsColleagues] = useState<CommsColleague[]>([]);
  const [initialCommsChatId, setInitialCommsChatId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('chat');
  });

  useCommsSocket({
    userId: currentUser?.id,
    companyId: currentUser?.company_id || currentUser?.director_id || currentUser?.id,
    displayName: currentUser?.name,
    avatarUrl: currentUser?.photo_url || currentUser?.avatarUrl
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const roomParam = params?.get('room');
    const chatParam = params?.get('chat');
    if (chatParam) setInitialCommsChatId(chatParam);

    if (activeTab === 'comms' || roomParam || activeVideoRoom) {
      if (commsColleagues.length === 0) {
        void fetch(`/api/comms/overview?userId=${encodeURIComponent(currentUser.id)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.success && Array.isArray(data.colleagues)) {
              setCommsColleagues(data.colleagues);
            }
          })
          .catch(() => {});
      }
    }

    if (roomParam) {
      void fetch(`/api/comms/video/rooms/${encodeURIComponent(roomParam)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d.room && d.room.isActive !== false) {
            setActiveVideoRoom({
              roomId: d.room.id,
              title: d.room.title || 'Видеовстреча',
              chatId: d.room.chatId || chatParam || null
            });
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id, activeTab, activeVideoRoom, commsColleagues.length]);

  // Auto-parse Telegram profile details on /cabinet entry
  useEffect(() => {
    const tgWebApp = (window as any).Telegram?.WebApp;
    if (tgWebApp) {
      try {
        tgWebApp.ready?.();
        tgWebApp.expand?.();
        const tgUser = tgWebApp.initDataUnsafe?.user;
        if (tgUser && currentUser) {
          const photoUrl = tgUser.photo_url || (tgUser.username ? `https://t.me/i/userpic/320/${tgUser.username}.jpg` : currentUser.photo_url);
          const updatedUser: UserProfile = {
            ...currentUser,
            telegram_id: tgUser.id ? tgUser.id.toString() : currentUser.telegram_id,
            first_name: tgUser.first_name || currentUser.first_name,
            last_name: tgUser.last_name || currentUser.last_name,
            username: tgUser.username || currentUser.username,
            photo_url: photoUrl,
            profile_link: tgUser.username ? `https://t.me/${tgUser.username}` : currentUser.profile_link,
            bio: tgUser.bio || currentUser.bio,
            language_code: tgUser.language_code || currentUser.language_code,
            is_premium: tgUser.is_premium ?? currentUser.is_premium,
            allows_write_to_pm: tgUser.allows_write_to_pm ? 1 : (currentUser.allows_write_to_pm || 0),
            telegramHandle: tgUser.username ? `@${tgUser.username}` : currentUser.telegramHandle
          };

          onUpdateUser(updatedUser);

          fetch('/api/users/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Telegram WebApp parsing error:', e);
      }
    }
  }, []);

  const handleSaveProfile = () => {
    if (currentUser) {
      const updated: UserProfile = {
        ...currentUser,
        telegramHandle,
        position: userPosition
      };
      onUpdateUser(updated);
      setNoticeModal({ title: 'Профиль обновлен', text: 'Профиль успешно обновлен!' });
    }
  };

  // AI overlay states
  const [isAiActive, setIsAiActive] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCountdown, setAiCountdown] = useState<number>(0);
  const [aiMascot, setAiMascot] = useState<any>('welcome');
  const [aiCustomTitle, setAiCustomTitle] = useState<string | undefined>(undefined);
  const [aiCustomPhrase, setAiCustomPhrase] = useState<string | undefined>(undefined);

  // Listen to Copilot overlay events during cascade actions
  useEffect(() => {
    const handleCopilotOverlay = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent?.detail;
      if (!detail) return;

      if (detail.active) {
        setIsAiActive(true);
        setAiLoading(true);
        setAiError(null);
        setAiCountdown(detail.countdown || 3);
        setAiMascot(detail.mascot || 'welcome');
        setAiCustomTitle(detail.title || 'ИИ-Копилот в работе');
        setAiCustomPhrase(detail.phrase || 'Выполняю операцию...');
      } else {
        setIsAiActive(false);
        setAiLoading(false);
        setAiCustomTitle(undefined);
        setAiCustomPhrase(undefined);
      }
    };

    window.addEventListener('cabinet-copilot-overlay', handleCopilotOverlay);
    return () => {
      window.removeEventListener('cabinet-copilot-overlay', handleCopilotOverlay);
    };
  }, []);

  // AI trigger mechanism
  const triggerAI = (
    prompt: string,
    sys: string,
    cb: (text: string) => void,
    mascot: any = 'scrum',
    entityType: string = 'raport'
  ) => {
    setIsAiActive(true);
    setAiLoading(true);
    setAiError(null);
    setAiMascot(mascot);
    setAiCountdown(5);

    const timer = setInterval(() => {
      setAiCountdown(prev => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
    const effectiveUserId = userStr ? (JSON.parse(userStr)?.id || '91827364501') : '91827364501';

    fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        systemPrompt: sys, 
        userPrompt: prompt,
        userId: effectiveUserId,
        entityType: entityType || 'raport'
      })
    })
      .then(async (response) => {
        clearInterval(timer);
        if (!response.ok) throw new Error('Ошибка ИИ сервера');
        const data = await response.json();
        cb(data.text);
        setAiLoading(false);
        setIsAiActive(false);
      })
      .catch((e: any) => {
        clearInterval(timer);
        setAiError(e.message || 'Не удалось связаться с сервером ИИ');
        setAiLoading(false);
      });
  };

  const improveFieldWithAI = (fieldKey: 'name' | 'productDescription' | 'workSystemDescription', text: string) => {
    triggerAI(
      `Пожалуйста, улучши следующий текст: "${text}"`,
      'Ты — профессиональный ИИ-копирайтер и бизнес-консультант. Перепиши и улучши формулировку для описания компании или продукта на русском языке, сделав её более профессиональной, ясной и убедительной.',
      (improvedText) => {
        setCompany(prev => {
          const updated = { ...prev, [fieldKey]: improvedText };
          saveStateToServer({ company: updated, departments, templates, reports, transactions, notifications, tariff, crmCompanies, mockEmployees: prev.mockEmployees || mockEmployees });
          return updated;
        });
      },
      'writer',
      'company'
    );
  };

  // Prompts config states
  const [promptRecs, setPromptRecs] = useState<string>('Ты — ИИ-Ревизор. На основе отчета сотрудника (план или факт) составь конструктивные рекомендации на русском языке, укажи на ошибки и помоги повысить продуктивность.');
  const [promptSummary, setPromptSummary] = useState<string>('Ты — ИИ-Аналитик. Составь краткую, информативную сводку о проделанной работе сотрудника на основе его отчетов за период.');
  const [promptFastFill, setPromptFastFill] = useState<string>('Ты — ИИ-Ассистент. На основе кратких тезисов или аудиозаписи сотрудника заполни форму отчета профессиональным языком.');
  const [promptManagerFeedback, setPromptManagerFeedback] = useState<string>('Ты — ИИ-Консультант руководителя. Помоги составить грамотную обратную связь сотруднику по его отчету.');
  const [promptFieldsGeneration, setPromptFieldsGeneration] = useState<string>('Ты — ИИ-Проектировщик. На основе описания отдела или бизнес-процесса предложи оптимальный список вопросов/полей для регулярных отчетов сотрудников.');

  const handleSavePrompts = () => {
    setNoticeModal({ title: 'Настройки сохранены', text: 'Системные промпты успешно сохранены!' });
  };

  // Tariff management
  const [topUpSeats, setTopUpSeats] = useState<number>(1);
  const handleTopUpTariff = (seats?: number) => {
    const actualSeats = typeof seats === 'number' ? seats : topUpSeats;
    const cost = actualSeats * 500;
    if (tariff.balance < cost) {
      setNoticeModal({ title: 'Недостаточно средств', text: 'Недостаточно средств на балансе. Пожалуйста, пополните баланс в разделе "Биллинг".', isError: true });
      return;
    }
    const updatedTariff = {
      ...tariff,
      activeEmployeesCount: tariff.activeEmployeesCount + actualSeats,
      balance: tariff.balance - cost
    };
    setTariff(updatedTariff);
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      amount: -cost,
      type: 'SPENT',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      description: `Расширение тарифа: +${actualSeats} рабочих мест`
    };
    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);
    saveStateToServer({ company, departments, templates, reports, transactions: updatedTransactions, notifications, tariff: updatedTariff, crmCompanies, mockEmployees });
    setNoticeModal({ title: 'Тариф расширен', text: 'Тариф успешно расширен!' });
  };

  // Cash out/refund dialog states
  const [isCashOutModalOpen, setIsCashOutModalOpen] = useState<boolean>(false);
  const [cashOutTab, setCashOutTab] = useState<'withdraw' | 'transfer' | 'refund'>('withdraw');
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(1000);
  const [payoutMethod, setPayoutMethod] = useState<'card' | 'sbp' | 'crypto'>('sbp');
  const [payoutDetails, setPayoutDetails] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');

  const handleCashOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashOutTab === 'withdraw') {
      if (currentUser && currentUser.bonusesEarned < withdrawalAmount) {
        setNoticeModal({ title: 'Недостаточно бонусов', text: 'Недостаточно бонусов на реферальном балансе!', isError: true });
        return;
      }
      if (!payoutDetails.trim()) {
        setNoticeModal({ title: 'Укажите реквизиты', text: 'Пожалуйста, укажите реквизиты для выплаты!', isError: true });
        return;
      }
      // Deduct bonuses
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          bonusesEarned: currentUser.bonusesEarned - withdrawalAmount
        };
        onUpdateUser(updatedUser);
      }
      setNoticeModal({ title: 'Заявка отправлена', text: `Заявка на вывод ${withdrawalAmount} руб. успешно отправлена и будет обработана в течение 24 часов!` });
    } else if (cashOutTab === 'transfer') {
      if (currentUser && currentUser.bonusesEarned < withdrawalAmount) {
        setNoticeModal({ title: 'Недостаточно бонусов', text: 'Недостаточно бонусов на реферальном балансе!', isError: true });
        return;
      }
      // Deduct and add to main balance
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          bonusesEarned: currentUser.bonusesEarned - withdrawalAmount
        };
        onUpdateUser(updatedUser);
      }
      const updatedTariff = {
        ...tariff,
        balance: tariff.balance + withdrawalAmount
      };
      setTariff(updatedTariff);
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        amount: withdrawalAmount,
        type: 'TOPUP',
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        description: `Перевод с реферального баланса`
      };
      const updatedTransactions = [newTx, ...transactions];
      setTransactions(updatedTransactions);
      saveStateToServer({ company, departments, templates, reports, transactions: updatedTransactions, notifications, tariff: updatedTariff, crmCompanies, mockEmployees });
      setNoticeModal({ title: 'Перевод выполнен', text: `Успешно переведено ${withdrawalAmount} руб. на баланс аккаунта!` });
    } else {
      if (!refundReason.trim()) {
        setNoticeModal({ title: 'Укажите причину', text: 'Пожалуйста, укажите причину возврата!', isError: true });
        return;
      }
      setNoticeModal({ title: 'Запрос отправлен', text: `Ваш запрос на возврат средств по причине "${refundReason}" отправлен администрации. Мы свяжемся с вами по почте.` });
    }
    setIsCashOutModalOpen(false);
  };

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    profile: false,
    revisor: false,
    raport: false,
    company: false,
    admin: false
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const rawRole = String(currentUser?.role || 'EMPLOYEE').toUpperCase().trim();
  const normalizedRole = rawRole === 'SUPER_ADMIN' ? UserRole.SUPER_ADMIN
    : rawRole === 'ADMIN' ? UserRole.ADMIN
    : rawRole === 'DIRECTOR' ? UserRole.DIRECTOR
    : rawRole === 'MANAGER' ? UserRole.MANAGER
    : UserRole.EMPLOYEE;

  const isSuperAdmin = normalizedRole === UserRole.SUPER_ADMIN;
  const isAdmin = normalizedRole === UserRole.ADMIN || isSuperAdmin;
  const isDirector = normalizedRole === UserRole.DIRECTOR;
  const isManager = normalizedRole === UserRole.MANAGER;
  const isEmployee = normalizedRole === UserRole.EMPLOYEE;

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const loadUsersFromDb = async () => {
      try {
        const dirId = currentUser?.director_id || (currentUser?.role === 'DIRECTOR' || currentUser?.role === 'SUPER_ADMIN' ? currentUser.id : '');
        const compId = currentUser?.company_id || (dirId ? `com-${dirId}` : '');
        const url = `/api/employees?director_id=${encodeURIComponent(dirId || '')}&company_id=${encodeURIComponent(compId || '')}&user_id=${encodeURIComponent(currentUser?.id || '')}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.employees)) {
            setMockEmployees(data.employees);
          }
        }
      } catch (e) {
        console.error("Failed to load users from DB:", e);
      }
    };

    const loadUserLimits = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`/api/users/${currentUser.id}/limits`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTariff(prev => ({
              ...prev,
              activeEmployeesCount: Number(data.employeesCount || data.activeEmployeesCount || 1),
              expiresAt: data.tariffLimits?.projects?.expiresAt || data.packages?.revisor?.expiresAt || prev.expiresAt,
              balance: Number(currentUser.payment_balance ?? prev.balance ?? 0)
            }));
          }
        }
      } catch (e) {
        console.warn("Failed to load user limits:", e);
      }
    };

    const loadCompanyFromDb = async () => {
      if (!currentUser?.id) return;
      try {
        const compIdParam = currentUser.company_id ? `&company_id=${encodeURIComponent(currentUser.company_id)}` : '';
        const dirIdParam = currentUser.director_id ? `&director_id=${encodeURIComponent(currentUser.director_id)}` : '';
        const res = await fetch(`/api/company/my?user_id=${encodeURIComponent(currentUser.id)}${compIdParam}${dirIdParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.company) {
            const rawWebsites = data.company.websites || data.company.website;
            let parsedWebsites: string[] = [];
            if (Array.isArray(rawWebsites)) {
              parsedWebsites = rawWebsites.map(s => String(s).trim()).filter(Boolean);
            } else if (typeof rawWebsites === 'string' && rawWebsites.trim()) {
              parsedWebsites = rawWebsites.split(',').map(s => s.trim()).filter(Boolean);
            }
            const primaryWebsite = parsedWebsites[0] || (typeof rawWebsites === 'string' ? rawWebsites.trim() : '');

            setCompany(prev => ({
              ...prev,
              id: data.company.id,
              director_id: data.company.director_id,
              name: data.company.name || prev.name,
              productDescription: data.company.products || data.company.product_description || data.company.description || prev.productDescription,
              workSystemDescription: data.company.work_system_description || prev.workSystemDescription,
              website: primaryWebsite || prev.website || '',
              websites: parsedWebsites.length > 0 ? parsedWebsites : (prev.websites || [])
            }));
            if (data.company.name && typeof localStorage !== 'undefined') {
              const prevCompanyName = localStorage.getItem('company_name') || '';
              const nextCompanyName = String(data.company.name);
              localStorage.setItem('company_name', nextCompanyName);
              if (data.company.id) localStorage.setItem('company_id', data.company.id);
              const curStr = localStorage.getItem('rr_user');
              if (curStr) {
                try {
                  const parsed = JSON.parse(curStr);
                  parsed.company = nextCompanyName;
                  if (data.company.id) parsed.company_id = data.company.id;
                  localStorage.setItem('rr_user', JSON.stringify(parsed));
                } catch {}
              }
              if (currentUser && currentUser.company !== nextCompanyName && onUpdateUser) {
                onUpdateUser({ ...currentUser, company: nextCompanyName, company_id: data.company.id || currentUser.company_id });
              }
              if (prevCompanyName !== nextCompanyName) {
                window.dispatchEvent(new CustomEvent('company_updated', { detail: { name: nextCompanyName, companyId: data.company.id, source: 'db_sync' } }));
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load company from DB:", e);
      }
    };

    const loadEmployeesFromDb = async () => {
      if (!currentUser?.id) return;
      const targetDirId = currentUser.director_id || currentUser.id;
      const targetCompanyId = currentUser.company_id || `com-${targetDirId}`;
      try {
        const res = await fetch(`/api/employees?company_id=${encodeURIComponent(targetCompanyId)}&director_id=${encodeURIComponent(targetDirId)}&user_id=${encodeURIComponent(currentUser.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.employees)) {
            setMockEmployees(data.employees);
          }
        }
      } catch (e) {
        console.warn("Failed to load employees from DB:", e);
      }
    };

    const loadReportsAndTemplatesFromDb = async () => {
      if (!currentUser?.id) return;
      try {
        const directorId = currentUser.director_id || currentUser.id;
        const companyId = currentUser.company_id || `com-${directorId}`;
        const [tplRes, repRes] = await Promise.all([
          fetch(`/api/report-templates?director_id=${encodeURIComponent(directorId)}&company_id=${encodeURIComponent(companyId)}`),
          fetch(`/api/reports?director_id=${encodeURIComponent(directorId)}&company_id=${encodeURIComponent(companyId)}`)
        ]);
        if (tplRes.ok) {
          const tplData = await tplRes.json();
          if (tplData.success && Array.isArray(tplData.templates)) {
            setTemplates(tplData.templates);
          }
        }
        if (repRes.ok) {
          const repData = await repRes.json();
          if (repData.success && Array.isArray(repData.reports)) {
            setReports(repData.reports);
          }
        }
      } catch (e) {
        console.warn("Failed to load reports or templates from DB:", e);
      }
    };

    const loadDepartmentsFromDb = async () => {
      if (!currentUser?.id) return;
      const targetDirId = currentUser.director_id || currentUser.id;
      const targetCompanyId = currentUser.company_id || `com-${targetDirId}`;
      try {
        const res = await fetch(`/api/departments?company_id=${encodeURIComponent(targetCompanyId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.departments)) {
            setDepartments(data.departments);
          }
        }
      } catch (e) {
        console.warn("Failed to load departments from DB:", e);
      }
    };

    const loadState = async () => {
      await loadUsersFromDb();
      await loadCompanyFromDb();
      await loadEmployeesFromDb();
      await loadUserLimits();
      await loadDepartmentsFromDb();
      await loadNotificationsFromDb();
      await loadReportsAndTemplatesFromDb();
      await loadTransactionsFromDb();
    };

    const loadTransactionsFromDb = async () => {
      try {
        const uId = currentUser?.id || '91827364501';
        const res = await fetch(`/api/transactions?userId=${encodeURIComponent(uId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.transactions)) {
            const mapped: Transaction[] = data.transactions.map((t: any) => ({
              id: t.id,
              amount: Number(t.amount_rr ?? t.amount ?? 0),
              amount_rub: Number(t.amount_rub ?? t.amount ?? 0),
              amount_rr: Number(t.amount_rr ?? t.amount ?? 0),
              type: (Number(t.amount_rr ?? t.amount ?? 0) >= 0) ? 'TOPUP' : 'SPENT',
              date: t.timestamp ? new Date(Number(t.timestamp)).toISOString().replace('T', ' ').substring(0, 16) : (t.created_at ? t.created_at.substring(0, 16) : '—'),
              description: t.description || 'Финансовая операция'
            }));
            setTransactions(mapped);

            const calculatedBal = mapped.reduce((sum, item) => sum + (Number(item.amount_rr ?? item.amount ?? 0)), 0);
            const verifiedBal = Math.max(0, calculatedBal);
            setTariff(prev => ({ ...prev, balance: verifiedBal }));
            if (currentUser && Number(currentUser.payment_balance) !== verifiedBal) {
              currentUser.payment_balance = verifiedBal;
              if (onUpdateUser) {
                onUpdateUser({ ...currentUser, payment_balance: verifiedBal });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load transactions from DB:", e);
      }
    };

    const loadNotificationsFromDb = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`/api/notifications?userId=${encodeURIComponent(currentUser.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          } else if (Array.isArray(data)) {
            setNotifications(data);
          }
        }
      } catch (e) {
        console.warn("Failed to load notifications from DB:", e);
      }
    };

    loadState();

    let companySyncCooldown = 0;
    const handleCompanyUpdate = (e: any) => {
      const newName = e.detail?.name || e.detail?.companyName;
      if (newName) {
        setCompany(prev => (prev.name === newName ? prev : { ...prev, name: newName }));
      }
      if (e?.detail?.source === 'db_sync') {
        return;
      }
      const now = Date.now();
      if (now - companySyncCooldown < 2500) return;
      companySyncCooldown = now;
      loadCompanyFromDb();
      loadDepartmentsFromDb();
      loadEmployeesFromDb();
    };

    let deptSyncCooldown = 0;
    const handleDepartmentsUpdate = () => {
      const now = Date.now();
      if (now - deptSyncCooldown < 2000) return;
      deptSyncCooldown = now;
      loadDepartmentsFromDb();
      loadEmployeesFromDb();
    };

    let empSyncCooldown = 0;
    const handleEmployeesUpdate = () => {
      const now = Date.now();
      if (now - empSyncCooldown < 2000) return;
      empSyncCooldown = now;
      loadEmployeesFromDb();
      loadDepartmentsFromDb();
    };

    let txSyncCooldown = 0;
    const handleTransactionsUpdate = () => {
      const now = Date.now();
      if (now - txSyncCooldown < 2000) return;
      txSyncCooldown = now;
      loadTransactionsFromDb();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'company_name' && e.newValue) {
        setCompany(prev => (prev.name === e.newValue ? prev : { ...prev, name: e.newValue }));
      }
    };

    window.addEventListener('company_updated', handleCompanyUpdate);
    window.addEventListener('db-company-updated', handleCompanyUpdate);
    window.addEventListener('db-departments-updated', handleDepartmentsUpdate);
    window.addEventListener('db-employees-updated', handleEmployeesUpdate);
    window.addEventListener('db-reports-updated', loadReportsAndTemplatesFromDb);
    window.addEventListener('db-notifications-updated', loadNotificationsFromDb);
    window.addEventListener('db-transactions-updated', handleTransactionsUpdate);
    window.addEventListener('db-updated', handleTransactionsUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('company_updated', handleCompanyUpdate);
      window.removeEventListener('db-company-updated', handleCompanyUpdate);
      window.removeEventListener('db-departments-updated', handleDepartmentsUpdate);
      window.removeEventListener('db-employees-updated', handleEmployeesUpdate);
      window.removeEventListener('db-reports-updated', loadReportsAndTemplatesFromDb);
      window.removeEventListener('db-notifications-updated', loadNotificationsFromDb);
      window.removeEventListener('db-transactions-updated', handleTransactionsUpdate);
      window.removeEventListener('db-updated', handleTransactionsUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser?.id]);

  const saveStateToServer = async (updatedState: any) => {
    const storageKey = currentUser?.id ? `revisor_cabinet_state_${currentUser.id}` : 'revisor_cabinet_state';
    localStorage.setItem(storageKey, JSON.stringify(updatedState));
    try {
      await fetch('/api/state/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedState, userId: currentUser?.id })
      });

      // Sync CRM companies to PostgreSQL BD ProTalk database
      if (updatedState.crmCompanies && Array.isArray(updatedState.crmCompanies)) {
        for (const comp of updatedState.crmCompanies) {
          fetch('/api/crm/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(comp)
          }).catch(err => console.error('Error syncing CRM company:', err));
        }
      }

      // Sync Reports to PostgreSQL BD ProTalk database (silent sync: never re-trigger Telegram/Motivation DMs)
      if (updatedState.reports && Array.isArray(updatedState.reports)) {
        for (const rep of updatedState.reports) {
          fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...rep, skipTelegram: true, skipMotivation: true, isSync: true })
          }).catch(err => console.error('Error syncing Report:', err));
        }
      }
    } catch (e) {
      console.error("Failed to save state to server", e);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    saveStateToServer({ company, departments, templates, reports, transactions, notifications: updated, tariff, crmCompanies, mockEmployees });
  };

  const handleTabClick = (tabId: string) => {
    // If cascade report verification is running, send it to background so it continues without interruption
    const cascadeState = useCascadeCheckStore.getState();
    if (cascadeState.cascadeOverallStatus === 'running') {
      cascadeState.sendToBackground();
    }

    if (tabId.startsWith('/')) {
      const resolvedTab = getTabFromPath(tabId);
      setActiveTab(resolvedTab);
      syncCategoryForTab(resolvedTab);
      if (onNavigate && tabId !== currentPath) {
        onNavigate(tabId);
      }
      return;
    }

    if (tabId === 'system_admin' || tabId === 'system-admin' || tabId === 'admin_db') {
      if (onNavigate) {
        onNavigate('/system-admin');
      }
      return;
    }
    setActiveTab(tabId);
    syncCategoryForTab(tabId);
    const targetPath = tabToPathMap[tabId] || '/cabinet/profile';
    if (onNavigate && targetPath !== currentPath) {
      onNavigate(targetPath);
    }
  };

  const role = normalizedRole;
  const isDirectorOnly = isSuperAdmin || role === UserRole.DIRECTOR || role === UserRole.ADMIN || String(currentUser?.role).toUpperCase() === 'DIRECTOR' || String(currentUser?.role).toUpperCase() === 'SUPER_ADMIN' || String(currentUser?.role).toUpperCase() === 'ADMIN';
  const hasAccess = (itemRoles: UserRole[]) => isSuperAdmin || itemRoles.some(r => r.toUpperCase() === role.toUpperCase());

  const profileTabsFiltered = [
    { id: 'profile_info', name: 'Мой Профиль', desc: 'Личные данные и Telegram', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'profile_notifications', name: 'Напоминания & Уведомления', desc: 'Авто-уведомления и пинги ИИ', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] },
    // Реферальная система, Системные промпты и Тарифы строго доступны только Директорам компании
    { id: 'profile_referral', name: 'Реферальная Система', desc: 'Приглашайте и зарабатывайте', roles: [UserRole.ADMIN, UserRole.DIRECTOR] },
    { id: 'profile_prompts', name: 'Системные Промпты ИИ', desc: 'Кастомизация ИИ ассистентов', roles: [UserRole.ADMIN, UserRole.DIRECTOR] },
    { id: 'profile_tariff', name: 'Тарифы & Оплата', desc: 'Управление балансом аккаунта', roles: [UserRole.ADMIN, UserRole.DIRECTOR] }
  ].filter(item => hasAccess(item.roles) && (['profile_info', 'profile_notifications'].includes(item.id) || isDirectorOnly));

  const revisorTabsFiltered = [
    { id: 'revisor_projects_map', name: '🪐 Проекты', desc: 'Интерактивная карта и орбиты проектов', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'revisor_review', name: '🛡️ Проверка задач', desc: 'Ручная и ИИ проверка выполнения задач сотрудниками', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER] },
    { id: 'revisor_doctor', name: '🩺 ИИ Ревизор - Доктор проектов', desc: 'Диагностика, аналитика и здоровье проектов', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER] },
    { id: 'revisor_integrations', name: '⚙️ Правила задач', desc: 'Маршрутизация и правила уведомлений задач', roles: [UserRole.ADMIN, UserRole.DIRECTOR] }
  ].filter(item => hasAccess(item.roles));

  const raportTabsFiltered = [
    { id: 'fill_report', name: 'Сдать Рапорт', desc: 'Заполнение периодической отчетности', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'raport_review', name: 'Проверка Отчетов', desc: 'Ручная и ИИ проверка рапортов сотрудников', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER] },
    { id: 'raport_calendar', name: 'Календарь Сдач', desc: 'Календарь и история сдач', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'raport_analytics', name: 'Аналитика Рапортов', desc: 'Сводки, тренды и скоркарды сотрудников', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER] },
    { id: 'raport_motivation', name: 'Мотивация и KPI', desc: 'Калькулятор оклада, грейдов и прогресс плана', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'raport_integrations', name: 'Интеграция Телеграм', desc: 'Публикация отчетов и маршрутизация', roles: [UserRole.ADMIN, UserRole.DIRECTOR] }
  ].filter(item => hasAccess(item.roles));

  const companyTabsFiltered = [
    { id: 'comms', name: 'Чаты и Созвоны', desc: 'Мессенджер команды и видеовстречи', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'departments', name: 'Карта Компании', desc: 'Карта компании и отделов', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER] },
    { id: 'employees', name: 'Сотрудники', desc: 'Управление командой и приглашения', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER] },
    { id: 'employee_schedule', name: 'Графики Работы', desc: 'Управление сменами и календарем', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.EMPLOYEE] }
  ].filter(item => hasAccess(item.roles));

  const adminTabsFiltered = [
    { id: 'admin_crm', name: '📈 CRM Панель Админа', desc: 'Управление клиентами и балансом', roles: [UserRole.ADMIN] },
    { id: 'admin_posts', name: '📝 Редактор постов блога', desc: 'Управление новостями лендинга', roles: [UserRole.ADMIN] }
  ].filter(item => hasAccess(item.roles));

  const categoriesList = [
    {
      id: 'profile',
      name: isEmployee ? 'Профиль' : 'Профиль & Баланс',
      desc: isEmployee ? 'Личный профиль сотрудника' : 'Управление профилем компании и балансом',
      icon: <User size={18} className="text-[#F4EE8E]" />,
      tabs: profileTabsFiltered.map(t => ({ ...t, target: t.id === 'profile_info' ? 'profile' : t.id === 'profile_prompts' ? 'settings' : t.id === 'profile_tariff' ? 'tariff' : t.id })),
      visible: profileTabsFiltered.length > 0
    },
    {
      id: 'company',
      name: 'Компания',
      desc: 'Структура отделов, должностей и сотрудники',
      icon: <Building size={18} className="text-[#E7C768]" />,
      tabs: companyTabsFiltered.map(t => ({ ...t, target: t.id })),
      visible: companyTabsFiltered.length > 0
    },
    {
      id: 'revisor',
      name: 'ИИ Ревизор',
      desc: 'Стандарты, проекты и ИИ-проверка регламентов работы',
      icon: <Shield size={18} className="text-[#E7C768]" />,
      tabs: revisorTabsFiltered.map(t => ({ ...t, target: t.id })),
      visible: revisorTabsFiltered.length > 0
    },
    {
      id: 'raport',
      name: 'ИИ Рапорт',
      desc: 'Конструктор отчетов, заполнение и аналитика KPI',
      icon: <FileText size={18} className="text-amber-400" />,
      tabs: raportTabsFiltered.map(t => ({ ...t, target: t.id })),
      visible: raportTabsFiltered.length > 0
    },

    {
      id: 'admin',
      name: 'Администрирование',
      desc: 'Управление системой, PostgreSQL БД, CRM и новости',
      icon: <Database size={18} className="text-rose-400" />,
      tabs: [
        { id: 'admin_db', name: '⚡ Системное Администрирование', desc: 'Управление PostgreSQL BD ProTalk, бэкапы и миграции', target: 'system_admin' },
        { id: 'admin_crm', name: '📈 CRM Панель Админа', desc: 'Управление клиентами и балансом', target: 'crm' },
        { id: 'admin_posts', name: '📝 Редактор постов блога', desc: 'Управление новостями лендинга', target: 'blog_posts' }
      ],
      visible: isAdmin
    }
  ].filter(c => c.visible);

  return (
    <div
      className={`w-full font-sans px-3 sm:px-6 pt-16 pb-28 lg:pt-6 lg:pb-8 min-h-screen relative transition-colors duration-300 ${theme === 'dark' ? 'theme-dark text-white bg-[#140A01]' : 'theme-light text-amber-950 bg-[#FFFBF5]'}`}
      style={{ paddingBottom: 'max(7rem, calc(5.5rem + env(safe-area-inset-bottom)))' }}
      id="cabinet-root"
    >
      <SatelliteOrbitsBackground theme={theme} />
      
      {/* MOBILE CABINET HEADER */}
      <div 
        className={`fixed top-0 left-0 right-0 h-14 z-40 lg:hidden backdrop-blur-md border-b flex items-center justify-between px-3 sm:px-4 w-full max-w-full overflow-hidden transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-[#140A01]/90 border-amber-500/25 text-white' 
            : 'bg-[#FFFBF5]/90 border-amber-800/25 text-amber-950 shadow-sm'
        }`}
        id="mobile-cabinet-header"
      >
        {/* Animated glowing border effects for mobile header */}
        {theme === 'dark' && (
          <div className="header-glow-container">
            <div className="header-glow-shadow" />
            <div className="header-glow-border" />
          </div>
        )}

        {/* Left Section: Logo only */}
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="flex items-center justify-center relative z-10 cursor-pointer group shrink-0 p-1 rounded-xl"
          title="ИИ Ревизор"
          aria-label="На главную"
        >
          <img 
            src="/file/36/rr-logo.png" 
            alt="RR Logo" 
            className="w-8 h-8 object-contain group-hover:rotate-12 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(231,199,104,0.2)] shrink-0"
          />
        </button>

        {/* Right Section: Theme Toggle, Help, Notifications, Profile, Logout */}
        <div className="flex items-center gap-2 sm:gap-2.5 relative z-10 shrink-0">
          {/* Theme Toggle (Mobile) */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-8 h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              theme === 'dark'
                ? 'border-white/15 text-[#E7C768] hover:bg-zinc-800/60'
                : 'border-amber-800/30 text-amber-950 hover:bg-amber-100/70'
            }`}
            title={theme === 'dark' ? "Включить светлую тему" : "Включить темную тему"}
            id="cabinet-theme-toggle-mobile"
          >
            {theme === 'dark' ? <Sun size={15} className="text-[#E7C768]" /> : <Moon size={15} />}
          </button>

          {/* Academy Help Button (Mobile) */}
          <button
            type="button"
            onClick={() => setIsAcademyHelpOpen(true)}
            className={`w-8 h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              theme === 'dark'
                ? 'border-amber-400/50 text-[#F4EE8E] bg-amber-400/10 hover:bg-amber-400/20 shadow-[0_0_10px_rgba(244,238,142,0.15)]'
                : 'border-amber-800/40 text-amber-950 bg-amber-100 hover:bg-amber-200'
            }`}
            title="Инструкция раздела (Академия)"
            id="cabinet-header-help-mobile"
          >
            <HelpCircle size={15} />
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => {
              handleTabClick('profile_notifications');
              handleMarkAllNotificationsRead();
            }}
            className={`relative w-8 h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              theme === 'dark'
                ? 'border-amber-500/35 text-[#F4EE8E] hover:bg-amber-400/10'
                : 'border-amber-800/35 text-amber-950 hover:bg-amber-100/70'
            }`}
            title="Уведомления"
            id="cabinet-header-bell-mobile"
          >
            <Bell size={15} className={theme === 'dark' ? 'text-[#F4EE8E]' : ''} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold font-mono text-[8px] min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User profile capsule */}
          <button 
            type="button"
            onClick={() => handleTabClick('profile')}
            className={`w-8 h-8 flex items-center justify-center p-0.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              theme === 'dark'
                ? 'bg-transparent border-amber-500/35 text-[#F4EE8E] hover:bg-amber-400/10'
                : 'bg-transparent border-amber-800/35 text-amber-950 hover:bg-amber-100/70'
            }`}
            title="Профиль"
          >
            <div className="w-6 h-6 rounded-full border border-amber-400/70 overflow-hidden bg-transparent flex items-center justify-center relative">
              <img 
                src={currentUser?.photo_url || currentUser?.avatarUrl || (currentUser as any)?.telegram_photo || (currentUser?.username ? `https://t.me/i/userpic/320/${currentUser.username.replace('@','')}.jpg` : getDeterministicMascot(currentUser?.id || currentUser?.name))} 
                alt={currentUser?.name || "Пользователь"} 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = getDeterministicMascot(currentUser?.id || currentUser?.name);
                }}
                className="w-full h-full object-cover [filter:sepia(0.85)_hue-rotate(-12deg)_saturate(2.2)_contrast(1.2)_brightness(0.95)]"
              />
            </div>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={`w-8 h-8 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                theme === 'dark'
                  ? 'border-white/15 text-slate-300 hover:text-red-300 hover:bg-red-500/10'
                  : 'border-amber-800/30 text-amber-950 hover:text-red-700 hover:bg-red-50'
              }`}
              title="Выйти из личного кабинета"
              id="cabinet-header-logout-mobile"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>

      {/* DEVELOPMENT MOCK ROLE SELECTOR BAR IS HIDDEN UNDER THE HEADERS' TEST-PANEL MODAL TRIGGER */}

      {/* DEDICATED CABINET HEADER FOR DESKTOP */}
      <div 
        className={`hidden lg:flex items-center justify-between px-6 h-[72px] backdrop-blur-md border rounded-2xl mb-6 w-full shadow-xl transition-all relative ${
          theme === 'dark' 
            ? 'bg-transparent text-white border-transparent' 
            : 'bg-white border-zinc-200 text-zinc-800 shadow-md'
        }`} 
        id="desktop-cabinet-header"
      >
        {theme === 'dark' && (
          <div className="header-glow-container" style={{ borderRadius: '16px' }}>
            <div className="header-glow-shadow" style={{ borderRadius: '16px' }} />
            <div className="header-glow-border" style={{ borderRadius: '16px' }} />
          </div>
        )}
        <div className="flex items-center gap-4 relative z-10">
          <div 
            onClick={() => onNavigate('/')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <img 
              src="/file/36/rr-logo.png" 
              alt="RR Logo" 
              className="w-8 h-8 object-contain group-hover:rotate-12 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(231,199,104,0.2)]"
            />
            <div>
              <h1 className="text-sm font-extrabold bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] bg-clip-text text-transparent leading-none tracking-wider font-sans">
                ИИ РЕВИЗОР
              </h1>
              <p className="text-[9px] text-slate-400 font-sans mt-0.5 font-semibold">{activeTabName}</p>
            </div>
          </div>
        </div>

        {/* Right Section: Navigation, user status and Logout */}
        <div className="flex items-center gap-4">
          {/* Notifications Bell Hub */}
          <button
            onClick={() => {
              handleTabClick('profile_notifications');
              handleMarkAllNotificationsRead();
            }}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              theme === 'dark'
                ? 'border-amber-500/30 text-[#F4EE8E] hover:text-[#F4EE8E] hover:bg-amber-400/10'
                : 'border-zinc-300 text-zinc-800 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
            title="Уведомления"
            id="cabinet-header-bell-desktop"
          >
            <Bell size={15} className={theme === 'dark' ? 'text-[#F4EE8E]' : ''} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-extrabold font-mono text-[8px] min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              theme === 'dark'
                ? 'border-amber-500/30 text-[#F4EE8E] hover:text-[#F4EE8E] hover:bg-amber-400/10'
                : 'border-zinc-300 text-zinc-800 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
            title={theme === 'dark' ? "Включить светлую тему" : "Включить темную тему"}
            id="cabinet-theme-toggle-desktop"
          >
            {theme === 'dark' ? <Sun size={15} className="text-[#F4EE8E]" /> : <Moon size={15} />}
          </button>

          {/* Onboarding Launch Tour Button (Desktop) */}
          <OnboardingHeaderTrigger userId={currentUser?.id} theme={theme} />

          {/* Academy Help Button (Desktop) */}
          <button
            onClick={() => setIsAcademyHelpOpen(true)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              theme === 'dark'
                ? 'border-amber-400/50 text-[#F4EE8E] bg-amber-400/10 hover:bg-amber-400/20 shadow-[0_0_12px_rgba(244,238,142,0.18)]'
                : 'border-amber-800/40 text-amber-950 bg-amber-100 hover:bg-amber-200 shadow-sm'
            }`}
            title="Инструкция раздела (Академия)"
            id="cabinet-header-help-desktop"
          >
            <HelpCircle size={15} />
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* User profile capsule */}
          <div 
            onClick={() => handleTabClick('profile')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full border border-amber-400/70 overflow-hidden bg-transparent flex items-center justify-center relative shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              <img 
                src={currentUser?.photo_url || currentUser?.avatarUrl || (currentUser as any)?.telegram_photo || (currentUser?.username ? `https://t.me/i/userpic/320/${currentUser.username.replace('@','')}.jpg` : getDeterministicMascot(currentUser?.id || currentUser?.name))} 
                alt={currentUser?.name || "Пользователь"} 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = getDeterministicMascot(currentUser?.id || currentUser?.name);
                }}
                className="w-full h-full object-cover [filter:sepia(0.85)_hue-rotate(-12deg)_saturate(2.2)_contrast(1.2)_brightness(0.95)] group-hover:[filter:none] transition-all duration-300"
              />
            </div>
            <div className="text-left">
              <p className={`text-xs font-bold leading-none ${theme === 'dark' ? 'text-[#F4EE8E]' : 'text-zinc-950'}`}>{currentUser?.name}</p>
              <p className={`text-[9px] mt-1 leading-none font-mono ${theme === 'dark' ? 'text-[#F4EE8E]/80' : 'text-amber-800'}`}>
                {currentUser?.role === UserRole.SUPER_ADMIN ? '⚡ Супер-Админ' : currentUser?.role === UserRole.ADMIN ? 'Глобальный Админ' : currentUser?.role === UserRole.DIRECTOR ? 'Директор' : currentUser?.role === UserRole.MANAGER ? 'Руководитель' : 'Сотрудник'}
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl border border-white/10 text-slate-300 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Выйти из личного кабинета"
              id="cabinet-header-logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-navigation-drawer">
          <div className="fixed inset-0 bg-transparent" onClick={() => setIsMobileMenuOpen(false)} />
          <div className={`fixed inset-y-0 left-0 w-full max-w-[300px] p-5 shadow-2xl border-r flex flex-col justify-between overflow-y-auto transition-all ${
            theme === 'dark' 
              ? 'bg-[#121212] border-zinc-800 text-white' 
              : 'bg-white border-zinc-200 text-zinc-800'
          }`}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <img 
                    src="/file/36/rr-logo.png" 
                    alt="RR Logo" 
                    className="w-7 h-7 object-contain"
                  />
                  <div>
                    <h3 className="text-xs font-extrabold bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] bg-clip-text text-transparent uppercase tracking-wider leading-none">ИИ РЕВИЗОР</h3>
                    <p className="text-[8px] text-slate-400 font-sans mt-0.5 leading-none">{activeTabName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title={theme === 'dark' ? "Включить светлую тему" : "Включить темную тему"}
                  >
                    {theme === 'dark' ? <Sun size={15} className="text-[#E7C768]" /> : <Moon size={15} />}
                  </button>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className={`p-2 border rounded-xl mb-4 text-center sm:text-left flex items-center gap-2.5 transition-all ${
                theme === 'dark'
                  ? 'bg-zinc-900/60 border-white/5'
                  : 'bg-zinc-100 border-zinc-200'
              }`}>
                <div className="w-8 h-8 rounded-full border border-amber-400/70 overflow-hidden bg-transparent flex items-center justify-center relative shrink-0">
                  <img 
                    src={currentUser?.photo_url || currentUser?.avatarUrl || (currentUser as any)?.telegram_photo || (currentUser?.username ? `https://t.me/i/userpic/320/${currentUser.username.replace('@','')}.jpg` : getDeterministicMascot(currentUser?.id || currentUser?.name))} 
                    alt={currentUser?.name || "Пользователь"} 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = getDeterministicMascot(currentUser?.id || currentUser?.name);
                    }}
                    className="w-full h-full object-cover [filter:sepia(0.85)_hue-rotate(-12deg)_saturate(2.2)_contrast(1.2)_brightness(0.95)]"
                  />
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>{currentUser?.name}</p>
                  <p className="text-[8px] text-slate-400 font-mono leading-none mt-1">ID: {currentUser?.id || '88371947'}</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1 text-[11px]">
                
                {/* CATEGORY 5: ПРОФИЛЬ & БАЛАНС / ПРОФИЛЬ */}
                {profileTabsFiltered.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection('profile')}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider text-purple-300 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/30 transition-all border border-white/5 mt-1"
                    >
                      <span className="flex items-center gap-2">
                        <User size={14} className="text-purple-400" />
                        <span>{isEmployee ? 'Профиль' : 'Профиль & Баланс'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-purple-500/20 text-purple-300 rounded font-mono">{profileTabsFiltered.length}</span>
                        {collapsedSections.profile ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </button>

                    {!collapsedSections.profile && (
                      <div className="pl-1.5 mt-1 space-y-0.5 border-l border-white/10 ml-2 animate-fade-in">
                        {profileTabsFiltered.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              let target = item.id;
                              if (item.id === 'profile_info') target = 'profile';
                              if (item.id === 'profile_prompts') target = 'settings';
                              if (item.id === 'profile_tariff') target = 'tariff';
                              handleTabClick(target);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer font-semibold ${
                              activeTab === item.id || (item.id === 'profile_info' && activeTab === 'profile') || (item.id === 'profile_prompts' && activeTab === 'settings') || (item.id === 'profile_tariff' && activeTab === 'tariff')
                                ? 'bg-[#1A1A1A] text-[#F4EE8E]' : 'text-slate-300'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* CATEGORY 1: ИИ РЕВИЗОР */}
                {revisorTabsFiltered.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection('revisor')}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider text-[#F4EE8E] bg-[#1A1A1A]/30 hover:bg-[#1A1A1A]/50 transition-all border border-white/5"
                    >
                      <span className="flex items-center gap-2">
                        <Shield size={14} className="text-[#E7C768]" />
                        <span>ИИ Ревизор</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-[#D99E41]/30 text-[#F4EE8E] rounded font-mono">{revisorTabsFiltered.length}</span>
                        {collapsedSections.revisor ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </button>
                    
                    {!collapsedSections.revisor && (
                      <div className="pl-1.5 mt-1 space-y-0.5 border-l border-white/10 ml-2 animate-fade-in">
                        {revisorTabsFiltered.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { handleTabClick(item.id); setIsMobileMenuOpen(false); }}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer font-semibold ${
                              activeTab === item.id ? 'bg-[#1A1A1A] text-[#F4EE8E]' : 'text-slate-300 hover:bg-[#1A1A1A]/30'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* CATEGORY 2: ИИ РАПОРТ */}
                {raportTabsFiltered.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection('raport')}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider text-sky-300 bg-[#1A1A1A]/20 hover:bg-[#1A1A1A]/40 transition-all border border-white/5 mt-1"
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={14} className="text-sky-400" />
                        <span>ИИ Рапорт</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-sky-500/20 text-sky-300 rounded font-mono">{raportTabsFiltered.length}</span>
                        {collapsedSections.raport ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </button>

                    {!collapsedSections.raport && (
                      <div className="pl-1.5 mt-1 space-y-0.5 border-l border-white/10 ml-2 animate-fade-in">
                        {raportTabsFiltered.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { 
                              if (item.id === 'raport_notifications') handleMarkAllNotificationsRead();
                              handleTabClick(item.id); 
                              setIsMobileMenuOpen(false); 
                            }}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer font-semibold ${
                              activeTab === item.id ? 'bg-[#1A1A1A] text-[#F4EE8E]' : 'text-slate-300'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* CATEGORY 3: КОМПАНИЯ */}
                {companyTabsFiltered.length > 0 && (
                  <>
                    <button
                      onClick={() => toggleSection('company')}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider text-emerald-300 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/30 transition-all border border-white/5 mt-1"
                    >
                      <span className="flex items-center gap-2">
                        <Building size={14} className="text-emerald-400" />
                        <span>Компания</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-emerald-500/20 text-emerald-300 rounded font-mono">{companyTabsFiltered.length}</span>
                        {collapsedSections.company ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </button>

                    {!collapsedSections.company && (
                      <div className="pl-1.5 mt-1 space-y-0.5 border-l border-white/10 ml-2 animate-fade-in">
                        {companyTabsFiltered.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { handleTabClick(item.id); setIsMobileMenuOpen(false); }}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer font-semibold ${
                              activeTab === item.id ? 'bg-[#1A1A1A] text-[#F4EE8E]' : 'text-slate-300'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}



                {/* CATEGORY 6: АДМИНИСТРИРОВАНИЕ */}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => toggleSection('admin')}
                      className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider text-red-300 bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/30 transition-all border border-white/5 mt-1"
                    >
                      <span className="flex items-center gap-2">
                        <Shield size={14} className="text-red-400" />
                        <span>Администрирование</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-[8px] px-1 bg-red-500/20 text-red-300 rounded font-mono">2</span>
                        {collapsedSections.admin ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </button>

                    {!collapsedSections.admin && (
                      <div className="pl-1.5 mt-1 space-y-0.5 border-l border-white/10 ml-2 animate-fade-in">
                        {[
                          { id: 'admin_crm', name: 'CRM Панель Админа' },
                          { id: 'admin_posts', name: 'Редактор постов блога' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              let target = item.id;
                              if (item.id === 'admin_crm') target = 'crm';
                              if (item.id === 'admin_posts') target = 'blog_posts';
                              handleTabClick(target);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer font-semibold ${
                              activeTab === item.id || (item.id === 'admin_crm' && activeTab === 'crm') || (item.id === 'admin_posts' && activeTab === 'blog_posts')
                                ? 'bg-[#1A1A1A] text-[#F4EE8E]' : 'text-slate-300'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

              </nav>
            </div>
            
            <div className="pt-4 border-t border-white/5 text-center text-[10px] text-slate-500 font-mono">
              ИИ Рапорт © 2026
            </div>
          </div>
        </div>
      )}

      <div className="w-full grid grid-cols-1 gap-6 lg:flex lg:gap-2.5 items-start pb-20 lg:pb-0" id="cabinet-layout-grid">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className={`hidden lg:block shrink-0 ${isSidebarCollapsed ? (selectedCategoryCollapsed ? 'lg:w-[110px]' : 'lg:w-[60px]') : 'lg:w-[240px]'} transition-all duration-300 rounded-2xl p-2 space-y-4 max-h-[1000px] ${isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'} scrollbar-none bg-transparent border-0 shadow-none`} id="cabinet-sidebar">
          
          <div className={`flex justify-between items-center px-2 py-1 border-b ${
            theme === 'dark' ? 'border-white/5' : 'border-zinc-200'
          }`}>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5 animate-fade-in">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-extrabold overflow-hidden shadow-inner transition-colors ${
                  theme === 'dark' ? 'bg-zinc-800 border-[#E7C768] text-[#F4EE8E]' : 'bg-amber-100 border-amber-300 text-amber-950'
                }`}>
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className={`text-xs font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>{currentUser?.name || 'Пользователь'}</h4>
                  <p className={`text-[9px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'}`}>ID: {currentUser?.id || '88371947'}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer shadow-sm ${
                isSidebarCollapsed ? 'mx-auto' : ''
              } ${
                theme === 'dark'
                  ? 'border-white/10 hover:bg-white/5 text-slate-300 hover:text-white'
                  : 'border-zinc-300 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950'
              }`}
              title={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
            >
              {isSidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
            </button>
          </div>

          {isSidebarCollapsed ? (
            <div className="flex gap-2.5 items-start pt-2 animate-fade-in" id="collapsed-sidebar-columns">
              {/* Column 1: Main Category Headers */}
              <div className={`flex flex-col gap-3 items-center border-r pr-2 ${theme === 'dark' ? 'border-white/5' : 'border-zinc-200'}`} id="collapsed-categories-col">
                {categoriesList.map((cat) => {
                  const isCatActive = selectedCategoryCollapsed === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategoryCollapsed(selectedCategoryCollapsed === cat.id ? null : cat.id);
                        if (cat.tabs[0]) {
                          handleTabClick(cat.tabs[0].target);
                        }
                      }}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer border relative group/cat ${
                        isCatActive 
                          ? (theme === 'dark'
                              ? 'bg-transparent text-[#F4EE8E] border-[#E7C768] shadow-[0_0_12px_rgba(231,199,104,0.35)]' 
                              : 'bg-amber-100 text-amber-950 border-amber-300 shadow-[0_2px_8px_rgba(180,110,40,0.2)]')
                          : (theme === 'dark'
                              ? 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                              : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-900 hover:bg-zinc-100')
                      }`}
                    >
                      {cat.icon}
                      
                      {/* Category Label Tooltip */}
                      <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-zinc-950/95 border border-[#E7C768]/30 text-white p-3 rounded-xl opacity-0 pointer-events-none group-hover/cat:opacity-100 transition-all duration-200 z-[100] w-64 shadow-2xl backdrop-blur-md text-left">
                        <div className="text-[14px] font-extrabold text-[#E7C768] tracking-wide leading-tight font-sans">
                          {cat.name}
                        </div>
                        <div className="text-[12px] text-slate-300 mt-1 leading-relaxed font-sans font-normal whitespace-normal break-words">
                          {cat.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Column 2: Sub-tabs of selected category */}
              {selectedCategoryCollapsed && (
                <div className="flex flex-col gap-2 items-center pl-0.5 animate-slide-left" id="collapsed-subtabs-col">
                  {(categoriesList.find(c => c.id === selectedCategoryCollapsed)?.tabs || []).map((item) => {
                    const isActive = activeTab === item.id || activeTab === item.target;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'raport_notifications') handleMarkAllNotificationsRead();
                          handleTabClick(item.target);
                        }}
                        className={`relative group/btn w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer border ${
                          isActive 
                            ? (theme === 'dark'
                                ? 'bg-amber-500/10 text-[#F4EE8E] border-[#E7C768] shadow-[0_0_10px_rgba(231,199,104,0.25)] font-black'
                                : 'bg-[#E7C768]/20 text-amber-950 border-[#E7C768] shadow-[0_2px_8px_rgba(180,110,40,0.15)] font-black')
                            : (theme === 'dark'
                                ? 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                                : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-900 hover:bg-zinc-100')
                        }`}
                      >
                        {getTabIcon(item.id)}

                        {/* Custom Tooltip on hover - Name 14px, Description 12px */}
                        <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-zinc-950/95 border border-white/10 text-white p-3 rounded-xl opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-all duration-200 z-50 w-64 shadow-2xl backdrop-blur-md text-left">
                          <div className="text-[14px] font-extrabold text-[#E7C768] tracking-wide leading-tight font-sans">
                            {item.name}
                          </div>
                          <div className="text-[12px] text-slate-300 mt-1 leading-relaxed font-sans font-normal whitespace-normal break-words">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <nav className="flex flex-col gap-1.5 text-[11px] animate-fade-in">
              
              {/* CATEGORY 1: ПРОФИЛЬ & БАЛАНС / ПРОФИЛЬ */}
              {profileTabsFiltered.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      toggleSection('profile');
                      if (profileTabsFiltered[0]) {
                        const target = profileTabsFiltered[0].id === 'profile_info' ? 'profile' : profileTabsFiltered[0].id === 'profile_prompts' ? 'settings' : profileTabsFiltered[0].id === 'profile_tariff' ? 'tariff' : profileTabsFiltered[0].id;
                        handleTabClick(target);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider transition-all border mt-1 ${
                      theme === 'dark'
                        ? 'text-purple-300 border-white/5 bg-transparent hover:bg-white/5'
                        : 'text-purple-800 border-purple-200/40 bg-purple-50/20 hover:bg-purple-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <User size={13} className={theme === 'dark' ? 'text-purple-400' : 'text-purple-700'} />
                      <span>{isEmployee ? 'Профиль' : 'Профиль & Баланс'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 rounded font-mono ${
                        theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-800'
                      }`}>{profileTabsFiltered.length}</span>
                      {collapsedSections.profile ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    </span>
                  </button>

                  {!collapsedSections.profile && (
                    <div className={`pl-2 mt-1 space-y-0.5 border-l ml-2.5 animate-fade-in ${
                      theme === 'dark' ? 'border-white/10' : 'border-zinc-200'
                    }`}>
                      {profileTabsFiltered.map((item) => {
                        const target = item.id === 'profile_info' ? 'profile' : item.id === 'profile_prompts' ? 'settings' : item.id === 'profile_tariff' ? 'tariff' : item.id;
                        const isActive = activeTab === item.id || activeTab === target;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(target)}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer flex flex-col bg-transparent ${
                              isActive 
                                ? (theme === 'dark'
                                    ? 'text-[#F4EE8E] font-bold border-l-2 border-[#E7C768]' 
                                    : 'text-amber-950 font-black border-l-2 border-[#E7C768] bg-amber-50/40')
                                : (theme === 'dark'
                                    ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
                            }`}
                          >
                            <span className="font-semibold">{item.name}</span>
                            <span className={`text-[8px] font-mono leading-none mt-0.5 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'
                            }`}>{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* CATEGORY 2: КОМПАНИЯ */}
              {companyTabsFiltered.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      toggleSection('company');
                      if (companyTabsFiltered[0]) {
                        handleTabClick(companyTabsFiltered[0].id);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider transition-all border mt-1 ${
                      theme === 'dark'
                        ? 'text-emerald-300 border-white/5 bg-transparent hover:bg-white/5'
                        : 'text-emerald-800 border-emerald-200/40 bg-emerald-50/20 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Building size={13} className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'} />
                      <span>Компания</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 rounded font-mono ${
                        theme === 'dark' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                      }`}>{companyTabsFiltered.length}</span>
                      {collapsedSections.company ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    </span>
                  </button>

                  {!collapsedSections.company && (
                    <div className={`pl-2 mt-1 space-y-0.5 border-l ml-2.5 animate-fade-in ${
                      theme === 'dark' ? 'border-white/10' : 'border-zinc-200'
                    }`}>
                      {companyTabsFiltered.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer flex flex-col bg-transparent ${
                              isActive 
                                ? (theme === 'dark'
                                    ? 'text-[#F4EE8E] font-bold border-l-2 border-[#E7C768]' 
                                    : 'text-amber-950 font-black border-l-2 border-[#E7C768] bg-amber-50/40')
                                : (theme === 'dark'
                                    ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
                            }`}
                          >
                            <span className="font-semibold">{item.name}</span>
                            <span className={`text-[8px] font-mono leading-none mt-0.5 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'
                            }`}>{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* CATEGORY 3: ИИ РЕВИЗОР */}
              {revisorTabsFiltered.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      toggleSection('revisor');
                      if (revisorTabsFiltered[0]) {
                        handleTabClick(revisorTabsFiltered[0].id);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider transition-all border mt-1 ${
                      theme === 'dark'
                        ? 'text-[#F4EE8E] border-white/5 bg-transparent hover:bg-white/5'
                        : 'text-amber-900 border-amber-200/40 bg-amber-50/20 hover:bg-amber-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Shield size={13} className={theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-700'} />
                      <span>ИИ Ревизор</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 rounded font-mono ${
                        theme === 'dark' ? 'bg-[#D99E41]/30 text-[#F4EE8E]' : 'bg-amber-100 text-amber-800'
                      }`}>{revisorTabsFiltered.length}</span>
                      {collapsedSections.revisor ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    </span>
                  </button>
                  
                  {!collapsedSections.revisor && (
                    <div className={`pl-2 mt-1 space-y-0.5 border-l ml-2.5 animate-fade-in ${
                      theme === 'dark' ? 'border-white/10' : 'border-zinc-200'
                    }`}>
                      {revisorTabsFiltered.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer flex flex-col bg-transparent ${
                              isActive 
                                ? (theme === 'dark'
                                    ? 'text-[#F4EE8E] font-bold border-l-2 border-[#E7C768]' 
                                    : 'text-amber-950 font-black border-l-2 border-[#E7C768] bg-amber-50/40')
                                : (theme === 'dark'
                                    ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
                            }`}
                          >
                            <span className="font-semibold">{item.name}</span>
                            <span className={`text-[8px] font-mono leading-none mt-0.5 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'
                            }`}>{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* CATEGORY 4: ИИ РАПОРТ */}
              {raportTabsFiltered.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      toggleSection('raport');
                      if (raportTabsFiltered[0]) {
                        handleTabClick(raportTabsFiltered[0].id);
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider transition-all border mt-1 ${
                      theme === 'dark'
                        ? 'text-sky-300 border-white/5 bg-transparent hover:bg-white/5'
                        : 'text-sky-800 border-sky-200/40 bg-sky-50/20 hover:bg-sky-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={13} className={theme === 'dark' ? 'text-sky-400' : 'text-sky-700'} />
                      <span>ИИ Рапорт</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 rounded font-mono ${
                        theme === 'dark' ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-800'
                      }`}>{raportTabsFiltered.length}</span>
                      {collapsedSections.raport ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    </span>
                  </button>

                  {!collapsedSections.raport && (
                    <div className={`pl-2 mt-1 space-y-0.5 border-l ml-2.5 animate-fade-in ${
                      theme === 'dark' ? 'border-white/10' : 'border-zinc-200'
                    }`}>
                      {raportTabsFiltered.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.id === 'raport_notifications') handleMarkAllNotificationsRead();
                              handleTabClick(item.id);
                            }}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer flex flex-col bg-transparent ${
                              isActive 
                                ? (theme === 'dark'
                                    ? 'text-[#F4EE8E] font-bold border-l-2 border-[#E7C768]' 
                                    : 'text-amber-950 font-black border-l-2 border-[#E7C768] bg-amber-50/40')
                                : (theme === 'dark'
                                    ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
                            }`}
                          >
                            <span className="font-semibold">{item.name}</span>
                            <span className={`text-[8px] font-mono leading-none mt-0.5 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'
                            }`}>{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}



              {/* CATEGORY 6: АДМИНИСТРИРОВАНИЕ */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      toggleSection('admin');
                      handleTabClick('system_admin');
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left font-extrabold uppercase tracking-wider transition-all border mt-1 ${
                      theme === 'dark'
                        ? 'text-red-300 border-white/5 bg-transparent hover:bg-white/5'
                        : 'text-red-800 border-red-200/40 bg-red-50/20 hover:bg-red-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Shield size={13} className={theme === 'dark' ? 'text-red-400' : 'text-red-700'} />
                      <span>Администрирование</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[8px] px-1 rounded font-mono ${
                        theme === 'dark' ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800'
                      }`}>3</span>
                      {collapsedSections.admin ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                    </span>
                  </button>

                  {!collapsedSections.admin && (
                    <div className={`pl-2 mt-1 space-y-0.5 border-l ml-2.5 animate-fade-in ${
                      theme === 'dark' ? 'border-white/10' : 'border-zinc-200'
                    }`}>
                      {[
                        { id: 'admin_db', name: '⚡ PostgreSQL БД, Триггеры & Кроны', desc: 'Управление базами данных и системами', target: 'system_admin' },
                        { id: 'admin_crm', name: '📈 CRM Панель Админа', desc: 'Управление клиентами и балансом', target: 'crm' },
                        { id: 'admin_posts', name: '📝 Редактор постов блога', desc: 'Управление новостями лендинга', target: 'blog_posts' }
                      ].map((item) => {
                        const isActive = activeTab === item.id || activeTab === item.target;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(item.target)}
                            className={`w-full px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer flex flex-col bg-transparent ${
                              isActive 
                                ? (theme === 'dark'
                                    ? 'text-[#F4EE8E] font-bold border-l-2 border-[#E7C768]' 
                                    : 'text-amber-950 font-black border-l-2 border-[#E7C768] bg-amber-50/40')
                                : (theme === 'dark'
                                    ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900')
                            }`}
                          >
                            <span className="font-semibold">{item.name}</span>
                            <span className={`text-[8px] font-mono leading-none mt-0.5 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'
                            }`}>{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

            </nav>
          )}
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 min-w-0 rounded-2xl transition-all duration-300 relative min-h-[500px] bg-transparent border-0 shadow-none p-0" id="cabinet-main-panel">
          <OfflineIndicator theme={theme} />
          {activeTab !== 'comms' && <PWAInstallBanner theme={theme} />}
          
          {/* Glass layout reflection */}
          {activeTab !== 'revisor_tasks' && !activeTab.startsWith('profile') && activeTab !== 'settings' && activeTab !== 'tariff' && activeTab !== 'notifications' && (
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/5 to-transparent rounded-2xl" />
          )}

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full h-full"
          >
              {/* 1. Profile Page (profile, tariff, settings, referral, billing) */}
            <ProfilePage
              activeTab={activeTab}
              currentUser={currentUser}
              onUpdateUser={onUpdateUser}
              telegramHandle={telegramHandle}
              setTelegramHandle={setTelegramHandle}
              userPosition={userPosition}
              setUserPosition={setUserPosition}
              onSaveProfile={handleSaveProfile}
              onNavigate={(tab) => handleTabClick(tab)}
              tariff={tariff}
              setTariff={setTariff}
              topUpSeats={topUpSeats}
              setTopUpSeats={setTopUpSeats}
              handleTopUpTariff={handleTopUpTariff}
              setCashOutTab={setCashOutTab}
              setWithdrawalAmount={setWithdrawalAmount}
              setIsCashOutModalOpen={setIsCashOutModalOpen}
              transactions={transactions}
              company={company}
              departments={departments}
              templates={templates}
              reports={reports}
              notifications={notifications}
              crmCompanies={crmCompanies}
              mockEmployees={mockEmployees}
              promptFastFill={promptFastFill}
              promptFieldsGeneration={promptFieldsGeneration}
              promptManagerFeedback={promptManagerFeedback}
              promptRecs={promptRecs}
              promptSummary={promptSummary}
              setPromptFastFill={setPromptFastFill}
              setPromptFieldsGeneration={setPromptFieldsGeneration}
              setPromptManagerFeedback={setPromptManagerFeedback}
              setPromptRecs={setPromptRecs}
              setPromptSummary={setPromptSummary}
              onSavePrompts={handleSavePrompts}
              saveStateToServer={saveStateToServer}
            />

            {/* 2. Company Page (company, departments, employees) */}
            <CompanyPage
              activeTab={activeTab}
              currentUser={currentUser}
              company={company}
              setCompany={setCompany}
              improveFieldWithAI={improveFieldWithAI}
              departments={departments}
              setDepartments={setDepartments}
              saveStateToServer={saveStateToServer}
              templates={templates}
              reports={reports}
              transactions={transactions}
              notifications={notifications}
              tariff={tariff}
              crmCompanies={crmCompanies}
              mockEmployees={mockEmployees}
              setMockEmployees={setMockEmployees}
              triggerAI={triggerAI}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />

            {/* 3. Raport Page (fill_report, reports_builder, calendar, schedules_builder, analytics) */}
            <RaportPage
              activeTab={activeTab}
              currentUser={currentUser}
              templates={templates}
              reports={reports}
              setReports={setReports}
              notifications={notifications}
              setNotifications={setNotifications}
              departments={departments}
              triggerAI={triggerAI}
              saveStateToServer={saveStateToServer}
              company={company}
              transactions={transactions}
              tariff={tariff}
              crmCompanies={crmCompanies}
              mockEmployees={mockEmployees}
              promptRecs={promptRecs}
              promptFastFill={promptFastFill}
              promptFieldsGeneration={promptFieldsGeneration}
              promptManagerFeedback={promptManagerFeedback}
              promptSummary={promptSummary}
              setTemplates={setTemplates}
              handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onNavigate={onNavigate}
              theme={theme}
              currentPath={currentPath}
            />

             {/* 4. Revisor Page (revisor_*) */}
            <RevisorPage
              activeTab={activeTab}
              currentUser={currentUser}
              mockEmployees={mockEmployees}
              reports={reports}
              setReports={setReports}
              saveStateToServer={saveStateToServer}
              company={company}
              departments={departments}
              templates={templates}
              transactions={transactions}
              notifications={notifications}
              tariff={tariff}
              crmCompanies={crmCompanies}
              theme={theme}
              handleTabClick={handleTabClick}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />



            {/* 6. Admin CRM Page (crm, blog_posts) */}
            <AdminCRMPage
              activeTab={activeTab}
              crmCompanies={crmCompanies}
              setCrmCompanies={setCrmCompanies}
              editingCrmCompany={editingCrmCompany}
              setEditingCrmCompany={setEditingCrmCompany}
              saveStateToServer={saveStateToServer}
              company={company}
              departments={departments}
              templates={templates}
              reports={reports}
              transactions={transactions}
              notifications={notifications}
              tariff={tariff}
              mockEmployees={mockEmployees}
            />

            {/* Corporate Chats & Video Meetings (comms) */}
            {activeTab === 'comms' && currentUser && (
              <CommsWorkspace
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                currentUserRole={currentUser.role}
                currentUserAvatar={currentUser.photo_url || currentUser.avatarUrl}
                companyId={currentUser.company_id || currentUser.director_id || currentUser.id}
                theme={theme}
                initialChatId={initialCommsChatId}
                onStartOrJoinCall={(room) => setActiveVideoRoom(room)}
              />
            )}

            {/* System PostgreSQL BD ProTalk Admin Page (system_admin) */}
            {activeTab === 'system_admin' && (
              <SystemAdminPage currentPath={currentPath || window.location.pathname} onNavigate={onNavigate} />
            )}

          </motion.div>
        </main>
      </div>

      {/* AI PROCESSING OVERLAY DIALOG */}
      <AIOverlay 
        isOpen={isAiActive}
        isLoading={aiLoading}
        error={aiError}
        countdown={aiCountdown}
        mascotType={aiMascot}
        customTitle={aiCustomTitle}
        customPhrase={aiCustomPhrase}
        onClose={() => setIsAiActive(false)}
        onRetry={() => {
          setIsAiActive(false);
        }}
      />

      {/* 👑 CUSTOM INFORMATIONAL REFUND AND CASH-OUT MODAL DIALOG */}
      {isCashOutModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fade-in font-sans pointer-events-auto" id="cashout-modal-overlay">
          <div className="relative w-full max-w-lg border-2 border-amber-400/80 liquid-glass-modal text-white rounded-3xl p-6 sm:p-8 space-y-6" id="cashout-modal-content">
            
            <button 
              onClick={() => setIsCashOutModalOpen(false)}
              className="absolute right-4 top-4 text-amber-300/70 hover:text-amber-200 transition-colors p-1 rounded-lg hover:bg-amber-400/10 cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal title */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F4EE8E] flex items-center gap-2">
                <Landmark size={20} className="text-amber-200 animate-pulse" />
                <span>Заявка на вывод партнерских бонусов</span>
              </h3>
              <p className="text-xs text-slate-300">Официальные расчетные операции по реферальной программе.</p>
            </div>

            {/* ENHANCED INFORMATIONAL HELP WINDOW */}
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-[11px] space-y-2 text-slate-200">
              <p className="font-bold text-[#F4EE8E] flex items-center gap-1.5">
                <Landmark size={12} className="text-[#E7C768]" />
                Справка по расчетным регламентам сервиса:
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-200">
                <li><strong>Минимальная сумма вывода:</strong> от 10 000 ₽.</li>
                <li><strong>Условия вывода:</strong> Вывод средств осуществляется исключительно с оплат партнеров (с их пополнений реальными деньгами).</li>
                <li><strong>Виртуальные бонусы:</strong> Все, что пользователь или партнер получает в качестве внутренней валюты и бонусов (стартовый бонус, реферальные бонусы за привлечение и другие бонусы в RR), НЕ подлежит выводу.</li>
                <li><strong>Покупка RR и Оферта:</strong> Согласно договору оферты, возврат средств за покупку баланса RR не предусмотрен, так как зачисление виртуальной валюты RR на счет является моментальным и полным фактом оказания виртуальной услуги.</li>
                <li><strong>Сроки выплаты:</strong> Перевод на указанные реквизиты производится в течение 24 часов.</li>
              </ul>
            </div>

            <form onSubmit={handleCashOutSubmit} className="space-y-4">
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-xl bg-amber-400/10 border border-amber-400/20 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Доступные бонусы от реальных оплат:</span>
                    <strong className="text-amber-200 font-mono text-sm">{currentUser?.bonusesEarned || 10000} ₽</strong>
                  </div>
                  <p className="text-[10px] text-amber-200/80 leading-relaxed">
                    Вывод средств от 10 000 ₽ и только с реальных оплат партнеров. Внутренние виртуальные бонусы в RR выводу не подлежат.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-amber-300 uppercase tracking-wider mb-1 font-bold">Сумма вывода (₽)</label>
                    <input 
                      type="number"
                      required
                      min="10000"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Платежный шлюз</label>
                    <select 
                      value={payoutMethod}
                      onChange={(e) => setPayoutMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-slate-300 text-xs focus:outline-none"
                    >
                      <option value="card">💳 Банковская карта РФ</option>
                      <option value="qiwi">🥝 QIWI кошелек</option>
                      <option value="crypto">🪙 USDT (TRC-20)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">Номер карты или адрес кошелька *</label>
                  <input 
                    type="text"
                    required
                    placeholder={payoutMethod === 'card' ? '4276 •••• •••• 1234' : payoutMethod === 'qiwi' ? '+7 999 123-45-67' : 'T9yZzZ...'}
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-slate-500 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-black bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 text-xs uppercase tracking-wider hover:brightness-110 active:scale-98 transition-all cursor-pointer font-sans shadow-md border border-amber-300/80"
              >
                Отправить заявку на вывод
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MOBILE VERTICAL SUBMENU DRAWER */}
      {activeMobileCategory && (
        <div 
          className="fixed inset-0 z-[50] lg:hidden pointer-events-auto backdrop-blur-md bg-transparent"
          onClick={() => setActiveMobileCategory(null)}
        >
          <div 
            className={`fixed left-2.5 right-2.5 p-3.5 max-h-[65vh] overflow-y-auto scrollbar-none animate-slide-in-bottom pointer-events-auto rounded-3xl border-2 backdrop-blur-xl ${
              theme === 'dark'
                ? 'bg-[#1A0F02]/90 border-[#E7C768]/60 shadow-[0_0_30px_rgba(244,238,142,0.28)]'
                : 'bg-[#FFFBF5]/95 border-amber-800/40 shadow-2xl'
            }`}
            style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-stretch">
              {(activeMobileCategory === 'revisor' ? revisorTabsFiltered :
                activeMobileCategory === 'raport' ? raportTabsFiltered :
                activeMobileCategory === 'company' ? companyTabsFiltered :
                activeMobileCategory === 'admin' ? [
                  { id: 'system_admin', name: 'База и система' },
                  { id: 'crm', name: 'CRM панель' },
                  { id: 'blog_posts', name: 'Посты блога' }
                ] :
                profileTabsFiltered).map((item) => {
                let target = item.id;
                if (item.id === 'profile_info') target = 'profile';
                if (item.id === 'profile_prompts') target = 'settings';
                if (item.id === 'profile_tariff') target = 'tariff';

                const isActive = activeTab === item.id || 
                                activeTab === target ||
                                (item.id === 'profile_info' && activeTab === 'profile') || 
                                (item.id === 'profile_prompts' && activeTab === 'settings') || 
                                (item.id === 'profile_tariff' && activeTab === 'tariff');

                const cleanName = item.name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').replace(/\s+/g, ' ').trim();

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'raport_notifications' || item.id === 'profile_notifications') handleMarkAllNotificationsRead();
                      handleTabClick(target);
                      setActiveMobileCategory(null);
                    }}
                    className={`min-h-[48px] p-2.5 rounded-2xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 font-bold shadow-md'
                        : theme === 'dark'
                          ? 'bg-transparent border-amber-400/35 text-[#F4EE8E] hover:bg-amber-400/15 font-semibold'
                          : 'bg-transparent border-amber-800/30 text-amber-950 hover:bg-amber-100/70 font-semibold'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-amber-950' : theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-900'}`}>
                      {getTabIcon(item.id)}
                    </span>
                    <span className="text-sm leading-tight break-words min-w-0">
                      {cleanName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVBAR */}
      <div
        className="fixed left-2 right-2 z-40 lg:hidden animate-slide-in-bottom"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        id="mobile-bottom-navbar-container"
      >
        <nav
          className={`w-full backdrop-blur-md border-2 rounded-2xl flex justify-around py-1 px-1 min-h-[58px] items-center transition-all relative overflow-hidden ${
            theme === 'dark'
              ? 'bg-[#140A01]/80 border-amber-400/60 shadow-[0_10px_35px_rgba(244,238,142,0.25)]'
              : 'bg-[#FFFBF5]/90 border-amber-800/45 shadow-lg'
          }`}
          id="mobile-bottom-navbar"
        >
          {/* Golden Glass Top Highlight */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#F4EE8E] to-transparent shadow-[0_0_12px_#f4ee8e]" />
          {[
            { key: 'profile', name: 'Профиль', icon: <User size={16} />, tabs: profileTabsFiltered },
            { key: 'company', name: 'Компания', icon: <Building size={16} />, tabs: companyTabsFiltered },
            { key: 'revisor', name: 'Ревизор', icon: <Shield size={16} />, tabs: revisorTabsFiltered },
            { key: 'raport', name: 'Рапорт', icon: <FileText size={16} />, tabs: raportTabsFiltered },
            ...(isAdmin ? [{ key: 'admin', name: 'Админ', icon: <Database size={16} />, tabs: [{ id: 'system_admin' }, { id: 'crm' }, { id: 'blog_posts' }] }] : [])
          ].filter(section => section.tabs.length > 0).map((sec) => {
            const isSectionActive = activeMobileCategory === sec.key || sec.tabs.some((t: any) => {
              let target = t.id;
              if (t.id === 'profile_info') target = 'profile';
              if (t.id === 'profile_prompts') target = 'settings';
              if (t.id === 'profile_tariff') target = 'tariff';
              return activeTab === target;
            });

            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => {
                  setActiveMobileCategory(activeMobileCategory === sec.key ? null : sec.key);
                }}
                className={`relative z-10 flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition-all cursor-pointer ${
                  isSectionActive 
                    ? (theme === 'dark' ? 'text-[#F4EE8E] font-bold' : 'text-amber-950 font-bold') 
                    : (theme === 'dark' ? 'text-amber-100/75 hover:text-white' : 'text-amber-900/80 hover:text-amber-950')
                }`}
              >
                {isSectionActive && (
                  <motion.div
                    layoutId="liquidActiveMobileTab"
                    className={`absolute inset-0 -z-10 border ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-[#F4EE8E]/15 to-[#D99E41]/5 border-amber-400/40'
                        : 'bg-amber-200/70 border-amber-800/40'
                    }`}
                    style={{ borderRadius: '12px' }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  />
                )}
                {sec.icon}
                <span className="text-sm font-bold leading-none mt-0.5 truncate max-w-full">{sec.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contextual Academy Help Modal */}
      <AcademyHelpModal
        isOpen={isAcademyHelpOpen}
        onClose={() => setIsAcademyHelpOpen(false)}
        initialRoute={activeTab}
        userRole={currentUser?.role}
        theme={theme}
        onNavigateToAcademy={() => onNavigate('/academy')}
      />

      {/* Role-Specific Autonomous AI Copilot */}
      <CabinetCopilot
        currentUser={currentUser}
        activeTab={activeTab}
        onNavigateTab={(tabId) => handleTabClick(tabId)}
        onOpenModal={(modalName, fields) => {
          if (modalName === 'motivation_ai_builder') {
            try {
              sessionStorage.setItem('pending_motivation_ai_payload', JSON.stringify(fields || {}));
            } catch {}
            if (activeTab !== 'raport_motivation') {
              handleTabClick('raport_motivation');
            }
          }
        }}
        theme={theme}
        onOpenAcademyHelp={(routeOrId) => {
          setIsAcademyHelpOpen(true);
        }}
      />

      {/* Interactive Role-Specific Onboarding Wizard */}
      <OnboardingModal
        userId={currentUser?.id}
        theme={theme}
        onNavigateTab={(tabId) => handleTabClick(tabId)}
      />

      {/* Custom Translucent Notice Modal (replaces browser alert) */}
      {noticeModal && typeof document !== 'undefined' && createPortal(
        <div
          className={`fixed inset-0 z-[9997] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ${
            theme === 'dark' ? 'bg-[#140A01]/70' : 'bg-[#FAF6EC]/75'
          }`}
          onClick={() => setNoticeModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 backdrop-blur-xl shadow-2xl ${
              theme === 'dark'
                ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_30px_rgba(244,238,142,0.25)]'
                : 'bg-[#FFFBF5]/90 border-[#B8860B]/50 text-amber-950 shadow-xl'
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                {noticeModal.isError ? (
                  <AlertCircle size={20} className={theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-800'} />
                ) : (
                  <Sparkles size={20} className={theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-800'} />
                )}
                <h3 className="text-base font-bold">{noticeModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setNoticeModal(null)}
                className="p-1 rounded-lg opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm leading-relaxed break-words">
              {noticeModal.text}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setNoticeModal(null)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300/80 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Global Incoming Video Call Banner */}
      {currentUser && (
        <CommsGlobalOverlay
          currentUserId={currentUser.id}
          theme={theme}
          activeRoomId={activeVideoRoom?.roomId || null}
          onAcceptCall={(invite: IncomingCallInvite) => {
            setActiveVideoRoom({
              roomId: invite.roomId,
              title: invite.title,
              chatId: invite.chatId || null
            });
          }}
        />
      )}

      {/* Active Full-Screen Video Call Room */}
      {activeVideoRoom && currentUser && (
        <VideoCallModal
          roomId={activeVideoRoom.roomId}
          roomTitle={activeVideoRoom.title}
          chatId={activeVideoRoom.chatId}
          currentUserId={currentUser.id}
          currentUserName={currentUser.name}
          currentUserAvatar={currentUser.photo_url || currentUser.avatarUrl}
          colleagues={commsColleagues}
          theme={theme}
          onClose={() => {
            setActiveVideoRoom(null);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              if (url.searchParams.has('room')) {
                url.searchParams.delete('room');
                window.history.replaceState({}, '', url.pathname + url.search);
              }
            }
          }}
        />
      )}

    </div>
  );
}

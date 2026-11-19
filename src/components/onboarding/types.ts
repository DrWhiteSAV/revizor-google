export type OnboardingRoleType = 'director' | 'manager' | 'employee';

export type OnboardingStepStatus = 'pending' | 'completed' | 'skipped';

export type OnboardingStepId =
  | 'profile'
  | 'duties'
  | 'telegram'
  | 'company'
  | 'employees'
  | 'schedules'
  | 'schedule'
  | 'reports'
  | 'report_rules'
  | 'projects'
  | 'tasks'
  | 'project_rules'
  | 'tariffs'
  | 'referral'
  | 'test_report'
  | 'test_project'
  | 'test_tasks';

export interface StepDefinition {
  id: OnboardingStepId;
  order: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  cabinetTab: string;
  hasVoiceAi: boolean;
  aiButtonLabel?: string;
  verifyLabel: string;
  voicePlaceholder?: string;
}

export interface AuditedStepState {
  id: OnboardingStepId;
  status: OnboardingStepStatus;
  dbReady: boolean;
  summary: string;
  count?: number;
}

export interface VerificationCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface VerificationResult {
  step_id: string;
  passed: boolean;
  output: string;
  checks: VerificationCheck[];
}

export interface OnboardingPayload {
  user_id: string;
  onboarding_type: OnboardingRoleType;
  role: string;
  current_step_id: OnboardingStepId;
  is_completed: boolean;
  is_minimized: boolean;
  steps_state: Record<string, string>;
  skipped_steps: string[];
  draft_inputs: Record<string, any>;
  test_artifacts: Record<string, any>;
  steps: AuditedStepState[];
  completed_count: number;
  total_count: number;
  context: {
    user: any;
    company: any;
    departments: any[];
    employees: any[];
    scheduleTemplates: any[];
    mySchedule: any;
    reportTemplates: any[];
    reportRules: any[];
    projects: any[];
    tasks: any[];
    taskRules: any[];
    savedChats: any[];
  };
}

export const DIRECTOR_STEPS: StepDefinition[] = [
  {
    id: 'profile',
    order: 1,
    title: 'Профиль руководителя',
    shortTitle: 'Профиль',
    subtitle: 'Укажите ФИО, должность, контакты и часовой пояс для корректных дедлайнов и отчетов.',
    cabinetTab: 'profile',
    hasVoiceAi: false,
    verifyLabel: 'Проверить профиль',
  },
  {
    id: 'duties',
    order: 2,
    title: 'Должностные обязанности',
    shortTitle: 'Обязанности',
    subtitle: 'Надиктуйте или сгенерируйте через нейросеть список ваших управленческих обязанностей.',
    cabinetTab: 'profile',
    hasVoiceAi: true,
    aiButtonLabel: 'Сгенерировать обязанности через ИИ',
    verifyLabel: 'Проверить обязанности',
    voicePlaceholder: 'Надиктуйте голосом или опишите ваши ключевые зоны ответственности...',
  },
  {
    id: 'telegram',
    order: 3,
    title: 'Интеграция Telegram',
    shortTitle: 'Телеграм',
    subtitle: 'Привяжите ваш аккаунт или корпоративный чат для мгновенных отчетов и уведомлений.',
    cabinetTab: 'profile',
    hasVoiceAi: false,
    verifyLabel: 'Проверить и отправить тест в Telegram',
  },
  {
    id: 'company',
    order: 4,
    title: 'Компания с отделами',
    shortTitle: 'Компания',
    subtitle: 'Опишите бизнес голосом или текстом — ИИ сразу сформирует карточку компании и отделы.',
    cabinetTab: 'departments',
    hasVoiceAi: true,
    aiButtonLabel: 'Сформировать компанию и отделы через ИИ',
    verifyLabel: 'Проверить структуру компании',
    voicePlaceholder: 'Расскажите о бизнесе: чем занимается компания, какие продукты и какие отделы нужны...',
  },
  {
    id: 'employees',
    order: 5,
    title: 'Сотрудники и приглашения',
    shortTitle: 'Сотрудники',
    subtitle: 'Скопируйте инвайт-ссылки для руководителей и сотрудников или добавьте карточку вручную.',
    cabinetTab: 'employees',
    hasVoiceAi: false,
    verifyLabel: 'Проверить команду и инвайты',
  },
  {
    id: 'schedules',
    order: 6,
    title: 'Графики работы команды',
    shortTitle: 'Графики',
    subtitle: 'Задайте стандартный рабочий график 5/2, 2/2 или продиктуйте особый режим для нейросети.',
    cabinetTab: 'employee_schedule',
    hasVoiceAi: true,
    aiButtonLabel: 'Распознать и сохранить график через ИИ',
    verifyLabel: 'Проверить и рассчитать смены на неделю',
    voicePlaceholder: 'Например: график 5/2 с 9:00 до 18:00, обед с 13:00 до 14:00...',
  },
  {
    id: 'reports',
    order: 7,
    title: 'Шаблоны отчетов (ИИ Рапорт)',
    shortTitle: 'Отчеты',
    subtitle: 'Опишите, какие показатели команда должна сдавать ежедневно — ИИ соберет поля шаблона.',
    cabinetTab: 'fill_report',
    hasVoiceAi: true,
    aiButtonLabel: 'Создать шаблон отчета через ИИ',
    verifyLabel: 'Проверить шаблон и поля',
    voicePlaceholder: 'Опишите, что сотрудники должны писать в вечернем рапорте...',
  },
  {
    id: 'report_rules',
    order: 8,
    title: 'Правила отчетов и напоминаний',
    shortTitle: 'Правила отчетов',
    subtitle: 'Настройте, куда отправлять сданные рапорты и за сколько минут напоминать о дедлайне.',
    cabinetTab: 'raport_integrations',
    hasVoiceAi: false,
    verifyLabel: 'Проверить правила рапортов',
  },
  {
    id: 'projects',
    order: 9,
    title: 'Проекты компании (ИИ Ревизор)',
    shortTitle: 'Проекты',
    subtitle: 'Надиктуйте идею первого проекта — ИИ оформит паспорт проекта, цели и сроки.',
    cabinetTab: 'revisor_projects_map',
    hasVoiceAi: true,
    aiButtonLabel: 'Создать проект через ИИ',
    verifyLabel: 'Проверить проекты',
    voicePlaceholder: 'Расскажите о проекте, его цели и желаемом результате...',
  },
  {
    id: 'tasks',
    order: 10,
    title: 'Задачи и чек-листы',
    shortTitle: 'Задачи',
    subtitle: 'Разбейте проект на измеримые задачи с чек-листами и дедлайнами одним нажатием.',
    cabinetTab: 'revisor_review',
    hasVoiceAi: true,
    aiButtonLabel: 'Сгенерировать задачи через ИИ',
    verifyLabel: 'Проверить задачи и чек-листы',
    voicePlaceholder: 'Какие конкретные задачи нужно поставить по проекту и с каким приоритетом?',
  },
  {
    id: 'project_rules',
    order: 11,
    title: 'Правила проектов и задач',
    shortTitle: 'Правила проектов',
    subtitle: 'Активируйте уведомления о новых задачах, просрочках и результатах ИИ-проверки.',
    cabinetTab: 'revisor_integrations',
    hasVoiceAi: false,
    verifyLabel: 'Проверить правила задач',
  },
  {
    id: 'tariffs',
    order: 12,
    title: 'Тарифы, триал и лимиты',
    shortTitle: 'Тарифы',
    subtitle: 'Ознакомьтесь с активным 7-дневным триалом, лимитами проектов, задач, отчетов и балансом RR.',
    cabinetTab: 'tariff',
    hasVoiceAi: false,
    verifyLabel: 'Проверить баланс и лимиты',
  },
  {
    id: 'referral',
    order: 13,
    title: 'Партнерская программа',
    shortTitle: 'Партнерка',
    subtitle: 'Получите персональную партнерскую ссылку: +1000 RR за каждого приглашенного директора.',
    cabinetTab: 'profile_referral',
    hasVoiceAi: false,
    verifyLabel: 'Проверить партнерскую ссылку',
  },
];

export const getTeamSteps = (isManager: boolean): StepDefinition[] => [
  {
    id: 'profile',
    order: 1,
    title: 'Личный профиль',
    shortTitle: 'Профиль',
    subtitle: 'Проверьте ваше ФИО, должность, телефон и локальный часовой пояс.',
    cabinetTab: 'profile',
    hasVoiceAi: false,
    verifyLabel: 'Проверить профиль',
  },
  {
    id: 'telegram',
    order: 2,
    title: 'Привязка Telegram',
    shortTitle: 'Телеграм',
    subtitle: 'Подключите бота @ii_rrbot, чтобы получать задачи и сдавать рапорты без опозданий.',
    cabinetTab: 'profile',
    hasVoiceAi: false,
    verifyLabel: 'Отправить тестовое сообщение в Telegram',
  },
  {
    id: 'duties',
    order: 3,
    title: 'Должностные обязанности',
    shortTitle: 'Обязанности',
    subtitle: isManager
      ? 'Надиктуйте или сгенерируйте обязанности руководителя подразделения для точной работы ИИ.'
      : 'Надиктуйте или сгенерируйте ваши рабочие обязанности — ИИ будет учитывать их при проверке.',
    cabinetTab: 'profile',
    hasVoiceAi: true,
    aiButtonLabel: 'Сгенерировать обязанности через ИИ',
    verifyLabel: 'Проверить обязанности',
    voicePlaceholder: 'Опишите или продиктуйте голосом ваши ежедневные рабочие обязанности...',
  },
  {
    id: 'schedule',
    order: 4,
    title: 'Мой рабочий график',
    shortTitle: 'График',
    subtitle: 'Выберите рабочий режим или продиктуйте расписание смен, чтобы напоминания приходили вовремя.',
    cabinetTab: 'employee_schedule',
    hasVoiceAi: true,
    aiButtonLabel: 'Настроить график через ИИ',
    verifyLabel: 'Проверить расписание смен на неделю',
    voicePlaceholder: 'Например: работаю 5/2 с 10:00 до 19:00, обед с 14:00 до 15:00...',
  },
  {
    id: 'test_report',
    order: 5,
    title: 'Тест рапорта с ИИ',
    shortTitle: 'Тест отчета',
    subtitle: isManager
      ? 'Сдайте короткий пробный рапорт руководителя и посмотрите, как ИИ выставляет оценку и рекомендации.'
      : 'Надиктуйте голосом или напишите тестовый рапорт за день — нейросеть сразу проверит его и даст оценку.',
    cabinetTab: 'fill_report',
    hasVoiceAi: true,
    aiButtonLabel: 'Отправить тестовый рапорт в ИИ',
    verifyLabel: 'Проверить результат теста рапорта',
    voicePlaceholder: 'Надиктуйте: сегодня провел 5 переговоров, подготовил документы, планирую закрыть сделку...',
  },
  {
    id: 'test_project',
    order: 6,
    title: 'Тест проекта в ИИ Ревизоре',
    shortTitle: 'Тест проекта',
    subtitle: isManager
      ? 'Разберите текущий или учебный проект с ИИ-наставником с точки зрения контроля подразделения.'
      : 'Изучите структуру проекта или создайте пробный учебный проект с подсказками ИИ.',
    cabinetTab: 'revisor_projects_map',
    hasVoiceAi: true,
    aiButtonLabel: 'Разобрать проект с ИИ',
    verifyLabel: 'Проверить знание проектной среды',
    voicePlaceholder: 'Какой учебный или рабочий проект вы хотите разобрать с ИИ?',
  },
  {
    id: 'test_tasks',
    order: 7,
    title: 'Тест задач и проверки ИИ',
    shortTitle: 'Тест задач',
    subtitle: isManager
      ? 'Проверьте, как ИИ Ревизор оценивает сданный отчет по задаче перед вашим финальным подтверждением.'
      : 'Сдайте результат пробной задачи голосом или текстом и получите моментальный вердикт ИИ Ревизора.',
    cabinetTab: 'revisor_review',
    hasVoiceAi: true,
    aiButtonLabel: 'Сдать тестовую задачу на проверку ИИ',
    verifyLabel: 'Проверить прохождение теста задачи',
    voicePlaceholder: 'Опишите результат выполнения тестовой задачи для проверки ИИ Ревизором...',
  },
];

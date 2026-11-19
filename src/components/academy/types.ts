export interface AcademyPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  target_route: string;
  summary: string;
  content_markdown: string;
  cover_image: string;
  order_index: number;
  is_published: number;
  target_role?: 'all' | 'director' | 'manager' | 'employee';
  created_at?: string;
  updated_at?: string;
}

export const ACADEMY_ROLES = [
  { id: 'all', label: 'Все статьи' },
  { id: 'director', label: 'Для директора' },
  { id: 'manager', label: 'Для руководителя' },
  { id: 'employee', label: 'Для сотрудника' },
];

export const ACADEMY_CATEGORIES = [
  "Все",
  "Организация",
  "Задачи",
  "Рапорты",
  "Расписание",
  "Аналитика",
  "Персонал",
  "Финансы",
  "Настройки",
  "CRM",
  "Коммуникации"
];

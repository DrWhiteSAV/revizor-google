import { ReportFieldType } from '../../types';

export interface FieldTypeOption {
  value: ReportFieldType;
  label: string;
  category: 'text_voice' | 'choice' | 'files' | 'media' | 'special';
  iconName: string;
  aiSupported: boolean;
  aiNotice?: string;
  description: string;
  acceptMime?: string;
}

export const REPORT_FIELD_TYPES: FieldTypeOption[] = [
  // 1. Голос и текст
  {
    value: 'voice',
    label: 'Голосовое / аудиосообщение (ИИ)',
    category: 'text_voice',
    iconName: 'Mic',
    aiSupported: true,
    description: 'Аудиозапись голоса с моментальной транскрипцией нейросетью'
  },
  {
    value: 'text_short',
    label: 'Короткий текст (строка)',
    category: 'text_voice',
    iconName: 'Type',
    aiSupported: true,
    description: 'Однострочное поле для кратких ответов, фамилий или названий'
  },
  {
    value: 'text_paragraph',
    label: 'Развернутый текст / заметка',
    category: 'text_voice',
    iconName: 'FileText',
    aiSupported: true,
    description: 'Многострочное текстовое поле для подробных комментариев'
  },
  {
    value: 'number',
    label: 'Числовой показатель / метрика',
    category: 'text_voice',
    iconName: 'Hash',
    aiSupported: true,
    description: 'Числовое значение: план, факт, выручка, штуки, часы'
  },

  // 2. Варианты выбора
  {
    value: 'multiple_choice',
    label: 'Множественный выбор (чекбоксы)',
    category: 'choice',
    iconName: 'CheckSquare',
    aiSupported: true,
    description: 'Несколько вариантов ответа на выбор сотрудника'
  },
  {
    value: 'single_choice',
    label: 'Одиночный выбор (один из списка)',
    category: 'choice',
    iconName: 'Radio',
    aiSupported: true,
    description: 'Выпадающий список или радиокнопка с одним верным вариантом'
  },
  {
    value: 'checkbox',
    label: 'Чекбокс (да / нет)',
    category: 'choice',
    iconName: 'Check',
    aiSupported: true,
    description: 'Флажок подтверждения выполнения регламента или пункта'
  },

  // 3. Медиа и камера
  {
    value: 'photo',
    label: 'Фотография (из галереи)',
    category: 'media',
    iconName: 'Image',
    aiSupported: true,
    description: 'Загрузка снимка или фотографии из памяти устройства',
    acceptMime: 'image/*'
  },
  {
    value: 'camera_photo',
    label: 'Фото с камеры (в реальном времени)',
    category: 'media',
    iconName: 'Camera',
    aiSupported: true,
    description: 'Мгновенный снимок через камеру смартфона или веб-камеру',
    acceptMime: 'image/*'
  },
  {
    value: 'screenshot',
    label: 'Скриншот экрана',
    category: 'media',
    iconName: 'Monitor',
    aiSupported: true,
    description: 'Скриншот экрана монитора или телефона для подтверждения задачи',
    acceptMime: 'image/*'
  },
  {
    value: 'video',
    label: 'Видеозапись (из галереи)',
    category: 'media',
    iconName: 'Video',
    aiSupported: false,
    aiNotice: 'Нейросеть не анализирует видеоконтент (только фиксация факта наличия видео)',
    description: 'Загрузка видеоролика или видеоотчета из памяти устройства',
    acceptMime: 'video/*'
  },
  {
    value: 'camera_video',
    label: 'Видео с камеры (в реальном времени)',
    category: 'media',
    iconName: 'VideoOff',
    aiSupported: false,
    aiNotice: 'Нейросеть не анализирует видеоконтент (только фиксация факта записи)',
    description: 'Запись короткого видеоролика прямо с камеры устройства',
    acceptMime: 'video/*'
  },

  // 4. Документы и файлы
  {
    value: 'pdf',
    label: 'PDF документ или Google Диск',
    category: 'files',
    iconName: 'FileCheck',
    aiSupported: true,
    aiNotice: 'Распознается ИИ: файлы PDF и ссылки Google Диска с открытым доступом',
    description: 'Файл PDF или ссылка на Google Диск с открытым доступом для чтения',
    acceptMime: '.pdf,application/pdf'
  },
  {
    value: 'table',
    label: 'Таблица (Excel / CSV / Google Sheets)',
    category: 'files',
    iconName: 'Sheet',
    aiSupported: true,
    aiNotice: 'Распознается ИИ: файлы Excel/CSV и таблицы Google Sheets с открытым доступом',
    description: 'Таблица Excel / CSV или ссылка на Google Sheets с доступом для чтения',
    acceptMime: '.xls,.xlsx,.csv'
  },
  {
    value: 'document',
    label: 'Документ (Word / DOCX / Google Docs)',
    category: 'files',
    iconName: 'FileText',
    aiSupported: true,
    aiNotice: 'Распознается ИИ: файлы DOCX/TXT и документы Google Docs с открытым доступом',
    description: 'Документ DOCX / TXT или ссылка на Google Docs с доступом для чтения',
    acceptMime: '.doc,.docx,.txt,.rtf'
  },
  {
    value: 'presentation',
    label: 'Презентация (PowerPoint / Google Slides)',
    category: 'files',
    iconName: 'Presentation',
    aiSupported: true,
    aiNotice: 'Распознается ИИ: презентации PPTX и Google Slides с открытым доступом',
    description: 'Файл PPTX или ссылка на Google Slides с доступом для чтения',
    acceptMime: '.ppt,.pptx,.key'
  },
  {
    value: 'audio',
    label: 'Аудиофайл (MP3 / WAV / M4A)',
    category: 'files',
    iconName: 'Headphones',
    aiSupported: true,
    aiNotice: 'Распознается ИИ: аудиофайлы анализируются голосовой моделью',
    description: 'Запись звонка или загруженный аудиофайл',
    acceptMime: 'audio/*'
  },
  {
    value: 'file',
    label: 'Универсальный файл любого формата',
    category: 'files',
    iconName: 'Paperclip',
    aiSupported: true,
    description: 'Любой прикрепляемый файл к отчету'
  },
  {
    value: 'google_drive',
    label: 'Ссылка на Google Диск / Таблицу / Документ',
    category: 'files',
    iconName: 'ExternalLink',
    aiSupported: true,
    aiNotice: 'Распознается ИИ: файлы, таблицы и документы Google Диска с открытым доступом для чтения',
    description: 'Ссылка на Google Диск, Google Таблицу или Google Документ с открытым доступом'
  },

  // 5. Специальные поля
  {
    value: 'url',
    label: 'Ссылка на веб-ресурс',
    category: 'special',
    iconName: 'Link2',
    aiSupported: false,
    description: 'Прямой URL-адрес интернет-ресурса или веб-сайта (без ИИ анализа)'
  },
  {
    value: 'geolocation',
    label: 'Геопозиция (GPS координаты)',
    category: 'special',
    iconName: 'MapPin',
    aiSupported: true,
    description: 'Точные GPS-координаты сотрудника на момент отправки отчета'
  }
];

export const getFieldTypeMeta = (type: ReportFieldType | string): FieldTypeOption => {
  const match = REPORT_FIELD_TYPES.find(t => t.value === type);
  if (match) return match;
  // Fallbacks for legacy types
  if (type === 'list' || type === 'checkboxes') return REPORT_FIELD_TYPES.find(t => t.value === 'multiple_choice')!;
  if (type === 'select') return REPORT_FIELD_TYPES.find(t => t.value === 'single_choice')!;
  if (type === 'image') return REPORT_FIELD_TYPES.find(t => t.value === 'photo')!;
  if (type === 'text') return REPORT_FIELD_TYPES.find(t => t.value === 'text_paragraph')!;
  return REPORT_FIELD_TYPES[0];
};

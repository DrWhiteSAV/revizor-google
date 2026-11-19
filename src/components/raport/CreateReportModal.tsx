import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Sparkles, Plus, Trash2, Check, ArrowUp, ArrowDown, 
  HelpCircle, Shield, Clock, Users, Building, FileText, 
  Settings, Bot, UserCheck, AlertTriangle, User,
  ListPlus, Info, CheckSquare, CornerDownRight, ChevronDown, History,
  Sun, Moon, CalendarRange, BarChart3, Mic, Type, AlignLeft, Hash, 
  CircleDot, ToggleRight, Image as ImageIcon, Camera, Monitor, Video, 
  FileCheck, Sheet, Presentation, Headphones, Paperclip, Link2, MapPin, 
  Crown, FilePlus, ExternalLink, ArrowRight
} from 'lucide-react';
import { ReportTemplate, ReportField, ReportType, UserProfile, ReportFieldType } from '../../types';
import { MiniAudioField } from '../voice/MiniAudioField';
import { AudioField } from '../voice/AudioField';
import { CustomCheckbox } from './CustomCheckbox';
import { MultiSelectDropdown, DropdownItem } from './MultiSelectDropdown';
import { RaportDropdown, RaportDropdownOption, RaportDropdownGroup } from './RaportDropdown';
import { REPORT_FIELD_TYPES, getFieldTypeMeta } from './ReportFieldTypeConfig';
import { AiLoadingOverlay } from '../common/AiLoadingOverlay';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates?: ReportTemplate[];
  departments?: any[];
  employees?: UserProfile[];
  currentUser?: UserProfile | null;
  editingTemplate?: ReportTemplate | null;
  initialTemplate?: ReportTemplate | null;
  onSaveTemplate: (template: ReportTemplate) => Promise<void> | void;
  triggerAI?: (prompt: string, sys: string, cb: (text: string) => void, mascot?: any) => void;
  isLightTheme: boolean;
  onNavigate?: (path: string) => void;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  templates = [],
  departments: initialDepartments = [],
  employees: initialEmployees = [],
  currentUser = null,
  editingTemplate: propEditingTemplate,
  initialTemplate,
  onSaveTemplate,
  isLightTheme,
  onNavigate
}) => {
  const editingTemplate = propEditingTemplate || initialTemplate || null;

  // Local synced lists from database
  const [dbDepartments, setDbDepartments] = useState<any[]>(initialDepartments || []);
  const [dbEmployees, setDbEmployees] = useState<UserProfile[]>(initialEmployees || []);

  // Sync with props and database on mount and when modal opens
  useEffect(() => {
    const compId = currentUser?.company_id || (currentUser?.id ? `com-${currentUser.id}` : '');
    const deptUrl = compId ? `/api/departments?company_id=${encodeURIComponent(compId)}` : '/api/departments';
    const empUrl = compId ? `/api/employees?company_id=${encodeURIComponent(compId)}` : '/api/employees';

    fetch(deptUrl)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.departments) ? data.departments : []);
        if (list.length > 0) {
          setDbDepartments(list);
        } else if (initialDepartments && initialDepartments.length > 0) {
          setDbDepartments(initialDepartments);
        }
      })
      .catch(e => {
        console.warn('Failed to load departments in modal:', e);
        if (initialDepartments && initialDepartments.length > 0) {
          setDbDepartments(initialDepartments);
        }
      });

    fetch(empUrl)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.employees) ? data.employees : []);
        if (list.length > 0) {
          setDbEmployees(list);
        } else if (initialEmployees && initialEmployees.length > 0) {
          setDbEmployees(initialEmployees);
        }
      })
      .catch(e => {
        console.warn('Failed to load employees in modal:', e);
        if (initialEmployees && initialEmployees.length > 0) {
          setDbEmployees(initialEmployees);
        }
      });
  }, [isOpen, initialDepartments, initialEmployees, currentUser?.company_id, currentUser?.id]);

  // Top Voice & AI Full Report Generator State
  const [voicePromptInput, setVoicePromptInput] = useState<string>('');

  // AI Loading Overlay State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiLoadingTitle, setAiLoadingTitle] = useState<string>('ИИ Ревизор RR обрабатывает запрос');
  const [aiLoadingSubtitle, setAiLoadingSubtitle] = useState<string>('Формирование структуры отчета...');

  // Form states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('PLAN_DAY');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['all']);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(['all']);
  const [fields, setFields] = useState<ReportField[]>([
    { id: 'f1', label: 'Какие ключевые результаты достигнуты за день?', type: 'voice', required: true, hint: 'Укажите конкретные цифры и факты' },
    { id: 'f2', label: 'Какие сложности или блокеры возникли?', type: 'voice', required: false, hint: 'Что мешало выполнению задач' },
    { id: 'f3', label: 'План и приоритеты на следующий рабочий день', type: 'text_paragraph', required: true, hint: 'Минимум 3 конкретные задачи' }
  ]);

  // Reviewer states
  const [checkerType, setCheckerType] = useState<'ai' | 'director' | 'manager'>('ai');
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
  const [selectedReviewerName, setSelectedReviewerName] = useState<string>('');

  // Rules, criteria & AI history depth
  const [checkCriteria, setCheckCriteria] = useState<string>(
    'Оценивать полноту ответов по шкале 1-100. Снижать оценку за размытые формулировки без цифр и фактов. Проанализировать динамику по прошлым отчетам, сформировать мотивирующие рекомендации и пошаговый план действий для сотрудника.'
  );
  const [historyDepthForAi, setHistoryDepthForAi] = useState<number>(3);

  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [reminderText, setReminderText] = useState<string>('Внимание! Напоминаем о необходимости сдать отчет.');
  const [saveAsLibraryTemplate, setSaveAsLibraryTemplate] = useState<boolean>(true);

  const [fieldToDeleteIdx, setFieldToDeleteIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Initialize or reset form when modal opens or editingTemplate changes
  useEffect(() => {
    if (editingTemplate) {
      setTitle(editingTemplate.title || '');
      setDescription(editingTemplate.description || '');
      setReportType(editingTemplate.type || 'PLAN_DAY');
      setSelectedDepartments(
        editingTemplate.target_departments && editingTemplate.target_departments.length > 0 
          ? editingTemplate.target_departments 
          : (editingTemplate.departmentId ? [editingTemplate.departmentId] : ['all'])
      );
      setSelectedEmployees(
        editingTemplate.target_employees && editingTemplate.target_employees.length > 0 
          ? editingTemplate.target_employees 
          : ['all']
      );
      setFields(
        editingTemplate.fields && editingTemplate.fields.length > 0 
          ? editingTemplate.fields 
          : [{ id: 'f1', label: 'Главный вопрос отчета', type: 'voice', required: true }]
      );
      setCheckerType(editingTemplate.checker_type || 'ai');
      setSelectedReviewerId(editingTemplate.reviewer_id || '');
      setSelectedReviewerName(editingTemplate.reviewer_name || '');
      setCheckCriteria(editingTemplate.check_criteria || 'Оценивать полноту ответов по шкале 1-100. Снижать оценку за размытые формулировки без цифр и фактов. Проанализировать динамику по прошлым отчетам, сформировать мотивирующие рекомендации и пошаговый план действий для сотрудника.');
      setHistoryDepthForAi(editingTemplate.history_depth_for_ai ?? 3);
      setReminderMinutes(editingTemplate.reminderMinutes ?? 15);
      setReminderText(editingTemplate.reminderText || 'Внимание! Напоминаем о необходимости сдать отчет.');
      setVoicePromptInput('');
    } else {
      setSelectedTemplateId('');
      setTitle('');
      setDescription('');
      setReportType('PLAN_DAY');
      setSelectedDepartments(['all']);
      setSelectedEmployees(['all']);
      setFields([
        { id: 'f1', label: 'Какие ключевые результаты достигнуты за день?', type: 'voice', required: true, hint: 'Укажите конкретные цифры и факты' },
        { id: 'f2', label: 'Какие сложности или блокеры возникли?', type: 'voice', required: false, hint: 'Что мешало выполнению задач' },
        { id: 'f3', label: 'План и приоритеты на следующий рабочий день', type: 'text_paragraph', required: true, hint: 'Минимум 3 конкретные задачи' }
      ]);
      setCheckerType('ai');
      setSelectedReviewerId('');
      setSelectedReviewerName('');
      setCheckCriteria(
        'Оценивать полноту ответов по шкале 1-100. Снижать оценку за размытые формулировки без цифр и фактов. Проанализировать динамику по прошлым отчетам, сформировать мотивирующие рекомендации и пошаговый план действий для сотрудника.'
      );
      setHistoryDepthForAi(3);
      setReminderMinutes(15);
      setReminderText('Внимание! Напоминаем о необходимости сдать отчет.');
      setVoicePromptInput('');
    }
  }, [editingTemplate, isOpen]);

  // Prepare department items for multi-select with proper hierarchy support
  const departmentDropdownItems: DropdownItem[] = useMemo(() => {
    const allDeptIds = new Set(dbDepartments.map(d => d.id));
    return dbDepartments.map(d => {
      const parentRaw = d.parentId || d.parent_id || null;
      // Only treat as parentId if parent exists in departments list (not company ID)
      const validParentId = (parentRaw && allDeptIds.has(parentRaw)) ? parentRaw : null;
      const isSub = Boolean(validParentId) || d.type === 'subdepartment';
      return {
        id: d.id,
        name: d.name,
        parentId: validParentId,
        subtitle: isSub ? 'Подотдел' : 'Отдел',
        badge: isSub ? 'Подотдел' : 'Отдел'
      };
    });
  }, [dbDepartments]);

  // Context for AI prompt containing full list of departments and sub-departments
  const getDepartmentsPromptContext = () => {
    if (!dbDepartments || dbDepartments.length === 0) {
      return 'Структура отделов: отделы компании не заданы.';
    }
    const allIds = new Set(dbDepartments.map(d => d.id));
    const lines = dbDepartments.map(d => {
      const parentRaw = d.parentId || d.parent_id;
      const parent = (parentRaw && allIds.has(parentRaw)) ? dbDepartments.find(p => p.id === parentRaw) : null;
      return `- ${d.name} [ID: ${d.id}]${parent ? ` (Подотдел в "${parent.name}")` : ' (Главный отдел)'}`;
    });
    const targetNames = selectedDepartments.includes('all')
      ? 'Все отделы и подотделы компании'
      : dbDepartments.filter(d => selectedDepartments.includes(d.id)).map(d => d.name).join(', ') || 'Не выбраны';

    return `Структура отделов и подотделов компании:\n${lines.join('\n')}\nВыбранные целевые отделы для отчета: ${targetNames}`;
  };

  // Context for AI prompt containing full list of employees with positions and departments
  const getEmployeesPromptContext = () => {
    if (!dbEmployees || dbEmployees.length === 0) {
      return 'Сотрудники компании: список сотрудников пуст.';
    }
    const lines = dbEmployees.map(e => {
      const dept = dbDepartments.find(d => d.id === e.department_id || d.id === e.departmentId);
      return `- ${e.name} [ID: ${e.id}] — Должность: ${e.position || 'Сотрудник'}${dept ? `, Отдел/Подотдел: "${dept.name}" [ID: ${dept.id}]` : ''} (Роль: ${e.role || 'EMPLOYEE'})`;
    });
    return `Список сотрудников компании:\n${lines.join('\n')}`;
  };

  // Prepare employee items for multi-select
  const employeeDropdownItems: DropdownItem[] = useMemo(() => {
    return dbEmployees.map(e => ({
      id: e.id,
      name: e.name,
      subtitle: `${e.position || 'Сотрудник'} ${e.department_id ? `• ${e.department_id}` : ''}`,
      avatarUrl: e.photo_url || e.avatarUrl || '/file/27/iirr1.png',
      badge: e.role === 'DIRECTOR' ? 'Директор' : e.role === 'MANAGER' ? 'Руководитель' : undefined
    }));
  }, [dbEmployees]);

  // Eligible reviewers list (managers, directors, or all employees)
  const eligibleReviewers = useMemo(() => {
    const list = dbEmployees.filter(e => e.role === 'DIRECTOR' || e.role === 'MANAGER' || e.role === 'ADMIN');
    return list.length > 0 ? list : dbEmployees;
  }, [dbEmployees]);

  // 1. Template dropdown options with SVG icons and subtitles
  const templateOptions = useMemo<RaportDropdownOption[]>(() => {
    const list: RaportDropdownOption[] = [
      {
        value: '',
        label: 'Не применять шаблон (ручное создание)',
        subtitle: 'Создать регламент отчета с нуля без шаблона',
        icon: <FilePlus size={18} className="text-amber-500" />
      }
    ];

    templates.forEach(tpl => {
      let icon = <FileText size={18} className="text-amber-500" />;
      let badge = 'Отчет';
      if (tpl.type === 'PLAN_DAY') {
        icon = <Sun size={18} className="text-amber-500" />;
        badge = 'План';
      } else if (tpl.type === 'FACT_DAY') {
        icon = <Moon size={18} className="text-amber-500" />;
        badge = 'Факт';
      } else if (tpl.type === 'WEEKLY') {
        icon = <CalendarRange size={18} className="text-amber-500" />;
        badge = 'Недельный';
      } else if (tpl.type === 'MONTHLY') {
        icon = <BarChart3 size={18} className="text-amber-500" />;
        badge = 'Месячный';
      }

      list.push({
        value: tpl.id,
        label: tpl.title,
        subtitle: `${tpl.fields?.length || 0} вопросов · ${tpl.description ? tpl.description.slice(0, 45) + '...' : 'Готовый регламент компании'}`,
        badge,
        icon
      });
    });

    return list;
  }, [templates]);

  // 2. Report type options with SVG icons and subtitles
  const reportTypeOptions = useMemo<RaportDropdownOption<ReportType>[]>(() => [
    {
      value: 'PLAN_DAY',
      label: 'План на день (утренний)',
      subtitle: 'Утренний план задач и контрольных точек смены',
      icon: <Sun size={18} className="text-amber-500" />,
      badge: 'Утро'
    },
    {
      value: 'FACT_DAY',
      label: 'Факт за день (вечерний)',
      subtitle: 'Вечерний отчет о выполненной работе и результатах',
      icon: <Moon size={18} className="text-amber-500" />,
      badge: 'Вечер'
    },
    {
      value: 'WEEKLY',
      label: 'Еженедельный отчет',
      subtitle: 'Сводные итоги за неделю, KPI и цели следующей недели',
      icon: <CalendarRange size={18} className="text-amber-500" />,
      badge: 'Неделя'
    },
    {
      value: 'MONTHLY',
      label: 'Ежемесячный отчет',
      subtitle: 'Итоговые показатели за месяц, аналитика и выводы',
      icon: <BarChart3 size={18} className="text-amber-500" />,
      badge: 'Месяц'
    }
  ], []);

  // 3. Question field type options with SVG icons and subtitles grouped into 5 categories
  const fieldTypeGroups = useMemo<RaportDropdownGroup<ReportFieldType>[]>(() => [
    {
      category: 'text_voice',
      categoryLabel: 'Голос и текст',
      categoryIcon: <Mic size={16} className="text-amber-500" />,
      options: [
        {
          value: 'voice',
          label: 'Голосовое / аудиосообщение (ИИ)',
          subtitle: 'Аудиозапись голоса с авто-расшифровкой нейросетью',
          icon: <Mic size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'text_short',
          label: 'Короткий текст (строка)',
          subtitle: 'Однострочный ввод для кратких ответов и данных (анализируется ИИ)',
          icon: <Type size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'text_paragraph',
          label: 'Развернутый текст / заметка',
          subtitle: 'Многострочное текстовое поле для подробных комментариев (анализируется ИИ)',
          icon: <AlignLeft size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'number',
          label: 'Числовой показатель / метрика',
          subtitle: 'Число: план, факт, выручка, штуки, часы (проверяется ИИ)',
          icon: <Hash size={18} className="text-amber-500" />,
          badge: 'ИИ'
        }
      ]
    },
    {
      category: 'choice',
      categoryLabel: 'Варианты выбора',
      categoryIcon: <CheckSquare size={16} className="text-amber-500" />,
      options: [
        {
          value: 'multiple_choice',
          label: 'Множественный выбор (чекбоксы)',
          subtitle: 'Выбор одного или нескольких вариантов ответа (проверяется ИИ)',
          icon: <CheckSquare size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'single_choice',
          label: 'Одиночный выбор (один из списка)',
          subtitle: 'Выпадающий список или выбор одного верного варианта (проверяется ИИ)',
          icon: <CircleDot size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'checkbox',
          label: 'Чекбокс (да / нет)',
          subtitle: 'Бинарный флажок подтверждения регламента или пункта (проверяется ИИ)',
          icon: <ToggleRight size={18} className="text-amber-500" />,
          badge: 'ИИ'
        }
      ]
    },
    {
      category: 'media',
      categoryLabel: 'Медиа и камера',
      categoryIcon: <Camera size={16} className="text-amber-500" />,
      options: [
        {
          value: 'photo',
          label: 'Фотография (из галереи)',
          subtitle: 'Загрузка снимка из памяти устройства (анализируется ИИ)',
          icon: <ImageIcon size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'camera_photo',
          label: 'Фото с камеры (в реальном времени)',
          subtitle: 'Мгновенный снимок через камеру смартфона (фиксация факта без OCR)',
          icon: <Camera size={18} className="text-amber-500" />
        },
        {
          value: 'screenshot',
          label: 'Скриншот экрана',
          subtitle: 'Скриншот экрана для подтверждения задачи (анализируется ИИ)',
          icon: <Monitor size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'video',
          label: 'Видеозапись (из галереи)',
          subtitle: 'Загрузка видеофайла (нейросеть не анализирует видео, фиксируется факт)',
          icon: <Video size={18} className="text-amber-500" />
        },
        {
          value: 'camera_video',
          label: 'Видео с камеры (в реальном времени)',
          subtitle: 'Запись короткого видеоролика с камеры (нейросеть не анализирует видео)',
          icon: <Video size={18} className="text-amber-500" />
        }
      ]
    },
    {
      category: 'files',
      categoryLabel: 'Документы и файлы',
      categoryIcon: <FileText size={16} className="text-amber-500" />,
      options: [
        {
          value: 'pdf',
          label: 'PDF документ (файл или Google Диск)',
          subtitle: 'Загрузка PDF или ссылка на Google Диск (анализируется ИИ)',
          icon: <FileCheck size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'table',
          label: 'Таблица (Excel / CSV / Google Sheets)',
          subtitle: 'Загрузка Excel/CSV или ссылка на Google Таблицу (анализируется ИИ)',
          icon: <Sheet size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'document',
          label: 'Текстовый документ (Word / Google Docs)',
          subtitle: 'Загрузка Word/DOCX или ссылка на Google Документ (анализируется ИИ)',
          icon: <FileText size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'presentation',
          label: 'Презентация (PPTX / Google Slides)',
          subtitle: 'Загрузка PPTX или ссылка на Google Презентацию (анализируется ИИ)',
          icon: <Presentation size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'audio',
          label: 'Аудиофайл (MP3 / WAV / M4A)',
          subtitle: 'Запись звонка или аудиофайл (распознается и анализируется ИИ)',
          icon: <Headphones size={18} className="text-amber-500" />,
          badge: 'ИИ'
        },
        {
          value: 'file',
          label: 'Универсальный файл любого формата / Архив',
          subtitle: 'Любой прикрепляемый файл к отчету или архив',
          icon: <Paperclip size={18} className="text-amber-500" />
        },
        {
          value: 'google_drive',
          label: 'Ссылка на Google Диск / Таблицу / Документ',
          subtitle: 'Google Таблицы, Документы и Диск распознаются и анализируются ИИ (открытый доступ для чтения)',
          icon: <ExternalLink size={18} className="text-amber-500" />,
          badge: 'ИИ'
        }
      ]
    },
    {
      category: 'special',
      categoryLabel: 'Специальные поля',
      categoryIcon: <MapPin size={16} className="text-amber-500" />,
      options: [
        {
          value: 'url',
          label: 'Ссылка на веб-ресурс',
          subtitle: 'Прямой URL-адрес интернет-сайта или веб-страницы (без ИИ)',
          icon: <Link2 size={18} className="text-amber-500" />
        },
        {
          value: 'geolocation',
          label: 'Геопозиция (GPS координаты)',
          subtitle: 'Точные спутниковые GPS-координаты сотрудника (проверяется ИИ)',
          icon: <MapPin size={18} className="text-amber-500" />,
          badge: 'ИИ'
        }
      ]
    }
  ], []);

  // 4. Reviewer options with SVG icons and subtitles
  const reviewerOptions = useMemo<RaportDropdownOption[]>(() => {
    const list: RaportDropdownOption[] = [
      {
        value: '',
        label: 'Выберите руководителя для проверки...',
        subtitle: 'Руководитель получит уведомление и утвердит отчет',
        icon: <UserCheck size={18} className="text-amber-500" />
      }
    ];

    eligibleReviewers.forEach(rev => {
      const isDirector = rev.role === 'DIRECTOR' || rev.position?.toLowerCase().includes('директор');
      list.push({
        value: rev.id,
        label: rev.name,
        subtitle: rev.position || (isDirector ? 'Генеральный директор' : 'Руководитель подразделения'),
        badge: isDirector ? 'Директор' : 'Руководитель',
        icon: isDirector ? (
          <Crown size={18} className="text-amber-500" />
        ) : (
          <Shield size={18} className="text-amber-500" />
        )
      });
    });

    return list;
  }, [eligibleReviewers]);

  // Handle template pre-fill
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) {
      setTitle(found.title);
      setDescription(found.description || '');
      setReportType(found.type || 'PLAN_DAY');
      setFields(
        found.fields && found.fields.length > 0 
          ? found.fields.map((f, i) => ({ ...f, id: `f-${Date.now()}-${i}` }))
          : [{ id: `f-${Date.now()}`, label: 'Главный вопрос отчета', type: 'voice', required: true }]
      );
      setCheckerType(found.checker_type || 'ai');
      setSelectedReviewerId(found.reviewer_id || '');
      setSelectedReviewerName(found.reviewer_name || '');
      setCheckCriteria(found.check_criteria || 'Оценка полноты и качества результатов отчета.');
      setReminderMinutes(found.reminderMinutes ?? 15);
      setReminderText(found.reminderText || 'Внимание! Напоминаем о необходимости сдать отчет.');
    }
  };

  // Field manipulation
  const handleAddField = () => {
    const newField: ReportField = {
      id: `field-${Date.now()}`,
      label: 'Новый вопрос для сотрудника',
      type: 'voice',
      required: true,
      hint: '',
      ai_check_prompt: ''
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, patch: Partial<ReportField>) => {
    const next = [...fields];
    const updated = { ...next[index], ...patch };
    // Для фото с камеры в реальном времени промпт проверки ИИ не используется
    if (updated.type === 'camera_photo') {
      updated.ai_check_prompt = '';
    }
    next[index] = updated;
    setFields(next);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const next = [...fields];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setFields(next);
  };

  const handleConfirmDeleteField = () => {
    if (fieldToDeleteIdx === null) return;
    setFields(fields.filter((_, i) => i !== fieldToDeleteIdx));
    setFieldToDeleteIdx(null);
  };

  // Add / remove option for multiple_choice / single_choice / checkbox options
  const handleAddOption = (fieldIdx: number) => {
    const field = fields[fieldIdx];
    const opts = field.options && field.options.length > 0 ? [...field.options] : ['Вариант 1', 'Вариант 2'];
    opts.push(`Вариант ${opts.length + 1}`);
    handleUpdateField(fieldIdx, { options: opts });
  };

  const handleUpdateOption = (fieldIdx: number, optIdx: number, val: string) => {
    const field = fields[fieldIdx];
    const opts = field.options && field.options.length > 0 ? [...field.options] : ['Вариант 1', 'Вариант 2'];
    opts[optIdx] = val;
    handleUpdateField(fieldIdx, { options: opts });
  };

  const handleRemoveOption = (fieldIdx: number, optIdx: number) => {
    const field = fields[fieldIdx];
    const opts = field.options && field.options.length > 0 ? [...field.options] : ['Вариант 1', 'Вариант 2'];
    const nextOpts = opts.filter((_, i) => i !== optIdx);
    handleUpdateField(fieldIdx, { options: nextOpts.length > 0 ? nextOpts : ['Вариант 1'] });
  };

  // Macro helper: insert macro into check criteria
  const handleInsertMacro = (macro: string) => {
    setCheckCriteria(prev => {
      const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
      return `${prev}${spacer}${macro}`;
    });
  };

  // AI 1: FULL REPORT GENERATION VIA VOICE / TEXT (Top field)
  const handleGenerateFullReportFromVoice = async () => {
    if (!voicePromptInput.trim()) {
      setValidationError('Пожалуйста, надиктуйте голосом или введите описание отчета');
      return;
    }
    setValidationError(null);
    setAiLoadingTitle('ИИ Ревизор RR формирует регламент отчета');
    setAiLoadingSubtitle('Анализируем требования, структуру отделов, сотрудников и генерируем поля...');
    setIsAiLoading(true);

    try {
      const contextPayload = {
        userVoiceRequest: voicePromptInput.trim(),
        currentTitle: title,
        currentFields: fields,
        departments: dbDepartments.map(d => ({ id: d.id, name: d.name, parentId: d.parentId || d.parent_id || null })),
        employees: dbEmployees.map(e => ({ id: e.id, name: e.name, position: e.position, departmentId: e.department_id || e.departmentId, role: e.role })),
        departmentsHierarchyInfo: getDepartmentsPromptContext(),
        employeesListInfo: getEmployeesPromptContext(),
        availableFieldTypes: REPORT_FIELD_TYPES.map(t => ({
          value: t.value,
          label: t.label,
          description: t.description,
          aiSupported: t.aiSupported,
          aiNotice: t.aiNotice || null
        }))
      };

      const sysPrompt = `Вы — ведущий методолог корпоративного управления и аудита «ИИ Рапорт».
На основе описания пользователя, структуры компании и списка сотрудников создайте полную структуру регламента отчета.

${getDepartmentsPromptContext()}

${getEmployeesPromptContext()}

Вам доступны следующие типы ответов:
${REPORT_FIELD_TYPES.map(t => `- "${t.value}": ${t.label} (${t.description})${t.aiNotice ? ' [ВНИМАНИЕ: ' + t.aiNotice + ']' : ''}`).join('\n')}

ВАЖНО ПО ВЫБОРУ ОТДЕЛОВ И СОТРУДНИКОВ:
1. Выберите подходящие отделы или подотделы в поле "departmentIds". Укажите массив точных строковых ID из списка отделов компании (например: ["${dbDepartments[0]?.id || '1'}"] или ["all"]).
2. Выберите подходящих сотрудников в поле "employeeIds". Укажите массив точных строковых ID из списка сотрудников компании (например: ["${dbEmployees[0]?.id || '1'}"] или ["all"]). Если отчет для сотрудников определенного отдела или должности, обязательно укажите их ID!

ВЫХОДНОЙ ФОРМАТ СТРОГО В ВИДЕ JSON БЕЗ РАЗМЕТКИ:
{
  "title": "Точное понятное название отчета",
  "description": "Краткое назначение и цель отчета",
  "reportType": "PLAN_DAY" | "FACT_DAY" | "WEEKLY" | "MONTHLY",
  "departmentIds": ["id_отдела_или_подотдела"] или ["all"],
  "employeeIds": ["all"] или ["id_сотрудника"],
  "checkerType": "ai" | "director",
  "reviewerId": "id_выбранного_руководителя_из_списка_или_null",
  "reviewerName": "имя_выбранного_руководителя_или_null",
  "checkCriteria": "Детальные правила и критерии оценки отчета проверяющим по шкале 1-100",
  "aiAutofillPrompt": "Инструкция для ИИ-ассистента сотрудника при автозаполнении с макросами {employee_name}, {department_name}, {duties}, {date}",
  "fields": [
    {
      "label": "Формулировка вопроса",
      "type": "voice" | "text_short" | "text_paragraph" | "number" | "multiple_choice" | "single_choice" | "checkbox" | "photo" | "camera_photo" | "screenshot" | "pdf" | "table" | "google_drive" | "audio" | "document" | "presentation" | "file" | "url" | "video" | "camera_video" | "geolocation",
      "required": true,
      "hint": "Подсказка для сотрудника",
      "aiCheckPrompt": "Строгий промпт/правило для ИИ: что именно и как проверять в этом конкретном поле при сдаче (например: сверить наличие чека, отсутствие отговорок, согласованность с планом, четкость фото или попадание в геозону)",
      "options": ["Вариант 1", "Вариант 2"]
    }
  ]
}`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Пользователь надиктовал задачу для отчета: "${voicePromptInput.trim()}".\n${getDepartmentsPromptContext()}\n${getEmployeesPromptContext()}\nКонтекст: ${JSON.stringify(contextPayload)}`,
          systemPrompt: sysPrompt,
          userId: currentUser?.id || '91827364501',
          entityType: 'raport',
          jsonOutput: true
        })
      });

      const data = await res.json();
      if (!data.success && data.error) throw new Error(data.error);

      const rawText = data.text || data.reply || '';
      let cleaned = typeof rawText === 'string' ? rawText.trim() : JSON.stringify(rawText);
      cleaned = cleaned.replace(/```json/gi, '').replace(/```/gi, '').trim();

      let parsed: any = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch (err1) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');

        if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          try {
            parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
          } catch (err2) {
            const sanitized = cleaned.slice(firstBrace, lastBrace + 1).replace(/,\s*([}\]])/g, '$1');
            parsed = JSON.parse(sanitized);
          }
        } else if (firstBracket !== -1 && lastBracket !== -1) {
          try {
            parsed = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
          } catch (err3) {
            const sanitized = cleaned.slice(firstBracket, lastBracket + 1).replace(/,\s*([}\]])/g, '$1');
            parsed = JSON.parse(sanitized);
          }
        }
      }

      if (!parsed) {
        throw new Error('Не удалось распознать структуру ответа нейросети');
      }

      let root = parsed;
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && (parsed[0].title || parsed[0].fields || parsed[0].label)) {
          root = (parsed[0].fields || parsed[0].title) ? parsed[0] : { fields: parsed };
        } else {
          root = { fields: parsed };
        }
      }
      if (root.report && typeof root.report === 'object') root = root.report;
      else if (root.template && typeof root.template === 'object') root = root.template;
      else if (root.structure && typeof root.structure === 'object') root = root.structure;
      else if (root.data && typeof root.data === 'object') root = root.data;

      const newTitle = root.title || root.name || root.templateTitle || root.reportTitle;
      if (newTitle) setTitle(String(newTitle).trim());

      const newDesc = root.description || root.desc || root.summary;
      if (newDesc) setDescription(String(newDesc).trim());

      if (root.reportType || root.type) {
        const rt = String(root.reportType || root.type).toLowerCase();
        if (rt.includes('plan') || rt === 'plan_day') setReportType('PLAN_DAY');
        else if (rt.includes('week')) setReportType('WEEKLY');
        else if (rt.includes('month')) setReportType('MONTHLY');
        else setReportType('FACT_DAY');
      }

      // Intelligent Department & Sub-department selection
      const rawDeptIds = root.departmentIds || root.target_departments || root.departments;
      if (Array.isArray(rawDeptIds) && rawDeptIds.length > 0) {
        if (rawDeptIds.includes('all')) {
          setSelectedDepartments(['all']);
        } else {
          const matchedDeptIds: string[] = [];
          for (const rawId of rawDeptIds) {
            const strVal = String(rawId).trim();
            const direct = dbDepartments.find(d => String(d.id) === strVal);
            if (direct) {
              if (!matchedDeptIds.includes(direct.id)) matchedDeptIds.push(direct.id);
            } else {
              const fuzzy = dbDepartments.find(d => 
                d.name.toLowerCase().includes(strVal.toLowerCase()) || 
                strVal.toLowerCase().includes(d.name.toLowerCase())
              );
              if (fuzzy && !matchedDeptIds.includes(fuzzy.id)) matchedDeptIds.push(fuzzy.id);
            }
          }
          if (matchedDeptIds.length > 0) {
            setSelectedDepartments(matchedDeptIds);
          } else {
            setSelectedDepartments(['all']);
          }
        }
      }

      // Intelligent Employee selection
      const rawEmpIds = root.employeeIds || root.target_employees || root.employees;
      if (Array.isArray(rawEmpIds) && rawEmpIds.length > 0) {
        if (rawEmpIds.includes('all')) {
          setSelectedEmployees(['all']);
        } else {
          const matchedEmpIds: string[] = [];
          for (const rawId of rawEmpIds) {
            const strVal = String(rawId).trim();
            const direct = dbEmployees.find(e => String(e.id) === strVal);
            if (direct) {
              if (!matchedEmpIds.includes(direct.id)) matchedEmpIds.push(direct.id);
            } else {
              const fuzzy = dbEmployees.find(e => 
                e.name.toLowerCase().includes(strVal.toLowerCase()) || 
                strVal.toLowerCase().includes(e.name.toLowerCase()) ||
                (e.position && (e.position.toLowerCase().includes(strVal.toLowerCase()) || strVal.toLowerCase().includes(e.position.toLowerCase())))
              );
              if (fuzzy && !matchedEmpIds.includes(fuzzy.id)) matchedEmpIds.push(fuzzy.id);
            }
          }
          if (matchedEmpIds.length > 0) {
            setSelectedEmployees(matchedEmpIds);
          } else {
            setSelectedEmployees(['all']);
          }
        }
      }

      if (root.checkerType) {
        const ct = String(root.checkerType).toLowerCase();
        if (ct.includes('director') || ct.includes('manager') || ct.includes('руковод')) setCheckerType('director');
        else setCheckerType('ai');
      }
      if (root.reviewerId) setSelectedReviewerId(String(root.reviewerId));
      if (root.reviewerName) setSelectedReviewerName(String(root.reviewerName));

      if (root.checkCriteria) {
        if (Array.isArray(root.checkCriteria)) {
          setCheckCriteria(root.checkCriteria.map((c: any) => `• ${String(c).trim()}`).join('\n'));
        } else {
          setCheckCriteria(String(root.checkCriteria).trim());
        }
      }

      const typeAliases: Record<string, ReportFieldType> = {
        'text': 'text_short',
        'string': 'text_short',
        'input': 'text_short',
        'date': 'text_short',
        'datetime': 'text_short',
        'time': 'text_short',
        'paragraph': 'text_paragraph',
        'textarea': 'text_paragraph',
        'long_text': 'text_paragraph',
        'number': 'number',
        'int': 'number',
        'float': 'number',
        'integer': 'number',
        'count': 'number',
        'select': 'single_choice',
        'dropdown': 'single_choice',
        'single_choice': 'single_choice',
        'multiselect': 'multiple_choice',
        'multiple_choice': 'multiple_choice',
        'checkbox': 'checkbox',
        'bool': 'checkbox',
        'boolean': 'checkbox',
        'photo': 'photo',
        'image': 'photo',
        'camera': 'camera_photo',
        'camera_photo': 'camera_photo',
        'screenshot': 'screenshot',
        'video': 'video',
        'audio': 'audio',
        'voice': 'voice',
        'file': 'file',
        'document': 'document',
        'doc': 'document',
        'table': 'table',
        'excel': 'table',
        'geolocation': 'geolocation',
        'location': 'geolocation'
      };

      const rawFields = root.fields || root.questions || root.items || [];
      if (Array.isArray(rawFields) && rawFields.length > 0) {
        const generatedFields: ReportField[] = rawFields.map((f: any, idx: number) => {
          const rawFType = String(f.type || 'voice').toLowerCase();
          const mappedType: ReportFieldType = typeAliases[rawFType] || (REPORT_FIELD_TYPES.some(t => t.value === f.type) ? f.type : 'voice');
          return {
            id: `ai-field-${Date.now()}-${idx}`,
            label: f.label || f.name || f.title || `Вопрос ${idx + 1}`,
            type: mappedType,
            required: f.required !== false,
            hint: f.hint || f.placeholder || '',
            ai_check_prompt: f.aiCheckPrompt || f.ai_check_prompt || '',
            options: Array.isArray(f.options) && f.options.length > 0 ? f.options : undefined
          };
        });
        setFields(generatedFields);
        setAiSuccessMessage(`Структура отчета «${newTitle || title || 'Новый отчет'}» успешно сформирована ИИ (${generatedFields.length} вопросов). Проверьте форму и сохраните регламент.`);
      } else {
        setAiSuccessMessage(`Параметры отчета «${newTitle || title || 'Новый отчет'}» успешно заполнены нейросетью.`);
      }
    } catch (e: any) {
      console.error('Failed to generate full report:', e);
      setValidationError(`Ошибка генерации: ${e.message || 'Проверьте соединение'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI 2: GENERATE QUESTIONS WITH PROPER OVERLAY & CHAT_ID RAPORT
  const handleAIGenerateQuestions = async () => {
    if (!title.trim()) {
      setValidationError('Укажите название отчета перед подбором вопросов');
      return;
    }
    setValidationError(null);
    setAiLoadingTitle('ИИ подбирает вопросы отчета');
    setAiLoadingSubtitle('Формируем профессиональные формулировки и типы ответов...');
    setIsAiLoading(true);

    try {
      const sysPrompt = `Вы — ведущий методолог корпоративной отчетности «ИИ Рапорт».
Сгенерируйте список из 3-5 ключевых вопросов для отчета "${title}".
Назначение: "${description || title}".
Периодичность: ${reportType}.

Доступные типы ответов:
${REPORT_FIELD_TYPES.map(t => `- "${t.value}": ${t.label} (${t.description})`).join('\n')}

Верните строго валидный JSON-массив без markdown:
[
  {
    "label": "Текст вопроса",
    "type": "voice" | "text_short" | "text_paragraph" | "number" | "multiple_choice" | "single_choice" | "checkbox" | "photo" | "camera_photo" | "screenshot" | "video" | "camera_video" | "pdf" | "table" | "google_drive" | "document" | "presentation" | "audio" | "file" | "url" | "geolocation",
    "required": true,
    "hint": "Подсказка",
    "aiCheckPrompt": "Строгий критерий проверки этого поля ИИ при сдаче отчета",
    "options": ["Вариант 1", "Вариант 2"]
  }
]`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Подбери оптимальные вопросы для отчета "${title}" (тип: ${reportType}). Цель: ${description || 'ежедневный контроль'}.\n${getDepartmentsPromptContext()}`,
          systemPrompt: `${sysPrompt}\n\n${getDepartmentsPromptContext()}`,
          userId: currentUser?.id || '91827364501',
          entityType: 'raport',
          jsonOutput: true
        })
      });

      const data = await res.json();
      if (!data.success && data.error) throw new Error(data.error);

      const rawText = data.text || data.reply || '';
      let cleaned = typeof rawText === 'string' ? rawText.trim() : JSON.stringify(rawText);
      cleaned = cleaned.replace(/```json/gi, '').replace(/```/gi, '').trim();

      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      let parsed: any = null;
      if (firstBracket !== -1 && lastBracket !== -1) {
        try {
          parsed = JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
        } catch (e1) {
          const sanitized = cleaned.slice(firstBracket, lastBracket + 1).replace(/,\s*([}\]])/g, '$1');
          parsed = JSON.parse(sanitized);
        }
      } else {
        try {
          parsed = JSON.parse(cleaned);
        } catch (e2) {
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            const obj = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
            parsed = obj.fields || obj.questions || obj.items || [obj];
          }
        }
      }

      const typeAliases: Record<string, ReportFieldType> = {
        'text': 'text_short',
        'string': 'text_short',
        'input': 'text_short',
        'date': 'text_short',
        'datetime': 'text_short',
        'time': 'text_short',
        'paragraph': 'text_paragraph',
        'textarea': 'text_paragraph',
        'long_text': 'text_paragraph',
        'number': 'number',
        'int': 'number',
        'float': 'number',
        'integer': 'number',
        'count': 'number',
        'select': 'single_choice',
        'dropdown': 'single_choice',
        'single_choice': 'single_choice',
        'multiselect': 'multiple_choice',
        'multiple_choice': 'multiple_choice',
        'checkbox': 'checkbox',
        'bool': 'checkbox',
        'boolean': 'checkbox',
        'photo': 'photo',
        'image': 'photo',
        'camera': 'camera_photo',
        'camera_photo': 'camera_photo',
        'screenshot': 'screenshot',
        'video': 'video',
        'audio': 'audio',
        'voice': 'voice',
        'file': 'file',
        'document': 'document',
        'doc': 'document',
        'table': 'table',
        'excel': 'table',
        'geolocation': 'geolocation',
        'location': 'geolocation'
      };

      const rawItems = Array.isArray(parsed) ? parsed : (parsed?.fields || parsed?.questions || []);
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        const generatedFields: ReportField[] = rawItems.map((item: any, idx: number) => {
          const rawFType = String(item.type || 'voice').toLowerCase();
          const mappedType: ReportFieldType = typeAliases[rawFType] || (REPORT_FIELD_TYPES.some(t => t.value === item.type) ? item.type : 'voice');
          return {
            id: `ai-field-${Date.now()}-${idx}`,
            label: item.label || item.name || item.title || `Вопрос ${idx + 1}`,
            type: mappedType,
            required: item.required !== false,
            hint: item.hint || item.placeholder || '',
            ai_check_prompt: item.aiCheckPrompt || item.ai_check_prompt || '',
            options: Array.isArray(item.options) && item.options.length > 0 ? item.options : undefined
          };
        });
        setFields(generatedFields);
        setAiSuccessMessage(`Подобрано ${generatedFields.length} вопросов отчета через ИИ.`);
      }
    } catch (e: any) {
      console.error('Failed to generate questions:', e);
      setValidationError(`Ошибка генерации вопросов: ${e.message || 'Сбой запроса'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI 3: GENERATE CRITERIA AND WISHES FOR AI
  const handleAIGenerateCriteria = async () => {
    setAiLoadingTitle('ИИ формулирует критерии и пожелания к проверке');
    setAiLoadingSubtitle('Определяем шкалу 1-100 баллов, фокус на фактах и требования к рекомендациям и плану...');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Сформулируй правила и критерии проверки и оценки отчета для ИИ (пожелания руководителя) для отчета "${title || 'Рабочий рапорт'}" (${reportType}). Вопросы отчета: ${fields.map(f => f.label).join('; ')}.\n${getDepartmentsPromptContext()}`,
          systemPrompt: `Вы — старший методолог и наставник сотрудников «ИИ Рапорт».
Составьте правила и критерии проверки отчета для ИИ с учетом структуры отделов компании:
${getDepartmentsPromptContext()}
1. Шкала оценивания от 1 до 100 баллов и требования к конкретным результатам и цифрам (без пустых отписок).
2. Ключевые фокусные точки, на которые ИИ должен обратить внимание при анализе ответов.
3. Пожелания руководителя к формированию мотивирующих рекомендаций и персонального плана действий для сотрудника (чтобы сотрудник был вдохновлен и качественно выполнил свои должностные обязанности).
Ответьте емким структурированным текстом на русском языке без использования капслока.`,
          userId: currentUser?.id || '91827364501',
          entityType: 'raport'
        })
      });

      const data = await res.json();
      const text = data.text || data.reply || '';
      if (text.trim()) setCheckCriteria(text.trim());
    } catch (e: any) {
      console.warn('Failed to generate criteria:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save submit
  const handleSave = async () => {
    if (!title.trim()) {
      setValidationError('Пожалуйста, укажите название отчета');
      return;
    }
    if (fields.length === 0) {
      setValidationError('Добавьте хотя бы один вопрос в отчет');
      return;
    }
    setValidationError(null);
    setIsSaving(true);

    try {
      const templateId = editingTemplate?.id || String(Date.now());
      const effectiveCompanyId = currentUser?.company_id || (currentUser?.id ? `com-${currentUser.id}` : 'com-91827364501');
      const effectiveDirectorId = currentUser?.id || '91827364501';
      const effectiveDeptId = selectedDepartments.includes('all')
        ? (dbDepartments[0]?.id || 'dept-mu5hafwr-nir7')
        : (selectedDepartments[0] || 'dept-mu5hafwr-nir7');

      // Гарантированно очищаем промпты проверки для режима фото с камеры в реальном времени
      const sanitizedFields = fields.map(f => {
        if (f.type === 'camera_photo') {
          return { ...f, ai_check_prompt: '' };
        }
        return f;
      });

      const templateToSave: ReportTemplate = {
        id: templateId,
        company_id: effectiveCompanyId,
        director_id: effectiveDirectorId,
        departmentId: effectiveDeptId,
        title: title.trim(),
        description: description.trim(),
        type: reportType,
        fields: sanitizedFields,
        target_departments: selectedDepartments,
        target_employees: selectedEmployees,
        employeeIds: selectedEmployees,
        checker_type: checkerType,
        reviewer_id: checkerType === 'ai' ? undefined : selectedReviewerId,
        reviewer_name: checkerType === 'ai' ? undefined : selectedReviewerName,
        check_criteria: checkCriteria.trim(),
        history_depth_for_ai: historyDepthForAi,
        customPrompt: checkCriteria.trim(),
        reminderMinutes,
        reminderText: reminderText.trim(),
        is_active: true,
        // Schedule & Reminders
        schedule_mode: (editingTemplate as any)?.schedule_mode || 'daily',
        deadline_time: (editingTemplate as any)?.deadline_time || '10:00',
        timezone: (editingTemplate as any)?.timezone || 'UTC+3',
        schedule_days: (editingTemplate as any)?.schedule_days || '1,2,3,4,5',
        monthly_day: (editingTemplate as any)?.monthly_day || null,
        reminder_mode: (editingTemplate as any)?.reminder_mode || 'before_deadline',
        reminder_time: (editingTemplate as any)?.reminder_time || '15_min',
        send_telegram_reminder: (editingTemplate as any)?.send_telegram_reminder ?? 1,
        send_inapp_notification: (editingTemplate as any)?.send_inapp_notification ?? 1
      };

      // Direct persist to PostgreSQL BD ProTalk backend
      const res = await fetch('/api/report-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateToSave)
      });
      const data = await res.json();
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error || 'Не удалось сохранить шаблон в базу данных');
      }

      await onSaveTemplate(templateToSave);
      setSaveSuccessNotice(true);
      setTimeout(() => {
        setSaveSuccessNotice(false);
        setIsSaving(false);
        onClose();
        const targetUrl = `/cabinet/raport/integrations?openRule=1&templateId=${encodeURIComponent(templateId)}&scope=specific`;
        if (onNavigate) {
          onNavigate(targetUrl);
        } else if (typeof window !== 'undefined') {
          window.location.href = targetUrl;
        }
      }, 700);
    } catch (e: any) {
      console.error('Error saving template:', e);
      setValidationError(e.message || 'Ошибка сохранения отчета');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto bg-black/60 backdrop-blur-md"
      id="create-report-modal-backdrop"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden ${
          isLightTheme
            ? 'bg-[#FFFBF5]/95 border-amber-400/60 shadow-[0_10px_40px_rgba(217,158,65,0.15)] text-zinc-900'
            : 'bg-[#140A01]/95 border-amber-400/40 shadow-[0_0_40px_rgba(244,238,142,0.25)] text-white'
        }`}
        id="create-report-modal-window"
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0 ${
          isLightTheme ? 'border-amber-300/60 bg-amber-50/50' : 'border-amber-400/30 bg-amber-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
              isLightTheme 
                ? 'bg-amber-100 border-amber-400/80 text-amber-900' 
                : 'bg-amber-400/15 border-amber-400/50 text-[#F4EE8E]'
            }`}>
              <FileText size={22} />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold leading-tight ${
                isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
              }`}>
                {editingTemplate ? 'Редактирование формы отчета' : 'Конструктор формы отчета'}
              </h2>
              <p className={`text-xs sm:text-sm ${isLightTheme ? 'text-zinc-600' : 'text-amber-200/70'}`}>
                Настройте вопросы, голосовой ввод, правила проверки и автозаполнение нейросетью
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isLightTheme
                ? 'border-amber-300 hover:bg-amber-100 text-zinc-700'
                : 'border-amber-400/30 hover:bg-white/10 text-amber-200'
            }`}
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm flex-1 custom-scrollbar">
          {/* Validation banner */}
          {validationError && (
            <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
              isLightTheme ? 'bg-amber-100 border-amber-400 text-amber-950' : 'bg-amber-500/20 border-amber-400/60 text-[#F4EE8E]'
            }`}>
              <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-300" />
              <span className="font-medium text-sm">{validationError}</span>
            </div>
          )}

          {/* 0. TOP FIELD: VOICE & AI FULL REPORT GENERATOR */}
          <div className={`p-4 sm:p-5 rounded-2xl border relative overflow-hidden space-y-3 ${
            isLightTheme
              ? 'bg-gradient-to-br from-amber-100/70 via-white to-amber-50/90 border-amber-400/80 shadow-[0_4px_20px_rgba(217,158,65,0.12)]'
              : 'bg-gradient-to-br from-[#1A0F02] via-[#140A01] to-[#251505] border-amber-400/50 shadow-[0_0_25px_rgba(244,238,142,0.15)]'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${
                  isLightTheme ? 'bg-amber-200/80 border-amber-400 text-amber-950' : 'bg-amber-400/20 border-amber-400/60 text-[#F4EE8E]'
                }`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className={`font-bold text-sm sm:text-base ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                    Генерация регламента отчета голосом или текстом через ИИ
                  </h3>
                  <p className={`text-xs ${isLightTheme ? 'text-zinc-600' : 'text-amber-200/70'}`}>
                    Надиктуйте голосом или опишите суть отчета — нейросеть создаст все поля, правила проверки и назначит ответственных
                  </p>
                </div>
              </div>
            </div>

            <AudioField
              value={voicePromptInput}
              onChange={setVoicePromptInput}
              placeholder="Надиктуйте голосом, например: 'Дневной рапорт мастера цеха: безопасность на участке, произведенный объем деталей в штуках, фото поломок оборудования, часы простоев и план на завтра. Проверяет начальник производства, оценка строгая по соблюдению плана'..."
              isLightTheme={isLightTheme}
              minHeight="85px"
              className="w-full"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className={`text-xs ${isLightTheme ? 'text-zinc-600' : 'text-amber-300/70'}`}>
                ИИ автоматически учитывает структуру отделов, список сотрудников компании и все типы данных
              </span>

              <button
                type="button"
                onClick={handleGenerateFullReportFromVoice}
                disabled={!voicePromptInput.trim()}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 ${
                  isLightTheme
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:bg-amber-500 border-amber-600 text-amber-950 shadow-[0_4px_12px_rgba(217,158,65,0.3)]'
                    : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 border-amber-300 shadow-[0_0_20px_rgba(244,238,142,0.35)]'
                }`}
              >
                <Sparkles size={16} />
                <span>Сгенерировать структуру отчета с ИИ</span>
              </button>
            </div>

            {aiSuccessMessage && (
              <div className={`mt-3 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLightTheme
                  ? 'bg-amber-100/90 border-amber-500/80 text-amber-950 shadow-sm'
                  : 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(244,238,142,0.2)]'
              }`}>
                <div className="flex items-start gap-2.5">
                  <Check size={20} className="shrink-0 text-amber-600 dark:text-amber-300 mt-0.5" />
                  <div>
                    <span className="font-bold text-sm block">{aiSuccessMessage}</span>
                    <span className={`text-xs block mt-0.5 ${isLightTheme ? 'text-amber-900/80' : 'text-amber-200/80'}`}>
                      Все поля формы ниже заполнены. Вы можете отредактировать их или сразу сохранить регламент.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLightTheme
                        ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white'
                        : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 border-amber-300 hover:brightness-110'
                    }`}
                  >
                    <span>Сохранить регламент</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSuccessMessage(null)}
                    className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-amber-200 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick template selector */}
          {!editingTemplate && templates.length > 0 && (
            <div className={`p-4 rounded-2xl border ${
              isLightTheme ? 'bg-amber-50/40 border-amber-300/80' : 'bg-white/5 border-amber-400/30'
            }`}>
              <RaportDropdown
                label={
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>Быстрый выбор из готовых шаблонов компании:</span>
                  </span>
                }
                placeholder="Выберите шаблон для автозаполнения структуры..."
                value={selectedTemplateId}
                onChange={(val) => handleSelectTemplate(val)}
                options={templateOptions}
                isLightTheme={isLightTheme}
                searchable
              />
            </div>
          )}

          {/* Section 1: Basic info */}
          <div className="space-y-4">
            <div>
              <label className={`block font-bold mb-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                Название отчета:
              </label>
              <MiniAudioField
                value={title}
                onChange={setTitle}
                placeholder="Например: Дневной рапорт мастера смены..."
                isLightTheme={isLightTheme}
                className="w-full"
              />
            </div>

            <div>
              <label className={`block font-bold mb-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                Описание и назначение отчета:
              </label>
              <MiniAudioField
                value={description}
                onChange={setDescription}
                placeholder="Кратко укажите цель отчета и кому он необходим..."
                multiline
                rows={2}
                isLightTheme={isLightTheme}
                className="w-full"
              />
            </div>

            <div className="space-y-4">
              <div>
                <RaportDropdown<ReportType>
                  label="Периодичность и тип:"
                  value={reportType}
                  onChange={(val) => setReportType(val)}
                  options={reportTypeOptions}
                  isLightTheme={isLightTheme}
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block font-bold mb-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                  Напоминание о сдаче (минут до дедлайна):
                </label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(parseInt(e.target.value) || 15)}
                  className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                    isLightTheme
                      ? 'bg-amber-50/70 border-amber-300 text-zinc-900 focus:border-amber-500'
                      : 'bg-amber-950/30 border-amber-400/40 text-amber-100 focus:border-[#E7C768]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block font-bold mb-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                Текст напоминания сотрудникам:
              </label>
              <MiniAudioField
                value={reminderText}
                onChange={setReminderText}
                placeholder="Сообщение, которое придет сотруднику в виде напоминания..."
                isLightTheme={isLightTheme}
                className="w-full"
              />
            </div>
          </div>

          {/* Section 2: Target Audience (Multi-Select Dropdowns for Departments & Employees from DB) */}
          <div className={`p-4 rounded-2xl border space-y-4 ${
            isLightTheme ? 'bg-amber-50/40 border-amber-300/80' : 'bg-white/5 border-amber-400/30'
          }`}>
            <h3 className={`font-bold flex items-center gap-2 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
              <Building size={18} className="text-amber-500" />
              <span>Для каких отделов и сотрудников предназначен отчет:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Departments Multi-Select Dropdown with hierarchy */}
              <MultiSelectDropdown
                label="Отделы и подотделы компании:"
                placeholder="Выберите отделы..."
                items={departmentDropdownItems}
                selectedIds={selectedDepartments}
                onChange={setSelectedDepartments}
                isLightTheme={isLightTheme}
                type="departments"
                allOptionLabel="Все отделы компании"
              />

              {/* Employees Multi-Select Dropdown with avatars and roles */}
              <MultiSelectDropdown
                label="Конкретные сотрудники:"
                placeholder="Выберите сотрудников..."
                items={employeeDropdownItems}
                selectedIds={selectedEmployees}
                onChange={setSelectedEmployees}
                isLightTheme={isLightTheme}
                type="employees"
                allOptionLabel="Все сотрудники отделов"
              />
            </div>
          </div>

          {/* Section 3: Question Fields Builder */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={`font-bold flex items-center gap-2 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                <ListPlus size={18} className="text-amber-500" />
                <span>Вопросы и пункты отчета ({fields.length}):</span>
              </h3>

              {/* AI Suggest Questions button using AiLoadingOverlay */}
              <button
                type="button"
                onClick={handleAIGenerateQuestions}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isLightTheme 
                    ? 'bg-amber-100 hover:bg-amber-200/80 border-amber-400 text-amber-950' 
                    : 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/50 text-[#F4EE8E]'
                }`}
              >
                <Sparkles size={16} />
                <span>Подобрать вопросы с ИИ</span>
              </button>
            </div>

            {/* Questions list */}
            <div className="space-y-3">
              {fields.map((field, idx) => {
                const meta = getFieldTypeMeta(field.type);

                return (
                  <div
                    key={field.id || `field-${idx}`}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isLightTheme
                        ? 'bg-white border-amber-300/80 shadow-sm'
                        : 'bg-[#1A0F02]/80 border-amber-400/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isLightTheme ? 'bg-amber-200 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E]'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-xs opacity-75">
                          {meta.label}
                        </span>
                        {!meta.aiSupported && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                            {meta.aiNotice}
                          </span>
                        )}
                      </div>

                      {/* Controls: Up, Down, Delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveField(idx, 'up')}
                          className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 ${
                            isLightTheme ? 'border-amber-300 text-zinc-700 hover:bg-amber-50' : 'border-amber-400/30 text-amber-200 hover:bg-white/5'
                          }`}
                          title="Поднять выше"
                        >
                          <ArrowUp size={15} />
                        </button>

                        <button
                          type="button"
                          disabled={idx === fields.length - 1}
                          onClick={() => handleMoveField(idx, 'down')}
                          className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 ${
                            isLightTheme ? 'border-amber-300 text-zinc-700 hover:bg-amber-50' : 'border-amber-400/30 text-amber-200 hover:bg-white/5'
                          }`}
                          title="Опустить ниже"
                        >
                          <ArrowDown size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setFieldToDeleteIdx(idx)}
                          className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                            isLightTheme 
                              ? 'border-amber-400 bg-amber-100/60 text-amber-950 hover:bg-amber-200' 
                              : 'border-amber-400/40 bg-amber-950/40 text-amber-200 hover:bg-amber-900/40'
                          }`}
                          title="Удалить вопрос"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Field Question Text */}
                    <div>
                      <label className="block text-xs font-bold mb-1 opacity-80">Текст вопроса:</label>
                      <MiniAudioField
                        value={field.label}
                        onChange={(val) => handleUpdateField(idx, { label: val })}
                        placeholder="Введите формулировку вопроса или надиктуйте голосом..."
                        isLightTheme={isLightTheme}
                        className="w-full"
                      />
                    </div>

                    {/* Field Type and Required Setting */}
                    <div className="space-y-3">
                      <div>
                        <RaportDropdown<ReportFieldType>
                          label="Тип ответа:"
                          value={field.type}
                          onChange={(newType) => {
                            const isChoice = newType === 'multiple_choice' || newType === 'single_choice' || newType === 'list' || newType === 'select';
                            const newOpts = isChoice && (!field.options || field.options.length === 0)
                              ? ['Вариант 1', 'Вариант 2']
                              : newType === 'checkbox' ? undefined : field.options;
                            handleUpdateField(idx, { type: newType, options: newOpts });
                          }}
                          groups={fieldTypeGroups}
                          isLightTheme={isLightTheme}
                          searchable
                          className="w-full"
                        />
                      </div>

                      {/* Required Checkbox in Amber Style */}
                      <div className="pt-0.5">
                        <CustomCheckbox
                          checked={field.required}
                          onChange={(req) => handleUpdateField(idx, { required: req })}
                          isLightTheme={isLightTheme}
                          label="Обязательное поле для заполнения"
                        />
                      </div>
                    </div>

                    {/* Options Editor for multiple_choice / single_choice options */}
                    {(field.type === 'multiple_choice' || field.type === 'single_choice' || field.type === 'list' || field.type === 'select') && (
                      <div className={`p-3 rounded-xl border space-y-2 ${
                        isLightTheme ? 'bg-amber-50/50 border-amber-300' : 'bg-white/5 border-amber-400/20'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold opacity-80">Варианты ответа для выбора:</span>
                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Добавить вариант</span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {(field.options && field.options.length > 0 ? field.options : ['Вариант 1', 'Вариант 2']).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-xs opacity-60 w-4">{optIdx + 1}.</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                                placeholder={`Вариант ${optIdx + 1}`}
                                className={`flex-1 min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none ${
                                  isLightTheme ? 'bg-white border-amber-300 text-zinc-900' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                                }`}
                              />
                              {(field.options?.length || 2) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(idx, optIdx)}
                                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 p-1 cursor-pointer"
                                  title="Удалить вариант"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notice for Checkbox Yes / No */}
                    {field.type === 'checkbox' && (
                      <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                        isLightTheme ? 'bg-amber-100/50 border-amber-300 text-amber-950' : 'bg-amber-400/10 border-amber-400/30 text-amber-200'
                      }`}>
                        <Check size={14} className="text-amber-500 shrink-0" />
                        <span>Чекбокс Да / Нет: сотрудник выбирает ответ Да или Нет, вносить варианты вручную не требуется.</span>
                      </div>
                    )}

                    {/* Geolocation AI Check Instructions */}
                    {field.type === 'geolocation' && (
                      <div className={`p-3.5 rounded-xl border space-y-2 ${
                        isLightTheme ? 'bg-amber-50/70 border-amber-300 text-zinc-900' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-xs text-amber-600 dark:text-amber-400">
                          <MapPin size={16} />
                          <span>Инструкции для нейросети по проверке геопозиции:</span>
                        </div>
                        <p className={`text-xs ${isLightTheme ? 'text-zinc-700' : 'text-amber-200/80'}`}>
                          Укажите координаты объекта, допустимый радиус или правила проверки геопозиции для ИИ-ревизора:
                        </p>
                        <textarea
                          rows={2}
                          value={field.geoInstructions || ''}
                          onChange={(e) => handleUpdateField(idx, { geoInstructions: e.target.value })}
                          placeholder="Например: Объект «ЖК Заречье», координаты 55.751244, 37.618423. Допустимый радиус 300м. При отклонении более 500м снижать оценку рапорта."
                          className={`w-full min-h-[56px] p-2.5 rounded-xl border text-xs font-medium focus:outline-none resize-y overflow-y-auto ${
                            isLightTheme ? 'bg-white border-amber-300 text-zinc-900' : 'bg-[#1A0F02] border-amber-400/50 text-amber-100'
                          }`}
                        />
                      </div>
                    )}

                    {/* Image Analysis Mode Switcher for Uploaded Photos & Screenshots */}
                    {(field.type === 'photo' || field.type === 'screenshot') && (
                      <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                        isLightTheme ? 'bg-amber-50/70 border-amber-300' : 'bg-amber-400/5 border-amber-400/30'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-[#F4EE8E]">
                            Режим распознавания изображений
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-md border border-amber-400/40 text-amber-700 dark:text-amber-300 font-medium">
                            {field.image_analysis_mode === 'visual_description' ? 'Не текст (Объекты)' : 'Извлечение текста (OCR)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateField(idx, { image_analysis_mode: 'text' })}
                            className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              (field.image_analysis_mode || 'text') === 'text'
                                ? (isLightTheme ? 'bg-amber-400 border-amber-500 text-amber-950 font-bold shadow-sm' : 'bg-[#E7C768] border-amber-400 text-amber-950 font-bold')
                                : (isLightTheme ? 'bg-white border-amber-200 text-zinc-700 hover:bg-amber-50' : 'bg-transparent border-amber-400/20 text-amber-200/70 hover:bg-white/5')
                            }`}
                          >
                            <span className="block font-bold">Извлечение текста (OCR)</span>
                            <span className="block text-[11px] opacity-80 mt-0.5">Скриншоты экрана, чеки, накладные, читаемый текст</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateField(idx, { image_analysis_mode: 'visual_description' })}
                            className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              field.image_analysis_mode === 'visual_description'
                                ? (isLightTheme ? 'bg-amber-400 border-amber-500 text-amber-950 font-bold shadow-sm' : 'bg-[#E7C768] border-amber-400 text-amber-950 font-bold')
                                : (isLightTheme ? 'bg-white border-amber-200 text-zinc-700 hover:bg-amber-50' : 'bg-transparent border-amber-400/20 text-amber-200/70 hover:bg-white/5')
                            }`}
                          >
                            <span className="block font-bold">Не текст / Описание объектов</span>
                            <span className="block text-[11px] opacity-80 mt-0.5">Определение что на фото через прямой запрос в нейросеть</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AI Check Prompt for this field (disabled completely for real-time camera photo) */}
                    {field.type === 'camera_photo' ? (
                      <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                        isLightTheme ? 'bg-amber-50/80 border-amber-300' : 'bg-amber-400/5 border-amber-400/30'
                      }`}>
                        <div className="flex items-center gap-2 font-semibold text-sm text-amber-800 dark:text-[#F4EE8E]">
                          <Camera size={16} className="text-amber-500 shrink-0" />
                          <span>Фото с камеры (в реальном времени)</span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isLightTheme ? 'text-zinc-700' : 'text-amber-200/70'}`}>
                          Режим реального времени используется для подтверждения присутствия на объекте и фотофиксации. ИИ не производит строгую текстовую проверку данного типа полей. Промпт проверки отключен.
                        </p>
                      </div>
                    ) : (
                      <div className={`p-3.5 rounded-xl border space-y-2 ${
                        isLightTheme ? 'bg-amber-100/40 border-amber-300' : 'bg-amber-400/5 border-amber-400/30'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-semibold text-sm text-amber-800 dark:text-[#F4EE8E]">
                            <Sparkles size={16} className="text-amber-500 shrink-0" />
                            <span>
                              {field.image_analysis_mode === 'visual_description'
                                ? 'Промпт/подсказка для распознавания объектов на фото'
                                : 'Промпт для ИИ: что проверять в этом поле при сдаче'}
                            </span>
                          </div>
                          <span className="text-xs px-2.5 py-0.5 rounded-md font-medium border border-amber-400/40 text-amber-700 dark:text-amber-300">
                            {field.image_analysis_mode === 'visual_description' ? 'ИИ Vision' : 'ИИ Ревизор'}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${isLightTheme ? 'text-zinc-700' : 'text-amber-200/80'}`}>
                          {field.image_analysis_mode === 'visual_description'
                            ? 'Укажите нейросети, на какие объекты, детали или признаки обращать внимание на фото:'
                            : 'Укажите правила и критерии для нейросети при проверке ответа сотрудника (полнота, чеки, цифры, совпадение с планом):'}
                        </p>
                        <textarea
                          rows={2}
                          value={field.ai_check_prompt || ''}
                          onChange={(e) => handleUpdateField(idx, { ai_check_prompt: e.target.value })}
                          placeholder={
                            field.image_analysis_mode === 'visual_description'
                              ? 'Например: Определить наличие защитной каски и спецодежды, состояние витрины или чистоту помещения'
                              : field.type === 'photo' || field.type === 'screenshot'
                              ? 'Например: Извлечь текст с экрана, проверить сумму и номер транзакции'
                              : field.type === 'pdf' || field.type === 'document' || field.type === 'table' || field.type === 'presentation' || field.type === 'file'
                              ? 'Например: Проверить наличие подписи клиента, печати, номера договора и корректность итоговой суммы'
                              : field.type === 'geolocation'
                              ? 'Например: Сверить координаты с локацией объекта, при отклонении более 300м указывать штраф и замечание'
                              : field.type === 'number'
                              ? 'Например: Проверить, что значение не отрицательное и выполнено не менее 80% дневной нормы (план 25)'
                              : 'Например: Проверить отсутствие отговорок, наличие конкретных фактов, цифр и согласованность с утренним планом'
                          }
                          className={`w-full min-h-[58px] p-3 rounded-xl border text-sm font-medium focus:outline-none resize-y overflow-y-auto leading-relaxed ${
                            isLightTheme ? 'bg-white border-amber-300 text-zinc-900 focus:border-amber-500' : 'bg-[#1A0F02] border-amber-400/50 text-amber-100 focus:border-amber-400'
                          }`}
                        />
                      </div>
                    )}

                    {/* Field Hint */}
                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-70">
                        Подсказка или пояснение для сотрудника:
                      </label>
                      <textarea
                        rows={2}
                        value={field.hint || ''}
                        onChange={(e) => handleUpdateField(idx, { hint: e.target.value })}
                        placeholder="Кратко укажите, что именно ожидается в ответе..."
                        className={`w-full min-h-[56px] px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none resize-y overflow-y-auto leading-relaxed ${
                          isLightTheme
                            ? 'bg-amber-50/50 border-amber-300 text-zinc-900 focus:border-amber-500'
                            : 'bg-[#1A0F02] border-amber-400/40 text-amber-100 focus:border-amber-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add question button */}
            <button
              type="button"
              onClick={handleAddField}
              className={`w-full min-h-[44px] py-2.5 rounded-2xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isLightTheme
                  ? 'border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-100/50 text-amber-950'
                  : 'border-amber-400/40 hover:border-amber-400 bg-amber-400/5 hover:bg-amber-400/10 text-[#F4EE8E]'
              }`}
            >
              <Plus size={18} />
              <span>Добавить пункт в отчет</span>
            </button>
          </div>

          {/* Section 4: System of Review & Scoring (Reviewer Selection) */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
            isLightTheme ? 'bg-amber-50/40 border-amber-300/80' : 'bg-white/5 border-amber-400/30'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className={`font-bold flex items-center gap-2 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                <Shield size={18} className="text-amber-500" />
                <span>Система проверки и оценки отчетов:</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-80">Кто проверяет и оценивает отчет:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCheckerType('ai')}
                  className={`min-h-[44px] p-3.5 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center gap-3 ${
                    checkerType === 'ai'
                      ? (isLightTheme ? 'bg-amber-400 border-amber-500 text-amber-950 font-bold' : 'bg-[#E7C768] border-amber-400 text-amber-950 font-bold')
                      : (isLightTheme ? 'bg-white border-amber-300 text-zinc-800' : 'bg-white/5 border-amber-400/30 text-amber-100')
                  }`}
                >
                  <Bot size={20} className="shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Проверка нейросетью (ИИ)</div>
                    <div className="text-xs font-normal opacity-85">Мгновенный аудит, баллы 1-100 и рекомендации</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckerType('director')}
                  className={`min-h-[44px] p-3.5 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center gap-3 ${
                    checkerType === 'director'
                      ? (isLightTheme ? 'bg-amber-400 border-amber-500 text-amber-950 font-bold' : 'bg-[#E7C768] border-amber-400 text-amber-950 font-bold')
                      : (isLightTheme ? 'bg-white border-amber-300 text-zinc-800' : 'bg-white/5 border-amber-400/30 text-amber-100')
                  }`}
                >
                  <UserCheck size={20} className="shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Проверка руководителем</div>
                    <div className="text-xs font-normal opacity-85">Ручная проверка, комментарий и подтверждение</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Reviewer Selection Dropdown (When Manager/Director Review is selected) */}
            {checkerType === 'director' && (
              <div className={`p-3.5 rounded-xl border space-y-2 ${
                isLightTheme ? 'bg-amber-50/40 border-amber-300/80' : 'bg-white/5 border-amber-400/30'
              }`}>
                <RaportDropdown
                  label="Ответственный проверяющий руководитель:"
                  placeholder="Выберите руководителя для проверки..."
                  value={selectedReviewerId}
                  onChange={(id) => {
                    setSelectedReviewerId(id);
                    const found = dbEmployees.find(emp => emp.id === id);
                    setSelectedReviewerName(found ? found.name : '');
                  }}
                  options={reviewerOptions}
                  isLightTheme={isLightTheme}
                  searchable
                  triggerIcon={<User size={18} className="text-amber-500 shrink-0" />}
                />
                <p className={`text-xs ${isLightTheme ? 'text-zinc-600' : 'text-amber-300/70'}`}>
                  Выбранный руководитель будет получать уведомления о сданных отчетах и подтверждать их
                </p>
              </div>
            )}

            {/* Rules, Criteria & Wishes for AI */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className={`block text-sm font-bold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                  Правила и критерии проверки и оценки отчета для ИИ (пожелания):
                </label>
                <button
                  type="button"
                  onClick={handleAIGenerateCriteria}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLightTheme 
                      ? 'bg-amber-100/70 border-amber-400/70 text-amber-950 hover:bg-amber-200/80 shadow-sm' 
                      : 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E] hover:bg-amber-400/30 shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                  }`}
                >
                  <Sparkles size={16} />
                  <span>Сформулировать с ИИ</span>
                </button>
              </div>
              <AudioField
                value={checkCriteria}
                onChange={setCheckCriteria}
                placeholder="Укажите пожелания руководителя, фокус на цифрах и фактах, а также стандарты для формирования персональных рекомендаций и плана действий..."
                isLightTheme={isLightTheme}
                minHeight="100px"
              />
            </div>
          </div>

          {/* Section 5: AI Retrospective History Depth for Analytics and Action Plan */}
          <div className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
            isLightTheme ? 'bg-amber-50/40 border-amber-300/80' : 'bg-white/5 border-amber-400/30'
          }`}>
            <div className="flex items-center gap-2">
              <History size={18} className="text-amber-500 shrink-0" />
              <h3 className={`text-sm sm:text-base font-bold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                Глубина ретроспективы для аналитики ИИ (прошлые отчеты сотрудника):
              </h3>
            </div>

            <p className={`text-sm leading-relaxed ${isLightTheme ? 'text-amber-950/80' : 'text-stone-300'}`}>
              Выберите количество прошлых отчетов сотрудника из базы данных (от 1 до 5), которые нейросеть проанализирует для оценки динамики, выявления повторяющихся блокеров и формирования мотивирующего плана действий:
            </p>

            {/* Depth Selector Buttons / Bubbles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((depth) => {
                const isSelected = historyDepthForAi === depth;
                return (
                  <button
                    key={depth}
                    type="button"
                    onClick={() => setHistoryDepthForAi(depth)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? isLightTheme
                          ? 'bg-amber-400/80 border-amber-600 text-amber-950 shadow-md font-extrabold'
                          : 'bg-amber-400/30 border-amber-400 text-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.3)]'
                        : isLightTheme
                          ? 'bg-white/60 border-amber-300/70 text-amber-950 hover:bg-amber-100/70'
                          : 'bg-white/5 border-amber-400/30 text-stone-300 hover:border-amber-400/60 hover:text-white'
                    }`}
                  >
                    <span>
                      {depth} {depth === 1 ? 'отчет' : depth < 5 ? 'отчета' : 'отчетов'}
                    </span>
                    {depth === 3 && (
                      <span className="text-[12px] opacity-90 font-normal">
                        рекомендуется
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={`p-3 rounded-xl border text-sm leading-relaxed ${
              isLightTheme ? 'bg-amber-100/50 border-amber-300/70 text-amber-950' : 'bg-white/5 border-amber-400/30 text-amber-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Info size={15} className="text-amber-500 shrink-0" />
                <span>Как это работает:</span>
              </div>
              <p className="text-sm">
                По итогу сдачи отчета ИИ поднимает {historyDepthForAi} прошлых рапортов сотрудника, оценивает прогресс, отмечает успехи для мотивации и формирует конкретный календарный план: на сегодня (утренний отчет), на завтра (вечерний отчет), на следующую неделю (еженедельный) или на месяц (ежемесячный).
              </p>
            </div>
          </div>

          {/* Option: Save to library in Custom Checkbox */}
          <div className="pt-1">
            <CustomCheckbox
              id="save-to-lib-checkbox"
              checked={saveAsLibraryTemplate}
              onChange={setSaveAsLibraryTemplate}
              isLightTheme={isLightTheme}
              label="Сохранить форму как шаблон в базу данных компании для регулярного использования"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isLightTheme ? 'border-amber-300/60 bg-amber-50/50' : 'border-amber-400/30 bg-amber-500/5'
        }`}>
          <div className="flex items-center gap-2">
            {saveSuccessNotice && (
              <span className="text-sm font-bold text-amber-600 dark:text-[#F4EE8E] flex items-center gap-1.5 animate-fade-in">
                <Check size={18} />
                <span>Форма отчета успешно сохранена</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className={`min-h-[44px] px-5 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                isLightTheme
                  ? 'border-amber-300 text-zinc-700 hover:bg-amber-100'
                  : 'border-amber-400/30 text-amber-200 hover:bg-white/10'
              }`}
            >
              Отмена
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className={`min-h-[44px] px-6 py-2.5 rounded-xl border text-sm font-bold shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
                isLightTheme
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:bg-amber-500 border-amber-500 text-amber-950'
                  : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 border-amber-300'
              }`}
            >
              <Check size={18} />
              <span>{editingTemplate ? 'Сохранить изменения' : 'Создать отчет'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal for Question Deletion */}
      <AnimatePresence>
        {fieldToDeleteIdx !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
                isLightTheme
                  ? 'bg-[#FFFBF5] border-amber-400 text-zinc-900'
                  : 'bg-[#140A01] border-amber-400/60 text-white'
              }`}
            >
              <div className="flex items-center gap-3 text-amber-500">
                <AlertTriangle size={24} />
                <h4 className="font-bold text-base">Подтверждение удаления</h4>
              </div>
              <p className="text-sm">
                Вы действительно хотите удалить вопрос: «{fields[fieldToDeleteIdx]?.label}»?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFieldToDeleteIdx(null)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-bold ${
                    isLightTheme ? 'border-amber-300 text-zinc-700' : 'border-amber-400/30 text-amber-200'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteField}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Standard AI Loading Overlay with Golden Mascot & 120s timer */}
      <AiLoadingOverlay
        isOpen={isAiLoading}
        title={aiLoadingTitle}
        subtitle={aiLoadingSubtitle}
        isLightTheme={isLightTheme}
        maxSeconds={120}
        onCancel={() => setIsAiLoading(false)}
      />
    </div>
  );
};

export default CreateReportModal;

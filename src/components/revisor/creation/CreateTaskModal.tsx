import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Sparkles, Plus, Trash2, Check, ArrowUp, ArrowDown, 
  Clock, Users, FileText, Bot, User, CheckSquare, 
  Mic, Type, Hash, Radio, Image as ImageIcon, Camera, 
  Monitor, Video, FileCheck, Headphones, MapPin, ListChecks,
  Sliders, Link2, ExternalLink, Sheet, Presentation, Paperclip,
  ShieldCheck, AlertCircle, HelpCircle
} from 'lucide-react';
import { TASK_FIELD_TYPES, TaskFieldType } from './TaskFieldTypesConfig';
import { TaskFieldItemEditor } from './TaskFieldItemEditor';
import { AudioField } from '../../voice/AudioField';
import { MiniAudioField } from '../../voice/MiniAudioField';
import { AiLoadingOverlay } from '../../common/AiLoadingOverlay';
import { ReportFieldType } from '../../../types';
import { getEffectiveUserId } from '../../../utils/guestUser';
import { TaskProactiveSettingsFields, ProactiveSettingsValue } from '../mentor/TaskProactiveSettingsFields';

export interface TaskCardField {
  id: string;
  label: string;
  type: ReportFieldType;
  required: boolean;
  hint?: string;
  options?: string[];
  aiPrompt?: string;
  ai_check_prompt?: string;
  geoInstructions?: string;
  image_analysis_mode?: 'text' | 'visual_description';
}

// Safe parsers for fields and checklist to prevent non-array strings/objects crashes
export const parseFieldsSafe = (raw: any): TaskCardField[] => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.map((f: any, idx: number) => ({
      id: f?.id || `f_${idx + 1}`,
      label: f?.label || f?.title || f?.text || `Карточка ${idx + 1}`,
      type: (f?.type as ReportFieldType) || 'text_paragraph',
      required: f?.required !== false,
      hint: f?.hint || '',
      options: Array.isArray(f?.options) && f.options.length > 0 ? f.options : undefined,
      aiPrompt: f?.aiPrompt,
      ai_check_prompt: f?.ai_check_prompt || '',
      geoInstructions: f?.geoInstructions,
      image_analysis_mode: f?.image_analysis_mode || 'visual_description'
    }));
  }
  if (typeof parsed === 'object' && parsed !== null) {
    if (Array.isArray(parsed.fields)) {
      return parseFieldsSafe(parsed.fields);
    }
  }
  return [];
};

export const parseChecklistSafe = (raw: any): Array<{ id: string; text: string; done: boolean }> => {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.map((c: any, i: number) => ({
      id: c?.id || `c-${i + 1}`,
      text: c?.text || c?.title || c?.label || `Пункт ${i + 1}`,
      done: Boolean(c?.done)
    }));
  }
  return [];
};

const DEFAULT_TASK_FIELDS: TaskCardField[] = [
  { id: 'f1', label: 'Подтверждение выполнения сути задачи', type: 'text_paragraph', required: true, hint: 'Опишите что было сделано' },
  { id: 'f2', label: 'Скриншот или фотоотчет результата', type: 'screenshot', required: true, hint: 'Загрузите скриншот или снимок экрана', image_analysis_mode: 'visual_description' },
  { id: 'f3', label: 'Голосовой комментарий исполнителя', type: 'voice', required: false, hint: 'Краткое аудиосообщение по итогам работы' }
];

const DEFAULT_CHECKLIST = [
  { id: 'c-1', text: 'Ознакомиться с регламентом задачи', done: false },
  { id: 'c-2', text: 'Выполнить работы в полном объеме', done: false }
];

export interface RevisorTaskData {
  id?: string;
  projectId: string;
  projectTitle?: string;
  taskTitle: string;
  description: string;
  executorId: string;
  executorName: string;
  executorRole?: string;
  deadlineDays: number;
  priority: 'high' | 'medium' | 'low';
  budget?: number;
  verifyMethod?: 'ai' | 'manager' | 'hybrid';
  fields: TaskCardField[];
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  checkCriteria: string;
  minScore?: number;
  status?: 'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed';
  autonomy_mode?: 'observer' | 'controller' | 'autopilot';
  check_cadence?: 'every_2h' | 'every_4h' | 'twice_daily' | 'daily' | 'before_deadline' | 'custom_cron';
  deadline_time?: string;
  reminder_days_before?: number;
  reminder_minutes?: number;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Array<{ id: string; title: string }>;
  employees: Array<{ id: string; name: string; role?: string; position?: string }>;
  currentProjectId?: string;
  editingTask?: RevisorTaskData | null;
  onSaveTask: (task: RevisorTaskData) => Promise<void> | void;
  isDark?: boolean;
  currentUser?: any;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  projects = [],
  employees = [],
  currentProjectId,
  editingTask = null,
  onSaveTask,
  isDark = true,
  currentUser
}) => {
  if (!isOpen) return null;

  const effectiveUserId = (currentUser as any)?.uid || (currentUser?.id && /^\d+$/.test(currentUser.id) ? currentUser.id : getEffectiveUserId());

  // Active step in modal
  const [activeStep, setActiveStep] = useState<'params' | 'cards' | 'criteria'>('params');

  // AI Generation States
  const [aiVoicePrompt, setAiVoicePrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiQuestionsLoading, setIsAiQuestionsLoading] = useState(false);
  const [aiLoadingTitle, setAiLoadingTitle] = useState('ИИ Ревизор RR формирует задачу');
  const [aiLoadingSubtitle, setAiLoadingSubtitle] = useState('Нейросеть RR создает регламент, чек-лист и 20 типов карточек проверки...');

  // Form states
  const [projectId, setProjectId] = useState<string>(() => {
    if (editingTask?.projectId) return editingTask.projectId;
    if (currentProjectId && currentProjectId !== 'all') return currentProjectId;
    return projects[0]?.id || '';
  });

  const [companyEmployees, setCompanyEmployees] = useState<Array<{ id: string; name: string; role?: string; position?: string }>>([]);

  useEffect(() => {
    if (!isOpen) return;
    const compId = currentUser?.company_id || currentUser?.company || (editingTask as any)?.company_id || '';
    const dirId = currentUser?.role === 'DIRECTOR' ? currentUser?.id : (currentUser?.director_id || '');
    const q = new URLSearchParams();
    if (compId) q.set('company_id', compId);
    if (dirId) q.set('director_id', dirId);

    fetch(`/api/employees?${q.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.employees) && data.employees.length > 0) {
          setCompanyEmployees(data.employees.map((e: any) => ({
            id: String(e.id),
            name: e.name || 'Сотрудник',
            role: e.role || 'EMPLOYEE',
            position: e.position || ''
          })));
        }
      })
      .catch(err => console.error('Failed to fetch company employees in CreateTaskModal:', err));
  }, [isOpen, currentUser?.id, (currentUser as any)?.company_id]);

  const availableEmployees = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; role?: string; position?: string }>();
    employees.forEach(e => { if (e && e.id) map.set(String(e.id), e); });
    companyEmployees.forEach(e => { if (e && e.id) map.set(String(e.id), e); });
    if (editingTask?.executorId && !map.has(String(editingTask.executorId))) {
      map.set(String(editingTask.executorId), {
        id: String(editingTask.executorId),
        name: editingTask.executorName || 'Исполнитель',
        role: editingTask.executorRole || 'Сотрудник'
      });
    }
    return Array.from(map.values());
  }, [employees, companyEmployees, editingTask]);

  const [taskTitle, setTaskTitle] = useState(editingTask?.taskTitle || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [executorId, setExecutorId] = useState(editingTask?.executorId || (employees[0]?.id || ''));
  const [deadlineDays, setDeadlineDays] = useState<number>(editingTask?.deadlineDays || 3);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(editingTask?.priority || 'medium');
  const [budget, setBudget] = useState<string>(editingTask?.budget ? String(editingTask.budget) : '');
  const [verifyMethod, setVerifyMethod] = useState<'ai' | 'manager' | 'hybrid'>(editingTask?.verifyMethod || 'hybrid');
  const [checklist, setChecklist] = useState<Array<{ id: string; text: string; done: boolean }>>(() => {
    const parsed = parseChecklistSafe(editingTask?.checklist);
    return parsed.length > 0 ? parsed : DEFAULT_CHECKLIST;
  });

  // Cards & Fields
  const [fields, setFields] = useState<TaskCardField[]>(() => {
    const parsed = parseFieldsSafe(editingTask?.fields);
    return parsed.length > 0 ? parsed : DEFAULT_TASK_FIELDS;
  });

  // Criteria
  const [checkCriteria, setCheckCriteria] = useState(
    editingTask?.checkCriteria ||
    'Оценивать полноту выполнения поставленной задачи по шкале 1-100. Проверять соответствие предоставленных отчетов и скриншотов регламенту, снижать баллы за пропущенные обязательные поля и размытые ответы.'
  );
  const [minScore, setMinScore] = useState<string>(editingTask?.minScore ? String(editingTask.minScore) : '80');
  const [proactiveSettings, setProactiveSettings] = useState<ProactiveSettingsValue>({
    autonomyMode: editingTask?.autonomy_mode || 'controller',
    checkCadence: editingTask?.check_cadence || 'daily',
    deadlineTime: editingTask?.deadline_time || '18:00',
    reminderDaysBefore: editingTask?.reminder_days_before ?? 1,
    reminderMinutes: editingTask?.reminder_minutes ?? 60
  });

  // Sync when editingTask changes, but only when ID or open state changes to prevent wiping user's typing
  const syncedTaskIdRef = useRef<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  const hasUserModifiedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      syncedTaskIdRef.current = null;
      wasOpenRef.current = false;
      hasUserModifiedRef.current = false;
      return;
    }

    const currentId = editingTask?.id || 'new-task';
    const isFirstOpen = !wasOpenRef.current;
    wasOpenRef.current = true;

    // Only sync if this is the initial opening of the modal, or a completely different task was opened
    if (isFirstOpen || (syncedTaskIdRef.current !== currentId && !hasUserModifiedRef.current)) {
      syncedTaskIdRef.current = currentId;
      if (editingTask) {
        if (editingTask.projectId) setProjectId(editingTask.projectId);
        setTaskTitle(editingTask.taskTitle || '');
        setDescription(editingTask.description || '');
        if (editingTask.executorId) setExecutorId(editingTask.executorId);
        if (editingTask.deadlineDays) setDeadlineDays(editingTask.deadlineDays);
        if (editingTask.priority) setPriority(editingTask.priority);
        if (editingTask.budget !== undefined) setBudget(String(editingTask.budget));
        if (editingTask.verifyMethod) setVerifyMethod(editingTask.verifyMethod);

        const parsedChecklist = parseChecklistSafe(editingTask.checklist);
        if (parsedChecklist.length > 0) setChecklist(parsedChecklist);

        const parsedFields = parseFieldsSafe(editingTask.fields);
        if (parsedFields.length > 0) setFields(parsedFields);

        if (editingTask.checkCriteria) setCheckCriteria(editingTask.checkCriteria);
        if (editingTask.minScore !== undefined) setMinScore(String(editingTask.minScore));
      }
    }
  }, [isOpen, editingTask?.id]);

  // Handle AI Auto-generation of Task from Voice Prompt with RR & AiLoadingOverlay
  const handleGenerateWithAi = async () => {
    if (!aiVoicePrompt.trim()) return;
    setIsAiGenerating(true);
    setIsAiQuestionsLoading(true);
    setAiLoadingTitle('ИИ Ревизор RR формирует задачу');
    setAiLoadingSubtitle('Нейросеть RR создает регламент, чек-лист и 20 типов карточек проверки...');

    try {
      const selectedProjectTitle = projects.find(p => p.id === projectId)?.title || 'Текущий проект';
      let parsed: any = null;

      // 1. Try /api/protalk/generate
      try {
        const pRes = await fetch('/api/protalk/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'task',
            prompt: aiVoicePrompt.trim(),
            autofillData: aiVoicePrompt.trim(),
            projectId,
            userId: effectiveUserId,
            companyContext: `Проект: "${selectedProjectTitle}". Назначение задачи по диктовке: "${aiVoicePrompt.trim()}"`
          })
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && pData.data) {
            parsed = pData.data;
          }
        }
      } catch (err) {
        console.warn('RR direct generation error, falling back to /api/ai/generate:', err);
      }

      // 2. Fallback to /api/ai/generate if not parsed
      if (!parsed) {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Вы — профессиональный операционный директор и ИИ Ревизор RR.
Сформируйте задачу по диктовке руководителя: "${aiVoicePrompt.trim()}".
Проект: "${selectedProjectTitle}".
Список доступных сотрудников: ${JSON.stringify(availableEmployees.map(e => ({ id: e.id, name: e.name, role: e.role })))}.

Доступные 20 типов карточек:
1. voice (Голосовой отчет)
2. text_short (Короткий текст)
3. text_paragraph (Развернутый комментарий)
4. number (Числовой показатель)
5. multiple_choice (Чекбоксы)
6. single_choice (Одиночный выбор)
7. checkbox (Да/Нет)
8. photo (Фото из галереи)
9. camera_photo (Фото с камеры)
10. screenshot (Скриншот экрана)
11. video (Видеозапись)
12. camera_video (Видео с камеры)
13. pdf (PDF документ)
14. table (Таблица Excel/Sheets)
15. document (Документ Word/Docs)
16. presentation (Презентация)
17. audio (Аудиофайл)
18. file (Универсальный файл)
19. google_drive (Google Диск)
20. geolocation (GPS координаты)
21. url (Ссылка)

Верните строго валидный JSON без markdown:
{
  "taskTitle": "емкое название до 20 символов",
  "description": "подробный регламент и ожидаемый результат",
  "deadlineDays": 3,
  "priority": "high",
  "executorId": "${availableEmployees[0]?.id || 'emp-1'}",
  "verifyMethod": "hybrid",
  "checklist": [
    { "id": "c-1", "text": "Шаг 1 регламента", "done": false },
    { "id": "c-2", "text": "Шаг 2 регламента", "done": false }
  ],
  "fields": [
    { "id": "f1", "label": "Подтверждение выполнения", "type": "text_paragraph", "required": true, "hint": "Опишите результат", "ai_check_prompt": "Проверить соответствие регламенту" },
    { "id": "f2", "label": "Скриншот или фото", "type": "screenshot", "required": true, "hint": "Прикрепите снимок экрана", "ai_check_prompt": "Проверить наличие ключевых элементов" }
  ],
  "checkCriteria": "Критерии оценки отчета для ИИ Ревизора по шкале 1-100"
}`
          })
        });
        const data = await res.json();
        if (res.ok && data.text) {
          const jsonMatch = data.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        }
      }

      if (parsed) {
        if (parsed.taskTitle || parsed.title) setTaskTitle((parsed.taskTitle || parsed.title).slice(0, 20));
        if (parsed.description) setDescription(parsed.description);
        if (parsed.deadlineDays) setDeadlineDays(Number(parsed.deadlineDays));
        if (parsed.priority) setPriority(parsed.priority);
        if (parsed.verifyMethod) setVerifyMethod(parsed.verifyMethod);

        if (parsed.executorId) {
          const matched = availableEmployees.find(e => e.id === parsed.executorId || (parsed.executorName && e.name.toLowerCase().includes(parsed.executorName.toLowerCase())));
          if (matched) setExecutorId(matched.id);
        }

        if (Array.isArray(parsed.fields) && parsed.fields.length > 0) {
          setFields(parsed.fields.map((f: any, idx: number) => ({
            id: f.id || `f_${idx + 1}`,
            label: f.label || `Карточка ${idx + 1}`,
            type: (f.type as ReportFieldType) || 'text_paragraph',
            required: Boolean(f.required),
            hint: f.hint || '',
            ai_check_prompt: f.ai_check_prompt || '',
            options: Array.isArray(f.options) && f.options.length > 0 ? f.options : (f.type === 'single_choice' || f.type === 'multiple_choice' ? ['Вариант 1', 'Вариант 2', 'Вариант 3'] : undefined)
          })));
        }

        if (Array.isArray(parsed.checklist) && parsed.checklist.length > 0) {
          setChecklist(parsed.checklist.map((c: any, i: number) => ({
            id: c.id || `c-${i + 1}`,
            text: c.text || `Шаг ${i + 1}`,
            done: Boolean(c.done)
          })));
        }

        if (parsed.checkCriteria) setCheckCriteria(parsed.checkCriteria);

        // Switch to cards step so manager sees the result immediately
        setActiveStep('cards');
      }
    } catch (e) {
      console.error('Error generating task with RR AI:', e);
    } finally {
      setIsAiGenerating(false);
      setIsAiQuestionsLoading(false);
    }
  };

  // AI Generate question cards for existing task title / description
  const handleAIGenerateCards = async () => {
    setIsAiQuestionsLoading(true);
    setAiLoadingTitle('ИИ-генерация карточек задачи');
    setAiLoadingSubtitle('Нейросеть RR подбирает типы полей, вопросы и критерии...');

    try {
      const selectedProjectTitle = projects.find(p => p.id === projectId)?.title || 'Проект';
      let parsedCards: any = null;

      try {
        const pRes = await fetch('/api/protalk/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'task',
            prompt: `Сгенерируй от 3 до 6 разнообразных карточек подтверждения для задачи «${taskTitle || 'Новая задача'}». Проект: «${selectedProjectTitle}». Описание: «${description || 'Выполнить регламент'}». Выбери наиболее подходящие из 20 доступных типов подтверждений.`,
            userId: effectiveUserId,
            projectId
          })
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && pData.data && Array.isArray(pData.data.fields)) {
            parsedCards = pData.data;
          }
        }
      } catch (err) {
        console.warn('RR cards generation fallback:', err);
      }

      if (!parsedCards) {
        const promptText = `Сгенерируй 4-6 структурированных карточек для проверки задачи сотрудника из 20 доступных типов.
Название задачи: "${taskTitle || 'Новая задача'}"
Проект: "${selectedProjectTitle}"
Описание и цель: "${description || 'Выполнить регламент'}"

Доступные 20 типов полей:
- voice (Голосовой отчет)
- text_short (Короткий текст)
- text_paragraph (Развернутый текст)
- number (Число)
- checkbox (Да/Нет)
- multiple_choice (Несколько вариантов)
- single_choice (Один из списка)
- screenshot (Скриншот экрана)
- photo (Фото из галереи)
- camera_photo (Фото с камеры)
- video (Видеозапись)
- camera_video (Видео с камеры)
- pdf (PDF документ)
- table (Excel / CSV)
- document (Word / Документ)
- presentation (Презентация)
- audio (Аудиофайл)
- file (Универсальный файл)
- google_drive (Google Диск)
- geolocation (GPS координаты)
- url (Ссылка на ресурс)

Верни JSON строго формата:
{
  "fields": [
    {
      "label": "Формулировка вопроса или требования",
      "type": "screenshot",
      "required": true,
      "hint": "Краткая подсказка сотруднику",
      "ai_check_prompt": "Критерий для ИИ: что именно проверять",
      "options": ["Вариант 1", "Вариант 2"]
    }
  ]
}`;

        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText, format: 'json' })
        });
        const data = await res.json();
        if (res.ok && (data.text || data.result)) {
          const raw = data.text || data.result;
          const jsonMatch = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
          parsedCards = jsonMatch ? JSON.parse(jsonMatch[0]) : raw;
        }
      }

      const rawList = Array.isArray(parsedCards) ? parsedCards : (Array.isArray(parsedCards?.fields) ? parsedCards.fields : null);
      if (rawList && rawList.length > 0) {
        const mapped: TaskCardField[] = rawList.map((f: any, idx: number) => ({
          id: f.id || `f_${Date.now()}_${idx + 1}`,
          label: f.label || `Пункт ${idx + 1}`,
          type: (f.type as ReportFieldType) || 'text_paragraph',
          required: f.required !== false,
          hint: f.hint || '',
          ai_check_prompt: f.ai_check_prompt || '',
          options: Array.isArray(f.options) && f.options.length > 0 ? f.options : (f.type === 'single_choice' || f.type === 'multiple_choice' ? ['Вариант 1', 'Вариант 2', 'Вариант 3'] : undefined)
        }));
        setFields(mapped);
        setActiveStep('cards');
      }
    } catch (err) {
      console.error('Ошибка ИИ генерации карточек:', err);
    } finally {
      setIsAiQuestionsLoading(false);
    }
  };

  const safeFields = Array.isArray(fields) ? fields : parseFieldsSafe(fields);
  const safeChecklist = Array.isArray(checklist) ? checklist : parseChecklistSafe(checklist);

  const handleAddField = (type: ReportFieldType = 'text_paragraph') => {
    const newField: TaskCardField = {
      id: `f_${Date.now()}`,
      label: 'Новый пункт проверки',
      type,
      required: true,
      hint: '',
      image_analysis_mode: 'visual_description'
    };
    setFields([...safeFields, newField]);
  };

  const handleRemoveField = (index: number) => {
    setFields(safeFields.filter((_, idx) => idx !== index));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= safeFields.length) return;
    const updated = [...safeFields];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setFields(updated);
  };

  // Submit and launch cascade creation overlay
  const handleSubmitTask = () => {
    if (!taskTitle.trim()) {
      setActiveStep('params');
      return;
    }

    const matchedProject = projects.find(p => p.id === projectId);
    const matchedEmployee = availableEmployees.find(e => e.id === executorId);

    const taskPayload: RevisorTaskData = {
      id: editingTask?.id || `task_${Date.now()}`,
      projectId: projectId || projects[0]?.id || '',
      projectTitle: matchedProject?.title || 'Проект',
      taskTitle: taskTitle.trim(),
      description: description.trim(),
      executorId: executorId || availableEmployees[0]?.id || '',
      executorName: matchedEmployee?.name || 'Исполнитель',
      executorRole: matchedEmployee?.role || matchedEmployee?.position || 'Сотрудник',
      deadlineDays,
      priority,
      budget: budget ? Number(budget) : undefined,
      verifyMethod,
      checklist: safeChecklist,
      fields: safeFields,
      checkCriteria,
      minScore: minScore ? Number(minScore) : 80,
      status: editingTask?.status || 'pending',
      autonomy_mode: proactiveSettings.autonomyMode,
      check_cadence: proactiveSettings.checkCadence,
      deadline_time: proactiveSettings.deadlineTime || '18:00',
      reminder_days_before: proactiveSettings.reminderDaysBefore ?? 1,
      reminder_minutes: proactiveSettings.reminderMinutes ?? 60
    };

    // Direct save without cascade overlay (cascade creation is for projects, each task as a step)
    onSaveTask(taskPayload);
    onClose();
  };

  const selectedEmployeeObj = availableEmployees.find(e => e.id === executorId);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className={`w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border p-5 sm:p-7 shadow-2xl transition-all ${
        isDark
          ? 'bg-[#1A0F02]/95 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_40px_rgba(244,238,142,0.2)]'
          : 'bg-[#FAF6EC]/95 border-[#B8860B]/40 text-amber-950 shadow-2xl'
      }`}>
        {/* Top Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-5 border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-[#E7C768]">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#E7C768]">
                {editingTask ? 'Редактирование задачи' : 'Создание задачи Ревизора'}
              </h3>
              <p className="text-sm opacity-80">
                20 типов карточек подтверждения, ИИ-автозаполнение и регламент
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* AI Voice Prompt Assistant Bar with RR & AudioField */}
        <div className={`p-4 rounded-2xl border mb-5 space-y-3 transition-all ${
          isDark 
            ? 'bg-[#140A01]/85 border-amber-400/50 shadow-[0_0_25px_rgba(244,238,142,0.15)] text-[#F4EE8E]' 
            : 'bg-[#FFFBF5]/90 border-amber-500/30 text-amber-950 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-[#E7C768]">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="text-sm sm:text-base font-bold text-[#E7C768]">
                  ИИ-автозаполнение полей через RR
                </span>
                <p className="text-xs opacity-80">
                  Надиктуйте суть задачи — нейросеть заполнит параметры и подберет карточки из 20 типов
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={isAiGenerating || !aiVoicePrompt.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shadow-md shrink-0"
            >
              <Sparkles size={15} />
              <span>{isAiGenerating ? 'Генерация...' : 'Запустить автозаполнение RR'}</span>
            </button>
          </div>
          <AudioField
            value={aiVoicePrompt}
            onChange={setAiVoicePrompt}
            placeholder="Например: Проверить чистоту торгового зала, прикрепить 3 фото выкладки, сверить кассовый отчет и записать аудиокомментарий..."
            isLightTheme={!isDark}
            onAction={handleGenerateWithAi}
            actionLabel={isAiGenerating ? 'Генерация...' : 'Запустить автозаполнение'}
            actionDisabled={isAiGenerating || !aiVoicePrompt.trim()}
          />
        </div>

        {/* Wizard Steps Tabs */}
        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveStep('params')}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStep === 'params'
                ? 'bg-amber-500/25 border border-amber-500/40 text-[#E7C768]'
                : 'opacity-70 hover:bg-amber-500/10'
            }`}
          >
            <span>1. Параметры задачи</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('cards')}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStep === 'cards'
                ? 'bg-amber-500/25 border border-amber-500/40 text-[#E7C768]'
                : 'opacity-70 hover:bg-amber-500/10'
            }`}
          >
            <span>2. Карточки проверки ({safeFields.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('criteria')}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeStep === 'criteria'
                ? 'bg-amber-500/25 border border-amber-500/40 text-[#E7C768]'
                : 'opacity-70 hover:bg-amber-500/10'
            }`}
          >
            <span>3. Проверка и критерии ИИ</span>
          </button>
        </div>

        {/* STEP 1: PARAMS */}
        {activeStep === 'params' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Проект</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Ответственный исполнитель</label>
                <select
                  value={executorId}
                  onChange={(e) => setExecutorId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                >
                  {availableEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role || e.position || 'сотрудник'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Название задачи *</label>
              <MiniAudioField
                value={taskTitle}
                onChange={setTaskTitle}
                placeholder="Например: Аудит выкладки товара и проверка кассовой дисциплины"
                multiline={true}
                rows={2}
                resizable={true}
                isLightTheme={!isDark}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Подробное описание и цель задачи</label>
              <MiniAudioField
                value={description}
                onChange={setDescription}
                placeholder="Что должен сделать сотрудник, какие регламенты соблюсти..."
                multiline={true}
                rows={3}
                resizable={true}
                isLightTheme={!isDark}
              />
            </div>

            {/* Verification method selection */}
            <div className={`p-3.5 rounded-2xl border space-y-2 ${
              isDark ? 'bg-[#140A01]/70 border-amber-500/30' : 'bg-white/70 border-amber-500/20'
            }`}>
              <label className="block text-sm font-bold text-[#E7C768]">
                Кем проверяется задача при сдаче:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyMethod('hybrid')}
                  className={`p-2.5 rounded-xl border text-sm font-bold text-left transition-all cursor-pointer ${
                    verifyMethod === 'hybrid'
                      ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                      : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    <span>ИИ + Руководитель</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">Нейросеть готовит черновик, руководитель утверждает</div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerifyMethod('manager')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    verifyMethod === 'manager'
                      ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                      : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <User size={14} />
                    <span>Только руководитель</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">Ручная проверка и выставление оценки менеджером</div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerifyMethod('ai')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    verifyMethod === 'ai'
                      ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                      : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>Только ИИ-Ревизор</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">Автоматическая проверка нейросетью без участия человека</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Срок выполнения (дней)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value))}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Приоритет задачи</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-[#1A0F02] border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                >
                  <option value="high">Высокий (срочно)</option>
                  <option value="medium">Средний (стандартно)</option>
                  <option value="low">Низкий (фоновая)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Бюджет / ставка (₽, опц.)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="5000"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                  }`}
                />
              </div>
            </div>

            <TaskProactiveSettingsFields
              value={proactiveSettings}
              onChange={setProactiveSettings}
              isDark={isDark}
            />
          </div>
        )}

        {/* STEP 2: CARDS & 20 FIELD TYPES */}
        {activeStep === 'cards' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-sm font-bold text-[#E7C768]">
                Карточки, которые исполнитель заполняет для отчета ({safeFields.length}):
              </span>

              <div className="flex items-center gap-2">
                {/* AI Question Cards Generation Button with AiLoadingOverlay */}
                <button
                  type="button"
                  onClick={handleAIGenerateCards}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:brightness-105 cursor-pointer shadow-md"
                  title="Нейросеть сгенерирует карточки под цель задачи"
                >
                  <Sparkles size={15} />
                  <span>ИИ-генерация карточек</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddField('text_paragraph')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold flex items-center gap-1.5 cursor-pointer hover:brightness-105 shadow-sm"
                >
                  <Plus size={16} />
                  <span>Добавить карточку</span>
                </button>
              </div>
            </div>

            {/* Quick Add Bar for Most Popular of the 20 Field Types */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <span className="text-sm font-bold opacity-75 mr-1">Быстрое добавление:</span>
              {[
                { type: 'voice', label: '🎤 Голос' },
                { type: 'text_paragraph', label: '📝 Комментарий' },
                { type: 'text_short', label: '📄 Краткий текст' },
                { type: 'number', label: '🔢 Число' },
                { type: 'checkbox', label: '✅ Чекбокс' },
                { type: 'single_choice', label: '🔘 Выбор' },
                { type: 'camera_photo', label: '📷 Фото камеры' },
                { type: 'screenshot', label: '🖥️ Скриншот' },
                { type: 'table', label: '📊 Таблица' },
                { type: 'pdf', label: '📑 PDF' },
                { type: 'geolocation', label: '📍 GPS' },
                { type: 'url', label: '🔗 Ссылка' }
              ].map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddField(item.type as any)}
                  className="px-2.5 py-1 rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-[#E7C768] text-sm font-semibold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {safeFields.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-2xl border-amber-500/30 text-sm opacity-75">
                Карточки еще не добавлены. Нажмите «ИИ-генерация карточек» или кнопки быстрого добавления выше.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                {safeFields.map((f, idx) => (
                  <TaskFieldItemEditor
                    key={f.id}
                    field={f}
                    index={idx}
                    totalFields={safeFields.length}
                    onUpdate={(updated) => {
                      hasUserModifiedRef.current = true;
                      const updatedFields = [...safeFields];
                      updatedFields[idx] = { ...updatedFields[idx], ...updated };
                      setFields(updatedFields);
                    }}
                    onMove={(dir) => handleMoveField(idx, dir)}
                    onRemove={() => handleRemoveField(idx)}
                    onDuplicate={() => {
                      const updatedFields = [...safeFields];
                      const dup: TaskCardField = {
                        ...f,
                        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        label: `${f.label} (копия)`
                      };
                      updatedFields.splice(idx + 1, 0, dup);
                      setFields(updatedFields);
                    }}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CRITERIA */}
        {activeStep === 'criteria' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#E7C768]">
                Критерии проверки ИИ Ревизором (Промпт инспектора)
              </label>
              <MiniAudioField
                value={checkCriteria}
                onChange={setCheckCriteria}
                placeholder="Опишите регламент и критерии для оценки качества выполнения..."
                multiline={true}
                rows={3}
                resizable={true}
                isLightTheme={!isDark}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">
                Минимальный проходной балл (из 100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className={`w-full sm:w-48 px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                  isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                }`}
              />
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 pt-5 border-t border-amber-500/20 mt-6">
          <div>
            {activeStep !== 'params' ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === 'criteria' ? 'cards' : 'params')}
                className="px-4 py-2.5 rounded-xl border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/10 cursor-pointer"
              >
                Назад
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/10 cursor-pointer"
              >
                Отмена
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeStep !== 'criteria' ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep === 'params' ? 'cards' : 'criteria')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 cursor-pointer shadow-md"
              >
                Далее
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitTask}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 cursor-pointer shadow-lg flex items-center gap-2"
              >
                <Sparkles size={16} />
                <span>{editingTask ? 'Сохранить изменения' : 'Сохранить задачу в базе'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI LOADING OVERLAY FOR QUESTION CARDS GENERATION */}
      <AiLoadingOverlay
        isOpen={isAiQuestionsLoading || isAiGenerating}
        title={aiLoadingTitle}
        subtitle={aiLoadingSubtitle}
        isLightTheme={!isDark}
        maxSeconds={120}
      />
    </div>,
    document.body
  );
};

export default CreateTaskModal;

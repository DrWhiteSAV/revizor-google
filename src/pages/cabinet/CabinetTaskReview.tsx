import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, CheckCircle2, User, Building2, Calendar, Clock, 
  Sparkles, Bot, Edit3, Send, Check, AlertCircle, RefreshCw, 
  FileText, Image as ImageIcon, Volume2, Play, Pause, ChevronDown, 
  ChevronUp, ExternalLink, Shield, ThumbsUp, Rocket, AlertTriangle, 
  X, CheckCheck, Paperclip, Download, Info, MessageSquare, ListChecks,
  MapPin, Link2, Sheet, Presentation, Video, Camera, Headphones,
  Sliders, Star
} from 'lucide-react';
import { UserProfile, NotificationItem } from '../../types';
import { MiniAudioField } from '../../components/voice/MiniAudioField';
import { TaskSaturnBackground } from '../../components/revisor/review/TaskSaturnBackground';

interface CabinetTaskReviewProps {
  taskId?: string;
  currentUser: UserProfile | null;
  employees?: UserProfile[];
  onNavigate?: (path: string) => void;
  theme?: 'dark' | 'light';
  currentPath?: string;
}

type ReviewMode = 'manual' | 'hybrid' | 'auto_ai';

interface ReviewTaskItem {
  id: string;
  title: string;
  projectId?: string;
  projectTitle?: string;
  executorId?: string;
  executorName?: string;
  executorRole?: string;
  status: string;
  priority?: string;
  deadLine?: string;
  score?: number;
  description?: string;
  checklist?: Array<{ id: string; text: string; completed?: boolean }>;
  fields?: Array<{ id: string; label: string; type: string; hint?: string; required?: boolean }>;
  answers?: Record<string, any>;
  attachments?: any[];
  check_criteria?: string;
  submission_status?: string;
  submitted_at?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  review_comment?: string;
}

export default function CabinetTaskReview({
  taskId: propTaskId,
  currentUser,
  employees = [],
  onNavigate,
  theme = 'dark',
  currentPath
}: CabinetTaskReviewProps) {
  const isDark = theme === 'dark';

  // Extract task ID from prop, currentPath or query params
  const activeTaskId = useMemo(() => {
    if (propTaskId) return propTaskId;
    const match = currentPath?.match(/\/cabinet\/revisor\/review\/([^\/\?]+)/);
    if (match && match[1]) return match[1];
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const qId = sp.get('taskId');
      if (qId) return qId;
    }
    return '';
  }, [propTaskId, currentPath]);

  // Tasks list state
  const [tasks, setTasks] = useState<ReviewTaskItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(activeTaskId);
  const [task, setTask] = useState<ReviewTaskItem | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter for tasks list
  const [listFilter, setListFilter] = useState<'verification' | 'all' | 'completed'>('verification');

  // Review Mode: 'manual' | 'hybrid' | 'auto_ai'
  const [reviewMode, setReviewMode] = useState<ReviewMode>('hybrid');

  // Review Form States
  const [reviewScore, setReviewScore] = useState<number>(90);
  const [managerReaction, setManagerReaction] = useState<string>('👍 Принято');
  const [managerComment, setManagerComment] = useState<string>('');
  const [managerTask, setManagerTask] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessNotice, setReviewSuccessNotice] = useState<string | null>(null);
  const [reviewErrorNotice, setReviewErrorNotice] = useState<string | null>(null);

  // AI draft evaluation state
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState<boolean>(false);
  const [aiDraftNotice, setAiDraftNotice] = useState<string | null>(null);
  const [aiAnalysisSummary, setAiAnalysisSummary] = useState<string | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Load list of tasks from server
  const loadTasksList = async () => {
    setIsLoadingList(true);
    try {
      const companyId = currentUser?.company_id || (currentUser as any)?.company || '';
      const url = `/api/tasks?company_id=${encodeURIComponent(companyId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.tasks) ? data.tasks : []);
        setTasks(list);
        if (!selectedTaskId && list.length > 0) {
          const onVerification = list.find((t: any) => t.status === 'verification' || t.submission_status === 'submitted');
          setSelectedTaskId(onVerification?.id || list[0].id);
        }
      }
    } catch (err) {
      console.warn('Не удалось загрузить задачи для проверки:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadTasksList();
  }, [currentUser?.company_id]);

  // Sync selectedTaskId when URL changes
  useEffect(() => {
    if (activeTaskId && activeTaskId !== selectedTaskId) {
      setSelectedTaskId(activeTaskId);
    }
  }, [activeTaskId]);

  // Fetch full details of selected task
  useEffect(() => {
    if (!selectedTaskId) {
      setTask(null);
      return;
    }

    setIsLoadingTask(true);
    setFetchError(null);
    setReviewSuccessNotice(null);
    setAiAnalysisSummary(null);

    fetch(`/api/tasks/${encodeURIComponent(selectedTaskId)}`)
      .then(r => {
        if (!r.ok) throw new Error('Задача не найдена в базе данных');
        return r.json();
      })
      .then(data => {
        const t = data.task || data;
        let parsedFields: any[] = [];
        let parsedAnswers: any = {};
        let parsedChecklist: any[] = [];

        if (t.fields) {
          try {
            parsedFields = typeof t.fields === 'string' ? JSON.parse(t.fields) : t.fields;
          } catch {
            parsedFields = [];
          }
        }
        if (t.answers) {
          try {
            parsedAnswers = typeof t.answers === 'string' ? JSON.parse(t.answers) : t.answers;
          } catch {
            parsedAnswers = {};
          }
        }
        if (t.checklist) {
          try {
            parsedChecklist = typeof t.checklist === 'string' ? JSON.parse(t.checklist) : t.checklist;
          } catch {
            parsedChecklist = [];
          }
        }

        const normalized: ReviewTaskItem = {
          ...t,
          title: t.title || t.taskTitle || `Задача #${t.id}`,
          fields: Array.isArray(parsedFields) && parsedFields.length > 0 ? parsedFields : [
            { id: 'f-voice', label: 'Голосовой отчет', type: 'voice' },
            { id: 'f-text-short', label: 'Краткий итог', type: 'text_short' },
            { id: 'f-screenshot', label: 'Скриншот или фото', type: 'screenshot' }
          ],
          answers: parsedAnswers || {},
          checklist: Array.isArray(parsedChecklist) ? parsedChecklist : []
        };

        setTask(normalized);
        setReviewScore(normalized.score || 90);
        if (normalized.review_comment) {
          setManagerComment(normalized.review_comment);
        } else {
          setManagerComment('Задача выполнена в полном объеме, подтверждения соответствуют регламенту.');
        }
      })
      .catch(err => {
        console.error('Ошибка загрузки задачи:', err);
        setFetchError('Не удалось загрузить данные задачи из базы');
      })
      .finally(() => setIsLoadingTask(false));
  }, [selectedTaskId]);

  // AI assessment trigger
  const handleRunAiEvaluation = async () => {
    if (!task) return;
    setIsGeneratingAiDraft(true);
    setAiDraftNotice('ИИ Ревизор ProTalk анализирует подтверждения...');
    try {
      const prompt = `Вы — ИИ Ревизор ProTalk. Проведите экспертную оценку выполнения задачи «${task.title}».
Исполнитель: ${task.executorName || 'Сотрудник'}
Регламент задачи: ${task.description || 'Не указан'}
Критерии проверки: ${task.check_criteria || 'Оценка полноты выполнения 1-100'}
Чек-лист: ${JSON.stringify(task.checklist || [])}
Ответы и подтверждения сотрудника: ${JSON.stringify(task.answers || {})}

Верните JSON объект:
{
  "score": 92,
  "verdict": "👍 Принято",
  "aiSummary": "Анализ подтверждений и соблюдения регламента",
  "comment": "Текст рекомендации руководителя",
  "nextTask": "Следующее действие"
}`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, format: 'json' })
      });

      if (res.ok) {
        const data = await res.json();
        let parsed: any = null;
        if (data.success && data.result) {
          parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        }
        if (parsed) {
          if (parsed.score) setReviewScore(Number(parsed.score));
          if (parsed.verdict) setManagerReaction(parsed.verdict);
          if (parsed.comment) setManagerComment(parsed.comment);
          if (parsed.nextTask) setManagerTask(parsed.nextTask);
          if (parsed.aiSummary) setAiAnalysisSummary(parsed.aiSummary);
          setAiDraftNotice('ИИ-проверка завершена, данные подставлены в форму');
          setTimeout(() => setAiDraftNotice(null), 4000);
        }
      }
    } catch (e) {
      console.warn('AI evaluation failed:', e);
      setAiDraftNotice('Не удалось выполнить ИИ-оценку');
      setTimeout(() => setAiDraftNotice(null), 3000);
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  // Submit manager review
  const handleSubmitVerdict = async (status: 'completed' | 'in_progress') => {
    if (!task) return;
    setIsSubmittingReview(true);
    try {
      const payload = {
        status,
        score: reviewScore,
        review_comment: `${managerReaction}: ${managerComment}${managerTask ? `\nСледующий шаг: ${managerTask}` : ''}`,
        reviewer_id: currentUser?.id || 'manager',
        reviewer_name: currentUser?.name || 'Руководитель',
        reviewer_role: currentUser?.role || 'Руководитель',
        reviewed_at: new Date().toISOString()
      };

      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setReviewErrorNotice(null);
        setReviewSuccessNotice(status === 'completed' ? 'Задача успешно принята руководителем!' : 'Задача отправлена на доработку');
        setTask(prev => prev ? ({ ...prev, ...payload }) : null);
        loadTasksList();
        setTimeout(() => setReviewSuccessNotice(null), 5000);
      } else {
        throw new Error('Ошибка сохранения статуса');
      }
    } catch (err) {
      console.error('Ошибка сохранения вердикта:', err);
      setReviewErrorNotice('Ошибка при сохранении вердикта задачи');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filter tasks list
  const filteredTasks = useMemo(() => {
    if (listFilter === 'verification') {
      return tasks.filter(t => t.status === 'verification' || t.submission_status === 'submitted');
    }
    if (listFilter === 'completed') {
      return tasks.filter(t => t.status === 'completed');
    }
    return tasks;
  }, [tasks, listFilter]);

  return (
    <div className={`relative w-full min-h-[100dvh] pb-16 font-sans select-none transition-colors ${
      isDark ? 'bg-[#140A01] text-[#F4EE8E]' : 'bg-[#FFFBF5] text-amber-950'
    }`}>
      {/* Background Ambience */}
      <TaskSaturnBackground parallaxOffset={{ x: 0, y: 0 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
        {/* Top Navigation HUD Header */}
        <div className={`w-full p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3 ${
          isDark
            ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 shadow-[0_0_30px_rgba(244,238,142,0.15)]'
            : 'bg-[#FAF6EC]/90 border-[#B8860B]/40 text-amber-950 shadow-md'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (onNavigate) onNavigate('/cabinet/revisor/map');
                else window.history.back();
              }}
              className="p-2 sm:p-2.5 rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/30 text-[#E7C768] transition-all cursor-pointer"
              title="Вернуться к карте проектов и задач"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-[#E7C768]" />
                <h1 className="text-base sm:text-xl font-bold text-[#E7C768]">
                  Проверка задач руководителем
                </h1>
              </div>
              <p className="text-sm opacity-75 mt-0.5">
                Верификация подтверждений, оценка ИИ Ревизором и выставление оценки
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <button
              type="button"
              onClick={() => setReviewMode('manual')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                reviewMode === 'manual'
                  ? 'bg-amber-500/30 border border-amber-400/60 text-[#F4EE8E] font-bold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Ручная
            </button>
            <button
              type="button"
              onClick={() => setReviewMode('hybrid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                reviewMode === 'hybrid'
                  ? 'bg-amber-500/30 border border-amber-400/60 text-[#F4EE8E] font-bold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              ИИ + Руководитель
            </button>
            <button
              type="button"
              onClick={() => setReviewMode('auto_ai')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                reviewMode === 'auto_ai'
                  ? 'bg-amber-500/30 border border-amber-400/60 text-[#F4EE8E] font-bold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Авто-ИИ
            </button>
          </div>
        </div>

        {/* Tasks Selector Toolbar */}
        <div className={`w-full p-3 sm:p-4 rounded-2xl border backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/40' : 'bg-[#FAF6EC]/80 border-[#B8860B]/30'
        }`}>
          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setListFilter('verification')}
              className={`px-3.5 py-1.5 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                listFilter === 'verification'
                  ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                  : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
              }`}
            >
              <Clock size={16} />
              <span>На проверке ({tasks.filter(t => t.status === 'verification' || t.submission_status === 'submitted').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setListFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                listFilter === 'all'
                  ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                  : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
              }`}
            >
              Все задачи ({tasks.length})
            </button>

            <button
              type="button"
              onClick={() => setListFilter('completed')}
              className={`px-3.5 py-1.5 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                listFilter === 'completed'
                  ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                  : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>Принятые ({tasks.filter(t => t.status === 'completed').length})</span>
            </button>
          </div>

          {/* Task Dropdown Picker */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold opacity-75 shrink-0">Выбрать задачу:</span>
            <select
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                if (onNavigate) onNavigate(`/cabinet/revisor/review/${e.target.value}`);
              }}
              className={`w-full sm:w-80 px-3 py-2 rounded-xl border text-sm font-semibold focus:outline-none cursor-pointer ${
                isDark ? 'bg-[#1A0F02] border-[#E7C768]/50 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
              }`}
            >
              {filteredTasks.length === 0 ? (
                <option value="">Нет задач в этом списке</option>
              ) : (
                filteredTasks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.status === 'verification' ? '⏳ [На проверке]' : t.status === 'completed' ? '✅ [Принята]' : '⚙️ [В работе]'} {t.title}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Notices */}
        {reviewSuccessNotice && (
          <div className="p-3.5 rounded-2xl border border-amber-400 bg-amber-500/20 text-[#F4EE8E] text-sm font-bold flex items-center gap-2 animate-fade-in shadow-lg">
            <CheckCircle2 size={18} className="text-[#E7C768]" />
            <span>{reviewSuccessNotice}</span>
          </div>
        )}
        {reviewErrorNotice && (
          <div className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between gap-2 animate-fade-in shadow-lg ${
            isDark ? 'border-amber-400/60 bg-[#140A01]/80 text-[#F4EE8E]' : 'border-amber-700/50 bg-[#FAF6EC]/90 text-amber-950'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>{reviewErrorNotice}</span>
            </div>
            <button type="button" onClick={() => setReviewErrorNotice(null)} className="p-1 opacity-70 hover:opacity-100 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Content Grid: Left Column = Answers & Cards, Right Column = Verification Panel */}
        {isLoadingTask ? (
          <div className="p-12 text-center text-sm font-bold opacity-80 border rounded-2xl border-amber-500/30">
            Загрузка подтверждений и регламента задачи...
          </div>
        ) : fetchError || !task ? (
          <div className="p-8 text-center text-sm font-bold text-amber-400 border rounded-2xl border-amber-500/30">
            {fetchError || 'Выберите задачу из выпадающего списка выше'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT / CENTER COLUMN: TASK DETAILS, CHECKLIST, SUBMITTED ANSWERS (7/12) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Task Header Plate */}
              <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-[#1A0F02]/80 border-[#E7C768]/40 shadow-md' : 'bg-[#FAF6EC]/90 border-[#B8860B]/30 shadow-sm'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-[#E7C768] text-sm font-bold">
                    Задача #{task.id}
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl text-sm font-bold border ${
                    task.status === 'verification'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                      : task.status === 'completed'
                      ? 'bg-amber-500/30 border-amber-300 text-[#F4EE8E]'
                      : 'bg-transparent border-amber-500/30 opacity-80'
                  }`}>
                    {task.status === 'verification' ? 'Ожидает проверки' : task.status === 'completed' ? 'Принята' : 'В работе'}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-[#E7C768]">
                  {task.title}
                </h2>

                {task.description && (
                  <p className="text-sm leading-relaxed opacity-85">
                    {task.description}
                  </p>
                )}

                {/* Executor Info Row */}
                <div className="flex items-center gap-3 pt-2 border-t border-amber-500/20">
                  <img
                    src="/file/27/iirr1.png"
                    alt={task.executorName || 'Исполнитель'}
                    className="w-10 h-10 rounded-xl border border-amber-400 object-cover shadow-sm shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#E7C768] truncate">
                      {task.executorName || 'Сотрудник'}
                    </div>
                    <div className="text-sm opacity-75 truncate">
                      {task.executorRole || 'Исполнитель задачи'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist Plate */}
              {task.checklist && task.checklist.length > 0 && (
                <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xl space-y-2.5 ${
                  isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/30' : 'bg-[#FAF6EC]/85 border-[#B8860B]/30'
                }`}>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#E7C768]">
                    <ListChecks size={18} />
                    <span>Чек-лист задачи ({task.checklist.filter(c => c.completed).length} из {task.checklist.length})</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {task.checklist.map((c, i) => (
                      <div
                        key={c.id || i}
                        className={`flex items-start gap-2.5 p-2 rounded-xl text-sm border ${
                          c.completed
                            ? 'bg-amber-500/10 border-amber-400/30 text-amber-100 dark:text-[#F4EE8E]'
                            : 'bg-transparent border-amber-500/15 opacity-70'
                        }`}
                      >
                        <CheckCircle2 size={16} className={c.completed ? 'text-[#E7C768] shrink-0 mt-0.5' : 'opacity-40 shrink-0 mt-0.5'} />
                        <span className={c.completed ? 'font-medium' : ''}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted Confirmation Cards / Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#E7C768] flex items-center gap-2">
                    <FileText size={18} />
                    <span>Предоставленные подтверждения ({task.fields?.length || 0})</span>
                  </h3>
                  <span className="text-sm opacity-75">
                    Все типы данных
                  </span>
                </div>

                {(!task.fields || task.fields.length === 0) ? (
                  <div className="p-6 text-center text-sm opacity-75 border rounded-2xl border-amber-500/20">
                    Поля подтверждений не настроены в задаче.
                  </div>
                ) : (
                  task.fields.map((field, idx) => {
                    const ans = task.answers ? task.answers[field.id] : undefined;
                    return (
                      <div
                        key={field.id}
                        className={`p-4 rounded-2xl border space-y-2 transition-all ${
                          isDark ? 'bg-[#1A0F02]/70 border-[#E7C768]/30 shadow-xs' : 'bg-[#FAF6EC]/85 border-[#B8860B]/30 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 pb-1 border-b border-amber-500/15">
                          <div>
                            <span className="text-sm font-bold text-[#E7C768]">
                              {idx + 1}. {field.label}
                            </span>
                            {field.hint && (
                              <p className="text-sm opacity-70 mt-0.5">{field.hint}</p>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/30 text-sm font-mono text-[#E7C768]">
                            {field.type}
                          </span>
                        </div>

                        {/* Value Display */}
                        <div className="pt-1 text-sm">
                          {ans === undefined || ans === '' || ans === null ? (
                            <span className="opacity-50 italic">Ответ не предоставлен</span>
                          ) : typeof ans === 'boolean' ? (
                            <span className="font-bold flex items-center gap-1.5 text-[#E7C768]">
                              <CheckCircle2 size={16} />
                              <span>{ans ? 'Да, подтверждено' : 'Нет'}</span>
                            </span>
                          ) : Array.isArray(ans) ? (
                            <div className="flex flex-wrap gap-1.5">
                              {ans.map((opt, oi) => (
                                <span key={oi} className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/30 font-medium">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          ) : typeof ans === 'object' && ans.url ? (
                            <div className="space-y-2">
                              {field.type === 'photo' || field.type === 'camera_photo' || field.type === 'screenshot' ? (
                                <div className="relative max-w-sm rounded-xl overflow-hidden border border-amber-400/40">
                                  <img
                                    src={ans.url}
                                    alt={ans.name || 'Снимок'}
                                    className="max-h-56 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setPreviewImage({ url: ans.url, title: field.label })}
                                  />
                                </div>
                              ) : field.type === 'video' || field.type === 'camera_video' ? (
                                <video src={ans.url} controls className="max-h-56 w-full rounded-xl border border-amber-400/40" />
                              ) : (
                                <a
                                  href={ans.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-[#E7C768] hover:underline"
                                >
                                  <Download size={14} />
                                  <span>{ans.name || 'Скачать прикрепленный файл'}</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl border border-amber-400/20 bg-amber-500/5 font-medium leading-relaxed">
                              {String(ans)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: MANAGER REVIEW PANEL & AI DIAGNOSTICS (5/12) */}
            <div className="lg:col-span-5 space-y-4">
              {/* AI Verification & Diagnostic Card */}
              <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark
                  ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 shadow-[0_0_25px_rgba(244,238,142,0.12)]'
                  : 'bg-[#FAF6EC]/95 border-[#B8860B]/40 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base font-bold text-[#E7C768]">
                    <Sparkles size={18} />
                    <span>ИИ Ревизор ProTalk</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiEvaluation}
                    disabled={isGeneratingAiDraft}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Sparkles size={14} />
                    <span>{isGeneratingAiDraft ? 'Анализ...' : 'ИИ-оценка'}</span>
                  </button>
                </div>

                {aiDraftNotice && (
                  <p className="text-sm font-semibold text-[#E7C768] animate-fade-in">
                    {aiDraftNotice}
                  </p>
                )}

                {aiAnalysisSummary ? (
                  <div className="p-3 rounded-xl border border-amber-400/30 bg-amber-500/10 text-sm leading-relaxed">
                    <span className="font-bold text-[#E7C768] block mb-1">Резюме нейросети:</span>
                    {aiAnalysisSummary}
                  </div>
                ) : (
                  <p className="text-sm opacity-75">
                    Нажмите «ИИ-оценка» для автоматического скоринга ответов по шкале 1-100 и генерации вердикта.
                  </p>
                )}
              </div>

              {/* Manager Verdict Form */}
              <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl space-y-4 ${
                isDark
                  ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 shadow-md'
                  : 'bg-[#FAF6EC]/95 border-[#B8860B]/40 shadow-sm'
              }`}>
                <h3 className="text-base font-bold text-[#E7C768] flex items-center gap-2">
                  <Edit3 size={18} />
                  <span>Вердикт руководителя</span>
                </h3>

                {/* Score Slider (1-100) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Оценка выполнения задачи:</span>
                    <span className="text-base font-black font-mono text-[#E7C768] px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/30">
                      {reviewScore} / 100 баллов
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={reviewScore}
                    onChange={(e) => setReviewScore(Number(e.target.value))}
                    className="w-full accent-[#E7C768] cursor-pointer"
                  />
                </div>

                {/* Reaction Chips */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold opacity-80">Реакция руководителя:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      '👍 Принято',
                      '🚀 Отлично',
                      '⚡ Доработать',
                      '⚠️ Есть замечания'
                    ].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setManagerReaction(r)}
                        className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          managerReaction === r
                            ? 'bg-amber-500/30 border-amber-300 text-[#F4EE8E] shadow-xs'
                            : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manager Comments with Voice Dictation */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold opacity-80">
                    Комментарий руководителя (можно надиктовать голосом):
                  </label>
                  <MiniAudioField
                    value={managerComment}
                    onChange={setManagerComment}
                    placeholder="Например: Отчет принят без замечаний, показатели соответствуют плановым..."
                    multiline={true}
                    rows={3}
                    resizable={true}
                    isLightTheme={!isDark}
                  />
                </div>

                {/* Next Steps / Task */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold opacity-80">
                    Следующая задача или поручение (опционально):
                  </label>
                  <input
                    type="text"
                    value={managerTask}
                    onChange={(e) => setManagerTask(e.target.value)}
                    placeholder="Например: Подготовить сводку по клиентам к 18:00"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none ${
                      isDark ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E]' : 'bg-white border-[#B8860B]/40 text-amber-950'
                    }`}
                  />
                </div>

                {/* Action Buttons: Accept vs Return for Revision */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSubmitVerdict('completed')}
                    disabled={isSubmittingReview}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 size={18} />
                    <span>{isSubmittingReview ? 'Сохранение...' : 'Принять задачу и зафиксировать баллы'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmitVerdict('in_progress')}
                    disabled={isSubmittingReview}
                    className="w-full py-2.5 px-4 rounded-xl border border-amber-400/40 hover:bg-amber-500/15 text-[#E7C768] text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <AlertTriangle size={16} />
                    <span>Отправить задачу на доработку</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent" onClick={e => e.stopPropagation()}>
            <img src={previewImage.url} alt={previewImage.title} className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-amber-400/50 shadow-2xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/70 border border-amber-400 text-amber-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

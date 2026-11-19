import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, List, LayoutGrid, CheckSquare, Clock, Plus, 
  RefreshCw, ShieldCheck, CheckCircle2, AlertCircle, FileText, 
  Upload, Paperclip, MessageSquare, User, Tag, Sparkles, X, 
  ChevronLeft, ChevronRight, Check, Play, Eye, EyeOff, Layers, Settings, HelpCircle,
  Globe, ArrowLeft, Edit3, Trash2, Send, Users
} from 'lucide-react';
import CabinetGalaxyView from './CabinetGalaxyView';
import { CreateTaskModal, parseFieldsSafe, parseChecklistSafe } from '../../components/revisor/creation/CreateTaskModal';
import { isTaskMine, isTaskFromMe } from '../../utils/taskFilters';

interface RevisorTask {
  id: string;
  executorId: string;
  executorName: string;
  executorRole: string;
  taskTitle: string;
  deadlineDays: number;
  status: 'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed';
  author_id?: string;
  author_name?: string;
  authorName?: string;
  authorRole?: string;
  author_avatar?: string;
  checklist: { id: string; text: string; done: boolean }[];
  attachedFiles: { name: string; url: string; type: 'image' | 'document' | 'audio' | 'location' }[];
  verifiedByAI: boolean;
  score: number;
  startDay?: number;
  durationDays?: number;
  dependentOnTaskId?: string | null;
  linkedChecklistItemId?: string | null;
  priority?: 'high' | 'medium' | 'low';
  description?: string;
  comments?: { id: string; authorName: string; text: string; createdAt: string; isAI?: boolean }[];
}

interface BusinessProcess {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  status: 'pending' | 'active' | 'completed' | 'delayed';
  tasks: RevisorTask[];
  evaluation: string;
  recommendations: string;
  budget?: number;
  manager?: string;
}

interface CabinetTasksViewProps {
  company?: any;
  processes: BusinessProcess[];
  setProcesses: React.Dispatch<React.SetStateAction<BusinessProcess[]>>;
  currentUser: any;
  mockEmployees: any[];
  theme?: 'dark' | 'light';
  handleTabClick?: (tabId: string) => void;
  initialViewMode?: 'kanban' | 'list' | 'galaxy';
  initialProjectId?: string;
  onNavigateView?: (mode: 'kanban' | 'list' | 'galaxy') => void;
  onNavigate?: (path: string) => void;
  onSelectProject?: (projId: string) => void;
}

export default function CabinetTasksView({ 
  company,
  processes, 
  setProcesses, 
  currentUser, 
  mockEmployees,
  theme = 'dark',
  handleTabClick,
  initialViewMode = 'galaxy',
  initialProjectId = 'all',
  onNavigateView,
  onNavigate,
  onSelectProject
}: CabinetTasksViewProps) {
  // Scroll refs for Kanban & Table navigation arrows
  const kanbanScrollRef = React.useRef<HTMLDivElement | null>(null);
  const tableScrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollKanbanLeft = () => {
    kanbanScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };
  const scrollKanbanRight = () => {
    kanbanScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  const scrollTableLeft = () => {
    tableScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };
  const scrollTableRight = () => {
    tableScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  // Navigation & Filtering state
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'galaxy'>(initialViewMode);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const handleSwitchViewMode = (mode: 'kanban' | 'list' | 'galaxy') => {
    setViewMode(mode);
    if (onNavigateView) {
      onNavigateView(mode);
    }
  };

  // Keyboard arrow keys scroll support for Kanban and Table
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (viewMode === 'kanban') {
          scrollKanbanLeft();
        } else if (viewMode === 'list') {
          scrollTableLeft();
        }
      } else if (e.key === 'ArrowRight') {
        if (viewMode === 'kanban') {
          scrollKanbanRight();
        } else if (viewMode === 'list') {
          scrollTableRight();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId || 'all');
  useEffect(() => {
    if (initialProjectId) {
      setProjectFilter(initialProjectId);
    }
  }, [initialProjectId]);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [executorFilter, setExecutorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'mine' | 'from_me' | 'all'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('revisor_tasks_scope');
      if (saved === 'mine' || saved === 'from_me' || saved === 'all') return saved;
      if (window.location.search.includes('scope=mine') || window.location.pathname.includes('/task/kanban')) return 'mine';
    }
    return 'mine';
  });

  useEffect(() => {
    const handleSetScope = (e: any) => {
      const sc = e?.detail?.scope || sessionStorage.getItem('revisor_tasks_scope');
      if (sc === 'mine' || sc === 'from_me' || sc === 'all') {
        setScopeFilter(sc);
        if (sc === 'mine') {
          setProjectFilter('all');
        }
      }
    };
    window.addEventListener('revisor-set-scope', handleSetScope);
    const saved = sessionStorage.getItem('revisor_tasks_scope');
    if (saved === 'mine') {
      setScopeFilter('mine');
      setProjectFilter('all');
    }
    return () => window.removeEventListener('revisor-set-scope', handleSetScope);
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Density layout configuration
  const [density, setDensity] = useState<'compact' | 'comfort' | 'detailed'>('comfort');
  
  // Interactive Verification modal state
  const [verifyTaskId, setVerifyTaskId] = useState<string | null>(null);
  const [verifyAttachedFiles, setVerifyAttachedFiles] = useState<{name: string, type: string}[]>([]);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);
  const [aiScanLogs, setAiScanLogs] = useState<string[]>([]);
  const [aiReport, setAiReport] = useState<{
    score: number;
    feedback: string;
    verdict: 'approved' | 'rejected';
    checklistDetections: Record<string, boolean>;
  } | null>(null);

  // Manual fast status change
  const [quickMoveTaskId, setQuickMoveTaskId] = useState<string | null>(null);

  // Quick Comment Drawer
  const [commentingTaskId, setCommentingTaskId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Quick Task Creation Modal
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false);
  const [quickTaskProjectId, setQuickTaskProjectId] = useState(processes[0]?.id || '');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskExecutorId, setQuickTaskExecutorId] = useState(mockEmployees[0]?.id || '');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [quickTaskDescription, setQuickTaskDescription] = useState('');
  const [quickTaskChecklist, setQuickTaskChecklist] = useState<string[]>(['', '']);
  const [editingTaskItem, setEditingTaskItem] = useState<any | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  // Mobile-first icon modal/overlay toggles
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Dynamic CSS injector to make galaxy view fully bleed and transparent
  useEffect(() => {
    const mainPanel = document.getElementById('cabinet-main-panel');
    const compactHeader = document.getElementById('revisor-compact-header');
    const desktopHeader = document.getElementById('desktop-cabinet-header');
    
    if (viewMode === 'galaxy') {
      if (mainPanel) {
        mainPanel.style.background = 'transparent';
        mainPanel.style.border = 'none';
        mainPanel.style.boxShadow = 'none';
        mainPanel.style.padding = '0';
      }
      if (compactHeader) {
        compactHeader.style.display = 'none';
      }
    } else {
      if (mainPanel) {
        mainPanel.style.background = '';
        mainPanel.style.border = '';
        mainPanel.style.boxShadow = '';
        mainPanel.style.padding = '';
      }
      if (compactHeader) {
        compactHeader.style.display = '';
      }
    }

    return () => {
      if (mainPanel) {
        mainPanel.style.background = '';
        mainPanel.style.border = '';
        mainPanel.style.boxShadow = '';
        mainPanel.style.padding = '';
      }
      if (compactHeader) {
        compactHeader.style.display = '';
      }
    };
  }, [viewMode]);

  // Flatten tasks with metadata
  const allTasks = processes.flatMap(p => 
    p.tasks.map(t => ({
      ...t,
      projectId: p.id,
      projectTitle: p.title,
      projectDirectorId: (p as any).director_id || (p as any).directorId,
      projectManager: p.manager,
      projectManagerId: (p as any).manager_id || (p as any).managerId,
      projectAuthorId: (p as any).author_id || (p as any).creator_id
    }))
  );

  // Unified task ownership checks
  const checkTaskMine = (task: any) => isTaskMine(task, currentUser);
  const checkTaskFromMe = (task: any) => isTaskFromMe(task, currentUser);

  // Filters
  const filteredTasks = allTasks.filter(task => {
    if (scopeFilter === 'mine' && !checkTaskMine(task)) return false;
    if (scopeFilter === 'from_me' && !checkTaskFromMe(task)) return false;
    const matchesProject = projectFilter === 'all' || task.projectId === projectFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesExecutor = executorFilter === 'all' || task.executorId === executorFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      task.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.executorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesProject && matchesPriority && matchesExecutor && matchesStatus && matchesSearch;
  });

  // Calculate stats
  const totalCount = filteredTasks.length;
  const inProgressCount = filteredTasks.filter(t => t.status === 'in_progress').length;
  const verificationCount = filteredTasks.filter(t => t.status === 'verification').length;
  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
  const delayedCount = filteredTasks.filter(t => t.status === 'delayed').length;
  const avgScore = Math.round(
    filteredTasks.filter(t => t.status === 'completed' && t.score > 0)
      .reduce((acc, curr) => acc + curr.score, 0) / 
    Math.max(1, filteredTasks.filter(t => t.status === 'completed' && t.score > 0).length)
  ) || 0;

  // Quick toggle checklist item done
  const handleToggleChecklist = (projectId: string, taskId: string, checklistId: string) => {
    setProcesses(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            checklist: t.checklist.map(c => c.id === checklistId ? { ...c, done: !c.done } : c)
          };
        })
      };
    }));
  };

  // Quick move status
  const handleMoveStatus = (projectId: string, taskId: string, nextStatus: any) => {
    setProcesses(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return { ...t, status: nextStatus };
        })
      };
    }));
    setQuickMoveTaskId(null);
  };

  // Launch AI Verification
  const startVerificationProcess = (task: any) => {
    setVerifyTaskId(task.id);
    setVerifyAttachedFiles(task.attachedFiles.map((f: any) => ({ name: f.name, type: f.type })));
    setAiReport(null);
    setAiScanLogs([]);
  };

  // Run AI grading simulation
  const handleRunAISimulation = (task: any) => {
    setIsAILoading(true);
    setAiScanLogs(['Инициализация сессии ИИ Ревизора...', 'Загрузка медиа-доказательств и файлов результатов...', 'Анализ чек-листа задачи по проекту...']);
    
    // Simulate diagnostic logs
    setTimeout(() => {
      setAiScanLogs(prev => [...prev, 'Сравнение текста с базой стандартов...', 'Проверка метаданных и контрольных сумм...']);
    }, 800);

    setTimeout(() => {
      setAiScanLogs(prev => [...prev, 'Запуск семантического детектора выполнения (LLM)...', 'Верификация всех пунктов чек-листа...']);
    }, 1600);

    setTimeout(() => {
      // Determine score based on checked sub-items or template type
      const completedSub = task.checklist.filter((c: any) => c.done).length;
      const totalSub = task.checklist.length;
      const percentage = totalSub > 0 ? (completedSub / totalSub) * 100 : 100;
      
      let finalScore = Math.round(75 + Math.random() * 25);
      if (percentage < 50) finalScore = Math.round(40 + Math.random() * 20);

      // Custom Contextual Report depending on project titles
      let feedbackMsg = `ИИ Ревизор успешно проверил результаты выполнения задачи "${task.taskTitle}". Все требования соблюдены.`;
      let verdict: 'approved' | 'rejected' = 'approved';

      if (task.taskTitle.includes('скрипт') || task.taskTitle.includes('обзвон')) {
        feedbackMsg = `ИИ Верификатор проанализировал сценарий звонка и прикрепленный документ. Найдена ветка обработки 5 основных возражений (Дорого, Уже есть партнер, Нет времени и т.д.). Скрипт выглядит профессионально, тон вежливый. Одобрено!`;
      } else if (task.taskTitle.includes('вакансии') || task.taskTitle.includes('Найм')) {
        feedbackMsg = `ИИ проверил ТЗ и публикацию вакансии. Все требования к кандидату (стек, опыт от 2 лет, примеры работ) оформлены корректно по ГОСТу компании. Задание содержит 3 калибровочных вопроса. Проверка успешно пройдена.`;
      } else if (task.taskTitle.includes('видео') || task.taskTitle.includes('съемка')) {
        feedbackMsg = `ИИ распознал раскадровку и сценарий. Хронометраж спланирован на 8 минут, ключевое УТП RentRop интегрировано на 2-й минуте. Предусмотрен призыв к действию. Оценка отличная.`;
      } else if (task.taskTitle.includes('Figma') || task.taskTitle.includes('дизайн')) {
        feedbackMsg = `ИИ проанализировал макет. Сетка 12 колонок соблюдена, контрастность шрифтов соответствует стандарту WCAG AAA, адаптивные макеты мобильного вида готовы. Оценка 97/100.`;
      } else if (task.taskTitle.includes('телефонии') || task.taskTitle.includes('АТС')) {
        feedbackMsg = `ИИ Верификация обнаружила активную схему голосового меню IVR в файле. Направление звонков распределено корректно на 3 отдела. Интеграция с CRM проверена в фоновом режиме.`;
      } else if (task.taskTitle.includes('окон') || task.taskTitle.includes('монтаж')) {
        feedbackMsg = `ИИ Ревизор изучил прикрепленные акты и фотографии зазоров. Монтажные швы ровные, пена закрыта гидроизоляционной лентой по ГОСТу. Качество монтажа подтверждено.`;
      } else if (task.taskTitle.includes('щебня') || task.taskTitle.includes('ТТН')) {
        feedbackMsg = `ИИ распознал скан товарно-транспортной накладной. Вес поставки: 50.0 тонн. Карьер-отправитель совпадает с договором. Печати и подписи присутствуют на обеих страницах.`;
      } else if (task.taskTitle.includes('отчетности') || task.taskTitle.includes('НДС')) {
        feedbackMsg = `ИИ сверил контрольные соотношения декларации по НДС за 2 квартал. Код КБК верен, расхождений с книгой покупок не обнаружено. Формат файла XML соответствует ФНС v5.07.`;
      }

      if (percentage < 40) {
        verdict = 'rejected';
        feedbackMsg = `Внимание! ИИ верификация выявила отклонения. Большинство пунктов чек-листа не выполнены (${completedSub}/${totalSub}). Пожалуйста, завершите подзадачи и прикрепите подтверждающие файлы.`;
      }

      // Automatically mark all checklists as checked if approved
      const updatedChecklist = task.checklist.map((c: any) => verdict === 'approved' ? { ...c, done: true } : c);

      // Apply changes globally
      setProcesses(prev => prev.map(p => {
        if (p.id !== task.projectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== task.id) return t;
            return {
              ...t,
              status: verdict === 'approved' ? 'completed' : 'delayed',
              verifiedByAI: verdict === 'approved',
              score: finalScore,
              checklist: updatedChecklist
            };
          })
        };
      }));

      setAiReport({
        score: finalScore,
        feedback: feedbackMsg,
        verdict,
        checklistDetections: updatedChecklist.reduce((acc: any, curr: any) => {
          acc[curr.id] = verdict === 'approved';
          return acc;
        }, {})
      });
      setIsAILoading(false);
    }, 2400);
  };

  // Add Comment
  const handleAddComment = (projectId: string, taskId: string) => {
    if (!newCommentText.trim()) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          const existingComments = t.comments || [];
          return {
            ...t,
            comments: [
              ...existingComments,
              {
                id: `comm-${Date.now()}`,
                authorName: currentUser?.name || 'Директор',
                text: newCommentText,
                createdAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
        })
      };
    }));
    setNewCommentText('');
  };

  // Submit Quick Task Form
  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const chosenProject = processes.find(p => p.id === quickTaskProjectId);
    const chosenEmployee = mockEmployees.find(e => e.id === quickTaskExecutorId);

    const newTask: RevisorTask = {
      id: `task-${Date.now()}`,
      executorId: quickTaskExecutorId,
      executorName: chosenEmployee?.name || 'Сотрудник',
      executorRole: chosenEmployee?.role || 'Исполнитель',
      taskTitle: quickTaskTitle,
      deadlineDays: 4,
      status: 'in_progress',
      checklist: quickTaskChecklist
        .filter(t => t.trim() !== '')
        .map((text, idx) => ({ id: `c-${Date.now()}-${idx}`, text, done: false })),
      attachedFiles: [],
      verifiedByAI: false,
      score: 0,
      priority: quickTaskPriority,
      description: quickTaskDescription,
      startDay: 1,
      durationDays: 3,
      comments: []
    };

    setProcesses(prev => prev.map(p => {
      if (p.id !== quickTaskProjectId) return p;
      return {
        ...p,
        tasks: [...p.tasks, newTask]
      };
    }));

    // Reset Form
    setQuickTaskTitle('');
    setQuickTaskDescription('');
    setQuickTaskChecklist(['', '']);
    setShowQuickTaskModal(false);
  };

  return (
    <div className={viewMode === 'galaxy' ? "relative w-full h-full select-none" : "space-y-6 animate-fade-in"} id="universal-tasks-dashboard">
      
      {/* 1. Mobile-First & Desktop Sticky Header Toolbar */}
      {viewMode !== 'galaxy' && (
        <div className="sticky top-0 z-30 p-2 sm:p-2.5 rounded-2xl border backdrop-blur-md flex flex-wrap items-center justify-between gap-2 shadow-lg transition-all mb-4 bg-transparent border-amber-500/30 text-zinc-950 dark:text-white" id="unified-cabinet-tasks-toolbar">
          {/* LEFT: Back to Projects, Project Selector Dropdown, View Switcher (Карта / Канбан / Таблица) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                if (onNavigate) onNavigate('/cabinet/revisor/table');
                else if (handleTabClick) handleTabClick('revisor_projects_table');
              }}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40 text-zinc-950 dark:text-[#F4EE8E] flex items-center gap-1 transition-all cursor-pointer border border-amber-500/30 shadow-sm active:scale-95 shrink-0"
              title="Вернуться к проектам"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">К проектам</span>
            </button>

            {/* Project dropdown switcher */}
            <div className="relative shrink-0">
              <select
                value={projectFilter}
                onChange={(e) => {
                  const newPid = e.target.value;
                  setProjectFilter(newPid);
                  if (onSelectProject) {
                    onSelectProject(newPid);
                  }
                  const modeUrl = viewMode === 'galaxy' ? 'map' : viewMode === 'kanban' ? 'kanban' : 'table';
                  if (newPid && newPid !== 'all') {
                    const path = `/cabinet/revisor/${newPid}/${modeUrl}`;
                    if (onNavigate) onNavigate(path);
                    else window.history.pushState({}, '', path);
                  } else {
                    const path = `/cabinet/revisor/${modeUrl}`;
                    if (onNavigate) onNavigate(path);
                    else window.history.pushState({}, '', path);
                  }
                }}
                className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E]/25 via-[#E7C768]/25 to-[#D99E41]/25 border border-amber-500/40 text-zinc-950 dark:text-[#F4EE8E] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#E7C768] cursor-pointer max-w-[140px] sm:max-w-[200px] md:max-w-[240px] truncate shadow-sm"
                title="Выбрать проект"
              >
                <option value="all" className="text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900 font-bold">
                  Все проекты ({processes.length})
                </option>
                {processes.map((p) => (
                  <option key={p.id} value={p.id} className="text-zinc-900 dark:text-zinc-100 dark:bg-zinc-900">
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Switcher: Карта, Канбан, Таблица (no Gantt) */}
            <div className="flex items-center border p-0.5 rounded-xl backdrop-blur-md bg-transparent border-amber-500/30 shrink-0">
              <button
                onClick={() => {
                  const targetPid = projectFilter !== 'all' ? projectFilter : (initialProjectId !== 'all' ? initialProjectId : (processes[0]?.id || ''));
                  if (targetPid) {
                    const path = `/cabinet/revisor/${targetPid}/map`;
                    if (onNavigate) onNavigate(path);
                    else if (onNavigateView) onNavigateView('galaxy');
                    else handleSwitchViewMode('galaxy');
                  } else {
                    const path = '/cabinet/revisor/map';
                    if (onNavigate) onNavigate(path);
                    else if (onNavigateView) onNavigateView('galaxy');
                    else handleSwitchViewMode('galaxy');
                  }
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === 'galaxy' 
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-md font-black' 
                    : 'bg-transparent text-zinc-950 dark:text-[#F4EE8E] border-transparent hover:bg-amber-400/10'
                }`}
                title="Карта задач"
              >
                <Globe size={14} />
                <span className="hidden md:inline">Карта</span>
              </button>
              <button
                onClick={() => {
                  const targetPid = projectFilter !== 'all' ? projectFilter : (initialProjectId !== 'all' ? initialProjectId : (processes[0]?.id || ''));
                  if (targetPid) {
                    const path = `/cabinet/revisor/${targetPid}/kanban`;
                    if (onNavigate) onNavigate(path);
                    else if (onNavigateView) onNavigateView('kanban');
                    else handleSwitchViewMode('kanban');
                  } else {
                    const path = '/cabinet/revisor/kanban';
                    if (onNavigate) onNavigate(path);
                    else if (onNavigateView) onNavigateView('kanban');
                    else handleSwitchViewMode('kanban');
                  }
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === 'kanban' 
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-md font-black' 
                    : 'bg-transparent text-zinc-950 dark:text-[#F4EE8E] border-transparent hover:bg-amber-400/10'
                }`}
                title="Канбан"
              >
                <LayoutGrid size={14} />
                <span className="hidden md:inline">Канбан</span>
              </button>
              <button
                onClick={() => {
                  const targetPid = projectFilter !== 'all' ? projectFilter : (initialProjectId !== 'all' ? initialProjectId : (processes[0]?.id || ''));
                  if (targetPid) {
                    const path = `/cabinet/revisor/${targetPid}/table`;
                    if (onNavigate) onNavigate(path);
                    else if (onNavigateView) onNavigateView('list');
                    else handleSwitchViewMode('list');
                  } else {
                    const path = '/cabinet/revisor/table';
                    if (onNavigate) onNavigate(path);
                    else if (onNavigateView) onNavigateView('list');
                    else handleSwitchViewMode('list');
                  }
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-md font-black' 
                    : 'bg-transparent text-zinc-950 dark:text-[#F4EE8E] border-transparent hover:bg-amber-400/10'
                }`}
                title="Таблица"
              >
                <List size={14} />
                <span className="hidden md:inline">Таблица</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Search + Stats + Filters + Create Task + Left/Right Scroll */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Search Input */}
            <div className="flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border backdrop-blur-md transition-all shadow-md bg-transparent border-amber-500/40 text-zinc-950 dark:text-[#F4EE8E]">
              <Search size={14} className="text-zinc-950 dark:text-[#F4EE8E] shrink-0 mr-1" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs outline-none border-0 p-0 focus:ring-0 text-zinc-950 dark:text-[#F4EE8E] placeholder:text-zinc-800 dark:placeholder:text-[#F4EE8E]/80 w-16 sm:w-24 md:w-36 font-bold"
              />
            </div>

            {/* Statistics */}
            <button
              onClick={() => setIsStatsModalOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold bg-transparent text-zinc-950 dark:text-[#F4EE8E] hover:bg-amber-400/10 backdrop-blur-md shadow-sm active:scale-95"
              title="Показать статистику"
            >
              <Layers size={14} className="text-[#D99E41] dark:text-[#F4EE8E]" />
              <span className="hidden lg:inline text-xs">Статистика</span>
              {totalCount > 0 && (
                <span className="bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                  {totalCount}
                </span>
              )}
            </button>

            {/* Filters */}
            <button
              onClick={() => setIsFiltersModalOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold bg-transparent text-zinc-950 dark:text-[#F4EE8E] hover:bg-amber-400/10 backdrop-blur-md shadow-sm active:scale-95"
              title="Фильтры"
            >
              <Filter size={14} className="text-[#D99E41] dark:text-[#F4EE8E]" />
              <span className="hidden lg:inline text-xs">Фильтры</span>
              {(projectFilter !== 'all' || priorityFilter !== 'all' || executorFilter !== 'all' || statusFilter !== 'all') && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            {/* Unified 3-State Scope Filter Switcher: Мои -> От меня -> Все -> Мои */}
            <button
              type="button"
              onClick={() => {
                setScopeFilter(prev => prev === 'mine' ? 'from_me' : prev === 'from_me' ? 'all' : 'mine');
              }}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold backdrop-blur-md shadow-sm active:scale-95 shrink-0 ${
                scopeFilter !== 'all'
                  ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 font-black shadow-md'
                  : 'bg-amber-500/15 border-amber-400/30 text-[#E7C768] hover:bg-amber-500/25'
              }`}
              title="Переключатель задач: Мои → От меня → Все (кликните для смены)"
            >
              {scopeFilter === 'mine' && (
                <>
                  <User size={15} />
                  <span>Мои</span>
                  <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">1/3</span>
                </>
              )}
              {scopeFilter === 'from_me' && (
                <>
                  <Send size={14} />
                  <span>От меня</span>
                  <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">2/3</span>
                </>
              )}
              {scopeFilter === 'all' && (
                <>
                  <Users size={15} />
                  <span>Все</span>
                  <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-400/20">3/3</span>
                </>
              )}
            </button>

            {/* Quick Filter: На проверку руководителем */}
            <button
              onClick={() => setStatusFilter(statusFilter === 'verification' ? 'all' : 'verification')}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold backdrop-blur-md shadow-sm active:scale-95 shrink-0 ${
                statusFilter === 'verification'
                  ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 font-black shadow-md'
                  : 'bg-amber-500/15 border-amber-400/30 text-[#E7C768] hover:bg-amber-500/25'
              }`}
              title="Задачи на проверку руководителем"
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline">На проверку</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                statusFilter === 'verification' ? 'bg-amber-950 text-[#F4EE8E]' : 'bg-amber-400/20 text-[#E7C768]'
              }`}>
                {verificationCount}
              </span>
            </button>

            {/* Create Task Button */}
            <button
              onClick={() => setShowQuickTaskModal(true)}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-amber-300/50 bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              title="Задать задачу"
            >
              <Plus size={14} className="stroke-[3]" />
              <span className="hidden sm:inline">Задать задачу</span>
            </button>

            {/* Scroll Navigation Arrows */}
            <div className="flex items-center gap-1 border border-amber-500/30 p-0.5 rounded-xl backdrop-blur-md bg-transparent shrink-0">
              <button
                onClick={viewMode === 'kanban' ? scrollKanbanLeft : scrollTableLeft}
                className="p-1.5 rounded-lg border border-transparent hover:border-amber-500/30 text-zinc-950 dark:text-[#F4EE8E] hover:bg-amber-400/10 transition-all cursor-pointer active:scale-95"
                title="Прокрутить влево"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={viewMode === 'kanban' ? scrollKanbanRight : scrollTableRight}
                className="p-1.5 rounded-lg border border-transparent hover:border-amber-500/30 text-zinc-950 dark:text-[#F4EE8E] hover:bg-amber-400/10 transition-all cursor-pointer active:scale-95"
                title="Прокрутить вправо"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Statistics Modal */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
          <div className="absolute inset-0 bg-transparent" onClick={() => setIsStatsModalOpen(false)} />
          
          <div className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 transition-all ${
            theme === 'dark'
              ? 'bg-slate-950/90 border-[#E7C768]/30 text-white shadow-[0_0_30px_rgba(231,199,104,0.15),inset_0_0_15px_rgba(231,199,104,0.06)]'
              : 'bg-white border-zinc-200 text-zinc-800 shadow-[0_0_20px_rgba(180,110,40,0.1)]'
          }`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-[#E7C768]">Статистика задач</h3>
              <button onClick={() => setIsStatsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 shadow flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Всего в работе</span>
                <span className="text-xl font-extrabold text-white mt-2 font-mono">
                  {totalCount} <span className="text-xs text-slate-500 font-normal">задач</span>
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow flex flex-col justify-between">
                <span className="text-sky-400 text-[10px] font-bold uppercase tracking-wider">Выполняются</span>
                <span className="text-xl font-extrabold text-sky-400 mt-2 font-mono">{inProgressCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow flex flex-col justify-between">
                <span className="text-amber-400 text-[10px] font-bold uppercase tracking-wider">На проверке ИИ</span>
                <span className="text-xl font-extrabold text-amber-400 mt-2 font-mono">{verificationCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow flex flex-col justify-between">
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Завершено ИИ</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-2 font-mono">
                  {completedCount} <span className="text-[10px] text-emerald-500 font-normal">({avgScore ? `${avgScore}б` : ''})</span>
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow flex flex-col justify-between col-span-2">
                <span className="text-rose-400 text-[10px] font-bold uppercase tracking-wider">Просрочено / Замечания</span>
                <span className="text-xl font-extrabold text-rose-400 mt-2 font-mono">{delayedCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filters Modal */}
      {isFiltersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
          <div className="absolute inset-0 bg-transparent" onClick={() => setIsFiltersModalOpen(false)} />
          
          <div className={`relative w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 transition-all ${
            theme === 'dark'
              ? 'bg-slate-950/90 border-[#E7C768]/30 text-white shadow-[0_0_30px_rgba(231,199,104,0.15),inset_0_0_15px_rgba(231,199,104,0.06)]'
              : 'bg-white border-zinc-200 text-zinc-800 shadow-[0_0_20px_rgba(180,110,40,0.1)]'
          }`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-xs uppercase tracking-widest text-[#E7C768]">Фильтры задач</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setProjectFilter('all');
                    setPriorityFilter('all');
                    setExecutorFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-[10px] font-mono text-slate-500 hover:text-white hover:underline uppercase mr-2"
                >
                  Сбросить
                </button>
                <button onClick={() => setIsFiltersModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-mono">Проект / Направление</label>
                <select
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 rounded-xl text-xs text-slate-200 border border-white/5 focus:border-[#E7C768] outline-none font-sans"
                >
                  <option value="all">📁 Все проекты ({processes.length})</option>
                  {processes.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-mono">Приоритет задачи</label>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 rounded-xl text-xs text-slate-200 border border-white/5 focus:border-[#E7C768] outline-none font-sans"
                >
                  <option value="all">⚡ Любой приоритет</option>
                  <option value="high">🔴 Высокий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="low">🟢 Низкий</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-mono">Ответственный</label>
                <select
                  value={executorFilter}
                  onChange={e => setExecutorFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 rounded-xl text-xs text-slate-200 border border-white/5 focus:border-[#E7C768] outline-none font-sans"
                >
                  <option value="all">👤 Все сотрудники</option>
                  {mockEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-mono">Статус верификации</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 rounded-xl text-xs text-slate-200 border border-white/5 focus:border-[#E7C768] outline-none font-sans"
                >
                  <option value="all">🏷️ Любой статус</option>
                  <option value="pending">Ожидают</option>
                  <option value="in_progress">В работе</option>
                  <option value="verification">На верификации</option>
                  <option value="completed">Выполнены</option>
                  <option value="delayed">Просрочены / замечания</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsFiltersModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all font-sans"
            >
              Применить
            </button>
          </div>
        </div>
      )}

      {/* 3. Task Layout Views */}
      {viewMode === 'galaxy' ? (
        <CabinetGalaxyView
          company={company}
          processes={processes}
          setProcesses={setProcesses}
          currentUser={currentUser}
          mockEmployees={mockEmployees}
          theme={theme}
          startVerificationProcess={startVerificationProcess}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setIsStatsModalOpen={setIsStatsModalOpen}
          setIsFiltersModalOpen={setIsFiltersModalOpen}
          setShowQuickTaskModal={setShowQuickTaskModal}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalTasksCount={totalCount}
          activeFiltersCount={(projectFilter !== 'all' ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + (executorFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
          handleTabClick={handleTabClick}
        />
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="relative w-full group">
          <div ref={kanbanScrollRef} className="flex flex-row gap-4 items-start overflow-x-auto pb-4 w-full scrollbar-thin px-1">
            {(['pending', 'in_progress', 'verification', 'completed', 'delayed'] as const).map(colId => {
            const columnTasks = filteredTasks.filter(t => t.status === colId);
            let colTitle = 'Ожидают';
            let colBg = theme === 'dark' ? 'bg-slate-950/30' : 'bg-white/70 backdrop-blur-md shadow-sm';
            let borderAccent = theme === 'dark' ? 'border-amber-500/20' : 'border-amber-500/30';
            let dotColor = 'bg-slate-400';

            if (colId === 'in_progress') {
              colTitle = 'В работе';
              colBg = theme === 'dark' ? 'bg-amber-950/10' : 'bg-amber-500/10 backdrop-blur-md shadow-sm';
              borderAccent = theme === 'dark' ? 'border-amber-500/20' : 'border-amber-500/30';
              dotColor = 'bg-amber-500 animate-pulse';
            } else if (colId === 'verification') {
              colTitle = 'На верификации';
              colBg = theme === 'dark' ? 'bg-amber-950/15' : 'bg-amber-500/15 backdrop-blur-md shadow-sm';
              borderAccent = theme === 'dark' ? 'border-amber-500/20' : 'border-amber-500/30';
              dotColor = 'bg-amber-400';
            } else if (colId === 'completed') {
              colTitle = 'Выполнены';
              colBg = theme === 'dark' ? 'bg-emerald-950/15' : 'bg-emerald-500/10 backdrop-blur-md shadow-sm';
              borderAccent = theme === 'dark' ? 'border-emerald-500/20' : 'border-emerald-500/30';
              dotColor = 'bg-emerald-400';
            } else if (colId === 'delayed') {
              colTitle = 'Просрочены';
              colBg = theme === 'dark' ? 'bg-rose-950/15' : 'bg-rose-500/10 backdrop-blur-md shadow-sm';
              borderAccent = theme === 'dark' ? 'border-rose-500/20' : 'border-rose-500/30';
              dotColor = 'bg-rose-400';
            }

            return (
              <div 
                key={colId} 
                className={`p-4 rounded-3xl border ${borderAccent} ${colBg} flex flex-col w-72 shrink-0 space-y-4`}
              >
                {/* Column Title */}
                <div className={`flex items-center justify-between border-b pb-2 ${
                  theme === 'dark' ? 'border-white/5' : 'border-zinc-200'
                }`}>
                  <span className={`flex items-center gap-2 font-bold text-xs font-sans uppercase tracking-wider ${
                    theme === 'dark' ? 'text-white' : 'text-zinc-900'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span>{colTitle}</span>
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    theme === 'dark' ? 'bg-slate-950/55 text-slate-400' : 'bg-amber-500/20 text-amber-950'
                  }`}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Task Cards Container */}
                <div className="space-y-3 min-h-[350px]">
                  {columnTasks.length > 0 ? (
                    columnTasks.map(task => {
                      // Calculate checklist progress
                      const doneCount = task.checklist.filter(c => c.done).length;
                      const totalSub = task.checklist.length;
                      const progressPct = totalSub > 0 ? Math.round((doneCount / totalSub) * 100) : 0;

                      return (
                        <div 
                          key={task.id}
                          className={`group p-3 rounded-2xl border backdrop-blur-md relative transition-all duration-300 transform hover:-translate-y-0.5 space-y-2.5 ${
                            theme === 'dark'
                              ? 'bg-gradient-to-br from-[#1A1510]/95 to-[#0F0C09]/95 border-[#E7C768]/20 hover:border-[#E7C768]/60 shadow-[0_4px_12px_rgba(217,158,65,0.06)] hover:shadow-[0_8px_24px_rgba(231,199,104,0.25)] text-slate-100'
                              : 'bg-gradient-to-br from-[#fdfbf7] to-[#f6f1e3] border-amber-600/30 hover:border-amber-600 shadow-[0_4px_14px_rgba(180,110,40,0.12)] hover:shadow-[0_8px_24px_rgba(180,110,40,0.22)] text-zinc-800'
                          }`}
                        >
                          {/* Project Name, Priority Badge & Actions */}
                          <div className="flex items-start justify-between gap-1.5">
                            <span className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded font-bold truncate max-w-[110px] ${
                              theme === 'dark' 
                                ? 'bg-[#2D1F10]/80 text-[#E7C768]' 
                                : 'bg-amber-100 text-amber-950'
                            }`}>
                              {task.projectTitle}
                            </span>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono font-bold ${
                                task.priority === 'high' ? 'bg-rose-500/20 text-rose-500' :
                                task.priority === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                                'bg-emerald-500/20 text-emerald-500'
                              }`}>
                                {task.priority === 'high' ? 'Высокий' :
                                 task.priority === 'medium' ? 'Средний' : 'Низкий'}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTaskItem(task);
                                  setShowQuickTaskModal(true);
                                }}
                                className="p-1 rounded-lg border border-amber-400/40 hover:bg-amber-500/20 text-[#E7C768] cursor-pointer transition-all shadow-xs"
                                title="Редактировать задачу"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskToDelete(task);
                                }}
                                className="p-1 rounded-lg border border-red-500/40 hover:bg-red-500/20 text-red-400 cursor-pointer transition-all shadow-xs"
                                title="Удалить задачу"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Task Title */}
                          <h4 
                            onClick={() => {
                              if (onNavigate) onNavigate(`/cabinet/task${task.id}`);
                            }}
                            className={`text-xs font-black transition-colors leading-tight font-sans cursor-pointer hover:underline ${
                              theme === 'dark' ? 'text-slate-100 group-hover:text-[#F4EE8E]' : 'text-zinc-900 group-hover:text-amber-800'
                            }`}
                          >
                            {task.taskTitle}
                          </h4>

                          {/* Comfort or Detailed Extra Info */}
                          {density !== 'compact' && task.description && (
                            <p className={`text-[10px] line-clamp-2 leading-relaxed ${
                              theme === 'dark' ? 'text-slate-400' : 'text-zinc-600'
                            }`}>
                              {task.description}
                            </p>
                          )}

                          {/* Checklist Circular/Inline progress */}
                          {totalSub > 0 && (
                            <div className={`p-2 rounded-xl border space-y-1.5 ${
                              theme === 'dark' ? 'bg-slate-950/45 border-white/5' : 'bg-amber-50/50 border-amber-200/50'
                            }`}>
                              <div className="flex items-center justify-between text-[9px] text-slate-400">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'}>Подзадачи ({doneCount}/{totalSub})</span>
                                <span className={`font-extrabold font-mono ${
                                  theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-800'
                                }`}>{progressPct}%</span>
                              </div>
                              
                              {/* Small micro progress-bar with gold glow */}
                              <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                theme === 'dark' ? 'bg-slate-800' : 'bg-amber-200/40'
                              }`}>
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    theme === 'dark' 
                                      ? 'bg-gradient-to-r from-amber-500 via-[#F4EE8E] to-amber-500 shadow-[0_0_10px_rgba(244,238,142,0.75)]' 
                                      : 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 shadow-[0_0_8px_rgba(217,119,6,0.5)]'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>

                              {/* Detailed sub-list if requested */}
                              {density === 'detailed' && (
                                <div className="space-y-1 pt-1.5 max-h-[100px] overflow-y-auto">
                                  {task.checklist.map(item => (
                                    <button
                                      key={item.id}
                                      onClick={() => handleToggleChecklist(task.projectId, task.id, item.id)}
                                      className={`w-full flex items-center gap-1.5 text-left text-[9px] transition-colors cursor-pointer ${
                                        theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-950'
                                      }`}
                                    >
                                      {item.done ? (
                                        <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                                      ) : (
                                        <div className={`w-2.5 h-2.5 rounded border shrink-0 ${
                                          theme === 'dark' ? 'border-white/20' : 'border-zinc-300'
                                        }`} />
                                      )}
                                      <span className={item.done ? 'line-through text-slate-500' : ''}>{item.text}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Author & Executor section */}
                          <div className={`space-y-1.5 border-t pt-2 text-[10px] ${
                            theme === 'dark' ? 'border-white/5 text-slate-400' : 'border-amber-200/40 text-zinc-500'
                          }`}>
                            <div className="flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1 min-w-0" title={`Постановщик: ${task.author_name || task.authorName || 'Руководитель'}`}>
                                <span className="text-amber-500 font-bold shrink-0">📌</span>
                                <span className="text-[9px] text-slate-400 shrink-0">От:</span>
                                <span className={`truncate font-medium text-[10px] ${theme === 'dark' ? 'text-amber-200/90' : 'text-amber-900'}`}>
                                  {task.author_name || task.authorName || 'Руководитель'}
                                </span>
                              </span>

                              <span className="flex items-center gap-1 font-mono text-[9px] shrink-0">
                                <Clock size={10} />
                                <span>{task.deadlineDays} дн.</span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1 min-w-0" title={`Исполнитель: ${task.executorName || 'Сотрудник'}`}>
                                <User size={10} className={theme === 'dark' ? 'text-amber-300 shrink-0' : 'text-amber-700 shrink-0'} />
                                <span className="text-[9px] text-slate-400 shrink-0">Кому:</span>
                                <span className={`truncate font-bold text-[10px] ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                                  {task.executorName || 'Сотрудник'}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* AI Verified Badge or Score Banner */}
                          {task.status === 'completed' && task.verifiedByAI && (
                            <div className={`flex items-center justify-between gap-1 p-1.5 rounded-lg text-[9px] ${
                              theme === 'dark' 
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            }`}>
                              <span className="flex items-center gap-1 font-bold">
                                <ShieldCheck size={12} />
                                <span>Проверено ИИ</span>
                              </span>
                              <span className="font-extrabold font-mono bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded">
                                {task.score}б
                              </span>
                            </div>
                          )}

                          {/* Bottom Row Interactivity: Drag Swipe, Move and AI Verify Buttons */}
                          <div className={`flex items-center justify-between gap-1.5 pt-1.5 border-t ${
                            theme === 'dark' ? 'border-white/5' : 'border-amber-200/40'
                          }`}>
                            {/* Mobile Move selector helper */}
                            <div className="relative">
                              <button
                                onClick={() => setQuickMoveTaskId(quickMoveTaskId === task.id ? null : task.id)}
                                className="p-1 rounded-lg bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-950/60 transition-all border border-white/5"
                                title="Переместить в другую колонку"
                              >
                                <Layers size={11} />
                              </button>

                              {quickMoveTaskId === task.id && (
                                <div className="absolute left-0 bottom-6 z-30 w-36 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-1.5 space-y-1 animate-scale-in">
                                  <span className="block text-[8px] text-slate-500 uppercase tracking-widest px-1.5 py-0.5 font-mono">Переместить:</span>
                                  {(['pending', 'in_progress', 'verification', 'completed', 'delayed'] as const).map(targetCol => (
                                    <button
                                      key={targetCol}
                                      onClick={() => handleMoveStatus(task.projectId, task.id, targetCol)}
                                      className="w-full text-left text-[9px] px-2 py-1 rounded hover:bg-white/5 transition-colors text-slate-200"
                                    >
                                      {targetCol === 'pending' && '⏳ Ожидает'}
                                      {targetCol === 'in_progress' && '🚀 В работе'}
                                      {targetCol === 'verification' && '🔬 На проверку'}
                                      {targetCol === 'completed' && '✅ Выполнена'}
                                      {targetCol === 'delayed' && '🔴 Просрочена'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Direct Quick Comments Count button */}
                            <button
                              onClick={() => setCommentingTaskId(task.id)}
                              className="px-2 py-1 rounded-lg bg-slate-950/30 hover:bg-slate-950/50 text-[9px] text-slate-400 hover:text-white flex items-center gap-1 transition-all"
                            >
                              <MessageSquare size={10} />
                              <span>{(task.comments || []).length}</span>
                            </button>

                            {/* Primary ACTION: Complete & Start AI Verification */}
                            {task.status !== 'completed' ? (
                              <button
                                onClick={() => startVerificationProcess(task)}
                                className="flex-1 py-1 px-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-[#D99E41] text-slate-950 font-extrabold text-[9px] sm:text-xs flex items-center justify-center gap-1 shadow hover:brightness-110 active:scale-95 cursor-pointer transition-all font-sans"
                              >
                                <Sparkles size={11} />
                                <span>Завершить (ИИ)</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => startVerificationProcess(task)}
                                className="flex-1 py-1 px-2.5 rounded-lg bg-slate-950/40 text-slate-400 hover:text-white text-[9px] sm:text-[10px] flex items-center justify-center gap-1 transition-all"
                              >
                                <Eye size={11} />
                                <span>Посмотреть отчет</span>
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-slate-500 text-[10px] italic border border-dashed border-white/5 rounded-2xl bg-slate-950/5 flex flex-col items-center justify-center space-y-1">
                      <CheckCircle2 size={16} className="text-slate-600" />
                      <span>В этой колонке нет задач</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* PROJECT LIST VIEW */
        <div className="space-y-4">
          <div className={`relative rounded-3xl border overflow-hidden shadow-xl group backdrop-blur-md ${
            theme === 'dark' 
              ? 'border-amber-500/30 bg-[#161616]/60 text-white' 
              : 'border-amber-500/30 bg-white/80 text-zinc-900'
          }`}>
            <div ref={tableScrollRef} className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className={`border-b text-[9px] sm:text-xs font-bold uppercase tracking-wider font-mono ${
                    theme === 'dark'
                      ? 'bg-slate-950/60 border-white/10 text-slate-400'
                      : 'bg-zinc-100/90 border-zinc-200 text-zinc-700'
                  }`}>
                    <th className="p-4">Название задачи</th>
                    <th className="p-4">Проект</th>
                    <th className="p-4">Ответственный</th>
                    <th className="p-4">Срок</th>
                    <th className="p-4">Статус</th>
                    <th className="p-4">Чек-лист</th>
                    <th className="p-4">ИИ-Ревизор</th>
                    <th className="p-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${
                  theme === 'dark' ? 'divide-white/5 text-slate-200' : 'divide-zinc-200 text-zinc-800'
                }`}>
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => {
                      const doneCount = task.checklist.filter(c => c.done).length;
                      const totalSub = task.checklist.length;
                      const progressPct = totalSub > 0 ? Math.round((doneCount / totalSub) * 100) : 0;

                      return (
                        <tr 
                          key={task.id} 
                          onClick={() => {
                            setEditingTaskItem(task);
                            setShowQuickTaskModal(true);
                          }}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <td className="p-4">
                            <div className="space-y-1">
                              <span 
                                onClick={() => {
                                  if (onNavigate) onNavigate(`/cabinet/task${task.id}`);
                                }}
                                className="font-bold text-white block cursor-pointer hover:text-[#F4EE8E] hover:underline"
                              >
                                {task.taskTitle}
                              </span>
                              {task.description && (
                                <p className="text-[10px] text-slate-400 line-clamp-1">{task.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-[#1A1A1A] text-[#F4EE8E] rounded text-[10px] font-semibold">
                              {task.projectTitle}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-white flex items-center gap-1">
                                <User size={11} className="text-amber-400 shrink-0" />
                                {task.executorName}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                От: <span className="text-amber-200/90 font-medium">{task.author_name || task.authorName || 'Руководитель'}</span>
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono font-bold text-slate-400">{task.deadlineDays} дней</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                              task.status === 'in_progress' ? 'bg-sky-500/20 text-sky-400 animate-pulse' :
                              task.status === 'verification' ? 'bg-amber-500/20 text-amber-400' :
                              task.status === 'delayed' ? 'bg-rose-500/20 text-rose-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {task.status === 'completed' && 'Выполнена'}
                              {task.status === 'in_progress' && 'В работе'}
                              {task.status === 'verification' && 'Проверка'}
                              {task.status === 'delayed' && 'Замечания'}
                              {task.status === 'pending' && 'Ожидает'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full shadow-[0_0_5px_rgba(231,199,104,0.35)]" style={{ width: `${progressPct}%` }} />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-slate-400">{progressPct}%</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {task.verifiedByAI ? (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                <ShieldCheck size={12} />
                                <span>Проверено ({task.score}б)</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Ожидает сдачи</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTaskItem(task);
                                  setShowQuickTaskModal(true);
                                }}
                                className="p-1.5 rounded-lg border border-amber-400/40 hover:bg-amber-500/20 text-[#E7C768] cursor-pointer transition-all shadow-xs"
                                title="Редактировать задачу"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskToDelete(task);
                                }}
                                className="p-1.5 rounded-lg border border-red-500/40 hover:bg-red-500/20 text-red-400 cursor-pointer transition-all shadow-xs"
                                title="Удалить задачу"
                              >
                                <Trash2 size={13} />
                              </button>
                              {task.status !== 'completed' ? (
                                <button
                                  onClick={() => startVerificationProcess(task)}
                                  className="px-3 py-1 rounded bg-[#D99E41] text-slate-950 font-extrabold text-[10px] flex items-center gap-1 hover:brightness-110 shadow cursor-pointer active:scale-95 transition-all"
                                >
                                  <Sparkles size={11} />
                                  <span>Завершить (ИИ)</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => startVerificationProcess(task)}
                                  className="px-3 py-1 rounded bg-slate-950/40 text-slate-300 text-[10px] flex items-center gap-1 hover:bg-slate-950/60"
                                >
                                  <Eye size={11} />
                                  <span>Отчет</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 text-xs font-sans">
                        <div className="flex flex-col items-center justify-center space-y-3 py-6 select-none">
                          <img 
                            src="/file/28/iirr2.png" 
                            alt="Задач не найдено" 
                            className="w-24 h-24 object-contain animate-bounce-slow"
                          />
                          <p className="italic text-slate-500">Подходящих задач не найдено. Попробуйте сбросить фильтры или создать новую задачу!</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: USER-REQUESTED INTEGRATED AI VERIFICATION PROCESS */}
      {verifyTaskId && (() => {
        const activeTask = allTasks.find(t => t.id === verifyTaskId);
        if (!activeTask) return null;

        const isApproved = aiReport?.verdict === 'approved';
        const isRejected = aiReport?.verdict === 'rejected';

        return (
          <div className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#122436] p-6 shadow-2xl relative space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold font-mono uppercase tracking-widest text-[#F4EE8E] flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>Интегрированная ИИ Верификация</span>
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white font-sans">
                    {activeTask.taskTitle}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400">
                    Направление: <span className="text-amber-200 font-semibold">{activeTask.projectTitle}</span> | Постановщик: <span className="text-amber-300 font-semibold">{activeTask.author_name || activeTask.authorName || 'Руководитель'}</span> | Исполнитель: <span className="text-slate-200 font-semibold">{activeTask.executorName}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setVerifyTaskId(null); setAiReport(null); }}
                  className="p-1.5 rounded-lg bg-slate-950/40 text-slate-400 hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body: Checklist to Verify */}
              <div className="space-y-4">
                <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-[#D99E41]" />
                    <span>Поля чек-листа задачи</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Перед завершением задачи вы должны отметить пункты регламента, которые были вами выполнены:
                  </p>
                  
                  <div className="space-y-2">
                    {activeTask.checklist.map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-white/5"
                      >
                        <button
                          onClick={() => handleToggleChecklist(activeTask.projectId, activeTask.id, item.id)}
                          className="flex items-center gap-2.5 text-left text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          {item.done ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded border border-white/20 hover:border-[#E7C768] shrink-0" />
                          )}
                          <span className={item.done ? 'line-through text-slate-500' : ''}>{item.text}</span>
                        </button>

                        {/* AI Detection tick inside report */}
                        {aiReport && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isApproved ? 'ИИ: Подтверждено' : 'ИИ: Не найдено'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated File proof upload section */}
                <div className="bg-slate-950/20 p-4 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Paperclip size={14} className="text-[#D99E41]" />
                    <span>Файлы-доказательства & ТТН</span>
                  </h4>

                  {verifyAttachedFiles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {verifyAttachedFiles.map((file, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 flex items-center gap-2">
                          <FileText size={16} className="text-amber-200" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate font-mono">{file.name}</p>
                            <p className="text-[9px] text-slate-500 uppercase font-mono">{file.type}</p>
                          </div>
                          <button 
                            onClick={() => setVerifyAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-white p-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 border border-dashed border-white/10 rounded-xl bg-slate-950/10 text-center space-y-2">
                      <p className="text-[11px] text-slate-400">Прикрепите файлы (сканы накладных, ТТН, аудиозаписи звонков, фото оконных швов)</p>
                      <button
                        onClick={() => {
                          // Quick Mock upload files depending on project context
                          let mockName = 'photo_window_gost.png';
                          if (activeTask.taskTitle.includes('скрипт')) mockName = 'sales_phone_script.docx';
                          if (activeTask.taskTitle.includes('базе')) mockName = 'customer_base_checked.xlsx';
                          if (activeTask.taskTitle.includes('щебня')) mockName = 'waybill_crushed_stone.pdf';
                          if (activeTask.taskTitle.includes('отчетности')) mockName = 'tax_declaration_q2.xml';

                          setVerifyAttachedFiles([{ name: mockName, type: 'document' }]);
                        }}
                        className="px-3 py-1 bg-slate-950/80 rounded-xl border border-white/10 text-[10px] text-amber-200 hover:text-white inline-flex items-center gap-1 transition-all hover:bg-slate-950 cursor-pointer"
                      >
                        <Upload size={12} />
                        <span>Прикрепить тестовые доказательства</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulated Holographic AI Scanner Logs */}
                {isAILoading && (
                  <div className="bg-slate-950 border border-amber-500/20 rounded-2xl p-4 font-mono text-[10px] text-amber-400 space-y-1.5 shadow-inner max-h-[150px] overflow-y-auto">
                    <div className="flex items-center gap-2 text-white font-bold mb-1">
                      <RefreshCw size={12} className="animate-spin text-amber-400" />
                      <span>АКТИВНОЕ ИИ СКАНИРОВАНИЕ РЕЗУЛЬТАТОВ...</span>
                    </div>
                    {aiScanLogs.map((log, index) => (
                      <div key={index} className="flex items-center gap-1.5 animate-pulse">
                        <span className="text-slate-500">[{index + 1}]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Result Report Panel */}
                {aiReport && (
                  <div className={`p-5 rounded-2xl border ${
                    isApproved ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                  } space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                        isApproved ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isApproved ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{isApproved ? 'Проверка ИИ Ревизора Успешна!' : 'ИИ выявил замечания'}</span>
                      </span>
                      <span className={`text-sm font-extrabold font-mono px-2 py-0.5 rounded ${
                        isApproved ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}>
                        {aiReport.score} баллов из 100
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      {aiReport.feedback}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                <button
                  onClick={() => { setVerifyTaskId(null); setAiReport(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-950/40 text-slate-300 hover:text-white transition-all text-xs"
                >
                  Закрыть
                </button>

                {!aiReport && !isAILoading && (
                  <button
                    onClick={() => handleRunAISimulation(activeTask)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#D99E41] text-slate-950 font-extrabold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 cursor-pointer shadow transition-all font-sans"
                  >
                    <Sparkles size={14} />
                    <span>Запустить ИИ-Верификацию</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* 5. QUICK COMMENTS SIDE DRAWER */}
      {commentingTaskId && (() => {
        const activeTask = allTasks.find(t => t.id === commentingTaskId);
        if (!activeTask) return null;
        const comms = activeTask.comments || [];

        return (
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-gradient-to-b from-[#161616] to-[#122436] border-l border-white/10 z-50 p-6 shadow-2xl flex flex-col justify-between animate-slide-in-right">
            
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">Комментарии команды</span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white font-sans truncate max-w-[200px]">
                    {activeTask.taskTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setCommentingTaskId(null)}
                  className="p-1.5 rounded-lg bg-slate-950/40 text-slate-400 hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {comms.length > 0 ? (
                  comms.map(c => (
                    <div key={c.id} className="p-3 rounded-2xl bg-slate-950/30 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-amber-200">{c.authorName}</span>
                        <span className="text-slate-500 font-mono">{c.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs italic flex flex-col items-center gap-1">
                    <MessageSquare size={20} className="text-slate-600" />
                    <span>Обсуждений по задаче пока нет</span>
                  </div>
                )}
              </div>
            </div>

            {/* Comment Input form */}
            <div className="border-t border-white/5 pt-4 space-y-2">
              <textarea
                placeholder="Задайте вопрос исполнителю или напишите ИИ-Ревизору..."
                rows={3}
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                className="w-full p-2.5 bg-slate-950/60 rounded-xl text-xs text-white border border-white/10 focus:border-[#E7C768] outline-none resize-none placeholder-slate-500"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    // Quick simulated AI reply helper
                    let aiReplyText = `ИИ Ревизор: Срок завершения задачи - ${activeTask.deadlineDays} дней. Пожалуйста, прикрепите подтверждение результатов для своевременной автоматической верификации.`;
                    setProcesses(prev => prev.map(p => {
                      if (p.id !== activeTask.projectId) return p;
                      return {
                        ...p,
                        tasks: p.tasks.map(t => {
                          if (t.id !== activeTask.id) return t;
                          return {
                            ...t,
                            comments: [
                              ...(t.comments || []),
                              {
                                id: `comm-ai-${Date.now()}`,
                                authorName: '🧠 ИИ Ревизор',
                                text: aiReplyText,
                                createdAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                              }
                            ]
                          };
                        })
                      };
                    }));
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#E7C768]/10 text-[#F4EE8E] hover:bg-[#E7C768]/20 text-[10px] font-bold flex items-center gap-1 transition-all"
                >
                  <Sparkles size={11} />
                  <span>Спросить ИИ</span>
                </button>

                <button
                  onClick={() => handleAddComment(activeTask.projectId, activeTask.id)}
                  className="px-4 py-1.5 rounded-lg bg-[#D99E41] hover:brightness-110 text-slate-950 text-[11px] font-extrabold cursor-pointer transition-all"
                >
                  Отправить
                </button>
              </div>
            </div>

          </div>
        );
      })()}

      {/* 6. MODAL: QUICK TASK CREATION & EDITING */}
      {showQuickTaskModal && (
        <CreateTaskModal
          isOpen={showQuickTaskModal}
          onClose={() => {
            setShowQuickTaskModal(false);
            setEditingTaskItem(null);
          }}
          projects={processes.map(p => ({ id: p.id, title: p.title }))}
          employees={mockEmployees.map(e => ({ id: e.id, name: e.name, role: e.role, position: e.position }))}
          currentProjectId={editingTaskItem ? editingTaskItem.projectId : (projectFilter !== "all" ? projectFilter : (initialProjectId !== "all" ? initialProjectId : processes[0]?.id))}
          editingTask={editingTaskItem ? {
            id: editingTaskItem.id,
            projectId: editingTaskItem.projectId || (processes.find(p => p.tasks.some(t => t.id === editingTaskItem.id))?.id || processes[0]?.id || 'p-1'),
            taskTitle: editingTaskItem.taskTitle,
            description: editingTaskItem.description || '',
            executorId: editingTaskItem.executorId || '',
            executorName: editingTaskItem.executorName || '',
            executorRole: editingTaskItem.executorRole || 'Сотрудник',
            deadlineDays: editingTaskItem.deadlineDays || 3,
            priority: editingTaskItem.priority || 'medium',
            budget: editingTaskItem.budget || 0,
            verifyMethod: editingTaskItem.verifyMethod || 'hybrid',
            fields: parseFieldsSafe(editingTaskItem.fields).length > 0
              ? parseFieldsSafe(editingTaskItem.fields)
              : parseChecklistSafe(editingTaskItem.checklist).map((c: any, i: number) => ({
                  id: c.id || `f_${i}`,
                  label: c.text,
                  type: 'text_short' as any,
                  required: true,
                  hint: `Подтверждение: ${c.text}`
                })),
            checklist: parseChecklistSafe(editingTaskItem.checklist),
            checkCriteria: editingTaskItem.checkCriteria || 'Соответствие регламенту компании и чек-листу',
            minScore: editingTaskItem.minScore || 80,
            status: editingTaskItem.status
          } : null}
          onSaveTask={async (newTaskData) => {
            const isEditing = Boolean(editingTaskItem && editingTaskItem.id);
            const targetTaskId = newTaskData.id || editingTaskItem?.id || ("task-" + Date.now());
            const assignedProc = processes.find(p => p.id === newTaskData.projectId) || 
                                 processes.find(p => p.tasks.some(t => t.id === targetTaskId)) || 
                                 processes[0];
            if (!assignedProc) return;

            const taskPayload: RevisorTask = {
              id: targetTaskId,
              executorId: newTaskData.executorId,
              executorName: newTaskData.executorName,
              executorRole: newTaskData.executorRole || "Сотрудник",
              taskTitle: newTaskData.taskTitle,
              deadlineDays: newTaskData.deadlineDays,
              status: isEditing && editingTaskItem ? editingTaskItem.status : "pending",
              checklist: (newTaskData.fields || []).map((f, i) => ({ id: f.id || "c" + i, text: f.label, done: false })),
              attachedFiles: isEditing && editingTaskItem ? editingTaskItem.attachedFiles : [],
              verifiedByAI: isEditing && editingTaskItem ? editingTaskItem.verifiedByAI : false,
              score: isEditing && editingTaskItem ? editingTaskItem.score : 0,
              description: newTaskData.description,
              priority: newTaskData.priority
            };

            if (isEditing) {
              setProcesses(prev => prev.map(p => {
                const contains = p.tasks.some(t => t.id === targetTaskId);
                if (!contains) return p;
                return {
                  ...p,
                  tasks: p.tasks.map(t => t.id === targetTaskId ? taskPayload : t)
                };
              }));

              fetch(`/api/tasks/${targetTaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskTitle: taskPayload.taskTitle,
                  title: taskPayload.taskTitle,
                  description: taskPayload.description,
                  executorId: taskPayload.executorId,
                  executorName: taskPayload.executorName,
                  executorRole: taskPayload.executorRole,
                  deadLine: new Date(Date.now() + taskPayload.deadlineDays * 24 * 3600 * 1000).toISOString().split('T')[0],
                  priority: taskPayload.priority,
                  checklist: taskPayload.checklist,
                  fields: newTaskData.fields,
                  check_criteria: newTaskData.checkCriteria
                })
              }).catch(err => console.error('Error updating task in DB:', err));
            } else {
              setProcesses(prev => prev.map(p => {
                if (p.id !== assignedProc.id) return p;
                return {
                  ...p,
                  tasks: [taskPayload, ...p.tasks]
                };
              }));

              const dLine = new Date(Date.now() + taskPayload.deadlineDays * 24 * 3600 * 1000).toISOString().split('T')[0];
              fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...taskPayload,
                  projectId: assignedProc.id,
                  deadLine: dLine,
                  author_id: currentUser?.id,
                  fields: newTaskData.fields,
                  check_criteria: newTaskData.checkCriteria
                })
              }).catch(err => console.error('Error creating task in DB:', err));
            }

            setShowQuickTaskModal(false);
            setEditingTaskItem(null);
          }}
          isDark={theme === "dark"}
          currentUser={currentUser}
        />
      )}

      {/* CUSTOM TASK DELETION CONFIRMATION MODAL */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-fade-in font-sans">
          <div className={`border rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl transition-colors ${
            theme === 'light'
              ? 'bg-[#FFFBF5]/95 border-[#B8860B]/40 text-amber-950 shadow-[0_0_40px_rgba(184,134,11,0.15)]'
              : 'bg-[#1A0F02]/90 border-[#E7C768]/40 text-slate-100 shadow-[0_0_40px_rgba(244,238,142,0.15)]'
          }`}>
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <Trash2 size={22} />
              <h4 className="text-base sm:text-lg font-bold">Удаление задачи</h4>
            </div>
            <p className="text-sm font-medium leading-relaxed">
              Вы уверены, что хотите удалить задачу «{taskToDelete.taskTitle}»?
            </p>
            <p className="text-sm opacity-80 leading-relaxed">
              Это действие необратимо и удалит задачу из базы данных PostgreSQL BD ProTalk, чек-лист и все связанные подтверждения.
            </p>
            <div className={`flex gap-3 pt-3 border-t ${theme === 'light' ? 'border-amber-950/10' : 'border-amber-400/20'}`}>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-center ${
                  theme === 'light'
                    ? 'bg-amber-950/5 hover:bg-amber-950/10 text-amber-900'
                    : 'bg-white/5 hover:bg-white/10 text-amber-200'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  const delId = taskToDelete.id;
                  setProcesses(prev => prev.map(p => ({
                    ...p,
                    tasks: p.tasks.filter(t => t.id !== delId)
                  })));
                  fetch(`/api/tasks/${delId}`, { method: 'DELETE' }).catch(err => console.error('Error deleting task:', err));
                  setTaskToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-all cursor-pointer text-center shadow-md"
              >
                Удалить задачу
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

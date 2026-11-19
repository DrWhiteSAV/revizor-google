import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  Calendar, 
  Globe,
  LayoutGrid,
  List,
  Plus, 
  Filter, 
  Search, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User as UserIcon, 
  Users, 
  X, 
  Link2, 
  MoreHorizontal, 
  ArrowRight,
  TrendingUp,
  Folder,
  FolderOpen,
  Info,
  Zap,
  CheckCircle,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeftRight,
  RefreshCw,
  Send
} from 'lucide-react';
import { isTaskMine as checkTaskMineUnified, isTaskFromMe as checkTaskFromMeUnified } from '../../utils/taskFilters';
import { UserProfile } from '../../types';
import { useCascadeCheckStore } from '../../store/useCascadeCheckStore';
import { CascadeStep } from '../../components/raport/ReportCascadeCheckOverlay';
import { MobileGanttView } from '../../components/gantt/MobileGanttView';

interface RevisorTask {
  id: string;
  executorId: string;
  executorName: string;
  executorRole: string;
  taskTitle: string;
  deadlineDays: number;
  status: 'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed';
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
  author_id?: string;
  author_name?: string;
  author_avatar?: string;
}

interface BusinessProcess {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'completed' | 'delayed';
  tasks: RevisorTask[];
  evaluation: string;
  recommendations: string;
  budget?: number;
  manager?: string;
}

interface CabinetBitrixGanttProps {
  processes: BusinessProcess[];
  selectedProcess: BusinessProcess | null;
  setProcesses: React.Dispatch<React.SetStateAction<BusinessProcess[]>>;
  mockEmployees: UserProfile[] | any[];
  currentUser: any;
  isManager: boolean;
  theme?: 'light' | 'dark';
  triggerToast: (msg: string) => void;
  onSwitchSubTab?: (tab: string) => void;
  onNavigate?: (path: string) => void;
}

export default function CabinetBitrixGantt({
  processes,
  selectedProcess,
  setProcesses,
  mockEmployees,
  currentUser,
  isManager,
  theme = 'dark',
  triggerToast,
  onSwitchSubTab,
  onNavigate
}: CabinetBitrixGanttProps) {
  // Local States
  const [currentProcessId, setCurrentProcessId] = useState<string>(
    selectedProcess?.id || (processes[0] ? processes[0].id : '')
  );
  const [calendarScale, setCalendarScale] = useState<'day' | 'week' | 'month'>('month');
  const [selectedWeekStartDay, setSelectedWeekStartDay] = useState<number>(10); // Default July 10-16
  const [selectedDayNum, setSelectedDayNum] = useState<number>(13); // Default July 13th
  const [zoomLevel, setZoomLevel] = useState<number>(42); // px per day column
  const [cascadeShiftEnabled, setCascadeShiftEnabled] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<'mine' | 'from_me' | 'all'>('mine');

  const isTaskMine = (t: RevisorTask, p?: BusinessProcess) => {
    return checkTaskMineUnified(t, currentUser);
  };
  const isTaskFromMe = (t: RevisorTask, p?: BusinessProcess) => {
    return checkTaskFromMeUnified(t, currentUser);
  };
  
  // Selected task for drawer panel
  const [activeTaskDrawerId, setActiveTaskDrawerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'main' | 'assignments' | 'extra' | 'fields'>('main');
  const [mobileShiftTaskId, setMobileShiftTaskId] = useState<string | null>(null);
  const [mobileShiftDays, setMobileShiftDays] = useState<number>(2);
  const [submittingTask, setSubmittingTask] = useState<boolean>(false);
  const [submitVerdict, setSubmitVerdict] = useState<any>(null);
  const [taskFormAnswers, setTaskFormAnswers] = useState<Record<string, any>>({});
  
  // Refs for scrolling timeline container (Dual Scrollbars)
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef<boolean>(false);

  // Modal for Cascade shift info
  const [showCascadeInfoModal, setShowCascadeInfoModal] = useState<boolean>(false);

  // Synchronize Top and Bottom Horizontal Scrollbars
  const handleTopScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollRef.current && timelineScrollRef.current) {
      timelineScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleBottomScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (timelineScrollRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = timelineScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };
  
  // Hovered task for tooltip
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Mobile / Desktop collapsible left task list panel
  const [isListCollapsed, setIsListCollapsed] = useState<boolean>(false);
  const [isMobileToolbarExpanded, setIsMobileToolbarExpanded] = useState<boolean>(false);

  // Drag-stretch and move state for Gantt task bars
  const [draggingTask, setDraggingTask] = useState<{
    taskId: string;
    edge: 'start' | 'end' | 'move';
    initialX: number;
    initialStartDay: number;
    initialDurationDays: number;
    currentStartDay: number;
    currentDurationDays: number;
    floatX: number;
    floatY: number;
  } | null>(null);

  // Quick task modal state
  const [showQuickAddTask, setShowQuickAddTask] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskExecutorId, setNewTaskExecutorId] = useState<string>(mockEmployees[0]?.id || '1');
  const [newTaskStartDay, setNewTaskStartDay] = useState<number>(1);
  const [newTaskDuration, setNewTaskDuration] = useState<number>(3);
  const [newTaskDependencyId, setNewTaskDependencyId] = useState<string>('');

  // Expandable group folders in table
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'main-group': true,
    'secondary-group': true
  });

  // Target process
  const activeProcess = processes.find(p => p.id === currentProcessId) || selectedProcess || processes[0];

  // Real-time date & clock state
  const [now, setNow] = useState<Date>(new Date());

  // Update clock every 10 seconds for real-time accuracy
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthName = now.toLocaleString('ru-RU', { month: 'long' });
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const totalDaysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const simulatedToday = now.getDate(); // Dynamic current day of month (e.g. 31)
  const currentTimeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  // Helper to calculate effective task duration considering real-time auto-extension for unfinished tasks
  const getTaskEffectiveDuration = (task: RevisorTask) => {
    const isCompleted = task.status === 'completed';
    const sDay = task.startDay || 1;
    const baseDur = task.durationDays || task.deadlineDays || 2;

    const hourFraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
    const nowOffsetInDays = (simulatedToday - 1) + hourFraction; // e.g. Day 31 at 14:00 = 30.5833
    const startOffsetInDays = sDay - 1;
    const baseEndOffsetInDays = startOffsetInDays + baseDur;

    let effectiveDur = baseDur;
    let isAutoExtended = false;

    // Unfinished tasks starting on or before current date automatically extend to current date & time
    if (!isCompleted && startOffsetInDays <= nowOffsetInDays) {
      const targetEndOffset = Math.max(baseEndOffsetInDays, nowOffsetInDays);
      effectiveDur = targetEndOffset - startOffsetInDays;
      isAutoExtended = targetEndOffset > baseEndOffsetInDays;
    }

    return {
      startDay: sDay,
      baseDur,
      effectiveDur,
      isAutoExtended,
      endDay: sDay + Math.ceil(effectiveDur)
    };
  };

  // Cascade dates automatic resolver
  const resolveCascadeDates = (tasks: RevisorTask[]): RevisorTask[] => {
    let updated = [...tasks];
    let changed = true;
    let passes = 0;

    while (changed && passes < 10) {
      changed = false;
      passes++;
      for (let i = 0; i < updated.length; i++) {
        const task = updated[i];
        if (task.dependentOnTaskId) {
          const parent = updated.find(t => t.id === task.dependentOnTaskId);
          if (parent) {
            const parentEff = getTaskEffectiveDuration(parent);
            const parentEnd = parentEff.endDay;
            if ((task.startDay || 1) < parentEnd) {
              const newStart = parentEnd;
              updated[i] = { ...task, startDay: newStart };
              changed = true;
            }
          }
        }
      }
    }
    return updated;
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!activeProcess || !activeProcess.tasks) return [];
    return activeProcess.tasks.filter(t => {
      if (scopeFilter === 'mine' && !isTaskMine(t, activeProcess)) return false;
      if (scopeFilter === 'from_me' && !isTaskFromMe(t, activeProcess)) return false;
      const matchesSearch = t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.executorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true :
                            statusFilter === 'overdue' ? t.status === 'delayed' :
                            t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeProcess, searchQuery, statusFilter, scopeFilter, currentUser]);

  // Count overdue tasks
  const overdueCount = useMemo(() => {
    return processes.reduce((acc, p) => {
      return acc + (p.tasks || []).filter(t => t.status === 'delayed').length;
    }, 0);
  }, [processes]);

  // Handle task drag or duration update
  const updateTaskDates = (taskId: string, newStart: number, newDuration: number) => {
    setProcesses(prev => prev.map(p => {
      if (p.id !== activeProcess.id) return p;
      let updatedTasks = p.tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, startDay: Math.max(1, newStart), durationDays: Math.max(1, newDuration), deadlineDays: Math.max(1, newDuration) };
        }
        return t;
      });

      if (cascadeShiftEnabled) {
        updatedTasks = resolveCascadeDates(updatedTasks);
      }
      return { ...p, tasks: updatedTasks };
    }));
  };

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, task: RevisorTask, edge: 'start' | 'end' | 'move') => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const startDay = task.startDay || 1;
    const durationDays = task.durationDays || 3;

    setDraggingTask({
      taskId: task.id,
      edge,
      initialX: clientX,
      initialStartDay: startDay,
      initialDurationDays: durationDays,
      currentStartDay: startDay,
      currentDurationDays: durationDays,
      floatX: clientX,
      floatY: clientY - 45
    });
  };
  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProcess) return;

    const emp = mockEmployees.find(e => e.id === newTaskExecutorId) || mockEmployees[0] || { name: 'Евгений', position: 'Специалист' };
    const id = `task-${Date.now()}`;
    const newTask: RevisorTask = {
      id,
      executorId: emp.id,
      executorName: emp.name || 'Сотрудник',
      executorRole: emp.position || 'Специалист',
      taskTitle: newTaskTitle.trim(),
      deadlineDays: newTaskDuration,
      status: 'in_progress',
      checklist: [{ id: `ch-${Date.now()}`, text: 'Первый этап задачи', done: false }],
      attachedFiles: [],
      verifiedByAI: false,
      score: 0,
      startDay: newTaskStartDay,
      durationDays: newTaskDuration,
      dependentOnTaskId: newTaskDependencyId || null,
      priority: 'medium',
      comments: []
    };

    setProcesses(prev => prev.map(p => {
      if (p.id !== activeProcess.id) return p;
      let updatedTasks = [...p.tasks, newTask];
      if (cascadeShiftEnabled) {
        updatedTasks = resolveCascadeDates(updatedTasks);
      }
      return { ...p, tasks: updatedTasks };
    }));

    triggerToast(`Задача "${newTask.taskTitle}" успешно добавлена в Гант!`);
    setNewTaskTitle('');
    setShowQuickAddTask(false);
  };

  // Flattened rows across all processes for cascading left panel and timeline
  const flattenedTaskRows = useMemo(() => {
    const result: {
      type: 'project' | 'task';
      processId: string;
      processTitle: string;
      task?: RevisorTask;
      rowIndex: number;
    }[] = [];
    let index = 0;

    processes.forEach((p) => {
      const pTasks = p.tasks.filter((task) => {
        const matchesSearch = !searchQuery || 
          task.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
          task.executorName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesScope = scopeFilter === 'all' ? true : scopeFilter === 'mine' ? isTaskMine(task, p) : isTaskFromMe(task, p);
        return matchesSearch && matchesStatus && matchesScope;
      });

      if (pTasks.length > 0 || (!searchQuery && scopeFilter === 'all')) {
        result.push({
          type: 'project',
          processId: p.id,
          processTitle: p.title,
          rowIndex: index++
        });

        const isExpanded = expandedFolders[p.id] !== false; // default expanded
        if (isExpanded) {
          pTasks.forEach((t) => {
            result.push({
              type: 'task',
              processId: p.id,
              processTitle: p.title,
              task: t,
              rowIndex: index++
            });
          });
        }
      }
    });

    return result;
  }, [processes, searchQuery, statusFilter, scopeFilter, expandedFolders, currentUser]);

  // Computed scale config for Gantt grid positioning
  const scaleConfig = useMemo(() => {
    let colWidth = zoomLevel;
    let totalCols = totalDaysInMonth;
    let headerTitle = `${capitalizedMonth} ${currentYear}`;

    if (calendarScale === 'day') {
      colWidth = zoomLevel * 1.6;
      totalCols = totalDaysInMonth;
      headerTitle = `${capitalizedMonth} ${currentYear} (По дням)`;
    } else if (calendarScale === 'week') {
      colWidth = zoomLevel * 3;
      totalCols = Math.ceil(totalDaysInMonth / 7);
      headerTitle = `${capitalizedMonth} ${currentYear} (По неделям)`;
    } else {
      colWidth = zoomLevel;
      totalCols = totalDaysInMonth;
      headerTitle = `${capitalizedMonth} ${currentYear} (По дням месяца)`;
    }

    const totalWidth = colWidth * totalCols;

    const cols = Array.from({ length: totalCols }, (_, i) => {
      const dayNum = i + 1;
      const isToday = dayNum === simulatedToday;
      const isWeekend = (i % 7 === 5 || i % 7 === 6);
      return {
        id: `col-${i}`,
        num: dayNum,
        label: calendarScale === 'week' ? `Нед ${i + 1}` : `${dayNum}`,
        isToday,
        isWeekend
      };
    });

    const getTaskBarPos = (task: RevisorTask) => {
      const eff = getTaskEffectiveDuration(task);
      const startOffsetInDays = eff.startDay - 1;

      if (calendarScale === 'week') {
        const startWeek = startOffsetInDays / 7;
        const durWeeks = eff.effectiveDur / 7;
        return {
          left: startWeek * colWidth,
          width: Math.max(28, durWeeks * colWidth),
          isVisible: true,
          effectiveDur: eff.effectiveDur,
          isAutoExtended: eff.isAutoExtended,
          baseDur: eff.baseDur
        };
      }

      return {
        left: startOffsetInDays * colWidth,
        width: Math.max(28, eff.effectiveDur * colWidth),
        isVisible: true,
        effectiveDur: eff.effectiveDur,
        isAutoExtended: eff.isAutoExtended,
        baseDur: eff.baseDur
      };
    };

    return {
      colWidth,
      totalCols,
      totalWidth,
      headerTitle,
      cols,
      getTaskBarPos
    };
  }, [calendarScale, zoomLevel, totalDaysInMonth, capitalizedMonth, currentYear, simulatedToday]);

  // Global mouse & touch listeners for manual Gantt bar drag & drop
  useEffect(() => {
    if (!draggingTask) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - draggingTask.initialX;
      const deltaDays = Math.round(deltaX / scaleConfig.colWidth);

      let newStartDay = draggingTask.initialStartDay;
      let newDuration = draggingTask.initialDurationDays;

      if (draggingTask.edge === 'start') {
        newStartDay = Math.max(1, draggingTask.initialStartDay + deltaDays);
        newDuration = Math.max(1, draggingTask.initialDurationDays - (newStartDay - draggingTask.initialStartDay));
      } else if (draggingTask.edge === 'end') {
        newDuration = Math.max(1, draggingTask.initialDurationDays + deltaDays);
      } else if (draggingTask.edge === 'move') {
        newStartDay = Math.max(1, draggingTask.initialStartDay + deltaDays);
      }

      setDraggingTask(prev => prev ? {
        ...prev,
        currentStartDay: newStartDay,
        currentDurationDays: newDuration,
        floatX: clientX,
        floatY: clientY - 45
      } : null);
    };

    const handlePointerUp = () => {
      if (draggingTask) {
        updateTaskDates(draggingTask.taskId, draggingTask.currentStartDay, draggingTask.currentDurationDays);
        setDraggingTask(null);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [draggingTask, scaleConfig.colWidth]);

  // Center timeline on today's date and current time
  const scrollToToday = () => {
    const realNow = new Date();
    const today = realNow.getDate();
    setSelectedDayNum(today);
    setSelectedWeekStartDay(Math.max(1, today - 3));

    if (timelineScrollRef.current) {
      const container = timelineScrollRef.current;
      const todayIndex = today - 1; // 0-indexed day
      
      // Time fraction inside the day
      const hourFraction = (realNow.getHours() * 60 + realNow.getMinutes()) / 1440;
      let todayX = (todayIndex + hourFraction) * scaleConfig.colWidth;

      if (calendarScale === 'week') {
        const todayWeek = Math.floor(todayIndex / 7);
        todayX = (todayWeek + hourFraction) * scaleConfig.colWidth;
      }
      const containerWidth = container.clientWidth || 600;
      const targetScrollLeft = Math.max(0, todayX - containerWidth / 2);
      container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
    }
  };

  const handleQuickShiftTask = async (taskId: string, days: number) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftDays: days,
          reason: 'Перенос срока в мобильном виде Ганта',
          changedBy: currentUser?.name || 'Руководитель'
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`Дедлайн сдвинут на +${days} дн. Связанных задач обновлено: ${data.cascadedTasksCount || 0}`);
        setProcesses(prev => prev.map(p => {
          if (p.id !== currentProcessId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => {
              if (t.id === taskId) {
                return { ...t, deadLine: data.newDeadline, deadlineDays: (t.deadlineDays || 2) + days };
              }
              if (data.modifiedTaskIds?.includes(t.id)) {
                return { ...t, deadlineDays: (t.deadlineDays || 2) + days };
              }
              return t;
            })
          };
        }));
        setMobileShiftTaskId(null);
      } else {
        triggerToast(data.error || 'Ошибка при переносе сроков');
      }
    } catch {
      triggerToast('Ошибка связи с сервером');
    }
  };

  const handleSubmitTaskReport = async (taskId: string, answers: any, attachments: any[] = []) => {
    setSubmittingTask(true);

    const taskObj = processes.flatMap(p => p.tasks).find(t => t.id === taskId);
    const taskTitle = taskObj?.taskTitle || 'Задача проекта';
    const executorName = taskObj?.executorName || currentUser?.name || 'Исполнитель';

    const steps: CascadeStep[] = [
      {
        id: 'step_gantt_data',
        title: 'Анализ предоставленных данных и ответа',
        subtitle: 'Нейросетевая проверка содержания ответа задачи',
        type: 'criteria',
        status: 'pending'
      },
      {
        id: 'step_gantt_criteria',
        title: 'Сверка критериев регламента задачи',
        subtitle: 'Анализ полноты и качества выполненных работ',
        type: 'criteria',
        status: 'pending'
      },
      {
        id: 'step_gantt_final',
        title: 'Итоговый вердикт и расчет рейтинга',
        subtitle: 'Принятие задачи ИИ Ревизором RR',
        type: 'final',
        status: 'pending'
      }
    ];

    useCascadeCheckStore.getState().startCascadeCheck(
      steps,
      taskTitle,
      executorName,
      () => handleSubmitTaskReport(taskId, answers, attachments)
    );

    try {
      useCascadeCheckStore.getState().setCascadeStepRunning(0);
      await new Promise(r => setTimeout(r, 600));
      useCascadeCheckStore.getState().updateCascadeStep(0, {
        status: 'completed',
        resultText: 'Данные отчета зафиксированы и проанализированы',
        subtitle: 'данные проанализированы'
      });

      useCascadeCheckStore.getState().setCascadeStepRunning(1);
      await new Promise(r => setTimeout(r, 600));
      useCascadeCheckStore.getState().updateCascadeStep(1, {
        status: 'completed',
        resultText: 'Соответствие регламенту и контрольным точкам проверено',
        subtitle: 'критерии подтверждены'
      });

      useCascadeCheckStore.getState().setCascadeStepRunning(2);

      const res = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          attachments,
          userId: currentUser?.id,
          userName: currentUser?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        const finalScore = data.qualityScore || 90;
        const verdictText = data.aiRecommendations || (data.aiVerdict === 'accepted' ? 'Задача полностью соответствует требованиям регламента' : 'Задача проверена, статус обновлен');

        useCascadeCheckStore.getState().updateCascadeStep(2, {
          status: 'completed',
          resultText: `Итоговый балл: ${finalScore}. Вердикт: ${verdictText}`,
          subtitle: 'вердикт вынесен'
        });
        useCascadeCheckStore.getState().setCascadeOverallStatus('completed');

        setSubmitVerdict(data);
        triggerToast(data.aiVerdict === 'accepted' ? 'Задача успешно принята ИИ Ревизором!' : 'Задача проверена ИИ, ознакомьтесь с отчетом');
        setProcesses(prev => prev.map(p => {
          if (p.id !== currentProcessId) return p;
          return {
            ...p,
            tasks: p.tasks.map(t => t.id === taskId ? {
              ...t,
              status: data.aiVerdict === 'accepted' ? 'completed' : 'verification',
              score: data.qualityScore || t.score,
              deadLine: data.newDeadline || t.deadLine
            } : t)
          };
        }));
      } else {
        useCascadeCheckStore.getState().setCascadeOverallStatus('error', data.error || 'Ошибка при сдаче задачи');
        triggerToast(data.error || 'Ошибка при сдаче задачи');
      }
    } catch {
      useCascadeCheckStore.getState().setCascadeOverallStatus('error', 'Ошибка соединения с сервером');
      triggerToast('Ошибка соединения');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Center on today by default on initial render or when scale/zoom changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (timelineScrollRef.current) {
        const container = timelineScrollRef.current;
        const realNow = new Date();
        const today = realNow.getDate();
        const todayIndex = today - 1;
        const hourFraction = (realNow.getHours() * 60 + realNow.getMinutes()) / 1440;
        let todayX = (todayIndex + hourFraction) * scaleConfig.colWidth;
        if (calendarScale === 'week') {
          const todayWeek = Math.floor(todayIndex / 7);
          todayX = (todayWeek + hourFraction) * scaleConfig.colWidth;
        }
        const containerWidth = container.clientWidth || 600;
        const targetScrollLeft = Math.max(0, todayX - containerWidth / 2);
        container.scrollLeft = targetScrollLeft;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [calendarScale, zoomLevel, scaleConfig.colWidth]);

  // Render SVG dependency connectors
  const renderDependencyLines = () => {
    const lines: React.ReactNode[] = [];
    const headerOffset = 60; // timeline header height
    const rowHeight = 48; // Each row height

    flattenedTaskRows.forEach((row) => {
      if (row.type === 'task' && row.task && row.task.dependentOnTaskId) {
        const task = row.task;
        const parentRow = flattenedTaskRows.find(
          r => r.type === 'task' && r.task?.id === task.dependentOnTaskId
        );

        if (parentRow && parentRow.task) {
          const parent = parentRow.task;
          const parentPos = scaleConfig.getTaskBarPos(parent);
          const childPos = scaleConfig.getTaskBarPos(task);

          if (parentPos.isVisible && childPos.isVisible) {
            const y1 = headerOffset + parentRow.rowIndex * rowHeight + 24;
            const y2 = headerOffset + row.rowIndex * rowHeight + 24;

            const x1 = parentPos.left + parentPos.width;
            const x2 = childPos.left;

            const midX = x1 + Math.max(12, (x2 - x1) / 2);
            const pathData = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;

            lines.push(
              <g key={`dep-${parent.id}-${task.id}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="4"
                  className="opacity-40 blur-[2px]"
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  className="opacity-90 transition-all hover:opacity-100 hover:stroke-amber-300"
                />
                <circle cx={x1} cy={y1} r="4" fill="#F59E0B" stroke="#FFF" strokeWidth="1.5" className="shadow-md" />
                <polygon
                  points={`${x2},${y2-5} ${x2+7},${y2} ${x2},${y2+5}`}
                  fill="#D4AF37"
                />
                <circle cx={x2} cy={y2} r="3" fill="#D4AF37" />
              </g>
            );
          }
        }
      }
    });

    return (
      <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
        {lines}
      </svg>
    );
  };

  const activeTaskForDrawer = processes.flatMap(p => p.tasks).find(t => t.id === activeTaskDrawerId);

  const renderHoverTooltip = () => {
    if (!hoveredTaskId || !tooltipPos) return null;
    const hTask = activeProcess?.tasks.find(t => t.id === hoveredTaskId);
    if (!hTask) return null;

    const isOverdue = hTask.status === 'delayed';
    const eff = getTaskEffectiveDuration(hTask);

    return (
      <div
        style={{
          position: 'fixed',
          left: `${Math.min(window.innerWidth - 300, Math.max(20, tooltipPos.x - 140))}px`,
          top: `${Math.max(10, tooltipPos.y - 180)}px`
        }}
        className={`z-50 w-72 p-4 rounded-2xl border shadow-2xl space-y-2.5 text-sm animate-scale-in pointer-events-none backdrop-blur-md ${
          theme === 'dark'
            ? 'bg-[#1A0F02]/95 border-amber-400/50 text-white'
            : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
        }`}
      >
        <div className="border-b border-amber-500/25 pb-2">
          <span className="text-sm font-mono text-amber-700 dark:text-[#F4EE8E] font-bold">
            Задача #{hTask.id.slice(-4)}
          </span>
          <h5 className="font-extrabold text-amber-950 dark:text-white leading-tight mt-0.5">
            {hTask.taskTitle}
          </h5>
        </div>

        <div className="space-y-1.5 text-sm text-amber-900 dark:text-amber-100/90">
          <div className="flex justify-between">
            <span className="opacity-75">Ответственный:</span>
            <span className="font-bold text-amber-950 dark:text-[#F4EE8E]">{hTask.executorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-75">Постановщик:</span>
            <span className="font-bold text-amber-950 dark:text-amber-100">{activeProcess?.manager || 'ИИ-Ревизор'}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-75">Статус:</span>
            <span className={`font-extrabold ${isOverdue ? 'text-rose-500' : hTask.status === 'completed' ? 'text-amber-600 dark:text-[#F4EE8E]' : 'text-amber-500'}`}>
              {isOverdue ? 'Просрочена' : hTask.status === 'completed' ? 'Завершено' : 'В работе'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-200 dark:border-white/10 space-y-1 text-[10px] font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-400">Старт:</span>
            <span className="font-bold">{capitalizedMonth} {eff.startDay}, {currentYear} 09:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Текущий срок:</span>
            <span className={`font-bold ${eff.isAutoExtended ? 'text-amber-300' : 'text-amber-600 dark:text-amber-300'}`}>
              {eff.isAutoExtended 
                ? `${capitalizedMonth} ${simulatedToday}, ${currentTimeStr} (Автопродление)` 
                : `${capitalizedMonth} ${eff.endDay}, 18:00`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Длительность:</span>
            <span className="font-bold text-amber-300 font-mono">
              {Math.max(1, Math.round(eff.effectiveDur))} дн.
            </span>
          </div>
        </div>

        {eff.isAutoExtended && (
          <div className="bg-amber-500/20 border border-amber-500/30 p-2 rounded-xl text-[10px] text-amber-200 font-medium leading-tight flex items-center gap-1.5">
            <Clock size={12} className="text-amber-400 shrink-0 animate-spin" />
            <span>Незавершенная задача: автоматически продлевается до текущего времени ({currentTimeStr})</span>
          </div>
        )}

        <div className="pt-1 text-right">
          <button
            onClick={() => setActiveTaskDrawerId(hTask.id)}
            className="text-[10px] font-bold text-amber-600 dark:text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer pointer-events-auto"
          >
            <span>Подробности</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 font-sans text-zinc-900 dark:text-zinc-100 animate-fade-in">
      
      {/* UNIFIED TOP CONTROL TOOLBAR */}
      <div className="p-4 sm:p-5 rounded-3xl border border-amber-500/30 dark:border-amber-400/30 bg-transparent shadow-sm space-y-4">
        
        {/* Row 1: Title & Scale Switcher & Date Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-amber-500/30 pb-4">
          
          {/* Left: Title + View Switcher (День, Неделя, Месяц) */}
          <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-md">
                <Calendar size={20} />
              </span>
              <h3 className="text-lg font-black text-amber-950 dark:text-white tracking-wide">
                Диаграмма Ганта
              </h3>
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileToolbarExpanded(prev => !prev)}
              className="md:hidden min-h-[44px] px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-950 dark:text-[#F4EE8E] text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Filter size={16} />
              <span>{isMobileToolbarExpanded ? 'Скрыть фильтры' : 'Фильтры и вид'}</span>
            </button>

            {/* Scale modes switcher */}
            <div className="hidden md:flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-transparent border border-amber-500/30">
              {(['day', 'week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCalendarScale(mode)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    calendarScale === mode
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md'
                      : 'bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-amber-950 dark:text-[#F4EE8E] hover:brightness-110'
                  }`}
                >
                  {mode === 'day' ? 'День' : mode === 'week' ? 'Неделя' : 'Месяц'}
                </button>
              ))}
            </div>

            {/* Date range display & navigation */}
            <div className="hidden md:flex items-center gap-1 bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 px-3 py-1.5 rounded-2xl border border-amber-500/30 text-sm font-mono font-bold text-amber-950 dark:text-[#F4EE8E]">
              <button
                onClick={() => {
                  if (calendarScale === 'week') setSelectedWeekStartDay(p => Math.max(1, p - 7));
                  else if (calendarScale === 'day') setSelectedDayNum(p => Math.max(1, p - 1));
                }}
                className="hover:text-amber-500 px-1 cursor-pointer"
                title="Предыдущий период"
              >
                ◄
              </button>
              <span>
                {calendarScale === 'week' && `${selectedWeekStartDay} – ${Math.min(totalDaysInMonth, selectedWeekStartDay + 6)} ${capitalizedMonth} ${currentYear}`}
                {calendarScale === 'day' && `${selectedDayNum} ${capitalizedMonth} ${currentYear}`}
                {calendarScale === 'month' && `1 – ${totalDaysInMonth} ${capitalizedMonth} ${currentYear}`}
              </span>
              <button
                onClick={() => {
                  if (calendarScale === 'week') setSelectedWeekStartDay(p => Math.min(Math.max(1, totalDaysInMonth - 6), p + 7));
                  else if (calendarScale === 'day') setSelectedDayNum(p => Math.min(totalDaysInMonth, p + 1));
                }}
                className="hover:text-amber-500 px-1 cursor-pointer"
                title="Следующий период"
              >
                ►
              </button>

              <button
                onClick={scrollToToday}
                className="ml-2 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 text-sm font-bold cursor-pointer shadow-sm transition-all flex items-center gap-1"
                title={`Перейти и отцентрировать на сегодня (${simulatedToday} ${capitalizedMonth} ${currentTimeStr})`}
              >
                <Clock size={14} />
                <span>Сегодня ({simulatedToday} {capitalizedMonth.slice(0, 3)} {currentTimeStr})</span>
              </button>
            </div>
          </div>

          {/* Right: Zoom controls & Cascade shift toggle */}
          <div className={`${isMobileToolbarExpanded ? 'flex' : 'hidden md:flex'} items-center gap-2 flex-wrap`}>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 border border-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-bold select-none min-h-[44px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascadeShiftEnabled}
                  onChange={(e) => {
                    setCascadeShiftEnabled(e.target.checked);
                    triggerToast(e.target.checked ? 'Каскадный сдвиг включен! Все зависимые задачи будут автоматически смещаться.' : 'Каскадный сдвиг отключен.');
                  }}
                  className="accent-amber-500 rounded cursor-pointer w-4 h-4"
                />
                <span className="text-sm font-bold">Каскадный сдвиг</span>
              </label>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCascadeInfoModal(true);
                }}
                className="p-1.5 rounded-full hover:bg-amber-500/20 text-amber-700 dark:text-[#F4EE8E] transition-colors cursor-pointer ml-1"
                title="Подробнее о Каскадном сдвиге"
              >
                <Info size={16} />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 border border-amber-500/30">
              <button
                onClick={() => setZoomLevel(prev => Math.min(80, prev + 8))}
                title="Увеличить масштаб"
                className="p-2 rounded-xl text-amber-950 dark:text-[#F4EE8E] hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(26, prev - 8))}
                title="Уменьшить масштаб"
                className="p-2 rounded-xl text-amber-950 dark:text-[#F4EE8E] hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <ZoomOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Navigation Bubble Switcher (Wrapped, No Horizontal Scroll) & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* 4 Navigation Tabs wrapped cleanly on mobile with readable text */}
          <div className="flex flex-wrap items-center gap-1.5 border p-1 rounded-2xl backdrop-blur-md bg-transparent border-amber-500/30">
            <button
              onClick={() => {
                if (onNavigate) onNavigate('/cabinet/revisor/map');
                else if (onSwitchSubTab) onSwitchSubTab('projects_map');
                else window.history.pushState({}, '', '/cabinet/revisor/map');
              }}
              className="min-h-[44px] md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-amber-950 dark:text-[#F4EE8E] border-amber-500/30 hover:brightness-110"
              title="Карта процессов"
            >
              <Globe size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
              <span>Карта</span>
            </button>

            <button
              onClick={() => {
                if (onNavigate) onNavigate('/cabinet/revisor/kanban');
                else if (onSwitchSubTab) onSwitchSubTab('projects_kanban');
                else window.history.pushState({}, '', '/cabinet/revisor/kanban');
              }}
              className="min-h-[44px] md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-amber-950 dark:text-[#F4EE8E] border-amber-500/30 hover:brightness-110"
              title="Канбан задач"
            >
              <LayoutGrid size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
              <span>Канбан</span>
            </button>

            <button
              onClick={() => {
                if (onNavigate) onNavigate('/cabinet/revisor/table');
                else if (onSwitchSubTab) onSwitchSubTab('projects_table');
                else window.history.pushState({}, '', '/cabinet/revisor/table');
              }}
              className="min-h-[44px] md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 text-sm font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-amber-950 dark:text-[#F4EE8E] border-amber-500/30 hover:brightness-110"
              title="Таблица процессов"
            >
              <List size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
              <span>Таблица</span>
            </button>

            <button
              className="min-h-[44px] md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 text-sm font-extrabold bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-md"
              title="Текущий режим Диаграмма Ганта"
            >
              <Calendar size={15} className="text-amber-950" />
              <span>Гант</span>
            </button>

            {/* Toggle Collapsible Left Task List (Desktop only) */}
            <button
              type="button"
              onClick={() => setIsListCollapsed(!isListCollapsed)}
              className="hidden md:flex px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border items-center gap-1.5 text-sm font-bold bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] border-amber-500/40 hover:bg-amber-500/30 active:scale-95 shadow-sm"
              title={isListCollapsed ? "Показать панель задач слева" : "Свернуть панель задач слева"}
            >
              {isListCollapsed ? <PanelLeftOpen size={16} className="text-amber-500 shrink-0" /> : <PanelLeftClose size={16} className="text-amber-500 shrink-0" />}
              <span>{isListCollapsed ? 'Показать список' : 'Свернуть список'}</span>
            </button>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-2 flex-1 justify-start lg:justify-end">
            {/* Quick scope switcher & New Task always reachable */}
            <button
              type="button"
              onClick={() => {
                setScopeFilter(prev => prev === 'mine' ? 'from_me' : prev === 'from_me' ? 'all' : 'mine');
              }}
              className={`min-h-[44px] md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold backdrop-blur-md shadow-sm active:scale-95 shrink-0 ${
                scopeFilter !== 'all'
                  ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 font-extrabold shadow-md'
                  : 'bg-amber-500/15 border-amber-400/30 text-amber-950 dark:text-[#E7C768] hover:bg-amber-500/25'
              }`}
              title="Переключатель задач: Мои → От меня → Все"
            >
              {scopeFilter === 'mine' && (
                <>
                  <UserIcon size={15} />
                  <span>Мои</span>
                </>
              )}
              {scopeFilter === 'from_me' && (
                <>
                  <Send size={15} />
                  <span>От меня</span>
                </>
              )}
              {scopeFilter === 'all' && (
                <>
                  <Users size={15} />
                  <span>Все</span>
                </>
              )}
            </button>

            {isManager && (
              <button
                onClick={() => setShowQuickAddTask(true)}
                className="min-h-[44px] md:min-h-0 px-3.5 py-2 md:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-extrabold hover:brightness-110 active:scale-95 transition-all cursor-pointer text-sm flex items-center gap-1.5 shadow-md border border-amber-300/50"
              >
                <Plus size={16} />
                <span>Новая задача</span>
              </button>
            )}

            {/* Search + Status filter (always shown on desktop, collapsible on mobile) */}
            <div className={`${isMobileToolbarExpanded ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-2 w-full md:w-auto`}>
              <div className="relative flex-1 min-w-[160px] sm:min-w-[190px]">
                <Search size={15} className="absolute left-3 top-3 md:top-2.5 text-amber-950 dark:text-[#F4EE8E]" />
                <input
                  type="text"
                  placeholder="Поиск задач..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] md:min-h-0 pl-9 pr-3 py-2 md:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 border border-amber-500/50 text-amber-950 dark:text-[#F4EE8E] placeholder:text-amber-900/70 dark:placeholder:text-[#F4EE8E]/70 text-sm font-bold focus:outline-none focus:border-[#E7C768]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`min-h-[44px] md:min-h-0 px-3 py-2 md:py-1.5 rounded-xl border text-sm font-bold cursor-pointer focus:outline-none focus:border-[#E7C768] ${
                  theme === 'dark'
                    ? 'bg-[#140A01] border-amber-500/50 text-[#F4EE8E]'
                    : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
                }`}
              >
                <option value="all">Все статусы</option>
                <option value="in_progress">В работе</option>
                <option value="delayed">Просроченные</option>
                <option value="completed">Завершенные</option>
                <option value="pending">Ожидают</option>
              </select>
            </div>
          </div>

        </div>

      </div>

      {/* MOBILE VERTICAL GANTT & INTERACTIVE TIMELINE VIEW */}
      <MobileGanttView
        flattenedTaskRows={flattenedTaskRows}
        activeProcessTasks={activeProcess?.tasks || []}
        capitalizedMonth={capitalizedMonth}
        simulatedToday={simulatedToday}
        totalDaysInMonth={totalDaysInMonth}
        currentTimeStr={currentTimeStr}
        theme={theme}
        getTaskEffectiveDuration={getTaskEffectiveDuration}
        onOpenTaskDrawer={(taskId) => {
          setActiveTaskDrawerId(taskId);
          setDrawerTab('main');
        }}
        onOpenShiftModal={(taskId) => {
          setMobileShiftTaskId(taskId);
          setMobileShiftDays(2);
        }}
      />

      {/* BITRIX24 SPLIT VIEW CONTAINER (CASCADING TABLES + GANTT TIMELINE) - DESKTOP ONLY */}
      <div className="hidden md:block p-0.5 rounded-3xl border border-amber-500/30 bg-transparent shadow-xl overflow-hidden relative">
        
        {/* TOP PARALLEL HORIZONTAL SCROLLBAR FOR GANTT TIMELINE */}
        <div className="w-full flex justify-end bg-gradient-to-r from-[#F4EE8E]/10 via-[#E7C768]/10 to-[#D99E41]/10 border-b border-amber-500/30 px-2 py-1.5">
          <div className={`flex items-center gap-2 w-full ${isListCollapsed ? 'lg:w-full' : 'lg:w-[calc(100%-420px)]'}`}>
            <button
              type="button"
              onClick={() => timelineScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black hover:brightness-110 shadow-sm active:scale-95 transition-transform flex items-center gap-1 text-[11px] cursor-pointer shrink-0"
              title="Прокрутить календарь назад"
            >
              <ChevronLeft size={14} className="stroke-[3]" />
              <span className="hidden sm:inline">Назад</span>
            </button>
            <span className="text-[10px] font-mono font-bold text-amber-900 dark:text-[#F4EE8E] shrink-0 hidden md:inline">
              Скролл
            </span>
            <div 
              ref={topScrollRef} 
              onScroll={handleTopScroll} 
              className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-amber-500/60 rounded-full"
            >
              <div style={{ width: `${scaleConfig.totalWidth}px`, height: '10px' }} />
            </div>
            <button
              type="button"
              onClick={() => timelineScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black hover:brightness-110 shadow-sm active:scale-95 transition-transform flex items-center gap-1 text-[11px] cursor-pointer shrink-0"
              title="Прокрутить календарь вперед"
            >
              <span className="hidden sm:inline">Вперед</span>
              <ChevronRight size={14} className="stroke-[3]" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row min-h-[560px] divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-white/10">
          
          {/* LEFT PANEL: CASCADING PROJECTS & TASKS TABLE */}
          <div className={`${isListCollapsed ? 'hidden' : 'w-full lg:w-[420px]'} shrink-0 flex flex-col bg-transparent max-h-[660px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/30 relative overflow-hidden transition-all duration-300`}>
            
            {/* Vertical Scanning Radar Beam for Projects List */}
            <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-amber-400/20 dark:via-amber-300/30 to-transparent pointer-events-none z-30 blur-sm animate-radar-vertical" />
            
            {/* Left Panel Header */}
            <div className="h-[60px] border-b border-zinc-200 dark:border-white/10 px-4 flex items-center justify-between font-mono text-xs font-bold text-zinc-800 dark:text-[#F4EE8E] bg-transparent sticky top-0 z-20 backdrop-blur-md">
              <span>Проекты / Задачи</span>
              <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Старт</span>
                <span>Исполнитель</span>
              </div>
            </div>

            {/* Cascading Rows List */}
            <div className="divide-y divide-zinc-200 dark:divide-white/5 flex-1 bg-transparent">
              {flattenedTaskRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 italic">
                  Проекты и задачи не найдены
                </div>
              ) : (
                flattenedTaskRows.map((row) => {
                  if (row.type === 'project') {
                    const isExpanded = expandedFolders[row.processId] !== false;
                    const pTasksCount = processes.find(p => p.id === row.processId)?.tasks.length || 0;

                    return (
                      <div
                        key={`proj-row-${row.processId}`}
                        onClick={() => setExpandedFolders(p => ({ ...p, [row.processId]: !isExpanded }))}
                        className="h-12 px-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-transparent text-xs font-extrabold text-amber-900 dark:text-[#F4EE8E] cursor-pointer hover:bg-amber-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isExpanded ? (
                            <FolderOpen size={16} className="text-amber-500 shrink-0" />
                          ) : (
                            <Folder size={16} className="text-amber-500 shrink-0" />
                          )}
                          <span className="truncate">{row.processTitle}</span>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 shrink-0">
                          {pTasksCount} задач
                        </span>
                      </div>
                    );
                  }

                  // Task row
                  const task = row.task!;
                  const isSelected = activeTaskDrawerId === task.id;

                  return (
                    <div
                      key={`task-row-${task.id}`}
                      onClick={() => setActiveTaskDrawerId(task.id)}
                      className={`h-12 px-4 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between text-xs transition-all cursor-pointer pl-7 ${
                        isSelected
                          ? 'bg-amber-500/20 dark:bg-amber-400/15 text-amber-900 dark:text-white font-bold'
                          : 'hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2 flex-1">
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 shrink-0 font-bold">
                          #{task.startDay || 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold leading-tight text-zinc-900 dark:text-white">
                            {task.taskTitle}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] truncate">
                            <span className="text-amber-700 dark:text-[#F4EE8E] font-medium block truncate">
                              Кому: {task.executorName}
                            </span>
                            <span className="text-zinc-500 dark:text-slate-400 block truncate">
                              • От: {task.author_name || 'Руководитель'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-slate-900/80 text-zinc-700 dark:text-slate-300 border border-zinc-300 dark:border-white/10">
                          День {task.startDay || 1}
                        </span>

                        <div
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 truncate max-w-[90px]"
                          title={task.executorName}
                        >
                          <UserIcon size={11} className="text-amber-500 shrink-0" />
                          <span className="truncate">{task.executorName.split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* RIGHT PANEL: GANTT TIMELINE GRID */}
          <div ref={timelineScrollRef} onScroll={handleBottomScroll} className="flex-1 overflow-x-auto overflow-y-auto max-h-[660px] relative scrollbar-thin scrollbar-thumb-amber-500/40">
            {/* Horizontal Scanning Radar Beam for Gantt Timeline Calendar Block */}
            <div className="absolute inset-y-0 w-28 bg-gradient-to-r from-transparent via-amber-400/25 dark:via-amber-300/35 to-transparent pointer-events-none z-30 blur-sm animate-radar-horizontal" />
            
            <div 
              style={{ width: `${scaleConfig.totalWidth}px` }} 
              className="relative min-h-[560px]"
            >
              
              {/* Timeline Header (60px height) */}
              <div className="h-[60px] border-b border-zinc-200 dark:border-white/10 bg-transparent sticky top-0 z-20 backdrop-blur-md">
                <div className="h-7 border-b border-zinc-200 dark:border-white/5 px-3 flex items-center justify-between text-[11px] font-mono font-bold text-amber-800 dark:text-[#F4EE8E]">
                  <div className="flex items-center gap-2">
                    <span>{scaleConfig.headerTitle}</span>
                    <button
                      onClick={scrollToToday}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-[#F4EE8E] text-[10px] uppercase font-bold cursor-pointer border border-amber-500/30 transition-all flex items-center gap-1"
                      title="Сфокусировать календарь на сегодняшней дате"
                    >
                      <Clock size={10} className="text-amber-500" />
                      <span>Сегодня</span>
                    </button>
                  </div>
                  <span className="text-[10px] opacity-75">Каскадный Гант ИИ</span>
                </div>

                <div className="h-8 flex">
                  {scaleConfig.cols.map(col => (
                    <div
                      key={col.id}
                      style={{ width: `${scaleConfig.colWidth}px` }}
                      className={`h-full border-r border-zinc-200 dark:border-white/5 flex items-center justify-center text-[10px] font-mono font-bold ${
                        col.isToday
                          ? 'bg-amber-400 text-slate-950 shadow-inner'
                          : col.isWeekend
                          ? 'bg-zinc-200/50 dark:bg-slate-900/40 text-red-500/80 dark:text-red-400/80'
                          : 'text-zinc-600 dark:text-slate-400'
                      }`}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical Column Grid lines */}
              <div className="absolute inset-0 top-[60px] flex pointer-events-none z-0">
                {scaleConfig.cols.map(col => (
                  <div
                    key={`line-${col.id}`}
                    style={{ width: `${scaleConfig.colWidth}px` }}
                    className={`h-full border-r ${
                      col.isToday
                        ? 'border-amber-400/40 bg-amber-400/5'
                        : col.isWeekend
                        ? 'border-zinc-200/50 dark:border-white/[0.03] bg-zinc-100/30 dark:bg-slate-900/20'
                        : 'border-zinc-200/30 dark:border-white/[0.02]'
                    }`}
                  />
                ))}
              </div>

              {/* Real-time Today & Current Time Indicator Line */}
              {(() => {
                const todayIndex = simulatedToday - 1;
                const hourFraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
                let posX = (todayIndex + hourFraction) * scaleConfig.colWidth;
                if (calendarScale === 'week') {
                  const todayWeek = Math.floor(todayIndex / 7);
                  posX = (todayWeek + hourFraction) * scaleConfig.colWidth;
                }
                return (
                  <div 
                    style={{ left: `${posX}px` }} 
                    className="absolute top-[28px] bottom-0 w-0.5 bg-amber-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                  >
                    <div className="bg-amber-500 text-slate-950 text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full -translate-x-1/2 absolute top-0 whitespace-nowrap shadow-lg flex items-center gap-1 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                      <span>{currentTimeStr}</span>
                    </div>
                  </div>
                );
              })()}

              {/* SVG Dependency Connector Lines */}
              {renderDependencyLines()}

              {/* Gantt Timeline Rows */}
              <div className="relative z-10">
                {flattenedTaskRows.map((row) => {
                  if (row.type === 'project') {
                    return (
                      <div
                        key={`timeline-proj-${row.processId}`}
                        className="h-12 border-b border-zinc-200 dark:border-white/10 flex items-center px-4 bg-zinc-200/30 dark:bg-amber-950/10 text-xs font-bold text-amber-600/80 dark:text-amber-300/80 italic font-mono"
                      >
                        <span>Проект: {row.processTitle}</span>
                      </div>
                    );
                  }

                  // Task Gantt bar row
                  const task = row.task!;
                  const pos = scaleConfig.getTaskBarPos(task);
                  const isSelected = activeTaskDrawerId === task.id;
                  const isCompleted = task.status === 'completed';
                  const isDelayed = task.status === 'delayed';

                  return (
                    <div
                      key={`timeline-task-${task.id}`}
                      className={`h-12 border-b border-zinc-200 dark:border-white/5 relative flex items-center transition-colors ${
                        isSelected ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {pos.isVisible && (
                        <div
                          style={{
                            left: `${pos.left}px`,
                            width: `${Math.max(36, pos.width)}px`
                          }}
                          onClick={() => setActiveTaskDrawerId(task.id)}
                          onMouseEnter={(e) => {
                            setHoveredTaskId(task.id);
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className={`absolute h-8 rounded-xl px-2.5 flex items-center justify-between text-xs font-extrabold cursor-pointer transition-all shadow-md group ${
                            isCompleted
                              ? 'bg-gradient-to-r from-[#FFF8B4] via-[#F4EE8E] to-[#D99E41] text-amber-950 border border-amber-300'
                              : isDelayed
                              ? 'bg-gradient-to-r from-rose-500 to-amber-600 text-white border border-rose-400 animate-pulse'
                              : 'bg-gradient-to-r from-[#FFF8B4] via-[#E7C768] to-[#D99E41] text-amber-950 border border-amber-300/80 shadow-md hover:brightness-110'
                          }`}
                        >
                          {/* Left Drag Handle */}
                          <div
                            onMouseDown={(e) => handleStartDrag(e, task, 'start')}
                            onTouchStart={(e) => handleStartDrag(e, task, 'start')}
                            className="absolute left-0 top-0 bottom-0 w-3 bg-amber-800/40 hover:bg-amber-600 cursor-ew-resize rounded-l-xl z-20 flex items-center justify-center opacity-70 hover:opacity-100 transition-all"
                            title="Перетащите влево/вправо для изменения даты начала"
                          >
                            <div className="w-0.5 h-3 bg-slate-950 rounded" />
                          </div>

                          <span className="truncate px-1.5 drop-shadow-xs flex items-center gap-1.5">
                            <span>{task.taskTitle}</span>
                            {pos.isAutoExtended && (
                              <span className="text-[9px] bg-black/40 text-amber-200 px-1 py-0.5 rounded font-mono font-bold shrink-0 hidden sm:inline-flex items-center gap-1">
                                <Clock size={9} className="animate-spin text-amber-300" />
                                <span>автопродлена до {currentTimeStr}</span>
                              </span>
                            )}
                          </span>

                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/20 text-slate-950 shrink-0 font-bold">
                            {Math.max(1, Math.round(pos.effectiveDur))}д
                          </span>

                          {/* Right Drag Handle */}
                          <div
                            onMouseDown={(e) => handleStartDrag(e, task, 'end')}
                            onTouchStart={(e) => handleStartDrag(e, task, 'end')}
                            className="absolute right-0 top-0 bottom-0 w-3 bg-amber-800/40 hover:bg-amber-600 cursor-ew-resize rounded-r-xl z-20 flex items-center justify-center opacity-70 hover:opacity-100 transition-all"
                            title="Перетащите влево/вправо для изменения даты окончания"
                          >
                            <div className="w-0.5 h-3 bg-slate-950 rounded" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* HOVER TOOLTIP CARD */}
      {renderHoverTooltip()}

      {/* FLOATING DRAG TOOLTIP */}
      {draggingTask && (
        <div 
          style={{ left: `${draggingTask.floatX}px`, top: `${draggingTask.floatY}px` }}
          className={`fixed z-50 -translate-x-1/2 p-2.5 rounded-2xl border-2 border-amber-400 shadow-2xl backdrop-blur-md text-sm font-sans pointer-events-none flex flex-col gap-1 min-w-[200px] animate-fade-in ${
            theme === 'dark' ? 'bg-[#1A0F02]/95 text-white' : 'bg-[#FFFBF5]/95 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-1.5 font-extrabold text-amber-800 dark:text-[#F4EE8E]">
            <Clock size={14} className="text-amber-500 animate-spin" />
            <span>
              {draggingTask.edge === 'start' ? 'Перетягивание начала' : draggingTask.edge === 'end' ? 'Перетягивание окончания' : 'Перемещение задачи'}
            </span>
          </div>
          <div className="text-sm font-mono">
            <div>Старт: <strong className="text-amber-700 dark:text-amber-300">{draggingTask.currentStartDay} {capitalizedMonth.slice(0, 3).toLowerCase()} 09:00</strong></div>
            <div>Финиш: <strong className="text-amber-700 dark:text-amber-300">{draggingTask.currentStartDay + Math.ceil(draggingTask.currentDurationDays) - 1} {capitalizedMonth.slice(0, 3).toLowerCase()} 18:00</strong></div>
            <div>Длительность: <strong className="font-black">{Math.max(1, Math.round(draggingTask.currentDurationDays))} дн.</strong></div>
          </div>
        </div>
      )}

      {/* TASK DETAILS DRAWER / MOBILE BOTTOM SHEET */}
      {activeTaskForDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-stretch justify-end bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveTaskDrawerId(null)}
        >
          
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full md:max-w-lg border md:border-l h-[92vh] md:h-full rounded-t-3xl md:rounded-none shadow-2xl flex flex-col backdrop-blur-md animate-slide-in-right ${
              theme === 'dark'
                ? 'bg-[#1A0F02]/95 border-amber-400/50 text-white shadow-[0_0_30px_rgba(244,238,142,0.2)]'
                : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
            }`}
          >
            
            {/* Drawer Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              theme === 'dark' ? 'border-amber-400/25' : 'border-amber-900/15'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <h4 className={`text-base font-extrabold truncate ${
                  theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>
                  Информация по задаче
                </h4>
              </div>
              <button
                onClick={() => setActiveTaskDrawerId(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Wrapped Drawer Tabs (No horizontal overflow) */}
            <div className={`flex flex-wrap gap-1.5 border-b px-4 py-2.5 ${
              theme === 'dark' ? 'border-amber-400/20' : 'border-amber-900/15'
            }`}>
              {(['main', 'assignments', 'extra', 'fields'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`min-h-[44px] md:min-h-0 px-3 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    drawerTab === tab
                      ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 border-amber-400 shadow-sm'
                      : theme === 'dark'
                        ? 'border-amber-400/25 text-amber-200 hover:bg-amber-400/10'
                        : 'border-amber-900/20 text-amber-950 hover:bg-amber-100/70'
                  }`}
                >
                  {tab === 'main' ? 'Основное' : tab === 'assignments' ? 'Сроки' : tab === 'extra' ? 'Связи' : 'Отчет и ИИ'}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div className="p-4 sm:p-5 space-y-5 flex-1 overflow-y-auto text-sm">
              
              {drawerTab === 'main' && (
                <div className="space-y-4">
                  {/* Auto-extension Alert */}
                  {(() => {
                    const drawerTaskEff = getTaskEffectiveDuration(activeTaskForDrawer);
                    if (!drawerTaskEff.isAutoExtended) return null;
                    return (
                      <div className={`p-3.5 rounded-2xl border text-sm space-y-1 animate-fade-in ${
                        theme === 'dark'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                          : 'bg-amber-100/70 border-amber-500/40 text-amber-950'
                      }`}>
                        <div className="font-extrabold flex items-center gap-1.5">
                          <Clock size={15} className="text-amber-500 shrink-0" />
                          <span>Автоматическое продление незавершенной задачи</span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          Задача не завершена, поэтому её график автоматически продлен до текущего времени: <b>{simulatedToday} {capitalizedMonth} {currentYear}, {currentTimeStr}</b> (расчетная длительность: {Math.max(1, Math.round(drawerTaskEff.effectiveDur))} дн.).
                        </p>
                      </div>
                    );
                  })()}

                  {/* Task Title */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">Название задачи</label>
                    <input
                      type="text"
                      value={activeTaskForDrawer.taskTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProcesses(prev => prev.map(p => {
                          if (p.id !== activeProcess.id) return p;
                          return {
                            ...p,
                            tasks: p.tasks.map(t => t.id === activeTaskForDrawer.id ? { ...t, taskTitle: val } : t)
                          };
                        }));
                      }}
                      className={`w-full text-sm p-3 rounded-xl border font-bold focus:border-amber-500 focus:outline-none ${
                        theme === 'dark'
                          ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                          : 'bg-white border-amber-900/25 text-amber-950'
                      }`}
                    />
                  </div>

                  {/* Status & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">Статус</label>
                      <select
                        value={activeTaskForDrawer.status}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setProcesses(prev => prev.map(p => {
                            if (p.id !== activeProcess.id) return p;
                            return {
                              ...p,
                              tasks: p.tasks.map(t => t.id === activeTaskForDrawer.id ? { ...t, status: val } : t)
                            };
                          }));
                        }}
                        className={`w-full min-h-[44px] text-sm p-2.5 rounded-xl border font-bold cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#140A01] border-amber-400/30 text-white'
                            : 'bg-white border-amber-900/25 text-amber-950'
                        }`}
                      >
                        <option value="in_progress">В работе</option>
                        <option value="completed">Завершено</option>
                        <option value="delayed">Просрочена</option>
                        <option value="pending">Ожидает</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">Приоритет</label>
                      <select
                        value={activeTaskForDrawer.priority || 'medium'}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setProcesses(prev => prev.map(p => {
                            if (p.id !== activeProcess.id) return p;
                            return {
                              ...p,
                              tasks: p.tasks.map(t => t.id === activeTaskForDrawer.id ? { ...t, priority: val } : t)
                            };
                          }));
                        }}
                        className={`w-full min-h-[44px] text-sm p-2.5 rounded-xl border font-bold cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#140A01] border-amber-400/30 text-white'
                            : 'bg-white border-amber-900/25 text-amber-950'
                        }`}
                      >
                        <option value="high">Высокий</option>
                        <option value="medium">Средний</option>
                        <option value="low">Низкий</option>
                      </select>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2 pt-2 border-t border-amber-500/20">
                    <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">Чек-лист задачи</label>
                    <div className="space-y-2">
                      {activeTaskForDrawer.checklist.map((item, idx) => (
                        <label key={item.id} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer min-h-[44px] ${
                          theme === 'dark'
                            ? 'bg-[#140A01]/60 border-amber-400/20'
                            : 'bg-amber-50/70 border-amber-900/15'
                        }`}>
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={(e) => {
                              const done = e.target.checked;
                              setProcesses(prev => prev.map(p => {
                                if (p.id !== activeProcess.id) return p;
                                return {
                                  ...p,
                                  tasks: p.tasks.map(t => {
                                    if (t.id !== activeTaskForDrawer.id) return t;
                                    return {
                                      ...t,
                                      checklist: t.checklist.map((c, cIdx) => cIdx === idx ? { ...c, done } : c)
                                    };
                                  })
                                };
                              }));
                            }}
                            className="accent-amber-500 cursor-pointer w-4 h-4 shrink-0"
                          />
                          <span className={`text-sm ${item.done ? 'line-through opacity-60' : 'text-amber-950 dark:text-amber-100'}`}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {drawerTab === 'assignments' && (
                <div className="space-y-4">
                  
                  {/* Executor */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">Ответственный сотрудник</label>
                    <select
                      value={activeTaskForDrawer.executorId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = mockEmployees.find(m => m.id === empId);
                        setProcesses(prev => prev.map(p => {
                          if (p.id !== activeProcess.id) return p;
                          return {
                            ...p,
                            tasks: p.tasks.map(t => {
                              if (t.id !== activeTaskForDrawer.id) return t;
                              return {
                                ...t,
                                executorId: empId,
                                executorName: emp?.name || 'Сотрудник',
                                executorRole: emp?.position || 'Специалист'
                              };
                            })
                          };
                        }));
                      }}
                      className={`w-full min-h-[44px] text-sm p-3 rounded-xl border font-bold cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-[#140A01] border-amber-400/30 text-white'
                          : 'bg-white border-amber-900/25 text-amber-950'
                      }`}
                    >
                      {mockEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} — {emp.position || 'Специалист'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Author / Assigner */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30">
                    <label className="text-sm font-bold text-amber-800 dark:text-[#F4EE8E]">Постановщик задачи</label>
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-white">
                      <UserIcon size={15} className="text-[#E7C768]" />
                      <span>{activeTaskForDrawer.author_name || 'Руководитель'}</span>
                    </div>
                  </div>

                  {/* Start Day & Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">Старт (день)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={activeTaskForDrawer.startDay || 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateTaskDates(activeTaskForDrawer.id, val, activeTaskForDrawer.durationDays || 2);
                        }}
                        className={`w-full min-h-[44px] text-sm p-3 rounded-xl border font-mono font-bold ${
                          theme === 'dark'
                            ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                            : 'bg-white border-amber-900/25 text-amber-950'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">Дней в работе</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={activeTaskForDrawer.durationDays || activeTaskForDrawer.deadlineDays || 2}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateTaskDates(activeTaskForDrawer.id, activeTaskForDrawer.startDay || 1, val);
                        }}
                        className={`w-full min-h-[44px] text-sm p-3 rounded-xl border font-mono font-bold ${
                          theme === 'dark'
                            ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                            : 'bg-white border-amber-900/25 text-amber-950'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Cascade Dependency */}
                  <div className="space-y-1.5 pt-2 border-t border-amber-500/20">
                    <label className="text-sm font-bold text-amber-900 dark:text-[#F4EE8E]">
                      Зависит от задачи (каскадная связь)
                    </label>
                    <select
                      value={activeTaskForDrawer.dependentOnTaskId || ''}
                      onChange={(e) => {
                        const depId = e.target.value || null;
                        setProcesses(prev => prev.map(p => {
                          if (p.id !== activeProcess.id) return p;
                          let updated = p.tasks.map(t => t.id === activeTaskForDrawer.id ? { ...t, dependentOnTaskId: depId } : t);
                          if (cascadeShiftEnabled) {
                            updated = resolveCascadeDates(updated);
                          }
                          return { ...p, tasks: updated };
                        }));
                        triggerToast('Новая зависимость установлена в схеме Ганта');
                      }}
                      className={`w-full min-h-[44px] text-sm p-3 rounded-xl border font-bold cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-[#140A01] border-amber-400/30 text-white'
                          : 'bg-white border-amber-900/25 text-amber-950'
                      }`}
                    >
                      <option value="">-- Без зависимости (Самостоятельная) --</option>
                      {activeProcess?.tasks
                        .filter(t => t.id !== activeTaskForDrawer.id)
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.taskTitle}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                </div>
              )}

              {drawerTab === 'extra' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
                    <span className="font-extrabold flex items-center gap-1.5 text-sm">
                      <Sparkles size={15} /> ИИ Верификация Гант
                    </span>
                    <p className="text-sm leading-relaxed">
                      Эта задача постоянно мониторится автономным ИИ-Ревизором. При превышении дедлайна каскад автоматически сдвигает последующие этапы проекта.
                    </p>
                  </div>
                </div>
              )}

              {drawerTab === 'fields' && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    theme === 'dark'
                      ? 'bg-amber-500/10 border-amber-400/40 text-amber-100'
                      : 'bg-amber-50/80 border-amber-500/40 text-amber-950'
                  }`}>
                    <span className="font-extrabold flex items-center gap-1.5 text-sm text-amber-900 dark:text-[#F4EE8E]">
                      <Sparkles size={16} /> Сдача задачи и ИИ-Контроль качества
                    </span>
                    <p className="text-sm leading-relaxed">
                      Заполните отчетные данные. Автономный ИИ Ревизор сопоставит результат с критериями задачи и при необходимости сдвинет последующие сроки по Ганту.
                    </p>
                  </div>

                  {/* Task Field Inputs */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-amber-900 dark:text-amber-200">Отчет о выполнении / Комментарий</label>
                      <textarea
                        rows={3}
                        placeholder="Опишите полученные результаты, ссылки на материалы..."
                        value={taskFormAnswers['report_summary'] || ''}
                        onChange={(e) => setTaskFormAnswers(prev => ({ ...prev, report_summary: e.target.value }))}
                        className={`w-full text-sm p-3 rounded-xl border focus:border-amber-400 focus:outline-none ${
                          theme === 'dark'
                            ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                            : 'bg-white border-amber-900/25 text-amber-950'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-bold text-amber-900 dark:text-amber-200">Фактический результат / Ссылка на файл</label>
                      <input
                        type="text"
                        placeholder="https://... или текстовый результат"
                        value={taskFormAnswers['result_link'] || ''}
                        onChange={(e) => setTaskFormAnswers(prev => ({ ...prev, result_link: e.target.value }))}
                        className={`w-full min-h-[44px] text-sm p-3 rounded-xl border focus:border-amber-400 focus:outline-none ${
                          theme === 'dark'
                            ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                            : 'bg-white border-amber-900/25 text-amber-950'
                        }`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-bold text-amber-900 dark:text-amber-200">Критерий приемки (контроль ИИ)</label>
                      <div className={`p-3 rounded-xl border text-sm ${
                        theme === 'dark'
                          ? 'bg-amber-500/10 border-amber-400/25 text-amber-100'
                          : 'bg-amber-50/70 border-amber-900/20 text-amber-950'
                      }`}>
                        {(activeTaskForDrawer as any).check_criteria || 'Проверить полноту и корректность выполнения всех контрольных точек задачи'}
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="button"
                    disabled={submittingTask}
                    onClick={() => handleSubmitTaskReport(activeTaskForDrawer.id, taskFormAnswers, [])}
                    className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-extrabold text-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    {submittingTask ? (
                      <>
                        <RefreshCw size={15} className="animate-spin text-amber-950" />
                        <span>Проверка отчета ИИ Ревизором...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Сдать задачу на проверку ИИ</span>
                      </>
                    )}
                  </button>

                  {/* Submit Verdict Display */}
                  {submitVerdict && (
                    <div className={`p-4 rounded-2xl border space-y-2.5 animate-fade-in ${
                      theme === 'dark'
                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-100'
                        : 'bg-amber-50 border-amber-500/50 text-amber-950'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">Вердикт проверки:</span>
                        <span className="text-sm font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-900 dark:text-amber-300 border border-amber-400/40">
                          {submitVerdict.qualityScore}/100 баллов
                        </span>
                      </div>
                      <div className="text-sm font-bold text-amber-800 dark:text-[#F4EE8E]">
                        {submitVerdict.aiVerdict === 'accepted' ? 'Задача принята ИИ' : 'Требуется доработка'}
                      </div>
                      {submitVerdict.aiRecommendations && (
                        <p className="text-sm leading-relaxed p-2.5 rounded-xl border border-amber-400/25">
                          {submitVerdict.aiRecommendations}
                        </p>
                      )}
                      {submitVerdict.rescheduled && (
                        <div className="text-sm bg-amber-500/20 p-2.5 rounded-lg border border-amber-400/30 flex items-center gap-1.5">
                          <RefreshCw size={14} className="animate-spin shrink-0" />
                          <span>Дедлайн автоматически сдвинут по Ганту на {submitVerdict.newDeadline}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className={`p-4 sm:p-5 border-t flex items-center justify-between ${
              theme === 'dark' ? 'border-amber-400/25' : 'border-amber-900/15'
            }`}>
              <button
                onClick={() => {
                  setActiveTaskDrawerId(null);
                  triggerToast('Изменения по задаче сохранены');
                }}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-extrabold text-sm transition-all cursor-pointer shadow-lg hover:brightness-105 active:scale-95 text-center"
              >
                Сохранить
              </button>
            </div>

          </div>

        </div>
      )}

      {/* QUICK ADD TASK MODAL */}
      {showQuickAddTask && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowQuickAddTask(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:max-w-md p-5 sm:p-6 rounded-t-3xl sm:rounded-3xl border shadow-2xl space-y-5 backdrop-blur-md ${
              theme === 'dark'
                ? 'bg-[#1A0F02]/95 border-amber-400/50 text-white shadow-[0_0_30px_rgba(244,238,142,0.2)]'
                : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between border-b border-amber-500/25 pb-3">
              <h4 className="text-base font-extrabold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
                <Plus size={18} className="text-amber-500" />
                <span>Новая задача в Гант</span>
              </h4>
              <button
                onClick={() => setShowQuickAddTask(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-amber-500/15 text-amber-950 dark:text-amber-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickAddTask} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="font-bold text-amber-900 dark:text-amber-200">Название задачи</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Разработать коммерческое предложение"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className={`w-full min-h-[44px] p-3 rounded-xl border font-semibold focus:border-amber-500 focus:outline-none ${
                    theme === 'dark'
                      ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                      : 'bg-white border-amber-900/25 text-amber-950'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-amber-900 dark:text-amber-200">Ответственный</label>
                <select
                  value={newTaskExecutorId}
                  onChange={(e) => setNewTaskExecutorId(e.target.value)}
                  className={`w-full min-h-[44px] p-3 rounded-xl border font-bold cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#140A01] border-amber-400/30 text-white'
                      : 'bg-white border-amber-900/25 text-amber-950'
                  }`}
                >
                  {mockEmployees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} — {e.position || 'Специалист'}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-amber-900 dark:text-amber-200">День старта</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newTaskStartDay}
                    onChange={(e) => setNewTaskStartDay(parseInt(e.target.value) || 1)}
                    className={`w-full min-h-[44px] p-3 rounded-xl border font-mono font-bold ${
                      theme === 'dark'
                        ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                        : 'bg-white border-amber-900/25 text-amber-950'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-amber-900 dark:text-amber-200">Срок (дней)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(parseInt(e.target.value) || 1)}
                    className={`w-full min-h-[44px] p-3 rounded-xl border font-mono font-bold ${
                      theme === 'dark'
                        ? 'bg-[#140A01]/80 border-amber-400/30 text-white'
                        : 'bg-white border-amber-900/25 text-amber-950'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-amber-900 dark:text-amber-200">Зависит от задачи</label>
                <select
                  value={newTaskDependencyId}
                  onChange={(e) => setNewTaskDependencyId(e.target.value)}
                  className={`w-full min-h-[44px] p-3 rounded-xl border font-bold cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#140A01] border-amber-400/30 text-white'
                      : 'bg-white border-amber-900/25 text-amber-950'
                  }`}
                >
                  <option value="">-- Без зависимости --</option>
                  {activeProcess?.tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.taskTitle}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddTask(false)}
                  className="flex-1 min-h-[44px] py-3 rounded-xl border border-amber-500/30 font-bold text-amber-950 dark:text-amber-200 hover:bg-amber-500/15 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-extrabold shadow-lg hover:brightness-105 cursor-pointer"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASCADE SHIFT INFO MODAL */}
      {showCascadeInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCascadeInfoModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`border rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative space-y-4 backdrop-blur-md ${
              theme === 'dark'
                ? 'bg-[#1A0F02]/95 border-amber-400/50 text-white shadow-[0_0_30px_rgba(244,238,142,0.2)]'
                : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-md">
                  <Zap size={18} />
                </span>
                <h4 className="text-base font-extrabold text-amber-950 dark:text-[#F4EE8E]">
                  Что такое Каскадный сдвиг?
                </h4>
              </div>
              <button
                onClick={() => setShowCascadeInfoModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-amber-500/10 text-amber-950 dark:text-amber-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-sm space-y-3 leading-relaxed text-amber-950 dark:text-amber-100">
              <p>
                <strong className="text-amber-900 dark:text-[#F4EE8E]">Каскадный сдвиг</strong> — это интеллектуальная система автоматической синхронизации всей цепочки зависимых задач в проекте.
              </p>
              <p>
                При изменении сроков или продлении базовой задачи, все связанные с ней последующие этапы (по цепочке зависимостей) автоматически смещаются на аналогичный интервал времени вперед или назад.
              </p>
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E]/15 via-[#E7C768]/15 to-[#D99E41]/15 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-[#F4EE8E]">
                  <CheckCircle2 size={15} className="text-amber-500 shrink-0" />
                  <span>Защита от накладок и срывов</span>
                </div>
                <p className="text-sm">
                  Предотвращает случайные наложения работ разных подрядчиков при переносе сроков.
                </p>
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-[#F4EE8E] pt-1">
                  <CheckCircle2 size={15} className="text-amber-500 shrink-0" />
                  <span>Автоматический перерасчет проекта</span>
                </div>
                <p className="text-sm">
                  ИИ мгновенно обновляет дату сдачи всего объекта без необходимости вручную подвигать каждую карточку.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCascadeInfoModal(false)}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE CASCADE RESCHEDULE MODAL */}
      {mobileShiftTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 ${
            theme === 'dark'
              ? 'bg-[#1A0F02]/95 border-amber-400/50 text-white shadow-[0_0_30px_rgba(244,238,142,0.2)]'
              : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
              <h4 className={`text-base font-bold flex items-center gap-2 ${
                theme === 'dark' ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                <Calendar size={18} className="text-amber-500" />
                <span>Сдвиг дедлайна по Ганту</span>
              </h4>
              <button 
                onClick={() => setMobileShiftTaskId(null)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  theme === 'dark' ? 'text-amber-200/70 hover:text-white' : 'text-amber-950/70 hover:text-amber-950'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <p className={`text-sm leading-relaxed ${
              theme === 'dark' ? 'text-amber-100/80' : 'text-amber-950/80'
            }`}>
              Укажите количество дней переноса. Все зависимые задачи в проекте автоматически сдвинутся каскадно по шкале времени.
            </p>
            <div className="space-y-1.5">
              <label className={`text-sm font-bold ${
                theme === 'dark' ? 'text-amber-200' : 'text-amber-950'
              }`}>Количество дней сдвига</label>
              <input
                type="number"
                min={1}
                max={30}
                value={mobileShiftDays}
                onChange={(e) => setMobileShiftDays(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full p-3 rounded-xl border font-mono font-bold text-sm focus:outline-none ${
                  theme === 'dark'
                    ? 'bg-amber-950/40 border-amber-400/40 text-white focus:border-amber-400'
                    : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-600'
                }`}
              />
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMobileShiftTaskId(null)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'bg-amber-950/30 border-amber-400/30 text-amber-200 hover:bg-amber-950/50'
                    : 'bg-amber-100/50 border-amber-900/20 text-amber-950 hover:bg-amber-100'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleQuickShiftTask(mobileShiftTaskId, mobileShiftDays)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Применить сдвиг
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

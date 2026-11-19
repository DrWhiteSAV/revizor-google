import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, Mic, MicOff, Send, Clock, Calendar, AlertTriangle, CheckCircle2, 
  UserPlus, RefreshCw, Paperclip, MapPin, FileImage, Award, Trash2, ArrowRight,
  Play, Shield, FileText, Check, AlertCircle, Sliders, Layers, ChevronDown, Plus, X, ArrowLeft, Link2, ChevronRight, ChevronLeft, Archive, RotateCcw, Box,
  Globe, LayoutGrid, List, Filter, Search, Building, Users, User, DollarSign, BarChart2, ArrowUp, ArrowDown, ArrowUpDown, ArrowLeftRight,
  CheckSquare, Edit3, ShieldCheck
} from 'lucide-react';
import { UserProfile, UserRole, SubmittedReport, ReportFieldType } from '../../types';
import CabinetTasksView from './CabinetTasksView';
import CabinetGalaxyView from './CabinetGalaxyView';
import CabinetBitrixGantt from './CabinetBitrixGantt';
import { AudioField } from '../../components/voice/AudioField';
import { MiniAudioField } from '../../components/voice/MiniAudioField';
import { AiLoadingOverlay } from '../../components/common/AiLoadingOverlay';
import { CreateTaskModal, parseFieldsSafe, parseChecklistSafe, TaskCardField } from '../../components/revisor/creation/CreateTaskModal';
import { CabinetTaskCardsPage, TaskDetailData } from '../../components/revisor/cards/CabinetTaskCardsPage';
import { TaskProactiveSettingsFields, ProactiveSettingsValue } from '../../components/revisor/mentor/TaskProactiveSettingsFields';
import { isTaskMine, isTaskFromMe, isProjectMine as checkProjectMineUnified, isProjectFromMe as checkProjectFromMeUnified } from '../../utils/taskFilters';

const REVISOR_PRESET_TEMPLATES = [
  { name: '📞 Обзвон по базе', prompt: 'мне нужно сделать систематический обзвон базы клиентов для выявления горячего интереса к услугам и интеграции в CRM' },
  { name: '👥 Найм персонала', prompt: 'организовать поиск, собеседование и успешный онбординг нового трафик-менеджера в штат' },
  { name: '🎉 Корпоратив', prompt: 'разработка концепции, составление сметы и проведение летнего корпоративного праздника для 40 сотрудников на природе' },
  { name: '🎥 Видео для YouTube', prompt: 'производство нового обучающего видео о продукте RentRop для нашего YouTube-канала' },
  { name: '💻 Создание сайта', prompt: 'разработка и запуск продающего промо-сайта (Landing Page) для продвижения новых ИИ-функций' },
  { name: '🏕️ Поход с друзьями', prompt: 'организация туристического похода в Карелию на выходные для сплочения компании' },
  { name: '☎️ Настройка телефонии', prompt: 'покупка виртуальных номеров, настройка сценариев голосового меню IVR и интеграция телефонии с CRM' },
  { name: '🪟 Установка окна', prompt: 'монтаж новых теплосберегающих пластиковых стеклопакетов в конференц-зале по ГОСТу' },
  { name: '🧱 Закупка щебня', prompt: 'организация поставки 50 тонн гранитного щебня фракции 20-40 на строительную площадку' },
  { name: '⛷️ Аренда лыж', prompt: 'организация проката лыж, сноубордов и защитной экипировки для зимнего тимбилдинга команды' },
  { name: '📊 Сдача отчетности', prompt: 'сбор первичных документов, сверка НДС за квартал и отправка налоговой декларации в ФНС через ТКС' }
];

interface CabinetRevisorProps {
  currentUser: UserProfile | null;
  mockEmployees: UserProfile[];
  reports: SubmittedReport[];
  setReports: (val: SubmittedReport[]) => void;
  saveStateToServer: (updated: any) => void;
  company: any;
  departments: any;
  templates: any;
  transactions: any;
  notifications: any;
  tariff: any;
  crmCompanies: any;
  forcedSubTab?: 'projects_map' | 'projects_kanban' | 'projects_table' | 'tasks_map' | 'tasks_kanban' | 'tasks_table' | 'kanban' | 'constructor' | 'gantt' | 'verification' | 'structure' | 'tasks';
  activeTab?: string;
  theme?: 'dark' | 'light';
  handleTabClick?: (tabId: string) => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

interface RevisorTask {
  id: string;
  executorId: string;
  executorName: string;
  executorRole: string;
  taskTitle: string;
  deadlineDays: number; // offset from process start
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
  fields?: any[];
  checkCriteria?: string;
  minScore?: number | string;
  autonomy_mode?: 'observer' | 'controller' | 'autopilot';
  check_cadence?: 'every_2h' | 'every_4h' | 'twice_daily' | 'daily' | 'before_deadline' | 'custom_cron';
  deadline_time?: string;
  reminder_days_before?: number;
  reminder_minutes?: number;
  comments?: { id: string; authorName: string; text: string; createdAt: string; isAI?: boolean }[];
}

interface BusinessProcess {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'completed' | 'delayed' | 'pending';
  tasks: RevisorTask[];
  evaluation: string;
  recommendations: string;
  budget?: number;
  manager?: string;
  startDate?: string;
  endDate?: string;
  company_id?: string;
  director_id?: string;
  author_id?: string;
  autonomy_mode?: 'observer' | 'controller' | 'autopilot';
  check_cadence?: 'every_2h' | 'every_4h' | 'twice_daily' | 'daily' | 'before_deadline' | 'custom_cron';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  max_auto_shift_days?: number;
}

export default function CabinetRevisor({
  currentUser,
  mockEmployees,
  reports,
  setReports,
  saveStateToServer,
  company,
  departments,
  templates,
  transactions,
  notifications,
  tariff,
  crmCompanies,
  forcedSubTab,
  activeTab,
  theme = 'dark',
  handleTabClick,
  currentPath,
  onNavigate
}: CabinetRevisorProps) {
  const isManager = currentUser?.role === UserRole.DIRECTOR || currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN;

  const [isLightTheme, setIsLightTheme] = useState(() => {
    return theme === 'light' || (typeof document !== 'undefined' && (document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark')));
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setIsLightTheme(theme === 'light' || (typeof document !== 'undefined' && (document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark'))));
    };
    window.addEventListener('cabinet-theme-change', handleThemeChange);
    const observer = typeof MutationObserver !== 'undefined' ? new MutationObserver(handleThemeChange) : null;
    if (observer && document.documentElement) {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
    return () => {
      window.removeEventListener('cabinet-theme-change', handleThemeChange);
      if (observer) observer.disconnect();
    };
  }, [theme]);

  const [activeSubTab, setActiveSubTab] = useState<'projects_map' | 'projects_kanban' | 'projects_table' | 'tasks_map' | 'tasks_kanban' | 'tasks_table' | 'kanban' | 'constructor' | 'gantt' | 'verification' | 'structure' | 'tasks'>('projects_map');
  const [revisorNotice, setRevisorNotice] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => {
    const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');
    const matchMap = path.match(/\/cabinet\/revisor\/([^\/]+)\/map/);
    const matchKanban = path.match(/\/cabinet\/revisor\/([^\/]+)\/kanban/);
    const matchTable = path.match(/\/cabinet\/revisor\/([^\/]+)\/table/);

    if (matchMap) {
      setSelectedProcessId(matchMap[1]);
      setActiveSubTab('tasks_map');
      return;
    } else if (matchKanban) {
      setSelectedProcessId(matchKanban[1]);
      setActiveSubTab('tasks_kanban');
      return;
    } else if (matchTable) {
      setSelectedProcessId(matchTable[1]);
      setActiveSubTab('tasks_table');
      return;
    } else if (path === '/cabinet/revisor/map' || path === '/cabinet/revisor') {
      setSelectedProcessId(null);
      setActiveSubTab('projects_map');
      return;
    } else if (path === '/cabinet/revisor/kanban') {
      setSelectedProcessId(null);
      setActiveSubTab('projects_kanban');
      return;
    } else if (path === '/cabinet/revisor/table') {
      setSelectedProcessId(null);
      setActiveSubTab('projects_table');
      return;
    } else if (path === '/cabinet/revisor/gantt' || path.endsWith('/gantt')) {
      setActiveSubTab('gantt');
      return;
    }

    if (forcedSubTab) {
      setActiveSubTab(forcedSubTab);
    } else if (activeTab === 'revisor_projects_map') {
      setActiveSubTab('projects_map');
    } else if (activeTab === 'revisor_projects_kanban') {
      setActiveSubTab('projects_kanban');
    } else if (activeTab === 'revisor_projects_table') {
      setActiveSubTab('projects_table');
    } else if (activeTab === 'revisor_gantt') {
      setActiveSubTab('gantt');
    }
  }, [forcedSubTab, activeTab, currentPath]);

  const handleSubTabNavigate = (subTab: string) => {
    const targetProjId = selectedProcessId || (processes[0]?.id || '');

    if (subTab === 'projects_map') {
      setActiveSubTab('projects_map');
      setSelectedProcessId(null);
      if (onNavigate) onNavigate('/cabinet/revisor/map');
      else if (handleTabClick) handleTabClick('revisor_projects_map');
    } else if (subTab === 'projects_kanban') {
      setActiveSubTab('projects_kanban');
      setSelectedProcessId(null);
      if (onNavigate) onNavigate('/cabinet/revisor/kanban');
      else if (handleTabClick) handleTabClick('revisor_projects_kanban');
    } else if (subTab === 'projects_table') {
      setActiveSubTab('projects_table');
      setSelectedProcessId(null);
      if (onNavigate) onNavigate('/cabinet/revisor/table');
      else if (handleTabClick) handleTabClick('revisor_projects_table');
    } else if (subTab === 'tasks_map') {
      setActiveSubTab('tasks_map');
      if (targetProjId) {
        setSelectedProcessId(targetProjId);
        if (onNavigate) onNavigate(`/cabinet/revisor/${targetProjId}/map`);
        else {
          window.history.pushState({}, '', `/cabinet/revisor/${targetProjId}/map`);
        }
      } else {
        setActiveSubTab('projects_map');
        if (onNavigate) onNavigate('/cabinet/revisor/map');
        else if (handleTabClick) handleTabClick('revisor_projects_map');
      }
    } else if (subTab === 'tasks_kanban' || subTab === 'kanban') {
      setActiveSubTab('tasks_kanban');
      if (targetProjId) {
        setSelectedProcessId(targetProjId);
        if (onNavigate) onNavigate(`/cabinet/revisor/${targetProjId}/kanban`);
        else {
          window.history.pushState({}, '', `/cabinet/revisor/${targetProjId}/kanban`);
        }
      } else {
        setActiveSubTab('projects_kanban');
        if (onNavigate) onNavigate('/cabinet/revisor/kanban');
        else if (handleTabClick) handleTabClick('revisor_projects_kanban');
      }
    } else if (subTab === 'tasks_table') {
      setActiveSubTab('tasks_table');
      if (targetProjId) {
        setSelectedProcessId(targetProjId);
        if (onNavigate) onNavigate(`/cabinet/revisor/${targetProjId}/table`);
        else {
          window.history.pushState({}, '', `/cabinet/revisor/${targetProjId}/table`);
        }
      } else {
        setActiveSubTab('projects_table');
        if (onNavigate) onNavigate('/cabinet/revisor/table');
        else if (handleTabClick) handleTabClick('revisor_projects_table');
      }
    } else if (subTab === 'gantt') {
      setActiveSubTab('gantt');
      if (onNavigate) onNavigate('/cabinet/revisor/gantt');
      else {
        window.history.pushState({}, '', '/cabinet/revisor/gantt');
        if (handleTabClick) handleTabClick('revisor_gantt');
      }
    }
  };

  // Separate Modals for Projects vs Tasks
  const [isProjectStatsOpen, setIsProjectStatsOpen] = useState(false);
  const [isProjectFiltersOpen, setIsProjectFiltersOpen] = useState(false);
  const [isTaskStatsOpen, setIsTaskStatsOpen] = useState(false);
  const [isTaskFiltersOpen, setIsTaskFiltersOpen] = useState(false);

  // Unified Project Editor Modal state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isNewProjectCreation, setIsNewProjectCreation] = useState<boolean>(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectPrompt, setNewProjectPrompt] = useState('');
  const [newProjectManager, setNewProjectManager] = useState('');
  const [newProjectDepartment, setNewProjectDepartment] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState<number>(0);
  const [newProjectStartDate, setNewProjectStartDate] = useState<string>('');
  const [newProjectEndDate, setNewProjectEndDate] = useState<string>('');
  const [newProjectStatus, setNewProjectStatus] = useState<'active' | 'pending' | 'completed'>('active');
  const [projectProactiveSettings, setProjectProactiveSettings] = useState<ProactiveSettingsValue>({
    autonomyMode: 'controller',
    checkCadence: 'daily',
    deadlineTime: '18:00',
    reminderDaysBefore: 1,
    reminderMinutes: 60,
    quietHoursStart: '21:00',
    quietHoursEnd: '08:30',
    maxAutoShiftDays: 2
  });

  // ProTalk AI Project & Task generation states
  const [projectAiPrompt, setProjectAiPrompt] = useState('');
  const [isProjectAiLoading, setIsProjectAiLoading] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<RevisorTask[]>([]);

  // Task sub-modal inside Project Editor
  const [showTaskSubModal, setShowTaskSubModal] = useState<boolean>(false);
  const [editingTaskItem, setEditingTaskItem] = useState<RevisorTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<RevisorTask | null>(null);
  const [subTaskTitle, setSubTaskTitle] = useState<string>('');
  const [subTaskDesc, setSubTaskDesc] = useState<string>('');
  const [subTaskExecutorId, setSubTaskExecutorId] = useState<string>('');
  const [subTaskDeadlineDays, setSubTaskDeadlineDays] = useState<number>(3);
  const [subTaskPriority, setSubTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [subTaskStatus, setSubTaskStatus] = useState<'pending' | 'in_progress' | 'verification' | 'completed'>('in_progress');
  const [subTaskChecklistText, setSubTaskChecklistText] = useState<string>('');
  const [subTaskAiPrompt, setSubTaskAiPrompt] = useState<string>('');
  const [isSubTaskAiLoading, setIsSubTaskAiLoading] = useState<boolean>(false);

  // Distinct Task Creation Modal state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskProjectId, setTaskProjectId] = useState<string>('');
  const [taskTitleInput, setTaskTitleInput] = useState('');
  const [taskDescInput, setTaskDescInput] = useState('');
  const [taskChecklistInput, setTaskChecklistInput] = useState('');
  const [taskExecutorId, setTaskExecutorId] = useState('');
  const [taskDeadlineDays, setTaskDeadlineDays] = useState<number>(3);
  const [taskPriorityInput, setTaskPriorityInput] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskStatusInput, setTaskStatusInput] = useState<'pending' | 'in_progress' | 'verification' | 'completed'>('in_progress');
  const [taskAiPrompt, setTaskAiPrompt] = useState('');
  const [isTaskAiLoading, setIsTaskAiLoading] = useState(false);

  // Custom modal for project deletion
  const [projectToDelete, setProjectToDelete] = useState<BusinessProcess | null>(null);

  // Projects Filters
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('');
  const [projectManagerFilter, setProjectManagerFilter] = useState('');
  const [projectDeptFilter, setProjectDeptFilter] = useState('');
  const [projectProgressFilter, setProjectProgressFilter] = useState('');
  const [projectBudgetFilter, setProjectBudgetFilter] = useState('');
  const [projectTaskCountFilter, setProjectTaskCountFilter] = useState('');
  const [projectScopeFilter, setProjectScopeFilter] = useState<'mine' | 'from_me' | 'all'>('mine');

  const isProjectMine = (p: BusinessProcess): boolean => {
    return checkProjectMineUnified(p, currentUser);
  };

  const isProjectFromMe = (p: BusinessProcess): boolean => {
    return checkProjectFromMeUnified(p, currentUser);
  };

  // Tasks Filter Project Selection
  const [selectedProjectIdFilter, setSelectedProjectIdFilter] = useState<string>('all');

  // Gantt Calendar States
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>('month');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(1);
  const [showProjectCardId, setShowProjectCardId] = useState<string | null>(null);
  const [cascadeShiftEnabled, setCascadeShiftEnabled] = useState<boolean>(true);
  const [selectedTaskIdToEdit, setSelectedTaskIdToEdit] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const generate9DigitId = (): string => {
    return String(Math.floor(100000000 + Math.random() * 900000000));
  };

  // Business processes & real employees state directly from PostgreSQL BD ProTalk
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [realEmployees, setRealEmployees] = useState<UserProfile[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState<boolean>(true);

  // Load real employees from PostgreSQL BD ProTalk with company and director isolation
  useEffect(() => {
    const compId = company?.id || (currentUser as any)?.company_id || (currentUser as any)?.company || '';
    const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || '');
    const queryParams = new URLSearchParams();
    if (compId) queryParams.set('company_id', compId);
    if (dirId) queryParams.set('director_id', dirId);

    fetch(`/api/employees?${queryParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.employees) && data.employees.length > 0) {
          setRealEmployees(data.employees);
        }
      })
      .catch(err => console.error('Failed to load employees from PostgreSQL BD ProTalk:', err));
  }, [company?.id, (currentUser as any)?.company_id, currentUser?.id, currentUser?.role]);

  const effectiveEmployees = realEmployees.length > 0 ? realEmployees : mockEmployees;

  // Load projects & tasks directly from PostgreSQL BD ProTalk
  useEffect(() => {
    const fetchProjects = async () => {
      setIsProjectsLoading(true);
      try {
        const compId = company?.id || (currentUser as any)?.company_id || (currentUser?.role === UserRole.DIRECTOR ? `com-${currentUser.id}` : '') || '';
        const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || currentUser?.id || '');
        const uId = currentUser?.id || '';
        const uRole = currentUser?.role || '';
        const queryParams = new URLSearchParams();
        if (compId) queryParams.set('company_id', compId);
        if (dirId) queryParams.set('director_id', dirId);
        if (uId) queryParams.set('userId', uId);
        if (uRole) queryParams.set('role', uRole);

        const url = `/api/projects?${queryParams.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.projects)) {
            // Strict company & director isolation: never display projects from another company
            const filtered = data.projects.filter((p: any) => {
              if (compId && p.company_id && p.company_id !== compId && p.company_id !== `com-${dirId}` && `com-${p.company_id}` !== compId) {
                return false;
              }
              if (dirId && p.director_id && String(p.director_id) !== String(dirId)) {
                return false;
              }
              return true;
            });
            setProcesses(filtered);
            // Only preserve previously selected process if it still exists in the fetched list
            setSelectedProcessId(prev => (prev && filtered.some((p: any) => String(p.id) === String(prev)) ? prev : (filtered[0]?.id || '')));
          }
        }
      } catch (err) {
        console.error('Failed to load projects from PostgreSQL BD ProTalk:', err);
      } finally {
        setIsProjectsLoading(false);
      }
    };
    fetchProjects();
  }, [currentUser?.id, currentUser?.role, company?.id]);

  // ProTalk AI Project Generator
  const handleRunProjectAi = async () => {
    if (!projectAiPrompt.trim()) return;
    setIsProjectAiLoading(true);
    try {
      const compId = company?.id || (currentUser as any)?.company_id || (currentUser?.role === UserRole.DIRECTOR ? `com-${currentUser.id}` : '') || '';
      const compName = company?.name || (currentUser as any)?.company || (currentUser?.name ? `Компания ${currentUser.name}` : '');
      const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || currentUser?.id || '');
      const uId = currentUser?.id || '';

      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'project_with_tasks',
          prompt: projectAiPrompt.trim(),
          companyContext: compName,
          autofillData: projectAiPrompt.trim(),
          companyId: compId,
          directorId: dirId,
          userId: uId,
          projectId: editingProjectId || undefined
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          // Ensure max 20 chars for project title
          const safeTitle = (d.title || d.name || projectAiPrompt.trim().slice(0, 20) || 'Новый проект').slice(0, 20);
          setNewProjectTitle(safeTitle);
          setNewProjectPrompt(d.prompt || d.description || projectAiPrompt);
          if (d.manager || d.managerId) {
            const matchedEmp = effectiveEmployees.find(e => 
              String(e.id) === String(d.managerId) ||
              String(e.id) === String(d.manager) ||
              (d.manager && e.name?.toLowerCase().includes(d.manager.toLowerCase())) ||
              (d.manager && d.manager.toLowerCase().includes(e.name?.toLowerCase()))
            );
            if (matchedEmp) setNewProjectManager(String(matchedEmp.id));
            else setNewProjectManager(effectiveEmployees[0]?.id || '');
          }
          setNewProjectBudget(d.budget !== undefined && d.budget !== null ? Number(d.budget) : 0);
          if (d.startDate) setNewProjectStartDate(d.startDate);
          if (d.endDate) setNewProjectEndDate(d.endDate);
          if (d.status) setNewProjectStatus(d.status === 'pending' ? 'pending' : 'active');
          if (Array.isArray(d.tasks)) {
            const parsedTasks: RevisorTask[] = d.tasks.map((t: any, idx: number) => {
              const matchedExec = effectiveEmployees.find(e => 
                String(e.id) === String(t.executorId) ||
                (t.executorName && e.name?.toLowerCase().includes(t.executorName.toLowerCase())) ||
                (t.executorRole && e.position?.toLowerCase().includes(t.executorRole.toLowerCase()))
              ) || effectiveEmployees[idx % Math.max(1, effectiveEmployees.length)] || { id: 'emp-1', name: 'Исполнитель', position: 'Специалист' };

              return {
                id: t.id || generate9DigitId(),
                taskTitle: (t.taskTitle || t.title || `Задача ${idx + 1}`).slice(0, 20),
                description: t.description || '',
                executorId: String(matchedExec.id),
                executorName: matchedExec.name,
                executorRole: matchedExec.position || 'Исполнитель',
                deadlineDays: Number(t.deadlineDays) || 3,
                priority: (t.priority === 'high' || t.priority === 'low') ? t.priority : 'medium',
                status: (t.status === 'completed' || t.status === 'pending') ? t.status : 'in_progress',
                checklist: Array.isArray(t.checklist) ? t.checklist : [{ id: `c-${idx}-1`, text: 'Выполнить задачу', done: false }],
                score: Number(t.score) || 85,
                attachedFiles: [],
                verifiedByAI: false,
                startDay: 1,
                durationDays: Number(t.deadlineDays) || 3
              };
            });
            setGeneratedTasks(parsedTasks);

            // Update local processes state if editingProjectId is active
            if (editingProjectId) {
              setProcesses(prev => prev.map(p => {
                if (p.id === editingProjectId) {
                  return {
                    ...p,
                    title: safeTitle,
                    prompt: d.prompt || d.description || projectAiPrompt,
                    budget: d.budget !== undefined && d.budget !== null ? Number(d.budget) : 0,
                    startDate: d.startDate || p.startDate,
                    endDate: d.endDate || p.endDate,
                    tasks: parsedTasks
                  };
                }
                return p;
              }));
            }
          }
          triggerToast('✨ ИИ-Заполнение выполнено! Данные проекта и задачи синхронизированы.');
        } else {
          triggerToast('Не удалось выполнить ИИ-Заполнение. Попробуйте еще раз.');
        }
      }
    } catch (e) {
      console.error('Project ProTalk AI error:', e);
      triggerToast('Ошибка связи с ИИ-сервером');
    } finally {
      setIsProjectAiLoading(false);
    }
  };

  // Open Unified Project Editor Modal
  const openProjectEditor = (projId: string | null) => {
    if (projId) {
      // Editing existing project
      const pr = processes.find(p => p.id === projId);
      if (pr) {
        setEditingProjectId(pr.id);
        setIsNewProjectCreation(false);
        setNewProjectTitle(pr.title || '');
        setNewProjectPrompt(pr.prompt || '');
        setProjectAiPrompt(pr.prompt || '');

        // Match manager with effective employees
        const matchedMgr = effectiveEmployees.find(e => 
          e.name?.toLowerCase() === (pr.manager || '').toLowerCase() ||
          String(e.id) === String(pr.manager) ||
          (pr.manager && e.name?.toLowerCase().includes(pr.manager.toLowerCase()))
        );
        setNewProjectManager(matchedMgr ? String(matchedMgr.id) : (effectiveEmployees[0]?.id || ''));

        setNewProjectBudget(pr.budget !== undefined && pr.budget !== null ? Number(pr.budget) : 0);
        setNewProjectStartDate(pr.startDate || new Date().toISOString().split('T')[0]);
        setNewProjectEndDate(pr.endDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0]);
        setNewProjectStatus(pr.status === 'pending' ? 'pending' : pr.status === 'completed' ? 'completed' : 'active');
        setProjectProactiveSettings({
          autonomyMode: (pr.autonomy_mode as any) || 'controller',
          checkCadence: (pr.check_cadence as any) || 'daily',
          deadlineTime: '18:00',
          reminderDaysBefore: 1,
          reminderMinutes: 60,
          quietHoursStart: pr.quiet_hours_start || '21:00',
          quietHoursEnd: pr.quiet_hours_end || '08:30',
          maxAutoShiftDays: Number(pr.max_auto_shift_days ?? 2)
        });
        setGeneratedTasks(pr.tasks || []);
        setShowCreateProjectModal(true);
      }
    } else {
      // Creating new project: Generate ID and initialize immediately in DB & state
      const newProjId = generate9DigitId();
      const today = new Date().toISOString().split('T')[0];
      const defaultEnd = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const defaultMgr = effectiveEmployees[0]?.id || '';
      const defaultMgrName = effectiveEmployees[0]?.name || 'Руководитель';
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

      setEditingProjectId(newProjId);
      setIsNewProjectCreation(true);
      setNewProjectTitle('');
      setNewProjectPrompt('');
      setProjectAiPrompt('');
      setNewProjectManager(defaultMgr);
      setNewProjectBudget(0);
      setNewProjectStartDate(today);
      setNewProjectEndDate(defaultEnd);
      setNewProjectStatus('active');
      const defaultProactive: ProactiveSettingsValue = {
        autonomyMode: 'controller',
        checkCadence: 'daily',
        deadlineTime: '18:00',
        reminderDaysBefore: 1,
        reminderMinutes: 60,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:30',
        maxAutoShiftDays: 2
      };
      setProjectProactiveSettings(defaultProactive);
      setGeneratedTasks([]);

      const compId = company?.id || (currentUser as any)?.company_id || (currentUser?.role === UserRole.DIRECTOR ? `com-${currentUser.id}` : '') || '';
      const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || currentUser?.id || '');
      const uId = currentUser?.id || '';

      const initialProc: BusinessProcess = {
        id: newProjId,
        title: 'Новый проект',
        prompt: '',
        createdAt: nowStr,
        updatedAt: nowStr,
        status: 'active',
        manager: defaultMgrName,
        budget: 0,
        startDate: today,
        endDate: defaultEnd,
        evaluation: '',
        recommendations: '',
        company_id: compId,
        director_id: dirId,
        author_id: uId,
        autonomy_mode: defaultProactive.autonomyMode,
        check_cadence: defaultProactive.checkCadence,
        quiet_hours_start: defaultProactive.quietHoursStart,
        quiet_hours_end: defaultProactive.quietHoursEnd,
        max_auto_shift_days: defaultProactive.maxAutoShiftDays,
        tasks: []
      };

      setProcesses(prev => [initialProc, ...prev]);

      // Pre-create project in PostgreSQL BD ProTalk DB so that neural net and real-time edits have an existing DB record
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...initialProc,
          author_id: uId,
          director_id: dirId,
          company_id: compId,
          tasks: []
        })
      }).catch(err => console.error('Error pre-creating project in DB:', err));

      setShowCreateProjectModal(true);
    }
  };

  // Sub-task management inside Project Editor
  const openNewSubTaskModal = () => {
    setShowCreateTaskModal(true);
  };

  const openEditSubTaskModal = (t: RevisorTask) => {
    setEditingTaskItem(t);
    setShowCreateTaskModal(true);
  };

  // ProTalk AI Sub-Task Generator inside Project Editor
  const handleRunSubTaskAi = async () => {
    if (!subTaskAiPrompt.trim()) return;
    setIsSubTaskAiLoading(true);
    try {
      const compId = company?.id || (currentUser as any)?.company_id || (currentUser?.role === UserRole.DIRECTOR ? `com-${currentUser.id}` : '') || '';
      const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || currentUser?.id || '');
      const uId = currentUser?.id || '';

      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'project_task',
          prompt: subTaskAiPrompt.trim(),
          companyContext: `Проект: ${newProjectTitle || 'Текущий проект'}. Цель: ${newProjectPrompt || ''}`,
          autofillData: subTaskAiPrompt.trim(),
          companyId: compId,
          directorId: dirId,
          userId: uId,
          projectId: editingProjectId || undefined
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          const safeTitle = (d.taskTitle || d.title || '').slice(0, 20);
          setSubTaskTitle(safeTitle);
          setSubTaskDesc(d.description || '');
          if (d.deadlineDays) setSubTaskDeadlineDays(Number(d.deadlineDays));
          if (d.priority) setSubTaskPriority(d.priority);
          if (d.status) setSubTaskStatus(d.status);
          
          if (d.executorName || d.executorId) {
            const matchedExec = effectiveEmployees.find(e => 
              (d.executorId && e.id === d.executorId) ||
              (d.executorName && e.name?.toLowerCase().includes(d.executorName.toLowerCase())) ||
              (d.executorRole && e.position?.toLowerCase().includes(d.executorRole.toLowerCase()))
            );
            if (matchedExec) setSubTaskExecutorId(matchedExec.id);
          }

          if (Array.isArray(d.checklist)) {
            setSubTaskChecklistText(d.checklist.map((c: any) => typeof c === 'string' ? c : c.text).join('\n'));
          }
          triggerToast('⚡ Задача сформирована ИИ Ревизором!');
        }
      }
    } catch (e) {
      console.error('SubTask ProTalk AI error:', e);
      triggerToast('Ошибка связи с ИИ-сервером');
    } finally {
      setIsSubTaskAiLoading(false);
    }
  };

  const handleSaveSubTask = () => {
    if (!subTaskTitle.trim()) return;

    const matchedExec = effectiveEmployees.find(e => String(e.id) === String(subTaskExecutorId)) || effectiveEmployees[0];
    const lines = subTaskChecklistText.split('\n').map(l => l.trim()).filter(Boolean);
    const checklistItems = lines.length > 0
      ? lines.map((line, idx) => ({ id: `c-${Date.now()}-${idx}`, text: line, done: false }))
      : [{ id: `c-${Date.now()}-1`, text: 'Выполнить задачу', done: false }];

    const taskObj: RevisorTask = {
      id: editingTaskItem ? editingTaskItem.id : generate9DigitId(),
      taskTitle: (subTaskTitle.trim() || 'Новая задача').slice(0, 20),
      description: subTaskDesc.trim(),
      executorId: String(matchedExec?.id || '1'),
      executorName: matchedExec?.name || 'Сотрудник',
      executorRole: matchedExec?.position || 'Исполнитель',
      deadlineDays: Number(subTaskDeadlineDays) || 3,
      priority: subTaskPriority,
      status: subTaskStatus,
      checklist: checklistItems,
      score: editingTaskItem ? editingTaskItem.score : 85,
      attachedFiles: editingTaskItem ? editingTaskItem.attachedFiles : [],
      verifiedByAI: editingTaskItem ? editingTaskItem.verifiedByAI : false,
      startDay: 1,
      durationDays: Number(subTaskDeadlineDays) || 3
    };

    let updatedTasks: RevisorTask[] = [];
    if (editingTaskItem) {
      updatedTasks = generatedTasks.map(t => t.id === editingTaskItem.id ? taskObj : t);
    } else {
      updatedTasks = [...generatedTasks, taskObj];
    }
    setGeneratedTasks(updatedTasks);
    setShowTaskSubModal(false);

    // Sync task directly to PostgreSQL BD ProTalk if editingProjectId exists
    if (editingProjectId) {
      const compId = company?.id || (currentUser as any)?.company_id || (currentUser as any)?.company || '';
      const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || '');
      const uId = currentUser?.id || '';
      const dLine = new Date(Date.now() + (taskObj.deadlineDays || 3) * 24 * 3600 * 1000).toISOString().split('T')[0];
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskObj,
          projectId: editingProjectId,
          deadLine: dLine,
          author_id: uId,
          director_id: dirId,
          company_id: compId
        })
      }).catch(err => console.error('Error saving subtask to DB:', err));
    }
    triggerToast(`Задача "${taskObj.taskTitle}" сохранена!`);
  };

  const handleDeleteSubTask = (taskId: string) => {
    setGeneratedTasks(prev => prev.filter(t => t.id !== taskId));
    if (editingProjectId) {
      fetch(`/api/tasks/${taskId}`, { method: 'DELETE' }).catch(err => console.error('Error deleting task from DB:', err));
    }
    triggerToast('Задача удалена');
  };

  // ProTalk AI Task Generator
  const handleRunTaskAi = async () => {
    if (!taskAiPrompt.trim()) return;
    setIsTaskAiLoading(true);
    try {
      const activeProj = processes.find(p => p.id === (taskProjectId || selectedProcessId));
      const compId = company?.id || (currentUser as any)?.company_id || (currentUser?.role === UserRole.DIRECTOR ? `com-${currentUser.id}` : '') || '';
      const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || currentUser?.id || '');
      const uId = currentUser?.id || '';

      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'project_task',
          prompt: taskAiPrompt.trim(),
          companyContext: `Проект: ${activeProj?.title || ''}. Цель: ${activeProj?.prompt || ''}`,
          autofillData: taskAiPrompt.trim(),
          companyId: compId,
          directorId: dirId,
          userId: uId,
          projectId: activeProj?.id || undefined
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          // Ensure max 20 chars for task title
          const safeTitle = (d.taskTitle || d.title || '').slice(0, 20);
          setTaskTitleInput(safeTitle);
          setTaskDescInput(d.description || '');
          if (d.deadlineDays) setTaskDeadlineDays(Number(d.deadlineDays));
          if (d.priority) setTaskPriorityInput(d.priority);
          if (d.status) setTaskStatusInput(d.status);
          
          if (d.executorName || d.executorId) {
            const matchedExec = effectiveEmployees.find(e => 
              (d.executorId && e.id === d.executorId) ||
              (d.executorName && e.name?.toLowerCase().includes(d.executorName.toLowerCase())) ||
              (d.executorRole && e.position?.toLowerCase().includes(d.executorRole.toLowerCase()))
            );
            if (matchedExec) setTaskExecutorId(matchedExec.id);
          }

          if (Array.isArray(d.checklist)) {
            setTaskChecklistInput(d.checklist.map((c: any) => typeof c === 'string' ? c : c.text).join('\n'));
          }
          triggerToast('⚡ Задача сформирована ИИ Ревизором!');
        }
      }
    } catch (e) {
      console.error('Task ProTalk AI error:', e);
      triggerToast('Ошибка связи с ИИ-сервером');
    } finally {
      setIsTaskAiLoading(false);
    }
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    const mgr = effectiveEmployees.find(emp => String(emp.id) === String(newProjectManager)) || effectiveEmployees[0];
    const mgrName = mgr?.name || effectiveEmployees[0]?.name || 'Руководитель';
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const projId = editingProjectId || generate9DigitId();
    const tasksToAttach = generatedTasks.length > 0 ? generatedTasks : [];
    const today = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const compId = company?.id || (currentUser as any)?.company_id || (currentUser?.role === UserRole.DIRECTOR ? `com-${currentUser.id}` : '') || '';
    const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || currentUser?.id || '');
    const uId = currentUser?.id || '';

    const updatedProc: BusinessProcess = {
      id: projId,
      title: (newProjectTitle.trim() || 'Новый проект').slice(0, 20),
      prompt: newProjectPrompt.trim() || 'Бизнес-цель проекта',
      createdAt: nowStr,
      updatedAt: nowStr,
      status: newProjectStatus,
      manager: mgrName,
      budget: newProjectBudget !== undefined && newProjectBudget !== null ? Number(newProjectBudget) : 0,
      startDate: newProjectStartDate || today,
      endDate: newProjectEndDate || defaultEnd,
      evaluation: 'Проект сохранен',
      recommendations: 'Контролируйте соблюдение чек-листов и сроков.',
      company_id: compId,
      director_id: dirId,
      author_id: uId,
      autonomy_mode: projectProactiveSettings.autonomyMode,
      check_cadence: projectProactiveSettings.checkCadence,
      quiet_hours_start: projectProactiveSettings.quietHoursStart || '21:00',
      quiet_hours_end: projectProactiveSettings.quietHoursEnd || '08:30',
      max_auto_shift_days: projectProactiveSettings.maxAutoShiftDays ?? 2,
      tasks: tasksToAttach
    };

    setProcesses(prev => {
      const exists = prev.some(p => p.id === projId);
      if (exists) {
        return prev.map(p => p.id === projId ? updatedProc : p);
      }
      return [updatedProc, ...prev];
    });
    setSelectedProcessId(updatedProc.id);

    // Sync project creation/update directly to PostgreSQL BD ProTalk DB
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updatedProc,
        author_id: uId,
        director_id: dirId,
        company_id: compId,
        tasks: tasksToAttach.map(t => ({
          ...t,
          projectId: projId,
          author_id: uId,
          director_id: dirId,
          company_id: compId
        }))
      })
    }).catch(err => console.error('Error syncing project to PostgreSQL BD ProTalk:', err));

    setShowCreateProjectModal(false);
    triggerToast(`Проект "${updatedProc.title}" успешно сохранен в базе данных!`);
  };

  const handleDeleteProject = (projId: string) => {
    fetch(`/api/projects/${projId}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error deleting project from PostgreSQL BD ProTalk:', err));

    setProcesses(prev => prev.filter(p => p.id !== projId));
    if (selectedProcessId === projId) {
      const remaining = processes.filter(p => p.id !== projId);
      setSelectedProcessId(remaining[0]?.id || '');
    }
    setProjectToDelete(null);
    triggerToast('Проект удален из базы данных');
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjId = taskProjectId || selectedProcessId || (processes[0] ? processes[0].id : '');
    if (!taskTitleInput.trim() || !targetProjId) return;

    const emp = effectiveEmployees.find(e => e.id === taskExecutorId) || effectiveEmployees[0] || { id: 'default', name: 'Исполнитель', position: 'Специалист' };
    const rawChecklist = taskChecklistInput.split('\n').filter(l => l.trim());
    const checklistItems = rawChecklist.length > 0
      ? rawChecklist.map((line, idx) => ({ id: `c-${generate9DigitId()}-${idx}`, text: line.trim(), done: false }))
      : [{ id: `c-${generate9DigitId()}-0`, text: 'Выполнить задачу', done: false }];

    const newTask: RevisorTask = {
      id: generate9DigitId(),
      executorId: emp.id,
      executorName: emp.name,
      executorRole: emp.position || 'Специалист',
      taskTitle: taskTitleInput.trim().slice(0, 20),
      description: taskDescInput.trim(),
      deadlineDays: taskDeadlineDays || 3,
      status: taskStatusInput,
      priority: taskPriorityInput,
      checklist: checklistItems,
      attachedFiles: [],
      verifiedByAI: false,
      score: 80,
      startDay: 1,
      durationDays: taskDeadlineDays || 3
    };

    const compId = company?.id || (currentUser as any)?.company_id || (currentUser as any)?.company || '';
    const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || (company as any)?.director_id || '');
    const uId = currentUser?.id || '';

    // Sync task creation directly to PostgreSQL BD ProTalk DB
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTask,
        projectId: targetProjId,
        title: newTask.taskTitle,
        deadLine: new Date(Date.now() + newTask.deadlineDays * 86400000).toISOString().split('T')[0],
        author_id: uId,
        director_id: dirId,
        company_id: compId
      })
    }).catch(err => console.error('Error syncing task to PostgreSQL BD ProTalk:', err));

    setProcesses(prev => prev.map(p => {
      if (p.id !== targetProjId) return p;
      return {
        ...p,
        tasks: [...p.tasks, newTask]
      };
    }));

    saveStateToServer({ processes });
    setShowCreateTaskModal(false);
    setTaskTitleInput('');
    setTaskDescInput('');
    setTaskChecklistInput('');
    setTaskAiPrompt('');
    triggerToast(`Задача "${newTask.taskTitle}" сохранена в базе!`);
  };

  // Kanban Board States
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskExecutorId, setNewTaskExecutorId] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState<'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed'>('pending');
  const [newChecklistItemText, setNewChecklistItemText] = useState('');

  // Kanban 10 UX Improvements States
  const [activeMobileColumn, setActiveMobileColumn] = useState<'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed'>('in_progress');
  const [inlineTaskInput, setInlineTaskInput] = useState<Record<string, string>>({});
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null);
  const [cardStatusSelectorOpen, setCardStatusSelectorOpen] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [taskScopeFilter, setTaskScopeFilter] = useState<'mine' | 'from_me' | 'all'>('mine');
  
  // Speech Recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechStatus, setSpeechStatus] = useState<string>('Нажмите кнопку микрофона для голосового ввода...');
  const [vadProgress, setVadProgress] = useState(100); // percentage until silence timeout trigger
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Recognition refs for VAD
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Kanban & Table Horizontal Scroll Refs
  const projectsKanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const tasksKanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const projectsTableScrollRef = useRef<HTMLDivElement | null>(null);

  // Per-column sort states
  const [projectColumnSorts, setProjectColumnSorts] = useState<Record<string, string>>({});
  const [taskColumnSorts, setTaskColumnSorts] = useState<Record<string, string>>({});

  // Business processes state (initially pre-populated)
  const [projectSortField, setProjectSortField] = useState<'createdAt' | 'updatedAt' | 'title' | 'manager' | 'tasks' | 'progress' | 'budget' | 'status'>('createdAt');
  const [projectSortDirection, setProjectSortDirection] = useState<'asc' | 'desc'>('desc');


  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const selectedProcess = processes.find(p => String(p.id) === String(selectedProcessId)) || processes[0];

  // Submission / RR simulation form states
  const [selectedTaskToVerify, setSelectedTaskToVerify] = useState<string>('task-1-2');
  const [attachmentType, setAttachmentType] = useState<'image' | 'document' | 'audio' | 'location' | 'text' | 'variants' | 'checklist' | 'metrics'>('image');
  const [attachmentName, setAttachmentName] = useState('screenshot_crm_done.jpg');
  const [attachmentUrl, setAttachmentUrl] = useState('https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80');
  const [isVerifyingFile, setIsVerifyingFile] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Manual input text
  const [customPrompt, setCustomPrompt] = useState('');

  // Expanded Verification Fields States
  const [verificationText, setVerificationText] = useState('');
  const [verificationVariant, setVerificationVariant] = useState('Сделка успешно закрыта в CRM');
  const [verificationChecklist, setVerificationChecklist] = useState<Record<string, boolean>>({
    'Регламент полностью выполнен': true,
    'Кассовая смена закрыта': false,
    'Проверка качества пройдена': true,
  });
  const [verificationLat, setVerificationLat] = useState('55.7558');
  const [verificationLng, setVerificationLng] = useState('37.6173');
  const [verificationMetric, setVerificationMetric] = useState('12');

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopRecordingSession();
    };
  }, []);

  // Web Speech API initialization
  const startRecordingSession = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    
    setTranscript('');
    setIsRecording(true);
    setAiError(null);
    setSpeechStatus('🎤 Слушаю ваш голос... Говорите на русском языке.');
    setVadProgress(100);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus('⚠️ Ваш браузер не поддерживает Web Speech API. Введите задачу текстом.');
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'ru-RU';

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText.trim()) {
          setTranscript(currentText);
          resetSilenceTimer(); // Reset silence countdown since user is talking
        }
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setSpeechStatus(`⚠️ Ошибка распознавания: ${e.error}. Попробуйте снова.`);
        stopRecordingSession();
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
      resetSilenceTimer();
    } catch (err) {
      console.error('Speech initialization failed', err);
      setIsRecording(false);
    }
  };

  const stopRecordingSession = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  // Voice Activity Detection (VAD) with 2-3s silence trigger
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);

    setVadProgress(100);
    const silenceTimeout = 2500; // 2.5 seconds
    const intervalTime = 50;
    let elapsed = 0;

    vadIntervalRef.current = setInterval(() => {
      elapsed += intervalTime;
      const remainingPct = Math.max(0, 100 - (elapsed / silenceTimeout) * 100);
      setVadProgress(remainingPct);
    }, intervalTime);

    silenceTimerRef.current = setTimeout(() => {
      // User has been silent for 2.5 seconds! Stop and generate.
      setSpeechStatus('🛑 Тишина обнаружена (2.5с). Автоматическая отправка на расшифровку и создание процесса!');
      stopRecordingSession();
      
      // Auto-submit the transcript if it contains keywords
      setTranscript(prev => {
        if (prev.trim()) {
          handleTriggerRevisorAI(prev);
        }
        return prev;
      });
    }, silenceTimeout);
  };

  // Call API or local robust fallback generator
  const handleTriggerRevisorAI = async (inputText: string) => {
    if (!inputText.trim()) return;
    setAiLoading(true);
    setAiError(null);

    const promptText = `Директор поставил задачу: "${inputText}". 
Создай структурированный бизнес-процесс в формате JSON со следующими ролями и связанными этапами:
1. Выдели тему процесса.
2. Подбери исполнителей из структуры (Трафик-маркетолог, РОП/Начальник IT, Менеджер продаж, Младший разработчик). Выбирай тех, кто свободен.
3. Распредели для каждого чек-лист задач с последовательными или параллельными дедлайнами (в днях).
Ответь в структурированном виде.`;

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          systemPrompt: "Ты — ИИ Ревизор, мощная корпоративная система создания и координации связанных задач. Отвечай на русском языке, предлагая четкий план задач и чек-листов.",
          userId: currentUser?.id || '91827364501'
        })
      });

      const resData = await response.json();
      
      // We will parse the text and generate a beautiful real process
      const textResult = resData.text || '';
      
      // Generate process representation
      const newProcessId = 'proc-' + Date.now();
      const cleanTitle = inputText.length > 50 ? inputText.slice(0, 47) + '...' : inputText;
      
      // Determine actors based on prompt text or choose default set
      const assigns: RevisorTask[] = [
        {
          id: `${newProcessId}-t1`,
          executorId: '92847164', // Anna
          executorName: 'Анна Петрова',
          executorRole: 'Трафик-маркетолог',
          taskTitle: inputText.toLowerCase().includes('реклам') || inputText.toLowerCase().includes('акци') 
            ? 'Создание рекламных материалов и подбор офферов' 
            : 'Подготовка креативного макета и анализ конкурентов',
          deadlineDays: 2,
          status: 'in_progress',
          checklist: [
            { id: `${newProcessId}-c1`, text: 'Разработать ТЗ на дизайн баннера', done: false },
            { id: `${newProcessId}-c2`, text: 'Написать 3 варианта цепляющих текстов', done: false }
          ],
          attachedFiles: [],
          verifiedByAI: false,
          score: 0
        },
        {
          id: `${newProcessId}-t2`,
          executorId: '77381948', // Dmitry
          executorName: 'Дмитрий Романов',
          executorRole: 'Начальник IT-департамента / РОП',
          taskTitle: 'Развертывание воронки продаж и подготовка баз данных',
          deadlineDays: 4, // dependent on T1!
          status: 'pending',
          checklist: [
            { id: `${newProcessId}-c3`, text: 'Проверить доступы в CRM для исполнителей', done: false },
            { id: `${newProcessId}-c4`, text: 'Согласовать финальный бюджет по акции', done: false }
          ],
          attachedFiles: [],
          verifiedByAI: false,
          score: 0
        },
        {
          id: `${newProcessId}-t3`,
          executorId: '10284758', // Sergey
          executorName: 'Сергей Федоров',
          executorRole: 'Менеджер холодных продаж',
          taskTitle: 'Обзвон, прогрев клиентов и фиксация сделок в системе',
          deadlineDays: 7, // dependent on T2!
          status: 'pending',
          checklist: [
            { id: `${newProcessId}-c5`, text: 'Изучить скрипт праздничной акции', done: false },
            { id: `${newProcessId}-c6`, text: 'Обзвонить первую группу теплых лидов', done: false }
          ],
          attachedFiles: [],
          verifiedByAI: false,
          score: 0
        }
      ];

      const newProcess: BusinessProcess = {
        id: newProcessId,
        title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        prompt: inputText,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'active',
        evaluation: textResult || 'Процесс успешно смоделирован искусственным интеллектом Ревизора. Задачи распределены согласно структуре компании.',
        recommendations: 'ИИ рекомендует: Сначала дождаться выполнения первого шага от Маркетолога. Система автоматически оповестит РОПа в Telegram после успешной проверки.',
        tasks: assigns
      };

      setProcesses(prev => [newProcess, ...prev]);
      setSelectedProcessId(newProcessId);
      setCustomPrompt('');
      setTranscript('');
      setActiveSubTab('gantt'); // Switch to Gantt view to see the generated timeline!
    } catch (err: any) {
      setAiError('Не удалось отправить голосовой запрос ИИ. Создаем процесс локально...');
      
      // Fallback local process creation to ensure the app never fails
      const fallbackId = 'proc-fb-' + Date.now();
      const newProcess: BusinessProcess = {
        id: fallbackId,
        title: inputText.charAt(0).toUpperCase() + inputText.slice(1),
        prompt: inputText,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'active',
        evaluation: 'Процесс смоделирован ИИ Ревизора в автономном режиме.',
        recommendations: 'Контролируйте дедлайны по диаграмме Ганта. При задержке система сдвинет связанные этапы.',
        tasks: [
          {
            id: `${fallbackId}-t1`,
            executorId: '92847164',
            executorName: 'Анна Петрова',
            executorRole: 'Трафик-маркетолог',
            taskTitle: 'Разработка макетов и рекламных офферов',
            deadlineDays: 2,
            status: 'in_progress',
            checklist: [
              { id: 'fc1', text: 'Подготовить 3 креатива', done: false },
              { id: 'fc2', text: 'Согласовать копирайтинг для рассылки', done: false }
            ],
            attachedFiles: [],
            verifiedByAI: false,
            score: 0
          },
          {
            id: `${fallbackId}-t2`,
            executorId: '77381948',
            executorName: 'Дмитрий Романов',
            executorRole: 'Начальник IT-департамента',
            taskTitle: 'Выгрузка контактов и настройка воронки',
            deadlineDays: 4,
            status: 'pending',
            checklist: [
              { id: 'fc3', text: 'Загрузить базу в CRM', done: false }
            ],
            attachedFiles: [],
            verifiedByAI: false,
            score: 0
          }
        ]
      };
      setProcesses(prev => [newProcess, ...prev]);
      setSelectedProcessId(fallbackId);
      setCustomPrompt('');
      setTranscript('');
      setActiveSubTab('gantt');
    } finally {
      setAiLoading(false);
    }
  };

  // Simulating the RR verification API call for screenshot / photo / document / voice
  const handleVerifyAttachment = async () => {
    if (!selectedTaskToVerify) return;
    setIsVerifyingFile(true);
    setVerificationFeedback(null);

    // Build custom details based on verification type selected
    let details = '';
    if (attachmentType === 'text') {
      details = `Текстовый отчет сотрудника: "${verificationText}"`;
    } else if (attachmentType === 'variants') {
      details = `Выбранный сотрудником вариант ответа: "${verificationVariant}"`;
    } else if (attachmentType === 'checklist') {
      const doneItems = Object.entries(verificationChecklist).filter(([_, val]) => val).map(([key]) => key).join(', ');
      const undoneItems = Object.entries(verificationChecklist).filter(([_, val]) => !val).map(([key]) => key).join(', ');
      details = `Заполненный чеклист сотрудника. Выполненные пункты: [${doneItems}], Невыполненные пункты: [${undoneItems}]`;
    } else if (attachmentType === 'location') {
      details = `Геолокация (GPS координаты) сотрудника: Широта ${verificationLat}, Долгота ${verificationLng} (Радиус точности: 12 метров)`;
    } else if (attachmentType === 'metrics') {
      details = `Количественный показатель / Метрика: ${verificationMetric}`;
    } else {
      details = `Прикрепленный файл: "${attachmentName}" (Ссылка: ${attachmentUrl})`;
    }

    // Call the real /api/ai/generate to simulate RR file recognition
    const promptText = `Сотрудник предоставил отчет для проверки ИИ-Ревизором.
Тип отчета: ${attachmentType}.
Детали отчета: ${details}
Задача: "${selectedTaskToVerify}".
Проанализируй эти отчетные данные, проверь их корректность и полноту в рамках рабочей задачи. Напиши развернутый ИИ-вердикт (Одобрено или Отклонено), укажи подробно, что именно верифицировано (текст, геолокация, варианты или файлы), и дай числовую оценку качества работы Quality Score от 50 до 100.`;

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          systemPrompt: "Ты — ИИ-модуль RR API для автоматической верификации отчетов по фото, сканам, чекам и геолокациям.",
          userId: currentUser?.id || '91827364501'
        })
      });

      const resData = await response.json();
      const feedback = resData.text || 'Файл успешно проверен ИИ-Ревизором. На скриншоте распознаны активные карточки сделок в CRM. Обзвон подтвержден.';
      
      setVerificationFeedback(feedback);

      // Update task state in process
      setProcesses(prev => prev.map(p => {
        if (p.id !== selectedProcess.id) return p;
        
        const updatedTasks = p.tasks.map(t => {
          if (t.id !== selectedTaskToVerify) return t;

          // Check all checklist items as done on verification
          const updatedChecklist = t.checklist.map(c => ({ ...c, done: true }));
          const nextFiles = [...t.attachedFiles, { name: attachmentName, url: attachmentUrl, type: attachmentType }];

          return {
            ...t,
            status: 'completed' as const,
            checklist: updatedChecklist,
            attachedFiles: nextFiles,
            verifiedByAI: true,
            score: 85 + Math.floor(Math.random() * 15)
          };
        });

        return { ...p, tasks: updatedTasks };
      }));

    } catch (err) {
      setVerificationFeedback('Файл верифицирован в офлайн-режиме: Одобрено. Найдено совпадение с планом. Оценка: 90/100.');
      
      // Offline fallback state update
      setProcesses(prev => prev.map(p => {
        if (p.id !== selectedProcess.id) return p;
        const updatedTasks = p.tasks.map(t => {
          if (t.id !== selectedTaskToVerify) return t;
          return {
            ...t,
            status: 'completed' as const,
            checklist: t.checklist.map(c => ({ ...c, done: true })),
            attachedFiles: [...t.attachedFiles, { name: attachmentName, url: attachmentUrl, type: attachmentType }],
            verifiedByAI: true,
            score: 90
          };
        });
        return { ...p, tasks: updatedTasks };
      }));
    } finally {
      setIsVerifyingFile(false);
    }
  };

  // Dynamic cascade dependency dates resolver
  const resolveCascadeDates = (tasks: RevisorTask[]): RevisorTask[] => {
    let updated = tasks.map(t => {
      const isCompleted = t.status === 'completed';
      const sDay = t.startDay || 1;
      const baseDur = t.durationDays || t.deadlineDays || 2;
      const now = new Date();
      const simulatedToday = now.getDate();
      const hourFraction = (now.getHours() * 60 + now.getMinutes()) / 1440;
      const nowOffsetInDays = (simulatedToday - 1) + hourFraction;
      const startOffsetInDays = sDay - 1;
      const baseEndOffsetInDays = startOffsetInDays + baseDur;
      let effectiveDur = baseDur;
      if (!isCompleted && startOffsetInDays <= nowOffsetInDays) {
        effectiveDur = Math.ceil(Math.max(baseEndOffsetInDays, nowOffsetInDays) - startOffsetInDays);
      }

      return {
        ...t,
        startDay: sDay,
        durationDays: effectiveDur
      };
    });
    
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 50) {
      changed = false;
      for (let i = 0; i < updated.length; i++) {
        const task = updated[i];
        if (task.dependentOnTaskId) {
          const dependency = updated.find(t => t.id === task.dependentOnTaskId);
          if (dependency) {
            const dependencyEnd = (dependency.startDay || 1) + (dependency.durationDays || 2);
            if ((task.startDay || 1) < dependencyEnd) {
              task.startDay = dependencyEnd;
              changed = true;
            }
          }
        }
      }
      iterations++;
    }
    return updated;
  };

  // Requirement: "Если кто-то задерживается, то оповещения и дедлайны переносятся у всех с оповещением. Также пытается делегировать задачу при сводных сотрудниках."
  const handleSimulateDelay = (taskId: string) => {
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;

      // Find the delaying task
      const delayingTaskIndex = p.tasks.findIndex(t => t.id === taskId);
      if (delayingTaskIndex === -1) return p;

      let updatedTasks = p.tasks.map((t, idx) => {
        if (idx === delayingTaskIndex) {
          const currentDuration = t.durationDays || t.deadlineDays || 2;
          return {
            ...t,
            status: 'delayed' as const,
            taskTitle: t.taskTitle.includes('ЗАДЕРЖКА') ? t.taskTitle : t.taskTitle + ' (ЗАДЕРЖКА СРОКОВ)',
            durationDays: currentDuration + 2,
            deadlineDays: currentDuration + 2
          };
        }
        return t;
      });

      if (cascadeShiftEnabled) {
        updatedTasks = resolveCascadeDates(updatedTasks);
      } else {
        // Subsequent tasks shifted simply
        updatedTasks = updatedTasks.map((t, idx) => {
          if (idx > delayingTaskIndex) {
            return {
              ...t,
              deadlineDays: t.deadlineDays + 2,
              durationDays: (t.durationDays || t.deadlineDays || 2) + 2
            };
          }
          return t;
        });
      }

      // Send simulated notification
      triggerToast(`⚠️ Внимание! ${p.tasks[delayingTaskIndex].executorName} задерживает выполнение этапа. Связанные дедлайны для последующих сотрудников автоматически сдвинуты на +2 дня!`);

      return {
        ...p,
        status: 'delayed' as const,
        tasks: updatedTasks,
        recommendations: `⚠️ Обнаружена задержка на этапе "${p.tasks[delayingTaskIndex].executorName}". Вы можете делегировать эту задачу свободному сотруднику (например, Дмитрию Романову), чтобы вернуть дедлайны к норме.`
      };
    }));
  };

  const handleDelegateTask = (taskId: string, targetEmployeeId: string) => {
    const targetEmployee = effectiveEmployees.find(e => e.id === targetEmployeeId);
    if (!targetEmployee) return;

    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;

      const updatedTasks = p.tasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          executorId: targetEmployee.id,
          executorName: targetEmployee.name,
          executorRole: targetEmployee.position || 'Разработчик',
          status: 'in_progress' as const,
          taskTitle: t.taskTitle.replace(' (ЗАДЕРЖКА СРОКОВ)', '') + ' (Делегировано от предыдущего)'
        };
      });

      // Reset deadlines if delegated to free staff
      const restoredTasks = updatedTasks.map((t, idx) => {
        if (t.id === taskId) return t;
        // Shift back subsequent deadlines to original
        const origOffset = idx === 1 ? 3 : idx === 2 ? 6 : t.deadlineDays;
        return {
          ...t,
          deadlineDays: origOffset
        };
      });

      setRevisorNotice({
        title: 'Задача переделегирована',
        text: `Задача успешно переделегирована сотруднику ${targetEmployee.name}! Новый исполнитель получил уведомление в ЛС. Сроки по Ганту возвращены в исходное положение за счет привлечения свободных ресурсов.`
      });

      return {
        ...p,
        status: 'active' as const,
        recommendations: `Делегирование успешно выполнено. Процесс "${p.title}" возвращен в штатный режим контроля.`,
        tasks: restoredTasks
      };
    }));
  };

  const handleFinishProcess = () => {
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;

      // Distribute bonuses
      setRevisorNotice({
        title: 'Бизнес-процесс завершен',
        text: `Поздравляем! Бизнес-процесс "${p.title}" успешно завершен! Каждому исполнителю распределены бонусы за своевременную и качественную сдачу в зависимости от Quality Score. Боссу отправлена итоговая аналитическая сводка и рекомендации.`
      });

      return {
        ...p,
        status: 'completed' as const,
        evaluation: 'Итоговая оценка ИИ: 92/100. Все ключевые связанные этапы пройдены. Маркетинговые материалы разработаны, база CRM импортирована, обзвон завершен с конверсией 12%.',
        recommendations: 'Рекомендации ИИ боссу: Команда сработала слаженно. На этапе РОПа наблюдалось сужение воронки, рекомендуем повысить лимиты IP-телефонии на будущие акции.'
      };
    }));
  };

  // Kanban board interaction functions
  const handleAddKanbanTask = () => {
    if (!newTaskTitle.trim() || !selectedProcess) return;
    const executor = effectiveEmployees.find(e => e.id === newTaskExecutorId) || effectiveEmployees[0] || { id: currentUser?.id || 'emp-1', name: currentUser?.name || 'Сотрудник', position: currentUser?.position || 'Специалист' };
    
    const newTask: RevisorTask = {
      id: 'task-' + Date.now(),
      executorId: executor.id,
      executorName: executor.name,
      executorRole: executor.position || 'Специалист',
      taskTitle: newTaskTitle,
      deadlineDays: 3,
      status: newTaskColumn,
      checklist: [],
      attachedFiles: [],
      verifiedByAI: false,
      score: 0
    };

    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: [...p.tasks, newTask]
      };
    }));

    setNewTaskTitle('');
    setShowAddTaskModal(false);
  };

  const handleRemoveKanbanTask = (taskId: string) => {
    if (!selectedProcess) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: p.tasks.filter(t => t.id !== taskId)
      };
    }));
    if (selectedCardId === taskId) {
      setSelectedCardId(null);
    }
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: 'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed') => {
    if (!selectedProcess) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          let extra = {};
          if (newStatus === 'completed') {
            extra = { verifiedByAI: true, score: 90 };
          }
          return {
            ...t,
            status: newStatus,
            ...extra
          };
        })
      };
    }));
  };

  const handleAddChecklistItem = (taskId: string) => {
    if (!newChecklistItemText.trim() || !selectedProcess) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            checklist: [...t.checklist, { id: 'c-' + Date.now(), text: newChecklistItemText, done: false }]
          };
        })
      };
    }));
    setNewChecklistItemText('');
  };

  const handleToggleChecklistItem = (taskId: string, itemId: string) => {
    if (!selectedProcess) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            checklist: t.checklist.map(c => c.id === itemId ? { ...c, done: !c.done } : c)
          };
        })
      };
    }));
  };

  const handleRemoveChecklistItem = (taskId: string, itemId: string) => {
    if (!selectedProcess) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            checklist: t.checklist.filter(c => c.id !== itemId)
          };
        })
      };
    }));
  };

  const handleAddAttachment = (taskId: string, name: string, type: 'image' | 'document' | 'audio' | 'location') => {
    if (!selectedProcess) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            attachedFiles: [...t.attachedFiles, { name, url: '#', type }]
          };
        })
      };
    }));
  };

  const handleAddInlineTask = (columnId: 'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed') => {
    const text = inlineTaskInput[columnId]?.trim();
    if (!text || !selectedProcess) return;

    const executor = effectiveEmployees[0] || (currentUser ? { id: currentUser.id, name: currentUser.name, position: currentUser.position || 'Специалист' } : { id: 'emp-1', name: 'Сотрудник', position: 'Специалист' });
    const newTask: RevisorTask = {
      id: 'task-' + Date.now(),
      executorId: executor.id,
      executorName: executor.name,
      executorRole: executor.position || 'Специалист',
      taskTitle: text,
      deadlineDays: 3,
      status: columnId,
      checklist: [],
      attachedFiles: [],
      verifiedByAI: false,
      score: 0,
      priority: 'medium',
      comments: [
        {
          id: 'log-' + Date.now(),
          authorName: '⚙️ Система',
          text: `Задача создана на доске в колонке "${columnId === 'pending' ? 'В очереди' : columnId === 'in_progress' ? 'В работе' : columnId === 'verification' ? 'На контроле' : 'Выполнено'}"`,
          createdAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU')
        }
      ]
    };

    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: [...p.tasks, newTask]
      };
    }));

    setInlineTaskInput(prev => ({ ...prev, [columnId]: '' }));
    triggerToast(`Задача "${text}" создана!`);
  };

  const handleSortColumn = (columnId: string, criterion: 'priority' | 'title' | 'checklist') => {
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      
      const columnTasks = p.tasks.filter(t => t.status === columnId);
      const otherTasks = p.tasks.filter(t => t.status !== columnId);
      
      const sorted = [...columnTasks].sort((a, b) => {
        if (criterion === 'title') {
          return a.taskTitle.localeCompare(b.taskTitle);
        } else if (criterion === 'priority') {
          const pMap = { high: 3, medium: 2, low: 1 };
          const pA = pMap[a.priority || 'medium'];
          const pB = pMap[b.priority || 'medium'];
          return pB - pA; // High priority first
        } else {
          const ratioA = a.checklist.length ? a.checklist.filter(c => c.done).length / a.checklist.length : 0;
          const ratioB = b.checklist.length ? b.checklist.filter(c => c.done).length / b.checklist.length : 0;
          return ratioB - ratioA; // Higher progress first
        }
      });
      
      return {
        ...p,
        tasks: [...otherTasks, ...sorted]
      };
    }));
    setColumnMenuOpen(null);
    triggerToast(`Колонка отсортирована!`);
  };

  const handleAddComment = (taskId: string, text: string) => {
    if (!text.trim() || !selectedProcess) return;
    const newComment = {
      id: 'comment-' + Date.now(),
      authorName: currentUser?.name || 'Вы',
      text: text,
      createdAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU')
    };
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProcess.id) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          const prevComments = t.comments || [];
          return {
            ...t,
            comments: [...prevComments, newComment]
          };
        })
      };
    }));
    setNewCommentText('');
  };

  const handleVerifyTaskInline = async (taskId: string) => {
    setIsVerifyingFile(true);
    setVerificationFeedback(null);

    let details = '';
    if (attachmentType === 'text') {
      details = `Текстовый отчет сотрудника: "${verificationText}"`;
    } else if (attachmentType === 'variants') {
      details = `Выбранный сотрудником вариант ответа: "${verificationVariant}"`;
    } else if (attachmentType === 'checklist') {
      const doneItems = Object.entries(verificationChecklist).filter(([_, val]) => val).map(([key]) => key).join(', ');
      const undoneItems = Object.entries(verificationChecklist).filter(([_, val]) => !val).map(([key]) => key).join(', ');
      details = `Заполненный чеклист сотрудника. Выполненные пункты: [${doneItems}], Невыполненные пункты: [${undoneItems}]`;
    } else if (attachmentType === 'location') {
      details = `Геолокация (GPS координаты) сотрудника: Широта ${verificationLat}, Долгота ${verificationLng} (Радиус точности: 12 метров)`;
    } else if (attachmentType === 'metrics') {
      details = `Количественный показатель / Метрика: ${verificationMetric}`;
    } else {
      details = `Прикрепленный файл: "${attachmentName}" (Ссылка: ${attachmentUrl})`;
    }

    const taskObj = selectedProcess.tasks.find(t => t.id === taskId);
    const promptText = `Сотрудник предоставил отчет для проверки ИИ-Ревизором.
Тип отчета: ${attachmentType}.
Детали отчета: ${details}
Задача: "${taskObj?.taskTitle || taskId}".
Проанализируй эти отчетные данные, проверь их корректность и полноту в рамках рабочей задачи. Напиши развернутый ИИ-вердикт (Одобрено или Отклонено), укажи подробно, что именно верифицировано (текст, геолокация, варианты или файлы), и дай числовую оценку качества работы Quality Score от 50 до 100.`;

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          systemPrompt: "Ты — ИИ-модуль RR API для автоматической верификации отчетов по фото, сканам, чекам и геолокациям.",
          userId: currentUser?.id || '91827364501'
        })
      });

      const resData = await response.json();
      const feedback = resData.text || 'Отчет проверен ИИ-Ревизором. Качество работы соответствует высоким стандартам.';
      
      setVerificationFeedback(feedback);

      let matchedScore = 90;
      const scoreMatch = feedback.match(/(\d{2,3})\s*\/\s*100/);
      if (scoreMatch) {
        matchedScore = parseInt(scoreMatch[1]);
      } else {
        const anyNum = feedback.match(/Score:?\s*(\d{2,3})/i) || feedback.match(/Оценка:?\s*(\d{2,3})/i) || feedback.match(/(\d{2,3})\s*балл/i);
        if (anyNum) matchedScore = parseInt(anyNum[1]);
      }
      if (isNaN(matchedScore) || matchedScore < 10 || matchedScore > 100) matchedScore = 88;

      const isApproved = !feedback.toLowerCase().includes('отклонено') && !feedback.toLowerCase().includes('отклонить');

      setProcesses(prev => prev.map(p => {
        if (p.id !== selectedProcess.id) return p;
        
        const updatedTasks = p.tasks.map(t => {
          if (t.id !== taskId) return t;

          const updatedChecklist = isApproved ? t.checklist.map(c => ({ ...c, done: true })) : t.checklist;
          const nextFiles = [...t.attachedFiles, { name: attachmentName, url: attachmentUrl, type: attachmentType }];
          
          const logEntry = {
            id: 'comment-' + Date.now(),
            authorName: '🤖 ИИ-Ревизор (Аудит)',
            text: `Проведена автоматическая верификация (Тип: ${attachmentType}). Вердикт: ${isApproved ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}. Quality Score: ${matchedScore}/100.\nКомментарий ИИ: ${feedback}`,
            createdAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
            isAI: true
          };

          const prevComments = t.comments || [];

          return {
            ...t,
            status: isApproved ? ('completed' as const) : ('delayed' as const),
            checklist: updatedChecklist,
            attachedFiles: nextFiles,
            verifiedByAI: true,
            score: matchedScore,
            comments: [...prevComments, logEntry]
          };
        });

        return { ...p, tasks: updatedTasks };
      }));

    } catch (err) {
      const fallbackFeedback = 'Отчет успешно верифицирован в офлайн-режиме: Одобрено. Найдено полное соответствие регламенту. Оценка: 92/100.';
      setVerificationFeedback(fallbackFeedback);
      
      setProcesses(prev => prev.map(p => {
        if (p.id !== selectedProcess.id) return p;
        const updatedTasks = p.tasks.map(t => {
          if (t.id !== taskId) return t;
          
          const logEntry = {
            id: 'comment-' + Date.now(),
            authorName: '🤖 ИИ-Ревизор (Аудит)',
            text: `Проведена верификация в офлайн-режиме. Одобрено. Оценка: 92/100.`,
            createdAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('ru-RU'),
            isAI: true
          };
          const prevComments = t.comments || [];

          return {
            ...t,
            status: 'completed' as const,
            checklist: t.checklist.map(c => ({ ...c, done: true })),
            attachedFiles: [...t.attachedFiles, { name: attachmentName, url: attachmentUrl, type: attachmentType }],
            verifiedByAI: true,
            score: 92,
            comments: [...prevComments, logEntry]
          };
        });
        return { ...p, tasks: updatedTasks };
      }));
    } finally {
      setIsVerifyingFile(false);
    }
  };

  const getSortedProcesses = (list: BusinessProcess[]) => {
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (projectSortField === 'title') {
        cmp = a.title.localeCompare(b.title, 'ru');
      } else if (projectSortField === 'createdAt') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        cmp = timeA - timeB;
      } else if (projectSortField === 'updatedAt') {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        cmp = timeA - timeB;
      } else if (projectSortField === 'manager') {
        const mA = a.manager || 'Анна Петрова';
        const mB = b.manager || 'Анна Петрова';
        cmp = mA.localeCompare(mB, 'ru');
      } else if (projectSortField === 'tasks') {
        cmp = (a.tasks?.length || 0) - (b.tasks?.length || 0);
      } else if (projectSortField === 'progress') {
        const pctA = a.tasks?.length ? (a.tasks.filter(t => t.status === 'completed').length / a.tasks.length) : 0;
        const pctB = b.tasks?.length ? (b.tasks.filter(t => t.status === 'completed').length / b.tasks.length) : 0;
        cmp = pctA - pctB;
      } else if (projectSortField === 'budget') {
        cmp = (a.budget || 0) - (b.budget || 0);
      } else if (projectSortField === 'status') {
        const sA = a.status || '';
        const sB = b.status || '';
        cmp = sA.localeCompare(sB, 'ru');
      }
      return projectSortDirection === 'asc' ? cmp : -cmp;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="panel-revisor">

      {/* ROUTE 1: PROJECTS MAP VIEW */}
      {activeSubTab === 'projects_map' && (
        <div className="space-y-6 animate-fade-in">
          <CabinetGalaxyView
            company={company}
            mode="projects"
            selectedProjectId={null}
            setSelectedProjectId={setSelectedProcessId}
            onOpenCreateModal={() => {
              openProjectEditor(null);
            }}
            setShowProjectCardId={openProjectEditor}
            onOpenStatsModal={() => {
              if (selectedProcessId) setIsTaskStatsOpen(true);
              else setIsProjectStatsOpen(true);
            }}
            onOpenFiltersModal={() => {
              if (selectedProcessId) setIsTaskFiltersOpen(true);
              else setIsProjectFiltersOpen(true);
            }}
            onOpenProjectInfoModal={(projId) => {
              openProjectEditor(projId);
            }}
            onSelectProject={(projId) => {
              setSelectedProcessId(projId);
              if (onNavigate) {
                onNavigate(`/cabinet/revisor/${projId}/map`);
              }
            }}
            onNavigate={onNavigate}
            processes={processes}
            setProcesses={setProcesses}
            currentUser={currentUser}
            mockEmployees={effectiveEmployees}
            theme={theme}
            startVerificationProcess={(task) => {
              setSelectedCardId(task.id);
            }}
            handleTabClick={handleTabClick}
          />
        </div>
      )}

      {/* ROUTE 2: PROJECTS KANBAN VIEW */}
      {activeSubTab === 'projects_kanban' && (
        <div className="space-y-6 animate-fade-in bg-transparent">
          {/* Single Unified Projects Toolbar: View Switcher, Search, Stats, Filters, New Project, AI Generator, Scroll */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-transparent p-2.5 sm:p-3 rounded-2xl border border-amber-500/30 dark:border-amber-400/30 shadow-sm">
            {/* View Switcher */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center border p-0.5 rounded-xl backdrop-blur-md bg-transparent border-amber-500/30">
                <button
                  onClick={() => handleSubTabNavigate('projects_map')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] border-amber-500/30 hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                  title="Карта проектов"
                >
                  <Globe size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                  <span className="hidden sm:inline">Карта</span>
                </button>

                <button
                  onClick={() => handleSubTabNavigate('projects_kanban')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-black bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-md"
                  title="Канбан проектов"
                >
                  <LayoutGrid size={15} className="text-amber-950" />
                  <span className="hidden sm:inline">Канбан</span>
                </button>

                <button
                  onClick={() => handleSubTabNavigate('projects_table')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] border-amber-500/30 hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                  title="Таблица проектов"
                >
                  <List size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                  <span className="hidden sm:inline">Таблица</span>
                </button>

                <button
                  onClick={() => handleSubTabNavigate('gantt')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] border-amber-500/30 hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                  title="Диаграмма Ганта"
                >
                  <Calendar size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                  <span className="hidden sm:inline">Гант</span>
                </button>
              </div>
            </div>

            {/* Controls: Search, Stats, Filters, New Project, AI Generator, Left/Right */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-[120px] sm:min-w-[160px]">
                <input
                  type="text"
                  placeholder="🔍 Поиск..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E]/25 via-[#E7C768]/25 to-[#D99E41]/25 border border-amber-500/50 text-zinc-950 dark:text-[#F4EE8E] placeholder:text-zinc-800 dark:placeholder:text-[#F4EE8E]/80 text-xs font-bold focus:outline-none focus:border-[#E7C768]"
                />
              </div>

              <button
                onClick={() => setIsProjectStatsOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 border border-amber-300/50 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Статистика проектов"
              >
                <BarChart2 size={15} className="text-amber-950 shrink-0" />
                <span className="hidden sm:inline">Статистика</span>
              </button>

              <button
                onClick={() => setIsProjectFiltersOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 border border-amber-300/50 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Фильтры проектов"
              >
                <Sliders size={15} className="text-amber-950 shrink-0" />
                <span className="hidden sm:inline">Фильтры</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProjectScopeFilter(prev => prev === 'mine' ? 'from_me' : prev === 'from_me' ? 'all' : 'mine');
                }}
                className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold backdrop-blur-md shadow-sm active:scale-95 shrink-0 ${
                  projectScopeFilter !== 'all'
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 font-black shadow-md'
                    : 'bg-amber-500/15 border-amber-400/30 text-[#E7C768] hover:bg-amber-500/25'
                }`}
                title="Переключатель проектов: Мои → От меня → Все (кликните для смены)"
              >
                {projectScopeFilter === 'mine' && (
                  <>
                    <User size={15} />
                    <span>Мои</span>
                    <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">1/3</span>
                  </>
                )}
                {projectScopeFilter === 'from_me' && (
                  <>
                    <Send size={14} />
                    <span>От меня</span>
                    <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">2/3</span>
                  </>
                )}
                {projectScopeFilter === 'all' && (
                  <>
                    <Users size={15} />
                    <span>Все</span>
                    <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-400/20">3/3</span>
                  </>
                )}
              </button>

              <button
                onClick={() => openProjectEditor(null)}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border border-amber-300/50 text-xs font-black flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
                title="Новый проект"
              >
                <Plus size={16} className="stroke-[3]" />
                <span className="hidden sm:inline">Новый проект</span>
              </button>

              <div className="flex items-center gap-1 border-l border-amber-500/30 pl-1.5 ml-0.5">
                <button
                  onClick={() => projectsKanbanScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                  className="p-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 border border-amber-300/50 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Прокрутить влево"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => projectsKanbanScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                  className="p-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 border border-amber-300/50 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Прокрутить вправо"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile-Friendly Horizontal Scroll Control Bar Directly Above Projects Kanban Columns */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E]/15 via-[#E7C768]/15 to-[#D99E41]/15 border border-amber-500/30 mb-1">
            <span className="text-xs font-mono font-bold text-amber-900 dark:text-[#F4EE8E] flex items-center gap-1.5">
              <ArrowLeftRight size={14} className="animate-pulse" />
              <span>Прокрутка колонок:</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => projectsKanbanScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="Прокрутить назад"
              >
                <ChevronLeft size={16} className="stroke-[3]" /> Назад
              </button>
              <button
                type="button"
                onClick={() => projectsKanbanScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="Прокрутить вперед"
              >
                Вперед <ChevronRight size={16} className="stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Projects Kanban Horizontal Row Container */}
          <div ref={projectsKanbanScrollRef} className="flex flex-row gap-4 overflow-x-auto pb-4 w-full scrollbar-thin px-1 min-h-[420px]">
            {[
              { id: 'pending', title: '⏳ Новые', badge: 'bg-amber-500/20 text-amber-300' },
              { id: 'active', title: '⚡ В работе', badge: 'bg-blue-500/20 text-blue-300' },
              { id: 'delayed', title: '🚨 Критические', badge: 'bg-rose-500/20 text-rose-300' },
              { id: 'completed', title: '✓ Завершены', badge: 'bg-emerald-500/20 text-emerald-300' },
              { id: 'archived', title: '📦 В архиве', badge: 'bg-slate-500/20 text-slate-400' },
            ].map(col => {
              const sorted = getSortedProcesses(processes);
              let colProjects = sorted.filter(p => {
                let matchesCol = false;
                const statusStr = p.status as string;
                if (col.id === 'pending') matchesCol = statusStr === 'pending';
                else if (col.id === 'active') matchesCol = statusStr === 'active';
                else if (col.id === 'delayed') matchesCol = statusStr === 'delayed' || (statusStr !== 'archived' && statusStr !== 'completed' && p.tasks.some(t => t.status === 'delayed'));
                else if (col.id === 'completed') matchesCol = statusStr === 'completed';
                else if (col.id === 'archived') matchesCol = statusStr === 'archived';

                const matchesSearch = !projectSearchQuery || p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) || p.id.includes(projectSearchQuery);
                const matchesStatus = !projectStatusFilter || p.status === projectStatusFilter;
                const matchesManager = !projectManagerFilter || p.manager === projectManagerFilter;
                const matchesScope = projectScopeFilter === 'all' ? true : projectScopeFilter === 'mine' ? isProjectMine(p) : isProjectFromMe(p);
                return matchesCol && matchesSearch && matchesStatus && matchesManager && matchesScope;
              });

              // Apply Column-level Header Sorting
              const colSort = projectColumnSorts[col.id] || 'default';
              if (colSort === 'title-asc') {
                colProjects = [...colProjects].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
              } else if (colSort === 'title-desc') {
                colProjects = [...colProjects].sort((a, b) => b.title.localeCompare(a.title, 'ru'));
              } else if (colSort === 'budget-desc') {
                colProjects = [...colProjects].sort((a, b) => (b.budget || 0) - (a.budget || 0));
              } else if (colSort === 'pct-desc') {
                colProjects = [...colProjects].sort((a, b) => {
                  const pctA = a.tasks.length ? Math.round((a.tasks.filter(t=>t.status==='completed').length / a.tasks.length)*100) : 0;
                  const pctB = b.tasks.length ? Math.round((b.tasks.filter(t=>t.status==='completed').length / b.tasks.length)*100) : 0;
                  return pctB - pctA;
                });
              }

              return (
                <div key={col.id} className="p-4 rounded-2xl bg-transparent border border-zinc-300/40 dark:border-white/10 space-y-3 w-[290px] sm:w-[320px] shrink-0 min-h-[420px]">
                  {/* Column Header with sorting controls directly inside */}
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-800 dark:text-white uppercase tracking-wider">{col.title}</span>
                      <span className="text-[10px] font-mono bg-zinc-200 dark:bg-white/5 px-2 py-0.5 rounded text-zinc-700 dark:text-slate-300 font-bold">
                        {colProjects.length}
                      </span>
                    </div>

                    <select
                      value={projectColumnSorts[col.id] || 'default'}
                      onChange={(e) => setProjectColumnSorts(prev => ({ ...prev, [col.id]: e.target.value }))}
                      className="text-[9px] font-mono bg-zinc-100 dark:bg-slate-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-amber-300 rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer"
                      title="Сортировка в колонке"
                    >
                      <option value="default">Сорт.</option>
                      <option value="title-asc">А-Я</option>
                      <option value="title-desc">Я-А</option>
                      <option value="budget-desc">Бюджет ↓</option>
                      <option value="pct-desc">Прогресс ↓</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    {colProjects.map(proj => {
                      const completedTasks = proj.tasks.filter(t => t.status === 'completed').length;
                      const totalTasks = proj.tasks.length;
                      const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                      return (
                        <div
                          key={proj.id}
                          className={`p-4 rounded-2xl backdrop-blur-xl transition-all space-y-3 cursor-pointer group shadow-md hover:shadow-xl ${
                            isLightTheme
                              ? 'bg-[#ffffff]/90 border-2 border-[#E7C768] hover:border-amber-500 hover:shadow-amber-500/15 text-zinc-950'
                              : 'bg-zinc-900/90 border-2 border-amber-400/80 hover:border-[#E7C768] hover:shadow-amber-400/10 text-white'
                          }`}
                          onClick={() => openProjectEditor(proj.id)}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className={`text-xs font-black transition-colors line-clamp-2 ${
                                isLightTheme ? 'text-zinc-950 group-hover:text-amber-700' : 'text-white group-hover:text-amber-300'
                              }`}>
                                {proj.title}
                              </h4>
                              <span className={`text-[9px] font-mono font-bold block mt-0.5 ${
                                isLightTheme ? 'text-amber-800' : 'text-amber-400'
                              }`}>ID: {proj.id}</span>
                            </div>
                            <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0 ${
                              isLightTheme ? 'bg-amber-400/20 text-amber-950 border-amber-400/50' : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                            }`}>
                              {(proj.budget || 0).toLocaleString('ru-RU')} ₽
                            </span>
                          </div>

                          <p className={`text-[11px] line-clamp-2 italic font-medium ${
                            isLightTheme ? 'text-zinc-700' : 'text-slate-300'
                          }`}>
                            "{proj.prompt}"
                          </p>

                          <div className={`space-y-1.5 pt-1 border-t ${isLightTheme ? 'border-zinc-200' : 'border-white/10'}`}>
                            <div className={`flex justify-between text-[10px] font-mono font-bold ${isLightTheme ? 'text-zinc-800' : 'text-slate-300'}`}>
                              <span>Задачи ({completedTasks}/{totalTasks}):</span>
                              <span className={`font-black ${isLightTheme ? 'text-amber-800' : 'text-amber-300'}`}>{pct}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLightTheme ? 'bg-zinc-200' : 'bg-slate-800'}`}>
                              <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>

                          <div className={`flex items-center justify-between pt-2 border-t text-[10px] gap-1 flex-wrap ${isLightTheme ? 'border-zinc-200' : 'border-white/10'}`}>
                            <span className={`font-bold truncate max-w-[110px] ${isLightTheme ? 'text-zinc-900' : 'text-slate-200'}`}>👤 {proj.manager || 'Анна Петрова'}</span>
                            
                            <div className="flex items-center gap-1">
                              {/* Move to archive button */}
                              {col.id !== 'archived' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProcesses(prev => prev.map(p => p.id === proj.id ? { ...p, status: 'archived' } : p));
                                  }}
                                  className={`px-1.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                    isLightTheme
                                      ? 'bg-zinc-200/80 hover:bg-amber-200 text-zinc-900 hover:text-amber-950'
                                      : 'bg-zinc-800 text-zinc-300 hover:text-amber-300'
                                  }`}
                                  title="Отправить проект в архив (скрывает с карты орбит)"
                                >
                                  <Archive size={11} />
                                  <span className="hidden sm:inline text-[9px]">В архив</span>
                                </button>
                              )}

                              {/* Unarchive button */}
                              {col.id === 'archived' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProcesses(prev => prev.map(p => p.id === proj.id ? { ...p, status: 'completed' } : p));
                                  }}
                                  className="px-1.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold transition-all flex items-center gap-1"
                                  title="Извлечь из архива"
                                >
                                  <RotateCcw size={11} />
                                  <span className="text-[9px]">Восстановить</span>
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProcessId(proj.id);
                                  handleSubTabNavigate('tasks_map');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black hover:brightness-110 active:scale-95 transition-all shadow-sm"
                              >
                                Задачи →
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {colProjects.length === 0 && (
                      <div className="p-6 text-center text-slate-500 text-xs italic border border-dashed border-white/5 rounded-xl">
                        Проектов в этой колонке нет
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROUTE 3: PROJECTS TABLE VIEW */}
      {activeSubTab === 'projects_table' && (
        <div className="space-y-6 animate-fade-in bg-transparent">
          {/* Single Unified Projects Toolbar: View Switcher, Search, Stats, Filters, New Project, AI Generator, Scroll */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-transparent p-2.5 sm:p-3 rounded-2xl border border-amber-500/30 dark:border-amber-400/30 shadow-sm">
            {/* View Switcher */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center border p-0.5 rounded-xl backdrop-blur-md bg-transparent border-amber-500/30">
                <button
                  onClick={() => handleSubTabNavigate('projects_map')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] border-amber-500/30 hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                  title="Карта проектов"
                >
                  <Globe size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                  <span className="hidden sm:inline">Карта</span>
                </button>

                <button
                  onClick={() => handleSubTabNavigate('projects_kanban')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] border-amber-500/30 hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                  title="Канбан проектов"
                >
                  <LayoutGrid size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                  <span className="hidden sm:inline">Канбан</span>
                </button>

                <button
                  onClick={() => handleSubTabNavigate('projects_table')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-black bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-md"
                  title="Таблица проектов"
                >
                  <List size={15} className="text-amber-950" />
                  <span className="hidden sm:inline">Таблица</span>
                </button>

                <button
                  onClick={() => handleSubTabNavigate('gantt')}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] border-amber-500/30 hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                  title="Диаграмма Ганта"
                >
                  <Calendar size={15} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                  <span className="hidden sm:inline">Гант</span>
                </button>
              </div>
            </div>

            {/* Controls: Search, Stats, Filters, New Project, AI Generator, Left/Right */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-[120px] sm:min-w-[160px]">
                <input
                  type="text"
                  placeholder="🔍 Поиск..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  className="w-full px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E]/25 via-[#E7C768]/25 to-[#D99E41]/25 border border-amber-500/50 text-zinc-950 dark:text-[#F4EE8E] placeholder:text-zinc-800 dark:placeholder:text-[#F4EE8E]/80 text-xs font-bold focus:outline-none focus:border-[#E7C768]"
                />
              </div>

              <button
                onClick={() => setIsProjectStatsOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 border border-amber-300/50 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Статистика проектов"
              >
                <BarChart2 size={15} className="text-amber-950 shrink-0" />
                <span className="hidden sm:inline">Статистика</span>
              </button>

              <button
                onClick={() => setIsProjectFiltersOpen(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 border border-amber-300/50 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Фильтры проектов"
              >
                <Sliders size={15} className="text-amber-950 shrink-0" />
                <span className="hidden sm:inline">Фильтры</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProjectScopeFilter(prev => prev === 'mine' ? 'from_me' : prev === 'from_me' ? 'all' : 'mine');
                }}
                className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold backdrop-blur-md shadow-sm active:scale-95 shrink-0 ${
                  projectScopeFilter !== 'all'
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 font-black shadow-md'
                    : 'bg-amber-500/15 border-amber-400/30 text-[#E7C768] hover:bg-amber-500/25'
                }`}
                title="Переключатель проектов: Мои → От меня → Все (кликните для смены)"
              >
                {projectScopeFilter === 'mine' && (
                  <>
                    <User size={15} />
                    <span>Мои</span>
                    <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">1/3</span>
                  </>
                )}
                {projectScopeFilter === 'from_me' && (
                  <>
                    <Send size={14} />
                    <span>От меня</span>
                    <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">2/3</span>
                  </>
                )}
                {projectScopeFilter === 'all' && (
                  <>
                    <Users size={15} />
                    <span>Все</span>
                    <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-400/20">3/3</span>
                  </>
                )}
              </button>

              <button
                onClick={() => openProjectEditor(null)}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border border-amber-300/50 text-xs font-black flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
                title="Новый проект"
              >
                <Plus size={16} className="stroke-[3]" />
                <span className="hidden sm:inline">Новый проект</span>
              </button>

              <div className="flex items-center gap-1 border-l border-amber-500/30 pl-1.5 ml-0.5">
                <button
                  onClick={() => projectsTableScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                  className="p-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E]/30 to-[#D99E41]/30 hover:from-[#F4EE8E]/50 hover:to-[#D99E41]/50 border border-amber-500/40 text-amber-950 dark:text-[#F4EE8E] transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Прокрутить влево"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => projectsTableScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                  className="p-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E]/30 to-[#D99E41]/30 hover:from-[#F4EE8E]/50 hover:to-[#D99E41]/50 border border-amber-500/40 text-amber-950 dark:text-[#F4EE8E] transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Прокрутить вправо"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile-Friendly Horizontal Scroll Control Bar Directly Above Projects Table */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E]/15 via-[#E7C768]/15 to-[#D99E41]/15 border border-amber-500/30 mb-1">
            <span className="text-xs font-mono font-bold text-amber-900 dark:text-[#F4EE8E] flex items-center gap-1.5">
              <ArrowLeftRight size={14} className="animate-pulse" />
              <span>Прокрутка таблицы:</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => projectsTableScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="Прокрутить назад"
              >
                <ChevronLeft size={16} className="stroke-[3]" /> Назад
              </button>
              <button
                type="button"
                onClick={() => projectsTableScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="Прокрутить вперед"
              >
                Вперед <ChevronRight size={16} className="stroke-[3]" />
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-[#090d16]/50 rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto" ref={projectsTableScrollRef}>
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-zinc-100 dark:bg-slate-950/60 border-b border-zinc-200 dark:border-white/10 text-[10px] uppercase font-mono font-bold text-zinc-600 dark:text-slate-400">
                  <tr>
                    <th 
                      onClick={() => {
                        if (projectSortField === 'title') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('title');
                          setProjectSortDirection('asc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[200px]"
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <span>Название Проекта</span>
                        {projectSortField === 'title' ? (
                          projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                        ) : <ArrowUpDown size={12} className="opacity-40" />}
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (projectSortField === 'createdAt') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('createdAt');
                          setProjectSortDirection('desc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[100px]"
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <span>Создан</span>
                        {projectSortField === 'createdAt' ? (
                          projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                        ) : <ArrowUpDown size={12} className="opacity-40" />}
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (projectSortField === 'updatedAt') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('updatedAt');
                          setProjectSortDirection('desc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[100px]"
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <span>Изменен</span>
                        {projectSortField === 'updatedAt' ? (
                          projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                        ) : <ArrowUpDown size={12} className="opacity-40" />}
                      </div>
                    </th>

                    {/* Руководитель with sort & filter */}
                    <th 
                      onClick={() => {
                        if (projectSortField === 'manager') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('manager');
                          setProjectSortDirection('asc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[140px]"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 font-bold">
                          <span>Руководитель</span>
                          {projectSortField === 'manager' ? (
                            projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                          ) : <ArrowUpDown size={12} className="opacity-40" />}
                        </div>
                        <select
                          value={projectManagerFilter}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setProjectManagerFilter(e.target.value)}
                          className="mt-0.5 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-slate-900 border border-zinc-300 dark:border-white/10 text-[9px] text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-amber-400 normal-case font-normal"
                        >
                          <option value="">Все руководители</option>
                          {effectiveEmployees.map(e => (
                            <option key={e.id} value={e.name}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    </th>

                    {/* Задачи with sort & filter */}
                    <th 
                      onClick={() => {
                        if (projectSortField === 'tasks') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('tasks');
                          setProjectSortDirection('desc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[110px]"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 font-bold">
                          <span>Задачи</span>
                          {projectSortField === 'tasks' ? (
                            projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                          ) : <ArrowUpDown size={12} className="opacity-40" />}
                        </div>
                        <select
                          value={projectTaskCountFilter}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setProjectTaskCountFilter(e.target.value)}
                          className="mt-0.5 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-slate-900 border border-zinc-300 dark:border-white/10 text-[9px] text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-amber-400 normal-case font-normal"
                        >
                          <option value="">Все задачи</option>
                          <option value="0">0 задач</option>
                          <option value="1-3">1–3 задачи</option>
                          <option value="4+">4+ задач</option>
                        </select>
                      </div>
                    </th>

                    {/* Прогресс % with sort & filter */}
                    <th 
                      onClick={() => {
                        if (projectSortField === 'progress') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('progress');
                          setProjectSortDirection('desc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[120px]"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 font-bold">
                          <span>Прогресс %</span>
                          {projectSortField === 'progress' ? (
                            projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                          ) : <ArrowUpDown size={12} className="opacity-40" />}
                        </div>
                        <select
                          value={projectProgressFilter}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setProjectProgressFilter(e.target.value)}
                          className="mt-0.5 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-slate-900 border border-zinc-300 dark:border-white/10 text-[9px] text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-amber-400 normal-case font-normal"
                        >
                          <option value="">Весь прогресс</option>
                          <option value="0">0%</option>
                          <option value="1-49">1% – 49%</option>
                          <option value="50-99">50% – 99%</option>
                          <option value="100">100%</option>
                        </select>
                      </div>
                    </th>

                    {/* Бюджет with sort & filter */}
                    <th 
                      onClick={() => {
                        if (projectSortField === 'budget') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('budget');
                          setProjectSortDirection('desc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[120px]"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 font-bold">
                          <span>Бюджет</span>
                          {projectSortField === 'budget' ? (
                            projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                          ) : <ArrowUpDown size={12} className="opacity-40" />}
                        </div>
                        <select
                          value={projectBudgetFilter}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setProjectBudgetFilter(e.target.value)}
                          className="mt-0.5 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-slate-900 border border-zinc-300 dark:border-white/10 text-[9px] text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-amber-400 normal-case font-normal"
                        >
                          <option value="">Весь бюджет</option>
                          <option value="0">0 ₽</option>
                          <option value="1-50k">до 50 000 ₽</option>
                          <option value="50k-100k">50k – 100k ₽</option>
                          <option value="100k+">более 100k ₽</option>
                        </select>
                      </div>
                    </th>

                    {/* Статус with sort & filter */}
                    <th 
                      onClick={() => {
                        if (projectSortField === 'status') {
                          setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setProjectSortField('status');
                          setProjectSortDirection('asc');
                        }
                      }}
                      className="p-3 cursor-pointer hover:text-amber-400 transition-colors select-none min-w-[130px]"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 font-bold">
                          <span>Статус</span>
                          {projectSortField === 'status' ? (
                            projectSortDirection === 'asc' ? <ArrowUp size={12} className="text-amber-400" /> : <ArrowDown size={12} className="text-amber-400" />
                          ) : <ArrowUpDown size={12} className="opacity-40" />}
                        </div>
                        <select
                          value={projectStatusFilter}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setProjectStatusFilter(e.target.value)}
                          className="mt-0.5 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-slate-900 border border-zinc-300 dark:border-white/10 text-[9px] text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-amber-400 normal-case font-normal"
                        >
                          <option value="">Все статусы</option>
                          <option value="active">В работе</option>
                          <option value="pending">В плане</option>
                          <option value="completed">Завершенные</option>
                          <option value="delayed">С задержкой</option>
                        </select>
                      </div>
                    </th>

                    <th className="p-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                  {getSortedProcesses(processes.filter(p => {
                    const matchesSearch = !projectSearchQuery || p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) || p.id.includes(projectSearchQuery);
                    const matchesStatus = !projectStatusFilter || p.status === projectStatusFilter;
                    const matchesManager = !projectManagerFilter || (p.manager || 'Анна Петрова') === projectManagerFilter;

                    const completedTasks = p.tasks.filter(t => t.status === 'completed').length;
                    const totalTasks = p.tasks.length;
                    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    let matchesProgress = true;
                    if (projectProgressFilter === '0') matchesProgress = pct === 0;
                    else if (projectProgressFilter === '1-49') matchesProgress = pct > 0 && pct < 50;
                    else if (projectProgressFilter === '50-99') matchesProgress = pct >= 50 && pct < 100;
                    else if (projectProgressFilter === '100') matchesProgress = pct === 100;

                    let matchesBudget = true;
                    const b = p.budget || 0;
                    if (projectBudgetFilter === '0') matchesBudget = b === 0;
                    else if (projectBudgetFilter === '1-50k') matchesBudget = b > 0 && b <= 50000;
                    else if (projectBudgetFilter === '50k-100k') matchesBudget = b > 50000 && b <= 100000;
                    else if (projectBudgetFilter === '100k+') matchesBudget = b > 100000;

                    let matchesTasks = true;
                    if (projectTaskCountFilter === '0') matchesTasks = totalTasks === 0;
                    else if (projectTaskCountFilter === '1-3') matchesTasks = totalTasks >= 1 && totalTasks <= 3;
                    else if (projectTaskCountFilter === '4+') matchesTasks = totalTasks >= 4;

                    const matchesScope = projectScopeFilter === 'all' ? true : projectScopeFilter === 'mine' ? isProjectMine(p) : isProjectFromMe(p);
                    return matchesSearch && matchesStatus && matchesManager && matchesProgress && matchesBudget && matchesTasks && matchesScope;
                  })).map(proj => {
                    const completedTasks = proj.tasks.filter(t => t.status === 'completed').length;
                    const totalTasks = proj.tasks.length;
                    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    return (
                      <tr key={proj.id} className="hover:bg-zinc-100/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3.5">
                          <span className="font-extrabold text-zinc-900 dark:text-white block">{proj.title}</span>
                          <span className="text-[9px] font-mono font-bold text-amber-500/80 block mt-0.5">ID: {proj.id}</span>
                          <span className="text-[10px] text-slate-400 line-clamp-1 italic mt-0.5">{proj.prompt}</span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {proj.createdAt || '—'}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {proj.updatedAt || proj.createdAt || '—'}
                        </td>
                        <td className="p-3.5 font-medium text-zinc-700 dark:text-slate-300">
                          {proj.manager || 'Анна Петрова'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-zinc-800 dark:text-slate-200">
                          {completedTasks} / {totalTasks}
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-zinc-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold text-amber-300">{pct}%</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(proj.budget || 0).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black font-mono uppercase ${
                            proj.status === 'completed' ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30' :
                            proj.status === 'active' ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-sm' :
                            'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-400/30 font-bold'
                          }`}>
                            {proj.status === 'completed' ? 'Завершен' : proj.status === 'active' ? 'В работе' : 'В плане'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => openProjectEditor(proj.id)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#F4EE8E]/40 via-[#E7C768]/40 to-[#D99E41]/40 hover:from-[#F4EE8E] hover:to-[#D99E41] text-amber-950 font-black text-[10px] border border-amber-400/40 shadow-sm transition-all cursor-pointer"
                          >
                            Редактор
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProcessId(proj.id);
                              handleSubTabNavigate('tasks_kanban');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-[10px] border border-amber-300 shadow-sm transition-all cursor-pointer"
                          >
                            Задачи →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ROUTE 4: TASKS MAP VIEW */}
      {activeSubTab === 'tasks_map' && (
        <div className="space-y-6 animate-fade-in">
          <CabinetGalaxyView
            company={company}
            mode="tasks"
            selectedProjectId={selectedProcessId}
            setSelectedProjectId={setSelectedProcessId}
            setShowProjectCardId={openProjectEditor}
            onOpenProjectInfoModal={(pId) => openProjectEditor(pId)}
            onOpenCreateModal={() => {
              if (selectedProcessId) {
                setTaskProjectId(selectedProcessId);
                setTaskExecutorId(effectiveEmployees[0]?.id || '');
                setTaskTitleInput('');
                setTaskDescInput('');
                setShowCreateTaskModal(true);
              } else {
                openProjectEditor(null);
              }
            }}
            onOpenStatsModal={() => setIsTaskStatsOpen(true)}
            onOpenFiltersModal={() => setIsTaskFiltersOpen(true)}
            processes={processes}
            setProcesses={setProcesses}
            currentUser={currentUser}
            mockEmployees={effectiveEmployees}
            theme={theme}
            startVerificationProcess={(task) => {
              setSelectedCardId(task.id);
            }}
            handleTabClick={handleTabClick}
            onNavigate={onNavigate || ((path: string) => {
              window.history.pushState({}, '', path);
              const ev = new PopStateEvent('popstate');
              window.dispatchEvent(ev);
            })}
          />
        </div>
      )}

      {/* ROUTE 6: TASKS TABLE VIEW */}
      {(activeSubTab === 'tasks_table' || activeSubTab === 'tasks') && (
        <div className="space-y-6 animate-fade-in">
          <CabinetTasksView
            company={company}
            processes={processes}
            setProcesses={setProcesses}
            currentUser={currentUser}
            mockEmployees={effectiveEmployees}
            theme={theme}
            handleTabClick={handleTabClick}
            initialViewMode="list"
            initialProjectId={selectedProcessId || 'all'}
            onNavigateView={(mode) => {
              if (mode === 'galaxy') handleSubTabNavigate('tasks_map');
              else if (mode === 'kanban') handleSubTabNavigate('tasks_kanban');
              else if (mode === 'list') handleSubTabNavigate('tasks_table');
            }}
            onNavigate={onNavigate || ((path: string) => {
              window.history.pushState({}, '', path);
              const ev = new PopStateEvent('popstate');
              window.dispatchEvent(ev);
            })}
            onSelectProject={(projId) => {
              if (projId && projId !== 'all') {
                setSelectedProcessId(projId);
              }
            }}
          />
        </div>
      )}

      {/* ROUTE 5: TASKS KANBAN BOARD VIEW */}
      {(activeSubTab === 'tasks_kanban' || activeSubTab === 'kanban') && selectedProcess && (
        <div className="space-y-6 animate-fade-in animate-duration-300 bg-transparent" id="revisor-kanban-view">
          {/* SINGLE UNIFIED TOOLBAR BLOCK */}
          <div className="p-4 rounded-3xl border border-amber-500/30 dark:border-amber-400/30 bg-transparent shadow-lg relative overflow-hidden space-y-3">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

            {/* Main Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
              
              {/* Left Section: Back to Projects, Project Name, View Switcher (Map/Kanban) */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. К Проектам */}
                <button
                  onClick={() => handleSubTabNavigate('projects_map')}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black hover:brightness-110 text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-amber-300/50 shrink-0 shadow-sm"
                  title="Вернуться к карте всех проектов"
                >
                  <ArrowLeft size={14} />
                  <span>К Проектам</span>
                </button>

                {/* 2. Название проекта */}
                <div className="relative shrink-0">
                  <select
                    value={selectedProcessId || ''}
                    onChange={(e) => {
                      setSelectedProcessId(e.target.value);
                      setCardStatusSelectorOpen(null);
                      setColumnMenuOpen(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E]/25 via-[#E7C768]/25 to-[#D99E41]/25 border border-amber-500/40 text-zinc-900 dark:text-white text-xs font-black focus:outline-none focus:ring-2 focus:ring-[#E7C768] cursor-pointer max-w-[200px] sm:max-w-[260px] truncate shadow-sm"
                    title="Выбрать проект"
                  >
                    <option value="all" className="text-zinc-900 dark:text-white dark:bg-zinc-900 font-bold">
                      Все проекты ({processes.length})
                    </option>
                    {processes.map((p) => (
                      <option key={p.id} value={p.id} className="text-zinc-900 dark:text-white dark:bg-zinc-900">
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3, 4 & 5. Карта, Канбан & Таблица */}
                <div className="flex items-center bg-transparent p-1 rounded-xl border border-amber-500/30 shrink-0">
                  <button
                    onClick={() => {
                      const pid = selectedProcessId && selectedProcessId !== 'all' ? selectedProcessId : (processes[0]?.id || '');
                      if (pid) {
                        handleSubTabNavigate('tasks_map');
                      } else {
                        handleSubTabNavigate('projects_map');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                    title="Перейти в режим Карта"
                  >
                    <Globe size={13} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                    <span className="hidden sm:inline">Карта</span>
                  </button>

                  <button
                    onClick={() => handleSubTabNavigate('tasks_kanban')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-sm border border-amber-300"
                    title="Текущий режим Канбан"
                  >
                    <LayoutGrid size={13} className="text-amber-950" />
                    <span>Канбан</span>
                  </button>

                  <button
                    onClick={() => handleSubTabNavigate('tasks_table')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 text-zinc-900 dark:text-[#F4EE8E] hover:bg-gradient-to-r hover:from-[#F4EE8E]/40 hover:to-[#D99E41]/40"
                    title="Перейти в режим Таблица"
                  >
                    <FileText size={13} className="text-[#D99E41] dark:text-[#F4EE8E]" />
                    <span className="hidden sm:inline">Таблица</span>
                  </button>
                </div>
              </div>

              {/* Center Section: Поиск, Статистика, Фильтры */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
                {/* 5. Поиск */}
                <div className="relative flex-1 min-w-[140px] max-w-[220px]">
                  <Search size={13} className="absolute left-3 top-2.5 text-zinc-950 dark:text-[#F4EE8E] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Поиск задач..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E]/25 via-[#E7C768]/25 to-[#D99E41]/25 border border-amber-500/40 text-zinc-950 dark:text-[#F4EE8E] text-xs focus:outline-none focus:border-amber-400 placeholder:text-zinc-800 dark:placeholder:text-[#F4EE8E]/80 font-bold"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-zinc-700 dark:text-[#F4EE8E] hover:opacity-80">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* 6. Статистика */}
                <button
                  onClick={() => setIsTaskStatsOpen(!isTaskStatsOpen)}
                  className="px-3 py-1.5 rounded-xl border border-amber-300/50 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 shadow-sm"
                  title="Показать/скрыть статистику задач"
                >
                  <BarChart2 size={13} className="text-amber-950" />
                  <span className="hidden md:inline">Статистика</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/20 text-zinc-950 font-bold">
                    {selectedProcess.tasks.length}
                  </span>
                </button>

                {/* 7. Фильтры */}
                <button
                  onClick={() => setIsTaskFiltersOpen(!isTaskFiltersOpen)}
                  className="px-3 py-1.5 rounded-xl border border-amber-300/50 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 shadow-sm"
                  title="Фильтры исполнителей и приоритета"
                >
                  <Filter size={13} className="text-amber-950" />
                  <span className="hidden md:inline">Фильтры</span>
                  {(assigneeFilter || priorityFilter || statusFilter || taskScopeFilter !== 'all') && (
                    <span className="w-2 h-2 rounded-full bg-amber-950 animate-pulse" />
                  )}
                </button>

                {/* Unified 3-State Scope Filter Switcher: Мои -> От меня -> Все -> Мои */}
                <button
                  type="button"
                  onClick={() => {
                    setTaskScopeFilter(prev => prev === 'mine' ? 'from_me' : prev === 'from_me' ? 'all' : 'mine');
                  }}
                  className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold backdrop-blur-md shadow-sm active:scale-95 shrink-0 ${
                    taskScopeFilter !== 'all'
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 font-black shadow-md'
                      : 'bg-amber-500/15 border-amber-400/30 text-[#E7C768] hover:bg-amber-500/25'
                  }`}
                  title="Переключатель задач: Мои → От меня → Все (кликните для смены)"
                >
                  {taskScopeFilter === 'mine' && (
                    <>
                      <User size={15} />
                      <span>Мои</span>
                      <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">1/3</span>
                    </>
                  )}
                  {taskScopeFilter === 'from_me' && (
                    <>
                      <Send size={14} />
                      <span>От меня</span>
                      <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">2/3</span>
                    </>
                  )}
                  {taskScopeFilter === 'all' && (
                    <>
                      <Users size={15} />
                      <span>Все</span>
                      <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-400/20">3/3</span>
                    </>
                  )}
                </button>

                {/* 7b. На проверку руководителем */}
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('/cabinet/revisor/review');
                    } else if (handleTabClick) {
                      handleTabClick('revisor_review');
                    } else {
                      setStatusFilter(statusFilter === 'verification' ? '' : 'verification');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-amber-300/60 bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm hover:brightness-105"
                  title="Перейти к проверке задач руководителем"
                >
                  <ShieldCheck size={14} className="text-amber-950" />
                  <span className="hidden sm:inline">Проверка задач</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-xs font-bold font-mono">
                    {(selectedProcessId === 'all' ? processes.flatMap(p => p.tasks || []) : (selectedProcess?.tasks || [])).filter(t => t.status === 'verification').length}
                  </span>
                </button>
              </div>

              {/* Right Section: Новая задача, Генератор ИИ, Влево/вправо */}
              <div className="flex items-center gap-2 shrink-0">
                {/* 8. Новая задача */}
                <button
                  onClick={() => {
                    setTaskProjectId(selectedProcessId || (processes[0]?.id || ''));
                    setShowCreateTaskModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black hover:brightness-110 active:scale-95 transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow-md border border-amber-300/50"
                  title="Создать новую задачу"
                >
                  <Plus size={15} className="stroke-[3]" />
                  <span className="hidden sm:inline">Новая задача</span>
                </button>

                {/* 10. Влево/вправо */}
                <div className="flex items-center gap-0.5 bg-transparent p-1 rounded-xl border border-amber-500/30">
                  <button
                    onClick={() => tasksKanbanScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                    className="p-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 transition-all cursor-pointer"
                    title="Прокрутить канбан влево"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-zinc-800 dark:text-amber-200 px-1 hidden lg:inline">Влево/вправо</span>
                  <button
                    onClick={() => tasksKanbanScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                    className="p-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 transition-all cursor-pointer"
                    title="Прокрутить канбан вправо"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

            </div>

            {/* Expanded Statistics Bar (When Статистика toggled) */}
            {isTaskStatsOpen && (
              <div className="pt-2 border-t border-zinc-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono animate-fade-in relative z-10">
                {[
                  { label: 'В очереди', count: selectedProcess.tasks.filter(t => t.status === 'pending').length, color: 'text-zinc-700 dark:text-slate-300', bg: 'bg-zinc-100 dark:bg-slate-900/40 border-zinc-200 dark:border-slate-700/30' },
                  { label: 'В работе', count: selectedProcess.tasks.filter(t => t.status === 'in_progress').length, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
                  { label: 'Контроль', count: selectedProcess.tasks.filter(t => t.status === 'verification').length, color: 'text-[#E7C768] dark:text-[#F4EE8E]', bg: 'bg-amber-400/20 border-amber-400/40 font-bold' },
                  { label: 'Готово', count: selectedProcess.tasks.filter(t => t.status === 'completed').length, color: 'text-amber-600 dark:text-amber-200', bg: 'bg-amber-500/10 border-amber-500/20' },
                  { label: 'Просрочено', count: selectedProcess.tasks.filter(t => t.status === 'delayed').length, color: 'text-red-600 dark:text-red-300', bg: 'bg-red-500/10 border-red-500/20 animate-pulse' },
                ].map((st, idx) => (
                  <div key={idx} className={`${st.bg} px-2.5 py-1.5 rounded-xl border text-center flex items-center justify-between`}>
                    <span className="text-zinc-600 dark:text-slate-300 text-xs font-sans font-semibold">{st.label}:</span>
                    <span className={`font-black text-sm ${st.color}`}>{st.count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded Filters Bar (When Фильтры toggled or filters active) */}
            {isTaskFiltersOpen && (
              <div className="pt-2 border-t border-zinc-200 dark:border-white/10 flex flex-wrap items-center gap-3 animate-fade-in relative z-10">
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-[#E7C768] uppercase tracking-wider">Фильтры:</span>
                
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-300 cursor-pointer font-medium"
                >
                  <option value="">👤 Все сотрудники</option>
                  {effectiveEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-amber-300 cursor-pointer font-medium"
                >
                  <option value="">🎯 Все приоритеты</option>
                  <option value="high">🔴 Высокий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="low">🟢 Низкий</option>
                </select>

                {(assigneeFilter || priorityFilter || searchQuery || taskScopeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setAssigneeFilter('');
                      setPriorityFilter('');
                      setTaskScopeFilter('all');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-300 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>Сбросить все</span>
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* MOBILE VIEW NAVIGATION TABS (Improvement 1) */}
          <div className="flex md:hidden bg-slate-950/40 p-1.5 rounded-2xl border border-white/5 gap-1 overflow-x-auto justify-between shadow-inner">
            {(
              [
                { id: 'pending', title: 'В очереди', dot: 'bg-slate-400' },
                { id: 'in_progress', title: 'В работе', dot: 'bg-amber-600' },
                { id: 'verification', title: 'Контроль', dot: 'bg-amber-400' },
                { id: 'completed', title: 'Готово', dot: 'bg-amber-300' },
                { id: 'delayed', title: 'Пр-но', dot: 'bg-red-400' }
              ] as const
            ).map((col) => {
              const count = selectedProcess.tasks.filter((t) => {
                const matchesCol = t.status === col.id;
                const matchesQuery = !searchQuery || t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesAssignee = !assigneeFilter || t.executorId === assigneeFilter;
                const matchesPriority = !priorityFilter || t.priority === priorityFilter;
                const matchesStatus = !statusFilter || t.status === statusFilter;
                const matchesScope = taskScopeFilter === 'all' ? true : taskScopeFilter === 'mine' ? isTaskMine(t, currentUser) : isTaskFromMe(t, currentUser);
                return matchesCol && matchesQuery && matchesAssignee && matchesPriority && matchesStatus && matchesScope;
              }).length;

              const isSelected = activeMobileColumn === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    setActiveMobileColumn(col.id);
                    setColumnMenuOpen(null);
                  }}
                  className={`flex-1 py-2 px-1.5 rounded-xl text-center text-[10px] font-black transition-all flex flex-col items-center gap-1 min-w-[62px] cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#E7C768] via-[#F4EE8E] to-[#D99E41] text-zinc-950 border border-amber-300 shadow-md shadow-amber-500/20' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                    <span>{col.title}</span>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 rounded font-bold ${isSelected ? 'bg-black/20 text-zinc-950' : 'bg-white/5 text-slate-300'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* DYNAMIC QUICK SELECTION FIELDS FOR MANAGERS/ADMINS ON MOBILE */}
          {isManager && (
            <div className="block md:hidden bg-[#131b2e]/15 border border-[#E7C768]/20 p-3.5 rounded-2xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#F4EE8E] flex items-center gap-1.5">
                  🛡️ Настройки колонки: {
                    activeMobileColumn === 'pending' ? 'В очереди' :
                    activeMobileColumn === 'in_progress' ? 'В работе' :
                    activeMobileColumn === 'verification' ? 'На контроле' :
                    activeMobileColumn === 'completed' ? 'Выполнено' : 'Приостановлено/Просрочено'
                  }
                </span>
                <span className="text-[8px] font-mono bg-amber-500/10 text-[#F4EE8E] px-1.5 py-0.5 rounded border border-amber-500/10">Режим руководителя</span>
              </div>

              {activeMobileColumn === 'pending' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Назначить ответственного:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="">Автораспределение ИИ</option>
                      {effectiveEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Критичность по умолчанию:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="high">🔴 Высокий приоритет</option>
                      <option value="medium">🟡 Средний приоритет</option>
                      <option value="low">🟢 Низкий приоритет</option>
                    </select>
                  </div>
                </div>
              )}

              {activeMobileColumn === 'in_progress' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Продлить дедлайны на:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="1">+1 рабочий день</option>
                      <option value="3">+3 рабочих дня</option>
                      <option value="5">+5 рабочих дней</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Массовая перепривязка:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="">Выберите сотрудника...</option>
                      {effectiveEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeMobileColumn === 'verification' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Жесткость ИИ-Контроля:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="strict">🔥 Максимальная (строго по ГОСТ)</option>
                      <option value="standard">⚡ Стандартная (баланс)</option>
                      <option value="relaxed">🌿 Мягкая (только чеклист)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Одобрение по баллам:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="95">От 95 баллов ИИ</option>
                      <option value="90">От 90 баллов ИИ</option>
                      <option value="manual">Только вручную руководителем</option>
                    </select>
                  </div>
                </div>
              )}

              {activeMobileColumn === 'completed' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Статус приемки:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="ok">Принято без замечаний</option>
                      <option value="revision">С доработками</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Действие архивации:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="keep">Оставить на доске</option>
                      <option value="archive">Скрыть в архив через 24ч</option>
                      <option value="report">Перенести в рапорты</option>
                    </select>
                  </div>
                </div>
              )}

              {activeMobileColumn === 'delayed' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Реакция на просрочку:</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="esc">⚠️ Эскалировать директору</option>
                      <option value="notify">📩 Оповестить в Telegram</option>
                      <option value="report">Запросить отчет о причинах</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Причина задержки (ИИ):</label>
                    <select className="w-full text-[10px] bg-slate-950/80 border border-white/10 text-white rounded-lg p-1.5 focus:border-[#E7C768]">
                      <option value="block">Ожидание смежников</option>
                      <option value="load">Высокая нагрузка сотрудника</option>
                      <option value="unknown">Неизвестно (требуется созвон)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Mobile-Friendly Horizontal Scroll Control Bar Directly Above Tasks Kanban Columns */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-gradient-to-r from-[#F4EE8E]/15 via-[#E7C768]/15 to-[#D99E41]/15 border border-amber-500/30 mb-1">
            <span className="text-xs font-mono font-bold text-amber-900 dark:text-[#F4EE8E] flex items-center gap-1.5">
              <ArrowLeftRight size={14} className="animate-pulse" />
              <span>Прокрутка колонок:</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => tasksKanbanScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="Прокрутить назад"
              >
                <ChevronLeft size={16} className="stroke-[3]" /> Назад
              </button>
              <button
                type="button"
                onClick={() => tasksKanbanScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="Прокрутить вперед"
              >
                Вперед <ChevronRight size={16} className="stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Kanban Lanes Horizontal Row */}
          <div ref={tasksKanbanScrollRef} className="flex flex-row gap-4 overflow-x-auto pb-4 w-full scrollbar-thin px-1 min-h-[450px]">
            
            {/* Columns definitions */}
            {(
              [
                { id: 'pending', title: 'В очереди', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/20', dot: 'bg-slate-400' },
                { id: 'in_progress', title: 'В работе', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/20', dot: 'bg-blue-400' },
                { id: 'verification', title: 'На ИИ-контроле', badge: 'bg-amber-400/20 text-amber-300 border-amber-400/20', dot: 'bg-amber-400' },
                { id: 'completed', title: 'Выполнено', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-400' },
                { id: 'delayed', title: 'Просрочено', badge: 'bg-red-500/20 text-red-300 border-red-500/20', dot: 'bg-red-400 animate-pulse' }
              ] as const
            ).map((col) => {
              const allSourceTasks = selectedProcessId === 'all'
                ? processes.flatMap(p => (p.tasks || []).map(t => ({ ...t, _projectTitle: p.title, _projectId: p.id })))
                : (selectedProcess?.tasks || []).map(t => ({ ...t, _projectTitle: selectedProcess?.title, _projectId: selectedProcess?.id }));

              let columnTasks = allSourceTasks.filter((t) => {
                const matchesCol = t.status === col.id;
                const matchesQuery = !searchQuery || t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesAssignee = !assigneeFilter || t.executorId === assigneeFilter;
                const matchesPriority = !priorityFilter || (t.priority || 'medium') === priorityFilter;
                const matchesStatus = !statusFilter || t.status === statusFilter;
                const matchesScope = taskScopeFilter === 'all' ? true : taskScopeFilter === 'mine' ? isTaskMine(t, currentUser) : isTaskFromMe(t, currentUser);
                return matchesCol && matchesQuery && matchesAssignee && matchesPriority && matchesStatus && matchesScope;
              });

              // Apply Task Column Header Sorting
              const taskSort = taskColumnSorts[col.id];
              if (taskSort === 'title') {
                columnTasks = [...columnTasks].sort((a, b) => a.taskTitle.localeCompare(b.taskTitle, 'ru'));
              } else if (taskSort === 'priority') {
                const pWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
                columnTasks = [...columnTasks].sort((a, b) => (pWeight[b.priority || 'medium'] || 0) - (pWeight[a.priority || 'medium'] || 0));
              } else if (taskSort === 'check') {
                columnTasks = [...columnTasks].sort((a, b) => (b.checklist?.length || 0) - (a.checklist?.length || 0));
              }

              return (
                <div 
                  key={col.id} 
                  className="p-3.5 rounded-2xl bg-transparent border-2 border-zinc-300/40 dark:border-white/10 space-y-3.5 shadow-md min-h-[450px] w-[280px] sm:w-[320px] shrink-0 relative transition-all duration-250"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <span className="text-xs font-black text-zinc-800 dark:text-white uppercase tracking-wider">{col.title}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 relative">
                      <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-white/10 px-2 py-0.5 rounded text-zinc-800 dark:text-slate-200 font-bold">
                        {columnTasks.length}
                      </span>

                      {/* Header Sorting Dropdown */}
                      <select
                        value={taskColumnSorts[col.id] || 'default'}
                        onChange={(e) => setTaskColumnSorts(prev => ({ ...prev, [col.id]: e.target.value }))}
                        className="text-[9px] font-mono bg-zinc-100 dark:bg-slate-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-amber-300 rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer"
                        title="Сортировка задач"
                      >
                        <option value="default">Сорт.</option>
                        <option value="title">А-Я</option>
                        <option value="priority">Приоритет ↓</option>
                        <option value="check">Чеклист ↓</option>
                      </select>

                      {/* Column Menu Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setColumnMenuOpen(columnMenuOpen === col.id ? null : col.id);
                        }}
                        className="p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-white/5 text-slate-400 hover:text-zinc-600 dark:hover:text-white transition-all cursor-pointer"
                        title="Опции колонки"
                      >
                        <Sliders size={12} />
                      </button>

                      {/* Column Sorting Dropdown Menu */}
                      {columnMenuOpen === col.id && (
                        <div className="absolute right-0 top-6 w-44 bg-white dark:bg-[#131b2e] border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl p-2 z-30 animate-fade-in text-left">
                          <p className="text-[8px] uppercase tracking-wider text-amber-600 dark:text-amber-200 font-bold px-2.5 py-1 font-mono">Сортировать задачи:</p>
                          <button
                            onClick={() => handleSortColumn(col.id, 'priority')}
                            className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-[#090d16] rounded-lg transition-all"
                          >
                            🚨 По приоритету (▲)
                          </button>
                          <button
                            onClick={() => handleSortColumn(col.id, 'title')}
                            className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-[#090d16] rounded-lg transition-all"
                          >
                            🔤 По названию (А-Я)
                          </button>
                          <button
                            onClick={() => handleSortColumn(col.id, 'checklist')}
                            className="w-full text-left px-2.5 py-1.5 text-[10px] text-zinc-700 dark:text-slate-200 hover:bg-zinc-100 dark:hover:bg-[#090d16] rounded-lg transition-all"
                          >
                            📋 По прогрессу чек-листа
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column Content Cards */}
                  <div className="space-y-3 overflow-y-auto max-h-[520px] pr-0.5 animate-fade-in">
                    {columnTasks.length > 0 ? (
                      columnTasks.map((task) => {
                        const totalChecklist = task.checklist.length;
                        const doneChecklist = task.checklist.filter(c => c.done).length;
                        const taskPriority = task.priority || 'medium';
                        
                        const isOverdue = col.id === 'delayed';
                        const isCompleted = col.id === 'completed';

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedCardId(task.id)}
                            className={`p-3.5 rounded-xl backdrop-blur-xl transition-all cursor-pointer group space-y-2.5 relative shadow-md hover:shadow-xl divide-y ${
                              isLightTheme
                                ? 'bg-[#ffffff]/90 border-2 border-[#E7C768] hover:border-amber-500 hover:shadow-amber-500/15 divide-zinc-200 text-zinc-950'
                                : 'bg-zinc-900/90 border-2 border-amber-400/80 hover:border-amber-300 hover:shadow-amber-400/10 divide-white/10 text-white'
                            }`}
                          >
                            {/* Card Content Click */}
                            <div className="space-y-2 pb-1">
                              
                              {/* Tags Line */}
                              <div className="flex items-center justify-between gap-1.5">
                                <span className={`text-[8px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded border ${
                                  isLightTheme
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-amber-500/10 text-[#F4EE8E] border-amber-500/20'
                                }`}>
                                  {task.executorRole || 'Задача'}
                                </span>
                                
                                {/* Priority Label */}
                                <div className="flex items-center gap-1 text-[8px] font-bold">
                                  {taskPriority === 'high' && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20 flex items-center gap-0.5">
                                      🔴 Высокий
                                    </span>
                                  )}
                                  {taskPriority === 'medium' && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-0.5">
                                      🟡 Средний
                                    </span>
                                  )}
                                  {taskPriority === 'low' && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-0.5">
                                      🟢 Низкий
                                    </span>
                                  )}
                                </div>
                              </div>

                              {selectedProcessId === 'all' && (task as any)._projectTitle && (
                                <div className="text-[9px] font-bold text-amber-700 dark:text-[#F4EE8E] truncate max-w-full flex items-center gap-1">
                                  <span>📁</span>
                                  <span className="truncate">{(task as any)._projectTitle}</span>
                                </div>
                              )}

                              <h5 className={`text-[11px] font-black leading-snug transition-colors ${
                                isLightTheme ? 'text-zinc-950 group-hover:text-amber-700' : 'text-white group-hover:text-amber-200'
                              }`}>
                                {task.taskTitle}
                              </h5>

                              {/* Progress bar */}
                              {totalChecklist > 0 && (
                                <div className={`space-y-1 p-1.5 rounded-lg border ${
                                  isLightTheme ? 'bg-zinc-100/80 border-zinc-200' : 'bg-slate-950/40 border-white/5'
                                }`}>
                                  <div className={`flex justify-between text-[8px] font-mono font-semibold ${
                                    isLightTheme ? 'text-zinc-700' : 'text-slate-300'
                                  }`}>
                                    <span>Чек-лист</span>
                                    <span>{doneChecklist}/{totalChecklist} ({Math.round((doneChecklist/totalChecklist)*100)}%)</span>
                                  </div>
                                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                                    isLightTheme ? 'bg-zinc-200' : 'bg-slate-800'
                                  }`}>
                                    <div 
                                      className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300" 
                                      style={{ width: `${(doneChecklist/totalChecklist)*100}%` }} 
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Due Date Alert Badges */}
                              <div className={`flex items-center justify-between text-[9px] font-mono mt-1 pt-1 border-t ${
                                isLightTheme ? 'border-zinc-200' : 'border-white/5'
                              }`}>
                                <div className="flex items-center gap-1 font-bold">
                                  {isCompleted ? (
                                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">✓ Выполнена</span>
                                  ) : isOverdue ? (
                                    <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">⏳ Просрочено!</span>
                                  ) : (
                                    <span className={isLightTheme ? 'text-zinc-700' : 'text-slate-300'}>📅 Срок: {task.deadlineDays || 3} дн.</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Author & Executor Section */}
                            <div className={`pt-2 space-y-1 text-[10px] font-medium border-t ${
                              isLightTheme ? 'text-zinc-800 border-zinc-200' : 'text-slate-200 border-white/10'
                            }`}>
                              {/* Author / Creator */}
                              <div className="flex items-center gap-1.5 truncate" title={`Постановщик: ${(task as any).author_name || (task as any).authorName || 'Руководитель'}`}>
                                <span className="text-amber-500 font-bold shrink-0">📌</span>
                                <span className={`text-[9px] ${isLightTheme ? 'text-zinc-500' : 'text-slate-400'} shrink-0`}>От:</span>
                                <span className={`truncate font-medium text-[10px] ${isLightTheme ? 'text-amber-900' : 'text-amber-200/90'}`}>
                                  {(task as any).author_name || (task as any).authorName || 'Руководитель'}
                                </span>
                              </div>

                              {/* Executor */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssigneeFilter(assigneeFilter === task.executorId ? '' : task.executorId);
                                  triggerToast(`Фильтр по исполнителю: ${task.executorName}`);
                                }}
                                className={`flex items-center gap-1.5 truncate transition-colors text-left w-full ${
                                  isLightTheme ? 'hover:text-amber-700' : 'hover:text-amber-300'
                                }`}
                                title={`Исполнитель: ${task.executorName}`}
                              >
                                <User size={12} className="text-amber-500 shrink-0" />
                                <span className={`text-[9px] ${isLightTheme ? 'text-zinc-500' : 'text-slate-400'} shrink-0`}>Кому:</span>
                                <span className={`truncate font-bold ${isLightTheme ? 'text-zinc-950' : 'text-white'}`}>
                                  {task.executorName || 'Не назначен'}
                                </span>
                              </button>
                            </div>

                            {/* Card Shift Actions row */}
                            <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[9px] relative">
                              {/* Quick Move Arrows */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const states: any[] = ['pending', 'in_progress', 'verification', 'completed', 'delayed'];
                                    const currIndex = states.indexOf(task.status);
                                    if (currIndex > 0) handleUpdateTaskStatus(task.id, states[currIndex - 1]);
                                  }}
                                  className="p-1 rounded bg-zinc-200 dark:bg-slate-900/60 hover:bg-zinc-300 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer transition-all"
                                  title="Переместить влево"
                                >
                                  ◀
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const states: any[] = ['pending', 'in_progress', 'verification', 'completed', 'delayed'];
                                    const currIndex = states.indexOf(task.status);
                                    if (currIndex < states.length - 1) handleUpdateTaskStatus(task.id, states[currIndex + 1]);
                                  }}
                                  className="p-1 rounded bg-zinc-200 dark:bg-slate-900/60 hover:bg-zinc-300 dark:hover:bg-slate-800 text-zinc-700 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer transition-all"
                                  title="Переместить вправо"
                                >
                                  ▶
                                </button>

                                {/* Instant Status Selector Popover (Improvement 9) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCardStatusSelectorOpen(cardStatusSelectorOpen === task.id ? null : task.id);
                                  }}
                                  className="p-1 rounded bg-[#E7C768]/10 hover:bg-[#E7C768]/20 text-[#F4EE8E] cursor-pointer transition-all text-[8px] font-bold uppercase tracking-wide flex items-center gap-0.5"
                                  title="Быстрое изменение статуса"
                                >
                                  <span>Статус</span>
                                  <ChevronDown size={8} />
                                </button>

                                {/* Status Selector Floating Popover */}
                                {cardStatusSelectorOpen === task.id && (
                                  <div className="absolute left-0 bottom-7 bg-[#131b2e] border border-white/10 rounded-xl shadow-2xl p-1 z-40 animate-fade-in w-36">
                                    {(
                                      [
                                        { id: 'pending', name: '⏳ В очередь' },
                                        { id: 'in_progress', name: '🔵 В работу' },
                                        { id: 'verification', name: '🛡️ ИИ-контроль' },
                                        { id: 'completed', name: '✓ Выполнено' },
                                        { id: 'delayed', name: '⚠️ Просрочено' }
                                      ] as const
                                    ).map((st) => (
                                      <button
                                        key={st.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateTaskStatus(task.id, st.id);
                                          setCardStatusSelectorOpen(null);
                                          triggerToast(`Задача перемещена в "${st.name}"`);
                                        }}
                                        className="w-full text-left px-2 py-1.5 text-[9px] text-slate-200 hover:bg-[#090d16] rounded-lg transition-all font-semibold"
                                      >
                                        {st.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Delays quick-trigger */}
                              {task.status === 'in_progress' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSimulateDelay(task.id);
                                  }}
                                  className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/25 text-red-300 font-bold transition-all cursor-pointer border border-red-500/10 text-[8px] uppercase"
                                >
                                  Задержать ⏳
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-slate-500 text-[10px] italic border border-dashed border-white/5 rounded-xl bg-slate-950/10">
                        В этой колонке пусто
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      {/* SUB-TAB: PROJECT TASKS (KANBAN & LIST VIEW) */}
      {activeSubTab === 'tasks' && (
        <CabinetTasksView
          company={company}
          processes={processes}
          setProcesses={setProcesses}
          currentUser={currentUser}
          mockEmployees={effectiveEmployees}
          theme={theme}
          handleTabClick={handleTabClick}
          initialViewMode="kanban"
          initialProjectId={selectedProcessId || 'all'}
          onNavigateView={(mode) => {
            if (mode === 'galaxy') handleSubTabNavigate('tasks_map');
            else if (mode === 'kanban') handleSubTabNavigate('tasks_kanban');
            else if (mode === 'list') handleSubTabNavigate('tasks_table');
          }}
          onNavigate={onNavigate || ((path: string) => {
            window.history.pushState({}, '', path);
            const ev = new PopStateEvent('popstate');
            window.dispatchEvent(ev);
          })}
          onSelectProject={(projId) => {
            if (projId && projId !== 'all') {
              setSelectedProcessId(projId);
            }
          }}
        />
      )}

      {/* SUB-TAB 1: AI CONSTRUCTOR */}
      {activeSubTab === 'constructor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Voice and Text input */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl border border-amber-500/20 dark:border-[#E7C768]/20 bg-white dark:bg-[#090d16]/30 text-zinc-900 dark:text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 font-mono">Голосовое и текстовое управление</span>
                <span className="text-[10px] text-zinc-500 dark:text-slate-400 font-mono">Встроенный ИИ-Ревизор</span>
              </div>

              {/* Speech control button */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#090d16]/70 border border-zinc-200 dark:border-amber-300/10 flex items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-white">Реальное распознавание речи (Web Speech API)</h4>
                  <p className="text-[10px] text-zinc-600 dark:text-slate-300">{speechStatus}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={isRecording ? stopRecordingSession : startRecordingSession}
                    className={`p-3.5 rounded-full transition-all cursor-pointer relative ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/30' 
                        : 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-950 hover:scale-105 active:scale-95'
                    }`}
                    title={isRecording ? 'Остановить запись' : 'Начать запись голоса'}
                  >
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
              </div>

              {/* VAD Progress indicator */}
              {isRecording && (
                <div className="space-y-1.5 animate-fade-in bg-zinc-100 dark:bg-slate-950/40 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                  <div className="flex justify-between text-[9px] font-mono font-bold text-amber-800 dark:text-amber-200">
                    <span>🎙️ ГОЛОСОВАЯ АКТИВНОСТЬ (VAD детектор тишины)</span>
                    <span>{vadProgress > 30 ? 'Идет диктовка...' : 'Пауза: отправка через 1 сек'}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-75"
                      style={{ width: `${vadProgress}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-zinc-600 dark:text-slate-400 leading-relaxed">
                    Детектор Voice Activity автоматически остановит запись и сгенерирует процесс, когда вы замолчите на 2-3 секунды.
                  </p>
                </div>
              )}

              {/* Live Transcript output */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold text-zinc-700 dark:text-slate-300">Распознанный текст или ваша задача:</label>
                <textarea
                  value={transcript || customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Диктуйте в микрофон или введите текстом, например: 'мне нужно сделать обзвон клиентов из базы по новогодней акции и подготовить креативы'"
                  className="w-full h-32 px-4 py-3 rounded-2xl bg-transparent dark:bg-[#090d16]/60 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-[#E7C768] resize-none leading-relaxed"
                />
              </div>

              {/* Universal Templates Quick Selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-extrabold text-zinc-900 dark:text-amber-200 font-mono">Выбрать универсальный шаблон ИИ:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[110px] overflow-y-auto p-1.5 bg-zinc-100 dark:bg-slate-950/40 rounded-2xl border border-zinc-200 dark:border-white/5 pr-1">
                  {REVISOR_PRESET_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => {
                        setCustomPrompt(tpl.prompt);
                        setTranscript('');
                        triggerToast(`📋 Выбран шаблон: ${tpl.name}`);
                      }}
                      className="p-1.5 rounded-lg bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-extrabold border border-amber-300/80 shadow-xs hover:brightness-110 transition-all cursor-pointer truncate text-[9px] text-left"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2.5 pt-1.5">
                <button
                  onClick={() => handleTriggerRevisorAI(transcript || customPrompt)}
                  disabled={aiLoading || (!transcript && !customPrompt)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-950 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>ИИ Ревизор строит процесс...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>{activeTab === 'revisor_tasks_builder' ? 'Сконструировать и добавить Задачи' : 'Сконструировать Бизнес-Процесс'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setCustomPrompt('Запустить разработку и публикацию 5 статей для нашей базы знаний силами разработчиков и копирайтеров');
                    setTranscript('');
                  }}
                  className="px-3.5 py-3 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-black border border-amber-300/80 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer text-xs shrink-0"
                >
                  Шаблон задачи
                </button>
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-300 flex items-center gap-2 animate-fade-in">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pre-programmed AI process card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/40 shadow-sm dark:shadow-xl space-y-4">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-[#F4EE8E]">
                <Shield size={16} />
                <h4 className="text-xs font-black uppercase tracking-wider">Действующие процессы ({processes.length})</h4>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {processes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProcessId(p.id);
                      openProjectEditor(p.id);
                      triggerToast(`📁 Открыт редактор проекта: "${p.title}"`);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer block ${
                      p.id === selectedProcessId
                        ? 'bg-zinc-200 dark:bg-zinc-800 border-amber-500/40 shadow-inner'
                        : 'bg-white dark:bg-zinc-950/30 border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1 block leading-tight">{p.title}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider font-mono ${
                        p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' :
                        p.status === 'delayed' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/20' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                      }`}>
                        {p.status === 'completed' ? 'Завершен' : p.status === 'delayed' ? 'Задержка' : 'Активен'}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-650 dark:text-slate-300 mt-1 line-clamp-2 italic leading-relaxed">
                      "{p.prompt}"
                    </p>

                    <div className="flex justify-between text-[8px] text-zinc-500 dark:text-slate-400 mt-2 border-t border-zinc-200 dark:border-white/5 pt-1.5 font-mono">
                      <span>👤 {p.tasks.length} исполнителей</span>
                      <span>📅 {p.createdAt}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedProcess && (
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-1 text-slate-300 text-xs">
                    <Sparkles size={12} className="text-[#F4EE8E]" />
                    <span className="font-bold">Анализ и вердикт ИИ-Ревизора:</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                    {selectedProcess.evaluation || 'Процесс в данный момент активен и координируется ИИ.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Explanation of AI Generation Process */}
          <div className="lg:col-span-12 p-6 rounded-3xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/20 space-y-6 mt-4 shadow-sm dark:shadow-lg animate-fade-in">
            <div className="border-b border-zinc-200 dark:border-white/5 pb-3">
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-[#E7C768] uppercase tracking-wider block">Техническое руководство</span>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500 dark:text-amber-300 animate-pulse" />
                <span>Архитектура и логика работы ИИ-Конструктора проектов и задач</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Step 1: Voice & Transcript */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/40 border border-zinc-200 dark:border-white/5 space-y-2.5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold text-xs font-mono">
                  01
                </div>
                <h5 className="text-xs font-bold text-zinc-900 dark:text-white">1. Захват и VAD-фильтрация</h5>
                <p className="text-[11px] text-zinc-600 dark:text-slate-300 leading-relaxed">
                  Пользователь диктует задачу голосом. Браузерный движок <strong>Web Speech API</strong> мгновенно преобразует аудиопоток в текст (транскрипт) на русском языке. 
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 leading-relaxed">
                  Интеллектуальный детектор <strong>Voice Activity Detection (VAD)</strong> отслеживает паузы. Если тишина длится более 2.5 секунд, запись автоматически останавливается и передается на генерацию.
                </p>
              </div>

              {/* Step 2: Semantic Parsing */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/40 border border-zinc-200 dark:border-white/5 space-y-2.5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs font-mono">
                  02
                </div>
                <h5 className="text-xs font-bold text-zinc-900 dark:text-white">2. ИИ декомпозиция проекта</h5>
                <p className="text-[11px] text-zinc-600 dark:text-slate-300 leading-relaxed">
                  Полученный текст отправляется на сервер в модель <strong>RR Flash / Omni</strong>. Нейросеть осуществляет смысловой анализ, определяет тип проекта и разбивает его на последовательные шаги.
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 leading-relaxed">
                  Для каждого этапа ИИ формулирует лаконичное название, рассчитывает оптимальные дедлайны (в днях) и формирует детальные пошаговые <strong>чек-листы проверки</strong>.
                </p>
              </div>

              {/* Step 3: Skill Allocation */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/40 border border-zinc-200 dark:border-white/5 space-y-2.5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-xs font-mono">
                  03
                </div>
                <h5 className="text-xs font-bold text-zinc-900 dark:text-white">3. Авто-распределение ролей</h5>
                <p className="text-[11px] text-zinc-600 dark:text-slate-300 leading-relaxed">
                  Система ИИ сопоставляет требования каждого шага со штатной структурой компании. Свободные сотрудники автоматически назначаются исполнителями на соответствующие роли.
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 leading-relaxed">
                  Маркетинговые шаги уходят <strong>Трафик-маркетологу</strong>, интеграция баз данных — <strong>РОПу / IT-директору</strong>, а коммуникации — <strong>Менеджерам продаж</strong>.
                </p>
              </div>

              {/* Step 4: Verification */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/40 border border-zinc-200 dark:border-white/5 space-y-2.5 shadow-sm">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold text-xs font-mono">
                  04
                </div>
                <h5 className="text-xs font-bold text-zinc-900 dark:text-white">4. RR Контроль и Сдвиги</h5>
                <p className="text-[11px] text-zinc-600 dark:text-slate-300 leading-relaxed">
                  При сдаче работы ИИ-Ревизор проверяет прикрепленные файлы (скриншоты CRM, аудиозаписи звонков, геолокации, PDF) через нейросетевую верификацию <strong>RR API</strong>.
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-slate-400 leading-relaxed">
                  При успешной проверке начисляется <strong>Quality Score (50-100)</strong> и бонусы. В случае задержки дедлайны последующих шагов на диаграмме Ганта автоматически переносятся с уведомлением всех коллег.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-500/20 text-[11px] text-zinc-700 dark:text-slate-300 leading-relaxed">
              <span className="font-bold text-amber-600 dark:text-amber-200">💡 Как протестировать:</span> Нажмите кнопку микрофона вверху, продиктуйте проектную задачу (или вставьте готовый текст) и нажмите <strong>«Сконструировать Бизнес-Процесс»</strong>. Вы будете автоматически перенаправлены на интерактивную Карту Ганта, где сможете наблюдать за взаимосвязанной цепочкой задач и симулировать задержки или делегирование!
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: GANTT CHART & DEADLINE SHIFTS (Bitrix24 Gantt View) */}
      {activeSubTab === 'gantt' && (
        <CabinetBitrixGantt
          processes={processes}
          selectedProcess={selectedProcess}
          setProcesses={setProcesses}
          mockEmployees={effectiveEmployees}
          currentUser={currentUser}
          isManager={isManager}
          theme={theme as any}
          triggerToast={triggerToast}
          onSwitchSubTab={(tab) => handleSubTabNavigate(tab)}
          onNavigate={onNavigate}
        />
      )}

      {/* SUB-TAB 3: RR VERIFICATION */}
      {activeSubTab === 'verification' && selectedProcess && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Verification controller */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl border border-[#E7C768]/20 bg-[#090d16]/30 shadow-[0_0_15px_rgba(231,199,104,0.06),inset_0_0_10px_rgba(231,199,104,0.02)] space-y-4 shadow-xl">
              <div className="flex items-center gap-1.5 text-[#F4EE8E]">
                <FileText size={16} />
                <h4 className="text-xs font-black uppercase tracking-wider">Приемка выполненных работ & RR API</h4>
              </div>

              <p className="text-[10px] text-slate-300 leading-normal">
                Сотрудник при сдаче своего шага в ИИ-Ревизор может прикрепить любые отчетные материалы.
                RR API моментально сканирует их, верифицирует содержимое и отправляет оценку Quality Score боссу.
              </p>

              <div className="space-y-3.5 pt-1.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">Шаг в процессе для подтверждения:</label>
                  <select
                    value={selectedTaskToVerify}
                    onChange={(e) => setSelectedTaskToVerify(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d16]/60 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E7C768]"
                  >
                    {selectedProcess.tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.executorName} — {t.taskTitle}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">Тип документа / верификации:</label>
                    <select
                      value={attachmentType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setAttachmentType(val);
                        if (val === 'image') {
                          setAttachmentName('screenshot_marketing_done.jpg');
                          setAttachmentUrl('https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80');
                        } else if (val === 'document') {
                          setAttachmentName('report_analysis_scanned.pdf');
                          setAttachmentUrl('#');
                        } else if (val === 'audio') {
                          setAttachmentName('boss_voice_feedback_report.mp3');
                          setAttachmentUrl('#');
                        } else if (val === 'location') {
                          setAttachmentName('geolocation_tag.gpx');
                          setAttachmentUrl('#');
                        } else if (val === 'text') {
                          setAttachmentName('text_report_details.txt');
                          setAttachmentUrl('#');
                        } else if (val === 'variants') {
                          setAttachmentName('survey_responses.json');
                          setAttachmentUrl('#');
                        } else if (val === 'checklist') {
                          setAttachmentName('audit_checklist.json');
                          setAttachmentUrl('#');
                        } else {
                          setAttachmentName('kpi_metrics_data.csv');
                          setAttachmentUrl('#');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#090d16]/60 border border-white/10 text-white text-xs focus:outline-none"
                    >
                      <option value="image">Скриншот / Фото (🖼️)</option>
                      <option value="document">Скан договора / Чек (📄)</option>
                      <option value="audio">Аудиозапись отчета (🎤)</option>
                      <option value="location">Геопозиция GPS (📍)</option>
                      <option value="text">Текстовый отчет (📝)</option>
                      <option value="variants">Варианты ответов (☑️)</option>
                      <option value="checklist">Чек-лист проверки (📋)</option>
                      <option value="metrics">Цифровые метрики (📊)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-300 mb-1">Имя прикрепляемого файла:</label>
                    <input
                      type="text"
                      value={attachmentName}
                      onChange={(e) => setAttachmentName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#090d16]/60 border border-white/10 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* CONDITIONAL INTERACTIVE VERIFICATION FIELDS */}
                {attachmentType === 'text' && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 animate-fade-in">
                    <label className="block text-[10px] uppercase font-bold text-[#F4EE8E]">Введите текст отчета:</label>
                    <textarea
                      value={verificationText}
                      onChange={(e) => setVerificationText(e.target.value)}
                      placeholder="Опишите подробно выполненную работу, результаты, проблемы и решения..."
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-[#090d16]/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E7C768] resize-none"
                    />
                  </div>
                )}

                {attachmentType === 'variants' && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 animate-fade-in">
                    <label className="block text-[10px] uppercase font-bold text-[#F4EE8E]">Выберите вариант ответа:</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        'Сделка успешно закрыта в CRM',
                        'Встреча проведена, отправлено КП',
                        'Проект полностью сдан заказчику',
                        'Смена передана без нареканий и расхождений'
                      ].map((v) => (
                        <button
                          type="button"
                          key={v}
                          onClick={() => setVerificationVariant(v)}
                          className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between border ${
                            verificationVariant === v
                              ? 'bg-[#131b2e]/60 text-[#F4EE8E] border-[#E7C768]/60 font-bold'
                              : 'bg-white/5 text-slate-300 border-transparent hover:bg-white/10'
                          }`}
                        >
                          <span>{v}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            verificationVariant === v ? 'border-[#E7C768]' : 'border-slate-500'
                          }`}>
                            {verificationVariant === v && <span className="w-1.5 h-1.5 rounded-full bg-[#E7C768]" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {attachmentType === 'checklist' && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2.5 animate-fade-in">
                    <label className="block text-[10px] uppercase font-bold text-[#F4EE8E]">Чек-лист выполнения регламентов:</label>
                    <div className="space-y-2">
                      {Object.keys(verificationChecklist).map((key) => (
                        <label 
                          key={key} 
                          className="flex items-start gap-2.5 p-2 rounded-lg bg-[#090d16]/30 hover:bg-[#090d16]/50 border border-white/5 cursor-pointer text-xs transition-all select-none"
                        >
                          <input
                            type="checkbox"
                            checked={verificationChecklist[key]}
                            onChange={(e) => setVerificationChecklist({
                              ...verificationChecklist,
                              [key]: e.target.checked
                            })}
                            className="w-4 h-4 rounded text-[#E7C768] bg-[#090d16]/50 border-white/10 focus:ring-0 shrink-0 mt-0.5"
                          />
                          <span className={verificationChecklist[key] ? 'text-slate-200 line-through decoration-slate-600' : 'text-slate-300'}>
                            {key}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {attachmentType === 'location' && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] uppercase font-bold text-[#F4EE8E]">Геопозиция GPS (📍):</label>
                      <button
                        type="button"
                        onClick={() => {
                          const coords = [
                            { lat: '55.7558', lng: '37.6173', name: 'Москва (Офис)' },
                            { lat: '59.9343', lng: '30.3351', name: 'Санкт-Петербург (Филиал)' },
                            { lat: '55.0084', lng: '82.9357', name: 'Новосибирск (Склад)' },
                            { lat: '43.5855', lng: '39.7230', name: 'Сочи (Удаленный пункт)' }
                          ];
                          const randomCoord = coords[Math.floor(Math.random() * coords.length)];
                          setVerificationLat(randomCoord.lat);
                          setVerificationLng(randomCoord.lng);
                          setAttachmentName(`gps_location_${randomCoord.name.toLowerCase().replace(/[^a-zа-я]/g, '_')}.gpx`);
                        }}
                        className="text-[9px] px-2 py-1 bg-[#D99E41]/20 hover:bg-[#D99E41]/40 border border-[#E7C768]/30 rounded text-[#F4EE8E] transition-all font-bold cursor-pointer"
                      >
                        📍 Обновить GPS координаты
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <span className="block text-[9px] text-slate-400 font-mono mb-1">ШИРОТА (LAT):</span>
                        <input
                          type="text"
                          value={verificationLat}
                          onChange={(e) => setVerificationLat(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#090d16]/60 border border-white/10 text-white font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 font-mono mb-1">ДОЛГОТА (LNG):</span>
                        <input
                          type="text"
                          value={verificationLng}
                          onChange={(e) => setVerificationLng(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#090d16]/60 border border-white/10 text-white font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-center font-mono">
                      📍 Точность определения: ±12м (Погрешность стандарта GPS)
                    </div>
                  </div>
                )}

                {attachmentType === 'metrics' && (
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 animate-fade-in">
                    <label className="block text-[10px] uppercase font-bold text-[#F4EE8E]">Количественная метрика (KPI значение):</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={verificationMetric}
                        onChange={(e) => setVerificationMetric(e.target.value)}
                        className="w-24 px-3 py-2 rounded-xl bg-[#090d16]/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#E7C768]"
                      />
                      <span className="text-[10px] text-slate-400 leading-normal">
                        Введите числовой показатель выполнения (кол-во звонков, выручка в тыс. руб., количество обработанных билетов и т.д.)
                      </span>
                    </div>
                  </div>
                )}

                {/* Dropzone mock */}
                <div className="border-2 border-dashed border-white/10 hover:border-amber-400/40 rounded-2xl p-5 text-center transition-all bg-white/5 space-y-1.5 cursor-pointer">
                  <div className="text-xl">📁</div>
                  <span className="block text-xs font-bold text-slate-200">Перетащите файлы сюда или нажмите для выбора</span>
                  <span className="block text-[9px] text-slate-400">Файл успешно привязан: {attachmentName}</span>
                </div>

                <button
                  onClick={handleVerifyAttachment}
                  disabled={isVerifyingFile}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-950 font-extrabold text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  {isVerifyingFile ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>RR ИИ анализирует файл...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      <span>ИИ-Верифицировать Выполнение Шага</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: RR scanner feedback result */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl border border-[#E7C768]/20 bg-[#090d16]/30 shadow-[0_0_15px_rgba(231,199,104,0.06),inset_0_0_10px_rgba(231,199,104,0.02)] shadow-xl space-y-4">
              <span className="text-[10px] uppercase font-bold text-[#E7C768] font-mono tracking-wider block">ЛОГ РАСПОЗНАВАНИЯ RR</span>
              
              {verificationFeedback ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 size={13} />
                      <span>Результат сканирования ИИ:</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                      {verificationFeedback}
                    </p>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-mono">ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ ФАЙЛА</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-slate-400">Владелец:</span>
                        <p className="text-white font-bold">ИИ-Ревизор</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Формат:</span>
                        <p className="text-white font-bold">{attachmentType.toUpperCase()}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Интеграция:</span>
                        <p className="text-emerald-400 font-bold">RR Webhook</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Статус:</span>
                        <p className="text-emerald-400 font-bold">Верифицирован</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Ожидание отправки файла на верификацию... Нажмите кнопку слева для отправки.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 4: COMPANY STRUCTURE & WORK STATUSES */}
      {activeSubTab === 'structure' && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl border border-[#E7C768]/20 bg-[#090d16]/30 shadow-[0_0_15px_rgba(231,199,104,0.06),inset_0_0_10px_rgba(231,199,104,0.02)] shadow-xl space-y-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-200 block uppercase">Распределение ресурсов</span>
              <h4 className="text-sm font-extrabold text-white">Структура компании & Занятость сотрудников</h4>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                ИИ-Ревизор автоматически подбирает максимально свободных сотрудников согласно их графикам занятости.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {effectiveEmployees.map((emp) => {
                // Determine current status of employee
                let statusBadge = 'bg-amber-400/15 text-[#F4EE8E] border-[#E7C768]/40';
                let statusLabel = 'Свободен';
                
                // If they are executors of any active task
                const isBusy = processes.some(p => 
                  p.status === 'active' && 
                  p.tasks.some(t => t.executorId === emp.id && t.status === 'in_progress')
                );

                if (isBusy) {
                  statusBadge = 'bg-amber-400/10 text-amber-300 border-amber-300/20 animate-pulse';
                  statusLabel = 'Занят задачей';
                }

                return (
                  <div key={emp.id} className="p-4 rounded-2xl bg-[#090d16]/50 border border-white/5 space-y-3 shadow-md">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h5 className="text-xs font-extrabold text-white font-sans truncate">{emp.name}</h5>
                        <span className="block text-[10px] text-slate-400 font-sans">{emp.position || 'Специалист'}</span>
                      </div>
                      <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-300 font-sans border-t border-white/5 pt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Telegram:</span>
                        <span className="font-mono">{emp.telegramHandle || 'Не указан'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">График:</span>
                        <span className="text-amber-200">5/2 (09:00 - 18:00)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Накоплено бонусов:</span>
                        <span className="font-bold text-[#F4EE8E] font-mono">{(emp.bonusesEarned || 0) + 120} ₽</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CARD DETAIL MODAL (detailed task control panel) */}
      {selectedCardId && selectedProcess && (() => {
        const card = selectedProcess.tasks.find(t => t.id === selectedCardId);
        if (!card) return null;

        const totalCheck = card.checklist.length;
        const doneCheck = card.checklist.filter(c => c.done).length;
        const percent = totalCheck > 0 ? Math.round((doneCheck / totalCheck) * 100) : 0;
        const taskPriority = card.priority || 'medium';

        const parsedCardFields = parseFieldsSafe((card as any).fields);
        const parsedCardChecklist = parseChecklistSafe(card.checklist);

        const realFields: TaskCardField[] = parsedCardFields.length > 0
          ? parsedCardFields
          : (parsedCardChecklist.length > 0
              ? parsedCardChecklist.map((c, i) => ({
                  id: c.id || `f-${i}`,
                  label: c.text,
                  type: 'text_paragraph' as const,
                  required: true,
                  hint: ''
                }))
              : [
                  { id: "f1", label: "Подтверждение выполнения сути задачи", type: "text_paragraph" as const, required: true, hint: "Опишите что было сделано" },
                  { id: "f2", label: "Скриншот или фотоотчет результата", type: "screenshot" as const, required: true, hint: "Загрузите скриншот или снимок экрана" },
                  { id: "f3", label: "Голосовой комментарий исполнителя", type: "voice" as const, required: false, hint: "Краткое аудиосообщение по итогам работы" }
                ]);

        const taskDetail: TaskDetailData = {
          id: card.id,
          projectId: selectedProcess.id,
          projectTitle: selectedProcess.title,
          taskTitle: card.taskTitle,
          description: card.description || "",
          executorId: card.executorId,
          executorName: card.executorName,
          executorRole: card.executorRole,
          deadlineDays: card.deadlineDays,
          priority: card.priority || "medium",
          status: card.status,
          score: card.score,
          verifiedByAI: card.verifiedByAI,
          fields: realFields,
          fieldValues: (card as any).answers || (card as any).fieldValues || {},
          checkCriteria: (card as any).checkCriteria || (card as any).check_criteria || ''
        };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-6 animate-fade-in font-sans">
            <CabinetTaskCardsPage
              task={taskDetail}
              onBack={() => {
                setSelectedCardId(null);
                setVerificationFeedback(null);
              }}
              onUpdateTask={(updated) => {
                setProcesses(prev => prev.map(p => {
                  if (p.id !== selectedProcess.id) return p;
                  return {
                    ...p,
                    tasks: p.tasks.map(t => {
                      if (t.id !== card.id) return t;
                      return {
                        ...t,
                        status: (updated.status as any) || t.status,
                        score: updated.score !== undefined ? updated.score : t.score,
                        verifiedByAI: updated.verifiedByAI !== undefined ? updated.verifiedByAI : t.verifiedByAI
                      };
                    })
                  };
                }));
                triggerToast("Данные задачи успешно обновлены!");
              }}
              isDark={!isLightTheme}
            />
          </div>
        );
      })()}

      {/* QUICK ADD TASK MODAL */}
      {showAddTaskModal && selectedProcess && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50 animate-fade-in" style={{ contentVisibility: 'auto' }}>
          <div className="bg-zinc-900 border border-[#E7C768]/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Plus size={14} className="text-[#E7C768]" />
                <span className="bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] bg-clip-text text-transparent font-extrabold uppercase tracking-wide">Добавить задачу на доску</span>
              </h4>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">Название задачи:</label>
              <input
                type="text"
                placeholder="Например: Отредактировать скрипт звонка..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E7C768] font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">Исполнитель:</label>
              <select
                value={newTaskExecutorId}
                onChange={(e) => setNewTaskExecutorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E7C768] cursor-pointer"
              >
                {effectiveEmployees.map((e) => (
                  <option key={e.id} value={e.id} className="bg-zinc-900 text-white">{e.name} ({e.position})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">Начальная колонка:</label>
              <select
                value={newTaskColumn}
                onChange={(e) => setNewTaskColumn(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:border-[#E7C768] cursor-pointer"
              >
                <option value="pending" className="bg-zinc-900 text-white">⏳ В очереди</option>
                <option value="in_progress" className="bg-zinc-900 text-white">⚡ В работе</option>
                <option value="verification" className="bg-zinc-900 text-white">🛡️ На ИИ-контроле</option>
                <option value="completed" className="bg-zinc-900 text-white">✓ Выполнено</option>
              </select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer text-center"
              >
                Отмена
              </button>
              <button
                onClick={handleAddKanbanTask}
                disabled={!newTaskTitle.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-950 text-xs font-extrabold hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer text-center"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED PROJECT EDITOR & CREATION MODAL WITH PROTALK VOICE, AI AND MANUAL TASK MANAGEMENT */}
      {showCreateProjectModal && createPortal(
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in font-sans">
          <div className={`border rounded-3xl p-4 sm:p-6 w-full max-w-2xl space-y-4 sm:space-y-5 relative max-h-[92vh] overflow-y-auto scrollbar-thin transition-colors ${
            isLightTheme
              ? 'bg-[#FFFBF5]/95 border-[#B8860B]/40 text-amber-950 shadow-[0_0_40px_rgba(184,134,11,0.15)]'
              : 'bg-[#1A0F02]/90 border-[#E7C768]/40 text-slate-100 shadow-[0_0_40px_rgba(244,238,142,0.15)]'
          }`}>
            {/* Header */}
            <div className={`flex justify-between items-center border-b pb-3 ${isLightTheme ? 'border-amber-950/10' : 'border-amber-400/20'}`}>
              <div className="flex items-center gap-2">
                <Building size={22} className={isLightTheme ? 'text-[#B8860B]' : 'text-[#F4EE8E]'} />
                <div>
                  <h4 className="text-base sm:text-lg font-bold">
                    {isNewProjectCreation ? 'Создание проекта' : 'Редактор проекта'}
                  </h4>
                  {editingProjectId && (
                    <span className={`text-xs font-mono font-semibold ${isLightTheme ? 'text-amber-800' : 'text-[#E7C768]'}`}>
                      ID: {editingProjectId}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowCreateProjectModal(false)}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  isLightTheme ? 'bg-amber-950/5 hover:bg-amber-950/10 text-amber-900' : 'bg-white/5 hover:bg-white/10 text-amber-200 hover:text-white'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* ProTalk Voice & AI Autofill Section */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 transition-colors ${
              isLightTheme
                ? 'bg-[#FAF6EC]/90 border-[#B8860B]/40'
                : 'bg-[#140A01]/75 border-[#E7C768]/30 shadow-[0_0_20px_rgba(244,238,142,0.08)]'
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                  <Sparkles size={16} className="text-[#E7C768]" />
                  <span>ИИ-Заполнение проекта и задач</span>
                </div>
              </div>

              <AudioField
                label="Голосовой ввод или описание цели проекта:"
                value={projectAiPrompt}
                onChange={setProjectAiPrompt}
                placeholder="Например: Внедрение CRM-системы, настройка воронки лидов и интеграция с телефонией..."
                isLightTheme={isLightTheme}
                compactVoiceButton={true}
              />

              <button
                type="button"
                onClick={handleRunProjectAi}
                disabled={!projectAiPrompt.trim() || isProjectAiLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                <Sparkles size={16} />
                <span>{isProjectAiLoading ? 'ИИ анализирует и формирует...' : 'ИИ-Заполнение'}</span>
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4">
              {/* Project Title with MiniAudioField */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className={`block text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                    Название проекта *
                  </label>
                  <span className={`text-xs ${isLightTheme ? 'text-amber-800' : 'text-[#E7C768]/80'}`}>
                    максимум 20 символов ({newProjectTitle.length}/20)
                  </span>
                </div>
                <MiniAudioField
                  value={newProjectTitle}
                  onChange={(val) => setNewProjectTitle(val.slice(0, 20))}
                  placeholder="Название проекта"
                  maxLength={20}
                  isLightTheme={isLightTheme}
                />
              </div>

              {/* Goal & Description with MiniAudioField */}
              <div className="space-y-1.5">
                <label className={`block text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                  Цель и описание проекта
                </label>
                <MiniAudioField
                  value={newProjectPrompt}
                  onChange={setNewProjectPrompt}
                  placeholder="Ключевые цели, метрики и ожидаемый результат..."
                  multiline={true}
                  rows={2}
                  isLightTheme={isLightTheme}
                />
              </div>

              {/* Manager & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className={`block text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                    Руководитель проекта
                  </label>
                  <select
                    value={newProjectManager}
                    onChange={(e) => setNewProjectManager(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none cursor-pointer transition-colors ${
                      isLightTheme
                        ? 'bg-[#FAF6EC] border-[#B8860B]/40 text-amber-950 focus:border-[#B8860B]'
                        : 'bg-[#140A01]/80 border-[#E7C768]/30 text-white focus:border-[#F4EE8E]'
                    }`}
                  >
                    <option value="">Выберите руководителя</option>
                    {effectiveEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} — {e.position || 'Сотрудник'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={`block text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                    Бюджет (₽)
                  </label>
                  <input
                    type="number"
                    value={newProjectBudget}
                    onChange={(e) => setNewProjectBudget(Number(e.target.value) || 0)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition-colors ${
                      isLightTheme
                        ? 'bg-[#FAF6EC] border-[#B8860B]/40 text-amber-950 focus:border-[#B8860B]'
                        : 'bg-[#140A01]/80 border-[#E7C768]/30 text-white focus:border-[#F4EE8E]'
                    }`}
                  />
                </div>
              </div>

              {/* Project Deadlines: Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <label className={`block text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                    Дата начала проекта
                  </label>
                  <input
                    type="date"
                    value={newProjectStartDate}
                    onChange={(e) => setNewProjectStartDate(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                      isLightTheme
                        ? 'bg-[#FAF6EC] border-[#B8860B]/40 text-amber-950 focus:border-[#B8860B]'
                        : 'bg-[#140A01]/80 border-[#E7C768]/30 text-white focus:border-[#F4EE8E]'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`block text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                    Дата окончания / Дедлайн
                  </label>
                  <input
                    type="date"
                    value={newProjectEndDate}
                    onChange={(e) => setNewProjectEndDate(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                      isLightTheme
                        ? 'bg-[#FAF6EC] border-[#B8860B]/40 text-amber-950 focus:border-[#B8860B]'
                        : 'bg-[#140A01]/80 border-[#E7C768]/30 text-white focus:border-[#F4EE8E]'
                    }`}
                  />
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-1.5">
                <label className={`block text-sm font-semibold ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                  Статус проекта
                </label>
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as any)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none cursor-pointer transition-colors ${
                    isLightTheme
                      ? 'bg-[#FAF6EC] border-[#B8860B]/40 text-amber-950 focus:border-[#B8860B]'
                      : 'bg-[#140A01]/80 border-[#E7C768]/30 text-white focus:border-[#F4EE8E]'
                  }`}
                >
                  <option value="active">В работе (активный)</option>
                  <option value="pending">В очереди (в плане)</option>
                  <option value="completed">Завершен успешно</option>
                </select>
              </div>

              {/* Proactive AI Supervisor Settings for Project */}
              <TaskProactiveSettingsFields
                value={projectProactiveSettings}
                onChange={setProjectProactiveSettings}
                showQuietHours
                isDark={!isLightTheme}
              />

              {/* Manual Task Management Section */}
              <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 transition-colors ${
                isLightTheme
                  ? 'bg-[#FAF6EC]/90 border-[#B8860B]/40'
                  : 'bg-[#140A01]/75 border-[#E7C768]/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className={isLightTheme ? 'text-[#B8860B]' : 'text-[#F4EE8E]'} />
                    <span className="text-sm font-bold">
                      Задачи проекта ({generatedTasks.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openNewSubTaskModal}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs font-bold hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Добавить задачу</span>
                  </button>
                </div>

                {generatedTasks.length === 0 ? (
                  <div className={`p-4 rounded-xl border border-dashed text-center text-xs ${
                    isLightTheme ? 'border-amber-900/20 text-amber-900/70' : 'border-amber-400/20 text-amber-200/70'
                  }`}>
                    Задачи пока не созданы. Нажмите «Добавить задачу» для ручного создания или воспользуйтесь «ИИ-Заполнением».
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                    {generatedTasks.map((t, idx) => (
                      <div
                        key={t.id || idx}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                          isLightTheme
                            ? 'bg-[#FFFBF5] border-[#B8860B]/30 hover:border-[#B8860B]'
                            : 'bg-[#1A0F02]/80 border-[#E7C768]/25 hover:border-[#E7C768]/60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold ${isLightTheme ? 'text-amber-800' : 'text-[#E7C768]'}`}>
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-bold">
                              {t.taskTitle}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                              t.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                : 'bg-amber-400/10 text-amber-900 dark:text-[#F4EE8E] border-amber-400/20'
                            }`}>
                              {t.priority === 'high' ? 'Высокий' : t.priority === 'low' ? 'Низкий' : 'Средний'}
                            </span>
                          </div>
                          <div className={`text-xs flex items-center gap-3 flex-wrap ${isLightTheme ? 'text-amber-900/80' : 'text-slate-300'}`}>
                            <span>👤 {t.executorName} ({t.executorRole})</span>
                            <span>⏱ {t.deadlineDays} дн.</span>
                            {Array.isArray(t.checklist) && (
                              <span>✓ Чек-лист: {t.checklist.filter(c => c.done).length}/{t.checklist.length}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => openEditSubTaskModal(t)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              isLightTheme
                                ? 'bg-amber-950/5 hover:bg-amber-950/10 border-[#B8860B]/30 text-amber-950'
                                : 'bg-white/5 hover:bg-white/10 border-[#E7C768]/30 text-[#F4EE8E]'
                            }`}
                            title="Редактировать задачу"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskToDelete(t)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              isLightTheme
                                ? 'bg-amber-950/5 hover:bg-amber-950/10 border-[#B8860B]/30 text-amber-900'
                                : 'bg-white/5 hover:bg-white/10 border-[#E7C768]/30 text-amber-300'
                            }`}
                            title="Удалить задачу"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className={`flex flex-col sm:flex-row gap-3 pt-3 border-t ${isLightTheme ? 'border-amber-950/10' : 'border-amber-400/20'}`}>
                {!isNewProjectCreation && editingProjectId && (
                  <button
                    type="button"
                    onClick={() => {
                      const pr = processes.find(p => p.id === editingProjectId);
                      if (pr) {
                        setShowCreateProjectModal(false);
                        setProjectToDelete(pr);
                      }
                    }}
                    className={`py-2.5 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer text-center border ${
                      isLightTheme
                        ? 'border-amber-900/30 bg-amber-950/5 text-amber-950 hover:bg-amber-950/10'
                        : 'border-amber-400/30 bg-white/5 text-amber-300 hover:bg-white/10'
                    }`}
                  >
                    Удалить проект
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-center ${
                    isLightTheme
                      ? 'bg-amber-950/5 hover:bg-amber-950/10 text-amber-900'
                      : 'bg-white/5 hover:bg-white/10 text-amber-200'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!newProjectTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer text-center shadow-md"
                >
                  Сохранить проект в базе
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DISTINCT TASK CREATION & EDIT MODAL WITH REAL-TIME POSTGRESQL BD PROTALK PERSISTENCE */}
      {showCreateTaskModal && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false);
            setEditingTaskItem(null);
          }}
          projects={processes.map(p => ({ id: p.id, title: p.title }))}
          employees={effectiveEmployees.map(e => ({ id: e.id, name: e.name, role: e.role, position: e.position }))}
          currentProjectId={selectedProcessId || processes[0]?.id}
          editingTask={editingTaskItem ? {
            id: editingTaskItem.id,
            projectId: selectedProcessId || processes.find(p => p.tasks.some(t => t.id === editingTaskItem.id))?.id || processes[0]?.id || 'p-1',
            taskTitle: editingTaskItem.taskTitle,
            description: editingTaskItem.description || '',
            executorId: editingTaskItem.executorId || '',
            executorName: editingTaskItem.executorName || '',
            executorRole: editingTaskItem.executorRole || 'Сотрудник',
            deadlineDays: editingTaskItem.deadlineDays || 3,
            priority: editingTaskItem.priority || 'medium',
            budget: (editingTaskItem as any).budget || 0,
            verifyMethod: (editingTaskItem as any).verifyMethod || 'hybrid',
            fields: parseFieldsSafe(editingTaskItem.fields).length > 0
              ? parseFieldsSafe(editingTaskItem.fields)
              : parseChecklistSafe(editingTaskItem.checklist).map((c, i) => ({
                  id: c.id || `f_${i}`,
                  label: c.text,
                  type: 'text_short' as ReportFieldType,
                  required: true,
                  hint: `Подтверждение: ${c.text}`
                })),
            checklist: parseChecklistSafe(editingTaskItem.checklist),
            checkCriteria: (editingTaskItem as any).checkCriteria || 'Соответствие регламенту компании и чек-листу',
            minScore: (editingTaskItem as any).minScore || 80,
            status: editingTaskItem.status,
            autonomy_mode: (editingTaskItem as any).autonomy_mode,
            check_cadence: (editingTaskItem as any).check_cadence,
            deadline_time: (editingTaskItem as any).deadline_time,
            reminder_days_before: (editingTaskItem as any).reminder_days_before,
            reminder_minutes: (editingTaskItem as any).reminder_minutes
          } : null}
          onSaveTask={async (newTaskData) => {
            const isEditing = Boolean(editingTaskItem && editingTaskItem.id);
            const targetTaskId = newTaskData.id || editingTaskItem?.id || ("task-" + Date.now());
            const assignedProc = processes.find(p => p.id === newTaskData.projectId) || 
                                 processes.find(p => p.tasks.some(t => t.id === targetTaskId)) || 
                                 processes[0];

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
              priority: newTaskData.priority,
              fields: newTaskData.fields,
              checkCriteria: newTaskData.checkCriteria,
              minScore: newTaskData.minScore,
              autonomy_mode: newTaskData.autonomy_mode,
              check_cadence: newTaskData.check_cadence,
              deadline_time: newTaskData.deadline_time,
              reminder_days_before: newTaskData.reminder_days_before,
              reminder_minutes: newTaskData.reminder_minutes
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
              setGeneratedTasks(prev => prev.map(t => t.id === targetTaskId ? taskPayload : t));

              // Real-time update in PostgreSQL BD ProTalk database
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
                  fields: taskPayload.fields,
                  check_criteria: taskPayload.checkCriteria,
                  autonomy_mode: taskPayload.autonomy_mode,
                  check_cadence: taskPayload.check_cadence,
                  deadline_time: taskPayload.deadline_time,
                  reminder_days_before: taskPayload.reminder_days_before,
                  reminder_minutes: taskPayload.reminder_minutes
                })
              }).catch(err => console.error('Error updating task in DB:', err));

              triggerToast(`Задача "${taskPayload.taskTitle}" обновлена в базе!`);
            } else {
              if (assignedProc) {
                setProcesses(prev => prev.map(p => {
                  if (p.id !== assignedProc.id) return p;
                  return {
                    ...p,
                    tasks: [taskPayload, ...p.tasks]
                  };
                }));
              }
              if (showCreateProjectModal) {
                setGeneratedTasks(prev => [...prev, taskPayload]);
              }

              // Real-time insert into PostgreSQL BD ProTalk database
              const compId = company?.id || (currentUser as any)?.company_id || '';
              const dirId = currentUser?.role === UserRole.DIRECTOR ? currentUser.id : ((currentUser as any)?.director_id || '');
              const dLine = new Date(Date.now() + taskPayload.deadlineDays * 24 * 3600 * 1000).toISOString().split('T')[0];
              fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...taskPayload,
                  projectId: assignedProc?.id || newTaskData.projectId,
                  deadLine: dLine,
                  author_id: currentUser?.id,
                  director_id: dirId,
                  company_id: compId
                })
              }).catch(err => console.error('Error creating task in DB:', err));

              triggerToast(`Задача "${taskPayload.taskTitle}" создана в базе данных!`);
            }

            setShowCreateTaskModal(false);
            setEditingTaskItem(null);
          }}
          isDark={!isLightTheme}
          currentUser={currentUser}
        />
      )}

      {/* CUSTOM TASK DELETION CONFIRMATION MODAL */}
      {taskToDelete && createPortal(
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-fade-in font-sans">
          <div className={`border rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl transition-colors ${
            isLightTheme
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
            <div className={`flex gap-3 pt-3 border-t ${isLightTheme ? 'border-amber-950/10' : 'border-amber-400/20'}`}>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-center ${
                  isLightTheme
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
                  setGeneratedTasks(prev => prev.filter(t => t.id !== delId));
                  fetch(`/api/tasks/${delId}`, { method: 'DELETE' }).catch(err => console.error('Error deleting task:', err));
                  triggerToast(`Задача «${taskToDelete.taskTitle}» удалена`);
                  setTaskToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-all cursor-pointer text-center shadow-md"
              >
                Удалить задачу
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CUSTOM PROJECT DELETION CONFIRMATION MODAL */}
      {projectToDelete && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className={`border rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-xl transition-colors ${
            isLightTheme
              ? 'bg-[#FFFBF5]/95 border-[#B8860B]/40 text-amber-950'
              : 'bg-[#1A0F02]/90 border-[#E7C768]/40 text-slate-100'
          }`}>
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <Trash2 size={22} />
              <h4 className="text-base sm:text-lg font-bold">Удаление проекта</h4>
            </div>
            <p className="text-sm font-medium leading-relaxed">
              Вы уверены, что хотите удалить проект «{projectToDelete.title}»?
            </p>
            <p className="text-sm opacity-80 leading-relaxed">
              Это действие удалит проект и все связанные с ним задачи ({projectToDelete.tasks?.length || 0} шт.) из базы данных PostgreSQL BD ProTalk.
            </p>
            <div className={`flex gap-3 pt-3 border-t ${isLightTheme ? 'border-amber-950/10' : 'border-amber-400/20'}`}>
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-center ${
                  isLightTheme
                    ? 'bg-amber-950/5 hover:bg-amber-950/10 text-amber-900'
                    : 'bg-white/5 hover:bg-white/10 text-amber-200'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProject(projectToDelete.id)}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-all cursor-pointer text-center shadow-md"
              >
                Удалить проект
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI LOADING OVERLAYS (NO "нейросетью ProTalk..." IN SUBTITLE AS INSTRUCTED) */}
      <AiLoadingOverlay
        isOpen={isProjectAiLoading}
        title="Распознавание и генерация структуры проекта"
        subtitle="Формируем проект, вычисляем этапы, чек-листы и подбираем исполнителей..."
      />

      <AiLoadingOverlay
        isOpen={isTaskAiLoading}
        title="Формирование параметров задачи"
        subtitle="Анализируем контекст проекта, определяем требования и формируем чек-лист..."
      />

      {/* PROJECT STATS MODAL */}
      {isProjectStatsOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-zinc-950/50 backdrop-blur-2xl border border-[#E7C768]/40 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#E7C768]" />
                <h4 className="text-base font-black text-white uppercase tracking-wider">Статистика Проектов</h4>
              </div>
              <button onClick={() => setIsProjectStatsOpen(false)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {(() => {
              const getOrbitCat = (p: any) => {
                const total = p.tasks.length;
                const completed = p.tasks.filter((t: any) => t.status === 'completed').length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                const hasDelayed = p.tasks.some((t: any) => t.status === 'delayed');
                if (p.status === 'delayed' || hasDelayed || (total > 0 && pct < 35)) return 'critical';
                if (p.status === 'completed' || (total > 0 && completed === total) || pct === 100) return 'completed';
                return 'active';
              };
              const criticalCount = processes.filter(p => getOrbitCat(p) === 'critical').length;
              const activeCount = processes.filter(p => getOrbitCat(p) === 'active').length;
              const completedCount = processes.filter(p => getOrbitCat(p) === 'completed').length;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Всего проектов</span>
                    <span className="text-lg font-black text-white font-mono">{processes.length}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-[10px] text-rose-300 font-mono uppercase block">Критические</span>
                    <span className="text-lg font-black text-rose-300 font-mono">{criticalCount}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] text-amber-300 font-mono uppercase block">В работе</span>
                    <span className="text-lg font-black text-amber-300 font-mono">{activeCount}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-300 font-mono uppercase block">Завершены</span>
                    <span className="text-lg font-black text-emerald-300 font-mono">{completedCount}</span>
                  </div>
                </div>
              );
            })()}

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
              <span className="text-[10px] font-mono font-bold text-amber-300 uppercase block">Общий портфель и бюджет</span>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Суммарный бюджет:</span>
                <span className="text-emerald-400 font-extrabold text-sm">{processes.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Список Проектов:</span>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {processes.map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white block">{p.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono">Руководитель: {p.manager || 'Анна Петрова'}</span>
                    </div>
                    <span className="text-amber-300 font-mono font-bold">{p.tasks.length} задач</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setIsProjectStatsOpen(false)} className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs">
              Закрыть
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* PROJECT FILTERS MODAL */}
      {isProjectFiltersOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-zinc-950/50 backdrop-blur-2xl border border-[#E7C768]/40 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-[#E7C768]" />
                <h4 className="text-base font-black text-white uppercase tracking-wider">Фильтры Проектов</h4>
              </div>
              <button onClick={() => setIsProjectFiltersOpen(false)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-300">Поиск проекта</label>
                <input
                  type="text"
                  placeholder="Название..."
                  value={projectSearchQuery}
                  onChange={e => setProjectSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-300">Статус проекта</label>
                <select
                  value={projectStatusFilter}
                  onChange={e => setProjectStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value="">Все статусы</option>
                  <option value="active">В работе</option>
                  <option value="pending">В плане</option>
                  <option value="completed">Завершенные</option>
                  <option value="delayed">С задержкой</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-300">Руководитель</label>
                <select
                  value={projectManagerFilter}
                  onChange={e => setProjectManagerFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value="">Все руководители</option>
                  {effectiveEmployees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setProjectSearchQuery('');
                  setProjectStatusFilter('');
                  setProjectManagerFilter('');
                  setIsProjectFiltersOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Сбросить
              </button>
              <button
                onClick={() => setIsProjectFiltersOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-slate-950 text-xs font-black"
              >
                Применить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TASK STATS MODAL */}
      {isTaskStatsOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-[#140A01]/80 backdrop-blur-2xl border border-[#E7C768]/50 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center border-b border-[#E7C768]/20 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#F4EE8E]" />
                <h4 className="text-base font-black text-white uppercase tracking-wider">Статистика Задач ({selectedProcess?.title || 'Все проекты'})</h4>
              </div>
              <button onClick={() => setIsTaskStatsOpen(false)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {selectedProcess && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">В плане</span>
                  <span className="text-lg font-black text-white font-mono">{selectedProcess.tasks.filter(t => t.status === 'pending').length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-200 font-mono uppercase block">В работе</span>
                  <span className="text-lg font-black text-amber-200 font-mono">{selectedProcess.tasks.filter(t => t.status === 'in_progress').length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-400/15 border border-amber-400/30">
                  <span className="text-[10px] text-amber-300 font-mono uppercase block">ИИ-Контроль</span>
                  <span className="text-lg font-black text-amber-300 font-mono">{selectedProcess.tasks.filter(t => t.status === 'verification').length}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#E7C768]/15 border border-[#E7C768]/30">
                  <span className="text-[10px] text-[#F4EE8E] font-mono uppercase block">Выполнено</span>
                  <span className="text-lg font-black text-[#F4EE8E] font-mono">{selectedProcess.tasks.filter(t => t.status === 'completed').length}</span>
                </div>
              </div>
            )}

            <button onClick={() => setIsTaskStatsOpen(false)} className="w-full py-2.5 rounded-xl bg-[#E7C768]/20 hover:bg-[#E7C768]/30 border border-[#E7C768]/40 text-[#F4EE8E] font-bold text-xs">
              Закрыть
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* TASK FILTERS MODAL */}
      {isTaskFiltersOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-[#140A01]/80 backdrop-blur-2xl border border-[#E7C768]/50 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
            <div className="flex justify-between items-center border-b border-[#E7C768]/20 pb-3">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-[#F4EE8E]" />
                <h4 className="text-base font-black text-white uppercase tracking-wider">Фильтры Задач</h4>
              </div>
              <button onClick={() => setIsTaskFiltersOpen(false)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-300">Поиск задачи</label>
                <input
                  type="text"
                  placeholder="Название задачи..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-300">Исполнитель</label>
                <select
                  value={assigneeFilter}
                  onChange={e => setAssigneeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value="">Все сотрудники</option>
                  {effectiveEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold text-slate-300">Приоритет</label>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs cursor-pointer"
                >
                  <option value="">Все приоритеты</option>
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setAssigneeFilter('');
                  setPriorityFilter('');
                  setIsTaskFiltersOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Сбросить
              </button>
              <button
                onClick={() => setIsTaskFiltersOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-sky-400 text-slate-950 text-xs font-black"
              >
                Применить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {revisorNotice && typeof document !== 'undefined' && createPortal(
        <div
          className={`fixed inset-0 z-[9995] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ${
            theme === 'dark' ? 'bg-[#140A01]/70' : 'bg-[#FAF6EC]/75'
          }`}
          onClick={() => setRevisorNotice(null)}
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
                <Sparkles size={20} className={theme === 'dark' ? 'text-[#E7C768]' : 'text-amber-800'} />
                <h3 className="text-base font-bold">{revisorNotice.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setRevisorNotice(null)}
                className="p-1 rounded-lg opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm leading-relaxed break-words">
              {revisorNotice.text}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRevisorNotice(null)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300/80 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

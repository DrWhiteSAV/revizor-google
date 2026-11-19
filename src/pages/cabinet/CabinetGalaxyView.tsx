import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Zap, ArrowLeft, ZoomIn, ZoomOut, RotateCcw, 
  CheckCircle2, Link, Trash2, Play, ShieldCheck, Clock,
  ChevronLeft, ChevronRight, Search, Info, Shield, Globe,
  LayoutGrid, List, Plus, Filter, Layers, Pause, BarChart3,
  Award, Calendar, MessageSquare, Activity, Cpu, BookOpen, FileText, Sliders,
  Flame, AlertTriangle, ArrowRight, DollarSign, User, Users, Star, Check, Edit3, Send
} from 'lucide-react';
import { 
  isTaskMine as checkTaskMineUnified, 
  isProjectMine as checkProjectMineUnified,
  isTaskFromMe as checkTaskFromMeUnified,
  isProjectFromMe as checkProjectFromMeUnified
} from '../../utils/taskFilters';

const HUD_NAVIGATION_ITEMS = [
  { id: 'revisor_tasks', name: '🪐 Карта Ревизора', shortName: 'Карта Ревизора', desc: 'Проекты, задачи и чек-листы как звездные системы', icon: Globe },
  { id: 'revisor_kanban', name: '📋 ИИ Канбан-Доска', shortName: 'ИИ Канбан', desc: 'Проекты, задачи и чек-листы', icon: LayoutGrid },
  { id: 'revisor_scrum', name: '🏆 ИИ Скрам-Мастер', shortName: 'Скрам-Мастер', desc: 'Спринты и ретроспективы', icon: Award },
  { id: 'revisor_gantt', name: '📅 Диаграмма Ганта', shortName: 'Диаграмма Ганта', desc: 'Календарь и сроки проектов', icon: Calendar },
  { id: 'revisor_analytics', name: '📊 Аналитика Ревизора', shortName: 'Аналитика', desc: 'Метрики выполнения и дедлайны', icon: Layers },
  { id: 'revisor_doctor', name: '🩺 ИИ Доктор Проектов', shortName: 'Доктор Проектов', desc: 'Анализ рисков и здоровья спринтов', icon: Activity },
];

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
  status: 'pending' | 'active' | 'completed' | 'delayed';
  tasks: RevisorTask[];
  evaluation: string;
  recommendations: string;
  budget?: number;
  manager?: string;
}

interface CabinetGalaxyViewProps {
  company?: any;
  processes: BusinessProcess[];
  setProcesses: React.Dispatch<React.SetStateAction<BusinessProcess[]>>;
  currentUser: any;
  mockEmployees: any[];
  theme: 'dark' | 'light';
  startVerificationProcess: (task: any) => void;
  viewMode?: 'kanban' | 'list' | 'galaxy';
  setViewMode?: React.Dispatch<React.SetStateAction<'kanban' | 'list' | 'galaxy'>>;
  mode?: 'projects' | 'tasks';
  selectedProjectId?: string | null;
  setSelectedProjectId?: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenCreateModal?: () => void;
  onOpenStatsModal?: () => void;
  onOpenFiltersModal?: () => void;
  isStatsModalOpen?: boolean;
  setIsStatsModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFiltersModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQuickTaskModal?: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery?: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
  totalTasksCount?: number;
  activeFiltersCount?: number;
  handleTabClick?: (tabId: string) => void;
  onNavigate?: (path: string) => void;
  onSelectProject?: (projId: string) => void;
  onOpenProjectInfoModal?: (projId: string) => void;
  setShowProjectCardId?: (projId: string | null) => void;
}

// Interface to keep track of dynamic orbital states of satellites
interface OrbitalState {
  taskId: string;
  angle: number;
  speed: number;
  radiusX: number;
  radiusY: number;
  inclination: number; // orbital tilt in degrees
  direction: number; // 1 or -1
}

export default function CabinetGalaxyView({
  company,
  processes,
  setProcesses,
  currentUser,
  mockEmployees,
  theme,
  startVerificationProcess,
  viewMode = 'galaxy',
  setViewMode,
  mode = 'projects',
  selectedProjectId: externalSelectedProjectId,
  setSelectedProjectId: externalSetSelectedProjectId,
  onOpenCreateModal,
  onOpenStatsModal,
  onOpenFiltersModal,
  isStatsModalOpen = false,
  setIsStatsModalOpen,
  setIsFiltersModalOpen,
  setShowQuickTaskModal,
  searchQuery: externalSearchQuery,
  setSearchQuery: setExternalSearchQuery,
  totalTasksCount = 0,
  activeFiltersCount = 0,
  handleTabClick,
  onNavigate,
  onSelectProject,
  onOpenProjectInfoModal,
  setShowProjectCardId
}: CabinetGalaxyViewProps) {
  // Navigation level: 'universe' (all projects) or 'galaxy' (single project solar system)
  const [zoomLevel, setZoomLevel] = useState<'universe' | 'galaxy'>(
    mode === 'tasks' ? 'galaxy' : 'universe'
  );
  const [internalSelectedProjectId, setInternalSelectedProjectId] = useState<string | null>(
    externalSelectedProjectId !== undefined ? externalSelectedProjectId : (mode === 'tasks' ? (processes.length > 0 ? processes[0].id : null) : null)
  );

  const selectedProjectId = externalSelectedProjectId !== undefined
    ? externalSelectedProjectId
    : internalSelectedProjectId;

  const setSelectedProjectId = (id: string | null) => {
    if (externalSetSelectedProjectId) externalSetSelectedProjectId(id);
    setInternalSelectedProjectId(id);
  };

  useEffect(() => {
    if (mode === 'projects') {
      setZoomLevel('universe');
    } else if (mode === 'tasks') {
      setZoomLevel('galaxy');
    } else if (externalSelectedProjectId) {
      setZoomLevel('galaxy');
    }
  }, [externalSelectedProjectId, mode]);
  
  // Selected task in detail drawer
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Keep track of tasks & universe orbital motion
  const [isPlaying, setIsPlaying] = useState(true);

  // Variant 2: Planetary Orbit Revision Map States
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'critical' | 'active' | 'completed'>('all');
  const [scopeFilter, setScopeFilter] = useState<'mine' | 'from_me' | 'all'>('mine');

  const isProjectMine = (p: BusinessProcess): boolean => {
    return checkProjectMineUnified(p, currentUser);
  };

  const isProjectFromMe = (p: BusinessProcess): boolean => {
    return checkProjectFromMeUnified(p, currentUser);
  };

  const isTaskMine = (t: RevisorTask | any, p?: BusinessProcess): boolean => {
    return checkTaskMineUnified(t, currentUser);
  };

  const isTaskFromMe = (t: RevisorTask | any, p?: BusinessProcess): boolean => {
    return checkTaskFromMeUnified(t, currentUser);
  };
  const [selectedUniverseProjectId, setSelectedUniverseProjectId] = useState<string | null>(null);
  const [showInternalProjectModal, setShowInternalProjectModal] = useState<boolean>(false);
  const [showStatsPyramidModal, setShowStatsPyramidModal] = useState<boolean>(false);
  const [editingTaskItem, setEditingTaskItem] = useState<any | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  // Seed state for randomized orbit positions/angles in 3D space
  const [orbitSeed, setOrbitSeed] = useState(() => Math.random() * 1000);

  // Randomize orbit space positions on filter change or page re-entry
  useEffect(() => {
    setOrbitSeed(Math.random() * 1000);
  }, [selectedStatusFilter, mode, zoomLevel]);

  // Helper to calculate task completion % considering checklist + time
  const calculateTaskCompletionPercentage = (task: RevisorTask): number => {
    if (task.status === 'completed') return 100;
    let checklistPct = 0;
    if (task.checklist && task.checklist.length > 0) {
      const done = task.checklist.filter(c => c.done).length;
      checklistPct = Math.round((done / task.checklist.length) * 100);
    } else {
      checklistPct = task.status === 'in_progress' ? 50 : task.status === 'verification' ? 85 : 15;
    }
    let timePct = 50;
    if (task.durationDays && task.durationDays > 0) {
      const start = task.startDay || 1;
      const elapsed = Math.max(0, 10 - start);
      timePct = Math.min(100, Math.round((elapsed / task.durationDays) * 100));
    } else if (task.deadlineDays !== undefined) {
      if (task.deadlineDays <= 0) {
        timePct = 100;
      } else {
        timePct = Math.min(100, Math.max(10, Math.round(((10 - task.deadlineDays) / 10) * 100)));
      }
    }
    let result = Math.round(checklistPct * 0.7 + timePct * 0.3);
    if (task.status === 'verification') result = Math.max(result, 85);
    if (task.status === 'delayed') result = Math.max(result, 35);
    return Math.max(10, Math.min(99, result));
  };

  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // States for scrollable 3D universe
  const [activeUniverseIndex, setActiveUniverseIndex] = useState(0);

  // Sync external search query
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = setExternalSearchQuery !== undefined ? setExternalSearchQuery : setLocalSearchQuery;

  // Auto-scale zoom level: default 100% scale for both mobile and PC
  const getInitialZoom = (level: 'universe' | 'galaxy' = zoomLevel) => {
    return 1.0; // 100% initial size for both mobile and PC on all map routes
  };

  const getBaseZoom = (level: 'universe' | 'galaxy' = zoomLevel) => {
    return getInitialZoom(level);
  };

  // Pan and Zoom multipliers
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(() => getInitialZoom('universe'));
  
  // Parallax offset variables
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [waveAngle, setWaveAngle] = useState(0);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Graph Link editor state ("как назначаются графы задач")
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [linkSourceTaskId, setLinkSourceTaskId] = useState<string | null>(null);
  const [linkTargetTaskId, setLinkTargetTaskId] = useState<string>('');

  // Extract selected project
  const selectedProject = processes.find(p => p.id === selectedProjectId);

  // Tasks filtered for the active project
  const selectedProjectTasks = React.useMemo(() => {
    if (!selectedProject?.tasks) return [];
    let list = selectedProject.tasks;
    if (scopeFilter === 'mine') {
      list = list.filter(t => isTaskMine(t, selectedProject));
    } else if (scopeFilter === 'from_me') {
      list = list.filter(t => isTaskFromMe(t, selectedProject));
    }
    return list;
  }, [selectedProject?.tasks, scopeFilter, currentUser]);

  // High-performance continuous animation clock (60fps smooth on desktop, 30fps optimized frame-pacing on mobile, zero lag)
  const [animTime, setAnimTime] = useState(0);
  const animTimeRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animId: number;
    lastTimeRef.current = performance.now();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const targetFpsInterval = isMobile ? 32 : 16; // 30 FPS target on mobile to prevent CPU/battery load

    const animate = (now: number) => {
      if (document.hidden) {
        animId = requestAnimationFrame(animate);
        return;
      }

      if (lastTimeRef.current !== null) {
        const delta = now - lastTimeRef.current;
        if (delta >= targetFpsInterval) {
          animTimeRef.current += Math.min(delta, 100);
          setAnimTime(animTimeRef.current);
          lastTimeRef.current = now;
        }
      } else {
        lastTimeRef.current = now;
      }
      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Continuous rotation angles for Universe Map (80% of current speed)
  const universeRotations = {
    critical: (animTime * 0.00032) % (Math.PI * 2),
    active: (-animTime * 0.00024) % (Math.PI * 2),
    completed: (animTime * 0.00016) % (Math.PI * 2),
  };

  // Helper to calculate Task Orbit state dynamically & smoothly from animTime (reduced speed by 1.5x per user request)
  const getTaskOrbit = (task: RevisorTask, index: number, totalTasks: number) => {
    const radiusX = 200 + index * 55; // Spacious orbit radii so nodes never gather at center
    const radiusY = radiusX * 0.58;
    const inclination = -20 + ((index * 17) % 40);
    const direction = index % 2 === 0 ? 1 : -1;
    const speed = ((0.0004 + (index % 3) * 0.0002) * 0.7) / 1.5; // Task orbital rotation speed reduced by 1.5x
    const baseAngle = (index * (Math.PI * 2)) / Math.max(1, totalTasks);
    const currentAngle = baseAngle + (animTime * speed * direction);

    return {
      radiusX,
      radiusY,
      inclination,
      direction,
      angle: currentAngle,
    };
  };

  // Handle Drag to Pan (perfect for desktop mouse & mobile touch)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
    lastTouchDistance.current = null;
  };

  const lastTouchDistance = useRef<number | null>(null);

  // Touch Support for Mobile with zoom/pinch gesture and pan ("удобно для мобильной навигации графов")
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
      lastTouchDistance.current = null;
    } else if (e.touches.length === 2) {
      isDragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current) {
      setPan({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist - lastTouchDistance.current;
      
      setZoom(z => {
        const factor = delta > 0 ? 0.04 : -0.04;
        return Math.max(0.15, Math.min(2.5, z + factor));
      });
      lastTouchDistance.current = dist;
    }
  };

  // Smooth mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 0.08;
    if (e.deltaY < 0) {
      setZoom(z => Math.min(2.5, z + zoomFactor));
    } else {
      setZoom(z => Math.max(0.15, z - zoomFactor));
    }
  };

  const handlePrevGalaxy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (filteredProjects.length === 0) return;
    setActiveUniverseIndex(prev => (prev - 1 + filteredProjects.length) % filteredProjects.length);
  };

  const handleNextGalaxy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (filteredProjects.length === 0) return;
    setActiveUniverseIndex(prev => (prev + 1) % filteredProjects.length);
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(z => Math.min(3.0, Number((z + 0.15).toFixed(2))));
  };
  
  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(z => Math.max(0.15, Number((z - 0.15).toFixed(2))));
  };
  
  const handleResetView = (targetLevel: 'universe' | 'galaxy' | React.MouseEvent = zoomLevel) => {
    if (typeof targetLevel !== 'string') {
      targetLevel.stopPropagation();
    }
    const lvl = typeof targetLevel === 'string' ? targetLevel : zoomLevel;
    setPan({ x: 0, y: 0 });
    setZoom(getInitialZoom(lvl));
    setParallaxOffset({ x: 0, y: 0 });
  };

  // Toggle checklist inside details drawer
  const handleToggleCheckItem = (taskId: string, checkId: string) => {
    if (!selectedProjectId) return;
    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            checklist: t.checklist.map(c => c.id === checkId ? { ...c, done: !c.done } : c)
          };
        })
      };
    }));
  };

  // Assign or Delete task graph connection/dependency ("как назначаются графы задач")
  const handleAssignDependency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !linkSourceTaskId || !linkTargetTaskId) return;

    setProcesses(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== linkSourceTaskId) return t;
          return { ...t, dependentOnTaskId: linkTargetTaskId === 'clear' ? null : linkTargetTaskId };
        })
      };
    }));

    setShowLinkEditor(false);
    setLinkSourceTaskId(null);
    setLinkTargetTaskId('');
  };

  // Quick stats calculations
  const calculateProjectMetrics = (proj: BusinessProcess) => {
    const total = proj.tasks.length;
    const completed = proj.tasks.filter(t => t.status === 'completed').length;
    const scoreSum = proj.tasks.reduce((acc, t) => acc + (t.score || 0), 0);
    const avgScore = completed > 0 ? Math.round(scoreSum / completed) : 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, avgScore, pct };
  };

  // Filter galaxies / projects or tasks based on search and onlyMine/onlyFromMe (exclude archived projects from orbit maps)
  const filteredProjects = processes.filter(p => {
    if ((p.status as string) === 'archived') return false;
    if (scopeFilter === 'mine' && !isProjectMine(p)) return false;
    if (scopeFilter === 'from_me' && !isProjectFromMe(p)) return false;
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tasks.some(t => t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Orbit category helper for Variant 2 Planetary Orbits
  const getProjectOrbitCategory = (proj: BusinessProcess): 'critical' | 'active' | 'completed' => {
    const metrics = calculateProjectMetrics(proj);
    const hasDelayedTasks = proj.tasks.some(t => t.status === 'delayed');
    if (proj.status === 'delayed' || hasDelayedTasks || (metrics.total > 0 && metrics.pct < 35)) {
      return 'critical';
    }
    if (proj.status === 'completed' || (metrics.total > 0 && metrics.completed === metrics.total) || metrics.pct === 100) {
      return 'completed';
    }
    return 'active';
  };

  const orbitGroupedProjects = React.useMemo(() => {
    const critical: BusinessProcess[] = [];
    const active: BusinessProcess[] = [];
    const completed: BusinessProcess[] = [];

    filteredProjects.forEach(proj => {
      const cat = getProjectOrbitCategory(proj);
      if (cat === 'critical') critical.push(proj);
      else if (cat === 'completed') completed.push(proj);
      else active.push(proj);
    });

    return { critical, active, completed };
  }, [filteredProjects]);

  // Mathematically aligned 3D Elliptical Orbit parameters (randomized on filter/re-entry, 150% radius for Completed in active view)
  const random3DOrbitParams = React.useMemo<{
    critical: { rx: number; ry: number; tilt: number; rotate: number; eccentricity: number };
    active: { rx: number; ry: number; tilt: number; rotate: number; eccentricity: number };
    completed: { rx: number; ry: number; tilt: number; rotate: number; eccentricity: number };
  }>(() => {
    const pseudoRand = (offset: number) => {
      const x = Math.sin(orbitSeed + offset) * 10000;
      return x - Math.floor(x);
    };

    // When a specific status filter is active, adjust orbit ellipse radii to fit comfortably:
    const critScale = selectedStatusFilter === 'critical' ? (1 / 1.5) : 1;
    const actScale = selectedStatusFilter === 'active' ? (1 / 2.0) : 1;
    const compScale = selectedStatusFilter === 'completed' ? (1 / 3.0) : 1;

    // Randomize angles and tilts in 3D space on filter/re-entry
    const critRot = Math.round(15 + pseudoRand(1) * 70);
    const critTilt = Math.round(-30 + pseudoRand(2) * 50);

    const actRot = Math.round(-40 + pseudoRand(3) * 70);
    const actTilt = Math.round(10 + pseudoRand(4) * 50);

    const compRot = Math.round(20 + pseudoRand(5) * 70);
    const compTilt = Math.round(-35 + pseudoRand(6) * 50);

    // Requirement 6: Completed trajectory ellipse in active view is 150% of current radius (450 * 1.5 = 675, 260 * 1.5 = 390)
    const completedBaseRx = 675;
    const completedBaseRy = 390;

    return {
      critical: { rx: 220 * critScale, ry: 130 * critScale, tilt: critTilt, rotate: critRot, eccentricity: 0.59 },
      active: { rx: 330 * actScale, ry: 190 * actScale, tilt: actTilt, rotate: actRot, eccentricity: 0.58 },
      completed: { rx: completedBaseRx * compScale, ry: completedBaseRy * compScale, tilt: compTilt, rotate: compRot, eccentricity: 0.57 },
    };
  }, [selectedStatusFilter, orbitSeed]);

  // Helper to compute 3D position on rotated ellipse
  const get3DEllipsePoint = (
    params: { rx: number; ry: number; tilt: number; rotate: number; eccentricity: number },
    angleRad: number,
    centerX = 550,
    centerY = 550
  ) => {
    const x0 = params.rx * Math.cos(angleRad);
    const y0 = params.ry * Math.sin(angleRad);

    const rotRad = (params.rotate * Math.PI) / 180;
    const xRot = x0 * Math.cos(rotRad) - y0 * Math.sin(rotRad);
    const yRot = x0 * Math.sin(rotRad) + y0 * Math.cos(rotRad);

    const sinAngle = Math.sin(angleRad);
    const zScale = 0.85 + 0.3 * ((sinAngle + 1) / 2); // 0.85 to 1.15 for depth scaling
    const zIndex = Math.floor(20 + 15 * sinAngle);    // 5 to 35 for 3D layering
    const opacity = 0.8 + 0.2 * ((sinAngle + 1) / 2);

    return {
      x: centerX + xRot,
      y: centerY + yRot,
      zScale,
      zIndex,
      opacity,
    };
  };

  // Company Name for Central Supernova Nebula with real-time synchronization directly from DB truth
  const [liveCompanyName, setLiveCompanyName] = useState<string>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('company_name') : '';
    if (stored && stored.trim()) return stored.trim();
    if (company?.name && company.name.trim()) return company.name.trim();
    return (currentUser as any)?.company || 'Моя Компания';
  });

  const fetchCompanyTruth = useCallback(async () => {
    try {
      const uId = currentUser?.id || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('rr_user') || '{}')?.id : '');
      const cId = company?.id || (currentUser as any)?.company_id || (typeof localStorage !== 'undefined' ? localStorage.getItem('company_id') || '' : '');
      const params = new URLSearchParams();
      if (uId) params.set('user_id', uId);
      if (cId) params.set('company_id', cId);
      const res = await fetch(`/api/company/my?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.company?.name) {
          setLiveCompanyName(data.company.name);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('company_name', data.company.name);
          }
        }
      }
    } catch {
      // silent fallback
    }
  }, [currentUser?.id, (currentUser as any)?.company_id, company?.id]);

  useEffect(() => {
    if (company?.name && company.name.trim()) {
      setLiveCompanyName(company.name.trim());
    }
    fetchCompanyTruth();
  }, [company?.name, fetchCompanyTruth]);

  useEffect(() => {
    const handleCompanyUpdate = (e: any) => {
      const newName = e.detail?.name || e.detail?.companyName;
      if (newName) {
        setLiveCompanyName(newName);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('company_name', newName);
        }
      }
      fetchCompanyTruth();
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'company_name' && e.newValue) {
        setLiveCompanyName(e.newValue);
      }
    };
    window.addEventListener('company_updated', handleCompanyUpdate);
    window.addEventListener('db-company-updated', handleCompanyUpdate);
    window.addEventListener('db-updated', handleCompanyUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('company_updated', handleCompanyUpdate);
      window.removeEventListener('db-company-updated', handleCompanyUpdate);
      window.removeEventListener('db-updated', handleCompanyUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchCompanyTruth]);

  const dbCompanyName = liveCompanyName || 'Моя Компания';

  const selectedUniverseProject = processes.find(p => p.id === selectedUniverseProjectId);

  // Slow automated cosmic sway values
  const swayX = Math.sin(waveAngle) * 10;
  const swayY = Math.cos(waveAngle * 0.8) * 10;

  return (
    <div className="relative w-full min-h-[78vh] h-[78vh] md:h-[84vh] lg:h-[88vh] overflow-hidden select-none transition-all duration-300 bg-transparent border-0 shadow-none" id="galaxy-view-main-container">
      
      {/* HUD: TOP UNIFIED TOOLBAR - LEFT (VIEW SWITCHER) & RIGHT (ACTIONS & SEARCH) */}
      <div className="absolute top-16 sm:top-2 inset-x-2 z-30 flex items-center justify-between pointer-events-auto px-1 sm:px-2 gap-2" id="galaxy-hud-top-bar">
        {/* LEFT: Back Button + View Mode Switcher */}
        <div className="flex items-center gap-2">
          {(zoomLevel === 'galaxy' || mode === 'tasks') && (
            <button
              onClick={() => {
                if (mode === 'tasks') {
                  if (handleTabClick) handleTabClick('revisor_projects_map');
                  if (onNavigate) onNavigate('/cabinet/revisor/map');
                } else {
                  setZoomLevel('universe');
                  setSelectedProjectId(null);
                  setSelectedTaskId(null);
                  handleResetView('universe');
                  if (onNavigate) onNavigate('/cabinet/revisor/map');
                }
              }}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-black uppercase ${
                theme === 'dark'
                  ? 'border-[#E7C768]/30 bg-zinc-950/80 text-[#E7C768] hover:bg-zinc-900 shadow-md'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 shadow-md'
              }`}
              title={mode === 'tasks' ? "Вернуться к проектам" : "Назад в каталог проектов"}
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline font-sans">{mode === 'tasks' ? 'К проектам' : 'Назад'}</span>
            </button>
          )}

          {(zoomLevel === 'universe' || zoomLevel === 'galaxy' || mode === 'tasks') && (
            <div className={`flex items-center border p-0.5 rounded-xl backdrop-blur-md shadow-md ${
              theme === 'dark' ? 'bg-zinc-950/80 border-amber-500/30' : 'bg-white border-zinc-200'
            }`}>
              <button
                onClick={() => {
                  setViewMode?.('galaxy');
                  if (selectedProjectId) {
                    if (onNavigate) onNavigate(`/cabinet/revisor/${selectedProjectId}/map`);
                    else if (handleTabClick) handleTabClick('revisor_tasks_map');
                  } else {
                    if (onNavigate) onNavigate('/cabinet/revisor/map');
                    else if (handleTabClick) handleTabClick('revisor_projects_map');
                  }
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 ${
                  viewMode === 'galaxy'
                    ? (theme === 'dark' 
                        ? 'bg-amber-500/20 text-[#F4EE8E] border-amber-400/50 shadow-[0_0_12px_rgba(231,199,104,0.35)] font-bold' 
                        : 'bg-amber-100 text-amber-950 border-amber-300 shadow-[0_2px_8px_rgba(180,110,40,0.2)] font-bold')
                    : (theme === 'dark'
                        ? 'bg-transparent text-[#F4EE8E] border-transparent hover:bg-amber-400/10'
                        : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-950 hover:bg-zinc-100')
                }`}
                title="Карта"
              >
                <Globe size={14} className={theme === 'dark' ? 'text-[#F4EE8E]' : ''} />
                <span className="hidden md:inline text-[11px] font-sans">
                  Карта
                </span>
              </button>

              <button
                onClick={() => {
                  setViewMode?.('kanban');
                  const path = selectedProjectId ? `/cabinet/revisor/${selectedProjectId}/kanban` : '/cabinet/revisor/kanban';
                  window.history.pushState({}, '', path);
                  if (onNavigate) onNavigate(path);
                  else if (handleTabClick) handleTabClick(selectedProjectId ? 'revisor_tasks_kanban' : 'revisor_projects_kanban');
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 ${
                  viewMode === 'kanban'
                    ? (theme === 'dark' 
                        ? 'bg-amber-500/20 text-[#F4EE8E] border-amber-400/50 shadow-[0_0_12px_rgba(231,199,104,0.35)] font-bold' 
                        : 'bg-amber-100 text-amber-950 border-amber-300 shadow-[0_2px_8px_rgba(180,110,40,0.2)] font-bold')
                    : (theme === 'dark'
                        ? 'bg-transparent text-[#F4EE8E] border-transparent hover:bg-amber-400/10'
                        : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-950 hover:bg-zinc-100')
                }`}
                title="Канбан"
              >
                <LayoutGrid size={14} className={theme === 'dark' ? 'text-[#F4EE8E]' : ''} />
                <span className="hidden md:inline text-[11px] font-sans">Канбан</span>
              </button>

              <button
                onClick={() => {
                  setViewMode?.('list');
                  const path = selectedProjectId ? `/cabinet/revisor/${selectedProjectId}/table` : '/cabinet/revisor/table';
                  window.history.pushState({}, '', path);
                  if (onNavigate) onNavigate(path);
                  else if (handleTabClick) handleTabClick(selectedProjectId ? 'revisor_tasks_table' : 'revisor_projects_table');
                }}
                className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 ${
                  viewMode === 'list'
                    ? (theme === 'dark' 
                        ? 'bg-amber-500/20 text-[#F4EE8E] border-amber-400/50 shadow-[0_0_12px_rgba(231,199,104,0.35)] font-bold' 
                        : 'bg-amber-100 text-amber-950 border-amber-300 shadow-[0_2px_8px_rgba(180,110,40,0.2)] font-bold')
                    : (theme === 'dark'
                        ? 'bg-transparent text-[#F4EE8E] border-transparent hover:bg-amber-400/10'
                        : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-950 hover:bg-zinc-100')
                }`}
                title="Таблица"
              >
                <List size={14} className={theme === 'dark' ? 'text-[#F4EE8E]' : ''} />
                <span className="hidden md:inline text-[11px] font-sans">Таблица</span>
              </button>

              {!selectedProjectId && mode !== 'tasks' && (
                <button
                  onClick={() => {
                    if (onNavigate) onNavigate('/cabinet/revisor/gantt');
                    else if (handleTabClick) handleTabClick('revisor_gantt');
                  }}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1.5 ${
                    theme === 'dark'
                      ? 'bg-transparent text-[#F4EE8E] border-transparent hover:bg-amber-400/10'
                      : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-950 hover:bg-zinc-100'
                  }`}
                  title="Гант"
                >
                  <Calendar size={14} className={theme === 'dark' ? 'text-[#F4EE8E]' : ''} />
                  <span className="hidden md:inline text-[11px] font-sans">Гант</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Search + Stats + Filters + Create Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search Input */}
          <div className={`flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border backdrop-blur-md transition-all shadow-md ${
            theme === 'dark' ? 'bg-zinc-950/80 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-800'
          }`}>
            <Search size={14} className="text-zinc-950 dark:text-[#F4EE8E] shrink-0 mr-1" />
            <input
              type="text"
              placeholder={zoomLevel === 'galaxy' ? "Поиск задач..." : "Поиск проектов..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-[11px] outline-none border-0 p-0 focus:ring-0 text-zinc-950 dark:text-[#F4EE8E] placeholder:text-zinc-800 dark:placeholder:text-[#F4EE8E]/80 w-16 sm:w-24 md:w-36 font-bold"
            />
          </div>

          {/* Statistics */}
          <button
            onClick={() => onOpenStatsModal ? onOpenStatsModal() : setIsStatsModalOpen?.(true)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-bold uppercase relative backdrop-blur-md shadow-md ${
              theme === 'dark'
                ? 'border-[#E7C768]/30 bg-zinc-950/80 text-[#E7C768] hover:bg-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
            }`}
            title="Статистика"
          >
            <Layers size={14} />
            <span className="hidden lg:inline font-sans text-[11px]">Статистика</span>
            {totalTasksCount > 0 && (
              <span className="bg-[#E7C768] text-zinc-950 px-1.5 py-0.2 rounded-full text-[9px] font-black font-mono">
                {totalTasksCount}
              </span>
            )}
          </button>

          {/* Filters */}
          <button
            onClick={() => onOpenFiltersModal ? onOpenFiltersModal() : setIsFiltersModalOpen?.(true)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-sm font-bold relative backdrop-blur-md shadow-md ${
              theme === 'dark'
                ? 'border-[#E7C768]/30 bg-zinc-950/80 text-[#E7C768] hover:bg-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
            }`}
            title="Фильтры"
          >
            <Filter size={15} />
            <span className="hidden lg:inline font-sans text-sm">Фильтры</span>
            {activeFiltersCount > 0 && (
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
                ? theme === 'dark'
                  ? 'border-amber-400 bg-amber-500/25 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.3)] font-black'
                  : 'border-amber-500 bg-amber-200 text-amber-950 font-black shadow-md'
                : theme === 'dark'
                  ? 'border-[#E7C768]/30 bg-zinc-950/80 text-[#E7C768]/80 hover:bg-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
            }`}
            title="Переключатель проектов и задач: Мои → От меня → Все (кликните для смены)"
          >
            {scopeFilter === 'mine' && (
              <>
                <User size={15} className="text-[#F4EE8E] dark:text-[#F4EE8E]" />
                <span className="font-sans text-sm">Мои</span>
                <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">1/3</span>
              </>
            )}
            {scopeFilter === 'from_me' && (
              <>
                <Send size={14} className="text-[#F4EE8E] dark:text-[#F4EE8E]" />
                <span className="font-sans text-sm">От меня</span>
                <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-950/20">2/3</span>
              </>
            )}
            {scopeFilter === 'all' && (
              <>
                <Users size={15} />
                <span className="font-sans text-sm">Все</span>
                <span className="text-[10px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-amber-400/20">3/3</span>
              </>
            )}
          </button>

          {/* Create Button */}
          <button
            onClick={() => {
              if (zoomLevel === 'universe') {
                if (setShowProjectCardId) {
                  setShowProjectCardId(null);
                } else if (onOpenCreateModal) {
                  onOpenCreateModal();
                }
              } else {
                if (onOpenCreateModal) {
                  onOpenCreateModal();
                } else if (setShowQuickTaskModal) {
                  setShowQuickTaskModal(true);
                }
              }
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-extrabold uppercase shadow-md ${
              theme === 'dark'
                ? 'border-[#E7C768] bg-[#2D1F10] text-[#E7C768] shadow-[0_0_12px_rgba(231,199,104,0.2)] hover:brightness-110'
                : 'border-amber-400 bg-amber-100 text-amber-950 shadow-[0_2px_8px_rgba(180,110,40,0.15)] hover:bg-amber-200'
            }`}
            title={zoomLevel === 'galaxy' ? 'Задать задачу' : 'Создать проект'}
          >
            <Plus size={14} />
            <span className="hidden sm:inline font-sans text-[11px]">
              {zoomLevel === 'galaxy' ? '+ Задать задачу' : '+ Создать проект'}
            </span>
          </button>
        </div>
      </div>

      {/* QUICK ORBIT STATUS FILTER BAR FOR UNIVERSE VIEW (3 SWITCHES: CRITICAL, ACTIVE, COMPLETED) */}
      {zoomLevel === 'universe' && (
        <div className="absolute top-28 sm:top-14 inset-x-2 z-30 flex justify-center pointer-events-auto px-1 sm:px-2">
          <div className={`flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl border backdrop-blur-2xl shadow-2xl ${
            theme === 'dark' ? 'bg-zinc-950/90 border-amber-500/30' : 'bg-white/95 border-amber-200'
          }`}>
            {/* 1. CRITICAL BUTTON */}
            <button
              onClick={() => setSelectedStatusFilter(prev => prev === 'critical' ? 'all' : 'critical')}
              title={`Критические (${orbitGroupedProjects.critical.length})`}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                selectedStatusFilter === 'critical'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-extrabold'
                  : 'text-zinc-800 dark:text-amber-300/80 hover:text-zinc-900 dark:hover:text-amber-200 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              <Flame size={14} className="text-amber-500 shrink-0" />
              <span className={selectedStatusFilter === 'critical' ? 'inline' : 'hidden sm:inline'}>
                Критические
              </span>
              <span className={`${selectedStatusFilter === 'critical' ? 'inline-block' : 'hidden sm:inline-block'} bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black border border-amber-300/80 shadow-xs`}>
                {orbitGroupedProjects.critical.length}
              </span>
            </button>

            {/* 2. ACTIVE BUTTON */}
            <button
              onClick={() => setSelectedStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
              title={`В работе (${orbitGroupedProjects.active.length})`}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                selectedStatusFilter === 'active'
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-extrabold'
                  : 'text-zinc-800 dark:text-amber-300/80 hover:text-zinc-900 dark:hover:text-amber-200 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              <Zap size={14} className="text-amber-500 shrink-0" />
              <span className={selectedStatusFilter === 'active' ? 'inline' : 'hidden sm:inline'}>
                В работе
              </span>
              <span className={`${selectedStatusFilter === 'active' ? 'inline-block' : 'hidden sm:inline-block'} bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black border border-amber-300/80 shadow-xs`}>
                {orbitGroupedProjects.active.length}
              </span>
            </button>

            {/* 3. COMPLETED BUTTON */}
            <button
              onClick={() => setSelectedStatusFilter(prev => prev === 'completed' ? 'all' : 'completed')}
              title={`Завершенные (${orbitGroupedProjects.completed.length})`}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                selectedStatusFilter === 'completed'
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-extrabold'
                  : 'text-zinc-800 dark:text-amber-300/80 hover:text-zinc-900 dark:hover:text-amber-200 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
            >
              <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
              <span className={selectedStatusFilter === 'completed' ? 'inline' : 'hidden sm:inline'}>
                Завершенные
              </span>
              <span className={`${selectedStatusFilter === 'completed' ? 'inline-block' : 'hidden sm:inline-block'} bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black border border-amber-300/80 shadow-xs`}>
                {orbitGroupedProjects.completed.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STATIC UNIVERSE PROJECT CONTROL BAR */}
      <div className="absolute bottom-20 sm:bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className={`flex items-center border p-0.5 rounded-xl shadow-2xl backdrop-blur-md ${
          theme === 'dark' ? 'bg-zinc-950/90 border-[#E7C768]/30' : 'bg-white/95 border-zinc-200'
        }`}>
          {/* Zoom Percentage Label */}
          <div className="px-2.5 py-1 text-[10px] sm:text-xs font-bold font-mono text-[#E7C768] border-r border-white/10 shrink-0">
            {Math.round((zoom / getBaseZoom(zoomLevel)) * 100)}%
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isPlaying 
                ? (theme === 'dark' ? 'text-amber-300' : 'text-amber-600') 
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
            title={isPlaying ? "Пауза орбит" : "Запуск движения"}
          >
            {isPlaying ? (
              <Pause size={13} className="fill-amber-400 text-amber-400" />
            ) : (
              <Play size={13} className="fill-zinc-400 text-zinc-400" />
            )}
          </button>
          <button
            onClick={handleZoomIn}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              theme === 'dark' ? 'text-zinc-300 hover:text-white hover:bg-white/5' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Приблизить (+)"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleZoomOut}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              theme === 'dark' ? 'text-zinc-300 hover:text-white hover:bg-white/5' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Отдалить (-)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleResetView}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              theme === 'dark' ? 'text-zinc-300 hover:text-white hover:bg-white/5' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
            title="Сбросить масштаб и вид"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* 3. MAIN INTERACTIVE MAP CANVAS (SVG/DIV GRAPH CONTAINER) */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing bg-transparent"
        style={{ touchAction: 'none' }}
        id="galaxy-interactive-stage"
      >
        {/* Ambient Space Fog & Stars background */}
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute w-1 h-1 bg-white rounded-full top-12 left-1/4 animate-ping" />
          <div className="absolute w-1 h-1 bg-amber-300 rounded-full top-1/4 left-3/4 animate-pulse" />
          <div className="absolute w-1 h-1 bg-violet-400 rounded-full top-2/3 left-1/3 animate-pulse" />
          <div className="absolute w-1 h-1 bg-teal-300 rounded-full top-3/4 left-4/5 animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.02),transparent_70%)]" />
        </div>

        {/* Dynamic Zoom & Pan Viewport with Parallax & Automated slow sway */}
        <div 
          className="absolute inset-0 origin-center transition-transform duration-100 ease-out flex items-center justify-center"
          style={{
            transform: `translate(${pan.x + parallaxOffset.x + swayX}px, ${pan.y + parallaxOffset.y + swayY}px) scale(${zoom})`
          }}
        >
          
          {/* ================= UNIVERSE VIEW: PLANETARY 3D ORBITS ================= */}
          {zoomLevel === 'universe' && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] max-w-none max-h-none flex items-center justify-center select-none" id="universe-planetary-orbits-stage">
              
              {/* 1. CENTRAL SUPERNOVA TRANSPARENT GASEOUS NEBULA CORE */}
              <div 
                className="absolute flex flex-col items-center justify-center text-center z-20 cursor-pointer group pointer-events-auto"
                style={{ left: '550px', top: '550px', transform: 'translate(-50%, -50%)' }}
                onClick={() => {
                  // Cycle orbits filter on nebula cloud click
                  setSelectedStatusFilter(prev => {
                    if (prev === 'all') return 'critical';
                    if (prev === 'critical') return 'active';
                    if (prev === 'active') return 'completed';
                    return 'all';
                  });
                }}
              >
                {/* Multi-layered Gas Clouds & Plasma Halos */}
                <div className="absolute w-56 h-56 rounded-full blur-3xl opacity-35 bg-gradient-to-tr from-amber-600/30 via-amber-500/20 to-yellow-500/30 animate-pulse pointer-events-none" />
                <div className="absolute w-44 h-44 rounded-full blur-2xl opacity-40 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.3)_0%,rgba(231,199,104,0.2)_50%,transparent_80%)] animate-spin-slow pointer-events-none" />
                <div className="absolute w-36 h-36 rounded-full border border-amber-400/30 blur-sm animate-spin-slow bg-gradient-to-r from-amber-500/15 via-yellow-400/15 to-amber-300/15 pointer-events-none" />

                {/* Central Translucent Cloud Node displaying Company Name */}
                <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-amber-300/50 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] relative z-10 transition-all duration-300 group-hover:scale-110 group-hover:border-amber-300 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-amber-500/20 via-amber-950/40 to-yellow-600/20 text-white'
                    : 'bg-gradient-to-br from-amber-100/60 via-amber-200/40 to-amber-300/50 text-amber-950'
                }`}>
                  {/* Company Name from Database */}
                  <span className="text-xs sm:text-sm font-black tracking-wide text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] px-2 text-center leading-tight max-w-[110px] break-words my-0.5">
                    {dbCompanyName}
                  </span>

                  <Sparkles size={16} className="text-amber-300 fill-amber-200 animate-pulse" />
                </div>
              </div>

              {/* 2. SVG 3D ELLIPTICAL ORBIT RINGS & TRACKS */}
              <svg 
                width={1100} 
                height={1100} 
                viewBox="0 0 1100 1100" 
                className="absolute inset-0 w-[1100px] h-[1100px] pointer-events-none z-10"
              >
                <defs>
                  <linearGradient id="orbit-grad-critical" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#B45309" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="orbit-grad-active" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E7C768" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#D97706" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="orbit-grad-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F4EE8E" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#E7C768" stopOpacity="0.3" />
                  </linearGradient>
                </defs>

                {/* Ring 1: Inner Ellipse Orbit (Critical - Amber Glow) */}
                <g 
                  transform={`rotate(${random3DOrbitParams.critical.rotate}, 550, 550)`}
                  className={`transition-opacity duration-500 ${
                    selectedStatusFilter === 'all' || selectedStatusFilter === 'critical' ? 'opacity-100' : 'opacity-15'
                  }`}
                >
                  <ellipse
                    cx={550}
                    cy={550}
                    rx={random3DOrbitParams.critical.rx}
                    ry={random3DOrbitParams.critical.ry}
                    fill="none"
                    stroke="url(#orbit-grad-critical)"
                    strokeWidth={2}
                    strokeOpacity={0.8}
                  />
                  <ellipse
                    cx={550}
                    cy={550}
                    rx={random3DOrbitParams.critical.rx}
                    ry={random3DOrbitParams.critical.ry}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth={0.8}
                    strokeOpacity={0.4}
                  />
                </g>

                {/* Ring 2: Middle Ellipse Orbit (Active - Amber Glow) */}
                <g 
                  transform={`rotate(${random3DOrbitParams.active.rotate}, 550, 550)`}
                  className={`transition-opacity duration-500 ${
                    selectedStatusFilter === 'all' || selectedStatusFilter === 'active' ? 'opacity-100' : 'opacity-15'
                  }`}
                >
                  <ellipse
                    cx={550}
                    cy={550}
                    rx={random3DOrbitParams.active.rx}
                    ry={random3DOrbitParams.active.ry}
                    fill="none"
                    stroke="url(#orbit-grad-active)"
                    strokeWidth={2}
                    strokeOpacity={0.8}
                  />
                  <ellipse
                    cx={550}
                    cy={550}
                    rx={random3DOrbitParams.active.rx}
                    ry={random3DOrbitParams.active.ry}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth={0.8}
                    strokeOpacity={0.4}
                  />
                </g>

                {/* Ring 3: Outer Ellipse Orbit (Completed - Emerald Glow) */}
                <g 
                  transform={`rotate(${random3DOrbitParams.completed.rotate}, 550, 550)`}
                  className={`transition-opacity duration-500 ${
                    selectedStatusFilter === 'all' || selectedStatusFilter === 'completed' ? 'opacity-100' : 'opacity-15'
                  }`}
                >
                  <ellipse
                    cx={550}
                    cy={550}
                    rx={random3DOrbitParams.completed.rx}
                    ry={random3DOrbitParams.completed.ry}
                    fill="none"
                    stroke="url(#orbit-grad-completed)"
                    strokeWidth={2}
                    strokeOpacity={0.8}
                  />
                  <ellipse
                    cx={550}
                    cy={550}
                    rx={random3DOrbitParams.completed.rx}
                    ry={random3DOrbitParams.completed.ry}
                    fill="none"
                    stroke="#F4EE8E"
                    strokeWidth={0.8}
                    strokeOpacity={0.4}
                  />
                </g>
              </svg>

              {/* 3. CELESTIAL PROJECT NODES (BLACK HOLE, PULSAR, EXTINGUISHED SUPERNOVA) */}
              {(['critical', 'active', 'completed'] as const).map(tier => {
                const projectsInTier = orbitGroupedProjects[tier];
                const orbitParams = random3DOrbitParams[tier];
                const rotAngle = universeRotations[tier];
                const isLayerVisible = selectedStatusFilter === 'all' || selectedStatusFilter === tier;

                if (!isLayerVisible && selectedStatusFilter !== 'all') return null;

                return projectsInTier.map((proj, idx) => {
                  const totalCount = projectsInTier.length;
                  const baseAngle = (idx * Math.PI * 2) / totalCount;
                  const currentAngle = baseAngle + rotAngle;

                  // 3D Elliptical point calculation
                  const point = get3DEllipsePoint(orbitParams, currentAngle);

                  const metrics = calculateProjectMetrics(proj);
                  const isSelected = selectedUniverseProjectId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={`absolute pointer-events-auto transition-opacity duration-300 ${
                        isLayerVisible ? 'opacity-100' : 'opacity-20'
                      }`}
                      style={{
                        left: `${point.x}px`,
                        top: `${point.y}px`,
                        transform: `translate(-50%, -50%) scale(${isSelected ? 1.3 : point.zScale})`,
                        zIndex: isSelected ? 40 : point.zIndex,
                      }}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const projId = proj.id;
                          setSelectedProjectId(projId);
                          setSelectedUniverseProjectId(projId);
                          setZoomLevel('galaxy');
                          handleResetView('galaxy');
                          if (onSelectProject) onSelectProject(projId);
                          if (onNavigate) onNavigate(`/cabinet/revisor/${projId}/map`);
                        }}
                        className="relative flex flex-col items-center justify-center cursor-pointer group"
                      >
                        {/* 1. CRITICAL: BLACK HOLE (Черная дыра Gargantua) */}
                        {tier === 'critical' && (
                          <div className="relative flex items-center justify-center">
                            {/* Gravitational Lensed Accretion Disk Halos */}
                            <div className="absolute -inset-10 flex items-center justify-center pointer-events-none z-0">
                              <svg className="w-28 h-28 overflow-visible" viewBox="-60 -60 120 120">
                                <defs>
                                  <linearGradient id={`bh-accretion-${proj.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                                    <stop offset="25%" stopColor="#FEF08A" stopOpacity="0.85" />
                                    <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                                    <stop offset="75%" stopColor="#FEF08A" stopOpacity="0.85" />
                                    <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
                                  </linearGradient>
                                  <filter id={`bh-glow-${proj.id}`}>
                                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                                    <feMerge>
                                      <feMergeNode in="coloredBlur"/>
                                      <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                  </filter>
                                </defs>

                                <g filter={`url(#bh-glow-${proj.id})`}>
                                  {/* Lensed Rear Accretion Disk (Upper Halo) */}
                                  <ellipse cx="0" cy="-3" rx="38" ry="24" fill="none" stroke={`url(#bh-accretion-${proj.id})`} strokeWidth="3" opacity="0.9" transform="rotate(-12)" />
                                  {/* Lensed Rear Accretion Disk (Lower Halo) */}
                                  <ellipse cx="0" cy="3" rx="38" ry="24" fill="none" stroke={`url(#bh-accretion-${proj.id})`} strokeWidth="2.2" opacity="0.75" transform="rotate(-12)" />
                                </g>
                              </svg>
                            </div>

                            {/* Front Accretion Belt Beam */}
                            <div className="absolute -inset-7 flex items-center justify-center pointer-events-none z-20">
                              <div className="w-28 h-2 sm:h-2.5 bg-gradient-to-r from-transparent via-amber-100 via-white to-transparent blur-[0.8px] shadow-[0_0_20px_#F59E0B,0_0_8px_#FFFFFF] -rotate-12 rounded-full opacity-95" />
                            </div>

                            {/* Ambient Gravitational Halo Glow */}
                            <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl animate-pulse pointer-events-none z-0" />

                            {/* Black Hole Core (Event Horizon Void & Photon Ring) */}
                            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-black border-[1.5px] border-amber-100/90 shadow-[0_0_12px_#FDE047,0_0_25px_#F59E0B,inset_0_0_10px_#000000] flex flex-col items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-110">
                              <Flame size={18} className="text-amber-200 fill-amber-950 animate-bounce relative z-10" />
                              <div className="absolute -bottom-1 -right-1 text-[8px] font-black font-mono px-1.5 py-0.2 rounded-full border border-amber-200 shadow-lg bg-amber-400 text-slate-950 z-20">
                                {metrics.pct}%
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. IN PROGRESS: GOLDEN PULSAR (По образцу картинки - градиент прозрачности) */}
                        {tier === 'active' && (
                          <div className="relative flex items-center justify-center">
                            {/* Astrophysical Magnetic Field Loops & Plasma Cone Jets */}
                            <div className="absolute -inset-10 flex items-center justify-center pointer-events-none z-0">
                              <svg className="w-28 h-28 overflow-visible" viewBox="-60 -60 120 120">
                                <defs>
                                  <linearGradient id={`pulsar-jet-top-${proj.id}`} x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                                    <stop offset="30%" stopColor="#FEF08A" stopOpacity="0.8" />
                                    <stop offset="65%" stopColor="#F59E0B" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                                  </linearGradient>
                                  <linearGradient id={`pulsar-jet-bot-${proj.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                                    <stop offset="30%" stopColor="#FEF08A" stopOpacity="0.8" />
                                    <stop offset="65%" stopColor="#F59E0B" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                                  </linearGradient>
                                  <filter id={`pulsar-glow-${proj.id}`}>
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                      <feMergeNode in="coloredBlur"/>
                                      <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                  </filter>
                                </defs>

                                {/* Rotated Plasma Conical Beams / Jets */}
                                <g transform="rotate(-28)" filter={`url(#pulsar-glow-${proj.id})`}>
                                  <path d="M -4,-10 L -20,-56 L 20,-56 L 4,-10 Z" fill={`url(#pulsar-jet-top-${proj.id})`} />
                                  <path d="M -4,10 L -20,56 L 20,56 L 4,10 Z" fill={`url(#pulsar-jet-bot-${proj.id})`} />
                                </g>

                                {/* Magnetic Field Lines / Loops */}
                                <g filter={`url(#pulsar-glow-${proj.id})`}>
                                  <ellipse cx="0" cy="0" rx="26" ry="11" fill="none" stroke="#FEF08A" strokeWidth="0.9" strokeOpacity="0.8" transform="rotate(-15)" />
                                  <ellipse cx="0" cy="0" rx="34" ry="14" fill="none" stroke="#F59E0B" strokeWidth="0.9" strokeOpacity="0.7" transform="rotate(25)" />
                                  <ellipse cx="0" cy="0" rx="42" ry="17" fill="none" stroke="#FDE047" strokeWidth="0.8" strokeOpacity="0.6" transform="rotate(65)" />
                                  <ellipse cx="0" cy="0" rx="48" ry="20" fill="none" stroke="#F59E0B" strokeWidth="0.8" strokeOpacity="0.5" transform="rotate(-60)" />
                                </g>
                              </svg>
                            </div>

                            {/* Golden Pulsar Star Core */}
                            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-amber-100 via-amber-400 to-amber-700 border-2 border-amber-200 text-slate-950 shadow-[0_0_20px_#F59E0B,0_0_35px_#FDE047,inset_0_0_8px_#FFFFFF] flex flex-col items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-110">
                              <Zap size={18} className="text-slate-950 fill-amber-100 font-extrabold relative z-10 drop-shadow" />
                              <div className="absolute -bottom-1 -right-1 text-[8px] font-black font-mono px-1.5 py-0.2 rounded-full border border-amber-200 shadow-lg bg-amber-300 text-slate-950 z-20">
                                {metrics.pct}%
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. COMPLETED: GOLDEN SUPERNOVA (Утухающая звезда Сверхновая) */}
                        {tier === 'completed' && (
                          <div className="relative flex items-center justify-center">
                            {/* Expanding Shockwave Nebula Ellipse & Lens Flare Starburst */}
                            <div className="absolute -inset-10 flex items-center justify-center pointer-events-none z-0">
                              <svg className="w-28 h-28 overflow-visible" viewBox="-60 -60 120 120">
                                <defs>
                                  <linearGradient id={`sn-ring-${proj.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
                                    <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#78350F" stopOpacity="0.2" />
                                  </linearGradient>
                                  <filter id={`sn-glow-${proj.id}`}>
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                      <feMergeNode in="coloredBlur"/>
                                      <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                  </filter>
                                </defs>

                                {/* Radiating Flare Star Rays */}
                                <g filter={`url(#sn-glow-${proj.id})`} stroke="#FEF08A" strokeWidth="1" opacity="0.8">
                                  {[0, 30, 60, 90, 120, 150].map(deg => (
                                    <line
                                      key={deg}
                                      x1="-45"
                                      y1="0"
                                      x2="45"
                                      y2="0"
                                      transform={`rotate(${deg})`}
                                    />
                                  ))}
                                </g>

                                {/* Tilted Expanding Shockwave Ring (Nebula Ring) */}
                                <g filter={`url(#sn-glow-${proj.id})`} transform="rotate(-18)">
                                  <ellipse cx="0" cy="0" rx="42" ry="17" fill="none" stroke={`url(#sn-ring-${proj.id})`} strokeWidth="3.5" opacity="0.85" />
                                  <ellipse cx="0" cy="0" rx="42" ry="17" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.9" />
                                </g>
                              </svg>
                            </div>

                            {/* Golden Supernova Core */}
                            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-amber-100 via-white to-amber-300 border-2 border-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.9),0_0_35px_rgba(245,158,11,0.8)] flex flex-col items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-110">
                              <CheckCircle2 size={18} className="text-amber-900 font-extrabold relative z-10" />
                              <div className="absolute -bottom-1 -right-1 text-[8px] font-black font-mono px-1.5 py-0.2 rounded-full border border-amber-300/80 shadow-lg bg-amber-400 text-slate-950 z-20">
                                {metrics.pct}%
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Project Title Tag positioned absolutely underneath */}
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-center pointer-events-none w-36 sm:w-40 z-20">
                          <span className={`text-[10px] sm:text-[11px] font-bold leading-snug tracking-wide block px-2.5 py-1 rounded-xl border backdrop-blur-md shadow-2xl break-words whitespace-normal font-sans ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold'
                              : 'bg-zinc-950/90 text-amber-100 border-amber-400/30'
                          }`}>
                            {proj.title}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}

              {/* Empty state when no projects in database */}
              {processes.length === 0 && (
                <div
                  className="absolute top-[680px] left-1/2 -translate-x-1/2 text-center pointer-events-auto z-30 max-w-sm px-4 py-3 rounded-2xl border backdrop-blur-md transition-all shadow-lg select-none"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(26,15,2,0.65)' : 'rgba(255,251,245,0.75)',
                    borderColor: theme === 'dark' ? 'rgba(231,199,104,0.4)' : 'rgba(180,120,20,0.3)',
                    color: theme === 'dark' ? '#FFFDF5' : '#451A03'
                  }}
                >
                  <p className="text-sm font-medium mb-2.5">
                    В системе пока нет активных проектов. Создайте первый проект для запуска гравитационной карты.
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenCreateModal) onOpenCreateModal();
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer shadow-sm hover:brightness-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(to right, #F4EE8E, #E7C768, #D99E41)',
                      color: '#451A03',
                      borderColor: '#E7C768'
                    }}
                  >
                    + Создать первый проект
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ================= GALAXY SOLAR SYSTEM VIEW ================= */}
          {zoomLevel === 'galaxy' && selectedProject && (() => {
            const coreCategory = getProjectOrbitCategory(selectedProject);
            const coreMetrics = calculateProjectMetrics(selectedProject);

            return (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] max-w-none max-h-none animate-in zoom-in-75 fade-in duration-500 ease-out" id="galaxy-system-layer">
                
                {/* CENTRAL CORE: THE NUCLEUS OF THE SYSTEM (STATUS-BASED: BLACK HOLE, PULSAR, SUPERNOVA) */}
                <div 
                  className="absolute flex flex-col items-center justify-center text-center z-20 w-28 h-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer group hover:scale-105 transition-all duration-300"
                  style={{ left: '550px', top: '550px' }}
                  id="galaxy-core-sun"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedProject) {
                      if (onOpenProjectInfoModal) {
                        onOpenProjectInfoModal(selectedProject.id);
                      } else if (setShowProjectCardId) {
                        setShowProjectCardId(selectedProject.id);
                      } else {
                        setShowInternalProjectModal(true);
                      }
                    }
                  }}
                  title="Информация о проекте"
                >
                  {/* 1. CRITICAL CENTRAL CORE: BLACK HOLE (Gargantua Style) */}
                  {coreCategory === 'critical' && (
                    <div className="relative flex items-center justify-center">
                      {/* Gargantua Gravitational Lensing & Accretion Structure */}
                      <div className="absolute -inset-16 flex items-center justify-center pointer-events-none z-0">
                        <svg className="w-56 h-56 overflow-visible" viewBox="-120 -120 240 240">
                          <defs>
                            <linearGradient id="core-bh-accretion" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                              <stop offset="25%" stopColor="#FEF08A" stopOpacity="0.85" />
                              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                              <stop offset="75%" stopColor="#FEF08A" stopOpacity="0.85" />
                              <stop offset="100%" stopColor="#B45309" stopOpacity="0" />
                            </linearGradient>
                            <filter id="core-bh-glow">
                              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>

                          <g filter="url(#core-bh-glow)">
                            {/* Lensed Rear Accretion Disk (Upper Halo) */}
                            <ellipse cx="0" cy="-6" rx="82" ry="52" fill="none" stroke="url(#core-bh-accretion)" strokeWidth="6.5" opacity="0.9" transform="rotate(-12)" />
                            {/* Lensed Rear Accretion Disk (Lower Halo) */}
                            <ellipse cx="0" cy="6" rx="82" ry="52" fill="none" stroke="url(#core-bh-accretion)" strokeWidth="5" opacity="0.75" transform="rotate(-12)" />
                          </g>
                        </svg>
                      </div>

                      {/* Front Accretion Belt Beam */}
                      <div className="absolute -inset-12 flex items-center justify-center pointer-events-none z-20">
                        <div className="w-56 h-4 sm:h-5 bg-gradient-to-r from-transparent via-amber-100 via-white to-transparent blur-[1px] shadow-[0_0_35px_#F59E0B,0_0_15px_#FFFFFF] -rotate-12 rounded-full opacity-95" />
                      </div>

                      {/* Ambient Gravitational Glow */}
                      <div className="absolute w-44 h-44 rounded-full blur-2xl opacity-60 bg-amber-500/30 animate-pulse pointer-events-none z-0" />

                      {/* Black Hole Singularity Event Horizon */}
                      <div className="w-28 h-28 rounded-full bg-black border-2 border-amber-100/90 shadow-[0_0_20px_#FDE047,0_0_40px_#F59E0B,inset_0_0_20px_#000000] flex flex-col items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-105">
                        <Flame size={20} className="text-amber-200 fill-amber-950 animate-bounce mb-0.5" />
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-200 drop-shadow-[0_2px_8px_rgba(245,158,11,0.9)]">
                          {coreMetrics.pct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. IN PROGRESS CENTRAL CORE: GOLDEN PULSAR (По образцу картинки - градиент прозрачности) */}
                  {coreCategory === 'active' && (
                    <div className="relative flex items-center justify-center">
                      {/* Astrophysical Magnetic Field Loops & Plasma Cone Jets */}
                      <div className="absolute -inset-16 flex items-center justify-center pointer-events-none z-0">
                        <svg className="w-56 h-56 overflow-visible" viewBox="-120 -120 240 240">
                          <defs>
                            <linearGradient id="core-pulsar-jet-top" x1="0%" y1="100%" x2="0%" y2="0%">
                              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                              <stop offset="30%" stopColor="#FEF08A" stopOpacity="0.8" />
                              <stop offset="65%" stopColor="#F59E0B" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="core-pulsar-jet-bot" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                              <stop offset="30%" stopColor="#FEF08A" stopOpacity="0.8" />
                              <stop offset="65%" stopColor="#F59E0B" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                            </linearGradient>
                            <filter id="core-pulsar-glow">
                              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Rotated Plasma Conical Beams / Jets */}
                          <g transform="rotate(-28)" filter="url(#core-pulsar-glow)">
                            <path d="M -10,-22 L -42,-115 L 42,-115 L 10,-22 Z" fill="url(#core-pulsar-jet-top)" />
                            <path d="M -10,22 L -42,115 L 42,115 L 10,22 Z" fill="url(#core-pulsar-jet-bot)" />
                          </g>

                          {/* Magnetic Field Lines / Loops */}
                          <g filter="url(#core-pulsar-glow)">
                            <ellipse cx="0" cy="0" rx="52" ry="22" fill="none" stroke="#FEF08A" strokeWidth="1.5" strokeOpacity="0.85" transform="rotate(-15)" />
                            <ellipse cx="0" cy="0" rx="68" ry="28" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.75" transform="rotate(25)" />
                            <ellipse cx="0" cy="0" rx="84" ry="34" fill="none" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.65" transform="rotate(65)" />
                            <ellipse cx="0" cy="0" rx="96" ry="40" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.55" transform="rotate(-60)" />
                          </g>
                        </svg>
                      </div>

                      {/* Golden Pulsar Core Star */}
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 via-amber-400 to-amber-700 border-2 border-amber-200 text-slate-950 shadow-[0_0_30px_#F59E0B,0_0_60px_#FDE047,inset_0_0_15px_#FFFFFF] flex flex-col items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-105">
                        <Zap size={22} className="text-slate-950 fill-amber-100 font-extrabold mb-0.5 drop-shadow" />
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-950 drop-shadow">
                          {coreMetrics.pct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. COMPLETED CENTRAL CORE: GOLDEN SUPERNOVA (Утухающая звезда Сверхновая) */}
                  {coreCategory === 'completed' && (
                    <div className="relative flex items-center justify-center">
                      {/* Radiating Lens Flare Starburst & Tilted Shockwave Nebula Ellipse */}
                      <div className="absolute -inset-20 flex items-center justify-center pointer-events-none z-0">
                        <svg className="w-64 h-64 overflow-visible" viewBox="-120 -120 240 240">
                          <defs>
                            <linearGradient id="core-sn-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
                              <stop offset="35%" stopColor="#F59E0B" stopOpacity="0.85" />
                              <stop offset="70%" stopColor="#B45309" stopOpacity="0.6" />
                              <stop offset="100%" stopColor="#78350F" stopOpacity="0.2" />
                            </linearGradient>
                            <filter id="core-sn-glow">
                              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Lens Flare Starburst Rays */}
                          <g filter="url(#core-sn-glow)" stroke="#FEF08A" strokeWidth="1.2" opacity="0.85">
                            {[0, 20, 40, 60, 80, 100, 120, 140, 160].map(deg => (
                              <line
                                key={deg}
                                x1="-100"
                                y1="0"
                                x2="100"
                                y2="0"
                                transform={`rotate(${deg})`}
                              />
                            ))}
                          </g>

                          {/* Tilted Supernova Nebula Ring Ellipse */}
                          <g filter="url(#core-sn-glow)" transform="rotate(-18)">
                            <ellipse cx="0" cy="0" rx="90" ry="36" fill="none" stroke="url(#core-sn-ring)" strokeWidth="6" opacity="0.85" />
                            <ellipse cx="0" cy="0" rx="90" ry="36" fill="none" stroke="#FFFFFF" strokeWidth="1.8" opacity="0.9" />
                          </g>
                        </svg>
                      </div>

                      {/* Golden Supernova Central Dying Core */}
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 via-white to-amber-300 border-2 border-white text-slate-950 shadow-[0_0_35px_rgba(255,255,255,0.9),0_0_70px_rgba(245,158,11,0.85)] flex flex-col items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-105">
                        <CheckCircle2 size={24} className="text-amber-900 font-extrabold mb-0.5" />
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-950 drop-shadow">
                          {coreMetrics.pct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Project Title Label underneath */}
                  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-56 text-center flex flex-col items-center pointer-events-none">
                    <span className="font-black text-xs sm:text-sm uppercase tracking-wider drop-shadow-md block bg-zinc-950/80 px-3 py-1 rounded-xl border border-amber-500/30 text-amber-300 backdrop-blur-md">
                      {selectedProject.title}
                    </span>
                  </div>
                </div>

                {/* CONSTELLATION LINE OVERLAYS (SVG) */}
                <svg 
                  width={1100} 
                  height={1100} 
                  viewBox="0 0 1100 1100" 
                  className="absolute inset-0 w-[1100px] h-[1100px] max-w-none pointer-events-none z-10"
                >
                  <defs>
                    <radialGradient id="glow-photon-completed" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFF" stopOpacity="1" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="glow-photon-uncompleted" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFF" stopOpacity="1" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Draw laser connections & elliptical orbit tracks */}
                  {selectedProjectTasks.map((task, index) => {
                    const orbit = getTaskOrbit(task, index, selectedProjectTasks.length);

                    const angleRad = orbit.angle;
                    const inclRad = (orbit.inclination * Math.PI) / 180;
                    
                    const rawX = Math.cos(angleRad) * orbit.radiusX;
                    const rawY = Math.sin(angleRad) * orbit.radiusY;

                    const x = 550 + (rawX * Math.cos(inclRad) - rawY * Math.sin(inclRad));
                    const y = 550 + (rawX * Math.sin(inclRad) + rawY * Math.cos(inclRad));

                    const isCompleted = task.status === 'completed';

                    return (
                      <g key={`lines-${task.id}`}>
                        {/* Connection beam line to nucleus */}
                        <line 
                          x1={550} 
                          y1={550} 
                          x2={x} 
                          y2={y} 
                          stroke={
                            isCompleted 
                              ? 'rgba(6, 182, 212, 0.3)' 
                              : 'rgba(245, 158, 11, 0.25)'
                          } 
                          strokeWidth={1} 
                        />

                        {/* Moving energy pulse along the beam */}
                        <circle cx={x} cy={y} r="4" fill={isCompleted ? 'url(#glow-photon-completed)' : 'url(#glow-photon-uncompleted)'}>
                          <animate attributeName="cx" from="550" to={x} dur="3s" repeatCount="indefinite" />
                          <animate attributeName="cy" from="550" to={y} dur="3s" repeatCount="indefinite" />
                        </circle>
                        
                        {/* Elliptical track line */}
                        <ellipse
                          cx={550}
                          cy={550}
                          rx={orbit.radiusX}
                          ry={orbit.radiusY}
                          fill="none"
                          stroke={
                            isCompleted 
                              ? 'rgba(6, 182, 212, 0.25)' 
                              : 'rgba(245, 158, 11, 0.2)'
                          }
                          strokeWidth={1}
                          transform={`rotate(${orbit.inclination}, 550, 550)`}
                        />
                      </g>
                    );
                  })}

                  {/* Dependency connector line arcs */}
                  {selectedProjectTasks.map((task, indexA) => {
                    if (!task.dependentOnTaskId) return null;
                    const indexB = selectedProjectTasks.findIndex(t => t.id === task.dependentOnTaskId);
                    if (indexB < 0) return null;

                    const orbitA = getTaskOrbit(task, indexA, selectedProjectTasks.length);
                    const orbitB = getTaskOrbit(selectedProjectTasks[indexB], indexB, selectedProjectTasks.length);

                    const rawXA = Math.cos(orbitA.angle) * orbitA.radiusX;
                    const rawYA = Math.sin(orbitA.angle) * orbitA.radiusY;
                    const inclRadA = (orbitA.inclination * Math.PI) / 180;
                    const xA = 550 + (rawXA * Math.cos(inclRadA) - rawYA * Math.sin(inclRadA));
                    const yA = 550 + (rawXA * Math.sin(inclRadA) + rawYA * Math.cos(inclRadA));

                    const rawXB = Math.cos(orbitB.angle) * orbitB.radiusX;
                    const rawYB = Math.sin(orbitB.angle) * orbitB.radiusY;
                    const inclRadB = (orbitB.inclination * Math.PI) / 180;
                    const xB = 550 + (rawXB * Math.cos(inclRadB) - rawYB * Math.sin(inclRadB));
                    const yB = 550 + (rawXB * Math.sin(inclRadB) + rawYB * Math.cos(inclRadB));

                    return (
                      <g key={`dep-${task.id}`}>
                        <path
                          d={`M ${xA} ${yA} Q ${(xA + xB) / 2 + 25} ${(yA + yB) / 2 - 25} ${xB} ${yB}`}
                          fill="none"
                          stroke="rgba(217, 119, 6, 0.4)"
                          strokeWidth={1.5}
                          className="animate-pulse"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* RENDER SATELLITE STARS (ЗВЕЗДЫ ЗАДАЧ С ВОЛНАМИ КОРОНЫ И ПРОЗРАЧНОСТЬЮ ВМЕСТО ПРОГРЕССБАРА) */}
                {selectedProjectTasks.map((task, index) => {
                  const orbit = getTaskOrbit(task, index, selectedProjectTasks.length);

                  const rawX = Math.cos(orbit.angle) * orbit.radiusX;
                  const rawY = Math.sin(orbit.angle) * orbit.radiusY;
                  const inclRad = (orbit.inclination * Math.PI) / 180;
                  
                  const leftPos = 550 + (rawX * Math.cos(inclRad) - rawY * Math.sin(inclRad));
                  const topPos = 550 + (rawX * Math.sin(inclRad) + rawY * Math.cos(inclRad));

                  const isCompleted = task.status === 'completed';
                  const isSelected = selectedTaskId === task.id;
                  
                  // Calculated task completion percentage (checklist + deadline duration)
                  const taskPct = calculateTaskCompletionPercentage(task);
                  // Transparency level for star core based on progress (from 0.35 to 1.0)
                  const coreOpacity = Math.max(0.35, taskPct / 100);

                  return (
                    <div
                      key={task.id}
                      className="absolute select-none pointer-events-auto"
                      style={{ 
                        left: `${leftPos}px`, 
                        top: `${topPos}px`,
                        zIndex: Math.round(20 + Math.sin(orbit.angle) * 10),
                        transform: `translate3d(-50%, -50%, 0) scale(${isSelected ? 1.35 : 0.85 + (Math.sin(orbit.angle) + 1) * 0.15})`,
                        willChange: 'transform'
                      }}
                    >
                      <div 
                        onClick={() => {
                          const targetUrl = `/cabinet/task${task.id}`;
                          if (onNavigate) {
                            onNavigate(targetUrl);
                          } else {
                            window.history.pushState({}, '', targetUrl);
                            window.dispatchEvent(new Event('popstate'));
                          }
                        }}
                        className="relative flex flex-col items-center justify-center cursor-pointer group"
                      >
                        {/* 1.5x Enlarged Transparent Click / Touch Hit Target overlay for easy tapping on mobile/desktop */}
                        <div 
                          className="absolute -inset-7 sm:-inset-8 rounded-full cursor-pointer z-50 bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetUrl = `/cabinet/task${task.id}`;
                            if (onNavigate) {
                              onNavigate(targetUrl);
                            } else {
                              window.history.pushState({}, '', targetUrl);
                              window.dispatchEvent(new Event('popstate'));
                            }
                          }}
                        />
                        {/* Glowing Solar Coronal Waves (Пламенные / Электромагнитные волны по окружности) */}
                        <div className="absolute -inset-5 flex items-center justify-center pointer-events-none z-0 animate-spin-slow opacity-90">
                          <svg className="w-20 h-20 overflow-visible" viewBox="-40 -40 80 80">
                            <defs>
                              <filter id={`corona-glow-${task.id}`}>
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                                <feMerge>
                                  <feMergeNode in="coloredBlur"/>
                                  <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                              </filter>
                            </defs>

                            {/* Circular Electromagnetic Flame Waves */}
                            <g filter={`url(#corona-glow-${task.id})`}>
                              <path
                                d="M 0,-28 C 10,-32 18,-22 28,0 C 32,10 22,18 0,28 C -10,32 -18,22 -28,0 C -32,-10 -22,-18 0,-28 Z"
                                fill="none"
                                stroke="#FDE047"
                                strokeWidth="1.6"
                                opacity="0.85"
                              />
                              <path
                                d="M -20,-20 C -5,-30 25,-15 20,20 C 15,25 -25,15 -20,-20 Z"
                                fill="none"
                                stroke="#F59E0B"
                                strokeWidth="1.4"
                                opacity="0.75"
                                transform="rotate(45)"
                              />
                              <ellipse cx="0" cy="0" rx="31" ry="31" fill="none" stroke="#FEF08A" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
                            </g>
                          </svg>
                        </div>

                        {/* Outer Golden Solar Ambient Halo */}
                        <div 
                          className="absolute -inset-3 rounded-full bg-amber-400/40 blur-md pointer-events-none animate-pulse transition-all duration-300 group-hover:scale-125 z-0" 
                          style={{ opacity: coreOpacity }}
                        />

                        {/* Round Golden Sun Star Body with Icon (Progress mapped to transparency/opacity) */}
                        <div className="relative flex items-center justify-center z-10">
                          <div 
                            className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-amber-100 via-amber-400 to-amber-600 border-2 border-amber-200 text-slate-950 shadow-[0_0_18px_#F59E0B,0_0_30px_#FDE047,inset_0_0_8px_#FFFFFF] flex items-center justify-center p-0 relative z-10 transition-all duration-300 group-hover:scale-110"
                            style={{ opacity: coreOpacity }}
                          >
                            {/* Perfectly centered inner icon */}
                            {isCompleted ? (
                              <Check size={20} className="text-slate-950 font-black stroke-[3.5] shrink-0" />
                            ) : task.priority === 'high' ? (
                              <Flame size={18} className="text-slate-950 fill-amber-100 font-extrabold shrink-0" />
                            ) : (
                              <Star size={18} className="text-slate-950 fill-amber-100 shrink-0" />
                            )}
                          </div>

                          {/* Progress Percentage Badge */}
                          <div className="absolute -bottom-1 -right-1 text-[8px] font-black font-mono px-1.5 py-0.2 rounded-full border border-amber-200 shadow-md bg-amber-300 text-slate-950 z-20">
                            {taskPct}%
                          </div>
                        </div>

                        {/* Task title compact text badge with Executor Name - ABSOLUTE underneath */}
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none flex flex-col items-center gap-0.5 z-20">
                          <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wide leading-tight text-white block drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] bg-zinc-950/85 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-md">
                            {task.taskTitle}
                          </span>
                          {task.executorName && (
                            <span className="text-[8px] font-bold text-amber-300 bg-zinc-950/90 px-1.5 py-0.2 rounded-md border border-amber-500/30 backdrop-blur-md flex items-center gap-1 shadow-sm">
                              <User size={8} className="text-amber-400 shrink-0" />
                              <span className="truncate max-w-[100px]">{task.executorName}</span>
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}

              </div>
            );
          })()}

        </div>
      </div>

      {/* 4. SIDE DRAWER FOR SELECTED TASK INFOCARD WITH BACKDROP BLUR & VISIBLE CLOSE BUTTON */}
      <AnimatePresence>
        {selectedTaskId && (() => {
          const task = selectedProject?.tasks.find(t => t.id === selectedTaskId);
          if (!task) return null;

          const doneCount = task.checklist.filter(c => c.done).length;
          const totalCheck = task.checklist.length;
          const progress = totalCheck > 0 ? Math.round((doneCount / totalCheck) * 100) : 0;
          const dependencyTask = selectedProject?.tasks.find(t => t.id === task.dependentOnTaskId);

          return (
            <>
              {/* Backdrop layer with blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setSelectedTaskId(null); setShowLinkEditor(false); }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-35"
              />

              <motion.div
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 320, opacity: 0 }}
                className={`absolute top-0 right-0 bottom-0 w-full sm:w-85 border-l p-5 z-40 overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between font-sans transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-zinc-950/60 backdrop-blur-2xl border-amber-500/30 text-white'
                    : 'bg-white/80 backdrop-blur-2xl border-amber-300/50 text-zinc-800'
                }`}
                id="galaxy-task-hud-drawer"
              >
                <div className="space-y-4">
                  
                  {/* Header title & prominent close button */}
                  <div className="flex items-start justify-between border-b border-zinc-200/50 dark:border-white/10 pb-3">
                    <div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold tracking-wider ${
                        task.status === 'completed' 
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {task.status === 'completed' ? '⭐ Верифицировано' : '✦ В работе'}
                      </span>
                      <h4 className={`text-xs sm:text-sm font-black mt-1.5 leading-tight ${theme === 'dark' ? 'text-amber-100' : 'text-zinc-900'}`}>{task.taskTitle}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingTaskItem(task);
                          setShowEditTaskModal(true);
                        }}
                        className="p-1.5 rounded-xl border border-amber-400/40 hover:bg-amber-500/20 text-[#E7C768] cursor-pointer transition-all shadow-xs"
                        title="Редактировать задачу"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTaskToDelete(task)}
                        className="p-1.5 rounded-xl border border-red-500/40 hover:bg-red-500/20 text-red-400 cursor-pointer transition-all shadow-xs"
                        title="Удалить задачу"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button 
                        onClick={() => { setSelectedTaskId(null); setShowLinkEditor(false); }}
                        className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 text-amber-300 hover:text-white font-black text-lg flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-lg"
                        title="Закрыть"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                {/* Executor & Author HUD Block */}
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  theme === 'dark' ? 'bg-zinc-900/60 border-white/5' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${
                      theme === 'dark' ? 'bg-slate-800 border-white/10 text-white' : 'bg-zinc-200 border-zinc-300 text-zinc-700'
                    }`}>
                      {task.executorName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-bold text-xs truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>👤 Кому: {task.executorName}</div>
                      <div className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'}`}>{task.executorRole}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] pt-1 border-t border-zinc-200/40 dark:border-white/5">
                    <span className="text-[#E7C768] font-bold">📌 Постановщик:</span>
                    <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>
                      {task.author_name || 'Руководитель'}
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'}`}>
                    <span className="flex items-center gap-1"><Clock size={10} /> {task.deadlineDays} дней</span>
                    <span className={`text-right uppercase font-bold ${theme === 'dark' ? 'text-amber-200' : 'text-amber-700'}`}>
                      {task.priority === 'high' ? '🔴 Важно' : task.priority === 'medium' ? '🟡 Средне' : '🟢 Низко'}
                    </span>
                  </div>
                </div>

                {/* Synopsis */}
                {task.description && (
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Синопсис задачи</span>
                    <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-zinc-600'}`}>{task.description}</p>
                  </div>
                )}


                {/* Graph Link/Dependency editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Связи графа задачи</span>
                    <button
                      onClick={() => {
                        setLinkSourceTaskId(task.id);
                        setLinkTargetTaskId(task.dependentOnTaskId || '');
                        setShowLinkEditor(!showLinkEditor);
                      }}
                      className="text-[8px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Link size={8} />
                      <span>{task.dependentOnTaskId ? 'Сменить связь' : 'Добавить связь'}</span>
                    </button>
                  </div>

                  {task.dependentOnTaskId && dependencyTask ? (
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      theme === 'dark' ? 'bg-amber-950/20 border-amber-500/20' : 'bg-[#FAF5EA] border-[#E7C768]/30'
                    }`}>
                      <div className="space-y-0.5">
                        <span className="text-[7px] text-amber-700 dark:text-amber-400 uppercase font-bold">Зависит от созвездия:</span>
                        <div className={`text-[9px] font-bold truncate max-w-[160px] ${theme === 'dark' ? 'text-slate-100' : 'text-zinc-800'}`}>
                          {dependencyTask.taskTitle}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setProcesses(prev => prev.map(p => {
                            if (p.id !== selectedProjectId) return p;
                            return {
                              ...p,
                              tasks: p.tasks.map(t => t.id === task.id ? { ...t, dependentOnTaskId: null } : t)
                            };
                          }));
                        }}
                        className="p-1 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[9px] text-zinc-500 italic">Связи с другими звездными системами не установлены</p>
                  )}

                  {/* Link Editor Form */}
                  {showLinkEditor && linkSourceTaskId === task.id && (
                    <form onSubmit={handleAssignDependency} className={`p-2 rounded-lg border space-y-2 animate-fade-in ${
                      theme === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <div>
                        <select
                          value={linkTargetTaskId}
                          onChange={e => setLinkTargetTaskId(e.target.value)}
                          className={`w-full p-1 rounded text-[9px] outline-none ${
                            theme === 'dark' ? 'bg-zinc-950 text-slate-200 border border-white/5' : 'bg-white text-zinc-800 border border-zinc-200'
                          }`}
                          required
                        >
                          <option value="">Выберите задачу...</option>
                          <option value="clear">Удалить связь</option>
                          {selectedProject.tasks
                            .filter(t => t.id !== task.id)
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.taskTitle}</option>
                            ))
                          }
                        </select>
                      </div>
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setShowLinkEditor(false)}
                          className={`px-2 py-0.5 rounded text-[8px] cursor-pointer ${
                            theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
                          }`}
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          className="px-2 py-0.5 rounded bg-amber-500 text-[8px] text-slate-950 font-bold cursor-pointer"
                        >
                          Связать
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Checklist (Moons details) */}
                <div className={`space-y-1.5 pt-2 border-t ${theme === 'dark' ? 'border-white/5' : 'border-zinc-200'}`}>
                  <div className={`flex items-center justify-between text-[9px] uppercase tracking-wider font-mono ${
                    theme === 'dark' ? 'text-slate-400' : 'text-zinc-500'
                  }`}>
                    <span>Чек-лист</span>
                    <span className="font-bold">{progress}%</span>
                  </div>
                  
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-zinc-200'}`}>
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="space-y-1 max-h-[140px] overflow-y-auto scrollbar-thin">
                    {task.checklist.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleCheckItem(task.id, item.id)}
                        className={`w-full flex items-start gap-2 text-left text-[11px] transition-colors cursor-pointer p-1 rounded-lg ${
                          theme === 'dark'
                            ? 'text-slate-300 hover:bg-white/5'
                            : 'text-zinc-600 hover:bg-zinc-100'
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-3 h-3 rounded-full shrink-0 mt-0.5 border-2 border-amber-500" />
                        )}
                        <span className={item.done ? 'line-through text-slate-500' : ''}>
                          {item.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action buttons footer */}
              <div className={`pt-3 border-t space-y-2 ${theme === 'dark' ? 'border-white/5' : 'border-zinc-200'}`}>
                {task.status !== 'completed' ? (
                  <button
                    onClick={() => {
                      setSelectedTaskId(null);
                      startVerificationProcess(task);
                    }}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1 hover:brightness-110 cursor-pointer active:scale-95 transition-all"
                  >
                    <Sparkles size={11} />
                    <span>Сдать через ИИ Ревизора</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg text-emerald-400 text-[10px]">
                    <ShieldCheck size={12} className="shrink-0" />
                    <span>Верифицировано ИИ ({task.score} баллов)</span>
                  </div>
                )}
              </div>

            </motion.div>
          </>
          );
        })()}
      </AnimatePresence>

      {/* PLASMA DETAILS SIDEBAR FOR UNIVERSE PLANETARY PROJECT */}
      <AnimatePresence>
        {zoomLevel === 'universe' && selectedUniverseProject && (
          <motion.div
            initial={isMobileScreen ? { y: 400, opacity: 0 } : { x: 380, opacity: 0 }}
            animate={isMobileScreen ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={isMobileScreen ? { y: 400, opacity: 0 } : { x: 380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`absolute z-50 overflow-y-auto p-5 backdrop-blur-2xl border shadow-2xl flex flex-col justify-between font-sans ${
              isMobileScreen
                ? 'inset-x-0 bottom-0 max-h-[75vh] rounded-t-3xl border-t border-amber-500/30 bg-zinc-950/95 text-white'
                : 'top-0 right-0 bottom-0 w-full sm:w-96 border-l border-amber-500/20 bg-zinc-950/90 text-white shadow-[0_0_40px_rgba(245,158,11,0.15)]'
            }`}
            id="plasma-project-details-sidebar"
          >
            {/* Mobile handle indicator */}
            {isMobileScreen && (
              <div className="w-12 h-1.5 rounded-full bg-zinc-700 mx-auto mb-3 shrink-0" />
            )}

            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  {(() => {
                    const tier = getProjectOrbitCategory(selectedUniverseProject);
                    return (
                      <span className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase inline-flex items-center gap-1 ${
                        tier === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                          : tier === 'completed'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {tier === 'critical' ? '🔴 Внутренняя орбита — Критический' : tier === 'completed' ? '🔵 Внешняя орбита — Завершен' : '🟡 Средняя орбита — В работе'}
                      </span>
                    );
                  })()}
                  <h3 className="text-sm sm:text-base font-black text-white mt-1.5 leading-snug">
                    {selectedUniverseProject.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedUniverseProjectId(null)}
                  className="w-8 h-8 rounded-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 text-amber-300 hover:text-white font-black text-lg flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-lg"
                  title="Закрыть"
                >
                  ✕
                </button>
              </div>

              {/* AI Risk Evaluation Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-zinc-950 border border-amber-500/20 space-y-1.5 relative overflow-hidden shadow-inner">
                <div className="flex items-center gap-1.5 text-amber-400 text-[10px] uppercase tracking-wider font-extrabold">
                  <Sparkles size={12} className="text-amber-400" />
                  <span>Оценка рисков & Анализ ИИ Ревизора</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {selectedUniverseProject.evaluation || 'Системный проект с плановой декомпозицией задач и верификацией результатов.'}
                </p>
                {selectedUniverseProject.recommendations && (
                  <div className="pt-2 border-t border-white/5 text-[11px] text-amber-200/90 italic">
                    💡 {selectedUniverseProject.recommendations}
                  </div>
                )}
              </div>

              {/* Project Progress Gauge & Metrics HUD */}
              {(() => {
                const metrics = calculateProjectMetrics(selectedUniverseProject);
                return (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Прогресс</span>
                      <div className="text-lg font-black text-amber-400 font-mono mt-1">
                        {metrics.pct}%
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${metrics.pct}%` }} />
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 font-mono">{metrics.completed} из {metrics.total} задач</span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">ИИ Качество</span>
                      <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                        {metrics.avgScore > 0 ? `${metrics.avgScore}/100` : '—'}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1">Средний балл верификации</span>
                    </div>
                  </div>
                );
              })()}

              {/* Manager & Budget info */}
              <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 text-xs grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase font-bold">Руководитель</span>
                  <span className="text-white font-bold">{selectedUniverseProject.manager || 'ИИ Ревизор'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block uppercase font-bold">Бюджет</span>
                  <span className="text-amber-300 font-bold">{selectedUniverseProject.budget ? `${selectedUniverseProject.budget.toLocaleString()} ₽` : '150 000 ₽'}</span>
                </div>
              </div>

              {/* Tasks List Breakdown Preview */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 block">
                  Задачи в проекте ({selectedUniverseProject.tasks.length})
                </span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {selectedUniverseProject.tasks.map(task => (
                    <div
                      key={task.id}
                      className="p-2 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 truncate max-w-[200px]">
                        <div className="text-white font-bold truncate text-[11px]">{task.taskTitle}</div>
                        <div className="text-[9px] text-zinc-500">{task.executorName}</div>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black font-mono ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : task.status === 'delayed'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {task.status === 'completed' ? '✓ Готово' : task.status === 'delayed' ? '⚠ Просрочено' : 'В работе'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-4 border-t border-white/10 mt-3">
              <button
                onClick={() => {
                  if (selectedUniverseProject) {
                    const projId = selectedUniverseProject.id;
                    setSelectedUniverseProjectId(null);
                    setSelectedProjectId(projId);
                    setZoomLevel('galaxy');
                    handleResetView('galaxy');
                    if (onSelectProject) onSelectProject(projId);
                    if (onNavigate) onNavigate(`/cabinet/revisor/${projId}/map`);
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer"
              >
                <Globe size={16} className="animate-spin-slow" />
                <span>🪐 Открыть карту задач проекта</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERNAL PROJECT INFO & EDITOR MODAL (Triggered when clicking central core) */}
      <AnimatePresence>
        {showInternalProjectModal && selectedProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-2xl w-full p-6 text-white shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden font-sans space-y-5"
            >
              {/* Background ambient glow */}
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      🪐 Центр Управления Проектом
                    </span>
                    <span className="text-xs font-mono text-zinc-400">ID: {selectedProject.id}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-amber-100 leading-tight">
                    {selectedProject.title}
                  </h2>
                </div>
                <button
                  onClick={() => setShowInternalProjectModal(false)}
                  className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-amber-500/20 border border-white/10 text-zinc-400 hover:text-amber-300 font-bold flex items-center justify-center transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Project Metrics HUD */}
              {(() => {
                const metrics = calculateProjectMetrics(selectedProject);
                return (
                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-amber-500/20">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">Прогресс выполнения</span>
                      <div className="text-2xl font-black text-amber-400 mt-1">{metrics.pct}%</div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${metrics.pct}%` }} />
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-emerald-500/20">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">ИИ Оценка качества</span>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        {metrics.avgScore > 0 ? `${metrics.avgScore}/100` : '—'}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 block">Верифицировано ИИ</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-amber-500/20">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">Всего Задач</span>
                      <div className="text-2xl font-black text-amber-200 mt-1">{metrics.total}</div>
                      <span className="text-[9px] text-emerald-400 mt-1 block">{metrics.completed} готово</span>
                    </div>
                  </div>
                );
              })()}

              {/* Details & Info */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2">
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-400 block">Промпт & ТЗ Проекта</span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {selectedProject.prompt || selectedProject.evaluation || 'Проект сформирован в ИИ Ревизоре для автоматической декомпозиции и контроля орбит задач.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Руководитель</span>
                    <span className="text-white font-bold">{selectedProject.manager || 'ИИ Ревизор'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5">
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Бюджет</span>
                    <span className="text-amber-300 font-bold">{selectedProject.budget ? `${selectedProject.budget.toLocaleString()} ₽` : '150 000 ₽'}</span>
                  </div>
                </div>
              </div>

              {/* Tasks Orbit Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-zinc-400 text-[10px]">
                    Задачи на орбите ({selectedProjectTasks.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                  {selectedProjectTasks.map(task => (
                    <div key={task.id} className="p-2.5 rounded-xl bg-zinc-900/80 border border-white/5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 truncate max-w-[320px]">
                        <div className="text-amber-100 font-bold truncate text-[11px]">{task.taskTitle}</div>
                        <div className="text-[9px] text-zinc-400">{task.executorName || 'Исполнитель'}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTaskItem(task);
                            setShowEditTaskModal(true);
                          }}
                          className="p-1 rounded-lg border border-amber-400/40 hover:bg-amber-500/20 text-[#E7C768] cursor-pointer transition-all shadow-xs"
                          title="Редактировать задачу"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          className="p-1 rounded-lg border border-red-500/40 hover:bg-red-500/20 text-red-400 cursor-pointer transition-all shadow-xs"
                          title="Удалить задачу"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono ${
                          task.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : task.status === 'delayed'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {task.status === 'completed' ? '✓ Завершено' : task.status === 'delayed' ? '⚠ Критический риски' : 'В работе'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowInternalProjectModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROJECT STATISTICS & FUNNEL PYRAMID MODAL */}
      <AnimatePresence>
        {(isStatsModalOpen || showStatsPyramidModal) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-3xl w-full p-6 text-white shadow-[0_0_50px_rgba(245,158,11,0.25)] relative overflow-hidden font-sans space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Аналитика & Статистика
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-amber-100">
                    Статистика Проектов и Воронка Пирамиды
                  </h2>
                </div>
                <button
                  onClick={() => {
                    if (setIsStatsModalOpen) setIsStatsModalOpen(false);
                    setShowStatsPyramidModal(false);
                  }}
                  className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-amber-500/20 border border-white/10 text-zinc-400 hover:text-amber-300 font-bold flex items-center justify-center transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 3 STATISTICAL BLOCKS: CRITICAL, ACTIVE, COMPLETED */}
              {(() => {
                const total = processes.length || 1;
                const criticalCount = processes.filter(p => getProjectOrbitCategory(p) === 'critical').length;
                const activeCount = processes.filter(p => getProjectOrbitCategory(p) === 'active').length;
                const completedCount = processes.filter(p => getProjectOrbitCategory(p) === 'completed').length;

                const critPct = Math.round((criticalCount / total) * 100);
                const actPct = Math.round((activeCount / total) * 100);
                const compPct = Math.round((completedCount / total) * 100);

                return (
                  <div className="space-y-6">
                    {/* 3 Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                      {/* Critical Block */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-zinc-900 to-zinc-950 border border-rose-500/30 space-y-2 relative overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-300 flex items-center gap-1.5">
                            <Flame size={14} className="text-rose-400 animate-pulse" />
                            Критические
                          </span>
                          <span className="text-xs text-rose-400 font-bold">{critPct}%</span>
                        </div>
                        <div className="text-3xl font-black text-rose-200">{criticalCount}</div>
                        <div className="text-[9px] text-zinc-400 font-sans">Черные дыры (риски и просрочки)</div>
                      </div>

                      {/* Active Block */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 space-y-2 relative overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-300 flex items-center gap-1.5">
                            <Zap size={14} className="text-amber-400" />
                            В работе
                          </span>
                          <span className="text-xs text-amber-400 font-bold">{actPct}%</span>
                        </div>
                        <div className="text-3xl font-black text-amber-200">{activeCount}</div>
                        <div className="text-[9px] text-zinc-400 font-sans">Пульсары (активный процесс)</div>
                      </div>

                      {/* Completed Block */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-950/40 via-zinc-900 to-zinc-950 border border-amber-400/40 space-y-2 relative overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-200 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-[#F4EE8E]" />
                            Завершенные
                          </span>
                          <span className="text-xs text-[#F4EE8E] font-bold">{compPct}%</span>
                        </div>
                        <div className="text-3xl font-black text-amber-100">{completedCount}</div>
                        <div className="text-[9px] text-zinc-400 font-sans">Сверхновые (верифицировано ИИ)</div>
                      </div>
                    </div>

                    {/* PYRAMID FUNNEL VISUALIZATION (Воронка в виде пирамиды) */}
                    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                          <Sparkles size={14} />
                          Воронка выполнения проектов (Пирамида)
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">Конверсия орбит</span>
                      </div>

                      {/* Stacked Funnel Pyramid Trapezoids */}
                      <div className="flex flex-col items-center space-y-2 py-2">
                        {/* Level 1: Base - Widest (Total Initial Pool) */}
                        <div className="w-full max-w-lg h-12 rounded-xl bg-gradient-to-r from-amber-500/30 via-amber-400/40 to-amber-500/30 border border-amber-400/50 flex items-center justify-between px-5 shadow-lg backdrop-blur-md text-xs font-mono font-bold">
                          <span className="flex items-center gap-2 text-amber-200">
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">1</span>
                            <span>Исходный Пул (Все Проекты)</span>
                          </span>
                          <span className="text-amber-300 font-extrabold">{total} шт. (100%)</span>
                        </div>

                        {/* Level 2: Critical Risks (Черные дыры) */}
                        <div className="w-[85%] max-w-md h-11 rounded-xl bg-gradient-to-r from-rose-500/20 via-rose-400/30 to-rose-500/20 border border-rose-400/40 flex items-center justify-between px-5 shadow-lg backdrop-blur-md text-xs font-mono font-bold">
                          <span className="flex items-center gap-2 text-rose-200">
                            <span className="w-5 h-5 rounded-full bg-rose-400 text-slate-950 flex items-center justify-center font-black text-[10px]">2</span>
                            <span>Критические (Черные дыры)</span>
                          </span>
                          <span className="text-rose-300 font-extrabold">{criticalCount} шт. ({critPct}%)</span>
                        </div>

                        {/* Level 3: Active (Пульсары) */}
                        <div className="w-[70%] max-w-sm h-10 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-300/30 to-amber-500/20 border border-amber-300/40 flex items-center justify-between px-4 shadow-lg backdrop-blur-md text-[11px] font-mono font-bold">
                          <span className="flex items-center gap-2 text-amber-100">
                            <span className="w-4 h-4 rounded-full bg-amber-300 text-slate-950 flex items-center justify-center font-black text-[9px]">3</span>
                            <span>В работе (Пульсары)</span>
                          </span>
                          <span className="text-amber-200 font-extrabold">{activeCount} шт. ({actPct}%)</span>
                        </div>

                        {/* Level 4: Apex - Narrowest (Completed Supernovas) */}
                        <div className="w-[52%] max-w-xs h-10 rounded-xl bg-gradient-to-r from-yellow-500/30 via-amber-400/40 to-yellow-500/30 border border-amber-300/60 flex items-center justify-between px-4 shadow-xl backdrop-blur-md text-[11px] font-mono font-bold">
                          <span className="flex items-center gap-2 text-amber-100">
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[9px]">4</span>
                            <span>Завершенные (Сверхновые)</span>
                          </span>
                          <span className="text-amber-200 font-extrabold">{completedCount} шт. ({compPct}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Close Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end">
                <button
                  onClick={() => {
                    if (setIsStatsModalOpen) setIsStatsModalOpen(false);
                    setShowStatsPyramidModal(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

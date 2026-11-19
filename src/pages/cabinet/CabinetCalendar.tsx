import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from 'lucide-react';
import { SubmittedReport, UserProfile, UserRole, Department } from '../../types';
import { getAcceptedPlansForCalendarDate } from '../../utils/planMatching';
import { CalendarFiltersBar } from '../../components/calendar/CalendarFiltersBar';
import { CalendarReportsListView } from '../../components/calendar/CalendarReportsListView';
import { MobileCalendarDaySummary } from '../../components/calendar/MobileCalendarDaySummary';
import { CalendarDayModal } from '../../components/calendar/modals/CalendarDayModal';
import { CalendarSystemSettingsModal } from '../../components/calendar/modals/CalendarSystemSettingsModal';

interface CabinetCalendarProps {
  currentUser: UserProfile | null;
  reports: SubmittedReport[];
  setReports: (val: SubmittedReport[]) => void;
  departments: Department[];
  mockEmployees: UserProfile[];
  saveStateToServer: (updated: any) => void;
  triggerAI: (prompt: string, sys: string, cb: (text: string) => void, mascot?: any) => void;
  // Sync state items
  company: any;
  templates: any;
  transactions: any;
  notifications: any;
  tariff: any;
  crmCompanies: any;
  promptManagerFeedback?: string;
  theme?: 'dark' | 'light';
  onNavigate?: (path: string) => void;
  currentPath?: string;
}

export default function CabinetCalendar({
  currentUser,
  reports,
  setReports,
  departments,
  mockEmployees,
  saveStateToServer,
  triggerAI,
  company,
  templates,
  transactions,
  notifications,
  tariff,
  crmCompanies,
  promptManagerFeedback,
  theme = 'dark',
  onNavigate,
  currentPath
}: CabinetCalendarProps) {
  const isDark = theme === 'dark';

  // Calendar states (defaults to device date)
  const todayObj = new Date();
  const currentDeviceDateStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  const [currentYear, setCurrentYear] = useState<number>(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayObj.getMonth()); // 0-indexed device month
  const [selectedDate, setSelectedDate] = useState<string>(currentDeviceDateStr);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Helper for safe report date extraction
  const getReportDateStr = (r: any) => {
    if (!r) return '';
    const raw = r.timestamp || r.createdAt || '';
    if (typeof raw === 'string') {
      if (raw.includes('T')) return raw.split('T')[0];
      if (raw.length >= 10) return raw.substring(0, 10);
    }
    return '';
  };

  // Traffic light settings and system IDs (stored in PostgreSQL BD ProTalk: raport_system_settings)
  const [greenThreshold, setGreenThreshold] = useState<number>(80);
  const [yellowThreshold, setYellowThreshold] = useState<number>(50);
  const [settingsCompanyId, setSettingsCompanyId] = useState<string>(currentUser?.company_id || company?.id || 'flagship-main');
  const [settingsDirectorId, setSettingsDirectorId] = useState<string>(currentUser?.id || '91827364501');
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState<boolean>(false);
  const [reviewSavedToast, setReviewSavedToast] = useState<boolean>(false);

  // Load traffic light settings and fresh reports from PostgreSQL BD ProTalk database
  useEffect(() => {
    const cId = currentUser?.company_id || company?.id || 'flagship-main';
    const dId = currentUser?.id || '91827364501';

    fetch(`/api/cabinet/traffic-light-settings?company_id=${encodeURIComponent(cId)}&director_id=${encodeURIComponent(dId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          if (typeof data.settings.traffic_light_green === 'number') {
            setGreenThreshold(data.settings.traffic_light_green);
          }
          if (typeof data.settings.traffic_light_yellow === 'number') {
            setYellowThreshold(data.settings.traffic_light_yellow);
          }
          if (data.settings.company_id) {
            setSettingsCompanyId(data.settings.company_id);
          }
          if (data.settings.director_id) {
            setSettingsDirectorId(data.settings.director_id);
          }
        }
      })
      .catch(err => console.warn('Ошибка загрузки настроек светофора из PostgreSQL BD ProTalk:', err));

    // Fetch fresh reports from PostgreSQL BD ProTalk strictly filtered by company and director
    fetch(`/api/reports?company_id=${encodeURIComponent(cId)}&director_id=${encodeURIComponent(dId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.reports)) {
          setReports(data.reports);
        }
      })
      .catch(err => console.warn('Ошибка загрузки рапортов из PostgreSQL BD ProTalk:', err));
  }, [currentUser, company]);

  const saveThresholdsToDb = async (g: number, y: number, cId = settingsCompanyId, dId = settingsDirectorId) => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/cabinet/traffic-light-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          greenThreshold: g, 
          yellowThreshold: y,
          company_id: cId,
          director_id: dId
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSavedToast(true);
        setTimeout(() => setSettingsSavedToast(false), 3000);
      }
    } catch (e) {
      console.error('Ошибка фиксации системных настроек светофора в PostgreSQL BD ProTalk:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const canAdjustThresholds = currentUser && (
    currentUser.role === UserRole.DIRECTOR || 
    currentUser.role === UserRole.ADMIN || 
    currentUser.role === UserRole.MANAGER
  );

  // Filters
  const [calendarFilterDept, setCalendarFilterDept] = useState('All');
  const [calendarFilterEmp, setCalendarFilterEmp] = useState(() => currentUser?.name || 'All');
  const [colorFilter, setColorFilter] = useState<'All' | 'green' | 'yellow' | 'red'>('All');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);

  // Selected report for manager review card
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // New interactive modal states
  const [activeModalDate, setActiveModalDate] = useState<string | null>(null);
  const [modalReportIdx, setModalReportIdx] = useState<number>(0);
  const [modalEmployeeFilter, setModalEmployeeFilter] = useState<string>('All');

  // Compute all available unique employee names across reports and mocks
  const availableEmployeeNames = React.useMemo(() => {
    const names = new Set<string>();
    if (mockEmployees && Array.isArray(mockEmployees)) {
      mockEmployees.forEach(e => { if (e && e.name) names.add(e.name.trim()); });
    }
    if (reports && Array.isArray(reports)) {
      reports.forEach(r => {
        const n = r.employeeName || (r as any).employee_name;
        if (n) names.add(String(n).trim());
      });
    }
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [mockEmployees, reports]);

  // Manager interactive states
  const [managerComment, setManagerComment] = useState('');
  const [managerTask, setManagerTask] = useState('');
  const [fieldComments, setFieldComments] = useState<Record<string, string>>({});
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  // Modal active tab: 'reports' | 'checklist'
  const [modalActiveTab, setModalActiveTab] = useState<'reports' | 'checklist'>('reports');

  // Interactive plan item completion toggle
  const handleTogglePlanItem = async (reportId: string, itemId: string, completed: boolean) => {
    // 1. Optimistic state update in reports
    const updatedReports = reports.map(r => {
      if (r.id === reportId) {
        const rawPlan = r.aiPlan || (r as any).ai_plan || [];
        const nextPlan = rawPlan.map((p: any) =>
          p.id === itemId ? { ...p, completed } : p
        );
        return {
          ...r,
          aiPlan: nextPlan,
          ai_plan: nextPlan
        };
      }
      return r;
    });

    setReports(updatedReports);
    saveStateToServer({
      company, departments, templates, reports: updatedReports,
      transactions, notifications, tariff, crmCompanies, mockEmployees
    });

    // 2. Persist to PostgreSQL BD ProTalk
    try {
      await fetch(`/api/reports/${reportId}/toggle-plan-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, completed })
      });
    } catch (e) {
      console.warn('Ошибка фиксации статуса пункта плана в PostgreSQL BD ProTalk:', e);
    }
  };

  // Recording Simulation for Comments
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  // Month names
  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Recording interval
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle reactions
  const handleAddReaction = (reaction: string) => {
    if (!selectedReport) return;
    setSelectedReaction(reaction);

    const updated = reports.map(r => {
      if (r.id === selectedReport.id) {
        return {
          ...r,
          managerReaction: reaction
        };
      }
      return r;
    });

    setReports(updated);
    saveStateToServer({ company, departments, templates, reports: updated, transactions, notifications, tariff, crmCompanies });
  };

  // Handle voice recording simulation for manager comments
  const toggleManagerVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      setManagerComment(prev => prev + ' Смена зафиксирована. Отличные финансовые показатели за вчерашний день, план по выручке перевыполнен. Задачи на сегодня утверждены. Продолжаем в том же духе!');
    } else {
      setIsRecording(true);
      setRecordTimer(0);
    }
  };

  // Save review items to PostgreSQL BD ProTalk and local state
  const handleSaveReview = async () => {
    if (!selectedReport) return;

    const updated = reports.map(r => {
      if (r.id === selectedReport.id) {
        return {
          ...r,
          managerComment: managerComment || r.managerComment,
          managerTask: managerTask || r.managerTask,
          managerReaction: selectedReaction || r.managerReaction,
          fieldComments: { ...r.fieldComments, ...fieldComments },
          isReviewedByManager: true
        };
      }
      return r;
    });

    setReports(updated);
    saveStateToServer({ company, departments, templates, reports: updated, transactions, notifications, tariff, crmCompanies });

    try {
      await fetch(`/api/reports/${selectedReport.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerComment: managerComment || selectedReport.managerComment,
          managerTask: managerTask || selectedReport.managerTask,
          managerReaction: selectedReaction || selectedReport.managerReaction,
          fieldComments: { ...selectedReport.fieldComments, ...fieldComments }
        })
      });
      setReviewSavedToast(true);
      setTimeout(() => setReviewSavedToast(false), 3500);
    } catch (e) {
      console.error('Ошибка сохранения рецензии в PostgreSQL BD ProTalk:', e);
    }
  };

  // AI draft feedback helper
  const handleAIBossFeedback = () => {
    if (!selectedReport) return;

    const sysPrompt = promptManagerFeedback || `Ты — опытный, мудрый генеральный директор компании. Твоя задача — прочитать отчет сотрудника и составить короткий, мотивирующий, но деловой отзыв руководителя на русском языке (1-2 предложения). Можешь похвалить за высокие показатели или подсказать решение проблем, если они указаны.`;
    const promptText = `Отчет сотрудника ${selectedReport.employeeName} (${selectedReport.templateTitle}):
${Object.entries(selectedReport.answers).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
Напиши профессиональный отзыв начальника.`;

    triggerAI(promptText, sysPrompt, (text) => {
      setManagerComment(text.trim());
    }, 'happy');
  };

  // Generate days in grid
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    
    // Find the starting day of the week (0 = Sunday, we shift to Monday-start)
    let startDayOfWeek = date.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    // Padding for previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNum: null, dateStr: null });
    }

    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days.push({
        dayNum: d,
        dateStr: `${year}-${monthStr}-${dayStr}`
      });
    }

    return days;
  };

  const daysGrid = getDaysInMonth(currentYear, currentMonth);

  // Navigation of month
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedReport(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedReport(null);
  };

  // Filter reports
  const filteredSubmittedReports = reports.filter(r => {
    // Dept filter
    if (calendarFilterDept !== 'All' && r.departmentId !== calendarFilterDept) return false;
    // Employee filter
    if (calendarFilterEmp !== 'All' && !r.employeeName.includes(calendarFilterEmp)) return false;
    // Requirement 4: Color status traffic-light filter
    if (colorFilter !== 'All') {
      const repColor = r.statusColor || (r.qualityScore >= greenThreshold ? 'green' : r.qualityScore >= yellowThreshold ? 'yellow' : 'red');
      if (repColor !== colorFilter) return false;
    }
    return true;
  });

  const openModalForDate = (dateStr: string, preferredTab?: 'reports' | 'checklist') => {
    const dayReports = filteredSubmittedReports.filter((r) => getReportDateStr(r) === dateStr);
    const dayPlans = getAcceptedPlansForCalendarDate(reports, dateStr, calendarFilterEmp);
    const totalPlanTasks = dayPlans.reduce((acc, g) => acc + g.totalCount, 0);

    setActiveModalDate(dateStr);
    setModalReportIdx(0);

    if (preferredTab) {
      setModalActiveTab(preferredTab);
    } else if (dayReports.length > 0) {
      setModalActiveTab('reports');
    } else if (totalPlanTasks > 0) {
      setModalActiveTab('checklist');
    } else {
      setModalActiveTab('reports');
    }

    if (dayReports.length > 0) {
      const rep = dayReports[0];
      setSelectedReport(rep);
      setManagerComment(rep.managerComment || '');
      setManagerTask(rep.managerTask || '');
      setFieldComments(rep.fieldComments || {});
      setSelectedReaction(rep.managerReaction || null);
    } else {
      setSelectedReport(null);
    }
  };

  const selectedDayReports = filteredSubmittedReports.filter(
    (r) => getReportDateStr(r) === selectedDate
  );
  const selectedDayPlans = getAcceptedPlansForCalendarDate(reports, selectedDate, calendarFilterEmp);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in" id="panel-calendar">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className={`text-xl font-bold font-sans ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
            Календарь отчетов
          </h3>
          <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-stone-700'}`}>
            Интерактивный календарный аудит сданных рапортов с оценкой ИИ и пультом руководителя.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Toggle View Mode */}
          <div
            className={`flex items-center p-1 rounded-xl border backdrop-blur-sm ${
              isDark ? 'bg-[#1A0F02]/80 border-amber-400/30' : 'bg-white/80 border-amber-900/20'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? isDark
                    ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 shadow'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow'
                  : isDark
                    ? 'text-amber-200 hover:text-white'
                    : 'text-stone-700 hover:text-amber-950'
              }`}
            >
              Календарь
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? isDark
                    ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 shadow'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow'
                  : isDark
                    ? 'text-amber-200 hover:text-white'
                    : 'text-stone-700 hover:text-amber-950'
              }`}
            >
              Список
            </button>
          </div>

          {/* Today button & Navigation Month buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
                  now.getDate()
                ).padStart(2, '0')}`;
                setCurrentYear(now.getFullYear());
                setCurrentMonth(now.getMonth());
                setSelectedDate(nowStr);
                openModalForDate(nowStr);
              }}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-amber-400/50 bg-amber-500/20 text-[#F4EE8E] hover:bg-amber-500/30 shadow-[0_0_15px_rgba(244,238,142,0.15)]'
                  : 'border-amber-900/30 bg-amber-100 text-amber-950 hover:bg-amber-200'
              }`}
              title="Перейти на сегодня"
            >
              <CalendarIcon size={16} />
              <span>Сегодня</span>
            </button>

            <div
              className={`flex items-center gap-1 p-1 rounded-xl border ${
                isDark ? 'bg-[#1A0F02]/80 border-amber-400/30' : 'bg-white/80 border-amber-900/20'
              }`}
            >
              <button
                type="button"
                onClick={prevMonth}
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg cursor-pointer transition-all ${
                  isDark
                    ? 'hover:bg-amber-500/20 text-stone-300 hover:text-white'
                    : 'hover:bg-amber-100 text-stone-700 hover:text-amber-950'
                }`}
                title="Предыдущий месяц"
              >
                <ChevronLeft size={18} />
              </button>
              <span
                className={`text-sm font-bold font-sans px-2 min-w-[116px] text-center ${
                  isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}
              >
                {monthNamesRu[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg cursor-pointer transition-all ${
                  isDark
                    ? 'hover:bg-amber-500/20 text-stone-300 hover:text-white'
                    : 'hover:bg-amber-100 text-stone-700 hover:text-amber-950'
                }`}
                title="Следующий месяц"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <CalendarFiltersBar
        isDark={isDark}
        isMobileFiltersOpen={isMobileFiltersOpen}
        setIsMobileFiltersOpen={setIsMobileFiltersOpen}
        calendarFilterDept={calendarFilterDept}
        setCalendarFilterDept={setCalendarFilterDept}
        calendarFilterEmp={calendarFilterEmp}
        setCalendarFilterEmp={setCalendarFilterEmp}
        colorFilter={colorFilter}
        setColorFilter={setColorFilter}
        departments={departments}
        reports={reports}
        canAdjustThresholds={canAdjustThresholds}
        onOpenSettings={() => setIsSystemSettingsOpen(true)}
        greenThreshold={greenThreshold}
        setGreenThreshold={setGreenThreshold}
        yellowThreshold={yellowThreshold}
        setYellowThreshold={setYellowThreshold}
        saveThresholdsToDb={saveThresholdsToDb}
      />

      {/* Real Calendar Grid (Preserves 7 columns in a row on mobile) / List View toggler */}
      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          <div
            className={`p-2.5 sm:p-5 rounded-2xl border backdrop-blur-md shadow-xl ${
              isDark
                ? 'bg-[#1A0F02]/70 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.12)]'
                : 'bg-white/75 border-amber-900/20 shadow-sm'
            }`}
            id="interactive-calendar-wrapper"
          >
            {/* Days Header (7 in a row, no uppercase) */}
            <div
              className={`grid grid-cols-7 text-center text-sm font-bold pb-2 sm:pb-3 border-b ${
                isDark ? 'text-amber-200/90 border-amber-400/20' : 'text-amber-950 border-amber-900/15'
              }`}
            >
              <div>Пн</div>
              <div>Вт</div>
              <div>Ср</div>
              <div>Чт</div>
              <div>Пт</div>
              <div className={isDark ? 'text-amber-300' : 'text-amber-900'}>Сб</div>
              <div className={isDark ? 'text-amber-300' : 'text-amber-900'}>Вс</div>
            </div>

            {/* Days Grid (Strict 7 columns in a row across all viewports) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2 sm:pt-3">
              {daysGrid.map((day, idx) => {
                if (!day.dayNum || !day.dateStr) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-transparent rounded-xl" />;
                }

                const dayReports = filteredSubmittedReports.filter(
                  (r) => getReportDateStr(r) === day.dateStr
                );

                const dayPlans = getAcceptedPlansForCalendarDate(
                  reports,
                  day.dateStr,
                  calendarFilterEmp
                );
                const totalPlanTasks = dayPlans.reduce((acc, g) => acc + g.totalCount, 0);
                const completedPlanTasks = dayPlans.reduce((acc, g) => acc + g.completedCount, 0);
                const hasPlanTasks = totalPlanTasks > 0;
                const allPlanTasksDone = hasPlanTasks && completedPlanTasks === totalPlanTasks;

                const isToday = day.dateStr === currentDeviceDateStr;
                const isSelected = day.dateStr === selectedDate;
                const hasContent = dayReports.length > 0 || hasPlanTasks;

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => {
                      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                      if (isMobile) {
                        if (selectedDate === day.dateStr) {
                          openModalForDate(day.dateStr);
                        } else {
                          setSelectedDate(day.dateStr);
                        }
                      } else {
                        setSelectedDate(day.dateStr);
                        openModalForDate(day.dateStr);
                      }
                    }}
                    className={`aspect-square p-1 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative select-none overflow-hidden cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'ring-2 ring-[#F4EE8E] border-[#F4EE8E] bg-amber-500/20 shadow-[0_0_20px_rgba(244,238,142,0.3)]'
                          : 'ring-2 ring-amber-700 border-amber-800 bg-amber-100/90 shadow-md'
                        : isToday
                          ? isDark
                            ? 'ring-1 ring-amber-400 border-[#E7C768] bg-[#140A01] shadow-[0_0_16px_rgba(244,238,142,0.22)]'
                            : 'ring-1 ring-amber-600 border-amber-700 bg-amber-50 shadow-sm'
                          : hasContent
                            ? isDark
                              ? 'bg-[#140A01]/80 border-amber-400/50 hover:border-[#E7C768] shadow-[0_0_12px_rgba(244,238,142,0.12)]'
                              : 'bg-white border-amber-500 hover:border-amber-700 shadow-xs'
                            : isDark
                              ? 'bg-[#140A01]/35 border-amber-400/25 text-stone-300 hover:border-amber-400/60 hover:bg-[#140A01]/60'
                              : 'bg-white/60 border-amber-900/20 text-stone-700 hover:border-amber-900/40 hover:bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full gap-0.5">
                      <span
                        className={`text-sm font-bold leading-none ${
                          isToday || isSelected
                            ? isDark
                              ? 'text-[#F4EE8E] font-extrabold'
                              : 'text-amber-950 font-extrabold'
                            : hasContent
                              ? isDark
                                ? 'text-white'
                                : 'text-amber-950'
                              : isDark
                                ? 'text-stone-300'
                                : 'text-stone-700'
                        }`}
                      >
                        {day.dayNum}
                      </span>

                      {isToday && (
                        <>
                          <span className="sm:hidden w-2 h-2 rounded-full bg-[#F4EE8E] border border-amber-500 shrink-0" />
                          <span
                            className={`hidden sm:inline text-sm font-bold px-1.5 py-0.5 rounded border leading-none ${
                              isDark
                                ? 'bg-amber-400/25 text-[#F4EE8E] border-amber-400/40'
                                : 'bg-amber-200 text-amber-950 border-amber-500'
                            }`}
                          >
                            Сегодня
                          </span>
                        </>
                      )}
                    </div>

                    {/* Badges / status markers inside square */}
                    <div className="flex flex-col gap-0.5 sm:gap-1 mt-auto w-full">
                      {hasPlanTasks && (
                        <div
                          className={`flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-sm font-bold border self-start max-w-full ${
                            allPlanTasksDone
                              ? isDark
                                ? 'bg-amber-400/20 text-[#F4EE8E] border-amber-400/50'
                                : 'bg-amber-100 text-amber-950 border-amber-400'
                              : isDark
                                ? 'bg-[#1A0F02] text-[#E7C768] border-amber-400/30'
                                : 'bg-white text-amber-950 border-amber-300'
                          }`}
                          title={`Чеклист задач плана ИИ: выполнено ${completedPlanTasks} из ${totalPlanTasks}`}
                        >
                          <CheckSquare
                            size={12}
                            className={`shrink-0 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-800'}`}
                          />
                          <span className="hidden sm:inline truncate leading-none">
                            {completedPlanTasks}/{totalPlanTasks}
                          </span>
                        </div>
                      )}

                      {dayReports.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 sm:gap-1 justify-end items-center">
                          {dayReports.slice(0, 3).map((rep) => {
                            let dotColor = 'bg-[#F4EE8E]';
                            const sColor =
                              rep.statusColor ||
                              (rep.qualityScore >= greenThreshold
                                ? 'green'
                                : rep.qualityScore >= yellowThreshold
                                  ? 'yellow'
                                  : 'red');
                            if (sColor === 'red') dotColor = 'bg-rose-400';
                            else if (sColor === 'yellow') dotColor = 'bg-amber-400';

                            const hasAcceptedPlan =
                              rep.ai_plan_status === 'accepted' || rep.aiPlanStatus === 'accepted';

                            return (
                              <div
                                key={rep.id}
                                className="flex items-center gap-0.5"
                                title={`${rep.employeeName}: ${rep.templateTitle} (${rep.qualityScore}/100)${
                                  hasAcceptedPlan ? ' • План принят' : ''
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${dotColor} block border border-black/20 shadow-sm`}
                                />
                                {hasAcceptedPlan && (
                                  <span className="hidden sm:inline text-sm text-[#F4EE8E] font-bold leading-none">
                                    ✓
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {dayReports.length > 3 && (
                            <span
                              className={`text-sm font-bold leading-none ${
                                isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                              }`}
                            >
                              +
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Selected Day Preview Summary directly beneath the 7-column grid */}
          <MobileCalendarDaySummary
            selectedDate={selectedDate}
            currentDeviceDateStr={currentDeviceDateStr}
            dayReports={selectedDayReports}
            dayPlans={selectedDayPlans}
            greenThreshold={greenThreshold}
            yellowThreshold={yellowThreshold}
            isDark={isDark}
            onOpenModal={(tab) => openModalForDate(selectedDate, tab)}
            onNavigate={onNavigate}
          />
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in" id="reports-list-wrapper">
          <CalendarReportsListView
            reports={filteredSubmittedReports}
            greenThreshold={greenThreshold}
            yellowThreshold={yellowThreshold}
            isDark={isDark}
            onNavigate={onNavigate}
            onSelectReport={(rep) => {
              const dStr = getReportDateStr(rep);
              setSelectedDate(dStr);
              openModalForDate(dStr, 'reports');
              const dayReps = filteredSubmittedReports.filter(
                (dr) => getReportDateStr(dr) === dStr
              );
              const idx = dayReps.findIndex((dr) => dr.id === rep.id);
              setModalReportIdx(idx >= 0 ? idx : 0);
              setSelectedReport(rep);
              setManagerComment(rep.managerComment || '');
              setManagerTask(rep.managerTask || '');
              setFieldComments(rep.fieldComments || {});
              setSelectedReaction(rep.managerReaction || null);
            }}
          />
        </div>
      )}

      <CalendarDayModal
        activeModalDate={activeModalDate}
        currentDeviceDateStr={currentDeviceDateStr}
        onClose={() => setActiveModalDate(null)}
        onSelectModalDate={(d) => {
          setSelectedDate(d);
          openModalForDate(d);
        }}
        reports={reports}
        filteredSubmittedReports={filteredSubmittedReports}
        templates={templates}
        currentUser={currentUser}
        availableEmployeeNames={availableEmployeeNames}
        modalEmployeeFilter={modalEmployeeFilter}
        setModalEmployeeFilter={setModalEmployeeFilter}
        modalActiveTab={modalActiveTab}
        setModalActiveTab={setModalActiveTab}
        modalReportIdx={modalReportIdx}
        setModalReportIdx={setModalReportIdx}
        selectedReport={selectedReport}
        setSelectedReport={setSelectedReport}
        managerComment={managerComment}
        setManagerComment={setManagerComment}
        managerTask={managerTask}
        setManagerTask={setManagerTask}
        fieldComments={fieldComments}
        setFieldComments={setFieldComments}
        selectedReaction={selectedReaction}
        setSelectedReaction={setSelectedReaction}
        isRecording={isRecording}
        recordTimer={recordTimer}
        reviewSavedToast={reviewSavedToast}
        greenThreshold={greenThreshold}
        yellowThreshold={yellowThreshold}
        isDark={isDark}
        getReportDateStr={getReportDateStr}
        handleTogglePlanItem={handleTogglePlanItem}
        handleAddReaction={handleAddReaction}
        toggleManagerVoice={toggleManagerVoice}
        handleSaveReview={handleSaveReview}
        handleAIBossFeedback={handleAIBossFeedback}
        onNavigate={onNavigate}
      />

      <CalendarSystemSettingsModal
        isOpen={isSystemSettingsOpen}
        onClose={() => setIsSystemSettingsOpen(false)}
        isDark={isDark}
        settingsCompanyId={settingsCompanyId}
        setSettingsCompanyId={setSettingsCompanyId}
        settingsDirectorId={settingsDirectorId}
        setSettingsDirectorId={setSettingsDirectorId}
        greenThreshold={greenThreshold}
        setGreenThreshold={setGreenThreshold}
        yellowThreshold={yellowThreshold}
        setYellowThreshold={setYellowThreshold}
        isSavingSettings={isSavingSettings}
        settingsSavedToast={settingsSavedToast}
        onSave={() =>
          saveThresholdsToDb(greenThreshold, yellowThreshold, settingsCompanyId, settingsDirectorId)
        }
      />
    </div>
  );
}

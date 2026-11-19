import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, SubmittedReport } from '../../types';
import { CompanyHeaderNav } from '../../components/ship/CompanyHeaderNav';
import { AiLoadingOverlay } from '../../components/common/AiLoadingOverlay';
import { 
  EmployeeSchedule, 
  ShiftType, 
  CustomShiftTemplate,
  SHIFT_TYPES_CONFIG,
  isPublicHoliday,
  parseShiftTimes,
  CompanyHoliday
} from '../../components/schedule/types';
import { ScheduleStatsCards } from '../../components/schedule/ScheduleStatsCards';
import { ScheduleFilterBar } from '../../components/schedule/ScheduleFilterBar';
import { ScheduleMonthView } from '../../components/schedule/ScheduleMonthView';
import { ScheduleWeekView } from '../../components/schedule/ScheduleWeekView';
import { ScheduleDayView } from '../../components/schedule/ScheduleDayView';
import { ScheduleHolidaysView } from '../../components/schedule/ScheduleHolidaysView';
import { Schedule30DaysModal } from '../../components/schedule/Schedule30DaysModal';
import { ScheduleGlobalTimezoneModal } from '../../components/schedule/ScheduleGlobalTimezoneModal';
import { ScheduleDeleteConfirmModal } from '../../components/schedule/ScheduleDeleteConfirmModal';
import { ScheduleShiftEditModal } from '../../components/schedule/ScheduleShiftEditModal';

interface CabinetScheduleGanttProps {
  currentUser: UserProfile | null;
  mockEmployees: UserProfile[];
  reports?: SubmittedReport[];
  onNavigate?: (path: string) => void;
}

export default function CabinetScheduleGantt({
  currentUser,
  mockEmployees,
  reports = [],
  onNavigate
}: CabinetScheduleGanttProps) {
  // Theme Detection (light vs dark)
  const [isLightTheme, setIsLightTheme] = useState(() => {
    return document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setIsLightTheme(document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('cabinet-theme-change', handleThemeChange);
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('cabinet-theme-change', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  // View Mode: 'day' | 'week' | 'month' | 'holidays'
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'holidays'>('month');

  // Company and RF Holidays from PostgreSQL BD ProTalk
  const [companyHolidays, setCompanyHolidays] = useState<CompanyHoliday[]>([]);

  // Date Selection States (Default to actual current date)
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDate());

  // Global Timezone State (Default: UTC+3 MSK)
  const [globalTimezone, setGlobalTimezone] = useState<string>('UTC+3 (MSK)');
  const [isGlobalTimezoneModalOpen, setIsGlobalTimezoneModalOpen] = useState(false);

  // Filters Modal / Drawer
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPattern, setFilterPattern] = useState<string>('all');

  // Custom Shift Templates State & Persistence
  const [customShiftTemplates, setCustomShiftTemplates] = useState<CustomShiftTemplate[]>([]);

  // Popover / Modal for Single Day Shift Editing
  const [dayInfoModal, setDayInfoModal] = useState<{
    employeeId: string;
    day: number;
  } | null>(null);

  // Real-time device date & clock live updates
  const [deviceClock, setDeviceClock] = useState(() => new Date());
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setDeviceClock(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const todayYear = deviceClock.getFullYear();
  const todayMonth = deviceClock.getMonth();
  const todayDay = deviceClock.getDate();
  const isViewingCurrentMonth = currentYear === todayYear && currentMonth === todayMonth;

  // Toggle to view from current date (hiding past days)
  const [hidePastDays, setHidePastDays] = useState(false);

  // Modals for Employee Editing and Deleting Schedule
  const [editingEmployeeSchedule, setEditingEmployeeSchedule] = useState<EmployeeSchedule | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<EmployeeSchedule | null>(null);

  // Save Toast & Batch State
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // AI Voice & Dispatcher
  const [aiVoicePrompt, setAiVoicePrompt] = useState('');
  const [aiVoiceAudioUrl, setAiVoiceAudioUrl] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Calculate days in selected month
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInMonthArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

  // Filtered array of days (optionally hiding past days in current month)
  const visibleDaysInMonth = useMemo(() => {
    if (hidePastDays && isViewingCurrentMonth) {
      return daysInMonthArray.filter(d => d >= todayDay);
    }
    return daysInMonthArray;
  }, [daysInMonthArray, hidePastDays, isViewingCurrentMonth, todayDay]);

  // Current Week 7 Days Array (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const dateObj = new Date(currentYear, currentMonth, selectedDay);
    const dayOfWeek = (dateObj.getDay() + 6) % 7; // Monday=0, Sunday=6
    const mondayDate = new Date(dateObj);
    mondayDate.setDate(dateObj.getDate() - dayOfWeek);

    const weekDays: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      weekDays.push(d.getDate());
    }
    return weekDays;
  }, [currentYear, currentMonth, selectedDay]);

  // Helper to generate shift schedule for employees
  const generateShiftsForEmployee = (empId: string, days: number[], pattern: string = '5/2') => {
    return days.map(day => {
      const dateObj = new Date(currentYear, currentMonth, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isPublicHoliday(currentYear, currentMonth, day);

      let type: ShiftType = isHoliday ? 'holiday' : isWeekend ? 'weekend' : 'day';
      let hours = isHoliday ? 'Праздник (x2)' : isWeekend ? 'Выходной' : '09:00 - 18:00 (обед 13:00-14:00)';

      if (pattern === '2/2') {
        const isWork = (day % 4 === 1 || day % 4 === 2);
        type = isWork ? (isHoliday ? 'holiday' : 'day') : 'weekend';
        hours = isWork ? '09:00 - 21:00' : 'Выходной';
      } else if (pattern === '1/3') {
        const isDailyShift = (day % 4 === 1);
        type = isDailyShift ? 'daily' : isHoliday ? 'holiday' : 'weekend';
        hours = isDailyShift ? '08:30 - 08:30' : 'Выходной';
      }

      return { day, type, hours, isHoliday };
    });
  };

  // Schedule Data State
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  // Load custom templates, holidays, and monthly schedules directly from PostgreSQL BD ProTalk backend
  const loadScheduleDataFromDb = async () => {
    setIsLoadingSchedules(true);
    try {
      // 1. Fetch holidays from PostgreSQL BD ProTalk
      try {
        const holRes = await fetch(`/api/schedules/holidays?year=${currentYear}`);
        if (holRes.ok) {
          const holJson = await holRes.json();
          if (holJson.success && Array.isArray(holJson.holidays)) {
            setCompanyHolidays(holJson.holidays);
          }
        }
      } catch (e) {
        console.warn('Failed to load holidays:', e);
      }

      const targetCompanyId = currentUser?.company_id || (currentUser?.id ? `com-${currentUser.id}` : '');
      const targetDirectorId = currentUser?.director_id || currentUser?.id || '';

      // 2. Fetch templates from PostgreSQL BD ProTalk
      const tplRes = await fetch(`/api/schedules/templates?company_id=${encodeURIComponent(targetCompanyId)}`);
      if (tplRes.ok) {
        const tplJson = await tplRes.json();
        if (tplJson.success && Array.isArray(tplJson.templates) && tplJson.templates.length > 0) {
          const mappedTpls: CustomShiftTemplate[] = tplJson.templates.map((t: any) => {
            let parsedDays: number[] = [1, 2, 3, 4, 5];
            if (t.selected_days) {
              try {
                parsedDays = typeof t.selected_days === 'string' ? JSON.parse(t.selected_days) : t.selected_days;
              } catch (e) {
                parsedDays = [1, 2, 3, 4, 5];
              }
            }
            const shiftCat = (t.shift_category || (t.pattern_type === '1/3' ? 'daily' : (t.work_start > t.work_end ? 'night' : 'day'))) as 'day' | 'night' | 'daily';
            const isCrossMid = Boolean(t.cross_midnight) || shiftCat === 'night' || (t.work_start && t.work_end && t.work_start > t.work_end);

            return {
              id: t.id,
              name: t.name,
              workStart: t.work_start || (shiftCat === 'night' ? '21:00' : shiftCat === 'daily' ? '08:30' : '09:00'),
              workEnd: t.work_end || (shiftCat === 'night' ? '07:00' : shiftCat === 'daily' ? '08:30' : '18:00'),
              lunchStart: t.lunch_start || (shiftCat === 'night' ? '01:00' : '13:00'),
              lunchEnd: t.lunch_end || (shiftCat === 'night' ? '02:00' : '14:00'),
              lunch2Start: t.lunch2_start || (shiftCat === 'daily' ? '20:00' : undefined),
              lunch2End: t.lunch2_end || (shiftCat === 'daily' ? '21:00' : undefined),
              patternType: (t.pattern_type || '5/2') as any,
              shiftCategory: shiftCat,
              selectedDays: parsedDays,
              crossMidnight: isCrossMid,
              isDefault: Boolean(t.is_default),
              description: t.description || ''
            };
          });
          setCustomShiftTemplates(mappedTpls);
        }
      }

      // 3. Fetch employee schedules and shifts for current year/month
      const schedRes = await fetch(
        `/api/schedules?year=${currentYear}&month=${currentMonth + 1}&company_id=${encodeURIComponent(targetCompanyId)}&director_id=${encodeURIComponent(targetDirectorId)}`
      );
      if (schedRes.ok) {
        const schedJson = await schedRes.json();
        if (schedJson.success && Array.isArray(schedJson.schedules)) {
          const dbSchedules: EmployeeSchedule[] = schedJson.schedules.map((emp: any) => {
            const shiftItems = (emp.shifts || []).map((sh: any) => ({
              id: sh.id || `${emp.id}_${sh.shift_date || sh.shiftDate}`,
              day: Number(sh.day),
              month: Number(sh.month || currentMonth + 1),
              year: Number(sh.year || currentYear),
              shiftDate: sh.shift_date || sh.shiftDate || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}`,
              type: (sh.shift_type || sh.type || 'weekend') as ShiftType,
              hours: sh.hours || sh.hours_text || 'Выходной',
              isHoliday: Boolean(sh.is_holiday || sh.isHoliday),
              workHours: Number(sh.work_hours || sh.workHours) || 0,
              workStart: sh.work_start || sh.workStart || '',
              workEnd: sh.work_end || sh.workEnd || '',
              lunchStart: sh.lunch_start || sh.lunchStart || '',
              lunchEnd: sh.lunch_end || sh.lunchEnd || '',
              lunch2Start: sh.lunch2_start || sh.lunch2Start || undefined,
              lunch2End: sh.lunch2_end || sh.lunch2End || undefined
            }));

            return {
              id: String(emp.employee_id || emp.id),
              name: emp.employee_name || emp.name || 'Сотрудник',
              role: emp.position || emp.role || 'Специалист',
              timezone: emp.timezone || 'UTC+3 (MSK)',
              totalHoursMonth: Number(emp.total_hours_month) || 168,
              patternType: emp.pattern_type || '5/2',
              shiftConfig: {
                dayHours: `${emp.work_start || '09:00'} - ${emp.work_end || '18:00'}`,
                lunchHours: `${emp.lunch_start || '13:00'} - ${emp.lunch_end || '14:00'}`,
                nightHours: '21:00 - 07:00',
                dailyHours: '08:30 - 08:30'
              },
              shifts: shiftItems.length > 0 ? shiftItems : generateShiftsForEmployee(String(emp.employee_id || emp.id), daysInMonthArray, emp.pattern_type || '5/2')
            };
          });

          // Deduplicate DB schedules by employee ID and normalized name
          const uniqueDbMap = new Map<string, EmployeeSchedule>();
          for (const s of dbSchedules) {
            const normName = s.name.trim().toLowerCase();
            const alreadyExists = Array.from(uniqueDbMap.values()).some(existing => 
              existing.id === s.id || existing.name.trim().toLowerCase() === normName
            );
            if (!alreadyExists) {
              uniqueDbMap.set(s.id, s);
            }
          }

          const uniqueDbList = Array.from(uniqueDbMap.values());
          
          // Strictly database truth: only employees from PostgreSQL BD ProTalk for this company
          if (uniqueDbList.length > 0) {
            setSchedules(uniqueDbList);
          } else if (currentUser) {
            // New company director without assigned shifts yet
            setSchedules([{
              id: currentUser.id,
              name: currentUser.name || 'Директор',
              role: currentUser.position || currentUser.role || 'Руководитель',
              timezone: currentUser.timezone || 'UTC+3 (MSK)',
              totalHoursMonth: 168,
              patternType: '5/2',
              shiftConfig: { dayHours: '09:00 - 18:00', lunchHours: '13:00 - 14:00', nightHours: '21:00 - 07:00', dailyHours: '08:30 - 08:30' },
              shifts: generateShiftsForEmployee(currentUser.id, daysInMonthArray, '5/2')
            }]);
          } else {
            setSchedules([]);
          }

          setIsLoadingSchedules(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load schedule from PostgreSQL BD ProTalk:', err);
    }

    // Fallback if network/DB error
    if (mockEmployees && mockEmployees.length > 0) {
      const fallbackList: EmployeeSchedule[] = mockEmployees.map(emp => ({
        id: emp.id,
        name: emp.name,
        role: emp.position || emp.role || 'Сотрудник',
        timezone: 'UTC+3 (MSK)',
        totalHoursMonth: 168,
        patternType: '5/2',
        shiftConfig: { dayHours: '09:00 - 18:00', lunchHours: '13:00 - 14:00', nightHours: '21:00 - 07:00', dailyHours: '08:00 - 08:00' },
        shifts: generateShiftsForEmployee(emp.id, daysInMonthArray, '5/2')
      }));
      setSchedules(fallbackList);
    }
    setIsLoadingSchedules(false);
  };

  useEffect(() => {
    loadScheduleDataFromDb();
  }, [currentMonth, currentYear, mockEmployees?.length]);

  // Ensure selectedDay is always clamped within valid days for the selected month
  useEffect(() => {
    const maxDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    } else if (selectedDay < 1) {
      setSelectedDay(1);
    }
  }, [currentYear, currentMonth, selectedDay]);

  // Date Navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      const nextYear = currentYear - 1;
      const nextMonth = 11;
      setCurrentMonth(nextMonth);
      setCurrentYear(nextYear);
      setSelectedDay(1);
    } else {
      const nextMonth = currentMonth - 1;
      setCurrentMonth(nextMonth);
      setSelectedDay(1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      const nextYear = currentYear + 1;
      const nextMonth = 0;
      setCurrentMonth(nextMonth);
      setCurrentYear(nextYear);
      setSelectedDay(1);
    } else {
      const nextMonth = currentMonth + 1;
      setCurrentMonth(nextMonth);
      setSelectedDay(1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDay(now.getDate());
  };

  // Month stats
  const monthStats = useMemo(() => {
    let dayCount = 0;
    let nightCount = 0;
    let dailyCount = 0;
    let weekendCount = 0;
    let vacationCount = 0;
    let sickCount = 0;

    schedules.forEach(emp => {
      emp.shifts.forEach(s => {
        if (s.type === 'day') dayCount++;
        else if (s.type === 'night') nightCount++;
        else if (s.type === 'daily') dailyCount++;
        else if (s.type === 'weekend') weekendCount++;
        else if (s.type === 'vacation') vacationCount++;
        else if (s.type === 'sick') sickCount++;
      });
    });

    return { dayCount, nightCount, dailyCount, weekendCount, vacationCount, sickCount };
  }, [schedules]);

  // Filtered schedules based on search and filters
  const filteredSchedules = useMemo(() => {
    return schedules.filter(emp => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesRole = emp.role.toLowerCase().includes(q);
        if (!matchesName && !matchesRole) return false;
      }
      if (filterDepartment !== 'all') {
        const matchesDept = emp.role.toLowerCase().includes(filterDepartment.toLowerCase());
        if (!matchesDept) return false;
      }
      if (filterPattern !== 'all' && emp.patternType !== filterPattern) {
        return false;
      }
      if (filterType !== 'all') {
        const hasShiftType = emp.shifts.some(s => s.type === filterType);
        if (!hasShiftType) return false;
      }
      return true;
    });
  }, [schedules, searchQuery, filterDepartment, filterPattern, filterType]);

  // Open 30-day editor with full 2-month prefetch
  const isManagerOrAdmin = ['director', 'admin', 'superadmin', 'head', 'manager'].includes(String(currentUser?.role).toLowerCase());

  const openEmployeeScheduleEditor = async (emp: EmployeeSchedule) => {
    if (!isManagerOrAdmin) {
      return; // Employees have read-only view of schedule
    }
    setEditingEmployeeSchedule(emp);
    try {
      const base = new Date(deviceClock);
      const startYear = base.getFullYear();
      const startMonth = base.getMonth() + 1;
      const nextMonthDate = new Date(base);
      nextMonthDate.setMonth(base.getMonth() + 1);
      const nextYear = nextMonthDate.getFullYear();
      const nextMonth = nextMonthDate.getMonth() + 1;

      const targetCompanyId = currentUser?.company_id || (currentUser?.id ? `com-${currentUser.id}` : '');
      const targetDirectorId = currentUser?.director_id || currentUser?.id || '';

      const [res1, res2] = await Promise.all([
        fetch(`/api/schedules?year=${startYear}&month=${startMonth}&company_id=${encodeURIComponent(targetCompanyId)}&director_id=${encodeURIComponent(targetDirectorId)}`),
        fetch(`/api/schedules?year=${nextYear}&month=${nextMonth}&company_id=${encodeURIComponent(targetCompanyId)}&director_id=${encodeURIComponent(targetDirectorId)}`)
      ]);

      const shiftsCombined: any[] = [];
      if (res1.ok) {
        const j1 = await res1.json();
        const empFound = (j1.schedules || []).find((s: any) => String(s.employee_id || s.id) === String(emp.id));
        if (empFound && empFound.shifts) {
          shiftsCombined.push(...empFound.shifts.map((sh: any) => ({
            id: sh.id || `${emp.id}_${sh.shift_date || sh.shiftDate}`,
            day: Number(sh.day),
            month: Number(sh.month || startMonth),
            year: Number(sh.year || startYear),
            shiftDate: sh.shift_date || sh.shiftDate || `${startYear}-${String(startMonth).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}`,
            type: (sh.shift_type || sh.type || 'weekend') as ShiftType,
            hours: sh.hours || sh.hours_text || 'Выходной',
            isHoliday: Boolean(sh.is_holiday || sh.isHoliday),
            workStart: sh.work_start || sh.workStart || '',
            workEnd: sh.work_end || sh.workEnd || '',
            lunchStart: sh.lunch_start || sh.lunchStart || '',
            lunchEnd: sh.lunch_end || sh.lunchEnd || '',
            lunch2Start: sh.lunch2_start || sh.lunch2Start || undefined,
            lunch2End: sh.lunch2_end || sh.lunch2End || undefined
          })));
        }
      }

      if (res2.ok) {
        const j2 = await res2.json();
        const empFound = (j2.schedules || []).find((s: any) => String(s.employee_id || s.id) === String(emp.id));
        if (empFound && empFound.shifts) {
          shiftsCombined.push(...empFound.shifts.map((sh: any) => ({
            id: sh.id || `${emp.id}_${sh.shift_date || sh.shiftDate}`,
            day: Number(sh.day),
            month: Number(sh.month || nextMonth),
            year: Number(sh.year || nextYear),
            shiftDate: sh.shift_date || sh.shiftDate || `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}`,
            type: (sh.shift_type || sh.type || 'weekend') as ShiftType,
            hours: sh.hours || sh.hours_text || 'Выходной',
            isHoliday: Boolean(sh.is_holiday || sh.isHoliday),
            workStart: sh.work_start || sh.workStart || '',
            workEnd: sh.work_end || sh.workEnd || '',
            lunchStart: sh.lunch_start || sh.lunchStart || '',
            lunchEnd: sh.lunch_end || sh.lunchEnd || '',
            lunch2Start: sh.lunch2_start || sh.lunch2Start || undefined,
            lunch2End: sh.lunch2_end || sh.lunch2End || undefined
          })));
        }
      }

      if (shiftsCombined.length > 0) {
        setEditingEmployeeSchedule(prev => {
          if (!prev) return null;
          const shiftMap = new Map();
          for (const s of prev.shifts) {
            const key = (s as any).shiftDate || `${(s as any).year || startYear}-${String((s as any).month || startMonth).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
            shiftMap.set(key, s);
          }
          for (const s of shiftsCombined) {
            const key = s.shiftDate || `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
            shiftMap.set(key, s);
          }
          return {
            ...prev,
            shifts: Array.from(shiftMap.values()) as any
          };
        });
      }
    } catch (err) {
      console.warn('Failed to prefetch shifts for employee:', err);
    }
  };

  // Helper to calculate daily work hours
  const calcWorkHours = (wStart: string, wEnd: string, lStart: string, lEnd: string, sType: ShiftType): number => {
    if (['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(sType)) return 0;
    if (sType === 'daily') return 22;
    if (!wStart || !wEnd) return 8;
    const [sH, sM] = wStart.split(':').map(Number);
    const [eH, eM] = wEnd.split(':').map(Number);
    let total = (eH * 60 + eM) - (sH * 60 + sM);
    if (total <= 0 || sType === 'night') {
      total = (24 * 60 - (sH * 60 + sM)) + (eH * 60 + eM);
    }
    if (lStart && lEnd && lStart !== lEnd) {
      const [lsH, lsM] = lStart.split(':').map(Number);
      const [leH, leM] = lEnd.split(':').map(Number);
      let lunch = (leH * 60 + leM) - (lsH * 60 + lsM);
      if (lunch < 0) lunch += 24 * 60;
      if (lunch > 0 && lunch < total) total -= lunch;
    } else {
      total -= 60;
    }
    return Math.max(0, Math.round((total / 60) * 10) / 10);
  };

  // Main unified single-shift updater (used across Day Gantt, Week view, and 30-Day Modal)
  const handleSaveShiftUpdate = async ({
    employeeId,
    dateStr,
    newType,
    workStart,
    workEnd,
    lunchStart,
    lunchEnd,
    lunch2Start = '20:00',
    lunch2End = '21:00',
    customTemplateName,
    customTemplateId
  }: {
    employeeId: string;
    dateStr: string;
    newType: ShiftType;
    workStart: string;
    workEnd: string;
    lunchStart: string;
    lunchEnd: string;
    lunch2Start?: string;
    lunch2End?: string;
    customTemplateName?: string;
    customTemplateId?: string;
  }) => {
    const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(newType);
    const [y, m, d] = dateStr.split('-').map(Number);

    let effectiveWorkStart = isNonWorking ? '' : (workStart || (newType === 'night' ? '21:00' : newType === 'daily' ? '08:30' : '09:00'));
    let effectiveWorkEnd = isNonWorking ? '' : (workEnd || (newType === 'night' ? '07:00' : newType === 'daily' ? '08:30' : '18:00'));
    let effectiveLunchStart = isNonWorking ? '' : (lunchStart || (newType === 'night' ? '01:00' : '13:00'));
    let effectiveLunchEnd = isNonWorking ? '' : (lunchEnd || (newType === 'night' ? '02:00' : '14:00'));

    let newHoursStr = '';
    if (customTemplateName && !isNonWorking) {
      newHoursStr = `${customTemplateName} (${effectiveWorkStart} - ${effectiveWorkEnd})`;
    } else if (newType === 'weekend') newHoursStr = 'Выходной';
    else if (newType === 'vacation') newHoursStr = 'Отпуск';
    else if (newType === 'sick') newHoursStr = 'Больничный';
    else if (newType === 'trip') newHoursStr = 'Командировка';
    else if (newType === 'dayoff') newHoursStr = 'Отгул';
    else if (newType === 'holiday') newHoursStr = `${effectiveWorkStart} - ${effectiveWorkEnd} (Праздник x2)`;
    else if (newType === 'night') newHoursStr = `${effectiveWorkStart} - ${effectiveWorkEnd} (ночная 🌙, +1 день)`;
    else if (newType === 'daily') newHoursStr = `${effectiveWorkStart} - ${effectiveWorkEnd} (суточная 24ч)`;
    else newHoursStr = `${effectiveWorkStart} - ${effectiveWorkEnd} (обед ${effectiveLunchStart}-${effectiveLunchEnd})`;

    const computedWorkHours = calcWorkHours(effectiveWorkStart, effectiveWorkEnd, effectiveLunchStart, effectiveLunchEnd, newType);

    // 1. Immediately update global `schedules` state (optimistic instant update)
    setSchedules(prev => prev.map(emp => {
      if (emp.id !== employeeId) return emp;

      let found = false;
      const updatedShifts = emp.shifts.map((sh: any) => {
        const shDate = sh.shiftDate || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}`;
        if (shDate === dateStr || (sh.day === d && (sh.month === m || currentMonth + 1 === m))) {
          found = true;
          return {
            ...sh,
            day: d,
            month: m,
            year: y,
            shiftDate: dateStr,
            shift_date: dateStr,
            type: newType,
            shift_type: newType,
            hours: newHoursStr,
            hours_text: newHoursStr,
            template_name: customTemplateName !== undefined ? customTemplateName : (isNonWorking ? undefined : undefined),
            template_id: customTemplateId !== undefined ? customTemplateId : (isNonWorking ? undefined : undefined),
            workHours: computedWorkHours,
            work_hours: computedWorkHours,
            workStart: effectiveWorkStart,
            work_start: effectiveWorkStart,
            workEnd: effectiveWorkEnd,
            work_end: effectiveWorkEnd,
            lunchStart: effectiveLunchStart,
            lunch_start: effectiveLunchStart,
            lunchEnd: effectiveLunchEnd,
            lunch_end: effectiveLunchEnd,
            lunch2Start: newType === 'daily' ? lunch2Start : undefined,
            lunch2End: newType === 'daily' ? lunch2End : undefined
          };
        }
        return sh;
      });

      if (!found) {
        updatedShifts.push({
          id: `${employeeId}_${dateStr}`,
          day: d,
          month: m,
          year: y,
          shiftDate: dateStr,
          shift_date: dateStr,
          type: newType,
          shift_type: newType,
          hours: newHoursStr,
          hours_text: newHoursStr,
          template_name: customTemplateName || undefined,
          template_id: customTemplateId || undefined,
          isHoliday: isPublicHoliday(y, m - 1, d),
          is_holiday: isPublicHoliday(y, m - 1, d) ? 1 : 0,
          workHours: computedWorkHours,
          work_hours: computedWorkHours,
          workStart: effectiveWorkStart,
          work_start: effectiveWorkStart,
          workEnd: effectiveWorkEnd,
          work_end: effectiveWorkEnd,
          lunchStart: effectiveLunchStart,
          lunch_start: effectiveLunchStart,
          lunchEnd: effectiveLunchEnd,
          lunch_end: effectiveLunchEnd,
          lunch2Start: newType === 'daily' ? lunch2Start : undefined,
          lunch2End: newType === 'daily' ? lunch2End : undefined
        } as any);
      }

      const totalH = updatedShifts.reduce((acc: number, cur: any) => acc + (Number(cur.workHours) || 0), 0);

      return {
        ...emp,
        shifts: updatedShifts,
        totalHoursMonth: Math.round(totalH * 10) / 10
      };
    }));

    // 2. If editingEmployeeSchedule modal is open for this employee, update it too
    setEditingEmployeeSchedule(prev => {
      if (!prev || prev.id !== employeeId) return prev;
      let found = false;
      const updatedShifts = prev.shifts.map((sh: any) => {
        const shDate = sh.shiftDate || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}`;
        if (shDate === dateStr || (sh.day === d && (sh.month === m || currentMonth + 1 === m))) {
          found = true;
          return {
            ...sh,
            day: d,
            month: m,
            year: y,
            shiftDate: dateStr,
            shift_date: dateStr,
            type: newType,
            shift_type: newType,
            hours: newHoursStr,
            hours_text: newHoursStr,
            template_name: customTemplateName !== undefined ? customTemplateName : (isNonWorking ? undefined : undefined),
            template_id: customTemplateId !== undefined ? customTemplateId : (isNonWorking ? undefined : undefined),
            workHours: computedWorkHours,
            work_hours: computedWorkHours,
            workStart: effectiveWorkStart,
            work_start: effectiveWorkStart,
            workEnd: effectiveWorkEnd,
            work_end: effectiveWorkEnd,
            lunchStart: effectiveLunchStart,
            lunch_start: effectiveLunchStart,
            lunchEnd: effectiveLunchEnd,
            lunch_end: effectiveLunchEnd,
            lunch2Start: newType === 'daily' ? lunch2Start : undefined,
            lunch2End: newType === 'daily' ? lunch2End : undefined
          };
        }
        return sh;
      });

      if (!found) {
        updatedShifts.push({
          id: `${employeeId}_${dateStr}`,
          day: d,
          month: m,
          year: y,
          shiftDate: dateStr,
          shift_date: dateStr,
          type: newType,
          shift_type: newType,
          hours: newHoursStr,
          hours_text: newHoursStr,
          template_name: customTemplateName || undefined,
          template_id: customTemplateId || undefined,
          isHoliday: isPublicHoliday(y, m - 1, d),
          is_holiday: isPublicHoliday(y, m - 1, d) ? 1 : 0,
          workHours: computedWorkHours,
          work_hours: computedWorkHours,
          workStart: effectiveWorkStart,
          work_start: effectiveWorkStart,
          workEnd: effectiveWorkEnd,
          work_end: effectiveWorkEnd,
          lunchStart: effectiveLunchStart,
          lunch_start: effectiveLunchStart,
          lunchEnd: effectiveLunchEnd,
          lunch_end: effectiveLunchEnd,
          lunch2Start: newType === 'daily' ? lunch2Start : undefined,
          lunch2End: newType === 'daily' ? lunch2End : undefined
        } as any);
      }

      const totalH = updatedShifts.reduce((acc: number, cur: any) => acc + (Number(cur.workHours) || 0), 0);

      return {
        ...prev,
        shifts: updatedShifts,
        totalHoursMonth: Math.round(totalH * 10) / 10
      };
    });

    // 3. Persist to PostgreSQL BD ProTalk in background
    try {
      await fetch('/api/schedules/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          shift_date: dateStr,
          year: y,
          month: m,
          day: d,
          shift_type: newType,
          work_start: effectiveWorkStart,
          work_end: effectiveWorkEnd,
          lunch_start: effectiveLunchStart,
          lunch_end: effectiveLunchEnd,
          lunch2_start: newType === 'daily' ? lunch2Start : null,
          lunch2_end: newType === 'daily' ? lunch2End : null,
          hours_text: newHoursStr,
          template_name: customTemplateName || null,
          template_id: customTemplateId || null
        })
      });
    } catch (e) {
      console.warn('Failed to persist shift in PostgreSQL BD ProTalk:', e);
    }
  };

  // Update a single day in 30-day editor (delegates to handleSaveShiftUpdate)
  const handleUpdate30DayShift = async (
    dateStr: string,
    newType: ShiftType,
    workStart: string,
    workEnd: string,
    l1Start: string,
    l1End: string,
    l2Start: string = '20:00',
    l2End: string = '21:00'
  ) => {
    if (!editingEmployeeSchedule) return;
    await handleSaveShiftUpdate({
      employeeId: editingEmployeeSchedule.id,
      dateStr,
      newType,
      workStart,
      workEnd,
      lunchStart: l1Start,
      lunchEnd: l1End,
      lunch2Start: l2Start,
      lunch2End: l2End
    });
  };

  // Save 30 days batch to PostgreSQL BD ProTalk
  const handleSave30DaysBatch = async () => {
    if (!editingEmployeeSchedule) return;
    setIsSavingBatch(true);
    try {
      const empId = editingEmployeeSchedule.id;
      const base = new Date(deviceClock);
      base.setHours(0, 0, 0, 0);

      const shiftsToSave = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const existingShift = editingEmployeeSchedule?.shifts?.find((sh: any) => {
          if (sh.shiftDate && sh.shiftDate === dateStr) return true;
          if (sh.shift_date && sh.shift_date === dateStr) return true;
          if (sh.dateStr && sh.dateStr === dateStr) return true;
          const shYear = Number(sh.year) || y;
          const shMonth = Number(sh.month);
          const shDay = Number(sh.day);
          if (shMonth && shDay) {
            return shYear === y && shMonth === m && shDay === day;
          }
          return false;
        });

        const sType = (existingShift?.type as ShiftType) || (existingShift?.shift_type as ShiftType) || (isPublicHoliday(y, m - 1, day) ? 'holiday' : (d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : 'day'));
        const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(sType);
        const isDaily = sType === 'daily';

        const wStart = isNonWorking ? '' : ((existingShift as any)?.workStart || (existingShift as any)?.work_start || (sType === 'night' ? '21:00' : isDaily ? '08:30' : '09:00'));
        const wEnd = isNonWorking ? '' : ((existingShift as any)?.workEnd || (existingShift as any)?.work_end || (sType === 'night' ? '07:00' : isDaily ? '08:30' : '18:00'));
        const l1Start = isNonWorking ? '' : ((existingShift as any)?.lunchStart || (existingShift as any)?.lunch_start || (sType === 'night' ? '01:00' : '13:00'));
        const l1End = isNonWorking ? '' : ((existingShift as any)?.lunchEnd || (existingShift as any)?.lunch_end || (sType === 'night' ? '02:00' : '14:00'));
        const l2Start = isDaily ? ((existingShift as any)?.lunch2Start || (existingShift as any)?.lunch2_start || '20:00') : null;
        const l2End = isDaily ? ((existingShift as any)?.lunch2End || (existingShift as any)?.lunch2_end || '21:00') : null;

        let hoursText = existingShift?.hours || (existingShift as any)?.hours_text;
        if (!hoursText) {
          if (sType === 'weekend') hoursText = 'Выходной';
          else if (sType === 'vacation') hoursText = 'Отпуск';
          else if (sType === 'sick') hoursText = 'Больничный';
          else if (sType === 'trip') hoursText = 'Командировка';
          else if (sType === 'dayoff') hoursText = 'Отгул';
          else if (sType === 'holiday') hoursText = `${wStart} - ${wEnd} (Праздник x2)`;
          else if (sType === 'night') hoursText = `${wStart} - ${wEnd} (ночная 🌙, +1 день)`;
          else if (sType === 'daily') hoursText = `${wStart} - ${wEnd} (суточная 24ч)`;
          else hoursText = `${wStart} - ${wEnd} (обед ${l1Start}-${l1End})`;
        }

        shiftsToSave.push({
          employee_id: empId,
          shift_date: dateStr,
          year: y,
          month: m,
          day: day,
          shift_type: sType,
          work_start: wStart,
          work_end: wEnd,
          lunch_start: l1Start,
          lunch_end: l1End,
          lunch2_start: l2Start,
          lunch2_end: l2End,
          hours_text: hoursText
        });
      }

      const res = await fetch('/api/schedules/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          pattern_type: editingEmployeeSchedule.patternType,
          shifts: shiftsToSave
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessToast('Индивидуальный график на 30 дней успешно сохранен в базе данных!');
        setTimeout(() => setSaveSuccessToast(null), 4000);
      }
      setEditingEmployeeSchedule(null);
      await loadScheduleDataFromDb();
    } catch (err) {
      console.error('Failed to save 30-day schedule batch in database:', err);
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Apply selected template across 30 days lookahead
  const handleApplyTemplateTo30Days = async (templateKey: string) => {
    if (!editingEmployeeSchedule) return;
    const empId = editingEmployeeSchedule.id;
    setIsSavingBatch(true);

    try {
      const base = new Date(deviceClock);
      base.setHours(0, 0, 0, 0);

      // Find template config
      let patternType: '5/2' | '2/2' | '3/3' | '1/3' | '6/1' = '5/2';
      let shiftCat: 'day' | 'night' | 'daily' = 'day';
      let wStart = '09:00';
      let wEnd = '18:00';
      let lStart = '13:00';
      let lEnd = '14:00';
      let l2Start = '20:00';
      let l2End = '21:00';
      let customSelectedDays: number[] | null = null;

      if (templateKey === 'preset-5-2') {
        patternType = '5/2';
        shiftCat = 'day';
        wStart = '09:00';
        wEnd = '18:00';
        lStart = '13:00';
        lEnd = '14:00';
      } else if (templateKey === 'preset-2-2') {
        patternType = '2/2';
        shiftCat = 'day';
        wStart = '09:00';
        wEnd = '21:00';
        lStart = '13:00';
        lEnd = '14:00';
      } else if (templateKey === 'preset-3-3') {
        patternType = '3/3';
        shiftCat = 'day';
        wStart = '09:00';
        wEnd = '21:00';
        lStart = '13:00';
        lEnd = '14:00';
      } else if (templateKey === 'preset-1-3') {
        patternType = '1/3';
        shiftCat = 'daily';
        wStart = '08:30';
        wEnd = '08:30';
        lStart = '13:00';
        lEnd = '14:00';
        l2Start = '20:00';
        l2End = '21:00';
      } else if (templateKey === 'preset-6-1') {
        patternType = '6/1';
        shiftCat = 'day';
        wStart = '09:00';
        wEnd = '18:00';
        lStart = '13:00';
        lEnd = '14:00';
      } else if (templateKey === 'preset-night-2-2') {
        patternType = '2/2';
        shiftCat = 'night';
        wStart = '21:00';
        wEnd = '07:00';
        lStart = '01:00';
        lEnd = '02:00';
      } else {
        // Match either by direct custom template ID or custom- prefix
        const cleanTplId = templateKey.startsWith('custom-') ? templateKey.replace('custom-', '') : templateKey;
        const customTpl = customShiftTemplates.find(t => t.id === cleanTplId || t.id === templateKey);
        if (customTpl) {
          patternType = (customTpl.patternType || '5/2') as any;
          shiftCat = customTpl.shiftCategory || 'day';
          wStart = customTpl.workStart || '09:00';
          wEnd = customTpl.workEnd || '18:00';
          lStart = customTpl.lunchStart || '13:00';
          lEnd = customTpl.lunchEnd || '14:00';
          l2Start = customTpl.lunch2Start || '20:00';
          l2End = customTpl.lunch2End || '21:00';
          customSelectedDays = customTpl.selectedDays || null;
        }
      }

      const generated30Shifts = [];
      const newShiftsMap = new Map();

      for (let i = 0; i < 30; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const dow = d.getDay();
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isHol = isPublicHoliday(y, m - 1, day);

        let isWorking = true;
        if (customSelectedDays && customSelectedDays.length > 0) {
          isWorking = customSelectedDays.includes(dow);
        } else if (patternType === '2/2') {
          isWorking = (i % 4 === 0 || i % 4 === 1);
        } else if (patternType === '3/3') {
          isWorking = (i % 6 < 3);
        } else if (patternType === '1/3') {
          isWorking = (i % 4 === 0);
        } else if (patternType === '6/1') {
          isWorking = (dow !== 0);
        } else {
          // 5/2
          isWorking = (dow !== 0 && dow !== 6);
        }

        let sType: ShiftType = 'day';
        if (!isWorking) {
          sType = 'weekend';
        } else if (isHol) {
          sType = 'holiday';
        } else if (shiftCat === 'night') {
          sType = 'night';
        } else if (shiftCat === 'daily') {
          sType = 'daily';
        } else {
          sType = 'day';
        }

        const isNonWorking = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(sType);
        const actualWorkStart = isNonWorking ? '' : wStart;
        const actualWorkEnd = isNonWorking ? '' : wEnd;
        const actualLunchStart = isNonWorking ? '' : lStart;
        const actualLunchEnd = isNonWorking ? '' : lEnd;
        const actualLunch2Start = sType === 'daily' ? l2Start : undefined;
        const actualLunch2End = sType === 'daily' ? l2End : undefined;

        let hoursText = '';
        const sTypeStr = sType as string;
        if (sTypeStr === 'weekend') hoursText = 'Выходной';
        else if (sTypeStr === 'vacation') hoursText = 'Отпуск';
        else if (sTypeStr === 'sick') hoursText = 'Больничный';
        else if (sTypeStr === 'trip') hoursText = 'Командировка';
        else if (sTypeStr === 'dayoff') hoursText = 'Отгул';
        else if (sTypeStr === 'holiday') hoursText = `${actualWorkStart} - ${actualWorkEnd} (Праздник x2)`;
        else if (sTypeStr === 'night') hoursText = `${actualWorkStart} - ${actualWorkEnd} (ночная 🌙, +1 день)`;
        else if (sTypeStr === 'daily') hoursText = `${actualWorkStart} - ${actualWorkEnd} (суточная 24ч)`;
        else hoursText = `${actualWorkStart} - ${actualWorkEnd} (обед ${actualLunchStart}-${actualLunchEnd})`;

        const workH = calcWorkHours(actualWorkStart, actualWorkEnd, actualLunchStart, actualLunchEnd, sType);

        const shiftObj = {
          id: `${empId}_${dateStr}`,
          day,
          month: m,
          year: y,
          shiftDate: dateStr,
          shift_date: dateStr,
          type: sType,
          shift_type: sType,
          hours: hoursText,
          hours_text: hoursText,
          isHoliday: isHol,
          is_holiday: isHol ? 1 : 0,
          workHours: workH,
          work_hours: workH,
          workStart: actualWorkStart,
          work_start: actualWorkStart,
          workEnd: actualWorkEnd,
          work_end: actualWorkEnd,
          lunchStart: actualLunchStart,
          lunch_start: actualLunchStart,
          lunchEnd: actualLunchEnd,
          lunch_end: actualLunchEnd,
          lunch2Start: actualLunch2Start,
          lunch2End: actualLunch2End
        };

        generated30Shifts.push(shiftObj);
        newShiftsMap.set(dateStr, shiftObj);
      }

      // 1. Immediately update modal state and main schedules state
      setEditingEmployeeSchedule(prev => {
        if (!prev) return null;
        const remainingShifts = prev.shifts.filter((sh: any) => {
          const dStr = sh.shiftDate || sh.shift_date || `${sh.year || currentYear}-${String(sh.month || currentMonth + 1).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}`;
          return !newShiftsMap.has(dStr);
        });
        const combined = [...remainingShifts, ...generated30Shifts];
        const totalH = combined.reduce((acc: number, cur: any) => acc + (Number(cur.workHours) || 0), 0);
        return {
          ...prev,
          patternType,
          shifts: combined as any,
          totalHoursMonth: Math.round(totalH * 10) / 10
        };
      });

      setSchedules(prev => prev.map(emp => {
        if (emp.id !== empId) return emp;
        const remainingShifts = emp.shifts.filter((sh: any) => {
          const dStr = sh.shiftDate || sh.shift_date || `${sh.year || currentYear}-${String(sh.month || currentMonth + 1).padStart(2, '0')}-${String(sh.day).padStart(2, '0')}`;
          return !newShiftsMap.has(dStr);
        });
        const combined = [...remainingShifts, ...generated30Shifts];
        const totalH = combined.reduce((acc: number, cur: any) => acc + (Number(cur.workHours) || 0), 0);
        return {
          ...emp,
          patternType,
          shifts: combined,
          totalHoursMonth: Math.round(totalH * 10) / 10
        };
      }));

      // 2. Persist batch to DB
      const shiftsToSave = generated30Shifts.map(sh => ({
        employee_id: empId,
        shift_date: sh.shiftDate,
        year: sh.year,
        month: sh.month,
        day: sh.day,
        shift_type: sh.type,
        work_start: sh.workStart,
        work_end: sh.workEnd,
        lunch_start: sh.lunchStart,
        lunch_end: sh.lunchEnd,
        lunch2_start: sh.lunch2Start || null,
        lunch2_end: sh.lunch2End || null,
        hours_text: sh.hours
      }));

      const res = await fetch('/api/schedules/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          pattern_type: patternType,
          shift_config: {
            work_start: wStart,
            work_end: wEnd,
            lunch_start: lStart,
            lunch_end: lEnd,
            lunch2_start: l2Start,
            lunch2_end: l2End,
            shift_category: shiftCat,
            selected_days: customSelectedDays
          },
          shifts: shiftsToSave
        })
      });

      const resJson = await res.json();
      if (resJson.success) {
        setSaveSuccessToast(`Шаблон "${templateKey}" успешно применен ко всем 30 дням графика!`);
        setTimeout(() => setSaveSuccessToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to apply template to 30 days:', err);
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Single Day Shift Adjuster (+/- 15 min on Day Gantt bar)
  const handleAdjustShiftTime15Min = (empId: string, day: number, edge: 'start' | 'end', deltaMinutes: number) => {
    const emp = schedules.find(e => e.id === empId);
    if (!emp) return;
    const shift = emp.shifts.find(s => s.day === day);
    if (!shift || ['weekend', 'vacation', 'sick', 'dayoff', 'trip'].includes(shift.type)) return;

    let newStartMins = 9 * 60;
    let newEndMins = 18 * 60;
    const parsed = parseShiftTimes(shift.hours, shift.type);

    if (shift.workStart && shift.workEnd && shift.workStart.includes(':') && shift.workEnd.includes(':')) {
      const [sh, sm] = shift.workStart.split(':').map(Number);
      const [eh, em] = shift.workEnd.split(':').map(Number);
      newStartMins = (sh || 0) * 60 + (sm || 0);
      newEndMins = (eh || 0) * 60 + (em || 0);
      if (newEndMins <= newStartMins && shift.type === 'night') {
        newEndMins += 24 * 60;
      }
    } else {
      newStartMins = parsed.startMins;
      newEndMins = parsed.endMins;
    }

    if (edge === 'start') {
      newStartMins = Math.max(0, Math.min(newEndMins - 15, newStartMins + deltaMinutes));
    } else {
      newEndMins = Math.max(newStartMins + 15, Math.min(1440, newEndMins + deltaMinutes));
    }

    const startH = String(Math.floor((newStartMins % 1440) / 60)).padStart(2, '0');
    const startM = String((newStartMins % 1440) % 60).padStart(2, '0');
    const endH = String(Math.floor((newEndMins % 1440) / 60)).padStart(2, '0');
    const endM = String((newEndMins % 1440) % 60).padStart(2, '0');

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    handleSaveShiftUpdate({
      employeeId: empId,
      dateStr,
      newType: shift.type,
      workStart: `${startH}:${startM}`,
      workEnd: `${endH}:${endM}`,
      lunchStart: shift.lunchStart || parsed.lunch1Start || '13:00',
      lunchEnd: shift.lunchEnd || parsed.lunch1End || '14:00',
      lunch2Start: (shift as any).lunch2Start || '20:00',
      lunch2End: (shift as any).lunch2End || '21:00'
    });
  };

  // Week View Select Template or Shift
  const handleSelectWeekTemplateOrShift = (empId: string, day: number, val: string) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (val.startsWith('tpl:')) {
      const tplKey = val.replace('tpl:', '');
      const customTpl = customShiftTemplates.find(t => t.id === tplKey);
      if (customTpl) {
        handleSaveShiftUpdate({
          employeeId: empId,
          dateStr,
          newType: (customTpl.shiftCategory || 'day') as ShiftType,
          workStart: customTpl.workStart,
          workEnd: customTpl.workEnd,
          lunchStart: customTpl.lunchStart,
          lunchEnd: customTpl.lunchEnd,
          lunch2Start: customTpl.lunch2Start,
          lunch2End: customTpl.lunch2End,
          customTemplateName: customTpl.name,
          customTemplateId: customTpl.id
        });
      } else if (tplKey === '5/2') {
        handleSaveShiftUpdate({ employeeId: empId, dateStr, newType: 'day', workStart: '09:00', workEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' });
      } else if (tplKey === '2/2') {
        handleSaveShiftUpdate({ employeeId: empId, dateStr, newType: 'day', workStart: '09:00', workEnd: '21:00', lunchStart: '13:00', lunchEnd: '14:00' });
      } else if (tplKey === '1/3') {
        handleSaveShiftUpdate({ employeeId: empId, dateStr, newType: 'daily', workStart: '08:30', workEnd: '08:30', lunchStart: '13:00', lunchEnd: '14:00', lunch2Start: '20:00', lunch2End: '21:00' });
      } else if (tplKey === '6/1') {
        handleSaveShiftUpdate({ employeeId: empId, dateStr, newType: 'day', workStart: '09:00', workEnd: '18:00', lunchStart: '13:00', lunchEnd: '14:00' });
      }
    } else {
      const sType = val as ShiftType;
      handleSaveShiftUpdate({
        employeeId: empId,
        dateStr,
        newType: sType,
        workStart: sType === 'night' ? '21:00' : sType === 'daily' ? '08:30' : '09:00',
        workEnd: sType === 'night' ? '07:00' : sType === 'daily' ? '08:30' : '18:00',
        lunchStart: sType === 'night' ? '01:00' : '13:00',
        lunchEnd: sType === 'night' ? '02:00' : '14:00'
      });
    }
  };

  // AI Voice and Prompt Formatter
  const handleAiFormatSubmit = async () => {
    if (!editingEmployeeSchedule || !aiVoicePrompt.trim()) return;
    setIsAiProcessing(true);
    try {
      const promptText = aiVoicePrompt.trim();
      const empId = editingEmployeeSchedule.id;
      const base = new Date(deviceClock);
      const todayStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;

      const res = await fetch('/api/schedules/ai-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          employee_id: empId,
          employee_name: editingEmployeeSchedule.name,
          company_id: editingEmployeeSchedule.company_id || 'flagship-main',
          base_date: todayStr
        })
      });

      if (res.ok) {
        const data = await res.json();
        await loadScheduleDataFromDb();
        setSaveSuccessToast(data.summaryMessage || `ИИ диспетчер: для ${editingEmployeeSchedule.name} успешно обновлен график!`);
        setTimeout(() => setSaveSuccessToast(null), 4000);
        setAiVoicePrompt('');
        setAiVoiceAudioUrl(null);
      }
    } catch (e) {
      console.error('AI format error:', e);
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header navigation */}
      <CompanyHeaderNav
        activeTab="schedule"
        isLightTheme={isLightTheme}
        onNavigate={onNavigate}
      />

      {/* Top Filter & Navigator Bar */}
      <ScheduleFilterBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentYear={currentYear}
        currentMonth={currentMonth}
        selectedDay={selectedDay}
        currentWeekDays={currentWeekDays}
        globalTimezone={globalTimezone}
        isLightTheme={isLightTheme}
        hidePastDays={hidePastDays}
        setHidePastDays={setHidePastDays}
        isViewingCurrentMonth={isViewingCurrentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onGoToToday={handleGoToToday}
        onOpenGlobalTimezoneModal={() => setIsGlobalTimezoneModalOpen(true)}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        filterType={filterType}
        setFilterType={setFilterType}
        filterPattern={filterPattern}
        setFilterPattern={setFilterPattern}
      />

      {/* Main View: Month / Week / Day */}
      {viewMode === 'month' && (
        <ScheduleMonthView
          visibleDaysInMonth={visibleDaysInMonth}
          currentYear={currentYear}
          currentMonth={currentMonth}
          selectedDay={selectedDay}
          todayDay={todayDay}
          isViewingCurrentMonth={isViewingCurrentMonth}
          schedules={schedules}
          filteredSchedules={filteredSchedules}
          monthStats={monthStats}
          isLightTheme={isLightTheme}
          onSelectDay={(day) => setSelectedDay(day)}
          onSetViewMode={(mode) => setViewMode(mode)}
          onOpenEmployeeScheduleEditor={openEmployeeScheduleEditor}
        />
      )}

      {viewMode === 'week' && (
        <ScheduleWeekView
          filteredSchedules={filteredSchedules}
          currentWeekDays={currentWeekDays}
          currentYear={currentYear}
          currentMonth={currentMonth}
          customShiftTemplates={customShiftTemplates}
          isLightTheme={isLightTheme}
          onOpenEmployeeScheduleEditor={openEmployeeScheduleEditor}
          onSelectWeekTemplateOrShift={handleSelectWeekTemplateOrShift}
          onSelectDay={(day) => setSelectedDay(day)}
          onSetViewMode={(mode) => setViewMode(mode)}
        />
      )}

      {viewMode === 'day' && (
        <ScheduleDayView
          filteredSchedules={filteredSchedules}
          daysInMonthArray={daysInMonthArray}
          totalDaysInMonth={totalDaysInMonth}
          selectedDay={selectedDay}
          currentYear={currentYear}
          currentMonth={currentMonth}
          isLightTheme={isLightTheme}
          onSelectDay={(day) => setSelectedDay(day)}
          onOpenEmployeeScheduleEditor={openEmployeeScheduleEditor}
          onAdjustShiftTime15Min={handleAdjustShiftTime15Min}
        />
      )}

      {viewMode === 'holidays' && (
        <ScheduleHolidaysView
          companyHolidays={companyHolidays}
          currentYear={currentYear}
          currentMonth={currentMonth}
          isLightTheme={isLightTheme}
          onRefreshHolidays={loadScheduleDataFromDb}
          onBackToSchedule={() => setViewMode('month')}
        />
      )}

      {/* 30-Day Individual Employee Editor Modal */}
      <Schedule30DaysModal
        isOpen={Boolean(editingEmployeeSchedule)}
        editingEmployeeSchedule={editingEmployeeSchedule}
        onClose={() => setEditingEmployeeSchedule(null)}
        onSaveBatch={handleSave30DaysBatch}
        onDeleteClick={(emp) => setScheduleToDelete(emp)}
        customShiftTemplates={customShiftTemplates}
        deviceClock={deviceClock}
        currentYear={currentYear}
        currentMonth={currentMonth}
        isLightTheme={isLightTheme}
        isSavingBatch={isSavingBatch}
        saveSuccessToast={saveSuccessToast}
        setSaveSuccessToast={setSaveSuccessToast}
        onUpdate30DayShift={handleUpdate30DayShift}
        onApplyTemplateTo30Days={(tplKey) => {
          handleApplyTemplateTo30Days(tplKey);
        }}
        onBatchUpdateSchedule={(updatedSchedule) => {
          setEditingEmployeeSchedule(updatedSchedule);
          setSchedules(prev => prev.map(emp => emp.id === updatedSchedule.id ? updatedSchedule : emp));
        }}
        onApplyAnnualTemplate={(empId, pattern, category) => {
          handleAiFormatSubmit();
        }}
        onUpdateEmployeeTimezone={(empId, tz) => {
          setSchedules(prev => prev.map(emp => emp.id === empId ? { ...emp, timezone: tz } : emp));
          setEditingEmployeeSchedule(prev => prev ? { ...prev, timezone: tz } : null);
        }}
        isAiProcessing={isAiProcessing}
        aiVoicePrompt={aiVoicePrompt}
        setAiVoicePrompt={setAiVoicePrompt}
        aiVoiceAudioUrl={aiVoiceAudioUrl}
        setAiVoiceAudioUrl={setAiVoiceAudioUrl}
        onAiFormatSubmit={handleAiFormatSubmit}
      />

      {/* Global Timezone Modal */}
      <ScheduleGlobalTimezoneModal
        isOpen={isGlobalTimezoneModalOpen}
        globalTimezone={globalTimezone}
        isLightTheme={isLightTheme}
        onClose={() => setIsGlobalTimezoneModalOpen(false)}
        onSave={async (newTz) => {
          setGlobalTimezone(newTz);
          setIsGlobalTimezoneModalOpen(false);
          try {
            const res = await fetch('/api/schedules/company/timezone', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ timezone: newTz })
            });
            const data = await res.json();
            if (data.success) {
              setSaveSuccessToast(`Основной часовой пояс компании сохранен: ${newTz}`);
              setTimeout(() => setSaveSuccessToast(null), 4000);
              await loadScheduleDataFromDb();
            }
          } catch (err) {
            console.error('Failed to save company timezone:', err);
          }
        }}
      />

      {/* Delete Schedule Confirmation Modal */}
      <ScheduleDeleteConfirmModal
        scheduleToDelete={scheduleToDelete}
        currentMonth={currentMonth}
        currentYear={currentYear}
        isLightTheme={isLightTheme}
        onClose={() => setScheduleToDelete(null)}
        onConfirmDelete={async (empId) => {
          try {
            await fetch(`/api/schedules/${empId}`, { method: 'DELETE' });
            setSchedules(prev => prev.filter(s => s.id !== empId));
            setEditingEmployeeSchedule(null);
            setScheduleToDelete(null);
          } catch (err) {
            console.error('Failed to delete schedule:', err);
          }
        }}
      />

      {/* Single Day Shift Edit Modal */}
      {dayInfoModal && (() => {
        const emp = schedules.find(e => e.id === dayInfoModal.employeeId);
        if (!emp) return null;
        const shift = emp.shifts.find(s => s.day === dayInfoModal.day) || { type: 'weekend' as const, hours: 'Выходной' };
        return (
          <ScheduleShiftEditModal
            isOpen={true}
            employeeName={emp.name}
            employeeTimezone={emp.timezone}
            day={dayInfoModal.day}
            month={currentMonth}
            year={currentYear}
            shift={shift}
            isLightTheme={isLightTheme}
            onClose={() => setDayInfoModal(null)}
            onSave={(newType, startStr, endStr, lunch1Start, lunch1End, lunch2Start, lunch2End) => {
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayInfoModal.day).padStart(2, '0')}`;
              handleSaveShiftUpdate({
                employeeId: dayInfoModal.employeeId,
                dateStr,
                newType,
                workStart: startStr,
                workEnd: endStr,
                lunchStart: lunch1Start,
                lunchEnd: lunch1End,
                lunch2Start,
                lunch2End
              });
              setDayInfoModal(null);
            }}
          />
        );
      })()}

      {/* AI Loading Overlay */}
      <AiLoadingOverlay
        isOpen={isAiProcessing}
        title="ИИ Ревизор RR формирует график"
        subtitle="Анализ команды, сопоставление смен и расчет перерывов..."
        isLightTheme={isLightTheme}
        maxSeconds={120}
        onCancel={() => setIsAiProcessing(false)}
      />
    </div>
  );
}

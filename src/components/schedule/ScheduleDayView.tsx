import React, { useRef, useEffect } from 'react';
import { Sun, Moon, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  EmployeeSchedule, 
  SHIFT_TYPES_CONFIG, 
  WEEK_DAY_NAMES_RU, 
  parseShiftTimes 
} from './types';

interface ScheduleDayViewProps {
  filteredSchedules: EmployeeSchedule[];
  daysInMonthArray: number[];
  totalDaysInMonth: number;
  selectedDay: number;
  currentYear: number;
  currentMonth: number;
  isLightTheme: boolean;
  onSelectDay: (day: number) => void;
  onOpenEmployeeScheduleEditor: (emp: EmployeeSchedule) => void;
  onAdjustShiftTime15Min: (empId: string, day: number, edge: 'start' | 'end', deltaMinutes: number) => void;
}

export const ScheduleDayView: React.FC<ScheduleDayViewProps> = ({
  filteredSchedules,
  daysInMonthArray,
  totalDaysInMonth,
  selectedDay,
  currentYear,
  currentMonth,
  isLightTheme,
  onSelectDay,
  onOpenEmployeeScheduleEditor,
  onAdjustShiftTime15Min
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active day button into the center of the date strip
  useEffect(() => {
    const el = document.getElementById(`day-cell-${selectedDay}`);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDay, currentMonth, currentYear]);

  const handlePrevDay = () => {
    if (selectedDay > 1) {
      onSelectDay(selectedDay - 1);
    }
  };

  const handleNextDay = () => {
    if (selectedDay < totalDaysInMonth) {
      onSelectDay(selectedDay + 1);
    }
  };

  // Compute 7 days centered around selectedDay for mobile wrap-free day selector
  const mobileWeekDays = React.useMemo(() => {
    const start = Math.max(1, Math.min(selectedDay - 3, Math.max(1, totalDaysInMonth - 6)));
    return Array.from({ length: Math.min(7, totalDaysInMonth) }, (_, i) => start + i);
  }, [selectedDay, totalDaysInMonth]);

  const selectedDateObj = new Date(currentYear, currentMonth, selectedDay);
  const selectedDowName = WEEK_DAY_NAMES_RU[selectedDateObj.getDay()];

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border shadow-xl relative overflow-hidden transition-all backdrop-blur-md ${
        isLightTheme
          ? 'bg-[#FFFBF5]/90 border-amber-900/25 text-amber-950 shadow-amber-900/5'
          : 'bg-transparent border-amber-400/40 text-white shadow-[0_0_25px_rgba(244,238,142,0.12)]'
      }`}
    >
      {/* Mobile Header Date Stepper + 7-Column Week Row (Zero horizontal tab scrolling) */}
      <div className="sm:hidden space-y-2.5 pb-3 mb-4 border-b border-amber-500/20">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            disabled={selectedDay <= 1}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed text-amber-950 dark:text-[#F4EE8E] border border-amber-500/30 transition-colors cursor-pointer"
            title="Предыдущий день"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center flex-1">
            <div className={`text-base font-extrabold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
              {selectedDay} число • {selectedDowName}
            </div>
            <div className={`text-sm ${isLightTheme ? 'text-amber-900/80' : 'text-amber-100/75'}`}>
              24-часовая шкала смен
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            disabled={selectedDay >= totalDaysInMonth}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed text-amber-950 dark:text-[#F4EE8E] border border-amber-500/30 transition-colors cursor-pointer"
            title="Следующий день"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {mobileWeekDays.map((d) => {
            const isSel = d === selectedDay;
            const dObj = new Date(currentYear, currentMonth, d);
            const dow = dObj.getDay();
            const isWknd = dow === 0 || dow === 6;
            return (
              <button
                key={`mob-strip-${d}`}
                type="button"
                onClick={() => onSelectDay(d)}
                className={`min-h-[44px] rounded-xl font-mono text-sm font-bold flex flex-col items-center justify-center border transition-all cursor-pointer ${
                  isSel
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400 shadow-md'
                    : isWknd
                      ? isLightTheme
                        ? 'bg-rose-50/70 text-rose-700 border-rose-300'
                        : 'bg-rose-500/10 text-rose-300 border-rose-400/30'
                      : isLightTheme
                        ? 'bg-amber-50/70 text-amber-950 border-amber-900/20'
                        : 'bg-amber-500/10 text-amber-100 border-amber-400/25'
                }`}
              >
                <span>{d}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Header Date Strip */}
      <div className="hidden sm:flex items-center gap-1.5 pb-3 mb-4 border-b border-amber-500/20">
        <button
          type="button"
          onClick={handlePrevDay}
          disabled={selectedDay <= 1}
          className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 transition-colors shrink-0 cursor-pointer"
          title="Предыдущий день"
        >
          <ChevronLeft size={16} />
        </button>

        <div 
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-amber-500/30 py-1 px-1 flex-1"
        >
          {daysInMonthArray.map((d) => {
            const isSel = d === selectedDay;
            const dateObj = new Date(currentYear, currentMonth, d);
            const dow = dateObj.getDay();
            const isWeekend = dow === 0 || dow === 6;

            return (
              <button
                key={`strip-date-${d}`}
                id={`day-cell-${d}`}
                type="button"
                onClick={() => onSelectDay(d)}
                className={`px-3.5 py-1.5 rounded-2xl font-mono text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 shrink-0 min-w-[50px] ${
                  isSel
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md scale-105 border border-amber-300 z-10'
                    : isWeekend
                    ? 'bg-amber-500/5 text-rose-500 dark:text-rose-300 border border-rose-400/20 hover:bg-amber-500/15'
                    : 'bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 hover:bg-amber-500/20'
                }`}
              >
                <span className="text-[10px] opacity-80 font-bold">
                  {WEEK_DAY_NAMES_RU[dow]}
                </span>
                <span className="text-sm font-extrabold">{d}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          disabled={selectedDay >= totalDaysInMonth}
          className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 transition-colors shrink-0 cursor-pointer"
          title="Следующий день"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Mobile View with Real Proportional 24h Shift Bars + Touch 15-min Adjusters */}
      <div className="sm:hidden space-y-3">
        {filteredSchedules.map(emp => {
          const dayShift = emp.shifts.find(s => s.day === selectedDay) || { type: 'weekend' as const, hours: 'Выходной' };
          const prevDayShift = emp.shifts.find(s => s.day === selectedDay - 1);
          const shiftInfo = SHIFT_TYPES_CONFIG[dayShift.type] || SHIFT_TYPES_CONFIG.weekend;

          const hasPrevNightContinuation = prevDayShift && (prevDayShift.type === 'night' || (prevDayShift as any).shift_type === 'night');
          const hasPrevDailyContinuation = prevDayShift && (prevDayShift.type === 'daily' || (prevDayShift as any).shift_type === 'daily');

          let prevEndMins = 0;
          let prevLabel = '';
          if (hasPrevNightContinuation) {
            const rawEnd = prevDayShift.workEnd || '07:00';
            const [eh, em] = rawEnd.split(':').map(Number);
            prevEndMins = (eh || 7) * 60 + (em || 0);
            prevLabel = `Со вчера до ${rawEnd}`;
          } else if (hasPrevDailyContinuation) {
            const rawEnd = prevDayShift.workEnd || '08:30';
            const [eh, em] = rawEnd.split(':').map(Number);
            prevEndMins = (eh || 8) * 60 + (em || 30);
            prevLabel = `Сутки до ${rawEnd}`;
          }
          const prevWidthPct = prevEndMins > 0 ? Math.max(4, Math.min(100, (prevEndMins / 1440) * 100)) : 0;

          const hasCurrentWorkingShift = !['weekend', 'vacation', 'sick', 'trip', 'dayoff', 'holiday_weekend'].includes(dayShift.type);
          let curStartMins = 9 * 60;
          let curEndMins = 18 * 60;
          let curLabel = dayShift.hours;

          if (dayShift.type === 'night' || (dayShift as any).shift_type === 'night') {
            const rawStart = dayShift.workStart || '21:00';
            const rawEnd = dayShift.workEnd || '07:00';
            const [sh, sm] = rawStart.split(':').map(Number);
            curStartMins = (sh || 21) * 60 + (sm || 0);
            curEndMins = 1440;
            curLabel = `${rawStart} → ${rawEnd} (+1д)`;
          } else if (dayShift.type === 'daily' || (dayShift as any).shift_type === 'daily') {
            const rawStart = dayShift.workStart || '08:30';
            const rawEnd = dayShift.workEnd || '08:30';
            const [sh, sm] = rawStart.split(':').map(Number);
            curStartMins = (sh || 8) * 60 + (sm || 30);
            curEndMins = 1440;
            curLabel = `${rawStart} → ${rawEnd} (24ч)`;
          } else if (hasCurrentWorkingShift) {
            if (dayShift.workStart && dayShift.workEnd && dayShift.workStart.includes(':') && dayShift.workEnd.includes(':')) {
              const [sh, sm] = dayShift.workStart.split(':').map(Number);
              const [eh, em] = dayShift.workEnd.split(':').map(Number);
              curStartMins = (sh || 0) * 60 + (sm || 0);
              curEndMins = (eh || 0) * 60 + (em || 0);
            } else {
              const parsed = parseShiftTimes(dayShift.hours, dayShift.type);
              curStartMins = parsed.startMins;
              curEndMins = parsed.endMins;
            }
          }

          const curLeftPct = Math.max(0, Math.min(100, (curStartMins / 1440) * 100));
          const curWidthPct = Math.max(6, Math.min(100 - curLeftPct, ((curEndMins - curStartMins) / 1440) * 100));

          return (
            <div
              key={`mob-day-row-${emp.id}`}
              className={`p-3.5 rounded-2xl border space-y-3 ${
                isLightTheme
                  ? 'border-amber-900/25 bg-amber-50/50'
                  : 'border-amber-400/30 bg-amber-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h5 className={`font-extrabold text-base leading-snug break-words ${isLightTheme ? 'text-amber-950' : 'text-white'}`}>
                    {emp.name}
                  </h5>
                  <span className={`text-sm block font-medium ${isLightTheme ? 'text-amber-900' : 'text-amber-100/80'}`}>
                    {emp.role} • <span className="font-mono text-amber-700 dark:text-[#F4EE8E]">{emp.timezone}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenEmployeeScheduleEditor(emp)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title={`Редактировать график ${emp.name}`}
                >
                  <Edit3 size={17} />
                </button>
              </div>

              {/* Status Badge & Exact Time */}
              <div
                className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-sm ${
                  isLightTheme ? shiftInfo.bgLight : shiftInfo.bgDark
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold">
                  <span>{shiftInfo.icon}</span>
                  <span>{shiftInfo.label}</span>
                </div>
                {hasCurrentWorkingShift && (
                  <span className="font-mono font-extrabold">{curLabel}</span>
                )}
              </div>

              {/* Proportional 24h Shift Gantt Strip */}
              {(hasCurrentWorkingShift || prevWidthPct > 0) && (
                <div className="space-y-1.5">
                  <div className={`flex justify-between font-mono text-sm opacity-75 ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>24:00</span>
                  </div>
                  <div
                    className={`relative h-8 rounded-xl border overflow-hidden ${
                      isLightTheme ? 'bg-amber-100/50 border-amber-900/20' : 'bg-amber-950/30 border-amber-400/25'
                    }`}
                  >
                    {prevWidthPct > 0 && (
                      <div
                        style={{ left: '0%', width: `${prevWidthPct}%` }}
                        title={prevLabel}
                        className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-amber-600 to-amber-800 text-white border border-amber-400/60 flex items-center px-1.5 text-sm font-mono truncate"
                      >
                        {prevLabel}
                      </div>
                    )}
                    {hasCurrentWorkingShift && (
                      <div
                        style={{ left: `${curLeftPct}%`, width: `${curWidthPct}%` }}
                        className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border border-amber-400 shadow-sm"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Touch-friendly 15-min Start/End Time Adjusters */}
              {hasCurrentWorkingShift && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className={`p-2 rounded-xl border space-y-1.5 ${isLightTheme ? 'border-amber-900/20 bg-white/70' : 'border-amber-400/25 bg-transparent'}`}>
                    <span className={`block text-sm font-bold text-center ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                      Начало смен
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'start', -15)}
                        className="flex-1 min-h-[44px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-mono text-sm font-extrabold border border-amber-500/35 cursor-pointer"
                      >
                        -15м
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'start', 15)}
                        className="flex-1 min-h-[44px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-mono text-sm font-extrabold border border-amber-500/35 cursor-pointer"
                      >
                        +15м
                      </button>
                    </div>
                  </div>

                  <div className={`p-2 rounded-xl border space-y-1.5 ${isLightTheme ? 'border-amber-900/20 bg-white/70' : 'border-amber-400/25 bg-transparent'}`}>
                    <span className={`block text-sm font-bold text-center ${isLightTheme ? 'text-amber-950' : 'text-amber-200'}`}>
                      Конец смен
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'end', -15)}
                        className="flex-1 min-h-[44px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-mono text-sm font-extrabold border border-amber-500/35 cursor-pointer"
                      >
                        -15м
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'end', 15)}
                        className="flex-1 min-h-[44px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] font-mono text-sm font-extrabold border border-amber-500/35 cursor-pointer"
                      >
                        +15м
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Gantt Timeline */}
      <div className="hidden sm:block space-y-3">
        <div className="grid grid-cols-12 gap-2 text-xs font-black text-amber-900 dark:text-[#F4EE8E] pb-2 border-b border-amber-500/20">
          <div className="col-span-3">Сотрудник</div>
          <div className="col-span-9 grid grid-cols-24 text-[10px] font-mono text-center opacity-70">
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={`hour-head-${h}`}>{h}</div>
            ))}
          </div>
        </div>

        {filteredSchedules.map(emp => {
          const dayShift = emp.shifts.find(s => s.day === selectedDay) || { type: 'weekend' as const, hours: 'Выходной' };
          const prevDayShift = emp.shifts.find(s => s.day === selectedDay - 1);

          // 1. Check for continuation from yesterday's night or 24h daily shift
          const hasPrevNightContinuation = prevDayShift && (prevDayShift.type === 'night' || (prevDayShift as any).shift_type === 'night');
          const hasPrevDailyContinuation = prevDayShift && (prevDayShift.type === 'daily' || (prevDayShift as any).shift_type === 'daily');

          let prevEndMins = 0;
          let prevLabel = '';
          if (hasPrevNightContinuation) {
            const rawEnd = prevDayShift.workEnd || '07:00';
            const [eh, em] = rawEnd.split(':').map(Number);
            prevEndMins = (eh || 7) * 60 + (em || 0);
            prevLabel = `🌙 00:00 - ${rawEnd} (ночная со вчера)`;
          } else if (hasPrevDailyContinuation) {
            const rawEnd = prevDayShift.workEnd || '08:30';
            const [eh, em] = rawEnd.split(':').map(Number);
            prevEndMins = (eh || 8) * 60 + (em || 30);
            prevLabel = `⏳ 00:00 - ${rawEnd} (суточная со вчера)`;
          }

          const prevLeftPct = 0;
          const prevWidthPct = prevEndMins > 0 ? Math.max(3, Math.min(100, (prevEndMins / 1440) * 100)) : 0;

          // 2. Main shift on current day
          let curStartMins = 9 * 60;
          let curEndMins = 18 * 60;
          let isNightStart = false;
          let isDailyStart = false;
          let curLabel = dayShift.hours;

          if (dayShift.type === 'night' || (dayShift as any).shift_type === 'night') {
            isNightStart = true;
            const rawStart = dayShift.workStart || '21:00';
            const rawEnd = dayShift.workEnd || '07:00';
            const [sh, sm] = rawStart.split(':').map(Number);
            curStartMins = (sh || 21) * 60 + (sm || 0);
            curEndMins = 1440; // fills until midnight on day 1
            curLabel = `🌙 ${rawStart} ➔ ${rawEnd} (+1 день)`;
          } else if (dayShift.type === 'daily' || (dayShift as any).shift_type === 'daily') {
            isDailyStart = true;
            const rawStart = dayShift.workStart || '08:30';
            const rawEnd = dayShift.workEnd || '08:30';
            const [sh, sm] = rawStart.split(':').map(Number);
            curStartMins = (sh || 8) * 60 + (sm || 30);
            curEndMins = 1440; // fills until midnight on day 1
            curLabel = `⏳ ${rawStart} ➔ ${rawEnd} (24ч, +1 день)`;
          } else if (dayShift.type !== 'weekend') {
            if (dayShift.workStart && dayShift.workEnd && dayShift.workStart.includes(':') && dayShift.workEnd.includes(':')) {
              const [sh, sm] = dayShift.workStart.split(':').map(Number);
              const [eh, em] = dayShift.workEnd.split(':').map(Number);
              curStartMins = (sh || 0) * 60 + (sm || 0);
              curEndMins = (eh || 0) * 60 + (em || 0);
            } else {
              const parsed = parseShiftTimes(dayShift.hours, dayShift.type);
              curStartMins = parsed.startMins;
              curEndMins = parsed.endMins;
            }
          }

          const curLeftPct = Math.max(0, Math.min(100, (curStartMins / 1440) * 100));
          const curWidthPct = Math.max(3, Math.min(100 - curLeftPct, ((curEndMins - curStartMins) / 1440) * 100));

          const hasCurrentWorkingShift = !['weekend', 'vacation', 'sick', 'trip', 'dayoff', 'holiday_weekend'].includes(dayShift.type);
          const nonWorkingConfig = SHIFT_TYPES_CONFIG[dayShift.type] || SHIFT_TYPES_CONFIG.weekend;
          const nonWorkingLabel = dayShift.hours && dayShift.hours !== 'Выходной' && dayShift.hours !== '09:00 - 18:00'
            ? dayShift.hours
            : nonWorkingConfig.label;

          return (
            <div key={`day-emp-row-${emp.id}`} className="grid grid-cols-12 gap-2 items-center p-2 rounded-2xl hover:bg-amber-500/5 transition-colors">
              <div className="col-span-3 flex items-center justify-between pr-2">
                <div>
                  <div className="font-extrabold text-xs text-zinc-900 dark:text-white">{emp.name}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal">
                    {emp.role} • <span className="font-mono text-amber-600 dark:text-amber-300">{emp.timezone}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenEmployeeScheduleEditor(emp)}
                  className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40 transition-all cursor-pointer shrink-0 ml-1 shadow-xs active:scale-95"
                >
                  <Edit3 size={13} />
                </button>
              </div>

              <div className="col-span-9 relative h-11 rounded-xl bg-amber-500/5 border border-amber-500/20 overflow-hidden flex items-center px-1">
                {/* 1. Continuation Bar from yesterday's night or daily shift */}
                {prevWidthPct > 0 && (
                  <div
                    style={{ left: `${prevLeftPct}%`, width: `${prevWidthPct}%` }}
                    className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white font-black text-xs flex items-center justify-between px-2 shadow-md border border-amber-400/60 z-10 animate-fade-in"
                    title={prevLabel}
                  >
                    <span className="truncate text-[10px] font-black font-mono tracking-tight flex items-center gap-1">
                      <span>{prevLabel}</span>
                    </span>
                  </div>
                )}

                {/* 2. Main Shift Bar for Current Day */}
                {hasCurrentWorkingShift ? (
                  <div
                    style={{ left: `${curLeftPct}%`, width: `${curWidthPct}%` }}
                    className={`absolute top-1 bottom-1 rounded-lg font-black text-xs flex items-center justify-between px-2 shadow-md border transition-all group z-10 ${
                      isNightStart
                        ? 'bg-gradient-to-r from-[#D4AF37] via-[#AA7C11] to-[#694A05] text-amber-100 border-amber-400'
                        : isDailyStart
                        ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#D97706] text-amber-950 border-amber-300'
                        : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'start', -15)}
                        className="px-1 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[9px] font-mono cursor-pointer"
                        title="-15 мин к началу"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'start', 15)}
                        className="px-1 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[9px] font-mono cursor-pointer"
                        title="+15 мин к началу"
                      >
                        ›
                      </button>
                    </div>

                    <span className="truncate mx-1 text-[11px] font-black tracking-tight flex items-center gap-1 font-mono">
                      {isNightStart ? <Moon size={12} className="shrink-0" /> : <Sun size={12} className="shrink-0" />}
                      <span>{curLabel}</span>
                    </span>

                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'end', -15)}
                        className="px-1 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[9px] font-mono cursor-pointer"
                        title="-15 мин к концу"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustShiftTime15Min(emp.id, selectedDay, 'end', 15)}
                        className="px-1 py-0.5 rounded bg-black/20 hover:bg-black/40 text-[9px] font-mono cursor-pointer"
                        title="+15 мин к концу"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                ) : !prevWidthPct ? (
                  <div className="flex items-center gap-1.5 pl-2">
                    <span className="text-sm">{nonWorkingConfig.icon}</span>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {nonWorkingLabel}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

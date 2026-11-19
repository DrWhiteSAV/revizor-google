import React, { useState } from 'react';
import { Users, Edit3, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  EmployeeSchedule, 
  MONTH_NAMES_RU, 
  MONTH_NAMES_RU_GEN,
  WEEK_DAY_NAMES_RU,
  isPublicHoliday 
} from './types';

interface ScheduleMonthViewProps {
  visibleDaysInMonth: number[];
  currentYear: number;
  currentMonth: number;
  selectedDay: number;
  todayDay: number;
  isViewingCurrentMonth: boolean;
  schedules: EmployeeSchedule[];
  filteredSchedules: EmployeeSchedule[];
  monthStats: {
    dayCount: number;
    nightCount: number;
    dailyCount: number;
    weekendCount: number;
    vacationCount: number;
    sickCount: number;
  };
  isLightTheme: boolean;
  onSelectDay: (day: number) => void;
  onSetViewMode: (mode: 'day' | 'week' | 'month') => void;
  onOpenEmployeeScheduleEditor: (emp: EmployeeSchedule) => void;
}

export const ScheduleMonthView: React.FC<ScheduleMonthViewProps> = ({
  visibleDaysInMonth,
  currentYear,
  currentMonth,
  selectedDay,
  todayDay,
  isViewingCurrentMonth,
  schedules,
  filteredSchedules,
  monthStats,
  isLightTheme,
  onSelectDay,
  onSetViewMode,
  onOpenEmployeeScheduleEditor
}) => {
  const [showMobileEmployees, setShowMobileEmployees] = useState(false);

  const getActiveShiftsForDay = (dayNum: number) => {
    return schedules
      .map((emp) => {
        const currentShift = emp.shifts.find((sh) => sh.day === dayNum);
        const prevShift = emp.shifts.find((sh) => sh.day === dayNum - 1);
        const isPrevNight =
          prevShift && (prevShift.type === 'night' || (prevShift as any).shift_type === 'night');
        const isPrevDaily =
          prevShift && (prevShift.type === 'daily' || (prevShift as any).shift_type === 'daily');

        const isCurrentWorking =
          currentShift &&
          !['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(currentShift.type);

        if (isCurrentWorking) {
          return { emp, shift: currentShift, isContinuation: false };
        } else if (isPrevNight) {
          return {
            emp,
            shift: { ...prevShift, hours: `до ${prevShift.workEnd || '07:00'} (ночная)` },
            isContinuation: true
          };
        } else if (isPrevDaily) {
          return {
            emp,
            shift: { ...prevShift, hours: `до ${prevShift.workEnd || '08:30'} (суточная)` },
            isContinuation: true
          };
        }
        return null;
      })
      .filter(Boolean) as { emp: EmployeeSchedule; shift: any; isContinuation: boolean }[];
  };

  const selectedDayShifts = getActiveShiftsForDay(selectedDay);
  const selectedDayDow = new Date(currentYear, currentMonth, selectedDay).getDay();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
      {/* Calendar 7-Column Grid + Mobile Selected Day Summary */}
      <div
        className={`xl:col-span-3 p-3 sm:p-5 rounded-3xl border shadow-xl relative overflow-hidden transition-all backdrop-blur-md space-y-4 ${
          isLightTheme
            ? 'bg-[#FFFBF5]/90 border-amber-900/25 text-amber-950 shadow-amber-900/5'
            : 'bg-transparent border-amber-400/40 text-white shadow-[0_0_25px_rgba(244,238,142,0.12)]'
        }`}
      >
        {/* Header Days of Week — strictly 7 in a row */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center font-mono text-sm font-black text-amber-900 dark:text-[#F4EE8E] border-b border-amber-500/20 pb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((wDay, idx) => (
            <div key={wDay} className={idx >= 5 ? 'text-rose-500 dark:text-rose-300' : ''}>
              {wDay}
            </div>
          ))}
        </div>

        {/* 7-Column Month Grid (Preserved in Mobile View per requirement) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7 }).map((_, padIdx) => (
            <div
              key={`pad-start-${padIdx}`}
              className="min-h-[52px] sm:min-h-[115px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-dashed border-amber-500/15 opacity-30 pointer-events-none"
            />
          ))}

          {visibleDaysInMonth.map((day) => {
            const dateObj = new Date(currentYear, currentMonth, day);
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = isPublicHoliday(currentYear, currentMonth, day);
            const isSelected = day === selectedDay;
            const isToday = day === todayDay && isViewingCurrentMonth;
            const activeShiftsOnDay = getActiveShiftsForDay(day);

            return (
              <div
                key={`cell-day-${day}`}
                id={`day-cell-${day}`}
                onClick={() => {
                  onSelectDay(day);
                  if (typeof window !== 'undefined' && window.innerWidth >= 640) {
                    onSetViewMode('day');
                  }
                }}
                className={`min-h-[52px] sm:min-h-[115px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                  isSelected
                    ? 'border-2 border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/35 shadow-md z-10'
                    : isToday
                    ? 'border-2 border-amber-400 bg-amber-400/25 ring-2 ring-amber-400/45 shadow-sm z-10'
                    : isHoliday
                    ? isLightTheme
                      ? 'bg-rose-50/80 border-rose-300 hover:border-rose-500'
                      : 'bg-rose-950/20 border-rose-400/40 hover:border-rose-400'
                    : isWeekend
                    ? isLightTheme
                      ? 'bg-amber-50/40 border-amber-900/15 hover:border-amber-500'
                      : 'bg-amber-500/5 border-amber-400/20 hover:border-amber-400/50'
                    : isLightTheme
                    ? 'bg-white/70 border-amber-900/20 hover:border-amber-500'
                    : 'bg-transparent border-amber-400/25 hover:border-amber-400/80 hover:bg-amber-500/10'
                }`}
              >
                {/* Mobile Compact 7-in-a-row Cell */}
                <div className="sm:hidden flex flex-col items-center justify-center my-auto py-0.5 gap-1 text-center w-full">
                  <div className="flex items-center justify-center gap-0.5">
                    <span
                      className={`text-sm font-black font-mono leading-none ${
                        isSelected || isToday
                          ? isLightTheme
                            ? 'text-amber-950 font-extrabold'
                            : 'text-[#F4EE8E] font-extrabold'
                          : isHoliday || isWeekend
                          ? 'text-rose-500 dark:text-rose-300'
                          : isLightTheme
                          ? 'text-amber-950'
                          : 'text-white'
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {isToday && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />}
                    {activeShiftsOnDay.length > 0 && (
                      <span
                        className={`px-1 rounded text-[11px] font-bold font-mono leading-tight ${
                          isLightTheme
                            ? 'bg-amber-200/90 text-amber-950'
                            : 'bg-amber-400/25 text-[#F4EE8E]'
                        }`}
                      >
                        {activeShiftsOnDay.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop Full Cell */}
                <div className="hidden sm:flex items-center justify-between">
                  <span
                    className={`text-sm font-black font-mono ${
                      isSelected || isToday
                        ? isLightTheme
                          ? 'text-amber-950'
                          : 'text-[#F4EE8E]'
                        : isHoliday || isWeekend
                        ? 'text-rose-500 dark:text-rose-300'
                        : isLightTheme
                        ? 'text-amber-950'
                        : 'text-white'
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950">
                      Сегодня
                    </span>
                  )}
                </div>

                <div className="hidden sm:block space-y-1 my-1">
                  {activeShiftsOnDay.slice(0, 2).map(({ emp, isContinuation }) => (
                    <div
                      key={`day-${day}-shift-${emp.id}`}
                      className={`text-xs px-1.5 py-0.5 rounded truncate font-semibold flex items-center gap-1 ${
                        isContinuation
                          ? 'bg-amber-600/30 text-amber-950 dark:text-amber-100 border border-amber-500/30'
                          : 'bg-amber-500/20 text-amber-950 dark:text-amber-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isContinuation ? 'bg-amber-400' : 'bg-amber-500'}`} />
                      <span className="truncate">{emp.name.split(' ')[0]} {isContinuation ? '(со вчера)' : ''}</span>
                    </div>
                  ))}
                  {activeShiftsOnDay.length > 2 && (
                    <div className="text-xs text-amber-800 dark:text-amber-200 font-bold">
                      +{activeShiftsOnDay.length - 2} еще
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex items-center justify-between text-xs font-mono text-amber-900/80 dark:text-amber-100/75">
                  <span>{isHoliday ? 'Праздник' : isWeekend ? 'Выходной' : 'Рабочий'}</span>
                  <div className="font-bold text-amber-800 dark:text-[#F4EE8E]">
                    {isHoliday ? 'x2 став' : `${activeShiftsOnDay.length} см`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Selected Day Summary Card right below the 7-column calendar */}
        <div
          className={`sm:hidden p-3.5 rounded-2xl border space-y-3 ${
            isLightTheme
              ? 'bg-amber-50/75 border-amber-900/25 text-amber-950'
              : 'bg-amber-500/10 border-amber-400/35 text-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className={`text-base font-extrabold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                {selectedDay} {MONTH_NAMES_RU_GEN[currentMonth]} ({WEEK_DAY_NAMES_RU[selectedDayDow]})
              </h4>
              <span className={`text-sm ${isLightTheme ? 'text-amber-900/85' : 'text-amber-100/80'}`}>
                Активных смен: {selectedDayShifts.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSetViewMode('day')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Clock size={15} />
              <span>Шкала дня</span>
            </button>
          </div>

          {selectedDayShifts.length === 0 ? (
            <p className={`text-sm ${isLightTheme ? 'text-amber-900/80' : 'text-amber-100/75'}`}>
              На выбранную дату рабочих смен не назначено.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayShifts.map(({ emp, shift, isContinuation }) => (
                <div
                  key={`mob-sum-${emp.id}`}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isLightTheme ? 'bg-white/80 border-amber-900/20' : 'bg-transparent border-amber-400/25'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{emp.name}</div>
                    <div className={`text-sm font-mono truncate ${isLightTheme ? 'text-amber-900' : 'text-[#F4EE8E]'}`}>
                      {shift.hours} {isContinuation ? '(со вчера)' : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenEmployeeScheduleEditor(emp)}
                    className="min-h-[40px] px-3 rounded-xl bg-amber-500/20 border border-amber-500/35 text-sm font-bold cursor-pointer shrink-0"
                  >
                    График
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Employee List with Edit Icons & Stats */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border shadow-xl flex flex-col justify-between space-y-4 backdrop-blur-md ${
          isLightTheme
            ? 'bg-[#FFFBF5]/90 border-amber-900/25 text-amber-950 shadow-amber-900/5'
            : 'bg-transparent border-amber-400/40 text-white shadow-[0_0_25px_rgba(244,238,142,0.12)]'
        }`}
      >
        <div>
          <button
            type="button"
            onClick={() => setShowMobileEmployees((p) => !p)}
            className="w-full flex items-center justify-between pb-3 border-b border-amber-500/20 xl:cursor-default cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-sm">
                <Users size={16} />
              </span>
              <h4 className={`text-base font-black tracking-wide ${isLightTheme ? 'text-amber-950' : 'text-white'}`}>
                Графики сотрудников ({filteredSchedules.length})
              </h4>
            </div>
            <span className="xl:hidden text-amber-600 dark:text-[#F4EE8E]">
              {showMobileEmployees ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>

          {/* List of employees with individual Edit Icon */}
          <div className={`${showMobileEmployees ? 'block' : 'hidden xl:block'} mt-4 space-y-2.5 font-sans`}>
            {filteredSchedules.map((emp) => (
              <div
                key={`side-emp-${emp.id}`}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                  isLightTheme
                    ? 'bg-amber-50/70 border-amber-900/20 hover:border-amber-500'
                    : 'bg-amber-500/10 border-amber-400/25 hover:border-amber-400/60'
                }`}
              >
                <div className="min-w-0">
                  <div className={`font-extrabold text-sm flex flex-wrap items-center gap-1.5 ${isLightTheme ? 'text-amber-950' : 'text-white'}`}>
                    <span className="truncate">{emp.name}</span>
                    <span className="text-sm px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-[#F4EE8E] font-mono">
                      {emp.timezone}
                    </span>
                  </div>
                  <div className={`text-sm truncate ${isLightTheme ? 'text-amber-900/80' : 'text-amber-100/75'}`}>
                    {emp.role} • {emp.patternType} ({emp.shiftConfig.dayHours})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenEmployeeScheduleEditor(emp)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title={`Открыть редактор графика для ${emp.name}`}
                >
                  <Edit3 size={17} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Total Month Summary */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F4EE8E]/20 via-[#E7C768]/20 to-[#D99E41]/20 border border-amber-400/60 flex items-center justify-between gap-2">
          <div>
            <span className={`text-sm font-bold block ${isLightTheme ? 'text-amber-900' : 'text-[#F4EE8E]'}`}>
              Всего рабочих смен
            </span>
            <span className={`text-sm font-black ${isLightTheme ? 'text-amber-950' : 'text-white'}`}>
              За {MONTH_NAMES_RU[currentMonth]}
            </span>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-base shadow-md font-mono shrink-0">
            {monthStats.dayCount + monthStats.nightCount + monthStats.dailyCount}
          </span>
        </div>
      </div>
    </div>
  );
};

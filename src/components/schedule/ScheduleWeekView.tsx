import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Edit3, ChevronDown, Check, X, Clock, Calendar, User } from 'lucide-react';
import { 
  EmployeeSchedule, 
  CustomShiftTemplate, 
  ShiftType,
  SHIFT_TYPES_CONFIG, 
  MONTH_NAMES_RU_GEN, 
  WEEK_DAY_NAMES_RU,
  isPublicHoliday 
} from './types';

interface ScheduleWeekViewProps {
  filteredSchedules: EmployeeSchedule[];
  currentWeekDays: number[];
  currentYear: number;
  currentMonth: number;
  customShiftTemplates: CustomShiftTemplate[];
  isLightTheme: boolean;
  onOpenEmployeeScheduleEditor: (emp: EmployeeSchedule) => void;
  onSelectWeekTemplateOrShift: (empId: string, day: number, val: string) => void;
  onSelectDay: (day: number) => void;
  onSetViewMode: (mode: 'day' | 'week' | 'month') => void;
}

const getShiftDisplayInfo = (shift: any, customTemplates: CustomShiftTemplate[]) => {
  const sType = (shift?.type || shift?.shift_type || 'weekend') as ShiftType;
  const isOff = ['weekend', 'vacation', 'sick', 'trip', 'dayoff'].includes(sType);

  // If not a non-working/absence status, check if shift matches a custom template by id, name, or exact hours
  let customTpl: CustomShiftTemplate | undefined = undefined;
  if (!isOff) {
    if (shift?.template_id) {
      customTpl = customTemplates.find(t => t.id === shift.template_id);
    }
    if (!customTpl && shift?.template_name) {
      customTpl = customTemplates.find(t => t.name.trim().toLowerCase() === shift.template_name.trim().toLowerCase());
    }
    if (!customTpl && shift?.hours && typeof shift.hours === 'string') {
      customTpl = customTemplates.find(t => shift.hours.toLowerCase().includes(t.name.toLowerCase()));
    }
  }

  if (customTpl) {
    return {
      icon: '⭐',
      title: customTpl.name,
      hours: `${customTpl.workStart || '09:00'} - ${customTpl.workEnd || '18:00'}`,
      isCustom: true,
      category: customTpl.shiftCategory || 'day',
      bgLight: 'bg-amber-100/90 text-amber-950 border-amber-500/60 shadow-xs',
      bgDark: 'bg-amber-500/20 text-[#F4EE8E] border-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.15)]'
    };
  }

  const config = SHIFT_TYPES_CONFIG[sType] || SHIFT_TYPES_CONFIG.weekend;
  
  let hoursText = '';
  if (isOff) {
    hoursText = config.label;
  } else if (shift?.workStart && shift?.workEnd) {
    hoursText = `${shift.workStart} - ${shift.workEnd}`;
  } else if (shift?.hours && typeof shift.hours === 'string' && shift.hours.includes('-')) {
    const m = shift.hours.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/);
    hoursText = m ? m[0] : (sType === 'night' ? '21:00 - 07:00' : sType === 'daily' ? '08:30 - 08:30' : '09:00 - 18:00');
  } else {
    hoursText = sType === 'night' ? '21:00 - 07:00' : sType === 'daily' ? '08:30 - 08:30' : '09:00 - 18:00';
  }

  // Strip leading emoji or icons from label if present to guarantee strictly 1 icon in UI
  const cleanTitle = (config.label || '').replace(/^[\p{Emoji}\p{Extended_Pictographic}\u2600-\u27BF\uFE0F\s]+/u, '').trim() || config.label;

  return {
    icon: config.icon,
    title: cleanTitle,
    hours: hoursText,
    isCustom: false,
    category: sType,
    bgLight: config.bgLight,
    bgDark: config.bgDark
  };
};

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  filteredSchedules,
  currentWeekDays,
  currentYear,
  currentMonth,
  customShiftTemplates,
  isLightTheme,
  onOpenEmployeeScheduleEditor,
  onSelectWeekTemplateOrShift,
  onSelectDay,
  onSetViewMode
}) => {
  // Mobile selected day state inside the current 7-day week
  const [selectedMobileDay, setSelectedMobileDay] = useState<number>(currentWeekDays[0] || 1);

  useEffect(() => {
    if (currentWeekDays.length > 0 && !currentWeekDays.includes(selectedMobileDay)) {
      setSelectedMobileDay(currentWeekDays[0]);
    }
  }, [currentWeekDays, selectedMobileDay]);

  // State for active dropdown popover (desktop & mobile)
  const [activeCell, setActiveCell] = useState<{
    empId: string;
    empName: string;
    day: number;
    currentType: string;
    rect?: DOMRect;
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveCell(null);
      }
    };
    if (activeCell) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeCell]);

  const handleSelectOption = (val: string) => {
    if (activeCell) {
      onSelectWeekTemplateOrShift(activeCell.empId, activeCell.day, val);
      setActiveCell(null);
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border shadow-xl transition-all relative backdrop-blur-md ${
        isLightTheme
          ? 'bg-[#FFFBF5]/90 border-amber-900/25 text-amber-950 shadow-amber-900/5'
          : 'bg-transparent border-amber-400/40 text-white shadow-[0_0_25px_rgba(244,238,142,0.12)]'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-amber-500/20">
        <div>
          <h4 className={`text-base font-black flex items-center gap-2 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
            <Sparkles size={18} className="text-amber-500 shrink-0" />
            <span>Недельная сетка рабочих смен ({currentWeekDays[0]} – {currentWeekDays[6]} {MONTH_NAMES_RU_GEN[currentMonth]})</span>
          </h4>
          <p className={`text-sm font-medium mt-1 ${isLightTheme ? 'text-amber-900/85' : 'text-amber-100/80'}`}>
            Выберите день недели, чтобы увидеть и изменить полные смены сотрудников без обрезания текста.
          </p>
        </div>
      </div>

      {/* MOBILE WEEK VIEW (sm:hidden): 7-Day Selector + Full Readable Cards */}
      <div className="sm:hidden space-y-4">
        {/* Top 7-Day Selector Bar */}
        <div
          className={`p-2 rounded-2xl border border-amber-500/35 shadow-sm backdrop-blur-md space-y-2 ${
            isLightTheme ? 'bg-[#FFFBF5]/95' : 'bg-[#1A0F02]/85'
          }`}
        >
          <div className="grid grid-cols-7 gap-1 text-center font-mono">
            {currentWeekDays.map((d) => {
              const dateObj = new Date(currentYear, currentMonth, d);
              const dayOfWeek = dateObj.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isHoliday = isPublicHoliday(currentYear, currentMonth, d);
              const isSel = d === selectedMobileDay;
              return (
                <button
                  key={`mob-week-head-${d}`}
                  type="button"
                  onClick={() => setSelectedMobileDay(d)}
                  className={`min-h-[52px] py-1.5 rounded-xl cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center border ${
                    isSel
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400 shadow-md font-black'
                      : isHoliday || isWeekend
                        ? isLightTheme
                          ? 'bg-rose-50/70 text-rose-700 border-rose-300'
                          : 'bg-rose-500/10 text-rose-300 border-rose-400/25'
                        : isLightTheme
                          ? 'bg-amber-50/70 text-amber-950 border-amber-900/20'
                          : 'bg-amber-500/10 text-amber-100 border-amber-400/25'
                  }`}
                >
                  <span className="text-sm font-bold leading-tight">{WEEK_DAY_NAMES_RU[dayOfWeek]}</span>
                  <span className="text-sm font-extrabold font-mono leading-tight">{d}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-1 pt-1 border-t border-amber-500/20">
            <span className={`text-sm font-bold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
              {selectedMobileDay} {MONTH_NAMES_RU_GEN[currentMonth]}
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectDay(selectedMobileDay);
                onSetViewMode('day');
              }}
              className="min-h-[38px] px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-950 dark:text-[#F4EE8E] text-sm font-bold cursor-pointer"
            >
              Часовая шкала дня
            </button>
          </div>
        </div>

        {/* Readable Employee Shift Cards for Selected Day */}
        <div className="space-y-3">
          {filteredSchedules.map((emp) => {
            const shift = emp.shifts.find(s => s.day === selectedMobileDay) || { type: 'weekend' as const, hours: 'Выходной' };
            const displayInfo = getShiftDisplayInfo(shift, customShiftTemplates);

            return (
              <div
                key={`mob-week-emp-${emp.id}`}
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isLightTheme ? 'border-amber-900/25 bg-amber-50/50' : 'border-amber-400/30 bg-amber-500/5'
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
                    title={`Редактировать график ${emp.name} на 30 дней`}
                  >
                    <Edit3 size={17} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setActiveCell({
                      empId: emp.id,
                      empName: emp.name,
                      day: selectedMobileDay,
                      currentType: shift.type,
                      rect
                    });
                  }}
                  className={`w-full min-h-[52px] p-3 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.99] ${
                    isLightTheme ? displayInfo.bgLight : displayInfo.bgDark
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold flex items-center gap-1.5">
                      <span>{displayInfo.icon}</span>
                      <span className="truncate">{displayInfo.title}</span>
                    </div>
                    <div className="text-sm font-mono font-semibold opacity-90 mt-0.5">
                      {displayInfo.hours}
                    </div>
                  </div>
                  <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 shrink-0 flex items-center gap-1">
                    <span>Изменить</span>
                    <ChevronDown size={14} />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* DESKTOP TABLE (hidden sm:block) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-amber-500/20 text-xs font-black text-amber-900 dark:text-[#F4EE8E]">
              <th className="p-3 w-[220px]">Сотрудник</th>
              {currentWeekDays.map((d) => {
                const dateObj = new Date(currentYear, currentMonth, d);
                const dayOfWeek = dateObj.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = isPublicHoliday(currentYear, currentMonth, d);
                return (
                  <th key={`week-th-${d}`} className="p-2 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                        {WEEK_DAY_NAMES_RU[dayOfWeek]}
                      </span>
                      <span className={`text-xs font-black font-mono ${
                        isHoliday ? 'text-red-500' : isWeekend ? 'text-red-400' : ''
                      }`}>
                        {d}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-amber-500/10">
            {filteredSchedules.map((emp) => (
              <tr key={`week-emp-row-${emp.id}`} className="hover:bg-amber-500/5 transition-colors">
                <td className="p-3 font-extrabold text-zinc-900 dark:text-white align-middle">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black">{emp.name}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                        {emp.role} • <span className="text-amber-600 dark:text-amber-300 font-mono">{emp.timezone}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenEmployeeScheduleEditor(emp)}
                      className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-[#F4EE8E] border border-amber-500/40 transition-all cursor-pointer shrink-0 ml-2 shadow-xs active:scale-95"
                      title={`Редактировать график для ${emp.name} на 30 дней`}
                    >
                      <Edit3 size={15} />
                    </button>
                  </div>
                </td>

                {currentWeekDays.map((d) => {
                  const shift = emp.shifts.find(s => s.day === d) || { type: 'weekend' as const, hours: 'Выходной' };
                  const displayInfo = getShiftDisplayInfo(shift, customShiftTemplates);
                  const isSelected = activeCell?.empId === emp.id && activeCell?.day === d;

                  return (
                    <td key={`week-cell-${emp.id}-${d}`} className="p-1.5 text-center align-middle relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          if (isSelected) {
                            setActiveCell(null);
                          } else {
                            setActiveCell({
                              empId: emp.id,
                              empName: emp.name,
                              day: d,
                              currentType: shift.type,
                              rect
                            });
                          }
                        }}
                        className={`w-full text-left p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-center min-h-[58px] ${
                          isSelected
                            ? 'ring-2 ring-amber-400 shadow-md scale-[0.98]'
                            : isLightTheme ? displayInfo.bgLight : displayInfo.bgDark
                        } hover:opacity-95 hover:border-amber-400/80`}
                        title="Нажмите для выбора шаблона или статуса смены"
                      >
                        {/* 1-я строка: Название и иконка */}
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className="text-xs font-black truncate flex items-center gap-1">
                            <span>{displayInfo.icon}</span>
                            <span className="truncate">{displayInfo.title}</span>
                          </span>
                          <ChevronDown size={12} className="opacity-60 shrink-0" />
                        </div>

                        {/* 2-я строка: Рабочие часы / статус */}
                        <div className="text-[10px] font-mono font-medium opacity-85 mt-0.5 truncate w-full">
                          {displayInfo.hours}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* UNIFIED CUSTOM POPOVER / MODAL DROPDOWN (DESKTOP & MOBILE) */}
      {activeCell && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs"
          onClick={() => setActiveCell(null)}
        >
          <div 
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border p-5 shadow-2xl space-y-4 transition-all max-h-[88vh] overflow-y-auto backdrop-blur-md ${
              isLightTheme
                ? 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950 shadow-amber-950/20'
                : 'bg-[#1A0F02]/95 border-amber-400/50 text-white shadow-[0_0_30px_rgba(244,238,142,0.25)]'
            }`}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/25">
              <div>
                <h5 className={`font-black text-base flex items-center gap-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Выбор смены: {activeCell.day} {MONTH_NAMES_RU_GEN[currentMonth]}</span>
                </h5>
                <span className={`text-sm font-medium ${isLightTheme ? 'text-amber-900/80' : 'text-amber-100/80'}`}>
                  Сотрудник: <strong className={isLightTheme ? 'text-amber-950' : 'text-white'}>{activeCell.empName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-amber-500/20 text-amber-950 dark:text-amber-200 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 1. Custom Shift Templates */}
            {customShiftTemplates && customShiftTemplates.length > 0 && (
              <div className="space-y-2">
                <div className={`text-sm font-black flex items-center gap-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                  <span>⭐</span> Пользовательские шаблоны
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {customShiftTemplates.map(tpl => (
                    <button
                      key={`pop-tpl-${tpl.id}`}
                      type="button"
                      onClick={() => handleSelectOption(`tpl:${tpl.id}`)}
                      className={`w-full min-h-[48px] p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                        isLightTheme 
                          ? 'bg-amber-100/70 hover:bg-amber-200/80 border-amber-400/60 text-amber-950' 
                          : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/35 text-[#F4EE8E]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">⭐</span>
                        <div className="min-w-0">
                          <div className="text-sm font-black truncate">{tpl.name}</div>
                          <div className="text-sm font-mono opacity-85 truncate">
                            {tpl.workStart} - {tpl.workEnd}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/35 shrink-0">
                        Выбрать
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Standard Shift Presets */}
            <div className="space-y-2">
              <div className={`text-sm font-black flex items-center gap-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                <span>Стандартные шаблоны</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'tpl:5/2', title: '5/2 Дневной', hours: '09:00 - 18:00' },
                  { key: 'tpl:2/2', title: '2/2 Сменный', hours: '09:00 - 21:00' },
                  { key: 'tpl:1/3', title: '1/3 Суточный', hours: '24 часа (08:30)' },
                  { key: 'tpl:6/1', title: '6/1 Усиленный', hours: '09:00 - 18:00' }
                ].map(std => (
                  <button
                    key={`pop-std-${std.key}`}
                    type="button"
                    onClick={() => handleSelectOption(std.key)}
                    className={`min-h-[52px] p-2.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${
                      isLightTheme 
                        ? 'bg-amber-500/5 hover:bg-amber-500/15 border-amber-900/25 text-amber-950' 
                        : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/25 text-amber-100'
                    }`}
                  >
                    <div className="text-sm font-black">{std.title}</div>
                    <div className="text-sm font-mono opacity-80">{std.hours}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Shift Types & Statuses */}
            <div className="space-y-2">
              <div className={`text-sm font-black flex items-center gap-1.5 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                <span>Типы и статусы смен</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'day', icon: '☀️', label: 'Дневная', hours: '09:00 - 18:00' },
                  { key: 'night', icon: '🌙', label: 'Ночная', hours: '21:00 - 07:00' },
                  { key: 'daily', icon: '⏳', label: 'Суточная', hours: '24 часа' },
                  { key: 'weekend', icon: '🏖️', label: 'Выходной', hours: 'Выходной' },
                  { key: 'vacation', icon: '🌴', label: 'Отпуск', hours: 'Отпуск' },
                  { key: 'sick', icon: '🩺', label: 'Больничный', hours: 'Больничный' },
                  { key: 'trip', icon: '💼', label: 'Командировка', hours: 'Командировка' },
                  { key: 'holiday', icon: '🏛️', label: 'Праздник', hours: '09:00 - 18:00' }
                ].map(st => {
                  const isCurrent = activeCell.currentType === st.key;
                  return (
                    <button
                      key={`pop-type-${st.key}`}
                      type="button"
                      onClick={() => handleSelectOption(st.key)}
                      className={`min-h-[52px] p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                        isCurrent
                          ? 'ring-2 ring-amber-400 bg-amber-500/25 border-amber-400/80 font-black'
                          : isLightTheme
                            ? 'bg-amber-500/5 hover:bg-amber-500/15 border-amber-900/25 text-amber-950'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/25 text-amber-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-black flex items-center gap-1 truncate">
                          <span>{st.icon}</span>
                          <span className="truncate">{st.label}</span>
                        </div>
                        <div className="text-sm font-mono opacity-80 truncate">{st.hours}</div>
                      </div>
                      {isCurrent && <Check size={15} className="text-amber-500 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

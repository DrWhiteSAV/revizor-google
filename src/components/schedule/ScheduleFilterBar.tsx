import React from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Filter, 
  Search, 
  Globe 
} from 'lucide-react';
import { MONTH_NAMES_RU, MONTH_NAMES_RU_GEN } from './types';

interface ScheduleFilterBarProps {
  viewMode: 'day' | 'week' | 'month' | 'holidays';
  setViewMode: (mode: 'day' | 'week' | 'month' | 'holidays') => void;
  currentYear: number;
  currentMonth: number;
  selectedDay: number;
  currentWeekDays: number[];
  globalTimezone: string;
  isLightTheme: boolean;
  hidePastDays: boolean;
  setHidePastDays: (val: boolean | ((prev: boolean) => boolean)) => void;
  isViewingCurrentMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onOpenGlobalTimezoneModal: () => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterDepartment: string;
  setFilterDepartment: (d: string) => void;
  filterType: string;
  setFilterType: (t: string) => void;
  filterPattern: string;
  setFilterPattern: (p: string) => void;
}

export const ScheduleFilterBar: React.FC<ScheduleFilterBarProps> = ({
  viewMode,
  setViewMode,
  currentYear,
  currentMonth,
  selectedDay,
  currentWeekDays,
  globalTimezone,
  isLightTheme,
  hidePastDays,
  setHidePastDays,
  isViewingCurrentMonth,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onOpenGlobalTimezoneModal,
  isFilterOpen,
  setIsFilterOpen,
  searchQuery,
  setSearchQuery,
  filterDepartment,
  setFilterDepartment,
  filterType,
  setFilterType,
  filterPattern,
  setFilterPattern
}) => {
  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border shadow-sm transition-all backdrop-blur-md ${
        isLightTheme
          ? 'bg-[#FFFBF5]/90 border-amber-900/25 text-amber-950 shadow-amber-900/5'
          : 'bg-transparent border-amber-400/40 text-white shadow-[0_0_25px_rgba(244,238,142,0.12)]'
      }`}
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-amber-500/25 pb-4">
        
        {/* Left Title & Global Timezone Badge */}
        <div className="flex items-start gap-3">
          <span className="p-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-md shrink-0">
            <Calendar size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-lg sm:text-xl font-black tracking-wide ${isLightTheme ? 'text-amber-950' : 'text-white'}`}>
                Интерактивный график смен
              </h3>
              
              <button
                type="button"
                onClick={onOpenGlobalTimezoneModal}
                className={`min-h-[38px] px-3 py-1 rounded-xl border text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isLightTheme
                    ? 'bg-amber-100/80 hover:bg-amber-200 border-amber-900/25 text-amber-950'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-[#F4EE8E]'
                }`}
                title="Изменить стандартный часовой пояс системы"
              >
                <Globe size={14} className="text-amber-500 shrink-0" />
                <span className="font-mono">{globalTimezone.split(' ')[0]}</span>
              </button>
            </div>
            <p className={`text-sm font-medium mt-0.5 ${isLightTheme ? 'text-amber-900' : 'text-amber-100/80'}`}>
              Управление рабочим временем, перерывами на обед и дежурствами
            </p>
          </div>
        </div>

        {/* Center & Right Controls (Wrapped cleanly on mobile, zero horizontal tab scroll) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* View Mode Switcher */}
          <div
            className={`w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1 p-1 rounded-2xl border ${
              isLightTheme ? 'bg-amber-50/70 border-amber-900/25' : 'bg-transparent border-amber-400/35'
            }`}
          >
            {(['month', 'week', 'day', 'holidays'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md'
                    : isLightTheme
                      ? 'text-amber-950 hover:bg-amber-100'
                      : 'text-amber-100 hover:bg-amber-500/15'
                }`}
              >
                {mode === 'month' ? 'Месяц' : mode === 'week' ? 'Неделя' : mode === 'day' ? 'День' : 'Праздники'}
              </button>
            ))}
          </div>

          {/* Toggle to view from current date (hiding past days) */}
          {viewMode === 'month' && isViewingCurrentMonth && (
            <button
              type="button"
              onClick={() => setHidePastDays(prev => !prev)}
              className={`min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                hidePastDays
                  ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400'
                  : isLightTheme
                    ? 'bg-amber-50/80 border-amber-900/25 text-amber-950 hover:bg-amber-100'
                    : 'bg-amber-500/10 border-amber-400/30 text-amber-100 hover:bg-amber-500/20'
              }`}
              title="Скрыть прошедшие дни и отображать график с сегодняшней даты"
            >
              <Calendar size={15} className="text-amber-700 dark:text-[#F4EE8E]" />
              <span>{hidePastDays ? 'С текущей даты' : 'Все дни'}</span>
            </button>
          )}

          {/* Date Nav Controls */}
          <div
            className={`flex items-center justify-between gap-1 p-1 rounded-2xl border w-full sm:w-auto ${
              isLightTheme ? 'bg-amber-50/80 border-amber-900/25' : 'bg-transparent border-amber-400/35'
            }`}
          >
            <button
              type="button"
              onClick={onPrevMonth}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isLightTheme ? 'hover:bg-amber-200/70 text-amber-950' : 'hover:bg-amber-500/20 text-[#F4EE8E]'
              }`}
              title="Предыдущий период"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className={`px-2 text-sm font-extrabold text-center flex-1 sm:min-w-[140px] ${
              isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
            }`}>
              {viewMode === 'day' 
                ? `${selectedDay} ${MONTH_NAMES_RU_GEN[currentMonth]} ${currentYear}`
                : viewMode === 'week'
                ? `${currentWeekDays[0]} – ${currentWeekDays[6]} ${MONTH_NAMES_RU_GEN[currentMonth]}`
                : `${MONTH_NAMES_RU[currentMonth]} ${currentYear}`}
            </div>

            <button
              type="button"
              onClick={onNextMonth}
              className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isLightTheme ? 'hover:bg-amber-200/70 text-amber-950' : 'hover:bg-amber-500/20 text-[#F4EE8E]'
              }`}
              title="Следующий период"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onGoToToday}
              className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-2xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm ${
                isLightTheme
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-900/25'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-[#F4EE8E] border-amber-400/40'
              }`}
              title="Перейти к сегодняшней дате"
            >
              <Clock size={15} className="text-amber-500" />
              <span>Сегодня</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFilterOpen(prev => !prev)}
              className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-2xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isFilterOpen
                  ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 border-amber-400 shadow-sm'
                  : isLightTheme
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-900/25'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-[#F4EE8E] border-amber-400/40'
              }`}
            >
              <Filter size={15} />
              <span>Фильтры</span>
            </button>
          </div>
        </div>

      </div>

      {/* Dynamic Search & Unified Global Filters Bar */}
      {isFilterOpen && (
        <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 animate-fade-in">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-3 text-amber-500" />
            <input
              type="text"
              placeholder="Поиск по имени или должности..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl text-sm font-bold border focus:outline-none ${
                isLightTheme
                  ? 'bg-white border-amber-900/25 text-amber-950 focus:border-amber-600'
                  : 'bg-[#140A01] border-amber-400/35 text-white focus:border-amber-400'
              }`}
            />
          </div>
          
          {/* Department Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
            <span className={`text-sm font-bold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>Отдел:</span>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border focus:outline-none ${
                isLightTheme
                  ? 'bg-white border-amber-900/25 text-amber-950'
                  : 'bg-[#140A01] border-amber-400/35 text-white'
              }`}
            >
              <option value="all">Все отделы</option>
              <option value="developer">Разработка</option>
              <option value="маркетолог">Маркетинг</option>
              <option value="продаж">Продажи</option>
              <option value="контент">Контент</option>
            </select>
          </div>

          {/* Shift Type Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
            <span className={`text-sm font-bold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>Тип смены:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border focus:outline-none ${
                isLightTheme
                  ? 'bg-white border-amber-900/25 text-amber-950'
                  : 'bg-[#140A01] border-amber-400/35 text-white'
              }`}
            >
              <option value="all">Все смены</option>
              <option value="day">Дневная</option>
              <option value="night">Ночная</option>
              <option value="daily">Суточная</option>
              <option value="weekend">Выходной</option>
              <option value="vacation">Отпуск</option>
              <option value="sick">Больничный</option>
              <option value="trip">Командировка</option>
              <option value="holiday">Праздничная</option>
            </select>
          </div>

          {/* Pattern Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
            <span className={`text-sm font-bold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>Режим:</span>
            <select
              value={filterPattern}
              onChange={(e) => setFilterPattern(e.target.value)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border focus:outline-none ${
                isLightTheme
                  ? 'bg-white border-amber-900/25 text-amber-950'
                  : 'bg-[#140A01] border-amber-400/35 text-white'
              }`}
            >
              <option value="all">Все режимы</option>
              <option value="5/2">5/2</option>
              <option value="2/2">2/2</option>
              <option value="1/3">1/3</option>
              <option value="6/1">6/1</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

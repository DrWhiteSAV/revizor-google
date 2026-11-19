import React from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Department, SubmittedReport } from '../../types';

interface CalendarFiltersBarProps {
  isDark: boolean;
  isMobileFiltersOpen: boolean;
  setIsMobileFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  calendarFilterDept: string;
  setCalendarFilterDept: (val: string) => void;
  calendarFilterEmp: string;
  setCalendarFilterEmp: (val: string) => void;
  colorFilter: 'All' | 'green' | 'yellow' | 'red';
  setColorFilter: (val: 'All' | 'green' | 'yellow' | 'red') => void;
  departments: Department[];
  reports: SubmittedReport[];
  canAdjustThresholds: boolean | null;
  onOpenSettings: () => void;
  greenThreshold: number;
  setGreenThreshold: (val: number) => void;
  yellowThreshold: number;
  setYellowThreshold: (val: number) => void;
  saveThresholdsToDb: (g: number, y: number) => void;
}

export const CalendarFiltersBar: React.FC<CalendarFiltersBarProps> = ({
  isDark,
  isMobileFiltersOpen,
  setIsMobileFiltersOpen,
  calendarFilterDept,
  setCalendarFilterDept,
  calendarFilterEmp,
  setCalendarFilterEmp,
  colorFilter,
  setColorFilter,
  departments,
  reports,
  canAdjustThresholds,
  onOpenSettings,
  greenThreshold,
  setGreenThreshold,
  yellowThreshold,
  setYellowThreshold,
  saveThresholdsToDb,
}) => {
  const activeFilterCount =
    (calendarFilterDept !== 'All' ? 1 : 0) +
    (calendarFilterEmp !== 'All' ? 1 : 0) +
    (colorFilter !== 'All' ? 1 : 0);

  return (
    <>
      {/* Collapsible Mobile Filters Bar Toggle */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
          className={`w-full min-h-[44px] px-4 py-2.5 rounded-2xl border backdrop-blur-md flex items-center justify-between gap-2 text-sm font-bold cursor-pointer ${
            isDark
              ? 'bg-[#1A0F02]/80 border-amber-400/40 text-[#F4EE8E]'
              : 'bg-white/85 border-amber-900/25 text-amber-950'
          }`}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            <span>Фильтры и пороги качества</span>
            {activeFilterCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-sm font-mono ${
                  isDark ? 'bg-amber-400/20 text-[#F4EE8E]' : 'bg-amber-200 text-amber-950'
                }`}
              >
                {activeFilterCount}
              </span>
            )}
          </span>
          {isMobileFiltersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Filters Bar & System Settings (Always visible on sm+, collapsible on mobile) */}
      <div
        className={`${
          isMobileFiltersOpen ? 'flex' : 'hidden sm:flex'
        } p-4 sm:p-5 rounded-2xl border backdrop-blur-md flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 sm:items-center justify-between text-sm ${
          isDark
            ? 'bg-[#1A0F02]/80 border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.1)]'
            : 'bg-white/85 border-amber-900/20 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 items-stretch sm:items-center">
          <select
            value={calendarFilterDept}
            onChange={(e) => setCalendarFilterDept(e.target.value)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm outline-none cursor-pointer ${
              isDark
                ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300'
                : 'bg-amber-50/70 border-amber-900/30 text-amber-950 focus:border-amber-600'
            }`}
          >
            <option value="All">Все отделы</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={calendarFilterEmp}
            onChange={(e) => setCalendarFilterEmp(e.target.value)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm outline-none cursor-pointer ${
              isDark
                ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300'
                : 'bg-amber-50/70 border-amber-900/30 text-amber-950 focus:border-amber-600'
            }`}
          >
            <option value="All">Все сотрудники</option>
            {Array.from(new Set(reports.map((r) => r.employeeName).filter(Boolean))).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={colorFilter}
            onChange={(e: any) => setColorFilter(e.target.value)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm outline-none cursor-pointer ${
              isDark
                ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300'
                : 'bg-amber-50/70 border-amber-900/30 text-amber-950 focus:border-amber-600'
            }`}
          >
            <option value="All">Все оценки (Светофор)</option>
            <option value="green">Высокая оценка (Золотой)</option>
            <option value="yellow">Средняя оценка (Янтарный)</option>
            <option value="red">Требует внимания (Красный)</option>
          </select>

          {canAdjustThresholds && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isDark
                  ? 'bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] border-amber-400/40'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
              }`}
            >
              <span>⚙️ Настройки компании и ID (PostgreSQL BD ProTalk)</span>
            </button>
          )}
        </div>

        <div
          className={`text-sm flex flex-wrap items-center gap-3 px-3.5 py-2 rounded-xl border ${
            isDark
              ? 'bg-[#140A01] border-amber-400/25 text-stone-300'
              : 'bg-amber-50/70 border-amber-900/20 text-amber-950'
          }`}
        >
          <span className={`font-semibold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
            Пороги в базе:
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F4EE8E] border border-amber-300 block" />
            <span>Золотой ≥</span>
            {canAdjustThresholds ? (
              <input
                type="number"
                min="0"
                max="100"
                value={greenThreshold}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                  setGreenThreshold(val);
                  saveThresholdsToDb(val, yellowThreshold);
                }}
                className={`w-14 min-h-[36px] rounded-lg text-center font-bold text-sm py-0.5 border outline-none ${
                  isDark
                    ? 'bg-[#1A0F02] border-amber-400/40 text-[#F4EE8E]'
                    : 'bg-white border-amber-900/30 text-amber-950'
                }`}
              />
            ) : (
              <span className="font-bold">{greenThreshold}</span>
            )}
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#E7C768] border border-amber-400 block" />
            <span>Янтарный ≥</span>
            {canAdjustThresholds ? (
              <input
                type="number"
                min="0"
                max="100"
                value={yellowThreshold}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                  setYellowThreshold(val);
                  saveThresholdsToDb(greenThreshold, val);
                }}
                className={`w-14 min-h-[36px] rounded-lg text-center font-bold text-sm py-0.5 border outline-none ${
                  isDark
                    ? 'bg-[#1A0F02] border-amber-400/40 text-[#F4EE8E]'
                    : 'bg-white border-amber-900/30 text-amber-950'
                }`}
              />
            ) : (
              <span className="font-bold">{yellowThreshold}</span>
            )}
          </span>

          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400 border border-rose-300 block" />
            <span className={isDark ? 'text-rose-300' : 'text-rose-800'}>Красный &lt; {yellowThreshold}</span>
          </span>
        </div>
      </div>
    </>
  );
};

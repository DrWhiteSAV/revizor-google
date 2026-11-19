import React from 'react';
import { 
  Clock, 
  Sun, 
  Moon, 
  Hourglass, 
  Calendar, 
  Users 
} from 'lucide-react';

interface ScheduleStatsCardsProps {
  monthStats: {
    dayCount: number;
    nightCount: number;
    dailyCount: number;
    weekendCount: number;
    vacationCount: number;
    sickCount: number;
  };
  totalEmployees: number;
  isLightTheme: boolean;
}

export const ScheduleStatsCards: React.FC<ScheduleStatsCardsProps> = ({
  monthStats,
  totalEmployees,
  isLightTheme
}) => {
  const totalWorkingShifts = monthStats.dayCount + monthStats.nightCount + monthStats.dailyCount;
  const totalNonWorking = monthStats.weekendCount + monthStats.vacationCount + monthStats.sickCount;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Shifts */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        isLightTheme
          ? 'bg-[#FFFBF5] border-amber-300 shadow-sm'
          : 'bg-[#1A0F02] border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-amber-800 dark:text-[#F4EE8E]">
            Все смены
          </span>
          <Clock size={16} className="text-amber-500" />
        </div>
        <div className="text-xl font-black font-mono mt-1 text-zinc-900 dark:text-white">
          {totalWorkingShifts}
        </div>
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          Всего рабочих смен
        </div>
      </div>

      {/* 2. Day Shifts */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        isLightTheme
          ? 'bg-[#FFFBF5] border-amber-300 shadow-sm'
          : 'bg-[#1A0F02] border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-amber-700 dark:text-[#F4EE8E]">
            Дневные
          </span>
          <Sun size={16} className="text-amber-500" />
        </div>
        <div className="text-xl font-black font-mono mt-1 text-amber-800 dark:text-[#F4EE8E]">
          {monthStats.dayCount}
        </div>
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          Стандартные 8-12ч
        </div>
      </div>

      {/* 3. Night Shifts */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        isLightTheme
          ? 'bg-[#FFFBF5] border-amber-300 shadow-sm'
          : 'bg-[#1A0F02] border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-amber-700 dark:text-[#F4EE8E]">
            Ночные
          </span>
          <Moon size={16} className="text-amber-500" />
        </div>
        <div className="text-xl font-black font-mono mt-1 text-zinc-900 dark:text-white">
          {monthStats.nightCount}
        </div>
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          Ночные дежурства
        </div>
      </div>

      {/* 4. Daily 24h Shifts */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        isLightTheme
          ? 'bg-[#FFFBF5] border-amber-300 shadow-sm'
          : 'bg-[#1A0F02] border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-orange-700 dark:text-orange-300">
            Суточные 24ч
          </span>
          <Hourglass size={16} className="text-orange-500" />
        </div>
        <div className="text-xl font-black font-mono mt-1 text-orange-700 dark:text-orange-300">
          {monthStats.dailyCount}
        </div>
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          Суточные дежурства
        </div>
      </div>

      {/* 5. Non-working Days */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        isLightTheme
          ? 'bg-[#FFFBF5] border-amber-300 shadow-sm'
          : 'bg-[#1A0F02] border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-300">
            Выходные/Отпуск
          </span>
          <Calendar size={16} className="text-rose-500" />
        </div>
        <div className="text-xl font-black font-mono mt-1 text-zinc-900 dark:text-white">
          {totalNonWorking}
        </div>
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          Отдых и отпуска
        </div>
      </div>

      {/* 6. Total Employees */}
      <div className={`p-3.5 rounded-2xl border transition-all ${
        isLightTheme
          ? 'bg-[#FFFBF5] border-amber-300 shadow-sm'
          : 'bg-[#1A0F02] border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase text-amber-800 dark:text-[#F4EE8E]">
            Сотрудников
          </span>
          <Users size={16} className="text-amber-500" />
        </div>
        <div className="text-xl font-black font-mono mt-1 text-zinc-900 dark:text-white">
          {totalEmployees}
        </div>
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
          В графике смен
        </div>
      </div>
    </div>
  );
};

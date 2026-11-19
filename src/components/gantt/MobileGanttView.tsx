import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Link2,
  RefreshCw,
  List,
  BarChart2,
  User as UserIcon,
  FolderOpen,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export interface MobileGanttTaskItem {
  id: string;
  executorId: string;
  executorName: string;
  executorRole: string;
  taskTitle: string;
  deadlineDays: number;
  status: 'pending' | 'in_progress' | 'verification' | 'completed' | 'delayed';
  checklist: { id: string; text: string; done: boolean }[];
  startDay?: number;
  durationDays?: number;
  dependentOnTaskId?: string | null;
  priority?: 'high' | 'medium' | 'low';
  author_name?: string;
  rescheduled_count?: number;
  rescheduled_reason?: string;
}

export interface MobileGanttRow {
  type: 'project' | 'task';
  processId: string;
  processTitle: string;
  task?: MobileGanttTaskItem;
  rowIndex: number;
}

interface MobileGanttViewProps {
  flattenedTaskRows: MobileGanttRow[];
  activeProcessTasks: MobileGanttTaskItem[];
  capitalizedMonth: string;
  simulatedToday: number;
  totalDaysInMonth: number;
  currentTimeStr: string;
  theme?: 'light' | 'dark';
  getTaskEffectiveDuration: (task: any) => {
    startDay: number;
    baseDur: number;
    effectiveDur: number;
    isAutoExtended: boolean;
    endDay: number;
  };
  onOpenTaskDrawer: (taskId: string) => void;
  onOpenShiftModal: (taskId: string) => void;
}

export const MobileGanttView: React.FC<MobileGanttViewProps> = ({
  flattenedTaskRows,
  activeProcessTasks,
  capitalizedMonth,
  simulatedToday,
  totalDaysInMonth,
  currentTimeStr,
  theme = 'dark',
  getTaskEffectiveDuration,
  onOpenTaskDrawer,
  onOpenShiftModal
}) => {
  const isDark = theme === 'dark';
  const [mobileMode, setMobileMode] = useState<'list' | 'timeline'>('list');
  const timelineRef = useRef<HTMLDivElement>(null);

  const taskRows = flattenedTaskRows.filter((r) => r.type === 'task' && r.task);
  const monthShort = capitalizedMonth.slice(0, 3).toLowerCase();
  const dayColWidth = 42;

  useEffect(() => {
    if (mobileMode === 'timeline' && timelineRef.current) {
      const container = timelineRef.current;
      const todayLeft = Math.max(0, (simulatedToday - 1) * dayColWidth - 80);
      container.scrollTo({ left: todayLeft, behavior: 'smooth' });
    }
  }, [mobileMode, simulatedToday]);

  const inProgressCount = activeProcessTasks.filter((t) => t.status === 'in_progress').length;
  const verificationCount = activeProcessTasks.filter((t) => t.status === 'verification').length;
  const completedCount = activeProcessTasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="block md:hidden space-y-4">
      {/* Header Summary & Mode Bubble Switcher (No horizontal scroll tabs) */}
      <div
        className={`p-4 rounded-2xl border space-y-3 backdrop-blur-md ${
          isDark
            ? 'bg-transparent border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.12)]'
            : 'bg-[#FFFBF5]/85 border-amber-900/25 shadow-sm'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-base font-extrabold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
            Мобильный Гант
          </span>
          <span
            className={`text-sm font-mono font-bold px-3 py-1 rounded-full border ${
              isDark
                ? 'bg-amber-400/15 text-[#F4EE8E] border-amber-400/40'
                : 'bg-amber-100 text-amber-950 border-amber-500/40'
            }`}
          >
            {taskRows.length} задач
          </span>
        </div>

        {/* Non-scrolling wrapped mode switch bubbles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMobileMode('list')}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mobileMode === 'list'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400 shadow-md'
                : isDark
                  ? 'bg-transparent border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'bg-amber-50/70 border-amber-900/25 text-amber-950 hover:bg-amber-100'
            }`}
          >
            <List size={16} />
            <span>Список задач</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMode('timeline')}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mobileMode === 'timeline'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400 shadow-md'
                : isDark
                  ? 'bg-transparent border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                  : 'bg-amber-50/70 border-amber-900/25 text-amber-950 hover:bg-amber-100'
            }`}
          >
            <BarChart2 size={16} />
            <span>Шкала сроков</span>
          </button>
        </div>

        {/* KPI Counters */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div
            className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-amber-500/10 border-amber-400/25' : 'bg-amber-50/80 border-amber-900/20'
            }`}
          >
            <span className={`block text-sm font-medium ${isDark ? 'text-amber-100/80' : 'text-amber-900'}`}>
              В работе
            </span>
            <span className={`font-extrabold text-base font-mono ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              {inProgressCount}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-amber-500/10 border-amber-400/25' : 'bg-amber-50/80 border-amber-900/20'
            }`}
          >
            <span className={`block text-sm font-medium ${isDark ? 'text-amber-100/80' : 'text-amber-900'}`}>
              Проверка
            </span>
            <span className={`font-extrabold text-base font-mono ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
              {verificationCount}
            </span>
          </div>
          <div
            className={`p-2.5 rounded-xl border ${
              isDark ? 'bg-amber-500/10 border-amber-400/25' : 'bg-amber-50/80 border-amber-900/20'
            }`}
          >
            <span className={`block text-sm font-medium ${isDark ? 'text-amber-100/80' : 'text-amber-900'}`}>
              Готово
            </span>
            <span className={`font-extrabold text-base font-mono ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              {completedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Mode 1: Interactive Timeline Chart for Mobile */}
      {mobileMode === 'timeline' && (
        <div
          className={`rounded-2xl border overflow-hidden ${
            isDark
              ? 'bg-transparent border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.12)]'
              : 'bg-[#FFFBF5]/90 border-amber-900/25 shadow-sm'
          }`}
        >
          <div
            className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 text-sm font-bold ${
              isDark
                ? 'border-amber-400/25 text-[#F4EE8E]'
                : 'border-amber-900/20 text-amber-950 bg-amber-50/70'
            }`}
          >
            <span>
              {capitalizedMonth} • свайп по шкале времени
            </span>
            <button
              type="button"
              onClick={() => {
                if (timelineRef.current) {
                  timelineRef.current.scrollTo({
                    left: Math.max(0, (simulatedToday - 1) * dayColWidth - 80),
                    behavior: 'smooth'
                  });
                }
              }}
              className="min-h-[36px] px-3 py-1 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-sm font-bold cursor-pointer"
            >
              Сегодня ({simulatedToday})
            </button>
          </div>

          {taskRows.length === 0 ? (
            <div className={`p-6 text-center text-sm ${isDark ? 'text-amber-200/80' : 'text-amber-950'}`}>
              Задач по выбранному фильтру не найдено
            </div>
          ) : (
            <div className="flex relative">
              {/* Sticky Left Task Titles Column */}
              <div
                className={`w-[136px] shrink-0 border-r z-10 ${
                  isDark
                    ? 'bg-[#140A01]/95 border-amber-400/30'
                    : 'bg-[#FFFBF5]/95 border-amber-900/20'
                }`}
              >
                <div
                  className={`h-11 px-2.5 flex items-center border-b text-sm font-bold ${
                    isDark ? 'border-amber-400/25 text-[#F4EE8E]' : 'border-amber-900/20 text-amber-950'
                  }`}
                >
                  Задача
                </div>
                {flattenedTaskRows.map((row) => {
                  if (row.type === 'project') {
                    return (
                      <div
                        key={`mob-tl-proj-${row.processId}`}
                        className={`h-10 px-2 flex items-center gap-1 border-b text-sm font-extrabold truncate ${
                          isDark
                            ? 'border-amber-400/20 bg-amber-500/10 text-[#F4EE8E]'
                            : 'border-amber-900/15 bg-amber-100/70 text-amber-950'
                        }`}
                      >
                        <FolderOpen size={14} className="shrink-0" />
                        <span className="truncate">{row.processTitle}</span>
                      </div>
                    );
                  }
                  const t = row.task!;
                  return (
                    <button
                      key={`mob-tl-left-${t.id}`}
                      type="button"
                      onClick={() => onOpenTaskDrawer(t.id)}
                      className={`w-full h-14 px-2.5 flex flex-col justify-center text-left border-b cursor-pointer transition-colors ${
                        isDark
                          ? 'border-amber-400/15 text-white hover:bg-amber-400/10'
                          : 'border-amber-900/15 text-amber-950 hover:bg-amber-50'
                      }`}
                    >
                      <span className="text-sm font-bold leading-tight truncate w-full">{t.taskTitle}</span>
                      <span className={`text-sm truncate w-full ${isDark ? 'text-amber-200/80' : 'text-amber-900'}`}>
                        {t.executorName.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Horizontally Scrollable Days + Bars */}
              <div ref={timelineRef} className="flex-1 overflow-x-auto relative">
                <div style={{ width: `${totalDaysInMonth * dayColWidth}px` }} className="relative">
                  {/* Days Header */}
                  <div
                    className={`h-11 flex border-b ${
                      isDark ? 'border-amber-400/25' : 'border-amber-900/20'
                    }`}
                  >
                    {Array.from({ length: totalDaysInMonth }, (_, i) => {
                      const d = i + 1;
                      const isToday = d === simulatedToday;
                      return (
                        <div
                          key={`mob-col-${d}`}
                          style={{ width: `${dayColWidth}px` }}
                          className={`h-full border-r flex items-center justify-center font-mono text-sm font-bold shrink-0 ${
                            isToday
                              ? 'bg-gradient-to-b from-[#F4EE8E] to-[#D99E41] text-amber-950 border-amber-400'
                              : isDark
                                ? 'border-amber-400/15 text-amber-200'
                                : 'border-amber-900/15 text-amber-950'
                          }`}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>

                  {/* Current Day Vertical Line */}
                  <div
                    style={{ left: `${(simulatedToday - 0.5) * dayColWidth}px` }}
                    className="absolute top-11 bottom-0 w-0.5 bg-amber-500 z-20 pointer-events-none"
                  />

                  {/* Bars */}
                  {flattenedTaskRows.map((row) => {
                    if (row.type === 'project') {
                      return (
                        <div
                          key={`mob-tl-row-proj-${row.processId}`}
                          className={`h-10 border-b px-3 flex items-center text-sm font-bold ${
                            isDark
                              ? 'border-amber-400/20 bg-amber-500/5 text-amber-200/80'
                              : 'border-amber-900/15 bg-amber-50/70 text-amber-900'
                          }`}
                        >
                          {row.processTitle}
                        </div>
                      );
                    }

                    const t = row.task!;
                    const eff = getTaskEffectiveDuration(t);
                    const leftPx = (eff.startDay - 1) * dayColWidth;
                    const widthPx = Math.max(46, eff.effectiveDur * dayColWidth);
                    const isDelayed = t.status === 'delayed';
                    const isCompleted = t.status === 'completed';

                    return (
                      <div
                        key={`mob-tl-bar-row-${t.id}`}
                        className={`h-14 border-b relative flex items-center ${
                          isDark ? 'border-amber-400/15' : 'border-amber-900/15'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenTaskDrawer(t.id)}
                          style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                          className={`absolute h-10 rounded-xl px-2.5 flex items-center justify-between gap-1 text-sm font-bold shadow-md cursor-pointer border transition-transform active:scale-95 ${
                            isDelayed
                              ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-rose-400'
                              : isCompleted
                                ? 'bg-gradient-to-r from-[#FFF8B4] via-[#F4EE8E] to-[#D99E41] text-amber-950 border-amber-400'
                                : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300'
                          }`}
                        >
                          <span className="truncate">{t.taskTitle}</span>
                          <span className="font-mono text-sm shrink-0 opacity-90">
                            {Math.max(1, Math.round(eff.effectiveDur))}д
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Rich Task Waterfall Cards */}
      {mobileMode === 'list' && (
        <div className="space-y-3">
          {taskRows.length === 0 ? (
            <div
              className={`p-6 text-center rounded-2xl border text-sm font-medium ${
                isDark
                  ? 'bg-transparent border-amber-400/30 text-amber-200/80'
                  : 'bg-[#FFFBF5]/85 border-amber-900/20 text-amber-950'
              }`}
            >
              Задач по выбранным фильтрам не найдено
            </div>
          ) : (
            taskRows.map((row, idx) => {
              const task = row.task!;
              const isCompleted = task.status === 'completed';
              const isDelayed = task.status === 'delayed';
              const isVerification = task.status === 'verification';
              const eff = getTaskEffectiveDuration(task);
              const duration = Math.max(1, Math.round(eff.effectiveDur));
              const endDay = Math.min(totalDaysInMonth, eff.startDay + duration - 1);
              const doneChecklist = (task.checklist || []).filter((c) => c.done).length;
              const totalChecklist = (task.checklist || []).length;

              // Progress bar percentage within the month
              const leftPct = Math.max(0, Math.min(92, ((eff.startDay - 1) / totalDaysInMonth) * 100));
              const widthPct = Math.max(8, Math.min(100 - leftPct, (duration / totalDaysInMonth) * 100));

              return (
                <div
                  key={`mob-task-${task.id}`}
                  className={`p-4 rounded-2xl border shadow-md space-y-3 transition-all ${
                    isDark
                      ? 'bg-transparent border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.08)]'
                      : 'bg-[#FFFBF5]/90 border-amber-900/25'
                  }`}
                >
                  {/* Header: Step & Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-sm font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className={`text-base font-bold break-words leading-snug ${isDark ? 'text-white' : 'text-amber-950'}`}>
                          {task.taskTitle}
                        </h4>
                        <span className={`text-sm block truncate ${isDark ? 'text-amber-200/80' : 'text-amber-900'}`}>
                          {row.processTitle}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-sm px-2.5 py-1 rounded-xl border font-bold shrink-0 flex items-center gap-1 ${
                        isCompleted
                          ? isDark
                            ? 'bg-amber-400/20 text-[#F4EE8E] border-amber-400/50'
                            : 'bg-amber-100 text-amber-950 border-amber-500'
                          : isDelayed
                            ? isDark
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                              : 'bg-rose-100 text-rose-900 border-rose-400'
                            : isVerification
                              ? isDark
                                ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                                : 'bg-amber-100 text-amber-950 border-amber-400'
                              : isDark
                                ? 'bg-amber-500/10 text-amber-100 border-amber-400/30'
                                : 'bg-amber-50 text-amber-950 border-amber-900/25'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 size={14} />}
                      {isDelayed && <AlertTriangle size={14} />}
                      <span>
                        {isCompleted ? 'Готово' : isDelayed ? 'Задержана' : isVerification ? 'Проверка ИИ' : 'В работе'}
                      </span>
                    </span>
                  </div>

                  {/* Mini Gantt Progress Strip inside Card */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className={`flex items-center gap-1.5 font-mono font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                        <Calendar size={15} className="text-amber-500 shrink-0" />
                        <span>
                          {eff.startDay} — {endDay} {monthShort}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 font-mono font-bold ${isDark ? 'text-amber-100/80' : 'text-amber-900'}`}>
                        <Clock size={14} />
                        <span>{duration} дн.</span>
                        {eff.isAutoExtended && <span className="text-amber-500">• до {currentTimeStr}</span>}
                      </div>
                    </div>

                    <div
                      className={`relative h-3 rounded-full border overflow-hidden ${
                        isDark ? 'bg-amber-950/30 border-amber-400/25' : 'bg-amber-100/70 border-amber-900/20'
                      }`}
                    >
                      <div
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className={`absolute top-0 bottom-0 rounded-full ${
                          isDelayed
                            ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                            : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Dependency Link */}
                  {task.dependentOnTaskId && (
                    <div
                      className={`p-2.5 rounded-xl border text-sm flex items-center gap-2 ${
                        isDark
                          ? 'bg-amber-400/10 border-amber-400/30 text-amber-200'
                          : 'bg-amber-50 border-amber-900/20 text-amber-950'
                      }`}
                    >
                      <Link2 size={15} className="text-amber-500 shrink-0" />
                      <span className="break-words">
                        Зависит от:{' '}
                        {activeProcessTasks.find((t) => t.id === task.dependentOnTaskId)?.taskTitle ||
                          task.dependentOnTaskId}
                      </span>
                    </div>
                  )}

                  {/* AI Shift Indicator */}
                  {(task.rescheduled_count || 0) > 0 && (
                    <div
                      className={`p-2.5 rounded-xl border text-sm space-y-0.5 ${
                        isDark
                          ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                          : 'bg-amber-100/70 border-amber-500/40 text-amber-950'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <RefreshCw size={14} className="text-amber-500 shrink-0" />
                        <span>Дедлайн сдвинут ИИ (+{task.rescheduled_count} раз)</span>
                      </div>
                      <p className={isDark ? 'text-amber-100/80' : 'text-amber-900'}>
                        {task.rescheduled_reason || 'Адаптация сроков выполнения'}
                      </p>
                    </div>
                  )}

                  {/* Executor & Author info */}
                  <div
                    className={`flex flex-col gap-1 text-sm border-t pt-2.5 ${
                      isDark ? 'border-amber-400/20 text-amber-100' : 'border-amber-900/15 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      <UserIcon size={15} className="text-amber-500 shrink-0" />
                      <span>
                        Кому: {task.executorName || 'Сотрудник'} ({task.executorRole || 'Исполнитель'})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={isDark ? 'text-amber-200/85' : 'text-amber-900'}>
                        От: {task.author_name || 'Руководитель'}
                      </span>
                      {totalChecklist > 0 && (
                        <span className={`font-mono font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                          Чек-лист: {doneChecklist}/{totalChecklist}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Touch Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenTaskDrawer(task.id)}
                      className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl border text-sm font-bold transition-all text-center cursor-pointer ${
                        isDark
                          ? 'bg-amber-400/15 hover:bg-amber-400/25 text-[#F4EE8E] border-amber-400/40'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-900/30'
                      }`}
                    >
                      Открыть задачу
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenShiftModal(task.id)}
                      className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-extrabold hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer shadow-sm"
                    >
                      Сдвинуть дедлайн
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

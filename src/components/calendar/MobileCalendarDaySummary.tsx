import React from 'react';
import { Calendar as CalendarIcon, CheckSquare, ExternalLink, Sparkles } from 'lucide-react';
import { SubmittedReport } from '../../types';
import { MatchedPlanGroup } from '../../utils/planMatching';

interface MobileCalendarDaySummaryProps {
  selectedDate: string;
  currentDeviceDateStr: string;
  dayReports: SubmittedReport[];
  dayPlans: MatchedPlanGroup[];
  greenThreshold: number;
  yellowThreshold: number;
  isDark: boolean;
  onOpenModal: (tab: 'reports' | 'checklist') => void;
  onNavigate?: (path: string) => void;
}

export const MobileCalendarDaySummary: React.FC<MobileCalendarDaySummaryProps> = ({
  selectedDate,
  currentDeviceDateStr,
  dayReports,
  dayPlans,
  greenThreshold,
  yellowThreshold,
  isDark,
  onOpenModal,
  onNavigate,
}) => {
  const totalPlanTasks = dayPlans.reduce((acc, g) => acc + g.totalCount, 0);
  const completedPlanTasks = dayPlans.reduce((acc, g) => acc + g.completedCount, 0);
  const hasPlanTasks = totalPlanTasks > 0;
  const isToday = selectedDate === currentDeviceDateStr;
  const isFuture = selectedDate > currentDeviceDateStr;

  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  });

  return (
    <div
      className={`md:hidden p-4 rounded-2xl border backdrop-blur-md space-y-3 transition-all ${
        isDark
          ? 'bg-[#1A0F02]/80 border-amber-400/40 text-amber-100 shadow-[0_0_20px_rgba(244,238,142,0.12)]'
          : 'bg-[#FFFBF5]/90 border-amber-900/25 text-amber-950 shadow-sm'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-amber-400/15 border-amber-400/40 text-[#F4EE8E]'
                : 'bg-amber-100 border-amber-400 text-amber-950'
            }`}
          >
            <CalendarIcon size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-sm font-black capitalize ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                {formattedDate}
              </span>
              {isToday && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-sm font-bold border ${
                    isDark
                      ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E]'
                      : 'bg-amber-200 border-amber-500 text-amber-950'
                  }`}
                >
                  Сегодня
                </span>
              )}
              {isFuture && (
                <span
                  className={`px-2 py-0.5 rounded-lg text-sm font-bold border ${
                    isDark
                      ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                      : 'bg-amber-100 border-amber-400 text-amber-900'
                  }`}
                >
                  План
                </span>
              )}
            </div>
            <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
              Рапортов: <strong>{dayReports.length}</strong> • Задач плана: <strong>{completedPlanTasks}/{totalPlanTasks}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Preview list of reports for selected date */}
      {dayReports.length > 0 ? (
        <div className="space-y-2">
          {dayReports.slice(0, 3).map((rep) => {
            const sColor =
              rep.statusColor ||
              (rep.qualityScore >= greenThreshold
                ? 'green'
                : rep.qualityScore >= yellowThreshold
                ? 'yellow'
                : 'red');

            const dotClass =
              sColor === 'red'
                ? 'bg-rose-400'
                : sColor === 'yellow'
                ? 'bg-amber-400'
                : 'bg-[#F4EE8E]';

            const scoreClass =
              sColor === 'red'
                ? isDark
                  ? 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                  : 'bg-rose-100 border-rose-300 text-rose-900'
                : sColor === 'yellow'
                ? isDark
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                  : 'bg-amber-100 border-amber-400 text-amber-950'
                : isDark
                ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E]'
                : 'bg-amber-100 border-amber-500 text-amber-950';

            return (
              <div
                key={rep.id}
                onClick={() => onOpenModal('reports')}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-[#140A01]/70 border-amber-400/30 hover:border-amber-300'
                    : 'bg-white/80 border-amber-900/20 hover:border-amber-500'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-amber-950'}`}>
                      {rep.employeeName}
                    </p>
                    <p className={`text-sm truncate ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                      {rep.templateTitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded-lg border text-sm font-mono font-bold ${scoreClass}`}>
                    {rep.qualityScore}
                  </span>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(`/cabinet/raport/verdict/${rep.id}`);
                      }}
                      aria-label="Вердикт ИИ"
                      className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border cursor-pointer ${
                        isDark
                          ? 'bg-amber-400/15 border-amber-400/40 text-[#F4EE8E]'
                          : 'bg-amber-100 border-amber-400 text-amber-950'
                      }`}
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {dayReports.length > 3 && (
            <p className={`text-sm font-medium text-center ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
              И еще {dayReports.length - 3} рапорт(ов) за этот день...
            </p>
          )}
        </div>
      ) : (
        <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
          {hasPlanTasks
            ? 'За этот день рапортов пока нет, но есть запланированные задачи ИИ.'
            : 'На выбранную дату рапорты и задачи ИИ отсутствуют.'}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={() => onOpenModal('reports')}
          className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
            isDark
              ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 shadow-[0_0_15px_rgba(244,238,142,0.2)]'
              : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-sm'
          }`}
        >
          <Sparkles size={16} />
          <span>Открыть аудит дня ({dayReports.length})</span>
        </button>

        {hasPlanTasks && (
          <button
            type="button"
            onClick={() => onOpenModal('checklist')}
            className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isDark
                ? 'bg-[#140A01]/70 border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/15'
                : 'bg-amber-100/80 border-amber-400 text-amber-950 hover:bg-amber-200'
            }`}
          >
            <CheckSquare size={16} />
            <span>Чеклист плана ({completedPlanTasks}/{totalPlanTasks})</span>
          </button>
        )}
      </div>
    </div>
  );
};

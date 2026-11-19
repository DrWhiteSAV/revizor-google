import React from 'react';
import { ExternalLink } from 'lucide-react';
import { SubmittedReport } from '../../types';

interface CalendarReportsListViewProps {
  reports: SubmittedReport[];
  greenThreshold: number;
  yellowThreshold: number;
  isDark: boolean;
  onSelectReport: (rep: SubmittedReport) => void;
  onNavigate?: (path: string) => void;
}

export const CalendarReportsListView: React.FC<CalendarReportsListViewProps> = ({
  reports,
  greenThreshold,
  yellowThreshold,
  isDark,
  onSelectReport,
  onNavigate,
}) => {
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedReports.length === 0) {
    return (
      <div
        className={`p-8 text-center rounded-3xl border text-sm font-sans ${
          isDark ? 'bg-[#140A01]/70 border-amber-400/20 text-stone-300' : 'bg-white border-amber-900/15 text-stone-700'
        }`}
      >
        Рапортов по выбранным фильтрам не найдено.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 font-sans">
      {sortedReports.map((rep) => {
        const sColor =
          rep.statusColor ||
          (rep.qualityScore >= greenThreshold ? 'green' : rep.qualityScore >= yellowThreshold ? 'yellow' : 'red');

        let cardStyle = isDark
          ? 'border-amber-400/30 bg-[#140A01]/80 hover:bg-[#140A01] hover:border-amber-400/60 text-amber-100'
          : 'border-amber-900/20 bg-white hover:border-amber-500 text-amber-950';
        let dotColor = isDark ? 'bg-[#F4EE8E]' : 'bg-amber-600';
        let badgeStyle = isDark
          ? 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
          : 'bg-amber-100 border-amber-400 text-amber-950';

        if (sColor === 'red') {
          cardStyle = isDark
            ? 'border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/30 hover:border-rose-400/50 text-rose-100'
            : 'border-rose-300 bg-rose-50/70 hover:border-rose-400 text-rose-950';
          dotColor = 'bg-rose-500 animate-pulse';
          badgeStyle = isDark
            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            : 'bg-rose-100 border-rose-300 text-rose-950';
        } else if (sColor === 'yellow') {
          cardStyle = isDark
            ? 'border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30 hover:border-amber-400/50 text-amber-100'
            : 'border-amber-300 bg-amber-50/70 hover:border-amber-400 text-amber-950';
          dotColor = 'bg-amber-500';
          badgeStyle = isDark
            ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
            : 'bg-amber-100 border-amber-300 text-amber-950';
        }

        return (
          <div
            key={rep.id}
            onClick={() => onSelectReport(rep)}
            className={`p-4 sm:p-5 rounded-3xl border ${cardStyle} flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer duration-150 shadow-sm`}
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                <strong className={`text-base font-bold ${isDark ? 'text-white' : 'text-amber-950'}`}>
                  {rep.employeeName}
                </strong>
                <span className={`text-sm font-mono ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  {new Date(rep.timestamp).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className={`text-sm font-semibold ${isDark ? 'text-amber-200' : 'text-stone-800'}`}>
                {rep.templateTitle}
              </p>
              {(rep.aiBriefReport || (rep as any).ai_brief_report || rep.aiSummary) && (
                <p className={`text-sm italic line-clamp-1 mt-1 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  "{rep.aiBriefReport || (rep as any).ai_brief_report || rep.aiSummary}"
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-stretch sm:self-center shrink-0">
              <div className="text-left sm:text-right mr-auto sm:mr-0">
                <span className={`block text-sm font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                  Оценка ИИ
                </span>
                <span className={`inline-block px-2.5 py-1 rounded-xl text-sm font-mono font-bold border ${badgeStyle}`}>
                  {rep.qualityScore}/100
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNavigate) {
                    onNavigate(`/cabinet/raport/verdict/${rep.id}`);
                  } else {
                    window.location.assign(`/cabinet/raport/verdict/${rep.id}`);
                  }
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  isDark
                    ? 'border-amber-400/50 bg-amber-400/15 hover:bg-amber-400/30 text-[#F4EE8E]'
                    : 'border-amber-500 bg-amber-100 hover:bg-amber-200 text-amber-950'
                }`}
              >
                <ExternalLink size={15} />
                <span>Вердикт ИИ</span>
              </button>
              <span
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-bold transition-all flex items-center ${
                  isDark
                    ? 'border-amber-400/30 bg-[#1A0F02] text-amber-200 hover:bg-amber-400/10'
                    : 'border-amber-900/20 bg-stone-100 text-amber-950 hover:bg-stone-200'
                }`}
              >
                Аудит
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { UserProfile } from '../../types';
import { MotivationAccrualItem, formatRub } from '../../components/motivation/types';
import { CosmicReceiptBadgeSvg } from '../../components/motivation/CosmicMotivationSvgs';

interface HistorySectionProps {
  historyItems: MotivationAccrualItem[];
  historyPeriods: string[];
  historySummary: any;
  periodFilter: string;
  setPeriodFilter: (val: string) => void;
  historyEmpFilter: string;
  setHistoryEmpFilter: (val: string) => void;
  canManage: boolean;
  allEmployees: UserProfile[];
  isDark: boolean;
  cardSurface: string;
  goldAccentText: string;
  mutedText: string;
}

export const MotivationHistorySection: React.FC<HistorySectionProps> = ({
  historyItems,
  historyPeriods,
  historySummary,
  periodFilter,
  setPeriodFilter,
  historyEmpFilter,
  setHistoryEmpFilter,
  canManage,
  allEmployees,
  isDark,
  cardSurface,
  goldAccentText,
  mutedText
}) => {
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border space-y-5 ${cardSurface}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className={`text-lg font-bold ${goldAccentText}`}>
            История расчетов мотивации
          </h3>
          <p className={`text-sm ${mutedText}`}>
            Детализация начислений за текущий и прошлые месяцы по каждому вечернему отчету.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className={`p-2.5 rounded-xl border text-sm font-semibold ${
              isDark
                ? 'bg-[#140A01]/90 border-amber-400/40 text-amber-50'
                : 'bg-[#FFFBF5] border-amber-900/40 text-amber-950'
            }`}
          >
            <option value="all">Все периоды</option>
            {Array.from(new Set([new Date().toISOString().slice(0, 7), ...historyPeriods])).map((p) => (
              <option key={p} value={p}>
                Период: {p}
              </option>
            ))}
          </select>

          {canManage && (
            <select
              value={historyEmpFilter}
              onChange={(e) => setHistoryEmpFilter(e.target.value)}
              className={`p-2.5 rounded-xl border text-sm font-semibold ${
                isDark
                  ? 'bg-[#140A01]/90 border-amber-400/40 text-amber-50'
                  : 'bg-[#FFFBF5] border-amber-900/40 text-amber-950'
              }`}
            >
              <option value="all">Все сотрудники</option>
              {allEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {historySummary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Итого за выборку', val: formatRub(historySummary.totalRub) },
            { label: 'Фикс-оклад', val: formatRub(historySummary.fixedRub) },
            { label: 'Переработки', val: `+${formatRub(historySummary.overtimeRub)}` },
            { label: 'Вычеты', val: (historySummary.penaltyRub || 0) > 0 ? `-${formatRub(historySummary.penaltyRub)}` : formatRub(0) },
            { label: 'Премии KPI', val: `+${formatRub(historySummary.kpiRub)}` }
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border ${isDark ? 'border-amber-400/30' : 'border-amber-900/30'}`}
            >
              <div className={`text-sm ${mutedText}`}>{stat.label}</div>
              <div className={`text-base font-extrabold mt-0.5 ${goldAccentText}`}>{stat.val}</div>
            </div>
          ))}
        </div>
      )}

      {historyItems.length === 0 ? (
        <div className={`p-6 rounded-2xl border text-center text-sm ${isDark ? 'border-amber-400/25' : 'border-amber-900/25'}`}>
          За выбранный период начислений пока нет. Расчет появляется сразу после отправки вечернего или итогового отчета.
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => {
            const isExpanded = expandedHistoryId === item.id;
            const missingMorning = Boolean(item.missing_morning_report);
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border space-y-3 transition-all ${
                  isDark ? 'border-amber-400/35 hover:border-[#F4EE8E]/70' : 'border-amber-900/30 hover:border-amber-950'
                }`}
              >
                <div
                  onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CosmicReceiptBadgeSvg isDark={isDark} missingMorning={missingMorning} />
                    <div className="min-w-0">
                      <div className="text-base font-bold break-words">
                        {item.employee_name} — {item.accrual_date}
                      </div>
                      <div className={`text-sm break-words ${mutedText}`}>
                        {item.calculator_title} · Отработано {item.worked_hours} ч / план {item.planned_hours} ч
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-lg font-extrabold ${goldAccentText}`}>
                        {formatRub(item.total_earned_rub)}
                      </div>
                      <div className={`text-sm ${mutedText}`}>
                        План: {Math.round(item.plan_completion_pct || 0)}%
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {missingMorning && (
                  <div className={`p-2.5 rounded-xl border text-sm font-medium ${isDark ? 'border-rose-400/45 text-rose-200' : 'border-rose-700/45 text-rose-900'}`}>
                    Утренний отчет отсутствовал: часы и фиксированный оклад по времени не начислены.
                  </div>
                )}

                {isExpanded && (
                  <div className="pt-3 border-t border-amber-500/20 space-y-3 text-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>Оклад: <strong>{formatRub(item.fixed_base_rub)}</strong></div>
                      <div>Переработка: <strong>+{formatRub(item.overtime_bonus_rub)}</strong></div>
                      <div>Недоработка: <strong>{(item.undertime_penalty_rub || 0) > 0 ? `-${formatRub(item.undertime_penalty_rub)}` : formatRub(0)}</strong></div>
                      <div>KPI итого: <strong>+{formatRub(item.kpi_total_rub)}</strong></div>
                    </div>

                    {Array.isArray(item.kpi_breakdown) && item.kpi_breakdown.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold">Детализация KPI:</div>
                        {item.kpi_breakdown.map((b, idx) => (
                          <div key={idx} className={`p-2.5 rounded-xl border flex flex-wrap justify-between gap-2 ${isDark ? 'border-amber-400/25' : 'border-amber-900/25'}`}>
                            <span>
                              {b.title}: <strong>{b.periodCumulativeValue}</strong> / {b.planTarget} ({b.completionPct}%) · {b.matchedGradeLabel}
                            </span>
                            <strong>+{formatRub(b.deltaTodayRub)}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.notes && <div className={mutedText}>Комментарий: {item.notes}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { UserProfile } from '../../types';
import { MotivationCalculator, formatRub, getPeriodLabel } from '../../components/motivation/types';
import { OrbitIncomeReactorSvg, PulseGradeConstellationSvg } from '../../components/motivation/CosmicMotivationSvgs';

interface PersonalSummaryProps {
  canManage: boolean;
  allEmployees: UserProfile[];
  selectedViewEmployeeId: string;
  setSelectedViewEmployeeId: (id: string) => void;
  summaryData: any;
  isDark: boolean;
  cardSurface: string;
  goldAccentText: string;
  mutedText: string;
  onNavigate?: (path: string) => void;
}

export const MotivationPersonalSummary: React.FC<PersonalSummaryProps> = ({
  canManage,
  allEmployees,
  selectedViewEmployeeId,
  setSelectedViewEmployeeId,
  summaryData,
  isDark,
  cardSurface,
  goldAccentText,
  mutedText,
  onNavigate
}) => {
  const activeCalc: MotivationCalculator | null = summaryData?.calculator || null;
  const liveCalc = summaryData?.liveCalculation || null;

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border space-y-5 ${cardSurface}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="space-y-0.5 min-w-0">
          <h3 className={`text-lg font-bold break-words ${goldAccentText}`}>
            {canManage ? 'Живой профиль мотивации специалиста' : 'Ваша текущая схема мотивации и прогресс'}
          </h3>
          <p className={`text-sm ${mutedText}`}>
            Формулы, прогресс к плану, темп по графику смен и прогноз начислений.
          </p>
        </div>

        {canManage && allEmployees.length > 0 && (
          <select
            value={selectedViewEmployeeId}
            onChange={(e) => setSelectedViewEmployeeId(e.target.value)}
            className={`p-2.5 rounded-xl border text-sm font-semibold ${
              isDark
                ? 'bg-[#140A01]/90 border-amber-400/40 text-amber-50'
                : 'bg-[#FFFBF5] border-amber-900/40 text-amber-950'
            }`}
          >
            {allEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.position ? `(${emp.position})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {!activeCalc ? (
        <div className={`p-5 rounded-2xl border text-center space-y-2 text-sm ${isDark ? 'border-amber-400/30' : 'border-amber-900/30'}`}>
          <div className="font-bold text-base">Для этого сотрудника еще не назначен активный калькулятор мотивации.</div>
          <p className={mutedText}>
            {canManage
              ? 'Создайте новый калькулятор или примените готовый шаблон из списка ниже.'
              : 'Обратитесь к руководителю или директору для назначения вашей схемы мотивации.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {activeCalc.fixed_config.verification_mode === 'time' && !summaryData?.hasMorningReportToday && (
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark ? 'border-amber-400/75 text-[#F4EE8E]' : 'border-amber-900/60 bg-amber-100/50 text-amber-950'}`}>
              <div className="flex items-start gap-2.5 text-sm">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Сегодня еще не сдан утренний отчет!</div>
                  <div>
                    Поскольку оклад привязан к отработанному времени, без утреннего отчета старт смены не зафиксирован. Подайте утренний отчет перед вечерним.
                  </div>
                </div>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/cabinet/raport')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm shrink-0 cursor-pointer"
                >
                  Сдать утренний отчет
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center gap-6">
            <OrbitIncomeReactorSvg
              fixedRub={liveCalc?.fixedBaseRub || 0}
              overtimeRub={liveCalc?.overtimeBonusRub || 0}
              kpiRub={liveCalc?.kpiTotalRub || 0}
              planPct={liveCalc?.overallPlanCompletionPct ?? liveCalc?.overallPlanPct ?? 0}
              schedulePacePct={liveCalc?.schedulePacePct || 0}
              isDark={isDark}
            />

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                <div className={`text-sm ${mutedText}`}>Начислено за текущий месяц</div>
                <div className={`text-2xl font-extrabold mt-0.5 ${goldAccentText}`}>
                  {formatRub(summaryData?.monthEarnedRub || 0)}
                </div>
                <div className={`text-sm mt-1 ${mutedText}`}>
                  Смен по графику в месяце: {summaryData?.shiftStats?.workingShiftsInMonth ?? summaryData?.shiftStats?.workingShifts ?? 21}
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                <div className={`text-sm ${mutedText}`}>Активный шаблон и оклад</div>
                <div className="text-base font-bold mt-0.5 break-words">{activeCalc.title}</div>
                <div className={`text-sm mt-1 ${mutedText}`}>
                  {activeCalc.fixed_config.salary_mode === 'per_shift'
                    ? `${formatRub(activeCalc.fixed_config.base_amount)} / смена`
                    : `${formatRub(activeCalc.fixed_config.base_amount)} / мес (по графику)`}
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                <div className={`text-sm ${mutedText}`}>Расчет за сегодняшнюю смену</div>
                <div className="text-lg font-extrabold mt-0.5">
                  {formatRub(liveCalc?.totalEarnedRub || 0)}
                </div>
                <div className={`text-sm mt-0.5 ${mutedText}`}>
                  Оклад: {formatRub(liveCalc?.fixedBaseRub || 0)} · KPI: {formatRub(liveCalc?.kpiTotalRub || 0)}
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                <div className={`text-sm ${mutedText}`}>Темп графика и переработки</div>
                <div className="text-base font-bold mt-0.5">
                  График пройден на {Math.round(liveCalc?.schedulePacePct || 0)}%
                </div>
                <div className={`text-sm mt-0.5 ${mutedText}`}>
                  Переработки: +{formatRub(liveCalc?.overtimeBonusRub || 0)} · Вычеты: {(liveCalc?.undertimePenaltyRub || 0) > 0 ? `-${formatRub(liveCalc?.undertimePenaltyRub || 0)}` : formatRub(0)}
                </div>
              </div>
            </div>
          </div>

          {activeCalc.kpi_rules.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className={`text-base font-bold ${goldAccentText}`}>
                Показатели KPI и текущее выполнение планов:
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeCalc.kpi_rules.map((rule) => {
                  const liveItem = (liveCalc?.kpiBreakdown || []).find((b: any) => b.ruleId === rule.id);
                  const pct = Math.min(150, Math.round(liveItem?.completionPct || 0));
                  const pace = Math.min(100, Math.round(liveItem?.schedulePacePct || 0));
                  return (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-2xl border space-y-2.5 ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold">{rule.title}</div>
                          <div className={`text-sm ${mutedText}`}>
                            Период: {getPeriodLabel(rule.period)} · Поле: {rule.field_label || rule.field_id}
                          </div>
                        </div>
                        <div className={`text-base font-extrabold ${goldAccentText}`}>
                          {formatRub(liveItem?.earnedRub || 0)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-sm font-semibold">
                          <span>
                            Выполнено: {liveItem?.periodCumulativeValue ?? 0} из {liveItem?.planTarget ?? rule.plan_target} ({pct}%)
                          </span>
                          <span>Темп смен: {pace}%</span>
                        </div>
                        <div className="relative w-full h-3 rounded-full border border-amber-400/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#D99E41] via-[#E7C768] to-[#F4EE8E]"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-amber-950"
                            style={{ left: `${pace}%` }}
                            title={`Плановый темп по графику смен: ${pace}%`}
                          />
                        </div>
                      </div>

                      <PulseGradeConstellationSvg
                        grades={rule.grades}
                        currentValue={
                          rule.calc_mode === 'plan_percent_grades'
                            ? liveItem?.completionPct || 0
                            : liveItem?.periodCumulativeValue || 0
                        }
                        calcMode={rule.calc_mode}
                        isDark={isDark}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

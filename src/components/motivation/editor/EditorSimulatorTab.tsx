import React from 'react';
import { Layers, Loader2, Play, Sparkles } from 'lucide-react';
import { MotivationCalculator, formatRub } from '../types';

interface EditorSimulatorTabProps {
  form: MotivationCalculator;
  simHours: number;
  setSimHours: (val: number) => void;
  simHasMorning: boolean;
  setSimHasMorning: (val: boolean) => void;
  simAnswers: Record<string, string>;
  setSimAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  simResult: any;
  isSimulating: boolean;
  onRunSimulation: () => void;
  inputClass: string;
  isDark: boolean;
}

export const EditorSimulatorTab: React.FC<EditorSimulatorTabProps> = ({
  form,
  simHours,
  setSimHours,
  simHasMorning,
  setSimHasMorning,
  simAnswers,
  setSimAnswers,
  simResult,
  isSimulating,
  onRunSimulation,
  inputClass,
  isDark
}) => {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          <Layers size={18} />
          <span>Тестовая симуляция расчета за смену</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold block">Отработано часов за смену</label>
            <input
              type="number"
              step="0.5"
              min={0}
              max={24}
              value={simHours}
              onChange={(e) => setSimHours(Number(e.target.value || 0))}
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={simHasMorning}
                onChange={(e) => setSimHasMorning(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span>Утренний отчет был сдан вовремя</span>
            </label>
          </div>
        </div>

        {form.kpi_rules.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {form.kpi_rules.map((r) => (
              <div key={r.id} className="space-y-1">
                <label className="text-sm font-semibold block">
                  Факт: {r.field_label || r.title}
                </label>
                <input
                  type="number"
                  step="any"
                  value={simAnswers[r.field_id || r.id] || ''}
                  onChange={(e) =>
                    setSimAnswers((prev) => ({
                      ...prev,
                      [r.field_id || r.id]: e.target.value,
                      ...(r.base_revenue_field_id && !prev[r.base_revenue_field_id]
                        ? { [r.base_revenue_field_id]: e.target.value }
                        : {})
                    }))
                  }
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={isSimulating}
          onClick={onRunSimulation}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSimulating ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
          <span>Рассчитать тестовую смену</span>
        </button>
      </div>

      {simResult && (
        <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-[#F4EE8E]/60 shadow-[0_0_25px_rgba(244,238,142,0.18)]' : 'border-amber-900/50 bg-amber-100/35'}`}>
          {simResult.morningWarning && (
            <div className="p-3 rounded-xl border border-rose-400/50 text-sm font-semibold">
              {simResult.morningWarning}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
            <span className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles size={17} />
              <span>Итого начислено за тестовую смену:</span>
            </span>
            <span className="text-xl font-extrabold">{formatRub(simResult.totalEarnedRub)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-sm">
            <div className="p-2.5 rounded-xl border border-amber-500/25">
              <div className="opacity-75">Оклад</div>
              <div className="font-bold">{formatRub(simResult.fixedBaseRub)}</div>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-500/25">
              <div className="opacity-75">Переработка</div>
              <div className="font-bold">+{formatRub(simResult.overtimeBonusRub)}</div>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-500/25">
              <div className="opacity-75">Недоработка</div>
              <div className="font-bold">-{formatRub(simResult.undertimePenaltyRub)}</div>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-500/25">
              <div className="opacity-75">Премия KPI</div>
              <div className="font-bold">+{formatRub(simResult.kpiTotalRub)}</div>
            </div>
          </div>
          {Array.isArray(simResult.kpiBreakdown) && simResult.kpiBreakdown.length > 0 && (
            <div className="space-y-1.5 text-sm">
              {simResult.kpiBreakdown.map((k: any, idx: number) => (
                <div key={idx} className="flex flex-wrap justify-between gap-2 p-2.5 rounded-xl border border-amber-500/20">
                  <span>
                    <strong>{k.title}</strong>: план {k.completionPct}% ({k.matchedGradeLabel})
                  </span>
                  <span className="font-bold">+{formatRub(k.deltaTodayRub)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

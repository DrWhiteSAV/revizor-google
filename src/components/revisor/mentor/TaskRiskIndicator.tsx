import React from 'react';
import { ShieldAlert, Clock, Gauge, Sparkles } from 'lucide-react';

interface TaskRiskIndicatorProps {
  riskScore?: number;
  riskLevel?: string;
  progressPercent?: number;
  checkCadence?: string;
  autonomyMode?: string;
  blockerStatus?: string;
  isDark?: boolean;
  onOpenMentor?: (tab: 'help' | 'preflight' | 'decompose' | 'checkin') => void;
}

const CADENCE_LABELS: Record<string, string> = {
  every_2h: 'Каждые 2 часа',
  every_4h: 'Каждые 4 часа',
  twice_daily: '2 раза в смену',
  daily: 'Ежедневно',
  before_deadline: 'К дедлайну',
  custom_cron: 'Свое расписание'
};

const AUTONOMY_LABELS: Record<string, string> = {
  observer: 'Наблюдатель',
  controller: 'Контролер',
  autopilot: 'Автопилот'
};

export const TaskRiskIndicator: React.FC<TaskRiskIndicatorProps> = ({
  riskScore = 0,
  riskLevel = 'low',
  progressPercent = 0,
  checkCadence = 'daily',
  autonomyMode = 'controller',
  blockerStatus = 'none',
  isDark = true,
  onOpenMentor
}) => {
  const riskLabel =
    riskLevel === 'critical' ? 'Критический риск' :
    riskLevel === 'high' ? 'Высокий риск' :
    riskLevel === 'medium' ? 'Средний риск' : 'Низкий риск';

  const isElevated = riskScore >= 55 || (blockerStatus && blockerStatus !== 'none');

  return (
    <div className={`w-full rounded-2xl border p-3 sm:p-4 backdrop-blur-md transition-colors ${
      isDark
        ? 'bg-[#1A0F02]/55 border-[#E7C768]/35 text-[#F4EE8E]'
        : 'bg-[#FAF6EC]/70 border-[#B8860B]/35 text-amber-950'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Clean unboxed typographic metadata strip */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm leading-snug min-w-0">
          <span className={`inline-flex items-center gap-1.5 font-semibold ${
            isElevated
              ? (isDark ? 'text-amber-300' : 'text-amber-900')
              : (isDark ? 'text-[#E7C768]' : 'text-amber-950')
          }`}>
            <Gauge size={16} className="shrink-0" />
            <span className="tabular-nums">Риск: {riskScore}/100 ({riskLabel})</span>
          </span>

          <span aria-hidden="true" className="opacity-45">·</span>

          <span className="inline-flex items-center gap-1.5 opacity-90">
            <Clock size={15} className="shrink-0" />
            <span>{CADENCE_LABELS[checkCadence] || 'Ежедневно'}</span>
          </span>

          <span aria-hidden="true" className="opacity-45">·</span>

          <span className="opacity-90">
            Режим: {AUTONOMY_LABELS[autonomyMode] || 'Контролер'}
          </span>

          <span aria-hidden="true" className="opacity-45">·</span>

          <span className="font-semibold tabular-nums">
            Прогресс: {progressPercent}%
          </span>

          {blockerStatus && blockerStatus !== 'none' && (
            <>
              <span aria-hidden="true" className="opacity-45">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                <ShieldAlert size={15} className="shrink-0" />
                <span>Есть затруднение</span>
              </span>
            </>
          )}
        </div>

        {/* Direct interactive actions — wrap cleanly on mobile */}
        {onOpenMentor && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenMentor('help')}
              className={`px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#E7C768]/50 bg-[#E7C768]/15 hover:bg-[#E7C768]/25 text-[#F4EE8E]'
                  : 'border-[#B8860B]/45 bg-[#B8860B]/10 hover:bg-[#B8860B]/20 text-amber-950'
              }`}
            >
              <Sparkles size={15} />
              <span>Помощь с задачей</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenMentor('preflight')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 transition-all cursor-pointer"
            >
              Проверить черновик
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

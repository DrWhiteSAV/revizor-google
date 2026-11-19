import React from 'react';
import { MotivationKpiGrade } from './types';

interface ReactorSvgProps {
  fixedRub: number;
  overtimeRub: number;
  kpiRub: number;
  planPct: number;
  schedulePacePct: number;
  isDark: boolean;
}

/**
 * Космический орбитальный реактор дохода:
 * - Ядро: фиксированный оклад смены
 * - Средняя орбита: темп рабочих смен по графику
 * - Внешняя орбита: прогресс выполнения KPI-планов и переработки
 */
export const OrbitIncomeReactorSvg: React.FC<ReactorSvgProps> = ({
  fixedRub,
  overtimeRub,
  kpiRub,
  planPct,
  schedulePacePct,
  isDark
}) => {
  const clampedPlan = Math.max(0, Math.min(100, planPct || 0));
  const clampedSchedule = Math.max(0, Math.min(100, schedulePacePct || 0));
  const outerRadius = 78;
  const innerRadius = 56;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerCirc = 2 * Math.PI * innerRadius;
  const outerOffset = outerCirc - (clampedPlan / 100) * outerCirc;
  const innerOffset = innerCirc - (clampedSchedule / 100) * innerCirc;

  const total = Math.max(1, fixedRub + overtimeRub + kpiRub);
  const strokeMain = isDark ? '#F4EE8E' : '#92400E';
  const strokeMid = isDark ? '#E7C768' : '#B45309';
  const strokeTrack = isDark ? 'rgba(244,238,142,0.16)' : 'rgba(146,64,14,0.16)';
  const textPrimary = isDark ? '#FFFBEB' : '#451A03';
  const textSub = isDark ? '#E7C768' : '#78350F';

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-40 h-40 sm:w-48 sm:h-48 shrink-0 overflow-visible"
      aria-label="Орбитальная диаграмма структуры заработка и темпа графика"
    >
      <defs>
        <radialGradient id="orbitCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isDark ? '#F4EE8E' : '#D97706'} stopOpacity="0.42" />
          <stop offset="70%" stopColor={isDark ? '#D4AF37' : '#B45309'} stopOpacity="0.14" />
          <stop offset="100%" stopColor={isDark ? '#140A01' : '#FFFBF5'} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goldOrbitArc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isDark ? '#FFF8B4' : '#B45309'} />
          <stop offset="50%" stopColor={isDark ? '#E7C768' : '#92400E'} />
          <stop offset="100%" stopColor={isDark ? '#D99E41' : '#78350F'} />
        </linearGradient>
      </defs>

      {/* Ambient core glow */}
      <circle cx="100" cy="100" r="88" fill="url(#orbitCoreGlow)" />

      {/* Decorative dotted cosmic ring */}
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke={strokeTrack}
        strokeWidth="1.5"
        strokeDasharray="3 7"
      />

      {/* Outer orbit track (KPI plan completion %) */}
      <circle cx="100" cy="100" r={outerRadius} fill="none" stroke={strokeTrack} strokeWidth="9" />
      <circle
        cx="100"
        cy="100"
        r={outerRadius}
        fill="none"
        stroke="url(#goldOrbitArc)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={outerCirc}
        strokeDashoffset={outerOffset}
        transform="rotate(-90 100 100)"
      />

      {/* Inner orbit track (Work schedule pace %) */}
      <circle cx="100" cy="100" r={innerRadius} fill="none" stroke={strokeTrack} strokeWidth="6" />
      <circle
        cx="100"
        cy="100"
        r={innerRadius}
        fill="none"
        stroke={strokeMid}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={innerCirc}
        strokeDashoffset={innerOffset}
        transform="rotate(-90 100 100)"
        opacity="0.85"
      />

      {/* Orbiting satellite node on outer ring */}
      {(() => {
        const angle = ((clampedPlan / 100) * 360 - 90) * (Math.PI / 180);
        const sx = 100 + outerRadius * Math.cos(angle);
        const sy = 100 + outerRadius * Math.sin(angle);
        return (
          <g>
            <circle cx={sx} cy={sy} r="7" fill={strokeMain} opacity="0.35" />
            <circle cx={sx} cy={sy} r="4" fill={strokeMain} />
          </g>
        );
      })()}

      {/* Center core info */}
      <circle
        cx="100"
        cy="100"
        r="40"
        fill="none"
        stroke={strokeMid}
        strokeWidth="1.5"
        opacity="0.55"
      />
      <text x="100" y="92" textAnchor="middle" fill={textSub} fontSize="14" fontWeight="600">
        План KPI
      </text>
      <text x="100" y="114" textAnchor="middle" fill={textPrimary} fontSize="20" fontWeight="700">
        {Math.round(planPct)}%
      </text>
      <text x="100" y="132" textAnchor="middle" fill={textSub} fontSize="13" fontWeight="500">
        Оклад {Math.round((fixedRub / total) * 100)}%
      </text>
    </svg>
  );
};

interface ConstellationProps {
  grades: MotivationKpiGrade[];
  currentValue: number;
  calcMode: 'volume_grades' | 'plan_percent_grades';
  isDark: boolean;
}

/**
 * Космическое созвездие грейдов: показывает пройденные и целевые узлы ступеней KPI
 */
export const PulseGradeConstellationSvg: React.FC<ConstellationProps> = ({
  grades,
  currentValue,
  calcMode,
  isDark
}) => {
  const sorted = [...(grades || [])].sort((a, b) => Number(a.threshold) - Number(b.threshold)).slice(0, 5);
  if (sorted.length === 0) return null;

  const width = 320;
  const height = 74;
  const padX = 28;
  const stepX = sorted.length > 1 ? (width - padX * 2) / (sorted.length - 1) : 0;
  const activeColor = isDark ? '#F4EE8E' : '#92400E';
  const dimColor = isDark ? 'rgba(231,199,104,0.28)' : 'rgba(146,64,14,0.25)';
  const labelColor = isDark ? '#FFFBEB' : '#451A03';

  const points = sorted.map((g, idx) => {
    const x = sorted.length === 1 ? width / 2 : padX + idx * stepX;
    const y = idx % 2 === 0 ? 28 : 42;
    const reached = currentValue >= Number(g.threshold);
    return { g, x, y, reached };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-18 overflow-visible" aria-label="Траектория грейдов KPI">
      {points.map((pt, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        const segReached = pt.reached && prev.reached;
        return (
          <line
            key={`line_${i}`}
            x1={prev.x}
            y1={prev.y}
            x2={pt.x}
            y2={pt.y}
            stroke={segReached ? activeColor : dimColor}
            strokeWidth={segReached ? 3 : 2}
            strokeDasharray={segReached ? undefined : '4 4'}
          />
        );
      })}
      {points.map((pt, i) => {
        const suffix = calcMode === 'plan_percent_grades' ? '%' : '';
        return (
          <g key={`node_${i}`}>
            {pt.reached && <circle cx={pt.x} cy={pt.y} r="11" fill={activeColor} opacity="0.22" />}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.reached ? 6.5 : 5}
              fill={pt.reached ? activeColor : 'transparent'}
              stroke={pt.reached ? activeColor : dimColor}
              strokeWidth="2"
            />
            <text
              x={pt.x}
              y={pt.y + 20}
              textAnchor="middle"
              fill={pt.reached ? labelColor : isDark ? '#D6D3D1' : '#78350F'}
              fontSize="14"
              fontWeight={pt.reached ? '700' : '500'}
            >
              {pt.g.threshold}
              {suffix}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Космический жетон смены для карточек истории расчетов
 */
export const CosmicReceiptBadgeSvg: React.FC<{ isDark: boolean; missingMorning?: boolean }> = ({
  isDark,
  missingMorning
}) => {
  const stroke = isDark ? '#F4EE8E' : '#92400E';
  const accent = isDark ? '#D99E41' : '#B45309';

  return (
    <svg viewBox="0 0 48 48" className="w-11 h-11 shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.7" />
      <ellipse cx="24" cy="24" rx="18" ry="7" fill="none" stroke={accent} strokeWidth="1.5" transform="rotate(-22 24 24)" />
      <circle cx="24" cy="24" r="9" fill="none" stroke={stroke} strokeWidth="2" />
      {missingMorning ? (
        <text x="24" y="29" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="800">
          !
        </text>
      ) : (
        <text x="24" y="29" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="700">
          ₽
        </text>
      )}
    </svg>
  );
};

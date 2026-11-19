import React, { useState } from 'react';
import { CheckCircle2, Circle, SkipForward, ChevronDown, ChevronUp } from 'lucide-react';
import { AuditedStepState, OnboardingStepId, StepDefinition } from './types';

interface OnboardingStepListProps {
  definitions: StepDefinition[];
  auditedSteps: AuditedStepState[];
  currentStepId: OnboardingStepId;
  onSelectStep: (stepId: OnboardingStepId) => void;
  isLightTheme: boolean;
}

export const OnboardingStepList: React.FC<OnboardingStepListProps> = ({
  definitions,
  auditedSteps,
  currentStepId,
  onSelectStep,
  isLightTheme,
}) => {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const statusMap = new Map<string, AuditedStepState>();
  for (const s of auditedSteps) {
    statusMap.set(s.id, s);
  }

  const currentDef = definitions.find((d) => d.id === currentStepId) || definitions[0];

  const renderStatusIcon = (status: string, active: boolean) => {
    if (status === 'completed') {
      return <CheckCircle2 size={17} className={isLightTheme ? 'text-amber-800 shrink-0' : 'text-[#F4EE8E] shrink-0'} />;
    }
    if (status === 'skipped') {
      return <SkipForward size={16} className={isLightTheme ? 'text-amber-700/80 shrink-0' : 'text-amber-300/80 shrink-0'} />;
    }
    return (
      <Circle
        size={16}
        className={
          active
            ? isLightTheme
              ? 'text-amber-950 shrink-0'
              : 'text-[#F4EE8E] shrink-0'
            : isLightTheme
            ? 'text-amber-900/45 shrink-0'
            : 'text-amber-200/45 shrink-0'
        }
      />
    );
  };

  return (
    <div className="w-full lg:w-[270px] shrink-0 min-w-0">
      {/* MOBILE: Vertical dropdown with wrapped step bubbles (NO horizontal scrolling) */}
      <div className="lg:hidden w-full min-w-0 mb-3">
        <button
          type="button"
          onClick={() => setMobileExpanded((prev) => !prev)}
          className={`w-full rounded-2xl border px-4 py-3 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
            isLightTheme
              ? 'border-amber-700/45 bg-[#FFFBF5]/85 text-amber-950'
              : 'border-[#E7C768]/45 bg-[#1A0F02]/65 text-[#F4EE8E]'
          }`}
        >
          <div className="min-w-0 flex items-center gap-2">
            {renderStatusIcon(statusMap.get(currentDef.id)?.status || 'pending', true)}
            <span className="text-sm font-bold break-words whitespace-normal">
              Шаг {currentDef.order} из {definitions.length}: {currentDef.shortTitle}
            </span>
          </div>
          {mobileExpanded ? <ChevronUp size={18} className="shrink-0" /> : <ChevronDown size={18} className="shrink-0" />}
        </button>

        {mobileExpanded && (
          <div
            className={`mt-2 rounded-2xl border p-2.5 flex flex-wrap gap-2 w-full min-w-0 ${
              isLightTheme
                ? 'border-amber-700/35 bg-[#FFFBF5]/90'
                : 'border-[#E7C768]/35 bg-[#1A0F02]/75'
            }`}
          >
            {definitions.map((def) => {
              const audit = statusMap.get(def.id);
              const status = audit?.status || 'pending';
              const isActive = def.id === currentStepId;
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => {
                    onSelectStep(def.id);
                    setMobileExpanded(false);
                  }}
                  className={`px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer max-w-full whitespace-normal break-words ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-400 shadow'
                      : status === 'completed'
                      ? isLightTheme
                        ? 'border-amber-700/45 bg-amber-100/75 text-amber-950'
                        : 'border-[#E7C768]/45 bg-[#E7C768]/15 text-[#F4EE8E]'
                      : isLightTheme
                      ? 'border-amber-700/25 bg-[#FFFBF5]/70 text-amber-950'
                      : 'border-[#E7C768]/25 bg-transparent text-amber-100/90'
                  }`}
                >
                  {renderStatusIcon(status, isActive)}
                  <span className="break-words">{def.order}. {def.shortTitle}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP: Vertical scrollable step navigation list */}
      <div
        className={`hidden lg:flex flex-col gap-1.5 pr-1 max-h-[62vh] overflow-y-auto scrollbar-none ${
          isLightTheme ? 'text-amber-950' : 'text-amber-100'
        }`}
      >
        {definitions.map((def) => {
          const audit = statusMap.get(def.id);
          const status = audit?.status || 'pending';
          const isActive = def.id === currentStepId;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => onSelectStep(def.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer flex items-start gap-2.5 min-w-0 ${
                isActive
                  ? isLightTheme
                    ? 'border-amber-700 bg-gradient-to-r from-[#F4EE8E]/60 via-[#E7C768]/45 to-transparent text-amber-950 shadow-sm'
                    : 'border-[#F4EE8E] bg-[#E7C768]/15 text-[#F4EE8E] shadow-[0_0_16px_rgba(244,238,142,0.2)]'
                  : isLightTheme
                  ? 'border-amber-700/25 bg-[#FFFBF5]/60 hover:bg-amber-100/60 text-amber-950'
                  : 'border-[#E7C768]/20 bg-transparent hover:bg-[#E7C768]/10 text-amber-100/90'
              }`}
            >
              <div className="pt-0.5">{renderStatusIcon(status, isActive)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-snug break-words">
                  {def.order}. {def.shortTitle}
                </div>
                <div className="text-sm opacity-75 leading-snug break-words mt-0.5">
                  {status === 'completed'
                    ? 'Готово'
                    : status === 'skipped'
                    ? 'Пропущено'
                    : 'Ожидает настройки'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

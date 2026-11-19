import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  SkipForward,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { OnboardingPayload, OnboardingStepId, StepDefinition } from './types';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { ProfileTelegramSteps } from './steps/ProfileTelegramSteps';
import { CompanyTeamSteps } from './steps/CompanyTeamSteps';
import { ScheduleReportSteps } from './steps/ScheduleReportSteps';
import { ProjectTaskSteps } from './steps/ProjectTaskSteps';
import { GrowthTestSteps } from './steps/GrowthTestSteps';

interface OnboardingStepContentProps {
  step: StepDefinition;
  definitions: StepDefinition[];
  data: OnboardingPayload;
  isLightTheme: boolean;
  onJumpToTab: (tabId: string) => void;
}

export const OnboardingStepContent: React.FC<OnboardingStepContentProps> = ({
  step,
  definitions,
  data,
  isLightTheme,
  onJumpToTab,
}) => {
  const {
    selectStep,
    skipStep,
    verifyStep,
    completeWizard,
    isVerifying,
    error,
    lastActionMessage,
    verificationByStep,
  } = useOnboardingStore();

  const userId = data.user_id;
  const currentIndex = definitions.findIndex((d) => d.id === step.id);
  const prevStep = currentIndex > 0 ? definitions[currentIndex - 1] : null;
  const nextStep = currentIndex >= 0 && currentIndex < definitions.length - 1 ? definitions[currentIndex + 1] : null;
  const auditedStep = data.steps.find((s) => s.id === step.id);
  const verifResult = verificationByStep[step.id];

  const renderStepBody = () => {
    if (step.id === 'profile' || step.id === 'telegram') {
      return <ProfileTelegramSteps step={step} data={data} isLightTheme={isLightTheme} onJumpToTab={onJumpToTab} />;
    }
    if (step.id === 'duties' || step.id === 'company' || step.id === 'employees') {
      return <CompanyTeamSteps step={step} data={data} isLightTheme={isLightTheme} onJumpToTab={onJumpToTab} />;
    }
    if (step.id === 'schedules' || step.id === 'schedule' || step.id === 'reports' || step.id === 'report_rules') {
      return <ScheduleReportSteps step={step} data={data} isLightTheme={isLightTheme} onJumpToTab={onJumpToTab} />;
    }
    if (step.id === 'projects' || step.id === 'tasks' || step.id === 'project_rules') {
      return <ProjectTaskSteps step={step} data={data} isLightTheme={isLightTheme} onJumpToTab={onJumpToTab} />;
    }
    return <GrowthTestSteps step={step} data={data} isLightTheme={isLightTheme} onJumpToTab={onJumpToTab} />;
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
      <div className="space-y-4 min-w-0">
        {/* Step Title Header */}
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
            isLightTheme
              ? 'border-amber-700/35 bg-[#FFFBF5]/85 text-amber-950'
              : 'border-[#E7C768]/35 bg-[#1A0F02]/55 text-white'
          }`}
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl border text-sm font-bold ${
                  auditedStep?.status === 'completed'
                    ? isLightTheme
                      ? 'border-amber-700 bg-amber-200/80 text-amber-950'
                      : 'border-[#F4EE8E] bg-[#E7C768]/20 text-[#F4EE8E]'
                    : isLightTheme
                    ? 'border-amber-700/40 bg-amber-100/50 text-amber-950'
                    : 'border-[#E7C768]/40 bg-transparent text-amber-200'
                }`}
              >
                Шаг {step.order} из {definitions.length}
              </span>
              {auditedStep?.summary && (
                <span className={`text-sm break-words ${isLightTheme ? 'text-amber-900' : 'text-amber-200/85'}`}>
                  {auditedStep.summary}
                </span>
              )}
            </div>
            <h3 className={`text-lg sm:text-xl font-black break-words ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
              {step.title}
            </h3>
            <p className={`text-sm leading-relaxed break-words ${isLightTheme ? 'text-amber-900' : 'text-amber-100/90'}`}>
              {step.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToTab(step.cabinetTab)}
            className={`px-3.5 py-2 rounded-xl border text-sm font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
              isLightTheme
                ? 'border-amber-800/45 text-amber-950 hover:bg-amber-200/50'
                : 'border-[#E7C768]/45 text-[#F4EE8E] hover:bg-amber-400/10'
            }`}
          >
            <ExternalLink size={15} />
            <span>Открыть раздел</span>
          </button>
        </div>

        {/* Status / Error Alerts */}
        {error && (
          <div
            className={`rounded-2xl border p-3.5 text-sm flex items-start gap-2.5 break-words bg-transparent ${
              isLightTheme
                ? 'border-red-700/70 text-red-950'
                : 'border-red-400/70 text-red-200'
            }`}
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        )}

        {lastActionMessage && (
          <div
            className={`rounded-2xl border p-3.5 text-sm flex items-start gap-2.5 break-words ${
              isLightTheme
                ? 'border-amber-700 bg-amber-100/90 text-amber-950'
                : 'border-[#F4EE8E]/60 bg-[#E7C768]/15 text-[#F4EE8E]'
            }`}
          >
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span className="font-bold break-words">{lastActionMessage}</span>
          </div>
        )}

        {/* Main Step Body */}
        {renderStepBody()}

        {/* Live Verification & Result Test Block */}
        <div
          className={`rounded-2xl border p-4 space-y-3 ${
            isLightTheme
              ? 'border-amber-700/35 bg-[#FFFBF5]/85 text-amber-950'
              : 'border-[#E7C768]/35 bg-[#1A0F02]/55 text-amber-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck size={17} />
              <span>Проверка выполнения и тест результата</span>
            </div>

            <button
              type="button"
              disabled={isVerifying}
              onClick={() => verifyStep(userId, step.id)}
              className={`px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 ${
                isLightTheme
                  ? 'border-amber-800/60 bg-amber-200/70 hover:bg-amber-300/70 text-amber-950'
                  : 'border-[#E7C768]/60 bg-[#E7C768]/15 hover:bg-[#E7C768]/25 text-[#F4EE8E]'
              }`}
            >
              {isVerifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              <span>{step.verifyLabel}</span>
            </button>
          </div>

          {verifResult && (
            <div
              className={`rounded-xl border p-3 space-y-2 text-sm bg-transparent ${
                verifResult.passed
                  ? isLightTheme
                    ? 'border-amber-700 bg-amber-100/40 text-amber-950'
                    : 'border-[#F4EE8E]/60 text-[#F4EE8E]'
                  : isLightTheme
                  ? 'border-red-700/70 text-red-950'
                  : 'border-red-400/70 text-red-200'
              }`}
            >
              <div className="font-bold break-words">{verifResult.output}</div>
              {verifResult.checks.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {verifResult.checks.map((c, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm break-words">
                      {c.ok ? (
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      )}
                      <span className="break-words">
                        <strong>{c.label}:</strong> {c.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div
        className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 ${
          isLightTheme ? 'border-amber-700/30' : 'border-[#E7C768]/25'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {prevStep && (
            <button
              type="button"
              onClick={() => selectStep(userId, prevStep.id)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isLightTheme
                  ? 'border-amber-700/45 text-amber-950 hover:bg-amber-100'
                  : 'border-[#E7C768]/35 text-amber-100 hover:bg-white/5'
              }`}
            >
              <ArrowLeft size={15} />
              <span>Назад</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => skipStep(userId, step.id, nextStep ? nextStep.id : undefined)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              isLightTheme
                ? 'border-amber-700/35 text-amber-900 hover:bg-amber-100/70'
                : 'border-[#E7C768]/30 text-amber-200/90 hover:bg-white/5'
            }`}
          >
            <SkipForward size={15} />
            <span>Пропустить шаг</span>
          </button>
        </div>

        {nextStep ? (
          <button
            type="button"
            onClick={() => selectStep(userId, nextStep.id as OnboardingStepId)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Следующий шаг</span>
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => completeWizard(userId)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Завершить вводный тур</span>
          </button>
        )}
      </div>
    </div>
  );
};

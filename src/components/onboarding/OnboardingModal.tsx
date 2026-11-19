import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Minimize2, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { DIRECTOR_STEPS, getTeamSteps } from './types';
import { OnboardingStepList } from './OnboardingStepList';
import { OnboardingStepContent } from './OnboardingStepContent';

interface OnboardingModalProps {
  userId?: string;
  theme: 'dark' | 'light';
  onNavigateTab: (tabId: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  userId,
  theme,
  onNavigateTab,
}) => {
  const {
    isOpen,
    isLoading,
    data,
    fetchOnboarding,
    selectStep,
    minimizeWizard,
    resetOnboarding,
  } = useOnboardingStore();

  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchOnboarding(userId, { autoOpenIfFresh: true });
    }
  }, [userId]);

  if (!isOpen || !userId) return null;

  const isLightTheme = theme === 'light';
  const isDirector = data?.onboarding_type === 'director';
  const isManager = data?.onboarding_type === 'manager';
  const definitions = isDirector ? DIRECTOR_STEPS : getTeamSteps(isManager);

  const currentStepDef =
    definitions.find((d) => d.id === data?.current_step_id) || definitions[0];

  const completedCount = data?.completed_count ?? 0;
  const totalCount = data?.total_count ?? definitions.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const roleBadgeLabel = isDirector
    ? 'Тур директора компании'
    : isManager
    ? 'Тур руководителя отдела'
    : 'Тур сотрудника';

  const handleJumpToTab = async (tabId: string) => {
    await minimizeWizard(userId);
    onNavigateTab(tabId);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-2.5 sm:p-5 bg-transparent backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Вводный тур настройки кабинета"
    >
      <div
        className={`w-full max-w-5xl max-h-[92vh] rounded-3xl border flex flex-col overflow-hidden transition-all ${
          isLightTheme
            ? 'border-amber-700/50 bg-[#FFFBF5]/92 text-amber-950 shadow-[0_16px_50px_rgba(180,120,30,0.22)]'
            : 'border-[#E7C768]/50 bg-[#140A01]/82 text-white shadow-[0_0_45px_rgba(244,238,142,0.28)]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-4 sm:px-6 py-4 border-b flex flex-col gap-3 ${
            isLightTheme ? 'border-amber-700/30' : 'border-[#E7C768]/30'
          }`}
        >
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                  isLightTheme
                    ? 'border-amber-700/50 bg-amber-200/70 text-amber-950'
                    : 'border-[#E7C768]/50 bg-[#E7C768]/15 text-[#F4EE8E]'
                }`}
              >
                <Sparkles size={20} />
              </div>
              <div className="min-w-0">
                <h2
                  className={`text-base sm:text-lg font-black leading-tight break-words ${
                    isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
                  }`}
                >
                  Мастер быстрого запуска: {roleBadgeLabel}
                </h2>
                <p className={`text-sm mt-0.5 break-words ${isLightTheme ? 'text-amber-900' : 'text-amber-100/85'}`}>
                  Настраивайте этапы в удобном порядке, голосом или текстом. Можно пропустить шаг и вернуться позже.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmReset((v) => !v)}
                className={`p-2 rounded-xl border text-sm cursor-pointer transition-all ${
                  isLightTheme
                    ? 'border-amber-700/40 text-amber-950 hover:bg-amber-200/60'
                    : 'border-[#E7C768]/35 text-amber-200 hover:bg-white/5'
                }`}
                title="Сбросить прогресс тура"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={() => minimizeWizard(userId)}
                className={`p-2 rounded-xl border text-sm cursor-pointer transition-all ${
                  isLightTheme
                    ? 'border-amber-700/40 text-amber-950 hover:bg-amber-200/60'
                    : 'border-[#E7C768]/35 text-amber-200 hover:bg-white/5'
                }`}
                title="Свернуть тур и продолжить позже"
              >
                <Minimize2 size={16} />
              </button>

              <button
                type="button"
                onClick={() => minimizeWizard(userId)}
                className={`p-2 rounded-xl border text-sm cursor-pointer transition-all ${
                  isLightTheme
                    ? 'border-amber-700/40 text-amber-950 hover:bg-amber-200/60'
                    : 'border-[#E7C768]/35 text-amber-200 hover:bg-white/5'
                }`}
                title="Закрыть окно"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Custom Reset Confirmation Bar (No window.confirm) */}
          {confirmReset && (
            <div
              className={`rounded-2xl border p-3 flex flex-wrap items-center justify-between gap-3 text-sm ${
                isLightTheme
                  ? 'border-amber-700/50 bg-amber-100/85 text-amber-950'
                  : 'border-[#E7C768]/50 bg-[#1A0F02]/75 text-amber-100'
              }`}
            >
              <span className="font-bold break-words">Сбросить отметки прохождения шагов вводного тура?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmReset(false);
                    await resetOnboarding(userId);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm cursor-pointer"
                >
                  Да, сбросить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className={`px-3.5 py-1.5 rounded-xl border text-sm font-bold cursor-pointer ${
                    isLightTheme ? 'border-amber-700/40 text-amber-950' : 'border-[#E7C768]/35 text-amber-100'
                  }`}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Готовность кабинета: {completedCount} из {totalCount}</span>
              <span>{progressPct}%</span>
            </div>
            <div
              className={`w-full h-2.5 rounded-full overflow-hidden border ${
                isLightTheme
                  ? 'border-amber-700/35 bg-amber-100/70'
                  : 'border-[#E7C768]/30 bg-[#1A0F02]/70'
              }`}
            >
              <div
                className="h-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading && !data ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-sm">
              <Loader2 size={28} className="animate-spin text-[#E7C768]" />
              <span>Загружаем персональный маршрут настройки...</span>
            </div>
          ) : data ? (
            <div className="flex flex-col lg:flex-row gap-5 items-start w-full min-w-0">
              <OnboardingStepList
                definitions={definitions}
                auditedSteps={data.steps}
                currentStepId={currentStepDef.id}
                onSelectStep={(stepId) => selectStep(userId, stepId)}
                isLightTheme={isLightTheme}
              />

              <OnboardingStepContent
                step={currentStepDef}
                definitions={definitions}
                data={data}
                isLightTheme={isLightTheme}
                onJumpToTab={handleJumpToTab}
              />
            </div>
          ) : (
            <div className="py-12 text-center text-sm">
              Не удалось загрузить данные вводного тура.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const OnboardingHeaderTrigger: React.FC<{
  userId?: string;
  theme: 'dark' | 'light';
  compact?: boolean;
}> = ({ userId, theme, compact = false }) => {
  const { data, restoreWizard } = useOnboardingStore();
  if (!userId) return null;

  const isLight = theme === 'light';
  const completed = data?.completed_count ?? 0;
  const total = data?.total_count ?? 0;
  const isDone = Boolean(data?.is_completed && total > 0 && completed >= total);

  return (
    <button
      type="button"
      onClick={() => restoreWizard(userId)}
      className={`px-3 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
        isLight
          ? 'border-amber-700/50 bg-amber-100/80 hover:bg-amber-200/80 text-amber-950'
          : 'border-[#E7C768]/50 bg-[#E7C768]/15 hover:bg-[#E7C768]/25 text-[#F4EE8E] shadow-[0_0_12px_rgba(244,238,142,0.2)]'
      }`}
      title="Открыть мастер быстрого запуска (онбординг)"
    >
      {isDone ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}
      <span>{compact ? (total > 0 ? `Тур ${completed}/${total}` : 'Тур') : total > 0 ? `Тур запуска (${completed}/${total})` : 'Тур запуска'}</span>
    </button>
  );
};

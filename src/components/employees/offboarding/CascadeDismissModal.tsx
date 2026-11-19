import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Loader2, Shield, X } from 'lucide-react';
import {
  OffboardingJob,
  OffboardingOptions,
  OffboardingPreflight,
  SuccessorCandidate,
  SuccessorMap,
} from './types';
import { StepPreflight } from './StepPreflight';
import { StepSuccessor } from './StepSuccessor';
import { StepConfirm, StepProgress } from './StepProgressAndConfirm';

interface CascadeDismissModalProps {
  isOpen: boolean;
  employee: any | null;
  currentUser: any | null;
  companyId: string;
  onClose: () => void;
  onCompleted: () => void;
}

export const CascadeDismissModal: React.FC<CascadeDismissModalProps> = ({
  isOpen,
  employee,
  currentUser,
  companyId,
  onClose,
  onCompleted,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loadingPreflight, setLoadingPreflight] = useState(false);
  const [preflight, setPreflight] = useState<OffboardingPreflight | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [transferMode, setTransferMode] = useState<'full_successor' | 'split_by_domain' | 'archive_only'>('full_successor');
  const [successorMap, setSuccessorMap] = useState<SuccessorMap>({});
  const [options, setOptions] = useState<OffboardingOptions>({
    transferOpenTasks: true,
    transferCompletedTasks: false,
    transferProjectsAndDepts: true,
    transferTemplatesAndPendingReports: true,
    transferSchedulesAndFiles: true,
    transferRoutingRules: true,
    transferReferrals: false,
    transferBalancesAndTariffs: false,
    replaceDirectorInCompany: false,
    syncCompanyContactFromSuccessor: false,
    generateAiHandoverBrief: true,
    notifyTelegram: true,
  });

  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<OffboardingJob | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Load preflight diagnostics when opened
  useEffect(() => {
    if (!isOpen || !employee?.id) return;
    setStep(1);
    setErrorMsg(null);
    setConfirmChecked(false);
    setActiveJob(null);
    setLoadingPreflight(true);

    const effCompId = employee.company_id || companyId || '';
    fetch(`/api/offboarding/preflight/${encodeURIComponent(employee.id)}?company_id=${encodeURIComponent(effCompId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.preflight) {
          setErrorMsg(data.error || 'Не удалось выполнить диагностику зависимостей');
          setPreflight(null);
          return;
        }
        const pf: OffboardingPreflight = data.preflight;
        setPreflight(pf);

        const defaultSucc = pf.eligible_successors[0]?.id || '';
        setSuccessorMap({
          primary: defaultSucc,
          tasks: defaultSucc,
          management: defaultSucc,
          directorFinance: defaultSucc,
          referrals: defaultSucc,
        });

        const isBoss = pf.target.is_boss;
        setTransferMode(isBoss ? 'full_successor' : 'full_successor');
        setOptions({
          transferOpenTasks: true,
          transferCompletedTasks: false,
          transferProjectsAndDepts: true,
          transferTemplatesAndPendingReports: true,
          transferSchedulesAndFiles: true,
          transferRoutingRules: true,
          transferReferrals: isBoss || pf.counts.referrals > 0,
          transferBalancesAndTariffs: isBoss,
          replaceDirectorInCompany: isBoss,
          syncCompanyContactFromSuccessor: false,
          generateAiHandoverBrief: true,
          notifyTelegram: true,
        });
      })
      .catch((err) => {
        setErrorMsg('Ошибка связи при диагностике: ' + err.message);
      })
      .finally(() => {
        setLoadingPreflight(false);
      });
  }, [isOpen, employee?.id, companyId]);

  // Poll running/pending/partial_retry job progress
  useEffect(() => {
    if (!isOpen || step !== 4 || !activeJob?.id) return;
    if (activeJob.status === 'completed' || activeJob.status === 'failed') return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/offboarding/jobs/${encodeURIComponent(activeJob.id)}`);
        const data = await res.json();
        if (data.success && data.job) {
          setActiveJob(data.job);
          if (data.job.status === 'completed') {
            onCompleted();
          }
        }
      } catch {
        // Ignore transient polling hiccups; background cron continues automatically
      }
    }, 900);

    return () => clearInterval(timer);
  }, [isOpen, step, activeJob?.id, activeJob?.status, onCompleted]);

  if (!isOpen || !employee || typeof document === 'undefined') return null;

  const handleSuccessorCreated = (candidate: SuccessorCandidate) => {
    if (!preflight) return;
    setPreflight({
      ...preflight,
      eligible_successors: [candidate, ...preflight.eligible_successors],
    });
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (preflight?.target.is_main_platform_owner) {
        setErrorMsg('Главного владельца платформы нельзя уволить.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (transferMode !== 'archive_only') {
        const hasAnySucc = Boolean(
          successorMap.primary ||
            successorMap.tasks ||
            successorMap.management ||
            successorMap.directorFinance
        );
        if (!hasAnySucc) {
          setErrorMsg('Выберите или создайте преемника для передачи дел.');
          return;
        }
        if (
          (preflight?.target.is_boss || options.replaceDirectorInCompany) &&
          !successorMap.directorFinance &&
          !successorMap.primary
        ) {
          setErrorMsg('Укажите преемника на роль нового директора и владельца балансов.');
          return;
        }
      }
      setStep(3);
    }
  };

  const handleStartOffboarding = async () => {
    if (!preflight) return;
    if (!confirmChecked) {
      setErrorMsg('Отметьте подтверждение перед запуском каскадного увольнения.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/offboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: preflight.target.id,
          initiatorUserId: currentUser?.id || '',
          companyId: preflight.target.company_id || companyId,
          transferMode,
          successorMap: transferMode === 'archive_only' ? {} : successorMap,
          options,
          runAsync: true,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.job) {
        setErrorMsg(data.error || 'Не удалось запустить каскадное увольнение');
      } else {
        setActiveJob(data.job);
        setStep(4);
        onCompleted();
      }
    } catch (err: any) {
      setErrorMsg('Ошибка соединения: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/offboarding/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.job) {
        setActiveJob(data.job);
      }
    } catch {
      // ignore
    } finally {
      setIsRetrying(false);
    }
  };

  const stepBubbles = [
    { num: 1, title: '1. Диагностика' },
    { num: 2, title: '2. Преемник и данные' },
    { num: 3, title: '3. Подтверждение' },
    { num: 4, title: '4. Передача дел' },
  ] as const;

  return createPortal(
    <div className="fixed inset-0 z-[9996] flex items-center justify-center p-3 sm:p-4 bg-[#140A01]/65 dark:bg-[#140A01]/70 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-amber-400/50 shadow-[0_0_35px_rgba(244,238,142,0.22)] bg-[#FFFBF5]/90 dark:bg-[#1A0F02]/88 backdrop-blur-xl text-amber-950 dark:text-[#F4EE8E] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-500/25 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base sm:text-lg font-black text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2 break-words">
              <Shield className="w-5 h-5 text-[#E7C768] shrink-0" />
              <span>Каскадное увольнение и передача дел</span>
            </h3>
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80 break-words">
              Безопасный перенос задач, проектов, отчетов, рефералов, балансов и прав компании
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile-friendly wrapped bubble steps (no horizontal scroll) */}
        <div className="px-4 sm:px-5 pt-3 pb-2 flex flex-wrap gap-2 border-b border-amber-500/15 shrink-0">
          {stepBubbles.map((b) => {
            const isActive = step === b.num;
            const isDone = step > b.num;
            return (
              <div
                key={b.num}
                className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                  isActive
                    ? 'border-[#E7C768] bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E]'
                    : isDone
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                      : 'border-amber-400/20 bg-transparent text-amber-800/70 dark:text-amber-300/60'
                }`}
              >
                {b.title}
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {loadingPreflight ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-amber-950 dark:text-[#F4EE8E]">
              <Loader2 className="w-7 h-7 animate-spin text-[#E7C768]" />
              <span>Анализируем задачи, проекты, балансы и связи сотрудника...</span>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3.5 rounded-2xl border border-orange-500/50 bg-orange-500/15 text-sm font-semibold text-amber-950 dark:text-[#F4EE8E] break-words">
                  {errorMsg}
                </div>
              )}

              {preflight && step === 1 && <StepPreflight preflight={preflight} />}
              {preflight && step === 2 && (
                <StepSuccessor
                  preflight={preflight}
                  transferMode={transferMode}
                  setTransferMode={setTransferMode}
                  successorMap={successorMap}
                  setSuccessorMap={setSuccessorMap}
                  options={options}
                  setOptions={setOptions}
                  onSuccessorCreated={handleSuccessorCreated}
                />
              )}
              {preflight && step === 3 && (
                <StepConfirm
                  preflight={preflight}
                  transferMode={transferMode}
                  successorMap={successorMap}
                  options={options}
                  confirmChecked={confirmChecked}
                  setConfirmChecked={setConfirmChecked}
                />
              )}
              {step === 4 && (
                <StepProgress
                  job={activeJob}
                  onRetryJob={handleRetryJob}
                  isRetrying={isRetrying}
                />
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-amber-500/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {step < 4 ? (
            <>
              <button
                type="button"
                onClick={step === 1 ? onClose : () => setStep((step - 1) as 1 | 2 | 3)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border border-amber-400/40 text-amber-950 dark:text-amber-200 hover:bg-amber-500/10 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {step > 1 && <ArrowLeft className="w-4 h-4" />}
                <span>{step === 1 ? 'Отмена' : 'Назад'}</span>
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  disabled={loadingPreflight || !preflight || preflight.target.is_main_platform_owner}
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-45 flex items-center gap-1.5"
                >
                  <span>Далее</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || !confirmChecked}
                  onClick={handleStartOffboarding}
                  className="px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-45 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? 'Запуск...' : 'Запустить каскадное увольнение'}</span>
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                {activeJob?.status === 'completed' ? 'Готово' : 'Свернуть в фон'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

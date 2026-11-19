import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SkipForward,
} from 'lucide-react';
import {
  OffboardingJob,
  OffboardingOptions,
  OffboardingPreflight,
  STAGE_LABELS,
  STAGE_ORDER,
  SuccessorMap,
  formatRoleRu,
} from './types';

interface StepConfirmProps {
  preflight: OffboardingPreflight;
  transferMode: 'full_successor' | 'split_by_domain' | 'archive_only';
  successorMap: SuccessorMap;
  options: OffboardingOptions;
  confirmChecked: boolean;
  setConfirmChecked: (v: boolean) => void;
}

export const StepConfirm: React.FC<StepConfirmProps> = ({
  preflight,
  transferMode,
  successorMap,
  options,
  confirmChecked,
  setConfirmChecked,
}) => {
  const { target, counts, balances, eligible_successors } = preflight;
  const findName = (id?: string) => {
    if (!id) return 'Не выбран';
    const found = eligible_successors.find((s) => s.id === id);
    return found ? `${found.name} (${formatRoleRu(found.role)})` : id;
  };

  const totalFunds =
    balances.payment_balance +
    balances.local_bonus +
    balances.referral_bonus +
    balances.welcome_bonus;

  return (
    <div className="space-y-4 text-sm">
      <div className="p-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 space-y-2.5">
        <div className="text-base font-black text-amber-950 dark:text-[#F4EE8E]">
          Сводка каскадной передачи дел
        </div>
        <div className="space-y-1.5 text-amber-950 dark:text-amber-100 leading-relaxed">
          <div>
            <strong>Увольняемый:</strong> {target.name} ({formatRoleRu(target.role)})
          </div>
          <div>
            <strong>Режим:</strong>{' '}
            {transferMode === 'archive_only'
              ? 'Только блокировка доступа и архив без переноса'
              : transferMode === 'split_by_domain'
                ? 'Раздельная передача по направлениям'
                : 'Передача одному преемнику'}
          </div>
          {transferMode !== 'archive_only' && (
            <div className="pt-1 space-y-1">
              <div>
                • <strong>Задачи ({counts.open_tasks}), смены и файлы:</strong>{' '}
                {findName(successorMap.tasks || successorMap.primary)}
              </div>
              <div>
                • <strong>Проекты ({counts.projects}), отделы ({counts.managed_departments}) и отчеты:</strong>{' '}
                {findName(successorMap.management || successorMap.primary)}
              </div>
              <div>
                • <strong>Балансы ({totalFunds.toLocaleString('ru-RU')} RR), тарифы и права директора:</strong>{' '}
                {findName(successorMap.directorFinance || successorMap.primary)}
              </div>
              {options.transferReferrals && (
                <div>
                  • <strong>Реферальная сеть ({counts.referrals}):</strong>{' '}
                  {findName(successorMap.referrals || successorMap.directorFinance || successorMap.primary)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 rounded-2xl border border-amber-400/45 bg-amber-500/10 cursor-pointer hover:bg-amber-500/15 transition-colors">
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(e) => setConfirmChecked(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[#D4AF37] cursor-pointer shrink-0"
        />
        <span className="text-sm font-semibold text-amber-950 dark:text-[#F4EE8E] leading-relaxed">
          Подтверждаю каскадное увольнение сотрудника «{target.name}» с немедленным закрытием доступа и передачей выбранных сведений в фоновом защищённом режиме.
        </span>
      </label>
    </div>
  );
};

interface StepProgressProps {
  job: OffboardingJob | null;
  onRetryJob: (jobId: string) => void;
  isRetrying: boolean;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  job,
  onRetryJob,
  isRetrying,
}) => {
  if (!job) {
    return (
      <div className="p-6 flex items-center justify-center gap-3 text-sm text-amber-950 dark:text-[#F4EE8E]">
        <Loader2 className="w-5 h-5 animate-spin text-[#E7C768]" />
        <span>Инициализация каскадного задания...</span>
      </div>
    );
  }

  const completedCount = STAGE_ORDER.filter(
    (k) => job.stages_state?.[k]?.status === 'completed' || job.stages_state?.[k]?.status === 'skipped'
  ).length;
  const pct = Math.round((completedCount / STAGE_ORDER.length) * 100);

  return (
    <div className="space-y-4 text-sm">
      <div className="p-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-black text-base text-amber-950 dark:text-[#F4EE8E]">
            {job.status === 'completed'
              ? 'Каскадная передача дел завершена'
              : job.status === 'partial_retry'
                ? 'Выполняется фоновое допрохождение'
                : job.status === 'failed'
                  ? 'Требуется повторный запуск этапа'
                  : 'Идет каскадное увольнение...'}
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-bold border border-amber-400/40 bg-amber-500/15 text-amber-950 dark:text-[#F4EE8E]">
            {completedCount} / {STAGE_ORDER.length} ({pct}%)
          </span>
        </div>

        {/* Gold progress bar */}
        <div className="w-full h-2.5 rounded-full bg-amber-500/15 border border-amber-400/30 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] transition-all duration-500"
            style={{ width: `${Math.max(8, pct)}%` }}
          />
        </div>

        {job.status !== 'completed' && (
          <div className="text-sm text-amber-900 dark:text-amber-200/85 leading-relaxed">
            Окно можно безопасно закрыть: задание зафиксировано в базе данных и при любом сетевом сбое автоматически продолжится в фоновой очереди сервера.
          </div>
        )}
      </div>

      {(job.status === 'partial_retry' || job.status === 'failed') && job.last_error && (
        <div className="p-4 rounded-2xl border border-orange-500/50 bg-orange-500/10 space-y-2.5">
          <div className="flex items-start gap-2.5 text-amber-950 dark:text-[#F4EE8E] font-semibold">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <div className="break-words">{job.last_error}</div>
              {job.next_retry_at && (
                <div className="text-sm opacity-85">
                  Автоматическая фоновая попытка ({job.attempts}/{job.max_attempts}) запланирована на{' '}
                  {new Date(job.next_retry_at).toLocaleTimeString('ru-RU')}.
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => onRetryJob(job.id)}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-amber-400/50 bg-amber-500/20 text-amber-950 dark:text-[#F4EE8E] hover:bg-amber-500/30 transition-colors cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Повторить сейчас</span>
          </button>
        </div>
      )}

      {/* Stage checklist */}
      <div className="space-y-2">
        {STAGE_ORDER.map((key, index) => {
          const st = job.stages_state?.[key] || { status: 'pending' };
          return (
            <div
              key={key}
              className="p-3 rounded-xl border border-amber-400/30 bg-amber-500/5 flex items-start gap-3"
            >
              <div className="mt-0.5 shrink-0">
                {st.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
                ) : st.status === 'running' ? (
                  <Loader2 className="w-5 h-5 text-[#E7C768] animate-spin" />
                ) : st.status === 'failed' ? (
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                ) : st.status === 'skipped' ? (
                  <SkipForward className="w-5 h-5 text-amber-700 dark:text-amber-300/60" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-700/60 dark:text-amber-300/50" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="font-bold text-amber-950 dark:text-[#F4EE8E] break-words">
                  {index + 1}. {STAGE_LABELS[key]}
                </div>
                {st.details && (
                  <div className="text-sm text-amber-900/85 dark:text-amber-100/85 break-words">
                    {st.details}
                  </div>
                )}
                {st.error && (
                  <div className="text-sm text-orange-700 dark:text-orange-300 break-words">
                    {st.error}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {job.handover_brief && (
        <div className="p-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 space-y-2">
          <div className="font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#E7C768] shrink-0" />
            <span>Сформированный пакет передачи дел</span>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm text-amber-950 dark:text-amber-100 leading-relaxed break-words">
            {job.handover_brief}
          </pre>
        </div>
      )}
    </div>
  );
};

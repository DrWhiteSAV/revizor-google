import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { OffboardingJob, STAGE_LABELS, STAGE_ORDER } from './offboarding/types';

interface OffboardingJobsPanelProps {
  companyId: string;
  refreshSignal?: number;
  onJobUpdated?: () => void;
}

export const OffboardingJobsPanel: React.FC<OffboardingJobsPanelProps> = ({
  companyId,
  refreshSignal = 0,
  onJobUpdated,
}) => {
  const [jobs, setJobs] = useState<OffboardingJob[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<OffboardingJob | null>(null);

  const loadJobs = async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/offboarding/jobs?company_id=${encodeURIComponent(companyId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    loadJobs();
  }, [companyId, refreshSignal]);

  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === 'pending' || j.status === 'running' || j.status === 'partial_retry'
    );
    if (!hasActive) return;
    const timer = setInterval(loadJobs, 2500);
    return () => clearInterval(timer);
  }, [jobs, companyId]);

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await fetch(`/api/offboarding/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST',
      });
      await loadJobs();
      onJobUpdated?.();
    } finally {
      setRetryingId(null);
    }
  };

  if (jobs.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-amber-400/40 bg-amber-500/5 space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-black text-base text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#E7C768] shrink-0" />
          <span>Журнал каскадных увольнений и фоновых передач</span>
        </div>
        <button
          type="button"
          onClick={loadJobs}
          className="px-3 py-1.5 rounded-xl border border-amber-400/35 text-sm font-bold text-amber-950 dark:text-[#F4EE8E] hover:bg-amber-500/15 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Обновить</span>
        </button>
      </div>

      <div className="space-y-2">
        {jobs.slice(0, 6).map((job) => {
          const doneCount = STAGE_ORDER.filter(
            (k) => job.stages_state?.[k]?.status === 'completed' || job.stages_state?.[k]?.status === 'skipped'
          ).length;
          const isWorking = job.status === 'pending' || job.status === 'running';
          const isRetry = job.status === 'partial_retry' || job.status === 'failed';

          return (
            <div
              key={job.id}
              className="p-3.5 rounded-2xl border border-amber-400/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {job.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
                  ) : isWorking ? (
                    <Loader2 className="w-5 h-5 text-[#E7C768] animate-spin" />
                  ) : isRetry ? (
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-amber-950 dark:text-[#F4EE8E] break-words">
                    {job.target_name || job.target_user_id} — этапов {doneCount}/{STAGE_ORDER.length}
                  </div>
                  <div className="text-sm text-amber-900/80 dark:text-amber-200/80 break-words">
                    {job.status === 'completed'
                      ? `Завершено ${job.completed_at ? new Date(job.completed_at).toLocaleString('ru-RU') : ''}`
                      : job.last_error
                        ? `Фоновый повтор: ${job.last_error}`
                        : `Текущий этап: ${job.current_stage ? STAGE_LABELS[job.current_stage] : 'В очереди'}`}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isRetry && (
                  <button
                    type="button"
                    disabled={retryingId === job.id}
                    onClick={() => handleRetry(job.id)}
                    className="px-3 py-1.5 rounded-xl text-sm font-bold border border-orange-500/50 bg-orange-500/15 text-amber-950 dark:text-[#F4EE8E] hover:bg-orange-500/25 transition-colors cursor-pointer"
                  >
                    {retryingId === job.id ? 'Повтор...' : 'Повторить'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedJob(job)}
                  className="px-3 py-1.5 rounded-xl text-sm font-bold border border-amber-400/40 bg-amber-500/10 text-amber-950 dark:text-[#F4EE8E] hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  Детали передачи
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedJob && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9996] flex items-center justify-center p-4 bg-[#140A01]/65 dark:bg-[#140A01]/70 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-amber-400/50 shadow-2xl bg-[#FFFBF5]/90 dark:bg-[#1A0F02]/88 backdrop-blur-xl text-amber-950 dark:text-[#F4EE8E] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-amber-500/25 flex items-center justify-between gap-2">
              <div className="font-black text-base break-words">
                Аудит передачи дел: {selectedJob.target_name}
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-xl hover:bg-amber-500/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 text-sm">
              {selectedJob.handover_brief && (
                <pre className="p-3.5 rounded-2xl border border-amber-400/35 bg-amber-500/10 whitespace-pre-wrap font-sans leading-relaxed break-words">
                  {selectedJob.handover_brief}
                </pre>
              )}
              <div className="space-y-2">
                {STAGE_ORDER.map((k, idx) => {
                  const st = selectedJob.stages_state?.[k];
                  return (
                    <div
                      key={k}
                      className="p-3 rounded-xl border border-amber-400/30 bg-amber-500/5 space-y-0.5"
                    >
                      <div className="font-bold">
                        {idx + 1}. {STAGE_LABELS[k]} — {st?.status || 'pending'}
                      </div>
                      {st?.details && <div className="opacity-85 break-words">{st.details}</div>}
                      {st?.error && (
                        <div className="text-orange-700 dark:text-orange-300 break-words">
                          {st.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

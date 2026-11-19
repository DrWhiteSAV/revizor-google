import React, { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, Calendar, Check, X, RefreshCw } from 'lucide-react';

interface DoctorInsightsSectionProps {
  companyId?: string;
  reviewerName?: string;
  isDark?: boolean;
  onOverviewLoaded?: (metrics: any) => void;
}

export const DoctorInsightsSection: React.FC<DoctorInsightsSectionProps> = ({
  companyId = '',
  reviewerName = 'Руководитель',
  isDark = true,
  onOverviewLoaded
}) => {
  const [insights, setInsights] = useState<any[]>([]);
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [riskTasks, setRiskTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [monitorSummary, setMonitorSummary] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const q = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
      const [ovRes, insRes] = await Promise.all([
        fetch(`/api/revisor/doctor/overview${q}`),
        fetch(`/api/revisor/insights${q}`)
      ]);
      const ovData = await ovRes.json();
      const insData = await insRes.json();

      if (ovData.success) {
        setShiftRequests(ovData.pendingShiftRequests || []);
        setRiskTasks(ovData.riskTasks || []);
        onOverviewLoaded?.(ovData.metrics);
      }
      if (insData.success) {
        setInsights(insData.insights || []);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleGenerateInsight = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/revisor/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: companyId || 'flagship-main' })
      });
      const data = await res.json();
      if (data.success && data.insight) {
        setInsights(prev => [data.insight, ...prev]);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRunMonitorNow = async () => {
    setGenerating(true);
    setMonitorSummary('');
    try {
      const res = await fetch('/api/revisor/monitor/run-now', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.summary) {
        const s = data.summary;
        setMonitorSummary(
          `Проверено задач: ${s.scanned}, отправлено чекинов: ${s.checkinsSent}, напоминаний: ${s.remindersSent}, эскалаций: ${s.escalationsSent}.`
        );
        await loadData();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleResolveShift = async (taskId: string, reqId: string, decision: 'approve' | 'reject') => {
    try {
      await fetch(`/api/tasks/${encodeURIComponent(taskId)}/shift-request/${encodeURIComponent(reqId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewerName })
      });
      await loadData();
    } catch {
      // ignore
    }
  };

  const panelCls = `p-4 sm:p-5 rounded-2xl border backdrop-blur-md space-y-3 ${
    isDark
      ? 'bg-[#1A0F02]/65 border-[#E7C768]/35 text-[#F4EE8E]'
      : 'bg-[#FAF6EC]/85 border-[#B8860B]/35 text-amber-950'
  }`;

  return (
    <div className="space-y-5 pt-2">
      {/* Control Strip */}
      <div className={panelCls}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles size={18} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
              <span>Автономный радар рисков и системные улучшения</span>
            </h3>
            <p className="text-sm opacity-80 mt-0.5">
              Согласование переносов сроков, задачи с высоким риском срыва и еженедельные выводы ИИ по узким местам.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRunMonitorNow}
              disabled={generating || loading}
              className="px-3.5 py-2 rounded-xl border border-amber-500/45 text-sm font-semibold hover:bg-amber-500/15 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Проверить задачи сейчас</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateInsight}
              disabled={generating || loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={15} />
              <span>{generating ? 'Анализ...' : 'Анализ процессов ИИ'}</span>
            </button>
          </div>
        </div>
        {monitorSummary && <div className="text-sm font-semibold">{monitorSummary}</div>}
      </div>

      {/* Pending Shift Requests */}
      {shiftRequests.length > 0 && (
        <div className={panelCls}>
          <div className="text-sm font-bold flex items-center gap-2">
            <Calendar size={16} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
            <span>Запросы на перенос срока ({shiftRequests.length})</span>
          </div>
          <div className="space-y-2.5">
            {shiftRequests.map((req) => (
              <div
                key={req.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'border-[#E7C768]/25 bg-[#140A01]/50' : 'border-[#B8860B]/25 bg-[#FFFBF5]/80'
                }`}
              >
                <div className="space-y-1 text-sm min-w-0">
                  <div className="font-bold truncate">
                    {req.task_title || `Задача ${req.task_id}`} — {req.requester_name || 'Сотрудник'}
                  </div>
                  <div className="tabular-nums opacity-90">
                    Срок: {String(req.current_deadline || '').slice(0, 10)} → {String(req.proposed_deadline || '').slice(0, 10)} (+{req.shift_days} дн.)
                  </div>
                  {req.reason && <div className="opacity-85">{req.reason}</div>}
                  {req.ai_workload_note && <div className="opacity-75">{req.ai_workload_note}</div>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResolveShift(req.task_id, req.id, 'approve')}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-sm font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={15} />
                    <span>Согласовать</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveShift(req.task_id, req.id, 'reject')}
                    className="px-3.5 py-2 rounded-xl border border-amber-500/40 text-sm font-semibold hover:bg-amber-500/15 flex items-center gap-1 cursor-pointer"
                  >
                    <X size={15} />
                    <span>Отклонить</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Risk Active Tasks */}
      {riskTasks.length > 0 && (
        <div className={panelCls}>
          <div className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle size={16} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
            <span>Задачи в зоне риска срыва ({riskTasks.length})</span>
          </div>
          <div className="space-y-2">
            {riskTasks.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-sm ${
                  isDark ? 'border-[#E7C768]/25 bg-[#140A01]/45' : 'border-[#B8860B]/25 bg-[#FFFBF5]/80'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">{t.title}</div>
                  <div className="opacity-80">
                    {t.executorName} · Срок: {String(t.deadLine || '—').slice(0, 10)} · Прогресс: {t.progressPercent}%
                  </div>
                </div>
                <div className="font-bold tabular-nums shrink-0">
                  Риск: {t.riskScore}/100
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Systemic Insights */}
      {insights.length > 0 && (
        <div className={panelCls}>
          <div className="text-sm font-bold">Рекомендации ИИ по улучшению процессов</div>
          {insights.slice(0, 2).map((ins) => (
            <div key={ins.id} className="space-y-2 pt-2 border-t border-amber-500/20 text-sm">
              <div className="opacity-75 tabular-nums">Срез от {ins.period_key}</div>
              <p className={`leading-relaxed ${isDark ? 'text-white' : 'text-zinc-900'}`}>{ins.summary}</p>
              {Array.isArray(ins.recommendations) && ins.recommendations.length > 0 && (
                <ul className="space-y-1">
                  {ins.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="leading-snug">• {rec}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

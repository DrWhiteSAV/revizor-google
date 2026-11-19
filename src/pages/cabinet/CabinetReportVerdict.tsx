import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Award, CheckCircle2, AlertTriangle, XCircle, 
  Calendar, Clock, User, Building2, Sparkles, FileText, 
  Image as ImageIcon, Mic, ExternalLink, Share2, Printer, 
  Check, MessageSquare, ChevronDown, ChevronRight, Shield
} from 'lucide-react';
import { SubmittedReport, UserProfile } from '../../types';

interface CabinetReportVerdictProps {
  reportId: string;
  currentUser: UserProfile | null;
  theme?: 'dark' | 'light';
  onNavigate?: (path: string) => void;
  reports?: SubmittedReport[];
}

export default function CabinetReportVerdict({
  reportId,
  currentUser,
  theme = 'dark',
  onNavigate,
  reports = []
}: CabinetReportVerdictProps) {
  const isDark = theme === 'dark';

  const [report, setReport] = useState<SubmittedReport | any | null>(() => {
    return reports.find(r => r.id === reportId) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!report);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [planState, setPlanState] = useState<any[]>([]);
  const [isPlanAccepted, setIsPlanAccepted] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isAcceptingEdits, setIsAcceptingEdits] = useState(false);
  const [editsAcceptedNotice, setEditsAcceptedNotice] = useState<string | null>(null);

  // Fetch report directly from PostgreSQL BD ProTalk backend
  useEffect(() => {
    if (!reportId) return;

    setIsLoading(true);
    fetch(`/api/reports/${encodeURIComponent(reportId)}`)
      .then(res => {
        if (!res.ok) throw new Error('Отчет не найден в базе данных');
        return res.json();
      })
      .then(data => {
        if (data.success && data.report) {
          setReport(data.report);
          const rawPlan = data.report.ai_plan || data.report.aiPlan;
          const parsedPlan = typeof rawPlan === 'string' ? JSON.parse(rawPlan) : (rawPlan || []);
          setPlanState(Array.isArray(parsedPlan) ? parsedPlan : []);
          setIsPlanAccepted(data.report.ai_plan_status === 'accepted' || data.report.aiPlanStatus === 'accepted');
        } else {
          // Fallback to reports prop
          const local = reports.find(r => r.id === reportId);
          if (local) {
            setReport(local);
            const rawPlan = local.ai_plan || local.aiPlan;
            const parsedPlan = typeof rawPlan === 'string' ? JSON.parse(rawPlan) : (rawPlan || []);
            setPlanState(Array.isArray(parsedPlan) ? parsedPlan : []);
          } else {
            setError('Не удалось загрузить данные отчета из базы данных PostgreSQL BD ProTalk');
          }
        }
      })
      .catch(err => {
        console.warn('Error fetching report from PostgreSQL BD ProTalk:', err);
        const local = reports.find(r => r.id === reportId);
        if (local) {
          setReport(local);
          const rawPlan = local.ai_plan || local.aiPlan;
          const parsedPlan = typeof rawPlan === 'string' ? JSON.parse(rawPlan) : (rawPlan || []);
          setPlanState(Array.isArray(parsedPlan) ? parsedPlan : []);
        } else {
          setError('Отчет не найден в базе данных');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reportId]);

  const handleCopyLink = () => {
    const url = window.location.origin + `/cabinet/raport/verdict/${reportId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAcceptPlan = async () => {
    if (!report) return;
    setIsUpdatingPlan(true);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(report.id)}/plan-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'accepted',
          ai_plan: planState
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsPlanAccepted(true);
      }
    } catch (e) {
      console.warn('Error accepting plan:', e);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleTogglePlanItem = async (index: number) => {
    const updated = planState.map((p, idx) => {
      if (idx === index) {
        return { ...p, completed: !p.completed };
      }
      return p;
    });
    setPlanState(updated);

    if (report) {
      try {
        await fetch(`/api/reports/${encodeURIComponent(report.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ai_plan: updated
          })
        });
      } catch (e) {
        console.warn('Failed to update plan item:', e);
      }
    }
  };

  const handleAcceptEdits = async () => {
    if (!report) return;
    setIsAcceptingEdits(true);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(report.id)}/accept-edits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: currentUser?.id || report.employeeId,
          employeeName: currentUser?.name || report.employeeName
        })
      });
      const data = await res.json();
      if (data.success) {
        setReport((prev: any) => ({
          ...prev,
          manager_edits_accepted: 1,
          manager_edits_accepted_at: new Date().toISOString()
        }));
        setEditsAcceptedNotice('Правки и поручения руководителя успешно приняты в работу!');
      }
    } catch (e) {
      console.warn('Error accepting manager edits:', e);
    } finally {
      setIsAcceptingEdits(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-[500px] flex flex-col items-center justify-center p-8 rounded-3xl border ${
        isDark ? 'bg-[#1A0F02]/80 border-amber-400/40 text-amber-200' : 'bg-white border-amber-900/20 text-amber-950'
      }`}>
        <Sparkles size={36} className="text-[#E7C768] animate-spin mb-4" />
        <p className="text-sm font-semibold">Загрузка вердикта отчета из базы данных PostgreSQL BD ProTalk...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={`min-h-[400px] flex flex-col items-center justify-center p-8 rounded-3xl border text-center space-y-4 ${
        isDark ? 'bg-[#1A0F02]/80 border-amber-400/40 text-amber-100' : 'bg-white border-amber-900/20 text-amber-950'
      }`}>
        <AlertTriangle size={40} className="text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-[#F4EE8E]">Отчет не найден</h3>
        <p className="text-sm text-stone-300 max-w-md">{error || 'Указанный отчет не существует или был удален из базы данных.'}</p>
        <button
          onClick={() => onNavigate ? onNavigate('/cabinet/raport/calendar') : window.history.back()}
          className="px-5 py-2.5 rounded-xl border border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Вернуться в календарь сдач
        </button>
      </div>
    );
  }

  // Parse parsed fields
  let answersObj: Record<string, any> = {};
  if (typeof report.answers === 'string') {
    try { answersObj = JSON.parse(report.answers); } catch (e) {}
  } else if (report.answers) {
    answersObj = report.answers;
  }

  let verdictData: any = null;
  if (typeof report.ai_verdict === 'string') {
    try { verdictData = JSON.parse(report.ai_verdict); } catch (e) {}
  } else if (report.ai_verdict) {
    verdictData = report.ai_verdict;
  }

  let fieldEvaluations: any[] = [];
  if (typeof report.field_evaluations === 'string') {
    try { fieldEvaluations = JSON.parse(report.field_evaluations); } catch (e) {}
  } else if (Array.isArray(report.field_evaluations)) {
    fieldEvaluations = report.field_evaluations;
  } else if (verdictData?.fieldEvaluations) {
    fieldEvaluations = verdictData.fieldEvaluations;
  }

  const score = report.qualityScore !== undefined ? report.qualityScore : (verdictData?.score || 85);
  const statusColor = report.statusColor || verdictData?.statusColor || (score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red');

  const statusBadgeStyle = 
    statusColor === 'green' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
    statusColor === 'yellow' ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' :
    'bg-rose-500/20 border-rose-500/40 text-rose-300';

  const statusText = 
    statusColor === 'green' ? 'Отличный результат (Норматив выполнен)' :
    statusColor === 'yellow' ? 'Требуется внимание (Есть замечания)' :
    'Критический уровень (План не выполнен)';

  const formattedDate = new Date(report.timestamp || report.created_at || Date.now()).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans" id="report-verdict-page">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => onNavigate ? onNavigate('/cabinet/raport/calendar') : window.history.back()}
          className={`px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            isDark 
              ? 'border-amber-400/40 bg-[#1A0F02] text-[#F4EE8E] hover:bg-amber-400/10' 
              : 'border-amber-900/30 bg-amber-50 text-amber-950 hover:bg-amber-100'
          }`}
        >
          <ArrowLeft size={16} />
          Назад в календарь сдач
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyLink}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark 
                ? 'border-amber-400/40 bg-amber-400/10 text-[#F4EE8E] hover:bg-amber-400/20' 
                : 'border-amber-900/30 bg-amber-100 text-amber-950 hover:bg-amber-200'
            }`}
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copiedLink ? 'Ссылка скопирована' : 'Поделиться'}
          </button>

          <button
            onClick={() => window.print()}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark 
                ? 'border-white/10 bg-white/5 text-stone-200 hover:bg-white/10' 
                : 'border-stone-300 bg-stone-100 text-stone-900 hover:bg-stone-200'
            }`}
          >
            <Printer size={14} />
            Печать
          </button>
        </div>
      </div>

      {/* Main Verdict Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-md relative overflow-hidden space-y-6 ${
        isDark 
          ? 'bg-[#1A0F02]/85 border-amber-400/50 shadow-[0_0_30px_rgba(244,238,142,0.15)] text-stone-100' 
          : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950 shadow-md'
      }`}>
        
        {/* Header Information */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border ${statusBadgeStyle}`}>
                {score}/100 баллов
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl border border-amber-400/30 bg-amber-400/10 text-[#F4EE8E]">
                {statusText}
              </span>
            </div>

            <h2 className={`text-xl sm:text-2xl font-bold font-sans ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              Вердикт проверки: {report.templateTitle || 'Рабочий рапорт'}
            </h2>

            <div className="flex flex-wrap gap-4 text-xs text-stone-300">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-[#E7C768]" />
                {report.employeeName}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 size={14} className="text-[#E7C768]" />
                {report.departmentName || 'Главный отдел'}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#E7C768]" />
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Big Score Visual Circle */}
          <div className="flex items-center gap-4 self-start lg:self-center shrink-0">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg ${
              statusColor === 'green' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300' :
              statusColor === 'yellow' ? 'border-amber-400 bg-amber-500/10 text-amber-300' :
              'border-rose-400 bg-rose-500/10 text-rose-300'
            }`}>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono leading-none">{score}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">из 100</span>
            </div>
          </div>
        </div>

        {/* AI Motivation & Encouragement */}
        {(report.ai_motivation || report.aiMotivation || verdictData?.aiMotivation) && (
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            isDark 
              ? 'bg-[#140A01] border-amber-400/40 text-amber-100 shadow-[0_0_15px_rgba(244,238,142,0.1)]' 
              : 'bg-amber-50/70 border-amber-900/20 text-amber-950'
          }`}>
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#F4EE8E]">
              <Sparkles size={16} className="text-[#E7C768] animate-pulse" />
              <span>Мотивация и поддержка сотрудника</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-200">
              {report.ai_motivation || report.aiMotivation || verdictData?.aiMotivation}
            </p>
          </div>
        )}

        {/* Executive Summary for Director */}
        {(report.aiSummary || verdictData?.aiSummary) && (
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            isDark 
              ? 'bg-amber-950/20 border-amber-400/30 text-amber-100' 
              : 'bg-amber-100/50 border-amber-900/20 text-amber-950'
          }`}>
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#F4EE8E]">
              <Shield size={16} className="text-[#E7C768]" />
              <span>Краткое резюме для руководителя</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-200">
              {report.aiSummary || verdictData?.aiSummary}
            </p>
          </div>
        )}

        {/* Recommendations */}
        {(report.aiRecommendations || verdictData?.aiRecommendations) && (
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            isDark 
              ? 'bg-stone-900/40 border-stone-700/40 text-stone-200' 
              : 'bg-stone-100/80 border-stone-300 text-stone-900'
          }`}>
            <h4 className="text-sm font-bold text-[#F4EE8E] mb-2 flex items-center gap-2">
              <Award size={16} className="text-[#E7C768]" />
              <span>Персональные рекомендации</span>
            </h4>
            <p className="text-sm leading-relaxed text-stone-300">
              {report.aiRecommendations || verdictData?.aiRecommendations}
            </p>
          </div>
        )}

        {/* Manager Review & Feedback Section */}
        {(report.isReviewedByManager || report.reviewedAt || report.managerComment || report.managerTask) && (
          <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md space-y-4 ${
            isDark 
              ? 'bg-[#1A0F02]/90 border-amber-400/50 shadow-[0_0_25px_rgba(244,238,142,0.15)] text-stone-200' 
              : 'bg-amber-50/90 border-amber-900/30 text-amber-950 shadow-sm'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-400/20">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300">
                  <Shield size={20} />
                </span>
                <div>
                  <h4 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                    <span>Рецензия руководителя</span>
                    {report.managerReaction && (
                      <span className="text-sm px-2.5 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/30 text-amber-200">
                        {report.managerReaction}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-stone-400">
                    Проверил: <span className="font-semibold text-amber-300">{report.reviewed_by_name || report.reviewer_name || 'Руководитель'}</span>
                    {report.reviewedAt && ` • ${new Date(report.reviewedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {report.review_score !== undefined && (
                  <div className="px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-200 text-sm font-mono font-bold">
                    Оценка: {report.review_score}/100
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate(`/cabinet/raport/review/${report.id}`) : window.location.assign(`/cabinet/raport/review/${report.id}`)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDark 
                      ? 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10' 
                      : 'border-amber-900/30 text-amber-950 hover:bg-amber-100'
                  }`}
                >
                  <ExternalLink size={14} />
                  <span>Открыть форму проверки</span>
                </button>
              </div>
            </div>

            {report.managerComment && (
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  <span>Комментарий руководителя к отчету:</span>
                </span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-xl bg-black/20 border border-amber-400/20 text-stone-200">
                  {report.managerComment}
                </p>
              </div>
            )}

            {report.managerTask && (
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                  <Award size={14} />
                  <span>Поручения и задачи на следующую смену:</span>
                </span>
                <p className="text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-xl bg-black/20 border border-amber-400/20 text-stone-200">
                  {report.managerTask}
                </p>
              </div>
            )}

            {/* Accept Edits Status and Action */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {report.manager_edits_accepted ? (
                <div className="flex items-center gap-2 text-sm text-[#F4EE8E] bg-amber-400/15 border border-amber-400/40 rounded-xl px-3.5 py-2 font-semibold">
                  <Check size={18} className="text-amber-300 shrink-0" />
                  <span>Правки и поручения руководителя приняты сотрудником в работу</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isAcceptingEdits}
                  onClick={handleAcceptEdits}
                  className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                    isDark 
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-[0_0_20px_rgba(244,238,142,0.25)] hover:brightness-110' 
                      : 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500'
                  }`}
                >
                  <Check size={16} />
                  <span>{isAcceptingEdits ? 'Сохранение...' : 'Принять правки руководителя'}</span>
                </button>
              )}

              {editsAcceptedNotice && (
                <span className="text-xs text-amber-300 font-medium">
                  {editsAcceptedNotice}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Detailed Field-by-Field Check against Individual Prompts */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              <CheckCircle2 size={18} className="text-[#E7C768]" />
              <span>Проверка каждого поля по индивидуальным промптам</span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">
              {fieldEvaluations.length > 0 ? `${fieldEvaluations.length} проверенных пунктов` : 'Показатели отчета'}
            </span>
          </div>

          {fieldEvaluations.length > 0 ? (
            <div className="grid grid-cols-1 gap-3.5">
              {fieldEvaluations.map((item, idx) => {
                const itemScore = item.score !== undefined ? item.score : 90;
                const itemStatus = item.status || (itemScore >= 80 ? 'passed' : itemScore >= 50 ? 'warning' : 'failed');
                const fieldAnswer = answersObj[item.fieldId] || answersObj[item.field_id] || '';

                let statusBadge = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
                let statusLabel = 'Соответствует';
                if (itemStatus === 'warning') {
                  statusBadge = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
                  statusLabel = 'Замечание';
                } else if (itemStatus === 'failed') {
                  statusBadge = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
                  statusLabel = 'Не соответствует';
                }

                return (
                  <div 
                    key={item.fieldId || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDark 
                        ? 'bg-[#140A01] border-amber-400/30 hover:border-amber-400/50' 
                        : 'bg-white border-amber-900/20 hover:border-amber-900/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">#{idx + 1}</span>
                        <h4 className="text-sm font-bold text-white">{item.fieldLabel || item.field_label || `Поле ${idx + 1}`}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${statusBadge}`}>
                          {statusLabel}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-200">
                          {itemScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Individual Prompt from Settings/DB if present */}
                    {item.prompt_applied && (
                      <div className="text-[11px] font-mono text-amber-300/80 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2.5 py-1 mb-2">
                        ⚡ Критерий ИИ: {item.prompt_applied}
                      </div>
                    )}

                    {/* Employee Answer Preview */}
                    {fieldAnswer && (
                      <div className="text-xs text-stone-300 bg-white/5 border border-white/10 rounded-xl p-2.5 mb-2">
                        <span className="text-[10px] text-stone-400 block font-bold uppercase mb-1">Ответ сотрудника:</span>
                        {typeof fieldAnswer === 'object' ? JSON.stringify(fieldAnswer) : String(fieldAnswer)}
                      </div>
                    )}

                    {/* AI Feedback */}
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {item.feedback || item.comment || 'Требования к заполнению соблюдены.'}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-stone-300">
              Показатели проверены в общем комплексе отчета. Индивидуальные замечания отсутствуют.
            </div>
          )}
        </div>

        {/* Action Plan generated by AI */}
        {planState.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                  <Award size={18} className="text-[#E7C768]" />
                  <span>Персональный план действий на следующую смену</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Сформирован нейросетью на основе выявленных отклонений и целевых нормативов
                </p>
              </div>

              {!isPlanAccepted ? (
                <button
                  onClick={handleAcceptPlan}
                  disabled={isUpdatingPlan}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-stone-950 font-bold text-xs hover:brightness-105 transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Check size={14} />
                  {isUpdatingPlan ? 'Сохранение...' : 'Принять план в работу'}
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <Check size={14} />
                  План принят в работу
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {planState.map((planItem, pIdx) => {
                const isDone = planItem.completed;
                const priorityBadge = 
                  planItem.priority === 'high' ? 'border-rose-500/40 bg-rose-500/20 text-rose-300' :
                  planItem.priority === 'medium' ? 'border-amber-500/40 bg-amber-500/20 text-amber-300' :
                  'border-stone-500/40 bg-stone-500/20 text-stone-300';

                return (
                  <div 
                    key={planItem.id || pIdx}
                    onClick={() => handleTogglePlanItem(pIdx)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isDone 
                        ? 'opacity-60 bg-emerald-950/20 border-emerald-500/30' 
                        : isDark ? 'bg-[#140A01] border-amber-400/30 hover:border-amber-400/50' : 'bg-white border-amber-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isDone ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-amber-400/50'
                      }`}>
                        {isDone && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className={`text-sm ${isDone ? 'line-through text-stone-400' : 'text-stone-200'}`}>
                        {planItem.title || planItem.task}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {planItem.date && (
                        <span className="text-[11px] text-stone-400 font-mono">
                          {planItem.date}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${priorityBadge}`}>
                        {planItem.priority || 'normal'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

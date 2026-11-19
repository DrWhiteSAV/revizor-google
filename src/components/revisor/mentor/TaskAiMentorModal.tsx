import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Sparkles, HelpCircle, CheckSquare, Clock,
  ListChecks, Send, ThumbsUp, ThumbsDown, AlertTriangle, Calendar
} from 'lucide-react';
import { TaskTimelinePanel, TaskTimelineItem, TaskShiftRequestItem } from './TaskTimelinePanel';

export type MentorModalTab = 'help' | 'preflight' | 'decompose' | 'checkin' | 'timeline';

interface TaskAiMentorModalProps {
  isOpen: boolean;
  initialTab?: MentorModalTab;
  onClose: () => void;
  task: {
    id: string;
    taskTitle: string;
    description?: string;
    checkCriteria?: string;
    checklist?: Array<{ id: string; text: string; done: boolean }>;
  };
  answers: Record<string, any>;
  currentUser?: any;
  isDark?: boolean;
  onChecklistUpdated?: (newChecklist: Array<{ id: string; text: string; done: boolean }>) => void;
  onTimelineChanged?: () => void;
}

const BLOCKER_REASONS: Array<{ id: string; label: string }> = [
  { id: 'waiting_data', label: 'Не хватает входных данных' },
  { id: 'unclear_criteria', label: 'Неясны критерии приемки' },
  { id: 'technical_blocker', label: 'Техническое препятствие' },
  { id: 'overload', label: 'Высокая загрузка' }
];

const NAV_TABS: Array<{ id: MentorModalTab; label: string }> = [
  { id: 'help', label: 'Помощь ИИ' },
  { id: 'preflight', label: 'Черновик (без оценки)' },
  { id: 'decompose', label: 'Разбить на шаги' },
  { id: 'checkin', label: 'Чек-ин и сдвиг' },
  { id: 'timeline', label: 'Лента и советы' }
];

export const TaskAiMentorModal: React.FC<TaskAiMentorModalProps> = ({
  isOpen,
  initialTab = 'help',
  onClose,
  task,
  answers,
  currentUser,
  isDark = true,
  onChecklistUpdated,
  onTimelineChanged
}) => {
  const [activeTab, setActiveTab] = useState<MentorModalTab>(initialTab);
  const [loading, setLoading] = useState(false);

  // Help tab state
  const [blockerType, setBlockerType] = useState('waiting_data');
  const [question, setQuestion] = useState('');
  const [helpResult, setHelpResult] = useState<any>(null);
  const [helpVote, setHelpVote] = useState<number>(0);

  // Preflight tab state
  const [preflightResult, setPreflightResult] = useState<any>(null);

  // Decompose tab state
  const [decomposeSteps, setDecomposeSteps] = useState<Array<{ title: string; hint?: string }>>([]);
  const [decomposeNotice, setDecomposeNotice] = useState('');

  // Check-in & shift tab state
  const [progressVal, setProgressVal] = useState<number>(35);
  const [checkinNote, setCheckinNote] = useState('');
  const [checkinSavedMsg, setCheckinSavedMsg] = useState('');
  const [shiftDays, setShiftDays] = useState<number>(1);
  const [shiftReason, setShiftReason] = useState('');
  const [shiftFeedback, setShiftFeedback] = useState('');

  // Timeline state
  const [interactions, setInteractions] = useState<TaskTimelineItem[]>([]);
  const [shiftRequests, setShiftRequests] = useState<TaskShiftRequestItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadTimeline();
    }
  }, [isOpen, initialTab, task.id]);

  const loadTimeline = async () => {
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/timeline`);
      const data = await res.json();
      if (data.success) {
        setInteractions(data.interactions || []);
        setShiftRequests(data.shiftRequests || []);
        if (typeof data.progressPercent === 'number') {
          setProgressVal(data.progressPercent);
        }
      }
    } catch {
      // ignore offline transient error
    }
  };

  if (!isOpen) return null;

  const surfaceCls = isDark
    ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_40px_rgba(244,238,142,0.2)]'
    : 'bg-[#FFFBF5]/90 border-[#B8860B]/45 text-amber-950 shadow-2xl';

  const blockCls = isDark
    ? 'bg-[#140A01]/65 border-[#E7C768]/30 text-[#F4EE8E]'
    : 'bg-[#FAF6EC]/80 border-[#B8860B]/30 text-amber-950';

  const inputCls = isDark
    ? 'bg-transparent border-[#E7C768]/40 text-[#F4EE8E] placeholder:text-[#E7C768]/50 focus:border-[#F4EE8E]'
    : 'bg-[#FFFBF5]/85 border-[#B8860B]/40 text-amber-950 placeholder:text-amber-900/50 focus:border-[#B8860B]';

  const handleRequestHelp = async () => {
    setLoading(true);
    setHelpVote(0);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/ai-help`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockerType,
          question,
          answers,
          userId: currentUser?.id,
          userName: currentUser?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setHelpResult(data);
        await loadTimeline();
        onTimelineChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVoteInteraction = async (interactionId: string, vote: 1 | -1) => {
    try {
      await fetch(`/api/tasks/${encodeURIComponent(task.id)}/interactions/${encodeURIComponent(interactionId)}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote })
      });
      if (helpResult?.interactionId === interactionId) setHelpVote(vote);
      await loadTimeline();
    } catch {
      // ignore
    }
  };

  const handleRunPreflight = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/preflight-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          checklist: task.checklist || [],
          userId: currentUser?.id,
          userName: currentUser?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setPreflightResult(data);
        await loadTimeline();
        onTimelineChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDecompose = async (applyToChecklist: boolean) => {
    setLoading(true);
    setDecomposeNotice('');
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/ai-decompose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applyToChecklist,
          userId: currentUser?.id,
          userName: currentUser?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setDecomposeSteps(data.steps || []);
        if (applyToChecklist && Array.isArray(data.checklist)) {
          onChecklistUpdated?.(data.checklist);
          setDecomposeNotice('Шаги добавлены в чек-лист задачи.');
        }
        await loadTimeline();
        onTimelineChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCheckin = async () => {
    setLoading(true);
    setCheckinSavedMsg('');
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressPercent: progressVal,
          note: checkinNote,
          userId: currentUser?.id,
          userName: currentUser?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setCheckinSavedMsg(`Прогресс ${data.progressPercent}% сохранен.`);
        setCheckinNote('');
        await loadTimeline();
        onTimelineChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestShift = async () => {
    setLoading(true);
    setShiftFeedback('');
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/shift-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftDays,
          reason: shiftReason || 'Требуется уточнение/время на выполнение',
          userId: currentUser?.id,
          userName: currentUser?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setShiftFeedback(`Запрос отправлен руководителю. Предложенная дата: ${data.proposedDeadline}. ${data.workloadNote || ''}`);
        setShiftReason('');
        await loadTimeline();
        onTimelineChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm font-sans ${
      isDark ? 'bg-[#140A01]/45' : 'bg-[#FAF6EC]/45'
    }`}>
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border p-4 sm:p-6 space-y-4 backdrop-blur-xl transition-colors ${surfaceCls}`}>
        {/* Header */}
        <div className={`flex items-start justify-between gap-3 border-b pb-3 ${
          isDark ? 'border-[#E7C768]/25' : 'border-[#B8860B]/25'
        }`}>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Sparkles size={20} className={isDark ? 'text-[#E7C768]' : 'text-[#B8860B]'} />
              <span className="truncate">Помощник ИИ-Ревизора</span>
            </h3>
            <p className="text-sm opacity-80 truncate mt-0.5">{task.taskTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-amber-500/35 hover:bg-amber-500/15 cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Bubbles (flex-wrap, NO horizontal scrolling on mobile) */}
        <div className="flex flex-wrap gap-2">
          {NAV_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-transparent'
                    : (isDark
                        ? 'border-[#E7C768]/30 text-[#F4EE8E] hover:bg-[#E7C768]/10'
                        : 'border-[#B8860B]/35 text-amber-950 hover:bg-[#B8860B]/10')
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: STUCK / AI HELP */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${blockCls}`}>
              <div className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle size={16} />
                <span>Что именно вызывает затруднение?</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {BLOCKER_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setBlockerType(r.id)}
                    className={`px-3 py-1.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                      blockerType === r.id
                        ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 border-transparent'
                        : (isDark ? 'border-[#E7C768]/30 hover:bg-[#E7C768]/10' : 'border-[#B8860B]/30 hover:bg-[#B8860B]/10')
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Опишите своими словами, на чем остановились или какие данные нужны..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${inputCls}`}
              />

              <button
                type="button"
                onClick={handleRequestHelp}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>{loading ? 'ИИ анализирует контекст задачи...' : 'Получить совет и план от ИИ'}</span>
              </button>
            </div>

            {helpResult && (
              <div className={`p-4 rounded-2xl border space-y-3 ${blockCls}`}>
                <div className="text-sm font-bold">Рекомендация ИИ-Ревизора</div>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {helpResult.advice}
                </p>

                {Array.isArray(helpResult.actionSteps) && helpResult.actionSteps.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-sm font-semibold">Пошаговый план действий:</div>
                    <ul className="space-y-1 text-sm">
                      {helpResult.actionSteps.map((st: string, i: number) => (
                        <li key={i} className="leading-snug">
                          {i + 1}. {st}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {helpResult.readyTemplate && (
                  <div className={`p-3 rounded-xl border text-sm space-y-1 ${
                    isDark ? 'border-[#E7C768]/25 bg-[#1A0F02]/50' : 'border-[#B8860B]/25 bg-[#FFFBF5]/85'
                  }`}>
                    <div className="font-semibold">Готовый шаблон / пример:</div>
                    <p className="opacity-90 whitespace-pre-wrap">{helpResult.readyTemplate}</p>
                  </div>
                )}

                {helpResult.questionForManager && (
                  <div className={`p-3 rounded-xl border text-sm space-y-1 ${
                    isDark ? 'border-[#E7C768]/25 bg-[#1A0F02]/50' : 'border-[#B8860B]/25 bg-[#FFFBF5]/85'
                  }`}>
                    <div className="font-semibold">Что уточнить у руководителя:</div>
                    <p className="opacity-90">{helpResult.questionForManager}</p>
                  </div>
                )}

                {Array.isArray(helpResult.referenceExamples) && helpResult.referenceExamples.length > 0 && (
                  <div className="space-y-1 pt-1 text-sm">
                    <div className="font-semibold">Удачные аналоги из опыта компании:</div>
                    {helpResult.referenceExamples.map((ex: string, idx: number) => (
                      <div key={idx} className="opacity-85 leading-snug">{ex}</div>
                    ))}
                  </div>
                )}

                {helpResult.interactionId && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20 text-sm">
                    <span className="opacity-80">Совет помог?</span>
                    <button
                      type="button"
                      onClick={() => handleVoteInteraction(helpResult.interactionId, 1)}
                      className={`px-3 py-1 rounded-lg border text-sm font-semibold flex items-center gap-1 cursor-pointer ${
                        helpVote === 1 ? 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 border-transparent' : 'border-amber-500/35'
                      }`}
                    >
                      <ThumbsUp size={14} />
                      <span>Помог</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVoteInteraction(helpResult.interactionId, -1)}
                      className={`px-3 py-1 rounded-lg border text-sm font-semibold flex items-center gap-1 cursor-pointer ${
                        helpVote === -1 ? 'bg-amber-900/20 border-amber-600' : 'border-amber-500/35'
                      }`}
                    >
                      <ThumbsDown size={14} />
                      <span>Не по делу</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRE-FLIGHT DRAFT CHECK */}
        {activeTab === 'preflight' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${blockCls}`}>
              <div className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare size={16} />
                <span>Черновая предпроверка без выставления оценки</span>
              </div>
              <p className="text-sm opacity-85 leading-relaxed">
                ИИ-Ревизор проверит текущие заполненные поля и чек-лист по критериям приемки и подскажет, что доработать до финальной сдачи.
              </p>
              <button
                type="button"
                onClick={handleRunPreflight}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={16} />
                <span>{loading ? 'Проверяем черновик...' : 'Проверить черновик сейчас'}</span>
              </button>
            </div>

            {preflightResult && (
              <div className={`p-4 rounded-2xl border space-y-3 ${blockCls}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
                  <span>Ориентировочная готовность: {preflightResult.estimatedScore}/100</span>
                  <span>{preflightResult.readyToSubmit ? 'Готово к сдаче' : 'Есть доработки'}</span>
                </div>
                <p className={`text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{preflightResult.summary}</p>

                {Array.isArray(preflightResult.missingItems) && preflightResult.missingItems.length > 0 && (
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">Что нужно закрыть:</div>
                    {preflightResult.missingItems.map((m: string, idx: number) => (
                      <div key={idx} className="leading-snug">• {m}</div>
                    ))}
                  </div>
                )}

                {Array.isArray(preflightResult.improvementTips) && preflightResult.improvementTips.length > 0 && (
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">Как усилить результат:</div>
                    {preflightResult.improvementTips.map((tip: string, idx: number) => (
                      <div key={idx} className="leading-snug opacity-90">• {tip}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI DECOMPOSITION */}
        {activeTab === 'decompose' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${blockCls}`}>
              <div className="text-sm font-semibold flex items-center gap-2">
                <ListChecks size={16} />
                <span>Разбивка задачи на понятные микро-шаги</span>
              </div>
              <p className="text-sm opacity-85">
                Если задача кажется слишком крупной, ИИ разобьет ее на 3–5 последовательных этапов.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDecompose(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-amber-500/45 text-sm font-semibold hover:bg-amber-500/15 cursor-pointer"
                >
                  {loading ? 'Генерация...' : 'Сформировать план шагов'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDecompose(true)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold hover:brightness-105 cursor-pointer"
                >
                  Добавить в чек-лист задачи
                </button>
              </div>
              {decomposeNotice && <div className="text-sm font-semibold">{decomposeNotice}</div>}
            </div>

            {decomposeSteps.length > 0 && (
              <div className={`p-4 rounded-2xl border space-y-2.5 ${blockCls}`}>
                {decomposeSteps.map((s, idx) => (
                  <div key={idx} className="text-sm space-y-0.5">
                    <div className="font-semibold">{idx + 1}. {s.title}</div>
                    {s.hint && <div className="opacity-80">{s.hint}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CHECK-IN & SMART SHIFT REQUEST */}
        {activeTab === 'checkin' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border space-y-3 ${blockCls}`}>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-1.5"><Clock size={16} /><span>Отметить текущий прогресс</span></span>
                <span className="tabular-nums font-bold">{progressVal}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progressVal}
                onChange={(e) => setProgressVal(Number(e.target.value))}
                className="w-full accent-[#E7C768] cursor-pointer"
              />
              <textarea
                rows={2}
                value={checkinNote}
                onChange={(e) => setCheckinNote(e.target.value)}
                placeholder="Короткий комментарий: что уже готово и что в работе..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${inputCls}`}
              />
              <button
                type="button"
                onClick={handleSaveCheckin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm font-bold flex items-center justify-center gap-2 hover:brightness-105 cursor-pointer"
              >
                <Send size={15} />
                <span>Сохранить чекин</span>
              </button>
              {checkinSavedMsg && <div className="text-sm font-semibold">{checkinSavedMsg}</div>}
            </div>

            <div className={`p-4 rounded-2xl border space-y-3 ${blockCls}`}>
              <div className="text-sm font-semibold flex items-center gap-2">
                <Calendar size={16} />
                <span>Запросить перенос срока (с учетом смен и загрузки)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-sm mb-1">На сколько дней</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={shiftDays}
                    onChange={(e) => setShiftDays(Math.max(1, Number(e.target.value) || 1))}
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none ${inputCls}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm mb-1">Причина переноса</label>
                  <input
                    type="text"
                    value={shiftReason}
                    onChange={(e) => setShiftReason(e.target.value)}
                    placeholder="Например: ожидаем согласование макета..."
                    className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none ${inputCls}`}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestShift}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-amber-500/45 text-sm font-semibold hover:bg-amber-500/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle size={15} />
                <span>Подобрать дату и отправить запрос руководителю</span>
              </button>
              {shiftFeedback && <div className="text-sm leading-snug">{shiftFeedback}</div>}
            </div>
          </div>
        )}

        {/* TAB 5: TIMELINE */}
        {activeTab === 'timeline' && (
          <TaskTimelinePanel
            interactions={interactions}
            shiftRequests={shiftRequests}
            onVote={handleVoteInteraction}
            isDark={isDark}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

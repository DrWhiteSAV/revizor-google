import React, { useState } from 'react';
import { 
  ShieldCheck, User, Sparkles, CheckCircle2, 
  AlertTriangle, RotateCcw, Send, FileText, 
  ExternalLink, Check, X, Award, Clock
} from 'lucide-react';
import { MiniAudioField } from '../../voice/MiniAudioField';
import { TaskDetailData } from '../cards/CabinetTaskCardsPage';

interface TaskManagerReviewPanelProps {
  task: TaskDetailData;
  fieldValues: Record<string, any>;
  onApprove: (score: number, verdict: string, status: 'completed' | 'in_progress', comment: string) => Promise<void> | void;
  isDark?: boolean;
  onClose?: () => void;
}

export const TaskManagerReviewPanel: React.FC<TaskManagerReviewPanelProps> = ({
  task,
  fieldValues,
  onApprove,
  isDark = true,
  onClose
}) => {
  const [activeReviewType, setActiveReviewType] = useState<'manual' | 'ai_assist' | 'ai_auto'>('ai_assist');
  const [score, setScore] = useState<number>(task.score || 85);
  const [comment, setComment] = useState<string>('');
  const [verdict, setVerdict] = useState<'APPROVED' | 'REVISION' | 'REJECTED'>('APPROVED');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    strengths?: string[];
    improvements?: string[];
    summary?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. AI Assist check
  const handleRunAiAssist = async () => {
    setIsAiAnalyzing(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Вы — ведущий ИИ-Ревизор.
Оцените выполнение задачи «${task.taskTitle}».
Регламент задачи: ${task.description || 'нет'}
Критерии оценки: ${task.checkCriteria || 'Соответствие регламенту, полнота ответов и качество материалов'}
Ответы и подтверждения исполнителя (${task.executorName}):
${JSON.stringify(fieldValues, null, 2)}

Верните JSON строго формата:
{
  "score": 90,
  "verdict": "APPROVED",
  "comment": "Развернутый вердикт ревизора",
  "strengths": ["Плюс 1", "Плюс 2"],
  "improvements": ["Что улучшить"]
}`
        })
      });
      const data = await res.json();
      if (res.ok && data.text) {
        const jsonMatch = data.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.score) setScore(Number(parsed.score));
          if (parsed.verdict) setVerdict(parsed.verdict === 'REVISION' ? 'REVISION' : 'APPROVED');
          if (parsed.comment) setComment(parsed.comment);
          setAiAnalysisResult({
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
            summary: parsed.comment || 'Оценка выполнена нейросетью'
          });
        }
      }
    } catch (e) {
      console.warn('Ошибка ИИ проверки:', e);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // 2. Fully Autonomous AI check & auto-submit
  const handleRunFullyAi = async () => {
    setIsAiAnalyzing(true);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Вы — неподкупный ИИ-Ревизор. Выполните автономную проверку задачи «${task.taskTitle}».
Ответы: ${JSON.stringify(fieldValues)}.
Верните JSON: { "score": 92, "verdict": "APPROVED", "comment": "Задача полностью соответствует регламенту" }`
        })
      });
      const data = await res.json();
      let finalScore = 90;
      let finalVerdict = 'APPROVED';
      let finalComment = 'Задача принята автономным ИИ Ревизором.';

      if (res.ok && data.text) {
        const jsonMatch = data.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.score) finalScore = Number(parsed.score);
          if (parsed.verdict) finalVerdict = parsed.verdict;
          if (parsed.comment) finalComment = parsed.comment;
        }
      }

      await onApprove(
        finalScore,
        finalVerdict,
        finalVerdict === 'APPROVED' ? 'completed' : 'in_progress',
        finalComment
      );
    } finally {
      setIsAiAnalyzing(false);
      setIsSubmitting(false);
    }
  };

  // 3. Final submit by manager
  const handleSubmitDecision = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(
        score,
        verdict,
        verdict === 'APPROVED' ? 'completed' : 'in_progress',
        comment || (verdict === 'APPROVED' ? 'Задача утверждена руководителем' : 'Задача возвращена на доработку')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border space-y-5 max-w-4xl mx-auto backdrop-blur-xl transition-all ${
      isDark
        ? 'bg-[#1A0F02]/90 border-amber-400/50 text-[#F4EE8E] shadow-[0_0_35px_rgba(244,238,142,0.18)]'
        : 'bg-[#FFFBF5]/95 border-[#B8860B]/40 text-amber-950 shadow-xl'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-3.5 border-amber-500/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-[#E7C768]">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#E7C768]">
              Панель проверки задачи руководителем
            </h3>
            <p className="text-xs opacity-75">
              Исполнитель: {task.executorName} ({task.executorRole || 'Сотрудник'}) • {task.projectTitle}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 3 Review Method Switcher */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#E7C768]">
          Режим проверки задачи:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => setActiveReviewType('manual')}
            className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeReviewType === 'manual'
                ? 'bg-amber-500/25 border-amber-400 text-[#E7C768] shadow-sm'
                : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <User size={16} />
              <span>1. Вручную</span>
            </div>
            <p className="text-xs opacity-75 font-normal">
              Руководитель лично выставляет оценку и пишет комментарий
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveReviewType('ai_assist');
              if (!aiAnalysisResult) handleRunAiAssist();
            }}
            className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeReviewType === 'ai_assist'
                ? 'bg-amber-500/25 border-amber-400 text-[#E7C768] shadow-sm'
                : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <Sparkles size={16} />
              <span>2. С помощью ИИ</span>
            </div>
            <p className="text-xs opacity-75 font-normal">
              ИИ формирует проект оценки и плюсы/минусы, руководитель утверждает
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveReviewType('ai_auto');
              handleRunFullyAi();
            }}
            className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeReviewType === 'ai_auto'
                ? 'bg-amber-500/25 border-amber-400 text-[#E7C768] shadow-sm'
                : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <Award size={16} />
              <span>3. Полностью через ИИ</span>
            </div>
            <p className="text-xs opacity-75 font-normal">
              Автоматическая оценка и отправка результата в 1 клик
            </p>
          </button>
        </div>
      </div>

      {/* Submitted Answers Summary Preview */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-[#140A01]/60 border-amber-500/30' : 'bg-white/80 border-amber-500/20'
      }`}>
        <div className="flex items-center justify-between text-xs font-bold text-[#E7C768]">
          <span>Предоставленные материалы отчета ({Object.keys(fieldValues).length}):</span>
          <span className="opacity-75">Критерий: {task.checkCriteria || 'Полнота регламента'}</span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin text-xs">
          {task.fields.map((f, i) => {
            const val = fieldValues[f.id];
            const hasVal = val !== undefined && val !== null && val !== '';
            return (
              <div key={f.id || i} className="p-2.5 rounded-xl border border-amber-400/20 bg-amber-500/5 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#E7C768] truncate">{i + 1}. {f.label}</div>
                  <div className="text-[11px] opacity-80 mt-0.5 break-words">
                    {hasVal 
                      ? (typeof val === 'object' ? (val.name || JSON.stringify(val)) : String(val))
                      : <span className="opacity-50 italic">Ответ не предоставлен</span>}
                  </div>
                </div>
                <div className="shrink-0">
                  {hasVal ? (
                    <CheckCircle2 size={16} className="text-amber-400" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-600 opacity-60" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Suggestions Box (When AI Assist active) */}
      {activeReviewType === 'ai_assist' && (
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-[#140A01]/75 border-amber-400/40' : 'bg-amber-50 border-amber-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-[#E7C768]">
              <Sparkles size={16} />
              <span>Проект вердикта ИИ-Ревизора:</span>
            </span>
            <button
              type="button"
              onClick={handleRunAiAssist}
              disabled={isAiAnalyzing}
              className="text-xs px-2.5 py-1 rounded-xl border border-amber-400/40 hover:bg-amber-500/10 cursor-pointer flex items-center gap-1"
            >
              <RotateCcw size={12} className={isAiAnalyzing ? 'animate-spin' : ''} />
              <span>{isAiAnalyzing ? 'Анализ...' : 'Пересчитать ИИ'}</span>
            </button>
          </div>

          {aiAnalysisResult && (
            <div className="space-y-2 text-xs">
              {aiAnalysisResult.strengths && aiAnalysisResult.strengths.length > 0 && (
                <div>
                  <span className="font-bold text-[#E7C768]">Сильные стороны: </span>
                  <span className="opacity-85">{aiAnalysisResult.strengths.join('; ')}</span>
                </div>
              )}
              {aiAnalysisResult.improvements && aiAnalysisResult.improvements.length > 0 && (
                <div>
                  <span className="font-bold text-amber-400">Рекомендации: </span>
                  <span className="opacity-85">{aiAnalysisResult.improvements.join('; ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Score and Verdict Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Score slider & input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
            <span>Оценка задачи (1-100 баллов):</span>
            <span className="font-mono text-base font-black text-[#E7C768]">{score} б.</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full accent-[#E7C768] cursor-pointer"
          />
          <div className="flex justify-between text-[11px] opacity-60 font-mono">
            <span>1 б. (Неудовл.)</span>
            <span>70 б. (Порог)</span>
            <span>100 б. (Отлично)</span>
          </div>
        </div>

        {/* Verdict buttons */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold">Решение руководителя:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVerdict('APPROVED')}
              className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                verdict === 'APPROVED'
                  ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                  : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
              }`}
            >
              <Check size={16} />
              <span>Принять задачу</span>
            </button>
            <button
              type="button"
              onClick={() => setVerdict('REVISION')}
              className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                verdict === 'REVISION'
                  ? 'bg-amber-500/25 border-amber-400 text-[#E7C768]'
                  : 'border-amber-400/20 hover:bg-amber-500/10 opacity-75'
              }`}
            >
              <RotateCcw size={16} />
              <span>На доработку</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Comment */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-bold">
          Комментарий и замечания руководителя к исполнителю:
        </label>
        <MiniAudioField
          value={comment}
          onChange={setComment}
          placeholder="Опишите, что выполнено хорошо, а что требует доработки..."
          rows={2}
          multiline={true}
          resizable={true}
          isLightTheme={!isDark}
        />
      </div>

      {/* Action Submit Button */}
      <div className="pt-2 flex items-center justify-end gap-3 border-t border-amber-500/20">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-amber-400/30 text-xs sm:text-sm font-semibold hover:bg-amber-500/10 cursor-pointer"
          >
            Отмена
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmitDecision}
          disabled={isSubmitting || isAiAnalyzing}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs sm:text-sm font-bold flex items-center gap-2 hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shadow-md"
        >
          <Send size={16} />
          <span>{isSubmitting ? 'Отправка...' : 'Утвердить и отправить результат проверки'}</span>
        </button>
      </div>
    </div>
  );
};

export default TaskManagerReviewPanel;

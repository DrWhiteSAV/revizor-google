import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Wand2,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { ReportTemplate } from '../../types';
import { MiniAudioField } from '../voice/MiniAudioField';
import {
  MissingFieldSuggestion,
  MotivationCalculator,
  formatRub,
  getPeriodLabel
} from './types';

interface AiParseResponse {
  success: boolean;
  draftCalculator: MotivationCalculator;
  missingItems: MissingFieldSuggestion[];
  aiSummary?: string;
  usedFallback?: boolean;
  error?: string;
}

interface MotivationAiBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialBuildResult?: AiParseResponse | null;
  companyId: string;
  directorId: string;
  userId: string;
  templates: ReportTemplate[];
  onTemplatesUpdated: (nextTemplates: ReportTemplate[]) => void;
  onApplyDraft: (draft: MotivationCalculator) => void;
  theme: 'dark' | 'light';
}

const SAMPLE_PROMPTS = [
  'Оклад 45 000 рублей в месяц по графику смен, переработка +30% в час, недоработка минус 400 рублей в час. Плюс KPI за встречи по вечернему отчету: за 1 встречу 300 рублей, за 3 встречи 400 рублей каждая, за 5 встреч 1000 рублей за все.',
  'Фиксированная смена 2 500 рублей с привязкой ко времени утреннего и вечернего отчетов. План продаж на месяц 1 000 000 рублей: при 50% плана премия 3% от выручки, при 90% плана 5% от выручки, при 130% плана 7% от выручки.'
];

export const MotivationAiBuilderModal: React.FC<MotivationAiBuilderModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
  initialBuildResult = null,
  companyId,
  directorId,
  userId,
  templates,
  onTemplatesUpdated,
  onApplyDraft,
  theme
}) => {
  const isDark = theme === 'dark';
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isParsing, setIsParsing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fixSuccessMsg, setFixSuccessMsg] = useState('');
  const [draft, setDraft] = useState<MotivationCalculator | null>(null);
  const [missingItems, setMissingItems] = useState<MissingFieldSuggestion[]>([]);
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setFixSuccessMsg('');
    if (initialPrompt) setPrompt(initialPrompt);
    if (initialBuildResult?.draftCalculator) {
      setDraft(initialBuildResult.draftCalculator);
      setMissingItems(initialBuildResult.missingItems || []);
      setAiSummary(initialBuildResult.aiSummary || '');
    } else if (!initialPrompt) {
      setDraft(null);
      setMissingItems([]);
      setAiSummary('');
    }
  }, [isOpen, initialPrompt, initialBuildResult]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleParse = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text) {
      setErrorMsg('Опишите условия мотивации голосом или текстом.');
      return;
    }
    setIsParsing(true);
    setErrorMsg('');
    setFixSuccessMsg('');
    try {
      const res = await fetch('/api/motivation/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          companyId,
          directorId,
          userId
        })
      });
      const data: AiParseResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось разобрать условия мотивации');
      }
      setDraft(data.draftCalculator);
      setMissingItems(data.missingItems || []);
      setAiSummary(data.aiSummary || '');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ошибка обращения к нейросети ИИ-Рапорт');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAutoFixMissing = async () => {
    if (!draft || missingItems.length === 0) return;
    setIsFixing(true);
    setErrorMsg('');
    setFixSuccessMsg('');
    try {
      const needMorning = missingItems.some((m) => m.kind === 'missing_morning_template');
      const fallbackEveningTpl =
        draft.evening_report_template_id ||
        templates.find((t) => t.type === 'FACT_DAY')?.id ||
        templates[0]?.id;

      const addFields = missingItems
        .filter((m) => m.kind === 'missing_number_field' && m.suggestedFieldLabel)
        .map((m) => ({
          templateId: m.targetTemplateId || fallbackEveningTpl,
          label: m.suggestedFieldLabel!,
          hint: m.suggestedFieldHint || 'Числовой показатель для KPI',
          kpiRuleIndex: m.kpiRuleIndex
        }))
        .filter((f) => Boolean(f.templateId));

      const res = await fetch('/api/motivation/fix-missing-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          director_id: directorId,
          createMorningTemplate: needMorning,
          addFields
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось создать недостающие поля');
      }

      // Sync updated templates into parent React state cleanly
      let nextTemplates = [...templates];
      if (data.createdMorningTemplate) {
        const createdTpl: ReportTemplate = {
          id: data.createdMorningTemplate.id,
          company_id: companyId,
          director_id: directorId,
          title: data.createdMorningTemplate.title,
          description: 'Фиксирует время начала смены и план на день для калькулятора мотивации',
          type: 'PLAN_DAY',
          fields: data.createdMorningTemplate.fields,
          schedule_mode: 'work_schedule',
          deadline_time: '09:30',
          is_active: true
        };
        nextTemplates = [createdTpl, ...nextTemplates];
      }
      if (Array.isArray(data.updatedTemplates) && data.updatedTemplates.length > 0) {
        nextTemplates = nextTemplates.map((tpl) => {
          const upd = data.updatedTemplates.find((u: any) => String(u.id) === String(tpl.id));
          return upd ? { ...tpl, fields: upd.fields } : tpl;
        });
      }
      onTemplatesUpdated(nextTemplates);

      // Update draft bindings with created IDs
      const updatedDraft: MotivationCalculator = {
        ...draft,
        morning_report_template_id:
          data.createdMorningTemplate?.id || draft.morning_report_template_id,
        evening_report_template_id:
          draft.evening_report_template_id || fallbackEveningTpl || null,
        kpi_rules: (draft.kpi_rules || []).map((rule) => {
          const matchedField = (data.createdFieldMap || []).find(
            (cf: any) =>
              cf.label.toLowerCase() === (rule.field_label || rule.title || '').toLowerCase()
          );
          if (matchedField) {
            return {
              ...rule,
              field_id: matchedField.fieldId,
              field_label: matchedField.label
            };
          }
          return rule;
        })
      };
      setDraft(updatedDraft);
      setMissingItems([]);
      setFixSuccessMsg(
        'Недостающие шаблоны и числовые поля добавлены в базу данных отчетов и автоматически привязаны к калькулятору.'
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ошибка при автоматическом исправлении полей');
    } finally {
      setIsFixing(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9994] flex items-center justify-center p-3 sm:p-5 bg-transparent backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 space-y-5 backdrop-blur-xl ${
          isDark
            ? 'bg-[#1A0F02]/88 border-amber-400/50 text-amber-50 shadow-[0_0_40px_rgba(244,238,142,0.28)]'
            : 'bg-[#FFFBF5]/95 border-amber-900/45 text-amber-950 shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-amber-500/25 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Wand2 size={22} className={isDark ? 'text-[#F4EE8E] shrink-0' : 'text-amber-800 shrink-0'} />
            <div>
              <h3 className="text-lg font-bold leading-snug">
                ИИ-калькулятор мотивации (голос и текст)
              </h3>
              <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-amber-900/80'}`}>
                Опишите правила расчета словами — нейросеть ИИ-Рапорт соберет формулу и проверит наличие полей в отчетах.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-amber-500/30 hover:border-amber-400 cursor-pointer shrink-0"
            title="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Voice / Text Prompt Input */}
        <div className="space-y-2.5">
          <MiniAudioField
            label="Условия оклада, переработок и KPI (нажмите на микрофон или напишите)"
            value={prompt}
            onChange={setPrompt}
            placeholder="Например: оклад 50 000 рублей в месяц по графику смен + 300 рублей за 1 встречу, 400 за 3, 1000 за 5..."
            multiline
            rows={4}
            isLightTheme={!isDark}
            showPlayer={false}
          />

          {/* Quick Prompt Bubbles */}
          <div className="space-y-1.5">
            <div className={`text-sm font-semibold ${isDark ? 'text-[#E7C768]' : 'text-amber-900'}`}>
              Готовые примеры для быстрого старта:
            </div>
            <div className="flex flex-col gap-2">
              {SAMPLE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(sample)}
                  className={`text-left p-3 rounded-2xl border text-sm transition-all cursor-pointer ${
                    isDark
                      ? 'border-amber-400/30 bg-transparent text-amber-100 hover:border-[#F4EE8E]'
                      : 'border-amber-900/30 bg-transparent text-amber-950 hover:bg-amber-100/50'
                  }`}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isParsing}
              onClick={() => handleParse()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300/80 hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isParsing ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              <span>{isParsing ? 'Нейросеть строит модель...' : 'Собрать калькулятор через ИИ-Рапорт'}</span>
            </button>
          </div>
        </div>

        {/* Error Box */}
        {errorMsg && (
          <div className={`p-3.5 rounded-2xl border text-sm font-medium ${isDark ? 'border-rose-400/50 text-rose-200' : 'border-rose-700/50 text-rose-900'}`}>
            {errorMsg}
          </div>
        )}

        {/* Fix Success Box */}
        {fixSuccessMsg && (
          <div className={`p-3.5 rounded-2xl border text-sm font-medium flex items-start gap-2.5 ${isDark ? 'border-[#F4EE8E]/60 text-[#F4EE8E]' : 'border-amber-800/50 text-amber-950'}`}>
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <span>{fixSuccessMsg}</span>
          </div>
        )}

        {/* Draft Preview & Diagnostics */}
        {draft && (
          <div className="space-y-4 pt-1 border-t border-amber-500/25">
            <div className="space-y-1">
              <div className={`text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Сформированный черновик: «{draft.title}»
              </div>
              {aiSummary && (
                <p className={`text-sm leading-relaxed ${isDark ? 'text-amber-100/85' : 'text-amber-900'}`}>
                  {aiSummary}
                </p>
              )}
            </div>

            {/* Structured Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`p-3.5 rounded-2xl border space-y-1 ${isDark ? 'border-amber-400/35 bg-transparent' : 'border-amber-900/30 bg-transparent'}`}>
                <div className={`text-sm font-bold ${isDark ? 'text-[#E7C768]' : 'text-amber-900'}`}>
                  Фиксированная часть
                </div>
                <div className="text-sm">
                  {draft.fixed_config.salary_mode === 'per_shift'
                    ? `${formatRub(draft.fixed_config.base_amount)} за смену`
                    : `${formatRub(draft.fixed_config.base_amount)} в месяц по графику смен`}
                </div>
                <div className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-amber-900/80'}`}>
                  Контроль: {draft.fixed_config.verification_mode === 'time' ? 'время работы (утро + вечер)' : 'числовая норма'}
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border space-y-1 ${isDark ? 'border-amber-400/35 bg-transparent' : 'border-amber-900/30 bg-transparent'}`}>
                <div className={`text-sm font-bold ${isDark ? 'text-[#E7C768]' : 'text-amber-900'}`}>
                  Переменная часть (KPI: {draft.kpi_rules.length})
                </div>
                {draft.kpi_rules.length === 0 ? (
                  <div className="text-sm opacity-80">Без KPI-правил</div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {draft.kpi_rules.map((r) => (
                      <li key={r.id}>
                        • {r.title} ({getPeriodLabel(r.period)}, грейдов: {r.grades.length})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Missing Fields Checker */}
            {missingItems.length > 0 ? (
              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-amber-400/70 bg-transparent shadow-[0_0_20px_rgba(244,238,142,0.18)]' : 'border-amber-900/60 bg-amber-100/35'}`}>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={20} className={isDark ? 'text-[#F4EE8E] shrink-0 mt-0.5' : 'text-amber-900 shrink-0 mt-0.5'} />
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-bold">
                      Обнаружены недостающие поля или шаблоны в отчетах ({missingItems.length})
                    </div>
                    <p className="text-sm opacity-90">
                      Чтобы расчет сработал на реальных отчетах сотрудников, их нужно добавить в конструктор ИИ-Рапорта.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {missingItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-sm space-y-0.5 ${isDark ? 'border-amber-400/30' : 'border-amber-900/25'}`}
                    >
                      <div className="font-bold">{item.title}</div>
                      <div className="opacity-85">{item.description}</div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={isFixing}
                  onClick={handleAutoFixMissing}
                  className={`w-full py-2.5 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDark
                      ? 'border-[#F4EE8E] text-[#F4EE8E] hover:bg-amber-400/15'
                      : 'border-amber-950 text-amber-950 bg-amber-200/80 hover:bg-amber-300/80'
                  }`}
                >
                  {isFixing ? <Loader2 size={17} className="animate-spin" /> : <Wrench size={17} />}
                  <span>{isFixing ? 'Добавляю в базу отчетов...' : 'Создать недостающие поля и шаблоны автоматически'}</span>
                </button>
              </div>
            ) : (
              <div className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-sm font-medium ${isDark ? 'border-amber-400/40 text-[#F4EE8E]' : 'border-amber-900/35 text-amber-950'}`}>
                <CheckCircle2 size={18} className="shrink-0" />
                <span>Все требуемые отчеты и числовые поля найдены и привязаны. Можно переходить в редактор.</span>
              </div>
            )}

            {/* Transfer to Editor Action */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer ${
                  isDark ? 'border-amber-400/35 text-amber-100' : 'border-amber-900/35 text-amber-950'
                }`}
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyDraft(draft);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300/80 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Открыть и донастроить в редакторе</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

import React from 'react';
import { Plus, Trash2, Award } from 'lucide-react';
import { ReportField, ReportTemplate } from '../../../types';
import {
  MotivationCalculator,
  MotivationKpiGrade,
  MotivationKpiRule,
  getPeriodLabel
} from '../types';
import { PulseGradeConstellationSvg } from '../CosmicMotivationSvgs';

interface EditorKpiTabProps {
  form: MotivationCalculator;
  setForm: React.Dispatch<React.SetStateAction<MotivationCalculator>>;
  selectedEveningTpl: ReportTemplate | null;
  eveningNumberFields: ReportField[];
  morningNumberFields: ReportField[];
  newNumberFieldName: string;
  setNewNumberFieldName: (val: string) => void;
  isAddingKpiField: boolean;
  onAddNumberFieldToEvening: (customLabel?: string) => void;
  inputClass: string;
  isDark: boolean;
}

export const EditorKpiTab: React.FC<EditorKpiTabProps> = ({
  form,
  setForm,
  selectedEveningTpl,
  eveningNumberFields,
  morningNumberFields,
  newNumberFieldName,
  setNewNumberFieldName,
  isAddingKpiField,
  onAddNumberFieldToEvening,
  inputClass,
  isDark
}) => {
  const addKpiRule = (preset?: 'meetings' | 'sales_pct') => {
    const firstNum = eveningNumberFields[0];
    const secondNum = eveningNumberFields[1] || firstNum;
    if (preset === 'meetings') {
      const rule: MotivationKpiRule = {
        id: `kpi_${Date.now().toString(36)}`,
        title: 'Премия за проведенные встречи',
        field_id: firstNum?.id || '',
        field_label: firstNum?.label || 'Количество встреч',
        period: 'day',
        calc_mode: 'volume_grades',
        plan_source: 'fixed_target',
        plan_target: 5,
        grades: [
          { id: 'g1', threshold: 1, reward_type: 'per_unit', reward_value: 300, label: '1+ встреча -> 300 ₽/шт' },
          { id: 'g2', threshold: 3, reward_type: 'per_unit', reward_value: 400, label: '3+ встречи -> 400 ₽/шт' },
          { id: 'g3', threshold: 5, reward_type: 'flat_bundle', reward_value: 1000, label: '5 встреч -> 1000 ₽ за все' }
        ]
      };
      setForm((prev) => ({ ...prev, kpi_rules: [...prev.kpi_rules, rule] }));
      return;
    }
    if (preset === 'sales_pct') {
      const rule: MotivationKpiRule = {
        id: `kpi_${Date.now().toString(36)}`,
        title: 'План продаж за месяц (% от выручки)',
        field_id: firstNum?.id || '',
        field_label: firstNum?.label || 'Выручка (руб)',
        period: 'month',
        calc_mode: 'plan_percent_grades',
        plan_source: 'fixed_target',
        plan_target: 1000000,
        base_revenue_field_id: secondNum?.id || firstNum?.id || '',
        base_revenue_field_label: secondNum?.label || firstNum?.label || 'Выручка',
        grades: [
          { id: 'g1', threshold: 50, reward_type: 'percent_of_base', reward_value: 3, label: 'От 50% плана -> 3% выручки' },
          { id: 'g2', threshold: 90, reward_type: 'percent_of_base', reward_value: 5, label: 'От 90% плана -> 5% выручки' },
          { id: 'g3', threshold: 130, reward_type: 'percent_of_base', reward_value: 7, label: 'От 130% плана -> 7% выручки' }
        ]
      };
      setForm((prev) => ({ ...prev, kpi_rules: [...prev.kpi_rules, rule] }));
      return;
    }

    const emptyRule: MotivationKpiRule = {
      id: `kpi_${Date.now().toString(36)}`,
      title: 'Новый показатель KPI',
      field_id: firstNum?.id || '',
      field_label: firstNum?.label || '',
      period: 'day',
      calc_mode: 'volume_grades',
      plan_source: 'fixed_target',
      plan_target: 10,
      grades: [{ id: `g_${Date.now()}`, threshold: 1, reward_type: 'per_unit', reward_value: 300 }]
    };
    setForm((prev) => ({ ...prev, kpi_rules: [...prev.kpi_rules, emptyRule] }));
  };

  const updateKpiRule = (ruleId: string, patch: Partial<MotivationKpiRule>) => {
    setForm((prev) => ({
      ...prev,
      kpi_rules: prev.kpi_rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r))
    }));
  };

  const removeKpiRule = (ruleId: string) => {
    setForm((prev) => ({
      ...prev,
      kpi_rules: prev.kpi_rules.filter((r) => r.id !== ruleId)
    }));
  };

  const addGrade = (ruleId: string) => {
    setForm((prev) => ({
      ...prev,
      kpi_rules: prev.kpi_rules.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              grades: [
                ...r.grades,
                {
                  id: `g_${Date.now().toString(36)}`,
                  threshold: (r.grades[r.grades.length - 1]?.threshold || 0) + 1,
                  reward_type: r.calc_mode === 'plan_percent_grades' ? 'percent_of_base' : 'per_unit',
                  reward_value: 500
                }
              ]
            }
          : r
      )
    }));
  };

  const updateGrade = (ruleId: string, gradeId: string, patch: Partial<MotivationKpiGrade>) => {
    setForm((prev) => ({
      ...prev,
      kpi_rules: prev.kpi_rules.map((r) =>
        r.id === ruleId
          ? { ...r, grades: r.grades.map((g) => (g.id === gradeId ? { ...g, ...patch } : g)) }
          : r
      )
    }));
  };

  const removeGrade = (ruleId: string, gradeId: string) => {
    setForm((prev) => ({
      ...prev,
      kpi_rules: prev.kpi_rules.map((r) =>
        r.id === ruleId ? { ...r, grades: r.grades.filter((g) => g.id !== gradeId) } : r
      )
    }));
  };

  return (
    <div className="space-y-4">
      {selectedEveningTpl && (
        <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between ${isDark ? 'border-amber-400/30' : 'border-amber-900/30'}`}>
          <div className="text-sm font-medium min-w-0">
            Числовые поля в «{selectedEveningTpl.title}»: <strong>{eveningNumberFields.length}</strong>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNumberFieldName}
              onChange={(e) => setNewNumberFieldName(e.target.value)}
              placeholder="Новое числовое поле (например, Выручка)"
              className={`${inputClass} sm:w-64`}
            />
            <button
              type="button"
              disabled={isAddingKpiField || !newNumberFieldName.trim()}
              onClick={() => onAddNumberFieldToEvening()}
              className="px-3.5 py-2 rounded-xl border border-amber-400/50 text-sm font-bold shrink-0 cursor-pointer disabled:opacity-45"
            >
              {isAddingKpiField ? '...' : '+ В отчет'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addKpiRule()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          <span>Добавить показатель KPI</span>
        </button>
        <button
          type="button"
          onClick={() => addKpiRule('meetings')}
          className={`px-3.5 py-2 rounded-xl border text-sm font-semibold cursor-pointer ${isDark ? 'border-amber-400/40 text-[#F4EE8E]' : 'border-amber-900/40 text-amber-950'}`}
        >
          + Шаблон: Встречи (1/3/5 грейды)
        </button>
        <button
          type="button"
          onClick={() => addKpiRule('sales_pct')}
          className={`px-3.5 py-2 rounded-xl border text-sm font-semibold cursor-pointer ${isDark ? 'border-amber-400/40 text-[#F4EE8E]' : 'border-amber-900/40 text-amber-950'}`}
        >
          + Шаблон: План продаж (50%/90%/130%)
        </button>
      </div>

      {form.kpi_rules.length === 0 ? (
        <div className={`p-6 rounded-2xl border text-center text-sm ${isDark ? 'border-amber-400/25 opacity-85' : 'border-amber-900/25 opacity-85'}`}>
          Переменные KPI пока не добавлены. Нажмите «Добавить показатель KPI» или выберите готовый шаблон выше.
        </div>
      ) : (
        <div className="space-y-4">
          {form.kpi_rules.map((rule, rIdx) => (
            <div
              key={rule.id}
              className={`p-4 rounded-2xl border space-y-3.5 ${isDark ? 'border-amber-400/40 bg-transparent' : 'border-amber-900/35 bg-transparent'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Award size={18} className={isDark ? 'text-[#F4EE8E]' : 'text-amber-800'} />
                  <span>KPI #{rIdx + 1}: {rule.title || 'Показатель'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeKpiRule(rule.id)}
                  className="p-1.5 rounded-lg border border-rose-400/40 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  title="Удалить KPI"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold block">Название KPI</label>
                  <input
                    type="text"
                    value={rule.title}
                    onChange={(e) => updateKpiRule(rule.id, { title: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold block">Поле из вечернего отчета</label>
                  <select
                    value={rule.field_id}
                    onChange={(e) => {
                      const found = eveningNumberFields.find((f) => f.id === e.target.value);
                      updateKpiRule(rule.id, {
                        field_id: e.target.value,
                        field_label: found?.label || rule.field_label
                      });
                    }}
                    className={inputClass}
                  >
                    <option value="">Выберите числовое поле...</option>
                    {eveningNumberFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold block">Период накопления</label>
                  <select
                    value={rule.period}
                    onChange={(e) => updateKpiRule(rule.id, { period: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="day">День</option>
                    <option value="week">Неделя</option>
                    <option value="month">Месяц</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold block">Логика грейдов</label>
                  <select
                    value={rule.calc_mode}
                    onChange={(e) => updateKpiRule(rule.id, { calc_mode: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="volume_grades">По количеству / объему (1, 3, 5...)</option>
                    <option value="plan_percent_grades">По % выполнения плана (50%, 90%, 130%)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold block">План на {getPeriodLabel(rule.period).toLowerCase()}</label>
                  <input
                    type="number"
                    min={0}
                    value={rule.plan_target}
                    onChange={(e) => updateKpiRule(rule.id, { plan_target: Number(e.target.value || 0) })}
                    className={inputClass}
                  />
                </div>

                {rule.calc_mode === 'plan_percent_grades' ? (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold block">Поле выручки / базы (для % премии)</label>
                    <select
                      value={rule.base_revenue_field_id || ''}
                      onChange={(e) => {
                        const found = eveningNumberFields.find((f) => f.id === e.target.value);
                        updateKpiRule(rule.id, {
                          base_revenue_field_id: e.target.value,
                          base_revenue_field_label: found?.label || ''
                        });
                      }}
                      className={inputClass}
                    >
                      <option value="">Та же метрика ({rule.field_label || 'факт'})</option>
                      {eveningNumberFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold block">Источник дневного плана</label>
                    <select
                      value={rule.plan_field_id || ''}
                      onChange={(e) =>
                        updateKpiRule(rule.id, {
                          plan_field_id: e.target.value || undefined,
                          plan_source: e.target.value ? 'morning_report_field' : 'fixed_target'
                        })
                      }
                      className={inputClass}
                    >
                      <option value="">Фиксированный план выше</option>
                      {morningNumberFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          Из утра: {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <PulseGradeConstellationSvg
                  grades={rule.grades}
                  currentValue={rule.grades[0]?.threshold || 0}
                  calcMode={rule.calc_mode}
                  isDark={isDark}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">Ступени грейдов ({rule.grades.length}):</span>
                  <button
                    type="button"
                    onClick={() => addGrade(rule.id)}
                    className={`px-3 py-1 rounded-xl border text-sm font-semibold cursor-pointer ${
                      isDark ? 'border-amber-400/40 text-[#F4EE8E]' : 'border-amber-900/40 text-amber-950'
                    }`}
                  >
                    + Грейд
                  </button>
                </div>

                {rule.grades.map((gr) => (
                  <div key={gr.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        step="any"
                        value={gr.threshold}
                        onChange={(e) => updateGrade(rule.id, gr.id, { threshold: Number(e.target.value || 0) })}
                        placeholder={rule.calc_mode === 'plan_percent_grades' ? 'От %' : 'От кол-ва'}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <select
                        value={gr.reward_type}
                        onChange={(e) => updateGrade(rule.id, gr.id, { reward_type: e.target.value as any })}
                        className={inputClass}
                      >
                        <option value="per_unit">₽ за каждую единицу</option>
                        <option value="flat_bundle">₽ за весь достигнутый объем</option>
                        <option value="percent_of_base">% от выручки / базы</option>
                        <option value="fixed_bonus">₽ фиксированная премия</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        step="any"
                        value={gr.reward_value}
                        onChange={(e) => updateGrade(rule.id, gr.id, { reward_value: Number(e.target.value || 0) })}
                        placeholder="Размер"
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeGrade(rule.id, gr.id)}
                        className="p-2 rounded-xl border border-rose-400/35 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Удалить ступень"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

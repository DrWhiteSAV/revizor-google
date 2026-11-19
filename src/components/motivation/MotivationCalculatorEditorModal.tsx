import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  AlertTriangle,
  Clock,
  Hash,
  Wrench,
  Loader2
} from 'lucide-react';
import { Department, ReportField, ReportTemplate, UserProfile } from '../../types';
import { MotivationCalculator, createEmptyCalculator } from './types';
import { EditorKpiTab } from './editor/EditorKpiTab';
import { EditorSimulatorTab } from './editor/EditorSimulatorTab';

interface EditorModalProps {
  isOpen: boolean;
  initialCalculator: MotivationCalculator | null;
  templates: ReportTemplate[];
  departments: Department[];
  employees: UserProfile[];
  companyId: string;
  directorId: string;
  onTemplatesUpdated: (nextTemplates: ReportTemplate[]) => void;
  onSaved: (saved: MotivationCalculator) => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}

type EditorSection = 'bindings' | 'fixed' | 'kpi' | 'simulator';

export const MotivationCalculatorEditorModal: React.FC<EditorModalProps> = ({
  isOpen,
  initialCalculator,
  templates,
  departments,
  employees,
  companyId,
  directorId,
  onTemplatesUpdated,
  onSaved,
  onClose,
  theme
}) => {
  const isDark = theme === 'dark';
  const [section, setSection] = useState<EditorSection>('bindings');
  const [form, setForm] = useState<MotivationCalculator>(() => createEmptyCalculator(companyId, directorId));
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingMorning, setIsCreatingMorning] = useState(false);
  const [isAddingKpiField, setIsAddingKpiField] = useState(false);
  const [newNumberFieldName, setNewNumberFieldName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Simulator state
  const [simHours, setSimHours] = useState<number>(8);
  const [simHasMorning, setSimHasMorning] = useState<boolean>(true);
  const [simAnswers, setSimAnswers] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const morningTemplates = useMemo(
    () => templates.filter((t) => String(t.type).toUpperCase() === 'PLAN_DAY'),
    [templates]
  );
  const eveningTemplates = useMemo(
    () => templates.filter((t) => String(t.type).toUpperCase() !== 'PLAN_DAY'),
    [templates]
  );

  const selectedMorningTpl = useMemo(
    () => templates.find((t) => String(t.id) === String(form.morning_report_template_id)),
    [templates, form.morning_report_template_id]
  );
  const selectedEveningTpl = useMemo(
    () =>
      templates.find((t) => String(t.id) === String(form.evening_report_template_id)) ||
      eveningTemplates[0] ||
      templates[0] ||
      null,
    [templates, eveningTemplates, form.evening_report_template_id]
  );

  const eveningNumberFields: ReportField[] = useMemo(() => {
    if (!selectedEveningTpl?.fields) return [];
    return selectedEveningTpl.fields.filter((f) => f.type === 'number');
  }, [selectedEveningTpl]);

  const morningNumberFields: ReportField[] = useMemo(() => {
    if (!selectedMorningTpl?.fields) return [];
    return selectedMorningTpl.fields.filter((f) => f.type === 'number');
  }, [selectedMorningTpl]);

  const uniquePositions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.position && e.position.trim()) set.add(e.position.trim());
    });
    return Array.from(set);
  }, [employees]);

  useEffect(() => {
    if (!isOpen) return;
    setSection('bindings');
    setErrorMsg('');
    setSimResult(null);
    if (initialCalculator) {
      const defaultEv =
        initialCalculator.evening_report_template_id ||
        eveningTemplates[0]?.id ||
        templates[0]?.id ||
        null;
      const defaultMo =
        initialCalculator.morning_report_template_id ||
        morningTemplates[0]?.id ||
        null;
      setForm({
        ...createEmptyCalculator(companyId, directorId),
        ...initialCalculator,
        morning_report_template_id: defaultMo,
        evening_report_template_id: defaultEv,
        fixed_config: {
          ...createEmptyCalculator(companyId, directorId).fixed_config,
          ...(initialCalculator.fixed_config || {})
        },
        kpi_rules: Array.isArray(initialCalculator.kpi_rules) ? initialCalculator.kpi_rules : []
      });
    } else {
      const empty = createEmptyCalculator(companyId, directorId);
      empty.morning_report_template_id = morningTemplates[0]?.id || null;
      empty.evening_report_template_id = eveningTemplates[0]?.id || templates[0]?.id || null;
      setForm(empty);
    }
  }, [isOpen, initialCalculator, companyId, directorId]);

  if (!isOpen || typeof document === 'undefined') return null;

  const missingMorningForTimeMode =
    form.fixed_config.verification_mode === 'time' && !form.morning_report_template_id;

  const toggleArrayValue = (arr: string[], val: string): string[] => {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  };

  const handleQuickCreateMorningTemplate = async () => {
    setIsCreatingMorning(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/motivation/fix-missing-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          director_id: directorId,
          createMorningTemplate: true,
          addFields: []
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.createdMorningTemplate) {
        throw new Error(data.error || 'Не удалось создать шаблон утреннего отчета');
      }
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
      onTemplatesUpdated([createdTpl, ...templates]);
      setForm((prev) => ({
        ...prev,
        morning_report_template_id: createdTpl.id,
        require_morning_report: true
      }));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ошибка создания утреннего отчета');
    } finally {
      setIsCreatingMorning(false);
    }
  };

  const handleAddNumberFieldToEvening = async (customLabel?: string) => {
    if (!selectedEveningTpl) {
      setErrorMsg('Сначала выберите вечерний отчет в разделе «Привязки».');
      return;
    }
    const label = (customLabel ?? newNumberFieldName).trim();
    if (!label) return;
    setIsAddingKpiField(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/motivation/fix-missing-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          director_id: directorId,
          createMorningTemplate: false,
          addFields: [{ templateId: selectedEveningTpl.id, label }]
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось добавить поле');
      }
      const updated = (data.updatedTemplates || []).find(
        (u: any) => String(u.id) === String(selectedEveningTpl.id)
      );
      if (updated) {
        const nextTemplates = templates.map((t) =>
          String(t.id) === String(selectedEveningTpl.id) ? { ...t, fields: updated.fields } : t
        );
        onTemplatesUpdated(nextTemplates);
        if (!customLabel) setNewNumberFieldName('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ошибка добавления поля в отчет');
    } finally {
      setIsAddingKpiField(false);
    }
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/motivation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculator: form,
          workedHours: Number(simHours || 8),
          hasMorningReport: simHasMorning,
          answers: simAnswers
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка симуляции');
      }
      setSimResult(data.result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не удалось выполнить тестовый расчет');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setErrorMsg('Введите название калькулятора мотивации.');
      setSection('bindings');
      return;
    }
    if (missingMorningForTimeMode) {
      setErrorMsg(
        'Для привязки ко времени работы выберите утренний отчет («План на день») или создайте его прямо сейчас.'
      );
      setSection('bindings');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const isEdit = Boolean(form.id);
      const url = isEdit
        ? `/api/motivation/calculators/${encodeURIComponent(form.id)}`
        : '/api/motivation/calculators';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          company_id: companyId,
          director_id: directorId
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка сохранения калькулятора');
      }
      onSaved(data.calculator);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не удалось сохранить схему мотивации');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = `w-full p-2.5 rounded-xl border text-sm font-medium focus:outline-none ${
    isDark
      ? 'bg-[#140A01]/80 border-amber-400/40 text-amber-50 placeholder:text-amber-200/35 focus:border-[#F4EE8E]'
      : 'bg-[#FFFBF5] border-amber-900/40 text-amber-950 placeholder:text-amber-800/50 focus:border-amber-950'
  }`;

  const sectionsMeta: Array<{ id: EditorSection; label: string }> = [
    { id: 'bindings', label: '1. Назначение и отчеты' },
    { id: 'fixed', label: '2. Оклад и переработки' },
    { id: 'kpi', label: `3. KPI и грейды (${form.kpi_rules.length})` },
    { id: 'simulator', label: '4. Симулятор смены' }
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9993] flex items-center justify-center p-2.5 sm:p-5 bg-transparent backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl max-h-[93vh] flex flex-col rounded-3xl border backdrop-blur-xl overflow-hidden ${
          isDark
            ? 'bg-[#1A0F02]/90 border-amber-400/50 text-amber-50 shadow-[0_0_45px_rgba(244,238,142,0.28)]'
            : 'bg-[#FFFBF5]/95 border-amber-900/45 text-amber-950 shadow-2xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-amber-500/25 shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold break-words">
              {form.id ? `Редактирование: ${form.title || 'Калькулятор'}` : 'Новый калькулятор мотивации'}
            </h3>
            <p className={`text-sm ${isDark ? 'text-amber-200/80' : 'text-amber-900/80'}`}>
              Настройте оклад, переработки, KPI-грейды и привязку к отчетам.
            </p>
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

        {/* Wrapping Bubble Navigation */}
        <div className="p-3 sm:px-5 border-b border-amber-500/20 flex flex-wrap gap-2 shrink-0">
          {sectionsMeta.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`px-3.5 py-2 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                section === s.id
                  ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300 shadow-sm'
                  : isDark
                  ? 'border-amber-400/35 text-[#F4EE8E] hover:border-amber-400/70'
                  : 'border-amber-900/30 text-amber-950 hover:bg-amber-100/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className={`p-3.5 rounded-2xl border text-sm font-medium flex items-start gap-2.5 ${isDark ? 'border-rose-400/55 text-rose-200' : 'border-rose-700/50 text-rose-900'}`}>
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {section === 'bindings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold block">Название схемы мотивации</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Например: Менеджер продаж (оклад + грейды)"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold block">Связь с графиком смен</label>
                  <select
                    value={form.schedule_link_mode}
                    onChange={(e) => setForm({ ...form, schedule_link_mode: e.target.value as any })}
                    className={inputClass}
                  >
                    <option value="employee_schedule">Реальный график сотрудника в месяце</option>
                    <option value="custom_21">Фиксированно 21 рабочий день в месяце</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold block">Описание для сотрудников (видно всем)</label>
                <textarea
                  rows={2}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Краткое пояснение, как считается оклад, переработки и премии по сменам..."
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_template}
                  onChange={(e) => setForm({ ...form, is_template: e.target.checked })}
                  className="w-4 h-4 accent-amber-500"
                />
                <span>Сохранить как шаблон (можно применять к разным сотрудникам и должностям)</span>
              </label>

              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                <div className="text-sm font-bold">Кому начисляется этот калькулятор:</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'employees', label: 'Конкретным сотрудникам' },
                    { id: 'positions', label: 'По должностям' },
                    { id: 'departments', label: 'По отделам' },
                    { id: 'company', label: 'Всей компании' }
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setForm({ ...form, target_scope: sc.id as any })}
                      className={`px-3 py-1.5 rounded-xl border text-sm font-semibold cursor-pointer ${
                        form.target_scope === sc.id
                          ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300'
                          : isDark
                          ? 'border-amber-400/30 text-amber-100'
                          : 'border-amber-900/30 text-amber-950'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>

                {form.target_scope === 'employees' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {employees.map((emp) => {
                      const active = form.target_employee_ids.includes(String(emp.id));
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              target_employee_ids: toggleArrayValue(form.target_employee_ids, String(emp.id))
                            })
                          }
                          className={`px-3 py-1.5 rounded-xl border text-sm cursor-pointer ${
                            active
                              ? 'border-[#F4EE8E] bg-amber-400/25 font-bold'
                              : isDark
                              ? 'border-amber-400/25 opacity-80'
                              : 'border-amber-900/25 opacity-85'
                          }`}
                        >
                          {emp.name} {emp.position ? `(${emp.position})` : ''}
                        </button>
                      );
                    })}
                  </div>
                )}

                {form.target_scope === 'positions' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {uniquePositions.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, target_positions: toggleArrayValue(form.target_positions, pos) })
                        }
                        className={`px-3 py-1.5 rounded-xl border text-sm cursor-pointer ${
                          form.target_positions.includes(pos)
                            ? 'border-[#F4EE8E] bg-amber-400/25 font-bold'
                            : 'border-amber-500/25 opacity-85'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                )}

                {form.target_scope === 'departments' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {departments.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            target_department_ids: toggleArrayValue(form.target_department_ids, String(dep.id))
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl border text-sm cursor-pointer ${
                          form.target_department_ids.includes(String(dep.id))
                            ? 'border-[#F4EE8E] bg-amber-400/25 font-bold'
                            : 'border-amber-500/25 opacity-85'
                        }`}
                      >
                        {dep.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                <div className="text-sm font-bold">Привязка к отчетам ИИ-Рапорта:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold block">Вечерний / итоговый отчет</label>
                    <select
                      value={form.evening_report_template_id || ''}
                      onChange={(e) => setForm({ ...form, evening_report_template_id: e.target.value || null })}
                      className={inputClass}
                    >
                      <option value="">Любой итоговый отчет</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold block">Утренний отчет (отметка начала смены)</label>
                    <select
                      value={form.morning_report_template_id || ''}
                      onChange={(e) => setForm({ ...form, morning_report_template_id: e.target.value || null })}
                      className={inputClass}
                    >
                      <option value="">Не выбран</option>
                      {morningTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {missingMorningForTimeMode && (
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'border-amber-400/75 bg-transparent' : 'border-amber-900/60 bg-amber-100/40'}`}>
                    <div className="flex items-start gap-2 text-sm font-bold">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <span>
                        Без утреннего отчета привязка оклада ко времени работы запрещена. Создайте шаблон утреннего отчета или переключите проверку на числовые нормы.
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isCreatingMorning}
                      onClick={handleQuickCreateMorningTemplate}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300 cursor-pointer flex items-center gap-2"
                    >
                      {isCreatingMorning ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                      <span>Создать шаблон «Утренний рапорт» и привязать сейчас</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'fixed' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold block">Режим расчета оклада</label>
                  <select
                    value={form.fixed_config.salary_mode}
                    onChange={(e) =>
                      setForm({ ...form, fixed_config: { ...form.fixed_config, salary_mode: e.target.value as any } })
                    }
                    className={inputClass}
                  >
                    <option value="monthly_divided">Оклад за месяц / количество рабочих смен в месяце</option>
                    <option value="per_shift">Фиксированная сумма за каждую смену</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold block">
                    {form.fixed_config.salary_mode === 'per_shift' ? 'Фиксированная оплата за смену (₽)' : 'Месячный оклад (₽)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.fixed_config.base_amount}
                    onChange={(e) =>
                      setForm({ ...form, fixed_config: { ...form.fixed_config, base_amount: Number(e.target.value || 0) } })
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold block">Основной % от базовой ставки оклада</label>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={form.fixed_config.base_percent}
                    onChange={(e) =>
                      setForm({ ...form, fixed_config: { ...form.fixed_config, base_percent: Number(e.target.value || 0) } })
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold block">Критерий проверки выполнения оклада</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, fixed_config: { ...form.fixed_config, verification_mode: 'time' } })
                      }
                      className={`p-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        form.fixed_config.verification_mode === 'time'
                          ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300'
                          : isDark ? 'border-amber-400/30 text-amber-100' : 'border-amber-900/30 text-amber-950'
                      }`}
                    >
                      <Clock size={16} />
                      <span>Время работы</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, fixed_config: { ...form.fixed_config, verification_mode: 'numeric_norm' } })
                      }
                      className={`p-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        form.fixed_config.verification_mode === 'numeric_norm'
                          ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300'
                          : isDark ? 'border-amber-400/30 text-amber-100' : 'border-amber-900/30 text-amber-950'
                      }`}
                    >
                      <Hash size={16} />
                      <span>Числовая норма</span>
                    </button>
                  </div>
                </div>
              </div>

              {form.fixed_config.verification_mode === 'numeric_norm' && (
                <div className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-4 ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold block">Числовое поле нормы из вечернего отчета</label>
                    <select
                      value={form.fixed_config.numeric_norm_field_id || ''}
                      onChange={(e) =>
                        setForm({ ...form, fixed_config: { ...form.fixed_config, numeric_norm_field_id: e.target.value } })
                      }
                      className={inputClass}
                    >
                      <option value="">Выберите поле...</option>
                      {eveningNumberFields.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold block">Обязательная норма за смену (число)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.fixed_config.numeric_norm_target || 10}
                      onChange={(e) =>
                        setForm({ ...form, fixed_config: { ...form.fixed_config, numeric_norm_target: Number(e.target.value || 1) } })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                  <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.fixed_config.overtime_enabled}
                      onChange={(e) =>
                        setForm({ ...form, fixed_config: { ...form.fixed_config, overtime_enabled: e.target.checked } })
                      }
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span>Доплата за переработки</span>
                  </label>
                  {form.fixed_config.overtime_enabled && (
                    <div className="space-y-2.5">
                      <select
                        value={form.fixed_config.overtime_unit}
                        onChange={(e) =>
                          setForm({ ...form, fixed_config: { ...form.fixed_config, overtime_unit: e.target.value as any } })
                        }
                        className={inputClass}
                      >
                        <option value="percent_rate">+ % к часовой ставке за переработанное время</option>
                        <option value="fixed_hour">Фиксированно ₽ за каждый час переработки</option>
                        <option value="fixed_shift">Фиксированный бонус ₽ за факт переработки</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={form.fixed_config.overtime_value}
                        onChange={(e) =>
                          setForm({ ...form, fixed_config: { ...form.fixed_config, overtime_value: Number(e.target.value || 0) } })
                        }
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>

                <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-amber-400/35' : 'border-amber-900/30'}`}>
                  <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.fixed_config.undertime_enabled}
                      onChange={(e) =>
                        setForm({ ...form, fixed_config: { ...form.fixed_config, undertime_enabled: e.target.checked } })
                      }
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span>Вычет (отчисление) за недоработки</span>
                  </label>
                  {form.fixed_config.undertime_enabled && (
                    <div className="space-y-2.5">
                      <select
                        value={form.fixed_config.undertime_unit}
                        onChange={(e) =>
                          setForm({ ...form, fixed_config: { ...form.fixed_config, undertime_unit: e.target.value as any } })
                        }
                        className={inputClass}
                      >
                        <option value="fixed_hour">Удержание ₽ за каждый час недоработки</option>
                        <option value="percent_rate">Штраф % к часовой ставке</option>
                        <option value="fixed_shift">Фиксированный вычет ₽ за смену с недоработкой</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={form.fixed_config.undertime_value}
                        onChange={(e) =>
                          setForm({ ...form, fixed_config: { ...form.fixed_config, undertime_value: Number(e.target.value || 0) } })
                        }
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'kpi' && (
            <EditorKpiTab
              form={form}
              setForm={setForm}
              selectedEveningTpl={selectedEveningTpl}
              eveningNumberFields={eveningNumberFields}
              morningNumberFields={morningNumberFields}
              newNumberFieldName={newNumberFieldName}
              setNewNumberFieldName={setNewNumberFieldName}
              isAddingKpiField={isAddingKpiField}
              onAddNumberFieldToEvening={handleAddNumberFieldToEvening}
              inputClass={inputClass}
              isDark={isDark}
            />
          )}

          {section === 'simulator' && (
            <EditorSimulatorTab
              form={form}
              simHours={simHours}
              setSimHours={setSimHours}
              simHasMorning={simHasMorning}
              setSimHasMorning={setSimHasMorning}
              simAnswers={simAnswers}
              setSimAnswers={setSimAnswers}
              simResult={simResult}
              isSimulating={isSimulating}
              onRunSimulation={handleRunSimulation}
              inputClass={inputClass}
              isDark={isDark}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-amber-500/25 flex flex-col-reverse sm:flex-row justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer ${
              isDark ? 'border-amber-400/35 text-amber-100' : 'border-amber-900/35 text-amber-950'
            }`}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300/80 hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            <span>{isSaving ? 'Сохранение...' : 'Сохранить калькулятор в БД'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

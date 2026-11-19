import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Archive, ArrowRightLeft, AlertTriangle, X, Users, History } from 'lucide-react';
import { MotivationCalculator, formatRub } from './types';

interface DeleteCascadeProps {
  isOpen: boolean;
  calculator: MotivationCalculator | null;
  allCalculators: MotivationCalculator[];
  onClose: () => void;
  onDeleted: (message: string) => void;
  theme: 'dark' | 'light';
}

export const MotivationDeleteCascadeModal: React.FC<DeleteCascadeProps> = ({
  isOpen,
  calculator,
  allCalculators,
  onClose,
  onDeleted,
  theme
}) => {
  const isDark = theme === 'dark';
  const [deps, setDeps] = useState<{
    activeEmployeesCount: number;
    activePositionsCount: number;
    activeDepartmentsCount: number;
    accrualsCount: number;
    accrualsTotalRub: number;
  } | null>(null);
  const [mode, setMode] = useState<'archive' | 'reassign' | 'cascade_full'>('archive');
  const [replacementId, setReplacementId] = useState<string>('');
  const [deleteAccruals, setDeleteAccruals] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const alternatives = allCalculators.filter((c) => calculator && c.id !== calculator.id && !c.is_archived);

  useEffect(() => {
    if (!isOpen || !calculator?.id) return;
    setErrorMsg('');
    setMode('archive');
    setDeleteAccruals(false);
    setReplacementId(alternatives[0]?.id || '');

    fetch(`/api/motivation/calculators/${encodeURIComponent(calculator.id)}/dependencies`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setDeps(data);
        }
      })
      .catch(() => {});
  }, [isOpen, calculator?.id]);

  if (!isOpen || !calculator || typeof document === 'undefined') return null;

  const handleConfirm = async () => {
    if (mode === 'reassign' && !replacementId) {
      setErrorMsg('Выберите шаблон, на который нужно перевести сотрудников.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/motivation/calculators/${encodeURIComponent(calculator.id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          replacementCalculatorId: mode === 'reassign' ? replacementId : undefined,
          deleteAccruals: mode === 'cascade_full' ? deleteAccruals : false
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось выполнить удаление');
      }
      onDeleted(data.message || 'Калькулятор обработан');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ошибка при каскадном удалении');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-3 sm:p-5 bg-transparent backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 space-y-4 backdrop-blur-xl ${
          isDark
            ? 'bg-[#1A0F02]/88 border-amber-400/50 text-amber-50 shadow-[0_0_35px_rgba(244,238,142,0.28)]'
            : 'bg-[#FFFBF5]/95 border-amber-900/45 text-amber-950 shadow-2xl'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-amber-500/25 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={22} className={isDark ? 'text-[#F4EE8E] shrink-0' : 'text-amber-800 shrink-0'} />
            <h3 className="text-lg font-bold break-words">
              Удаление калькулятора «{calculator.title}»
            </h3>
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

        {/* Dependency Inspection Summary */}
        <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'border-amber-400/30 bg-transparent' : 'border-amber-800/30 bg-transparent'}`}>
          <div className={`text-sm font-semibold ${isDark ? 'text-[#E7C768]' : 'text-amber-900'}`}>
            Связанные объекты в базе данных:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Users size={16} className="shrink-0" />
              <span>
                Сотрудников: <strong>{deps?.activeEmployeesCount ?? calculator.target_employee_ids.length}</strong>, должностей: <strong>{deps?.activePositionsCount ?? calculator.target_positions.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <History size={16} className="shrink-0" />
              <span>
                Начислений: <strong>{deps?.accrualsCount ?? calculator.accruals_count ?? 0}</strong> ({formatRub(deps?.accrualsTotalRub ?? calculator.accruals_total_rub ?? 0)})
              </span>
            </div>
          </div>
        </div>

        {/* Cascade Modes */}
        <div className="space-y-2.5">
          <div className="text-sm font-bold">Выберите способ каскадной обработки:</div>

          <button
            type="button"
            onClick={() => setMode('archive')}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
              mode === 'archive'
                ? isDark
                  ? 'border-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.2)]'
                  : 'border-amber-900 bg-amber-100/40'
                : isDark
                ? 'border-amber-400/30 hover:border-amber-400/60'
                : 'border-amber-800/25 hover:border-amber-800/60'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <Archive size={17} />
              <span>1. Архивировать и отвязать сотрудников (безопасно)</span>
            </div>
            <p className="text-sm opacity-85">
              Шаблон убирается из активного списка, сотрудники отвязываются с сегодняшнего дня, а вся история начислений сохраняется со снапшотом формул.
            </p>
          </button>

          <button
            type="button"
            disabled={alternatives.length === 0}
            onClick={() => setMode('reassign')}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 disabled:opacity-45 ${
              mode === 'reassign'
                ? isDark
                  ? 'border-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.2)]'
                  : 'border-amber-900 bg-amber-100/40'
                : isDark
                ? 'border-amber-400/30 hover:border-amber-400/60'
                : 'border-amber-800/25 hover:border-amber-800/60'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <ArrowRightLeft size={17} />
              <span>2. Перевести сотрудников на другой шаблон и удалить этот</span>
            </div>
            <p className="text-sm opacity-85">
              Все привязанные сотрудники, должности и отделы автоматически перейдут на выбранный ниже калькулятор без разрыва расчетов.
            </p>
          </button>

          {mode === 'reassign' && alternatives.length > 0 && (
            <div className="pl-2 space-y-1.5">
              <label className="text-sm font-semibold block">Замещающий калькулятор:</label>
              <select
                value={replacementId}
                onChange={(e) => setReplacementId(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-sm font-medium ${
                  isDark
                    ? 'bg-[#140A01]/90 border-amber-400/40 text-amber-50'
                    : 'bg-[#FFFBF5] border-amber-900/40 text-amber-950'
                }`}
              >
                {alternatives.map((alt) => (
                  <option key={alt.id} value={alt.id}>
                    {alt.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('cascade_full')}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1 ${
              mode === 'cascade_full'
                ? isDark
                  ? 'border-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.2)]'
                  : 'border-amber-900 bg-amber-100/40'
                : isDark
                ? 'border-amber-400/30 hover:border-amber-400/60'
                : 'border-amber-800/25 hover:border-amber-800/60'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <Trash2 size={17} />
              <span>3. Полное удаление схемы и активных привязок</span>
            </div>
            <p className="text-sm opacity-85">
              Удаляет шаблон и все активные назначения. Прошлые начисления по умолчанию сохраняются, либо могут быть удалены каскадно.
            </p>
          </button>

          {mode === 'cascade_full' && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={deleteAccruals}
                onChange={(e) => setDeleteAccruals(e.target.checked)}
                className="mt-1 w-4 h-4 accent-amber-500"
              />
              <span>Также каскадно удалить все исторические записи начислений по этому калькулятору (необратимо)</span>
            </label>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-400/50 text-sm font-medium text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
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
            disabled={isLoading}
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300/80 hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Выполняю...' : 'Подтвердить действие'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

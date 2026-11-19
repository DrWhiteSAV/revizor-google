import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { UserProfile } from '../../types';
import { MotivationCalculator } from '../../components/motivation/types';

interface ApplyModalProps {
  applyTarget: MotivationCalculator | null;
  onClose: () => void;
  allEmployees: UserProfile[];
  uniquePositions: string[];
  applyEmpIds: string[];
  setApplyEmpIds: React.Dispatch<React.SetStateAction<string[]>>;
  applyPositions: string[];
  setApplyPositions: React.Dispatch<React.SetStateAction<string[]>>;
  isApplying: boolean;
  onSubmit: () => void;
  isDark: boolean;
  mutedText: string;
}

export const MotivationApplyModal: React.FC<ApplyModalProps> = ({
  applyTarget,
  onClose,
  allEmployees,
  uniquePositions,
  applyEmpIds,
  setApplyEmpIds,
  applyPositions,
  setApplyPositions,
  isApplying,
  onSubmit,
  isDark,
  mutedText
}) => {
  if (!applyTarget || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-3 sm:p-5 bg-transparent backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 space-y-4 backdrop-blur-xl ${
          isDark
            ? 'bg-[#1A0F02]/90 border-amber-400/50 text-amber-50 shadow-[0_0_35px_rgba(244,238,142,0.28)]'
            : 'bg-[#FFFBF5]/95 border-amber-900/45 text-amber-950 shadow-2xl'
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-amber-500/25 pb-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold break-words">Назначить шаблон «{applyTarget.title}»</h3>
            <p className={`text-sm ${mutedText}`}>Выберите сотрудников или должности, к которым применится эта схема.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-bold">Сотрудники:</div>
          <div className="flex flex-wrap gap-2">
            {allEmployees.map((emp) => {
              const active = applyEmpIds.includes(String(emp.id));
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() =>
                    setApplyEmpIds((prev) =>
                      prev.includes(String(emp.id))
                        ? prev.filter((x) => x !== String(emp.id))
                        : [...prev, String(emp.id)]
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl border text-sm cursor-pointer ${
                    active ? 'border-[#F4EE8E] bg-amber-400/25 font-bold' : 'border-amber-500/30'
                  }`}
                >
                  {emp.name}
                </button>
              );
            })}
          </div>

          {uniquePositions.length > 0 && (
            <>
              <div className="text-sm font-bold pt-1">Или должности:</div>
              <div className="flex flex-wrap gap-2">
                {uniquePositions.map((pos) => {
                  const active = applyPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() =>
                        setApplyPositions((prev) =>
                          prev.includes(pos) ? prev.filter((x) => x !== pos) : [...prev, pos]
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl border text-sm cursor-pointer ${
                        active ? 'border-[#F4EE8E] bg-amber-400/25 font-bold' : 'border-amber-500/30'
                      }`}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-amber-500/35 text-sm font-semibold cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={isApplying || (applyEmpIds.length === 0 && applyPositions.length === 0)}
            onClick={onSubmit}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-sm border border-amber-300 disabled:opacity-50 cursor-pointer"
          >
            {isApplying ? 'Назначение...' : 'Применить шаблон'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

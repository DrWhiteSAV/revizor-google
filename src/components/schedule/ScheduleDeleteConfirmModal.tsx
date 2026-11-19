import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { EmployeeSchedule } from './types';

interface ScheduleDeleteConfirmModalProps {
  scheduleToDelete: EmployeeSchedule | null;
  onClose: () => void;
  onConfirm: () => void;
  isLightTheme: boolean;
}

export const ScheduleDeleteConfirmModal: React.FC<ScheduleDeleteConfirmModalProps> = ({
  scheduleToDelete,
  onClose,
  onConfirm,
  isLightTheme
}) => {
  if (!scheduleToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4 ${
        isLightTheme ? 'bg-[#FFFBF5] border-amber-400 text-zinc-900' : 'bg-[#1A0F02] border-amber-500/40 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 border border-amber-500/30">
            <Trash2 size={20} />
          </span>
          <div>
            <h3 className="text-base font-black">
              Удалить график сотрудника?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {scheduleToDelete.name} ({scheduleToDelete.role})
            </p>
          </div>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Смены сотрудника будут сброшены к стандартным выходным дням в базе данных. Вы сможете в любой момент применить новый шаблон или назначить график заново.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-2xl border text-sm font-bold cursor-pointer transition-all ${
              isLightTheme ? 'border-amber-300 hover:bg-amber-100/50 text-zinc-800' : 'border-white/20 hover:bg-white/10 text-zinc-300'
            }`}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-sm font-black shadow-md cursor-pointer transition-all"
          >
            Подтвердить сброс
          </button>
        </div>
      </div>
    </div>
  );
};

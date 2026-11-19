import React from 'react';
import { CheckSquare, X, ShieldCheck, Clock, Check, AlertCircle } from 'lucide-react';
import { TaskDetailData } from '../cards/CabinetTaskCardsPage';

interface TaskCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDetailData;
  isDark?: boolean;
}

export const TaskCriteriaModal: React.FC<TaskCriteriaModalProps> = ({
  isOpen,
  onClose,
  task,
  isDark = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className={`w-full max-w-lg rounded-3xl border p-5 sm:p-6 shadow-2xl transition-all ${
        isDark
          ? 'bg-[#1A0F02]/95 border-[#E7C768]/50 text-[#F4EE8E] shadow-[0_0_40px_rgba(244,238,142,0.2)]'
          : 'bg-[#FAF6EC]/95 border-[#B8860B]/40 text-amber-950 shadow-2xl'
      }`}>
        <div className="flex items-center justify-between border-b pb-3 mb-4 border-amber-500/20">
          <div className="flex items-center gap-2">
            <CheckSquare size={20} className="text-[#E7C768]" />
            <h3 className="text-base sm:text-lg font-bold text-[#E7C768]">
              Критерии проверки и регламент задачи
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin text-xs sm:text-sm">
          {/* Title and Project */}
          <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-xs opacity-75 block">Задача:</span>
            <div className="font-bold text-[#E7C768] text-sm sm:text-base">{task.taskTitle}</div>
            <div className="text-xs opacity-75 mt-0.5">Проект: {task.projectTitle}</div>
          </div>

          {/* Regulations */}
          <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E7C768] block">
              Регламент и описание:
            </span>
            <p className="text-xs leading-relaxed opacity-85">
              {task.description || 'Выполнить все обязательные этапы задачи и предоставить подтверждающие материалы по всем карточкам.'}
            </p>
          </div>

          {/* AI Check Criteria */}
          <div className="p-3.5 rounded-2xl border border-amber-400/30 bg-amber-500/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E7C768]">
              <ShieldCheck size={16} />
              <span>Критерии оценки ИИ-Ревизора:</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {task.checkCriteria || 'Оценивать полноту выполнения поставленной задачи по шкале 1-100. Проверять соответствие предоставленных отчетов и скриншотов регламенту, снижать баллы за пропущенные обязательные поля и размытые ответы.'}
            </p>
          </div>

          {/* Required Fields Count */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <span className="opacity-75 block">Карточек для сдачи:</span>
              <span className="font-bold text-[#E7C768]">{task.fields.length} шт.</span>
            </div>
            <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <span className="opacity-75 block">Срок выполнения:</span>
              <span className="font-bold text-[#E7C768]">{task.deadlineDays} дн.</span>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-amber-500/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs sm:text-sm font-bold hover:brightness-105 cursor-pointer shadow-sm"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCriteriaModal;

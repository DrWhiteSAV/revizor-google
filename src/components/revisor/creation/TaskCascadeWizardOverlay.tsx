import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Check, AlertTriangle, RefreshCw, X, FileText, Image as ImageIcon, Mic, BarChart2, Sparkles, Layers } from 'lucide-react';

export interface TaskCascadeStep {
  id: string;
  type: 'voice' | 'doc' | 'image' | 'final' | 'criteria';
  fieldLabel?: string;
  title: string;
  subtitle: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
  resultText?: string;
  errorReason?: string;
}

interface TaskCascadeWizardOverlayProps {
  isOpen: boolean;
  isLightTheme?: boolean;
  steps: TaskCascadeStep[];
  currentStepIndex: number;
  totalSteps: number;
  overallStatus: 'idle' | 'running' | 'completed' | 'error';
  errorMessage?: string | null;
  onRetry?: () => void;
  onClose?: () => void;
  onCancel?: () => void;
  taskTitle?: string;
}

export const TaskCascadeWizardOverlay: React.FC<TaskCascadeWizardOverlayProps> = ({
  isOpen,
  isLightTheme = false,
  steps,
  currentStepIndex,
  totalSteps,
  overallStatus,
  errorMessage,
  onRetry,
  onClose,
  onCancel,
  taskTitle
}) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isOpen && overallStatus === 'running') {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isOpen) {
      setSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, overallStatus]);

  if (!isOpen || overallStatus === 'idle' || typeof document === 'undefined') return null;

  const progressPercent = totalSteps > 0 
    ? Math.min(100, Math.round(((currentStepIndex + (overallStatus === 'completed' ? 1 : 0.5)) / totalSteps) * 100))
    : 0;

  const isDark = !isLightTheme;

  return createPortal(
    <div className={`fixed inset-0 z-[9996] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md animate-fade-in ${
      isDark ? 'bg-[#140A01]/70 text-[#F4EE8E]' : 'bg-[#FAF6EC]/75 text-amber-950'
    }`}>
      <div className={`w-full max-w-lg max-h-[92vh] rounded-3xl p-6 sm:p-7 border shadow-2xl flex flex-col items-center text-center relative overflow-hidden transition-all backdrop-blur-xl ${
        isDark
          ? 'bg-[#1A0F02]/85 border-[#E7C768]/50 shadow-[0_0_40px_rgba(244,238,142,0.25)]'
          : 'bg-[#FFFBF5]/90 border-[#B8860B]/40 shadow-2xl'
      }`}>
        {/* Glow accent */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-2xl pointer-events-none opacity-40 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41]" />

        {/* Top Close / Cancel button */}
        {overallStatus !== 'running' && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        )}

        {/* Icon Header */}
        <div className="relative mb-4 mt-2">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-gradient-to-tr from-[#E7C768]/30 via-[#F4EE8E]/40 to-[#D99E41]/30 border border-[#E7C768] shadow-lg">
            {overallStatus === 'completed' ? (
              <Check className="w-8 h-8 text-[#E7C768]" />
            ) : overallStatus === 'error' ? (
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            ) : (
              <Sparkles className="w-8 h-8 text-[#E7C768] animate-spin-slow" />
            )}
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-bold mb-1 text-[#E7C768]">
          {overallStatus === 'completed' 
            ? 'Каскадная проверка успешно завершена' 
            : overallStatus === 'error' 
            ? 'Ошибка каскадной проверки' 
            : 'Каскадный ход постановки и проверки задачи'}
        </h3>

        {taskTitle && (
          <p className="text-sm opacity-80 mb-3 line-clamp-1 font-medium">
            {taskTitle}
          </p>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-amber-500/15 rounded-full h-3 mb-2 overflow-hidden border border-amber-500/30">
          <div
            className="h-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-sm opacity-85 font-mono mb-4">
          <span>Шаг {Math.min(currentStepIndex + 1, totalSteps)} из {totalSteps}</span>
          <span>{seconds} сек</span>
        </div>

        {/* Cascade steps list */}
        <div className="w-full max-h-56 overflow-y-auto space-y-2 mb-5 text-left border-t border-b py-3 border-amber-500/20">
          {steps.map((st, idx) => (
            <div
              key={st.id}
              className={`p-3 rounded-xl border text-sm flex items-center justify-between gap-2 transition-all ${
                st.status === 'running'
                  ? 'bg-amber-500/20 border-[#E7C768] shadow-sm'
                  : st.status === 'completed'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'border-amber-500/10 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="shrink-0">
                  {st.status === 'running' ? (
                    <RefreshCw size={15} className="animate-spin text-[#E7C768]" />
                  ) : st.status === 'completed' ? (
                    <Check size={15} className="text-[#E7C768]" />
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-amber-500/40 flex items-center justify-center text-sm">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm">{st.title}</div>
                  <div className="text-sm opacity-80">{st.subtitle}</div>
                </div>
              </div>

              {st.status === 'completed' && (
                <span className="text-sm font-bold text-[#E7C768]">Готово</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        {overallStatus === 'completed' && onClose && (
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm hover:brightness-105 cursor-pointer shadow-md"
          >
            Принять и продолжить
          </button>
        )}

        {overallStatus === 'error' && onRetry && (
          <div className="flex items-center gap-3 w-full">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-3 rounded-xl border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/10 cursor-pointer"
              >
                Отмена
              </button>
            )}
            <button
              onClick={onRetry}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm hover:brightness-105 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              <span>Повторить</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

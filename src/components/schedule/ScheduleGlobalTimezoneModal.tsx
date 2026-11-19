import React, { useState } from 'react';
import { Globe, X, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { TIMEZONES_LIST } from './types';

interface ScheduleGlobalTimezoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  globalTimezone: string;
  onSelectTimezone?: (tz: string) => void;
  onSave?: (tz: string) => void;
  isLightTheme: boolean;
  canEdit?: boolean;
}

export const ScheduleGlobalTimezoneModal: React.FC<ScheduleGlobalTimezoneModalProps> = ({
  isOpen,
  onClose,
  globalTimezone,
  onSelectTimezone,
  onSave,
  isLightTheme,
  canEdit = true
}) => {
  const [selectedTz, setSelectedTz] = useState(globalTimezone);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleApply = (tzId: string) => {
    setSelectedTz(tzId);
    if (onSelectTimezone) onSelectTimezone(tzId);
    if (onSave) onSave(tzId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
        isLightTheme ? 'bg-[#FFFBF5] border-amber-400 text-zinc-900' : 'bg-[#1A0F02] border-amber-500/40 text-white'
      }`}>
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isLightTheme ? 'bg-amber-100/60 border-amber-300' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-md">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                Основной часовой пояс компании
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                Единый стандарт времени для расписания смен и учета выработки
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl cursor-pointer transition-colors text-zinc-600 dark:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {TIMEZONES_LIST.map(tz => {
            const isSelected = selectedTz === tz.id || globalTimezone === tz.id;
            return (
              <button
                key={tz.id}
                type="button"
                onClick={() => handleApply(tz.id)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? (isLightTheme ? 'bg-amber-200/90 border-2 border-amber-500 text-amber-950 font-black shadow-sm' : 'bg-amber-500/20 border-2 border-amber-400 text-white font-black')
                    : (isLightTheme ? 'bg-white border-amber-200 text-zinc-800 hover:bg-amber-50 font-medium' : 'bg-transparent border-white/10 text-zinc-300 hover:bg-white/5 font-medium')
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm">{tz.label}</span>
                </div>
                {isSelected && (
                  <CheckCircle2 size={18} className="text-amber-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className={`p-4 border-t flex items-center justify-between gap-3 ${
          isLightTheme ? 'bg-amber-50 border-amber-200' : 'bg-white/5 border-white/10'
        }`}>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-500" />
            <span>Сохраняется в базе данных</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-transparent border border-amber-500/30 text-xs font-bold hover:bg-amber-500/10 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => handleApply(selectedTz)}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs font-black cursor-pointer hover:brightness-105 active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Сохранить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

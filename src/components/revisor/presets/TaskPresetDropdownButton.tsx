import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, ChevronDown, Plus, Sparkles, SlidersHorizontal, Check } from 'lucide-react';
import { TaskPresetItem } from './TaskPersonalPresetsModal';

interface TaskPresetDropdownButtonProps {
  presets: TaskPresetItem[];
  onApplyPreset: (preset: TaskPresetItem) => void;
  onOpenModal: () => void;
  isDark?: boolean;
}

export const TaskPresetDropdownButton: React.FC<TaskPresetDropdownButtonProps> = ({
  presets,
  onApplyPreset,
  onOpenModal,
  isDark = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (preset: TaskPresetItem) => {
    onApplyPreset(preset);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button with Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
          isOpen
            ? 'bg-amber-500/30 border-amber-300 text-[#F4EE8E]'
            : !isDark
              ? 'bg-[#FFFBF5]/90 border-amber-400/80 text-amber-950 hover:bg-amber-100/80'
              : 'border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/30 text-[#F4EE8E]'
        }`}
        title="Личные шаблоны задачи сотрудника"
      >
        <Bookmark size={16} className={!isDark ? 'text-amber-800' : 'text-[#E7C768]'} />
        <span className="hidden sm:inline">Шаблон</span>
        {presets.length > 0 && (
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
            !isDark
              ? 'bg-amber-200 border-amber-400 text-amber-950'
              : 'bg-amber-400/25 border-amber-400/40 text-[#F4EE8E]'
          }`}>
            {presets.length}
          </span>
        )}
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
            !isDark ? 'text-amber-800' : 'text-amber-300'
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col p-2 space-y-1.5 ${
              !isDark
                ? 'bg-[#FFFBF5]/95 border-amber-400/80 text-amber-950 shadow-[0_10px_35px_rgba(217,158,65,0.25)]'
                : 'bg-[#1A0F02]/95 border-amber-400/40 text-[#F4EE8E] shadow-[0_0_35px_rgba(244,238,142,0.25)]'
            }`}
          >
            {/* Header */}
            <div className={`px-3 py-2 border-b flex items-center justify-between ${
              !isDark ? 'border-amber-200' : 'border-amber-400/20'
            }`}>
              <div className="flex items-center gap-1.5">
                <Bookmark size={15} className="text-[#E7C768]" />
                <span className="text-sm font-bold">Личные шаблоны</span>
              </div>
              <span className="text-xs opacity-75 font-mono">
                {presets.length} {presets.length === 1 ? 'шаблон' : presets.length < 5 ? 'шаблона' : 'шаблонов'}
              </span>
            </div>

            {/* Presets List */}
            <div className="max-h-56 overflow-y-auto space-y-1 py-1 px-0.5">
              {presets.length === 0 ? (
                <div className={`p-4 text-center rounded-xl border text-sm opacity-80 ${
                  !isDark ? 'border-amber-200 bg-amber-50/50' : 'border-amber-400/20 bg-amber-950/20'
                }`}>
                  <p className="font-medium">Нет сохраненных шаблонов</p>
                  <p className="text-xs opacity-75 mt-1">
                    Сохраните текущее заполнение карточек как шаблон для быстрой вставки в следующий раз.
                  </p>
                </div>
              ) : (
                presets.map((preset) => {
                  const filledCount = Object.values(preset.answers || {}).filter(v => {
                    if (v === null || v === undefined || v === '') return false;
                    if (Array.isArray(v) && v.length === 0) return false;
                    return true;
                  }).length;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelect(preset)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                        !isDark
                          ? 'border-amber-200 bg-white/70 hover:bg-amber-100/70 hover:border-amber-400'
                          : 'border-amber-400/20 bg-amber-950/15 hover:bg-amber-500/20 hover:border-amber-400/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold truncate ${
                          !isDark ? 'text-amber-950' : 'text-[#F4EE8E]'
                        }`}>
                          {preset.title}
                        </div>
                        <div className="text-xs opacity-75 truncate mt-0.5">
                          {preset.createdAt || 'Недавно'} • {filledCount} {filledCount === 1 ? 'поле' : filledCount < 5 ? 'поля' : 'полей'}
                        </div>
                      </div>
                      <div className={`p-1.5 rounded-lg border shrink-0 ${
                        !isDark ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-amber-500/15 border-amber-400/30 text-[#E7C768]'
                      }`}>
                        <Check size={13} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Actions Footer */}
            <div className={`pt-2 border-t space-y-1.5 ${
              !isDark ? 'border-amber-200' : 'border-amber-400/20'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenModal();
                }}
                className={`w-full py-2 px-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isDark
                    ? 'border-amber-400 bg-gradient-to-r from-amber-200 to-amber-300 text-amber-950 hover:brightness-105'
                    : 'border-amber-400/40 bg-gradient-to-r from-amber-500/25 to-amber-600/25 text-[#F4EE8E] hover:bg-amber-500/35'
                }`}
              >
                <Plus size={15} className="text-[#E7C768]" />
                <span>Сохранить текущие как шаблон</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenModal();
                }}
                className={`w-full py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isDark
                    ? 'border-transparent text-amber-900 hover:bg-amber-100'
                    : 'border-transparent text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-200'
                }`}
              >
                <SlidersHorizontal size={13} />
                <span>Менеджер всех личных шаблонов</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

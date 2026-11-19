import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, Save, X, Trash2, Check, Sparkles } from 'lucide-react';

export interface TaskPresetItem {
  id: string;
  title: string;
  createdAt: string;
  answers: Record<string, any>;
  userId?: string;
  projectId?: string;
  taskId?: string;
}

interface TaskPersonalPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  currentTaskTitle: string;
  currentUserName: string;
  presets: TaskPresetItem[];
  onSaveCurrentAsPreset: (title: string) => Promise<void> | void;
  onApplyPreset: (preset: TaskPresetItem) => void;
  onDeletePreset: (presetId: string) => Promise<void> | void;
}

export const TaskPersonalPresetsModal: React.FC<TaskPersonalPresetsModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
  currentTaskTitle,
  currentUserName,
  presets,
  onSaveCurrentAsPreset,
  onApplyPreset,
  onDeletePreset
}) => {
  const [titleInput, setTitleInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSaveCurrentAsPreset(titleInput);
      setTitleInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-[#140A01]/75 animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            !isDark
              ? 'bg-[#FFFBF5] border-amber-400/80 text-amber-950 shadow-[0_10px_35px_rgba(217,158,65,0.2)]'
              : 'bg-[#1A0F02] border-amber-400/40 text-[#F4EE8E] shadow-[0_0_35px_rgba(244,238,142,0.25)]'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${
            !isDark ? 'border-amber-200 bg-amber-50/70' : 'border-amber-400/20 bg-amber-950/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                !isDark ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-amber-500/15 border-amber-400/30 text-[#F4EE8E]'
              }`}>
                <Bookmark size={20} className="text-[#E7C768]" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-base sm:text-lg font-bold truncate ${
                  !isDark ? 'text-amber-950' : 'text-[#F4EE8E]'
                }`}>
                  Личные шаблоны задачи
                </h3>
                <p className="text-sm opacity-75 truncate">
                  {currentUserName} • «{currentTaskTitle}»
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                !isDark
                  ? 'border-amber-300 hover:bg-amber-100 text-amber-950'
                  : 'border-amber-400/30 hover:bg-amber-500/15 text-[#F4EE8E]'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5 overflow-y-auto">
            {/* Save Current as Template Block */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              !isDark ? 'border-amber-300 bg-amber-50/60' : 'border-amber-400/30 bg-amber-950/20'
            }`}>
              <h4 className="text-sm font-bold flex items-center gap-2 text-[#E7C768]">
                <Save size={16} />
                <span>Сохранить текущие ответы как личный шаблон</span>
              </h4>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Название шаблона (например: Стандартный аудит выкладки)"
                  className={`flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                    !isDark
                      ? 'bg-white border-amber-300 text-amber-950 placeholder:text-amber-800/50 focus:border-amber-500'
                      : 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                  }}
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className={`min-h-[44px] px-5 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
                    !isDark
                      ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950 shadow-sm'
                      : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(244,238,142,0.25)] hover:brightness-105'
                  }`}
                >
                  <Save size={16} />
                  <span>{isSubmitting ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
              </div>
            </div>

            {/* Presets List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold opacity-90 flex items-center justify-between">
                <span>Сохраненные шаблоны задачи ({presets.length})</span>
              </h4>

              {presets.length === 0 ? (
                <div className={`p-6 rounded-2xl border text-center text-sm opacity-75 ${
                  !isDark ? 'border-amber-200 bg-amber-50/40' : 'border-amber-400/20 bg-amber-950/15'
                }`}>
                  У вас пока нет сохраненных шаблонов для этой задачи. Заполните карточки и нажмите кнопку «Сохранить», чтобы в один клик подставлять готовые ответы.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {presets.map((preset) => {
                    const filledCount = Object.values(preset.answers || {}).filter(v => {
                      if (v === undefined || v === null || v === '') return false;
                      if (typeof v === 'boolean') return v;
                      if (typeof v === 'string') return v.trim().length > 0;
                      return true;
                    }).length;

                    return (
                      <div
                        key={preset.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          !isDark
                            ? 'border-amber-300 bg-white hover:bg-amber-50/60 text-amber-950 shadow-sm'
                            : 'border-amber-400/30 bg-[#1A0F02] hover:bg-amber-500/10 text-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className={`font-bold text-sm truncate ${!isDark ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                            {preset.title}
                          </div>
                          <div className="text-xs opacity-75 flex items-center gap-2 mt-1">
                            <span>Создан: {preset.createdAt}</span>
                            <span>•</span>
                            <span className="text-[#E7C768] font-semibold">Полей: {filledCount}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onApplyPreset(preset)}
                            className={`px-3.5 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              !isDark
                                ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950 shadow-sm'
                                : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 border-amber-300 hover:brightness-105'
                            }`}
                          >
                            <Check size={14} />
                            <span>Применить</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePreset(preset.id)}
                            className="p-2 rounded-xl border border-amber-400/30 text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 transition-all cursor-pointer"
                            title="Удалить шаблон"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

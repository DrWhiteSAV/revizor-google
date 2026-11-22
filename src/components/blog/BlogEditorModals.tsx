import React from 'react';
import { Sparkles, Trash2, X } from 'lucide-react';
import { BlogPost } from '../../types';

interface BlogEditorModalsProps {
  isDark: boolean;
  showAiModal: boolean;
  aiTopic: string;
  aiCategory: string;
  aiKeyPoints: string;
  isAiGenerating: boolean;
  onCloseAiModal: () => void;
  onAiTopicChange: (val: string) => void;
  onAiCategoryChange: (val: string) => void;
  onAiKeyPointsChange: (val: string) => void;
  onSubmitAi: (e: React.FormEvent) => void;
  deleteTargetPost: BlogPost | null;
  isDeleting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export const BlogEditorModals: React.FC<BlogEditorModalsProps> = ({
  isDark,
  showAiModal,
  aiTopic,
  aiCategory,
  aiKeyPoints,
  isAiGenerating,
  onCloseAiModal,
  onAiTopicChange,
  onAiCategoryChange,
  onAiKeyPointsChange,
  onSubmitAi,
  deleteTargetPost,
  isDeleting,
  onCancelDelete,
  onConfirmDelete,
}) => {
  const labelColor = isDark ? 'text-[#F4EE8E]' : 'text-amber-950';
  const mutedColor = isDark ? 'text-amber-200/80' : 'text-amber-900/80';
  const inputSurface = isDark
    ? 'bg-[#1A0F02] border-amber-400/30 text-white placeholder-amber-200/40 focus:border-[#F4EE8E]'
    : 'bg-[#FAF6EC] border-amber-900/25 text-amber-950 placeholder-amber-900/45 focus:border-amber-800';

  return (
    <>
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className={`rounded-3xl border p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 ${
              isDark
                ? 'bg-[#140A01] border-amber-400/60 text-white'
                : 'bg-[#FFFBF5] border-amber-900/40 text-amber-950'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-amber-400/20' : 'border-amber-900/15'}`}>
              <div className="flex items-center gap-2.5">
                <Sparkles className={isDark ? 'text-[#F4EE8E]' : 'text-amber-800'} size={20} />
                <h3 className={`font-extrabold text-lg ${labelColor}`}>Генерация экспертной статьи</h3>
              </div>
              <button
                type="button"
                onClick={onCloseAiModal}
                className={`p-1 rounded-xl cursor-pointer ${mutedColor}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={onSubmitAi} className="space-y-4">
              <div>
                <label className={`block text-sm font-bold mb-1.5 ${labelColor}`}>Тема или заголовок статьи</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Как автоматизировать проверку отчетов"
                  value={aiTopic}
                  onChange={(e) => onAiTopicChange(e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-1.5 ${labelColor}`}>Категория публикации</label>
                <select
                  value={aiCategory}
                  onChange={(e) => onAiCategoryChange(e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                >
                  <option value="ИИ в бизнесе">ИИ в бизнесе</option>
                  <option value="Мотивация">Мотивация</option>
                  <option value="Технологии">Технологии</option>
                  <option value="Интеграции">Интеграции</option>
                  <option value="ИИ-Коучинг">ИИ-Коучинг</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-1.5 ${labelColor}`}>Ключевые тезисы (необязательно)</label>
                <textarea
                  rows={3}
                  placeholder="Укажите цифры, специфику или важные акценты..."
                  value={aiKeyPoints}
                  onChange={(e) => onAiKeyPointsChange(e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${inputSurface}`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCloseAiModal}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${mutedColor}`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isAiGenerating}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 font-extrabold text-sm rounded-xl hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg"
                >
                  <Sparkles size={16} />
                  <span>{isAiGenerating ? 'Генерация...' : 'Сгенерировать'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className={`rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4 ${
              isDark
                ? 'bg-[#140A01] border-amber-400/60 text-white'
                : 'bg-[#FFFBF5] border-amber-900/40 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Trash2 size={20} className="text-red-400" />
                <h3 className={`text-lg font-extrabold ${labelColor}`}>Удалить статью?</h3>
              </div>
              <button
                type="button"
                onClick={onCancelDelete}
                className={`p-1 rounded-xl cursor-pointer ${mutedColor}`}
              >
                <X size={18} />
              </button>
            </div>
            <p className={`text-sm leading-relaxed ${mutedColor}`}>
              Вы действительно хотите удалить публикацию «{deleteTargetPost.title}»? Это действие удалит статью из базы данных.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancelDelete}
                className={`px-4 py-2 rounded-xl border text-sm font-bold cursor-pointer ${
                  isDark
                    ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                    : 'border-amber-900/25 text-amber-950 hover:bg-amber-100'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

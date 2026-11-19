import React from 'react';
import { CheckCircle, X } from 'lucide-react';

interface CalendarSystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  settingsCompanyId: string;
  setSettingsCompanyId: (val: string) => void;
  settingsDirectorId: string;
  setSettingsDirectorId: (val: string) => void;
  greenThreshold: number;
  setGreenThreshold: (val: number) => void;
  yellowThreshold: number;
  setYellowThreshold: (val: number) => void;
  isSavingSettings: boolean;
  settingsSavedToast: boolean;
  onSave: () => void;
}

export const CalendarSystemSettingsModal: React.FC<CalendarSystemSettingsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  settingsCompanyId,
  setSettingsCompanyId,
  settingsDirectorId,
  setSettingsDirectorId,
  greenThreshold,
  setGreenThreshold,
  yellowThreshold,
  setYellowThreshold,
  isSavingSettings,
  settingsSavedToast,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      id="system-settings-modal"
    >
      <div
        className={`relative w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-t-3xl sm:rounded-3xl border shadow-2xl space-y-5 backdrop-blur-md ${
          isDark
            ? 'bg-[#1A0F02]/95 border-amber-400/50 text-amber-100 shadow-[0_0_35px_rgba(244,238,142,0.2)]'
            : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950 shadow-xl'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-3 border-b pb-3.5 ${
            isDark ? 'border-amber-400/20' : 'border-amber-900/15'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                isDark
                  ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]'
                  : 'bg-amber-100 border-amber-300 text-amber-900'
              }`}
            >
              <span className="text-xl">⚙️</span>
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Системные настройки рапортов
              </h3>
              <p className={`text-sm truncate ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                Таблица: raport_system_settings (PostgreSQL BD ProTalk)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                : 'border-amber-900/20 text-amber-950 hover:bg-amber-100'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <label className={`block font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
              ID компании (company_id)
            </label>
            <input
              type="text"
              value={settingsCompanyId}
              onChange={(e) => setSettingsCompanyId(e.target.value)}
              placeholder="flagship-main"
              className={`w-full min-h-[44px] border rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none ${
                isDark
                  ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300'
                  : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-600'
              }`}
            />
            <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
              Идентификатор вашей организации. Рапорты фильтруются строго по этому ID.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className={`block font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
              ID директора / руководителя (director_id)
            </label>
            <input
              type="text"
              value={settingsDirectorId}
              onChange={(e) => setSettingsDirectorId(e.target.value)}
              placeholder="91827364501"
              className={`w-full min-h-[44px] border rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none ${
                isDark
                  ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300'
                  : 'bg-white border-amber-900/30 text-amber-950 focus:border-amber-600'
              }`}
            />
            <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
              Системный ID руководителя для привязки прав и получения уведомлений.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className={`block font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                Золотой статус (≥ %)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={greenThreshold}
                onChange={(e) =>
                  setGreenThreshold(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))
                }
                className={`w-full min-h-[44px] border rounded-xl px-3.5 py-2.5 text-sm font-bold text-center outline-none ${
                  isDark
                    ? 'bg-[#140A01] border-amber-400/40 text-[#F4EE8E]'
                    : 'bg-white border-amber-900/30 text-amber-950'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`block font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>
                Янтарный статус (≥ %)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={yellowThreshold}
                onChange={(e) =>
                  setYellowThreshold(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))
                }
                className={`w-full min-h-[44px] border rounded-xl px-3.5 py-2.5 text-sm font-bold text-center outline-none ${
                  isDark
                    ? 'bg-[#140A01] border-amber-400/40 text-[#F4EE8E]'
                    : 'bg-white border-amber-900/30 text-amber-950'
                }`}
              />
            </div>
          </div>
        </div>

        {settingsSavedToast && (
          <div
            className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
              isDark
                ? 'bg-amber-950/40 border-amber-400/50 text-amber-200'
                : 'bg-amber-50 border-amber-400 text-amber-950'
            }`}
          >
            <CheckCircle size={18} className="text-amber-500 shrink-0" />
            <span>Настройки успешно зафиксированы в PostgreSQL BD ProTalk (raport_system_settings)</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center ${
              isDark
                ? 'border-amber-400/30 text-stone-300 hover:bg-amber-400/10'
                : 'border-amber-900/20 text-amber-950 hover:bg-amber-100'
            }`}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingSettings}
            className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isDark
                ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950'
            }`}
          >
            {isSavingSettings ? (
              <span>Сохранение...</span>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Зафиксировать в PostgreSQL BD ProTalk</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

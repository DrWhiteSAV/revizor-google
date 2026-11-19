import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Check, Save, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface SystemAdminGoogleSheetsLoggingCardProps {
  isDarkTheme: boolean;
  onSuccess?: (msg: string) => void;
}

export function SystemAdminGoogleSheetsLoggingCard({
  isDarkTheme,
  onSuccess
}: SystemAdminGoogleSheetsLoggingCardProps) {
  const defaultUrl = 'https://docs.google.com/spreadsheets/d/1Wjtso1KaGm6pdaBtk6GYhsvmjjZ3Trh9asLmc95peg4/edit?usp=sharing';

  const [enabled, setEnabled] = useState<boolean>(true);
  const [logUrl, setLogUrl] = useState<string>(defaultUrl);
  const [imageMode, setImageMode] = useState<'text' | 'visual_description'>('text');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system-admin/protalk-settings');
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.google_sheets_logging_enabled !== false);
        if (data.google_sheets_log_url) {
          setLogUrl(data.google_sheets_log_url);
        }
        if (data.image_recognition_mode) {
          setImageMode(data.image_recognition_mode === 'visual_description' ? 'visual_description' : 'text');
        }
      }
    } catch (err) {
      console.warn('Failed to load protalk settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/system-admin/protalk-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_sheets_logging_enabled: enabled,
          google_sheets_log_url: logUrl.trim() || defaultUrl,
          image_recognition_mode: imageMode
        })
      });

      if (res.ok) {
        setStatusMessage('настройки успешно сохранены');
        if (onSuccess) {
          onSuccess('настройки логирования и распознавания изображений успешно обновлены');
        }
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage('ошибка при сохранении настроек');
      }
    } catch (err) {
      setStatusMessage('ошибка сети при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setLogUrl(defaultUrl);
  };

  return (
    <div 
      className={`p-4 sm:p-6 rounded-3xl border shadow-xl space-y-4 backdrop-blur-md transition-all ${
        isDarkTheme 
          ? 'bg-[#1A0F02]/90 border-amber-400/40 text-amber-100 shadow-[0_0_25px_rgba(244,238,142,0.15)]' 
          : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-amber-500/20">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            isDarkTheme ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E]' : 'bg-amber-100 border-amber-800/30 text-amber-900'
          }`}>
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${
              isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              логирование функций в google таблицу
            </h3>
            <p className={`text-sm opacity-80 ${
              isDarkTheme ? 'text-[#E7C768]' : 'text-amber-900'
            }`}>
              управление передачей логов для функции 249 (ocr), функции 369 (документы) и будущих функций
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading}
          className={`self-start sm:self-auto p-2 rounded-xl border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
            isDarkTheme ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-800/20 text-amber-950'
          }`}
          title="обновить текущее состояние"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Toggle Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-amber-400/20 bg-amber-500/5">
          <div className="space-y-1">
            <span className={`text-sm font-bold block ${
              isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              статус отправки в google таблицу:
            </span>
            <span className={`text-sm block ${
              enabled 
                ? (isDarkTheme ? 'text-amber-300 font-semibold' : 'text-amber-800 font-semibold')
                : 'text-amber-600/80 font-medium'
            }`}>
              {enabled 
                ? 'логирование включено (запросы передаются в google spreadsheet)' 
                : 'логирование отключено (функции работают автономно, логи пишутся только в PostgreSQL BD ProTalk)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center gap-2 ${
              enabled
                ? (isDarkTheme 
                    ? 'bg-amber-400/25 border-amber-400 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.3)]' 
                    : 'bg-amber-200 border-amber-800 text-amber-950 shadow-sm')
                : (isDarkTheme
                    ? 'bg-[#140A01] border-amber-400/30 text-amber-300/70 hover:border-amber-400/50'
                    : 'bg-white border-amber-800/30 text-amber-900/70 hover:border-amber-800/50')
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
              enabled ? 'bg-amber-400 border-amber-300' : 'border-amber-500/40'
            }`}>
              {enabled && <Check size={10} className="text-stone-900 stroke-[3]" />}
            </div>
            <span>{enabled ? 'включено' : 'отключено'}</span>
          </button>
        </div>

        {/* Google Sheet URL Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className={`text-sm font-bold ${
              isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              ссылка на google таблицу для логирования:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefault}
                className={`text-xs underline hover:opacity-80 cursor-pointer ${
                  isDarkTheme ? 'text-amber-300' : 'text-amber-800'
                }`}
              >
                вернуть стандартную ссылку
              </button>
              {logUrl && (
                <a
                  href={logUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs font-semibold hover:opacity-80 ${
                    isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-900'
                  }`}
                >
                  <ExternalLink size={13} />
                  <span>открыть таблицу</span>
                </a>
              )}
            </div>
          </div>

          <input
            type="text"
            value={logUrl}
            onChange={(e) => setLogUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className={`w-full p-3.5 rounded-xl text-sm font-mono border focus:outline-none transition-all ${
              isDarkTheme
                ? 'bg-[#140A01] border-amber-400/50 text-amber-100 placeholder:text-amber-300/30 focus:border-amber-300'
                : 'bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/40 focus:border-amber-600'
            }`}
          />
        </div>

        {/* Global Image Recognition Mode Switcher */}
        <div className={`p-4 rounded-2xl border space-y-3 ${
          isDarkTheme ? 'bg-amber-400/5 border-amber-400/30' : 'bg-amber-50/60 border-amber-800/20'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className={`text-sm font-bold block ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                режим распознавания картинок по умолчанию:
              </span>
              <span className="text-xs opacity-75 block mt-0.5">
                прямой запрос в нейросеть при анализе загруженных изображений и скриншотов
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg border border-amber-400/40 font-semibold text-amber-700 dark:text-amber-300">
              {imageMode === 'visual_description' ? 'не текст (описание объектов)' : 'текст (извлечение ocr)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setImageMode('text')}
              className={`min-h-[44px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                imageMode === 'text'
                  ? (isDarkTheme ? 'bg-[#E7C768] border-amber-400 text-amber-950 font-bold shadow-md' : 'bg-amber-400 border-amber-600 text-amber-950 font-bold shadow-sm')
                  : (isDarkTheme ? 'bg-transparent border-amber-400/20 text-amber-200/70 hover:bg-white/5' : 'bg-white border-amber-200 text-zinc-700 hover:bg-amber-50')
              }`}
            >
              <span className="text-sm font-bold block">текст (ocr скриншотов)</span>
              <span className="text-xs opacity-80 block mt-0.5 leading-snug">
                вытаскивать читаемый текст, таблицы, суммы и данные документов
              </span>
            </button>
            <button
              type="button"
              onClick={() => setImageMode('visual_description')}
              className={`min-h-[44px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                imageMode === 'visual_description'
                  ? (isDarkTheme ? 'bg-[#E7C768] border-amber-400 text-amber-950 font-bold shadow-md' : 'bg-amber-400 border-amber-600 text-amber-950 font-bold shadow-sm')
                  : (isDarkTheme ? 'bg-transparent border-amber-400/20 text-amber-200/70 hover:bg-white/5' : 'bg-white border-amber-200 text-zinc-700 hover:bg-amber-50')
              }`}
            >
              <span className="text-sm font-bold block">не текст (описание объектов)</span>
              <span className="text-xs opacity-80 block mt-0.5 leading-snug">
                определять что на фото (люди, спецодежда, объекты, состояние витрин и окружения)
              </span>
            </button>
          </div>
        </div>

        {/* Info Note */}
        <div className={`p-3.5 rounded-2xl border text-sm leading-relaxed ${
          isDarkTheme 
            ? 'bg-amber-400/5 border-amber-400/20 text-amber-200/90' 
            : 'bg-amber-50/70 border-amber-800/20 text-amber-950'
        }`}>
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p>
              данная ссылка и переключатель напрямую определяют аргумент <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-400/20">log_url</code> для функции 249 (распознавание текста с картинок/скриншотов), функции 369 (чтение документов pdf/docx/xlsx) и всех будущих вызовов. при отключении логирования функции не будут тратить время на запись в google таблицу, но вся история надежно сохранится в базе данных PostgreSQL BD ProTalk в таблице <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-400/20">logs</code>.
            </p>
          </div>
        </div>

        {/* Action Button & Status Message */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {statusMessage ? (
            <span className={`text-sm font-bold flex items-center gap-1.5 ${
              isDarkTheme ? 'text-amber-300' : 'text-amber-900'
            }`}>
              <Check size={16} />
              <span>{statusMessage}</span>
            </span>
          ) : (
            <span className="text-xs opacity-60">
              изменения вступают в силу мгновенно для всех последующих отчетов
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 ${
              isDarkTheme
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-[0_0_20px_rgba(244,238,142,0.3)] hover:brightness-110'
                : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md hover:brightness-105'
            }`}
          >
            <Save size={16} />
            <span>{saving ? 'сохранение...' : 'сохранить настройки'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

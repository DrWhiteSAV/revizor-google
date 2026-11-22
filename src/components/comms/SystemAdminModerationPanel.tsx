import React, { useEffect, useState } from 'react';
import { ShieldCheck, Play, Save, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

interface SystemAdminModerationPanelProps {
  isDarkTheme: boolean;
  onSuccess?: (msg: string) => void;
}

export const SystemAdminModerationPanel: React.FC<SystemAdminModerationPanelProps> = ({
  isDarkTheme,
  onSuccess
}) => {
  const [config, setConfig] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [testText, setTestText] = useState('');
  const [testImageUrls, setTestImageUrls] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, logRes] = await Promise.all([
        fetch('/api/system-admin/comms-moderation/config'),
        fetch('/api/system-admin/comms-moderation/logs')
      ]);
      const cfgData = await cfgRes.json();
      const logData = await logRes.json();
      if (cfgData?.success) setConfig(cfgData.config);
      if (logData?.success) setLogs(logData.logs || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/system-admin/comms-moderation/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data?.success) {
        setConfig(data.config);
        onSuccess?.('Настройки модерации чатов сохранены в PostgreSQL');
      }
    } catch {}
    setSaving(false);
  };

  const handleRunTest = async () => {
    if (!testText.trim() && !testImageUrls.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/system-admin/comms-moderation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          imagesUrls: testImageUrls,
          instruction: config?.instruction
        })
      });
      const data = await res.json();
      if (data?.success) {
        setTestResult(data.result);
        void loadAll();
      }
    } catch {}
    setTesting(false);
  };

  if (loading && !config) {
    return <div className="p-6 text-xs opacity-70">Загрузка параметров модерации...</div>;
  }

  return (
    <div className="space-y-6">
      <div
        className={`p-5 sm:p-6 rounded-3xl border space-y-5 shadow-xl ${
          isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} className="text-[#D4AF37]" />
            <div>
              <h3 className={`text-sm font-black ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Модерация корпоративных чатов (Функция 763 · ProTalk AI Decision)
              </h3>
              <p className="text-xs opacity-75">
                Автоматическая проверка всех сообщений и изображений во всех рабочих и групповых чатах.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-[#F4EE8E]' : 'bg-white border-amber-800/25'
            }`}
          >
            <RefreshCw size={14} />
            <span>Обновить</span>
          </button>
        </div>

        {config && (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-amber-400/25 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={Boolean(config.is_active)}
                  onChange={(e) => setConfig({ ...config, is_active: e.target.checked ? 1 : 0 })}
                  className="accent-[#E7C768] w-4 h-4"
                />
                <span>Глобальная модерация включена</span>
              </label>

              <div>
                <label className="block font-bold mb-1">Модель принятия решения</label>
                <input
                  type="text"
                  value={config.ai_model || '~typesafe/jev-latest'}
                  onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-mono ${
                    isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Порог отказа (0.1 – 0.95)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.95"
                  value={config.reject_threshold ?? 0.5}
                  onChange={(e) => setConfig({ ...config, reject_threshold: Number(e.target.value) })}
                  className={`w-full p-2.5 rounded-xl border font-mono ${
                    isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1">ID Бота (ii-rr)</label>
                <input
                  type="text"
                  value={config.bot_id || '69415'}
                  onChange={(e) => setConfig({ ...config, bot_id: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-mono ${
                    isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Префикс log_chat_id</label>
                <input
                  type="text"
                  value={config.user_prefix || 'jev{id}'}
                  onChange={(e) => setConfig({ ...config, user_prefix: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-mono ${
                    isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Варианты (options)</label>
                <input
                  type="text"
                  value={config.options || 'Отказ::no;;Согласие::yes'}
                  onChange={(e) => setConfig({ ...config, options: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border font-mono ${
                    isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Google Таблица логирования (log_url)</label>
              <input
                type="url"
                value={config.log_url || ''}
                onChange={(e) => setConfig({ ...config, log_url: e.target.value })}
                className={`w-full p-2.5 rounded-xl border font-mono ${
                  isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Промпт-инструкция модератора</label>
              <textarea
                rows={7}
                value={config.instruction || ''}
                onChange={(e) => setConfig({ ...config, instruction: e.target.value })}
                className={`w-full p-3 rounded-xl border leading-relaxed ${
                  isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
                }`}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black flex items-center gap-2 cursor-pointer"
              >
                <Save size={15} />
                <span>{saving ? 'Сохранение...' : 'Сохранить конфигурацию 763'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Live Test Card */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
          isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
        }`}
      >
        <h4 className={`text-sm font-black ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
          Тестовый прогон функции 763
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <textarea
            rows={3}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Введите текст сообщения для проверки..."
            className={`w-full p-3 rounded-xl border ${
              isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
            }`}
          />
          <textarea
            rows={3}
            value={testImageUrls}
            onChange={(e) => setTestImageUrls(e.target.value)}
            placeholder="Прямые URL изображений (опционально, через ;; или с новой строки)..."
            className={`w-full p-3 rounded-xl border font-mono ${
              isDarkTheme ? 'bg-[#140A01] border-amber-400/30 text-white' : 'bg-white border-amber-800/25'
            }`}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={testing}
            onClick={handleRunTest}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={14} />
            <span>{testing ? 'Проверка...' : 'Проверить через 763'}</span>
          </button>
          {testResult && (
            <div
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                testResult.allowed
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-400'
                  : 'bg-red-500/15 border-red-400/40 text-red-400'
              }`}
            >
              {testResult.allowed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              <span>
                {testResult.allowed ? 'Согласие (Пропущено)' : `Отказ: ${testResult.reason}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border space-y-3 shadow-xl ${
          isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
        }`}
      >
        <h4 className={`text-sm font-black ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
          Последние проверки модерации ({logs.length})
        </h4>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-amber-400/25 opacity-75">
                <th className="p-2">Время</th>
                <th className="p-2">Канал</th>
                <th className="p-2">Сообщение</th>
                <th className="p-2">Вердикт</th>
                <th className="p-2">Токены / ₽</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-b border-amber-400/15">
                  <td className="p-2 whitespace-nowrap opacity-75 tabular-nums">
                    {row.created_at ? new Date(row.created_at).toLocaleString('ru-RU') : '—'}
                  </td>
                  <td className="p-2 font-mono">{row.channel_id}</td>
                  <td className="p-2 max-w-xs truncate">{row.user_message}</td>
                  <td className="p-2 font-bold">{row.bot_reply}</td>
                  <td className="p-2 font-mono tabular-nums">
                    {row.tokens_total || 0} / {Number(row.rub || 0).toFixed(4)} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

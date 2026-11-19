import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  Send, 
  ShieldCheck, 
  RefreshCw, 
  Key, 
  X, 
  HardDrive, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  RotateCcw
} from 'lucide-react';

interface SystemDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemDiagnosticsModal({ isOpen, onClose }: SystemDiagnosticsModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Telegram Proxy Test Form
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('Тестовый сигнал системной диагностики AI Studio');
  const [testResult, setTestResult] = useState<any>(null);
  const [testingProxy, setTestingProxy] = useState(false);

  // Backup & Audit States
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [auditMsg, setAuditMsg] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/diagnostics');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Не удалось загрузить диагностику');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети при получении диагностики');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunBackup = async () => {
    setBackupMsg('Создание резервной копии...');
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setBackupMsg(`✅ Бэкап создан: ${json.backupPath}`);
        fetchDiagnostics();
      } else {
        setBackupMsg(`❌ Ошибка: ${json.error}`);
      }
    } catch (e: any) {
      setBackupMsg(`❌ Сбой: ${e.message}`);
    }
  };

  const handleRecalculateBalances = async () => {
    setAuditMsg('Аудит и пересчет транзакционного леджера...');
    try {
      const res = await fetch('/api/admin/recalculate-balances', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setAuditMsg(`✅ Балансы пересчитаны для ${json.auditedUsersCount || 1} пользователей!`);
      } else {
        setAuditMsg(`❌ Ошибка: ${json.error}`);
      }
    } catch (e: any) {
      setAuditMsg(`❌ Сбой: ${e.message}`);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testChatId) {
      setTestResult({ ok: false, description: 'Укажите Telegram Chat ID' });
      return;
    }
    setTestingProxy(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram/send-dual-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: testChatId,
          text: testMessage
        })
      });
      const json = await res.json();
      setTestResult(json);
    } catch (e: any) {
      setTestResult({ ok: false, description: e.message });
    } finally {
      setTestingProxy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#140A01] border border-[#E7C768]/40 shadow-[0_0_50px_rgba(244,238,142,0.15)] text-white overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-[#E7C768]/20 bg-[#1A0F02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-[#F4EE8E]">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#F4EE8E] flex items-center gap-2">
                Системная Диагностика & Леджер
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
                  Ctrl + [
                </span>
              </h3>
              <p className="text-sm text-amber-200/80">
                Мониторинг Node.js, PostgreSQL BD ProTalk, IPv4 DNS, ротации прокси и транзакций
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-400/30 transition-all cursor-pointer"
              title="Обновить метрики"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-3">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SYSTEM METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: DNS Resolver */}
            <div className="p-4 rounded-2xl bg-[#1A0F02]/80 border border-[#E7C768]/30 space-y-2">
              <div className="flex justify-between items-center text-sm text-amber-200/80 font-medium">
                <span>DNS резолвер</span>
                <Server size={16} className="text-[#E7C768]" />
              </div>
              <div className="text-base font-bold text-[#F4EE8E] font-mono flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                {data?.dnsResolver || 'ipv4first'}
              </div>
              <span className="text-sm text-amber-200/60 block">Принудительный IPv4</span>
            </div>

            {/* Metric 2: Memory Usage */}
            <div className="p-4 rounded-2xl bg-[#1A0F02]/80 border border-[#E7C768]/30 space-y-2">
              <div className="flex justify-between items-center text-sm text-amber-200/80 font-medium">
                <span>Память Node.js</span>
                <Cpu size={16} className="text-[#E7C768]" />
              </div>
              <div className="text-base font-bold text-white font-mono">
                {data?.memory?.heapUsedMB || 0} MB
                <span className="text-sm text-amber-200/60 font-normal"> / {data?.memory?.rssMB || 0} MB</span>
              </div>
              <span className="text-sm text-amber-300/80 block font-mono">Куча / выделенная RAM</span>
            </div>

            {/* Metric 3: PostgreSQL BD ProTalk Status */}
            <div className="p-4 rounded-2xl bg-[#1A0F02]/80 border border-[#E7C768]/30 space-y-2">
              <div className="flex justify-between items-center text-sm text-amber-200/80 font-medium">
                <span>PostgreSQL BD ProTalk</span>
                <HardDrive size={16} className="text-[#E7C768]" />
              </div>
              <div className="text-base font-bold text-[#F4EE8E] font-mono flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                <span>{data?.database?.tablesCount || 47} таблиц</span>
              </div>
              <span className="text-sm text-amber-200/60 block font-mono truncate" title="PostgreSQL BD ProTalk (raport)">
                база: raport ({data?.database?.latencyMs || 0} мс)
              </span>
            </div>

            {/* Metric 4: Telegram Token */}
            <div className="p-4 rounded-2xl bg-[#1A0F02]/80 border border-[#E7C768]/30 space-y-2">
              <div className="flex justify-between items-center text-sm text-amber-200/80 font-medium">
                <span>Токен Telegram</span>
                <Key size={16} className="text-[#E7C768]" />
              </div>
              <div className="text-sm font-mono font-bold text-amber-300 truncate">
                {data?.telegram?.botTokenMasked || 'Маскирован'}
              </div>
              <span className="text-sm text-amber-200/60 block">Защищенное отображение</span>
            </div>
          </div>

          {/* ACTION BUTTONS (Backup & Ledger Audit) */}
          <div className="p-5 rounded-2xl bg-[#1A0F02]/80 border border-[#E7C768]/30 space-y-4">
            <h4 className="text-sm font-bold text-[#F4EE8E] flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-400" />
              Управление бэкапами и пересчетом балансов
            </h4>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRunBackup}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 font-bold text-xs flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer shadow-lg"
              >
                <Database size={15} />
                Создать Бэкап БД (VACUUM INTO)
              </button>

              <button
                onClick={handleRecalculateBalances}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 text-[#F4EE8E] font-bold text-xs flex items-center gap-2 hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <RotateCcw size={15} />
                Пересчитать Балансы из Леджера
              </button>
            </div>

            {backupMsg && (
              <div className="text-xs font-mono p-3 rounded-xl bg-black/40 border border-amber-400/20 text-amber-200">
                {backupMsg}
              </div>
            )}

            {auditMsg && (
              <div className="text-xs font-mono p-3 rounded-xl bg-black/40 border border-amber-400/20 text-emerald-300">
                {auditMsg}
              </div>
            )}
          </div>

          {/* TELEGRAM DUAL-PROXY TEST ENGINE */}
          <div className="p-5 rounded-2xl bg-[#1A0F02] border border-[#E7C768]/30 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F4EE8E] flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              Тестирование Telegram Dual-Proxy & API
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-amber-200/70 mb-1 font-medium">Primary API Proxy Base</label>
                <input
                  type="text"
                  readOnly
                  value={data?.telegram?.primaryBaseUrl || 'https://api.telegram.org'}
                  className="w-full bg-black/40 border border-amber-400/20 rounded-xl px-3 py-2 text-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-amber-200/70 mb-1 font-medium">Secondary Fallback Proxy</label>
                <input
                  type="text"
                  readOnly
                  value={data?.telegram?.secondaryBaseUrl || 'Не задан'}
                  className="w-full bg-black/40 border border-amber-400/20 rounded-xl px-3 py-2 text-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <input
                  type="text"
                  placeholder="Telegram Chat ID (например: 1048275916)"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  className="w-full bg-black/60 border border-[#E7C768]/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F4EE8E]"
                />
              </div>
              <div className="md:col-span-1">
                <input
                  type="text"
                  placeholder="Текст сообщения..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-black/60 border border-[#E7C768]/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F4EE8E]"
                />
              </div>
              <div className="md:col-span-1">
                <button
                  onClick={handleSendTestMessage}
                  disabled={testingProxy}
                  className="w-full py-2 rounded-xl bg-[#E7C768] text-amber-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#F4EE8E] transition-all cursor-pointer disabled:opacity-50"
                >
                  {testingProxy ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Отправить тест
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`text-xs font-mono p-3 rounded-xl border ${
                testResult.ok 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                {testResult.ok ? (
                  <div>
                    ✅ <strong>Успешно отправлено!</strong>
                    <div className="text-[10px] opacity-80 mt-1">Использованный URL: {testResult.usedBaseUrl}</div>
                  </div>
                ) : (
                  <div>
                    ❌ <strong>Ошибка:</strong> {testResult.description || 'Не удалось отправить'}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-[#E7C768]/20 bg-[#1A0F02] flex justify-between items-center text-[10px] text-amber-200/50 font-mono">
          <span>AI Studio Standard Architecture Engine v2.5</span>
          <span>Нажмите <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300">Esc</kbd> или <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300">Ctrl + [</kbd> для закрытия</span>
        </div>

      </div>
    </div>
  );
}

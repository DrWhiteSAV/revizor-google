import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, Globe, Key, Send, Copy, Check, 
  ExternalLink, ChevronDown, ChevronUp, AlertCircle, 
  Sparkles, Database, FileText, CheckCircle2, Lock
} from "lucide-react";

interface SystemAdminProxySectionProps {
  isDarkTheme: boolean;
  onShowToast?: (msg: string) => void;
}

export function SystemAdminProxySection({ isDarkTheme, onShowToast }: SystemAdminProxySectionProps) {
  const [proxyType, setProxyType] = useState<"dialog_ai" | "custom_cloudflare" | "direct">("dialog_ai");
  const [customWorkerUrl, setCustomWorkerUrl] = useState("");
  const [botToken, setBotToken] = useState("");
  const [botTokenMasked, setBotTokenMasked] = useState("");
  const [isTokenConfigured, setIsTokenConfigured] = useState(false);
  const [botUsername, setBotUsername] = useState("@ii_rrbot");
  const [adminTelegramId, setAdminTelegramId] = useState("169262990");
  
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [showWorkerCode, setShowWorkerCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch initial settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bot-settings");
      const data = await res.json();
      if (data.success) {
        setBotTokenMasked(data.botTokenMasked || "");
        setIsTokenConfigured(data.isTokenConfigured || false);
        setBotUsername(data.botUsername || "@ii_rrbot");
        setAdminTelegramId(data.adminTelegramId || "169262990");
        setProxyType(data.proxyType || "dialog_ai");
        if (data.proxyType === "custom_cloudflare") {
          setCustomWorkerUrl(data.apiBaseUrl || "");
        }
      }
    } catch (err) {
      console.error("Failed to load bot settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getEffectiveBaseUrl = () => {
    if (proxyType === "dialog_ai") return "https://eu1.account.dialog.ai.atiks.org";
    if (proxyType === "direct") return "https://api.telegram.org";
    return customWorkerUrl.trim() || "https://your-worker.workers.dev";
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setStatusMessage(null);
      const payload: Record<string, any> = {
        botUsername,
        proxyType,
        adminTelegramId,
        apiBaseUrl: getEffectiveBaseUrl()
      };

      if (botToken.trim()) {
        payload.botToken = botToken.trim();
      }

      const res = await fetch("/api/admin/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setBotToken("");
        setBotTokenMasked(data.botTokenMasked || "");
        setIsTokenConfigured(data.isTokenConfigured || false);
        setStatusMessage({ type: "success", text: "Конфигурация Telegram и шлюза успешно сохранена!" });
        if (onShowToast) onShowToast("Настройки Telegram и шлюза успешно сохранены");
      } else {
        setStatusMessage({ type: "error", text: data.error || "Ошибка при сохранении конфигурации" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Сетевая ошибка при отправке запроса: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestMessage = async () => {
    try {
      setTestLoading(true);
      setStatusMessage(null);
      const res = await fetch("/api/admin/telegram/test-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: adminTelegramId,
          text: `🔔 <b>Проверка Telegram шлюза</b>\n\nШлюз: <code>${getEffectiveBaseUrl()}</code>\nРежим: <b>${proxyType}</b>\nСтатус: <b>Успешно доставлено</b>`
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: `Тестовое сообщение успешно доставлено администратору (${adminTelegramId})!` });
        if (onShowToast) onShowToast("Тестовое сообщение отправлено в Telegram");
      } else {
        setStatusMessage({ type: "error", text: data.error || "Не удалось доставить тестовое сообщение" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Ошибка при тестировании: " + err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      setBackupLoading(true);
      setStatusMessage(null);
      const res = await fetch("/api/admin/backup/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Тестовая отправка из панели администратора" })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ 
          type: "success", 
          text: `Бэкап JSON базы данных сформирован и успешно отправлен в Telegram администратору (${adminTelegramId})!` 
        });
        if (onShowToast) onShowToast("Бэкап JSON базы данных отправлен в Telegram");
      } else {
        setStatusMessage({ type: "error", text: data.error || "Не удалось отправить файл бэкапа в Telegram" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: "Ошибка запуска бэкапа: " + err.message });
    } finally {
      setBackupLoading(false);
    }
  };

  const cloudflareWorkerCode = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = "https://api.telegram.org" + url.pathname + url.search;

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "follow"
    });

    try {
      const response = await fetch(modifiedRequest);
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      newHeaders.set("Access-Control-Allow-Headers", "*");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cloudflareWorkerCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview */}
      <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
        isDarkTheme 
          ? "bg-[#1A0F02]/90 border-amber-400/40 shadow-[0_0_30px_rgba(244,238,142,0.12)]" 
          : "bg-[#FFFBF5] border-amber-900/30"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-amber-500/20">
          <div className="space-y-1">
            <h3 className={`text-base font-black flex items-center gap-2 ${
              isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"
            }`}>
              <Globe size={20} className="text-[#D4AF37]" />
              <span>Шлюз проксирования Telegram & Безопасность токенов</span>
            </h3>
            <p className={`text-sm ${isDarkTheme ? "text-amber-200/80" : "text-amber-900/80"}`}>
              Безопасная маршрутизация API запросов Telegram, защита ключей бота и ежедневная отправка резервных копий JSON в 06:00 МСК
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3.5 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 ${
              isTokenConfigured 
                ? isDarkTheme 
                  ? "bg-amber-400/20 border-amber-400 text-[#F4EE8E]" 
                  : "bg-amber-100 border-amber-800/40 text-amber-950"
                : "bg-red-500/10 border-red-500/30 text-red-500"
            }`}>
              <Lock size={15} />
              <span>{isTokenConfigured ? "Токен защищен на сервере" : "Токен не настроен"}</span>
            </span>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-bold animate-fade-in ${
            statusMessage.type === "success"
              ? isDarkTheme 
                ? "bg-amber-400/20 border-amber-400/60 text-[#F4EE8E]" 
                : "bg-amber-100 border-amber-800/40 text-amber-950"
              : "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-300"
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? <CheckCircle2 size={18} className="text-[#D4AF37]" /> : <AlertCircle size={18} />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="cursor-pointer p-1">
              ✕
            </button>
          </div>
        )}

        {/* 1. Presets Selection Grid */}
        <div className="space-y-3">
          <label className={`block text-sm font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
            Выберите метод маршрутизации запросов:
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1: Dialog AI Proxy */}
            <div
              onClick={() => setProxyType("dialog_ai")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 relative ${
                proxyType === "dialog_ai"
                  ? isDarkTheme
                    ? "bg-amber-400/20 border-amber-400 shadow-[0_0_20px_rgba(244,238,142,0.25)]"
                    : "bg-amber-200/80 border-amber-800 shadow-md"
                  : isDarkTheme
                    ? "bg-[#140A01] border-amber-400/20 hover:border-amber-400/50 hover:bg-amber-400/10"
                    : "bg-white border-amber-800/20 hover:border-amber-800/40 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
                  Готовый шлюз Dialog AI
                </span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  proxyType === "dialog_ai" ? "border-amber-500 bg-amber-400" : "border-amber-400/40"
                }`}>
                  {proxyType === "dialog_ai" && <span className="w-2 h-2 rounded-full bg-[#1A0F02]" />}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${isDarkTheme ? "text-amber-200/80" : "text-amber-900/80"}`}>
                Рекомендуемый европейский защищенный шлюз с автоматическим обходом блокировок и failover на прямой Telegram API.
              </p>
              <div className={`text-sm font-mono p-2 rounded-xl border truncate ${
                isDarkTheme ? "bg-[#0a0501] border-amber-400/20 text-[#E7C768]" : "bg-amber-50 border-amber-800/20 text-amber-950"
              }`}>
                https://eu1.account.dialog.ai.atiks.org
              </div>
            </div>

            {/* Option 2: Cloudflare Worker */}
            <div
              onClick={() => setProxyType("custom_cloudflare")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 relative ${
                proxyType === "custom_cloudflare"
                  ? isDarkTheme
                    ? "bg-amber-400/20 border-amber-400 shadow-[0_0_20px_rgba(244,238,142,0.25)]"
                    : "bg-amber-200/80 border-amber-800 shadow-md"
                  : isDarkTheme
                    ? "bg-[#140A01] border-amber-400/20 hover:border-amber-400/50 hover:bg-amber-400/10"
                    : "bg-white border-amber-800/20 hover:border-amber-800/40 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
                  Свой Cloudflare Worker
                </span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  proxyType === "custom_cloudflare" ? "border-amber-500 bg-amber-400" : "border-amber-400/40"
                }`}>
                  {proxyType === "custom_cloudflare" && <span className="w-2 h-2 rounded-full bg-[#1A0F02]" />}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${isDarkTheme ? "text-amber-200/80" : "text-amber-900/80"}`}>
                Ваш персональный бессерверный прокси-проксификатор Cloudflare Workers на вашем личном домене.
              </p>
              <div className={`text-sm font-mono p-2 rounded-xl border truncate ${
                isDarkTheme ? "bg-[#0a0501] border-amber-400/20 text-[#E7C768]" : "bg-amber-50 border-amber-800/20 text-amber-950"
              }`}>
                {customWorkerUrl || "https://your-worker.workers.dev"}
              </div>
            </div>

            {/* Option 3: Direct */}
            <div
              onClick={() => setProxyType("direct")}
              className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 relative ${
                proxyType === "direct"
                  ? isDarkTheme
                    ? "bg-amber-400/20 border-amber-400 shadow-[0_0_20px_rgba(244,238,142,0.25)]"
                    : "bg-amber-200/80 border-amber-800 shadow-md"
                  : isDarkTheme
                    ? "bg-[#140A01] border-amber-400/20 hover:border-amber-400/50 hover:bg-amber-400/10"
                    : "bg-white border-amber-800/20 hover:border-amber-800/40 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
                  Прямое подключение
                </span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  proxyType === "direct" ? "border-amber-500 bg-amber-400" : "border-amber-400/40"
                }`}>
                  {proxyType === "direct" && <span className="w-2 h-2 rounded-full bg-[#1A0F02]" />}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${isDarkTheme ? "text-amber-200/80" : "text-amber-900/80"}`}>
                Прямые запросы к официальным серверам api.telegram.org без использования промежуточных шлюзов.
              </p>
              <div className={`text-sm font-mono p-2 rounded-xl border truncate ${
                isDarkTheme ? "bg-[#0a0501] border-amber-400/20 text-[#E7C768]" : "bg-amber-50 border-amber-800/20 text-amber-950"
              }`}>
                https://api.telegram.org
              </div>
            </div>
          </div>
        </div>

        {/* Custom Worker URL Input (if selected) */}
        {proxyType === "custom_cloudflare" && (
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDarkTheme ? "bg-[#140A01] border-amber-400/30" : "bg-amber-50 border-amber-800/20"
          }`}>
            <label className={`block text-sm font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
              URL адрес вашего Cloudflare Worker:
            </label>
            <input
              type="text"
              value={customWorkerUrl}
              onChange={(e) => setCustomWorkerUrl(e.target.value)}
              placeholder="https://telegram-proxy.username.workers.dev"
              className={`w-full p-3 rounded-xl text-sm font-mono border focus:outline-none ${
                isDarkTheme 
                  ? "bg-[#0a0501] border-amber-400/50 text-amber-100 placeholder:text-amber-300/30" 
                  : "bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/40"
              }`}
            />
            
            <button
              type="button"
              onClick={() => setShowWorkerCode(!showWorkerCode)}
              className={`text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
                isDarkTheme ? "text-[#F4EE8E] hover:underline" : "text-amber-950 hover:underline"
              }`}
            >
              {showWorkerCode ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span>{showWorkerCode ? "Скрыть код Cloudflare Worker" : "Показать готовый код Cloudflare Worker для копирования"}</span>
            </button>

            {showWorkerCode && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isDarkTheme ? "text-amber-200" : "text-amber-900"}`}>
                    Код воркера (JavaScript ES Module):
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className={`px-3 py-1.5 rounded-xl text-sm font-bold border flex items-center gap-1.5 cursor-pointer ${
                      copiedCode
                        ? "bg-amber-400 text-amber-950 border-amber-500"
                        : isDarkTheme
                          ? "bg-amber-400/20 text-[#F4EE8E] border-amber-400/40 hover:bg-amber-400/30"
                          : "bg-amber-200 text-amber-950 border-amber-800/40 hover:bg-amber-300"
                    }`}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCode ? "Скопировано!" : "Скопировать код"}</span>
                  </button>
                </div>
                <pre className={`p-4 rounded-xl text-sm font-mono overflow-x-auto whitespace-pre-wrap border max-h-60 ${
                  isDarkTheme ? "bg-[#0a0501] border-amber-400/20 text-amber-200" : "bg-white border-amber-800/20 text-amber-950"
                }`}>
                  {cloudflareWorkerCode}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 2. Bot Configuration Fields */}
        <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telegram Bot Token */}
            <div className="space-y-1.5">
              <label className={`block text-sm font-black flex items-center justify-between ${
                isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"
              }`}>
                <span>Токен Telegram бота:</span>
                {botTokenMasked && (
                  <span className="font-mono text-sm opacity-80">
                    Текущий: {botTokenMasked}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={botTokenMasked ? "Оставьте пустым, чтобы сохранить текущий токен" : "8598472380:AAEfgSiqs..."}
                className={`w-full p-3.5 rounded-xl text-sm font-mono border focus:outline-none ${
                  isDarkTheme 
                    ? "bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40" 
                    : "bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50"
                }`}
              />
              <p className={`text-sm ${isDarkTheme ? "text-amber-200/60" : "text-amber-900/60"}`}>
                Токен хранится в базе данных PostgreSQL BD ProTalk и никогда не передается в открытом виде на клиент.
              </p>
            </div>

            {/* Admin Telegram ID */}
            <div className="space-y-1.5">
              <label className={`block text-sm font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
                Telegram ID администратора (получатель бэкапов):
              </label>
              <input
                type="text"
                value={adminTelegramId}
                onChange={(e) => setAdminTelegramId(e.target.value)}
                placeholder="169262990"
                className={`w-full p-3.5 rounded-xl text-sm font-mono border focus:outline-none ${
                  isDarkTheme 
                    ? "bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40" 
                    : "bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50"
                }`}
              />
              <p className={`text-sm ${isDarkTheme ? "text-amber-200/60" : "text-amber-900/60"}`}>
                Числовой ID аккаунта Telegram, на который будут приходить ежедневные JSON-бэкапы базы данных. Перед тестированием обязательно откройте бота в Telegram и отправьте команду /start.
              </p>
            </div>
          </div>

          {/* Live Preview of Outgoing Route */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isDarkTheme ? "bg-[#140A01] border-amber-400/20" : "bg-amber-100/40 border-amber-800/20"
          }`}>
            <span className={`block text-sm font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
              Маршрут исходящих системных запросов:
            </span>
            <div className="flex items-center gap-2 flex-wrap text-sm font-mono">
              <span className={`px-2 py-1 rounded-md border font-bold ${
                isDarkTheme ? "bg-amber-400/10 border-amber-400/30 text-[#E7C768]" : "bg-amber-200/70 border-amber-800/30 text-amber-950"
              }`}>
                POST
              </span>
              <span className="break-all opacity-90">
                {getEffectiveBaseUrl()}/bot{botTokenMasked || "&lt;TOKEN&gt;"}/sendMessage
              </span>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md flex items-center justify-center gap-2 ${
                  isDarkTheme
                    ? "bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-[0_0_20px_rgba(244,238,142,0.3)] hover:brightness-110"
                    : "bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 hover:brightness-105"
                }`}
              >
                <Check size={16} />
                <span>{loading ? "Сохранение..." : "Сохранить конфигурацию"}</span>
              </button>

              <button
                type="button"
                onClick={handleTestMessage}
                disabled={testLoading}
                className={`px-4 py-3.5 rounded-xl text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                  isDarkTheme
                    ? "bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]"
                    : "bg-white hover:bg-amber-100 border-amber-800/30 text-amber-950"
                }`}
              >
                <Send size={15} />
                <span>{testLoading ? "Отправка..." : "Тестовое сообщение"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleTriggerBackup}
              disabled={backupLoading}
              className={`px-5 py-3.5 rounded-xl text-sm font-black border transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                isDarkTheme
                  ? "bg-amber-400/20 hover:bg-amber-400/30 border-amber-400 text-[#F4EE8E] shadow-[0_0_20px_rgba(244,238,142,0.2)]"
                  : "bg-amber-200 hover:bg-amber-300 border-amber-800/40 text-amber-950"
              }`}
            >
              <Database size={16} className="text-[#D4AF37]" />
              <span>{backupLoading ? "Генерация бэкапа..." : "Тестовый запуск бэкапа в Telegram"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Daily 06:00 MSK Cron Backup Card */}
      <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
        isDarkTheme 
          ? "bg-[#1A0F02]/90 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.1)]" 
          : "bg-[#FFFBF5] border-amber-900/30"
      }`}>
        <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
          <h4 className={`text-base font-black flex items-center gap-2 ${
            isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"
          }`}>
            <Database size={18} className="text-[#D4AF37]" />
            <span>Автоматический ежедневный бэкап в Telegram (06:00 МСК)</span>
          </h4>
          <span className={`text-sm font-mono font-bold px-3 py-1 rounded-full border ${
            isDarkTheme ? "bg-amber-400/20 border-amber-400 text-[#F4EE8E]" : "bg-amber-200 border-amber-800/30 text-amber-950"
          }`}>
            0 6 * * * MSK (03:00 UTC)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDarkTheme ? "bg-[#140A01] border-amber-400/20" : "bg-white border-amber-800/20"
          }`}>
            <span className={`block text-sm font-bold opacity-75 ${isDarkTheme ? "text-amber-200" : "text-amber-900"}`}>
              Формат резервной копии:
            </span>
            <span className={`text-base font-mono font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
              Full JSON Snapshot (.json)
            </span>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDarkTheme ? "bg-[#140A01] border-amber-400/20" : "bg-white border-amber-800/20"
          }`}>
            <span className={`block text-sm font-bold opacity-75 ${isDarkTheme ? "text-amber-200" : "text-amber-900"}`}>
              Получатель файла:
            </span>
            <span className={`text-base font-mono font-black ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
              ID: {adminTelegramId}
            </span>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 ${
            isDarkTheme ? "bg-[#140A01] border-amber-400/20" : "bg-white border-amber-800/20"
          }`}>
            <span className={`block text-sm font-bold opacity-75 ${isDarkTheme ? "text-amber-200" : "text-amber-900"}`}>
              Безопасность & Отказоустойчивость:
            </span>
            <span className={`text-base font-bold ${isDarkTheme ? "text-[#F4EE8E]" : "text-amber-950"}`}>
              Прокси + Fallback на api.telegram.org
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

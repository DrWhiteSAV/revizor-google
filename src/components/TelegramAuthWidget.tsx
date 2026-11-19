import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Link, 
  Unlink, 
  Sparkles, 
  UserCheck, 
  ExternalLink, 
  Phone, 
  MapPin, 
  Copy, 
  Check, 
  Share2,
  Users,
  ShieldCheck
} from 'lucide-react';
import { UserProfile } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: any;
        ready: () => void;
        expand: () => void;
        close: () => void;
        requestContact?: (callback: (status: boolean, response?: any) => void) => void;
        requestLocation?: (callback: (status: boolean, response?: any) => void) => void;
      };
    };
  }
}

interface TelegramAuthWidgetProps {
  currentUser: UserProfile | null;
  onUserUpdated?: (updatedUser: UserProfile) => void;
  compact?: boolean;
  theme?: 'dark' | 'light';
}

export function TelegramAuthWidget({ currentUser, onUserUpdated, compact = false, theme = 'dark' }: TelegramAuthWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);

  // Detect Telegram WebApp
  const tgWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const isInsideTelegram = Boolean(tgWebApp?.initData);

  useEffect(() => {
    if (tgWebApp) {
      tgWebApp.ready();
      tgWebApp.expand();
    }
  }, [tgWebApp]);

  // Fetch Referral Stats if user exists
  useEffect(() => {
    if (currentUser?.id || currentUser?.telegram_id) {
      fetchReferralStats();
    }
  }, [currentUser]);

  const fetchReferralStats = async () => {
    try {
      const param = currentUser?.id ? `userId=${currentUser.id}` : `telegramId=${currentUser?.telegram_id}`;
      const res = await fetch(`/api/referral/stats?${param}`);
      const json = await res.json();
      if (json.success) {
        setReferralData(json);
      }
    } catch (e) {
      console.warn('Failed to fetch referral stats:', e);
    }
  };

  // Perform Telegram Auth / Binding with HMAC validation on Backend
  const handleTelegramAuth = async () => {
    if (!tgWebApp?.initData) {
      setStatusMsg({ 
        type: 'error', 
        text: 'Запустите приложение внутри Telegram WebApp или передайте initData для автоматической авторизации.' 
      });
      return;
    }

    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Проверка HMAC-SHA256 подписи initData на сервере...' });

    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: tgWebApp.initData,
          currentUserId: currentUser?.id || null
        })
      });

      const json = await res.json();

      if (json.success && json.user) {
        setStatusMsg({ type: 'success', text: json.message || 'Синхронизация с Telegram выполнена!' });
        if (onUserUpdated) {
          onUserUpdated(json.user);
        }
        fetchReferralStats();
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Ошибка авторизации Telegram' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Сбой соединения с сервером' });
    } finally {
      setLoading(false);
    }
  };

  // Unlink Telegram Account
  const handleUnlinkTelegram = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/unlink-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      const json = await res.json();
      if (json.success && json.user) {
        setStatusMsg({ type: 'success', text: 'Аккаунт Telegram отвязан' });
        if (onUserUpdated) {
          onUserUpdated(json.user);
        }
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Не удалось отвязать аккаунт' });
      }
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const isLinked = Boolean(currentUser?.telegram_id || currentUser?.telegramHandle);
  const botReferralLink = referralData?.referralLink || `https://t.me/ii_rr_bot/app?startapp=${currentUser?.telegram_id || currentUser?.id || '1048275916'}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(botReferralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isLinked ? (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            Telegram: @{currentUser?.username || currentUser?.telegramHandle?.replace('@', '') || 'Привязан'}
          </span>
        ) : isInsideTelegram ? (
          <button
            onClick={handleTelegramAuth}
            disabled={loading}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 cursor-pointer"
          >
            <Send size={12} />
            {loading ? 'Вход...' : 'Авторизовать Telegram'}
          </button>
        ) : (
          <a
            href="https://t.me/ii_rr_bot/app"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-300 font-medium text-xs flex items-center gap-1.5 hover:bg-sky-500/20"
          >
            <Send size={12} />
            Открыть WebApp
          </a>
        )}
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={`p-6 rounded-3xl border shadow-lg space-y-6 font-sans ${
      isDark 
        ? 'bg-[#140A01] border-[#E7C768]/30 text-white shadow-[0_0_30px_rgba(244,238,142,0.1)]' 
        : 'bg-[#FAF6EC] border-amber-600/40 text-amber-950 shadow-md'
    }`}>
      
      {/* HEADER */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 ${
        isDark ? 'border-[#E7C768]/20' : 'border-amber-900/20'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl border ${
            isDark ? 'bg-sky-500/10 border-sky-400/30 text-sky-400' : 'bg-sky-100 border-sky-400 text-sky-800'
          }`}>
            <Send size={22} />
          </div>
          <div>
            <h3 className={`text-lg font-black flex items-center gap-2 ${
              isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              Интеграция Telegram WebApp
              {currentUser?.is_premium ? (
                <span className={`text-[10px] border px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isDark ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' : 'bg-amber-200 text-amber-950 border-amber-500'
                }`}>
                  <Sparkles size={10} /> Premium
                </span>
              ) : null}
            </h3>
            <p className={`text-xs ${isDark ? 'text-amber-200/70' : 'text-amber-900/80 font-medium'}`}>
              Синхронизация профиля, автоавторизация через HMAC-SHA256 и рефералы
            </p>
          </div>
        </div>

        {isInsideTelegram && (
          <span className={`px-3 py-1 rounded-full border text-xs font-mono flex items-center gap-1.5 ${
            isDark ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300' : 'bg-emerald-100 border-emerald-500/40 text-emerald-950 font-bold'
          }`}>
            <ShieldCheck size={14} /> TWA Режим
          </span>
        )}
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs flex items-center gap-3 border ${
          statusMsg.type === 'success' 
            ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold')
            : statusMsg.type === 'error'
            ? (isDark ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-100 border-red-500 text-red-950 font-bold')
            : (isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-sky-100 border-sky-500 text-sky-950 font-bold')
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ACCOUNT DETAILS OR BINDING CARD */}
      {isLinked ? (
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#1A0F02] border-[#E7C768]/30' : 'bg-[#FFFBF5] border-amber-300/80'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {currentUser?.photo_url ? (
                <img 
                  src={currentUser.photo_url} 
                  alt="Telegram Avatar" 
                  className={`w-14 h-14 rounded-2xl border-2 object-cover shadow-md ${
                    isDark ? 'border-[#E7C768]/50' : 'border-amber-600/60'
                  }`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-bold text-xl ${
                  isDark ? 'bg-sky-500/20 border-sky-400/50 text-sky-300' : 'bg-sky-100 border-sky-500 text-sky-900'
                }`}>
                  {currentUser?.first_name?.[0] || currentUser?.name?.[0] || 'TG'}
                </div>
              )}

              <div>
                <h4 className={`text-base font-bold flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-amber-950'
                }`}>
                  {currentUser?.first_name} {currentUser?.last_name}
                  {currentUser?.username && (
                    <span className={`text-xs font-mono font-normal ${
                      isDark ? 'text-sky-400' : 'text-sky-800'
                    }`}>@{currentUser.username}</span>
                  )}
                </h4>
                <p className={`text-xs font-mono mt-0.5 ${
                  isDark ? 'text-amber-200/70' : 'text-amber-900/80'
                }`}>
                  Telegram ID: {currentUser?.telegram_id || 'Не указан'}
                </p>
                {currentUser?.profile_link && (
                  <a 
                    href={currentUser.profile_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`text-xs hover:underline flex items-center gap-1 mt-1 ${
                      isDark ? 'text-sky-300' : 'text-sky-800 font-bold'
                    }`}
                  >
                    Перейти в профиль Telegram <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={handleUnlinkTelegram}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Unlink size={14} />
              Отвязать Telegram
            </button>
          </div>
        </div>
      ) : (
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-[#1A0F02] border-[#E7C768]/30' : 'bg-[#FFFBF5] border-amber-300/80'
        }`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Привязать аккаунт Telegram к текущему профилю ({currentUser?.email || 'Гость'})
              </h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-amber-200/70' : 'text-amber-900/80'}`}>
                Для объединения данных откройте сайт внутри Telegram MiniApp или выберите авторизацию.
              </p>
            </div>

            {isInsideTelegram ? (
              <button
                onClick={handleTelegramAuth}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-xs shadow-lg hover:brightness-110 cursor-pointer flex items-center gap-2 shrink-0"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Link size={14} />}
                Привязать текущий Telegram
              </button>
            ) : (
              <a
                href="https://t.me/ii_rr_bot/app"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-5 py-2.5 rounded-xl border font-bold text-xs cursor-pointer flex items-center gap-2 shrink-0 ${
                  isDark ? 'bg-sky-500/20 border-sky-400/40 text-sky-300 hover:bg-sky-500/30' : 'bg-sky-100 border-sky-400 text-sky-950 hover:bg-sky-200'
                }`}
              >
                <Send size={14} />
                Войти через TWA Бот
              </a>
            )}
          </div>
        </div>
      )}

      {/* REFERRAL SYSTEM & METRICS */}
      <div className={`p-5 rounded-2xl border space-y-4 ${
        isDark ? 'bg-[#1A0F02] border-[#E7C768]/30' : 'bg-[#FFFBF5] border-amber-300/80'
      }`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
          isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
        }`}>
          <Users size={16} className={isDark ? 'text-amber-400' : 'text-amber-800'} />
          Реферальная система Telegram MiniApp
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border space-y-1 ${
            isDark ? 'bg-black/40 border-[#E7C768]/20' : 'bg-amber-100/50 border-amber-300/80'
          }`}>
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-amber-200/70' : 'text-amber-900'}`}>Реферальный баланс</span>
            <div className={`text-xl font-black ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              {referralData?.referralRewardBalance || currentUser?.referral_reward_balance || currentUser?.referral_bonus || 0} RR
            </div>
            <span className={`text-[10px] block font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>+1000 RR за каждого приглашенного</span>
          </div>

          <div className={`p-4 rounded-xl border space-y-1 ${
            isDark ? 'bg-black/40 border-[#E7C768]/20' : 'bg-amber-100/50 border-amber-300/80'
          }`}>
            <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-amber-200/70' : 'text-amber-900'}`}>Приглашено друзей</span>
            <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-amber-950'}`}>
              {referralData?.invitedCount || currentUser?.invitedUsersCount || 0} пользователей
            </div>
            <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-zinc-600'}`}>Автоматический учет start_param (1 RR = 1 ₽)</span>
          </div>
        </div>

        {/* LINK SHARE */}
        <div className="space-y-1.5">
          <label className={`text-xs font-medium ${isDark ? 'text-amber-200/80' : 'text-amber-900'}`}>Ваша реферальная ссылка Telegram TWA</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={botReferralLink}
              className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono ${
                isDark ? 'bg-black/60 border-[#E7C768]/30 text-amber-200' : 'bg-white border-amber-400 text-amber-950 font-bold'
              }`}
            />
            <button
              onClick={copyReferralLink}
              className="px-4 py-2 rounded-xl bg-[#E7C768] hover:bg-[#F4EE8E] text-amber-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow"
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              {copiedLink ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

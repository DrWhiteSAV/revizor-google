import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCheck, X, ExternalLink, ArrowRight } from 'lucide-react';
import { NotificationItem, UserProfile } from '../../types';
import { PWAInstallProfileButton } from '../../components/pwa/PWAInstallProfileButton';
import { PushNotificationSettingsCard } from '../../components/pwa/controls/PushNotificationSettingsCard';

interface CabinetNotificationsProps {
  notifications: NotificationItem[];
  handleMarkAllNotificationsRead: () => void;
  onNavigate?: (path: string) => void;
  currentUser?: UserProfile | null;
  theme?: 'dark' | 'light';
}

export const resolveNotificationUrl = (notif: NotificationItem | any): string | null => {
  if (!notif) return null;

  // Extract report ID from fields or text
  const repId = notif.reportId || 
                (typeof notif.actionUrl === 'string' ? notif.actionUrl.match(/rep-[\w-]+|\d{10,}/)?.[0] : null) ||
                (typeof notif.message === 'string' ? notif.message.match(/rep-[\w-]+|\d{10,}/)?.[0] : null) ||
                (typeof notif.desc === 'string' ? notif.desc.match(/rep-[\w-]+|\d{10,}/)?.[0] : null) ||
                (typeof notif.id === 'string' ? notif.id.match(/rep-[\w-]+|\d{10,}/)?.[0] : null);

  const isReview = notif.type === 'REPORT_NEED_REVIEW' || 
                   String(notif.actionUrl || '').includes('/review') ||
                   String(notif.title || '').toLowerCase().includes('проверка') || 
                   String(notif.title || '').toLowerCase().includes('проверить') || 
                   String(notif.message || notif.desc || '').toLowerCase().includes('требуется проверка') ||
                   String(notif.message || notif.desc || '').toLowerCase().includes('необходима проверка') ||
                   String(notif.message || notif.desc || '').toLowerCase().includes('ожидает проверки') ||
                   String(notif.message || notif.desc || '').toLowerCase().includes('сдал отчет');

  const isVerdict = notif.type === 'REPORT_REVIEW_DONE' || 
                    notif.type === 'EDITS_ACCEPTED' ||
                    notif.type === 'RECOMMENDATION' || 
                    String(notif.actionUrl || '').includes('/verdict') ||
                    String(notif.title || '').toLowerCase().includes('рецензия') || 
                    String(notif.title || '').toLowerCase().includes('вердикт') ||
                    String(notif.title || '').toLowerCase().includes('проверен');

  if (repId) {
    if (isReview) {
      return `/cabinet/raport/review/${repId}`;
    }
    return `/cabinet/raport/verdict/${repId}`;
  }

  // If specific actionUrl is present and is not a generic fallback to profile
  if (notif.actionUrl && typeof notif.actionUrl === 'string' && notif.actionUrl.trim().length > 0) {
    const raw = notif.actionUrl.trim();
    if (raw !== '/cabinet/profile' && raw !== '/cabinet' && raw !== '/cabinet/profile/notifications') {
      return raw;
    }
  }

  if (isReview) {
    return '/cabinet/raport/review';
  }
  if (isVerdict) {
    return '/cabinet/raport/calendar';
  }

  return null;
};

export const resolveNotificationButtonLabel = (notif: NotificationItem | any): string => {
  if (!notif) return 'перейти';
  const isReview = notif.type === 'REPORT_NEED_REVIEW' || 
                   String(notif.actionUrl || '').includes('/review') ||
                   String(notif.title || '').toLowerCase().includes('проверка') || 
                   String(notif.title || '').toLowerCase().includes('проверить') || 
                   String(notif.message || notif.desc || '').toLowerCase().includes('требуется проверка') ||
                   String(notif.message || notif.desc || '').toLowerCase().includes('необходима проверка') ||
                   String(notif.message || notif.desc || '').toLowerCase().includes('ожидает проверки') ||
                   String(notif.message || notif.desc || '').toLowerCase().includes('сдал отчет');
  if (isReview) return 'проверить отчет';

  const isVerdict = notif.type === 'REPORT_REVIEW_DONE' || 
                    notif.type === 'EDITS_ACCEPTED' ||
                    notif.type === 'RECOMMENDATION' || 
                    String(notif.actionUrl || '').includes('/verdict') ||
                    String(notif.title || '').toLowerCase().includes('рецензия') || 
                    String(notif.title || '').toLowerCase().includes('вердикт') ||
                    String(notif.title || '').toLowerCase().includes('проверен');
  if (isVerdict) return 'смотреть рецензию';

  if (notif.reportId || notif.message?.includes('rep-') || notif.desc?.includes('rep-') || notif.actionUrl?.includes('raport')) {
    return 'просмотр отчета';
  }
  return 'перейти';
};

export default function CabinetNotifications({
  notifications,
  handleMarkAllNotificationsRead,
  onNavigate,
  currentUser,
  theme
}: CabinetNotificationsProps) {
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [detectedTheme, setDetectedTheme] = useState<'dark' | 'light'>(() =>
    theme ??
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
      ? 'light'
      : 'dark')
  );

  useEffect(() => {
    if (theme) {
      setDetectedTheme(theme);
      return;
    }
    if (typeof document === 'undefined') return;
    const sync = () => {
      setDetectedTheme(document.documentElement.classList.contains('theme-light') ? 'light' : 'dark');
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [theme]);

  const resolvedUserId = React.useMemo(() => {
    if (currentUser?.id) return String(currentUser.id);
    try {
      const saved = localStorage.getItem('rr_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) return String(parsed.id);
      }
    } catch {}
    return '';
  }, [currentUser?.id]);

  const isDark = detectedTheme === 'dark';

  const handleNotifClick = (notif: NotificationItem) => {
    notif.isRead = true;
    setSelectedNotif(notif);
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notif.id })
    }).catch(() => {});
  };

  const handleActionClick = (url?: string | null) => {
    if (!url) return;
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.assign(url);
    }
  };

  const onMarkAll = () => {
    handleMarkAllNotificationsRead();
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).catch(() => {});
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="panel-notifications">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-amber-500/25">
        <div className="min-w-0">
          <h3 className={`text-xl font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>Уведомления и напоминания</h3>
          <p className={`text-[14px] ${isDark ? 'text-[#F4EE8E]/80' : 'text-amber-900'}`}>
            Мгновенные выводы от ИИ, напоминания о сменах и push-оповещения на телефон через PWA.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <PWAInstallProfileButton theme={detectedTheme} />
          <button 
            onClick={onMarkAll}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-[14px] border border-amber-300/80 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 shrink-0"
          >
            <CheckCheck size={16} />
            <span>Отметить все прочитанными</span>
          </button>
        </div>
      </div>

      {/* Push Notifications Control & Mobile PWA Guide */}
      <PushNotificationSettingsCard userId={resolvedUserId} theme={detectedTheme} />
      
      <div className="space-y-3" id="notifications-list">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const notifUrl = resolveNotificationUrl(notif);
            const buttonLabel = resolveNotificationButtonLabel(notif);

            return (
              <div 
                key={notif.id} 
                onClick={() => handleNotifClick(notif)}
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 relative overflow-hidden transition-all bg-transparent cursor-pointer hover:bg-amber-500/10 active:scale-98 ${
                  isDark
                    ? notif.type === 'RECOMMENDATION' || notif.type === 'REPORT_NEED_REVIEW'
                      ? 'border-amber-400/60 shadow-[0_0_15px_rgba(244,238,142,0.1)]'
                      : 'border-amber-500/30'
                    : 'border-amber-900/30'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold border border-amber-300/50 shadow-sm shrink-0 mt-0.5">
                    <Sparkles size={18} />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-[14px] font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>{notif.title}</h4>
                      <span className={`text-[14px] font-mono ${isDark ? 'text-[#F4EE8E]/70' : 'text-amber-900/80'}`}>{notif.timestamp}</span>
                      {!notif.isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                      )}
                    </div>
                    <p className={`text-[14px] leading-relaxed whitespace-pre-line line-clamp-2 ${isDark ? 'text-[#F4EE8E]/90' : 'text-amber-950'}`}>{notif.message}</p>
                  </div>
                </div>

                {/* Action Button if notification has target URL */}
                {notifUrl && (
                  <div className="sm:self-center shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionClick(notifUrl);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl text-[14px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm text-amber-950 bg-amber-200/80 border-amber-900/30 hover:bg-amber-300 dark:text-[#F4EE8E] dark:bg-amber-400/20 dark:border-amber-400/50 dark:hover:bg-amber-400/30"
                    >
                      <span>{buttonLabel}</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 rounded-3xl border border-amber-500/30 bg-transparent text-zinc-800 dark:text-[#F4EE8E] text-[14px] font-sans flex flex-col items-center justify-center space-y-4">
            <img 
              src="/file/33/iirr7.png" 
              alt="Уведомлений нет" 
              className="w-24 h-24 object-contain animate-bounce-slow select-none"
            />
            <p className="text-zinc-800 dark:text-[#F4EE8E] font-medium">список пуст. новых уведомлений и рекомендаций ИИ нет.</p>
          </div>
        )}
      </div>

      {/* NOTIFICATION DETAIL MODAL */}
      {selectedNotif && (() => {
        const modalUrl = resolveNotificationUrl(selectedNotif);
        const modalBtnLabel = resolveNotificationButtonLabel(selectedNotif);

        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent backdrop-blur-md animate-fade-in font-sans"
            onClick={() => setSelectedNotif(null)}
          >
            <div 
              className={`w-full max-w-lg border-2 rounded-3xl p-6 space-y-4 relative backdrop-blur-xl ${
                isDark
                  ? 'border-[#E7C768]/70 bg-[#140A01]/80 text-white shadow-[0_0_35px_rgba(244,238,142,0.3)]'
                  : 'border-amber-900/50 bg-[#FFFBF5]/90 text-amber-950 shadow-2xl'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedNotif(null)}
                className={`absolute top-4 right-4 transition-colors p-1 rounded-lg cursor-pointer ${
                  isDark ? 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-400/10' : 'text-amber-900 hover:bg-amber-900/10'
                }`}
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 border-b border-amber-500/30 pb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold border border-amber-300/50 shadow-sm shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={`text-base font-bold truncate ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>{selectedNotif.title}</h4>
                  <span className={`text-[14px] font-mono ${isDark ? 'text-amber-300/85' : 'text-amber-900/80'}`}>{selectedNotif.timestamp}</span>
                </div>
              </div>

              <div className={`max-h-[60vh] overflow-y-auto pr-2 space-y-2 font-sans text-[14px] leading-relaxed whitespace-pre-line ${isDark ? 'text-amber-50' : 'text-amber-950'}`}>
                {selectedNotif.message}
              </div>

              <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between gap-3">
                {modalUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNotif(null);
                      handleActionClick(modalUrl);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-[14px] border border-amber-300/80 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <span>{modalBtnLabel}</span>
                    <ExternalLink size={15} />
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedNotif(null)}
                  className={`px-4 py-2.5 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
                    isDark ? 'border-amber-400/40 text-amber-100 hover:bg-amber-400/15' : 'border-amber-900/35 text-amber-950 hover:bg-amber-900/10'
                  }`}
                >
                  закрыть
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

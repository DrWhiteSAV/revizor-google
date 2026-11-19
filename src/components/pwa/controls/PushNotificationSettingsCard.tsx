import React from 'react';
import { BellRing, BellOff, Smartphone, Check, Send, AlertCircle } from 'lucide-react';
import { usePWAInstall } from '../usePWAInstall';
import { PWAInstallProfileButton } from '../PWAInstallProfileButton';
import { usePushNotifications } from '../usePushNotifications';

interface PushNotificationSettingsCardProps {
  userId?: string | null;
  theme?: 'dark' | 'light';
  compact?: boolean;
}

export const PushNotificationSettingsCard: React.FC<PushNotificationSettingsCardProps> = ({
  userId,
  theme,
  compact = false
}) => {
  const { isInstalled, isIOS } = usePWAInstall();
  const {
    isSupported,
    permission,
    isSubscribed,
    settings,
    loading,
    statusMessage,
    errorMessage,
    subscribeDevice,
    togglePushEnabled,
    updateCategory,
    sendTestPush
  } = usePushNotifications(userId);

  const resolvedTheme: 'dark' | 'light' =
    theme ??
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
      ? 'light'
      : 'dark');
  const isDark = resolvedTheme === 'dark';

  const containerClass = isDark
    ? 'bg-transparent border-[#E7C768]/45 text-white shadow-[0_0_24px_rgba(244,238,142,0.14)]'
    : 'bg-transparent border-amber-900/35 text-amber-950';

  const innerCardClass = isDark
    ? 'bg-transparent border-amber-400/35 text-amber-50'
    : 'bg-transparent border-amber-900/25 text-amber-950';

  return (
    <div
      className={`rounded-2xl border backdrop-blur-md p-4 sm:p-5 space-y-4 transition-all font-sans ${containerClass}`}
      id="push-notification-settings-card"
    >
      {/* Header + Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 flex items-center justify-center shrink-0 shadow-md border border-amber-300/70">
            {settings.push_enabled ? <BellRing size={20} /> : <BellOff size={20} />}
          </div>
          <div className="min-w-0 space-y-1">
            <h4 className={`text-base font-bold leading-snug ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              Push-уведомления на телефон и ПК (PWA)
            </h4>
            <p className={`text-[14px] leading-relaxed ${isDark ? 'text-amber-100/85' : 'text-amber-900'}`}>
              Мгновенное оповещение о новых отчетах, напоминаниях о дедлайнах и начислениях зарплаты по мотивации.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading || !userId}
          onClick={() => togglePushEnabled(!settings.push_enabled, isInstalled)}
          className={`min-h-[44px] px-4 py-2 rounded-xl border font-bold text-[14px] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
            settings.push_enabled
              ? 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300/80 shadow-md'
              : isDark
                ? 'bg-transparent border-amber-400/40 text-amber-100 hover:bg-amber-400/15'
                : 'bg-transparent border-amber-900/35 text-amber-950 hover:bg-amber-900/10'
          }`}
          id="push-master-toggle-btn"
        >
          <span>{settings.push_enabled ? 'Пуши включены' : 'Пуши отключены'}</span>
        </button>
      </div>

      {/* Recommendation to install PWA on mobile */}
      <div className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${innerCardClass}`}>
        <div className="flex items-start gap-3 min-w-0">
          <Smartphone size={20} className={`shrink-0 mt-0.5 ${isDark ? 'text-[#E7C768]' : 'text-amber-800'}`} />
          <div className="min-w-0 space-y-1">
            <p className={`text-[14px] font-bold leading-snug ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              {isInstalled
                ? 'Приложение PWA уже установлено на ваше устройство'
                : 'Рекомендуем установить приложение PWA на телефон'}
            </p>
            <p className={`text-[14px] leading-relaxed ${isDark ? 'text-amber-100/85' : 'text-amber-900'}`}>
              {isInstalled
                ? `Push-уведомления доставляются напрямую на главный экран даже при свернутом приложении.${settings.activeDevicesCount > 0 ? ` Активных устройств: ${settings.activeDevicesCount}.` : ''}`
                : isIOS
                  ? 'Чтобы получать уведомления на iPhone с отчетами, напоминаниями и расчетами KPI, откройте сайт в Safari и нажмите «Поделиться» → «На экран Домой».'
                  : 'Если вы хотите получать уведомления с отчетами, напоминаниями и начислениями прямо на телефон — установите PWA-приложение на экран смартфона.'}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <PWAInstallProfileButton theme={resolvedTheme} />
        </div>
      </div>

      {/* Device permission / subscribe controls */}
      {settings.push_enabled && (
        <div className="space-y-3">
          {!compact && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'push_reports' as const, label: 'Отчеты и проверки ИИ', desc: 'Напоминания, сдача и вердикты' },
                { key: 'push_motivation' as const, label: 'Мотивация и KPI', desc: 'Ежедневные начисления заработка' },
                { key: 'push_tasks' as const, label: 'Задачи ИИ Ревизора', desc: 'Новые задачи и дедлайны' }
              ].map((item) => {
                const checked = settings[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateCategory(item.key, !checked)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      checked
                        ? isDark
                          ? 'bg-transparent border-[#E7C768]/70 text-white'
                          : 'bg-transparent border-amber-900/50 text-amber-950'
                        : isDark
                          ? 'bg-transparent border-amber-400/25 text-amber-100/70'
                          : 'bg-transparent border-amber-900/20 text-amber-900/80'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                        checked
                          ? 'bg-gradient-to-br from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] border-amber-400 text-amber-950'
                          : isDark
                            ? 'border-amber-400/50 bg-transparent'
                            : 'border-amber-900/40 bg-transparent'
                      }`}
                    >
                      {checked && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[14px] font-bold leading-snug ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                        {item.label}
                      </span>
                      <span className={`block text-[14px] leading-snug ${isDark ? 'text-amber-100/80' : 'text-amber-900'}`}>
                        {item.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {isSupported && (!isSubscribed || permission !== 'granted') && (
              <button
                type="button"
                disabled={loading || !userId}
                onClick={() => subscribeDevice(isInstalled)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 font-bold text-[14px] border border-amber-300/80 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                id="push-subscribe-device-btn"
              >
                <BellRing size={16} />
                <span>Разрешить пуши на этом устройстве</span>
              </button>
            )}

            {isSupported && (
              <button
                type="button"
                disabled={loading || !userId}
                onClick={() => sendTestPush(isInstalled)}
                className={`min-h-[44px] px-4 py-2 rounded-xl border font-bold text-[14px] transition-all cursor-pointer flex items-center gap-2 ${
                  isDark
                    ? 'bg-transparent border-amber-400/50 text-[#F4EE8E] hover:bg-amber-400/15'
                    : 'bg-transparent border-amber-900/40 text-amber-950 hover:bg-amber-900/10'
                }`}
                id="push-test-btn"
              >
                <Send size={16} />
                <span>Проверить push-уведомление</span>
              </button>
            )}
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-[14px] font-medium flex items-start gap-2 ${
            isDark ? 'border-[#E7C768]/60 text-[#F4EE8E]' : 'border-amber-900/40 text-amber-950'
          }`}
        >
          <Check size={16} className="shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className={`p-3 rounded-xl border text-[14px] font-medium flex items-start gap-2 ${
            isDark ? 'border-amber-400/60 text-amber-200' : 'border-amber-900/50 text-amber-950'
          }`}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

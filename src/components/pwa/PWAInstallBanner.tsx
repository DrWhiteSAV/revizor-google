import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

interface PWAInstallBannerProps {
  theme: 'dark' | 'light';
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ theme }) => {
  const { isInstallable, isInstalled, isIOS, isMobile, isDismissed, dismissFor14Days, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Only show in cabinet when not installed and not snoozed for 14 days
  const shouldShow = !isInstalled && !isDismissed && (isInstallable || isMobile);
  if (!shouldShow && !showGuide) return null;

  const isDark = theme === 'dark';

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'unavailable') {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {shouldShow && (
        <div
          className={`mb-4 p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark
              ? 'bg-transparent border-[#E7C768]/50 text-white shadow-[0_0_24px_rgba(244,238,142,0.18)]'
              : 'bg-transparent border-amber-800/35 text-amber-950 shadow-sm'
          }`}
          id="cabinet-pwa-install-banner"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone size={20} />
            </div>
            <div className="min-w-0">
              <p className={`text-[14px] font-extrabold leading-snug ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Добавить «ИИ Ревизор» на экран смартфона
              </p>
              <p className={`text-[14px] leading-snug ${isDark ? 'text-amber-100/80' : 'text-amber-900'}`}>
                Чтобы получать уведомления с отчетами, напоминаниями и расчетами KPI прямо на телефон — установите PWA
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-[14px] shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <Download size={16} />
              <span>Установить</span>
            </button>

            <button
              type="button"
              onClick={dismissFor14Days}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-[14px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-amber-400/40 text-amber-100 hover:bg-amber-400/15'
                  : 'border-amber-800/30 text-amber-950 hover:bg-amber-100/60'
              }`}
              title="Напомнить через 14 дней"
            >
              <X size={16} />
              <span>Через 14 дней</span>
            </button>
          </div>
        </div>
      )}

      <PWAInstallGuideModal
        isOpen={showGuide}
        isIOS={isIOS}
        theme={theme}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
};

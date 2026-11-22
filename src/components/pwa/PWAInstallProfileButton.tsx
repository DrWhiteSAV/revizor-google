import React, { useState } from 'react';
import { Download, CheckCircle2, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from './usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

interface PWAInstallProfileButtonProps {
  theme?: 'dark' | 'light';
  label?: string;
  installedLabel?: string;
  iconOnlyOnMobile?: boolean;
  className?: string;
}

export const PWAInstallProfileButton: React.FC<PWAInstallProfileButtonProps> = ({
  theme,
  label = 'Установить',
  installedLabel = 'Установлено',
  iconOnlyOnMobile = false,
  className = ''
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const resolvedTheme: 'dark' | 'light' =
    theme ??
    (typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
      ? 'light'
      : 'dark');
  const isDark = resolvedTheme === 'dark';

  const handleAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInstallable) {
      const res = await install();
      if (res === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  if (isInstalled) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`min-h-[42px] px-3 py-2 rounded-xl border text-[14px] font-semibold flex items-center justify-center gap-2 bg-transparent min-w-0 ${
          isDark
            ? 'border-amber-400/45 text-[#F4EE8E]'
            : 'border-amber-900/35 text-amber-950'
        } ${className}`}
        title={installedLabel}
      >
        <CheckCircle2 size={16} className="shrink-0" />
        <span className={iconOnlyOnMobile ? 'hidden sm:inline truncate' : 'truncate'}>
          {installedLabel}
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        title={label}
        aria-label={label}
        className={`min-h-[42px] px-2.5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-[14px] border border-amber-300/80 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:brightness-105 active:scale-95 min-w-0 ${className}`}
        id="profile-notifications-pwa-install-btn"
      >
        <Download size={16} className="shrink-0" />
        <span className={iconOnlyOnMobile ? 'hidden sm:inline whitespace-nowrap' : 'whitespace-nowrap'}>
          {label}
        </span>
      </button>

      <PWAInstallGuideModal
        isOpen={showGuide}
        isIOS={isIOS}
        theme={resolvedTheme}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
};

export const OfflineIndicator: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  const isDark = theme === 'dark';

  return (
    <div
      className={`mb-3 px-4 py-2.5 rounded-2xl border backdrop-blur-md flex items-center gap-2.5 text-[14px] font-bold ${
        isDark
          ? 'bg-transparent border-amber-400/60 text-[#F4EE8E]'
          : 'bg-transparent border-amber-800/50 text-amber-950'
      }`}
      role="status"
    >
      <WifiOff size={16} className="shrink-0" />
      <span>Нет подключения к интернету — доступны сохраненные разделы</span>
    </div>
  );
};

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface MobileScreenOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface MobileScreenSwitcherProps {
  screens: MobileScreenOption[];
  activeScreen: string;
  onSelectScreen: (id: string) => void;
  className?: string;
  showBottomPager?: boolean;
}

export const MobileScreenSwitcher: React.FC<MobileScreenSwitcherProps> = ({
  screens,
  activeScreen,
  onSelectScreen,
  className = '',
  showBottomPager = true
}) => {
  const currentIndex = screens.findIndex((s) => s.id === activeScreen);
  const currentScreen = screens[currentIndex] || screens[0];

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectScreen(screens[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentIndex < screens.length - 1) {
      onSelectScreen(screens[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className={`w-full flex flex-col gap-3 ${className}`} id="mobile-screen-switcher">
      {/* Top Bubble Selector Bar */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto py-2 px-1 scrollbar-none select-none">
        {screens.map((screen, idx) => {
          const isActive = screen.id === activeScreen;
          return (
            <button
              key={screen.id}
              type="button"
              onClick={() => {
                onSelectScreen(screen.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold border transition-all cursor-pointer ${
                isActive
                  ? 'border-amber-400/80 bg-[#1A0F02]/85 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                  : 'border-amber-400/25 bg-black/40 text-stone-300 hover:text-white hover:border-amber-400/40'
              }`}
            >
              {screen.icon && <span className="shrink-0">{screen.icon}</span>}
              <span className="whitespace-nowrap">{idx + 1}. {screen.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Pager Controls (Optional or renders below content) */}
      {showBottomPager && (
        <div className="w-full flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-amber-400/40 bg-[#1A0F02]/80 backdrop-blur-md shadow-lg my-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold border border-amber-400/30 bg-black/40 text-[#F4EE8E] disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>Назад</span>
          </button>

          <div className="flex flex-col items-center text-center">
            <span className="text-[12px] font-mono text-amber-200/70">
              Экран {currentIndex + 1} из {screens.length}
            </span>
            <span className="text-sm font-bold text-white whitespace-nowrap">
              {currentScreen.label}
            </span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= screens.length - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold border border-amber-400/60 bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer"
          >
            <span>Далее</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

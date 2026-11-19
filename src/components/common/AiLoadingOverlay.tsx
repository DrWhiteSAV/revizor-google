import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Bot, ShieldAlert } from 'lucide-react';

interface AiLoadingOverlayProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  isLightTheme?: boolean;
  maxSeconds?: number;
  onCancel?: () => void;
}

export const AiLoadingOverlay: React.FC<AiLoadingOverlayProps> = ({
  isOpen,
  title = 'ИИ Ревизор RR обрабатывает запрос',
  subtitle = 'Формирование и оптимизация структуры сведений...',
  isLightTheme = false,
  maxSeconds = 120,
  onCancel
}) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isOpen) {
      setSeconds(0);
      interval = setInterval(() => {
        setSeconds(prev => {
          if (prev >= maxSeconds) return maxSeconds;
          return prev + 1;
        });
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, maxSeconds]);

  if (!isOpen || typeof document === 'undefined') return null;

  const progressPercent = Math.min(100, Math.round((seconds / maxSeconds) * 100));

  return createPortal(
    <div 
      id="ai-loading-overlay-container" 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn backdrop-blur-md"
      style={{
        backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.72)' : 'rgba(20, 10, 1, 0.72)'
      }}
    >
      <div 
        id="ai-loading-card"
        className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl flex flex-col items-center text-center relative overflow-hidden transition-all"
        style={{
          backgroundColor: isLightTheme ? 'rgba(255, 251, 245, 0.96)' : 'rgba(26, 15, 2, 0.92)',
          borderColor: isLightTheme ? '#B47814' : '#E7C768',
          boxShadow: isLightTheme 
            ? '0 10px 35px rgba(217, 158, 65, 0.25), 0 2px 10px rgba(0,0,0,0.05)' 
            : '0 0 40px rgba(244, 238, 142, 0.25)'
        }}
      >
        {/* Glow Top Accent */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-2xl pointer-events-none opacity-40"
          style={{
            background: isLightTheme ? '#D99E41' : '#F4EE8E'
          }}
        />

        {/* Mascot IIRR5 / AI Neural Sphere Animation Container */}
        <div className="relative mb-5 mt-2 flex items-center justify-center">
          {/* Animated pulsing outer halo / aura */}
          <div 
            className="absolute -inset-4 rounded-full animate-pulse opacity-40 blur-xl pointer-events-none"
            style={{
              background: isLightTheme 
                ? 'radial-gradient(circle, #D99E41 0%, rgba(217,158,65,0) 70%)' 
                : 'radial-gradient(circle, #F4EE8E 0%, rgba(231,199,104,0) 70%)'
            }}
          />

          {/* Neural Sphere Container with Rotating Rings */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Outer Rotating Ring 1 */}
            <div 
              className="absolute inset-0 rounded-full border border-amber-400/40 border-t-amber-300 border-r-transparent animate-spin" 
              style={{ animationDuration: '6s' }}
            />
            {/* Outer Rotating Ring 2 (Reverse, angled) */}
            <div 
              className="absolute inset-1.5 rounded-full border border-dashed border-amber-500/50 border-b-amber-300 animate-spin" 
              style={{ animationDuration: '4s', animationDirection: 'reverse' }}
            />
            {/* Inner Glowing Orbit */}
            <div 
              className="absolute inset-3 rounded-full border border-amber-300/60 border-l-transparent animate-spin" 
              style={{ animationDuration: '3s' }}
            />
            
            {/* Neural Synapse Dots */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#F4EE8E] animate-pulse" />
            <div className="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#E7C768] animate-ping" />
            <div className="absolute top-3 left-1 w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_6px_#FFF8B4]" />

            {/* Centered Glass Pod with Mascot IIRR5 */}
            <div 
              className="w-20 h-20 rounded-full border-2 flex items-center justify-center relative overflow-hidden p-2.5 shadow-2xl backdrop-blur-md transition-transform duration-300 hover:scale-105"
              style={{
                backgroundColor: isLightTheme ? 'rgba(255, 253, 245, 0.9)' : 'rgba(20, 10, 1, 0.9)',
                borderColor: isLightTheme ? '#D99E41' : '#E7C768',
                boxShadow: isLightTheme 
                  ? 'inset 0 0 15px rgba(217, 158, 65, 0.3), 0 0 20px rgba(217, 158, 65, 0.2)' 
                  : 'inset 0 0 20px rgba(244, 238, 142, 0.25), 0 0 30px rgba(244, 238, 142, 0.3)'
              }}
            >
              <img 
                src="/file/36/rr-logo.png" 
                alt="Маскот IIRR5" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(244,238,142,0.6)] animate-pulse"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    const fallbackDiv = parent.querySelector('.mascot-fallback');
                    if (fallbackDiv) (fallbackDiv as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div 
                className="mascot-fallback hidden w-full h-full items-center justify-center"
              >
                <Bot className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Animated Neural Sphere Micro-Animation (Replaces raw text "IIRR5 Сфера") */}
          <div 
            className="absolute -bottom-2.5 px-3 py-1 rounded-full border shadow-md flex items-center gap-2 z-10 overflow-hidden backdrop-blur-md"
            style={{
              backgroundColor: isLightTheme ? 'rgba(250, 246, 236, 0.95)' : 'rgba(42, 23, 5, 0.95)',
              borderColor: isLightTheme ? '#D99E41' : '#E7C768',
              boxShadow: isLightTheme ? '0 0 15px rgba(217, 158, 65, 0.4)' : '0 0 20px rgba(244, 238, 142, 0.4)'
            }}
          >
            {/* Left Synaptic Spinner */}
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
              <div 
                className="w-3 h-3 rounded-full border border-amber-400 border-t-transparent animate-spin" 
                style={{ animationDuration: '1.5s' }}
              />
              <div className="absolute w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_4px_#F4EE8E]" />
            </div>

            {/* Tri-Node Neural Synapse Waves */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_#F4EE8E] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_#FFF8B4] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_4px_#E7C768] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>

            {/* Right Orbital Synapse */}
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <div 
                className="w-3 h-3 rounded-full border border-amber-400 border-b-transparent animate-spin" 
                style={{ animationDuration: '2s', animationDirection: 'reverse' }}
              />
              <div className="absolute w-1 h-1 rounded-full bg-amber-300 shadow-[0_0_4px_#F4EE8E]" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 
          className="text-base font-black mb-1.5 px-2"
          style={{ color: isLightTheme ? '#451A03' : '#F4EE8E' }}
        >
          {title}
        </h3>

        {/* Subtitle */}
        <p 
          className="text-sm font-semibold mb-4 px-2 opacity-90 leading-relaxed"
          style={{ color: isLightTheme ? '#78350F' : '#E7C768' }}
        >
          {subtitle}
        </p>

        {/* Timer Box (0 to 120s) */}
        <div 
          className="w-full py-2 px-3 rounded-2xl border mb-3 flex items-center justify-between font-mono"
          style={{
            backgroundColor: isLightTheme ? '#FAF6EC' : 'rgba(20, 10, 1, 0.6)',
            borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.3)' : 'rgba(231, 199, 104, 0.3)'
          }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span 
              className="text-sm font-black tracking-wide"
              style={{ color: isLightTheme ? '#78350F' : '#E7C768' }}
            >
              Время ожидания:
            </span>
          </div>
          
          <div 
            className="text-sm font-black tracking-widest"
            style={{ color: isLightTheme ? '#451A03' : '#F4EE8E' }}
          >
            {seconds} <span className="text-sm font-normal opacity-75">/ {maxSeconds} сек</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div 
          className="w-full h-2 rounded-full overflow-hidden mb-4 p-0.5 border"
          style={{
            backgroundColor: isLightTheme ? '#EAE0CC' : '#140A01',
            borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.2)' : 'rgba(231, 199, 104, 0.2)'
          }}
        >
          <div 
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${Math.max(5, progressPercent)}%`,
              background: isLightTheme 
                ? 'linear-gradient(90deg, #D99E41, #F4EE8E)' 
                : 'linear-gradient(90deg, #E7C768, #F4EE8E)'
            }}
          />
        </div>

        {/* Optional Cancel Button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-bold px-4 py-1.5 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
            style={{
              borderColor: isLightTheme ? 'rgba(180, 120, 20, 0.4)' : 'rgba(231, 199, 104, 0.4)',
              color: isLightTheme ? '#78350F' : '#E7C768'
            }}
          >
            Отменить ожидание
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';

interface AIOverlayProps {
  isOpen: boolean;
  onClose?: () => void;
  onRetry?: () => void;
  isLoading: boolean;
  error: string | null;
  countdown: number;
  mascotType?: 'welcome' | 'bell' | 'serious' | 'happy' | 'success' | 'clock' | 'test' | 'sad';
  customTitle?: string;
  customPhrase?: string;
}

const MASCOTS = {
  welcome: '/file/27/iirr1.png', // friendly RR greets
  bell: '/file/33/iirr7.png',    // notifications with megaphone
  serious: '/file/32/iirr6.png', // crossed arms
  happy: '/file/26/iirr13.png',   // flying on rocket & waving
  success: '/file/28/iirr2.png', // shows report checklist
  clock: '/file/31/iirr5.png',   // serious points to watch/clock
  test: '/file/29/iirr3.png',    // thinks with a question mark
  sad: '/file/30/iirr4.png',     // broken & sad with error
};

const WAITING_PHRASES = [
  "Связываюсь с главным процессором ИИ...",
  "Оптимизирую нейросети для вашего отчета...",
  "Робот RR полирует формулировки...",
  "Анализирую показатели эффективности...",
  "Сравниваю план с фактом...",
  "Формирую индивидуальные рекомендации для вас...",
  "Затачиваю цифровой карандаш для записи...",
  "Проверяю орфографию и деловой стиль текста...",
  "Сдуваю космическую пыль со серверов...",
  "Подсчитываю баллы качества заполнения...",
  "Изучаю ваш индивидуальный рабочий график...",
  "Ищу скрытые резервы повышения вашей эффективности...",
  "Готовлю порцию профессионального вдохновения...",
  "Конструирую идеальную структуру рапорта...",
  "Перевожу мысли в структурированный текст...",
  "Применяю стандарты Apple Liquid Glass к тексту...",
  "Интегрирую полезные подсказки в Telegram...",
  "Проверяю баланс и реферальные бонусы...",
  "Маскот RR одобрительно кивает вашему прогрессу...",
  "Почти готово! Финализирую рекомендации..."
];

export default function AIOverlay({
  isOpen,
  onClose,
  onRetry,
  isLoading,
  error,
  countdown,
  mascotType = 'welcome',
  customTitle,
  customPhrase
}: AIOverlayProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Cycle through waiting phrases every 4 seconds when loading
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % WAITING_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentMascot = error ? MASCOTS.sad : MASCOTS[mascotType] || MASCOTS.welcome;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" 
      id="ai-overlay-container"
      style={{
        backgroundColor: 'rgba(20, 10, 1, 0.72)'
      }}
    >
      <div 
        className="relative w-full max-w-lg overflow-hidden border rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl transition-all" 
        id="ai-overlay-card"
        style={{
          backgroundColor: 'rgba(26, 15, 2, 0.95)',
          borderColor: '#E7C768',
          boxShadow: '0 0 40px rgba(244, 238, 142, 0.25)'
        }}
      >
        {/* Glow Top Accent */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-2xl pointer-events-none opacity-40"
          style={{
            background: '#F4EE8E'
          }}
        />
        
        {/* Close Button if error or not strictly loading */}
        {(!isLoading || error) && onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full border transition-all cursor-pointer"
            style={{
              borderColor: 'rgba(231, 199, 104, 0.3)',
              backgroundColor: 'rgba(42, 23, 5, 0.9)',
              color: '#F4EE8E'
            }}
            id="ai-overlay-close-btn"
          >
            <X size={18} />
          </button>
        )}

        {/* Liquid Glass Neural Mascot Sphere with Rotating Rings */}
        <div className="relative mb-5 mt-2 flex items-center justify-center">
          {/* Animated Pulsing Outer Halo */}
          <div 
            className="absolute -inset-4 rounded-full animate-pulse opacity-40 blur-xl pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #F4EE8E 0%, rgba(231,199,104,0) 70%)'
            }}
          />

          {/* Rotating Rings & Synapses Container */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Outer Rotating Ring 1 */}
            <div 
              className="absolute inset-0 rounded-full border border-amber-400/40 border-t-amber-300 border-r-transparent animate-spin" 
              style={{ animationDuration: '6s' }}
            />
            {/* Outer Reverse Ring 2 */}
            <div 
              className="absolute inset-1.5 rounded-full border border-dashed border-amber-500/50 border-b-amber-300 animate-spin" 
              style={{ animationDuration: '4s', animationDirection: 'reverse' }}
            />
            {/* Inner Glowing Orbit */}
            <div 
              className="absolute inset-3 rounded-full border border-amber-300/60 border-l-transparent animate-spin" 
              style={{ animationDuration: '3s' }}
            />
            
            {/* Synapse dots */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#F4EE8E] animate-pulse" />
            <div className="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#E7C768] animate-ping" />
            <div className="absolute top-3 left-1 w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_6px_#FFF8B4]" />

            {/* Mascot Pod */}
            <div 
              className="w-20 h-20 rounded-full border-2 flex items-center justify-center relative overflow-hidden p-2 shadow-2xl backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(20, 10, 1, 0.9)',
                borderColor: '#E7C768',
                boxShadow: 'inset 0 0 20px rgba(244, 238, 142, 0.25), 0 0 30px rgba(244, 238, 142, 0.3)'
              }}
            >
              <img 
                src={currentMascot} 
                alt="Маскот ИИ" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(244,238,142,0.6)] animate-pulse"
                referrerPolicy="no-referrer"
                id="ai-overlay-mascot"
              />
            </div>
          </div>

          {/* Micro Synapse Bar */}
          <div 
            className="absolute -bottom-2 px-3 py-0.5 rounded-full border shadow-md flex items-center gap-2 z-10 overflow-hidden backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(42, 23, 5, 0.95)',
              borderColor: '#E7C768',
              boxShadow: '0 0 20px rgba(244, 238, 142, 0.4)'
            }}
          >
            <div className="relative w-3 h-3 flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
              <div className="w-2.5 h-2.5 rounded-full border border-amber-400 border-t-transparent animate-spin" />
            </div>
            <span className="text-sm font-semibold text-[#F4EE8E] tracking-tight">
              {customTitle || 'ИИ Ревизор в работе'}
            </span>
          </div>
        </div>

        {error ? (
          /* Error State */
          <div className="text-center w-full flex flex-col items-center animate-fade-in" id="ai-overlay-error-state">
            <div 
              className="w-12 h-12 rounded-full border flex items-center justify-center mb-4"
              style={{
                backgroundColor: 'rgba(180, 83, 9, 0.2)',
                borderColor: '#E7C768',
                color: '#F4EE8E'
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-[#F4EE8E]">
              Произошла ошибка
            </h3>
            <p className="text-[#E7C768] text-sm mb-6 max-w-xs leading-relaxed opacity-90">
              {error || "ИИ-сервис временно недоступен или превышено время ожидания."}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-6 py-3 font-semibold rounded-2xl border text-slate-900 shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer text-sm"
                style={{
                  backgroundColor: '#E7C768',
                  borderColor: '#F4EE8E',
                  boxShadow: '0 4px 15px rgba(231, 199, 104, 0.35)'
                }}
                id="ai-overlay-retry-btn"
              >
                <RefreshCw size={16} className="animate-spin-reverse" />
                Запустить повторно
              </button>
            )}
          </div>
        ) : (
          /* Loading / Active State */
          <div className="text-center w-full flex flex-col items-center animate-fade-in" id="ai-overlay-loading-state">
            {/* Bubble Dialog */}
            <div 
              className="relative rounded-2xl p-4 mb-5 max-w-md w-full shadow-lg text-sm italic leading-relaxed border backdrop-blur-md" 
              id="ai-overlay-bubble"
              style={{
                backgroundColor: 'rgba(42, 23, 5, 0.85)',
                borderColor: 'rgba(231, 199, 104, 0.3)',
                color: '#F4EE8E'
              }}
            >
              <p className="animate-pulse">{customPhrase || WAITING_PHRASES[phraseIndex]}</p>
            </div>

            {/* Countdown and Visual Loader */}
            <div className="flex flex-col items-center gap-1.5 w-full" id="ai-overlay-countdown-container">
              <div 
                className="text-2xl font-mono font-bold"
                style={{ color: '#F4EE8E' }}
              >
                {countdown}s
              </div>
              <p className="text-sm font-semibold text-[#E7C768] tracking-wide">
                Время ожидания (макс. 120 сек)
              </p>
              
              {/* Progress bar */}
              <div 
                className="w-48 h-2 rounded-full mt-2 overflow-hidden border p-0.5"
                style={{
                  backgroundColor: '#140A01',
                  borderColor: 'rgba(231, 199, 104, 0.2)'
                }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ 
                    width: `${Math.max(5, (countdown / 120) * 100)}%`,
                    background: 'linear-gradient(90deg, #E7C768, #F4EE8E)'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

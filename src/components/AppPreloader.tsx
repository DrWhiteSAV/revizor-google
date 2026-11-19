import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface AppPreloaderProps {
  onComplete: () => void;
  onTelegramUserLoaded?: (user: any) => void;
}

// Complete registry of all external images used across the application for strict caching
const ASSETS_TO_PRELOAD = [
  '/file/36/rr-logo.png',
  '/file/27/iirr1.png',
  '/file/28/iirr2.png',
  '/file/29/iirr3.png',
  '/file/30/iirr4.png',
  '/file/31/iirr5.png',
  '/file/32/iirr6.png',
  '/file/33/iirr7.png',
  '/file/34/iirr8.png',
  '/file/35/iirr9.png',
  '/file/23/iirr10.png',
  '/file/24/iirr11.png',
  '/file/25/iirr12.png',
  '/file/26/iirr13.png',
  'https://t.me/i/userpic/320/shishkarnem.jpg'
];

export default function AppPreloader({ onComplete, onTelegramUserLoaded }: AppPreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [statusText, setStatusText] = useState('Загрузка графических ресурсов...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Check if running inside Telegram MiniApp
  const tgWebApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined;
  const isInsideTelegram = Boolean(
    tgWebApp && (
      tgWebApp.initData || 
      (tgWebApp.initDataUnsafe && tgWebApp.initDataUnsafe.user)
    )
  );

  // Automatic Telegram MiniApp Authentication Flow
  useEffect(() => {
    if (!isInsideTelegram || !tgWebApp) return;

    let mounted = true;
    const initData = tgWebApp.initData || '';
    const initDataUnsafe = tgWebApp.initDataUnsafe || {};

    setStatusText('Авторизация в Telegram MiniApp...');

    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: initData || JSON.stringify(initDataUnsafe),
        initDataUnsafe
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!mounted) return;
        if (data.success && data.user) {
          setStatusText(`Вход выполнен! Добро пожаловать, ${data.user.first_name || data.user.name || 'пользователь'}!`);
          if (onTelegramUserLoaded) {
            onTelegramUserLoaded(data.user);
          }
        }
      })
      .catch(err => {
        console.warn('Telegram MiniApp auto-auth fetch warning:', err);
      });

    return () => {
      mounted = false;
    };
  }, [isInsideTelegram]);

  useEffect(() => {
    let mounted = true;
    let loaded = 0;
    const total = ASSETS_TO_PRELOAD.length;

    const updateProgress = (count: number) => {
      const pct = Math.round((count / total) * 100);
      setProgress(pct);

      if (pct < 25) {
        setStatusText(isInsideTelegram ? 'Синхронизация с Telegram...' : 'Загрузка логотипа и графики ИИ...');
      } else if (pct < 60) {
        setStatusText('Загрузка персонажей маскота ИИ Ревизора...');
      } else if (pct < 95) {
        setStatusText('Загрузка обложек базы знаний и аватаров...');
      } else {
        setStatusText('Загрузка всех медиафайлов сайта завершена!');
      }
    };

    const finishLoading = () => {
      if (!mounted) return;
      setIsSuccess(true);
      setStatusText('Загрузка сайта успешна! Все ресурсы загружены.');
      setTimeout(() => {
        if (!mounted) return;
        setIsDone(true);
        setTimeout(() => {
          if (mounted) {
            onComplete();
          }
        }, 400);
      }, 600);
    };

    // Preload each asset into browser image memory cache
    ASSETS_TO_PRELOAD.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        if (!mounted) return;
        loaded++;
        setLoadedCount(loaded);
        updateProgress(loaded);
        if (loaded >= total) {
          finishLoading();
        }
      };
      img.onerror = () => {
        if (!mounted) return;
        loaded++;
        setLoadedCount(loaded);
        updateProgress(loaded);
        if (loaded >= total) {
          finishLoading();
        }
      };
      img.src = src;
    });

    // Safety fallback timer if external CORS or connection lags severely
    const timeout = setTimeout(() => {
      if (mounted && loaded < total) {
        setProgress(100);
        finishLoading();
      }
    }, 12000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [onComplete, isInsideTelegram]);

  const handleSkip = () => {
    setIsDone(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#140A01] text-white transition-all duration-700 font-sans ${
        isDone ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100 scale-100'
      }`}
      id="app-initial-preloader"
    >
      {/* Dynamic inline styles for 3D Saturn surface rotation */}
      <style>{`
        @keyframes saturnSphereSpin {
          0% {
            transform: translateX(-300px);
          }
          100% {
            transform: translateX(0px);
          }
        }
        .animate-saturn-surface-spin {
          animation: saturnSphereSpin 6s linear infinite;
        }
      `}</style>

      {/* Background ambient gold glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-[#E7C768]/15 blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#F4EE8E]/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        
        {/* 3D SPHERICAL SATURN PLANET WITH STATIC RING AND ROTATING SPHERE SURFACE */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-4 flex items-center justify-center">
          <svg 
            viewBox="0 0 400 400" 
            className="w-full h-full overflow-visible drop-shadow-[0_0_35px_rgba(244,238,142,0.45)]"
          >
            <defs>
              {/* Light Theme Saturn Planet Sphere Base Radial Gradient */}
              <radialGradient id="preload-saturn-sphere-base" cx="35%" cy="30%" r="68%">
                <stop offset="0%" stopColor="#FFFDF2" />
                <stop offset="40%" stopColor="#F5EEC5" />
                <stop offset="75%" stopColor="#E5D6A0" />
                <stop offset="100%" stopColor="#CBB572" />
              </radialGradient>

              {/* Static 3D Specular Shadow Overlay for Volumetric Sphere Depth */}
              <radialGradient id="preload-saturn-sphere-shadow" cx="28%" cy="25%" r="72%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
                <stop offset="35%" stopColor="#FFF8D0" stopOpacity="0.1" />
                <stop offset="70%" stopColor="#B3923B" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#5E430B" stopOpacity="0.8" />
              </radialGradient>

              {/* Metallic Golden Ring Gradient */}
              <linearGradient id="preload-saturn-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F4EE8E" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#E7C768" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#D99E41" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#F4EE8E" stopOpacity="0.95" />
              </linearGradient>

              {/* Clip path for perfect 3D spherical ball */}
              <clipPath id="preload-saturn-sphere-clip">
                <circle cx="200" cy="200" r="135" />
              </clipPath>

              {/* Saturn Outer Glow Filter */}
              <filter id="preload-saturn-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. BACK PORTION OF SATURN RINGS (STATIC - Behind Planet Sphere) */}
            <g transform="translate(200, 200) rotate(-22)">
              <path 
                d="M 190,0 A 190 52 0 0 0 -190,0" 
                fill="none" 
                stroke="url(#preload-saturn-ring-grad)" 
                strokeWidth="12" 
                strokeLinecap="round" 
                opacity="0.85" 
              />
              <path 
                d="M 170,0 A 170 44 0 0 0 -170,0" 
                fill="none" 
                stroke="#F4EE8E" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                opacity="0.9" 
              />
              <path 
                d="M 150,0 A 150 38 0 0 0 -150,0" 
                fill="none" 
                stroke="#E7C768" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                opacity="0.6" 
              />
            </g>

            {/* 2. 3D SPHERICAL PLANET BALL BODY (Clipped to Circle with Rotating Surface Texture) */}
            <g clipPath="url(#preload-saturn-sphere-clip)">
              {/* Base Sphere Fill */}
              <circle 
                cx="200" 
                cy="200" 
                r="135" 
                fill="url(#preload-saturn-sphere-base)" 
                filter="url(#preload-saturn-glow)" 
              />

              {/* Surface Texture Group sliding horizontally across the sphere surface */}
              <g className="animate-saturn-surface-spin">
                {/* Seamless repeating surface texture bands */}
                {[0, 300, 600].map((offsetX) => (
                  <g key={offsetX} transform={`translate(${offsetX - 300}, 0)`}>
                    {/* Atmospheric Curved Band Lines */}
                    <path d="M 0,110 C 100,125 200,125 300,110 C 400,125 500,125 600,110" fill="none" stroke="#D99E41" strokeWidth="6" opacity="0.35" />
                    <path d="M 0,135 C 100,150 200,150 300,135 C 400,150 500,150 600,135" fill="none" stroke="#F4EE8E" strokeWidth="10" opacity="0.4" />
                    <path d="M 0,165 C 100,182 200,182 300,165 C 400,182 500,182 600,165" fill="none" stroke="#E7C768" strokeWidth="16" opacity="0.45" />
                    <path d="M 0,200 C 100,218 200,218 300,200 C 400,218 500,218 600,200" fill="none" stroke="#FFF8D0" strokeWidth="12" opacity="0.5" />
                    <path d="M 0,230 C 100,248 200,248 300,230 C 400,248 500,248 600,230" fill="none" stroke="#D99E41" strokeWidth="14" opacity="0.4" />
                    <path d="M 0,265 C 100,280 200,280 300,265 C 400,280 500,280 600,265" fill="none" stroke="#E7C768" strokeWidth="8" opacity="0.35" />
                    <path d="M 0,290 C 100,302 200,302 300,290 C 400,302 500,302 600,290" fill="none" stroke="#F4EE8E" strokeWidth="5" opacity="0.3" />
                    
                    {/* Surface Storm Spots */}
                    <ellipse cx="140" cy="180" rx="16" ry="10" fill="#E7C768" opacity="0.4" />
                    <ellipse cx="260" cy="235" rx="22" ry="12" fill="#D99E41" opacity="0.35" />
                  </g>
                ))}
              </g>

              {/* Static 3D Light & Volumetric Shadow Overlay */}
              <circle 
                cx="200" 
                cy="200" 
                r="135" 
                fill="url(#preload-saturn-sphere-shadow)" 
                style={{ mixBlendMode: 'multiply' }}
              />
            </g>

            {/* Planet Outer Gold Ring Outline */}
            <circle 
              cx="200" 
              cy="200" 
              r="135" 
              fill="none" 
              stroke="#F4EE8E" 
              strokeWidth="3.5" 
              strokeOpacity="0.95" 
            />

            {/* 3. FRONT PORTION OF SATURN RINGS (STATIC - In Front of Lower Planet Sphere) */}
            <g transform="translate(200, 200) rotate(-22)">
              <path 
                d="M -190,0 A 190 52 0 0 0 190,0" 
                fill="none" 
                stroke="url(#preload-saturn-ring-grad)" 
                strokeWidth="12" 
                strokeLinecap="round" 
              />
              <path 
                d="M -170,0 A 170 44 0 0 0 170,0" 
                fill="none" 
                stroke="#F4EE8E" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              <path 
                d="M -150,0 A 150 38 0 0 0 150,0" 
                fill="none" 
                stroke="#E7C768" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                opacity="0.7" 
              />
            </g>
          </svg>

          {/* Central RR Logo inside planet */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/file/36/rr-logo.png" 
              alt="RR Logo" 
              className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(26,15,2,0.6)] animate-pulse"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-[#F4EE8E] to-[#E7C768] bg-clip-text text-transparent tracking-wide font-sans mb-1">
          ИИ РЕВИЗОР
        </h1>
        
        <p className="text-xs text-amber-200/90 font-mono tracking-wider uppercase mb-6 flex items-center gap-1.5 justify-center">
          {isSuccess ? (
            <CheckCircle2 size={13} className="text-emerald-400 animate-bounce" />
          ) : (
            <Sparkles size={13} className="text-[#F4EE8E] animate-spin" />
          )}
          <span>{isSuccess ? 'Загрузка сайта успешна!' : 'Загрузка медиа-ресурсов'}</span>
        </p>

        {/* Progress Bar Container */}
        <div className="w-full bg-black/50 rounded-full h-3.5 p-0.5 border border-amber-400/30 relative overflow-hidden mb-3 shadow-[0_0_15px_rgba(244,238,142,0.15)]">
          <div 
            className="h-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] rounded-full transition-all duration-300 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Info percentage & status */}
        <div className="w-full flex items-center justify-between text-xs font-mono text-amber-100/90 mb-2">
          <span className="truncate pr-2 text-[11px] text-amber-200/80">{statusText}</span>
          <span className="font-extrabold text-[#F4EE8E] shrink-0">{progress}%</span>
        </div>

        {/* Counter of loaded files */}
        <p className="text-[11px] text-amber-300/60 font-mono">
          Загружено {loadedCount} из {ASSETS_TO_PRELOAD.length} графических файлов
        </p>

        {/* Skip button - only visible when NOT inside Telegram MiniApp */}
        {!isInsideTelegram && (
          <button
            type="button"
            onClick={handleSkip}
            className="mt-6 px-6 py-2 rounded-full border border-[#E7C768]/50 bg-transparent text-[#F4EE8E] hover:bg-[#E7C768]/15 hover:border-[#F4EE8E] transition-all duration-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(231,199,104,0.15)] flex items-center gap-2 cursor-pointer"
          >
            <span>Пропустить</span>
            <ArrowRight size={14} />
          </button>
        )}

      </div>
    </div>
  );
}

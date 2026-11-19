import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Quote, Sparkles, MessageSquare } from 'lucide-react';
import { CustomAudioPlayer } from './voice/CustomAudioPlayer';

export interface Review {
  id: string;
  name: string;
  company: string;
  text: string;
  aiResponse?: string | null;
  officialResponse?: string;
  date: string;
  audio_url?: string;
  reactions?: Record<string, number>;
}

interface VerticalReviewsCarouselProps {
  reviews: Review[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  isCommentsOpen?: boolean;
  isWriteReviewOpen?: boolean;
  onToggleComments?: () => void;
  onToggleWriteReview?: () => void;
  isLightTheme?: boolean;
}

export default function VerticalReviewsCarousel({
  reviews,
  activeIndex,
  onChangeIndex,
  isCommentsOpen = false,
  isWriteReviewOpen = false,
  onToggleComments,
  onToggleWriteReview,
  isLightTheme: propIsLightTheme
}: VerticalReviewsCarouselProps) {
  const [isLightTheme, setIsLightTheme] = useState(() => {
    if (propIsLightTheme !== undefined) return propIsLightTheme;
    return typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');
  });

  useEffect(() => {
    if (propIsLightTheme !== undefined) {
      setIsLightTheme(propIsLightTheme);
      return;
    }
    const updateTheme = () => {
      setIsLightTheme(document.documentElement.classList.contains('theme-light'));
    };
    window.addEventListener('theme-changed', updateTheme);
    window.addEventListener('cabinet-theme-change', updateTheme);
    return () => {
      window.removeEventListener('theme-changed', updateTheme);
      window.removeEventListener('cabinet-theme-change', updateTheme);
    };
  }, [propIsLightTheme]);

  // Swipe & Drag gesture state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartX = useRef<number>(0);

  // Clamp activeIndex safely when reviews array updates asynchronously
  const safeIndex = reviews.length > 0 ? Math.min(Math.max(0, activeIndex), reviews.length - 1) : 0;

  const handleNext = () => {
    if (reviews.length === 0) return;
    onChangeIndex((safeIndex + 1) % reviews.length);
  };

  const handlePrev = () => {
    if (reviews.length === 0) return;
    onChangeIndex((safeIndex - 1 + reviews.length) % reviews.length);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null || touchStartX === null) return;
    const diffY = touchStartY - e.changedTouches[0].clientY;
    const diffX = touchStartX - e.changedTouches[0].clientX;

    if (Math.abs(diffY) > Math.abs(diffX)) {
      if (Math.abs(diffY) > 40) {
        if (diffY > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    } else {
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
    setTouchStartY(null);
    setTouchStartX(null);
  };

  // Mouse Drag Handlers for Desktop Swiping
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartX.current = e.clientX;
  };

  const handleMouseMove = () => {
    if (!isDragging) return;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diffY = dragStartY.current - e.clientY;
    const diffX = dragStartX.current - e.clientX;

    if (Math.abs(diffY) > Math.abs(diffX)) {
      if (Math.abs(diffY) > 40) {
        if (diffY > 0) handleNext();
        else handlePrev();
      }
    } else {
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) handleNext();
        else handlePrev();
      }
    }
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Get index helper with looping
  const getLoopIndex = (offset: number) => {
    if (reviews.length === 0) return 0;
    return (safeIndex + offset + reviews.length * 10) % reviews.length;
  };

  // Indices for our 5 slots
  const idxFarPrev = getLoopIndex(-2);
  const idxPrev = getLoopIndex(-1);
  const idxActive = safeIndex;
  const idxNext = getLoopIndex(1);
  const idxFarNext = getLoopIndex(2);

  // Helper to render preview / collapsed review card (NO avatar icon)
  const renderSideCard = (idx: number, level: 1 | 2, position: 'top' | 'bottom') => {
    if (reviews.length <= 1) return null;
    const rev = reviews[idx];
    if (!rev) return null;

    const isFar = level === 2;
    const scaleClass = isFar ? 'scale-90 opacity-45' : 'scale-95 opacity-75';
    const heightClass = isFar ? 'min-h-[60px]' : 'min-h-[72px]';

    return (
      <div
        onClick={() => onChangeIndex(idx)}
        className={`w-full ${heightClass} ${scaleClass} border p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 hover:scale-[0.98] select-none overflow-hidden relative group shadow-md ${
          isLightTheme
            ? 'bg-[#FFFBF5]/75 border-amber-400/60 hover:bg-amber-50/85'
            : 'bg-[#1A0F02]/55 border-amber-400/35 hover:bg-[#1A0F02]/75 hover:border-amber-400/60'
        }`}
        id={`review-side-${position}-${level}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`font-bold text-sm truncate ${isLightTheme ? 'text-amber-950' : 'text-white'}`}>
              {rev.name}
            </span>
            <span className={`text-sm font-mono shrink-0 ${isLightTheme ? 'text-amber-900/70' : 'text-zinc-300'}`}>
              {rev.date || 'Сегодня'}
            </span>
          </div>
          <p className={`text-sm truncate font-medium ${isLightTheme ? 'text-amber-900' : 'text-[#F4EE8E]'}`}>
            {rev.company}
          </p>
          <p className={`text-sm italic truncate mt-0.5 ${isLightTheme ? 'text-zinc-800' : 'text-zinc-200'}`}>
            "{rev.text}"
          </p>
        </div>
        <div className={`shrink-0 ${isLightTheme ? 'text-amber-700' : 'text-[#E7C768]'}`}>
          <Quote size={14} className="opacity-60" />
        </div>
      </div>
    );
  };

  const activeReview = reviews[idxActive];

  return (
    <div 
      className="flex flex-col gap-3 w-full max-w-2xl mx-auto"
      id="vertical-reviews-carousel-wrapper"
    >
      {/* Swipe instructions banner */}
      <div className={`text-center text-sm font-sans flex items-center justify-center gap-1.5 py-1 select-none ${
        isLightTheme ? 'text-amber-900/80' : 'text-zinc-300'
      }`}>
        <span className="animate-bounce">↕</span>
        <span>Проведите пальцем или зажмите мышь для переключения отзывов</span>
        <span className="animate-bounce">↕</span>
      </div>

      {/* Main vertical container */}
      <div 
        className={`relative flex flex-col items-center gap-2.5 py-4 px-1 rounded-3xl border select-none touch-pan-y backdrop-blur-md transition-all ${
          isLightTheme
            ? 'bg-[#FFFBF5]/75 border-amber-400/60 shadow-md'
            : 'bg-[#1A0F02]/55 border-amber-400/35 shadow-[0_0_20px_rgba(244,238,142,0.1)]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        id="vertical-carousel-container"
      >
        {/* Navigation Buttons */}
        {reviews.length > 1 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-md ${
                isLightTheme
                  ? 'border-amber-400/80 bg-amber-100 hover:bg-amber-200 text-amber-950'
                  : 'border-amber-400/40 bg-[#140A01]/80 hover:bg-[#1A0F02] text-white'
              }`}
              aria-label="Предыдущий отзыв"
              id="vertical-prev-btn"
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-md ${
                isLightTheme
                  ? 'border-amber-400/80 bg-amber-100 hover:bg-amber-200 text-amber-950'
                  : 'border-amber-400/40 bg-[#140A01]/80 hover:bg-[#1A0F02] text-white'
              }`}
              aria-label="Следующий отзыв"
              id="vertical-next-btn"
            >
              <ChevronDown size={18} />
            </button>
          </div>
        )}

        {/* TOP SIDES (2 Blocks) */}
        {reviews.length > 2 && (
          <div className="w-full flex flex-col gap-2 relative opacity-85 select-none px-2 sm:px-4">
            {renderSideCard(idxFarPrev, 2, 'top')}
            {renderSideCard(idxPrev, 1, 'top')}
          </div>
        )}

        {/* ACTIVE CARD (Center - NO avatar circle icon) */}
        {activeReview ? (
          <div 
            className={`w-full p-5 sm:p-7 rounded-3xl border space-y-4 relative overflow-hidden shadow-2xl scale-[1.01] sm:scale-[1.02] z-20 transition-all duration-300 mx-auto max-w-[98%] backdrop-blur-md ${
              isLightTheme
                ? 'bg-[#FFFBF5]/85 border-amber-400/80 text-amber-950 shadow-amber-900/10'
                : 'bg-[#1A0F02]/75 border-amber-400/50 text-white shadow-[0_0_30px_rgba(244,238,142,0.2)]'
            }`} 
            id={`review-active-card-${activeReview.id}`}
          >
            <div className="flex justify-between items-start sm:items-center text-sm flex-col sm:flex-row gap-2">
              <div>
                <span className={`font-bold text-base sm:text-lg block ${isLightTheme ? 'text-amber-950' : 'text-white'}`}>
                  {activeReview.name}
                </span>
                <span className={`font-semibold text-sm block mt-0.5 ${isLightTheme ? 'text-amber-900' : 'text-[#F4EE8E]'}`}>
                  {activeReview.company}
                </span>
              </div>
              <span className={`text-sm font-mono px-3 py-1 rounded-full border shrink-0 ${
                isLightTheme
                  ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                  : 'bg-[#140A01]/65 border-amber-400/30 text-zinc-200'
              }`}>
                {activeReview.date || 'Сегодня'}
              </span>
            </div>

            {/* Audio Player (rendered ABOVE text when audio is present) */}
            {activeReview.audio_url && (
              <div className="my-2.5 max-w-md">
                <CustomAudioPlayer
                  audioUrl={activeReview.audio_url}
                  isLightTheme={isLightTheme}
                />
              </div>
            )}

            {/* Review text */}
            <p className={`text-sm sm:text-base leading-relaxed pl-1 pt-1 font-sans ${
              isLightTheme ? 'text-zinc-900' : 'text-zinc-100'
            }`}>
              "{activeReview.text}"
            </p>

            {/* Responses */}
            {(activeReview.aiResponse || activeReview.officialResponse) && (
              <div className={`space-y-2.5 pt-3.5 border-t text-sm ${
                isLightTheme ? 'border-amber-900/10' : 'border-amber-400/20'
              }`}>
                {activeReview.aiResponse && (
                  <div className={`p-3.5 rounded-2xl space-y-1 border ${
                    isLightTheme
                      ? 'bg-amber-100/60 border-amber-300/80 text-amber-950'
                      : 'bg-[#140A01]/60 border-amber-400/30 text-zinc-100'
                  }`}>
                    <p className={`font-bold flex items-center gap-1.5 ${isLightTheme ? 'text-amber-900' : 'text-[#F4EE8E]'}`}>
                      <Sparkles size={14} className={isLightTheme ? "text-amber-700" : "text-[#E7C768]"} />
                      <span>Ответ ИИ:</span>
                    </p>
                    <p className="leading-relaxed font-sans">{activeReview.aiResponse}</p>
                  </div>
                )}
                {activeReview.officialResponse && (
                  <div className={`p-3.5 rounded-2xl space-y-1 border ${
                    isLightTheme
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-[#140A01]/45 border-amber-400/20 text-zinc-200'
                  }`}>
                    <p className={`font-bold ${isLightTheme ? 'text-amber-950' : 'text-zinc-300'}`}>
                      <span>Официальный ответ:</span>
                    </p>
                    <p className="leading-relaxed font-sans">{activeReview.officialResponse}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons inside the active review card */}
            <div className={`flex flex-wrap gap-2.5 pt-3.5 border-t ${
              isLightTheme ? 'border-amber-900/10' : 'border-amber-400/20'
            }`} id="review-card-actions">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComments?.();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-sans transition-all cursor-pointer border active:scale-95 ${
                  isCommentsOpen
                    ? (isLightTheme
                        ? 'bg-amber-300/80 border-amber-500 text-amber-950 shadow-sm'
                        : 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] border-[#F4EE8E] text-amber-950 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme
                        ? 'bg-amber-100/80 border-amber-300 text-amber-950 hover:bg-amber-200'
                        : 'bg-[#140A01]/70 border-amber-400/30 text-zinc-200 hover:text-white hover:border-amber-400/60')
                }`}
                id="toggle-review-comments-btn"
              >
                <MessageSquare size={15} />
                <span>Комментарии {isCommentsOpen ? '▲' : '▼'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWriteReview?.();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold font-sans transition-all cursor-pointer border active:scale-95 ${
                  isWriteReviewOpen
                    ? (isLightTheme
                        ? 'bg-amber-300/80 border-amber-500 text-amber-950 shadow-sm'
                        : 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] border-[#F4EE8E] text-amber-950 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme
                        ? 'bg-amber-100/80 border-amber-300 text-amber-950 hover:bg-amber-200'
                        : 'bg-[#140A01]/70 border-amber-400/30 text-zinc-200 hover:text-white hover:border-amber-400/60')
                }`}
                id="toggle-review-form-btn"
              >
                <span>✍️</span>
                <span>Оставить отзыв {isWriteReviewOpen ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`w-full p-6 rounded-3xl border space-y-4 text-center backdrop-blur-md mx-auto max-w-[98%] ${
              isLightTheme
                ? 'bg-[#FFFBF5]/85 border-amber-400/70 text-amber-950'
                : 'bg-[#1A0F02]/70 border-amber-400/45 text-white'
            }`}
            id="reviews-empty-card"
          >
            <p className="text-base font-bold">Отзывы загружаются из базы данных…</p>
            <p className={`text-sm ${isLightTheme ? 'text-amber-900/80' : 'text-zinc-300'}`}>
              Вы можете оставить первый отзыв прямо сейчас, и ИИ-ассистент ответит мгновенно.
            </p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWriteReview?.();
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold font-sans transition-all cursor-pointer border active:scale-95 ${
                  isLightTheme
                    ? 'bg-amber-200/80 border-amber-500 text-amber-950 hover:bg-amber-300'
                    : 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] border-[#F4EE8E] text-amber-950 shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                }`}
                id="toggle-review-form-btn"
              >
                <span>✍️</span>
                <span>Оставить отзыв {isWriteReviewOpen ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM SIDES (2 Blocks) */}
        {reviews.length > 2 && (
          <div className="w-full flex flex-col gap-2 relative opacity-85 select-none px-2 sm:px-4">
            {renderSideCard(idxNext, 1, 'bottom')}
            {renderSideCard(idxFarNext, 2, 'bottom')}
          </div>
        )}
      </div>

      {/* Progress / Dot Indicators */}
      {reviews.length > 0 && (
        <div className="flex gap-1.5 justify-center mt-1">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChangeIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === safeIndex
                  ? (isLightTheme ? 'bg-amber-600 w-6' : 'bg-[#E7C768] w-6')
                  : (isLightTheme ? 'bg-amber-300/60 hover:bg-amber-400 w-2' : 'bg-white/20 hover:bg-white/40 w-2')
              }`}
              aria-label={`Перейти к отзыву ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


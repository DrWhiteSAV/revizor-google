import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Monitor, Maximize2, Minimize2, VideoOff } from 'lucide-react';
import type { CommsTileSizePref } from '../../types/comms';

interface CommsCameraTileProps {
  displayName: string;
  avatarUrl?: string;
  stream: MediaStream | null;
  fallbackFrameUrl?: string | null;
  isLocal?: boolean;
  mirrorLocal?: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  maxRowHeightCss?: string;
  defaultMaxWidthCss?: string;
  customSize?: CommsTileSizePref;
  onResizeTile?: (next: CommsTileSizePref) => void;
  onResetTileSize?: () => void;
  onTogglePin?: () => void;
  onAutoplayBlocked?: () => void;
  theme?: 'dark' | 'light';
}

function clampAspectRatio(ratio: number): number | null {
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return Math.min(2.6, Math.max(0.45, ratio));
}

export const CommsCameraTile: React.FC<CommsCameraTileProps> = ({
  displayName,
  avatarUrl,
  stream,
  fallbackFrameUrl,
  isLocal = false,
  mirrorLocal = true,
  isMicOn,
  isCameraOn,
  isScreenSharing = false,
  isSpeaking = false,
  isPinned = false,
  maxRowHeightCss = 'calc(100dvh - 180px)',
  defaultMaxWidthCss = '100%',
  customSize,
  onResizeTile,
  onResetTileSize,
  onTogglePin,
  onAutoplayBlocked,
  theme = 'dark'
}) => {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isLight = theme === 'light';
  const [detectedAspect, setDetectedAspect] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobileViewport(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const track = stream?.getVideoTracks?.()?.[0];
    if (track && typeof track.getSettings === 'function') {
      const s = track.getSettings();
      const rawRatio =
        s.width && s.height
          ? s.width / s.height
          : typeof s.aspectRatio === 'number'
            ? s.aspectRatio
            : null;
      const clamped = rawRatio ? clampAspectRatio(rawRatio) : null;
      if (clamped) setDetectedAspect(clamped);
    } else if (!stream) {
      setDetectedAspect(null);
    }
  }, [stream, isCameraOn, isScreenSharing]);

  const syncVideoDimensions = () => {
    const el = videoRef.current;
    if (!el || !el.videoWidth || !el.videoHeight) return;
    const clamped = clampAspectRatio(el.videoWidth / el.videoHeight);
    if (clamped) setDetectedAspect(clamped);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = isLocal;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          if (!isLocal && err?.name === 'NotAllowedError' && onAutoplayBlocked) {
            onAutoplayBlocked();
          }
        });
      }
    } else {
      el.srcObject = null;
    }
  }, [stream, isLocal, onAutoplayBlocked]);

  const hasVideoTracks = Boolean(stream && stream.getVideoTracks().some((t) => t.enabled !== false && t.readyState !== 'ended'));
  const showFallbackImage = !hasVideoTracks && Boolean(fallbackFrameUrl) && isCameraOn;
  const showVideo = hasVideoTracks && (isCameraOn || isScreenSharing);

  const defaultAspect = isMobileViewport ? 1 : 16 / 9;
  const viewfinderAspect = (showVideo || showFallbackImage) && detectedAspect ? detectedAspect : defaultAspect;
  const effectiveAspect = customSize?.aspect ?? viewfinderAspect;
  const maxWidthCss =
    typeof customSize?.widthPct === 'number'
      ? `${Math.min(100, Math.max(28, customSize.widthPct))}%`
      : defaultMaxWidthCss;

  const startResize = (axis: 'x' | 'y' | 'xy', e: React.PointerEvent<HTMLDivElement>) => {
    if (!onResizeTile || !tileRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const tileEl = tileRef.current;
    const parentEl = tileEl.parentElement;
    const rect = tileEl.getBoundingClientRect();
    const parentWidth = Math.max(parentEl?.getBoundingClientRect().width || rect.width, rect.width, 200);
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = rect.width;
    const startH = rect.height;
    const initialAspect = customSize?.aspect ?? viewfinderAspect;

    setIsResizing(true);
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      let nextWidthPct = customSize?.widthPct;
      let nextAspect = customSize?.aspect;

      if (axis === 'x' || axis === 'xy') {
        const delta = axis === 'xy' ? (Math.abs(dx) >= Math.abs(dy) ? dx : dy * initialAspect) : dx;
        const nextW = Math.min(parentWidth, Math.max(160, startW + delta));
        nextWidthPct = Math.round(Math.min(100, Math.max(28, (nextW / parentWidth) * 100)) * 10) / 10;
      }

      if (axis === 'y') {
        const nextH = Math.max(130, startH + dy);
        const clampedAspect = clampAspectRatio(startW / nextH);
        if (clampedAspect) {
          nextAspect = Math.round(clampedAspect * 1000) / 1000;
        }
      }

      onResizeTile({
        widthPct: nextWidthPct,
        aspect: nextAspect
      });
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const initials = (displayName || 'С')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      ref={tileRef}
      data-comms-camera-tile="1"
      style={{
        aspectRatio: `${effectiveAspect}`,
        maxWidth: '100%',
        maxHeight: maxRowHeightCss,
        width: `min(${maxWidthCss}, calc((${maxRowHeightCss}) * ${effectiveAspect}))`
      }}
      className={`group/tile relative rounded-2xl overflow-hidden border select-none ${
        isResizing ? 'transition-none ring-2 ring-[#F4EE8E]/80' : 'transition-all duration-200'
      } ${
        isSpeaking
          ? 'border-[#F4EE8E] ring-2 ring-[#E7C768]/60 shadow-[0_0_24px_rgba(244,238,142,0.28)]'
          : isLight
            ? 'border-amber-900/20 bg-[#FAF6EC]'
            : 'border-amber-400/30 bg-[#140A01]'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        onLoadedMetadata={syncVideoDimensions}
        onResize={syncVideoDimensions}
        data-comms-remote={isLocal ? undefined : '1'}
        className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'} ${
          isLocal && mirrorLocal && !isScreenSharing ? '-scale-x-100' : ''
        }`}
      />

      {showFallbackImage && fallbackFrameUrl && (
        <img
          src={fallbackFrameUrl}
          alt={displayName}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              const clamped = clampAspectRatio(img.naturalWidth / img.naturalHeight);
              if (clamped) setDetectedAspect(clamped);
            }
          }}
          className="w-full h-full object-cover"
        />
      )}

      {!showVideo && !showFallbackImage && (
        <div
          className={`w-full h-full flex flex-col items-center justify-center gap-3 p-4 ${
            isLight
              ? 'bg-gradient-to-br from-[#FFFBF5] to-[#F5E9CE] text-amber-950'
              : 'bg-gradient-to-br from-[#1A0F02] to-[#0D0601] text-amber-100'
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#E7C768]/70 shadow-lg"
            />
          ) : (
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl font-black border-2 ${
                isLight
                  ? 'bg-amber-200 border-amber-800/30 text-amber-950'
                  : 'bg-amber-400/15 border-[#E7C768]/60 text-[#F4EE8E]'
              }`}
            >
              {initials}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs opacity-75">
            <VideoOff size={14} />
            <span>Камера выключена</span>
          </div>
        </div>
      )}

      {/* Top right controls */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
        {isScreenSharing && (
          <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-[#140A01]/80 text-[#F4EE8E] border border-amber-400/40 flex items-center gap-1">
            <Monitor size={12} />
            <span>Экран</span>
          </span>
        )}
        {onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            className="p-2 rounded-xl bg-[#140A01]/70 hover:bg-[#140A01]/90 text-[#F4EE8E] border border-amber-400/30 transition-colors cursor-pointer"
            title={isPinned ? 'Свернуть' : 'На весь экран'}
          >
            {isPinned ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
      </div>

      {/* Bottom name bar */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
        <div className="px-2.5 py-1.5 rounded-xl bg-[#140A01]/80 backdrop-blur-sm border border-amber-400/25 text-white text-xs font-semibold flex items-center gap-2 max-w-[85%] truncate">
          <span className="truncate">
            {displayName}
            {isLocal ? ' (Вы)' : ''}
          </span>
          {!isMicOn && <MicOff size={13} className="text-red-400 shrink-0" />}
        </div>
      </div>

      {/* Interactive Edge & Corner Resize Handles */}
      {onResizeTile && (
        <>
          <div
            onPointerDown={(e) => startResize('x', e)}
            onDoubleClick={() => onResetTileSize?.()}
            className="absolute top-4 bottom-5 right-0 w-3 cursor-ew-resize touch-none z-20 flex items-center justify-end pr-0.5 group/edge"
            title="Потяните за край, чтобы изменить ширину (двойной клик — сброс)"
          >
            <div className="w-1 h-8 rounded-full bg-[#E7C768]/35 group-hover/tile:bg-[#E7C768]/75 group-hover/edge:bg-[#F4EE8E] transition-colors" />
          </div>
          <div
            onPointerDown={(e) => startResize('y', e)}
            onDoubleClick={() => onResetTileSize?.()}
            className="absolute left-4 right-5 bottom-0 h-3 cursor-ns-resize touch-none z-20 flex items-end justify-center pb-0.5 group/edge"
            title="Потяните за нижний край, чтобы изменить высоту (двойной клик — сброс)"
          >
            <div className="h-1 w-8 rounded-full bg-[#E7C768]/35 group-hover/tile:bg-[#E7C768]/75 group-hover/edge:bg-[#F4EE8E] transition-colors" />
          </div>
          <div
            onPointerDown={(e) => startResize('xy', e)}
            onDoubleClick={() => onResetTileSize?.()}
            className="absolute bottom-0.5 right-0.5 w-6 h-6 cursor-nwse-resize touch-none z-30 flex items-end justify-end p-1 opacity-70 hover:opacity-100 transition-opacity"
            title="Потяните за угол для масштабирования окна"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M9 1L1 9M9 5L5 9" stroke="#E7C768" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

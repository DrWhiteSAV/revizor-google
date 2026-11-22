import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Trash2, X } from "lucide-react";

interface CustomAudioPlayerProps {
  audioUrl: string;
  isLightTheme?: boolean;
  initialDuration?: number;
  onDelete?: () => void;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  audioUrl,
  isLightTheme = false,
  initialDuration = 0,
  onDelete,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);

  useEffect(() => {
    if (initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  useEffect(() => {
    let isMounted = true;
    const fetchDuration = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          if (isMounted && decoded.duration && isFinite(decoded.duration)) {
            setDuration(decoded.duration);
          }
        }
      } catch (e) {
        // Fallback to standard audio tag duration
      }
    };

    if (!duration || duration <= 0) {
      fetchDuration();
    }
    return () => {
      isMounted = false;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if ((!duration || duration <= 0) && audioRef.current.duration && isFinite(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return "0:00";
    const rounded = Math.round(sec);
    const m = Math.floor(rounded / 60);
    const s = rounded % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-2xl border backdrop-blur-md shadow-md transition-colors ${
      isLightTheme
        ? "bg-[#FAF6EC]/85 border-amber-800/40 text-amber-950"
        : "bg-amber-400/10 border-amber-400/45 text-amber-50 shadow-[0_0_20px_rgba(244,238,142,0.12)]"
    }`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d)) setDuration(d);
        }}
        onEnded={handleEnded}
      />

      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold flex items-center justify-center shadow hover:brightness-110 active:scale-95 transition cursor-pointer shrink-0"
        title={isPlaying ? "Пауза" : "Воспроизвести запись"}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-amber-400/20 rounded-lg appearance-none cursor-pointer accent-[#E7C768]"
        />
        <div className={`flex justify-between text-xs font-mono font-medium ${
          isLightTheme ? "text-amber-950/80" : "text-amber-200/70"
        }`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => {
            if (audioRef.current && isPlaying) {
              audioRef.current.pause();
            }
            onDelete();
          }}
          className="p-1.5 rounded-xl hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-colors cursor-pointer shrink-0"
          title="Удалить запись"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
};

export default CustomAudioPlayer;

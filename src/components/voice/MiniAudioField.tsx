import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Loader2, X, Check } from "lucide-react";
import { NeuronSphereCanvas } from "./NeuronSphereCanvas";
import { CustomAudioPlayer } from "./CustomAudioPlayer";

interface MiniAudioFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  rows?: number;
  resizable?: boolean;
  isLightTheme?: boolean;
  disabled?: boolean;
  className?: string;
  onEnter?: () => void;
  maxLength?: number;
  audioUrl?: string | null;
  onAudioUrlChange?: (url: string | null) => void;
  showPlayer?: boolean;
}

const stripTrailingDot = (text: string): string => {
  if (!text) return text;
  return text.replace(/\.+$/, '');
};

export const MiniAudioField: React.FC<MiniAudioFieldProps> = ({
  value,
  onChange,
  placeholder = "Введите значение или продиктуйте...",
  label,
  multiline = false,
  rows = 2,
  resizable = false,
  isLightTheme = false,
  disabled = false,
  className = "",
  onEnter,
  maxLength,
  audioUrl,
  onAudioUrlChange,
  showPlayer = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recordedAudioDuration, setRecordedAudioDuration] = useState(0);
  const [sttSeconds, setSttSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(audioUrl || null);

  useEffect(() => {
    if (audioUrl !== undefined) {
      setRecordedAudioUrl(audioUrl);
    }
  }, [audioUrl]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const sttTimerRef = useRef<any>(null);
  const recordStartTimeRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea up to 16 lines, then show vertical scrollbar (бегунок)
  useEffect(() => {
    if (multiline && textareaRef.current && !resizable) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      const defaultMin = Math.max(56, rows * 26);
      const lineHeight = 26;
      const maxHeight = 16 * lineHeight + 24; // 16 lines max (~440px)
      const scrollH = el.scrollHeight;

      if (scrollH > maxHeight) {
        el.style.height = `${maxHeight}px`;
        el.style.overflowY = 'auto';
      } else {
        const nextHeight = Math.max(defaultMin, scrollH);
        el.style.height = `${nextHeight}px`;
        el.style.overflowY = 'hidden';
      }
    }
  }, [value, multiline, rows, resizable]);

  const sttAbortControllerRef = useRef<AbortController | null>(null);

  const cancelSTT = () => {
    if (sttAbortControllerRef.current) {
      sttAbortControllerRef.current.abort();
      sttAbortControllerRef.current = null;
    }
    if (sttTimerRef.current) clearInterval(sttTimerRef.current);
    setLoading(false);
    setSttSeconds(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sttTimerRef.current) clearInterval(sttTimerRef.current);
      if (sttAbortControllerRef.current) sttAbortControllerRef.current.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleClear = () => {
    onChange("");
    setRecordedAudioUrl(null);
    setRecordedAudioDuration(0);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const startRecord = async () => {
    if (disabled || loading) return;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      rec.onstop = async () => {
        const elapsed = (Date.now() - recordStartTimeRef.current) / 1000;
        const finalDuration = Math.max(1, Math.round(elapsed));
        setRecordedAudioDuration(finalDuration);

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          const localUrl = URL.createObjectURL(blob);
          setRecordedAudioUrl(localUrl);

          setLoading(true);
          setSttSeconds(0);

          const abortController = new AbortController();
          sttAbortControllerRef.current = abortController;

          sttTimerRef.current = setInterval(() => {
            setSttSeconds((s) => s + 1);
          }, 1000);

          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            if (abortController.signal.aborted) return;
            try {
              const res = await fetch("/api/voice/stt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abortController.signal,
                body: JSON.stringify({
                  audio_base64: reader.result as string,
                  mime_type: "audio/webm",
                }),
              });
              if (abortController.signal.aborted) return;
              const data = await res.json();
              if (data?.success && data?.text) {
                const textClean = stripTrailingDot(data.text.trim());
                let combined = value ? `${value.trim()} ${textClean}` : textClean;
                if (maxLength && combined.length > maxLength) {
                  combined = combined.slice(0, maxLength);
                }
                onChange(stripTrailingDot(combined));
                const finalUrl = data.file_url || null;
                if (finalUrl) {
                  setRecordedAudioUrl(finalUrl);
                  onAudioUrlChange?.(finalUrl);
                }
              }
            } catch (e) {
              if (abortController.signal.aborted) return;
              console.warn("[RR mini STT error]:", e);
            } finally {
              if (abortController.signal.aborted) return;
              if (sttTimerRef.current) clearInterval(sttTimerRef.current);
              setLoading(false);
            }
          };
        }
      };

      rec.start(250);
      recordStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds((s) => s + 1);
      }, 1000);
    } catch (e: any) {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecSeconds(0);
  };

  const sphereColor = isLightTheme ? "#B4821E" : "#E7C768";
  const sphereLineColor = isLightTheme ? "rgba(180, 130, 30, 0.35)" : "rgba(231, 199, 104, 0.3)";
  const sphereGlowColor = isLightTheme ? "rgba(217, 158, 65, 0.4)" : "rgba(244, 238, 142, 0.45)";

  const micColorClass = isLightTheme
    ? "text-[#3B1F04] group-hover:text-[#451A03]"
    : "text-[#F4EE8E] group-hover:text-[#FFF8BC]";

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {label && (
        <label className={`text-sm font-bold block ${isLightTheme ? "text-amber-950" : "text-amber-200/90"}`}>
          {label}
        </label>
      )}

      {/* Main Row Container */}
      <div className={`relative flex items-stretch w-full rounded-xl border backdrop-blur-md transition-all ${
        isLightTheme
          ? "border-amber-400/80 bg-[#FFFBF5]/90 focus-within:border-amber-600 shadow-sm"
          : "border-amber-400/40 bg-[#1A0F02]/70 focus-within:border-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.15)]"
      }`}>
        {/* Left Side: Field Content or Live In-Field Process */}
        <div className={`flex-1 flex ${multiline ? 'items-start py-1.5' : 'items-center'} min-w-0 px-2 sm:px-3 relative`}>
          {/* STEP 1: Recording Mode inside field */}
          {isRecording ? (
            <div className="flex items-center justify-between w-full py-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                <span className={`text-sm font-black tracking-wider ${isLightTheme ? 'text-amber-950' : 'text-amber-300'}`}>
                  {formatTimer(recSeconds)}
                </span>
              </div>

              {/* Icon-Only Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={stopRecord}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 shadow cursor-pointer transition-all active:scale-95"
                  title="Завершить запись"
                >
                  <Square size={14} className="fill-amber-950" />
                </button>
                <button
                  type="button"
                  onClick={cancelRecord}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isLightTheme
                      ? "border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-950"
                      : "border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-300"
                  }`}
                  title="Отменить запись"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : loading ? (
            /* STEP 2: STT Recognition Mode inside field */
            <div className="flex items-center justify-between w-full py-2 gap-2">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm animate-pulse">
                <Loader2 size={15} className="animate-spin" />
                <span>Распознавание речи... ({formatTimer(sttSeconds)})</span>
              </div>
              <button
                type="button"
                onClick={cancelSTT}
                className={`p-1.5 rounded-lg border text-sm font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 ${
                  isLightTheme
                    ? "border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-950"
                    : "border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-300"
                }`}
                title="Отменить распознавание речи"
              >
                <X size={13} />
                <span className="text-sm">Отмена</span>
              </button>
            </div>
          ) : multiline ? (
            /* STEP 3: Multiline Textarea */
            <div className="relative w-full flex items-start">
              <textarea
                ref={textareaRef}
                rows={rows}
                value={value}
                maxLength={maxLength}
                onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                style={{ minHeight: `${Math.max(52, rows * 26)}px` }}
                className={`w-full bg-transparent py-1.5 ${value ? 'pr-7' : ''} text-sm font-medium focus:outline-none ${resizable ? 'resize-y' : 'resize-none'} leading-relaxed rounded-l-xl block ${
                  isLightTheme
                    ? "text-amber-950 placeholder-amber-900/40"
                    : "text-amber-100 placeholder-amber-200/30"
                }`}
              />
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute top-2 right-1 p-1 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-500/10 cursor-pointer"
                  title="Очистить"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            /* STEP 3: Single-line Input */
            <div className="relative w-full flex items-center">
              <input
                type="text"
                value={value}
                maxLength={maxLength}
                onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && onEnter) {
                    e.preventDefault();
                    onEnter();
                  }
                }}
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full bg-transparent py-2.5 ${value ? 'pr-7' : ''} text-sm font-medium focus:outline-none rounded-l-xl min-h-[44px] ${
                  isLightTheme
                    ? "text-amber-950 placeholder-amber-900/40"
                    : "text-amber-100 placeholder-amber-200/30"
                }`}
              />
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-1 p-1 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-500/10 cursor-pointer"
                  title="Очистить"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Animated Neuron Sphere with centered Mic (1.5x more compact for wider text field) */}
        <div
          onClick={() => {
            if (disabled || loading) return;
            if (isRecording) {
              stopRecord();
            } else {
              startRecord();
            }
          }}
          className={`w-8 sm:w-9 shrink-0 self-stretch flex items-center justify-center relative cursor-pointer select-none border-l transition-all group rounded-r-xl bg-transparent ${
            isLightTheme
              ? "border-amber-300/70 hover:bg-amber-100/40"
              : "border-amber-500/20 hover:bg-white/[0.05]"
          } ${isRecording ? "ring-1 ring-amber-500/50 ring-inset" : ""}`}
        >
          <div className="relative flex items-center justify-center pointer-events-none">
            <NeuronSphereCanvas
              isRecording={isRecording}
              size={28}
              color={sphereColor}
              lineColor={sphereLineColor}
              glowColor={sphereGlowColor}
            />

            <div className="absolute inset-0 m-auto flex items-center justify-center bg-transparent pointer-events-none">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" strokeWidth={1.75} />
              ) : isRecording ? (
                <Mic className={`w-4 h-4 animate-pulse ${micColorClass}`} strokeWidth={1.75} />
              ) : (
                <Mic
                  className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${micColorClass}`}
                  strokeWidth={1.75}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player below the field if audio was recorded and showPlayer is enabled */}
      {showPlayer && recordedAudioUrl && !isRecording && !loading && (
        <div className="pt-1">
          <CustomAudioPlayer
            audioUrl={recordedAudioUrl}
            isLightTheme={isLightTheme}
            initialDuration={recordedAudioDuration}
            onDelete={() => {
              setRecordedAudioUrl(null);
              setRecordedAudioDuration(0);
              onAudioUrlChange?.(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MiniAudioField;

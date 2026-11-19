import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Loader2, Sparkles, X, Check } from "lucide-react";
import { NeuronSphereCanvas } from "./NeuronSphereCanvas";
import { CustomAudioPlayer } from "./CustomAudioPlayer";
import { ASSETS } from "../../constants/assets";

interface AudioFieldProps {
  value: string;
  onChange: (text: string) => void;
  audioUrl?: string | null;
  onAudioChange?: (url: string | null) => void;
  onAudioReady?: (audioUrl: string, blob: Blob) => void;
  storageKey?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  minHeight?: string;
  isLightTheme?: boolean;
  accentColor?: string;
  compactVoiceButton?: boolean;
  allowManualResize?: boolean;
}

const stripTrailingDot = (text: string): string => {
  if (!text) return text;
  return text.replace(/\.+$/, '');
};

export const AudioField: React.FC<AudioFieldProps> = ({
  value,
  onChange,
  audioUrl,
  onAudioChange,
  onAudioReady,
  storageKey,
  placeholder = "Введите текст или продиктуйте голосом...",
  label,
  disabled = false,
  minHeight = "120px",
  isLightTheme = false,
  accentColor = "#E7C768",
  compactVoiceButton = false,
  allowManualResize = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioDuration, setRecordedAudioDuration] = useState(0);
  const [isSTTLoading, setIsSTTLoading] = useState(false);
  const [sttSeconds, setSttSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(() => {
    if (audioUrl) return audioUrl;
    if (storageKey && typeof window !== 'undefined') {
      return localStorage.getItem(`${storageKey}_audio`) || null;
    }
    return null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (audioUrl !== undefined) {
      setRecordedAudioUrl(audioUrl);
    }
  }, [audioUrl]);

  const updateAudioUrl = (newUrl: string | null) => {
    setRecordedAudioUrl(newUrl);
    if (storageKey && typeof window !== 'undefined') {
      if (newUrl) {
        localStorage.setItem(`${storageKey}_audio`, newUrl);
      } else {
        localStorage.removeItem(`${storageKey}_audio`);
      }
    }
    if (onAudioChange) {
      onAudioChange(newUrl);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const sttTimerRef = useRef<any>(null);
  const recordStartTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sttTimerRef.current) clearInterval(sttTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleClearAll = () => {
    onChange("");
    updateAudioUrl(null);
    setRecordedAudioDuration(0);
    setErrorMessage(null);
  };

  const startRecording = async () => {
    setErrorMessage(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Аудиоввод не поддерживается вашим браузером");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
        ? { mimeType: "audio/webm" }
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const elapsed = (Date.now() - recordStartTimeRef.current) / 1000;
        const finalDuration = Math.max(1, Math.round(elapsed));
        setRecordedAudioDuration(finalDuration);

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const localUrl = URL.createObjectURL(audioBlob);
        updateAudioUrl(localUrl);
        if (onAudioReady) onAudioReady(localUrl, audioBlob);

        // Send strictly to RR STT endpoint and wait for transcription
        await handleSTTUpload(audioBlob);
      };

      recorder.start(250);
      recordStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission denied") || err?.name === "PermissionDeniedError") {
        setErrorMessage("Доступ к микрофону не предоставлен. Разрешите микрофон во всплывающем окне браузера или введите текст вручную.");
      } else {
        setErrorMessage("Микрофон недоступен. Проверьте подключение микрофона или введите текст вручную.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingSeconds(0);
  };

  const sttAbortControllerRef = useRef<AbortController | null>(null);

  const cancelSTT = () => {
    if (sttAbortControllerRef.current) {
      sttAbortControllerRef.current.abort();
      sttAbortControllerRef.current = null;
    }
    if (sttTimerRef.current) clearInterval(sttTimerRef.current);
    setIsSTTLoading(false);
    setSttSeconds(0);
    setErrorMessage(null);
  };

  const handleSTTUpload = async (blob: Blob) => {
    setIsSTTLoading(true);
    setSttSeconds(0);
    setErrorMessage(null);

    const abortController = new AbortController();
    sttAbortControllerRef.current = abortController;

    sttTimerRef.current = setInterval(() => {
      setSttSeconds((s) => s + 1);
    }, 1000);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        if (abortController.signal.aborted) return;
        const base64 = reader.result as string;

        try {
          const res = await fetch("/api/voice/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abortController.signal,
            body: JSON.stringify({
              audio_base64: base64,
              mime_type: blob.type || "audio/webm",
            }),
          });

          if (abortController.signal.aborted) return;
          const data = await res.json();
          if (sttTimerRef.current) clearInterval(sttTimerRef.current);
          setIsSTTLoading(false);

          if (data.success && data.text) {
            const newText = stripTrailingDot(data.text.trim());
            const combined = value ? `${value.trim()} ${newText}` : newText;
            onChange(stripTrailingDot(combined));
            if (data.file_url) {
              updateAudioUrl(data.file_url);
            }
          } else {
            if (data.error) {
              setErrorMessage(`Ошибка RR STT: ${data.error}`);
            } else {
              setErrorMessage("Не удалось распознать речь через RR. Попробуйте еще раз.");
            }
          }
        } catch (netErr: any) {
          if (abortController.signal.aborted) return;
          if (sttTimerRef.current) clearInterval(sttTimerRef.current);
          setIsSTTLoading(false);
          setErrorMessage("Ошибка сети при отправке аудио в RR STT.");
        }
      };
    } catch (e: any) {
      if (abortController.signal.aborted) return;
      if (sttTimerRef.current) clearInterval(sttTimerRef.current);
      setIsSTTLoading(false);
      setErrorMessage("Ошибка подготовки аудиофайла.");
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isManuallyResizedRef = useRef(false);

  // Auto-expand textarea up to 16 lines, unless manually resized by user
  useEffect(() => {
    if (textareaRef.current && !isManuallyResizedRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      const defaultMin = compactVoiceButton ? 120 : 160;
      const lineHeight = 24;
      const maxHeight = 16 * lineHeight + 32;
      const scrollH = el.scrollHeight;

      if (scrollH > maxHeight) {
        el.style.height = `${maxHeight}px`;
        el.style.overflowY = 'auto';
      } else {
        const nextHeight = Math.max(defaultMin, scrollH);
        el.style.height = `${nextHeight}px`;
        el.style.overflowY = scrollH > defaultMin ? 'auto' : 'hidden';
      }
    }
  }, [value, compactVoiceButton]);

  const sphereColor = isLightTheme ? "#B4821E" : (accentColor || "#E7C768");
  const sphereLineColor = isLightTheme ? "rgba(180, 130, 30, 0.3)" : "rgba(231, 199, 104, 0.28)";
  const sphereGlowColor = isLightTheme ? "rgba(217, 158, 65, 0.4)" : "rgba(244, 238, 142, 0.45)";

  const micIconColorClass = isLightTheme
    ? "text-[#3B1F04] group-hover:text-[#451A03]"
    : "text-[#F4EE8E] group-hover:text-[#FFF8BC]";

  return (
    <div className="w-full space-y-2 text-sm font-sans">
      {/* Top Header Row: Label on the left + Clear button strictly in the top right corner ABOVE the text area */}
      <div className="flex items-center justify-between gap-2 min-h-[26px]">
        {label ? (
          <label className={`font-bold text-xs block ${isLightTheme ? "text-amber-950" : "text-amber-200/80"}`}>
            {label}
          </label>
        ) : <div />}

        {(value || recordedAudioUrl) && !isRecording && !isSTTLoading && (
          <button
            type="button"
            onClick={handleClearAll}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border shadow-sm ${
              isLightTheme
                ? "bg-amber-200/90 hover:bg-amber-300 text-amber-950 border-amber-400/80"
                : "bg-[#1A0F02] hover:bg-black/60 text-amber-200 border-amber-500/40 hover:text-[#F4EE8E]"
            }`}
            title="Очистить поле ввода и аудиозапись"
          >
            <X className="w-3.5 h-3.5" />
            <span>Очистить</span>
          </button>
        )}
      </div>

      {/* Main Container: Left Sphere + Right Text / Process Area (1.5x higher by default) */}
      <div 
        className={`relative rounded-2xl border transition-all backdrop-blur-md flex flex-col sm:flex-row items-stretch ${compactVoiceButton ? 'min-h-[180px]' : 'min-h-[260px]'} ${
          isLightTheme
            ? "border-amber-400/80 bg-amber-50/50 focus-within:border-amber-600 shadow-sm"
            : "border-amber-400/40 bg-black/30 focus-within:border-[#E7C768]"
        }`}
        style={{ resize: 'vertical', overflow: 'hidden', minHeight: compactVoiceButton ? '180px' : '260px' }}
      >
        {/* Left Side: Neuron Sphere with Microphone Icon */}
        <div
          onClick={() => {
            if (disabled || isSTTLoading) return;
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          className={`${compactVoiceButton ? 'w-full sm:w-36 p-2' : 'w-full sm:w-52 p-4'} shrink-0 self-stretch flex flex-col items-center justify-center relative select-none cursor-pointer border-b sm:border-b-0 sm:border-r transition-all group ${
            isLightTheme
              ? "border-amber-300/70 bg-amber-100/30 hover:bg-amber-100/60"
              : "border-amber-500/20 bg-white/[0.03] hover:bg-white/[0.07]"
          } ${isRecording ? "ring-2 ring-amber-500/50 ring-inset" : ""}`}
        >
          {/* Animated 3D Neuron Sphere Canvas */}
          <div className={`relative flex items-center justify-center ${compactVoiceButton ? 'w-[130px] h-[130px]' : 'w-[180px] h-[180px]'}`}>
            <NeuronSphereCanvas
              isRecording={isRecording}
              size={compactVoiceButton ? 130 : 180}
              color={sphereColor}
              lineColor={sphereLineColor}
              glowColor={sphereGlowColor}
            />

            {/* Microphone Icon Centered without Stop Overlay on the Sphere */}
            <div className="absolute inset-0 m-auto flex items-center justify-center pointer-events-none bg-transparent">
              <Mic
                className={`${compactVoiceButton ? 'w-10 h-10' : 'w-16 h-16'} transition-transform duration-300 ${
                  isRecording ? 'scale-110 animate-pulse' : 'group-hover:scale-110'
                } ${micIconColorClass}`}
                strokeWidth={1.5}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Process Step-by-Step UI or Resizable Text Area */}
        <div className="flex-1 flex flex-col min-w-0 relative self-stretch h-full">
          {/* STEP 1: Recording Mode Overlay */}
          {isRecording ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[165px] space-y-3">
              {/* Mascot IIRR8 */}
              <div className="flex items-center gap-3">
                <img
                  src={ASSETS.mascot.IIRR8}
                  alt="IIRR8"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md animate-bounce"
                />
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isLightTheme ? 'text-amber-950' : 'text-amber-300'}`}>
                    Идет запись голоса
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                    <span className={`text-base sm:text-lg font-black tracking-widest ${isLightTheme ? 'text-red-700' : 'text-amber-200'}`}>
                      {formatTimer(recordingSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Stop & Cancel */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-xs shadow flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Square className="w-4 h-4 fill-amber-950" />
                  <span>Остановить</span>
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className={`px-3.5 py-2 min-h-[40px] rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isLightTheme
                      ? "border-amber-300 bg-amber-100/80 hover:bg-amber-200 text-amber-950"
                      : "border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-300"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Отменить</span>
                </button>
              </div>
            </div>
          ) : isSTTLoading ? (
            /* STEP 2: STT Recognition Mode Overlay */
            <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[165px] space-y-3">
              {/* Mascot IIRR5 with Stopwatch */}
              <div className="flex items-center gap-3">
                <img
                  src={ASSETS.mascot.IIRR5}
                  alt="IIRR5"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md animate-pulse"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>RR STT распознает речь...</span>
                  </div>
                  <p className={`text-xs mt-1 font-medium ${isLightTheme ? 'text-amber-900/80' : 'text-amber-200/70'}`}>
                    Ожидание ответа: <span className="font-bold text-amber-500">{formatTimer(sttSeconds)}</span>
                  </p>
                </div>
              </div>

              {/* Action Button: Cancel STT recognition */}
              <button
                type="button"
                onClick={cancelSTT}
                className={`px-3.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                  isLightTheme
                    ? "border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-950"
                    : "border-amber-500/30 bg-white/5 hover:bg-white/10 text-amber-300"
                }`}
                title="Отменить распознавание речи"
              >
                <X className="w-4 h-4" />
                <span>Отменить распознавание</span>
              </button>
            </div>
          ) : (
            /* STEP 3: Result Mode - 100% Initial Height Textarea & Expanding In-field Audio Player */
            <div className="flex-1 flex flex-col min-w-0 w-full h-full justify-between">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                }}
                onMouseDown={() => {
                  // If user drags resize handle, stop auto-resetting height
                  const initialH = textareaRef.current?.offsetHeight;
                  const onMouseUp = () => {
                    if (textareaRef.current && textareaRef.current.offsetHeight !== initialH) {
                      isManuallyResizedRef.current = true;
                    }
                    window.removeEventListener('mouseup', onMouseUp);
                  };
                  window.addEventListener('mouseup', onMouseUp);
                }}
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full flex-1 bg-transparent p-3.5 text-sm font-medium focus:outline-none leading-relaxed rounded-tr-2xl block transition-colors ${
                  allowManualResize ? 'resize-y min-h-[100px] overflow-y-auto' : 'resize-none min-h-[160px]'
                } ${
                  isLightTheme
                    ? "text-amber-950 placeholder-amber-900/40"
                    : "text-amber-100 placeholder-amber-200/30"
                }`}
              />

              {/* In-field CustomAudioPlayer rendered directly inside the bottom of the field container */}
              {recordedAudioUrl && (
                <div className={`p-2 border-t rounded-br-2xl shrink-0 ${
                  isLightTheme ? 'border-amber-300/60 bg-amber-100/40' : 'border-amber-500/20 bg-white/[0.03]'
                }`}>
                  <CustomAudioPlayer
                    audioUrl={recordedAudioUrl}
                    isLightTheme={isLightTheme}
                    initialDuration={recordedAudioDuration}
                    onDelete={() => {
                      updateAudioUrl(null);
                      setRecordedAudioDuration(0);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-amber-500/20 rounded cursor-pointer ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioField;


import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mic, Square, Loader2, AlertCircle } from 'lucide-react';

interface AIBallProps {
  isRecording?: boolean;
  onToggleRecording?: () => void;
  onTranscriptReceived?: (text: string) => void;
  isLightTheme?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  placeholderText?: string;
  className?: string;
}

const stripTrailingDot = (text: string): string => {
  if (!text) return text;
  return text.replace(/\.+$/, '').trim();
};

export const AIBall: React.FC<AIBallProps> = ({
  isRecording = false,
  onToggleRecording,
  onTranscriptReceived,
  isLightTheme = false,
  size = 'md',
  placeholderText = 'Диктуйте голос или пишите...',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalRecording, setInternalRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [aiResponse, setAiResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio & STT refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animAudioRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');
  const recordStartTimeRef = useRef<number>(0);

  // Detect mobile screen for 30% smaller orb diameter
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const baseOrbSize = size === 'xs' ? 84 : size === 'sm' ? 120 : size === 'lg' ? 240 : 170;
  const orbPixelSize = isMobile ? Math.round(baseOrbSize * 0.7) : baseOrbSize;

  const activeRecording = isRecording || internalRecording;

  // Cleanup audio tracks and contexts
  const cleanupAudio = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animAudioRef.current) cancelAnimationFrame(animAudioRef.current);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      speechRecognitionRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Real STT Upload to RR backend
  const sendAudioToSTT = async (blob: Blob, fallbackText: string) => {
    setIsProcessing(true);
    setAiResponse('Распознавание речи...');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/voice/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: base64,
              mime_type: blob.type || 'audio/webm'
            })
          });
          const data = await res.json();
          setIsProcessing(false);

          let finalTranscribed = '';
          if (data.success && data.text) {
            finalTranscribed = stripTrailingDot(data.text);
          } else if (fallbackText) {
            finalTranscribed = stripTrailingDot(fallbackText);
          }

          if (finalTranscribed) {
            setAiResponse('Голос успешно внесен');
            if (onTranscriptReceived) {
              onTranscriptReceived(finalTranscribed);
            }
            setTimeout(() => {
              setAiResponse('');
            }, 2500);
          } else {
            setErrorMessage('Речь не распознана. Попробуйте еще раз.');
            setTimeout(() => setErrorMessage(null), 3000);
            setAiResponse('');
          }
        } catch (netErr) {
          setIsProcessing(false);
          if (fallbackText) {
            const cleanText = stripTrailingDot(fallbackText);
            setAiResponse('Голос успешно внесен');
            if (onTranscriptReceived) {
              onTranscriptReceived(cleanText);
            }
            setTimeout(() => setAiResponse(''), 2500);
          } else {
            setErrorMessage('Ошибка связи с сервисом распознавания');
            setTimeout(() => setErrorMessage(null), 3000);
            setAiResponse('');
          }
        }
      };
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage('Не удалось обработать аудио');
      setTimeout(() => setErrorMessage(null), 3000);
      setAiResponse('');
    }
  };

  // Start real recording
  const startRecording = async () => {
    setErrorMessage(null);
    setAiResponse('');
    liveTranscriptRef.current = '';

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Запись аудио не поддерживается браузером');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Real audio analyzer for equalizer reaction
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx();
          audioContextRef.current = actx;
          const source = actx.createMediaStreamSource(stream);
          const analyser = actx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            // Normalize to 0 - 1
            const normalized = Math.min(1, Math.max(0.15, avg / 128));
            setAudioLevel(normalized);
            animAudioRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch (audioErr) {
        console.warn('AudioContext analyzer not available:', audioErr);
      }

      // Parallel Web Speech API for immediate fallback
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.lang = 'ru-RU';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                liveTranscriptRef.current += event.results[i][0].transcript + ' ';
              } else {
                interim += event.results[i][0].transcript;
              }
            }
          };
          rec.start();
          speechRecognitionRef.current = rec;
        }
      } catch (recErr) {
        // speech recognition is optional fallback
      }

      const options = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
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
        const fallbackText = liveTranscriptRef.current.trim();
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupAudio();
        await sendAudioToSTT(blob, fallbackText);
      };

      recorder.start(250);
      recordStartTimeRef.current = Date.now();
      setInternalRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      cleanupAudio();
      setInternalRecording(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMessage('Разрешите доступ к микрофону в браузере');
      } else {
        setErrorMessage('Микрофон недоступен');
      }
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  // Stop real recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setInternalRecording(false);
  };

  // Toggle handler
  const handleToggle = () => {
    if (isProcessing) return;
    if (activeRecording) {
      if (onToggleRecording) {
        onToggleRecording();
      } else {
        stopRecording();
      }
    } else {
      if (onToggleRecording) {
        onToggleRecording();
      } else {
        startRecording();
      }
    }
  };

  // Canvas 3D Neural Mesh & Vertical Aurora Neural Equalizer Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleX1 = 0;
    let angleY1 = 0;
    let angleX2 = 0;
    let angleY2 = 0;

    const baseRadius = (orbPixelSize / 2) * 0.9;

    // Create 3 Independent Multi-Layer Neural Meshes (100% Golden Palette)
    const createMesh = (count: number, rFactor: number) => {
      const nodes: { x: number; y: number; z: number; origX: number; origY: number; origZ: number }[] = [];
      for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = baseRadius * rFactor * Math.cbrt(Math.random());

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        nodes.push({ x, y, z, origX: x, origY: y, origZ: z });
      }
      return nodes;
    };

    const meshLayer1 = createMesh(55, 0.92);
    const meshLayer2 = createMesh(42, 0.68);
    const meshLayer3 = createMesh(30, 0.44);

    const render = () => {
      ctx.clearRect(0, 0, orbPixelSize, orbPixelSize);

      const cx = orbPixelSize / 2;
      const cy = orbPixelSize / 2;

      // Base rotation speed adapts when recording
      const speed1 = activeRecording ? 0.024 : 0.012;
      const speed2 = activeRecording ? -0.018 : -0.009;

      angleX1 += speed1;
      angleY1 += speed1 * 0.7;
      angleX2 += speed2;
      angleY2 += speed2 * 0.8;

      // Draw Neural Mesh Layer Function
      const drawLayer = (
        mesh: { x: number; y: number; z: number; origX: number; origY: number; origZ: number }[],
        ax: number,
        ay: number,
        colorNode: string,
        colorLine: string,
        maxDist: number
      ) => {
        const cosX = Math.cos(ax);
        const sinX = Math.sin(ax);
        const cosY = Math.cos(ay);
        const sinY = Math.sin(ay);

        const projected: { x: number; y: number; scale: number; alpha: number }[] = [];

        for (let i = 0; i < mesh.length; i++) {
          const n = mesh[i];

          // Y rotation
          let x1 = n.origX * cosY - n.origZ * sinY;
          let z1 = n.origZ * cosY + n.origX * sinY;

          // X rotation
          let y1 = n.origY * cosX - z1 * sinX;
          let z2 = z1 * cosX + n.origY * sinX;

          const fov = 260;
          const scale = fov / (fov + z2);
          const px = cx + x1 * scale;
          const py = cy + y1 * scale;
          const alpha = Math.max(0.1, Math.min(1, (z2 + baseRadius) / (baseRadius * 2)));

          projected.push({ x: px, y: py, scale, alpha });
        }

        // Draw connections
        for (let i = 0; i < projected.length; i++) {
          for (let j = i + 1; j < projected.length; j++) {
            const p1 = projected[i];
            const p2 = projected[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < maxDist) {
              const lineAlpha = (1 - dist / maxDist) * ((p1.alpha + p2.alpha) / 2) * 0.45;
              ctx.strokeStyle = colorLine.replace('ALPHA', lineAlpha.toFixed(2));
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }

        // Draw nodes
        for (let i = 0; i < projected.length; i++) {
          const p = projected[i];
          const r = Math.max(1, 2.2 * p.scale);
          ctx.fillStyle = colorNode.replace('ALPHA', p.alpha.toFixed(2));
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      // Layer 1: Outer Gold
      drawLayer(meshLayer1, angleX1, angleY1, 'rgba(244, 238, 142, ALPHA)', 'rgba(231, 199, 104, ALPHA)', 42);
      // Layer 2: Middle Amber
      drawLayer(meshLayer2, angleX2, angleY2, 'rgba(231, 199, 104, ALPHA)', 'rgba(217, 158, 65, ALPHA)', 36);
      // Layer 3: Inner Core
      drawLayer(meshLayer3, angleX1 * 1.4, angleY2 * 1.4, 'rgba(255, 255, 255, ALPHA)', 'rgba(244, 238, 142, ALPHA)', 30);

      // Aurora Equalizer when voice is active
      if (activeRecording || audioLevel > 0) {
        const numColumns = 14;
        const nodesPerColumn = 8;
        const gridWidth = orbPixelSize * 0.74;
        const gridHeight = orbPixelSize * 0.65;
        const startX = cx - gridWidth / 2;
        const startY = cy - gridHeight / 2;

        const colSpacing = gridWidth / (numColumns - 1);
        const rowSpacing = gridHeight / (nodesPerColumn - 1);

        const time = Date.now() * 0.003;
        const currentAudioLevel = audioLevel || 0.4;

        const fencePoints: { x: number; y: number; alpha: number }[][] = [];

        for (let c = 0; c < numColumns; c++) {
          fencePoints[c] = [];
          const colX = startX + c * colSpacing;
          const colPhase = c * 0.45;
          const waveHeight = Math.sin(time * 2.5 + colPhase) * 16 * currentAudioLevel;

          for (let r = 0; r < nodesPerColumn; r++) {
            const baseRowY = startY + r * rowSpacing;
            const rowOffset = Math.cos(time * 2 + colPhase + r * 0.35) * (waveHeight * 0.45);
            const py = baseRowY + rowOffset;
            const distFromCenter = Math.abs(colX - cx) / (gridWidth / 2);
            const alpha = Math.max(0, 1 - distFromCenter * 0.85);

            fencePoints[c][r] = { x: colX, y: py, alpha };
          }
        }

        // Draw Vertical Columns
        for (let c = 0; c < numColumns; c++) {
          ctx.beginPath();
          const colAlpha = fencePoints[c][0].alpha * (0.35 + currentAudioLevel * 0.5);
          ctx.strokeStyle = `rgba(244, 238, 142, ${colAlpha.toFixed(2)})`;
          ctx.lineWidth = 1.2;
          for (let r = 0; r < nodesPerColumn; r++) {
            const p = fencePoints[c][r];
            if (r === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }

        // Draw Horizontal Waves
        for (let c = 0; c < numColumns - 1; c++) {
          for (let r = 0; r < nodesPerColumn; r++) {
            const p1 = fencePoints[c][r];
            const p2 = fencePoints[c + 1][r];
            const avgAlpha = (p1.alpha + p2.alpha) * 0.35;

            ctx.strokeStyle = `rgba(231, 199, 104, ${avgAlpha.toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw Nodes
        for (let c = 0; c < numColumns; c++) {
          for (let r = 0; r < nodesPerColumn; r++) {
            const p = fencePoints[c][r];
            if (p.alpha > 0.15) {
              const nodeR = 1.8 + Math.sin(time * 2 + c + r) * 0.8;
              ctx.beginPath();
              ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
              ctx.fillStyle = c % 2 === 0 ? `rgba(244, 238, 142, ${p.alpha.toFixed(2)})` : `rgba(255, 255, 255, ${p.alpha.toFixed(2)})`;
              ctx.fill();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeRecording, audioLevel, isLightTheme, orbPixelSize]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Interactive AI Orb Button */}
      <div
        onClick={handleToggle}
        title={activeRecording ? 'Идет запись... Нажмите чтобы завершить' : 'Нажмите для голосового ввода'}
        className="relative cursor-pointer select-none flex flex-col items-center justify-center transition-transform hover:scale-102 active:scale-98"
      >
        {/* Ambient Halo Glow */}
        <div
          className={`absolute rounded-full pointer-events-none blur-xl transition-opacity duration-500 ${
            activeRecording
              ? 'opacity-90 bg-[radial-gradient(circle_at_center,rgba(244,238,142,0.6)_0%,rgba(217,158,65,0.35)_50%,transparent_75%)]'
              : 'opacity-60 bg-[radial-gradient(circle_at_center,rgba(244,238,142,0.35)_0%,rgba(217,158,65,0.2)_50%,transparent_75%)]'
          }`}
          style={{ width: orbPixelSize + 36, height: orbPixelSize + 36 }}
        />

        {/* Inner Foggy Contour Halo */}
        <div
          className={`absolute rounded-full pointer-events-none border blur-md transition-all ${
            activeRecording
              ? 'border-amber-300 shadow-[0_0_35px_rgba(244,238,142,0.6)] animate-[pulse_1.5s_infinite]'
              : 'border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.25)] animate-[spin_12s_linear_infinite]'
          }`}
          style={{ width: orbPixelSize + 14, height: orbPixelSize + 14 }}
        />

        {/* Sphere Container */}
        <div
          className={`relative rounded-full border-2 transition-all duration-300 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-md bg-transparent ${
            activeRecording
              ? 'border-amber-300 shadow-[0_0_50px_rgba(244,238,142,0.8)]'
              : isLightTheme
                ? 'border-amber-400/90 shadow-[0_0_30px_rgba(217,158,65,0.35)]'
                : 'border-amber-400/80 shadow-[0_0_35px_rgba(244,238,142,0.35)]'
          }`}
          style={{ width: orbPixelSize, height: orbPixelSize }}
        >
          {/* Canvas Neural / Equalizer */}
          <canvas
            ref={canvasRef}
            width={orbPixelSize}
            height={orbPixelSize}
            className="absolute inset-0 pointer-events-none"
          />

          {/* AI Response Text Overlay */}
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 text-center bg-transparent backdrop-blur-sm rounded-full pointer-events-none border border-amber-400/40"
            >
              <Sparkles size={16} className="text-amber-300 mb-1 animate-pulse" />
              <p className="text-[11px] sm:text-xs font-mono font-bold text-amber-100 leading-tight px-2 drop-shadow">
                {aiResponse}
              </p>
            </motion.div>
          )}

          {/* Loading / STT Processing Overlay */}
          {isProcessing && !aiResponse && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 text-center bg-transparent backdrop-blur-sm rounded-full pointer-events-none border border-amber-400/40">
              <Loader2 size={22} className="text-amber-300 animate-spin mb-1.5" />
              <p className="text-[10px] sm:text-xs font-mono font-bold text-amber-200">
                Распознавание...
              </p>
            </div>
          )}

          {/* Listening / Recording Voice Overlay */}
          {activeRecording && !aiResponse && !isProcessing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
              <div className="flex items-center gap-1 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <Square size={14} className="text-amber-300 fill-amber-300" />
              </div>
              <p className="text-[11px] font-mono font-black text-amber-200">
                {formatTime(recordingSeconds)}
              </p>
              <p className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                Запись...
              </p>
            </div>
          )}

          {/* Idle prompt on sphere if not recording */}
          {!activeRecording && !aiResponse && !isProcessing && !errorMessage && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2 text-center pointer-events-none opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
              <Mic size={18} className="text-amber-300 mb-1" />
              <p className="text-[9px] font-mono font-bold text-amber-200">
                Голос
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Helper text / status below Orb */}
      <div className="mt-2 text-center">
        {errorMessage ? (
          <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1">
            <AlertCircle size={13} />
            <span>{errorMessage}</span>
          </p>
        ) : activeRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Square size={11} className="fill-amber-300" />
            <span>Завершить запись</span>
          </button>
        ) : isProcessing ? (
          <p className="text-xs font-bold text-amber-300 animate-pulse">
            Обработка речи и заполнение отчета...
          </p>
        ) : (
          <p className={`text-[11px] font-mono ${isLightTheme ? 'text-amber-900/70' : 'text-amber-200/70'}`}>
            Нажмите на сферу для записи голоса
          </p>
        )}
      </div>
    </div>
  );
};

export default AIBall;

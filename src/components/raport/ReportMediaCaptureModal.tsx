import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Video, Monitor, X, RefreshCw, Check, AlertCircle, Play, Square, Upload, Sparkles, SwitchCamera, Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { FileUploadService } from '../../services/FileUploadService';

export interface ReportMediaCaptureModalProps {
  isOpen: boolean;
  mode: 'photo' | 'video' | 'screenshot';
  isLightTheme: boolean;
  onClose: () => void;
  onCapture: (fileData: { name: string; size: number; type: string; url: string; isVideo?: boolean }) => void;
}

export const ReportMediaCaptureModal: React.FC<ReportMediaCaptureModalProps> = ({
  isOpen,
  mode,
  isLightTheme,
  onClose,
  onCapture,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState<boolean>(false);
  const [isInstructionsCollapsed, setIsInstructionsCollapsed] = useState<boolean>(false);
  const [capturedPreview, setCapturedPreview] = useState<{ url: string; blob: Blob; isVideo: boolean } | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isUploadingToGallery, setIsUploadingToGallery] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const nativeFileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop current active media stream
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start Camera Stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setErrorMsg(null);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Ваш браузер не поддерживает прямой доступ к камере через WebRTC. Используйте системную камеру устройства.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === 'video',
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      const isPolicy = String(err.message || '').includes('организац') || String(err.message || '').includes('permissions policy');
      if (isPolicy || err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Доступ к встроенной веб-камере ограничен политикой браузера. Используйте системную камеру устройства кнопкой ниже или выберите фото из галереи.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('Камера не обнаружена на вашем устройстве. Подключите веб-камеру или воспользуйтесь загрузкой файла.');
      } else {
        setErrorMsg('Не удалось запустить камеру: ' + (err.message || 'ошибка доступа') + '. Попробуйте открыть системную камеру ниже.');
      }
    }
  }, [mode, stopStream]);

  // Initialize camera or screen capture on open
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCapturedPreview(null);
      setIsRecording(false);
      setRecordingSeconds(0);
      clearInterval(timerIntervalRef.current);
      return;
    }

    setErrorMsg(null);
    setCapturedPreview(null);

    if (mode === 'photo' || mode === 'video') {
      startCamera(facingMode);
    }

    return () => {
      stopStream();
      clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, mode]);

  // Listen to paste event for screenshot or photo
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            setIsUploadingToGallery(true);
            try {
              const fileService = new FileUploadService();
              const serverUrl = await fileService.uploadFromFile(file);
              setCapturedPreview({
                url: serverUrl || URL.createObjectURL(file),
                blob: file,
                isVideo: false,
              });
              stopStream();
            } catch (err) {
              const reader = new FileReader();
              reader.onload = () => {
                setCapturedPreview({
                  url: reader.result as string,
                  blob: file,
                  isVideo: false,
                });
                stopStream();
              };
              reader.readAsDataURL(file);
            } finally {
              setIsUploadingToGallery(false);
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, stopStream]);

  // Toggle Camera (front / back)
  const handleToggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture Photo from live video stream
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPreview({
        url: dataUrl,
        blob,
        isVideo: false,
      });
      stopStream();
    }, 'image/jpeg', 0.92);
  };

  // Start Screen Capture for Screenshot on Desktop
  const handleStartScreenCapture = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setErrorMsg('Захват экрана не поддерживается данным браузером. Вы можете сделать скриншот средствами системы (PrintScreen) и нажать Вставить (Ctrl+V) или прикрепить файл.');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });

      const tempVideo = document.createElement('video');
      tempVideo.srcObject = displayStream;
      tempVideo.autoplay = true;
      tempVideo.muted = true;

      tempVideo.onloadedmetadata = () => {
        tempVideo.play();
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = tempVideo.videoWidth || window.innerWidth;
          canvas.height = tempVideo.videoHeight || window.innerHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              if (blob) {
                const dataUrl = canvas.toDataURL('image/png');
                setCapturedPreview({
                  url: dataUrl,
                  blob,
                  isVideo: false,
                });
              }
              displayStream.getTracks().forEach((t) => t.stop());
            }, 'image/png');
          } else {
            displayStream.getTracks().forEach((t) => t.stop());
          }
        }, 500);
      };
    } catch (err: any) {
      console.warn('Screen capture error:', err);
      const isPolicy = String(err.message || '').includes('организац') || String(err.message || '').includes('permissions policy') || err.name === 'NotAllowedError';
      if (isPolicy) {
        setErrorMsg('Браузер ограничил прямой захват экрана по системной политике. Вы можете сделать скриншот клавишей PrintScreen и нажать Ctrl+V прямо здесь, либо сделать фото камерой устройства.');
      } else {
        setErrorMsg('Не удалось выполнить захват экрана: ' + (err.message || 'отменено'));
      }
    }
  };

  // Start Video Recording
  const handleStartRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];

    try {
      const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = selectedMime || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const videoUrl = URL.createObjectURL(blob);
        setCapturedPreview({
          url: videoUrl,
          blob,
          isVideo: true,
        });
        stopStream();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (e: any) {
      setErrorMsg('Ошибка запуска записи видео: ' + (e.message || ''));
    }
  };

  // Stop Video Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);
  };

  // Handle native file input fallback (phone native camera or file select)
  const handleNativeFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingToGallery(true);
    try {
      const fileService = new FileUploadService();
      const serverUrl = await fileService.uploadFromFile(file);
      setCapturedPreview({
        url: serverUrl || URL.createObjectURL(file),
        blob: file,
        isVideo: mode === 'video' || file.type.startsWith('video/'),
      });
      stopStream();
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPreview({
          url: reader.result as string,
          blob: file,
          isVideo: mode === 'video' || file.type.startsWith('video/'),
        });
        stopStream();
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingToGallery(false);
    }
    e.target.value = '';
  };

  // Confirm and attach captured media with upload to server gallery for a permanent direct link
  const handleConfirmMedia = async () => {
    if (!capturedPreview) return;

    const timestamp = Date.now();
    let filename = '';
    let mimeType = capturedPreview.blob.type;
    if (mode === 'photo') {
      filename = `photo_camera_${timestamp}.jpg`;
      mimeType = mimeType || 'image/jpeg';
    } else if (mode === 'video') {
      filename = `video_camera_${timestamp}.webm`;
      mimeType = mimeType || 'video/webm';
    } else {
      filename = `screenshot_${timestamp}.png`;
      mimeType = mimeType || 'image/png';
    }

    setIsUploadingToGallery(true);
    let finalUrl = capturedPreview.url;
    try {
      // If it is a base64 or blob URL, upload it to the gallery to get a direct permanent link
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('/uploads/')) {
        const file = new File([capturedPreview.blob], filename, { type: mimeType });
        const fileService = new FileUploadService();
        try {
          const serverUrl = await fileService.uploadFromFile(file);
          if (serverUrl) {
            finalUrl = serverUrl;
          }
        } catch (e) {
          console.warn('fileService upload attempt failed, trying direct /api/upload:', e);
        }

        // Additional direct fallback to ensure a server URL is ALWAYS obtained
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('/uploads/')) {
          const fd = new FormData();
          fd.append('file', file);
          const directRes = await fetch('/api/upload', { method: 'POST', body: fd });
          if (directRes.ok) {
            const data = await directRes.json();
            if (data.url || data.original_url) {
              finalUrl = data.url || data.original_url;
            }
          }
        }
      }
    } catch (uploadErr) {
      console.warn('Gallery upload fallback to preview url:', uploadErr);
    } finally {
      setIsUploadingToGallery(false);
    }

    onCapture({
      name: filename,
      size: capturedPreview.blob.size,
      type: mimeType,
      url: finalUrl,
      isVideo: capturedPreview.isVideo,
    });
    onClose();
  };

  // Retake photo/video/screenshot
  const handleRetake = () => {
    setCapturedPreview(null);
    if (mode === 'photo' || mode === 'video') {
      startCamera(facingMode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div
        className={`relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLightTheme
            ? 'bg-[#FFFBF5]/95 border-amber-400/60 text-zinc-950 shadow-amber-900/10'
            : 'bg-[#1A0F02]/95 border-amber-400/40 text-amber-100 shadow-[0_0_40px_rgba(244,238,142,0.2)]'
        }`}
      >
        {/* Header */}
        <div className={`px-4 py-3.5 border-b flex items-center justify-between gap-2 ${
          isLightTheme ? 'border-amber-300/60' : 'border-amber-400/30'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {mode === 'photo' && <Camera size={20} className="text-amber-500 shrink-0" />}
            {mode === 'video' && <Video size={20} className="text-amber-500 shrink-0" />}
            {mode === 'screenshot' && <Monitor size={20} className="text-amber-500 shrink-0" />}
            <h2 className="text-sm sm:text-base font-black truncate">
              {mode === 'photo' && 'Съемка фото с камеры'}
              {mode === 'video' && 'Запись видео с камеры'}
              {mode === 'screenshot' && 'Снимок экрана (Скриншот)'}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            {(mode === 'photo' || mode === 'video') && !capturedPreview && (
              <button
                type="button"
                onClick={handleToggleCamera}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isLightTheme
                    ? 'border-amber-300 hover:bg-amber-100/60 text-zinc-900'
                    : 'border-amber-400/40 hover:bg-white/5 text-amber-200'
                }`}
                title="Переключить камеру (передняя / задняя)"
              >
                <SwitchCamera size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLightTheme
                  ? 'border-amber-300 hover:bg-amber-100/60 text-zinc-900'
                  : 'border-amber-400/40 hover:bg-white/5 text-amber-200'
              }`}
              title="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {/* Error notice if camera permission or device error with clear guidance */}
          {errorMsg && (
            <div className={`p-3.5 rounded-2xl border text-xs font-medium space-y-2.5 ${
              isLightTheme
                ? 'bg-amber-50/80 border-amber-400 text-zinc-950'
                : 'bg-amber-950/30 border-amber-400/50 text-amber-100'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>Доступ к оборудованию ограничен</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                  className="text-xs font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle size={14} />
                  <span>{showPermissionGuide ? 'Скрыть' : 'Инструкция'}</span>
                </button>
              </div>
              <p className="leading-relaxed">{errorMsg}</p>

              {(showPermissionGuide || errorMsg.includes('отклонен') || errorMsg.includes('не обнаружена')) && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                  isLightTheme ? 'bg-white border-amber-300 text-zinc-900' : 'bg-[#140A01] border-amber-400/40 text-amber-100'
                }`}>
                  <div className="font-bold">Как подключить камеру / микрофон:</div>
                  <ol className="list-decimal list-inside space-y-1 opacity-90">
                    <li>В строке адреса браузера (слева от адреса) нажмите значок замка или настроек сайта.</li>
                    <li>В разрешениях переключите <b>«Камера»</b> и <b>«Микрофон»</b> в положение <b>«Разрешить»</b>.</li>
                    <li>Для внешних веб-камер убедитесь, что USB-кабель подключен и камера не занята другими приложениями (Zoom, Teams, Skype, OBS).</li>
                    <li>Нажмите кнопку «Повторить подключение» ниже.</li>
                  </ol>
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => (mode === 'photo' || mode === 'video') ? startCamera(facingMode) : handleStartScreenCapture()}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <RefreshCw size={13} />
                      <span>Повторить подключение</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Screenshot specific instructions & trigger */}
          {mode === 'screenshot' && !capturedPreview && (
            <div className="space-y-3 text-center py-2">
              <div className={`rounded-2xl border text-xs overflow-hidden transition-all text-left ${
                isLightTheme ? 'border-amber-300 bg-amber-50/50' : 'border-amber-400/30 bg-amber-500/5'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsInstructionsCollapsed(!isInstructionsCollapsed)}
                  className="w-full p-2.5 flex items-center justify-between text-left font-bold cursor-pointer hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <HelpCircle size={14} className="text-amber-500 shrink-0" />
                    <span>Инструкция по созданию скриншота</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] opacity-75">
                    <span>{isInstructionsCollapsed ? 'Развернуть' : 'Свернуть'}</span>
                    {isInstructionsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>
                </button>
                {!isInstructionsCollapsed && (
                  <div className="p-3 pt-1 text-xs leading-relaxed border-t border-amber-400/20 space-y-1">
                    <p>💡 <b>Для ПК:</b> нажмите кнопку «Захватить экран» и выберите экран или окно браузера.</p>
                    <p>💡 <b>Или:</b> нажмите клавишу <b>PrintScreen</b> и нажмите <b>Ctrl+V</b> прямо в этом окне.</p>
                    <p>💡 <b>Для смартфона:</b> используйте системную камеру устройства или выберите снимок из галереи.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleStartScreenCapture}
                  className="w-full min-h-[46px] px-3 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-zinc-950 hover:brightness-105 active:scale-98 shadow-md cursor-pointer transition-all"
                >
                  <Monitor size={16} />
                  <span>Захватить экран (ПК)</span>
                </button>
                <button
                  type="button"
                  onClick={() => nativeFileInputRef.current?.click()}
                  className="w-full min-h-[46px] px-3 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-400/50 hover:bg-amber-500/10 text-amber-500 hover:text-amber-400 cursor-pointer transition-all"
                >
                  <Camera size={16} />
                  <span>Камера устройства / Файл</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Video Viewfinder for Photo and Video */}
          {(mode === 'photo' || mode === 'video') && !capturedPreview && (
            <div className="relative rounded-2xl overflow-hidden border border-amber-400/40 bg-black aspect-[4/3] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-600/90 text-white font-mono text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>
                    Запись: {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Captured Preview (Photo, Video, or Screenshot) */}
          {capturedPreview && (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden border border-amber-400/50 bg-black/40 aspect-[4/3] flex items-center justify-center">
                {capturedPreview.isVideo ? (
                  <video src={capturedPreview.url} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={capturedPreview.url} alt="Предпросмотр" className="w-full h-full object-contain" />
                )}

                {isUploadingToGallery && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-amber-200 z-10 p-4 text-center">
                    <Loader2 size={28} className="animate-spin text-amber-400" />
                    <span className="text-xs font-bold">Загрузка в галерею и получение прямой ссылки...</span>
                  </div>
                )}
              </div>
              <p className={`text-xs text-center font-bold ${
                isLightTheme ? 'text-zinc-950' : 'text-[#F4EE8E]'
              }`}>
                ✓ Материал успешно получен. Проверьте результат и подтвердите прикрепление.
              </p>
            </div>
          )}

          {/* Fallback Native Input */}
          <input
            ref={nativeFileInputRef}
            type="file"
            accept={mode === 'video' ? 'video/*' : 'image/*'}
            capture={mode === 'screenshot' ? undefined : 'environment'}
            className="hidden"
            onChange={handleNativeFileSelected}
          />
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t space-y-2 ${
          isLightTheme ? 'border-amber-300/60' : 'border-amber-400/30'
        }`}>
          {capturedPreview ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isUploadingToGallery}
                onClick={handleRetake}
                className={`min-h-[46px] px-3 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isLightTheme
                    ? 'border-amber-400 text-zinc-950 hover:bg-amber-100/50'
                    : 'border-amber-400/50 text-amber-200 hover:bg-white/5'
                } ${isUploadingToGallery ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw size={14} />
                <span>Переснять</span>
              </button>

              <button
                type="button"
                disabled={isUploadingToGallery}
                onClick={handleConfirmMedia}
                className={`min-h-[46px] px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-zinc-950 hover:brightness-105 active:scale-98 shadow-md cursor-pointer transition-all ${
                  isUploadingToGallery ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isUploadingToGallery ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Загрузка...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Прикрепить к рапорту</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {mode === 'photo' && (
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="w-full min-h-[50px] px-4 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-zinc-950 hover:brightness-105 active:scale-98 shadow-md cursor-pointer transition-all"
                >
                  <Camera size={20} />
                  <span>Сделать снимок сейчас</span>
                </button>
              )}

              {mode === 'video' && !isRecording && (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-full min-h-[50px] px-4 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-zinc-950 hover:brightness-105 active:scale-98 shadow-md cursor-pointer transition-all"
                >
                  <Play size={20} />
                  <span>Начать видеозапись</span>
                </button>
              )}

              {mode === 'video' && isRecording && (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-full min-h-[50px] px-4 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 active:scale-98 shadow-md cursor-pointer transition-all animate-pulse"
                >
                  <Square size={20} />
                  <span>Завершить запись</span>
                </button>
              )}

              {/* Native device camera / file picker fallback button */}
              <button
                type="button"
                onClick={() => nativeFileInputRef.current?.click()}
                className={`w-full min-h-[42px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isLightTheme
                    ? 'border-amber-300 text-zinc-900 hover:bg-amber-100/50'
                    : 'border-amber-400/40 text-amber-200 hover:bg-white/5'
                }`}
              >
                <Upload size={14} />
                <span>
                  {mode === 'photo' && 'Открыть стандартную камеру телефона / файл'}
                  {mode === 'video' && 'Открыть видеокамеру телефона / файл'}
                  {mode === 'screenshot' && 'Загрузить файл скриншота из проводника'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

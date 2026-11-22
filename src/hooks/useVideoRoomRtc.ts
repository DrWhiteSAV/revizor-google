import { useEffect, useRef, useState, useCallback } from 'react';
import { sharedCommsSocket } from './useCommsSocket';
import {
  ICE_SERVERS,
  arrayBufferToBase64,
  base64ToInt16Array,
  type RtcRemotePeer,
  type UseVideoRoomRtcOptions
} from './commsRtcHelpers';

export type { RtcRemotePeer, UseVideoRoomRtcOptions };

export function useVideoRoomRtc(options: UseVideoRoomRtcOptions) {
  const {
    roomId,
    chatId,
    userId,
    displayName,
    avatarUrl,
    transcriptionEnabled,
    selectedMicId,
    selectedCamId,
    onTranscriptChunk,
    onTranscriptChatMessage,
    onRoomEnded
  } = options;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RtcRemotePeer[]>([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [relayActive, setRelayActive] = useState(false);
  const [sttStatus, setSttStatus] = useState<'idle' | 'listening' | 'processing'>('idle');

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peersMetaRef = useRef<Map<string, RtcRemotePeer>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const natFallbackTimersRef = useRef<Map<string, number>>(new Map());
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);
  const isMicOnRef = useRef(true);
  const isCameraOnRef = useRef(true);
  const isScreenSharingRef = useRef(false);
  const relayActiveRef = useRef(false);
  const vadActiveRef = useRef(false);
  const sttRecorderRef = useRef<MediaRecorder | null>(null);
  const sttLoopRef = useRef<number | null>(null);

  isMicOnRef.current = isMicOn;
  isCameraOnRef.current = isCameraOn;
  isScreenSharingRef.current = isScreenSharing;

  const syncRemotePeersState = useCallback(() => {
    setRemotePeers(Array.from(peersMetaRef.current.values()));
  }, []);

  const acquireLocalMedia = useCallback(
    async (opts?: { facing?: 'user' | 'environment'; micId?: string; camId?: string }) => {
      const targetFacing = opts?.facing || facingMode;
      const isMobile =
        typeof navigator !== 'undefined' &&
        (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
          (typeof window !== 'undefined' && window.innerWidth < 768));

      const videoConstraint: MediaTrackConstraints | boolean = opts?.camId
        ? {
            deviceId: { exact: opts.camId },
            width: { ideal: isMobile ? 720 : 1280 },
            height: { ideal: isMobile ? 720 : 720 },
            aspectRatio: { ideal: isMobile ? 1 : 16 / 9 },
            frameRate: { ideal: 24, max: 30 }
          }
        : {
            facingMode: targetFacing,
            width: { ideal: isMobile ? 720 : 1280 },
            height: { ideal: isMobile ? 720 : 720 },
            aspectRatio: { ideal: isMobile ? 1 : 16 / 9 },
            frameRate: { ideal: 24, max: 30 }
          };

      const audioConstraint: MediaTrackConstraints | boolean = opts?.micId
        ? { deviceId: { exact: opts.micId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: videoConstraint
        });
        setMediaError(null);
        return stream;
      } catch {
        // Fallback: try audio-only if camera permission is denied or busy
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
          setIsCameraOn(false);
          setMediaError('Камера недоступна — подключён режим только аудио.');
          return audioOnly;
        } catch (err: any) {
          setIsCameraOn(false);
          setIsMicOn(false);
          setMediaError('Разрешите доступ к микрофону и камере в настройках браузера или PWA.');
          return new MediaStream();
        }
      }
    },
    [facingMode]
  );

  const ensurePeerMeta = useCallback(
    (peerId: string, meta?: Partial<RtcRemotePeer>) => {
      const existing = peersMetaRef.current.get(peerId) || {
        userId: peerId,
        displayName: meta?.displayName || 'Коллега',
        avatarUrl: meta?.avatarUrl || '',
        stream: null,
        fallbackFrameUrl: null,
        isCameraOn: true,
        isMicOn: true,
        isScreenSharing: false,
        isSpeaking: false,
        connectionState: 'connecting' as const
      };
      const merged: RtcRemotePeer = {
        ...existing,
        ...meta,
        userId: peerId
      };
      peersMetaRef.current.set(peerId, merged);
      syncRemotePeersState();
      return merged;
    },
    [syncRemotePeersState]
  );

  const createPeerConnection = useCallback(
    (peerId: string, meta?: Partial<RtcRemotePeer>) => {
      if (!roomId || peerId === userId) return null;
      const existing = pcsRef.current.get(peerId);
      if (existing) return existing;

      ensurePeerMeta(peerId, meta);

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 6
      });
      pcsRef.current.set(peerId, pc);

      // Attach local tracks
      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      }

      // Start a 7.5s NAT check: if P2P ICE fails on strict cellular/office networks, enable built-in WSS fallback relay seamlessly
      const natTimer = window.setTimeout(() => {
        if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
          try {
            pc.restartIce();
          } catch {}
          window.setTimeout(() => {
            if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
              relayActiveRef.current = true;
              setRelayActive(true);
              ensurePeerMeta(peerId, { connectionState: 'relay' });
            }
          }, 3000);
        }
      }, 7500);
      natFallbackTimersRef.current.set(peerId, natTimer);

      pc.onicecandidate = (evt) => {
        if (evt.candidate && roomId) {
          sharedCommsSocket.send('rtc:ice', {
            roomId,
            targetId: peerId,
            candidate: evt.candidate.toJSON()
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        const st = pc.iceConnectionState;
        if (st === 'connected' || st === 'completed') {
          const t = natFallbackTimersRef.current.get(peerId);
          if (t) {
            window.clearTimeout(t);
            natFallbackTimersRef.current.delete(peerId);
          }
          ensurePeerMeta(peerId, { connectionState: 'connected' });
        } else if (st === 'failed' || st === 'disconnected') {
          ensurePeerMeta(peerId, { connectionState: 'reconnecting' });
          try {
            pc.restartIce();
          } catch {}
        }
      };

      pc.ontrack = (evt) => {
        const remoteStream = evt.streams?.[0] || new MediaStream([evt.track]);
        ensurePeerMeta(peerId, { stream: remoteStream, connectionState: 'connected' });
      };

      const isPolite = userId < peerId;
      pc.onnegotiationneeded = async () => {
        if (!roomId || !isPolite === false) {
          // Only trigger automatic offer from impolite or when explicitly initiating
        }
        try {
          makingOfferRef.current.set(peerId, true);
          const offer = await pc.createOffer();
          if (pc.signalingState !== 'stable') return;
          await pc.setLocalDescription(offer);
          sharedCommsSocket.send('rtc:offer', {
            roomId,
            targetId: peerId,
            sdp: pc.localDescription
          });
        } catch (err) {
          console.warn('[RTC] Offer creation warning:', err);
        } finally {
          makingOfferRef.current.set(peerId, false);
        }
      };

      return pc;
    },
    [roomId, userId, ensurePeerMeta]
  );

  // Clean up one peer
  const removePeer = useCallback(
    (peerId: string) => {
      const t = natFallbackTimersRef.current.get(peerId);
      if (t) {
        window.clearTimeout(t);
        natFallbackTimersRef.current.delete(peerId);
      }
      const pc = pcsRef.current.get(peerId);
      if (pc) {
        try {
          pc.close();
        } catch {}
        pcsRef.current.delete(peerId);
      }
      peersMetaRef.current.delete(peerId);
      pendingIceRef.current.delete(peerId);
      syncRemotePeersState();
    },
    [syncRemotePeersState]
  );

  // Join room, acquire local media, attach WS listeners, keep screen awake on mobile
  useEffect(() => {
    if (!roomId || !userId) return;
    let cancelled = false;

    const init = async () => {
      const stream = await acquireLocalMedia({ micId: selectedMicId, camId: selectedCamId });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Wake Lock for mobile PWA calls
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}

      await fetch(`/api/comms/video/rooms/${encodeURIComponent(roomId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          displayName,
          avatarUrl,
          isCameraOn: stream.getVideoTracks().length > 0,
          isMicOn: stream.getAudioTracks().length > 0
        })
      }).catch(() => {});

      sharedCommsSocket.send('rtc:join', { roomId });
      sharedCommsSocket.send('rtc:media_state', {
        roomId,
        isCameraOn: stream.getVideoTracks().length > 0,
        isMicOn: stream.getAudioTracks().length > 0,
        isScreenSharing: false
      });
    };

    void init();

    const unsubPeers = sharedCommsSocket.subscribe('rtc:room_peers', (payload) => {
      if (payload?.roomId !== roomId || !Array.isArray(payload.peers)) return;
      for (const p of payload.peers) {
        if (p.userId && p.userId !== userId) {
          const pc = createPeerConnection(String(p.userId), {
            displayName: p.displayName,
            avatarUrl: p.avatarUrl
          });
          // Initiate offer from newcomer cleanly if deterministic side matches
          if (pc && userId > String(p.userId)) {
            void (async () => {
              try {
                makingOfferRef.current.set(String(p.userId), true);
                const offer = await pc.createOffer();
                if (pc.signalingState === 'stable') {
                  await pc.setLocalDescription(offer);
                  sharedCommsSocket.send('rtc:offer', {
                    roomId,
                    targetId: String(p.userId),
                    sdp: pc.localDescription
                  });
                }
              } catch {}
              makingOfferRef.current.set(String(p.userId), false);
            })();
          }
        }
      }
    });

    const unsubJoined = sharedCommsSocket.subscribe('rtc:peer_joined', (payload) => {
      if (payload?.roomId !== roomId || !payload?.userId || payload.userId === userId) return;
      const pc = createPeerConnection(String(payload.userId), {
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl
      });
      if (pc && userId > String(payload.userId)) {
        void (async () => {
          try {
            makingOfferRef.current.set(String(payload.userId), true);
            const offer = await pc.createOffer();
            if (pc.signalingState === 'stable') {
              await pc.setLocalDescription(offer);
              sharedCommsSocket.send('rtc:offer', {
                roomId,
                targetId: String(payload.userId),
                sdp: pc.localDescription
              });
            }
          } catch {}
          makingOfferRef.current.set(String(payload.userId), false);
        })();
      }
      sharedCommsSocket.send('rtc:media_state', {
        roomId,
        isCameraOn: isCameraOnRef.current,
        isMicOn: isMicOnRef.current,
        isScreenSharing: isScreenSharingRef.current
      });
    });

    const unsubLeft = sharedCommsSocket.subscribe('rtc:peer_left', (payload) => {
      if (payload?.roomId !== roomId || !payload?.userId) return;
      removePeer(String(payload.userId));
    });

    const unsubOffer = sharedCommsSocket.subscribe('rtc:offer', async (payload) => {
      if (payload?.roomId !== roomId || !payload?.senderId || !payload?.sdp) return;
      const senderId = String(payload.senderId);
      const pc = createPeerConnection(senderId, { displayName: payload.displayName });
      if (!pc) return;

      const polite = userId < senderId;
      const offerCollision = makingOfferRef.current.get(senderId) || pc.signalingState !== 'stable';
      if (offerCollision && !polite) return;

      try {
        if (offerCollision && pc.signalingState !== 'stable') {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' } as any).catch(() => {}),
            pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }

        const queued = pendingIceRef.current.get(senderId) || [];
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        pendingIceRef.current.delete(senderId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sharedCommsSocket.send('rtc:answer', {
          roomId,
          targetId: senderId,
          sdp: pc.localDescription
        });
      } catch (err) {
        console.warn('[RTC] Offer handling error:', err);
      }
    });

    const unsubAnswer = sharedCommsSocket.subscribe('rtc:answer', async (payload) => {
      if (payload?.roomId !== roomId || !payload?.senderId || !payload?.sdp) return;
      const senderId = String(payload.senderId);
      const pc = pcsRef.current.get(senderId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const queued = pendingIceRef.current.get(senderId) || [];
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        pendingIceRef.current.delete(senderId);
      } catch {}
    });

    const unsubIce = sharedCommsSocket.subscribe('rtc:ice', async (payload) => {
      if (payload?.roomId !== roomId || !payload?.senderId || !payload?.candidate) return;
      const senderId = String(payload.senderId);
      const pc = pcsRef.current.get(senderId);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
      } else {
        const list = pendingIceRef.current.get(senderId) || [];
        list.push(payload.candidate);
        pendingIceRef.current.set(senderId, list);
      }
    });

    const unsubMediaState = sharedCommsSocket.subscribe('rtc:media_state', (payload) => {
      if (payload?.roomId !== roomId || !payload?.userId) return;
      ensurePeerMeta(String(payload.userId), {
        isCameraOn: Boolean(payload.isCameraOn),
        isMicOn: Boolean(payload.isMicOn),
        isScreenSharing: Boolean(payload.isScreenSharing)
      });
    });

    const unsubFallbackFrame = sharedCommsSocket.subscribe('rtc:fallback_frame', (payload) => {
      if (payload?.roomId !== roomId || !payload?.senderId || !payload?.dataUrl) return;
      ensurePeerMeta(String(payload.senderId), {
        fallbackFrameUrl: String(payload.dataUrl),
        connectionState: 'relay'
      });
    });

    const unsubFallbackAudio = sharedCommsSocket.subscribe('rtc:fallback_audio', (payload) => {
      if (payload?.roomId !== roomId || !payload?.senderId || !payload?.pcmBase64) return;
      try {
        if (!playbackCtxRef.current) {
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          playbackCtxRef.current = new Ctx({ sampleRate: 8000 });
        }
        const ctx = playbackCtxRef.current;
        if (ctx.state === 'suspended') {
          setAutoplayBlocked(true);
          return;
        }
        const pcm = base64ToInt16Array(String(payload.pcmBase64));
        const audioBuf = ctx.createBuffer(1, pcm.length, 8000);
        const chan = audioBuf.getChannelData(0);
        for (let i = 0; i < pcm.length; i++) chan[i] = pcm[i] / 32768;
        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.connect(ctx.destination);
        const now = ctx.currentTime;
        const startAt = Math.max(now, nextPlayTimeRef.current);
        src.start(startAt);
        nextPlayTimeRef.current = startAt + audioBuf.duration;
      } catch {}
    });

    const unsubTranscript = sharedCommsSocket.subscribe('video:transcript', (entry) => {
      if (entry?.roomId === roomId && onTranscriptChunk) {
        onTranscriptChunk(entry);
      }
    });

    const unsubEnded = sharedCommsSocket.subscribe('rtc:room_ended', (payload) => {
      if (payload?.roomId === roomId && onRoomEnded) {
        onRoomEnded();
      }
    });

    const handlePageHide = () => {
      try {
        const blob = new Blob([JSON.stringify({ userId })], { type: 'application/json' });
        navigator.sendBeacon(`/api/comms/video/rooms/${encodeURIComponent(roomId)}/leave`, blob);
      } catch {}
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      unsubPeers();
      unsubJoined();
      unsubLeft();
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubMediaState();
      unsubFallbackFrame();
      unsubFallbackAudio();
      unsubTranscript();
      unsubEnded();

      sharedCommsSocket.send('rtc:leave', { roomId });
      for (const peerId of Array.from(pcsRef.current.keys())) {
        removePeer(peerId);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      try {
        wakeLockRef.current?.release?.();
      } catch {}
      try {
        playbackCtxRef.current?.close();
        playbackCtxRef.current = null;
      } catch {}
    };
  }, [roomId, userId]);

  // VAD Equalizer + >3s Pause Detection Speech-to-Text Capture -> Cloud Upload + Transcript + Chat Audio/Text
  useEffect(() => {
    if (!roomId || !localStream || localStream.getAudioTracks().length === 0) {
      setSttStatus('idle');
      return;
    }

    let stopped = false;
    let audioCtx: AudioContext | null = null;
    let levelInterval: number | null = null;
    let pendingUploads = 0;

    let hasSpokenInSegment = false;
    let lastSpeechAt = 0;
    let segmentStartAt = Date.now();
    let stopReason: 'speech_cut' | 'silent_recycle' | 'cleanup' = 'cleanup';

    const audioOnlyStream = new MediaStream(localStream.getAudioTracks());
    const preferredMime =
      typeof MediaRecorder !== 'undefined'
        ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) =>
            MediaRecorder.isTypeSupported(m)
          ) || ''
        : '';

    const stopCurrentRecorder = (reason: 'speech_cut' | 'silent_recycle' | 'cleanup') => {
      const rec = sttRecorderRef.current;
      if (rec && rec.state === 'recording') {
        stopReason = reason;
        try {
          rec.stop();
        } catch {}
      }
    };

    const recordSegment = () => {
      if (stopped || !transcriptionEnabled || typeof MediaRecorder === 'undefined') {
        if (pendingUploads === 0) setSttStatus('idle');
        return;
      }
      if (!isMicOnRef.current) {
        if (pendingUploads === 0) setSttStatus('idle');
        sttLoopRef.current = window.setTimeout(recordSegment, 1200);
        return;
      }

      hasSpokenInSegment = false;
      vadActiveRef.current = false;
      lastSpeechAt = 0;
      segmentStartAt = Date.now();
      stopReason = 'speech_cut';
      if (pendingUploads === 0) setSttStatus('listening');

      const chunks: BlobPart[] = [];
      let recorder: MediaRecorder;
      try {
        recorder = preferredMime
          ? new MediaRecorder(audioOnlyStream, { mimeType: preferredMime })
          : new MediaRecorder(audioOnlyStream);
      } catch {
        setSttStatus('idle');
        return;
      }
      sttRecorderRef.current = recorder;

      const startedAt = Date.now();
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = async () => {
        const currentReason = stopReason;
        const spoken = hasSpokenInSegment || vadActiveRef.current;
        const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const mime = recorder.mimeType || preferredMime || 'audio/webm';
        const blob = new Blob(chunks, { type: mime });

        // Immediately resume continuous listening unless unmounted
        if (!stopped) {
          sttLoopRef.current = window.setTimeout(recordSegment, 100);
        }

        if (currentReason === 'silent_recycle' || !spoken || blob.size < 2000 || !transcriptionEnabled) {
          return;
        }

        pendingUploads += 1;
        setSttStatus('processing');
        try {
          const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
          const fd = new FormData();
          fd.append('file', blob, `voice_${Date.now()}.${ext}`);
          fd.append('userId', userId);
          fd.append('speakerName', displayName);
          fd.append('durationSec', String(durationSec));
          fd.append('mimeType', mime);
          if (chatId) fd.append('chatId', chatId);

          const res = await fetch(`/api/comms/video/rooms/${encodeURIComponent(roomId)}/transcribe-chunk`, {
            method: 'POST',
            body: fd
          });
          const data = await res.json().catch(() => null);
          if (data?.transcript && onTranscriptChunk) {
            onTranscriptChunk(data.transcript);
          }
          if (data?.chatMessage && onTranscriptChatMessage) {
            onTranscriptChatMessage(data.chatMessage);
          }
        } catch (err) {
          console.warn('[Video STT Upload Error]:', err);
        } finally {
          pendingUploads = Math.max(0, pendingUploads - 1);
          if (!stopped && pendingUploads === 0) {
            setSttStatus(isMicOnRef.current ? 'listening' : 'idle');
          }
        }
      };

      try {
        recorder.start(350);
      } catch {
        setSttStatus('idle');
      }
    };

    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new Ctx();
      const source = audioCtx.createMediaStreamSource(localStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      levelInterval = window.setInterval(() => {
        if (stopped) return;
        const now = Date.now();
        if (!isMicOnRef.current) {
          setLocalSpeaking(false);
          if (hasSpokenInSegment) {
            stopCurrentRecorder('speech_cut');
          }
          return;
        }
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        const speakingNow = avg > 12;
        setLocalSpeaking(speakingNow);

        if (speakingNow) {
          hasSpokenInSegment = true;
          vadActiveRef.current = true;
          lastSpeechAt = now;
        }

        const rec = sttRecorderRef.current;
        if (rec && rec.state === 'recording' && transcriptionEnabled) {
          if (hasSpokenInSegment) {
            // Cut & transcribe immediately when pause exceeds 3.0 seconds or continuous speech hits 30s
            if ((lastSpeechAt > 0 && now - lastSpeechAt >= 3000) || now - segmentStartAt >= 30000) {
              stopCurrentRecorder('speech_cut');
            }
          } else if (now - segmentStartAt >= 8000) {
            // Discard long silent buffer cleanly so phrases don't carry dead air
            stopCurrentRecorder('silent_recycle');
          }
        }
      }, 150);
    } catch {}

    if (transcriptionEnabled) {
      sttLoopRef.current = window.setTimeout(recordSegment, 600);
    }

    return () => {
      stopped = true;
      if (levelInterval) window.clearInterval(levelInterval);
      if (sttLoopRef.current) window.clearTimeout(sttLoopRef.current);
      stopCurrentRecorder('cleanup');
      try {
        audioCtx?.close();
      } catch {}
      setSttStatus('idle');
    };
  }, [roomId, chatId, localStream, transcriptionEnabled, userId, displayName]);

  // Built-in NAT WSS Media Fallback Publisher (active ONLY when a peer fell back to relay)
  useEffect(() => {
    if (!roomId || !relayActive || !localStream) return;
    let stopped = false;
    let frameTimer: number | null = null;
    let audioCtx: AudioContext | null = null;
    let processor: ScriptProcessorNode | null = null;

    // 1. Lightweight low-fps JPEG frame capture (240x180 @ 2.5 fps)
    const videoEl = document.createElement('video');
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.srcObject = localStream;
    void videoEl.play().catch(() => {});

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 180;
    const ctx2d = canvas.getContext('2d');

    frameTimer = window.setInterval(() => {
      if (stopped || !isCameraOnRef.current || !ctx2d || videoEl.readyState < 2) return;
      try {
        ctx2d.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.45);
        sharedCommsSocket.send('rtc:fallback_frame', { roomId, dataUrl });
      } catch {}
    }, 400);

    // 2. Compressed PCM16 8kHz audio chunk stream for strict NAT fallback
    if (localStream.getAudioTracks().length > 0) {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new Ctx({ sampleRate: 8000 });
        const src = audioCtx.createMediaStreamSource(localStream);
        processor = audioCtx.createScriptProcessor(1024, 1, 1);
        processor.onaudioprocess = (ev) => {
          if (stopped || !isMicOnRef.current) return;
          const input = ev.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(input.length);
          let energy = 0;
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            energy += Math.abs(s);
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          if (energy / input.length > 0.008) {
            sharedCommsSocket.send('rtc:fallback_audio', {
              roomId,
              pcmBase64: arrayBufferToBase64(int16.buffer)
            });
          }
        };
        src.connect(processor);
        processor.connect(audioCtx.destination);
      } catch {}
    }

    return () => {
      stopped = true;
      if (frameTimer) window.clearInterval(frameTimer);
      try {
        processor?.disconnect();
        audioCtx?.close();
      } catch {}
      videoEl.srcObject = null;
    };
  }, [roomId, relayActive, localStream]);

  const toggleMic = useCallback(() => {
    const next = !isMicOnRef.current;
    setIsMicOn(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
    if (roomId) {
      sharedCommsSocket.send('rtc:media_state', {
        roomId,
        isCameraOn: isCameraOnRef.current,
        isMicOn: next,
        isScreenSharing: isScreenSharingRef.current
      });
    }
  }, [roomId]);

  const toggleCamera = useCallback(() => {
    const next = !isCameraOnRef.current;
    setIsCameraOn(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
    }
    if (roomId) {
      sharedCommsSocket.send('rtc:media_state', {
        roomId,
        isCameraOn: next,
        isMicOn: isMicOnRef.current,
        isScreenSharing: isScreenSharingRef.current
      });
    }
  }, [roomId]);

  const flipCamera = useCallback(async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    try {
      const isMobile =
        typeof navigator !== 'undefined' &&
        (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
          (typeof window !== 'undefined' && window.innerWidth < 768));
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacing,
          width: { ideal: isMobile ? 720 : 1280 },
          height: { ideal: isMobile ? 720 : 720 },
          aspectRatio: { ideal: isMobile ? 1 : 16 / 9 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: false
      });
      const newTrack = fresh.getVideoTracks()[0];
      if (!newTrack) return;

      const stream = localStreamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((old) => {
          old.stop();
          stream.removeTrack(old);
        });
        stream.addTrack(newTrack);
        setLocalStream(new MediaStream(stream.getTracks()));
      }
      for (const pc of pcsRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
      }
      setIsCameraOn(true);
    } catch (err) {
      console.warn('[RTC] Flip camera failed:', err);
    }
  }, [facingMode]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      // Restore camera track
      const camStream = await acquireLocalMedia({ facing: facingMode, camId: selectedCamId });
      const camTrack = camStream.getVideoTracks()[0];
      camStream.getAudioTracks().forEach((t) => t.stop());
      if (camTrack && localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
        localStreamRef.current.addTrack(camTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        for (const pc of pcsRef.current.values()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(camTrack);
        }
      }
      if (roomId) {
        sharedCommsSocket.send('rtc:media_state', {
          roomId,
          isCameraOn: isCameraOnRef.current,
          isMicOn: isMicOnRef.current,
          isScreenSharing: false
        });
      }
      return;
    }

    try {
      const disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const dispTrack = disp.getVideoTracks()[0];
      if (!dispTrack) return;
      screenStreamRef.current = disp;
      setIsScreenSharing(true);

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.stop();
          localStreamRef.current?.removeTrack(t);
        });
        localStreamRef.current.addTrack(dispTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      for (const pc of pcsRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(dispTrack);
      }
      dispTrack.onended = () => {
        void toggleScreenShare();
      };
      if (roomId) {
        sharedCommsSocket.send('rtc:media_state', {
          roomId,
          isCameraOn: true,
          isMicOn: isMicOnRef.current,
          isScreenSharing: true
        });
      }
    } catch {}
  }, [acquireLocalMedia, facingMode, roomId, selectedCamId]);

  const applyDevices = useCallback(
    async (micId?: string, camId?: string) => {
      const fresh = await acquireLocalMedia({ facing: facingMode, micId, camId });
      const old = localStreamRef.current;
      localStreamRef.current = fresh;
      setLocalStream(fresh);
      for (const pc of pcsRef.current.values()) {
        for (const track of fresh.getTracks()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
          if (sender) await sender.replaceTrack(track);
          else pc.addTrack(track, fresh);
        }
      }
      if (old) old.getTracks().forEach((t) => t.stop());
    },
    [acquireLocalMedia, facingMode]
  );

  const unlockAudioPlayback = useCallback(() => {
    setAutoplayBlocked(false);
    if (playbackCtxRef.current && playbackCtxRef.current.state === 'suspended') {
      void playbackCtxRef.current.resume().catch(() => {});
    }
    const videos = document.querySelectorAll('video[data-comms-remote="1"]');
    videos.forEach((v) => {
      const el = v as HTMLVideoElement;
      el.muted = false;
      void el.play().catch(() => {});
    });
  }, []);

  return {
    localStream,
    remotePeers,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    facingMode,
    localSpeaking,
    mediaError,
    autoplayBlocked,
    relayActive,
    sttStatus,
    toggleMic,
    toggleCamera,
    flipCamera,
    toggleScreenShare,
    applyDevices,
    unlockAudioPlayback
  };
}

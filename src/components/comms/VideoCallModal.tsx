import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  RefreshCw,
  MessageSquare,
  FileText,
  Settings,
  PhoneOff,
  UserPlus,
  Send,
  Volume2,
  Copy,
  Check,
  X,
  Users,
  Link2,
  AudioWaveform,
  RotateCcw
} from 'lucide-react';
import { useVideoRoomRtc } from '../../hooks/useVideoRoomRtc';
import { sharedCommsSocket } from '../../hooks/useCommsSocket';
import {
  loadLocalCommsLayoutPrefs,
  fetchRemoteCommsLayoutPrefs,
  persistCommsLayoutPrefs,
  DEFAULT_COMMS_LAYOUT_PREFS
} from '../../hooks/commsRtcHelpers';
import { CustomAudioPlayer } from '../voice/CustomAudioPlayer';
import { CommsCameraTile } from './CommsCameraTile';
import type {
  CommsColleague,
  CommsMessage,
  CommsTileSizePref,
  CommsTranscriptEntry,
  CommsUserLayoutPrefs
} from '../../types/comms';

interface VideoCallModalProps {
  roomId: string;
  roomTitle: string;
  chatId?: string | null;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  colleagues: CommsColleague[];
  theme?: 'dark' | 'light';
  onClose: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  roomId,
  roomTitle,
  chatId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  colleagues,
  theme = 'dark',
  onClose
}) => {
  const isLight = theme === 'light';
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [transcripts, setTranscripts] = useState<CommsTranscriptEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<CommsMessage[]>([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [sideTab, setSideTab] = useState<'none' | 'transcript' | 'chat'>('none');
  const [chatDraft, setChatDraft] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [mirrorLocal, setMirrorLocal] = useState(true);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedCamId, setSelectedCamId] = useState<string>('');
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const mainContainerRef = useRef<HTMLDivElement | null>(null);

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [layoutPrefs, setLayoutPrefs] = useState<CommsUserLayoutPrefs>(() =>
    loadLocalCommsLayoutPrefs(currentUserId)
  );
  const [isDrawerResizing, setIsDrawerResizing] = useState(false);

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const roomJoinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/cabinet/comms?room=${encodeURIComponent(roomId)}`
      : `/cabinet/comms?room=${encodeURIComponent(roomId)}`;

  useEffect(() => {
    setLayoutPrefs(loadLocalCommsLayoutPrefs(currentUserId));
    let cancelled = false;
    void fetchRemoteCommsLayoutPrefs(currentUserId).then((remote) => {
      if (!cancelled && remote) {
        setLayoutPrefs(remote);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobileViewport(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const {
    localStream,
    remotePeers,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    localSpeaking,
    mediaError,
    autoplayBlocked,
    sttStatus,
    toggleMic,
    toggleCamera,
    flipCamera,
    toggleScreenShare,
    applyDevices,
    unlockAudioPlayback
  } = useVideoRoomRtc({
    roomId,
    chatId,
    userId: currentUserId,
    displayName: currentUserName,
    avatarUrl: currentUserAvatar,
    transcriptionEnabled,
    selectedMicId: selectedMicId || undefined,
    selectedCamId: selectedCamId || undefined,
    onTranscriptChunk: (entry) => {
      setTranscripts((prev) => (prev.some((t) => t.id === entry.id) ? prev : [...prev, entry]));
    },
    onTranscriptChatMessage: (msg) => {
      setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    },
    onRoomEnded: () => {}
  });

  useEffect(() => {
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/comms/video/rooms/${encodeURIComponent(roomId)}`);
        const data = await res.json();
        if (data?.success && Array.isArray(data.transcripts)) {
          setTranscripts(data.transcripts);
        }
      } catch {}

      if (chatId) {
        try {
          const mRes = await fetch(
            `/api/comms/chats/${encodeURIComponent(chatId)}/messages?userId=${encodeURIComponent(currentUserId)}`
          );
          const mData = await mRes.json();
          if (mData?.success && Array.isArray(mData.messages)) {
            setChatMessages(mData.messages);
          }
          sharedCommsSocket.send('chat:join', { chatId });
        } catch {}
      }
    })();

    const unsubMsg = sharedCommsSocket.subscribe('chat:message', (payload) => {
      if (!chatId || payload?.chatId !== chatId || !payload?.message) return;
      setChatMessages((prev) => (prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]));
      if (sideTab !== 'chat' && payload.message.senderId !== currentUserId) {
        setUnreadChat((u) => u + 1);
      }
    });

    const unsubMsgUpdated = sharedCommsSocket.subscribe('chat:message_updated', (payload) => {
      if (!chatId || payload?.chatId !== chatId || !payload?.message) return;
      setChatMessages((prev) =>
        prev.map((m) => (m.id === payload.message.id ? { ...m, ...payload.message } : m))
      );
    });

    return () => {
      unsubMsg();
      unsubMsgUpdated();
    };
  }, [roomId, chatId, currentUserId, sideTab]);

  useEffect(() => {
    if (sideTab === 'chat') setUnreadChat(0);
    if (sideTab === 'transcript') {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sideTab, transcripts.length]);

  const loadDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setMics(list.filter((d) => d.kind === 'audioinput'));
      setCams(list.filter((d) => d.kind === 'videoinput'));
    } catch {}
  };

  const handleOpenSettings = async () => {
    await loadDevices();
    setIsSettingsOpen(true);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId || !chatDraft.trim()) return;
    setChatError(null);
    const text = chatDraft.trim();
    try {
      const res = await fetch(`/api/comms/chats/${encodeURIComponent(chatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, message: text })
      });
      const data = await res.json();
      if (!res.ok || data?.blocked) {
        setChatError(data?.error || 'Сообщение отклонено системой безопасности');
        return;
      }
      setChatDraft('');
      if (data?.message) {
        setChatMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      }
    } catch {
      setChatError('Не удалось отправить сообщение');
    }
  };

  const handleInviteColleague = async (colleagueId: string) => {
    setInvitedIds((prev) => new Set(prev).add(colleagueId));
    try {
      await fetch('/api/comms/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: currentUserId,
          chatId: chatId || undefined,
          roomType: 'group',
          title: roomTitle,
          inviteUserIds: [colleagueId]
        })
      });
    } catch {}
  };

  const handleCopyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomJoinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleLeaveCall = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      sharedCommsSocket.send('rtc:leave', { roomId });
      await fetch(`/api/comms/video/rooms/${encodeURIComponent(roomId)}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });
    } catch {}
    onClose();
  };

  const handleCopyTranscript = async () => {
    const text = transcripts
      .map((t) => `[${new Date(t.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}] ${t.speakerName}: ${t.text}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch {}
  };

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');

  const allTiles = [
    {
      userId: currentUserId,
      displayName: currentUserName,
      avatarUrl: currentUserAvatar,
      stream: localStream,
      fallbackFrameUrl: null,
      isLocal: true,
      isMicOn,
      isCameraOn,
      isScreenSharing,
      isSpeaking: localSpeaking
    },
    ...remotePeers.map((p) => ({
      ...p,
      isLocal: false
    }))
  ];

  const modeKey = isMobileViewport ? 'mobile' : 'desktop';
  const modePrefs = layoutPrefs[modeKey] || {};
  const drawerWidthPx =
    modePrefs.callDrawerWidthPx ?? DEFAULT_COMMS_LAYOUT_PREFS.desktop.callDrawerWidthPx ?? 380;
  const drawerHeightPct =
    modePrefs.callDrawerHeightPct ?? DEFAULT_COMMS_LAYOUT_PREFS.mobile.callDrawerHeightPct ?? 48;
  const tilePrefsMap = modePrefs.tiles || {};
  const hasCustomLayout =
    Object.keys(tilePrefsMap).length > 0 ||
    (isMobileViewport
      ? drawerHeightPct !== DEFAULT_COMMS_LAYOUT_PREFS.mobile.callDrawerHeightPct
      : drawerWidthPx !== DEFAULT_COMMS_LAYOUT_PREFS.desktop.callDrawerWidthPx);

  const updateTileSizePref = (tileKey: string, next: CommsTileSizePref) => {
    setLayoutPrefs((prev) => {
      const curMode = prev[modeKey] || {};
      const updated: CommsUserLayoutPrefs = {
        ...prev,
        [modeKey]: {
          ...curMode,
          tiles: {
            ...(curMode.tiles || {}),
            [tileKey]: next
          }
        }
      };
      persistCommsLayoutPrefs(currentUserId, updated);
      return updated;
    });
  };

  const resetTileSizePref = (tileKey?: string) => {
    setLayoutPrefs((prev) => {
      const curMode = prev[modeKey] || {};
      const nextTiles = { ...(curMode.tiles || {}) };
      if (tileKey) {
        delete nextTiles[tileKey];
      }
      const updated: CommsUserLayoutPrefs = {
        ...prev,
        [modeKey]: tileKey
          ? { ...curMode, tiles: nextTiles }
          : {
              ...curMode,
              callDrawerWidthPx: DEFAULT_COMMS_LAYOUT_PREFS.desktop.callDrawerWidthPx,
              callDrawerHeightPct: DEFAULT_COMMS_LAYOUT_PREFS.mobile.callDrawerHeightPct,
              tiles: {}
            }
      };
      persistCommsLayoutPrefs(currentUserId, updated);
      return updated;
    });
  };

  const startDrawerResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = drawerWidthPx;
    const startH = drawerHeightPct;
    const stageRect = mainContainerRef.current?.getBoundingClientRect();
    const stageH = Math.max(stageRect?.height || window.innerHeight - 150, 260);
    const maxDesktopW = Math.min(760, Math.max(320, Math.floor((stageRect?.width || window.innerWidth) * 0.68)));

    setIsDrawerResizing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const onMove = (ev: PointerEvent) => {
      if (isMobileViewport) {
        const dy = startY - ev.clientY;
        const deltaPct = (dy / stageH) * 100;
        const nextPct = Math.round(Math.min(82, Math.max(26, startH + deltaPct)) * 10) / 10;
        setLayoutPrefs((prev) => {
          const updated: CommsUserLayoutPrefs = {
            ...prev,
            mobile: { ...(prev.mobile || {}), callDrawerHeightPct: nextPct }
          };
          persistCommsLayoutPrefs(currentUserId, updated);
          return updated;
        });
      } else {
        const dx = startX - ev.clientX;
        const nextW = Math.round(Math.min(maxDesktopW, Math.max(260, startW + dx)));
        setLayoutPrefs((prev) => {
          const updated: CommsUserLayoutPrefs = {
            ...prev,
            desktop: { ...(prev.desktop || {}), callDrawerWidthPx: nextW }
          };
          persistCommsLayoutPrefs(currentUserId, updated);
          return updated;
        });
      }
    };

    const onUp = () => {
      setIsDrawerResizing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const totalCount = allTiles.length;
  const gridColsClass =
    pinnedUserId
      ? 'grid-cols-1 max-w-7xl mx-auto w-full'
      : totalCount <= 1
        ? 'grid-cols-1 max-w-7xl mx-auto w-full'
        : totalCount === 2
          ? 'grid-cols-1 sm:grid-cols-2 max-w-7xl mx-auto w-full'
          : totalCount <= 4
            ? 'grid-cols-2 max-w-6xl mx-auto w-full'
            : 'grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto w-full';

  const mobileStageFactor = isMobileViewport && sideTab !== 'none' ? Math.max(0.28, (100 - drawerHeightPct) / 100) : 1;
  const rowHeightCss =
    pinnedUserId || totalCount <= 1
      ? `calc((100dvh - 180px) * ${mobileStageFactor})`
      : totalCount === 2
        ? isMobileViewport
          ? `calc(((100dvh - 205px) * ${mobileStageFactor}) / 2)`
          : 'calc(100dvh - 190px)'
        : `calc(((100dvh - 205px) * ${mobileStageFactor}) / 2)`;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9990] flex flex-col font-sans select-none ${
        isLight ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'
      }`}
      style={{ height: '100dvh' }}
    >
      {/* Top Bar */}
      <header
        className={`px-3 sm:px-5 py-3 border-b flex items-center justify-between gap-2 sm:gap-3 shrink-0 ${
          isLight ? 'bg-[#FAF6EC]/90 border-amber-900/20' : 'bg-[#1A0F02]/85 border-amber-400/30'
        }`}
      >
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F4EE8E] to-[#D99E41] text-amber-950 flex items-center justify-center shrink-0 font-black">
            <Video size={18} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-[15px] sm:text-base font-extrabold truncate ${isLight ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
              {roomTitle}
            </h2>
            <div className="flex items-center gap-3 text-[14px] opacity-80 tabular-nums">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {totalCount}
              </span>
              <span>{mm}:{ss}</span>
              {transcriptionEnabled && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[#E7C768]">
                  {sttStatus === 'processing' && <AudioWaveform size={15} className="animate-pulse" />}
                  <span className={sttStatus === 'processing' ? 'animate-pulse font-bold' : ''}>
                    {sttStatus === 'processing' ? 'Распознавание речи...' : 'Стенограмма активна'}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {autoplayBlocked && (
            <button
              type="button"
              onClick={unlockAudioPlayback}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 text-[14px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <Volume2 size={15} />
              <span>Включить звук</span>
            </button>
          )}
          {hasCustomLayout && (
            <button
              type="button"
              onClick={() => resetTileSizePref()}
              className={`p-2 rounded-xl border text-[14px] font-bold flex items-center gap-1 cursor-pointer ${
                isLight
                  ? 'bg-transparent border-amber-900/30 text-amber-950 hover:bg-amber-900/10'
                  : 'bg-transparent border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/10'
              }`}
              title="Сбросить настроенные размеры окон и панелей"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyRoomLink}
            className={`px-3 py-2 rounded-xl border text-[14px] font-bold flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-transparent border-amber-900/30 text-amber-950 hover:bg-amber-900/10'
                : 'bg-transparent border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/10'
            }`}
            title="Скопировать ссылку на встречу"
          >
            {copiedLink ? <Check size={15} /> : <Link2 size={15} />}
            <span className="hidden sm:inline">{copiedLink ? 'Скопировано' : 'Ссылка'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className={`px-3 py-2 rounded-xl border text-[14px] font-bold flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-transparent border-amber-900/30 text-amber-950 hover:bg-amber-900/10'
                : 'bg-transparent border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/10'
            }`}
          >
            <UserPlus size={15} />
            <span className="hidden sm:inline">Позвать</span>
          </button>
        </div>
      </header>

      {mediaError && (
        <div className="px-4 py-2 text-[14px] font-medium bg-amber-500/15 border-b border-amber-400/30 text-amber-200 text-center">
          {mediaError}
        </div>
      )}

      {/* Main Content Area: Video Grid + Resizable Drawer (Side on Desktop, Bottom on Mobile) */}
      <div ref={mainContainerRef} className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden relative">
        <div className="flex-1 min-h-0 min-w-0 p-3 sm:p-5 overflow-y-auto flex">
          <div className={`grid gap-3 sm:gap-4 my-auto items-center justify-items-center ${gridColsClass}`}>
            {allTiles
              .filter((t) => !pinnedUserId || t.userId === pinnedUserId)
              .map((tile) => {
                const tileKey = tile.isLocal ? 'self' : tile.userId;
                return (
                  <CommsCameraTile
                    key={tile.userId}
                    displayName={tile.displayName}
                    avatarUrl={tile.avatarUrl}
                    stream={tile.stream}
                    fallbackFrameUrl={tile.fallbackFrameUrl}
                    isLocal={tile.isLocal}
                    mirrorLocal={mirrorLocal}
                    isMicOn={tile.isMicOn}
                    isCameraOn={tile.isCameraOn}
                    isScreenSharing={tile.isScreenSharing}
                    isSpeaking={tile.isSpeaking}
                    isPinned={pinnedUserId === tile.userId}
                    maxRowHeightCss={rowHeightCss}
                    defaultMaxWidthCss={totalCount <= 1 && !pinnedUserId ? '56rem' : '100%'}
                    customSize={tilePrefsMap[tileKey]}
                    onResizeTile={(next) => updateTileSizePref(tileKey, next)}
                    onResetTileSize={() => resetTileSizePref(tileKey)}
                    onTogglePin={() => setPinnedUserId((cur) => (cur === tile.userId ? null : tile.userId))}
                    onAutoplayBlocked={() => {}}
                    theme={theme}
                  />
                );
              })}
          </div>
        </div>

        {/* Resizable Side/Bottom Drawer: Transcript OR Chat */}
        {sideTab !== 'none' && (
          <aside
            data-comms-call-drawer="1"
            style={
              isMobileViewport
                ? { height: `${drawerHeightPct}%`, maxHeight: '84%', minHeight: '24%' }
                : { width: `${drawerWidthPx}px`, maxWidth: '72%', minWidth: '260px' }
            }
            className={`relative flex flex-col shrink-0 z-20 ${
              isMobileViewport ? 'w-full border-t' : 'h-full border-l'
            } ${
              isDrawerResizing ? 'transition-none' : 'transition-[width,height] duration-75'
            } ${
              isLight ? 'bg-[#FFFBF5]/95 border-amber-900/20' : 'bg-[#1A0F02]/95 border-amber-400/35'
            }`}
          >
            {/* Edge Resize Handle */}
            <div
              role="separator"
              aria-orientation={isMobileViewport ? 'horizontal' : 'vertical'}
              onPointerDown={startDrawerResize}
              onDoubleClick={() => resetTileSizePref()}
              title={
                isMobileViewport
                  ? 'Потяните за границу вверх или вниз, чтобы изменить высоту панели'
                  : 'Потяните за границу влево или вправо, чтобы изменить ширину панели'
              }
              className={
                isMobileViewport
                  ? 'absolute -top-2 left-0 right-0 h-4 cursor-ns-resize touch-none z-30 flex items-center justify-center group'
                  : 'absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize touch-none z-30 flex items-center justify-center group'
              }
            >
              <div
                className={
                  isMobileViewport
                    ? 'w-12 h-1 rounded-full bg-[#E7C768]/60 group-hover:bg-[#F4EE8E] transition-colors'
                    : 'w-1 h-12 rounded-full bg-[#E7C768]/50 group-hover:bg-[#F4EE8E] transition-colors'
                }
              />
            </div>
            <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'border-amber-900/15' : 'border-amber-400/20'}`}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSideTab('transcript')}
                  className={`px-3 py-1.5 rounded-xl text-[14px] font-bold cursor-pointer ${
                    sideTab === 'transcript'
                      ? 'bg-[#E7C768] text-amber-950'
                      : isLight
                        ? 'text-amber-950 hover:bg-amber-900/10'
                        : 'text-amber-100 hover:bg-amber-400/15'
                  }`}
                >
                  Стенограмма
                </button>
                {chatId && (
                  <button
                    type="button"
                    onClick={() => setSideTab('chat')}
                    className={`px-3 py-1.5 rounded-xl text-[14px] font-bold cursor-pointer ${
                      sideTab === 'chat'
                        ? 'bg-[#E7C768] text-amber-950'
                        : isLight
                          ? 'text-amber-950 hover:bg-amber-900/10'
                          : 'text-amber-100 hover:bg-amber-400/15'
                    }`}
                  >
                    Чат встречи
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSideTab('none')}
                className="p-2 rounded-xl hover:bg-amber-400/10 cursor-pointer"
                aria-label="Закрыть панель"
              >
                <X size={18} />
              </button>
            </div>

            {sideTab === 'transcript' && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 text-[14px] ${isLight ? 'border-amber-900/10' : 'border-amber-400/15'}`}>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={transcriptionEnabled}
                      onChange={(e) => setTranscriptionEnabled(e.target.checked)}
                      className="accent-[#E7C768] w-4 h-4"
                    />
                    <span>Распознавать голос</span>
                  </label>
                  {transcripts.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      className="px-2.5 py-1 rounded-lg border border-amber-400/35 flex items-center gap-1 cursor-pointer hover:bg-amber-400/10 text-[14px]"
                    >
                      {copiedTranscript ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedTranscript ? 'Скопировано' : 'Копировать'}</span>
                    </button>
                  )}
                </div>

                {sttStatus === 'processing' && (
                  <div className="mx-3 mt-2.5 px-3 py-2 rounded-xl border border-amber-400/40 bg-amber-400/10 flex items-center gap-2 text-[14px] text-[#F4EE8E]">
                    <AudioWaveform size={16} className="animate-pulse shrink-0" />
                    <span className="animate-pulse font-semibold">Распознавание речи...</span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {transcripts.length === 0 ? (
                    <div className="text-center py-10 text-[14px] opacity-75 space-y-2">
                      <FileText size={28} className="mx-auto text-[#E7C768] opacity-75" />
                      <p className="font-semibold">Текстовый диалог встречи пуст</p>
                      <p>После фразы и паузы более 3 секунд речь и аудиозапись автоматически появятся здесь и в чате.</p>
                    </div>
                  ) : (
                    transcripts.map((entry) => (
                      <div
                        key={entry.id}
                        className={`p-3 rounded-xl border text-[14px] space-y-2 ${
                          isLight ? 'bg-transparent border-amber-900/20' : 'bg-transparent border-amber-400/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-bold ${isLight ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                            {entry.speakerName}
                          </span>
                          <span className="text-[14px] opacity-65 tabular-nums">
                            {new Date(entry.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {entry.audioUrl && (
                          <CustomAudioPlayer audioUrl={entry.audioUrl} isLightTheme={isLight} />
                        )}
                        <p className="leading-relaxed opacity-95">{entry.text}</p>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </div>
            )}

            {sideTab === 'chat' && chatId && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {chatMessages.map((msg) => {
                    const mine = msg.senderId === currentUserId;
                    const isAudio = Boolean(msg.mediaUrl && msg.mediaType === 'audio');
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-[14px] border space-y-1.5 ${
                          mine
                            ? isLight
                              ? 'bg-amber-900/10 border-amber-900/30 ml-4'
                              : 'bg-amber-400/10 border-amber-400/45 ml-4'
                            : isLight
                              ? 'bg-transparent border-amber-900/20 mr-4'
                              : 'bg-transparent border-amber-400/25 mr-4'
                        }`}
                      >
                        <div className="font-bold opacity-85">{msg.senderName}</div>
                        {isAudio && msg.mediaUrl && (
                          <CustomAudioPlayer audioUrl={msg.mediaUrl} isLightTheme={isLight} />
                        )}
                        {msg.transcriptText && (
                          <div className="whitespace-pre-wrap break-words">{msg.transcriptText}</div>
                        )}
                        {msg.message && msg.message.trim() !== (msg.transcriptText || '').trim() && (
                          <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {chatError && (
                  <div className="px-3 py-1.5 text-[14px] text-rose-400 border-t border-rose-500/30">
                    {chatError}
                  </div>
                )}
                <form onSubmit={handleSendChat} className={`p-2.5 border-t flex items-center gap-2 ${isLight ? 'border-amber-900/15' : 'border-amber-400/20'}`}>
                  <input
                    type="text"
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    placeholder="Написать в чат..."
                    className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-[14px] focus:outline-none ${
                      isLight
                        ? 'bg-transparent border-amber-900/25 text-amber-950'
                        : 'bg-transparent border-amber-400/35 text-white'
                    }`}
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 cursor-pointer shrink-0"
                    title="Отправить"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Dock Bar */}
      <footer
        className={`px-2 sm:px-6 py-3 border-t flex items-center justify-center gap-2 sm:gap-3 shrink-0 ${
          isLight ? 'bg-[#FAF6EC]/90 border-amber-900/20' : 'bg-[#1A0F02]/85 border-amber-400/30'
        }`}
      >
        <button
          type="button"
          onClick={toggleMic}
          className={`h-11 min-w-[44px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-[14px] font-bold cursor-pointer transition-colors ${
            isMicOn
              ? isLight
                ? 'bg-transparent border-amber-900/30 text-amber-950'
                : 'bg-transparent border-amber-400/40 text-white'
              : 'bg-rose-600 border-rose-400 text-white'
          }`}
          title={isMicOn ? 'Выключить микрофон' : 'Включить микрофон'}
        >
          {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
          <span className="hidden md:inline">{isMicOn ? 'Микрофон' : 'Без звука'}</span>
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          className={`h-11 min-w-[44px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-[14px] font-bold cursor-pointer transition-colors ${
            isCameraOn
              ? isLight
                ? 'bg-transparent border-amber-900/30 text-amber-950'
                : 'bg-transparent border-amber-400/40 text-white'
              : 'bg-rose-600 border-rose-400 text-white'
          }`}
          title={isCameraOn ? 'Выключить камеру' : 'Включить камеру'}
        >
          {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          <span className="hidden md:inline">{isCameraOn ? 'Камера' : 'Камера выкл'}</span>
        </button>

        {isMobile ? (
          <button
            type="button"
            onClick={flipCamera}
            className={`h-11 min-w-[44px] px-3 rounded-2xl border flex items-center justify-center cursor-pointer ${
              isLight ? 'border-amber-900/30 text-amber-950' : 'border-amber-400/40 text-[#F4EE8E]'
            }`}
            title="Переключить камеру"
          >
            <RefreshCw size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`h-11 min-w-[44px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-[14px] font-bold cursor-pointer ${
              isScreenSharing
                ? 'bg-[#E7C768] text-amber-950 border-[#F4EE8E]'
                : isLight
                  ? 'border-amber-900/30 text-amber-950'
                  : 'border-amber-400/40 text-white'
            }`}
            title="Демонстрация экрана"
          >
            {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
            <span className="hidden lg:inline">{isScreenSharing ? 'Остановить экран' : 'Экран'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setSideTab((s) => (s === 'transcript' ? 'none' : 'transcript'))}
          className={`h-11 min-w-[44px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-[14px] font-bold cursor-pointer relative ${
            sideTab === 'transcript'
              ? 'bg-[#E7C768] text-amber-950 border-[#F4EE8E]'
              : isLight
                ? 'border-amber-900/30 text-amber-950'
                : 'border-amber-400/40 text-[#F4EE8E]'
          }`}
          title="Текстовая стенограмма диалога"
        >
          <FileText size={18} />
          <span className="hidden md:inline">Текст диалога</span>
        </button>

        {chatId && (
          <button
            type="button"
            onClick={() => setSideTab((s) => (s === 'chat' ? 'none' : 'chat'))}
            className={`h-11 min-w-[44px] px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-[14px] font-bold cursor-pointer relative ${
              sideTab === 'chat'
                ? 'bg-[#E7C768] text-amber-950 border-[#F4EE8E]'
                : isLight
                  ? 'border-amber-900/30 text-amber-950'
                  : 'border-amber-400/40 text-white'
            }`}
            title="Чат встречи"
          >
            <MessageSquare size={18} />
            {unreadChat > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 rounded-full bg-rose-600 text-white text-[14px] font-black tabular-nums">
                {unreadChat}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleOpenSettings}
          className={`h-11 min-w-[44px] px-3 rounded-2xl border flex items-center justify-center cursor-pointer ${
            isLight ? 'border-amber-900/30 text-amber-950' : 'border-amber-400/40 text-white'
          }`}
          title="Настройки камеры и микрофона"
        >
          <Settings size={18} />
        </button>

        <button
          type="button"
          disabled={leaving}
          onClick={handleLeaveCall}
          className="h-11 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-60"
          title="Завершить звонок"
        >
          <PhoneOff size={18} />
          <span className="hidden sm:inline">{leaving ? 'Выход...' : 'Выйти'}</span>
        </button>
      </footer>

      {/* Device Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[9995] bg-transparent backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl backdrop-blur-xl ${
              isLight ? 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950' : 'bg-[#1A0F02]/85 border-amber-400/45 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">Настройки устройств</h3>
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-[14px]">
              <div>
                <label className="block font-bold mb-1">Микрофон</label>
                <select
                  value={selectedMicId}
                  onChange={(e) => setSelectedMicId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-[14px] ${
                    isLight ? 'bg-white border-amber-900/25 text-amber-950' : 'bg-[#140A01] border-amber-400/35 text-white'
                  }`}
                >
                  <option value="">По умолчанию</option>
                  {mics.map((m, i) => (
                    <option key={m.deviceId || i} value={m.deviceId}>
                      {m.label || `Микрофон ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Камера</label>
                <select
                  value={selectedCamId}
                  onChange={(e) => setSelectedCamId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-[14px] ${
                    isLight ? 'bg-white border-amber-900/25 text-amber-950' : 'bg-[#140A01] border-amber-400/35 text-white'
                  }`}
                >
                  <option value="">По умолчанию</option>
                  {cams.map((c, i) => (
                    <option key={c.deviceId || i} value={c.deviceId}>
                      {c.label || `Камера ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mirrorLocal}
                  onChange={(e) => setMirrorLocal(e.target.checked)}
                  className="accent-[#E7C768] w-4 h-4"
                />
                <span>Зеркалить своё видео</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await applyDevices(selectedMicId || undefined, selectedCamId || undefined);
                  setIsSettingsOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-extrabold text-[14px] cursor-pointer"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Colleagues & Shareable Link Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-[9995] bg-transparent backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl backdrop-blur-xl ${
              isLight ? 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950' : 'bg-[#1A0F02]/85 border-amber-400/45 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">Пригласить на встречу</h3>
              <button type="button" onClick={() => setIsInviteOpen(false)} className="p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-2xl border border-amber-400/35 space-y-2 text-[14px]">
              <div className="font-bold flex items-center gap-1.5">
                <Link2 size={16} className="text-[#E7C768]" />
                <span>Ссылка для входа в комнату</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={roomJoinUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className={`flex-1 min-w-0 p-2 rounded-xl border text-[14px] focus:outline-none ${
                    isLight ? 'bg-white border-amber-900/25 text-amber-950' : 'bg-transparent border-amber-400/35 text-white'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleCopyRoomLink}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-bold text-[14px] cursor-pointer shrink-0 flex items-center gap-1"
                >
                  {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedLink ? 'Готово' : 'Копировать'}</span>
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 text-[14px]">
              {colleagues
                .filter((c) => c.id !== currentUserId)
                .map((col) => {
                  const alreadySent = invitedIds.has(col.id);
                  return (
                    <div
                      key={col.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                        isLight ? 'bg-transparent border-amber-900/20' : 'bg-transparent border-amber-400/25'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">{col.name}</div>
                        <div className="opacity-75 truncate">{col.position || 'Сотрудник'}</div>
                      </div>
                      <button
                        type="button"
                        disabled={alreadySent}
                        onClick={() => handleInviteColleague(col.id)}
                        className={`px-3 py-1.5 rounded-xl text-[14px] font-bold cursor-pointer ${
                          alreadySent
                            ? isLight
                              ? 'border border-amber-900/30 text-amber-950'
                              : 'border border-[#E7C768]/50 text-[#F4EE8E]'
                            : 'bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950'
                        }`}
                      >
                        {alreadySent ? 'Отправлено' : 'Позвать'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

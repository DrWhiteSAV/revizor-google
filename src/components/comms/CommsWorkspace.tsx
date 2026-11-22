import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCommsSocket } from '../../hooks/useCommsSocket';
import {
  loadLocalCommsLayoutPrefs,
  fetchRemoteCommsLayoutPrefs,
  persistCommsLayoutPrefs,
  DEFAULT_COMMS_LAYOUT_PREFS
} from '../../hooks/commsRtcHelpers';
import { CommsSidebar } from './sidebar/CommsSidebar';
import { CommsChatPane } from './chat/CommsChatPane';
import { CommsModals } from './modals/CommsModals';
import type {
  CommsChat,
  CommsColleague,
  CommsMessage,
  CommsUserLayoutPrefs,
  CommsVideoRoom
} from '../../types/comms';

interface CommsWorkspaceProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
  currentUserAvatar?: string;
  companyId?: string;
  theme?: 'dark' | 'light';
  initialChatId?: string | null;
  onStartOrJoinCall: (room: { roomId: string; title: string; chatId?: string | null }) => void;
}

const getCacheJson = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const setCacheJson = (key: string, val: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

export const CommsWorkspace: React.FC<CommsWorkspaceProps> = ({
  currentUserId,
  currentUserName,
  currentUserRole = 'EMPLOYEE',
  currentUserAvatar,
  companyId,
  theme = 'dark',
  initialChatId,
  onStartOrJoinCall
}) => {
  const isLight = theme === 'light';
  const { onlineUserIds, send, subscribe } = useCommsSocket({
    userId: currentUserId,
    companyId,
    displayName: currentUserName,
    avatarUrl: currentUserAvatar
  });

  const overviewCacheKey = `comms_overview_${currentUserId}`;

  const [layoutPrefs, setLayoutPrefs] = useState<CommsUserLayoutPrefs>(() =>
    loadLocalCommsLayoutPrefs(currentUserId)
  );
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

  const sidebarWidthPx =
    layoutPrefs.desktop?.sidebarWidthPx ?? DEFAULT_COMMS_LAYOUT_PREFS.desktop.sidebarWidthPx ?? 340;

  const startSidebarResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidthPx;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const onMove = (ev: PointerEvent) => {
      const nextW = Math.round(Math.min(540, Math.max(250, startW + (ev.clientX - startX))));
      setLayoutPrefs((prev) => {
        const updated: CommsUserLayoutPrefs = {
          ...prev,
          desktop: { ...(prev.desktop || {}), sidebarWidthPx: nextW }
        };
        persistCommsLayoutPrefs(currentUserId, updated);
        return updated;
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const resetSidebarWidth = () => {
    setLayoutPrefs((prev) => {
      const updated: CommsUserLayoutPrefs = {
        ...prev,
        desktop: {
          ...(prev.desktop || {}),
          sidebarWidthPx: DEFAULT_COMMS_LAYOUT_PREFS.desktop.sidebarWidthPx
        }
      };
      persistCommsLayoutPrefs(currentUserId, updated);
      return updated;
    });
  };

  const [loading, setLoading] = useState(() => !getCacheJson(overviewCacheKey));
  const [colleagues, setColleagues] = useState<CommsColleague[]>(() => {
    const c = getCacheJson<{ colleagues?: CommsColleague[] }>(overviewCacheKey);
    return Array.isArray(c?.colleagues) ? c!.colleagues : [];
  });
  const [chats, setChats] = useState<CommsChat[]>(() => {
    const c = getCacheJson<{ chats?: CommsChat[] }>(overviewCacheKey);
    return Array.isArray(c?.chats) ? c!.chats : [];
  });
  const [activeVideoRooms, setActiveVideoRooms] = useState<CommsVideoRoom[]>(() => {
    const c = getCacheJson<{ activeVideoRooms?: CommsVideoRoom[] }>(overviewCacheKey);
    return Array.isArray(c?.activeVideoRooms) ? c!.activeVideoRooms : [];
  });
  const [selectedChatId, setSelectedChatId] = useState<string | null>(() => {
    if (initialChatId) return initialChatId;
    const c = getCacheJson<{ chats?: CommsChat[] }>(overviewCacheKey);
    return c?.chats?.[0]?.id || null;
  });

  const [listMode, setListMode] = useState<'chats' | 'colleagues'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoomsCollapsed, setActiveRoomsCollapsed] = useState(false);

  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  // Voice recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceTimerRef = useRef<number | null>(null);

  // Modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomTitleDraft, setRoomTitleDraft] = useState('');
  const [roomInviteIds, setRoomInviteIds] = useState<string[]>([]);
  const [roomPostToChat, setRoomPostToChat] = useState(false);
  const [createdRoomInfo, setCreatedRoomInfo] = useState<{
    roomId: string;
    title: string;
    joinUrl: string;
    chatId?: string | null;
  } | null>(null);
  const [roomCreating, setRoomCreating] = useState(false);
  const [roomCopied, setRoomCopied] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editChatTitle, setEditChatTitle] = useState('');
  const [editChatModeration, setEditChatModeration] = useState(true);
  const [editChatMembers, setEditChatMembers] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const canManageGroups = ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(
    String(currentUserRole || '').toUpperCase()
  );

  const loadOverview = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/comms/overview?userId=${encodeURIComponent(currentUserId)}`);
      const data = await res.json();
      if (data?.success) {
        const nextColleagues = Array.isArray(data.colleagues) ? data.colleagues : [];
        const nextChats = Array.isArray(data.chats) ? data.chats : [];
        const nextRooms = Array.isArray(data.activeVideoRooms) ? data.activeVideoRooms : [];
        setColleagues(nextColleagues);
        setChats(nextChats);
        setActiveVideoRooms(nextRooms);
        setCacheJson(overviewCacheKey, {
          colleagues: nextColleagues,
          chats: nextChats,
          activeVideoRooms: nextRooms
        });
        setSelectedChatId((cur) => {
          if (initialChatId) return initialChatId;
          if (cur && nextChats.some((c: CommsChat) => c.id === cur)) return cur;
          return nextChats[0]?.id || null;
        });
      }
    } catch {}
    setLoading(false);
  }, [currentUserId, initialChatId, overviewCacheKey]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) || null,
    [chats, selectedChatId]
  );

  // Stale-while-revalidate message loader
  useEffect(() => {
    if (!selectedChatId || !currentUserId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const msgCacheKey = `comms_msgs_${selectedChatId}`;
    const cachedMsgs = getCacheJson<CommsMessage[]>(msgCacheKey);
    if (Array.isArray(cachedMsgs)) {
      setMessages(cachedMsgs);
      setLoadingMessages(false);
    } else {
      setLoadingMessages(true);
    }
    setErrorBanner(null);
    setTypingName(null);

    send('chat:join', { chatId: selectedChatId });

    void (async () => {
      try {
        const res = await fetch(
          `/api/comms/chats/${encodeURIComponent(selectedChatId)}/messages?userId=${encodeURIComponent(currentUserId)}`
        );
        const data = await res.json();
        if (!cancelled && data?.success) {
          const fresh = Array.isArray(data.messages) ? data.messages : [];
          setMessages(fresh);
          setCacheJson(msgCacheKey, fresh.slice(-80));
          setChats((prev) =>
            prev.map((c) => (c.id === selectedChatId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch {}
      if (!cancelled) setLoadingMessages(false);
    })();

    return () => {
      cancelled = true;
      send('chat:leave', { chatId: selectedChatId });
    };
  }, [selectedChatId, currentUserId, send]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedChatId]);

  const triggerMessageTranscribe = useCallback(async (chatId: string, messageId: string) => {
    setTranscribingIds((prev) => new Set(prev).add(messageId));
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, sttStatus: 'processing' } : m))
    );
    try {
      const res = await fetch(
        `/api/comms/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/transcribe`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json();
      if (data?.success && (data.message || data.sttStatus !== undefined || 'transcriptText' in data)) {
        const nextTranscript =
          data?.message?.transcriptText !== undefined ? data.message.transcriptText : data?.transcriptText ?? null;
        const nextStatus =
          data?.message?.sttStatus ?? data?.sttStatus ?? (nextTranscript ? 'done' : 'empty');

        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  ...(data.message || {}),
                  transcriptText: nextTranscript,
                  sttStatus: nextStatus
                }
              : m
          );
          setCacheJson(`comms_msgs_${chatId}`, next.slice(-80));
          return next;
        });

        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId && c.lastMessage?.id === messageId
              ? {
                  ...c,
                  lastMessage: {
                    ...c.lastMessage,
                    transcript_text: nextTranscript || undefined,
                    stt_status: nextStatus
                  }
                }
              : c
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, sttStatus: 'failed' } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, sttStatus: 'failed' } : m))
      );
    } finally {
      setTranscribingIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }
  }, []);

  // Real-time WebSocket listeners
  useEffect(() => {
    const unsubMsg = subscribe('chat:message', (payload) => {
      const chatId = payload?.chatId;
      const msg: CommsMessage | undefined = payload?.message;
      if (!chatId || !msg) return;

      if (chatId === selectedChatId) {
        setMessages((prev) => {
          const next = prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
          setCacheJson(`comms_msgs_${chatId}`, next.slice(-80));
          return next;
        });
        void fetch(`/api/comms/chats/${encodeURIComponent(chatId)}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId })
        }).catch(() => {});
      }

      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === chatId);
        if (idx === -1) {
          void loadOverview();
          return prev;
        }
        const updated = [...prev];
        const target = updated[idx];
        updated[idx] = {
          ...target,
          lastMessage: {
            id: msg.id,
            sender_id: msg.senderId,
            sender_name: msg.senderName,
            message: msg.message,
            message_kind: msg.messageKind,
            media_type: msg.mediaType || undefined,
            file_name: msg.fileName || undefined,
            transcript_text: msg.transcriptText || undefined,
            stt_status: msg.sttStatus || undefined,
            created_at: msg.createdAt
          },
          lastMessageAt: msg.createdAt,
          unreadCount:
            chatId === selectedChatId || msg.senderId === currentUserId
              ? target.unreadCount
              : (target.unreadCount || 0) + 1
        };
        updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
        return updated;
      });
    });

    const unsubMsgUpdated = subscribe('chat:message_updated', (payload) => {
      const chatId = payload?.chatId;
      const msgObj: CommsMessage | undefined = payload?.message;
      const targetId = msgObj?.id || payload?.messageId;
      if (!chatId || !targetId) return;

      const nextTranscript =
        msgObj?.transcriptText !== undefined ? msgObj.transcriptText : payload?.transcriptText;
      const nextStatus = msgObj?.sttStatus !== undefined ? msgObj.sttStatus : payload?.sttStatus;

      if (chatId === selectedChatId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === targetId);
          const next = exists
            ? prev.map((m) =>
                m.id === targetId
                  ? {
                      ...m,
                      ...(msgObj || {}),
                      ...(nextTranscript !== undefined ? { transcriptText: nextTranscript } : {}),
                      ...(nextStatus !== undefined ? { sttStatus: nextStatus } : {})
                    }
                  : m
              )
            : msgObj
              ? [...prev, msgObj]
              : prev;
          setCacheJson(`comms_msgs_${chatId}`, next.slice(-80));
          return next;
        });
      }

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId && c.lastMessage?.id === targetId
            ? {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  ...(nextTranscript !== undefined ? { transcript_text: nextTranscript || undefined } : {}),
                  ...(nextStatus !== undefined ? { stt_status: nextStatus } : {})
                }
              }
            : c
        )
      );
    });

    const unsubDel = subscribe('chat:message_deleted', (payload) => {
      if (payload?.chatId === selectedChatId && payload?.messageId) {
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      }
    });

    const unsubTyping = subscribe('chat:typing', (payload) => {
      if (payload?.chatId !== selectedChatId || payload?.userId === currentUserId) return;
      if (payload?.isTyping) {
        setTypingName(payload.displayName || 'Собеседник');
        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => setTypingName(null), 3200);
      } else {
        setTypingName(null);
      }
    });

    const unsubChatRefresh = subscribe('chat:created', () => void loadOverview());
    const unsubChatUpdated = subscribe('chat:updated', () => void loadOverview());
    const unsubRoomUpdated = subscribe('video:room_updated', () => void loadOverview());
    const unsubRoomEnded = subscribe('rtc:room_ended', (payload) => {
      if (payload?.roomId) {
        setActiveVideoRooms((prev) => prev.filter((r) => r.id !== payload.roomId));
      }
    });

    return () => {
      unsubMsg();
      unsubMsgUpdated();
      unsubDel();
      unsubTyping();
      unsubChatRefresh();
      unsubChatUpdated();
      unsubRoomUpdated();
      unsubRoomEnded();
    };
  }, [subscribe, selectedChatId, currentUserId, loadOverview]);

  const handleOpenDirectWith = async (peerId: string) => {
    try {
      const res = await fetch('/api/comms/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, peerId })
      });
      const data = await res.json();
      if (data?.success && data.chatId) {
        await loadOverview();
        setSelectedChatId(data.chatId);
        setListMode('chats');
      }
    } catch {}
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) return;
    try {
      const res = await fetch('/api/comms/chats/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          title: groupTitle.trim(),
          description: groupDesc.trim(),
          memberIds: groupMemberIds,
          aiModerationEnabled: true
        })
      });
      const data = await res.json();
      if (data?.success && data.chatId) {
        setIsGroupModalOpen(false);
        setGroupTitle('');
        setGroupDesc('');
        setGroupMemberIds([]);
        await loadOverview();
        setSelectedChatId(data.chatId);
      }
    } catch {}
  };

  const handleCreateLinkRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCreating) return;
    setRoomCreating(true);
    try {
      const targetChatId = roomPostToChat && selectedChat ? selectedChat.id : undefined;
      const res = await fetch('/api/comms/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: currentUserId,
          chatId: targetChatId,
          roomType: 'group',
          title: roomTitleDraft.trim() || `Видеовстреча · ${currentUserName}`,
          inviteUserIds: roomInviteIds,
          createLinkOnly: true
        })
      });
      const data = await res.json();
      if (data?.success && data.room?.id) {
        const joinPath = data.room.joinPath || `/cabinet/comms?room=${encodeURIComponent(data.room.id)}`;
        const fullUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}${joinPath}`
            : data.room.joinUrl || joinPath;
        setCreatedRoomInfo({
          roomId: data.room.id,
          title: data.room.title,
          joinUrl: fullUrl,
          chatId: data.room.chatId || targetChatId || null
        });
        void loadOverview();
      }
    } catch {
      setErrorBanner('Не удалось создать видеокомнату со ссылкой');
    }
    setRoomCreating(false);
  };

  const handleCopyRoomLink = async (url: string, roomId?: string) => {
    try {
      await navigator.clipboard.writeText(url);
      if (roomId) {
        setCopiedRoomId(roomId);
        setTimeout(() => setCopiedRoomId(null), 2000);
      } else {
        setRoomCopied(true);
        setTimeout(() => setRoomCopied(false), 2000);
      }
    } catch {}
  };

  const handleCloseActiveRoom = async (roomId: string) => {
    setActiveVideoRooms((prev) => prev.filter((r) => r.id !== roomId));
    try {
      await fetch(`/api/comms/video/rooms/${encodeURIComponent(roomId)}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, endForAll: true })
      });
      void loadOverview();
    } catch {}
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !draft.trim() || sending) return;
    setSending(true);
    setErrorBanner(null);
    const text = draft.trim();
    try {
      const res = await fetch(`/api/comms/chats/${encodeURIComponent(selectedChatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          message: text,
          messageKind: 'text'
        })
      });
      const data = await res.json();
      if (!res.ok || data?.blocked) {
        setErrorBanner(data?.error || 'Сообщение не отправлено: сработала проверка безопасности.');
      } else {
        setDraft('');
        send('chat:typing', { chatId: selectedChatId, isTyping: false });
        if (data?.message) {
          setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
        }
      }
    } catch {
      setErrorBanner('Ошибка сети при отправке сообщения');
    }
    setSending(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedChatId) return;
    setSending(true);
    setErrorBanner(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const upRes = await fetch('/api/comms/upload', { method: 'POST', body: fd });
      const upData = await upRes.json();
      if (!upRes.ok || !upData?.url) {
        setErrorBanner('Не удалось загрузить файл');
        setSending(false);
        return;
      }

      const detectedType =
        upData.mediaType === 'audio' || /^voice_/i.test(file.name) || file.type.startsWith('audio/')
          ? 'audio'
          : upData.mediaType;

      const sendRes = await fetch(`/api/comms/chats/${encodeURIComponent(selectedChatId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          message: draft.trim(),
          messageKind: 'text',
          mediaUrl: upData.url,
          mediaType: detectedType,
          fileName: upData.fileName,
          fileSize: upData.fileSize
        })
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok || sendData?.blocked) {
        setErrorBanner(sendData?.error || 'Вложение отклонено системой безопасности.');
      } else {
        setDraft('');
        if (sendData?.message) {
          const savedMsg: CommsMessage = sendData.message;
          const willTranscribe = detectedType === 'audio';
          const initialMsg = willTranscribe ? { ...savedMsg, sttStatus: 'processing' as const } : savedMsg;
          setMessages((prev) => (prev.some((m) => m.id === initialMsg.id) ? prev : [...prev, initialMsg]));
          if (willTranscribe) {
            void triggerMessageTranscribe(selectedChatId, savedMsg.id);
          }
        }
      }
    } catch {
      setErrorBanner('Ошибка загрузки вложения');
    }
    setSending(false);
  };

  const startVoiceRecording = async () => {
    if (!selectedChatId || isRecordingVoice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) =>
          MediaRecorder.isTypeSupported(m)
        ) || '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (voiceTimerRef.current) window.clearInterval(voiceTimerRef.current);
        setIsRecordingVoice(false);
        setRecordingSec(0);
        const type = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunks, { type });
        if (blob.size < 1000) return;
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: type.startsWith('audio/') ? type : 'audio/webm' });
        await handleFileUpload(file);
      };
      voiceRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSec(0);
      voiceTimerRef.current = window.setInterval(() => setRecordingSec((s) => s + 1), 1000);
    } catch {
      setErrorBanner('Разрешите доступ к микрофону для записи голосового сообщения');
    }
  };

  const stopVoiceRecording = () => {
    try {
      if (voiceRecorderRef.current && voiceRecorderRef.current.state === 'recording') {
        voiceRecorderRef.current.stop();
      }
    } catch {}
  };

  const handleStartVideoCallFromChat = async () => {
    if (!selectedChat || startingCall) return;
    setStartingCall(true);
    try {
      const res = await fetch('/api/comms/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: currentUserId,
          chatId: selectedChat.id,
          roomType: selectedChat.chatType === 'direct' ? 'direct' : 'group',
          title: selectedChat.title
        })
      });
      const data = await res.json();
      if (data?.success && data.room?.id) {
        onStartOrJoinCall({
          roomId: data.room.id,
          title: data.room.title,
          chatId: selectedChat.id
        });
      }
    } catch {}
    setStartingCall(false);
  };

  const handleCallColleagueDirect = async (col: CommsColleague) => {
    if (startingCall) return;
    setStartingCall(true);
    try {
      const chatRes = await fetch('/api/comms/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, peerId: col.id })
      });
      const chatData = await chatRes.json();
      const chatId = chatData?.chatId;
      const roomRes = await fetch('/api/comms/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: currentUserId,
          chatId,
          roomType: 'direct',
          title: `Созвон: ${col.name}`,
          inviteUserIds: [col.id]
        })
      });
      const roomData = await roomRes.json();
      if (roomData?.success && roomData.room?.id) {
        onStartOrJoinCall({
          roomId: roomData.room.id,
          title: roomData.room.title,
          chatId
        });
      }
    } catch {}
    setStartingCall(false);
  };

  const handleSaveChatSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;
    try {
      await fetch(`/api/comms/chats/${encodeURIComponent(selectedChat.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          title: editChatTitle.trim() || selectedChat.title,
          aiModerationEnabled: editChatModeration,
          memberIds: selectedChat.chatType === 'group' ? editChatMembers : undefined
        })
      });
      setIsSettingsModalOpen(false);
      await loadOverview();
    } catch {}
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deleteConfirmId) return;
    try {
      await fetch(
        `/api/comms/messages/${encodeURIComponent(deleteConfirmId)}?userId=${encodeURIComponent(currentUserId)}`,
        { method: 'DELETE' }
      );
      setMessages((prev) => prev.filter((m) => m.id !== deleteConfirmId));
    } catch {}
    setDeleteConfirmId(null);
  };

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.lastMessage?.message || '').toLowerCase().includes(q)
    );
  }, [chats, searchQuery]);

  const filteredColleagues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const others = colleagues.filter((c) => c.id !== currentUserId);
    if (!q) return others;
    return others.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.position || '').toLowerCase().includes(q)
    );
  }, [colleagues, currentUserId, searchQuery]);

  const isPeerOnline = (uid?: string) =>
    Boolean(uid && (onlineUserIds.has(uid) || colleagues.find((c) => c.id === uid)?.online));

  return (
    <div
      className={`scroll-mt-16 rounded-3xl border overflow-hidden shadow-xl flex flex-col h-[calc(100dvh-215px)] lg:h-[calc(100dvh-200px)] min-h-[420px] ${
        isLight
          ? 'bg-transparent border-amber-900/30 text-amber-950'
          : 'bg-transparent border-amber-400/45 text-white shadow-[0_0_30px_rgba(244,238,142,0.12)]'
      }`}
    >
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <CommsSidebar
          isLight={isLight}
          currentUserId={currentUserId}
          selectedChatId={selectedChatId}
          setSelectedChatId={setSelectedChatId}
          listMode={listMode}
          setListMode={setListMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          chats={chats}
          filteredChats={filteredChats}
          colleagues={colleagues}
          filteredColleagues={filteredColleagues}
          activeVideoRooms={activeVideoRooms}
          activeRoomsCollapsed={activeRoomsCollapsed}
          setActiveRoomsCollapsed={setActiveRoomsCollapsed}
          copiedRoomId={copiedRoomId}
          canManageGroups={canManageGroups}
          loading={loading}
          startingCall={startingCall}
          isPeerOnline={isPeerOnline}
          onOpenRoomModal={() => {
            setCreatedRoomInfo(null);
            setRoomTitleDraft('');
            setRoomInviteIds([]);
            setIsRoomModalOpen(true);
          }}
          onOpenGroupModal={() => setIsGroupModalOpen(true)}
          onCopyRoomLink={(url, id) => void handleCopyRoomLink(url, id)}
          onCloseActiveRoom={(id) => void handleCloseActiveRoom(id)}
          onStartOrJoinCall={onStartOrJoinCall}
          onOpenDirectWith={(id) => void handleOpenDirectWith(id)}
          onCallColleagueDirect={(col) => void handleCallColleagueDirect(col)}
          desktopWidthPx={sidebarWidthPx}
        />

        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={startSidebarResize}
          onDoubleClick={resetSidebarWidth}
          title="Потяните, чтобы изменить ширину списка чатов (двойной клик — сброс)"
          className="hidden md:flex w-2 -ml-1 cursor-col-resize touch-none z-20 items-center justify-center group shrink-0"
        >
          <div className="w-1 h-12 rounded-full bg-[#E7C768]/30 group-hover:bg-[#F4EE8E] transition-colors" />
        </div>

        <CommsChatPane
          isLight={isLight}
          currentUserId={currentUserId}
          selectedChatId={selectedChatId}
          selectedChat={selectedChat}
          messages={messages}
          loadingMessages={loadingMessages}
          typingName={typingName}
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          startingCall={startingCall}
          canManageGroups={canManageGroups}
          errorBanner={errorBanner}
          setErrorBanner={setErrorBanner}
          isRecordingVoice={isRecordingVoice}
          recordingSec={recordingSec}
          transcribingIds={transcribingIds}
          onlinePeer={Boolean(selectedChat?.peer?.userId && isPeerOnline(selectedChat.peer.userId))}
          messagesContainerRef={messagesContainerRef}
          fileInputRef={fileInputRef}
          onBackToChats={() => setSelectedChatId(null)}
          onStartVideoCall={() => void handleStartVideoCallFromChat()}
          onOpenSettings={() => {
            if (!selectedChat) return;
            setEditChatTitle(selectedChat.title);
            setEditChatModeration(selectedChat.aiModerationEnabled);
            setEditChatMembers(selectedChat.members.map((m) => m.userId));
            setIsSettingsModalOpen(true);
          }}
          onStartOrJoinCall={onStartOrJoinCall}
          onDeleteConfirm={(id) => setDeleteConfirmId(id)}
          onOpenLightbox={(url) => setLightboxUrl(url)}
          onTranscribeMessage={(chatId, msgId) => void triggerMessageTranscribe(chatId, msgId)}
          onSendText={handleSendText}
          onFileUpload={(f) => void handleFileUpload(f)}
          onStartVoiceRecording={() => void startVoiceRecording()}
          onStopVoiceRecording={stopVoiceRecording}
          onDraftChange={(val) => {
            setDraft(val);
            if (selectedChatId) {
              send('chat:typing', { chatId: selectedChatId, isTyping: val.length > 0 });
            }
          }}
        />
      </div>

      <CommsModals
        isLight={isLight}
        currentUserId={currentUserId}
        colleagues={colleagues}
        selectedChat={selectedChat}
        isGroupModalOpen={isGroupModalOpen}
        setIsGroupModalOpen={setIsGroupModalOpen}
        groupTitle={groupTitle}
        setGroupTitle={setGroupTitle}
        groupDesc={groupDesc}
        setGroupDesc={setGroupDesc}
        groupMemberIds={groupMemberIds}
        setGroupMemberIds={setGroupMemberIds}
        onCreateGroup={handleCreateGroup}
        isRoomModalOpen={isRoomModalOpen}
        onCloseRoomModal={() => {
          setIsRoomModalOpen(false);
          setCreatedRoomInfo(null);
        }}
        roomTitleDraft={roomTitleDraft}
        setRoomTitleDraft={setRoomTitleDraft}
        roomInviteIds={roomInviteIds}
        setRoomInviteIds={setRoomInviteIds}
        roomPostToChat={roomPostToChat}
        setRoomPostToChat={setRoomPostToChat}
        createdRoomInfo={createdRoomInfo}
        roomCreating={roomCreating}
        roomCopied={roomCopied}
        onCreateLinkRoom={handleCreateLinkRoom}
        onCopyLink={(url) => void handleCopyRoomLink(url)}
        onEnterCreatedRoom={() => {
          if (!createdRoomInfo) return;
          setIsRoomModalOpen(false);
          onStartOrJoinCall({
            roomId: createdRoomInfo.roomId,
            title: createdRoomInfo.title,
            chatId: createdRoomInfo.chatId || null
          });
        }}
        isSettingsModalOpen={isSettingsModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        editChatTitle={editChatTitle}
        setEditChatTitle={setEditChatTitle}
        editChatModeration={editChatModeration}
        setEditChatModeration={setEditChatModeration}
        editChatMembers={editChatMembers}
        setEditChatMembers={setEditChatMembers}
        onSaveChatSettings={handleSaveChatSettings}
        deleteConfirmId={deleteConfirmId}
        setDeleteConfirmId={setDeleteConfirmId}
        onConfirmDeleteMessage={handleConfirmDeleteMessage}
        lightboxUrl={lightboxUrl}
        setLightboxUrl={setLightboxUrl}
      />
    </div>
  );
};

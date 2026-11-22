import type { CommsUserLayoutPrefs } from '../types/comms';

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

export interface RtcRemotePeer {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  stream: MediaStream | null;
  fallbackFrameUrl?: string | null;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  connectionState: 'connecting' | 'connected' | 'relay' | 'reconnecting';
}

export interface UseVideoRoomRtcOptions {
  roomId: string | null;
  chatId?: string | null;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  transcriptionEnabled: boolean;
  selectedMicId?: string;
  selectedCamId?: string;
  onTranscriptChunk?: (entry: any) => void;
  onTranscriptChatMessage?: (msg: any) => void;
  onRoomEnded?: () => void;
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToInt16Array(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

export const DEFAULT_COMMS_LAYOUT_PREFS: CommsUserLayoutPrefs = {
  desktop: {
    sidebarWidthPx: 340,
    callDrawerWidthPx: 380,
    tiles: {}
  },
  mobile: {
    callDrawerHeightPct: 48,
    tiles: {}
  }
};

function sanitizeLayoutPrefs(raw: any): CommsUserLayoutPrefs {
  const d = raw?.desktop && typeof raw.desktop === 'object' ? raw.desktop : {};
  const m = raw?.mobile && typeof raw.mobile === 'object' ? raw.mobile : {};
  return {
    desktop: {
      sidebarWidthPx:
        typeof d.sidebarWidthPx === 'number' && Number.isFinite(d.sidebarWidthPx)
          ? Math.min(540, Math.max(250, d.sidebarWidthPx))
          : DEFAULT_COMMS_LAYOUT_PREFS.desktop.sidebarWidthPx,
      callDrawerWidthPx:
        typeof d.callDrawerWidthPx === 'number' && Number.isFinite(d.callDrawerWidthPx)
          ? Math.min(760, Math.max(260, d.callDrawerWidthPx))
          : DEFAULT_COMMS_LAYOUT_PREFS.desktop.callDrawerWidthPx,
      tiles: d.tiles && typeof d.tiles === 'object' ? d.tiles : {}
    },
    mobile: {
      callDrawerHeightPct:
        typeof m.callDrawerHeightPct === 'number' && Number.isFinite(m.callDrawerHeightPct)
          ? Math.min(82, Math.max(26, m.callDrawerHeightPct))
          : DEFAULT_COMMS_LAYOUT_PREFS.mobile.callDrawerHeightPct,
      tiles: m.tiles && typeof m.tiles === 'object' ? m.tiles : {}
    }
  };
}

export function loadLocalCommsLayoutPrefs(userId: string): CommsUserLayoutPrefs {
  if (typeof window === 'undefined' || !userId) return sanitizeLayoutPrefs({});
  try {
    const raw = window.localStorage.getItem(`comms_layout_prefs_${userId}`);
    if (!raw) return sanitizeLayoutPrefs({});
    return sanitizeLayoutPrefs(JSON.parse(raw));
  } catch {
    return sanitizeLayoutPrefs({});
  }
}

export async function fetchRemoteCommsLayoutPrefs(userId: string): Promise<CommsUserLayoutPrefs | null> {
  if (!userId) return null;
  try {
    const res = await fetch(`/api/comms/preferences/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success && data.layout) {
      const sanitized = sanitizeLayoutPrefs(data.layout);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`comms_layout_prefs_${userId}`, JSON.stringify(sanitized));
      }
      return sanitized;
    }
  } catch {}
  return null;
}

const syncTimers = new Map<string, number>();

export function persistCommsLayoutPrefs(userId: string, prefs: CommsUserLayoutPrefs): void {
  if (!userId) return;
  const clean = sanitizeLayoutPrefs(prefs);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`comms_layout_prefs_${userId}`, JSON.stringify(clean));
    } catch {}
    const existing = syncTimers.get(userId);
    if (existing) window.clearTimeout(existing);
    const t = window.setTimeout(() => {
      syncTimers.delete(userId);
      fetch(`/api/comms/preferences/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: clean })
      }).catch(() => {});
    }, 350);
    syncTimers.set(userId, t);
  }
}


import { useEffect, useState, useCallback } from 'react';

type Listener = (payload: any) => void;

class SharedCommsSocket {
  private ws: WebSocket | null = null;
  private userId = '';
  private companyId = '';
  private displayName = '';
  private avatarUrl = '';
  private listeners = new Map<string, Set<Listener>>();
  private statusListeners = new Set<(connected: boolean) => void>();
  private onlineListeners = new Set<(ids: Set<string>) => void>();
  private onlineIds = new Set<string>();
  private connected = false;
  private isAuthed = false;
  private joinedChats = new Set<string>();
  private activeRoomId: string | null = null;
  private pendingQueue: Array<{ event: string; payload: any }> = [];
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private intentionalClose = false;

  public connect(auth: { userId: string; companyId?: string; displayName?: string; avatarUrl?: string }) {
    const uid = String(auth.userId || '').trim();
    if (!uid) return;

    const changed =
      this.userId !== uid ||
      this.companyId !== String(auth.companyId || '').trim();

    this.userId = uid;
    this.companyId = String(auth.companyId || '').trim();
    this.displayName = String(auth.displayName || 'Сотрудник');
    this.avatarUrl = String(auth.avatarUrl || '');
    this.intentionalClose = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (changed && this.ws.readyState === WebSocket.OPEN) {
        this.isAuthed = false;
        this.sendAuth();
      }
      return;
    }

    this.openSocket();
  }

  private openSocket() {
    if (typeof window === 'undefined' || !this.userId) return;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      this.isAuthed = false;

      ws.onopen = () => {
        this.setConnected(true);
        this.sendAuth();
        this.startHeartbeat();
      };

      ws.onmessage = (evt) => {
        let msg: any = null;
        try {
          msg = JSON.parse(String(evt.data || ''));
        } catch {
          return;
        }
        if (!msg || !msg.event) return;
        const { event, payload } = msg;

        if (event === 'auth:ok') {
          this.isAuthed = true;
          if (Array.isArray(payload?.onlineUserIds)) {
            this.onlineIds = new Set(payload.onlineUserIds.map(String));
            this.emitOnline();
          }
          this.flushPendingAndRooms();
        } else if (event === 'presence:update' && payload?.userId) {
          const id = String(payload.userId);
          if (payload.online) this.onlineIds.add(id);
          else this.onlineIds.delete(id);
          this.emitOnline();
        }

        const set = this.listeners.get(event);
        if (set) {
          for (const fn of set) {
            try {
              fn(payload);
            } catch (e) {
              console.warn('[CommsSocket] listener error:', e);
            }
          }
        }
      };

      ws.onclose = () => {
        this.setConnected(false);
        this.isAuthed = false;
        this.stopHeartbeat();
        this.ws = null;
        if (!this.intentionalClose && this.userId) {
          this.reconnectTimer = window.setTimeout(() => this.openSocket(), 2000);
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    } catch {
      this.reconnectTimer = window.setTimeout(() => this.openSocket(), 3000);
    }
  }

  private flushPendingAndRooms() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthed) return;
    for (const chatId of this.joinedChats) {
      this.rawSend('chat:join', { chatId });
    }
    if (this.activeRoomId) {
      this.rawSend('rtc:join', { roomId: this.activeRoomId });
    }
    const q = this.pendingQueue.splice(0, this.pendingQueue.length);
    for (const item of q) {
      this.rawSend(item.event, item.payload);
    }
  }

  private rawSend(event: string, payload: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ event, payload }));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private sendAuth() {
    this.rawSend('auth', {
      userId: this.userId,
      companyId: this.companyId,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.rawSend('heartbeat', { ts: Date.now() });
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setConnected(val: boolean) {
    this.connected = val;
    for (const fn of this.statusListeners) fn(val);
  }

  private emitOnline() {
    const snapshot = new Set(this.onlineIds);
    for (const fn of this.onlineListeners) fn(snapshot);
  }

  public send(event: string, payload: any = {}): boolean {
    if (event === 'chat:join' && payload?.chatId) {
      this.joinedChats.add(String(payload.chatId));
    } else if (event === 'chat:leave' && payload?.chatId) {
      this.joinedChats.delete(String(payload.chatId));
    } else if (event === 'rtc:join' && payload?.roomId) {
      this.activeRoomId = String(payload.roomId);
    } else if (event === 'rtc:leave') {
      this.activeRoomId = null;
    }

    if (event === 'auth' || event === 'heartbeat') {
      return this.rawSend(event, payload);
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthed) {
      return this.rawSend(event, payload);
    }

    if (event !== 'rtc:fallback_frame' && event !== 'rtc:fallback_audio') {
      this.pendingQueue.push({ event, payload });
      if (this.pendingQueue.length > 60) {
        this.pendingQueue.shift();
      }
    }
    return false;
  }

  public subscribe(event: string, handler: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  public subscribeStatus(fn: (connected: boolean) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.connected);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  public subscribeOnline(fn: (ids: Set<string>) => void): () => void {
    this.onlineListeners.add(fn);
    fn(new Set(this.onlineIds));
    return () => {
      this.onlineListeners.delete(fn);
    };
  }
}

export const sharedCommsSocket = new SharedCommsSocket();

export function useCommsSocket(auth?: {
  userId?: string;
  companyId?: string;
  displayName?: string;
  avatarUrl?: string;
}) {
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const unsubStatus = sharedCommsSocket.subscribeStatus(setConnected);
    const unsubOnline = sharedCommsSocket.subscribeOnline(setOnlineUserIds);
    return () => {
      unsubStatus();
      unsubOnline();
    };
  }, []);

  useEffect(() => {
    if (auth?.userId) {
      sharedCommsSocket.connect({
        userId: auth.userId,
        companyId: auth.companyId,
        displayName: auth.displayName,
        avatarUrl: auth.avatarUrl
      });
    }
  }, [auth?.userId, auth?.companyId, auth?.displayName, auth?.avatarUrl]);

  const send = useCallback((event: string, payload: any = {}) => {
    return sharedCommsSocket.send(event, payload);
  }, []);

  const subscribe = useCallback((event: string, handler: Listener) => {
    return sharedCommsSocket.subscribe(event, handler);
  }, []);

  return {
    connected,
    onlineUserIds,
    send,
    subscribe
  };
}

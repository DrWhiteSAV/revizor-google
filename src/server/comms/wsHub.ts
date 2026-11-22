import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getDb } from '../../db/initDb';
import { ensureCommsSchema } from './schema';

interface ConnectedPeer {
  ws: WebSocket;
  userId: string;
  companyId: string;
  displayName: string;
  avatarUrl?: string;
  chatIds: Set<string>;
  roomId: string | null;
  lastHeartbeat: number;
}

const peersBySocket = new Map<WebSocket, ConnectedPeer>();
const socketsByUser = new Map<string, Set<WebSocket>>();
const socketsByRoom = new Map<string, Set<WebSocket>>();

let wssInstance: WebSocketServer | null = null;

function safeSend(ws: WebSocket, event: string, payload: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ event, payload }));
    } catch (_) {}
  }
}

export function getOnlineUserIdsForCompany(companyId?: string | null): string[] {
  const result = new Set<string>();
  const targetCompany = String(companyId || '').trim();
  for (const peer of peersBySocket.values()) {
    if (!targetCompany || !peer.companyId || peer.companyId === targetCompany) {
      result.add(peer.userId);
    }
  }
  return Array.from(result);
}

export function isUserOnline(userId: string): boolean {
  const set = socketsByUser.get(String(userId || ''));
  if (!set) return false;
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) return true;
  }
  return false;
}

export function broadcastToUser(userId: string, event: string, payload: any): void {
  const set = socketsByUser.get(String(userId || ''));
  if (!set) return;
  for (const ws of set) {
    safeSend(ws, event, payload);
  }
}

export function broadcastToCompany(companyId: string | null | undefined, event: string, payload: any): void {
  const targetCompany = String(companyId || '').trim();
  for (const peer of peersBySocket.values()) {
    if (!targetCompany || !peer.companyId || peer.companyId === targetCompany) {
      safeSend(peer.ws, event, payload);
    }
  }
}

export function broadcastToChat(
  chatId: string,
  memberUserIds: string[],
  event: string,
  payload: any,
  excludeUserId?: string
): void {
  const targetSet = new Set(memberUserIds.map((id) => String(id)));
  const notifiedUsers = new Set<string>();

  for (const uid of targetSet) {
    if (excludeUserId && uid === String(excludeUserId)) continue;
    notifiedUsers.add(uid);
    broadcastToUser(uid, event, payload);
  }

  for (const peer of peersBySocket.values()) {
    if (excludeUserId && peer.userId === String(excludeUserId)) continue;
    if (peer.chatIds.has(chatId) && !notifiedUsers.has(peer.userId)) {
      safeSend(peer.ws, event, payload);
    }
  }
}

export function getLiveRoomUserIds(roomId: string): string[] {
  const set = socketsByRoom.get(roomId);
  if (!set) return [];
  const ids = new Set<string>();
  for (const ws of set) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    const peer = peersBySocket.get(ws);
    if (peer?.userId) ids.add(peer.userId);
  }
  return Array.from(ids);
}

export function broadcastToRoom(roomId: string, event: string, payload: any, excludeSocket?: WebSocket): void {
  const roomSet = socketsByRoom.get(roomId);
  if (!roomSet) return;
  for (const ws of roomSet) {
    if (excludeSocket && ws === excludeSocket) continue;
    safeSend(ws, event, payload);
  }
}

function sendToRoomTargetUser(roomId: string, targetUserId: string, event: string, payload: any): void {
  const roomSet = socketsByRoom.get(roomId);
  if (!roomSet) return;
  for (const ws of roomSet) {
    const peer = peersBySocket.get(ws);
    if (peer && peer.userId === String(targetUserId)) {
      safeSend(ws, event, payload);
    }
  }
}

async function detachSocketFromRoom(peer: ConnectedPeer): Promise<void> {
  const roomId = peer.roomId;
  if (!roomId) return;
  peer.roomId = null;

  const set = socketsByRoom.get(roomId);
  if (set) {
    set.delete(peer.ws);
    if (set.size === 0) socketsByRoom.delete(roomId);
  }

  // Check if user has another socket still in this room
  let stillInRoom = false;
  const userSockets = socketsByUser.get(peer.userId);
  if (userSockets) {
    for (const s of userSockets) {
      const other = peersBySocket.get(s);
      if (other && other !== peer && other.roomId === roomId) {
        stillInRoom = true;
        break;
      }
    }
  }

  if (!stillInRoom) {
    broadcastToRoom(roomId, 'rtc:peer_left', { roomId, userId: peer.userId }, peer.ws);
    const liveLeft = getLiveRoomUserIds(roomId).length;
    try {
      const db = await getDb();
      await ensureCommsSchema(db);
      await db.run(`DELETE FROM video_room_members WHERE room_id = ? AND user_id = ?`, [roomId, peer.userId]);
      if (liveLeft === 0) {
        const remaining = await db
          .get(`SELECT COUNT(*) as cnt FROM video_room_members WHERE room_id = ?`, [roomId])
          .catch(() => ({ cnt: 0 }));
        if (Number(remaining?.cnt || 0) === 0) {
          await db
            .run(`UPDATE video_rooms SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?`, [roomId])
            .catch(() => {});
          broadcastToRoom(roomId, 'rtc:room_ended', { roomId });
        }
      }
      broadcastToCompany(peer.companyId, 'video:room_updated', { roomId, activeCount: liveLeft });
    } catch (_) {}
  }
}

function detachSocketCompletely(ws: WebSocket): void {
  const peer = peersBySocket.get(ws);
  if (!peer) return;

  void detachSocketFromRoom(peer);
  peersBySocket.delete(ws);

  const userSet = socketsByUser.get(peer.userId);
  if (userSet) {
    userSet.delete(ws);
    if (userSet.size === 0) {
      socketsByUser.delete(peer.userId);
      broadcastToCompany(peer.companyId, 'presence:update', {
        userId: peer.userId,
        online: false
      });
    }
  }
}

export function attachCommsWebSocketServer(httpServer: http.Server): WebSocketServer {
  if (wssInstance) return wssInstance;

  const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });
  wssInstance = wss;

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const rawUrl = request.url || '/';
      const parsed = new URL(rawUrl, 'http://localhost');
      if (parsed.pathname !== '/ws') {
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (_) {
      try {
        socket.destroy();
      } catch (_) {}
    }
  });

  wss.on('connection', (ws) => {
    const peer: ConnectedPeer = {
      ws,
      userId: '',
      companyId: '',
      displayName: 'Сотрудник',
      chatIds: new Set(),
      roomId: null,
      lastHeartbeat: Date.now()
    };
    peersBySocket.set(ws, peer);

    ws.on('message', async (rawBuf) => {
      peer.lastHeartbeat = Date.now();
      let msg: any = null;
      try {
        msg = JSON.parse(rawBuf.toString('utf8'));
      } catch (_) {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      const event = String(msg.event || msg.type || '');
      const payload = msg.payload || msg.data || {};

      if (event === 'ping' || event === 'heartbeat') {
        safeSend(ws, 'pong', { ts: Date.now() });
        return;
      }

      if (event === 'auth') {
        const uid = String(payload.userId || '').trim();
        if (!uid) return;

        // Clean previous user binding if changed
        if (peer.userId && peer.userId !== uid) {
          const oldSet = socketsByUser.get(peer.userId);
          if (oldSet) {
            oldSet.delete(ws);
            if (oldSet.size === 0) socketsByUser.delete(peer.userId);
          }
        }

        peer.userId = uid;
        peer.companyId = String(payload.companyId || '').trim();
        peer.displayName = String(payload.displayName || 'Сотрудник');
        peer.avatarUrl = payload.avatarUrl ? String(payload.avatarUrl) : undefined;

        if (!socketsByUser.has(uid)) socketsByUser.set(uid, new Set());
        socketsByUser.get(uid)!.add(ws);

        safeSend(ws, 'auth:ok', {
          userId: uid,
          onlineUserIds: getOnlineUserIdsForCompany(peer.companyId)
        });
        broadcastToCompany(peer.companyId, 'presence:update', {
          userId: uid,
          online: true
        });
        return;
      }

      if (!peer.userId) return;

      if (event === 'chat:join' && payload.chatId) {
        peer.chatIds.add(String(payload.chatId));
        return;
      }

      if (event === 'chat:leave' && payload.chatId) {
        peer.chatIds.delete(String(payload.chatId));
        return;
      }

      if (event === 'chat:typing' && payload.chatId) {
        const chatId = String(payload.chatId);
        for (const other of peersBySocket.values()) {
          if (other !== peer && other.userId !== peer.userId && other.chatIds.has(chatId)) {
            safeSend(other.ws, 'chat:typing', {
              chatId,
              userId: peer.userId,
              displayName: peer.displayName,
              isTyping: Boolean(payload.isTyping)
            });
          }
        }
        return;
      }

      if (event === 'rtc:join' && payload.roomId) {
        const roomId = String(payload.roomId);
        if (peer.roomId && peer.roomId !== roomId) {
          await detachSocketFromRoom(peer);
        }
        peer.roomId = roomId;
        if (!socketsByRoom.has(roomId)) socketsByRoom.set(roomId, new Set());
        socketsByRoom.get(roomId)!.add(ws);

        const roomMembers: Array<{ userId: string; displayName: string; avatarUrl?: string }> = [];
        for (const s of socketsByRoom.get(roomId)!) {
          const p = peersBySocket.get(s);
          if (p && p.userId && !roomMembers.some((m) => m.userId === p.userId)) {
            roomMembers.push({
              userId: p.userId,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl
            });
          }
        }

        safeSend(ws, 'rtc:room_peers', { roomId, peers: roomMembers });
        broadcastToRoom(
          roomId,
          'rtc:peer_joined',
          {
            roomId,
            userId: peer.userId,
            displayName: peer.displayName,
            avatarUrl: peer.avatarUrl
          },
          ws
        );
        return;
      }

      if (event === 'rtc:leave') {
        await detachSocketFromRoom(peer);
        return;
      }

      if (
        (event === 'rtc:offer' ||
          event === 'rtc:answer' ||
          event === 'rtc:ice' ||
          event === 'rtc:fallback_audio' ||
          event === 'rtc:fallback_frame') &&
        payload.roomId
      ) {
        const roomId = String(payload.roomId);
        const outPayload = {
          ...payload,
          roomId,
          senderId: peer.userId,
          displayName: peer.displayName
        };
        if (payload.targetId) {
          sendToRoomTargetUser(roomId, String(payload.targetId), event, outPayload);
        } else {
          broadcastToRoom(roomId, event, outPayload, ws);
        }
        return;
      }

      if (event === 'rtc:media_state' && payload.roomId) {
        const roomId = String(payload.roomId);
        broadcastToRoom(
          roomId,
          'rtc:media_state',
          {
            roomId,
            userId: peer.userId,
            isCameraOn: Boolean(payload.isCameraOn),
            isMicOn: Boolean(payload.isMicOn),
            isScreenSharing: Boolean(payload.isScreenSharing),
            transportMode: payload.transportMode || 'p2p'
          },
          ws
        );
        return;
      }

      if (event === 'call:decline' && payload.callerId) {
        broadcastToUser(String(payload.callerId), 'call:declined', {
          roomId: payload.roomId,
          userId: peer.userId,
          displayName: peer.displayName
        });
      }
    });

    ws.on('close', () => {
      detachSocketCompletely(ws);
    });

    ws.on('error', () => {
      detachSocketCompletely(ws);
    });
  });

  // Clean up disconnected/sleeping mobile sockets cleanly
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ws, peer] of peersBySocket.entries()) {
      if (now - peer.lastHeartbeat > 55_000 || ws.readyState !== WebSocket.OPEN) {
        try {
          ws.terminate();
        } catch (_) {}
        detachSocketCompletely(ws);
      }
    }
  }, 20_000);
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

  console.log('✅ WebSocket hub attached on /ws');
  return wss;
}

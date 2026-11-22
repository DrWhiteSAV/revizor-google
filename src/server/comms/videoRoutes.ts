import type { Express, Request, Response } from 'express';
import type { PgDbAdapter } from '../../db/initDb';
import { ensureCommsSchema } from './schema';
import {
  getChatModerationConfig,
  moderateCompanyMessage,
  updateChatModerationConfig
} from './moderation';
import {
  broadcastToChat,
  broadcastToCompany,
  broadcastToRoom,
  broadcastToUser,
  getLiveRoomUserIds
} from './wsHub';
import { runProTalkAudioTranscription } from '../../../server/protalk';
import { sendWebPushToUser } from '../../../server/routes/push/service';
import { sendTelegramRichMessage, buildInlineKeyboard, escapeRichText } from '../telegram';
import {
  commsUpload,
  getBaseUrlFromRequest,
  isSttHallucination,
  resolveCompanyScope
} from './routes';

export function registerCommsVideoRoutes(app: Express, getDb: () => Promise<PgDbAdapter>): void {
  // 10. Create Video Room (either chat-linked or standalone shareable link) & notify invitees
  app.post('/api/comms/video/rooms', async (req: Request, res: Response) => {
    try {
      const hostId = String(req.body?.hostId || '').trim();
      const chatId = req.body?.chatId ? String(req.body.chatId).trim() : null;
      const roomType = String(req.body?.roomType || 'group');
      const titleInput = String(req.body?.title || '').trim();
      const inviteUserIdsInput = Array.isArray(req.body?.inviteUserIds) ? req.body.inviteUserIds.map(String) : [];
      const createLinkOnly = Boolean(req.body?.createLinkOnly);

      if (!hostId) return res.status(400).json({ success: false, error: 'Не указан инициатор звонка' });

      const db = await getDb();
      await ensureCommsSchema(db);
      const scope = await resolveCompanyScope(db, hostId);
      if (!scope) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

      // Clean up stale empty rooms hosted by this user so abandoned clicks never accumulate
      const hostRooms = await db
        .all(`SELECT id FROM video_rooms WHERE host_id = ? AND is_active = 1`, [hostId])
        .catch(() => []);
      for (const hr of hostRooms || []) {
        const hid = String(hr.id);
        const live = getLiveRoomUserIds(hid);
        if (live.length === 0) {
          await db.run(`DELETE FROM video_room_members WHERE room_id = ?`, [hid]).catch(() => {});
          await db
            .run(`UPDATE video_rooms SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?`, [hid])
            .catch(() => {});
        }
      }

      // If starting from a chat and there is already a live room in progress with participants, join it instead of duplicating
      if (chatId && !createLinkOnly && inviteUserIdsInput.length === 0) {
        const existingChatRooms = await db
          .all(`SELECT * FROM video_rooms WHERE chat_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 3`, [chatId])
          .catch(() => []);
        for (const er of existingChatRooms || []) {
          const eid = String(er.id);
          if (getLiveRoomUserIds(eid).length > 0) {
            const baseUrl = getBaseUrlFromRequest(req);
            const joinPath = `/cabinet/comms?room=${encodeURIComponent(eid)}&chat=${encodeURIComponent(chatId)}`;
            return res.json({
              success: true,
              reused: true,
              room: {
                id: eid,
                chatId,
                roomType: String(er.room_type || roomType),
                title: String(er.title || 'Видеовстреча'),
                hostId: String(er.host_id),
                transcriptionEnabled: Number(er.transcription_enabled ?? 1) === 1,
                joinPath,
                joinUrl: `${baseUrl}${joinPath}`
              }
            });
          }
        }
      }

      const roomId = `vroom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const roomTitle =
        titleInput || (roomType === 'direct' ? `Видеозвонок · ${scope.userName}` : 'Групповая видеовстреча');

      await db.run(
        `INSERT INTO video_rooms (id, company_id, chat_id, room_type, title, host_id, is_active, transcription_enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)`,
        [roomId, scope.companyKey, chatId, roomType, roomTitle, hostId]
      );

      // Only add host as live room member if entering immediately (not just generating a shareable link)
      if (!createLinkOnly) {
        await db.run(
          `INSERT INTO video_room_members (id, room_id, user_id, display_name, avatar_url, is_camera_on, is_mic_on, transport_mode)
           VALUES (?, ?, ?, ?, ?, 1, 1, 'p2p')
           ON CONFLICT (id) DO NOTHING`,
          [`${roomId}__${hostId}`, roomId, hostId, scope.userName, scope.userAvatar]
        );
      }

      const baseUrl = getBaseUrlFromRequest(req);
      const joinPath = `/cabinet/comms?room=${encodeURIComponent(roomId)}${chatId ? `&chat=${encodeURIComponent(chatId)}` : ''}`;
      const joinUrl = `${baseUrl}${joinPath}`;

      // Determine targets: explicit invitees + chat members
      const targetIds = new Set<string>(inviteUserIdsInput.filter((id: string) => id && id !== hostId));
      if (chatId) {
        const cMembers = await db
          .all(`SELECT user_id FROM company_chat_members WHERE chat_id = ?`, [chatId])
          .catch(() => []);
        for (const m of cMembers || []) {
          const uid = String(m.user_id);
          if (uid && uid !== hostId) targetIds.add(uid);
        }

        // Insert interactive Video Call Invite message inside the chat
        const inviteMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const invitePayload = {
          roomId,
          roomType,
          title: roomTitle,
          hostId,
          hostName: scope.userName,
          joinPath
        };
        await db.run(
          `INSERT INTO company_chat_messages (
            id, chat_id, sender_id, sender_name, sender_avatar, message, message_kind, invite_payload_json, moderation_status
          ) VALUES (?, ?, ?, ?, ?, ?, 'video_invite', ?, 'approved')`,
          [
            inviteMsgId,
            chatId,
            hostId,
            scope.userName,
            scope.userAvatar,
            `Приглашение на видеовстречу: ${roomTitle}`,
            JSON.stringify(invitePayload)
          ]
        );
        await db.run(`UPDATE company_chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`, [chatId]).catch(() => {});

        const allChatMembers = Array.from(new Set([hostId, ...Array.from(targetIds)]));
        broadcastToChat(chatId, allChatMembers, 'chat:message', {
          chatId,
          message: {
            id: inviteMsgId,
            chatId,
            senderId: hostId,
            senderName: scope.userName,
            senderAvatar: scope.userAvatar,
            message: `Приглашение на видеовстречу: ${roomTitle}`,
            messageKind: 'video_invite',
            invitePayload,
            createdAt: new Date().toISOString()
          }
        });
      }

      // Live WebSocket ringing + Web Push + Telegram Rich invite (only ring if explicit call/invite, or inviteUserIds given)
      const shouldRing = !createLinkOnly || inviteUserIdsInput.length > 0;
      if (shouldRing) {
        const colleagueById = new Map(scope.colleagues.map((c) => [c.id, c]));
        for (const uid of targetIds) {
          broadcastToUser(uid, 'call:invite', {
            roomId,
            chatId,
            roomType,
            title: roomTitle,
            callerId: hostId,
            callerName: scope.userName,
            callerAvatar: scope.userAvatar
          });

          void sendWebPushToUser(db, uid, {
            title: `Приглашение на видеозвонок: ${scope.userName}`,
            body: roomTitle,
            url: joinPath,
            tag: `comms-call-${roomId}`,
            category: 'system'
          }).catch(() => {});

          const col = colleagueById.get(uid);
          if (col?.telegramId) {
            void sendTelegramRichMessage({
              chatId: col.telegramId,
              html: `📹 <b>Приглашение на видеовстречу</b>\nИнициатор: <b>${escapeRichText(scope.userName)}</b>\nКомната: «${escapeRichText(roomTitle)}»`,
              reply_markup: buildInlineKeyboard(`Подключиться к видеовстрече|${joinUrl}`)
            }).catch(() => {});
          }
        }
      }

      broadcastToCompany(scope.companyKey, 'video:room_updated', { roomId, active: true });

      return res.json({
        success: true,
        room: {
          id: roomId,
          chatId,
          roomType,
          title: roomTitle,
          hostId,
          transcriptionEnabled: true,
          joinPath,
          joinUrl
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка создания видеокомнаты' });
    }
  });

  // 10b. Invite colleagues or send room link into an existing chat
  app.post('/api/comms/video/rooms/:roomId/invite', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = String(req.body?.userId || '').trim();
      const targetUserIds = Array.isArray(req.body?.userIds) ? req.body.userIds.map(String) : [];
      const targetChatId = req.body?.chatId ? String(req.body.chatId).trim() : null;

      if (!userId) return res.status(400).json({ success: false, error: 'Не указан userId' });

      const db = await getDb();
      await ensureCommsSchema(db);
      const room = await db.get(`SELECT * FROM video_rooms WHERE id = ? LIMIT 1`, [roomId]).catch(() => null);
      if (!room) return res.status(404).json({ success: false, error: 'Видеокомната не найдена' });

      const scope = await resolveCompanyScope(db, userId);
      if (!scope) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

      const baseUrl = getBaseUrlFromRequest(req);
      const joinPath = `/cabinet/comms?room=${encodeURIComponent(roomId)}${targetChatId ? `&chat=${encodeURIComponent(targetChatId)}` : ''}`;
      const joinUrl = `${baseUrl}${joinPath}`;
      const roomTitle = String(room.title || 'Видеовстреча');

      if (targetChatId) {
        const inviteMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const invitePayload = {
          roomId,
          roomType: String(room.room_type || 'group'),
          title: roomTitle,
          hostId: userId,
          hostName: scope.userName,
          joinPath
        };
        await db.run(
          `INSERT INTO company_chat_messages (
            id, chat_id, sender_id, sender_name, sender_avatar, message, message_kind, invite_payload_json, moderation_status
          ) VALUES (?, ?, ?, ?, ?, ?, 'video_invite', ?, 'approved')`,
          [
            inviteMsgId,
            targetChatId,
            userId,
            scope.userName,
            scope.userAvatar,
            `Приглашение на видеовстречу: ${roomTitle}`,
            JSON.stringify(invitePayload)
          ]
        );
        await db.run(`UPDATE company_chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`, [targetChatId]).catch(() => {});
        const cMembers = await db.all(`SELECT user_id FROM company_chat_members WHERE chat_id = ?`, [targetChatId]).catch(() => []);
        const memberIds = (cMembers || []).map((m: any) => String(m.user_id));
        broadcastToChat(targetChatId, memberIds, 'chat:message', {
          chatId: targetChatId,
          message: {
            id: inviteMsgId,
            chatId: targetChatId,
            senderId: userId,
            senderName: scope.userName,
            senderAvatar: scope.userAvatar,
            message: `Приглашение на видеовстречу: ${roomTitle}`,
            messageKind: 'video_invite',
            invitePayload,
            createdAt: new Date().toISOString()
          }
        });
      }

      const colleagueById = new Map(scope.colleagues.map((c) => [c.id, c]));
      for (const uid of targetUserIds) {
        if (!uid || uid === userId) continue;
        broadcastToUser(uid, 'call:invite', {
          roomId,
          chatId: room.chat_id || targetChatId || null,
          roomType: String(room.room_type || 'group'),
          title: roomTitle,
          callerId: userId,
          callerName: scope.userName,
          callerAvatar: scope.userAvatar
        });
        void sendWebPushToUser(db, uid, {
          title: `Приглашение на видеозвонок: ${scope.userName}`,
          body: roomTitle,
          url: joinPath,
          tag: `comms-call-${roomId}`,
          category: 'system'
        }).catch(() => {});
        const col = colleagueById.get(uid);
        if (col?.telegramId) {
          void sendTelegramRichMessage({
            chatId: col.telegramId,
            html: `📹 <b>Приглашение на видеовстречу</b>\nКоллега: <b>${escapeRichText(scope.userName)}</b>\nКомната: «${escapeRichText(roomTitle)}»`,
            reply_markup: buildInlineKeyboard(`Подключиться|${joinUrl}`)
          }).catch(() => {});
        }
      }

      return res.json({ success: true, joinPath, joinUrl });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка отправки приглашения' });
    }
  });

  // 11. Get Video Room State & Transcripts
  app.get('/api/comms/video/rooms/:roomId', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const db = await getDb();
      await ensureCommsSchema(db);

      const room = await db.get(`SELECT * FROM video_rooms WHERE id = ? LIMIT 1`, [roomId]).catch(() => null);
      if (!room) return res.status(404).json({ success: false, error: 'Видеокомната не найдена' });

      const [members, transcripts] = await Promise.all([
        db.all(`SELECT * FROM video_room_members WHERE room_id = ? ORDER BY joined_at ASC`, [roomId]).catch(() => []),
        db.all(`SELECT * FROM video_room_transcripts WHERE room_id = ? ORDER BY created_at ASC LIMIT 250`, [roomId]).catch(() => [])
      ]);

      const baseUrl = getBaseUrlFromRequest(req);
      const joinPath = `/cabinet/comms?room=${encodeURIComponent(String(room.id))}${room.chat_id ? `&chat=${encodeURIComponent(String(room.chat_id))}` : ''}`;

      return res.json({
        success: true,
        room: {
          id: String(room.id),
          companyId: room.company_id ? String(room.company_id) : null,
          chatId: room.chat_id ? String(room.chat_id) : null,
          roomType: String(room.room_type || 'group'),
          title: String(room.title || 'Видеовстреча'),
          hostId: String(room.host_id),
          isActive: Number(room.is_active ?? 1) === 1,
          transcriptionEnabled: Number(room.transcription_enabled ?? 1) === 1,
          joinPath,
          joinUrl: `${baseUrl}${joinPath}`
        },
        members: members || [],
        transcripts: (transcripts || []).map((t: any) => ({
          id: String(t.id),
          roomId: String(t.room_id),
          chatId: t.chat_id ? String(t.chat_id) : null,
          userId: String(t.user_id),
          speakerName: String(t.speaker_name || 'Участник'),
          text: String(t.text || ''),
          audioUrl: t.audio_url ? String(t.audio_url) : null,
          audioDurationSec: Number(t.audio_duration_sec || 0),
          createdAt: t.created_at
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка чтения видеокомнаты' });
    }
  });

  // 12. Join Video Room (re-activates room if rejoined from shareable link)
  app.post('/api/comms/video/rooms/:roomId/join', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = String(req.body?.userId || '').trim();
      const displayName = String(req.body?.displayName || 'Сотрудник');
      const avatarUrl = String(req.body?.avatarUrl || '');
      const isCameraOn = req.body?.isCameraOn !== undefined ? (req.body.isCameraOn ? 1 : 0) : 1;
      const isMicOn = req.body?.isMicOn !== undefined ? (req.body.isMicOn ? 1 : 0) : 1;
      const transportMode = String(req.body?.transportMode || 'p2p');

      if (!userId) return res.status(400).json({ success: false, error: 'Не указан userId' });

      const db = await getDb();
      await ensureCommsSchema(db);
      const room = await db.get(`SELECT * FROM video_rooms WHERE id = ? LIMIT 1`, [roomId]).catch(() => null);
      if (!room) return res.status(404).json({ success: false, error: 'Видеокомната не найдена' });

      if (Number(room.is_active ?? 0) === 0) {
        await db.run(`UPDATE video_rooms SET is_active = 1, ended_at = NULL WHERE id = ?`, [roomId]).catch(() => {});
      }

      const pk = `${roomId}__${userId}`;
      await db.run(
        `INSERT INTO video_room_members (
          id, room_id, user_id, display_name, avatar_url, is_camera_on, is_mic_on, transport_mode, joined_at, last_ping
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          is_camera_on = EXCLUDED.is_camera_on,
          is_mic_on = EXCLUDED.is_mic_on,
          transport_mode = EXCLUDED.transport_mode,
          last_ping = CURRENT_TIMESTAMP`,
        [pk, roomId, userId, displayName, avatarUrl, isCameraOn, isMicOn, transportMode]
      );

      const [members, transcripts] = await Promise.all([
        db.all(`SELECT * FROM video_room_members WHERE room_id = ? ORDER BY joined_at ASC`, [roomId]).catch(() => []),
        db.all(`SELECT * FROM video_room_transcripts WHERE room_id = ? ORDER BY created_at ASC LIMIT 250`, [roomId]).catch(() => [])
      ]);

      broadcastToCompany(room.company_id ? String(room.company_id) : null, 'video:room_updated', {
        roomId,
        activeCount: (members || []).length
      });

      return res.json({
        success: true,
        members: members || [],
        transcripts: (transcripts || []).map((t: any) => ({
          id: String(t.id),
          roomId: String(t.room_id),
          chatId: t.chat_id ? String(t.chat_id) : null,
          userId: String(t.user_id),
          speakerName: String(t.speaker_name || 'Участник'),
          text: String(t.text || ''),
          audioUrl: t.audio_url ? String(t.audio_url) : null,
          audioDurationSec: Number(t.audio_duration_sec || 0),
          createdAt: t.created_at
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка входа в комнату' });
    }
  });

  // 13. Leave Video Room (immediately closes empty rooms and notifies company via WS)
  app.post('/api/comms/video/rooms/:roomId/leave', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = String(req.body?.userId || '').trim();
      const endForAll = Boolean(req.body?.endForAll);

      const db = await getDb();
      await ensureCommsSchema(db);
      const room = await db.get(`SELECT company_id FROM video_rooms WHERE id = ? LIMIT 1`, [roomId]).catch(() => null);

      if (endForAll) {
        await db.run(`DELETE FROM video_room_members WHERE room_id = ?`, [roomId]).catch(() => {});
      } else if (userId) {
        await db.run(`DELETE FROM video_room_members WHERE room_id = ? AND user_id = ?`, [roomId, userId]).catch(() => {});
      }

      const remainingRows = await db
        .all(`SELECT user_id FROM video_room_members WHERE room_id = ?`, [roomId])
        .catch(() => []);
      const liveWsUsers = new Set(getLiveRoomUserIds(roomId));
      // Keep only remaining users who either are connected on WS OR are someone else still active
      const realRemaining = (remainingRows || []).filter((r: any) => {
        const uid = String(r.user_id);
        return uid !== userId && (liveWsUsers.size === 0 || liveWsUsers.has(uid));
      });

      const shouldEnd = endForAll || realRemaining.length === 0;
      if (shouldEnd) {
        await db.run(`DELETE FROM video_room_members WHERE room_id = ?`, [roomId]).catch(() => {});
        await db.run(`UPDATE video_rooms SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id = ?`, [roomId]).catch(() => {});
        broadcastToRoom(roomId, 'rtc:room_ended', { roomId });
      }

      broadcastToCompany(room?.company_id ? String(room.company_id) : null, 'video:room_updated', {
        roomId,
        activeCount: shouldEnd ? 0 : realRemaining.length
      });

      return res.json({ success: true, closed: shouldEnd });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка выхода из комнаты' });
    }
  });

  // 14. HTTP fallback signaling endpoints (when mobile browser reconnects WS)
  app.post('/api/comms/video/rooms/:roomId/signal', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const { senderId, targetId = null, type, payload = {} } = req.body || {};
      if (!senderId || !type) return res.status(400).json({ success: false, error: 'senderId and type required' });
      const db = await getDb();
      await ensureCommsSchema(db);
      const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await db.run(
        `INSERT INTO video_signaling (id, room_id, sender_id, target_id, type, payload_json) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, roomId, String(senderId), targetId ? String(targetId) : null, String(type), JSON.stringify(payload)]
      );
      return res.json({ success: true, id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/comms/video/rooms/:roomId/signals', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const userId = String(req.query.userId || '').trim();
      const since = String(req.query.since || '').trim();
      const db = await getDb();
      await ensureCommsSchema(db);

      const rows = since
        ? await db.all(
            `SELECT * FROM video_signaling WHERE room_id = ? AND sender_id != ? AND (target_id IS NULL OR target_id = ?) AND created_at > ? ORDER BY created_at ASC LIMIT 50`,
            [roomId, userId, userId, since]
          )
        : await db.all(
            `SELECT * FROM video_signaling WHERE room_id = ? AND sender_id != ? AND (target_id IS NULL OR target_id = ?) ORDER BY created_at DESC LIMIT 30`,
            [roomId, userId, userId]
          );

      return res.json({
        success: true,
        signals: (rows || []).map((r: any) => ({
          id: r.id,
          senderId: r.sender_id,
          targetId: r.target_id,
          type: r.type,
          payload: JSON.parse(String(r.payload_json || '{}')),
          createdAt: r.created_at
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 15. Chunked Audio Upload (>3s Pause Cut) -> Speech-to-Text -> Live Room Transcript + Linked Chat Audio/Text
  app.post(
    '/api/comms/video/rooms/:roomId/transcribe-chunk',
    commsUpload.single('file'),
    async (req: Request, res: Response) => {
      try {
        const { roomId } = req.params;
        const userId = String(req.body?.userId || '').trim();
        const speakerName = String(req.body?.speakerName || 'Участник').trim();
        const durationSec = Number(req.body?.durationSec || 0);
        const mimeType = String(req.file?.mimetype || req.body?.mimeType || 'audio/webm');
        const fileName = String(req.file?.originalname || req.body?.fileName || `chunk_${Date.now()}.webm`);
        const fileSize = req.file?.size || req.file?.buffer?.length || null;

        if (!userId) {
          return res.status(400).json({ success: false, error: 'Не указан участник' });
        }

        let audioBase64 = String(req.body?.audioBase64 || '').trim();
        if (req.file?.buffer && req.file.buffer.length > 0) {
          audioBase64 = req.file.buffer.toString('base64');
        }

        if (!audioBase64 || audioBase64.length < 300) {
          return res.json({ success: true, skipped: true, text: '' });
        }

        const sttRes = await runProTalkAudioTranscription({
          audioBase64,
          mimeType,
          userId,
          fileName
        });

        const text = String(sttRes.text || '').trim();
        const audioUrl = sttRes.file_url ? String(sttRes.file_url) : null;

        if (!sttRes.success || isSttHallucination(text)) {
          return res.json({ success: true, skipped: true, text: '' });
        }

        const db = await getDb();
        await ensureCommsSchema(db);
        const room = await db.get(`SELECT chat_id FROM video_rooms WHERE id = ? LIMIT 1`, [roomId]).catch(() => null);
        const effectiveChatId = room?.chat_id ? String(room.chat_id) : (req.body?.chatId ? String(req.body.chatId).trim() : null);
        const transcriptId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        await db.run(
          `INSERT INTO video_room_transcripts (id, room_id, chat_id, user_id, speaker_name, text, audio_duration_sec, audio_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [transcriptId, roomId, effectiveChatId, userId, speakerName, text, durationSec, audioUrl]
        );

        const entry = {
          id: transcriptId,
          roomId,
          chatId: effectiveChatId,
          userId,
          speakerName,
          text,
          audioUrl,
          audioDurationSec: durationSec,
          createdAt: new Date().toISOString()
        };

        broadcastToRoom(roomId, 'video:transcript', entry);

        // If room is linked to a chat, automatically post audio clip + recognized text caption into that chat
        let savedChatMessage: any = null;
        if (effectiveChatId) {
          try {
            const msgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await db.run(
              `INSERT INTO company_chat_messages (
                id, chat_id, sender_id, sender_name, sender_avatar, message, message_kind,
                media_url, media_type, file_name, file_size, transcript_text, stt_status, moderation_status, created_at
              ) VALUES (?, ?, ?, ?, '', '', 'text', ?, 'audio', ?, ?, ?, 'done', 'approved', CURRENT_TIMESTAMP)`,
              [msgId, effectiveChatId, userId, speakerName, audioUrl, fileName, fileSize, text]
            );
            await db
              .run(`UPDATE company_chats SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?`, [effectiveChatId])
              .catch(() => {});

            const membersRows = await db
              .all(`SELECT user_id FROM company_chat_members WHERE chat_id = ?`, [effectiveChatId])
              .catch(() => []);
            const memberIds = (membersRows || []).map((r: any) => String(r.user_id));

            savedChatMessage = {
              id: msgId,
              chatId: effectiveChatId,
              senderId: userId,
              senderName: speakerName,
              senderAvatar: '',
              message: '',
              messageKind: 'text',
              replyToId: null,
              invitePayload: null,
              mediaUrl: audioUrl,
              mediaType: 'audio',
              fileName,
              fileSize,
              transcriptText: text,
              sttStatus: 'done',
              createdAt: new Date().toISOString()
            };

            broadcastToChat(effectiveChatId, memberIds, 'chat:message', {
              chatId: effectiveChatId,
              message: savedChatMessage
            });
          } catch (chatErr) {
            console.warn('[Video STT -> Chat Post Warn]:', chatErr);
          }
        }

        return res.json({ success: true, transcript: entry, chatMessage: savedChatMessage });
      } catch (err: any) {
        console.error('[Video STT Chunk Error]:', err);
        return res.status(500).json({ success: false, error: err?.message || 'Ошибка распознавания речи' });
      }
    }
  );

  // 16. System Admin: Function 763 Moderation Settings, Live Test & Audit Logs
  app.get('/api/system-admin/comms-moderation/config', async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const config = await getChatModerationConfig(db);
      return res.json({ success: true, config });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/system-admin/comms-moderation/config', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const config = await updateChatModerationConfig(req.body || {}, db);
      return res.json({ success: true, config });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/system-admin/comms-moderation/test', async (req: Request, res: Response) => {
    try {
      const text = String(req.body?.text || '').trim();
      const imageUrls = Array.isArray(req.body?.imageUrls)
        ? req.body.imageUrls
        : String(req.body?.imagesUrls || '')
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
      const instruction = req.body?.instruction ? String(req.body.instruction) : undefined;
      const senderId = String(req.body?.senderId || '91827364501');

      const result = await moderateCompanyMessage({
        text,
        imageUrls,
        customInstruction: instruction,
        chatId: 'admin_test',
        senderId,
        chatType: 'group',
        bypassCache: true
      });
      return res.json({ success: true, result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/system-admin/comms-moderation/logs', async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const logs = await db
        .all(
          `SELECT id, channel_id, user_social_id, user_message, bot_reply, llm, tokens_total, rub, function_error, created_at
           FROM logs
           WHERE channel_name = 'chat_moderation'
           ORDER BY id DESC
           LIMIT 100`
        )
        .catch(() => []);
      return res.json({ success: true, logs: logs || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 17. Per-user adaptive layout preferences (desktop & mobile panel/window sizes)
  app.get('/api/comms/preferences/:userId', async (req: Request, res: Response) => {
    try {
      const userId = String(req.params.userId || '').trim();
      if (!userId) return res.status(400).json({ success: false, error: 'Не указан userId' });
      const db = await getDb();
      await ensureCommsSchema(db);
      const row = await db
        .get(`SELECT layout_json FROM comms_user_preferences WHERE user_id = ? LIMIT 1`, [userId])
        .catch(() => null);
      let layout: any = null;
      if (row?.layout_json) {
        try {
          layout = JSON.parse(String(row.layout_json));
        } catch {}
      }
      return res.json({ success: true, layout });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.put('/api/comms/preferences/:userId', async (req: Request, res: Response) => {
    try {
      const userId = String(req.params.userId || '').trim();
      if (!userId) return res.status(400).json({ success: false, error: 'Не указан userId' });
      const layout = req.body?.layout;
      if (!layout || typeof layout !== 'object') {
        return res.status(400).json({ success: false, error: 'Некорректные настройки' });
      }
      const db = await getDb();
      await ensureCommsSchema(db);
      const jsonStr = JSON.stringify(layout);
      await db.run(
        `INSERT INTO comms_user_preferences (user_id, layout_json, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET layout_json = EXCLUDED.layout_json, updated_at = CURRENT_TIMESTAMP`,
        [userId, jsonStr]
      );
      return res.json({ success: true, layout });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });
}


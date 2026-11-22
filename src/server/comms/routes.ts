import type { Express, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import multer from 'multer';
import type { PgDbAdapter } from '../../db/initDb';
import { ensureCommsSchema } from './schema';
import { getChatModerationConfig, moderateCompanyMessage } from './moderation';
import {
  broadcastToChat,
  broadcastToCompany,
  getLiveRoomUserIds,
  getOnlineUserIdsForCompany,
  isUserOnline
} from './wsHub';
import { runProTalkAudioTranscription } from '../../../server/protalk';
import { sendWebPushToUser } from '../../../server/routes/push/service';
import { sendTelegramRichMessage, buildInlineKeyboard, escapeRichText } from '../telegram';
import { registerCommsVideoRoutes } from './videoRoutes';

export const commsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const STT_NOISE_PHRASES = [
  'продолжение следует',
  'субтитры создавал',
  'редактор субтитров',
  'спасибо за просмотр',
  'подписывайтесь на канал',
  'субтитры сделал',
  'dimatorzok',
  'amara.org'
];

export function isSttHallucination(raw: string): boolean {
  const clean = String(raw || '').trim().toLowerCase().replace(/[.!?,…\s]+$/g, '');
  if (!clean || clean.length < 2) return true;
  // Use Unicode property escapes so Cyrillic / non-Latin speech is never mistakenly treated as punctuation
  if (!/[\p{L}\p{N}]/u.test(clean)) return true;
  return STT_NOISE_PHRASES.some((phrase) => clean === phrase || clean.includes(phrase));
}

export function getBaseUrlFromRequest(req: Request): string {
  const envUrl = String(process.env.APP_URL || process.env.PUBLIC_URL || '').trim().replace(/\/$/, '');
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000').split(',')[0].trim();
  return `${proto}://${host}`;
}

export function makeAbsoluteUrl(url: string, req: Request): string {
  const clean = String(url || '').trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  const base = getBaseUrlFromRequest(req);
  return `${base}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function detectMediaType(mime: string, fileName: string): 'image' | 'audio' | 'video' | 'file' {
  const m = String(mime || '').toLowerCase();
  const f = String(fileName || '').toLowerCase();
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f)) return 'image';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(f) || (/^voice_/i.test(f) && /\.webm$/i.test(f))) {
    return 'audio';
  }
  if (m.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(f)) return 'video';
  return 'file';
}

function buildDisplayName(row: any): string {
  if (!row) return 'Сотрудник';
  const direct = String(row.name || '').trim();
  if (direct) return direct;
  const combined = `${String(row.first_name || '').trim()} ${String(row.last_name || '').trim()}`.trim();
  if (combined) return combined;
  if (row.username) return `@${String(row.username).replace(/^@/, '')}`;
  return 'Сотрудник';
}

export interface CompanyScopeContext {
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  companyKey: string;
  directorId: string;
  colleagues: Array<{
    id: string;
    name: string;
    role: string;
    position: string;
    avatarUrl: string;
    telegramId: string;
    departmentId: string;
    online: boolean;
  }>;
  departments: Array<{
    id: string;
    name: string;
    managerId?: string;
    employeeIds?: string[];
  }>;
}

const scopeCache = new Map<string, { ts: number; data: CompanyScopeContext }>();
const SCOPE_CACHE_TTL_MS = 15_000;

const syncedChatsCache = new Map<string, number>();
const DEPT_CHATS_SYNC_TTL_MS = 90_000;

export async function resolveCompanyScope(db: PgDbAdapter, rawUserId: string): Promise<CompanyScopeContext | null> {
  const userId = String(rawUserId || '').trim();
  if (!userId) return null;

  const cached = scopeCache.get(userId);
  if (cached && Date.now() - cached.ts < SCOPE_CACHE_TTL_MS) {
    return {
      ...cached.data,
      colleagues: cached.data.colleagues.map((c) => ({
        ...c,
        online: isUserOnline(c.id) || c.id === userId
      }))
    };
  }

  let userRow = await db.get(`SELECT * FROM users WHERE id = ? LIMIT 1`, [userId]).catch(() => null);
  let empRow = null;
  if (!userRow) {
    empRow = await db.get(`SELECT * FROM employees WHERE id = ? LIMIT 1`, [userId]).catch(() => null);
  }
  if (!userRow && !empRow) return null;

  const source = userRow || empRow;
  const directorId = String(source.director_id || source.id || userId).trim();
  const companyId = String(source.company_id || '').trim();
  const companyKey = companyId || directorId;

  const [scopedUsers, scopedEmployees, stateRow] = await Promise.all([
    companyId
      ? db
          .all(
            `SELECT id, name, first_name, last_name, username, role, position, photo_url, avatarurl, telegram_id, department_id, status
             FROM users
             WHERE (director_id = ? OR company_id = ? OR id = ?)
             ORDER BY name ASC`,
            [directorId, companyId, directorId]
          )
          .catch(() => [])
      : db
          .all(
            `SELECT id, name, first_name, last_name, username, role, position, photo_url, avatarurl, telegram_id, department_id, status
             FROM users
             WHERE (director_id = ? OR id = ?)
             ORDER BY name ASC`,
            [directorId, directorId]
          )
          .catch(() => []),
    companyId
      ? db
          .all(
            `SELECT id, name, role, position, username, telegram_id, department_id, status
             FROM employees
             WHERE director_id = ? OR company_id = ?`,
            [directorId, companyId]
          )
          .catch(() => [])
      : db
          .all(
            `SELECT id, name, role, position, username, telegram_id, department_id, status
             FROM employees
             WHERE director_id = ?`,
            [directorId]
          )
          .catch(() => []),
    db.get(`SELECT state_json FROM cabinet_states WHERE user_id = ? OR id = ? LIMIT 1`, [directorId, directorId]).catch(() => null)
  ]);

  const colleagueMap = new Map<string, CompanyScopeContext['colleagues'][number]>();

  for (const u of scopedUsers || []) {
    const id = String(u.id || '').trim();
    if (!id || String(u.status || '').toLowerCase() === 'deleted') continue;
    colleagueMap.set(id, {
      id,
      name: buildDisplayName(u),
      role: String(u.role || 'EMPLOYEE'),
      position: String(u.position || ''),
      avatarUrl: String(u.avatarurl || u.photo_url || ''),
      telegramId: String(u.telegram_id || ''),
      departmentId: String(u.department_id || ''),
      online: isUserOnline(id)
    });
  }

  for (const e of scopedEmployees || []) {
    const id = String(e.id || '').trim();
    if (!id || colleagueMap.has(id) || String(e.status || '').toLowerCase() === 'deleted') continue;
    const empUsername = String(e.username || '').replace(/^@/, '').trim();
    colleagueMap.set(id, {
      id,
      name: buildDisplayName(e),
      role: String(e.role || 'EMPLOYEE'),
      position: String(e.position || ''),
      avatarUrl: empUsername ? `https://t.me/i/userpic/320/${empUsername}.jpg` : '',
      telegramId: String(e.telegram_id || ''),
      departmentId: String(e.department_id || ''),
      online: isUserOnline(id)
    });
  }

  let departments: CompanyScopeContext['departments'] = [];
  try {
    if (stateRow?.state_json) {
      const parsed = JSON.parse(String(stateRow.state_json));
      if (Array.isArray(parsed?.departments)) {
        departments = parsed.departments.map((d: any) => ({
          id: String(d.id || ''),
          name: String(d.name || 'Отдел'),
          managerId: d.managerId ? String(d.managerId) : undefined,
          employeeIds: Array.isArray(d.employeeIds) ? d.employeeIds.map(String) : []
        }));
      }
      if (Array.isArray(parsed?.mockEmployees)) {
        for (const me of parsed.mockEmployees) {
          const eid = String(me?.id || '').trim();
          if (!eid) continue;
          if (!colleagueMap.has(eid)) {
            colleagueMap.set(eid, {
              id: eid,
              name: String(me.name || 'Сотрудник'),
              role: String(me.role || 'EMPLOYEE'),
              position: String(me.position || ''),
              avatarUrl: String(me.avatarUrl || me.photo_url || ''),
              telegramId: String(me.telegram_id || ''),
              departmentId: String(me.departmentId || me.department_id || ''),
              online: isUserOnline(eid)
            });
          } else if (!colleagueMap.get(eid)!.departmentId && (me.departmentId || me.department_id)) {
            colleagueMap.get(eid)!.departmentId = String(me.departmentId || me.department_id);
          }
        }
      }
    }
  } catch (_) {}

  if (!colleagueMap.has(userId)) {
    colleagueMap.set(userId, {
      id: userId,
      name: buildDisplayName(source),
      role: String(source.role || 'EMPLOYEE'),
      position: String(source.position || ''),
      avatarUrl: String(source.avatarurl || source.avatar_url || source.photo_url || ''),
      telegramId: String(source.telegram_id || ''),
      departmentId: String(source.department_id || ''),
      online: true
    });
  }

  const ctx: CompanyScopeContext = {
    userId,
    userName: buildDisplayName(source),
    userAvatar: String(source.avatarurl || source.avatar_url || source.photo_url || ''),
    userRole: String(source.role || 'EMPLOYEE'),
    companyKey,
    directorId,
    colleagues: Array.from(colleagueMap.values()),
    departments
  };
  scopeCache.set(userId, { ts: Date.now(), data: ctx });
  return ctx;
}

async function ensureCompanyAndDepartmentChats(db: PgDbAdapter, scope: CompanyScopeContext): Promise<void> {
  const allColleagueIds = scope.colleagues.map((c) => c.id).sort();
  const deptSig = scope.departments.map((d) => `${d.id}:${d.name}:${(d.employeeIds || []).length}`).join('|');
  const cacheKey = `${scope.companyKey}::${allColleagueIds.join(',')}::${deptSig}`;

  const lastSynced = syncedChatsCache.get(cacheKey);
  if (lastSynced && Date.now() - lastSynced < DEPT_CHATS_SYNC_TTL_MS) {
    return;
  }

  const chatRows: Array<[string, string, string | null, string, string, string]> = [];
  const memberRows: Array<[string, string, string, string]> = [];

  const generalChatId = `dept_all_${scope.directorId}`;
  chatRows.push([
    generalChatId,
    scope.companyKey,
    null,
    'Общий чат компании',
    'Единый рабочий канал для всех сотрудников компании',
    scope.directorId
  ]);
  for (const cid of allColleagueIds) {
    memberRows.push([`${generalChatId}__${cid}`, generalChatId, cid, cid === scope.directorId ? 'owner' : 'member']);
  }

  for (const dept of scope.departments) {
    if (!dept.id) continue;
    const deptChatId = `dept_${scope.directorId}_${dept.id}`;
    chatRows.push([
      deptChatId,
      scope.companyKey,
      dept.id,
      `Отдел: ${dept.name}`,
      `Рабочий групповой чат отдела «${dept.name}»`,
      dept.managerId || scope.directorId
    ]);

    const memberSet = new Set<string>([scope.directorId]);
    if (dept.managerId) memberSet.add(String(dept.managerId));
    for (const eid of dept.employeeIds || []) memberSet.add(String(eid));
    for (const col of scope.colleagues) {
      if (col.departmentId === dept.id) memberSet.add(col.id);
    }

    for (const mid of memberSet) {
      if (!mid) continue;
      memberRows.push([
        `${deptChatId}__${mid}`,
        deptChatId,
        mid,
        mid === dept.managerId || mid === scope.directorId ? 'owner' : 'member'
      ]);
    }
  }

  const ops: Promise<any>[] = [];
  if (chatRows.length > 0) {
    const vals = chatRows.map(() => `(?, ?, 'department', ?, ?, ?, ?, 1)`).join(', ');
    const params = chatRows.flat();
    ops.push(
      db
        .run(
          `INSERT INTO company_chats (id, company_id, chat_type, department_id, title, description, creator_id, ai_moderation_enabled)
           VALUES ${vals} ON CONFLICT (id) DO NOTHING`,
          params
        )
        .catch(() => {})
    );
  }
  if (memberRows.length > 0) {
    const vals = memberRows.map(() => `(?, ?, ?, ?)`).join(', ');
    const params = memberRows.flat();
    ops.push(
      db
        .run(
          `INSERT INTO company_chat_members (id, chat_id, user_id, role)
           VALUES ${vals} ON CONFLICT (id) DO NOTHING`,
          params
        )
        .catch(() => {})
    );
  }

  await Promise.all(ops);
  syncedChatsCache.set(cacheKey, Date.now());
}

export function registerCommsRoutes(app: Express, getDb: () => Promise<PgDbAdapter>): void {
  // 1. Optimized Batched Overview: colleagues, user's chats, active LIVE video rooms, moderation flag
  app.get('/api/comms/overview', async (req: Request, res: Response) => {
    try {
      const userId = String(req.query.userId || '').trim();
      if (!userId) {
        return res.status(400).json({ success: false, error: 'Не указан userId' });
      }
      const db = await getDb();
      await ensureCommsSchema(db);

      const scope = await resolveCompanyScope(db, userId);
      if (!scope) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      await ensureCompanyAndDepartmentChats(db, scope);

      const onlineSet = new Set(getOnlineUserIdsForCompany(scope.companyKey));
      const colleagues = scope.colleagues.map((c) => ({
        ...c,
        online: onlineSet.has(c.id) || isUserOnline(c.id) || c.id === userId
      }));
      const colleagueById = new Map(colleagues.map((c) => [c.id, c]));

      const [myMemberships, activeRooms, modCfg] = await Promise.all([
        db.all(`SELECT chat_id, role, last_read_at, is_muted FROM company_chat_members WHERE user_id = ?`, [userId]).catch(() => []),
        db
          .all(
            `SELECT * FROM video_rooms WHERE (company_id = ? OR company_id = ?) AND is_active = 1 ORDER BY created_at DESC LIMIT 20`,
            [scope.companyKey, scope.directorId]
          )
          .catch(() => []),
        getChatModerationConfig(db)
      ]);

      const chatIds = Array.from(new Set((myMemberships || []).map((m: any) => String(m.chat_id))));
      const membershipByChatId = new Map((myMemberships || []).map((m: any) => [String(m.chat_id), m]));

      let chats: any[] = [];
      if (chatIds.length > 0) {
        const ph = chatIds.map(() => '?').join(',');
        const [chatRows, allMemberRows, lastMsgs, unreadRows] = await Promise.all([
          db
            .all(`SELECT * FROM company_chats WHERE id IN (${ph}) AND COALESCE(is_archived, 0) = 0`, chatIds)
            .catch(() => []),
          db.all(`SELECT chat_id, user_id, role FROM company_chat_members WHERE chat_id IN (${ph})`, chatIds).catch(() => []),
          db
            .all(
              `SELECT DISTINCT ON (chat_id) id, chat_id, sender_id, sender_name, message, message_kind, media_type, file_name, transcript_text, created_at
               FROM company_chat_messages
               WHERE chat_id IN (${ph}) AND deleted_at IS NULL
               ORDER BY chat_id, created_at DESC`,
              chatIds
            )
            .catch(() => []),
          db
            .all(
              `SELECT m.chat_id, COUNT(*)::int as cnt
               FROM company_chat_messages m
               JOIN company_chat_members mb ON mb.chat_id = m.chat_id AND mb.user_id = ?
               WHERE m.chat_id IN (${ph})
                 AND m.deleted_at IS NULL
                 AND m.sender_id != ?
                 AND (mb.last_read_at IS NULL OR m.created_at > mb.last_read_at)
               GROUP BY m.chat_id`,
              [userId, ...chatIds, userId]
            )
            .catch(() => [])
        ]);

        const membersByChat = new Map<string, any[]>();
        for (const mr of allMemberRows || []) {
          const cid = String(mr.chat_id);
          if (!membersByChat.has(cid)) membersByChat.set(cid, []);
          const col = colleagueById.get(String(mr.user_id));
          membersByChat.get(cid)!.push({
            userId: String(mr.user_id),
            role: String(mr.role || 'member'),
            name: col?.name || 'Коллега',
            position: col?.position || '',
            avatarUrl: col?.avatarUrl || '',
            online: Boolean(col?.online)
          });
        }

        const lastMsgByChat = new Map((lastMsgs || []).map((lm: any) => [String(lm.chat_id), lm]));
        const unreadByChat = new Map((unreadRows || []).map((u: any) => [String(u.chat_id), Number(u.cnt || 0)]));

        chats = (chatRows || []).map((chatRow: any) => {
          const cid = String(chatRow.id);
          const membership = membershipByChatId.get(cid);
          const members = membersByChat.get(cid) || [];
          const lastMsg = lastMsgByChat.get(cid) || null;
          const unreadCount = unreadByChat.get(cid) || 0;

          let displayTitle = String(chatRow.title || 'Чат');
          let peer: any = null;
          if (chatRow.chat_type === 'direct') {
            const other = members.find((m) => m.userId !== userId) || members[0];
            if (other) {
              displayTitle = other.name;
              peer = other;
            }
          }

          return {
            id: cid,
            companyId: String(chatRow.company_id || scope.companyKey),
            chatType: String(chatRow.chat_type || 'group'),
            departmentId: chatRow.department_id ? String(chatRow.department_id) : null,
            title: displayTitle,
            description: chatRow.description || '',
            creatorId: String(chatRow.creator_id || ''),
            aiModerationEnabled: Number(chatRow.ai_moderation_enabled ?? 1) === 1,
            moderationPrompt: chatRow.moderation_prompt || '',
            isMuted: Number(membership?.is_muted ?? 0) === 1,
            unreadCount,
            members,
            peer,
            lastMessage: lastMsg,
            lastMessageAt: chatRow.last_message_at || lastMsg?.created_at || chatRow.created_at
          };
        });

        chats.sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
      }

      // Batch video room members & auto-close empty/dead video rooms so ghost rooms never linger
      const enrichedRooms: any[] = [];
      const roomIds = (activeRooms || []).map((r: any) => String(r.id));
      if (roomIds.length > 0) {
        const rph = roomIds.map(() => '?').join(',');
        const allRoomMembers = await db
          .all(`SELECT room_id, user_id, display_name, avatar_url, is_camera_on, is_mic_on, last_ping FROM video_room_members WHERE room_id IN (${rph})`, roomIds)
          .catch(() => []);
        const rmByRoom = new Map<string, any[]>();
        for (const m of allRoomMembers || []) {
          const rid = String(m.room_id);
          if (!rmByRoom.has(rid)) rmByRoom.set(rid, []);
          rmByRoom.get(rid)!.push(m);
        }

        const baseUrl = getBaseUrlFromRequest(req);
        const staleEmptyIds: string[] = [];
        for (const room of activeRooms || []) {
          const rid = String(room.id);
          const liveWsIds = getLiveRoomUserIds(rid);
          const dbMembers = rmByRoom.get(rid) || [];
          const ageMs = room.created_at ? Date.now() - new Date(room.created_at).getTime() : 999999;

          // A room is genuinely live only if it has WebSocket-connected users OR fresh (<45s) members
          const activeMembers = liveWsIds.length > 0
            ? dbMembers.filter((m) => liveWsIds.includes(String(m.user_id)))
            : ageMs < 45_000
              ? dbMembers
              : [];

          if (activeMembers.length === 0) {
            if (ageMs > 25_000) staleEmptyIds.push(rid);
            continue;
          }

          const joinPath = `/cabinet/comms?room=${encodeURIComponent(rid)}${room.chat_id ? `&chat=${encodeURIComponent(String(room.chat_id))}` : ''}`;
          enrichedRooms.push({
            id: rid,
            chatId: room.chat_id ? String(room.chat_id) : null,
            roomType: String(room.room_type || 'group'),
            title: String(room.title || 'Видеовстреча'),
            hostId: String(room.host_id),
            transcriptionEnabled: Number(room.transcription_enabled ?? 1) === 1,
            joinPath,
            joinUrl: `${baseUrl}${joinPath}`,
            createdAt: room.created_at,
            members: activeMembers
          });
        }

        if (staleEmptyIds.length > 0) {
          const sph = staleEmptyIds.map(() => '?').join(',');
          void Promise.all([
            db.run(`DELETE FROM video_room_members WHERE room_id IN (${sph})`, staleEmptyIds).catch(() => {}),
            db.run(`UPDATE video_rooms SET is_active = 0, ended_at = CURRENT_TIMESTAMP WHERE id IN (${sph})`, staleEmptyIds).catch(() => {})
          ]);
        }
      }

      return res.json({
        success: true,
        companyKey: scope.companyKey,
        directorId: scope.directorId,
        colleagues,
        chats,
        activeVideoRooms: enrichedRooms,
        moderationEnabled: Boolean(modCfg.is_active)
      });
    } catch (err: any) {
      console.error('[Comms overview error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка загрузки чатов' });
    }
  });

  // 2. Get or create Direct 1-on-1 Chat
  app.post('/api/comms/chats/direct', async (req: Request, res: Response) => {
    try {
      const userId = String(req.body?.userId || '').trim();
      const peerId = String(req.body?.peerId || '').trim();
      if (!userId || !peerId || userId === peerId) {
        return res.status(400).json({ success: false, error: 'Укажите собеседника из вашей компании' });
      }

      const db = await getDb();
      await ensureCommsSchema(db);
      const scope = await resolveCompanyScope(db, userId);
      if (!scope) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

      const peer = scope.colleagues.find((c) => c.id === peerId);
      if (!peer) {
        return res.status(403).json({ success: false, error: 'Личные чаты доступны только внутри вашей компании' });
      }

      const pair = [userId, peerId].sort();
      const directId = `direct_${pair[0]}_${pair[1]}`;
      const existing = await db.get(`SELECT * FROM company_chats WHERE id = ? LIMIT 1`, [directId]).catch(() => null);

      if (!existing) {
        await db.run(
          `INSERT INTO company_chats (id, company_id, chat_type, title, creator_id, ai_moderation_enabled)
           VALUES (?, ?, 'direct', ?, ?, 1)
           ON CONFLICT (id) DO NOTHING`,
          [directId, scope.companyKey, `${scope.userName} — ${peer.name}`, userId]
        );
        await db.run(
          `INSERT INTO company_chat_members (id, chat_id, user_id, role)
           VALUES (?, ?, ?, 'member'), (?, ?, ?, 'member')
           ON CONFLICT (id) DO NOTHING`,
          [`${directId}__${pair[0]}`, directId, pair[0], `${directId}__${pair[1]}`, directId, pair[1]]
        );
      }

      return res.json({ success: true, chatId: directId, peer });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка создания личного чата' });
    }
  });

  // 3. Create Group Chat
  app.post('/api/comms/chats/group', async (req: Request, res: Response) => {
    try {
      const userId = String(req.body?.userId || '').trim();
      const title = String(req.body?.title || '').trim();
      const description = String(req.body?.description || '').trim();
      const memberIdsInput = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map(String) : [];
      const aiModerationEnabled = req.body?.aiModerationEnabled !== undefined ? (req.body.aiModerationEnabled ? 1 : 0) : 1;
      const moderationPrompt = req.body?.moderationPrompt ? String(req.body.moderationPrompt) : null;

      if (!userId || !title) {
        return res.status(400).json({ success: false, error: 'Укажите название группового чата' });
      }

      const db = await getDb();
      await ensureCommsSchema(db);
      const scope = await resolveCompanyScope(db, userId);
      if (!scope) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

      const allowedIds = new Set(scope.colleagues.map((c) => c.id));
      const finalMembers = Array.from(
        new Set([userId, ...memberIdsInput.filter((id: string) => allowedIds.has(id))])
      );

      const chatId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await db.run(
        `INSERT INTO company_chats (id, company_id, chat_type, title, description, creator_id, ai_moderation_enabled, moderation_prompt, last_message_at)
         VALUES (?, ?, 'group', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [chatId, scope.companyKey, title, description, userId, aiModerationEnabled, moderationPrompt]
      );

      if (finalMembers.length > 0) {
        const vals = finalMembers.map(() => `(?, ?, ?, ?)`).join(', ');
        const params = finalMembers.flatMap((uid) => [
          `${chatId}__${uid}`,
          chatId,
          uid,
          uid === userId ? 'owner' : 'member'
        ]);
        await db.run(
          `INSERT INTO company_chat_members (id, chat_id, user_id, role) VALUES ${vals} ON CONFLICT (id) DO NOTHING`,
          params
        );
      }

      broadcastToCompany(scope.companyKey, 'chat:created', { chatId, title, creatorId: userId });

      return res.json({ success: true, chatId, memberCount: finalMembers.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка создания группового чата' });
    }
  });

  // 4. Update Group Chat settings / members
  app.patch('/api/comms/chats/:chatId', async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const userId = String(req.body?.userId || '').trim();
      if (!userId) return res.status(400).json({ success: false, error: 'Не указан userId' });

      const db = await getDb();
      await ensureCommsSchema(db);
      const chatRow = await db.get(`SELECT * FROM company_chats WHERE id = ? LIMIT 1`, [chatId]).catch(() => null);
      if (!chatRow) return res.status(404).json({ success: false, error: 'Чат не найден' });

      const scope = await resolveCompanyScope(db, userId);
      if (!scope) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

      const nextTitle = req.body?.title !== undefined ? String(req.body.title).trim() || chatRow.title : chatRow.title;
      const nextModEnabled =
        req.body?.aiModerationEnabled !== undefined
          ? req.body.aiModerationEnabled
            ? 1
            : 0
          : Number(chatRow.ai_moderation_enabled ?? 1);
      const nextPrompt =
        req.body?.moderationPrompt !== undefined ? String(req.body.moderationPrompt || '') : chatRow.moderation_prompt;
      const nextArchived = req.body?.archive !== undefined ? (req.body.archive ? 1 : 0) : Number(chatRow.is_archived ?? 0);

      await db.run(
        `UPDATE company_chats SET title = ?, ai_moderation_enabled = ?, moderation_prompt = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nextTitle, nextModEnabled, nextPrompt, nextArchived, chatId]
      );

      if (Array.isArray(req.body?.memberIds) && chatRow.chat_type !== 'direct') {
        const allowedIds = new Set(scope.colleagues.map((c) => c.id));
        const nextIds = Array.from(
          new Set([String(chatRow.creator_id || userId), ...req.body.memberIds.map(String).filter((id: string) => allowedIds.has(id))])
        );
        await db.run(`DELETE FROM company_chat_members WHERE chat_id = ?`, [chatId]);
        if (nextIds.length > 0) {
          const vals = nextIds.map(() => `(?, ?, ?, ?)`).join(', ');
          const params = nextIds.flatMap((uid) => [
            `${chatId}__${uid}`,
            chatId,
            uid,
            uid === chatRow.creator_id ? 'owner' : 'member'
          ]);
          await db.run(
            `INSERT INTO company_chat_members (id, chat_id, user_id, role) VALUES ${vals} ON CONFLICT (id) DO NOTHING`,
            params
          );
        }
      }

      broadcastToCompany(scope.companyKey, 'chat:updated', { chatId, title: nextTitle });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка обновления чата' });
    }
  });

  // 5. Mark Chat as Read
  app.post('/api/comms/chats/:chatId/read', async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const userId = String(req.body?.userId || '').trim();
      if (!userId) return res.status(400).json({ success: false, error: 'Не указан userId' });
      const db = await getDb();
      await ensureCommsSchema(db);
      await db.run(
        `UPDATE company_chat_members SET last_read_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_id = ?`,
        [chatId, userId]
      );
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка отметки прочтения' });
    }
  });

  // 6. Get Chat Messages (parallel fast fetch, latest 120 chronological)
  app.get('/api/comms/chats/:chatId/messages', async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const userId = String(req.query.userId || '').trim();
      const db = await getDb();
      await ensureCommsSchema(db);

      const [member, rowsDesc] = await Promise.all([
        userId
          ? db.get(`SELECT id FROM company_chat_members WHERE chat_id = ? AND user_id = ? LIMIT 1`, [chatId, userId]).catch(() => null)
          : Promise.resolve({ id: 'ok' }),
        db
          .all(
            `SELECT * FROM company_chat_messages WHERE chat_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 120`,
            [chatId]
          )
          .catch(() => [])
      ]);

      if (userId && !member) {
        return res.status(403).json({ success: false, error: 'Нет доступа к выбранному чату' });
      }

      if (userId) {
        void db
          .run(`UPDATE company_chat_members SET last_read_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_id = ?`, [
            chatId,
            userId
          ])
          .catch(() => {});
      }

      const rows = (rowsDesc || []).reverse();
      const messages = rows.map((r: any) => {
        let invitePayload = null;
        if (r.invite_payload_json) {
          try {
            invitePayload = JSON.parse(String(r.invite_payload_json));
          } catch (_) {}
        }
        return {
          id: String(r.id),
          chatId: String(r.chat_id),
          senderId: String(r.sender_id),
          senderName: String(r.sender_name || 'Сотрудник'),
          senderAvatar: String(r.sender_avatar || ''),
          message: String(r.message || ''),
          messageKind: String(r.message_kind || 'text'),
          replyToId: r.reply_to_id ? String(r.reply_to_id) : null,
          invitePayload,
          mediaUrl: r.media_url ? String(r.media_url) : null,
          mediaType: r.media_type ? String(r.media_type) : null,
          fileName: r.file_name ? String(r.file_name) : null,
          fileSize: r.file_size ? Number(r.file_size) : null,
          transcriptText: r.transcript_text ? String(r.transcript_text) : null,
          sttStatus: r.stt_status ? String(r.stt_status) : null,
          createdAt: r.created_at
        };
      });

      return res.json({ success: true, messages });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка получения сообщений' });
    }
  });

  // 7. Send Message with Mandatory Corporate Moderation (Function 763) + WebSocket + Offline Push/Telegram
  app.post('/api/comms/chats/:chatId/messages', async (req: Request, res: Response) => {
    try {
      const { chatId } = req.params;
      const {
        senderId,
        message = '',
        messageKind = 'text',
        replyToId = null,
        invitePayload = null,
        mediaUrl = null,
        mediaType = null,
        fileName = null,
        fileSize = null,
        transcriptText = null,
        sttStatus = null
      } = req.body || {};

      const cleanSenderId = String(senderId || '').trim();
      const cleanMessage = String(message || '').trim();
      if (!cleanSenderId) {
        return res.status(400).json({ success: false, error: 'Не указан отправитель' });
      }
      if (!cleanMessage && !mediaUrl && !invitePayload) {
        return res.status(400).json({ success: false, error: 'Введите текст или прикрепите файл' });
      }

      const db = await getDb();
      await ensureCommsSchema(db);

      const [chatRow, membership] = await Promise.all([
        db.get(`SELECT * FROM company_chats WHERE id = ? LIMIT 1`, [chatId]).catch(() => null),
        db.get(`SELECT * FROM company_chat_members WHERE chat_id = ? AND user_id = ? LIMIT 1`, [chatId, cleanSenderId]).catch(() => null)
      ]);
      if (!chatRow) return res.status(404).json({ success: false, error: 'Чат не найден' });
      if (!membership) return res.status(403).json({ success: false, error: 'Вы не состоите в этом чате' });

      const scope = await resolveCompanyScope(db, cleanSenderId);
      const senderInfo = scope?.colleagues.find((c) => c.id === cleanSenderId);
      const senderName = senderInfo?.name || scope?.userName || 'Сотрудник';
      const senderAvatar = senderInfo?.avatarUrl || scope?.userAvatar || '';

      const chatModerationEnabled = Number(chatRow.ai_moderation_enabled ?? 1) === 1;
      if (chatModerationEnabled && messageKind !== 'video_invite' && (cleanMessage || mediaType === 'image')) {
        const imageUrls: string[] = [];
        if (mediaUrl && (mediaType === 'image' || /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i.test(String(mediaUrl)))) {
          const absUrl = makeAbsoluteUrl(String(mediaUrl), req);
          if (/^https?:\/\//i.test(absUrl)) {
            imageUrls.push(absUrl);
          }
        }
        const modResult = await moderateCompanyMessage({
          text: cleanMessage,
          chatId,
          senderId: cleanSenderId,
          imageUrls,
          customInstruction: chatRow.moderation_prompt || null,
          chatType: (chatRow.chat_type as any) || 'group'
        });

        if (!modResult.allowed) {
          return res.status(422).json({
            success: false,
            blocked: true,
            error:
              modResult.reason ||
              'Сообщение отклонено системой безопасности: пожалуйста, придерживайтесь правил деловой переписки.'
          });
        }
      }

      const resolvedSttStatus = sttStatus || (mediaType === 'audio' ? 'processing' : null);
      const msgId = `cmsg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await Promise.all([
        db.run(
          `INSERT INTO company_chat_messages (
            id, chat_id, sender_id, sender_name, sender_avatar, message, message_kind,
            reply_to_id, invite_payload_json, media_url, media_type, file_name, file_size,
            transcript_text, stt_status, moderation_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)`,
          [
            msgId,
            chatId,
            cleanSenderId,
            senderName,
            senderAvatar,
            cleanMessage,
            String(messageKind || 'text'),
            replyToId ? String(replyToId) : null,
            invitePayload ? JSON.stringify(invitePayload) : null,
            mediaUrl ? String(mediaUrl) : null,
            mediaType ? String(mediaType) : null,
            fileName ? String(fileName) : null,
            fileSize ? Number(fileSize) : null,
            transcriptText ? String(transcriptText) : null,
            resolvedSttStatus
          ]
        ),
        db.run(`UPDATE company_chats SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [chatId]).catch(() => {}),
        db.run(`UPDATE company_chat_members SET last_read_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_id = ?`, [chatId, cleanSenderId]).catch(() => {})
      ]);

      const membersRows = await db
        .all(`SELECT user_id FROM company_chat_members WHERE chat_id = ?`, [chatId])
        .catch(() => []);
      const memberIds = (membersRows || []).map((r: any) => String(r.user_id));

      const savedMsg = {
        id: msgId,
        chatId,
        senderId: cleanSenderId,
        senderName,
        senderAvatar,
        message: cleanMessage,
        messageKind: String(messageKind || 'text'),
        replyToId: replyToId ? String(replyToId) : null,
        invitePayload,
        mediaUrl: mediaUrl ? String(mediaUrl) : null,
        mediaType: mediaType ? String(mediaType) : null,
        fileName: fileName ? String(fileName) : null,
        fileSize: fileSize ? Number(fileSize) : null,
        transcriptText: transcriptText ? String(transcriptText) : null,
        sttStatus: resolvedSttStatus,
        createdAt: new Date().toISOString()
      };

      broadcastToChat(chatId, memberIds, 'chat:message', { chatId, message: savedMsg });

      const previewText =
        cleanMessage ||
        (mediaType === 'audio'
          ? 'Голосовое сообщение'
          : mediaType === 'image'
            ? 'Фотография'
            : fileName
              ? `Файл: ${fileName}`
              : 'Новое сообщение');
      const baseUrl = getBaseUrlFromRequest(req);
      const chatUrl = `${baseUrl}/cabinet/comms?chat=${encodeURIComponent(chatId)}`;

      void (async () => {
        const colleagueById = new Map((scope?.colleagues || []).map((c) => [c.id, c]));
        for (const targetUid of memberIds) {
          if (targetUid === cleanSenderId) continue;
          if (isUserOnline(targetUid)) continue;

          const chatLabel = chatRow.chat_type === 'direct' ? senderName : `${senderName} · ${chatRow.title}`;
          await sendWebPushToUser(db, targetUid, {
            title: chatLabel,
            body: previewText.slice(0, 180),
            url: `/cabinet/comms?chat=${encodeURIComponent(chatId)}`,
            tag: `comms-chat-${chatId}`,
            category: 'system'
          }).catch(() => {});

          const col = colleagueById.get(targetUid);
          if (col?.telegramId && chatRow.chat_type === 'direct') {
            const safeSender = escapeRichText(senderName);
            const safeBody = escapeRichText(previewText.slice(0, 300));
            await sendTelegramRichMessage({
              chatId: col.telegramId,
              html: `💬 <b>Новое сообщение от коллеги: ${safeSender}</b>\n<blockquote>${safeBody}</blockquote>`,
              reply_markup: buildInlineKeyboard(`Открыть диалог|${chatUrl}`)
            }).catch(() => {});
          }
        }
      })();

      return res.json({ success: true, message: savedMsg });
    } catch (err: any) {
      console.error('[Comms send message error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка отправки сообщения' });
    }
  });

  // 7b. Transcribe an audio chat message & broadcast caption update in real time
  app.post('/api/comms/chats/:chatId/messages/:messageId/transcribe', async (req: Request, res: Response) => {
    try {
      const { chatId, messageId } = req.params;
      const db = await getDb();
      await ensureCommsSchema(db);

      const msgRow = await db
        .get(`SELECT * FROM company_chat_messages WHERE id = ? AND chat_id = ? AND deleted_at IS NULL LIMIT 1`, [
          messageId,
          chatId
        ])
        .catch(() => null);

      if (!msgRow) {
        return res.status(404).json({ success: false, error: 'Сообщение не найдено' });
      }

      const mediaUrl = String(msgRow.media_url || '').trim();
      const fileName = String(msgRow.file_name || `voice_${messageId}.webm`);
      let sttRes: { success: boolean; text: string; file_url?: string } = { success: false, text: '' };

      if (mediaUrl.startsWith('/uploads/')) {
        const localFilePath = path.join(os.tmpdir(), 'ii-rr-uploads', path.basename(mediaUrl));
        if (fs.existsSync(localFilePath)) {
          const buf = fs.readFileSync(localFilePath);
          sttRes = await runProTalkAudioTranscription({
            audioBase64: buf.toString('base64'),
            mimeType: 'audio/webm',
            userId: String(msgRow.sender_id || '91827364501'),
            fileName
          });
        }
      } else if (mediaUrl) {
        sttRes = await runProTalkAudioTranscription({
          audioUrl: makeAbsoluteUrl(mediaUrl, req),
          userId: String(msgRow.sender_id || '91827364501'),
          fileName
        });
      }

      const cleanText = String(sttRes.text || '').trim();
      const hasValidText = sttRes.success && !isSttHallucination(cleanText);
      const nextStatus = hasValidText ? 'done' : 'empty';
      const nextTranscript = hasValidText ? cleanText : null;

      await db.run(
        `UPDATE company_chat_messages SET transcript_text = ?, stt_status = ? WHERE id = ?`,
        [nextTranscript, nextStatus, messageId]
      );

      const membersRows = await db
        .all(`SELECT user_id FROM company_chat_members WHERE chat_id = ?`, [chatId])
        .catch(() => []);
      const memberIds = (membersRows || []).map((r: any) => String(r.user_id));

      let invitePayload = null;
      if (msgRow.invite_payload_json) {
        try {
          invitePayload = JSON.parse(String(msgRow.invite_payload_json));
        } catch (_) {}
      }

      const updatedMsg = {
        id: String(msgRow.id),
        chatId: String(msgRow.chat_id),
        senderId: String(msgRow.sender_id),
        senderName: String(msgRow.sender_name || 'Сотрудник'),
        senderAvatar: String(msgRow.sender_avatar || ''),
        message: String(msgRow.message || ''),
        messageKind: String(msgRow.message_kind || 'text'),
        replyToId: msgRow.reply_to_id ? String(msgRow.reply_to_id) : null,
        invitePayload,
        mediaUrl: msgRow.media_url ? String(msgRow.media_url) : null,
        mediaType: msgRow.media_type ? String(msgRow.media_type) : null,
        fileName: msgRow.file_name ? String(msgRow.file_name) : null,
        fileSize: msgRow.file_size ? Number(msgRow.file_size) : null,
        transcriptText: nextTranscript,
        sttStatus: nextStatus,
        createdAt: msgRow.created_at
      };

      broadcastToChat(chatId, memberIds, 'chat:message_updated', {
        chatId,
        messageId,
        transcriptText: nextTranscript,
        sttStatus: nextStatus,
        message: updatedMsg
      });

      return res.json({
        success: true,
        messageId,
        transcriptText: nextTranscript,
        sttStatus: nextStatus,
        message: updatedMsg
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка распознавания аудио' });
    }
  });

  // 8. Soft delete message
  app.delete('/api/comms/messages/:messageId', async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;
      const userId = String(req.query.userId || req.body?.userId || '').trim();
      if (!userId) return res.status(400).json({ success: false, error: 'Не указан userId' });

      const db = await getDb();
      await ensureCommsSchema(db);
      const msg = await db.get(`SELECT * FROM company_chat_messages WHERE id = ? LIMIT 1`, [messageId]).catch(() => null);
      if (!msg) return res.status(404).json({ success: false, error: 'Сообщение не найдено' });

      const scope = await resolveCompanyScope(db, userId);
      const canModerate =
        String(msg.sender_id) === userId ||
        ['DIRECTOR', 'ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(String(scope?.userRole || '').toUpperCase());
      if (!canModerate) {
        return res.status(403).json({ success: false, error: 'Недостаточно прав для удаления сообщения' });
      }

      await db.run(`UPDATE company_chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [messageId]);

      const membersRows = await db
        .all(`SELECT user_id FROM company_chat_members WHERE chat_id = ?`, [msg.chat_id])
        .catch(() => []);
      const memberIds = (membersRows || []).map((r: any) => String(r.user_id));
      broadcastToChat(String(msg.chat_id), memberIds, 'chat:message_deleted', {
        chatId: String(msg.chat_id),
        messageId
      });

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка удаления сообщения' });
    }
  });

  // 9. Upload attachment (image, voice note, document) for chats
  app.post('/api/comms/upload', commsUpload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Файл не передан' });
      }

      const originalName = req.file.originalname || `comms_${Date.now()}`;
      const mimeType = req.file.mimetype || 'application/octet-stream';
      const mediaType = detectMediaType(mimeType, originalName);
      let uploadedUrl = '';

      try {
        const fd = new FormData();
        const blob = new Blob([req.file.buffer], { type: mimeType });
        fd.append('file', blob, originalName);
        const upRes = await fetch('https://file.pro-talk.ru/upload_tmp', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: fd as any,
          signal: AbortSignal.timeout(45000)
        });
        if (upRes.ok) {
          const json = ((await upRes.json().catch(() => ({}))) || {}) as any;
          uploadedUrl = json?.data?.url || json?.url || '';
        }
      } catch (_) {}

      if (!uploadedUrl) {
        const uploadsDir = path.join(os.tmpdir(), 'ii-rr-uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const ext = path.extname(originalName) || (mediaType === 'audio' ? '.webm' : mediaType === 'image' ? '.jpg' : '.bin');
        const fname = `comms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
        fs.writeFileSync(path.join(uploadsDir, fname), req.file.buffer);
        uploadedUrl = `/uploads/${fname}`;
      }

      return res.json({
        success: true,
        url: uploadedUrl,
        mediaType,
        fileName: originalName,
        fileSize: req.file.size || req.file.buffer.length
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка загрузки файла' });
    }
  });

  // Register video rooms, chunked transcription & moderation endpoints
  registerCommsVideoRoutes(app, getDb);
}

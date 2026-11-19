import * as webpush from 'web-push';

export type PushCategory = 'reports' | 'motivation' | 'tasks' | 'system';

export interface PushSettingsRecord {
  user_id: string;
  push_enabled: number;
  push_reports: number;
  push_motivation: number;
  push_tasks: number;
  updated_at?: string;
}

export interface SendPushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  category?: PushCategory;
}

let schemaReadyPromise: Promise<void> | null = null;
let cachedVapid: { publicKey: string; privateKey: string; subject: string } | null = null;

function sanitizeUserId(val: any): string {
  return String(val ?? '').trim();
}

export async function ensurePushSchema(db: any): Promise<void> {
  if (!db) return;
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS push_vapid_keys (
          id TEXT PRIMARY KEY,
          public_key TEXT NOT NULL,
          private_key TEXT NOT NULL,
          subject TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          endpoint TEXT UNIQUE NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT,
          is_standalone SMALLINT DEFAULT 0,
          enabled SMALLINT DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_notification_settings (
          user_id TEXT PRIMARY KEY,
          push_enabled SMALLINT DEFAULT 1,
          push_reports SMALLINT DEFAULT 1,
          push_motivation SMALLINT DEFAULT 1,
          push_tasks SMALLINT DEFAULT 1,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      schemaReadyPromise = null;
      throw err;
    }
  })();

  return schemaReadyPromise;
}

async function getOrCreateVapidKeys(db: any): Promise<{ publicKey: string; privateKey: string; subject: string }> {
  if (cachedVapid) return cachedVapid;

  await ensurePushSchema(db);

  const envPub = process.env.VAPID_PUBLIC_KEY?.trim();
  const envPriv = process.env.VAPID_PRIVATE_KEY?.trim();
  const envSubject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@ii-rr.ru';

  if (envPub && envPriv) {
    cachedVapid = { publicKey: envPub, privateKey: envPriv, subject: envSubject };
    webpush.setVapidDetails(envSubject, envPub, envPriv);
    return cachedVapid;
  }

  const row = await db.get(`SELECT public_key, private_key, subject FROM push_vapid_keys WHERE id = 'default' LIMIT 1`).catch(() => null);
  if (row?.public_key && row?.private_key) {
    cachedVapid = {
      publicKey: String(row.public_key),
      privateKey: String(row.private_key),
      subject: String(row.subject || envSubject)
    };
    webpush.setVapidDetails(cachedVapid.subject, cachedVapid.publicKey, cachedVapid.privateKey);
    return cachedVapid;
  }

  const keys = webpush.generateVAPIDKeys();
  await db.run(
    `
    INSERT INTO push_vapid_keys (id, public_key, private_key, subject)
    VALUES ('default', ?, ?, ?)
    ON CONFLICT (id) DO NOTHING
    `,
    [keys.publicKey, keys.privateKey, envSubject]
  );

  // Re-read in case concurrent insert won
  const saved = await db.get(`SELECT public_key, private_key, subject FROM push_vapid_keys WHERE id = 'default' LIMIT 1`);
  cachedVapid = {
    publicKey: String(saved?.public_key || keys.publicKey),
    privateKey: String(saved?.private_key || keys.privateKey),
    subject: String(saved?.subject || envSubject)
  };
  webpush.setVapidDetails(cachedVapid.subject, cachedVapid.publicKey, cachedVapid.privateKey);
  return cachedVapid;
}

export async function getVapidPublicKey(db: any): Promise<string> {
  const keys = await getOrCreateVapidKeys(db);
  return keys.publicKey;
}

export async function getPushSettings(db: any, userId: string): Promise<PushSettingsRecord & { activeDevicesCount: number }> {
  await ensurePushSchema(db);
  const uid = sanitizeUserId(userId);
  if (!uid) {
    return {
      user_id: '',
      push_enabled: 1,
      push_reports: 1,
      push_motivation: 1,
      push_tasks: 1,
      activeDevicesCount: 0
    };
  }

  const row = await db
    .get(`SELECT user_id, push_enabled, push_reports, push_motivation, push_tasks, updated_at FROM user_notification_settings WHERE user_id = ? LIMIT 1`, [uid])
    .catch(() => null);

  const countRow = await db
    .get(`SELECT COUNT(*) as cnt FROM push_subscriptions WHERE user_id = ? AND enabled = 1`, [uid])
    .catch(() => ({ cnt: 0 }));

  return {
    user_id: uid,
    push_enabled: row ? Number(row.push_enabled ?? 1) : 1,
    push_reports: row ? Number(row.push_reports ?? 1) : 1,
    push_motivation: row ? Number(row.push_motivation ?? 1) : 1,
    push_tasks: row ? Number(row.push_tasks ?? 1) : 1,
    updated_at: row?.updated_at,
    activeDevicesCount: Number(countRow?.cnt || 0)
  };
}

export async function updatePushSettings(
  db: any,
  userId: string,
  patch: Partial<{
    push_enabled: boolean | number;
    push_reports: boolean | number;
    push_motivation: boolean | number;
    push_tasks: boolean | number;
  }>
): Promise<PushSettingsRecord & { activeDevicesCount: number }> {
  await ensurePushSchema(db);
  const uid = sanitizeUserId(userId);
  if (!uid) throw new Error('userId is required');

  const current = await getPushSettings(db, uid);
  const nextEnabled = patch.push_enabled !== undefined ? (patch.push_enabled ? 1 : 0) : current.push_enabled;
  const nextReports = patch.push_reports !== undefined ? (patch.push_reports ? 1 : 0) : current.push_reports;
  const nextMotivation = patch.push_motivation !== undefined ? (patch.push_motivation ? 1 : 0) : current.push_motivation;
  const nextTasks = patch.push_tasks !== undefined ? (patch.push_tasks ? 1 : 0) : current.push_tasks;

  await db.run(
    `
    INSERT INTO user_notification_settings (user_id, push_enabled, push_reports, push_motivation, push_tasks, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
      push_enabled = EXCLUDED.push_enabled,
      push_reports = EXCLUDED.push_reports,
      push_motivation = EXCLUDED.push_motivation,
      push_tasks = EXCLUDED.push_tasks,
      updated_at = CURRENT_TIMESTAMP
    `,
    [uid, nextEnabled, nextReports, nextMotivation, nextTasks]
  );

  return getPushSettings(db, uid);
}

export async function upsertPushSubscription(
  db: any,
  params: {
    userId: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string;
    isStandalone?: boolean;
  }
) {
  await ensurePushSchema(db);
  const uid = sanitizeUserId(params.userId);
  const endpoint = String(params.endpoint || '').trim();
  const p256dh = String(params.keys?.p256dh || '').trim();
  const auth = String(params.keys?.auth || '').trim();

  if (!uid || !endpoint || !p256dh || !auth) {
    throw new Error('Invalid push subscription payload');
  }

  const subId = `psub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.run(
    `
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, is_standalone, enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      is_standalone = EXCLUDED.is_standalone,
      enabled = 1,
      updated_at = CURRENT_TIMESTAMP
    `,
    [subId, uid, endpoint, p256dh, auth, String(params.userAgent || '').slice(0, 300), params.isStandalone ? 1 : 0]
  );

  return getPushSettings(db, uid);
}

export async function removePushSubscription(db: any, endpoint?: string, userId?: string) {
  await ensurePushSchema(db);
  const ep = String(endpoint || '').trim();
  const uid = sanitizeUserId(userId);
  if (ep) {
    await db.run(`DELETE FROM push_subscriptions WHERE endpoint = ?`, [ep]);
  } else if (uid) {
    await db.run(`DELETE FROM push_subscriptions WHERE user_id = ?`, [uid]);
  }
}

export async function sendWebPushToUser(
  db: any,
  userId: string,
  payload: SendPushPayload
): Promise<{ ok: boolean; sentCount: number; skippedReason?: string }> {
  try {
    const uid = sanitizeUserId(userId);
    if (!uid) return { ok: false, sentCount: 0, skippedReason: 'missing_user_id' };

    await getOrCreateVapidKeys(db);
    const settings = await getPushSettings(db, uid);

    if (settings.push_enabled === 0) {
      return { ok: true, sentCount: 0, skippedReason: 'push_disabled_by_user' };
    }

    const cat = payload.category || 'system';
    if (cat === 'reports' && settings.push_reports === 0) {
      return { ok: true, sentCount: 0, skippedReason: 'category_reports_disabled' };
    }
    if (cat === 'motivation' && settings.push_motivation === 0) {
      return { ok: true, sentCount: 0, skippedReason: 'category_motivation_disabled' };
    }
    if (cat === 'tasks' && settings.push_tasks === 0) {
      return { ok: true, sentCount: 0, skippedReason: 'category_tasks_disabled' };
    }

    const subs = await db
      .all(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND enabled = 1`, [uid])
      .catch(() => []);

    if (!subs || subs.length === 0) {
      return { ok: true, sentCount: 0, skippedReason: 'no_subscriptions' };
    }

    const bodyJson = JSON.stringify({
      title: String(payload.title || 'ИИ Ревизор').slice(0, 140),
      body: String(payload.body || '').slice(0, 320),
      url: payload.url || '/cabinet/notifications',
      tag: payload.tag || `ii-rr-${cat}-${Date.now()}`
    });

    let sentCount = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          bodyJson,
          { TTL: 60 * 60 * 12 }
        );
        sentCount++;
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.run(`DELETE FROM push_subscriptions WHERE id = ?`, [sub.id]).catch(() => {});
        } else {
          console.warn('[WebPush] Send failure:', statusCode || err?.message);
        }
      }
    }

    return { ok: true, sentCount };
  } catch (err: any) {
    console.warn('[WebPush] Dispatch error:', err?.message || err);
    return { ok: false, sentCount: 0, skippedReason: err?.message || 'dispatch_error' };
  }
}

import { Router } from 'express';
import { getDb } from '../../../src/db/initDb';
import {
  getPushSettings,
  getVapidPublicKey,
  removePushSubscription,
  sendWebPushToUser,
  updatePushSettings,
  upsertPushSubscription
} from './service';

const pushRouter = Router();

pushRouter.get('/vapid-public-key', async (_req, res) => {
  try {
    const db = await getDb();
    const publicKey = await getVapidPublicKey(db);
    res.json({ success: true, publicKey });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to get VAPID key' });
  }
});

pushRouter.get('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const userId = String(req.query.userId || req.query.user_id || '').trim();
    if (!userId) {
      return res.json({
        success: true,
        settings: {
          user_id: '',
          push_enabled: 1,
          push_reports: 1,
          push_motivation: 1,
          push_tasks: 1,
          activeDevicesCount: 0
        }
      });
    }
    const settings = await getPushSettings(db, userId);
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to load push settings' });
  }
});

pushRouter.post('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const { userId, push_enabled, push_reports, push_motivation, push_tasks } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const settings = await updatePushSettings(db, String(userId), {
      push_enabled,
      push_reports,
      push_motivation,
      push_tasks
    });
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to update push settings' });
  }
});

pushRouter.post('/subscribe', async (req, res) => {
  try {
    const db = await getDb();
    const { userId, subscription, userAgent, isStandalone } = req.body || {};
    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ success: false, error: 'Некорректные данные push-подписки' });
    }
    const settings = await upsertPushSubscription(db, {
      userId: String(userId),
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: userAgent || req.headers['user-agent'],
      isStandalone: Boolean(isStandalone)
    });
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save subscription' });
  }
});

pushRouter.post('/unsubscribe', async (req, res) => {
  try {
    const db = await getDb();
    const { endpoint, userId } = req.body || {};
    await removePushSubscription(db, endpoint, userId);
    const settings = userId ? await getPushSettings(db, String(userId)) : null;
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to unsubscribe' });
  }
});

pushRouter.post('/test', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const result = await sendWebPushToUser(db, String(userId), {
      title: '🔔 Тестовое push-уведомление ИИ Ревизора',
      body: 'Уведомления о сданных отчетах, напоминаниях и начислениях KPI успешно подключены на этом устройстве.',
      url: '/cabinet/notifications',
      tag: `test-push-${Date.now()}`,
      category: 'system'
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to send test push' });
  }
});

export default pushRouter;

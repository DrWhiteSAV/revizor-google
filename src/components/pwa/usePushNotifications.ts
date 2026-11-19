import { useState, useEffect, useCallback } from 'react';

export interface PushSettingsState {
  push_enabled: boolean;
  push_reports: boolean;
  push_motivation: boolean;
  push_tasks: boolean;
  activeDevicesCount: number;
}

const DEFAULT_SETTINGS: PushSettingsState = {
  push_enabled: true,
  push_reports: true,
  push_motivation: true,
  push_tasks: true,
  activeDevicesCount: 0
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function safeJson(res: Response): Promise<any> {
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function usePushNotifications(userId?: string | null) {
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState<PushSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkDeviceSubscription = useCallback(async () => {
    if (!isSupported) return;
    try {
      setPermission(Notification.permission);
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setIsSubscribed(false);
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(Boolean(sub));
    } catch {
      setIsSubscribed(false);
    }
  }, [isSupported]);

  const loadSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/push/settings?userId=${encodeURIComponent(userId)}`);
      const data = await safeJson(res);
      if (data?.success && data.settings) {
        setSettings({
          push_enabled: Number(data.settings.push_enabled ?? 1) === 1,
          push_reports: Number(data.settings.push_reports ?? 1) === 1,
          push_motivation: Number(data.settings.push_motivation ?? 1) === 1,
          push_tasks: Number(data.settings.push_tasks ?? 1) === 1,
          activeDevicesCount: Number(data.settings.activeDevicesCount || 0)
        });
      }
    } catch {
      // ignore transient fetch errors
    }
  }, [userId]);

  useEffect(() => {
    checkDeviceSubscription();
    loadSettings();
  }, [checkDeviceSubscription, loadSettings]);

  const subscribeDevice = useCallback(
    async (isStandalone: boolean): Promise<boolean> => {
      if (!userId) {
        setErrorMessage('Не найден профиль пользователя для привязки уведомлений.');
        return false;
      }
      if (!isSupported) {
        setErrorMessage('Ваш браузер не поддерживает Web Push уведомления. На iPhone установите сайт через Safari на экран «Домой».');
        return false;
      }

      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);
      try {
        let currentPerm = Notification.permission;
        if (currentPerm === 'default') {
          currentPerm = await Notification.requestPermission();
          setPermission(currentPerm);
        }
        if (currentPerm !== 'granted') {
          setErrorMessage('Разрешение на уведомления не выдано в настройках браузера или телефона.');
          return false;
        }

        const keyRes = await fetch('/api/push/vapid-public-key');
        const keyData = await safeJson(keyRes);
        if (!keyData?.success || !keyData.publicKey) {
          setErrorMessage('Не удалось получить ключ шифрования уведомлений с сервера.');
          return false;
        }

        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.ready;
        }
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
          });
        }

        const subRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            subscription: sub.toJSON(),
            userAgent: navigator.userAgent,
            isStandalone
          })
        });
        const subData = await safeJson(subRes);
        if (!subData?.success) {
          setErrorMessage('Не удалось сохранить push-подписку в базе данных.');
          return false;
        }

        // Also ensure global push_enabled = true when subscribing
        const prefRes = await fetch('/api/push/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, push_enabled: true })
        });
        const prefData = await safeJson(prefRes);
        if (prefData?.success && prefData.settings) {
          setSettings({
            push_enabled: Number(prefData.settings.push_enabled ?? 1) === 1,
            push_reports: Number(prefData.settings.push_reports ?? 1) === 1,
            push_motivation: Number(prefData.settings.push_motivation ?? 1) === 1,
            push_tasks: Number(prefData.settings.push_tasks ?? 1) === 1,
            activeDevicesCount: Number(prefData.settings.activeDevicesCount || 1)
          });
        }

        setIsSubscribed(true);
        setStatusMessage('Push-уведомления успешно подключены для этого устройства.');
        return true;
      } catch (err: any) {
        setErrorMessage(err?.message || 'Ошибка при подключении push-уведомлений.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [isSupported, userId]
  );

  const togglePushEnabled = useCallback(
    async (nextEnabled: boolean, isStandalone: boolean) => {
      if (!userId) return;
      setSettings((prev) => ({ ...prev, push_enabled: nextEnabled }));
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);
      try {
        const res = await fetch('/api/push/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, push_enabled: nextEnabled })
        });
        const data = await safeJson(res);
        if (data?.success && data.settings) {
          setSettings({
            push_enabled: Number(data.settings.push_enabled ?? 1) === 1,
            push_reports: Number(data.settings.push_reports ?? 1) === 1,
            push_motivation: Number(data.settings.push_motivation ?? 1) === 1,
            push_tasks: Number(data.settings.push_tasks ?? 1) === 1,
            activeDevicesCount: Number(data.settings.activeDevicesCount || 0)
          });
        }
        if (nextEnabled) {
          if (isSupported && !isSubscribed) {
            await subscribeDevice(isStandalone);
          } else {
            setStatusMessage('Push-уведомления включены.');
          }
        } else {
          setStatusMessage('Push-уведомления отключены.');
        }
      } catch {
        setErrorMessage('Не удалось обновить настройку push-уведомлений.');
      } finally {
        setLoading(false);
      }
    },
    [isSupported, isSubscribed, subscribeDevice, userId]
  );

  const updateCategory = useCallback(
    async (key: 'push_reports' | 'push_motivation' | 'push_tasks', value: boolean) => {
      if (!userId) return;
      setSettings((prev) => ({ ...prev, [key]: value }));
      try {
        const res = await fetch('/api/push/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, [key]: value })
        });
        const data = await safeJson(res);
        if (data?.success && data.settings) {
          setSettings({
            push_enabled: Number(data.settings.push_enabled ?? 1) === 1,
            push_reports: Number(data.settings.push_reports ?? 1) === 1,
            push_motivation: Number(data.settings.push_motivation ?? 1) === 1,
            push_tasks: Number(data.settings.push_tasks ?? 1) === 1,
            activeDevicesCount: Number(data.settings.activeDevicesCount || 0)
          });
        }
      } catch {
        // revert silently on next sync
      }
    },
    [userId]
  );

  const sendTestPush = useCallback(
    async (isStandalone: boolean) => {
      if (!userId) return;
      setErrorMessage(null);
      setStatusMessage(null);
      if (!isSubscribed) {
        const ok = await subscribeDevice(isStandalone);
        if (!ok) return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        const data = await safeJson(res);
        if (data?.ok) {
          if ((data.sentCount || 0) > 0) {
            setStatusMessage(`Тестовое уведомление отправлено (устройств: ${data.sentCount}).`);
          } else {
            setStatusMessage('Запрос обработан, но не найдено активной подписки на этом устройстве.');
          }
        } else {
          setErrorMessage(data?.skippedReason || 'Не удалось отправить тестовое уведомление.');
        }
      } catch {
        setErrorMessage('Ошибка сети при проверке push-уведомления.');
      } finally {
        setLoading(false);
      }
    },
    [isSubscribed, subscribeDevice, userId]
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    settings,
    loading,
    statusMessage,
    errorMessage,
    subscribeDevice,
    togglePushEnabled,
    updateCategory,
    sendTestPush
  };
}

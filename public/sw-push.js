/* Service Worker Web Push & Notification Click Handler */
self.addEventListener('push', function (event) {
  let payload = {
    title: 'ИИ Ревизор и Рапорт',
    body: 'Поступило новое уведомление.',
    url: '/cabinet/notifications',
    tag: 'ii-rr-notification'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = {
          title: parsed.title || payload.title,
          body: parsed.body || payload.body,
          url: parsed.url || payload.url,
          tag: parsed.tag || payload.tag
        };
      }
    } catch (_e) {
      try {
        const text = event.data.text();
        if (text) payload.body = text;
      } catch (_err) {}
    }
  }

  const options = {
    body: payload.body,
    icon: '/favicon-192.png',
    badge: '/favicon-48.png',
    tag: payload.tag,
    renotify: true,
    vibrate: [120, 60, 120],
    data: {
      url: payload.url || '/cabinet/notifications'
    }
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || '/cabinet/notifications';
  let targetUrl = rawUrl;
  try {
    targetUrl = new URL(rawUrl, self.location.origin).href;
  } catch (_e) {
    targetUrl = self.location.origin + '/cabinet/notifications';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && client.url.indexOf(self.location.origin) === 0) {
          if (typeof client.navigate === 'function') {
            client.navigate(targetUrl).catch(function () {});
          }
          if (typeof client.focus === 'function') {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

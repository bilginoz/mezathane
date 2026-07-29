// Mezathane.tr service worker — web push bildirimleri.
// Site/sekme KAPALI olsa bile sunucudan gelen push'u gösterir.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || 'Mezathane.tr';
  const options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: data.url || '/' },
    tag: data.tag || undefined, // aynı tag'li bildirim üst üste yığılmaz
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca ilgili sayfayı aç (açık sekme varsa ona odaklan).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Yeni service worker'ı hemen devreye al.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

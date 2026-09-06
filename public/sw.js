// Smoke Stack Pitmaster - Progressive Web App & Cross-Format Service Worker
const CACHE_NAME = 'smokestack-shell-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Navigation strategy: Network first with cache fallback.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Never cache release metadata; installed clients must see the deployment's
  // current build before deciding whether to refresh.
  if (new URL(event.request.url).pathname === '/version.json') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Stale-while-revalidate for static assets. If the device is offline and the
  // asset is already cached, return the cached copy without failing the app.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkUpdate = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        });

      if (cachedResponse) {
        networkUpdate.catch(() => {/* Silent offline refresh failure */});
        return cachedResponse;
      }

      return networkUpdate;
    })
  );
});

// Background Push Notification Event Handling for Mobile PWAs and Browsers.
self.addEventListener('push', (event) => {
  let data = {
    title: '🔥 Smoke Stack Alert',
    body: 'Time to check internal meat temperature & pit status!',
    url: '/',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 400],
    data: data.url || '/',
    actions: [
      { action: 'open_app', title: 'Open Smoke Stack' }
    ],
    tag: data.tag || 'smokestack-cook-alert',
    renotify: true,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🔥 Smoke Stack Reminder', options)
  );
});

// Open the requested cook/app destination from a mobile notification. Existing
// PWA windows are navigated before focus so a notification deep link is not lost.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data || '/', self.location.origin);
  if (targetUrl.origin !== self.location.origin) {
    targetUrl.href = self.location.origin + '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          try {
            await client.navigate(targetUrl.href);
          } catch {
            // Some installed-web-app containers may reject navigate; focus the
            // existing Smoke Stack window rather than dropping the alert.
          }
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl.href);
      }
      return undefined;
    })
  );
});

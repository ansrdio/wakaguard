/* eslint-disable no-undef */
const CACHE_NAME = 'wakaguard-v1';
const STATIC_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase')
  ) {
    return;
  }

  const isNavigationRequest = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!isNavigationRequest && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (isNavigationRequest) return caches.match('/');
          return new Response('Offline', { status: 503 });
        })
      )
  );
});

/**
 * FCM background notifications
 * Uses compat SDK for SW compatibility. The version is filled in at build time
 * so it matches the Firebase version the app is built with.
 * If this part cannot load, the offline cache above must keep working.
 */
try {
  importScripts('https://www.gstatic.com/firebasejs/__FIREBASE_VERSION__/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/__FIREBASE_VERSION__/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: '__FIREBASE_API_KEY__',
    authDomain: '__FIREBASE_AUTH_DOMAIN__',
    projectId: '__FIREBASE_PROJECT_ID__',
    storageBucket: '__FIREBASE_STORAGE_BUCKET__',
    messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
    appId: '__FIREBASE_APP_ID__',
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || payload?.data?.title || 'WakaGuard';
    const body = payload?.notification?.body || payload?.data?.body || 'New notification from WakaGuard';
    const url = payload?.fcmOptions?.link || payload?.data?.link || payload?.data?.url || '/';

    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      requireInteraction: true,
      data: { url },
    });
  });
} catch (error) {
  console.warn('Background notifications are unavailable:', error);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url === url) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

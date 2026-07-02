import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const APP_URL = '/IronFit/';

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'IronFit', body: event.data?.text() || '' };
  }

  const title = data.title || 'IronFit';
  const options = {
    body: data.body || '',
    tag: data.tag,
    icon: `${APP_URL}icon-192.png`,
    badge: `${APP_URL}icon-192.png`,
    data: { url: data.url || APP_URL },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || APP_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(APP_URL));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

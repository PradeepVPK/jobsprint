// Caches the app shell so the share screen opens instantly, even offline.
// Bump VERSION after changing any file so phones pick up the update.
const VERSION = 'jobsprint-v2';
const SHELL = ['./', 'index.html', 'parse.js', 'manifest.webmanifest', 'icons/icon192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never touch webhook calls
  // Share-target opens "./?text=…" → serve the cached page, ignoring the query.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone(); // clone now, before the page consumes the body
          caches.open(VERSION).then((c) => c.put(url.origin + url.pathname, copy)); // one entry per file, not per share
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

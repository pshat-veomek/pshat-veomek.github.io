// Simple offline support: pages are fetched from the network first; the last copy is kept for offline reading.
const C = 'pv-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r).then(m => m || caches.match('/'))));
});

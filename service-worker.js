const CACHE = 'nova-v5';
const ASSETS = ['/', '/index.html', '/mobile.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('railway.app')) return;

  const url = new URL(e.request.url);

  // Never cache or intercept the dashboard's backend. These responses are
  // per-request and depend on the session cookie — serving a stale one is
  // worse than being offline.
  if (url.pathname.startsWith('/api/')) return;

  // Pages, including extensionless ones like /dashboard that cleanUrls serves.
  const hasFileExtension = /\.[a-z0-9]+$/i.test(url.pathname);
  const isPage = url.pathname === '/' || url.pathname.endsWith('.html') || !hasFileExtension;

  if (isPage) {
    // Network-first: always try for the latest, fall back to cache if offline.
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for genuine static assets (icons, manifest, audio).
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

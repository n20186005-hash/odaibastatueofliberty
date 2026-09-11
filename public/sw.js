/* Statue of Liberty Odaiba — Service Worker (PWA support) */
const CACHE_NAME = 'odaiba-liberty-v1';
const PRECACHE = [
  '/ja/',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/gallery/odaiba-statue-of-liberty-1-800.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  // 跨域资源（Google Maps、GA4、AdSense 等）不拦截
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，离线时回退到缓存或首页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/ja/') || caches.match('/'))
        )
    );
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      });
    })
  );
});

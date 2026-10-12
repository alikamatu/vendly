// Vendly PWA Service Worker
const CACHE_NAME = 'vendly-pwa-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
];

// Install: Cache core assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Pre-caching warning:', err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate: Clean up outdated caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET requests and chrome-extension / analytics calls
  if (req.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Only handle same-origin requests in the service worker.
  // Third-party media (Cloudinary CDN images/videos, Google avatars, Paystack, Sentry)
  // must bypass the service worker completely so the browser handles them natively with
  // standard HTTP caching, proper range requests for video streaming, and zero opaque-response bugs.
  if (url.origin !== self.location.origin) {
    return;
  }

  // API calls & dynamic endpoints: Network only
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('render.com') ||
    url.port === '1000'
  ) {
    return;
  }

  // Navigation requests (HTML pages): Network-first with cached fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            return cached || caches.match('/');
          });
        }),
    );
    return;
  }

  // Static assets (images, fonts, scripts, css): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => cachedRes);

      return cachedRes || fetchPromise;
    }),
  );
});

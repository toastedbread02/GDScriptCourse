const CACHE_NAME = 'gdscript-quest-v2';
const FILES = ['index.html', 'style.css', 'accessibility.css', 'favicon.svg', 'course-data.js', 'storage.js', 'validator.js', 'gamification.js', 'practice.js', 'offline.js', 'app.js'];

self.addEventListener('install', (event) => {
  const urls = [self.registration.scope, ...FILES.map((file) => new URL(file, self.registration.scope).href)];
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urls)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('gdscript-quest-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const offlineCopy = () => caches.match(event.request).then((cached) => {
    if (cached) return cached;
    if (event.request.mode === 'navigate') return caches.match(self.registration.scope);
    return Response.error();
  });
  event.respondWith(fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone());
    }
    return response;
  }).catch(offlineCopy));
});

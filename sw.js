const CACHE_NAME = 'easy-docs-v3';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/checklist.js',
  'js/data.js',
  'js/navigation.js',
  'assests/image/icons/icon-192.png',
'assests/image/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

const CACHE_NAME = 'gto-dojo-v4';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/game.js',
    './js/gto.js',
    './js/stats.js',
    './js/ui.js',
    './js/quiz.js',
    './js/range_viewer.js',
    './data/preflop/cash_6max.json',
    './data/postflop/strategies.json',
    './manifest.json'
];

// Install
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
            )
        )
    );
    self.clients.claim();
});

// Fetch — cache first, then network
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
});

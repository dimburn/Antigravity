const CACHE_NAME = 'gto-dojo-v17';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/game.js',
    './js/gto.js',
    './js/stats.js',
    './js/ui.js',
    './js/ai.js',
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

// Activate — 古いキャッシュを削除
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

// Fetch — network first, cache fallback（常に最新を取得）
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});

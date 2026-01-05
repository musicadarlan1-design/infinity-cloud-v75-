const CACHE_NAME = "infinity-ultra-v75-5-3";

const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js"
];

self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    if (e.request.url.includes("api.telegram.org")) return;
    e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});


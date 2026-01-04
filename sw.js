const CACHE_NAME = "infinity-v75-4-img"; // Atualizado para forçar o navegador a baixar o novo CSS
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"
];

self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(caches.keys().then((k) => Promise.all(k.map((i) => i !== CACHE_NAME ? caches.delete(i) : null))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
    if (e.request.url.includes("api.telegram.org")) {
        e.respondWith(fetch(e.request));
        return;
    }
    e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});


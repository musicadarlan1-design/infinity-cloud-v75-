// SERVICE WORKER V75.5 ULTRA
const CACHE_NAME = "infinity-v75-5-ultra";
const ASSETS = ["./", "./index.html", "./style.css", "./script.js", "./manifest.json", 
"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
"https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js",
"https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js"];

self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => k !== CACHE_NAME ? caches.delete(k) : null))));
});

self.addEventListener("fetch", (e) => {
    if (e.request.url.includes("api.telegram.org")) return;
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});


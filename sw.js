const CACHE_NAME = "infinity-v75-3";
const ASSETS = ["./", "./index.html", "./style.css", "./script.js", "./manifest.json"];
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

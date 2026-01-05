const CACHE_NAME = "infinity-v75-3-fix";
const ASSETS = ["./", "./index.html", "./style.css", "./script.js", "./manifest.json"];
self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});
self.addEventListener("fetch", (e) => {
    if (e.request.url.includes("api.telegram.org")) return;
    e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

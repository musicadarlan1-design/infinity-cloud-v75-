// INFINITY CLOUD SERVICE WORKER - VERSÃO ESTÁVEL
const CACHE_NAME = "infinity-stable-cache-v1";

// Lista de arquivos para funcionamento offline básico
const ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"
];

// INSTALAÇÃO: Baixa os arquivos e força a ativação imediata
self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Service Worker: Armazenando arquivos estáveis...");
            return cache.addAll(ASSETS);
        })
    );
});

// ATIVAÇÃO: Apaga todos os caches antigos das versões que deram erro
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("Service Worker: Limpando versão antiga do cache...", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// BUSCA (FETCH): Tenta buscar no cache, se não houver busca na rede
self.addEventListener("fetch", (e) => {
    // IMPORTANTE: Nunca coloca chamadas do Telegram no cache
    if (e.request.url.includes("api.telegram.org")) {
        return; 
    }

    e.respondWith(
        caches.match(e.request).then((res) => {
            // Retorna o arquivo do cache ou busca na rede
            return res || fetch(e.request).catch(() => {
                // Se estiver totalmente offline e o arquivo não estiver no cache
                console.log("Service Worker: Arquivo não encontrado no cache e sem conexão.");
            });
        })
    );
});


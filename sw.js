// INFINITY CLOUD SERVICE WORKER V75.5.2
// Alterar o nome da versão abaixo força o navegador a atualizar todos os arquivos
const CACHE_NAME = "infinity-ultra-v75-5-2";

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

// INSTALAÇÃO: Baixa os novos arquivos
self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// ATIVAÇÃO: Apaga o cache antigo (Resolve o problema da tela preta)
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("Limpando cache antigo:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// FETCH: Gerencia as requisições
self.addEventListener("fetch", (e) => {
    // NUNCA coloca chamadas da API do Telegram no cache
    if (e.request.url.includes("api.telegram.org")) {
        return; 
    }

    e.respondWith(
        caches.match(e.request).then((res) => {
            // Se estiver no cache, retorna. Se não, busca na rede.
            return res || fetch(e.request).catch(() => {
                // Opcional: Retornar uma página offline aqui se desejar
            });
        })
    );
});

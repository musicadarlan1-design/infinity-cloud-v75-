let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let MASTER_KEY=null;
let ACTIVE_FILTER="all";
let CURRENT_GALLERY_INDEX = -1;
let FILTERED_ITEMS = [];

function showScreen(id) {
    ["login-screen","setup-panel","app-panel"].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add("hidden");
    });
    const target = document.getElementById(id);
    if(target) target.classList.remove("hidden");
}

function init(){
    const hasConfig = localStorage.getItem("i58_enc_config");
    if(window.location.hash.startsWith("#login=")){
        // Lógica de Magic Login aqui se necessário
        showScreen("login-screen"); 
    } else if(!hasConfig) {
        showScreen("setup-panel");
    } else {
        showScreen("login-screen");
    }
}

async function universalLogin(isMagic){
    const pass = document.getElementById("local-pass").value;
    if(!pass) return alert("Digite a senha");
    
    try {
        const enc = localStorage.getItem("i58_enc_config");
        const dec = CryptoJS.AES.decrypt(enc, pass).toString(CryptoJS.enc.Utf8);
        const parsed = JSON.parse(dec);
        CONFIG = parsed.config;
        APP_DATA = parsed.data;
        MASTER_KEY = pass;
        showScreen("app-panel");
        renderHistory();
    } catch(e) {
        alert("Senha incorreta");
    }
}

function renderHistory(){
    const grid = document.getElementById("gallery-grid");
    const search = document.getElementById("search-input").value.toLowerCase();
    
    FILTERED_ITEMS = APP_DATA.history.filter(i => {
        const matchesSearch = i.name.toLowerCase().includes(search);
        const matchesType = ACTIVE_FILTER === "all" || i.type === ACTIVE_FILTER;
        return matchesSearch && matchesType;
    });

    grid.innerHTML = FILTERED_ITEMS.slice().reverse().map((item, idx) => `
        <div class="preview-item" onclick="openLightbox(${FILTERED_ITEMS.length - 1 - idx})">
            <div class="preview-thumb"><i class="fas fa-file"></i></div>
            <div class="preview-name">${item.name}</div>
        </div>
    `).join("");
}

function openLightbox(index) {
    CURRENT_GALLERY_INDEX = index;
    const item = FILTERED_ITEMS[index];
    const box = document.getElementById("lightbox");
    const container = document.getElementById("lightbox-media-container");
    
    document.getElementById("lb-filename").innerText = item.name;
    // Lógica para carregar imagem/video do Telegram via file_id...
    container.innerHTML = `<div style="color:#888">Carregando visualização...</div>`;
    
    box.classList.add("active");
}

function changeMedia(dir, event) {
    event.stopPropagation();
    const newIdx = CURRENT_GALLERY_INDEX + dir;
    if(newIdx >= 0 && newIdx < FILTERED_ITEMS.length) {
        openLightbox(newIdx);
    }
}

function closeLightbox(){ document.getElementById("lightbox").classList.remove("active"); }

async function copyUniversalLink(btn) {
    const longUrl = window.location.href; // Simplificado para exemplo
    btn.innerText = "⏳ Gerando...";
    const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    const short = r.ok ? await r.text() : longUrl;
    navigator.clipboard.writeText(short);
    btn.innerText = "✅ Link Copiado!";
    setTimeout(() => btn.innerText = "🔗 Copiar Link Universal", 2000);
}

document.addEventListener("DOMContentLoaded", init);


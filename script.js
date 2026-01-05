// === INFINITY CLOUD - VERSÃO ESTÁVEL RESTAURADA ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let CURRENT_FOLDER=null;

window.onload = () => { init(); };

function init() {
    const hasConfig = localStorage.getItem("i58_enc_config");
    if(hasConfig) showScreen("login-screen");
    else showScreen("setup-panel");
}

function saveLocal() {
    if(!MASTER_KEY) return;
    const payload = {config:CONFIG, data:APP_DATA};
    const enc = CryptoJS.AES.encrypt(JSON.stringify(payload), MASTER_KEY).toString();
    localStorage.setItem("i58_enc_config", enc);
}

async function universalLogin() {
    const pass = document.getElementById("local-pass").value.trim();
    try {
        const data = localStorage.getItem("i58_enc_config");
        const dec = CryptoJS.AES.decrypt(data, pass).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error();
        const full = JSON.parse(dec);
        CONFIG = full.config; APP_DATA = full.data; MASTER_KEY = pass;
        enterApp();
    } catch(e) { alert("❌ Senha incorreta!"); }
}

async function restoreProfile() {
    const t=document.getElementById("restore-token").value.trim();
    const c=document.getElementById("restore-chat").value.trim();
    const p=document.getElementById("restore-pass").value.trim();
    try {
        const chat = await fetch(`https://api.telegram.org/bot${t}/getChat?chat_id=${c}`).then(r=>r.json());
        const fid = chat.result.pinned_message.document.file_id;
        const file = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${fid}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${t}/${file.result.file_path}`;
        const raw = await fetch(`https://corsproxy.io/?` + encodeURIComponent(url)).then(r=>r.text());
        const dec = CryptoJS.AES.decrypt(raw, p).toString(CryptoJS.enc.Utf8);
        const full = JSON.parse(dec); CONFIG = full.config; APP_DATA = full.data;
        MASTER_KEY = p; saveLocal(); enterApp();
    } catch(e) { alert("Erro ao restaurar!"); }
}

function enterApp() { showScreen("app-panel"); renderHistory(); renderVault(); }

function renderHistory() {
    const g = document.getElementById("gallery-grid"); if(!g) return;
    g.innerHTML = "";
    APP_DATA.history.slice().reverse().forEach((i, idx) => {
        const card = document.createElement("div"); card.className = "preview-item";
        card.innerHTML = `<div class="preview-thumb">📄</div><div class="preview-name">${i.name}</div>`;
        card.onclick = () => openLightbox(APP_DATA.history.indexOf(i));
        g.appendChild(card);
    });
}

async function openLightbox(idx) {
    const it = APP_DATA.history[idx];
    document.getElementById("lightbox").classList.add("active");
    document.getElementById("lb-filename").innerText = it.name;
    const c = document.getElementById("lightbox-media-container");
    c.innerHTML = "Carregando...";
    try {
        const res = await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${CONFIG.body.t}/${res.result.file_path}`;
        if(it.name.match(/\.(jpg|jpeg|png|gif)$/i)) c.innerHTML = `<img src="${url}" style="max-width:100%; max-height:80vh;">`;
        else c.innerHTML = `<div style="padding:20px">Arquivo: ${it.name}</div>`;
    } catch(e) { c.innerHTML = "Erro ao carregar."; }
}

function addPassword() {
    const s=document.getElementById("v-service").value, u=document.getElementById("v-user").value, p=document.getElementById("v-pass").value;
    if(!s||!p) return alert("Faltam dados");
    APP_DATA.vault.push({s, u, p: CryptoJS.AES.encrypt(p, MASTER_KEY).toString()});
    saveLocal(); renderVault();
}

function renderVault() {
    const l = document.getElementById("vault-list"); if(!l) return;
    l.innerHTML = "";
    APP_DATA.vault.forEach((i) => {
        const pass = CryptoJS.AES.decrypt(i.p, MASTER_KEY).toString(CryptoJS.enc.Utf8);
        l.innerHTML += `<div class="box" style="margin-bottom:5px;"><b>${i.s}</b><br>User: ${i.u} | Senha: ${pass}</div>`;
    });
}

// UPLOAD BÁSICO
async function handleFileSelect(fs) {
    PENDING_FILES = Array.from(fs);
    document.getElementById("upload-preview-area").classList.remove("hidden");
    const r = document.getElementById("rename-list"); r.innerHTML = "";
    PENDING_FILES.forEach((f, x) => r.innerHTML += `<div>${f.name}</div>`);
}

async function confirmUpload() {
    PENDING_FILES.forEach(f => {
        UPLOAD_QUEUE.push({file: f, status: "pending"});
    });
    PENDING_FILES = []; document.getElementById("upload-preview-area").classList.add("hidden");
    processQueue();
}

async function processQueue() {
    if(IS_UPLOADING || !UPLOAD_QUEUE.some(q => q.status === "pending")) return;
    IS_UPLOADING = true; const i = UPLOAD_QUEUE.find(q => q.status === "pending");
    const fd = new FormData(); fd.append("chat_id", CONFIG.body.c); fd.append("document", i.file);
    try {
        const res = await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/sendDocument`, {method:"POST", body:fd}).then(r=>r.json());
        APP_DATA.history.push({name: i.file.name, file_id: res.result.document.file_id, date: new Date().toISOString()});
        i.status = "success"; saveLocal(); renderHistory();
    } catch(e) { i.status = "error"; }
    IS_UPLOADING = false; processQueue();
}

function showScreen(id) { document.querySelectorAll(".box").forEach(b => b.classList.add("hidden")); document.getElementById(id).classList.remove("hidden"); }
function switchTab(id) { document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden")); document.getElementById("tab-"+id).classList.remove("hidden"); }
function closeLightbox() { document.getElementById("lightbox").classList.remove("active"); }
function fullReset() { if(confirm("Apagar tudo?")) { localStorage.clear(); location.reload(); } }
function setSetupMode(m) { document.getElementById("mode-restore").className = m === "restore" ? "" : "hidden"; document.getElementById("mode-create").className = m === "create" ? "" : "hidden"; }


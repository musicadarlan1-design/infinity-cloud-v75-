// === INFINITY V75.5.3 - OMNI FIX ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let FILTERED_FILES=[]; let CURRENT_LB_INDEX=-1;

// SALVAMENTO
function saveLocal(){
    if(!MASTER_KEY) return;
    const payload = {config:CONFIG, data:APP_DATA};
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), MASTER_KEY).toString();
    localStorage.setItem("i58_enc_config", encrypted);
}

// INICIALIZAÇÃO
window.onload = function(){
    try {
        if(window.location.hash.startsWith("#login=")){
            showScreen("magic-login-screen");
            const raw = decodeURIComponent(window.location.hash.replace("#login=",""));
            window.MAGIC_PAYLOAD = LZString.decompressFromEncodedURIComponent(raw) || raw;
            return;
        }
        if(localStorage.getItem("i58_enc_config")) showScreen("login-screen");
        else showScreen("setup-panel");
    } catch(e) { showScreen("setup-panel"); }
};

// FUNÇÃO DE RESTAURAR (CORRIGIDA PARA O SEU BOTÃO)
async function restoreProfile(){
    const t = document.getElementById("restore-token").value.trim();
    const c = document.getElementById("restore-chat").value.trim();
    const p = document.getElementById("restore-pass").value.trim();
    const btn = document.querySelector("#mode-restore .btn-main");

    if(!t || !c || !p) return alert("Preencha todos os campos!");
    if(btn) { btn.innerText = "⏳ Buscando..."; btn.disabled = true; }

    try {
        // 1. Busca o Chat
        const chat = await fetch(`https://api.telegram.org/bot${t}/getChat?chat_id=${c}`).then(r=>r.json());
        if(!chat.ok) throw new Error("Bot ou Chat ID inválido.");
        if(!chat.result.pinned_message) throw new Error("Nenhum backup pinado encontrado.");

        // 2. Pega o Arquivo
        const fid = chat.result.pinned_message.document.file_id;
        const file = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${fid}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${t}/${file.result.file_path}`;
        
        // 3. Baixa e Descriptografa
        const raw = await fetch(url).then(r=>r.text());
        const dec = CryptoJS.AES.decrypt(raw, p).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error("Senha Mestra incorreta para este backup.");

        const full = JSON.parse(dec);
        CONFIG = full.config;
        APP_DATA = full.data;
        MASTER_KEY = p;

        saveLocal();
        alert("✅ Backup restaurado com sucesso!");
        enterApp();
    } catch(e) {
        alert("❌ Erro: " + e.message);
    } finally {
        if(btn) { btn.innerText = "🚀 Baixar & Entrar"; btn.disabled = false; }
    }
}

// LOGIN COMUM
async function universalLogin(isMagic=false){
    const pass=document.getElementById(isMagic?"magic-pass":"local-pass").value.trim();
    try{
        let data=isMagic?window.MAGIC_PAYLOAD:localStorage.getItem("i58_enc_config");
        const dec=CryptoJS.AES.decrypt(data,pass).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error();
        const full=JSON.parse(dec); CONFIG=full.config; APP_DATA=full.data;
        MASTER_KEY=pass; saveLocal(); enterApp();
    }catch(e){alert("Senha incorreta!");}
}

// TELAS E NAVEGAÇÃO
function showScreen(id){
    document.querySelectorAll(".box").forEach(b => b.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}
function enterApp(){ showScreen("app-panel"); renderHistory(); }
function setSetupMode(m){
    document.getElementById("mode-restore").classList.toggle("hidden", m!=="restore");
    document.getElementById("mode-create").classList.toggle("hidden", m!=="create");
}
function switchTab(id){
    document.querySelectorAll(".tab-content").forEach(c=>c.classList.add("hidden"));
    document.getElementById("tab-"+id).classList.remove("hidden");
}

// GALERIA
function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    g.innerHTML="";
    FILTERED_FILES = APP_DATA.history.slice().reverse();
    FILTERED_FILES.forEach((i, idx)=>{
        const card=document.createElement("div"); card.className="preview-item";
        card.innerHTML=`<div class="preview-name">${i.name}</div>`;
        card.onclick=()=>openLightbox(idx); g.appendChild(card);
    });
}
async function openLightbox(idx){
    if(idx<0 || idx>=FILTERED_FILES.length) return;
    CURRENT_LB_INDEX=idx; const it=FILTERED_FILES[idx];
    document.getElementById("lightbox").classList.add("active");
    document.getElementById("lb-filename").innerText=it.name;
    const c=document.getElementById("lightbox-media-container");
    c.innerHTML="Carregando...";
    try {
        const res = await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${CONFIG.body.t}/${res.result.file_path}`;
        if(it.name.match(/\.(jpg|jpeg|png|gif)$/i)) c.innerHTML=`<img src="${url}" style="max-width:100%;max-height:80vh;">`;
        else c.innerHTML=`<div style="padding:20px">Arquivo: ${it.name}</div>`;
    } catch(e){c.innerHTML="Erro ao carregar.";}
}
function closeLightbox(){document.getElementById("lightbox").classList.remove("active");}
function changeFile(delta){openLightbox(CURRENT_LB_INDEX+delta);}
function fullReset(){if(confirm("Apagar tudo?")){localStorage.clear();location.reload();}}

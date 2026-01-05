// === INFINITY V75.7 - VERSÃO COMPLETA E CORRIGIDA ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let ACTIVE_FILTER="all"; let CURRENT_FOLDER=null;
let FILTERED_FILES=[]; let CURRENT_LB_INDEX=-1;

// SERVICE WORKER
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}

// SALVAMENTO LOCAL
function saveLocal(){
    if(!MASTER_KEY) return;
    const payload = {config:CONFIG, data:APP_DATA};
    const enc = CryptoJS.AES.encrypt(JSON.stringify(payload), MASTER_KEY).toString();
    localStorage.setItem("i58_enc_config", enc);
}

// === FUNÇÃO DE INICIALIZAÇÃO (ESSENCIAL) ===
window.onload = function(){
    init();
};

function init(){
    try {
        // Verifica se há Link Mágico na URL
        if(window.location.hash.startsWith("#login=")){
            showScreen("magic-login-screen");
            const raw = decodeURIComponent(window.location.hash.replace("#login=",""));
            window.MAGIC_PAYLOAD = LZString.decompressFromEncodedURIComponent(raw) || raw;
            return;
        }
        // Verifica se já existe configuração salva no navegador
        if(localStorage.getItem("i58_enc_config")) {
            showScreen("login-screen");
        } else {
            showScreen("setup-panel");
        }
    } catch(e) { 
        console.error("Erro no init", e);
        showScreen("setup-panel"); 
    }
}

// LOGIN COM SENHA MESTRE
async function universalLogin(isMagic=false){
    const inputId = isMagic ? "magic-pass" : "local-pass";
    const pass = document.getElementById(inputId).value.trim();
    if(!pass) return alert("Digite a senha!");

    try {
        let data = isMagic ? window.MAGIC_PAYLOAD : localStorage.getItem("i58_enc_config");
        const dec = CryptoJS.AES.decrypt(data, pass).toString(CryptoJS.enc.Utf8);
        
        if(!dec) throw new Error("Senha incorreta");
        
        const full = JSON.parse(dec);
        CONFIG = full.config;
        APP_DATA = full.data;
        MASTER_KEY = pass;

        saveLocal();
        enterApp();
    } catch(e) {
        alert("❌ Senha Mestra incorreta!");
    }
}

// RESTAURAÇÃO DE BACKUP
async function restoreProfile(){
    const t=document.getElementById("restore-token").value.trim();
    const c=document.getElementById("restore-chat").value.trim();
    const p=document.getElementById("restore-pass").value.trim();
    if(!t||!c||!p) return alert("Faltam dados!");
    try {
        const chatRes = await fetch(`https://api.telegram.org/bot${t}/getChat?chat_id=${c}`).then(r=>r.json());
        if(!chatRes.ok) throw new Error();
        const fid = chatRes.result.pinned_message.document.file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${fid}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${t}/${fileRes.result.file_path}`;
        const raw = await fetch(`https://corsproxy.io/?` + encodeURIComponent(url)).then(r=>r.text());
        const dec = CryptoJS.AES.decrypt(raw, p).toString(CryptoJS.enc.Utf8);
        const full = JSON.parse(dec); CONFIG = full.config; APP_DATA = full.data;
        MASTER_KEY = p; saveLocal(); alert("✅ Restaurado!"); enterApp();
    } catch(e){alert("Erro ao restaurar. Verifique Token, ID e se o backup está pinado.");}
}

// CRIAÇÃO DE NOVO PERFIL
function createProfile(){
    const ht=document.getElementById("new-head-token").value, hc=document.getElementById("new-head-chat").value, bt=document.getElementById("new-body-token").value, bc=document.getElementById("new-body-chat").value, mp=document.getElementById("new-master-pass").value;
    if(!ht||!hc||!bt||!bc||!mp) return alert("Preencha todos os campos!");
    CONFIG={head:{t:ht,c:hc},body:{t:bt,c:bc,u:document.getElementById("new-body-username").value}};
    MASTER_KEY=mp; APP_DATA={history:[],vault:[],folders:[]};
    saveLocal(); enterApp();
}

// NAVEGAÇÃO E TELAS
function showScreen(id){
    document.querySelectorAll(".box").forEach(b => b.classList.add("hidden"));
    const el = document.getElementById(id);
    if(el) el.classList.remove("hidden");
}

function enterApp(){
    showScreen("app-panel");
    renderHistory();
    renderVault();
    // Gera link mágico atualizado
    const p = JSON.stringify({config:CONFIG, data:APP_DATA});
    const enc = CryptoJS.AES.encrypt(p, MASTER_KEY).toString();
    document.getElementById("magic-link-input").value = `${location.origin}${location.pathname}#login=${LZString.compressToEncodedURIComponent(enc)}`;
}

function switchTab(id){
    document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
    document.getElementById("tab-"+id).classList.remove("hidden");
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    if(event) event.currentTarget.classList.add("active");
}

// GALERIA E LIGHTBOX
function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    g.innerHTML="";
    FILTERED_FILES = APP_DATA.history.slice().reverse();
    FILTERED_FILES.forEach((i, idx)=>{
        const card=document.createElement("div"); card.className="preview-item";
        card.innerHTML=`<div class="preview-thumb">📄</div><div class="preview-name">${i.name}</div>`;
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
        const res=await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`).then(r=>r.json());
        const url=`https://api.telegram.org/file/bot${CONFIG.body.t}/${res.result.file_path}`;
        if(it.name.match(/\.(jpg|jpeg|png|gif)$/i)) c.innerHTML=`<img src="${url}" style="max-width:100%;max-height:80vh;">`;
        else c.innerHTML=`<div style="padding:20px">Arquivo: ${it.name}</div>`;
    } catch(e){c.innerHTML="Erro ao carregar mídia.";}
}

function closeLightbox(){ document.getElementById("lightbox").classList.remove("active"); }
function changeFile(d){ openLightbox(CURRENT_LB_INDEX + d); }

// COFRE
function addPassword(){
    const s=document.getElementById("v-service").value, u=document.getElementById("v-user").value, p=document.getElementById("v-pass").value;
    if(!s||!p) return alert("Faltam dados");
    APP_DATA.vault.push({s, u, p: CryptoJS.AES.encrypt(p, MASTER_KEY).toString()});
    saveLocal(); renderVault();
}

function renderVault(){
    const l=document.getElementById("vault-list"); if(!l) return;
    l.innerHTML="";
    APP_DATA.vault.forEach((i, idx)=>{
        l.innerHTML+=`<div class="box" style="margin-bottom:5px;display:flex;justify-content:space-between;">
            <span><b>${i.s}</b>: ${i.u}</span>
            <button onclick="alert('Senha: '+CryptoJS.AES.decrypt('${i.p}', MASTER_KEY).toString(CryptoJS.enc.Utf8))">👁️</button>
        </div>`;
    });
}

// UPLOAD
async function handleFileSelect(fs){
    PENDING_FILES=[]; for(const f of Array.from(fs)){ PENDING_FILES.push({file:f}); }
    const l=document.getElementById("rename-list"); l.innerHTML="";
    PENDING_FILES.forEach((i,x)=>l.innerHTML+=`<div><input id="ren-${x}" value="${i.file.name}"></div>`);
    document.getElementById("upload-preview-area").classList.remove("hidden");
}

async function confirmUpload(){
    PENDING_FILES.forEach(i=>{
        const n=document.getElementById(`ren-${PENDING_FILES.indexOf(i)}`).value;
        UPLOAD_QUEUE.push({file:new File([i.file],n), status:"pending"});
    });
    PENDING_FILES=[]; document.getElementById("upload-preview-area").classList.add("hidden");
    processQueue();
}

async function processQueue(){
    if(IS_UPLOADING || !UPLOAD_QUEUE.some(i=>i.status==="pending")) return;
    IS_UPLOADING=true; const i=UPLOAD_QUEUE.find(x=>x.status==="pending");
    const fd=new FormData(); fd.append("chat_id",CONFIG.body.c); fd.append("document",i.file);
    try {
        const res=await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/sendDocument`,{method:"POST",body:fd}).then(r=>r.json());
        APP_DATA.history.push({name:i.file.name, file_id:res.result.document.file_id, date:new Date().toISOString()});
        i.status="success"; saveLocal(); renderHistory();
    } catch(e){i.status="error";}
    IS_UPLOADING=false; processQueue();
}

function fullReset(){ if(confirm("Apagar tudo?")){ localStorage.clear(); location.reload(); } }
function setSetupMode(m){
    document.getElementById("mode-restore").classList.toggle("hidden",m!=="restore");
    document.getElementById("mode-create").classList.toggle("hidden",m!=="create");
}


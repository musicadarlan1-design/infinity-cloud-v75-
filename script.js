// === INFINITY V75.3 - PARTE 1 (CORE & BACKUP FIX) ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[];
let PENDING_FILES=[];
let IS_UPLOADING=false;
let MASTER_KEY=null;
let ACTIVE_FILTER="all";
let CURRENT_FOLDER=null;
let deferredPrompt;

// PWA
if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').then(()=>console.log('SW OK')).catch((e)=>console.error('SW Fail',e));
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); 
    deferredPrompt = e; 
    if(!window.matchMedia('(display-mode: standalone)').matches){
        const btn = document.getElementById("btn-pwa-install"); 
        if(btn) btn.classList.remove("hidden");
    }
});

function init(){
    if(window.location.hash.startsWith("#login=")){
        showScreen("magic-login-screen");
        window.MAGIC_PAYLOAD=decodeURIComponent(window.location.hash.replace("#login=",""));
        return;
    }
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const hasConfig = localStorage.getItem("i58_enc_config");
    if(!isPWA && !sessionStorage.getItem("pwa_skipped")){
        showScreen("pwa-install-screen");
        if(!deferredPrompt) document.getElementById("btn-pwa-manual").classList.remove("hidden");
    } else {
        hasConfig ? showScreen("login-screen") : showScreen("setup-panel");
    }
}

function showScreen(id){
    ["login-screen","magic-login-screen","setup-panel","app-panel","pwa-install-screen"].forEach(s=>{
        const e = document.getElementById(s);
        if(e) e.classList.add("hidden");
    });
    const t = document.getElementById(id);
    if(t) t.classList.remove("hidden");
}

async function universalLogin(isMagic=false){
    const pass=document.getElementById(isMagic?"magic-pass":"local-pass").value.trim();
    const btn=document.querySelector(".box:not(.hidden) .btn-main");
    if(btn){btn.innerText="⏳...";btn.disabled=true;}
    try{
        let enc=isMagic?window.MAGIC_PAYLOAD:localStorage.getItem("i58_enc_config");
        if(!enc) throw new Error("Sem config.");
        if(isMagic && enc.includes("%")) enc=decodeURIComponent(enc);
        const dec=CryptoJS.AES.decrypt(enc,pass).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error("Senha errada.");
        const parsed=JSON.parse(dec); 
        const cfg=parsed.config||parsed; 
        const data=parsed.data||APP_DATA;
        CONFIG=cfg; APP_DATA=data;
        if(!APP_DATA.folders)APP_DATA.folders=[]; 
        MASTER_KEY=pass; 
        saveLocal(); 
        enterApp();
    }catch(e){
        alert(e.message);
        if(btn){btn.innerText="Entrar";btn.disabled=false;}
    }
}
// === INFINITY V75.3 - PARTE 2 (REDE & UPLOAD) ===
async function fetchWithRetry(url,opt={}){
    try{
        const r=await fetch(url,opt);
        if(!r.ok)throw new Error(`HTTP ${r.status}`);
        return await r.json();
    }catch(e){
        const proxy="https://corsproxy.io/?"+encodeURIComponent(url);
        const r=await fetch(proxy,opt);
        return await r.json();
    }
}

window.manualBackup = async function(btn){
    if(!MASTER_KEY) { alert("Erro: Não logado."); return; }
    const originalText = btn ? btn.innerText : "Forçar Backup";
    if(btn) { btn.innerText = "⏳ Conectando..."; btn.disabled = true; }
    try {
        const payload={timestamp:Date.now(),config:CONFIG,data:APP_DATA};
        const enc=CryptoJS.AES.encrypt(JSON.stringify(payload),MASTER_KEY).toString();
        const fd=new FormData();
        fd.append("chat_id",CONFIG.head.c);
        fd.append("document",new Blob([enc],{type:"text/plain"}),`db_${Date.now()}.enc`);
        const r=await fetch(`https://api.telegram.org/bot${CONFIG.head.t}/sendDocument`,{method:"POST",body:fd});
        const j=await r.json();
        if(j.ok){
            if(btn) btn.innerText = "✅ SUCESSO!";
            setTimeout(()=>{ alert("Backup salvo no Telegram!"); }, 100);
        }
    } catch(e) {
        alert("FALHA NO BACKUP:\n" + e.message);
    } finally {
        setTimeout(()=>{ if(btn){btn.innerText = originalText; btn.disabled = false;} }, 3000);
    }
};

async function pushDatabase(){
    if(!MASTER_KEY)return;
    const payload={timestamp:Date.now(),config:CONFIG,data:APP_DATA};
    const enc=CryptoJS.AES.encrypt(JSON.stringify(payload),MASTER_KEY).toString();
    const fd=new FormData();
    fd.append("chat_id",CONFIG.head.c);
    fd.append("document",new Blob([enc],{type:"text/plain"}),`db_${Date.now()}.enc`);
    try{await fetch(`https://api.telegram.org/bot${CONFIG.head.t}/sendDocument`,{method:"POST",body:fd});}catch(e){}
}

async function handleFileSelect(files){
    if(!files.length)return;
    PENDING_FILES=[];
    for(const f of Array.from(files)){
        PENDING_FILES.push({file:f, hash: Date.now()});
    }
    renderRenameList();
}

function renderRenameList(){
    const l=document.getElementById("rename-list");
    const area=document.getElementById("upload-preview-area");
    if(!l)return;
    l.innerHTML = PENDING_FILES.map((f,i)=>`<div>${f.file.name}</div>`).join("");
    PENDING_FILES.length ? area.classList.remove("hidden") : area.classList.add("hidden");
}

function confirmUpload(){
    PENDING_FILES.forEach(f=>{
        UPLOAD_QUEUE.push({file:f.file, status:"pending"});
    });
    PENDING_FILES=[];
    renderRenameList();
    if(!IS_UPLOADING) processQueue();
            }
              // === INFINITY V75.3 - PARTE 3 (UI & GALLERY) ===
function enterApp(){
    showScreen("app-panel");
    renderHistory();
    updateUploadPathUI();
}

function renderHistory(){
    const g=document.getElementById("gallery-grid");
    if(!g)return;
    g.innerHTML = "";
    APP_DATA.history.slice().reverse().forEach((item, index)=>{
        const card=document.createElement("div");
        card.className="preview-item";
        card.innerHTML=`
            <div class="preview-thumb"><i class="fas fa-file icon"></i></div>
            <div class="preview-name">${item.name}</div>`;
        card.onclick=()=>openLightbox(APP_DATA.history.indexOf(item));
        g.appendChild(card);
    });
}

function openLightbox(i){
    const it=APP_DATA.history[i];
    const lb=document.getElementById("lightbox");
    document.getElementById("lb-filename").innerText=it.name;
    document.getElementById("lightbox-media-container").innerHTML=`<div style="text-align:center;font-size:50px;margin-top:20px;">📦</div>`;
    lb.classList.add("active");
}

function closeLightbox(){ document.getElementById("lightbox").classList.remove("active"); }

function switchTab(id){
    document.querySelectorAll(".tab-content").forEach(c=>c.classList.add("hidden"));
    document.getElementById("tab-"+id)?.classList.remove("hidden");
    document.querySelectorAll(".nav-tab").forEach(t=>t.classList.remove("active"));
    event.currentTarget.classList.add("active");
}

function updateUploadPathUI(){
    const el=document.getElementById("upload-dest-indicator");
    if(el) el.innerHTML = `📂 Salvando em: <b>Início</b>`;
}

function saveLocal(){
    if(!MASTER_KEY)return;
    const payload={config:CONFIG,data:APP_DATA};
    localStorage.setItem("i58_enc_config",CryptoJS.AES.encrypt(JSON.stringify(payload),MASTER_KEY).toString());
}

function fullReset(){
    if(confirm("Sair e apagar dados locais?")){
        localStorage.clear();
        location.reload();
    }
}

// Início
document.addEventListener("DOMContentLoaded", init);


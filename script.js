// === INFINITY V75.5.5 - RESTORE FIX (PARTE 1) ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let ACTIVE_FILTER="all"; let CURRENT_FOLDER=null;
let FILTERED_FILES=[]; let CURRENT_LB_INDEX=-1;

// PWA
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}

function saveLocal(){
    if(!MASTER_KEY) return;
    const payload = {config:CONFIG, data:APP_DATA};
    const enc = CryptoJS.AES.encrypt(JSON.stringify(payload), MASTER_KEY).toString();
    localStorage.setItem("i58_enc_config", enc);
}

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

function showScreen(id){
    document.querySelectorAll(".box").forEach(b => b.classList.add("hidden"));
    const el = document.getElementById(id);
    if(el) el.classList.remove("hidden");
}

// RESTAURAÇÃO REESCRITA E BLINDADA
async function restoreProfile(){
    const t=document.getElementById("restore-token").value.trim();
    const c=document.getElementById("restore-chat").value.trim();
    const p=document.getElementById("restore-pass").value.trim();
    const btn = document.querySelector("#mode-restore .btn-main");

    if(!t||!c||!p) return alert("⚠️ Preencha todos os campos!");
    if(btn) { btn.innerText = "⏳ Conectando..."; btn.disabled = true; }

    try {
        // 1. Busca informações do Chat/Canal
        const chatRes = await fetch(`https://api.telegram.org/bot${t}/getChat?chat_id=${c}`).then(r=>r.json());
        if(!chatRes.ok) throw new Error("Bot Token ou Chat ID inválido.");
        
        if(!chatRes.result.pinned_message || !chatRes.result.pinned_message.document) {
            throw new Error("Nenhum arquivo de backup pinado neste canal.");
        }

        // 2. Obtém o caminho do arquivo
        const fid = chatRes.result.pinned_message.document.file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${fid}`).then(r=>r.json());
        if(!fileRes.ok) throw new Error("Não foi possível localizar o arquivo no servidor.");

        // 3. Baixa o arquivo usando Proxy para evitar erro de segurança (CORS)
        const filePath = fileRes.result.file_path;
        const url = `https://api.telegram.org/file/bot${t}/${filePath}`;
        const proxyUrl = `https://corsproxy.io/?` + encodeURIComponent(url);
        
        const rawResponse = await fetch(proxyUrl);
        if(!rawResponse.ok) throw new Error("Erro ao baixar o arquivo do Telegram (CORS/Rede).");
        const rawData = await rawResponse.text();

        // 4. Tenta descriptografar
        const dec = CryptoJS.AES.decrypt(rawData, p).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error("Senha Mestra incorreta para este arquivo.");

        const full = JSON.parse(dec);
        CONFIG = full.config;
        APP_DATA = full.data;
        MASTER_KEY = p;

        saveLocal();
        alert("✅ Sucesso! Backup restaurado.");
        enterApp();
    } catch(e){
        alert("❌ Erro: " + e.message);
    } finally {
        if(btn) { btn.innerText = "🚀 Baixar & Entrar"; btn.disabled = false; }
    }
}
// ... (mantenha o restante das funções da Parte 1 e Parte 2 anteriores)
// === INFINITY V75.5.4 - GALERIA & UPLOAD (PARTE 2) ===

function enterApp(){ showScreen("app-panel"); renderHistory(); }

function switchTab(id){
    document.querySelectorAll(".tab-content").forEach(c=>c.classList.add("hidden"));
    document.getElementById("tab-"+id).classList.remove("hidden");
    document.querySelectorAll(".nav-tab").forEach(t=>t.classList.remove("active"));
    event.currentTarget.classList.add("active");
}

function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    g.innerHTML="";
    FILTERED_FILES = APP_DATA.history.slice().reverse();
    FILTERED_FILES.forEach((i, idx)=>{
        const card=document.createElement("div"); card.className="preview-item";
        card.innerHTML=`<div class="preview-thumb">🖼️</div><div class="preview-name">${i.name}</div>`;
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
        if(it.name.match(/\.(jpg|jpeg|png|gif)$/i)) c.innerHTML=`<img src="${url}">`;
        else c.innerHTML=`<div style="padding:20px">📦 ${it.name}</div>`;
    } catch(e){c.innerHTML="Erro ao carregar mídia.";}
}

function closeLightbox(){ document.getElementById("lightbox").classList.remove("active"); }
function changeFile(d){ openLightbox(CURRENT_LB_INDEX+d); }

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

async function manualBackup(btn){
    if(btn){btn.innerText="⏳..."; btn.disabled=true;}
    const p={config:CONFIG,data:APP_DATA};
    const enc=CryptoJS.AES.encrypt(JSON.stringify(p),MASTER_KEY).toString();
    const fd=new FormData(); fd.append("chat_id",CONFIG.head.c); fd.append("document",new Blob([enc],{type:"text/plain"}),`db.enc`);
    await fetch(`https://api.telegram.org/bot${CONFIG.head.t}/sendDocument`,{method:"POST",body:fd});
    if(btn){btn.innerText="✅ Salvo"; setTimeout(()=>btn.innerText="☁️ Backup",2000); btn.disabled=false;}
}

function fullReset(){ if(confirm("Apagar tudo?")){ localStorage.clear(); location.reload(); } }
function setSetupMode(m){
    document.getElementById("mode-restore").classList.toggle("hidden",m!=="restore");
    document.getElementById("mode-create").classList.toggle("hidden",m!=="create");
        }


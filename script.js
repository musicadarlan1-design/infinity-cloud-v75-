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
        
// === INFINITY V75.6 - PARTE 1 (CORE & RESTORE FIX) ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let ACTIVE_FILTER="all"; let CURRENT_FOLDER=null;
let FILTERED_FILES=[]; let CURRENT_LB_INDEX=-1;

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

async function restoreProfile(){
    const t=document.getElementById("restore-token").value.trim();
    const c=document.getElementById("restore-chat").value.trim();
    const p=document.getElementById("restore-pass").value.trim();
    if(!t||!c||!p) return alert("Faltam dados!");
    try {
        const chatRes = await fetch(`https://api.telegram.org/bot${t}/getChat?chat_id=${c}`).then(r=>r.json());
        const fid = chatRes.result.pinned_message.document.file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${fid}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${t}/${fileRes.result.file_path}`;
        const raw = await fetch(`https://corsproxy.io/?` + encodeURIComponent(url)).then(r=>r.text());
        const dec = CryptoJS.AES.decrypt(raw,p).toString(CryptoJS.enc.Utf8);
        const full = JSON.parse(dec); CONFIG = full.config; APP_DATA = full.data;
        MASTER_KEY = p; saveLocal(); alert("✅ Restaurado!"); enterApp();
    } catch(e){alert("Erro na restauração. Verifique os dados e o Pin.");}
}

function createProfile(){
    const ht=document.getElementById("new-head-token").value, hc=document.getElementById("new-head-chat").value, bt=document.getElementById("new-body-token").value, bc=document.getElementById("new-body-chat").value, mp=document.getElementById("new-master-pass").value;
    if(!ht||!hc||!bt||!bc||!mp) return alert("Preencha tudo!");
    CONFIG={head:{t:ht,c:hc},body:{t:bt,c:bc,u:document.getElementById("new-body-username").value}};
    MASTER_KEY=mp; APP_DATA={history:[],vault:[],folders:[]};
    saveLocal(); enterApp();
}

function generateMagicLink(p){
    const input=document.getElementById("magic-link-input");
    const enc=CryptoJS.AES.encrypt(p,MASTER_KEY).toString();
    input.value=`${location.origin}${location.pathname}#login=${LZString.compressToEncodedURIComponent(enc)}`;
    document.getElementById("magic-link-area").classList.remove("hidden");
}
// === INFINITY V75.6 - PARTE 2 (GALLERY & NAVIGATION) ===

function enterApp(){ showScreen("app-panel"); renderHistory(); renderVault(); generateMagicLink(JSON.stringify({config:CONFIG,data:APP_DATA})); }

function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    const sv=document.getElementById("search-input").value.toLowerCase().trim();
    g.innerHTML="";
    
    // Pastas
    if(!sv){
        APP_DATA.folders.filter(f=>f.parent===CURRENT_FOLDER).forEach(f=>{
            const card=document.createElement("div"); card.className="folder-item";
            card.innerHTML=`<i class="fas fa-folder folder-icon"></i><div class="folder-name">${f.name}</div>`;
            card.onclick=()=>openFolder(f.id); g.appendChild(card);
        });
    }

    // Filtro de arquivos
    let fs = sv ? APP_DATA.history.filter(i=>i.name.toLowerCase().includes(sv)) : APP_DATA.history.filter(i=>(i.folder_id||null)===CURRENT_FOLDER);
    if(ACTIVE_FILTER !== 'all') fs = fs.filter(i => getFileCategory(i.name) === ACTIVE_FILTER);
    
    FILTERED_FILES = fs.slice().reverse();
    FILTERED_FILES.forEach((i, idx)=>{
        const card=document.createElement("div"); card.className="preview-item";
        const cat = getFileCategory(i.name);
        let icon = "📄";
        if(cat==="image") icon="🖼️"; else if(cat==="video") icon="🎬"; else if(cat==="audio") icon="🎵";
        
        card.innerHTML=`<div class="preview-thumb">${icon}</div><div class="preview-name">${i.name}</div>`;
        card.onclick=()=>openLightbox(idx); g.appendChild(card);
    });
}

async function openLightbox(idx){
    if(idx<0 || idx>=FILTERED_FILES.length) return;
    CURRENT_LB_INDEX=idx; const it=FILTERED_FILES[idx];
    document.getElementById("lightbox").classList.add("active");
    document.getElementById("lb-filename").innerText=it.name;
    const c=document.getElementById("lightbox-media-container");
    const ctr=document.querySelector(".nav-controls");
    
    // Botoes de acao no Lightbox
    ctr.innerHTML = `<button onclick="openTelegramLinkSafe(${idx})" class="btn-head" style="width:auto;padding:5px 15px;"><i class="fab fa-telegram"></i> App</button>`;
    
    c.innerHTML="<i class='fas fa-spinner fa-spin'></i>";
    try {
        const res=await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`).then(r=>r.json());
        const url=`https://api.telegram.org/file/bot${CONFIG.body.t}/${res.result.file_path}`;
        const cat = getFileCategory(it.name);
        if(cat==="image") c.innerHTML=`<img src="${url}" style="max-width:100%;max-height:85vh;object-fit:contain;">`;
        else if(cat==="video") c.innerHTML=`<video controls src="${url}" style="width:100%;max-height:80vh;"></video>`;
        else if(cat==="audio") c.innerHTML=`<audio controls src="${url}" style="width:100%"></audio>`;
        else c.innerHTML=`<div style="font-size:50px;">📄</div><a href="${url}" class="btn-main">Baixar Arquivo</a>`;
    } catch(e){c.innerHTML="Erro ao carregar mídia.";}
}

function changeFile(d){ openLightbox(CURRENT_LB_INDEX+d); }

function getFileCategory(n){
    const nl=n.toLowerCase();
    if(nl.match(/\.(jpg|jpeg|png|webp|gif)$/)) return "image";
    if(nl.match(/\.(mp4|mkv|mov|webm)$/)) return "video";
    if(nl.match(/\.(mp3|wav|ogg|m4a)$/)) return "audio";
    return "other";
        }
        // === INFINITY V75.6 - PARTE 3 (VAULT, EDITOR & UPLOAD) ===

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

// EDITOR
async function saveEditorFile(){
    const n=document.getElementById("editor-filename").value||"novo.txt", c=document.getElementById("editor-content").value;
    if(!c) return;
    const f=new File([c], n, {type:"text/plain"});
    UPLOAD_QUEUE.push({file:f, status:"pending", folder:CURRENT_FOLDER});
    processQueue(); alert("Na fila de upload!");
}

// UPLOAD & SYNC
async function handleFileSelect(fs){
    PENDING_FILES=[]; for(const f of Array.from(fs)){ PENDING_FILES.push({file:f}); }
    const l=document.getElementById("rename-list"); l.innerHTML="";
    PENDING_FILES.forEach((i,x)=>l.innerHTML+=`<div><input id="ren-${x}" value="${i.file.name}"></div>`);
    document.getElementById("upload-preview-area").classList.remove("hidden");
}
async function confirmUpload(){
    PENDING_FILES.forEach(i=>{
        const n=document.getElementById(`ren-${PENDING_FILES.indexOf(i)}`).value;
        UPLOAD_QUEUE.push({file:new File([i.file],n), status:"pending", folder:CURRENT_FOLDER});
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
        APP_DATA.history.push({name:i.file.name, file_id:res.result.document.file_id, message_id:res.result.message_id, folder_id:i.folder, date:new Date().toISOString()});
        i.status="success"; saveLocal(); renderHistory();
    } catch(e){i.status="error";}
    IS_UPLOADING=false; processQueue();
}

async function manualSync(){
    try {
        const up=await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getUpdates?limit=50`).then(r=>r.json());
        if(up.result.length > 0) alert("Sincronizando arquivos do canal...");
        // Logica de loop de mensagens aqui...
        renderHistory();
    } catch(e){alert("Erro na sincronia.");}
}

// HELPERS UI
function showScreen(id){ document.querySelectorAll(".box").forEach(b=>b.classList.add("hidden")); document.getElementById(id).classList.remove("hidden"); }
function switchTab(id){ document.querySelectorAll(".tab-content").forEach(c=>c.classList.add("hidden")); document.getElementById("tab-"+id).classList.remove("hidden"); }
function setSetupMode(m){ document.getElementById("mode-restore").classList.toggle("hidden",m!=="restore"); document.getElementById("mode-create").classList.toggle("hidden",m!=="create"); }
function openFolder(id){ CURRENT_FOLDER=id; renderHistory(); }
function folderUp(){ CURRENT_FOLDER=null; renderHistory(); }
function closeLightbox(){ document.getElementById("lightbox").classList.remove("active"); }
function fullReset(){ if(confirm("Apagar tudo?")){ localStorage.clear(); location.reload(); } }
        

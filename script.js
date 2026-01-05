// === INFINITY V75.5 - PARTE 1 (CORE & COMPRESSION) ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let ACTIVE_FILTER="all"; let CURRENT_FOLDER=null;
let FILTERED_FILES=[]; let CURRENT_LB_INDEX=-1;

// PWA & SW
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}

function init(){
    if(window.location.hash.startsWith("#login=")){
        showScreen("magic-login-screen");
        // DESCOMPRESSÃO LZ-STRING
        const raw = decodeURIComponent(window.location.hash.replace("#login=",""));
        window.MAGIC_PAYLOAD = LZString.decompressFromEncodedURIComponent(raw) || raw;
        return;
    }
    const hasConfig = localStorage.getItem("i58_enc_config");
    hasConfig ? showScreen("login-screen") : showScreen("setup-panel");
}

// LOGIN SEGURO
async function universalLogin(isMagic=false){
    const pass=document.getElementById(isMagic?"magic-pass":"local-pass").value.trim();
    const btn=document.querySelector(".box:not(.hidden) .btn-main");
    if(btn){btn.innerText="⏳...";btn.disabled=true;}
    try{
        let data=isMagic?window.MAGIC_PAYLOAD:localStorage.getItem("i58_enc_config");
        const dec=CryptoJS.AES.decrypt(data,pass).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error("Senha errada.");
        const full=JSON.parse(dec); CONFIG=full.config; APP_DATA=full.data;
        MASTER_KEY=pass; saveLocal(); enterApp();
    }catch(e){alert("Erro: "+e.message);if(btn){btn.innerText="Entrar";btn.disabled=false;}}
}

// LINK MÁGICO COMPRIMIDO [web:13]
function generateMagicLink(p){
    const input=document.getElementById("magic-link-input");
    if(!input) return;
    const enc=CryptoJS.AES.encrypt(p,MASTER_KEY).toString();
    const compressed=LZString.compressToEncodedURIComponent(enc);
    input.value=`${location.origin}${location.pathname}#login=${compressed}`;
    document.getElementById("magic-link-area").classList.remove("hidden");
}

// BACKUP & SYNC
async function manualBackup(btn){
    if(btn){btn.innerText="⏳..."; btn.disabled=true;}
    const payload={config:CONFIG,data:APP_DATA};
    const enc=CryptoJS.AES.encrypt(JSON.stringify(payload),MASTER_KEY).toString();
    const fd=new FormData(); fd.append("chat_id",CONFIG.head.c); fd.append("document",new Blob([enc],{type:"text/plain"}),`db.enc`);
    try{
        const r=await fetch(`https://api.telegram.org/bot${CONFIG.head.t}/sendDocument`,{method:"POST",body:fd});
        const j=await r.json();
        if(j.ok){
            fetch(`https://api.telegram.org/bot${CONFIG.head.t}/pinChatMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:CONFIG.head.c,message_id:j.result.message_id})});
            alert("✅ Backup Salvo!");
        }
    }catch(e){alert("Erro!");} finally {if(btn){btn.innerText="☁️ Forçar Backup";btn.disabled=false;}}
}
// === INFINITY V75.5 - PARTE 2 (GALLERY & NAVIGATION) ===

function filterGallery(t,b){ACTIVE_FILTER=t; document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active")); if(b)b.classList.add("active"); renderHistory();}

function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    const sv=document.getElementById("search-input").value.toLowerCase().trim();
    
    // Pastas
    g.innerHTML="";
    if(!sv){
        APP_DATA.folders.filter(f=>f.parent===CURRENT_FOLDER).forEach(f=>{
            const card=document.createElement("div"); card.className="folder-item";
            card.innerHTML=`<i class="fas fa-folder folder-icon"></i><div class="folder-name">${f.name}</div>`;
            card.onclick=()=>openFolder(f.id); g.appendChild(card);
        });
    }

    // Arquivos (Filtragem e Cache para Navegação)
    let fs = sv ? APP_DATA.history.filter(i=>i.name.toLowerCase().includes(sv)) : APP_DATA.history.filter(i=>(i.folder_id||null)===CURRENT_FOLDER);
    if(ACTIVE_FILTER !== 'all') fs = fs.filter(i => getFileCategory(i.name, i.type) === ACTIVE_FILTER);
    
    FILTERED_FILES = fs.slice().reverse(); // Inverte para mais recentes primeiro
    document.getElementById("hist-count").innerText=FILTERED_FILES.length+" arq.";

    FILTERED_FILES.forEach((i, idx)=>{
        const card=document.createElement("div"); card.className="preview-item";
        card.innerHTML=`<div class="preview-thumb"><div class="icon">${getIcon(i)}</div></div><div class="preview-name">${i.name}</div>`;
        card.onclick=()=>openLightbox(idx);
        const th=card.querySelector(".preview-thumb"); if(i.thumb_id)loadThumbnail(i.thumb_id,th);
        g.appendChild(card);
    });
}

// NAVEGAÇÃO ENTRE ARQUIVOS [web:17]
async function openLightbox(idx){
    if(idx < 0 || idx >= FILTERED_FILES.length) return;
    CURRENT_LB_INDEX = idx;
    const it = FILTERED_FILES[idx];
    
    // Mostra/Esconde Setas
    document.querySelector(".nav-arrow.left").style.display = idx > 0 ? "flex" : "none";
    document.querySelector(".nav-arrow.right").style.display = idx < FILTERED_FILES.length - 1 ? "flex" : "none";

    const box=document.getElementById("lightbox"), c=document.getElementById("lightbox-media-container");
    box.classList.add("active"); c.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById("lb-filename").innerText=it.name;
    
    const ctr=document.querySelector(".lightbox-info .nav-controls");
    ctr.innerHTML = `<button onclick="openTelegramLinkSafe(${idx})" class="download-link" style="background:#24a1de;border:none;cursor:pointer;"><i class="fab fa-telegram-plane"></i> App</button>`;

    try{
        if(it.size > 19000000) throw new Error();
        const inf=await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`).then(r=>r.json());
        const url=`https://api.telegram.org/file/bot${CONFIG.body.t}/${inf.result.file_path}`;
        const cat = getFileCategory(it.name, it.type);
        if(cat==="image") c.innerHTML=`<img src="${url}">`;
        else if(cat==="video") c.innerHTML=`<video controls src="${url}" style="width:100%"></video>`;
        else c.innerHTML=`<div style="font-size:40px">📄</div>`;
    }catch(e){
        c.innerHTML=`<div style="padding:20px;text-align:center;"><h3>Arquivo Pesado</h3><button onclick="openTelegramLinkSafe(${idx})" class="btn-main">Abrir no Telegram</button></div>`;
    }
}

function changeFile(delta){const next=CURRENT_LB_INDEX+delta; if(next>=0 && next<FILTERED_FILES.length) openLightbox(next);}
            // === INFINITY V75.5 - PARTE 3 (UPLOAD & HELPERS) ===

async function handleFileSelect(files){
    PENDING_FILES=[];
    for(const f of Array.from(files)){ PENDING_FILES.push({file:f, status:"pending"}); }
    renderRenameList();
}

function renderRenameList(){
    const l=document.getElementById("rename-list"); l.innerHTML="";
    PENDING_FILES.forEach((i,x)=>l.innerHTML+=`<div class="rename-item"><input id="ren-${x}" value="${i.file.name}"></div>`);
    document.getElementById("upload-preview-area").classList.remove("hidden");
}

async function confirmUpload(){
    PENDING_FILES.forEach(i=>{
        const n=document.getElementById(`ren-${PENDING_FILES.indexOf(i)}`).value;
        UPLOAD_QUEUE.push({file:new File([i.file],n), status:"pending", folder:CURRENT_FOLDER});
    });
    PENDING_FILES=[]; document.getElementById("upload-preview-area").classList.add("hidden");
    if(!IS_UPLOADING) processQueue();
}

async function processQueue(){
    if(!UPLOAD_QUEUE.some(i=>i.status==="pending")){IS_UPLOADING=false; pushDatabase(); return;}
    IS_UPLOADING=true; const i=UPLOAD_QUEUE.find(x=>x.status==="pending");
    try{
        const fd=new FormData(); fd.append("chat_id",CONFIG.body.c); fd.append("document",i.file);
        const res=await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/sendDocument`,{method:"POST",body:fd}).then(r=>r.json());
        APP_DATA.history.push({name:i.file.name, file_id:res.result.document.file_id, message_id:res.result.message_id, folder_id:i.folder, date:new Date().toISOString(), size:i.file.size});
        i.status="success"; saveLocal(); renderHistory();
    }catch(e){i.status="error";}
    processQueue();
}

// HELPERS
function getFileCategory(n, t){const nl=n.toLowerCase(); if(nl.match(/\.(jpg|jpeg|png|webp|gif)$/))return "image"; if(nl.match(/\.(mp4|mkv|mov|webm)$/))return "video"; return "other";}
function getIcon(i){const cat=getFileCategory(i.name, ""); if(cat==="image")return "🖼️"; if(cat==="video")return "🎬"; return "📄";}
function showScreen(id){document.querySelectorAll(".box").forEach(b=>b.classList.add("hidden")); document.getElementById(id).classList.remove("hidden");}
function enterApp(){showScreen("app-panel"); renderHistory(); generateMagicLink(JSON.stringify({config:CONFIG,data:APP_DATA}));}
function closeLightbox(){document.getElementById("lightbox").classList.remove("active");}

init();
    

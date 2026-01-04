// === INFINITY V75.6 - PARTE 1 (CORE & PWA) ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let MASTER_KEY=null;
let ACTIVE_FILTER="all";
let CURRENT_FOLDER=null;
let CURRENT_GALLERY_INDEX = -1;
let FILTERED_ITEMS = [];
let deferredPrompt;

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
    const hasConfig = localStorage.getItem("i58_enc_config");
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if(!isPWA && !sessionStorage.getItem("pwa_skipped")){
        showScreen("pwa-install-screen");
    } else {
        hasConfig ? showScreen("login-screen") : showScreen("setup-panel");
    }
}

function saveLocal(){
    if(!MASTER_KEY)return;
    const payload={config:CONFIG,data:APP_DATA};
    localStorage.setItem("i58_enc_config",CryptoJS.AES.encrypt(JSON.stringify(payload),MASTER_KEY).toString());
}

async function getShortUrl(longUrl) {
    try {
        const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return r.ok ? await r.text() : longUrl;
    } catch(e) { return longUrl; }
}
        APP_DATA.history.push({name:i.file.name,hash:i.hash,file_id:fid,unique_id:uniq,thumb_id:th,date:new Date().toISOString(),type:typ,chat_id:msg.chat.id,message_id:msg.message_id,folder_id:i.target_folder,size:sz});
        saveLocal(); i.status="success"; if(!document.getElementById("tab-gallery").classList.contains("hidden"))renderHistory();
    }catch(e){console.error(e);i.status="error";}
    updateQueueUI(); processQueue();
}
function updateQueueUI(){const l=document.getElementById("queue-list");if(l){l.innerHTML="";UPLOAD_QUEUE.forEach(i=>{l.innerHTML+=`<div class="queue-item ${i.status}"><span>${i.file.name}</span><span>${i.status}</span></div>`;});if(UPLOAD_QUEUE.length)document.getElementById("upload-queue-list").classList.remove("hidden");}}

// GALERIA
function getFileCategory(name, type) {
    const n = name.toLowerCase();
    if (type === 'image' || n.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/)) return 'image';
    if (type === 'video' || n.match(/\.(mp4|mkv|avi|mov|webm|3gp)$/)) return 'video';
    if (type === 'audio' || n.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/)) return 'audio';
    if (n.match(/\.(txt|js|py|html|css|json|md|pdf|doc|docx|xls|xlsx|ppt|pptx|csv|rtf|xml|java|c|cpp)$/)) return 'text';
    return 'other';
}

function filterGallery(t,b){ACTIVE_FILTER=t;document.querySelectorAll(".chip").forEach(c=>c.classList.remove("active"));if(b)b.classList.add("active");renderHistory();}

function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    const sv=document.getElementById("search-input").value.toLowerCase().trim();
    const isS=sv.length>0;
    const pd=document.getElementById("folder-path"), bb=document.getElementById("btn-back-folder");
    
    if(isS){pd.innerHTML=`<i class="fas fa-search"></i> "${sv}"`;bb.style.display="none";}
    else{pd.innerHTML=CURRENT_FOLDER?`<i class="fas fa-folder-open"></i> ${APP_DATA.folders.find(f=>f.id===CURRENT_FOLDER)?.name}`:`<i class="fas fa-home"></i> Início`;bb.style.display=CURRENT_FOLDER?"block":"none";}
    g.innerHTML="";

    if(!isS){
        APP_DATA.folders.filter(f=>f.parent===CURRENT_FOLDER).forEach(f=>{
            const count = APP_DATA.history.filter(h => h.folder_id === f.id).length;
            const card=document.createElement("div"); card.className="folder-item";
            card.innerHTML=`<i class="fas fa-folder folder-icon"></i><div class="folder-name">${f.name} <span style="color:#666;font-size:9px">(${count})</span></div>`;
            card.onclick=()=>openFolder(f.id); g.appendChild(card);
        });
    }

    let fs = isS ? APP_DATA.history.filter(i=>i.name.toLowerCase().includes(sv)) : APP_DATA.history.filter(i=>(i.folder_id||null)===CURRENT_FOLDER);
    fs = fs.filter(i => {
        if(ACTIVE_FILTER === 'all') return true;
        return getFileCategory(i.name, i.type) === ACTIVE_FILTER;
    });
    
    fs.slice().reverse().forEach((i,idx)=>{
        const isHeavy = (i.size && i.size > 19000000);
        const card=document.createElement("div"); card.className="preview-item";
        const cat = getFileCategory(i.name, i.type);
        const nl = i.name.toLowerCase();

        let icon="📦"; 
        if(cat==="image") icon="🖼️";
        else if(cat==="video") icon="🎬";
        else if(cat==="audio") icon="🎵";
        else if(cat==="text") {
            if(nl.includes(".pdf")) icon="📕";
            else if(nl.includes(".doc")) icon="📘";
            else if(nl.includes(".xls")) icon="📊";
            else if(nl.includes(".ppt")) icon="📙";
            else if(nl.includes(".txt")) icon="📝";
            else icon="📄";
        }
        else if(cat==="other"){
            if(nl.includes(".zip") || nl.includes(".rar") || nl.includes(".7z")) icon="🗜️";
            else if(nl.includes(".exe") || nl.includes(".apk")) icon="🚀";
        }
        
        card.innerHTML=`
            <div class="preview-thumb">
                <div class="icon">${icon}</div>
                ${isHeavy ? `<div class="heavy-badge">TG</div>` : ''} 
                <div class="type-tag">${i.name.split('.').pop().slice(0,4)}</div>
            </div>
            <div class="preview-name">${i.name}</div>`;
        const realIdx = APP_DATA.history.indexOf(i);
        card.onclick=()=>openLightbox(realIdx);
        const th=card.querySelector(".preview-thumb"); if(i.thumb_id&&th)loadThumbnail(i.thumb_id,th);
        g.appendChild(card);
    });
    document.getElementById("hist-count").innerText=fs.length+" arq.";
}
// === INFINITY V75.3 - PARTE 3 (VAULT & LIGHTBOX BLINDADO) ===

// COFRE
function addPassword(){
    const s=document.getElementById("v-service").value, u=document.getElementById("v-user").value, p=document.getElementById("v-pass").value;
    if(!s||!p)return alert("Falta dados");
    APP_DATA.vault.push({s,u,p:CryptoJS.AES.encrypt(p,MASTER_KEY).toString()});
    saveLocal();pushDatabase();renderVault();
    document.getElementById("v-service").value="";document.getElementById("v-pass").value="";
}
function renderVault(){
    const l=document.getElementById("vault-list"); if(!l)return; l.innerHTML="";
    APP_DATA.vault.slice().reverse().forEach((i,x)=>{
        let dec="???"; try{dec=CryptoJS.AES.decrypt(i.p,MASTER_KEY).toString(CryptoJS.enc.Utf8);}catch(e){}
        const d=document.createElement("div"); d.className="vault-item";
        d.innerHTML=`
            <div class="vault-header" onclick="toggleVault(this)"><b>${i.s}</b><i class="fas fa-chevron-down"></i></div>
            <div class="vault-details">
                <div class="v-row"><span>User:</span><span>${i.u}</span></div>
                <div class="v-row">
                    <span>Pass:</span>
                    <div style="display:flex;align-items:center;">
                        <span id="pass-${x}" style="filter:blur(5px);cursor:pointer;" onclick="revealPass('${x}')">${dec}</span>
                        <button class="btn-copy" onclick="copyPass('${dec}')"><i class="fas fa-copy"></i></button>
                    </div>
                </div>
                <div class="v-actions"><button class="v-btn" style="color:#f55" onclick="delVault(${APP_DATA.vault.indexOf(i)})">Apagar</button></div>
            </div>`;
        l.appendChild(d);
    });
}
function toggleVault(el){el.parentElement.classList.toggle("active");}
function delVault(i){if(confirm("Apagar?")){APP_DATA.vault.splice(i,1);saveLocal();pushDatabase();renderVault();}}
function copyPass(txt){navigator.clipboard.writeText(txt).then(()=>alert("Copiado!"));}
function revealPass(id){const el=document.getElementById("pass-"+id);el.style.filter="none";setTimeout(()=>{if(el)el.style.filter="blur(5px)";},10000);}

// --- REDIRECIONAMENTO SEGURO (ANTI-CRASH) ---
window.openTelegramLinkSafe = function(i){
    const it = APP_DATA.history[i];
    
    // 1. Validação de Existência
    if(!it){
        alert("Erro: Arquivo não encontrado na memória.");
        return;
    }

    // 2. Validação de Message ID (Arquivos antigos não têm)
    if(!it.message_id){
        alert("⚠️ Arquivo Antigo\n\nEste arquivo foi salvo numa versão anterior e não possui o 'Link de Mensagem'.\n\nVocê precisa reenviá-lo para gerar o link.");
        return; // PONTO CRÍTICO: Para a execução aqui para não crashar o app.
    }

    // 3. Fallback de Chat ID
    let cid = it.chat_id;
    if(!cid) cid = CONFIG.body.c; // Tenta usar o do config se o do arquivo for nulo
    
    if(!cid){
        alert("⚠️ Erro de Configuração\n\nNão foi possível identificar o Chat ID deste arquivo.");
        return;
    }

    // 4. Montagem Segura do Link
    let url = "";
    try {
        if(CONFIG.body.u && CONFIG.body.u !== "null" && CONFIG.body.u !== "undefined"){
            // Canal Público
            url = `https://t.me/${CONFIG.body.u}/${it.message_id}`;
        } else {
            // Canal Privado
            const cleanCid = String(cid).replace("-100", "");
            url = `https://t.me/c/${cleanCid}/${it.message_id}`;
        }
        
        // 5. Abertura
        window.open(url, '_blank');
        
    } catch(e) {
        alert("Erro ao abrir link: " + e.message);
    }
}

// Botão "Ir ao Canal" (Upload)
function openTelegramApp(){
    if(CONFIG.body.u) {
        window.open(`https://t.me/${CONFIG.body.u}`, '_blank');
    } else if (CONFIG.body.c) {
        const cid = String(CONFIG.body.c).replace("-100", "");
        window.open(`https://t.me/c/${cid}/1`, '_blank'); 
    } else {
        window.location.href="tg://resolve";
    }
}

function moveFile(i){
    const it=APP_DATA.history[i];
    let op="0: Início\n"; APP_DATA.folders.forEach((f,x)=>op+=`${x+1}: ${f.name}\n`);
    const c=prompt("Mover para:\n"+op); if(!c)return;
    const n=parseInt(c); if(n===0)it.folder_id=null; else if(APP_DATA.folders[n-1])it.folder_id=APP_DATA.folders[n-1].id;
    saveLocal();pushDatabase();closeLightbox();renderHistory();
}

async function openLightbox(i){
    const it=APP_DATA.history[i]; if(!it)return;
    const box=document.getElementById("lightbox"), c=document.getElementById("lightbox-media-container");
    box.classList.add("active"); c.innerHTML='<i class="fas fa-spinner fa-spin" style="font-size:30px"></i>';
    document.getElementById("lb-filename").innerText=it.name;
    
    const ctr=document.querySelector(".lightbox-info .nav-controls");
    
    // BOTÃO APP CHAMA A FUNÇÃO SEGURA
    ctr.innerHTML = `
        <a id="lb-download" href="#" target="_blank" class="download-link" style="margin-right:5px;"><i class="fas fa-download"></i> Baixar</a>
        <button onclick="openTelegramLinkSafe(${i})" class="download-link" style="background:#24a1de; color:#fff; border:none; padding:8px 12px; margin-right:5px; font-size:12px; cursor:pointer;"><i class="fab fa-telegram-plane"></i> App</button>
    `;
    const mv=document.createElement("button"); mv.className="btn-sec"; mv.style.width="auto"; 
    mv.innerHTML="<i class='fas fa-exchange-alt'></i>"; mv.onclick=()=>moveFile(i); ctr.appendChild(mv);

    try{
        if(it.size && it.size > 19000000) throw new Error("Muito grande");
        const inf=await fetchWithRetry(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`);
        if(!inf.result.file_path) throw new Error("Sem path");
        
        const url=`https://api.telegram.org/file/bot${CONFIG.body.t}/${inf.result.file_path}`;
        const proxy="https://corsproxy.io/?"+encodeURIComponent(url);
        document.getElementById("lb-download").href=url;

        const cat = getFileCategory(it.name, it.type);
        if(cat==="image") c.innerHTML=`<img src="${url}">`;
        else if(cat==="video") c.innerHTML=`<div style="text-align:center"><div style="font-size:40px;margin-bottom:10px">🎬</div><a href="${url}" class="download-link">Assistir Player</a></div>`;
        else if(cat==="audio") c.innerHTML=`<audio controls autoplay src="${url}" style="width:100%"></audio>`;
        else if(cat==="text"){const t=await(await fetch(proxy)).text();c.innerHTML=`<pre style="text-align:left;max-height:50vh;overflow:auto;font-size:11px">${t}</pre>`;}
        else c.innerHTML=`<div style="text-align:center;font-size:40px">📦</div><p style="text-align:center;font-size:11px;color:#aaa">Arquivo</p>`;
    }catch(e){
        document.getElementById("lb-download").style.display="none";
        // Mesmo no erro (arquivo pesado), chamamos a função segura
        c.innerHTML=`
            <div style="text-align:center;padding:20px;">
                <h3 style="color:#f55">Arquivo Grande / Expirado</h3>
                <p style="font-size:12px;color:#aaa;margin-bottom:15px">Use o botão App para abrir no Telegram.</p>
                <button onclick="openTelegramLinkSafe(${i})" class="download-link" style="background:#24a1de; color:#fff; border:none; padding:10px 15px; cursor:pointer;">
                    <i class="fab fa-telegram-plane"></i> Abrir no Telegram
                </button>
            </div>`;
    }
}
function closeLightbox(){document.getElementById("lightbox").classList.remove("active");}
function loadThumbnail(fid,el){fetchWithRetry(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${fid}`).then(r=>{if(r.result.file_path)el.style.backgroundImage=`url('https://api.telegram.org/file/bot${CONFIG.body.t}/${r.result.file_path}')`; el.classList.add("has-thumb");}).catch(()=>{});}
function copyMagicLink(){const i=document.getElementById("magic-link-input");if(i){i.select();document.execCommand("copy");alert("Copiado!");}}
function generateMagicLink(p){document.getElementById("magic-link-input").value=`${location.origin}${location.pathname}#login=`+encodeURIComponent(CryptoJS.AES.encrypt(p,MASTER_KEY).toString());document.getElementById("magic-link-area").classList.remove("hidden");}
function showScreen(id){["login-screen","magic-login-screen","setup-panel","app-panel","pwa-install-screen"].forEach(s=>{const e=document.getElementById(s);if(e)e.classList.add("hidden");});const t=document.getElementById(id);if(t)t.classList.remove("hidden");}
function enterApp(){["login-screen","magic-login-screen","setup-panel"].forEach(s=>document.getElementById(s)?.classList.add("hidden"));document.getElementById("app-panel").classList.remove("hidden");renderHistory();renderVault();updateUploadPathUI();if(MASTER_KEY)generateMagicLink(JSON.stringify({config:CONFIG,data:APP_DATA}));}
function switchTab(id){document.querySelectorAll(".tab-content").forEach(c=>c.classList.add("hidden"));document.getElementById("tab-"+id)?.classList.remove("hidden");document.querySelectorAll(".nav-tab").forEach(t=>t.classList.remove("active"));if(event&&event.currentTarget)event.currentTarget.classList.add("active");if(id==="gallery")renderHistory();if(id==="upload")updateUploadPathUI();}
async function saveEditorFile(){const n=document.getElementById("editor-filename").value||"x.txt",c=document.getElementById("editor-content").value;if(!c)return;const f=new File([c],n,{type:"text/plain"});UPLOAD_QUEUE.push({file:f,hash:await calculateFileHash(f),status:"pending",target_folder:CURRENT_FOLDER});updateQueueUI();if(!IS_UPLOADING)processQueue();alert("Fila!");switchTab("upload");}

init();
// === INFINITY V75.6 - PARTE 2 (API & BACKUP) ===
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

async function pushDatabase(){
    if(!MASTER_KEY)return;
    const payload={timestamp:Date.now(),config:CONFIG,data:APP_DATA};
    const enc=CryptoJS.AES.encrypt(JSON.stringify(payload),MASTER_KEY).toString();
    const fd=new FormData();
    fd.append("chat_id",CONFIG.head.c);
    fd.append("document",new Blob([enc],{type:"text/plain"}),`db_${Date.now()}.enc`);
    try{
        const r=await fetch(`https://api.telegram.org/bot${CONFIG.head.t}/sendDocument`,{method:"POST",body:fd});
        const j=await r.json();
        if(j.ok){
            fetch(`https://api.telegram.org/bot${CONFIG.head.t}/pinChatMessage`,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({chat_id:CONFIG.head.c,message_id:j.result.message_id})
            });
        }
    }catch(e){}
}

async function copyUniversalLink(btn) {
    const originalText = btn.innerText;
    btn.innerText = "⏳ Encurtando...";
    const encConfig = localStorage.getItem("i58_enc_config");
    const pass = MASTER_KEY;
    const longUrl = `${window.location.origin}${window.location.pathname}#login=${encodeURIComponent(encConfig)}`;
    
    const shortUrl = await getShortUrl(longUrl);
    navigator.clipboard.writeText(shortUrl).then(() => {
        btn.innerText = "✅ Link Curto Copiado!";
        setTimeout(() => btn.innerText = originalText, 2000);
    });
    }
                                // === INFINITY V75.6 - PARTE 3 (GALERIA & NAVEGAÇÃO) ===
function renderHistory() {
    const grid = document.getElementById("preview-grid");
    if(!grid) return;
    
    FILTERED_ITEMS = APP_DATA.history.filter(item => {
        const matchesFolder = CURRENT_FOLDER ? item.folder_id === CURRENT_FOLDER : !item.folder_id;
        const matchesSearch = item.name.toLowerCase().includes(document.getElementById("search-input")?.value.toLowerCase() || "");
        const matchesType = ACTIVE_FILTER === "all" || item.type === ACTIVE_FILTER;
        return matchesFolder && matchesSearch && matchesType;
    });

    grid.innerHTML = FILTERED_ITEMS.map((item, index) => `
        <div class="preview-item" onclick="openLightbox(${index})">
            <div class="preview-thumb" style="background-image: url('${item.thumb_url || ''}')">
                ${!item.thumb_url ? '<i class="fas fa-file icon"></i>' : ''}
                <span class="type-tag">${item.type}</span>
            </div>
            <div class="preview-name">${item.name}</div>
        </div>
    `).join("");
}

function openLightbox(index) {
    CURRENT_GALLERY_INDEX = index;
    const item = FILTERED_ITEMS[index];
    if(!item) return;

    const lb = document.getElementById("lightbox");
    const display = lb.querySelector(".media-display");
    document.getElementById("lb-filename").innerText = item.name;
    document.getElementById("lb-download").href = `https://api.telegram.org/file/bot${CONFIG.body.t}/${item.file_path}`;

    if(item.type === "image") {
        display.innerHTML = `<img src="https://api.telegram.org/file/bot${CONFIG.body.t}/${item.file_path}">`;
    } else if(item.type === "video") {
        display.innerHTML = `<video controls src="https://api.telegram.org/file/bot${CONFIG.body.t}/${item.file_path}"></video>`;
    } else {
        display.innerHTML = `<div style="text-align:center"><i class="fas fa-file" style="font-size:50px"></i><p>Arquivo ${item.type}</p></div>`;
    }

    lb.classList.add("active");
}

function changeMedia(dir, event) {
    if(event) event.stopPropagation();
    let nextIdx = CURRENT_GALLERY_INDEX + dir;
    if(nextIdx >= 0 && nextIdx < FILTERED_ITEMS.length) {
        openLightbox(nextIdx);
    }
}

function closeLightbox() {
    document.getElementById("lightbox").classList.remove("active");
    document.querySelector(".media-display").innerHTML = "";
}

// Inicializar app
document.addEventListener("DOMContentLoaded", init);
        

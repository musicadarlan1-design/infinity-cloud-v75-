// === INFINITY V75.3 - VERSÃO RESUMO DE HOSPEDAGEM ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let ACTIVE_FILTER="all"; let CURRENT_FOLDER=null;

if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}

window.onload = function(){ init(); };

function init(){
    const hasConfig = localStorage.getItem("i58_enc_config");
    if(hasConfig) showScreen("login-screen");
    else showScreen("setup-panel");
}

function saveLocal(){
    if(!MASTER_KEY) return;
    const payload = {config:CONFIG, data:APP_DATA};
    const enc = CryptoJS.AES.encrypt(JSON.stringify(payload), MASTER_KEY).toString();
    localStorage.setItem("i58_enc_config", enc);
}

async function universalLogin(){
    const pass = document.getElementById("local-pass").value.trim();
    try {
        const data = localStorage.getItem("i58_enc_config");
        const dec = CryptoJS.AES.decrypt(data, pass).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error();
        const full = JSON.parse(dec);
        CONFIG = full.config; APP_DATA = full.data; MASTER_KEY = pass;
        enterApp();
    } catch(e) { alert("Senha incorreta!"); }
}

async function restoreProfile(){
    const t=document.getElementById("restore-token").value, c=document.getElementById("restore-chat").value, p=document.getElementById("restore-pass").value;
    try {
        const chat = await fetch(`https://api.telegram.org/bot${t}/getChat?chat_id=${c}`).then(r=>r.json());
        const fid = chat.result.pinned_message.document.file_id;
        const file = await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${fid}`).then(r=>r.json());
        const raw = await fetch(`https://corsproxy.io/?` + encodeURIComponent(`https://api.telegram.org/file/bot${t}/${file.result.file_path}`)).then(r=>r.text());
        const dec = CryptoJS.AES.decrypt(raw, p).toString(CryptoJS.enc.Utf8);
        const full = JSON.parse(dec); CONFIG = full.config; APP_DATA = full.data;
        MASTER_KEY = p; saveLocal(); enterApp();
    } catch(e) { alert("Erro na restauração!"); }
}

function enterApp(){ showScreen("app-panel"); renderHistory(); renderVault(); }

function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    const sv=document.getElementById("search-input").value.toLowerCase().trim();
    g.innerHTML="";
    
    if(!sv){
        APP_DATA.folders.filter(f=>f.parent===CURRENT_FOLDER).forEach(f=>{
            const card=document.createElement("div"); card.className="folder-item";
            card.innerHTML=`<i class="fas fa-folder folder-icon"></i><div class="folder-name">${f.name}</div>`;
            card.onclick=()=>openFolder(f.id); g.appendChild(card);
        });
    }

    let fs = sv ? APP_DATA.history.filter(i=>i.name.toLowerCase().includes(sv)) : APP_DATA.history.filter(i=>(i.folder_id||null)===CURRENT_FOLDER);
    if(ACTIVE_FILTER !== 'all') fs = fs.filter(i => getFileCategory(i.name) === ACTIVE_FILTER);
    
    fs.slice().reverse().forEach((i)=>{
        const card=document.createElement("div"); card.className="preview-item";
        card.innerHTML=`<div class="preview-thumb">📄</div><div class="preview-name">${i.name}</div>`;
        card.onclick=()=>openLightbox(APP_DATA.history.indexOf(i));
        g.appendChild(card);
    });
}

function getFileCategory(n){
    const nl=n.toLowerCase();
    if(nl.match(/\.(jpg|jpeg|png|webp|gif)$/)) return "image";
    if(nl.match(/\.(mp4|mkv|mov|webm)$/)) return "video";
    return "other";
}

async function openLightbox(idx){
    const it = APP_DATA.history[idx];
    document.getElementById("lightbox").classList.add("active");
    document.getElementById("lb-filename").innerText=it.name;
    const c=document.getElementById("lightbox-media-container");
    const ctr=document.querySelector(".nav-controls");
    
    ctr.innerHTML = `<button onclick="openTelegramLinkSafe(${idx})" class="btn-head" style="width:auto;padding:5px 15px;">App</button>`;
    
    try {
        const res = await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${CONFIG.body.t}/${res.result.file_path}`;
        if(getFileCategory(it.name)==="image") c.innerHTML=`<img src="${url}" style="max-width:100%;max-height:80vh;">`;
        else c.innerHTML=`<div style="padding:20px">Arquivo: ${it.name}</div>`;
    } catch(e){c.innerHTML="Erro ao carregar.";}
}

function openTelegramLinkSafe(idx){
    const it = APP_DATA.history[idx];
    let cid = it.chat_id || CONFIG.body.c;
    const url = CONFIG.body.u ? `https://t.me/${CONFIG.body.u}/${it.message_id}` : `https://t.me/c/${String(cid).replace("-100","")}/${it.message_id}`;
    window.open(url, '_blank');
}

// VAULT
function addPassword(){
    const s=document.getElementById("v-service").value, u=document.getElementById("v-user").value, p=document.getElementById("v-pass").value;
    APP_DATA.vault.push({s,u,p:CryptoJS.AES.encrypt(p,MASTER_KEY).toString()});
    saveLocal(); renderVault();
}
function renderVault(){
    const l=document.getElementById("vault-list"); if(!l)return;
    l.innerHTML="";
    APP_DATA.vault.forEach(i=>{
        const dec=CryptoJS.AES.decrypt(i.p, MASTER_KEY).toString(CryptoJS.enc.Utf8);
        l.innerHTML+=`<div class="box"><b>${i.s}</b>: ${dec}</div>`;
    });
}

// UPLOAD & HELPERS
function openTelegramApp(){
    const url = CONFIG.body.u ? `https://t.me/${CONFIG.body.u}` : `https://t.me/c/${String(CONFIG.body.c).replace("-100","")}/1`;
    window.open(url, '_blank');
}
async function manualBackup(btn){
    if(btn){btn.innerText="⏳..."; btn.disabled=true;}
    const p={config:CONFIG,data:APP_DATA};
    const enc=CryptoJS.AES.encrypt(JSON.stringify(p),MASTER_KEY).toString();
    const fd=new FormData(); fd.append("chat_id",CONFIG.head.c); fd.append("document",new Blob([enc],{type:"text/plain"}),`db.enc`);
    await fetch(`https://api.telegram.org/bot${CONFIG.head.t}/sendDocument`,{method:"POST",body:fd});
    if(btn){btn.innerText="✅ Salvo"; btn.disabled=false;}
}
function showScreen(id){document.querySelectorAll(".box").forEach(b=>b.classList.add("hidden")); document.getElementById(id).classList.remove("hidden");}
function switchTab(id){document.querySelectorAll(".tab-content").forEach(c=>c.classList.add("hidden")); document.getElementById("tab-"+id).classList.remove("hidden");}
function setSetupMode(m){document.getElementById("mode-restore").className=m==="restore"?"":"hidden";document.getElementById("mode-create").className=m==="create"?"":"hidden";}
function closeLightbox(){document.getElementById("lightbox").classList.remove("active");}
function fullReset(){if(confirm("Resetar?")){localStorage.clear();location.reload();}}


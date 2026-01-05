// === INFINITY V75.5.2 - VERSÃO ROBUSTA ===
let CONFIG={head:{t:"",c:""},body:{t:"",c:"",u:""}};
let APP_DATA={history:[],vault:[],folders:[]};
let UPLOAD_QUEUE=[]; let PENDING_FILES=[];
let IS_UPLOADING=false; let MASTER_KEY=null;
let ACTIVE_FILTER="all"; let CURRENT_FOLDER=null;
let FILTERED_FILES=[]; let CURRENT_LB_INDEX=-1;

// SALVAMENTO LOCAL
function saveLocal(){
    if(!MASTER_KEY) return;
    try {
        const payload = {config:CONFIG, data:APP_DATA};
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), MASTER_KEY).toString();
        localStorage.setItem("i58_enc_config", encrypted);
    } catch(e) { console.error("Erro saveLocal", e); }
}

// INICIALIZAÇÃO
function init(){
    try {
        if(window.location.hash.startsWith("#login=")){
            showScreen("magic-login-screen");
            const raw = decodeURIComponent(window.location.hash.replace("#login=",""));
            if(typeof LZString !== 'undefined'){
                window.MAGIC_PAYLOAD = LZString.decompressFromEncodedURIComponent(raw) || raw;
            } else { window.MAGIC_PAYLOAD = raw; }
            return;
        }
        const hasConfig = localStorage.getItem("i58_enc_config");
        if(hasConfig) { showScreen("login-screen"); } else { showScreen("setup-panel"); }
    } catch(e) { 
        alert("Erro no carregamento. Limpe o cache.");
        showScreen("setup-panel");
    }
}

function showScreen(id){
    document.querySelectorAll(".box").forEach(b => b.classList.add("hidden"));
    const target = document.getElementById(id);
    if(target) target.classList.remove("hidden");
}

// LOGIN
async function universalLogin(isMagic=false){
    const pass=document.getElementById(isMagic?"magic-pass":"local-pass").value.trim();
    try{
        let data=isMagic?window.MAGIC_PAYLOAD:localStorage.getItem("i58_enc_config");
        if(!data) return alert("Dados não encontrados.");
        const dec=CryptoJS.AES.decrypt(data,pass).toString(CryptoJS.enc.Utf8);
        if(!dec) throw new Error("Senha errada.");
        const full=JSON.parse(dec); 
        CONFIG=full.config || CONFIG; 
        APP_DATA=full.data || APP_DATA;
        MASTER_KEY=pass; 
        saveLocal(); 
        enterApp();
    }catch(e){ alert("Erro de acesso: Senha incorreta."); }
}

// RESTANTE DAS FUNÇÕES (UPLOAD, GALERIA, ETC)
function enterApp(){ showScreen("app-panel"); renderHistory(); }

function renderHistory(){
    const g=document.getElementById("gallery-grid"); if(!g)return;
    g.innerHTML="";
    FILTERED_FILES = APP_DATA.history.slice().reverse();
    FILTERED_FILES.forEach((i, idx)=>{
        const card=document.createElement("div"); 
        card.className="preview-item";
        card.innerHTML=`<div class="preview-name">${i.name}</div>`;
        card.onclick=()=>openLightbox(idx);
        g.appendChild(card);
    });
}

async function openLightbox(idx){
    if(idx < 0 || idx >= FILTERED_FILES.length) return;
    CURRENT_LB_INDEX = idx;
    const it = FILTERED_FILES[idx];
    document.getElementById("lightbox").classList.add("active");
    document.getElementById("lb-filename").innerText=it.name;
    const c=document.getElementById("lightbox-media-container");
    c.innerHTML = "Carregando...";
    try {
        const res = await fetch(`https://api.telegram.org/bot${CONFIG.body.t}/getFile?file_id=${it.file_id}`).then(r=>r.json());
        const url = `https://api.telegram.org/file/bot${CONFIG.body.t}/${res.result.file_path}`;
        if(it.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)){
            c.innerHTML = `<img src="${url}" style="max-width:100%; max-height:80vh;">`;
        } else {
            c.innerHTML = `<div style="padding:20px">Arquivo: ${it.name}</div>`;
        }
    } catch(e){ c.innerHTML = "Erro ao carregar mídia."; }
}

function closeLightbox(){ document.getElementById("lightbox").classList.remove("active"); }
function changeFile(delta){ openLightbox(CURRENT_LB_INDEX + delta); }
function fullReset(){ if(confirm("Apagar tudo?")){ localStorage.clear(); location.reload(); } }
function setSetupMode(m){ document.getElementById("mode-restore").className=m==="restore"?"":"hidden"; document.getElementById("mode-create").className=m==="create"?"":"hidden"; }

// Chamada inicial
window.onload = init;


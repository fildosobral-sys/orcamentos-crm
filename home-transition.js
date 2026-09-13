(function(){
'use strict';

var CENTRAL_ORIGIN=location.origin;
var TICKET_KEY='fs_central_return_ticket_v3';
var BACKUP_KEY='fs_central_return_ticket_backup_v3';
var RETURN_NONCE_KEY='fs_returning_home_nonce_v3';
var CENTRAL_KEYS=["fs_filial","fs_nome","fs_cargo","fs_whatsapp","fs_genero","fs_access_token","fs_pode_compartilhar","fs_access_persisted","fsAuthGlobal","fs_access_verified_at","fs_access_verified_fingerprint","fs_device_id","nomeVendedor","nomeVendedorLogado","vendedor_nome"];

function parse(v){try{return JSON.parse(v||'null');}catch(_e){return null;}}

function readTicket(){
  try{
    var t=parse(sessionStorage.getItem(TICKET_KEY))||parse(localStorage.getItem(BACKUP_KEY));
    if(!t||!t.nonce||!t.ts||!t.snapshot)return null;
    if(Date.now()-Number(t.ts)>2*60*60*1000)return null;
    return t;
  }catch(_e){return null;}
}

function restoreCentral(ticket){
  try{
    var snap=ticket&&ticket.snapshot;
    if(!snap)return false;
    CENTRAL_KEYS.forEach(function(k){
      if(Object.prototype.hasOwnProperty.call(snap,k)&&snap[k]!==null){
        localStorage.setItem(k,String(snap[k]));
      }else{
        localStorage.removeItem(k);
      }
    });
    sessionStorage.setItem('fs_returning_home','1');
    sessionStorage.setItem(RETURN_NONCE_KEY,ticket.nonce);
    return true;
  }catch(_e){return false;}
}

function goHome(e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  }

  var ticket=readTicket();
  if(ticket && restoreCentral(ticket)){
    var target=ticket.target||'/index-desktop.html';
    location.assign(CENTRAL_ORIGIN+target);
    return;
  }

  // Uso isolado: sem ticket da Central, permanece no próprio módulo.
  location.assign('./orcamentos.html');
}

window.FSVoltarHome=goHome;

function injectStyle(){
  if(document.getElementById('fs-home-glass-style-v3'))return;
  var style=document.createElement('style');
  style.id='fs-home-glass-style-v3';
  style.textContent=`
    .fs-back-home,
    .bottom-home-button,
    .floating-home-button,
    .fixed-home-btn,
    #btnHome,
    #homeBtn,
    #fsUniversalHomeButton {
      width:44px !important;
      height:44px !important;
      min-width:44px !important;
      padding:0 !important;
      display:flex !important;
      align-items:center !important;
      justify-content:center !important;
      border-radius:14px !important;
      background:rgba(255,255,255,.15) !important;
      border:1px solid rgba(255,255,255,.34) !important;
      color:#fff !important;
      opacity:.72 !important;
      box-shadow:0 8px 22px rgba(15,23,42,.14) !important;
      backdrop-filter:blur(12px) saturate(135%) !important;
      -webkit-backdrop-filter:blur(12px) saturate(135%) !important;
      text-decoration:none !important;
      font-size:17px !important;
      transition:opacity .18s ease, transform .18s ease, background .18s ease !important;
    }
    .fs-back-home:hover,
    .bottom-home-button:hover,
    .floating-home-button:hover,
    .fixed-home-btn:hover,
    #btnHome:hover,
    #homeBtn:hover,
    #fsUniversalHomeButton:hover {
      opacity:.96 !important;
      background:rgba(255,255,255,.24) !important;
      transform:translateY(-1px) !important;
    }
    @media (max-width:640px) {
      .fs-back-home,
      .bottom-home-button,
      .floating-home-button,
      .fixed-home-btn,
      #btnHome,
      #homeBtn,
      #fsUniversalHomeButton {
        width:40px !important;
        height:40px !important;
        min-width:40px !important;
        border-radius:13px !important;
        opacity:.66 !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function bind(){
  injectStyle();
  var selectors='.fs-back-home,.bottom-home-button,.floating-home-button,.fixed-home-btn,#btnHome,#homeBtn,#fsUniversalHomeButton';
  document.querySelectorAll(selectors).forEach(function(btn){
    if(btn.dataset.fsSmartHome==='ticket-v3')return;
    btn.dataset.fsSmartHome='ticket-v3';
    btn.setAttribute('title','Voltar para a Central');
    btn.setAttribute('aria-label','Voltar para a Central');
    if(btn.tagName==='A')btn.setAttribute('href','#');
    btn.addEventListener('click',goHome,true);
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();

new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
})();

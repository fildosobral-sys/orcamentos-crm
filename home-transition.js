(function(){
'use strict';

var CENTRAL_URL='https://fildosobral-sys.github.io/';
var CENTRAL_MARKER='fs_return_to_central_v1';
var SESSION_SNAPSHOT='fs_central_return_snapshot_v2';
var PERSIST_SNAPSHOT='fs_central_return_snapshot_persist_v1';
var CENTRAL_KEYS=["fs_filial","fs_nome","fs_cargo","fs_whatsapp","fs_genero","fs_access_token","fs_pode_compartilhar","fs_access_persisted","fsAuthGlobal","fs_access_verified_at","fs_access_verified_fingerprint","fs_device_id","nomeVendedor","nomeVendedorLogado","vendedor_nome"];

function parse(v){try{return JSON.parse(v||'null');}catch(_e){return null;}}

function restoreCentral(){
  try{
    var snap=parse(sessionStorage.getItem(SESSION_SNAPSHOT)) || parse(localStorage.getItem(PERSIST_SNAPSHOT));
    if(!snap)return false;
    CENTRAL_KEYS.forEach(function(k){
      if(Object.prototype.hasOwnProperty.call(snap,k)&&snap[k]!==null){
        localStorage.setItem(k,String(snap[k]));
      }else{
        localStorage.removeItem(k);
      }
    });
    sessionStorage.setItem('fs_returning_home','1');
    sessionStorage.removeItem('fs_module_from_index');
    return true;
  }catch(_e){
    return false;
  }
}

function shouldReturnCentral(){
  try{
    if(localStorage.getItem(CENTRAL_MARKER)==='1')return true;
    if(sessionStorage.getItem('fs_module_from_index')==='1')return true;
    if(sessionStorage.getItem(SESSION_SNAPSHOT))return true;
  }catch(_e){}
  return false;
}

function goHome(e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
  }

  if(shouldReturnCentral()){
    restoreCentral();
    location.assign(CENTRAL_URL);
    return;
  }

  // Acesso isolado ao CRM: permanece no próprio módulo.
  location.assign('./orcamentos.html');
}

window.FSVoltarHome=goHome;

function bind(){
  var selectors='.fs-back-home,.bottom-home-button,.floating-home-button,.fixed-home-btn,#btnHome,#homeBtn,#fsUniversalHomeButton';
  document.querySelectorAll(selectors).forEach(function(btn){
    if(btn.dataset.fsSmartHome==='central-v1')return;
    btn.dataset.fsSmartHome='central-v1';
    btn.setAttribute('title','Voltar ao início');
    btn.setAttribute('aria-label','Voltar ao início');
    if(btn.tagName==='A')btn.setAttribute('href','#');
    btn.addEventListener('click',goHome,true);
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();

new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
})();

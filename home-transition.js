(function(){
'use strict';
var CENTRAL_KEYS=["fs_filial", "fs_nome", "fs_cargo", "fs_whatsapp", "fs_genero", "fs_access_token", "fs_pode_compartilhar", "fs_access_persisted", "fsAuthGlobal", "fs_access_verified_at", "fs_access_verified_fingerprint", "fs_device_id", "nomeVendedor", "nomeVendedorLogado", "vendedor_nome"];
function parse(v){try{return JSON.parse(v||'null');}catch(_e){return null;}}
function restoreCentral(){
  try{
    var snap=parse(sessionStorage.getItem('fs_central_return_snapshot_v2'));
    if(!snap)return false;
    CENTRAL_KEYS.forEach(function(k){
      if(Object.prototype.hasOwnProperty.call(snap,k)&&snap[k]!==null)localStorage.setItem(k,String(snap[k]));
      else localStorage.removeItem(k);
    });
    sessionStorage.setItem('fs_returning_home','1');
    sessionStorage.removeItem('fs_module_from_index');
    return true;
  }catch(_e){return false;}
}
function goHome(e){
  if(e){e.preventDefault();e.stopPropagation();}
  var fromCentral=false;try{fromCentral=sessionStorage.getItem('fs_module_from_index')==='1'||!!sessionStorage.getItem('fs_central_return_snapshot_v2');}catch(_e){}
  if(fromCentral&&restoreCentral()){location.assign(location.origin+'/');return;}
  // Acesso isolado: a casinha volta para a própria tela inicial do módulo.
  if(/\/orcamentos\.html$/i.test(location.pathname)){location.assign('./orcamentos.html');return;}
  location.assign('./orcamentos.html');
}
window.FSVoltarHome=goHome;
function bind(){
  document.querySelectorAll('.fs-back-home,.bottom-home-button,.floating-home-button,.fixed-home-btn,#btnHome,#homeBtn,#fsUniversalHomeButton').forEach(function(btn){
    if(btn.dataset.fsSmartHome==='1')return;btn.dataset.fsSmartHome='1';
    if(btn.tagName==='A')btn.setAttribute('href','#');
    btn.setAttribute('title','Voltar ao início');btn.setAttribute('aria-label','Voltar ao início');
    btn.addEventListener('click',goHome,true);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
})();

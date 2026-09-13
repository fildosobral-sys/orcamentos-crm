(function () {
  'use strict';

  function currentOrigin() {
    return window.location.origin || '';
  }

  function centralRootFromReferrer() {
    try {
      if (!document.referrer) return '';

      var ref = new URL(document.referrer);
      var atual = new URL(window.location.href);

      // Para GitHub Pages da mesma conta/origem.
      if (ref.origin !== atual.origin) return '';

      var p = (ref.pathname || '').replace(/\/+/g, '/').toLowerCase();

      // A Central principal pode estar no index normal, mobile, desktop ou na raiz.
      if (
        p === '/' ||
        p.endsWith('/index.html') ||
        p.endsWith('/index-mobile.html') ||
        p.endsWith('/index-desktop.html')
      ) {
        // Volta para a pasta da Central e deixa o index.html decidir mobile/desktop.
        var pasta = ref.pathname.replace(/\/(?:index(?:-mobile|-desktop)?\.html)?$/i, '/');
        return ref.origin + pasta;
      }
    } catch (_) {}

    return '';
  }

  async function exists(url) {
    if (!/^https?:$/i.test(window.location.protocol)) return false;

    try {
      var r = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (r.ok) return true;
    } catch (_) {}

    try {
      var r2 = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin'
      });
      return r2.ok;
    } catch (_) {
      return false;
    }
  }

  function crmStart() {
    // Tela inicial do próprio módulo quando não houver uma Central/index externa.
    try {
      var here = new URL(window.location.href);

      // Se existir orcamentos.html no módulo, usa ele.
      var localStart = new URL('./orcamentos.html', here.href).href;
      window.location.assign(localStart);
    } catch (_) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function goHome(event) {
    try{ if(typeof window.FSRestoreCentralSession==='function') window.FSRestoreCentralSession(); }catch(_e){}
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // 1) Prioridade: voltar para a Central de onde o usuário veio.
    var central = centralRootFromReferrer();
    if (central) {
      window.location.assign(central);
      return;
    }

    try {
      var here = new URL(window.location.href);

      // 2) Quando o CRM está numa pasta separada do GitHub Pages
      //    (ex.: /orcamentos-crm/), verifica primeiro o index da raiz da conta.
      if (here.protocol === 'https:' || here.protocol === 'http:') {
        var rootIndex = here.origin + '/index.html';

        // Só usa a raiz se estivermos em uma subpasta.
        if (here.pathname.split('/').filter(Boolean).length >= 1 && await exists(rootIndex)) {
          window.location.assign(here.origin + '/');
          return;
        }
      }

      // 3) Estrutura comum: index.html na mesma pasta do módulo.
      var sameFolderIndex = new URL('./index.html', here.href).href;
      if (await exists(sameFolderIndex)) {
        window.location.assign(sameFolderIndex);
        return;
      }
    } catch (_) {}

    // 4) Sem index disponível: tela inicial do próprio CRM.
    crmStart();
  }

  window.FSVoltarHome = goHome;

  function bind() {
    var selectors = [
      '.fs-back-home',
      '.bottom-home-button',
      '.floating-home-button',
      '.fixed-home-btn',
      '#btnHome',
      '#homeBtn',
      '#fsUniversalHomeButton'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(function (btn) {
      if (btn.dataset.fsSmartHome === '1') return;

      btn.dataset.fsSmartHome = '1';
      btn.setAttribute('title', 'Voltar ao início');
      btn.setAttribute('aria-label', 'Voltar ao início');

      if (btn.tagName === 'A') btn.setAttribute('href', '#');

      btn.addEventListener('click', goHome, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  new MutationObserver(bind).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();


/* ===== Sincronização de identidade do vendedor =====
   Corrige a diferença entre:
   - let vendedorAtual (variável lexical do HTML)
   - window.vendedorAtual (usada pelo CRM)
*/
(function(){
  'use strict';

  function nomeAtual(){
    return String(
      localStorage.getItem('fs_nome') ||
      localStorage.getItem('vendedorLogado') ||
      localStorage.getItem('nomeVendedorLogado') ||
      ''
    ).trim();
  }

  function sincronizarVendedor(aplicarFiltro){
    var nome = nomeAtual();
    if(!nome) return false;

    try{
      if(typeof vendedorAtual !== 'undefined'){
        vendedorAtual = nome;
      }
    }catch(_e){}

    try{
      window.vendedorAtual = nome;
    }catch(_e){}

    try{
      localStorage.setItem('vendedorLogado', nome);
      localStorage.setItem('nomeVendedorLogado', nome);
    }catch(_e){}

    if(aplicarFiltro){
      try{
        if(typeof aplicarFiltroData === 'function'){
          aplicarFiltroData();
        }
      }catch(_e){}
    }

    return true;
  }

  function instalarHookEntrada(){
    try{
      if(typeof window.entrarNaCalculadora !== 'function') return;
      if(window.entrarNaCalculadora.__fsSellerSync) return;

      var original = window.entrarNaCalculadora;

      function entradaSincronizada(nomeUsuario){
        var nome = String(nomeUsuario || nomeAtual() || '').trim();

        if(nome){
          try{
            if(typeof vendedorAtual !== 'undefined'){
              vendedorAtual = nome;
            }
          }catch(_e){}

          try{
            window.vendedorAtual = nome;
            localStorage.setItem('vendedorLogado', nome);
            localStorage.setItem('nomeVendedorLogado', nome);
          }catch(_e){}
        }

        var resultado = original.apply(this, arguments);

        setTimeout(function(){
          sincronizarVendedor(true);
        }, 80);

        return resultado;
      }

      entradaSincronizada.__fsSellerSync = true;
      window.entrarNaCalculadora = entradaSincronizada;
    }catch(_e){}
  }

  function iniciarSync(){
    instalarHookEntrada();
    sincronizarVendedor(false);

    setTimeout(function(){
      instalarHookEntrada();
      sincronizarVendedor(true);
    }, 120);

    setTimeout(function(){
      sincronizarVendedor(true);
    }, 500);

    setTimeout(function(){
      sincronizarVendedor(true);
    }, 1200);
  }

  window.addEventListener('storage', function(ev){
    if(['fs_nome','vendedorLogado','nomeVendedorLogado'].includes(ev.key)){
      sincronizarVendedor(true);
    }
  });

  window.addEventListener('focus', function(){
    sincronizarVendedor(true);
  });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciarSync, {once:true});
  }else{
    iniciarSync();
  }
})();


/* ===== Ponte de sessão Central <-> Orçamentos CRM ===== */
(function(){
  'use strict';
  var KEYS=["fs_filial", "fs_nome", "fs_cargo", "fs_whatsapp", "fs_genero", "fs_access_token", "fs_pode_compartilhar", "fs_access_persisted", "fsAuthGlobal", "fs_access_verified_at", "fs_access_verified_fingerprint", "fs_device_id", "nomeVendedor", "nomeVendedorLogado", "vendedor_nome"];

  function readKeys(){
    var data={};
    KEYS.forEach(function(k){
      var v=localStorage.getItem(k);
      if(v!==null) data[k]=v;
    });
    return data;
  }

  function writeKeys(data){
    if(!data || typeof data!=='object') return;
    KEYS.forEach(function(k){
      if(Object.prototype.hasOwnProperty.call(data,k) && data[k]!==null){
        localStorage.setItem(k,String(data[k]));
      }else{
        localStorage.removeItem(k);
      }
    });
  }

  function parse(value){
    try{return JSON.parse(value||'null');}catch(_e){return null;}
  }

  function looksLikeCRM(){
    var token=String(localStorage.getItem('fs_access_token')||'').trim();
    var branch=String(localStorage.getItem('fs_filial')||'').trim();
    var phone=String(localStorage.getItem('fs_whatsapp')||'').replace(/\D/g,'');
    return token.length>=12 && !!branch && /^\d{10,11}$/.test(phone);
  }

  window.FSSaveCRMSession=function(){
    try{
      if(looksLikeCRM()){
        localStorage.setItem('fs_crm_auth_snapshot_v1',JSON.stringify(readKeys()));
      }
    }catch(e){}
  };

  window.FSRestoreCentralSession=function(){
    try{
      window.FSSaveCRMSession();
      var central=parse(sessionStorage.getItem('fs_central_auth_snapshot_v1'));
      if(central) writeKeys(central);
      sessionStorage.setItem('fs_returning_home','1');
      sessionStorage.removeItem('fs_module_from_index');
    }catch(e){}
  };

  // Mantém uma cópia separada da credencial CRM após a validação.
  window.addEventListener('load',function(){
    setTimeout(window.FSSaveCRMSession,350);
    setTimeout(window.FSSaveCRMSession,1200);
  });
})();


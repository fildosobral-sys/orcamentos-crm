/* Configuração do CRM central. Nenhum token deve ser colocado neste arquivo. */
window.FSCRMConfig = Object.freeze({
  apiUrl: 'https://script.google.com/macros/s/AKfycbxjtJ0FcukKj2lnOxgHcbxLhGScAVKQn5CXZOzfRHqN-Pr9ZeNO-nQXx6jwSmm66Hu9/exec',
  timeoutMs: 45000
});

(function(){
  'use strict';
  const head=document.head||document.documentElement;
  if(!document.querySelector('link[rel="manifest"]')){
    const m=document.createElement('link');m.rel='manifest';m.href='./manifest.webmanifest?v=1';head.appendChild(m);
  }
  if(!document.querySelector('meta[name="theme-color"]')){
    const t=document.createElement('meta');t.name='theme-color';t.content='#5b4cc4';head.appendChild(t);
  }
  if(/\/orcamentos-gestao\.html$/i.test(location.pathname)){
    /* 18/09/2026: painel legado desativado para evitar o cabeçalho antigo aparecendo
       antes do layout novo. A gestão agora abre apenas com o cabeçalho/filtros atuais. */
    document.documentElement.classList.remove('fs-bi-gated');
  }
  const loadPwa=()=>{if(document.querySelector('script[data-fs-pwa]'))return;const s=document.createElement('script');s.src='./pwa-install.js?v=1';s.dataset.fsPwa='1';document.body.appendChild(s);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPwa,{once:true});else loadPwa();
})();

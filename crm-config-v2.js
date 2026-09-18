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
    document.documentElement.classList.add('fs-bi-gated');
    const c=document.createElement('link');c.rel='stylesheet';c.href='./crm-gestao-command-v1.css?v=1';head.appendChild(c);
    window.addEventListener('load',()=>{if(document.querySelector('script[data-fs-bi-command]'))return;const s=document.createElement('script');s.src='./crm-gestao-command-v1.js?v=1';s.dataset.fsBiCommand='1';document.body.appendChild(s);},{once:true});
  }
  const loadPwa=()=>{if(document.querySelector('script[data-fs-pwa]'))return;const s=document.createElement('script');s.src='./pwa-install.js?v=1';s.dataset.fsPwa='1';document.body.appendChild(s);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPwa,{once:true});else loadPwa();
})();

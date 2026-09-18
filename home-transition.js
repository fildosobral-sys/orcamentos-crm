(function(){
  'use strict';

  /* =========================
     HOME / CENTRAL FS
     ========================= */
  const CENTRAL_HOME = '../index.html';

  function goHome(ev){
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }
    try{ sessionStorage.setItem('fs_returning_home','1'); }catch(_e){}
    location.assign(CENTRAL_HOME);
  }
  window.FSVoltarHome = goHome;

  function bindHome(){
    document.querySelectorAll('.fs-back-home').forEach(btn=>{
      if(btn.dataset.fsV10Home==='1') return;
      btn.dataset.fsV10Home='1';
      btn.setAttribute('href',CENTRAL_HOME);
      btn.addEventListener('click',goHome,true);
    });
  }

  /* =========================
     BOOT ROBUSTO DO CRM
     ========================= */
  let bootTries = 0;
  let bootTimer = null;

  function authCard(){ return document.getElementById('authCard'); }

  function legacyAuthIsPresent(){
    const card=authCard();
    return !!(card && card.querySelector('#authForm'));
  }

  function holdLegacyAuth(){
    const card=authCard();
    if(!card || !legacyAuthIsPresent()) return;
    card.style.visibility='hidden';
    card.style.minHeight='250px';
  }

  function releaseAuth(){
    const card=authCard();
    if(!card) return;
    card.style.visibility='';
    card.style.minHeight='';
  }

  function officialCRMReady(){
    return !!(window.FSCRMRemote && typeof window.verificarEstadoAcesso==='function');
  }

  function bootOfficialCRM(){
    bootTries++;

    if(officialCRMReady()){
      try{
        window.verificarEstadoAcesso();
      }catch(_e){}
      setTimeout(releaseAuth,160);
      if(bootTimer){
        clearInterval(bootTimer);
        bootTimer=null;
      }
      return;
    }

    if(bootTries>=60){
      if(bootTimer){
        clearInterval(bootTimer);
        bootTimer=null;
      }
      const card=authCard();
      if(card && legacyAuthIsPresent()){
        card.style.display='block';
        card.style.visibility='';
        card.style.minHeight='';
        card.innerHTML =
          '<div class="login-header">'+
          '<h2>🔄 Carregando acesso ao CRM</h2>'+
          '<p>O módulo de acesso não concluiu o carregamento. Atualize a página para tentar novamente.</p>'+
          '</div>'+
          '<button type="button" class="btn-login" onclick="location.reload()">Atualizar página</button>';
      }
    }
  }

  /* =========================
     ACABAMENTO TELA PRINCIPAL
     ========================= */
  function cleanTitle(){
    document.title='Orçamentos CRM';
  }

  function cleanFooter(){
    document.querySelectorAll('footer,.footer,.footer-content').forEach(el=>{
      el.style.opacity='.7';
      el.style.fontSize='.78rem';
    });

    const root=document.body;
    if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n=>{
      const t=String(n.nodeValue||'');
      if(t.includes('Desenvolvido por')){
        n.nodeValue=t.replace('Desenvolvido por','Developed by');
      }
      if(t.includes('Sistema de Vendas Zenir - Calculadora de Descontos Profissional')){
        n.nodeValue=t.replace(
          'Sistema de Vendas Zenir - Calculadora de Descontos Profissional',
          'Sales tools · FS Solutions'
        );
      }
    });
  }

  function numericMoneyFields(){
    [
      'precoNormal',
      'precoPromocional',
      'valorParcelaNormal',
      'valorParcelaPromocional',
      'percentualDesconto'
    ].forEach(id=>{
      const el=document.getElementById(id);
      if(!el) return;
      el.setAttribute('inputmode','decimal');
      el.setAttribute('enterkeyhint','done');
      el.setAttribute('autocomplete','off');
    });

    document.querySelectorAll('.price-input').forEach(box=>{
      if(box.dataset.fsV10Focus==='1') return;
      box.dataset.fsV10Focus='1';
      box.addEventListener('click',ev=>{
        if(ev.target.closest('button,a,select')) return;
        const input=box.querySelector('input:not([readonly])');
        if(input){
          try{ input.focus({preventScroll:true}); }catch(_e){ input.focus(); }
        }
      });
    });
  }

  function hideCommercialDuringLogin(){
    const card=authCard();
    const panel=document.getElementById('fscrm-panel');
    if(!card || !panel) return;
    const loginVisible=getComputedStyle(card).display!=='none';
    if(loginVisible) panel.hidden=true;
  }

  /* =========================
     STATUS REAL NO HISTÓRICO
     ========================= */
  const STATUS = {
    negociacao:['🤝','Em negociação','negociacao'],
    aguardando:['💬','Aguardando resposta','aguardando'],
    agendado:['📅','Retorno agendado','agendado'],
    aguardando_produto:['📦','Aguardando produto','produto'],
    ganha:['✅','Bem-sucedida','ganha'],
    perdida:['❌','Não concluído','perdida'],
    outro:['🔖','Outro','outro']
  };

  function recordPool(){
    const arr=[];
    try{
      if(typeof currentData!=='undefined' && Array.isArray(currentData)) arr.push(...currentData);
    }catch(_e){}
    try{
      if(typeof crmHistoryShadow!=='undefined' && Array.isArray(crmHistoryShadow)) arr.push(...crmHistoryShadow);
    }catch(_e){}
    const map=new Map();
    arr.forEach(r=>{
      const id=String(r?.__backendId || r?.id || '');
      if(id) map.set(id,{...(map.get(id)||{}),...r});
    });
    return map;
  }

  function cardRecordId(card){
    const btn=card.querySelector('[onclick*="acompanharRegistroHistorico"]');
    if(!btn) return '';
    const raw=btn.getAttribute('onclick')||'';
    const m=raw.match(/acompanharRegistroHistorico\((['"])(.*?)\1\)/);
    return m?m[2]:'';
  }

  function statusInfo(r){
    if(!r) return STATUS.negociacao;
    let key=String(r.crm_status||r.status||'').trim();
    if(r.venda_bem_sucedida===true || key==='ganha') key='ganha';
    if(r.crm_followupType==='produto' && !['ganha','perdida'].includes(key)) key='aguardando_produto';
    const info=STATUS[key]||STATUS.outro;
    const custom=String(r.crm_customStatus||r.customStatus||'').trim();
    return [info[0], key==='outro'&&custom?custom:info[1], info[2]];
  }

  function brDate(v){
    if(!v) return '';
    const p=String(v).slice(0,10).split('-');
    return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : '';
  }

  function syncHistoryStatus(){
    const pool=recordPool();
    document.querySelectorAll('.history-item').forEach(card=>{
      const r=pool.get(cardRecordId(card));
      if(!r) return;
      const badge=card.querySelector('.history-state-meta .success-status');
      if(!badge) return;

      const [icon,label,cls]=statusInfo(r);
      const d=r.crm_next||r.next||'';
      const t=r.crm_nextTime||r.nextTime||'';
      const suffix=((cls==='produto'||cls==='agendado')&&d)
        ? ' · '+brDate(d)+(t?' · '+t:'')
        : '';

      badge.textContent=`${icon} ${label}${suffix}`;
      badge.className='success-status crm-state-'+cls;
    });
  }

  function injectStyle(){
    if(document.getElementById('fs-v10-hotfix-style')) return;
    const s=document.createElement('style');
    s.id='fs-v10-hotfix-style';
    s.textContent=`
      .fs-back-home{
        position:fixed!important;right:14px!important;bottom:14px!important;
        width:48px!important;height:48px!important;min-width:48px!important;
        display:flex!important;align-items:center!important;justify-content:center!important;
        border-radius:50%!important;background:rgba(255,255,255,.7)!important;
        border:1px solid rgba(255,255,255,.9)!important;
        box-shadow:0 6px 18px rgba(15,23,42,.11)!important;
        backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;
        opacity:.58!important;z-index:9999!important;
      }
      .success-status.crm-state-negociacao{background:#eef2ff!important;color:#4f46a5!important}
      .success-status.crm-state-aguardando{background:#edf5ff!important;color:#2563a8!important}
      .success-status.crm-state-agendado{background:#f4edff!important;color:#7048a5!important}
      .success-status.crm-state-produto{background:#fff3cf!important;color:#8a6414!important}
      .success-status.crm-state-ganha{background:#e4f7ec!important;color:#1d7a4b!important}
      .success-status.crm-state-perdida{background:#fdecee!important;color:#aa3649!important}
      .success-status.crm-state-outro{background:#eef0f4!important;color:#525b6c!important}
      @media(max-width:640px){
        .fs-back-home{right:10px!important;bottom:10px!important;width:45px!important;height:45px!important;min-width:45px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function applyAll(){
    cleanTitle();
    cleanFooter();
    numericMoneyFields();
    hideCommercialDuringLogin();
    bindHome();
    syncHistoryStatus();
    injectStyle();
  }

  function start(){
    holdLegacyAuth();
    applyAll();

    bootOfficialCRM();
    bootTimer=setInterval(bootOfficialCRM,100);

    setTimeout(applyAll,250);
    setTimeout(applyAll,900);
    setTimeout(applyAll,1800);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }

  document.addEventListener('fscrm:authenticated',()=>{
    releaseAuth();
    applyAll();
  });

  document.addEventListener('fscrm:auth-required',()=>{
    setTimeout(()=>{
      releaseAuth();
      applyAll();
    },100);
  });

  window.addEventListener('storage',applyAll);

  new MutationObserver(()=>{
    requestAnimationFrame(applyAll);
  }).observe(document.documentElement,{childList:true,subtree:true});
})();

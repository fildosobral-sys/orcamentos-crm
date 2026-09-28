(function(){
  'use strict';

  const CENTRAL_HOME = '../index.html';

  function goHome(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}
    try{sessionStorage.setItem('fs_returning_home','1');}catch(_e){}
    location.assign(CENTRAL_HOME);
  }
  window.FSVoltarHome=goHome;

  function bindHome(){
    document.querySelectorAll('.fs-back-home').forEach(btn=>{
      if(btn.dataset.fsV13Home==='1')return;
      btn.dataset.fsV13Home='1';btn.setAttribute('href',CENTRAL_HOME);btn.addEventListener('click',goHome,true);
    });
  }

  let bootTries=0,bootTimer=null;
  function authCard(){return document.getElementById('authCard')}
  function legacyAuthIsPresent(){const card=authCard();return !!(card&&card.querySelector('#authForm'))}
  function holdLegacyAuth(){const card=authCard();if(!card||!legacyAuthIsPresent())return;card.style.visibility='hidden';card.style.minHeight='250px'}
  function releaseAuth(){const card=authCard();if(!card)return;card.style.visibility='';card.style.minHeight=''}
  function officialCRMReady(){return !!(window.FSCRMRemote&&typeof window.verificarEstadoAcesso==='function')}
  function bootOfficialCRM(){
    bootTries++;
    if(officialCRMReady()){
      try{window.verificarEstadoAcesso()}catch(_e){}
      setTimeout(releaseAuth,160);if(bootTimer){clearInterval(bootTimer);bootTimer=null}return;
    }
    if(bootTries>=60){
      if(bootTimer){clearInterval(bootTimer);bootTimer=null}
      const card=authCard();if(card&&legacyAuthIsPresent()){
        card.style.display='block';card.style.visibility='';card.style.minHeight='';
        card.innerHTML='<div class="login-header"><h2>🔄 Carregando acesso ao CRM</h2><p>O módulo de acesso não concluiu o carregamento. Atualize a página para tentar novamente.</p></div><button type="button" class="btn-login" onclick="location.reload()">Atualizar página</button>';
      }
    }
  }

  function cleanTitle(){document.title='Orçamentos CRM'}
  function cleanFooter(){
    document.querySelectorAll('footer,.footer,.footer-content').forEach(el=>{el.style.opacity='.7';el.style.fontSize='.78rem'});
    const root=document.body;if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{const t=String(n.nodeValue||'');if(t.includes('Desenvolvido por'))n.nodeValue=t.replace('Desenvolvido por','Developed by');if(t.includes('Sistema de Vendas Zenir - Calculadora de Descontos Profissional'))n.nodeValue=t.replace('Sistema de Vendas Zenir - Calculadora de Descontos Profissional','Sales tools · FS Solutions')});
  }
  function numericMoneyFields(){
    ['precoNormal','precoPromocional','valorParcelaNormal','valorParcelaPromocional','percentualDesconto'].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.setAttribute('inputmode','decimal');el.setAttribute('enterkeyhint','done');el.setAttribute('autocomplete','off')});
    document.querySelectorAll('.price-input').forEach(box=>{if(box.dataset.fsV13Focus==='1')return;box.dataset.fsV13Focus='1';box.addEventListener('click',ev=>{if(ev.target.closest('button,a,select'))return;const input=box.querySelector('input:not([readonly])');if(input){try{input.focus({preventScroll:true})}catch(_e){input.focus()}}})});
  }
  function hideCommercialDuringLogin(){const card=authCard(),panel=document.getElementById('fscrm-panel');if(!card||!panel)return;if(getComputedStyle(card).display!=='none')panel.hidden=true}

  function polishManagementButton(){
    const btn=document.getElementById('btnShareAccess');if(!btn)return;
    btn.textContent='🖥️';
    btn.title='Gestão da equipe';
    btn.setAttribute('aria-label','Abrir gestão da equipe');
  }

  const STATUS={negociacao:['🤝','Em negociação','negociacao'],aguardando:['💬','Aguardando resposta','aguardando'],agendado:['📅','Retorno agendado','agendado'],aguardando_produto:['📦','Aguardando produto','produto'],ganha:['✅','Venda concluída','ganha'],perdida:['❌','Não concluído','perdida'],outro:['🔖','Outro','outro']};
  function recordPool(){const arr=[];try{if(typeof currentData!=='undefined'&&Array.isArray(currentData))arr.push(...currentData)}catch(_e){}try{if(typeof crmHistoryShadow!=='undefined'&&Array.isArray(crmHistoryShadow))arr.push(...crmHistoryShadow)}catch(_e){}const map=new Map();arr.forEach(r=>{const id=String(r?.__backendId||r?.id||'');if(id)map.set(id,{...(map.get(id)||{}),...r})});return map}
  function cardRecordId(card){const btn=card.querySelector('[onclick*="acompanharRegistroHistorico"]');if(!btn)return '';const raw=btn.getAttribute('onclick')||'',m=raw.match(/acompanharRegistroHistorico\((['"])(.*?)\1\)/);return m?m[2]:''}
  function statusInfo(r){if(!r)return STATUS.negociacao;let key=String(r.crm_status||r.status||'').trim();if(r.venda_bem_sucedida===true||key==='ganha')key='ganha';if(r.crm_followupType==='produto'&&!['ganha','perdida'].includes(key))key='aguardando_produto';const info=STATUS[key]||STATUS.outro,custom=String(r.crm_customStatus||r.customStatus||'').trim();return [info[0],key==='outro'&&custom?custom:info[1],info[2]]}
  function brDate(v){if(!v)return '';const p=String(v).slice(0,10).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:''}

  /* Histórico: status curto dentro do card, detalhes da agenda abaixo. */
  function syncHistoryStatus(){
    const pool=recordPool();
    document.querySelectorAll('.history-item').forEach(card=>{
      const r=pool.get(cardRecordId(card));if(!r)return;
      const badge=card.querySelector('.history-state-meta .success-status');if(!badge)return;
      const [icon,label,cls]=statusInfo(r),d=r.crm_next||r.next||'',t=r.crm_nextTime||r.nextTime||'';
      const agenda=((cls==='produto'||cls==='agendado')&&d)
        ? `<small class="crm-status-detail">${cls==='produto'?'Previsão':'Retorno'} ${brDate(d)}${t?' · '+t:''}</small>`
        : '';
      badge.innerHTML=`<span class="crm-status-title">${icon} ${String(label).replace(/[<>&"]/g,'')}</span>${agenda}`;
      badge.className='success-status crm-state-'+cls;
    });
  }

  function saleMode(){
    const modal=document.getElementById('fscrm-modal');
    const status=document.getElementById('fscrm-edit-status');
    if(!modal||!status)return;
    const sold=status.value==='ganha';

    const hideIds=['fscrm-return-schedule','fscrm-loss-reason-wrap','fscrm-loss-box','fscrm-standard-fields','fscrm-postsale-details'];
    hideIds.forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=sold;});

    let box=document.getElementById('fs-sale-final-box');
    if(sold){
      if(!box){
        box=document.createElement('section');
        box.id='fs-sale-final-box';
        box.className='fs-sale-final-box';
        box.innerHTML=`
          <div class="fs-sale-final-head">
            <span class="fs-sale-final-icon">✅</span>
            <div><strong>Venda realizada</strong><small>Finalize o acompanhamento desta negociação.</small></div>
          </div>
          <label>Como a venda foi finalizada?
            <select id="fs-sale-final-channel">
              <option value="">Selecione</option>
              <option value="PRESENCIAL">Presencialmente</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="TELEFONE">Telefone</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>`;
        const note=document.getElementById('fscrm-note-wrap');
        if(note)note.insertAdjacentElement('beforebegin',box);
        else modal.querySelector('.fscrm-grid')?.appendChild(box);
      }
      box.hidden=false;
      const note=document.getElementById('fscrm-note-wrap');
      if(note)note.hidden=false;
      const msg=document.getElementById('fscrm-message-action');
      const stop=document.getElementById('fscrm-stop-action');
      const save=document.getElementById('fscrm-save-action');
      if(msg)msg.hidden=true;
      if(stop)stop.hidden=true;
      if(save)save.textContent='Finalizar venda';
    }else{
      if(box)box.hidden=true;
    }
  }

  function bindSaleMode(){
    if(document.documentElement.dataset.fsSaleModeReady==='1')return;
    document.documentElement.dataset.fsSaleModeReady='1';

    document.addEventListener('change',e=>{
      if(e.target?.id==='fscrm-edit-status')setTimeout(saleMode,0);
    },true);

    document.addEventListener('click',e=>{
      const btn=e.target?.closest?.('#fscrm-save-action');
      if(!btn)return;
      const status=document.getElementById('fscrm-edit-status');
      if(status?.value!=='ganha')return;
      const channel=document.getElementById('fs-sale-final-channel')?.value||'';
      const note=document.getElementById('fscrm-edit-note');
      if(channel&&note&&!String(note.value||'').includes('FINALIZAÇÃO:')){
        const original=String(note.value||'').trim();
        note.value=`FINALIZAÇÃO: ${channel}${original?'\n'+original:''}`;
      }
    },true);
  }

  function centerUserMenu(){
    const dd=document.getElementById('menuDropdown');
    if(!dd||window.innerWidth>768)return;
    dd.style.position='fixed';
    dd.style.top='50%';
    dd.style.left='50%';
    dd.style.right='auto';
    dd.style.bottom='auto';
    dd.style.margin='0';
    dd.style.width=Math.min(360,window.innerWidth-28)+'px';
    dd.style.maxWidth='calc(100vw - 28px)';
    dd.style.transform='translate(-50%,-50%)';
  }

  function injectStyle(){
    if(document.getElementById('fs-v91-hotfix-style'))return;
    const s=document.createElement('style');s.id='fs-v91-hotfix-style';s.textContent=`
      .fs-back-home{position:fixed!important;right:14px!important;bottom:14px!important;width:48px!important;height:48px!important;min-width:48px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:50%!important;background:rgba(255,255,255,.7)!important;border:1px solid rgba(255,255,255,.9)!important;box-shadow:0 6px 18px rgba(15,23,42,.11)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;opacity:.58!important;z-index:9999!important}
      .success-status.crm-state-negociacao{background:#eef2ff!important;color:#4f46a5!important}.success-status.crm-state-aguardando{background:#edf5ff!important;color:#2563a8!important}.success-status.crm-state-agendado{background:#f4edff!important;color:#7048a5!important}.success-status.crm-state-produto{background:#fff3cf!important;color:#8a6414!important}.success-status.crm-state-ganha{background:#e4f7ec!important;color:#1d7a4b!important}.success-status.crm-state-perdida{background:#fdecee!important;color:#aa3649!important}.success-status.crm-state-outro{background:#eef0f4!important;color:#525b6c!important}
      #btnShareAccess{font-size:1.25rem!important}

      /* O status é definido apenas no Acompanhar; remove o antigo botão Realizada/Pendente. */
      .history-actions-compact .history-status-btn,button[onclick^="alterarStatusVenda"],button[title*="Marcar venda como"]{display:none!important}

      /* Segunda linha: status ocupa o espaço liberado e a data fica organizada à direita. */
      .history-state-meta{
        grid-column:1/-1!important;
        display:grid!important;
        grid-template-columns:minmax(0,2fr) minmax(90px,1fr)!important;
        gap:.46rem!important;
        min-width:0!important;
      }
      .history-state-meta .success-status{
        min-width:0!important;
        width:100%!important;
        white-space:normal!important;
        overflow:hidden!important;
        overflow-wrap:anywhere!important;
        display:flex!important;
        flex-direction:column!important;
        gap:3px!important;
        align-items:center!important;
        justify-content:center!important;
        text-align:center!important;
        padding:.42rem .36rem!important;
        font-size:.68rem!important;
        line-height:1.08!important;
      }
      .crm-status-title{
        display:block!important;
        max-width:100%!important;
        font-weight:800!important;
        white-space:normal!important;
      }
      .crm-status-detail{
        display:block!important;
        max-width:100%!important;
        font-size:.61rem!important;
        font-weight:650!important;
        line-height:1.12!important;
        opacity:.84!important;
        text-transform:none!important;
        letter-spacing:0!important;
      }

      /* Venda concluída: fluxo limpo, sem perda e sem campos que não ajudam a finalizar. */
      .fs-sale-final-box{
        grid-column:1/-1;
        margin:12px 0;
        padding:14px;
        border:1px solid #ccebd9;
        border-radius:16px;
        background:#f2fbf6;
      }
      .fs-sale-final-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
      .fs-sale-final-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:#daf5e5;font-size:20px}
      .fs-sale-final-head div{display:flex;flex-direction:column;gap:2px}
      .fs-sale-final-head strong{color:#176a42;font-size:1rem}
      .fs-sale-final-head small{color:#6a7b72;font-size:.74rem}
      .fs-sale-final-box label{display:flex!important;flex-direction:column!important;gap:6px!important;font-weight:700!important;color:#46504a!important}
      .fs-sale-final-box select{width:100%!important}

      @media(max-width:768px){
        .fs-back-home{right:10px!important;bottom:10px!important;width:45px!important;height:45px!important;min-width:45px!important}

        /* Menu abre diretamente centralizado; elimina o "salto" da lateral. */
        #menuDropdown.menu-dropdown{
          position:fixed!important;
          top:50%!important;
          left:50%!important;
          right:auto!important;
          bottom:auto!important;
          margin:0!important;
          width:min(360px,calc(100vw - 28px))!important;
          min-width:0!important;
          max-width:calc(100vw - 28px)!important;
          transform:translate(-50%,-50%)!important;
          transform-origin:center!important;
          animation:fsMenuCenterIn .16s ease-out!important;
          z-index:100000!important;
        }
        @keyframes fsMenuCenterIn{
          from{opacity:0;transform:translate(-50%,-50%) scale(.96)}
          to{opacity:1;transform:translate(-50%,-50%) scale(1)}
        }

        .history-actions-compact{
          grid-template-columns:repeat(3,minmax(0,1fr))!important;
          gap:.42rem!important;
        }
        .history-actions-compact .history-action-btn{
          min-width:0!important;
          font-size:.72rem!important;
          padding:.44rem .20rem!important;
        }
        .history-state-meta{
          grid-template-columns:minmax(0,1.8fr) minmax(96px,.92fr)!important;
        }
        .history-state-meta .success-status{
          font-size:.64rem!important;
        }
      }

      @media(max-width:360px){
        .history-actions-compact{gap:.34rem!important}
        .history-actions-compact .history-action-btn{font-size:.67rem!important}
        .history-state-meta{grid-template-columns:minmax(0,1.65fr) minmax(88px,.9fr)!important}
      }
    `;document.head.appendChild(s)
  }


  function removeLegacySaleButton(){
    document.querySelectorAll('.history-status-btn,button[onclick^="alterarStatusVenda"],button[title*="Marcar venda como"]').forEach(el=>el.remove());
  }

  function installOptimisticSync(){
    const R=window.FSCRMRemote;
    if(!R||R.__fsOptimisticV16||typeof R.call!=='function'||typeof R.enqueue!=='function')return;
    const original=R.call.bind(R);
    const key='fscrm_records_cache_v2';
    R.call=async function(action,data){
      if(action==='update'&&data&&data.id&&data.patch){
        let rows=[];try{rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))rows=[]}catch(_e){rows=[]}
        const i=rows.findIndex(x=>String(x.id)===String(data.id));
        const base=i>=0?rows[i]:{id:data.id,revision:Number(data.expectedRevision||0)};
        const optimistic={...base,...data.patch,id:data.id,revision:Number(data.expectedRevision??base.revision??0)+1,updatedAt:new Date().toISOString()};
        if(i>=0)rows[i]=optimistic;else rows.push(optimistic);
        try{localStorage.setItem(key,JSON.stringify(rows.slice(-1200)))}catch(_e){}
        await R.enqueue(action,data);
        setTimeout(()=>{R.flushQueue?.().catch(()=>{})},0);
        return optimistic;
      }
      return original(action,data);
    };
    R.__fsOptimisticV16=true;
  }

  function setupMobileCompactForm(){
    const mobile=window.matchMedia('(max-width: 768px)').matches;
    const form=document.getElementById('discountForm');
    if(!form)return;

    const normalLabel=form.querySelector('label[for="precoNormal"]');
    const normalCard=normalLabel?.closest('.input-group');
    if(normalCard){
      normalCard.classList.toggle('fs-mobile-price-card-normal',mobile);
      const normalPayment=[...normalCard.querySelectorAll('div')].find(el=>{
        const h=el.querySelector(':scope > h4');
        return h&&/Modalidades\s*-\s*Preço de Tabela/i.test(h.textContent||'');
      });
      if(normalPayment){
        normalPayment.classList.toggle('fs-mobile-payment-block',mobile);
        const h=normalPayment.querySelector(':scope > h4');
        if(h){
          if(!h.dataset.fsOriginalText)h.dataset.fsOriginalText=h.textContent;
          h.textContent=mobile?'💳 Modalidade de Pagamento':h.dataset.fsOriginalText;
        }
      }
    }

    const promoManual=form.querySelector('.calculation-section.section-manual:has(#precoPromocional)');
    const promoPayment=[...form.querySelectorAll('.calculation-section.section-payment')].find(el=>el.querySelector('input[name="modalidadePromocional"]'));
    if(promoManual)promoManual.classList.toggle('fs-mobile-promo-main',mobile);
    if(promoPayment){
      promoPayment.classList.toggle('fs-mobile-promo-payment',mobile);
      const h=promoPayment.querySelector('.section-title');
      if(h){
        if(!h.dataset.fsOriginalText)h.dataset.fsOriginalText=h.textContent;
        h.textContent=mobile?'💳 Modalidade de Pagamento':h.dataset.fsOriginalText;
      }
    }
  }

  function injectMobileCompactFormStyle(){
    if(document.getElementById('fs-mobile-form-compact-v17'))return;
    const s=document.createElement('style');
    s.id='fs-mobile-form-compact-v17';
    s.textContent=`
      @media (max-width:768px){
        /* Escopo estrito: somente o formulário principal em telas mobile. */
        #discountForm{--fs-mobile-gap:14px;}
        #discountForm>.input-group,
        #discountForm>.calculation-section{margin-bottom:var(--fs-mobile-gap)!important;}

        #discountForm .input-label{
          font-size:14px!important;
          line-height:1.25!important;
          margin-bottom:7px!important;
        }
        #discountForm .input-field{
          min-height:54px!important;
          height:auto!important;
          padding:12px 14px!important;
          font-size:14px!important;
          line-height:1.25!important;
          border-radius:13px!important;
        }
        #discountForm .price-input .input-field{padding-left:46px!important;}
        #discountForm .currency-symbol{left:14px!important;font-size:14px!important;}
        #discountForm textarea.input-field{
          min-height:82px!important;
          padding-top:12px!important;
          padding-bottom:12px!important;
        }

        /* Preço de tabela + modalidade: um único card visual, sem alterar DOM/IDs/eventos. */
        #discountForm .fs-mobile-price-card-normal{
          margin:0 0 var(--fs-mobile-gap)!important;
          padding:15px!important;
          border:1px solid rgba(102,126,234,.18)!important;
          border-radius:17px!important;
          background:rgba(255,255,255,.76)!important;
          box-shadow:0 7px 20px rgba(33,45,84,.06)!important;
        }
        #discountForm .fs-mobile-price-card-normal>label[for="precoNormal"]{
          font-size:18px!important;
          line-height:1.2!important;
          margin-bottom:9px!important;
          text-shadow:none!important;
        }
        #discountForm .fs-mobile-price-card-normal>.price-input{margin-bottom:0!important;}
        #discountForm .fs-mobile-payment-block{
          margin-top:13px!important;
          padding:13px 0 0!important;
          background:transparent!important;
          border:0!important;
          border-top:1px solid rgba(60,60,67,.14)!important;
          border-radius:0!important;
        }
        #discountForm .fs-mobile-payment-block>h4{
          margin:0 0 9px!important;
          font-size:15px!important;
          line-height:1.2!important;
          gap:6px!important;
        }

        /* Cálculo percentual: cabeçalho e botão na mesma linha. */
        #discountForm .section-auto{
          margin:0 0 var(--fs-mobile-gap)!important;
          padding:13px 14px!important;
          border-radius:15px!important;
        }
        #discountForm .section-auto>.section-title{
          display:flex!important;
          align-items:center!important;
          justify-content:space-between!important;
          gap:10px!important;
          margin:0!important;
          min-height:36px!important;
          font-size:16px!important;
          line-height:1.2!important;
        }
        #discountForm .section-auto .auto-toggle-btn{
          flex:0 0 auto!important;
          min-height:36px!important;
          height:36px!important;
          padding:0 12px!important;
          margin:0!important;
          border-radius:11px!important;
          font-size:13px!important;
        }
        #discountForm .section-auto:not(.collapsed)>.input-group:first-of-type{margin-top:12px!important;}

        /* Preço promocional + modalidade: duas seções existentes passam a parecer um único card. */
        #discountForm .fs-mobile-promo-main{
          margin:0!important;
          padding:15px!important;
          border-radius:17px 17px 0 0!important;
          border:1px solid rgba(245,101,101,.18)!important;
          border-bottom:0!important;
          background:linear-gradient(180deg,rgba(239,244,255,.92),rgba(255,247,248,.92))!important;
          box-shadow:0 7px 20px rgba(33,45,84,.05)!important;
        }
        #discountForm .fs-mobile-promo-main>.section-title{display:none!important;}
        #discountForm .fs-mobile-promo-main .input-group{margin:0!important;}
        #discountForm .fs-mobile-promo-main label[for="precoPromocional"]{
          font-size:18px!important;
          line-height:1.2!important;
          margin-bottom:9px!important;
          text-shadow:none!important;
        }
        #discountForm .fs-mobile-promo-payment{
          margin:-1px 0 var(--fs-mobile-gap)!important;
          padding:13px 15px 15px!important;
          border-radius:0 0 17px 17px!important;
          border:1px solid rgba(245,101,101,.18)!important;
          border-top:1px solid rgba(60,60,67,.14)!important;
          background:linear-gradient(180deg,rgba(255,247,248,.92),rgba(248,244,255,.92))!important;
          box-shadow:0 7px 20px rgba(33,45,84,.05)!important;
        }
        #discountForm .fs-mobile-promo-payment>.section-title{
          margin:0 0 9px!important;
          font-size:15px!important;
          line-height:1.2!important;
        }
        #discountForm .fs-mobile-promo-payment>.input-group{margin:0!important;}

        #discountForm .payment-options{
          display:flex!important;
          flex-wrap:wrap!important;
          gap:8px 16px!important;
          align-items:center!important;
        }
        #discountForm .payment-options label{
          min-height:40px!important;
          display:inline-flex!important;
          align-items:center!important;
          gap:7px!important;
          font-size:14px!important;
          line-height:1.15!important;
          margin:0!important;
        }
        #discountForm .payment-options input[type="radio"]{
          width:20px!important;
          height:20px!important;
          flex:0 0 20px!important;
        }
        #discountForm .parcelas-group{
          margin-top:10px!important;
          gap:10px!important;
        }
        #discountForm .parcelas-group .input-label{font-size:13px!important;margin-bottom:5px!important;}
        #discountForm .parcelas-group .input-field{min-height:50px!important;font-size:14px!important;}

        /* Cliente, WhatsApp e anotações: mesma ordem, menor altura vertical. */
        #discountForm #cliente,
        #discountForm #whatsapp{min-height:54px!important;}
        #discountForm label[for="cliente"],
        #discountForm label[for="whatsapp"],
        #discountForm label[for="anotacoes"]{font-size:15px!important;}

        /* Campos auxiliares dentro das seções seguem confortáveis ao toque. */
        #discountForm .calculation-section .input-group{margin-bottom:12px!important;}
        #discountForm .calculation-section .input-group:last-child{margin-bottom:0!important;}
      }
    `;
    document.head.appendChild(s);
  }

  function applyAll(){
    cleanTitle();cleanFooter();numericMoneyFields();hideCommercialDuringLogin();bindHome();setupMobileCompactForm();injectMobileCompactFormStyle();
    removeLegacySaleButton();installOptimisticSync();syncHistoryStatus();polishManagementButton();injectStyle();injectIOSStyle();bindSaleMode();
    saleMode();
    if(document.getElementById('menuDropdown')?.classList.contains('active'))centerUserMenu();
  }

  function start(){holdLegacyAuth();applyAll();bootOfficialCRM();bootTimer=setInterval(bootOfficialCRM,100);setTimeout(applyAll,250);setTimeout(applyAll,900);setTimeout(applyAll,1800)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('fscrm:authenticated',()=>{releaseAuth();applyAll()});
  document.addEventListener('fscrm:auth-required',()=>setTimeout(()=>{releaseAuth();applyAll()},100));
  window.addEventListener('storage',applyAll);
  window.addEventListener('resize',()=>{setupMobileCompactForm();if(document.getElementById('menuDropdown')?.classList.contains('active'))centerUserMenu()});
  new MutationObserver(()=>requestAnimationFrame(applyAll)).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});

  function injectIOSStyle(){
    if(document.getElementById('fs-ios-main-v14'))return;
    const s=document.createElement('style');s.id='fs-ios-main-v14';s.textContent=`
      :root{--ios-bg:#f2f2f7;--ios-line:rgba(60,60,67,.14);--ios-text:#1c1c1e;--ios-sub:#6e6e73;--ios-blue:#0a84ff;--ios-indigo:#5e5ce6;--ios-green:#30d158;--ios-red:#ff453a;--ios-shadow:0 10px 30px rgba(28,28,30,.08)}
      html,body,button,input,select,textarea{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif!important;-webkit-font-smoothing:antialiased}
      body{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%)!important;color:var(--ios-text)!important}
      .header{background:linear-gradient(135deg,rgba(72,102,226,.96),rgba(116,78,188,.96))!important;box-shadow:0 12px 34px rgba(44,38,109,.18)!important;border-bottom:1px solid rgba(255,255,255,.16)!important}
      .container{max-width:1120px!important}
      .calculator-card,.history-section,#authCard,#fscrm-panel,.history-item,.fscrm-card{border-radius:22px!important;border-color:var(--ios-line)!important;box-shadow:0 8px 24px rgba(28,28,30,.07)!important}
      input:not([type=checkbox]):not([type=radio]),select,textarea{border-radius:14px!important;border:1px solid var(--ios-line)!important;background:rgba(250,250,252,.97)!important;min-height:46px!important;transition:.16s ease!important}
      input:focus,select:focus,textarea:focus{outline:none!important;border-color:rgba(10,132,255,.46)!important;box-shadow:0 0 0 4px rgba(10,132,255,.10)!important;background:#fff!important}
      button,.btn,.menu-toggle{border-radius:14px!important;transition:transform .14s ease,box-shadow .14s ease,filter .14s ease!important}
      button:active,.btn:active,.menu-toggle:active{transform:scale(.985)!important}
      .menu-toggle{background:rgba(255,255,255,.18)!important;border:1px solid rgba(255,255,255,.28)!important;backdrop-filter:blur(16px)!important}
      .menu-dropdown{background:rgba(79,66,156,.90)!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:20px!important;backdrop-filter:blur(22px) saturate(160%)!important;box-shadow:0 24px 55px rgba(30,23,72,.28)!important}
      #fscrm-modal{border-radius:26px!important;border:1px solid var(--ios-line)!important;box-shadow:0 28px 80px rgba(0,0,0,.24)!important}
      #fscrm-modal::backdrop{background:rgba(20,20,24,.34)!important;backdrop-filter:blur(12px)!important}
      .fscrm-stats>div,.detail-item{border-radius:14px!important;background:#f7f7fa!important;border-color:rgba(60,60,67,.10)!important}
      .history-actions .btn,.fscrm-card-actions button{min-height:44px!important}
      .fs-back-home{background:rgba(255,255,255,.76)!important;border:1px solid rgba(255,255,255,.88)!important;backdrop-filter:blur(18px) saturate(160%)!important;box-shadow:0 10px 28px rgba(28,28,30,.14)!important}
      footer,.footer,.footer-content{opacity:.62!important;font-size:.72rem!important}
      @media(max-width:700px){
        .header{padding:1rem 0!important;border-radius:0 0 24px 24px!important}
        .container{padding:0 12px!important}
        .calculator-card,.history-section,#authCard,#fscrm-panel{border-radius:20px!important}
        .history-details{gap:8px!important}
        .history-actions{gap:8px!important}
        #fscrm-modal{width:calc(100vw - 18px)!important;max-height:90dvh!important;border-radius:24px!important}
      }
    `;document.head.appendChild(s);
  }
})();
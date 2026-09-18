(function () {
  'use strict';

  // Home real da Central FS.
  const CENTRAL_HOME = '../index.html';

  function voltarParaCentral(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
    }

    try{
      sessionStorage.removeItem('crm_sso_from_central');
      sessionStorage.setItem('fs_returning_home','1');
      const raw=localStorage.getItem('fs_central_return_ticket_backup_v3')||'';
      const t=raw?JSON.parse(raw):null;
      if(t&&t.nonce)sessionStorage.setItem('fs_returning_home_nonce_v3',t.nonce);
    }catch(_e){}
    window.location.assign(CENTRAL_HOME);
  }

  window.FSVoltarHome = voltarParaCentral;

  function aplicarVisual() {
    if (document.getElementById('fs-home-button-central-final')) return;

    const style = document.createElement('style');
    style.id = 'fs-home-button-central-final';
    style.textContent = `
      .fs-back-home {
        position: fixed !important;
        right: 14px !important;
        bottom: 14px !important;
        left: auto !important;
        z-index: 9999 !important;

        width: 50px !important;
        height: 50px !important;
        min-width: 50px !important;
        min-height: 50px !important;
        padding: 0 !important;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;

        border-radius: 50% !important;
        background: rgba(255,255,255,.68) !important;
        border: 1px solid rgba(255,255,255,.90) !important;
        box-shadow: 0 5px 16px rgba(15,23,42,.10) !important;

        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;

        color: inherit !important;
        text-decoration: none !important;
        font-size: 19px !important;
        line-height: 1 !important;

        opacity: .58 !important;
        transition:
          opacity .18s ease,
          transform .18s ease,
          background .18s ease !important;
      }

      .fs-back-home:hover {
        opacity: .90 !important;
        background: rgba(255,255,255,.86) !important;
        transform: translateY(-1px) !important;
        filter: none !important;
      }

      .fs-back-home:active {
        transform: scale(.96) !important;
      }

      @media (max-width: 640px) {
        .fs-back-home {
          right: 10px !important;
          bottom: 10px !important;
          width: 46px !important;
          height: 46px !important;
          min-width: 46px !important;
          min-height: 46px !important;
          font-size: 18px !important;
          opacity: .54 !important;
        }
      }

      body:has(input:focus) .fs-back-home,
      body:has(textarea:focus) .fs-back-home,
      body:has(select:focus) .fs-back-home {
        opacity: .22 !important;
      }
    `;

    document.head.appendChild(style);
  }

  function vincular() {
    aplicarVisual();

    document.querySelectorAll('.fs-back-home').forEach(function (botao) {
      if (botao.dataset.fsCentralHome === '1') return;

      botao.dataset.fsCentralHome = '1';
      botao.setAttribute('href', CENTRAL_HOME);
      botao.setAttribute('title', 'Voltar para a Central');
      botao.setAttribute('aria-label', 'Voltar para a Central');

      botao.addEventListener('click', voltarParaCentral, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vincular, { once: true });
  } else {
    vincular();
  }

  new MutationObserver(vincular).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

/* =========================================================
   FS CRM V8 — sincronização visual do histórico antigo
   Mantém o status mostrado no card igual ao status real do CRM.
   Também completa o painel do desktop com Retornos agendados
   e Aguardando produto, sem alterar o layout mobile.
   ========================================================= */
(function(){
  'use strict';

  const STATUS = {
    negociacao: ['🤝', 'Em negociação', 'negociacao'],
    aguardando: ['💬', 'Aguardando resposta', 'aguardando'],
    agendado: ['📅', 'Retorno agendado', 'agendado'],
    aguardando_produto: ['📦', 'Aguardando produto', 'produto'],
    ganha: ['✅', 'Bem-Sucedida', 'ganha'],
    perdida: ['❌', 'Não concluído', 'perdida'],
    outro: ['🔖', 'Outro', 'outro']
  };

  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function recordPool(){
    const out = [];
    try{
      if (typeof currentData !== 'undefined' && Array.isArray(currentData)) out.push(...currentData);
    }catch(_e){}
    try{
      if (typeof crmHistoryShadow !== 'undefined' && Array.isArray(crmHistoryShadow)) out.push(...crmHistoryShadow);
    }catch(_e){}
    const map = new Map();
    out.forEach(r => {
      const id = String(r?.__backendId || r?.id || '');
      if(id) map.set(id, {...(map.get(id)||{}), ...r});
    });
    return map;
  }

  function cardId(card){
    const btn = card.querySelector('[onclick*="acompanharRegistroHistorico"]');
    if(!btn) return '';
    const raw = btn.getAttribute('onclick') || '';
    const m = raw.match(/acompanharRegistroHistorico\((['"])(.*?)\1\)/);
    return m ? m[2] : '';
  }

  function statusInfo(r){
    if(!r) return STATUS.negociacao;
    let key = String(r.crm_status || r.status || '').trim();
    if(r.venda_bem_sucedida === true || key === 'ganha') key = 'ganha';
    if(r.crm_followupType === 'produto' && !['ganha','perdida'].includes(key)) key = 'aguardando_produto';
    const info = STATUS[key] || STATUS.outro;
    const custom = String(r.crm_customStatus || r.customStatus || '').trim();
    return [info[0], key === 'outro' && custom ? custom : info[1], info[2]];
  }

  function formatDate(s){
    if(!s) return '';
    const p = String(s).slice(0,10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '';
  }

  function decorateHistory(){
    const pool = recordPool();
    document.querySelectorAll('.history-item').forEach(card => {
      const id = cardId(card);
      if(!id) return;
      const r = pool.get(String(id));
      if(!r) return;

      const badge = card.querySelector('.history-state-meta .success-status');
      if(!badge) return;

      const [icon, label, cls] = statusInfo(r);
      let suffix = '';
      const d = r.crm_next || r.next || '';
      const t = r.crm_nextTime || r.nextTime || '';
      if((cls === 'produto' || cls === 'agendado') && d){
        suffix = ' · ' + formatDate(d) + (t ? ' · ' + t : '');
      }

      const nextText = `${icon} ${label}${suffix}`;
      if(badge.textContent.trim() !== nextText){
        badge.textContent = nextText;
      }
      badge.classList.remove(
        'success','pending','crm-state-negociacao','crm-state-aguardando',
        'crm-state-agendado','crm-state-produto','crm-state-ganha',
        'crm-state-perdida','crm-state-outro'
      );
      badge.classList.add('crm-state-' + cls);
    });

    decorateDashboard(pool);
  }

  function decorateDashboard(pool){
    document.querySelectorAll('.dashboard-summary').forEach(board => {
      const visibleCards = [...board.parentElement.querySelectorAll('.history-item')];
      const records = visibleCards.map(card => pool.get(cardId(card))).filter(Boolean);

      let agendados = 0, produtos = 0;
      records.forEach(r => {
        const st = String(r.crm_status || r.status || '');
        const ft = String(r.crm_followupType || r.followupType || '');
        if(st === 'agendado') agendados++;
        if(st === 'aguardando_produto' || ft === 'produto') produtos++;
      });

      const defs = [
        ['crm-summary-scheduled','scheduled','📅',agendados,'Retornos Agendados'],
        ['crm-summary-product','product','📦',produtos,'Aguardando Produto']
      ];
      defs.forEach(([id,cls,icon,value,label]) => {
        let el = board.querySelector('#'+id);
        if(!el){
          el = document.createElement('div');
          el.id = id;
          el.className = `summary-card ${cls} crm-extra-summary`;
          board.appendChild(el);
        }
        const html = `<div class="summary-number">${icon} ${value}</div><div class="summary-label">${esc(label)}</div>`;
        if(el.innerHTML !== html) el.innerHTML = html;
      });
    });
  }

  function style(){
    if(document.getElementById('fs-history-v8-style')) return;
    const s = document.createElement('style');
    s.id = 'fs-history-v8-style';
    s.textContent = `
      .success-status.crm-state-negociacao{background:#eef2ff!important;color:#4f46a5!important;border:1px solid #d8d8fa!important}
      .success-status.crm-state-aguardando{background:#edf5ff!important;color:#2563a8!important;border:1px solid #cfe3ff!important}
      .success-status.crm-state-agendado{background:#f4edff!important;color:#7048a5!important;border:1px solid #ddd0fb!important}
      .success-status.crm-state-produto{background:#fff3cf!important;color:#8a6414!important;border:1px solid #f3dda0!important}
      .success-status.crm-state-ganha{background:#e4f7ec!important;color:#1d7a4b!important;border:1px solid #bee8d0!important}
      .success-status.crm-state-perdida{background:#fdecee!important;color:#aa3649!important;border:1px solid #f3c9d0!important}
      .success-status.crm-state-outro{background:#eef0f4!important;color:#525b6c!important;border:1px solid #dce1e8!important}

      .summary-card.scheduled{border-left-color:#7c5cc7!important}
      .summary-card.product{border-left-color:#d7a52f!important}
      .summary-card.scheduled .summary-number{color:#7155b6!important}
      .summary-card.product .summary-number{color:#a97911!important}

      @media(min-width:760px){
        .dashboard-summary{
          grid-template-columns:repeat(3,minmax(0,1fr))!important;
          gap:1rem!important;
        }
        .dashboard-summary .summary-card{
          min-height:128px!important;
          display:flex!important;
          flex-direction:column!important;
          align-items:center!important;
          justify-content:center!important;
        }
      }
      @media(max-width:759px){
        .dashboard-summary{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          gap:.7rem!important;
        }
        .dashboard-summary .summary-card{
          min-width:0!important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  let scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      style();
      decorateHistory();
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', schedule, {once:true});
  } else {
    schedule();
  }
  window.addEventListener('fscrm:records', schedule);
  window.addEventListener('storage', schedule);

  new MutationObserver(schedule).observe(document.documentElement, {
    childList:true, subtree:true
  });
})();

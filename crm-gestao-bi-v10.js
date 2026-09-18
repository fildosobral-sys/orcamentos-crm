
(function(){
  'use strict';

  const R = window.FSCRMRemote;
  const B = window.FSCRMBI;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const money = n => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const pct = n => (Number(n||0)).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';

  let teamCache = null;
  let busy = false;
  let repaintTimer = null;

  const openStatuses = new Set(['negociacao','aguardando','agendado','aguardando_produto','outro']);

  function periodKind(){
    return document.querySelector('[data-period][aria-pressed="true"]')?.dataset?.period || 'mes';
  }
  function period(){
    const a = $('anchor')?.value;
    return B && /^\d{4}-\d{2}-\d{2}$/.test(a||'') ? B.period(periodKind(),a) : null;
  }
  function selectedBranch(){
    return String($('hero-branch')?.value || $('branch')?.value || '');
  }
  function selectedSeller(){
    return String($('seller')?.value || '');
  }
  function inPeriod(r,p){
    if(!p || !r?.createdAt) return false;
    const d = B.day(r.createdAt);
    return d >= p.start && d <= p.end;
  }
  function scopeRecords(){
    if(!teamCache) return [];
    const p = period();
    const branch = selectedBranch();
    const seller = selectedSeller();
    return (teamCache.records||[]).filter(r => {
      if(branch && norm(r.branch)!==branch) return false;
      if(seller && String(r.ownerId)!==seller) return false;
      return !p || inPeriod(r,p);
    });
  }
  function scopeUsers(){
    if(!teamCache) return [];
    const branch = selectedBranch();
    const seller = selectedSeller();
    return (teamCache.users||[]).filter(u => {
      if(branch && norm(u.branch)!==branch) return false;
      if(seller && String(u.id)!==seller) return false;
      return true;
    });
  }

  function statusLabel(s){
    return ({
      negociacao:'Em negociação',
      aguardando:'Aguardando resposta',
      agendado:'Retorno agendado',
      aguardando_produto:'Aguardando produto',
      ganha:'Venda concluída',
      perdida:'Não concluído',
      outro:'Outro'
    })[s] || String(s||'Não informado');
  }

  function accessPolish(){
    const admin = $('access-admin');
    if(!admin) return;

    const create = admin.querySelector('.access-create-wrap');
    const list = admin.querySelector('.access-list-wrap');

    if(create){
      create.classList.add('v10-access-card','v10-create-card');
      const summary = create.querySelector(':scope > summary');
      if(summary && !summary.querySelector('.v10-open-icon')){
        summary.insertAdjacentHTML('beforeend','<span class="v10-open-icon" aria-hidden="true">➕</span>');
      }
    }
    if(list){
      list.classList.add('v10-access-card','v10-list-card');
      const summary = list.querySelector(':scope > summary');
      if(summary && !summary.querySelector('.v10-list-title')){
        summary.innerHTML = '<span class="v10-list-title"><small>👥 EQUIPE CADASTRADA</small><strong>Usuários cadastrados</strong><em>Consulte os acessos por filial.</em></span><span class="v10-open-icon" aria-hidden="true">📂</span>';
      }
    }

    const name = $('access-name');
    if(name) name.placeholder = 'Ex.: Francifildo Pereira Sobral';

    const photo = admin.querySelector('.access-photo-field');
    if(photo) photo.remove();

    admin.classList.add('v10-access-admin');
  }

  function metricData(records){
    const total = records.length;
    const wins = records.filter(r=>r.status==='ganha');
    const open = records.filter(r=>openStatuses.has(r.status));
    const scheduled = records.filter(r=>r.status==='agendado' || r.status==='aguardando_produto');
    const finalizedLoss = records.filter(r=>r.status==='perdida' && String(r.reason||'').trim());
    const contacts = records.reduce((sum,r)=> sum + (Array.isArray(r.history) ? r.history.filter(h=>/contato|whatsapp|retorno/i.test(String(h.detail||''))).length : 0),0);
    return {
      total,
      wins:wins.length,
      conversion: total ? (wins.length/total)*100 : 0,
      open:open.length,
      scheduled:scheduled.length,
      potential:open.reduce((s,r)=>s+Number(r.amount||0),0),
      lost:finalizedLoss.reduce((s,r)=>s+Number(r.amount||0),0),
      value:wins.reduce((s,r)=>s+Number(r.amount||0),0),
      contacts
    };
  }

  function enhanceMetrics(){
    const box = $('metrics');
    if(!box || !teamCache) return;
    const m = metricData(scopeRecords());
    const cards = [
      ['Pesquisas de orçamento',m.total,'Criadas no período','budget'],
      ['Vendas concluídas',m.wins,'Fechadas no período','wins'],
      ['Conversão',pct(m.conversion),'Vendas ÷ pesquisas','conversion'],
      ['Em aberto',m.open,'Oportunidades ativas','open'],
      ['Agendados',m.scheduled,'Retorno ou produto','scheduled'],
      ['Valor potencial',money(m.potential),'Oportunidades abertas','potential'],
      ['Valor perdido',money(m.lost),'Perdas finalizadas','lost'],
      ['Valor concluído',money(m.value),'Vendas fechadas','value']
    ];
    box.innerHTML = cards.map(([title,value,sub,cls]) =>
      `<div class="metric v10-metric ${cls}"><small>${title}</small><strong>${value}</strong><span>${sub}</span></div>`
    ).join('');
    box.classList.add('v10-metrics');
  }

  function sellerStats(user, records){
    const mine = records.filter(r=>String(r.ownerId||'')===String(user.id||''));
    const wins = mine.filter(r=>r.status==='ganha');
    const finalizedLoss = mine.filter(r=>r.status==='perdida' && String(r.reason||'').trim());
    const open = mine.filter(r=>openStatuses.has(r.status));
    return {
      total:mine.length,
      wins:wins.length,
      conversion:mine.length ? wins.length/mine.length*100 : 0,
      value:wins.reduce((s,r)=>s+Number(r.amount||0),0),
      potential:open.reduce((s,r)=>s+Number(r.amount||0),0),
      lost:finalizedLoss.reduce((s,r)=>s+Number(r.amount||0),0),
      open:open.length,
      scheduled:mine.filter(r=>r.status==='agendado').length,
      product:mine.filter(r=>r.status==='aguardando_produto').length
    };
  }

  function addSellerDashboards(){
    if(!teamCache) return;
    const records = scopeRecords();
    document.querySelectorAll('.seller-card').forEach(card=>{
      const name = card.querySelector('.seller-top h3')?.textContent?.trim();
      const user = scopeUsers().find(u=>norm(u.name)===norm(name));
      if(!user) return;
      const st = sellerStats(user,records);
      let dash = card.querySelector('.v10-seller-values');
      if(!dash){
        dash = document.createElement('div');
        dash.className = 'v10-seller-values';
        const conversion = card.querySelector('.conversion');
        conversion?.insertAdjacentElement('afterend',dash);
      }
      if(dash){
        dash.innerHTML = `
          <div><small>Vendido</small><strong>${money(st.value)}</strong></div>
          <div><small>Potencial</small><strong>${money(st.potential)}</strong></div>
          <div><small>Perdido</small><strong>${money(st.lost)}</strong></div>
        `;
      }
      const top = card.querySelector('.seller-top');
      const photo = String(user.photo||'').trim();
      const avatar = top?.querySelector('.avatar');
      if(photo && avatar && !avatar.querySelector('img')){
        avatar.innerHTML = `<img src="${esc(photo)}" alt="Foto de ${esc(user.name)}">`;
        avatar.classList.add('avatar-photo');
      }
    });
  }

  function dailySeries(records){
    const p = period();
    if(!p) return [];
    const map = new Map();
    records.filter(r=>r.status==='ganha').forEach(r=>{
      const d=B.day(r.createdAt);
      if(d>=p.start && d<=p.end) map.set(d,(map.get(d)||0)+Number(r.amount||0));
    });
    const keys=[...map.keys()].sort();
    return keys.map(k=>({day:k,value:map.get(k)}));
  }

  function sparkline(series){
    if(!series.length) return '<div class="v10-empty-chart">Sem vendas concluídas no período.</div>';
    const w=560,h=150,pad=18;
    const max=Math.max(...series.map(x=>x.value),1);
    const pts=series.map((x,i)=>{
      const X=pad + (series.length===1 ? (w-pad*2)/2 : i*(w-pad*2)/(series.length-1));
      const Y=h-pad - (x.value/max)*(h-pad*2);
      return [X,Y,x];
    });
    const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Tendência de vendas concluídas">
      <path class="v10-gridline" d="M${pad} ${h-pad} H${w-pad}"></path>
      <path class="v10-line" d="${path}"></path>
      ${pts.map(([x,y,o])=>`<circle class="v10-dot" cx="${x}" cy="${y}" r="4"><title>${o.day}: ${money(o.value)}</title></circle>`).join('')}
    </svg>`;
  }

  function teamIntelligence(){
    if(!teamCache) return;
    const sellerBox = $('seller-cards');
    if(!sellerBox) return;
    let section = $('v10-team-intelligence');
    if(!section){
      section = document.createElement('section');
      section.id='v10-team-intelligence';
      section.className='v10-team-intelligence';
      sellerBox.insertAdjacentElement('afterend',section);
    }

    const records = scopeRecords();
    const rows = scopeUsers().map(u=>({user:u,...sellerStats(u,records)}))
      .sort((a,b)=>b.value-a.value || b.conversion-a.conversion || a.user.name.localeCompare(b.user.name,'pt-BR'));
    const max=Math.max(...rows.map(r=>r.value),1);

    section.innerHTML = `
      <div class="v10-section-head">
        <div><small>📊 DESEMPENHO COMERCIAL</small><h2>Ranking e tendência da equipe</h2><p>Comparativo dos vendedores dentro dos filtros atuais.</p></div>
      </div>
      <div class="v10-team-grid">
        <article class="v10-ranking-card">
          <div class="v10-card-title"><span>🏆</span><div><strong>Ranking por valor concluído</strong><small>Ordem decrescente</small></div></div>
          <div class="v10-ranking-list">
            ${rows.map((r,i)=>`
              <div class="v10-rank-row">
                <span class="v10-rank-pos">${i+1}</span>
                <div class="v10-rank-main">
                  <div><strong>${esc(r.user.name)}</strong><span>${money(r.value)} · ${pct(r.conversion)}</span></div>
                  <i><b style="width:${Math.max(2,r.value/max*100)}%"></b></i>
                </div>
              </div>`).join('') || '<p>Sem colaboradores neste filtro.</p>'}
          </div>
        </article>
        <article class="v10-trend-card">
          <div class="v10-card-title"><span>📈</span><div><strong>Tendência de vendas</strong><small>Valor concluído por data</small></div></div>
          <div class="v10-trend-chart">${sparkline(dailySeries(records))}</div>
        </article>
      </div>
    `;
  }

  function improveLossArea(){
    const loss = $('loss-intel');
    if(loss) loss.classList.add('v10-loss-intel');
    document.querySelectorAll('#loss-cases .loss-case').forEach((card,i)=>{
      card.classList.add('v10-loss-case');
      if(!card.querySelector('.v10-case-index')){
        card.insertAdjacentHTML('afterbegin',`<span class="v10-case-index">${String(i+1).padStart(2,'0')}</span>`);
      }
    });
  }

  function scopeBadge(){
    const kicker = document.querySelector('.section-kicker');
    if(!kicker) return;
    let badge = $('v10-scope-badge');
    if(!badge){
      badge=document.createElement('div');
      badge.id='v10-scope-badge';
      badge.className='v10-scope-badge';
      kicker.insertAdjacentElement('afterend',badge);
    }
    const branchText = $('hero-branch')?.selectedOptions?.[0]?.textContent || 'Todas as filiais';
    const sellerText = $('seller')?.selectedOptions?.[0]?.textContent || 'Toda a equipe';
    badge.innerHTML = `<span>🏢 ${esc(branchText)}</span><span>👤 ${esc(sellerText)}</span><span>📅 ${esc($('period-label')?.textContent||'Período atual')}</span>`;
  }

  function beautifyToggles(){
    document.querySelectorAll('details').forEach(d=>{
      const s=d.querySelector(':scope > summary');
      if(!s || s.dataset.v10Toggle) return;
      s.dataset.v10Toggle='1';
      if(!s.querySelector('.v10-summary-cue')){
        const cue=document.createElement('span');
        cue.className='v10-summary-cue';
        cue.textContent=d.open?'🔽':'▶️';
        s.appendChild(cue);
      }
      d.addEventListener('toggle',()=>{
        const c=s.querySelector('.v10-summary-cue');
        if(c) c.textContent=d.open?'🔽':'▶️';
      });
    });
  }

  function paint(){
    accessPolish();
    enhanceMetrics();
    addSellerDashboards();
    teamIntelligence();
    improveLossArea();
    scopeBadge();
    beautifyToggles();
  }

  async function load(){
    if(busy || !R?.enabled) return;
    busy=true;
    try{
      await R.connect();
      if(!R.session?.actor?.canManage) return;
      teamCache = await R.call('team');
      paint();
    }catch(_e){
      if(teamCache) paint();
    }finally{
      busy=false;
    }
  }

  function schedulePaint(){
    clearTimeout(repaintTimer);
    repaintTimer=setTimeout(()=> teamCache ? paint() : load(), 120);
  }

  function bind(){
    ['anchor','seller','sort','branch','hero-branch'].forEach(id=>{
      $(id)?.addEventListener('change',()=>setTimeout(load,180));
    });
    document.querySelectorAll('[data-period]').forEach(btn=>{
      btn.addEventListener('click',()=>setTimeout(load,180));
    });
    $('refresh')?.addEventListener('click',()=>setTimeout(load,250));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{bind();load();},{once:true});
  }else{
    bind();load();
  }

  const observer = new MutationObserver(muts=>{
    if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1))) schedulePaint();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  setInterval(()=>{ if(!document.hidden) load(); },60000);
})();

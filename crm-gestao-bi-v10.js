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

  const openStatuses = new Set(['negociacao','aguardando','agendado','aguardando_produto','outro']);
  const detailMetricTitles = {
    budget: 'Pesquisas de orçamento',
    wins: 'Vendas concluídas',
    open: 'Oportunidades em aberto',
    scheduled: 'Registros agendados',
    potential: 'Valor potencial em aberto',
    lost: 'Perdas finalizadas',
    value: 'Valor concluído'
  };

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
  function getUserNameById(id){
    return (teamCache?.users||[]).find(u => String(u.id) === String(id))?.name || 'Sem vendedor';
  }
  function historyItems(record){
    return Array.isArray(record?.history) ? record.history : [];
  }
  function contactCount(record){
    return historyItems(record).filter(h => /contato|whatsapp|mensagem|retorno/i.test(String(h?.detail||''))).length;
  }
  function recordDate(record){
    return record?.createdAt ? String(record.createdAt).slice(0,10) : 'Sem data';
  }
  function reminderLabel(record){
    const d = record?.reminderDate || record?.returnDate || record?.scheduledFor || '';
    const t = record?.reminderTime || record?.returnTime || record?.time || '';
    const bits = [d,t].filter(Boolean);
    return bits.length ? bits.join(' · ') : 'Sem retorno agendado';
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
      if(summary){
        summary.querySelectorAll('.v10-open-icon').forEach(n => n.remove());
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
    const contacts = records.reduce((sum,r)=> sum + contactCount(r),0);
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

  function metricRecordMap(records){
    return {
      budget: records,
      wins: records.filter(r=>r.status==='ganha'),
      open: records.filter(r=>openStatuses.has(r.status)),
      scheduled: records.filter(r=>r.status==='agendado' || r.status==='aguardando_produto'),
      potential: records.filter(r=>openStatuses.has(r.status)),
      lost: records.filter(r=>r.status==='perdida' && String(r.reason||'').trim()),
      value: records.filter(r=>r.status==='ganha')
    };
  }

  function enhanceMetrics(){
    const box = $('metrics');
    if(!box || !teamCache) return;
    const records = scopeRecords();
    const m = metricData(records);
    const cards = [
      ['budget','Pesquisas de orçamento',m.total,'Criadas no período'],
      ['wins','Vendas concluídas',m.wins,'Fechadas no período'],
      ['conversion','Conversão',pct(m.conversion),'Vendas ÷ pesquisas'],
      ['open','Em aberto',m.open,'Oportunidades ativas'],
      ['scheduled','Agendados',m.scheduled,'Retorno ou produto'],
      ['potential','Valor potencial',money(m.potential),'Oportunidades abertas'],
      ['lost','Valor perdido',money(m.lost),'Perdas finalizadas'],
      ['value','Valor concluído',money(m.value),'Vendas fechadas']
    ];
    box.innerHTML = cards.map(([key,title,value,sub]) =>
      `<button type="button" class="metric v10-metric ${key}" data-metric="${key}" ${key==='conversion'?'data-no-detail="1"':''}>
        <small>${title}</small><strong>${value}</strong><span>${sub}</span>
      </button>`
    ).join('');
    box.classList.add('v10-metrics');
    bindMetricInteractions();
  }

  function sellerStats(user, records){
    const mine = records.filter(r=>String(r.ownerId||'')===String(user.id||''));
    const wins = mine.filter(r=>r.status==='ganha');
    const finalizedLoss = mine.filter(r=>r.status==='perdida' && String(r.reason||'').trim());
    const open = mine.filter(r=>openStatuses.has(r.status));
    const contacts = mine.reduce((s,r)=>s+contactCount(r),0);
    return {
      total:mine.length,
      wins:wins.length,
      conversion:mine.length ? wins.length/mine.length*100 : 0,
      value:wins.reduce((s,r)=>s+Number(r.amount||0),0),
      potential:open.reduce((s,r)=>s+Number(r.amount||0),0),
      lost:finalizedLoss.reduce((s,r)=>s+Number(r.amount||0),0),
      open:open.length,
      scheduled:mine.filter(r=>r.status==='agendado').length,
      product:mine.filter(r=>r.status==='aguardando_produto').length,
      contacts,
      prospectRate: mine.length ? contacts / mine.length : 0
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
    const total = keys.reduce((s,k)=>s+map.get(k),0);
    return keys.map(k=>({day:k,value:map.get(k),share: total ? (map.get(k)/total)*100 : 0}));
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
    return `<div class="v10-trend-svg-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Tendência de vendas concluídas">
      <path class="v10-gridline" d="M${pad} ${h-pad} H${w-pad}"></path>
      <path class="v10-line" d="${path}"></path>
      ${pts.map(([x,y,o])=>`<circle class="v10-dot" cx="${x}" cy="${y}" r="4"><title>${o.day}: ${money(o.value)} · ${pct(o.share)}</title></circle>`).join('')}
    </svg></div>
    <div class="v10-trend-list">${series.map(s=>`<span><strong>${esc(s.day.slice(8,10) + '/' + s.day.slice(5,7))}</strong><em>${money(s.value)}</em><b>${pct(s.share)}</b></span>`).join('')}</div>`;
  }

  function rankRows(rows, options = {}){
    const color = options.color || 'indigo';
    if(!rows.length) return '<p>Sem colaboradores neste filtro.</p>';
    const max = Math.max(...rows.map(r=>Number(r.metric)||0),1);
    return rows.map((r,i)=>`
      <div class="v10-rank-row v10-${color}">
        <span class="v10-rank-pos">${i+1}</span>
        <div class="v10-rank-main">
          <div><strong>${esc(r.name)}</strong><span>${esc(r.label)}</span></div>
          <i><b style="width:${Math.max(2,(Number(r.metric)||0)/max*100)}%"></b></i>
        </div>
      </div>`).join('');
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
    const rows = scopeUsers().map(u=>({user:u,...sellerStats(u,records)}));
    const positive = [...rows].sort((a,b)=>b.value-a.value || b.conversion-a.conversion || a.user.name.localeCompare(b.user.name,'pt-BR'));
    const lostRank = [...rows].sort((a,b)=>b.lost-a.lost || b.total-a.total || a.user.name.localeCompare(b.user.name,'pt-BR'));
    const lowProspect = [...rows].sort((a,b)=>a.prospectRate-b.prospectRate || b.open-a.open || a.user.name.localeCompare(b.user.name,'pt-BR'));

    section.innerHTML = `
      <div class="v10-section-head">
        <div><small>📊 DESEMPENHO COMERCIAL</small><h2>Ranking e tendência da equipe</h2><p>Comparativo dos vendedores dentro dos filtros atuais.</p></div>
      </div>
      <div class="v10-team-grid">
        <article class="v10-ranking-card">
          <div class="v10-card-title"><span>🏆</span><div><strong>Ranking por valor concluído</strong><small>Ordem decrescente</small></div></div>
          <div class="v10-ranking-list">${rankRows(positive.map(r=>({name:r.user.name, metric:r.value, label:`${money(r.value)} · ${pct(r.conversion)}`})))}</div>
        </article>
        <article class="v10-trend-card">
          <div class="v10-card-title"><span>📈</span><div><strong>Tendência de vendas</strong><small>Valor concluído e participação por data</small></div></div>
          <div class="v10-trend-chart">${sparkline(dailySeries(records))}</div>
        </article>
        <article class="v10-ranking-card v10-negative-card">
          <div class="v10-card-title"><span>📉</span><div><strong>Ranking de perdas finalizadas</strong><small>Vendedores que mais perderam</small></div></div>
          <div class="v10-ranking-list">${rankRows(lostRank.map(r=>({name:r.user.name, metric:r.lost, label:`${money(r.lost)} · ${r.total} registro(s)`})), {color:'red'})}</div>
        </article>
        <article class="v10-ranking-card v10-warning-card">
          <div class="v10-card-title"><span>⏳</span><div><strong>Menor prospecção</strong><small>Menor volume de contatos por orçamento</small></div></div>
          <div class="v10-ranking-list">${rankRows(lowProspect.map(r=>({name:r.user.name, metric:Math.max(0.1,r.total ? 100-r.prospectRate*10 : 0.1), label:`${r.contacts} contato(s) · ${r.open} em aberto`})), {color:'amber'})}</div>
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
        cue.textContent=d.open?'▾':'▸';
        s.appendChild(cue);
      }
      d.addEventListener('toggle',()=>{
        const c=s.querySelector('.v10-summary-cue');
        if(c) c.textContent=d.open?'▾':'▸';
      });
    });
  }

  function dialogInstance(){
    return $('detail');
  }

  function printHtml(title, html){
    const w = window.open('', '_blank', 'width=980,height=720');
    if(!w) return;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      body{font-family:Inter,Arial,sans-serif;padding:24px;color:#243047}
      h1{font-size:24px;margin:0 0 4px}
      p.meta{margin:0 0 18px;color:#667085}
      .seller{margin:18px 0 10px;padding:10px 12px;background:#f5f7fb;border:1px solid #e4e8f0;border-radius:10px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th,td{padding:8px 10px;border-bottom:1px solid #e8edf5;text-align:left;font-size:13px;vertical-align:top}
      th{font-size:12px;color:#5b6480;text-transform:uppercase;letter-spacing:.04em;background:#fafbfe}
      .tag{display:inline-block;padding:4px 8px;border-radius:999px;background:#eef3ff;color:#4456b8;font-size:11px;font-weight:700}
    </style></head><body><h1>${esc(title)}</h1><p class="meta">Visão por vendedor · ${esc($('period-label')?.textContent || '')}</p>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(()=>w.print(), 350);
  }

  function groupedMetricHtml(metricKey){
    const records = metricRecordMap(scopeRecords())[metricKey] || [];
    const grouped = new Map();
    records.forEach(r=>{
      const seller = getUserNameById(r.ownerId);
      if(!grouped.has(seller)) grouped.set(seller, []);
      grouped.get(seller).push(r);
    });
    const sellers = [...grouped.keys()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    const html = sellers.map(name=>{
      const items = grouped.get(name).sort((a,b)=>String(a.client||'').localeCompare(String(b.client||''),'pt-BR'));
      const rows = items.map(r=>`<tr>
          <td><strong>${esc(r.client || 'Sem cliente')}</strong><br><small>${esc(r.product || r.item || '')}</small></td>
          <td>${money(r.amount || 0)}</td>
          <td><span class="tag">${esc(statusLabel(r.status))}</span></td>
          <td>${esc(recordDate(r))}</td>
          <td>${esc(reminderLabel(r))}</td>
        </tr>`).join('');
      return `<div class="seller">${esc(name)} · ${items.length} registro(s)</div>
        <table><thead><tr><th>Cliente / Produto</th><th>Valor</th><th>Status</th><th>Criação</th><th>Retorno</th></tr></thead><tbody>${rows}</tbody></table>`;
    }).join('');
    return html || '<p>Nenhum registro encontrado para este indicador.</p>';
  }

  function openMetricDetail(metricKey){
    if(metricKey === 'conversion') return;
    const dialog = dialogInstance();
    if(!dialog) return;
    $('detail-title').textContent = detailMetricTitles[metricKey] || 'Detalhamento';
    const content = groupedMetricHtml(metricKey);
    $('detail-body').innerHTML = `<div class="v10-detail-toolbar"><p>Duplo clique no card abre este detalhamento por vendedor. Use o botão abaixo para imprimir.</p><button type="button" id="v10-print-detail">Imprimir visão</button></div><div class="v10-detail-content">${content}</div>`;
    $('v10-print-detail')?.addEventListener('click', ()=> printHtml(detailMetricTitles[metricKey] || 'Detalhamento', content), {once:true});
    if(typeof dialog.showModal === 'function') dialog.showModal();
  }

  function bindMetricInteractions(){
    document.querySelectorAll('.v10-metric').forEach(card=>{
      if(card.dataset.v10Bound) return;
      card.dataset.v10Bound = '1';
      card.addEventListener('dblclick', ()=> {
        card.classList.add('is-active');
        setTimeout(()=>card.classList.remove('is-active'), 700);
        if(card.dataset.noDetail==='1') return;
        openMetricDetail(card.dataset.metric);
      });
      card.addEventListener('mouseenter', ()=> card.classList.add('is-hover'));
      card.addEventListener('mouseleave', ()=> card.classList.remove('is-hover'));
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

  function delayedPaint(){
    setTimeout(()=>{ if(teamCache) paint(); }, 500);
    setTimeout(()=>{ if(teamCache) paint(); }, 1200);
  }

  function bind(){
    ['anchor','seller','sort','branch','hero-branch'].forEach(id=>{
      $(id)?.addEventListener('change',()=>setTimeout(load,180));
    });
    document.querySelectorAll('[data-period]').forEach(btn=>{
      btn.addEventListener('click',()=>setTimeout(load,180));
    });
    $('refresh')?.addEventListener('click',()=>setTimeout(load,250));
    $('close-detail')?.addEventListener('click', ()=> dialogInstance()?.close());
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{bind();load();delayedPaint();},{once:true});
  }else{
    bind();load();delayedPaint();
  }
  window.addEventListener('load', delayedPaint, {once:true});
  setInterval(()=>{ if(!document.hidden) load(); },60000);
})();

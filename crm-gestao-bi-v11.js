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
  let painting = false;
  let repaintTimer = null;
  let lastMetricTap = { key:'', at:0 };
  let lastMetricOpenAt = 0;

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

  function isoDay(value){
    if(!value) return '';
    const raw = String(value).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0,10);
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function historyStamp(h){
    return h?.at || h?.date || h?.timestamp || h?.createdAt || h?.when || h?.time || '';
  }
  function lastHistoryMatch(record, re){
    const hits = historyItems(record).filter(h => re.test(String(h?.detail||h?.action||h?.type||'')) && historyStamp(h));
    return hits.length ? historyStamp(hits[hits.length-1]) : '';
  }
  function completionStamp(record){
    return record?.completedAt || record?.closedAt || record?.wonAt || lastHistoryMatch(record,/conclu|realiz|vend[ai].*fech|ganh/i) || record?.updatedAt || record?.createdAt || '';
  }
  function lossStamp(record){
    return record?.lostAt || record?.closedAt || record?.lossDate || lastHistoryMatch(record,/perd|não conclu|nao conclu|desist|finaliz/i) || record?.updatedAt || record?.createdAt || '';
  }
  function contactStamp(h){
    return historyStamp(h);
  }
  function isBetweenDay(value,p){
    const d=isoDay(value);
    return !!(d && p && d>=p.start && d<=p.end);
  }
  function currentScopeRecords(){
    if(!teamCache) return [];
    const branch=selectedBranch();
    const seller=selectedSeller();
    return (teamCache.records||[]).filter(r=>{
      if(branch && norm(r.branch)!==branch) return false;
      if(seller && String(r.ownerId)!==seller) return false;
      return true;
    });
  }
  function completedInPeriod(records,p){
    return records.filter(r=>r.status==='ganha' && (!p || isBetweenDay(completionStamp(r),p)));
  }
  function lostInPeriod(records,p){
    return records.filter(r=>r.status==='perdida' && String(r.reason||'').trim() && (!p || isBetweenDay(lossStamp(r),p)));
  }
  function contactsInPeriod(records,p){
    let n=0;
    records.forEach(r=>historyItems(r).forEach(h=>{
      if(!/contato|whatsapp|mensagem|retorno/i.test(String(h?.detail||h?.action||''))) return;
      if(!p || isBetweenDay(contactStamp(h),p)) n++;
    }));
    return n;
  }
  function periodDays(p){
    if(!p) return 0;
    const a=new Date(p.start+'T12:00:00'), b=new Date(p.end+'T12:00:00');
    return Math.max(1,Math.round((b-a)/86400000)+1);
  }
  function datePt(day){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day||'')) return String(day||'');
    return `${day.slice(8,10)}/${day.slice(5,7)}`;
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
    const p = period();
    const current = currentScopeRecords();
    const created = records;
    const wins = completedInPeriod(current,p);
    const open = current.filter(r=>openStatuses.has(r.status));
    const scheduled = open.filter(r=>r.status==='agendado' || r.status==='aguardando_produto');
    const finalizedLoss = lostInPeriod(current,p);
    const finalized = wins.length + finalizedLoss.length;
    return {
      total:created.length,
      wins:wins.length,
      conversion: created.length ? (wins.length/created.length)*100 : 0,
      finalizedConversion: finalized ? (wins.length/finalized)*100 : 0,
      open:open.length,
      scheduled:scheduled.length,
      potential:open.reduce((s,r)=>s+Number(r.amount||0),0),
      lost:finalizedLoss.reduce((s,r)=>s+Number(r.amount||0),0),
      value:wins.reduce((s,r)=>s+Number(r.amount||0),0),
      contacts:contactsInPeriod(current,p)
    };
  }

  function metricRecordMap(records){
    const p=period();
    const current=currentScopeRecords();
    return {
      budget: records,
      wins: completedInPeriod(current,p),
      open: current.filter(r=>openStatuses.has(r.status)),
      scheduled: current.filter(r=>r.status==='agendado' || r.status==='aguardando_produto'),
      potential: current.filter(r=>openStatuses.has(r.status)),
      lost: lostInPeriod(current,p),
      value: completedInPeriod(current,p)
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
      ['open','Em aberto',m.open,'Posição atual da carteira'],
      ['scheduled','Agendados',m.scheduled,'Retorno ou produto'],
      ['potential','Valor potencial',money(m.potential),'Carteira atual em aberto'],
      ['lost','Valor perdido',money(m.lost),'Perdas finalizadas no período'],
      ['value','Valor concluído',money(m.value),'Vendas fechadas no período']
    ];
    box.innerHTML = cards.map(([key,title,value,sub]) =>
      `<button type="button" class="metric v10-metric ${key}" data-metric="${key}" ${key==='conversion'?'data-no-detail="1"':''}>
        <small>${title}</small><strong>${value}</strong><span>${sub}</span>
      </button>`
    ).join('');
    box.classList.add('v10-metrics');
    bindMetricCardsDirect();
  }

  function sellerStats(user, createdRecords){
    const p=period();
    const all=currentScopeRecords().filter(r=>String(r.ownerId||'')===String(user.id||''));
    const created = createdRecords.filter(r=>String(r.ownerId||'')===String(user.id||''));
    const wins = completedInPeriod(all,p);
    const finalizedLoss = lostInPeriod(all,p);
    const open = all.filter(r=>openStatuses.has(r.status));
    const scheduled = open.filter(r=>r.status==='agendado' || r.status==='aguardando_produto');
    const contacts = open.reduce((s,r)=>s+contactCount(r),0);
    const finalized=wins.length+finalizedLoss.length;
    return {
      total:created.length,
      wins:wins.length,
      conversion:created.length ? wins.length/created.length*100 : 0,
      finalizedConversion: finalized ? wins.length/finalized*100 : 0,
      value:wins.reduce((s,r)=>s+Number(r.amount||0),0),
      potential:open.reduce((s,r)=>s+Number(r.amount||0),0),
      lost:finalizedLoss.reduce((s,r)=>s+Number(r.amount||0),0),
      lostCount:finalizedLoss.length,
      open:open.length,
      scheduled:scheduled.length,
      product:open.filter(r=>r.status==='aguardando_produto').length,
      contacts,
      prospectRate: open.length ? contacts/open.length : 0
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
          <div><small>Potencial atual</small><strong>${money(st.potential)}</strong></div>
          <div><small>Perdido</small><strong>${money(st.lost)}</strong></div>
        `;
      }
      const top = card.querySelector('.seller-top');
      const photo = String(user.photo||user.photoUrl||user.avatar||'').trim();
      const avatar = top?.querySelector('.avatar');
      if(photo && avatar){
        avatar.innerHTML = `<img src="${esc(photo)}" alt="Foto de ${esc(user.name)}">`;
        avatar.classList.add('avatar-photo');
      }
    });
  }

  function bucketKey(value,granularity){
    const d=new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    if(granularity==='hour') return `${String(d.getHours()).padStart(2,'0')}:00`;
    const day=isoDay(d);
    if(granularity==='day') return day;
    if(granularity==='month') return day.slice(0,7);
    // week starts Monday
    const base=new Date(day+'T12:00:00');
    const dow=(base.getDay()+6)%7;
    base.setDate(base.getDate()-dow);
    return isoDay(base);
  }
  function evolutionSeries(records){
    const p=period();
    if(!p) return {granularity:'day',rows:[]};
    const days=periodDays(p);
    const granularity = days<=1 ? 'hour' : days<=30 ? 'day' : days>=300 ? 'month' : 'week';
    const all=currentScopeRecords();
    const wins=completedInPeriod(all,p);
    const created=scopeRecords();
    const map=new Map();
    function ensure(k){ if(!map.has(k)) map.set(k,{key:k,value:0,wins:0,budgets:0}); return map.get(k); }
    wins.forEach(r=>{ const k=bucketKey(completionStamp(r),granularity); if(k){ const o=ensure(k); o.value+=Number(r.amount||0); o.wins++; }});
    created.forEach(r=>{ const k=bucketKey(r.createdAt,granularity); if(k) ensure(k).budgets++; });
    const rows=[...map.values()].sort((a,b)=>a.key.localeCompare(b.key));
    const totalValue=rows.reduce((s,r)=>s+r.value,0);
    rows.forEach(r=>r.share=totalValue ? r.value/totalValue*100 : 0);
    return {granularity,rows};
  }
  function evolutionLabel(key,granularity){
    if(granularity==='hour') return key;
    if(granularity==='month') return `${key.slice(5,7)}/${key.slice(0,4)}`;
    if(granularity==='week') return `Sem. ${datePt(key)}`;
    return datePt(key);
  }
  function sparkline(seriesData){
    const {granularity,rows:series}=seriesData;
    if(!series.length) return '<div class="v10-empty-chart">Sem vendas concluídas no período.</div>';
    const w=620,h=190,pad=26;
    const max=Math.max(...series.map(x=>x.value),1);
    const pts=series.map((x,i)=>{
      const X=pad + (series.length===1 ? (w-pad*2)/2 : i*(w-pad*2)/(series.length-1));
      const Y=h-pad - (x.value/max)*(h-pad*2);
      return [X,Y,x];
    });
    const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    return `<div class="v10-trend-svg-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolução comercial">
      <path class="v10-gridline" d="M${pad} ${h-pad} H${w-pad}"></path>
      <path class="v10-line" d="${path}"></path>
      ${pts.map(([x,y,o])=>`<circle class="v10-dot" cx="${x}" cy="${y}" r="5"><title>${evolutionLabel(o.key,granularity)} · ${money(o.value)} · ${o.wins} venda(s) · ${pct(o.share)} do período · ${o.budgets} pesquisa(s)</title></circle>`).join('')}
    </svg></div>
    <div class="v10-trend-list">${series.map(s=>`<span><strong>${esc(evolutionLabel(s.key,granularity))}</strong><em>${money(s.value)}</em><b>${s.wins} venda(s) · ${pct(s.share)}</b></span>`).join('')}</div>`;
  }

  function positiveRanking(rows){
    const totalValue=rows.reduce((s,r)=>s+r.value,0);
    const max=Math.max(...rows.map(r=>r.value),1);
    if(!rows.length) return '<p class="v10-empty">Sem colaboradores neste filtro.</p>';
    return rows.map((r,i)=>{
      const participation=totalValue ? r.value/totalValue*100 : 0;
      return `<div class="v11-sales-row">
        <span class="v11-pos">${i+1}</span>
        <div class="v11-sales-main">
          <div class="v11-row-top"><strong>${esc(r.user.name)}</strong><span>${money(r.value)}</span></div>
          <div class="v11-row-sub"><span>${r.wins} venda(s) · ${pct(participation)} da equipe</span><span>Conversão: ${pct(r.conversion)}</span></div>
          <i><b style="width:${Math.max(2,r.value/max*100)}%"></b></i>
        </div>
      </div>`;
    }).join('');
  }
  function lossRanking(rows){
    const total=rows.reduce((s,r)=>s+r.lost,0);
    const max=Math.max(...rows.map(r=>r.lost),1);
    if(!rows.length) return '<p class="v10-empty">Sem perdas finalizadas no período.</p>';
    return rows.map((r,i)=>{
      const part=total ? r.lost/total*100 : 0;
      return `<div class="v11-loss-row">
        <span class="v11-pos loss">${i+1}</span>
        <div class="v11-sales-main">
          <div class="v11-row-top"><strong>${esc(r.user.name)}</strong><span>${money(r.lost)}</span></div>
          <div class="v11-row-sub"><span>${r.lostCount} oportunidade(s)</span><span>${pct(part)} das perdas</span></div>
          <i><b style="width:${Math.max(2,r.lost/max*100)}%"></b></i>
        </div>
      </div>`;
    }).join('');
  }
  function portfolioAttention(r){
    if(!r.open) return {level:'healthy',label:'Sem carteira aberta'};
    const contactRatio=r.contacts/r.open;
    const scheduledRatio=r.scheduled/r.open;
    if((r.contacts===0 && r.scheduled===0) || (contactRatio<0.5 && scheduledRatio<0.2)) return {level:'high',label:'Atenção alta'};
    if(contactRatio<1 || scheduledRatio<0.35) return {level:'medium',label:'Em atenção'};
    return {level:'healthy',label:'Acompanhamento adequado'};
  }
  function portfolioTable(rows){
    if(!rows.length) return '<p class="v10-empty">Sem colaboradores neste filtro.</p>';
    return `<div class="v11-portfolio-table">
      <div class="v11-portfolio-head"><span>Vendedor</span><span>Em aberto</span><span>Contatos</span><span>Agendados</span><span>Valor potencial</span><span>Status</span></div>
      ${rows.map(r=>{const a=portfolioAttention(r); return `<div class="v11-portfolio-row">
        <span class="seller-name"><i class="dot ${a.level}"></i>${esc(r.user.name)}</span>
        <span>${r.open}</span><span>${r.contacts}</span><span>${r.scheduled}</span><span>${money(r.potential)}</span>
        <span><b class="v11-attention ${a.level}">${a.level==='high'?'🔴':a.level==='medium'?'🟡':'🟢'} ${esc(a.label)}</b></span>
      </div>`}).join('')}
    </div>`;
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

    const createdRecords = scopeRecords();
    const rows = scopeUsers().map(u=>({user:u,...sellerStats(u,createdRecords)}));
    const positive = [...rows].sort((a,b)=>b.value-a.value || b.wins-a.wins || a.user.name.localeCompare(b.user.name,'pt-BR'));
    const losses = [...rows].filter(r=>r.lost>0 || r.lostCount>0).sort((a,b)=>b.lost-a.lost || b.lostCount-a.lostCount || a.user.name.localeCompare(b.user.name,'pt-BR'));
    const portfolio = [...rows].sort((a,b)=>{
      const score={high:3,medium:2,healthy:1};
      return score[portfolioAttention(b).level]-score[portfolioAttention(a).level] || b.potential-a.potential || a.user.name.localeCompare(b.user.name,'pt-BR');
    });
    const metrics=metricData(createdRecords);
    const evo=evolutionSeries(createdRecords);

    section.innerHTML = `
      <div class="v10-section-head v11-section-head">
        <div><small>📊 DESEMPENHO COMERCIAL</small><h2>Ranking e tendência da equipe</h2><p>Comparativo de desempenho dos vendedores dentro dos filtros atuais.</p></div>
        <div class="v11-filter-pills"><span>🏢 ${esc($('hero-branch')?.selectedOptions?.[0]?.textContent||'Todas as filiais')}</span><span>👤 ${esc($('seller')?.selectedOptions?.[0]?.textContent||'Toda a equipe')}</span><span>📅 ${esc($('period-label')?.textContent||'Período atual')}</span></div>
      </div>
      <div class="v11-manager-note"><strong>ℹ️ Leitura gerencial do período:</strong> Pesquisas de orçamento → Em aberto → Agendados → Concluídos → Perdidos.<span>Em aberto representa a posição atual da carteira.</span></div>
      <div class="v10-team-grid v11-team-grid">
        <article class="v10-ranking-card v11-sales-card">
          <div class="v10-card-title"><span>🏆</span><div><strong>Ranking de vendas concluídas</strong><small>Vendedores por valor concluído (ordem decrescente)</small></div></div>
          <div class="v11-mini-summary"><span><small>Valor concluído</small><strong>${money(metrics.value)}</strong></span><span><small>Vendas</small><strong>${metrics.wins}</strong></span><span><small>Conversão geral</small><strong>${pct(metrics.conversion)}</strong></span><span><small>Conversão finalizadas</small><strong>${pct(metrics.finalizedConversion)}</strong></span></div>
          <div class="v10-ranking-list">${positiveRanking(positive)}</div>
        </article>
        <article class="v10-trend-card v11-evolution-card">
          <div class="v10-card-title"><span>📈</span><div><strong>Evolução comercial</strong><small>Valor concluído e número de vendas ao longo do tempo</small></div></div>
          <div class="v11-evolution-summary"><span><strong>${money(metrics.value)}</strong><small>Vendido no período</small></span><span><strong>${metrics.wins}</strong><small>Vendas concluídas</small></span><span><strong>${createdRecords.length}</strong><small>Pesquisas de orçamento</small></span></div>
          <div class="v10-trend-chart">${sparkline(evo)}</div>
          <p class="v11-granularity">Granularidade automática: <strong>${evo.granularity==='hour'?'por horário':evo.granularity==='day'?'por dia':evo.granularity==='week'?'por semana':'por mês'}</strong>.</p>
        </article>
        <article class="v10-ranking-card v10-negative-card v11-loss-card">
          <div class="v10-card-title"><span>⚠️</span><div><strong>Perdas finalizadas</strong><small>Vendedores por valor perdido no período</small></div></div>
          <div class="v10-ranking-list">${lossRanking(losses)}</div>
        </article>
        <article class="v10-ranking-card v10-warning-card v11-portfolio-card">
          <div class="v10-card-title"><span>🎯</span><div><strong>Gestão da carteira</strong><small>Situação atual das oportunidades por vendedor</small></div></div>
          ${portfolioTable(portfolio)}
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
    if(typeof dialog.showModal === 'function'){
      if(dialog.open) dialog.close();
      dialog.showModal();
    }
  }

  function openMetricFromCard(card){
    if(!card || card.dataset.noDetail === '1') return;
    const now = Date.now();
    if(now - lastMetricOpenAt < 500) return;
    lastMetricOpenAt = now;
    card.classList.add('is-active');
    setTimeout(()=>card.classList.remove('is-active'), 700);
    openMetricDetail(card.dataset.metric);
  }

  function bindMetricCardsDirect(){
    const box=$('metrics');
    if(!box) return;
    box.querySelectorAll('.v10-metric').forEach(card=>{
      if(card.dataset.v11Bound==='1') return;
      card.dataset.v11Bound='1';
      card.addEventListener('dblclick',ev=>{ev.preventDefault();ev.stopPropagation();openMetricFromCard(card);});
      let last=0;
      card.addEventListener('click',ev=>{
        if(card.dataset.noDetail==='1') return;
        const now=Date.now();
        if(now-last<420){ev.preventDefault();ev.stopPropagation();last=0;openMetricFromCard(card);} else last=now;
      });
    });
  }

  function bindMetricInteractions(){
    const box = $('metrics');
    if(!box || box.dataset.v10Delegated === '1') return;
    box.dataset.v10Delegated = '1';

    box.addEventListener('dblclick', e => {
      const card = e.target.closest('.v10-metric');
      if(!card || !box.contains(card)) return;
      e.preventDefault();
      openMetricFromCard(card);
    }, true);

    box.addEventListener('pointerup', e => {
      const card = e.target.closest('.v10-metric');
      if(!card || !box.contains(card)) return;
      const key = card.dataset.metric || '';
      const now = Date.now();
      if(lastMetricTap.key === key && now - lastMetricTap.at <= 460){
        lastMetricTap = {key:'',at:0};
        e.preventDefault();
        openMetricFromCard(card);
      }else{
        lastMetricTap = {key,at:now};
      }
    }, true);
  }

  function needsMetricsRepair(){
    const box = $('metrics');
    if(!box) return false;
    const cards = [...box.children];
    return cards.length !== 8 || cards.some(el => !el.classList?.contains('v10-metric'));
  }

  function scheduleRepair(delay=80){
    clearTimeout(repaintTimer);
    repaintTimer = setTimeout(()=>{
      if(!teamCache) return;
      if(needsMetricsRepair()) paint();
    }, delay);
  }

  function observeMetrics(){
    const box = $('metrics');
    if(!box || box.dataset.v10Observed === '1') return;
    box.dataset.v10Observed = '1';
    const observer = new MutationObserver(()=>{
      if(painting) return;
      if(needsMetricsRepair()) scheduleRepair(60);
    });
    observer.observe(box,{childList:true,subtree:false});
  }

  function paint(){
    if(painting) return;
    painting = true;
    try{
      accessPolish();
      enhanceMetrics();
      bindMetricInteractions();
      observeMetrics();
      addSellerDashboards();
      teamIntelligence();
      improveLossArea();
      scopeBadge();
      beautifyToggles();
      $('metrics')?.classList.add('v10-ready');
      document.documentElement.classList.add('v10-bi-ready');
    }finally{
      queueMicrotask(()=>{ painting = false; });
    }
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
    bindMetricInteractions();
    observeMetrics();
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

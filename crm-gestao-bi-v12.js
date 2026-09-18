(function(){
'use strict';
const R=window.FSCRMRemote,B=window.FSCRMBI,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=n=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const openStatuses=new Set(['negociacao','aguardando','agendado','aguardando_produto','outro']);
let cache=null,busy=false,lastOpen=0;

function shell(){
  if(document.body.classList.contains('fs-bi-v12')) return;
  document.body.classList.add('fs-bi-v12');
  const sidebar=document.createElement('aside');
  sidebar.className='fs-bi-sidebar';
  sidebar.innerHTML=`<div class="fs-bi-logo"><i>FS</i><span>Comercial Pro</span></div>
    <nav class="fs-bi-nav">
      <a class="active" href="#visao-executiva">📊 Visão Executiva</a>
      <a href="#metrics">🎯 Oportunidades</a>
      <a href="#equipe">👥 Equipe</a>
      <a href="#loss-intel">📉 Perdas</a>
      <a href="#relatorios">📑 Relatórios</a>
      <a href="#permissions">⚙️ Configurações</a>
    </nav>
    <div class="fs-bi-support">Gestão comercial por período, filial e vendedor.<br><strong>Somente consulta gerencial.</strong></div>`;
  document.body.prepend(sidebar);
  const top=document.createElement('div');
  top.className='fs-bi-topbar';
  top.innerHTML=`<strong>Gestão da equipe</strong><div class="fs-bi-topmeta"><span class="fs-bi-chip" id="fs-top-branch">🏢 Equipe</span><span class="fs-bi-chip" id="fs-top-seller">👤 Toda a equipe</span><span class="fs-bi-chip" id="fs-top-period">📅 Período</span></div>`;
  sidebar.insertAdjacentElement('afterend',top);
}

function periodKind(){return document.querySelector('[data-period][aria-pressed="true"]')?.dataset?.period||'mes'}
function period(){const a=$('anchor')?.value;return B&&/^\d{4}-\d{2}-\d{2}$/.test(a||'')?B.period(periodKind(),a):null}
function selectedBranch(){return String($('hero-branch')?.value||$('branch')?.value||'')}
function selectedSeller(){return String($('seller')?.value||'')}
function isoDay(v){
  if(!v)return '';
  const raw=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(raw))return raw.slice(0,10);
  const d=new Date(v); if(Number.isNaN(d.getTime()))return '';
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function history(r){return Array.isArray(r?.history)?r.history:[]}
function stamp(h){return h?.at||h?.date||h?.timestamp||h?.createdAt||h?.when||h?.time||''}
function lastHistory(r,re){const a=history(r).filter(h=>re.test(String(h?.detail||h?.action||h?.type||''))&&stamp(h));return a.length?stamp(a[a.length-1]):''}
function completedStamp(r){return r?.completedAt||r?.closedAt||r?.wonAt||lastHistory(r,/conclu|realiz|vend[ai].*fech|ganh/i)||r?.updatedAt||r?.createdAt||''}
function lossStamp(r){return r?.lostAt||r?.closedAt||r?.lossDate||lastHistory(r,/perd|não conclu|nao conclu|desist|finaliz/i)||r?.updatedAt||r?.createdAt||''}
function inPeriod(v,p){const d=isoDay(v);return !!(p&&d&&d>=p.start&&d<=p.end)}
function currentRecords(){
  if(!cache)return [];
  const br=selectedBranch(),sel=selectedSeller();
  return (cache.records||[]).filter(r=>(!br||norm(r.branch)===br)&&(!sel||String(r.ownerId)===sel));
}
function createdRecords(){
  const p=period(); return currentRecords().filter(r=>!p||inPeriod(r.createdAt,p));
}
function users(){
  if(!cache)return [];
  const br=selectedBranch(),sel=selectedSeller();
  return (cache.users||[]).filter(u=>(!br||norm(u.branch)===br)&&(!sel||String(u.id)===sel));
}
function completed(records=currentRecords()){const p=period();return records.filter(r=>r.status==='ganha'&&(!p||inPeriod(completedStamp(r),p)))}
function lost(records=currentRecords()){const p=period();return records.filter(r=>r.status==='perdida'&&String(r.reason||'').trim()&&(!p||inPeriod(lossStamp(r),p)))}
function openNow(records=currentRecords()){return records.filter(r=>openStatuses.has(r.status))}
function scheduledNow(records=openNow()){return records.filter(r=>r.status==='agendado'||r.status==='aguardando_produto')}
function contactsInPeriod(records){
  const p=period(); let n=0;
  records.forEach(r=>history(r).forEach(h=>{
    if(!/contato|whatsapp|mensagem|retorno/i.test(String(h?.detail||h?.action||h?.type||'')))return;
    if(!p||inPeriod(stamp(h),p))n++;
  })); return n;
}
function sellerName(id){return (cache?.users||[]).find(u=>String(u.id)===String(id))?.name||'Sem vendedor'}
function statusLabel(s){return ({negociacao:'Em negociação',aguardando:'Aguardando resposta',agendado:'Retorno agendado',aguardando_produto:'Aguardando produto',ganha:'Venda concluída',perdida:'Não concluído',outro:'Outro'})[s]||String(s||'Não informado')}
function reminder(r){const d=r?.reminderDate||r?.returnDate||r?.scheduledFor||'',t=r?.reminderTime||r?.returnTime||r?.time||'';return [d,t].filter(Boolean).join(' · ')||'—'}

function metrics(){
  const created=createdRecords(),curr=currentRecords(),wins=completed(curr),losses=lost(curr),open=openNow(curr),scheduled=scheduledNow(open);
  const finalized=wins.length+losses.length;
  return {
    total:created.length,wins:wins.length,conversion:created.length?wins.length/created.length*100:0,
    finalizedConversion:finalized?wins.length/finalized*100:0,open:open.length,scheduled:scheduled.length,
    potential:open.reduce((s,r)=>s+Number(r.amount||0),0),
    lostValue:losses.reduce((s,r)=>s+Number(r.amount||0),0),
    value:wins.reduce((s,r)=>s+Number(r.amount||0),0),contacts:contactsInPeriod(curr)
  };
}

function paintMetrics(){
  const box=$('metrics');if(!box||!cache)return;
  const m=metrics();
  const arr=[
    ['budget','Pesquisas de orçamento',m.total,'Criadas no período'],
    ['wins','Vendas concluídas',m.wins,'Fechadas no período'],
    ['conversion','Conversão',pct(m.conversion),'Vendas ÷ pesquisas'],
    ['open','Em aberto',m.open,'Posição atual da carteira'],
    ['scheduled','Agendados',m.scheduled,'Retorno ou produto'],
    ['potential','Valor potencial',money(m.potential),'Carteira atual em aberto'],
    ['lost','Valor perdido',money(m.lostValue),'Perdas finalizadas no período'],
    ['value','Valor concluído',money(m.value),'Vendas fechadas no período']
  ];
  box.innerHTML=arr.map(([k,t,v,s])=>`<button type="button" class="fs-v12-metric" data-metric="${k}" ${k==='conversion'?'data-no-detail="1"':''}><small>${t}</small><strong>${v}</strong><span>${s}</span></button>`).join('');
}

function sellerStats(u){
  const curr=currentRecords().filter(r=>String(r.ownerId)===String(u.id));
  const created=createdRecords().filter(r=>String(r.ownerId)===String(u.id));
  const wins=completed(curr),losses=lost(curr),open=openNow(curr),scheduled=scheduledNow(open);
  const contacts=contactsInPeriod(open);
  const finalized=wins.length+losses.length;
  return {
    user:u,created:created.length,wins:wins.length,value:wins.reduce((s,r)=>s+Number(r.amount||0),0),
    conversion:created.length?wins.length/created.length*100:0,
    finalizedConversion:finalized?wins.length/finalized*100:0,
    lost:losses.reduce((s,r)=>s+Number(r.amount||0),0),lostCount:losses.length,
    open:open.length,scheduled:scheduled.length,contacts,
    potential:open.reduce((s,r)=>s+Number(r.amount||0),0)
  };
}
function attention(r){
  if(!r.open)return {level:'healthy',label:'Sem carteira aberta'};
  const cr=r.contacts/r.open,sr=r.scheduled/r.open;
  if((r.contacts===0&&r.scheduled===0)||(cr<.5&&sr<.2))return {level:'high',label:'Atenção alta'};
  if(cr<1||sr<.35)return {level:'medium',label:'Em atenção'};
  return {level:'healthy',label:'Acompanhamento adequado'};
}

function rankSales(rows){
  const total=rows.reduce((s,r)=>s+r.value,0),max=Math.max(...rows.map(r=>r.value),1);
  return rows.map((r,i)=>`<div class="fs-v12-rank-row"><span class="fs-v12-rank-pos">${i+1}</span><div class="fs-v12-rank-main">
    <div class="fs-v12-rank-top"><strong>${esc(r.user.name)}</strong><span>${money(r.value)}</span></div>
    <div class="fs-v12-rank-sub"><span>${r.wins} venda(s) · ${pct(total?r.value/total*100:0)} da equipe</span><span>Conversão: ${pct(r.conversion)}</span></div>
    <div class="fs-v12-track"><b style="width:${Math.max(2,r.value/max*100)}%"></b></div></div></div>`).join('')||'<p>Sem colaboradores neste filtro.</p>';
}
function rankLoss(rows){
  const total=rows.reduce((s,r)=>s+r.lost,0),max=Math.max(...rows.map(r=>r.lost),1);
  return rows.map((r,i)=>`<div class="fs-v12-rank-row loss"><span class="fs-v12-rank-pos">${i+1}</span><div class="fs-v12-rank-main">
    <div class="fs-v12-rank-top"><strong>${esc(r.user.name)}</strong><span>${money(r.lost)}</span></div>
    <div class="fs-v12-rank-sub"><span>${r.lostCount} oportunidade(s)</span><span>${pct(total?r.lost/total*100:0)} das perdas</span></div>
    <div class="fs-v12-track"><b style="width:${Math.max(2,r.lost/max*100)}%"></b></div></div></div>`).join('')||'<p>Sem perdas finalizadas no período.</p>';
}
function portfolio(rows){
  return `<div class="fs-v12-table-wrap"><table class="fs-v12-table"><thead><tr><th>Vendedor</th><th>Em aberto</th><th>Contatos</th><th>Agendados</th><th>Valor potencial</th><th>Status</th></tr></thead><tbody>${
    rows.map(r=>{const a=attention(r);return `<tr><td class="fs-v12-sellername"><i class="fs-v12-dotstate ${a.level}"></i>${esc(r.user.name)}</td><td>${r.open}</td><td>${r.contacts}</td><td>${r.scheduled}</td><td>${money(r.potential)}</td><td><span class="fs-v12-attention ${a.level}">${a.level==='high'?'🔴':a.level==='medium'?'🟡':'🟢'} ${esc(a.label)}</span></td></tr>`}).join('')
  }</tbody></table></div>`;
}
function daysInPeriod(p){if(!p)return 0;return Math.max(1,Math.round((new Date(p.end+'T12:00:00')-new Date(p.start+'T12:00:00'))/86400000)+1)}
function bucketKey(v,g){
  const d=new Date(v);if(Number.isNaN(d.getTime()))return '';
  if(g==='hour')return String(d.getHours()).padStart(2,'0')+':00';
  const day=isoDay(d);if(g==='day')return day;if(g==='month')return day.slice(0,7);
  const b=new Date(day+'T12:00:00'),dow=(b.getDay()+6)%7;b.setDate(b.getDate()-dow);return isoDay(b);
}
function evo(){
  const p=period();if(!p)return {g:'day',rows:[]};
  const n=daysInPeriod(p),g=n<=1?'hour':n<=30?'day':n>=300?'month':'week',map=new Map();
  const ensure=k=>{if(!map.has(k))map.set(k,{k,value:0,wins:0,budgets:0});return map.get(k)};
  completed(currentRecords()).forEach(r=>{const k=bucketKey(completedStamp(r),g);if(k){const x=ensure(k);x.value+=Number(r.amount||0);x.wins++}});
  createdRecords().forEach(r=>{const k=bucketKey(r.createdAt,g);if(k)ensure(k).budgets++});
  const rows=[...map.values()].sort((a,b)=>a.k.localeCompare(b.k)),tot=rows.reduce((s,r)=>s+r.value,0);rows.forEach(r=>r.share=tot?r.value/tot*100:0);
  return {g,rows};
}
function evoLabel(k,g){if(g==='hour')return k;if(g==='month')return k.slice(5,7)+'/'+k.slice(0,4);const d=k.slice(8,10)+'/'+k.slice(5,7);return g==='week'?'Sem. '+d:d}
function chart(data){
  const rows=data.rows;if(!rows.length)return '<div style="padding:50px 12px;text-align:center;color:#7b8799">Sem vendas concluídas no período.</div>';
  const w=620,h=190,pad=28,max=Math.max(...rows.map(x=>x.value),1);
  const pts=rows.map((x,i)=>[pad+(rows.length===1?(w-pad*2)/2:i*(w-pad*2)/(rows.length-1)),h-pad-(x.value/max)*(h-pad*2),x]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=`M${pts[0][0]} ${h-pad} `+pts.map((p,i)=>(i?'L':'L')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+` L${pts[pts.length-1][0]} ${h-pad} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolução comercial"><defs><linearGradient id="fsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5b80ef" stop-opacity=".20"/><stop offset="100%" stop-color="#5b80ef" stop-opacity="0"/></linearGradient></defs>
    <path class="fs-v12-gridline" d="M${pad} ${h-pad} H${w-pad}"></path><path class="fs-v12-area" d="${area}"></path><path class="fs-v12-line" d="${path}"></path>
    ${pts.map(([x,y,o])=>`<circle class="fs-v12-dot" cx="${x}" cy="${y}" r="4"><title>${evoLabel(o.k,data.g)} · ${money(o.value)} · ${o.wins} venda(s) · ${pct(o.share)} do período · ${o.budgets} pesquisa(s)</title></circle>`).join('')}
    ${pts.filter((_,i)=>i===0||i===pts.length-1||i%Math.max(1,Math.floor(pts.length/5))===0).map(([x,y,o])=>`<text class="fs-v12-axis" x="${x}" y="${h-8}" text-anchor="middle">${esc(evoLabel(o.k,data.g))}</text>`).join('')}
  </svg>`;
}

function paintIntelligence(){
  const sec=$('fs-team-intelligence');if(!sec||!cache)return;
  const rows=users().map(sellerStats),m=metrics(),sales=[...rows].sort((a,b)=>b.value-a.value||b.wins-a.wins||a.user.name.localeCompare(b.user.name,'pt-BR'));
  const losses=[...rows].filter(r=>r.lostCount||r.lost).sort((a,b)=>b.lost-a.lost||b.lostCount-a.lostCount);
  const score={high:3,medium:2,healthy:1};
  const port=[...rows].sort((a,b)=>(score[attention(b).level]-score[attention(a).level]) || (b.potential-a.potential));
  const e=evo(),g=e.g==='hour'?'por horário':e.g==='day'?'por dia':e.g==='week'?'por semana':'por mês';
  sec.innerHTML=`<div class="fs-v12-intro"><div><small>📊 DESEMPENHO COMERCIAL</small><h2>Ranking e tendência da equipe</h2><p>Comparativo dos vendedores dentro dos filtros atuais.</p></div><div class="fs-v12-scope"><span class="fs-bi-chip">🏢 ${esc($('hero-branch')?.selectedOptions?.[0]?.textContent||'Todas as filiais')}</span><span class="fs-bi-chip">👤 ${esc($('seller')?.selectedOptions?.[0]?.textContent||'Toda a equipe')}</span><span class="fs-bi-chip">📅 ${esc($('period-label')?.textContent||'Período')}</span></div></div>
  <div class="fs-v12-grid">
    <article class="fs-v12-panel sales"><div class="fs-v12-panel-head"><i>🏆</i><div><strong>Ranking de vendas concluídas</strong><small>Por valor concluído no período</small></div></div><div class="fs-v12-mini"><span><small>Valor concluído</small><strong>${money(m.value)}</strong></span><span><small>Vendas</small><strong>${m.wins}</strong></span><span><small>Conversão geral</small><strong>${pct(m.conversion)}</strong></span><span><small>Sobre finalizadas</small><strong>${pct(m.finalizedConversion)}</strong></span></div><div class="fs-v12-ranking">${rankSales(sales)}</div></article>
    <article class="fs-v12-panel evolution"><div class="fs-v12-panel-head"><i>📈</i><div><strong>Evolução comercial</strong><small>Valor concluído e número de vendas · ${g}</small></div></div><div class="fs-v12-evo-summary"><span><strong>${money(m.value)}</strong><small>Vendido no período</small></span><span><strong>${m.wins}</strong><small>Vendas concluídas</small></span><span><strong>${createdRecords().length}</strong><small>Pesquisas</small></span></div><div class="fs-v12-chart">${chart(e)}</div></article>
    <article class="fs-v12-panel loss"><div class="fs-v12-panel-head"><i>⚠️</i><div><strong>Perdas finalizadas</strong><small>Por valor perdido no período</small></div></div><div class="fs-v12-ranking">${rankLoss(losses)}</div></article>
    <article class="fs-v12-panel portfolio"><div class="fs-v12-panel-head"><i>🎯</i><div><strong>Gestão da carteira</strong><small>Posição atual das oportunidades por vendedor</small></div></div>${portfolio(port)}</article>
  </div>`;
}

function updateTop(){
  const b=$('fs-top-branch'),s=$('fs-top-seller'),p=$('fs-top-period');
  if(b)b.textContent='🏢 '+($('hero-branch')?.selectedOptions?.[0]?.textContent||'Todas as filiais');
  if(s)s.textContent='👤 '+($('seller')?.selectedOptions?.[0]?.textContent||'Toda a equipe');
  if(p)p.textContent='📅 '+($('period-label')?.textContent||'Período');
}
function detailMap(k){
  const created=createdRecords(),curr=currentRecords();
  return {budget:created,wins:completed(curr),open:openNow(curr),scheduled:scheduledNow(openNow(curr)),potential:openNow(curr),lost:lost(curr),value:completed(curr)}[k]||[];
}
function detailTitle(k){return ({budget:'Pesquisas de orçamento',wins:'Vendas concluídas',open:'Oportunidades em aberto',scheduled:'Registros agendados',potential:'Valor potencial em aberto',lost:'Perdas finalizadas',value:'Valor concluído'})[k]||'Detalhamento'}
function openDetail(k){
  if(k==='conversion'||Date.now()-lastOpen<400)return;lastOpen=Date.now();
  const d=$('detail');if(!d)return;
  const grouped=new Map();detailMap(k).forEach(r=>{const n=sellerName(r.ownerId);if(!grouped.has(n))grouped.set(n,[]);grouped.get(n).push(r)});
  const body=[...grouped.keys()].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(n=>`<div class="fs-v12-detail-group">${esc(n)} · ${grouped.get(n).length} registro(s)</div><table class="fs-v12-detail-table"><thead><tr><th>Cliente / Produto</th><th>Valor</th><th>Status</th><th>Criação</th><th>Retorno</th></tr></thead><tbody>${grouped.get(n).map(r=>`<tr><td><strong>${esc(r.client||'Sem cliente')}</strong><br><small>${esc(r.product||r.item||'')}</small></td><td>${money(r.amount||0)}</td><td><span class="fs-v12-tag">${esc(statusLabel(r.status))}</span></td><td>${esc(isoDay(r.createdAt)||'—')}</td><td>${esc(reminder(r))}</td></tr>`).join('')}</tbody></table>`).join('')||'<p>Nenhum registro encontrado.</p>';
  $('detail-title').textContent=detailTitle(k);$('detail-body').innerHTML=`<div class="fs-v12-detail-toolbar"><p>Detalhamento por vendedor e cliente.</p><button type="button" id="fs-v12-print">Imprimir</button></div>${body}`;
  $('fs-v12-print')?.addEventListener('click',()=>window.print(),{once:true});
  if(d.open)d.close();d.showModal();
}
function bindDetail(){
  const box=$('metrics');if(!box||box.dataset.fsV12Bound)return;box.dataset.fsV12Bound='1';
  box.addEventListener('dblclick',e=>{const c=e.target.closest('.fs-v12-metric');if(c&&!c.dataset.noDetail)openDetail(c.dataset.metric)});
  let tap={k:'',t:0};
  box.addEventListener('pointerup',e=>{const c=e.target.closest('.fs-v12-metric');if(!c||c.dataset.noDetail)return;const k=c.dataset.metric,n=Date.now();if(tap.k===k&&n-tap.t<450){tap={k:'',t:0};openDetail(k)}else tap={k,t:n}});
}
function polishAccess(){
  const a=$('access-admin');if(!a)return;
  const p=a.querySelector('.access-photo-field');if(p)p.style.display='none';
  const name=$('access-name');if(name)name.placeholder='Ex.: Francifildo Pereira Sobral';
}
function paint(){paintMetrics();paintIntelligence();updateTop();polishAccess();bindDetail()}
async function load(){
  if(busy||!R?.enabled)return;busy=true;
  try{await R.connect();if(!R.session?.actor?.canManage)return;cache=await R.call('team');paint()}
  catch(e){if(cache)paint()}
  finally{busy=false}
}
function bind(){
  shell();
  ['anchor','seller','sort','branch','hero-branch'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(load,120)));
  document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>setTimeout(load,120)));
  $('refresh')?.addEventListener('click',()=>setTimeout(load,180));
  $('close-detail')?.addEventListener('click',()=>document.getElementById('detail')?.close());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();load()},{once:true});else{bind();load()}
window.addEventListener('load',()=>setTimeout(load,250),{once:true});
setInterval(()=>{if(!document.hidden)load()},60000);
})();

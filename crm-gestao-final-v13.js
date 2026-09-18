(function(){
'use strict';
const $=id=>document.getElementById(id);
const R=window.FSCRMRemote;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=n=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OPEN=new Set(['negociacao','aguardando','agendado','aguardando_produto','outro']);
let cache=null,busy=false,painting=false;

function isoDay(v){
  if(!v)return '';
  const raw=String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(raw))return raw.slice(0,10);
  const d=new Date(v);if(Number.isNaN(d.getTime()))return '';
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function history(r){return Array.isArray(r?.history)?r.history:[]}
function stamp(h){return h?.at||h?.date||h?.timestamp||h?.createdAt||h?.when||h?.time||''}
function lastHistory(r,re){const a=history(r).filter(h=>re.test(String(h?.detail||h?.action||h?.type||''))&&stamp(h));return a.length?stamp(a[a.length-1]):''}
function completedStamp(r){return r?.completedAt||r?.closedAt||r?.wonAt||lastHistory(r,/conclu|realiz|vend[ai].*fech|ganh/i)||r?.updatedAt||r?.createdAt||''}
function lossStamp(r){return r?.lostAt||r?.closedAt||r?.lossDate||lastHistory(r,/perd|não conclu|nao conclu|desist|finaliz/i)||r?.updatedAt||r?.createdAt||''}
function periodKind(){return $('fs-v13-period')?.value||document.querySelector('[data-period][aria-pressed="true"]')?.dataset?.period||'mes'}
function period(){
  const a=$('anchor')?.value;if(!/^\d{4}-\d{2}-\d{2}$/.test(a||''))return null;
  if(window.FSCRMBI?.period)return window.FSCRMBI.period(periodKind(),a);
  return {start:a,end:a};
}
function inPeriod(v,p){const d=isoDay(v);return !!(p&&d&&d>=p.start&&d<=p.end)}
function selectedBranch(){return String($('hero-branch')?.value||$('branch')?.value||'')}
function selectedSeller(){return String($('seller')?.value||'')}
function records(){
  if(!cache)return [];
  const br=selectedBranch(),sel=selectedSeller();
  return (cache.records||[]).filter(r=>(!br||norm(r.branch)===br)&&(!sel||String(r.ownerId)===sel));
}
function users(){
  if(!cache)return [];
  const br=selectedBranch(),sel=selectedSeller();
  return (cache.users||[]).filter(u=>(!br||norm(u.branch)===br)&&(!sel||String(u.id)===sel));
}
function created(){const p=period();return records().filter(r=>!p||inPeriod(r.createdAt,p))}
function completed(){const p=period();return records().filter(r=>r.status==='ganha'&&(!p||inPeriod(completedStamp(r),p)))}
function lost(){const p=period();return records().filter(r=>r.status==='perdida'&&String(r.reason||'').trim()&&(!p||inPeriod(lossStamp(r),p)))}
function openNow(){return records().filter(r=>OPEN.has(r.status))}
function scheduled(){return openNow().filter(r=>r.status==='agendado'||r.status==='aguardando_produto')}
function contacts(){
  const p=period();let n=0;
  records().forEach(r=>history(r).forEach(h=>{
    if(!/contato|whatsapp|mensagem|retorno/i.test(String(h?.detail||h?.action||h?.type||'')))return;
    if(!p||inPeriod(stamp(h),p))n++;
  }));
  return n;
}
function summary(){
  const c=created(),w=completed(),l=lost(),o=openNow(),a=scheduled();
  return {created:c.length,wins:w.length,open:o.length,scheduled:a.length,contacts:contacts(),
    conversion:c.length?w.length/c.length*100:0,
    potential:o.reduce((s,r)=>s+Number(r.amount||0),0),
    lostValue:l.reduce((s,r)=>s+Number(r.amount||0),0),
    value:w.reduce((s,r)=>s+Number(r.amount||0),0)};
}

function buildTopbar(){
  const top=document.querySelector('.fs-bi-topbar');if(!top)return;
  const hero=document.querySelector('.hero');if(hero)hero.classList.add('fs-v13-hidden-source');
  const filter=document.querySelector('.executive-filter-wrap');if(filter)filter.classList.add('fs-v13-hidden-source');
  top.innerHTML='<strong>Gestão da equipe</strong><div class="fs-v13-toolbar" id="fs-v13-toolbar"></div>';
  const bar=$('fs-v13-toolbar');

  const wrap=(label,el,cls='')=>{const d=document.createElement('label');d.className='fs-v13-control '+cls;const s=document.createElement('span');s.textContent=label;d.append(s,el);bar.appendChild(d);return d};
  const br=$('hero-branch');if(br){br.removeAttribute('hidden');wrap('Filial / equipe',br,'branch')}
  const sel=$('seller');if(sel)wrap('Vendedor',sel,'seller');

  const psel=document.createElement('select');psel.id='fs-v13-period';psel.innerHTML='<option value="dia">Dia</option><option value="semana">Semana</option><option value="quinzena">Quinzena</option><option value="mes">Mês</option>';
  psel.value=document.querySelector('[data-period][aria-pressed="true"]')?.dataset?.period||'mes';
  wrap('Período',psel,'period');
  const anchor=$('anchor');if(anchor)wrap('Referência',anchor,'anchor');
  const sort=$('sort');if(sort)wrap('Ordenar',sort,'sort');
  const refresh=$('refresh');if(refresh){refresh.textContent='Aplicar análise';refresh.classList.add('fs-v13-apply');bar.appendChild(refresh)}
  const range=$('period-label');if(range){range.classList.add('fs-v13-range');bar.appendChild(range)}

  psel.addEventListener('change',()=>{
    const b=document.querySelector('[data-period="'+psel.value+'"]');if(b)b.click();setTimeout(refreshAll,120);
  });
}

function accessModal(){
  const nav=document.querySelector('.fs-bi-nav');if(!nav||$('fs-v13-access-link'))return;
  const link=document.createElement('a');link.href='#';link.id='fs-v13-access-link';link.innerHTML='➕ Criar acesso';
  const cfg=[...nav.querySelectorAll('a')].find(a=>/Configura/i.test(a.textContent||''));
  if(cfg)cfg.insertAdjacentElement('afterend',link);else nav.appendChild(link);
  const back=document.createElement('a');back.href='./orcamentos.html?crm=1';back.className='fs-v13-back';back.innerHTML='← Voltar aos orçamentos';nav.insertAdjacentElement('afterend',back);

  let dialog=$('fs-v13-access-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='fs-v13-access-dialog';dialog.className='fs-v13-access-dialog';dialog.innerHTML='<div class="fs-v13-dialog-head"><div><small>ACESSOS DA EQUIPE</small><h2>Criar acesso de colaborador</h2></div><button type="button" aria-label="Fechar">×</button></div><div id="fs-v13-access-body"></div>';document.body.appendChild(dialog);dialog.querySelector('button').onclick=()=>dialog.close();}
  const create=document.querySelector('.access-create-wrap');
  if(create){create.open=true;create.classList.add('fs-v13-access-moved');$('fs-v13-access-body').appendChild(create)}
  link.addEventListener('click',e=>{e.preventDefault();dialog.showModal()});
}

function paintMetrics(){
  const box=$('metrics');if(!box||!cache||painting)return;painting=true;
  const m=summary();
  const rows=[
    ['budget','Pesquisas de orçamento',m.created,'Criadas no período'],
    ['wins','Vendas concluídas',m.wins,'Fechadas no período'],
    ['conversion','Conversão',pct(m.conversion),'Vendas ÷ pesquisas'],
    ['open','Em aberto',m.open,'Posição atual da carteira'],
    ['scheduled','Agendados',m.scheduled,'Retorno ou produto'],
    ['potential','Valor potencial',money(m.potential),'Carteira atual em aberto'],
    ['lost','Valor perdido',money(m.lostValue),'Perdas finalizadas no período'],
    ['value','Valor concluído',money(m.value),'Vendas fechadas no período']
  ];
  const html=rows.map(([k,t,v,s])=>'<button type="button" class="fs-v12-metric" data-metric="'+k+'" '+(k==='conversion'?'data-no-detail="1"':'')+'><small>'+t+'</small><strong>'+v+'</strong><span>'+s+'</span></button>').join('');
  if(box.innerHTML!==html)box.innerHTML=html;
  painting=false;
}

function readField(r,names){for(const n of names){const v=r?.[n];if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return ''}
function competitorValue(r){return Number(readField(r,['competitorValue','competitorAmount','competitionValue','valorConcorrencia','lossCompetitorValue'])||0)}
function competitorName(r){return String(readField(r,['competitor','competitorName','concorrente','lossCompetitor'])||'').trim()}
function evidenceCount(r){const a=readField(r,['attachments','evidence','files','anexos']);return Array.isArray(a)?a.length:(a?1:0)}
function sellerName(r){return (cache?.users||[]).find(u=>String(u.id)===String(r.ownerId))?.name||r.seller||'Sem vendedor'}
function paintLosses(){
  if(!cache)return;const losses=lost();
  const kpi=$('loss-kpis'),ranking=$('loss-ranking'),donut=$('loss-donut'),comp=$('competitor-ranking'),trend=$('loss-trend'),cases=$('loss-cases'),count=$('loss-case-count');
  if(!kpi||!ranking||!donut||!comp||!trend||!cases)return;
  const total=losses.reduce((s,r)=>s+Number(r.amount||0),0),ev=losses.reduce((s,r)=>s+evidenceCount(r),0);
  const gaps=losses.map(r=>Math.abs(Number(r.amount||0)-competitorValue(r))).filter(v=>v>0&&Number.isFinite(v));const gap=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:0;
  kpi.innerHTML=[['PERDAS REGISTRADAS',losses.length,'Casos não convertidos'],['VALOR PERDIDO',money(total),'Perdas finalizadas no período'],['COM EVIDÊNCIA',ev,'Foto, print ou PDF'],['GAP MÉDIO CONCORRÊNCIA',money(gap),'Diferença média de preço']].map((x,i)=>'<div><small>'+x[0]+'</small><strong>'+x[1]+'</strong><span>'+x[2]+'</span><i>0'+(i+1)+'</i></div>').join('');
  const reasons={};losses.forEach(r=>{const q=String(r.reason||'Não informado').trim()||'Não informado';reasons[q]=(reasons[q]||0)+1});
  const rr=Object.entries(reasons).sort((a,b)=>b[1]-a[1]);const max=Math.max(1,...rr.map(x=>x[1]));
  ranking.innerHTML=rr.length?rr.map(([n,v],i)=>'<div class="loss-rank-row"><span>'+(i+1)+'</span><div><strong>'+esc(n)+'</strong><em>'+v+' · '+pct(losses.length?v/losses.length*100:0)+'</em><b><i style="width:'+(v/max*100)+'%"></i></b></div></div>').join(''):'<p class="branch-empty">Nenhuma perda finalizada no período.</p>';
  const top=rr.slice(0,5),colors=['#6657d9','#3786ea','#d95b77','#e4a11b','#2aa28f'];let acc=0;const grad=top.map(([n,v],i)=>{const a=acc,b=acc+(losses.length?v/losses.length*100:0);acc=b;return colors[i%colors.length]+' '+a+'% '+b+'%'}).join(',');
  donut.innerHTML=losses.length?'<div class="loss-donut-wrap"><div class="loss-donut-chart" style="background:conic-gradient('+grad+')"><span><strong>'+losses.length+'</strong><small>PERDAS</small></span></div><div class="loss-donut-legend">'+top.map(([n,v],i)=>'<div><span><i style="background:'+colors[i%colors.length]+'"></i>'+esc(n)+'</span><b>'+v+' <small>'+pct(v/losses.length*100)+'</small></b></div>').join('')+'</div></div>':'<p class="branch-empty">Sem perdas no período.</p>';
  const cs={};losses.forEach(r=>{const n=competitorName(r);if(n)cs[n]=(cs[n]||0)+1});const cr=Object.entries(cs).sort((a,b)=>b[1]-a[1]);const cm=Math.max(1,...cr.map(x=>x[1]));
  comp.innerHTML=cr.length?cr.map(([n,v],i)=>'<div class="loss-rank-row"><span>'+(i+1)+'</span><div><strong>'+esc(n)+'</strong><em>'+v+'</em><b><i style="width:'+(v/cm*100)+'%"></i></b></div></div>').join(''):'<p class="branch-empty">Nenhum concorrente informado.</p>';
  const dm={};losses.forEach(r=>{const d=isoDay(lossStamp(r));if(d)dm[d]=(dm[d]||0)+1});const dr=Object.entries(dm).sort((a,b)=>a[0].localeCompare(b[0]));const dmax=Math.max(1,...dr.map(x=>x[1]));
  trend.innerHTML=dr.length?dr.map(([d,v])=>'<div class="loss-trend-bar"><span style="height:'+Math.max(12,v/dmax*100)+'%"></span><small>'+d.slice(8,10)+'/'+d.slice(5,7)+'</small><b>'+v+'</b></div>').join(''):'<p class="branch-empty">Sem perdas no período.</p>';
  if(count)count.textContent=losses.length+' caso'+(losses.length===1?'':'s');
  cases.innerHTML=losses.length?losses.map(r=>'<article class="loss-case"><span class="loss-badge">'+esc(r.reason||'Não informado')+'</span><h4>'+esc(r.client||'Cliente')+'</h4><p>'+esc(r.product||'Produto')+' · '+esc(sellerName(r))+'</p><p>'+esc(isoDay(lossStamp(r))||'—')+' · Proposta '+money(r.amount||0)+(competitorValue(r)?' · Concorrência '+money(competitorValue(r)):'')+'</p>'+(competitorName(r)?'<p><strong>Concorrente:</strong> '+esc(competitorName(r))+'</p>':'')+'</article>').join(''):'<p class="branch-empty">Nenhuma perda finalizada no período.</p>';
}

function stablePaint(){paintMetrics();paintLosses()}
async function refreshAll(){
  if(busy||!R?.enabled)return;busy=true;
  try{await R.connect();cache=await R.call('team');stablePaint();
    const scope=document.querySelector('.fs-v12-scope');if(scope)scope.insertAdjacentHTML('beforeend','<span class="fs-bi-chip fs-v13-team-badge">👥 '+users().length+' vendedor(es) consolidados</span>');
  }catch(e){if(cache)stablePaint();}
  finally{busy=false}
}
function bindChanges(){
  ['hero-branch','seller','anchor','sort'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(refreshAll,80)));
  $('refresh')?.addEventListener('click',()=>setTimeout(refreshAll,140));
  const metrics=$('metrics'),loss=$('loss-intel');
  const ob=new MutationObserver(()=>{if(painting||!cache)return;requestAnimationFrame(stablePaint)});
  if(metrics)ob.observe(metrics,{childList:true,subtree:false});
  if(loss)ob.observe(loss,{childList:true,subtree:true});
}
function boot(){
  buildTopbar();accessModal();bindChanges();refreshAll();
  setInterval(()=>{if(!document.hidden)refreshAll()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,20),{once:true});else setTimeout(boot,20);
})();

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
function brDay(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));return m?`${m[3]}/${m[2]}/${m[1]}`:''}
function parseRangeLabel(txt){const m=String(txt||'').match(/(\d{2})\/(\d{2})\/(\d{4}).*?(\d{2})\/(\d{2})\/(\d{4})/);return m?{start:`${m[3]}-${m[2]}-${m[1]}`,end:`${m[6]}-${m[5]}-${m[4]}`} : null}
function setRangeLabel(start,end){const el=$('period-label');if(el&&start&&end)el.textContent=`${brDay(start)} a ${brDay(end)}`}
function history(r){return Array.isArray(r?.history)?r.history:[]}
function stamp(h){return h?.at||h?.date||h?.timestamp||h?.createdAt||h?.when||h?.time||''}
function lastHistory(r,re){const a=history(r).filter(h=>re.test(String(h?.detail||h?.action||h?.type||''))&&stamp(h));return a.length?stamp(a[a.length-1]):''}
function completedStamp(r){return r?.completedAt||r?.closedAt||r?.wonAt||lastHistory(r,/conclu|realiz|vend[ai].*fech|ganh/i)||r?.updatedAt||r?.createdAt||''}
function lossStamp(r){return r?.lostAt||r?.closedAt||r?.lossDate||lastHistory(r,/perd|não conclu|nao conclu|desist|finaliz/i)||r?.updatedAt||r?.createdAt||''}
function periodKind(){return $('fs-v13-period')?.value||document.querySelector('[data-period][aria-pressed="true"]')?.dataset?.period||'mes'}
function period(){
  const start=$('fs-v13-start')?.value,end=$('fs-v13-end')?.value;
  if(/^\d{4}-\d{2}-\d{2}$/.test(start||'')&&/^\d{4}-\d{2}-\d{2}$/.test(end||'')){
    const s=start<=end?start:end,e=end>=start?end:start;
    return {start:s,end:e};
  }
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

function syncRangeInputs(fromPeriodKind=false){
  const start=$('fs-v13-start'),end=$('fs-v13-end'),anchor=$('anchor');
  if(!start||!end)return;
  let s=start.value||anchor?.value||isoDay(new Date());
  if(fromPeriodKind&&window.FSCRMBI?.period){
    const p=window.FSCRMBI.period(periodKind(),s);
    if(p?.start&&p?.end){start.value=p.start;end.value=p.end;s=p.start;}
  }
  if(anchor&&s)anchor.value=s;
  if(start.value&&end.value&&start.value>end.value)end.value=start.value;
  setRangeLabel(start.value,end.value);
  updateMobileSummary();
}

function buildTopbar(){
  const top=document.querySelector('.fs-bi-topbar');if(!top)return;
  const hero=document.querySelector('.hero');if(hero)hero.classList.add('fs-v13-hidden-source');
  const filter=document.querySelector('.executive-filter-wrap');if(filter)filter.classList.add('fs-v13-hidden-source');
  top.innerHTML='<strong class="fs-v13-topbar-title">Gestão da equipe</strong><button type="button" id="fs-v13-mobile-summary" aria-expanded="true"><span>Filtros da análise</span><strong id="fs-v13-mobile-summary-text">Período atual</strong></button><div class="fs-v13-toolbar" id="fs-v13-toolbar"></div>';
  const bar=$('fs-v13-toolbar');

  const wrap=(label,el,cls='')=>{const d=document.createElement('label');d.className='fs-v13-control '+cls;const s=document.createElement('span');s.textContent=label;d.append(s,el);bar.appendChild(d);return d};
  const br=$('hero-branch');if(br){br.removeAttribute('hidden');wrap('Filial / equipe',br,'branch')}
  const sel=$('seller');if(sel)wrap('Vendedor',sel,'seller');

  const psel=document.createElement('select');psel.id='fs-v13-period';psel.innerHTML='<option value="dia">Dia</option><option value="semana">Semana</option><option value="quinzena">Quinzena</option><option value="mes">Mês</option>';
  psel.value=document.querySelector('[data-period][aria-pressed="true"]')?.dataset?.period||'mes';
  wrap('Período',psel,'period');
  const initial=period()||parseRangeLabel($('period-label')?.textContent)||{start:$('anchor')?.value||'',end:$('anchor')?.value||''};
  const startInput=document.createElement('input');startInput.type='date';startInput.id='fs-v13-start';startInput.value=initial.start||'';
  wrap('Data início',startInput,'start');
  const endInput=document.createElement('input');endInput.type='date';endInput.id='fs-v13-end';endInput.value=initial.end||initial.start||'';
  wrap('Data fim',endInput,'end');
  const sort=$('sort');if(sort)wrap('Ordenar',sort,'sort');
  const refresh=$('refresh');if(refresh){refresh.textContent='Aplicar análise';refresh.classList.add('fs-v13-apply');bar.appendChild(refresh)}
  const range=$('period-label');if(range){range.classList.add('fs-v13-range');bar.appendChild(range)}

  psel.addEventListener('change',()=>{
    const b=document.querySelector('[data-period="'+psel.value+'"]');if(b)b.click();
    syncRangeInputs(true);
    setTimeout(refreshAll,120);
  });

  syncRangeInputs(false);
  updateMobileSummary();
  const summaryBtn=$('fs-v13-mobile-summary');
  if(summaryBtn){
    /* O painel mobile é controlado apenas pelo menu v15 para evitar conflito. */
    summaryBtn.setAttribute('aria-expanded','false');
  }
}

function updateMobileSummary(){
  const out=$('fs-v13-mobile-summary-text'); if(!out) return;
  const brText=$('hero-branch')?.selectedOptions?.[0]?.textContent?.trim()||'Todas as filiais';
  const sellerText=$('seller')?.selectedOptions?.[0]?.textContent?.trim()||'Toda a equipe';
  const rangeText=$('period-label')?.textContent?.trim()||'';
  out.textContent=[brText,sellerText,rangeText].filter(Boolean).join(' · ');
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
    const scope=document.querySelector('.fs-v12-scope');if(scope){let badge=scope.querySelector('.fs-v13-team-badge');if(!badge){scope.insertAdjacentHTML('beforeend','<span class="fs-bi-chip fs-v13-team-badge"></span>');badge=scope.querySelector('.fs-v13-team-badge')}if(badge)badge.textContent='👥 '+users().length+' vendedor(es) consolidados';}
    const pr=period(); if(pr) setRangeLabel(pr.start,pr.end); updateMobileSummary();
  }catch(e){if(cache)stablePaint();}
  finally{busy=false}
}
function bindMobileHeader(){
  const top=document.querySelector('.fs-bi-topbar');
  if(!top)return;
  let lastY=window.scrollY||0;
  let ticking=false;
  const sync=()=>{
    ticking=false;
    const mobile=window.innerWidth<=900;
    if(!mobile){document.body.classList.remove('fs-mobile-header-collapsed');const btn=$('fs-v13-mobile-summary');if(btn)btn.setAttribute('aria-expanded','true');return;}
    const y=window.scrollY||0;
    const delta=y-lastY;
    const btn=$('fs-v13-mobile-summary');
    if(y<40){document.body.classList.remove('fs-mobile-header-collapsed');if(btn)btn.setAttribute('aria-expanded','true');}
    else if(delta>8&&y>100){document.body.classList.add('fs-mobile-header-collapsed');if(btn)btn.setAttribute('aria-expanded','false');}
    else if(delta<-8){document.body.classList.remove('fs-mobile-header-collapsed');if(btn)btn.setAttribute('aria-expanded','true');}
    lastY=y;
  };
  const onScroll=()=>{ if(!ticking){ ticking=true; requestAnimationFrame(sync);} };
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  top.addEventListener('focusin',()=>{document.body.classList.remove('fs-mobile-header-collapsed');const btn=$('fs-v13-mobile-summary');if(btn)btn.setAttribute('aria-expanded','true');});
  top.addEventListener('touchstart',()=>{document.body.classList.remove('fs-mobile-header-collapsed');const btn=$('fs-v13-mobile-summary');if(btn)btn.setAttribute('aria-expanded','true');},{passive:true});
  sync();
}

function bindChanges(){
  ['hero-branch','seller','anchor','sort'].forEach(id=>$(id)?.addEventListener('change',()=>{updateMobileSummary();setTimeout(refreshAll,80)}));
  ['fs-v13-start','fs-v13-end'].forEach(id=>$(id)?.addEventListener('change',()=>{syncRangeInputs(false);setTimeout(refreshAll,80)}));
  $('refresh')?.addEventListener('click',()=>setTimeout(refreshAll,140));
  const metrics=$('metrics'),loss=$('loss-intel');
  const ob=new MutationObserver(()=>{if(painting||!cache)return;requestAnimationFrame(stablePaint)});
  if(metrics)ob.observe(metrics,{childList:true,subtree:false});
  if(loss)ob.observe(loss,{childList:true,subtree:true});
}
function injectIOSManagement(){
  if(document.getElementById('fs-ios-gestao-v14'))return;
  const s=document.createElement('style');s.id='fs-ios-gestao-v14';s.textContent=`
    :root{--ios-bg:#f2f2f7;--ios-card:#fff;--ios-line:rgba(60,60,67,.12);--ios-text:#1c1c1e;--ios-sub:#6e6e73;--ios-blue:#0a84ff;--ios-indigo:#5e5ce6;--ios-green:#30d158;--ios-red:#ff453a;--ios-amber:#ff9f0a;--ios-shadow:0 10px 30px rgba(28,28,30,.07)}
    html,body,button,input,select,textarea{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif!important;-webkit-font-smoothing:antialiased}
    body.fs-bi-v12{background:var(--ios-bg)!important;color:var(--ios-text)!important}
    .fs-bi-sidebar{position:fixed!important;top:0!important;bottom:0!important;background:rgba(255,255,255,.92)!important;border-right:1px solid var(--ios-line)!important;backdrop-filter:blur(24px) saturate(170%)!important;box-shadow:8px 0 28px rgba(28,28,30,.035)!important;overflow-y:auto!important}
    .fs-bi-logo i{background:linear-gradient(135deg,var(--ios-blue),var(--ios-indigo))!important;border-radius:13px!important;box-shadow:0 8px 18px rgba(94,92,230,.24)!important}
    .fs-bi-nav a{border-radius:13px!important;transition:.15s ease!important}
    .fs-bi-nav a:hover{background:rgba(10,132,255,.075)!important;transform:translateX(2px)!important}
    .fs-bi-nav a.active{background:rgba(10,132,255,.11)!important;color:#0066d6!important}
    .fs-bi-topbar{background:rgba(255,255,255,.84)!important;border-bottom:1px solid var(--ios-line)!important;backdrop-filter:blur(24px) saturate(180%)!important;box-shadow:0 5px 24px rgba(28,28,30,.035)!important}
    .fs-v13-control select,.fs-v13-control input{border:1px solid var(--ios-line)!important;border-radius:13px!important;background:#f8f8fa!important;height:38px!important}
    .fs-v13-apply{border-radius:13px!important;background:linear-gradient(135deg,var(--ios-blue),var(--ios-indigo))!important}
    body.fs-bi-v12 #metrics{gap:14px!important}
    .fs-v12-metric{border-radius:18px!important;border-color:var(--ios-line)!important;background:#fff!important;box-shadow:0 6px 18px rgba(28,28,30,.055)!important;transition:transform .16s ease,box-shadow .16s ease,background .16s ease!important;will-change:transform}
    .fs-v12-metric:hover,.fs-v12-metric:focus-visible{transform:translateY(-3px) scale(1.012)!important;background:#f7fbff!important;box-shadow:0 16px 34px rgba(10,132,255,.12)!important}
    .fs-team-intelligence,.loss-intel,.access-list-wrap,.access-create-wrap,.seller-card{border:1px solid var(--ios-line)!important;border-radius:22px!important;background:#fff!important;box-shadow:var(--ios-shadow)!important}
    .fs-v12-panel,.loss-panel{border-radius:18px!important;border-color:var(--ios-line)!important;transition:transform .15s ease,box-shadow .15s ease!important}
    .fs-v12-panel:hover,.loss-panel:hover{transform:translateY(-2px)!important;box-shadow:0 12px 28px rgba(28,28,30,.07)!important}
    .fs-v12-mini>span{border-radius:12px!important;background:#f7f7fa!important;border-color:var(--ios-line)!important}
    .seller-card{border-top:3px solid rgba(10,132,255,.75)!important}
    dialog{border-radius:26px!important;border:1px solid var(--ios-line)!important;box-shadow:0 30px 90px rgba(0,0,0,.24)!important}
    dialog::backdrop{background:rgba(20,20,24,.34)!important;backdrop-filter:blur(12px)!important}
    *{scrollbar-width:thin;scrollbar-color:rgba(60,60,67,.25) transparent}
    *::-webkit-scrollbar{width:8px;height:8px}*::-webkit-scrollbar-thumb{background:rgba(60,60,67,.22);border-radius:999px}
    #fs-v13-mobile-summary{display:none}
    @media(max-width:900px){
      .fs-bi-sidebar{left:10px!important;right:10px!important;top:auto!important;bottom:10px!important;width:auto!important;height:60px!important;padding:6px!important;border:1px solid rgba(255,255,255,.72)!important;border-radius:20px!important;background:rgba(248,248,250,.88)!important;box-shadow:0 14px 40px rgba(28,28,30,.16)!important;overflow:visible!important;z-index:1200!important}
      .fs-bi-logo,.fs-bi-support,.fs-v13-back{display:none!important}
      .fs-bi-nav{display:grid!important;grid-template-columns:repeat(6,1fr)!important;gap:2px!important;height:100%!important}
      .fs-bi-nav a{padding:6px 2px!important;justify-content:center!important;font-size:0!important;min-width:0!important;text-align:center!important}
      .fs-bi-nav a::first-letter{font-size:18px!important}
      .fs-bi-topbar{margin-left:0!important;top:0!important;padding:8px 10px 10px!important;border-radius:0 0 18px 18px!important;position:sticky!important;z-index:1100!important;display:grid!important;grid-template-columns:1fr auto!important;grid-template-areas:'title summary' 'toolbar toolbar';align-items:start!important;gap:8px!important;overflow:hidden!important;transition:max-height .28s ease,padding .28s ease,box-shadow .2s ease,background .2s ease!important;max-height:420px!important}
      .fs-v13-topbar-title{grid-area:title;align-self:center!important}
      #fs-v13-mobile-summary{display:flex!important;grid-area:summary;align-items:flex-start!important;justify-content:center!important;flex-direction:column!important;gap:2px!important;padding:8px 10px!important;border-radius:14px!important;border:1px solid rgba(60,60,67,.12)!important;background:rgba(255,255,255,.75)!important;color:#1c1c1e!important;box-shadow:0 4px 14px rgba(28,28,30,.06)!important;min-width:0!important;max-width:48vw!important;text-align:left!important}
      #fs-v13-mobile-summary span{font-size:11px!important;letter-spacing:.02em!important;color:#6e6e73!important}
      #fs-v13-mobile-summary strong{font-size:11px!important;line-height:1.25!important;font-weight:700!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%}
      .fs-v13-toolbar{grid-area:toolbar;display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;transition:opacity .2s ease,transform .2s ease,max-height .28s ease!important;max-height:390px!important;opacity:1!important}
      .fs-v13-control.branch,.fs-v13-apply,.fs-v13-range{grid-column:1/-1!important}
      .fs-v13-apply{min-height:42px!important}
      body.fs-mobile-header-collapsed .fs-bi-topbar{max-height:62px!important;padding-bottom:6px!important;box-shadow:0 10px 22px rgba(28,28,30,.08)!important}
      body.fs-mobile-header-collapsed .fs-v13-toolbar{max-height:0!important;opacity:0!important;pointer-events:none!important;transform:translateY(-8px)!important;overflow:hidden!important}
      body.fs-bi-v12 main{margin-left:0!important;padding:12px 12px 90px!important}
      body.fs-bi-v12 #metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
      .fs-v12-metric{min-height:108px!important;padding:13px!important}
      .fs-v12-metric strong{font-size:20px!important}
      .fs-v12-grid{grid-template-columns:1fr!important}
      .loss-grid-3{grid-template-columns:1fr!important}
      .seller-cards{grid-template-columns:1fr!important}
      .fs-v12-mini{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    }
  `;document.head.appendChild(s);
}
function boot(){
  injectIOSManagement();
  buildTopbar();accessModal();bindChanges();bindMobileHeader();refreshAll();
  setInterval(()=>{if(!document.hidden)refreshAll()},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,20),{once:true});else setTimeout(boot,20);
})();
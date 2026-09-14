(function(){
'use strict';
const R=window.FSCRMRemote,B=window.FSCRMBI,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={negociacao:'Em negociação',aguardando:'Aguardando resposta',agendado:'Retorno agendado',ganha:'Concluída',perdida:'Não concluída'};
const date=s=>s?new Date(s.length===10?s+'T12:00:00Z':s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=v=>v===null?'—':v.toFixed(1).replace('.',',')+'%';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function sameDayValue(v){try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));}catch(e){return '';}}
function readLegacyRows(){try{const rows=JSON.parse(localStorage.getItem('calculosDesconto')||'[]');return Array.isArray(rows)?rows.filter(r=>r&&r.fs_crm_v1&&r.fs_crm_v1.kind==='cliente'):[];}catch(e){return [];}}
function legacyMatchesRecord(row,record){return norm(row.vendedor)===norm(record.seller)&&norm(row.cliente)===norm(record.client)&&norm(row.codigo_produto)===norm(record.product)&&sameDayValue(row.data_calculo)===sameDayValue(record.createdAt)&&Math.abs(Number(row.preco_promocional||0)-Number(record.amount||0))<0.01;}
async function syncLegacyRowsToCentral(records,branch){if(!R.enabled)return 0;const rows=readLegacyRows();if(!rows.length)return 0;const branchNorm=norm(branch||localStorage.getItem('fs_filial')||'');let created=0;for(const row of rows){const meta=row.fs_crm_v1||{};if(meta.kind!=='cliente')continue;const rowBranch=norm(meta.branch||branchNorm);if(branchNorm&&rowBranch&&rowBranch!==branchNorm)continue;if((records||[]).some(r=>legacyMatchesRecord(row,r)))continue;try{await R.call('create',{legacy:row,meta:{kind:'cliente',channel:meta.channel||'presencial',buyer:meta.buyer||'proprio',next:meta.next||sameDayValue(new Date())||'',consent:!!meta.consent},imported:true});created++;}catch(e){}}return created;}
let data=null,kind='mes',summary=null,loading=false,lastFocus=null;
let lastAccess=null;


function prettyBranch(value){
 const raw=String(value||'').trim().replace(/\s+/g,' ');
 if(!raw)return 'Filial não informada';
 return raw.split(' ').map(part=>{
  if(/^\d+$/.test(part))return part;
  if(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(part))return part.toUpperCase();
  return part.charAt(0).toUpperCase()+part.slice(1).toLowerCase();
 }).join(' ');
}
function branchGroups(){
 if(!data)return [];
 const map=new Map();
 (data.users||[]).forEach(u=>{
  const key=norm(u.branch);if(!key)return;
  if(!map.has(key))map.set(key,{key,name:prettyBranch(u.branch),users:[],records:[]});
  map.get(key).users.push(u);
 });
 (data.records||[]).forEach(r=>{
  const key=norm(r.branch);if(!key)return;
  if(!map.has(key))map.set(key,{key,name:prettyBranch(r.branch),users:[],records:[]});
  map.get(key).records.push(r);
 });
 // Garante registros mesmo quando a filial já veio pela lista de usuários.
 for(const g of map.values())g.records=(data.records||[]).filter(r=>norm(r.branch)===g.key);
 return [...map.values()];
}
function selectedBranchKey(){
 if(!data)return '';
 if(!data.actor.isOwner)return norm(data.actor.branch);
 return $('branch')?.value||'';
}
function scopedData(branchKey){
 if(!data)return {users:[],records:[]};
 if(!branchKey)return {users:[...(data.users||[])],records:[...(data.records||[])]};
 return {
  users:(data.users||[]).filter(u=>norm(u.branch)===branchKey),
  records:(data.records||[]).filter(r=>norm(r.branch)===branchKey)
 };
}
function refreshSellerOptions(){
 if(!data)return;
 const current=$('seller').value;
 const scope=scopedData(selectedBranchKey());
 const users=scope.users.filter(u=>u.track!==false);
 $('seller').innerHTML='<option value="">Toda a equipe</option>'+users.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.name)+'</option>').join('');
 $('seller').value=users.some(u=>u.id===current)?current:'';
}
function setupBranchControls(){
 if(!data)return;
 const groups=branchGroups();
 const isMultiOwner=data.actor.isOwner&&groups.length>1;
 const label=$('branch-filter-label'),select=$('branch');
 if(label)label.hidden=!isMultiOwner;
 if(select){
  const prev=select.value;
  select.innerHTML='<option value="">Todas as filiais</option>'+groups.map(g=>'<option value="'+esc(g.key)+'">'+esc(g.name)+'</option>').join('');
  select.value=groups.some(g=>g.key===prev)?prev:'';
 }
 const overview=$('branch-overview');
 if(overview)overview.hidden=!isMultiOwner;
 refreshSellerOptions();
}
function branchSummaryHtml(name,users,records,p){
 const s=B.summarize(records,users,p),t=s.totals;
 const reasons={};s.perSeller.forEach(r=>Object.entries(r.reasons).forEach(([k,v])=>reasons[k]=(reasons[k]||0)+v));
 const reasonRows=Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const sellers=s.perSeller.slice().sort((a,b)=>a.user.name.localeCompare(b.user.name,'pt-BR'));
 return '<div class="branch-dialog-metrics">'+[
  ['Orçamentos',t.total],['Vendas',t.wins],['Conversão',pct(t.conversion)],['Contatos',t.contacts],['Atrasados',t.late],['Valor concluído',money(t.value)]
 ].map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+v+'</strong></div>').join('')+'</div>'+
 '<section class="branch-dialog-section"><h3>Principais motivos de não fechamento</h3>'+(reasonRows.length?reasonRows.map(([k,v])=>'<div class="branch-reason-row"><span>'+esc(k||'Não informado')+'</span><strong>'+v+'</strong></div>').join(''):'<p class="branch-empty">Nenhuma perda registrada no período.</p>')+'</section>'+
 '<section class="branch-dialog-section"><div class="branch-dialog-section-head"><h3>Vendedores</h3><span>'+sellers.length+' colaborador'+(sellers.length===1?'':'es')+'</span></div><div class="branch-seller-list">'+(sellers.length?sellers.map(r=>{
  const initials=r.user.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('');
  return '<details class="branch-seller-row"><summary><span class="avatar">'+esc(initials)+'</span><div><strong>'+esc(r.user.name)+'</strong><small>'+esc(prettyBranch(r.user.branch||name))+'</small></div><span class="branch-seller-conv">'+pct(r.conversion)+'</span></summary><div class="branch-seller-detail"><span><b>'+r.total+'</b> orçamentos</span><span><b>'+r.wins+'</b> vendas</span><span><b>'+r.contacts+'</b> contatos</span><span><b>'+r.late+'</b> atrasados</span><span><b>'+money(r.value)+'</b> concluído</span><div class="tags">'+Object.entries(r.status).map(([k,v])=>'<span class="tag '+(k==='ganha'?'won':k==='perdida'?'lost':'')+'">'+esc(labels[k])+': '+v+'</span>').join('')+'</div></div></details>';
 }).join(''):'<p class="branch-empty">Nenhum vendedor cadastrado.</p>')+'</div></section>';
}
function renderBranchOverview(p){
 const groups=branchGroups(),box=$('branch-list');if(!box)return;
 if(!data.actor.isOwner||groups.length<=1){$('branch-overview').hidden=true;return;}
 $('branch-overview').hidden=false;$('branch-count').textContent=groups.length+' filiais';
 const entries=[{key:'',name:'Todas as filiais',users:data.users,records:data.records},...groups];
 box.innerHTML=entries.map(g=>{
  const s=B.summarize(g.records||[],g.users||[],p),t=s.totals;
  return '<button type="button" class="branch-card '+(g.key===''?'all':'')+'" data-branch-panel="'+esc(g.key)+'"><span><strong>'+esc(g.name)+'</strong><small>'+(g.key===''?groups.length+' filiais':(g.users||[]).filter(u=>u.track!==false).length+' colaboradores')+'</small></span><span class="branch-card-kpi"><b>'+t.total+'</b> orç. · <b>'+t.wins+'</b> vendas · <b>'+pct(t.conversion)+'</b></span><i>›</i></button>';
 }).join('');
}
function openBranchDashboard(branchKey){
 if(!data)return;
 const p=B.period(kind,$('anchor').value),groups=branchGroups();
 const g=branchKey?groups.find(x=>x.key===branchKey):null;
 const scope=g?{users:g.users,records:g.records}:scopedData('');
 const name=g?g.name:'Todas as filiais';
 lastFocus=document.activeElement;
 $('branch-detail-title').textContent=name;
 $('branch-detail-period').textContent=date(p.start)+' a '+date(p.end);
 $('branch-detail-body').innerHTML=branchSummaryHtml(name,scope.users,scope.records,p);
 $('branch-detail').showModal();
}

function lossRecords(records,p){
 return records.filter(r=>r.status==='perdida'&&B.day(r.createdAt)>=p.start&&B.day(r.createdAt)<=p.end);
}
function rankBy(rows,keyFn,valueFn=()=>1){
 const m={};rows.forEach(r=>{const k=keyFn(r)||'Não informado';m[k]=(m[k]||0)+valueFn(r);});
 return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}
function renderBars(target,items,total){
 const box=$(target);if(!box)return;
 const max=Math.max(1,...items.map(x=>x[1]));
 box.innerHTML=items.length?items.map(([name,value],i)=>'<div class="loss-rank-row"><span class="loss-rank-pos">'+(i+1)+'</span><div class="loss-rank-main"><div><strong>'+esc(name)+'</strong><span>'+value+(total?' · '+(100*value/total).toFixed(1).replace('.',',')+'%':'')+'</span></div><div class="loss-rank-bar"><i style="width:'+(100*value/max)+'%"></i></div></div></div>').join(''):'<p>Nenhum dado de perda no período.</p>';
}

function renderLossDonut(items,total){
 const box=$('loss-donut'); if(!box)return;
 if(!items.length||!total){box.innerHTML='<div class="donut-empty"><span>0</span><small>Sem perdas no período</small></div>';return;}
 const top=items.slice(0,5),circ=2*Math.PI*44;
 let offset=0,parts='',legend='';
 top.forEach(([name,value],i)=>{
   const frac=value/total,dash=frac*circ;
   parts+='<circle class="donut-seg seg-'+(i+1)+'" cx="60" cy="60" r="44" stroke-dasharray="'+dash+' '+(circ-dash)+'" stroke-dashoffset="'+(-offset)+'"></circle>';
   offset+=dash;
   legend+='<div class="donut-legend-row"><span><i class="legend-dot seg-'+(i+1)+'"></i>'+esc(name)+'</span><strong>'+value+' <small>'+Math.round(frac*100)+'%</small></strong></div>';
 });
 const other=items.slice(5).reduce((s,x)=>s+x[1],0);
 if(other)legend+='<div class="donut-legend-row"><span><i class="legend-dot seg-other"></i>Outros</span><strong>'+other+' <small>'+Math.round(other/total*100)+'%</small></strong></div>';
 box.innerHTML='<div class="donut-wrap"><div class="donut-chart"><svg viewBox="0 0 120 120" role="img" aria-label="Distribuição das perdas"><circle class="donut-bg" cx="60" cy="60" r="44"></circle>'+parts+'</svg><div class="donut-center"><strong>'+total+'</strong><span>perdas</span></div></div><div class="donut-legend">'+legend+'</div></div>';
}

function renderLossIntel(records,p){
 const lost=lossRecords(records,p),potential=lost.reduce((s,r)=>s+Number(r.amount||0),0);
 const compRows=lost.filter(r=>r.lossCompetitorPrice>0),diff=compRows.reduce((s,r)=>s+Math.max(0,Number(r.amount||0)-Number(r.lossCompetitorPrice||0)),0);
 $('loss-kpis').innerHTML=[
  ['Perdas registradas',lost.length,'Casos não convertidos'],
  ['Valor potencial',money(potential),'Volume em negociação perdido'],
  ['Com evidência',lost.filter(r=>Array.isArray(r.evidence)&&r.evidence.length).length,'Foto, print ou PDF'],
  ['Gap médio concorrência',compRows.length?money(diff/compRows.length):'—','Diferença média de preço']
 ].map(([k,v,s],i)=>'<div class="loss-kpi kpi-'+(i+1)+'"><span class="kpi-index">0'+(i+1)+'</span><small>'+k+'</small><strong>'+v+'</strong><em>'+s+'</em></div>').join('');
 const reasons=rankBy(lost,r=>r.reason==='Preço'?'Preço da concorrência':r.reason);
 renderBars('loss-ranking',reasons,lost.length);
 renderLossDonut(reasons,lost.length);
 const competitors=rankBy(lost.filter(r=>r.lossCompetitor),r=>r.lossCompetitor);
 renderBars('competitor-ranking',competitors,0);
 const days={};lost.forEach(r=>{const d=B.day(r.createdAt);days[d]=(days[d]||0)+1;});
 const entries=Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0]));
 const max=Math.max(1,...entries.map(x=>x[1]));
 $('loss-trend').innerHTML=entries.length?entries.map(([d,v])=>'<div class="loss-trend-col" title="'+date(d)+': '+v+'"><i style="height:'+(22+78*v/max)+'%"></i><span>'+date(d).slice(0,5)+'</span><strong>'+v+'</strong></div>').join(''):'<p>Nenhuma perda registrada no período.</p>';
 $('loss-case-count').textContent=lost.length+' caso'+(lost.length===1?'':'s');
 $('loss-cases').innerHTML=lost.length?lost.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(r=>'<article class="loss-case"><div><span class="loss-badge">'+esc(r.reason==='Preço'?'Preço da concorrência':r.reason||'Não informado')+'</span><h4>'+esc(r.client)+'</h4><p>'+esc(r.product)+' · '+esc(r.seller)+'</p><small>'+date(r.createdAt)+' · Proposta '+money(r.amount)+(r.lossCompetitorPrice?' · Concorrência '+money(r.lossCompetitorPrice):'')+'</small>'+(r.lossCompetitor?'<p><strong>Concorrente:</strong> '+esc(r.lossCompetitor)+'</p>':'')+(r.lossNote?'<p><strong>Observação:</strong> '+esc(r.lossNote)+'</p>':'')+'</div><div class="loss-case-actions">'+((r.evidence||[]).length?'<button data-loss-evidence="'+esc(r.id)+'">Ver '+r.evidence.length+' anexo(s)</button>':'<span>Sem anexo</span>')+'</div></article>').join(''):'<p>Nenhuma perda registrada no período.</p>';
}
async function showLossEvidence(recordId){
 const r=data.records.find(x=>x.id===recordId);if(!r)return;
 const items=Array.isArray(r.evidence)?r.evidence:[];
 lastFocus=document.activeElement;$('detail-title').textContent='Evidências · '+r.client+' · SOMENTE LEITURA';
 $('detail-body').innerHTML='<p>Carregando '+items.length+' anexo(s)…</p>';$('detail').showModal();
 const blocks=[];
 for(const meta of items){
   try{
     const item=await R.call('attachment',{id:r.id,fileId:meta.id});
     const src='data:'+item.mime+';base64,'+item.base64;
     blocks.push(item.mime==='application/pdf'?'<article class="evidence-card"><strong>'+esc(item.name)+'</strong><p><a href="'+src+'" target="_blank">Abrir PDF</a></p></article>':'<article class="evidence-card"><strong>'+esc(item.name)+'</strong><img src="'+src+'" alt="Evidência comercial"></article>');
   }catch(e){blocks.push('<article class="evidence-card"><strong>'+esc(meta.name)+'</strong><p>Não foi possível carregar.</p></article>');}
 }
 $('detail-body').innerHTML=blocks.join('')||'<p>Nenhum anexo.</p>';
}
async function printLossReport(){
 if(!data)return;
 const anchor=$('anchor').value,p=B.period(kind,anchor),selected=$('seller').value;
 const sellerName=selected?($('seller').selectedOptions[0]?.textContent||'Colaborador selecionado'):'Toda a equipe';
 const records=data.records.filter(r=>(!selected||r.ownerId===selected));
 const lost=lossRecords(records,p);
 const potential=lost.reduce((s,r)=>s+Number(r.amount||0),0);
 const evidenceCount=lost.filter(r=>(r.evidence||[]).length).length;
 const reasons=rankBy(lost,r=>r.reason==='Preço'?'Preço da concorrência':r.reason);
 const competitors=rankBy(lost.filter(r=>r.lossCompetitor),r=>r.lossCompetitor);
 const compRows=lost.filter(r=>r.lossCompetitorPrice>0),diff=compRows.reduce((s,r)=>s+Math.max(0,Number(r.amount||0)-Number(r.lossCompetitorPrice||0)),0);
 const kpiHtml = [
   ['Perdas registradas',lost.length,'Casos não convertidos',1],
   ['Valor potencial',money(potential),'Volume em negociação perdido',2],
   ['Com evidência',evidenceCount,'Foto, print ou PDF',3],
   ['Gap médio concorrência',compRows.length?money(diff/compRows.length):'—','Diferença média de preço',4]
 ].map(([k,v,s,i])=>'<div class="loss-kpi kpi-'+i+'"><span class="kpi-index">0'+i+'</span><small>'+k+'</small><strong>'+v+'</strong><em>'+s+'</em></div>').join('');
 const rankingHtml = $('loss-ranking')?.innerHTML || '<p>Nenhum dado de perda no período.</p>';
 const donutHtml = $('loss-donut')?.innerHTML || '<div class="donut-empty"><span>0</span><small>Sem perdas no período</small></div>';
 const competitorsHtml = $('competitor-ranking')?.innerHTML || '<p>Nenhum concorrente informado.</p>';
 const trendHtml = $('loss-trend')?.innerHTML || '<p>Nenhuma perda registrada no período.</p>';

 let casesHtml='';
 for(const r of lost.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))){
   let evidenceHtml='';
   for(const meta of (r.evidence||[])){
     try{
       const item=await R.call('attachment',{id:r.id,fileId:meta.id});
       const src='data:'+item.mime+';base64,'+item.base64;
       evidenceHtml += item.mime==='application/pdf'
         ? '<a class="evidence-link" href="'+src+'" target="_blank" rel="noopener">📄 '+esc(item.name)+'</a>'
         : '<figure class="case-evidence"><img src="'+src+'" alt="Evidência comercial"><figcaption>'+esc(item.name)+'</figcaption></figure>';
     }catch(e){
       evidenceHtml += '<div class="evidence-missing">Não foi possível carregar '+esc(meta.name)+'.</div>';
     }
   }
   casesHtml += '<article class="print-case">'
      + '<div class="print-case-head"><span class="loss-badge">'+esc(r.reason==='Preço'?'Preço da concorrência':r.reason||'Não informado')+'</span><strong>'+esc(r.client)+'</strong></div>'
      + '<p class="print-case-meta">'+esc(r.product)+' · '+esc(r.seller)+' · '+date(r.createdAt)+' · Proposta '+money(r.amount)+'</p>'
      + (r.lossCompetitor?'<p><strong>Concorrente:</strong> '+esc(r.lossCompetitor)+(r.lossCompetitorPrice?' · '+money(r.lossCompetitorPrice):'')+'</p>':'')
      + (r.lossNote?'<p><strong>Observação:</strong> '+esc(r.lossNote)+'</p>':'')
      + (evidenceHtml?'<div class="print-evidence-grid">'+evidenceHtml+'</div>':'<p class="no-evidence">Sem evidência anexada.</p>')
      + '</article>';
 }
 if(!casesHtml) casesHtml='<p class="empty-state">Nenhuma perda registrada no período.</p>';

 const win=window.open('','_blank');if(!win)return;
 const styles = `
 <style>
 :root{--bg:#f5f7fb;--card:#ffffff;--line:#e7ecf3;--text:#243047;--muted:#6e7891;--shadow:0 10px 24px rgba(38,52,80,.08);--accent:#6653c9;--accent2:#3777e6;--accent3:#1f9a79;--accent4:#d87943;--danger:#b95167}
 *{box-sizing:border-box} body{margin:0;font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--text)}
 .page{max-width:1120px;margin:0 auto;padding:28px 24px 42px}
 .hero{position:relative;overflow:hidden;padding:28px 30px;border-radius:24px;color:#fff;background:linear-gradient(128deg,#1f4bd8 0%,#4f46c8 48%,#7355c7 100%);box-shadow:0 20px 50px rgba(65,62,173,.22)}
 .eyebrow{font-size:11px;letter-spacing:1.6px;font-weight:800;text-transform:uppercase;opacity:.95;margin:0 0 8px}
 h1{margin:0;font-size:34px;letter-spacing:-.6px} .hero p{margin:10px 0 0;max-width:760px;line-height:1.55}
 .hero-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.chip{display:inline-flex;align-items:center;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.14);backdrop-filter:blur(10px);font-size:12px}
 .chip.live:before{content:"";width:8px;height:8px;border-radius:50%;margin-right:8px;background:#6ee7b7;box-shadow:0 0 0 4px rgba(110,231,183,.14)}
 .section{margin-top:18px;background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow);padding:22px}
 .section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;border-bottom:1px solid #eef1f6;padding-bottom:14px;margin-bottom:16px}
 .section-head h2{margin:0;font-size:24px;letter-spacing:-.3px}.section-head p{margin:6px 0 0;color:var(--muted);line-height:1.5}
 .loss-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.loss-kpi{position:relative;overflow:hidden;background:linear-gradient(180deg,#fff,#f8f9fc);border:1px solid #e6eaf2;border-radius:16px;padding:16px 16px 15px;min-height:118px}
 .loss-kpi .kpi-index{position:absolute;right:12px;top:9px;font-size:11px;font-weight:850;color:#c2c8d5}.loss-kpi small{text-transform:uppercase;letter-spacing:.4px;font-size:9px;font-weight:800;color:#7d8697}.loss-kpi strong{display:block;margin-top:8px;font-size:24px;color:#202b44;letter-spacing:-.3px}.loss-kpi em{display:block;font-style:normal;font-size:10px;color:#8a92a2;margin-top:7px}.loss-kpi:before{content:"";position:absolute;left:0;top:0;width:100%;height:3px;background:#755bc4}.loss-kpi.kpi-2:before{background:#d65f70}.loss-kpi.kpi-3:before{background:#1d9c75}.loss-kpi.kpi-4:before{background:#387be8}
 .loss-grid-3{display:grid;grid-template-columns:1fr 1.05fr 1fr;gap:12px}.loss-panel{background:#fff;border:1px solid #e8ebf1;border-radius:16px;padding:17px;box-shadow:0 5px 16px rgba(43,56,84,.04)}
 .panel-title{display:flex;align-items:center;gap:10px;margin-bottom:13px}.panel-title h3{margin:1px 0 0;font-size:15px}.panel-title small{font-size:9px;letter-spacing:1px;color:#969dae;font-weight:800}.panel-icon{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#f0edfb;color:#604ead;font-size:10px;font-weight:850}
 .loss-rank-row{display:flex;align-items:flex-start;gap:10px;padding:7px 0}.loss-rank-pos{min-width:28px;height:28px;border-radius:999px;background:#f2f0fb;color:#6553b2;display:grid;place-items:center;font-size:12px;font-weight:800}.loss-rank-main{flex:1}.loss-rank-main>div:first-child{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.loss-rank-main strong{display:block}.loss-rank-main span{color:#6f7890;font-size:12px}.loss-rank-bar{height:8px;background:#f0f2f7;border-radius:999px;overflow:hidden;margin-top:8px}.loss-rank-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#5b4cc4,#7c67d3)}
 .donut-wrap{display:flex;align-items:center;gap:18px;min-height:205px}.donut-chart{position:relative;width:145px;min-width:145px;height:145px}.donut-chart svg{width:100%;height:100%;transform:rotate(-90deg)}.donut-bg,.donut-seg{fill:none;stroke-width:12}.donut-bg{stroke:#edf0f5}.donut-seg{stroke-linecap:round}.donut-seg.seg-1,.legend-dot.seg-1{stroke:#5b4cc4;background:#5b4cc4}.donut-seg.seg-2,.legend-dot.seg-2{stroke:#3478e5;background:#3478e5}.donut-seg.seg-3,.legend-dot.seg-3{stroke:#1f9a79;background:#1f9a79}.donut-seg.seg-4,.legend-dot.seg-4{stroke:#db7d45;background:#db7d45}.donut-seg.seg-5,.legend-dot.seg-5{stroke:#b95167;background:#b95167}.legend-dot.seg-other{background:#aab1bf}.donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}.donut-center strong{font-size:28px;line-height:1;color:#202c46}.donut-center span{font-size:10px;color:#8a93a4;margin-top:4px;text-transform:uppercase;letter-spacing:.8px}.donut-legend{flex:1;min-width:0}.donut-legend-row{display:flex;justify-content:space-between;gap:9px;padding:6px 0;border-bottom:1px solid #f0f2f6;font-size:10px}.donut-legend-row>span{display:flex;align-items:center;gap:7px;min-width:0;overflow-wrap:anywhere}.legend-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}.donut-legend-row strong{font-size:11px}.donut-legend-row small{font-weight:500;color:#8b93a2}.donut-empty{min-height:205px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px dashed #dfe4ed;border-radius:14px;background:#fafbfc}.donut-empty span{font-size:30px;font-weight:800;color:#c1c7d2}.donut-empty small{color:#8d95a3}
 .loss-trend{height:188px;min-height:188px;padding:10px 4px 0;background:linear-gradient(180deg,#fbfcff,#fff);border-radius:10px;border:1px solid #f0f2f7;display:flex;align-items:flex-end;gap:12px;overflow-x:auto}.loss-trend p{padding:16px;color:var(--muted)} .loss-trend-col{height:155px;min-width:48px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px}.loss-trend-col i{display:block;width:28px;border-radius:12px 12px 6px 6px;background:linear-gradient(180deg,#7a63cf,#4d6ed8);box-shadow:0 5px 12px rgba(91,72,177,.18)}.loss-trend-col span{font-size:10px;color:#7d8697}.loss-trend-col strong{color:#3e4a63;font-size:12px}
 .loss-badge{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#fff0f2;color:#a2354a;font-size:11px;font-weight:700}.print-cases{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.print-case{border:1px solid #e8ebf1;border-radius:16px;padding:16px;background:#fff;box-shadow:0 5px 16px rgba(43,56,84,.04);break-inside:avoid}.print-case-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px}.print-case-head strong{font-size:16px}.print-case p{margin:7px 0;line-height:1.5}.print-case-meta{color:#6f7890;font-size:12px}.print-evidence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.case-evidence,.evidence-missing{border:1px solid #e7ecf3;border-radius:12px;padding:8px;background:#fafbfe}.case-evidence img{display:block;width:100%;max-height:210px;object-fit:contain;border-radius:8px;background:#fff}.case-evidence figcaption{margin-top:6px;font-size:11px;color:#6f7890}.evidence-link{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border-radius:10px;background:#f5f7fb;border:1px solid #e7ecf3;color:#243047;text-decoration:none}.no-evidence,.empty-state{color:#7d8697}
 .footer-note{margin-top:18px;color:#7d8697;font-size:11px;line-height:1.5}
 @media print{body{background:#fff}.page{max-width:none;padding:14px 12px 22px}.hero,.section,.loss-panel,.print-case{box-shadow:none}.section{break-inside:avoid}.print-cases{grid-template-columns:1fr 1fr}.print-controls{display:none}}
 @media (max-width:960px){.loss-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.loss-grid-3{grid-template-columns:1fr 1fr}.loss-grid-3 .loss-panel:nth-child(2){grid-column:1/-1}.print-cases{grid-template-columns:1fr}}
 </style>`;
 const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de perdas</title>'+styles+'</head><body>'
 + '<div class="page">'
 + '<section class="hero"><p class="eyebrow">ACOMPANHAMENTO COMERCIAL</p><h1>Relatório de perdas de vendas</h1><p>Mesmo padrão visual do dashboard, com os indicadores consolidados do período, ranking dos motivos, concorrentes, tendência e casos detalhados.</p><div class="hero-meta"><span class="chip">'+esc(data.actor.branch)+'</span><span class="chip">'+date(p.start)+' a '+date(p.end)+'</span><span class="chip">'+esc(sellerName)+'</span><span class="chip live">BI atualizado</span></div></section>'
 + '<section class="section"><div class="section-head"><div><h2>Análise de perdas</h2><p>Indicadores principais e participação das causas registradas pela equipe.</p></div></div><div class="loss-kpis">'+kpiHtml+'</div><div class="loss-grid-3" style="margin-top:14px"><section class="loss-panel"><div class="panel-title"><span class="panel-icon">01</span><div><small>CAUSA</small><h3>Ranking dos motivos</h3></div></div>'+rankingHtml+'</section><section class="loss-panel"><div class="panel-title"><span class="panel-icon">02</span><div><small>PARTICIPAÇÃO</small><h3>Distribuição das perdas</h3></div></div>'+donutHtml+'</section><section class="loss-panel"><div class="panel-title"><span class="panel-icon">03</span><div><small>MERCADO</small><h3>Concorrentes mais citados</h3></div></div>'+competitorsHtml+'</section></div><section class="loss-panel" style="margin-top:12px"><div class="panel-title"><span class="panel-icon">04</span><div><small>TENDÊNCIA</small><h3>Evolução das perdas no período</h3></div></div><div class="loss-trend">'+trendHtml+'</div></section></section>'
 + '<section class="section"><div class="section-head"><div><h2>Casos detalhados</h2><p>'+lost.length+' caso'+(lost.length===1?'':'s')+' listado'+(lost.length===1?'':'s')+' para consulta e apresentação.</p></div></div><div class="print-cases">'+casesHtml+'</div></section>'
 + '<p class="footer-note">Relatório gerado automaticamente a partir do painel de gestão. Motivos, observações, concorrentes e evidências são registrados pelo vendedor responsável e consolidados para análise da liderança.</p>'
 + '<div class="print-controls" style="margin-top:18px;display:flex;gap:10px"><button onclick="window.print()">Imprimir</button><button onclick="window.close()">Fechar</button></div>'
 + '</div><script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>';
 win.document.open();
 win.document.write(html);
 win.document.close();
}


const clean=s=>String(s||'').trim();
const digits=s=>String(s||'').replace(/\D/g,'');
function slugName(name){return clean(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase();}
function tokenPart(name){const raw=clean(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z]/g,'').toUpperCase();return (raw.slice(0,5)||'ACESSO');}
function randomPart(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';for(let i=0;i<4;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out;}
function makeToken(name,phone){const d=digits(phone);return tokenPart(name)+'-'+d.slice(-4)+'-'+randomPart();}
function renderAccessUsers(){
 const box=$('access-user-list'); if(!box||!data)return;
 const users=data.users.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 box.innerHTML=users.map(u=>'<div class="access-user"><div><strong>'+esc(u.name)+'</strong><small>'+esc(u.branch)+' · '+esc(u.role)+(u.isOwner?' · Administrador geral':'')+'</small></div><div><span class="access-status '+(u.active?'on':'off')+'">'+(u.active?'Ativo':'Inativo')+'</span>'+(u.canManage?'<span class="access-manage-badge">Gestão</span>':'')+'</div></div>').join('')||'<p>Nenhum usuário cadastrado.</p>';
}
function accessMessage(info){return 'Olá, '+info.name+'. Seu acesso ao Sistema de Orçamentos CRM foi liberado.\n\nFilial: '+info.branch+'\nPerfil: '+(info.role==='GERENTE'?'Gerente':'Vendedor')+'\nLink: https://fildosobral-sys.github.io/orcamentos-crm/\nCredencial individual: '+info.token+'\nWhatsApp cadastrado: '+info.phone+'\n\nNão compartilhe sua credencial.';}
async function createAccess(){
 const st=$('access-state');st.textContent='';
 const name=clean($('access-name').value).toUpperCase(),branch=clean($('access-branch').value).toUpperCase(),phone=digits($('access-phone').value),role=$('access-role').value,canManage=$('access-manage').checked;
 if(!name){st.textContent='Informe o nome do colaborador.';return;}
 if(!branch){st.textContent='Informe a filial.';return;}
 if(!/^\d{10,11}$/.test(phone)){st.textContent='Informe o WhatsApp com DDD.';return;}
 const token=makeToken(name,phone),id=(slugName(name)+'_'+phone.slice(-4)).slice(0,80);
 const btn=$('access-create');btn.disabled=true;st.textContent='Criando acesso…';
 try{
   const res=await R.call('createUser',{id,name,branch,phone,role,canManage,token});
   lastAccess={...res.user,token,phone,branch,name,role};
   $('access-token').textContent=token;
   $('access-user-summary').textContent=name+' · '+branch+' · '+(role==='GERENTE'?'Gerente':'Vendedor');
   $('access-result').hidden=false;st.textContent='Acesso criado com sucesso.';
   await refresh();
 }catch(e){st.textContent=e.message||String(e);}finally{btn.disabled=false;}
}
async function copyAccess(){if(!lastAccess)return;const text=accessMessage(lastAccess);try{await navigator.clipboard.writeText(text);$('access-state').textContent='Acesso copiado.';}catch(e){$('access-state').textContent='Não foi possível copiar automaticamente.';}}
function sendAccess(){if(!lastAccess)return;const phone='55'+digits(lastAccess.phone);window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(accessMessage(lastAccess)),'_blank','noopener');}

function clear(){data=null;summary=null;$('content').hidden=true;$('identity').textContent='';$('seller-cards').replaceChildren();$('metrics').replaceChildren();$('detail-body').replaceChildren();$('permission-list').replaceChildren();$('reasons').replaceChildren();$('detail').close();}
function state(text,error=false){$('state').textContent=text;$('state').dataset.error=String(error);}
async function refresh(){
 if(loading)return;loading=true;$('refresh').disabled=true;
 try{
  if(!R.enabled){clear();state('A página de gestão está preparada. Conecte a planilha Google e cadastre os usuários para visualizar a equipe. Nenhum dado de outro colaborador é carregado neste modo.');return;}
  await R.connect();
  if(!R.session.actor.canManage)throw Error('Acesso restrito. Você pode consultar somente seus próprios orçamentos. A visão da equipe exige autorização do desenvolvedor.');
  data=await R.call('team');
  const synced=await syncLegacyRowsToCentral(data.records,data.actor.branch);
  if(synced)data=await R.call('team');
  if(!data.actor.canManage)throw Error('Autorização da equipe não concedida.');
  $('identity').textContent=data.actor.name+' · '+prettyBranch(data.actor.branch);
  $('access-admin').hidden=!data.actor.isOwner;
  if(data.actor.isOwner){$('access-branch').value=$('access-branch').value||prettyBranch(data.actor.branch);renderAccessUsers();}
  setupBranchControls();
  render();$('content').hidden=false;state('');
  $('updated').textContent='Atualizado em '+new Date(data.updatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'. Atualização automática a cada minuto enquanto esta página estiver visível.';
 }catch(e){clear();state(e.message,true);}finally{loading=false;$('refresh').disabled=false;}
}
function render(){
 if(!data)return;
 const anchor=$('anchor').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor))return;
 const p=B.period(kind,anchor),branchKey=selectedBranchKey(),scope=scopedData(branchKey),selected=$('seller').value;
 const users=scope.users.filter(u=>!selected||u.id===selected),records=scope.records.filter(r=>!selected||r.ownerId===selected);
 summary=B.summarize(records,users,p);
 $('period-label').textContent=date(p.start)+' a '+date(p.end);
 document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===kind)));
 renderBranchOverview(p);
 const t=summary.totals;
 const metrics=[['Pesquisas de orçamento',t.total,'Criadas no período'],['Vendas concluídas',t.wins,'Dos orçamentos do período'],['Conversão',pct(t.conversion),'Vendas ÷ pesquisas'],['Contatos registrados',t.contacts,'Realizados no período'],['Retornos atrasados',t.late,'Pendências atuais'],['Valor concluído',money(t.value),'Dos orçamentos do período']];
 $('metrics').innerHTML=metrics.map(m=>'<div class="metric"><small>'+m[0]+'</small><strong>'+m[1]+'</strong><span>'+m[2]+'</span></div>').join('');
 renderLossIntel(records,p);
 const sort=$('sort').value;
 summary.perSeller.sort((a,b)=>sort==='name'?a.user.name.localeCompare(b.user.name,'pt-BR'):(b[sort]??-1)-(a[sort]??-1)||a.user.name.localeCompare(b.user.name,'pt-BR'));
 $('roster-count').textContent=summary.perSeller.length+' colaboradores';
 $('seller-cards').innerHTML=summary.perSeller.map(r=>{
  const initials=r.user.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('');
  return '<article class="seller-card"><div class="seller-top"><span class="avatar">'+esc(initials)+'</span><div><h3>'+esc(r.user.name)+'</h3><small>'+esc(prettyBranch(r.user.branch||data.actor.branch))+' · '+(r.user.active?'Cadastrado':'Inativo · histórico preservado')+'</small></div></div><div class="seller-numbers"><div><strong>'+r.total+'</strong><small>Orçamentos</small></div><div><strong>'+r.wins+'</strong><small>Vendas</small></div><div><strong>'+r.contacts+'</strong><small>Contatos</small></div></div><div class="conversion"><div class="conversion-label"><span>Conversão</span><strong>'+pct(r.conversion)+'</strong></div><div class="bar" role="img" aria-label="Conversão '+pct(r.conversion)+'"><i style="width:'+Math.max(0,Math.min(100,r.conversion||0))+'%"></i></div></div><div class="tags">'+Object.entries(r.status).map(([k,v])=>'<span class="tag '+(k==='ganha'?'won':k==='perdida'?'lost':'')+'">'+esc(labels[k])+': '+v+'</span>').join('')+'</div><p class="late">'+r.late+' retorno(s) atrasado(s)</p><p class="updated">'+(r.returns?r.onTime+'/'+r.returns+' retornos realizados no prazo':'Sem retornos confirmados no período')+'</p><button data-seller="'+esc(r.user.id)+'">Ver orçamentos e histórico</button></article>';
 }).join('')||'<p>Nenhum colaborador cadastrado para este filtro.</p>';
 const reasons={};summary.perSeller.forEach(r=>Object.entries(r.reasons).forEach(([k,v])=>reasons[k]=(reasons[k]||0)+v));
 $('reasons').innerHTML=Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="reason"><span>'+esc(k||'Não informado')+'</span><strong>'+v+'</strong></div>').join('')||'<p>Nenhum motivo de perda registrado nos orçamentos deste período.</p>';
 $('permissions').hidden=!data.actor.isOwner;
 if(data.actor.isOwner)$('permission-list').innerHTML=data.users.map(u=>'<div class="permission"><span>'+esc(u.name)+'<br><small>'+esc(prettyBranch(u.branch))+' · '+esc(u.role)+'</small></span>'+(u.isOwner?'<strong>Desenvolvedor</strong>':'<label><input type="checkbox" data-permission="'+esc(u.id)+'" '+(u.canManage?'checked':'')+'>Ver equipe</label>')+'</div>').join('');
}
function openDetail(id){
 const r=summary?.perSeller.find(r=>r.user.id===id);if(!r)return;
 lastFocus=document.activeElement;$('detail-title').textContent=r.user.name+' · SOMENTE LEITURA';
 $('detail-body').innerHTML=r.records.map(q=>'<article class="detail-record"><small>'+esc(labels[q.status])+' · '+date(q.createdAt)+'</small><h3>'+esc(q.client)+'</h3><p>'+esc(q.product)+'</p><p>'+money(q.amount)+' · Próximo retorno: '+date(q.next)+'</p>'+(q.reason?'<p>Motivo: '+esc(q.reason)+'</p>':'')+'<details><summary>Histórico de acompanhamento</summary><ol>'+q.history.slice().reverse().map(h=>'<li><strong>'+esc(h.actor)+' · '+date(h.at)+'</strong><br>'+esc(h.detail)+'</li>').join('')+'</ol></details></article>').join('')||'<p>Nenhum orçamento criado no período escolhido. Os contatos e atrasos podem se referir a orçamentos anteriores.</p>';
 $('detail').showModal();
}
$('anchor').value=B.day(new Date());
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{kind=b.dataset.period;render();}));
['anchor','seller','sort'].forEach(id=>$(id).addEventListener('change',render));
$('branch')?.addEventListener('change',()=>{refreshSellerOptions();render();});
$('refresh').addEventListener('click',refresh);
$('seller-cards').addEventListener('click',e=>{const b=e.target.closest('[data-seller]');if(b)openDetail(b.dataset.seller);});
$('branch-list')?.addEventListener('click',e=>{const b=e.target.closest('[data-branch-panel]');if(b)openBranchDashboard(b.dataset.branchPanel);});
$('close-branch-detail')?.addEventListener('click',()=>$('branch-detail').close());
$('branch-detail')?.addEventListener('close',()=>lastFocus?.focus());
$('close-detail').addEventListener('click',()=>$('detail').close());
$('detail').addEventListener('close',()=>lastFocus?.focus());
$('access-create')?.addEventListener('click',createAccess);
$('access-copy')?.addEventListener('click',copyAccess);
$('access-whatsapp')?.addEventListener('click',sendAccess);
$('access-role')?.addEventListener('change',()=>{if($('access-role').value==='GERENTE')$('access-manage').checked=true;});
$('permission-list').addEventListener('change',async e=>{
 const input=e.target;if(!input.dataset.permission)return;input.disabled=true;
 try{await R.call('permission',{userId:input.dataset.permission,canManage:input.checked});await refresh();}
 catch(err){input.checked=!input.checked;state(err.message,true);}finally{input.disabled=false;}
});

$('print-loss-report').addEventListener('click',()=>printLossReport().catch(e=>state(e.message,true)));
$('loss-cases').addEventListener('click',e=>{const b=e.target.closest('[data-loss-evidence]');if(b)showLossEvidence(b.dataset.lossEvidence).catch(err=>state(err.message,true));});

window.addEventListener('storage',e=>{if(e.key===null||e.key.startsWith('fs_')){clear();refresh();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();else refresh();});
window.addEventListener('pagehide',clear);
window.addEventListener('pageshow',()=>refresh());
setInterval(()=>{if(!document.hidden)refresh();},60000);

function setupManagementUppercase(){
 ['access-name','access-branch'].forEach(id=>{const el=$(id);if(!el)return;el.style.textTransform='uppercase';el.addEventListener('input',()=>{const a=el.selectionStart,b=el.selectionEnd,v=String(el.value||'').toUpperCase();if(el.value!==v){el.value=v;try{el.setSelectionRange(a,b)}catch(e){}}});});
}
setupManagementUppercase();

refresh();
})();
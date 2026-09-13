(function(){
'use strict';
const R=window.FSCRMRemote,B=window.FSCRMBI,$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={negociacao:'Em negociação',aguardando:'Aguardando resposta',agendado:'Retorno agendado',ganha:'Concluída',perdida:'Não concluída'};
const date=s=>s?new Date(s.length===10?s+'T12:00:00Z':s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=v=>v===null?'—':v.toFixed(1).replace('.',',')+'%';
let data=null,kind='mes',summary=null,loading=false,lastFocus=null;
let lastAccess=null;

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
 const records=data.records.filter(r=>(!selected||r.ownerId===selected));
 const lost=lossRecords(records,p),reasons=rankBy(lost,r=>r.reason==='Preço'?'Preço da concorrência':r.reason);
 const win=window.open('','_blank');if(!win)return;
 win.document.write('<!doctype html><meta charset="utf-8"><title>Relatório de perdas</title><style>body{font-family:Arial,sans-serif;color:#243047;margin:28px}h1{margin-bottom:4px}.meta{color:#677085;margin-bottom:20px}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.kpis div,.case{border:1px solid #dfe3eb;border-radius:10px;padding:12px;margin:10px 0}.rank{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:7px 0}.evidence{max-width:420px;max-height:300px;object-fit:contain;border:1px solid #ddd;margin:6px} @media print{button{display:none}}</style>');
 win.document.write('<h1>Relatório de perdas de vendas</h1><div class="meta">'+esc(data.actor.branch)+' · '+date(p.start)+' a '+date(p.end)+'</div>');
 win.document.write('<div class="kpis"><div><b>Perdas</b><br>'+lost.length+'</div><div><b>Valor potencial</b><br>'+money(lost.reduce((s,r)=>s+Number(r.amount||0),0))+'</div><div><b>Com evidência</b><br>'+lost.filter(r=>(r.evidence||[]).length).length+'</div></div>');
 win.document.write('<h2>Ranking dos motivos</h2>'+reasons.map(([k,v],i)=>'<div class="rank"><span>'+(i+1)+'. '+esc(k||'Não informado')+'</span><b>'+v+'</b></div>').join(''));
 win.document.write('<h2>Casos detalhados</h2>');
 for(const r of lost){
   let ev='';
   for(const meta of (r.evidence||[])){
     try{const item=await R.call('attachment',{id:r.id,fileId:meta.id});if(item.mime.startsWith('image/'))ev+='<img class="evidence" src="data:'+item.mime+';base64,'+item.base64+'">';else ev+='<p>Anexo PDF: '+esc(item.name)+'</p>';}catch(e){ev+='<p>Anexo não carregado: '+esc(meta.name)+'</p>';}
   }
   win.document.write('<div class="case"><b>'+esc(r.client)+'</b> · '+esc(r.product)+'<br><small>'+esc(r.seller)+' · '+date(r.createdAt)+'</small><p><b>Motivo:</b> '+esc(r.reason==='Preço'?'Preço da concorrência':r.reason||'Não informado')+'</p>'+(r.lossCompetitor?'<p><b>Concorrente:</b> '+esc(r.lossCompetitor)+(r.lossCompetitorPrice?' · '+money(r.lossCompetitorPrice):'')+'</p>':'')+(r.lossNote?'<p><b>Observação:</b> '+esc(r.lossNote)+'</p>':'')+ev+'</div>');
 }
 win.document.write('<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script>');win.document.close();
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
  if(!data.actor.canManage)throw Error('Autorização da equipe não concedida.');
  $('identity').textContent=data.actor.name+' · '+data.actor.branch;
  $('access-admin').hidden=!data.actor.isOwner; if(data.actor.isOwner){$('access-branch').value=$('access-branch').value||data.actor.branch;renderAccessUsers();}
  const selected=$('seller').value;
  $('seller').innerHTML='<option value="">Toda a equipe</option>'+data.users.filter(u=>u.track!==false).map(u=>'<option value="'+esc(u.id)+'">'+esc(u.name)+'</option>').join('');
  $('seller').value=selected;render();$('content').hidden=false;state('');
  $('updated').textContent='Atualizado em '+new Date(data.updatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'. Atualização automática a cada minuto enquanto esta página estiver visível.';
 }catch(e){clear();state(e.message,true);}finally{loading=false;$('refresh').disabled=false;}
}
function render(){
 if(!data)return;
 const anchor=$('anchor').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor))return;
 const p=B.period(kind,anchor),selected=$('seller').value;
 const users=data.users.filter(u=>!selected||u.id===selected),records=data.records.filter(r=>!selected||r.ownerId===selected);
 summary=B.summarize(records,users,p);
 $('period-label').textContent=date(p.start)+' a '+date(p.end);
 document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===kind)));
 const t=summary.totals;
 const metrics=[['Pesquisas de orçamento',t.total,'Criadas no período'],['Vendas concluídas',t.wins,'Dos orçamentos do período'],['Conversão',pct(t.conversion),'Vendas ÷ pesquisas'],['Contatos registrados',t.contacts,'Realizados no período'],['Retornos atrasados',t.late,'Pendências atuais'],['Valor concluído',money(t.value),'Dos orçamentos do período']];
 $('metrics').innerHTML=metrics.map(m=>'<div class="metric"><small>'+m[0]+'</small><strong>'+m[1]+'</strong><span>'+m[2]+'</span></div>').join('');
 renderLossIntel(records,p);
 const sort=$('sort').value;
 summary.perSeller.sort((a,b)=>sort==='name'?a.user.name.localeCompare(b.user.name,'pt-BR'):(b[sort]??-1)-(a[sort]??-1)||a.user.name.localeCompare(b.user.name,'pt-BR'));
 $('roster-count').textContent=summary.perSeller.length+' colaboradores';
 $('seller-cards').innerHTML=summary.perSeller.map(r=>{
  const initials=r.user.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('');
  return '<article class="seller-card"><div class="seller-top"><span class="avatar">'+esc(initials)+'</span><div><h3>'+esc(r.user.name)+'</h3><small>'+(r.user.active?'Cadastrado':'Inativo · histórico preservado')+'</small></div></div><div class="seller-numbers"><div><strong>'+r.total+'</strong><small>Orçamentos</small></div><div><strong>'+r.wins+'</strong><small>Vendas</small></div><div><strong>'+r.contacts+'</strong><small>Contatos</small></div></div><div class="conversion"><div class="conversion-label"><span>Conversão</span><strong>'+pct(r.conversion)+'</strong></div><div class="bar" role="img" aria-label="Conversão '+pct(r.conversion)+'"><i style="width:'+Math.max(0,Math.min(100,r.conversion||0))+'%"></i></div></div><div class="tags">'+Object.entries(r.status).map(([k,v])=>'<span class="tag '+(k==='ganha'?'won':k==='perdida'?'lost':'')+'">'+esc(labels[k])+': '+v+'</span>').join('')+'</div><p class="late">'+r.late+' retorno(s) atrasado(s)</p><p class="updated">'+(r.returns?r.onTime+'/'+r.returns+' retornos realizados no prazo':'Sem retornos confirmados no período')+'</p><button data-seller="'+esc(r.user.id)+'">Ver orçamentos e histórico</button></article>';
 }).join('')||'<p>Nenhum colaborador cadastrado para este filtro.</p>';
 const reasons={};summary.perSeller.forEach(r=>Object.entries(r.reasons).forEach(([k,v])=>reasons[k]=(reasons[k]||0)+v));
 $('reasons').innerHTML=Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="reason"><span>'+esc(k||'Não informado')+'</span><strong>'+v+'</strong></div>').join('')||'<p>Nenhum motivo de perda registrado nos orçamentos deste período.</p>';
 $('permissions').hidden=!data.actor.isOwner;
 if(data.actor.isOwner)$('permission-list').innerHTML=data.users.map(u=>'<div class="permission"><span>'+esc(u.name)+'<br><small>'+esc(u.role)+'</small></span>'+(u.isOwner?'<strong>Desenvolvedor</strong>':'<label><input type="checkbox" data-permission="'+esc(u.id)+'" '+(u.canManage?'checked':'')+'>Ver equipe</label>')+'</div>').join('');
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
$('refresh').addEventListener('click',refresh);
$('seller-cards').addEventListener('click',e=>{const b=e.target.closest('[data-seller]');if(b)openDetail(b.dataset.seller);});
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
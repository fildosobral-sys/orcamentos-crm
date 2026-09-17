(function(){
'use strict';
const $=id=>document.getElementById(id);
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
let ready=false, grouping=false, teamCache=null;

function waitForUi(attempt=0){
  const hero=$('hero-branch'), filters=document.querySelector('.executive-filter-wrap'), content=$('content');
  if(!hero||!filters||!content||!window.FSCRMRemote||!window.FSCRMBI){
    if(attempt<80)setTimeout(()=>waitForUi(attempt+1),100);
    return;
  }
  enhance(hero,filters,content);
}

function enhance(hero,filters,content){
  if(document.body.dataset.fsBiCommand==='1')return;
  document.body.dataset.fsBiCommand='1';

  const heroCopy=document.querySelector('.hero-copy')||document.querySelector('.hero');
  if(heroCopy){
    const panel=document.createElement('section');
    panel.className='bi-command-panel';
    panel.innerHTML='<div class="bi-command-head"><div><small>PAINEL DE ANÁLISE</small><strong>Escolha o que deseja acompanhar</strong></div><span>BI</span></div>';
    heroCopy.appendChild(panel);

    const teamWrap=$('hero-team-wrap');
    if(teamWrap){teamWrap.classList.add('bi-team-wrap');panel.appendChild(teamWrap);const label=teamWrap.querySelector(':scope > span');if(label)label.textContent='Filial / equipe';}
    filters.classList.add('bi-filters-in-hero');
    filters.open=true;
    const summary=filters.querySelector(':scope > summary');
    if(summary){const first=summary.querySelector('span')||summary;first.textContent='Filtros da análise';}
    panel.appendChild(filters);
  }

  const refresh=$('refresh');
  if(refresh){
    refresh.textContent='Aplicar análise';
    refresh.addEventListener('click',e=>{
      if(hero.value==='__choose__'){
        e.preventDefault();e.stopImmediatePropagation();
        message('Escolha primeiro a filial/equipe que deseja analisar.',true);
        hero.focus();return;
      }
      ready=true;
      document.documentElement.classList.remove('fs-bi-gated');
      document.documentElement.classList.add('fs-bi-ready');
      message('');
      setTimeout(()=>{filters.open=false;groupUsers();updateDataAdmin();},80);
    },true);
  }

  ensurePrompt(hero);
  new MutationObserver(()=>ensurePrompt(hero)).observe(hero,{childList:true});
  hero.addEventListener('change',()=>{
    if(hero.value==='__choose__'){
      ready=false;document.documentElement.classList.add('fs-bi-gated');document.documentElement.classList.remove('fs-bi-ready');
      message('Selecione a filial/equipe e aplique os filtros para abrir o BI.');
    }else{
      filters.open=true;
      message('Agora ajuste o período, vendedor e ordenação; depois toque em Aplicar análise.');
    }
  });

  const list=$('access-user-list');
  if(list)new MutationObserver(()=>{if(!grouping)setTimeout(groupUsers,0);}).observe(list,{childList:true,subtree:false});
  new MutationObserver(()=>{if(ready){groupUsers();updateDataAdmin();}}).observe(content,{attributes:true,attributeFilter:['hidden']});

  injectDataAdmin();
  message('Selecione a filial/equipe e aplique os filtros para abrir o BI.');
  setTimeout(()=>{ensurePrompt(hero);groupUsers();},300);
}

function ensurePrompt(hero){
  if(!hero)return;
  let prompt=[...hero.options].find(o=>o.value==='__choose__');
  if(!prompt){
    prompt=document.createElement('option');prompt.value='__choose__';prompt.textContent='Selecione a filial/equipe';hero.insertBefore(prompt,hero.firstChild);
  }
  if(!ready){
    hero.value='__choose__';
    document.documentElement.classList.add('fs-bi-gated');
  }
}

function message(text,error=false){
  const s=$('state');if(!s)return;
  s.textContent=text||'';s.dataset.error=String(!!error);
}

function prettyBranch(v){
  return String(v||'').trim().replace(/\s+/g,' ').split(' ').map(p=>/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(p)?p.toUpperCase():p.charAt(0).toUpperCase()+p.slice(1).toLowerCase()).join(' ');
}

function groupUsers(){
  const box=$('access-user-list');
  if(!box||grouping)return;
  const raw=[...box.children].filter(el=>el.classList.contains('access-user'));
  if(!raw.length)return;
  grouping=true;
  try{
    const groups=new Map();
    raw.forEach(row=>{
      const small=row.querySelector('small');
      const branch=prettyBranch((small?.textContent||'Filial não informada').split('·')[0].trim());
      if(!groups.has(branch))groups.set(branch,[]);
      groups.get(branch).push(row);
      if(small){const rest=(small.textContent||'').split('·').slice(1).join(' · ').trim();small.textContent=rest||'Colaborador';}
    });
    const frag=document.createDocumentFragment();
    groups.forEach((rows,branch)=>{
      const d=document.createElement('details');d.className='access-branch-group-addon';
      const s=document.createElement('summary');
      s.innerHTML='<div><strong>'+escapeHtml(branch)+'</strong><small>'+rows.length+' colaborador'+(rows.length===1?'':'es')+'</small></div><span>›</span>';
      const body=document.createElement('div');body.className='access-branch-users-addon';rows.forEach(r=>body.appendChild(r));
      d.append(s,body);frag.appendChild(d);
    });
    box.replaceChildren(frag);
  }finally{grouping=false;}
}

function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function injectDataAdmin(){
  if($('data-admin-addon'))return;
  const host=$('permissions')?.parentElement||$('content');if(!host)return;
  const d=document.createElement('details');d.id='data-admin-addon';d.className='data-admin-addon';d.hidden=true;
  d.innerHTML='<summary>Gerenciar dados do período</summary><div class="data-admin-body"><p>Exclusão disponível somente para o administrador geral. Ela remove os registros da nuvem, dos indicadores e dos demais aparelhos.</p><div class="data-admin-scope"><span id="data-scope-branch">Filial: —</span><span id="data-scope-period">Período: —</span><strong id="data-scope-count">0 registros</strong></div><div class="data-admin-actions"><button type="button" id="data-export-period">Exportar período</button><button type="button" id="data-delete-period" class="danger">Excluir período da nuvem</button></div></div>';
  const updated=$('updated');host.insertBefore(d,updated||null);
  $('data-export-period')?.addEventListener('click',exportPeriod);
  $('data-delete-period')?.addEventListener('click',deletePeriod);
}

function selectedPeriod(){
  const kind=document.querySelector('[data-period][aria-pressed="true"]')?.dataset.period||'mes';
  const anchor=$('anchor')?.value;
  if(!anchor)return null;
  return window.FSCRMBI.period(kind,anchor);
}
function selectedBranch(){
  const hero=$('hero-branch');
  if(!hero||hero.value==='__choose__')return {key:null,name:null};
  return {key:hero.value||'',name:hero.options[hero.selectedIndex]?.textContent||'Todas as filiais'};
}
async function loadTeam(){
  const R=window.FSCRMRemote;
  await R.connect();
  teamCache=await R.call('team');
  return teamCache;
}
function filteredRecords(team){
  const p=selectedPeriod(),b=selectedBranch();if(!p||b.key===null)return [];
  const seller=$('seller')?.value||'';
  return (team.records||[]).filter(r=>{
    const day=String(r.createdAt||'').slice(0,10);
    return day>=p.start&&day<=p.end&&(!b.key||norm(r.branch)===norm(b.name))&&(!seller||r.ownerId===seller);
  });
}
async function updateDataAdmin(){
  try{
    const team=await loadTeam(),admin=$('data-admin-addon');if(!admin)return;
    admin.hidden=!team.actor?.isOwner;
    if(admin.hidden)return;
    const p=selectedPeriod(),b=selectedBranch(),rows=filteredRecords(team);
    $('data-scope-branch').textContent='Filial: '+(b.name||'—');
    $('data-scope-period').textContent='Período: '+(p?p.start.split('-').reverse().join('/')+' a '+p.end.split('-').reverse().join('/'):'—');
    $('data-scope-count').textContent=rows.length+' registro'+(rows.length===1?'':'s')+' neste filtro';
  }catch(_e){}
}
async function exportPeriod(){
  try{
    const team=teamCache||await loadTeam(),rows=filteredRecords(team),p=selectedPeriod(),b=selectedBranch();
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),branch:b,period:p,records:rows},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='crm-'+(p?.start||'periodo')+'-'+(p?.end||'')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){message(e.message||String(e),true);}
}
async function deletePeriod(){
  try{
    const team=teamCache||await loadTeam();if(!team.actor?.isOwner)throw Error('Somente o administrador geral pode excluir períodos.');
    const rows=filteredRecords(team),p=selectedPeriod(),b=selectedBranch();
    if(!rows.length)throw Error('Não há registros nesse filtro.');
    const text='EXCLUIR '+rows.length;
    const answer=window.prompt('Exclusão definitiva da nuvem.\n\nFilial: '+b.name+'\nPeríodo: '+p.start.split('-').reverse().join('/')+' a '+p.end.split('-').reverse().join('/')+'\nRegistros: '+rows.length+'\n\nRecomendamos exportar o período antes.\n\nDigite exatamente: '+text);
    if(answer!==text)return;
    const btn=$('data-delete-period');btn.disabled=true;
    const res=await window.FSCRMRemote.call('deleteRange',{branch:b.key||'',from:p.start,to:p.end,confirm:'EXCLUIR'});
    message((res.deleted||rows.length)+' registro(s) excluído(s) da nuvem.');
    teamCache=null;setTimeout(()=>location.reload(),600);
  }catch(e){message(e.message||String(e),true);}finally{const btn=$('data-delete-period');if(btn)btn.disabled=false;}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>waitForUi());else waitForUi();
})();

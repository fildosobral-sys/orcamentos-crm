(function(){
'use strict';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function style(){
  if($('fs-v16-menu-style'))return;
  const s=document.createElement('style');s.id='fs-v16-menu-style';s.textContent=`
    #relatorios{display:none!important}

    /* Itens que agora vivem apenas no menu/modal: nunca ficam repetidos no fim da página. */
    body.fs-v16-ready #permissions,
    body.fs-v16-ready #data-admin-addon{display:none!important}
    #fs-v16-permissions-dialog #permissions,
    #fs-v16-data-dialog #data-admin-addon{display:block!important}
    #fs-v16-permissions-dialog #permissions>summary,
    #fs-v16-data-dialog #data-admin-addon>summary{display:none!important}

    .fs-v16-special-link{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}

    .fs-v16-dialog{width:min(760px,calc(100vw - 24px));max-height:min(84vh,780px);border:0!important;border-radius:24px!important;padding:0!important;overflow:hidden;background:#fff;color:#1c1c1e;box-shadow:0 30px 90px rgba(0,0,0,.24)!important}
    .fs-v16-dialog::backdrop{background:rgba(20,20,24,.34)!important;backdrop-filter:blur(10px)}
    .fs-v16-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid rgba(60,60,67,.12);background:rgba(248,248,250,.95);backdrop-filter:blur(20px) saturate(160%)}
    .fs-v16-dialog-head small{display:block;color:#6e6e73;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
    .fs-v16-dialog-head h2{margin:0;font-size:21px;line-height:1.15;color:#1c1c1e}
    .fs-v16-close{width:38px;height:38px;border:0;border-radius:12px;background:#eef0f5;color:#444b5a;font-size:22px;font-weight:800;cursor:pointer;flex:0 0 auto}
    .fs-v16-dialog-body{padding:18px;overflow:auto;max-height:calc(84vh - 76px)}

    #fs-v15-menu-btn,#fs-v16-menu-btn{display:none;align-items:center;justify-content:center;width:42px;height:42px;border:1px solid rgba(60,60,67,.12);border-radius:14px;background:rgba(255,255,255,.88);color:#1c1c1e;font-size:24px;line-height:1;letter-spacing:2px;box-shadow:0 4px 14px rgba(28,28,30,.06);cursor:pointer}

    #fs-v16-mobile-menu{width:min(390px,calc(100vw - 24px));border:0!important;border-radius:24px!important;padding:10px!important;background:rgba(248,248,250,.97);backdrop-filter:blur(24px) saturate(180%);box-shadow:0 28px 80px rgba(0,0,0,.25)!important}
    #fs-v16-mobile-menu::backdrop{background:rgba(20,20,24,.28);backdrop-filter:blur(8px)}
    .fs-v16-menu-head{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 10px}.fs-v16-menu-head strong{font-size:18px;color:#1c1c1e}
    .fs-v16-menu-grid{display:grid;gap:6px}.fs-v16-menu-grid button,.fs-v16-menu-grid a{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:10px 12px;border:0;border-radius:14px;background:transparent;color:#1c1c1e;text-decoration:none;font:inherit;font-weight:700;text-align:left;cursor:pointer;white-space:nowrap}.fs-v16-menu-grid button:hover,.fs-v16-menu-grid a:hover{background:rgba(10,132,255,.08)}.fs-v16-menu-grid .ico{width:28px;text-align:center;font-size:19px;flex:0 0 auto}.fs-v16-menu-sep{height:1px;background:rgba(60,60,67,.12);margin:6px 4px}


    /* Popup dedicado dos filtros da análise */
    #fs-v17-filter-dialog{width:min(560px,calc(100vw - 24px));max-height:86vh;border:0!important;border-radius:24px!important;padding:0!important;overflow:hidden;background:#fff;color:#1c1c1e;box-shadow:0 30px 90px rgba(0,0,0,.26)!important}
    #fs-v17-filter-dialog::backdrop{background:rgba(20,20,24,.34)!important;backdrop-filter:blur(9px)}
    .fs-v17-filter-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 18px;border-bottom:1px solid rgba(60,60,67,.12);background:#fafafd}
    .fs-v17-filter-head small{display:block;color:#6e6e73;font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
    .fs-v17-filter-head h2{margin:0;font-size:20px;line-height:1.15;color:#1c1c1e}
    .fs-v17-filter-close{width:40px;height:40px;border:0;border-radius:12px;background:#eef0f5;color:#4b5565;font-size:23px;font-weight:800;cursor:pointer;flex:0 0 auto}
    .fs-v17-filter-body{padding:16px;overflow:auto;max-height:calc(86vh - 74px)}
    #fs-v17-filter-dialog .fs-v13-toolbar{display:grid!important;position:static!important;inset:auto!important;width:100%!important;max-width:none!important;max-height:none!important;overflow:visible!important;grid-template-columns:1fr 1fr!important;gap:10px!important;padding:0!important;margin:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;transform:none!important;opacity:1!important;pointer-events:auto!important}
    #fs-v17-filter-dialog .fs-v13-control{min-width:0!important;width:100%!important}
    #fs-v17-filter-dialog .fs-v13-control.branch,#fs-v17-filter-dialog .fs-v13-control.seller{grid-column:1/-1!important}
    #fs-v17-filter-dialog .fs-v13-control>span{font-size:10px!important;padding-left:3px!important;color:#657185!important}
    #fs-v17-filter-dialog .fs-v13-control select,#fs-v17-filter-dialog .fs-v13-control input{height:48px!important;border-radius:14px!important;font-size:15px!important;padding:0 13px!important;border:1px solid #dce2ec!important;background:#fff!important}
    #fs-v17-filter-dialog .fs-v13-apply{grid-column:1/-1!important;width:100%!important;height:50px!important;border-radius:14px!important;font-size:14px!important;margin-top:2px!important}
    #fs-v17-filter-dialog .fs-v13-range{grid-column:1/-1!important;text-align:center!important;white-space:normal!important;font-size:11px!important;padding-top:2px!important}



    /* 18/09/2026D — nenhum dado analítico antes de Aplicar análise */
    body.fs-v17-awaiting-apply .section-kicker,
    body.fs-v17-awaiting-apply .manager-readonly,
    body.fs-v17-awaiting-apply #branch-overview,
    body.fs-v17-awaiting-apply #metrics,
    body.fs-v17-awaiting-apply #fs-team-intelligence,
    body.fs-v17-awaiting-apply #loss-intel,
    body.fs-v17-awaiting-apply #equipe,
    body.fs-v17-awaiting-apply #seller-cards,
    body.fs-v17-awaiting-apply #relatorios,
    body.fs-v17-awaiting-apply .explanation,
    body.fs-v17-awaiting-apply #updated{display:none!important}
    body.fs-v17-awaiting-apply #access-admin{margin-bottom:12px!important}
    body.fs-v17-awaiting-apply #state:empty::before{content:'Selecione os filtros da análise e toque em Aplicar análise.';display:block;color:#667085}

    @media(max-width:900px){
      .fs-bi-sidebar{display:none!important}
      body.fs-bi-v12 main{padding-bottom:28px!important}

      /* Cabeçalho mobile fixo em UMA altura. Nada muda de tamanho durante o scroll. */
      .fs-bi-topbar{
        position:sticky!important;top:0!important;z-index:1400!important;
        display:grid!important;
        grid-template-columns:minmax(0,1fr) 44px minmax(150px,46vw)!important;
        grid-template-areas:'title menu summary'!important;
        align-items:center!important;gap:8px!important;
        height:72px!important;min-height:72px!important;max-height:72px!important;
        overflow:visible!important;padding:10px 14px!important;
        transition:none!important;animation:none!important;
        box-shadow:0 5px 24px rgba(28,28,30,.06)!important;
        background:rgba(255,255,255,.96)!important;
        backdrop-filter:blur(22px) saturate(180%)!important;
        -webkit-backdrop-filter:blur(22px) saturate(180%)!important;
      }
      .fs-v13-topbar-title{grid-area:title!important;align-self:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;min-width:0!important}
      #fs-v16-menu-btn{display:flex!important;grid-area:menu!important;align-self:center!important}
      #fs-v15-menu-btn{display:none!important}
      #fs-v13-mobile-summary{display:flex!important;grid-area:summary!important;max-width:46vw!important;min-width:0!important;align-self:center!important;cursor:pointer!important}

      /* Os filtros NÃO aumentam a altura do cabeçalho. Abrem como painel flutuante. */
      .fs-v13-toolbar{
        display:none!important;position:fixed!important;
        top:78px!important;left:12px!important;right:12px!important;
        width:auto!important;max-width:none!important;
        max-height:calc(100dvh - 94px)!important;overflow:auto!important;
        grid-area:auto!important;opacity:1!important;transform:none!important;
        pointer-events:auto!important;transition:none!important;animation:none!important;
        z-index:1395!important;padding:14px!important;border-radius:22px!important;
        background:rgba(255,255,255,.98)!important;
        box-shadow:0 24px 70px rgba(28,28,30,.18)!important;
        backdrop-filter:blur(24px) saturate(180%)!important;
        -webkit-backdrop-filter:blur(24px) saturate(180%)!important;
      }
      body.fs-v16-filters-open .fs-v13-toolbar{display:grid!important}

      /* Neutraliza totalmente o comportamento legado que encolhia/expandia no scroll. */
      body.fs-mobile-header-collapsed .fs-bi-topbar,
      body:not(.fs-mobile-header-collapsed) .fs-bi-topbar{
        height:72px!important;min-height:72px!important;max-height:72px!important;
        padding:10px 14px!important;transform:none!important;opacity:1!important;
      }
      body.fs-mobile-header-collapsed .fs-v13-topbar-title,
      body.fs-mobile-header-collapsed #fs-v13-mobile-summary,
      body.fs-mobile-header-collapsed #fs-v16-menu-btn{transform:none!important;opacity:1!important}
      body.fs-mobile-header-collapsed .fs-v13-toolbar{display:none!important}
      body.fs-mobile-header-collapsed.fs-v16-filters-open .fs-v13-toolbar{display:grid!important}
    }
  `;document.head.appendChild(s);
}

function dialog(id,kicker,title){
  let d=$(id);if(d)return d;
  d=document.createElement('dialog');d.id=id;d.className='fs-v16-dialog';
  d.innerHTML=`<div class="fs-v16-dialog-head"><div><small>${esc(kicker)}</small><h2>${esc(title)}</h2></div><button type="button" class="fs-v16-close" aria-label="Fechar">×</button></div><div class="fs-v16-dialog-body"></div>`;
  document.body.appendChild(d);
  d.querySelector('.fs-v16-close').addEventListener('click',()=>d.close());
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  return d;
}

function openPermissions(){
  const src=$('permissions'),d=dialog('fs-v16-permissions-dialog','GESTÃO DE ACESSO','Autorizações da visão da equipe'),body=d.querySelector('.fs-v16-dialog-body');
  if(src){src.open=true;body.replaceChildren(src)}else body.innerHTML='<p>As autorizações ainda não foram carregadas.</p>';
  if(!d.open)d.showModal();
}
async function openData(){
  const d=dialog('fs-v16-data-dialog','ADMINISTRAÇÃO','Gerenciar dados do período'),body=d.querySelector('.fs-v16-dialog-body');
  if(!d.open)d.showModal();
  body.innerHTML='<p>Carregando gerenciamento do período…</p>';
  let src=$('data-admin-addon');
  for(let i=0;!src&&i<20;i++){
    await new Promise(r=>setTimeout(r,100));
    src=$('data-admin-addon');
  }
  if(src){
    src.open=true;
    src.style.display='block';
    body.replaceChildren(src);
  }else{
    body.innerHTML='<p>O gerenciamento do período não ficou disponível nesta sessão. Feche esta janela e atualize a página.</p>';
  }
}
function navItem(label,icon,id,fn){
  const a=document.createElement('a');a.href='#';a.id=id;a.className='fs-v16-special-link';a.innerHTML=`<span>${icon}</span> ${esc(label)}`;a.addEventListener('click',e=>{e.preventDefault();fn()});return a;
}
function desktop(){
  const nav=document.querySelector('.fs-bi-nav');if(!nav)return;
  // Remove versões antigas, se existirem.
  ['fs-v15-permissions-link','fs-v15-data-link','fs-v16-permissions-link','fs-v16-data-link'].forEach(id=>$(id)?.remove());
  const create=$('fs-v13-access-link');
  const p=navItem('Autorizações','🔐','fs-v16-permissions-link',openPermissions);
  const d=navItem('Dados do período','🗂️','fs-v16-data-link',openData);
  if(create){create.insertAdjacentElement('afterend',p);p.insertAdjacentElement('afterend',d)}else{nav.append(p,d)}
}
function go(selector){document.querySelector(selector)?.scrollIntoView({behavior:'smooth',block:'start'})}
function mobileMenu(){
  const top=document.querySelector('.fs-bi-topbar');if(!top)return;
  $('fs-v15-mobile-menu')?.remove();$('fs-v15-menu-btn')?.remove();
  if($('fs-v16-menu-btn'))return;
  const btn=document.createElement('button');btn.type='button';btn.id='fs-v16-menu-btn';btn.setAttribute('aria-label','Abrir menu');btn.textContent='⋮';
  const summary=$('fs-v13-mobile-summary');if(summary)summary.insertAdjacentElement('beforebegin',btn);else top.appendChild(btn);
  const d=document.createElement('dialog');d.id='fs-v16-mobile-menu';d.innerHTML=`
    <div class="fs-v16-menu-head"><strong>Menu da gestão</strong><button type="button" class="fs-v16-close" aria-label="Fechar">×</button></div>
    <div class="fs-v16-menu-grid">
      <button type="button" data-go="#visao-executiva"><span class="ico">📊</span><span>Visão Executiva</span></button>
      <button type="button" data-go="#metrics"><span class="ico">🎯</span><span>Oportunidades</span></button>
      <button type="button" data-go="#equipe"><span class="ico">👥</span><span>Equipe</span></button>
      <button type="button" data-go="#loss-intel"><span class="ico">📉</span><span>Perdas</span></button>
      <button type="button" data-go="#fs-team-intelligence"><span class="ico">📑</span><span>Relatórios</span></button>
      <button type="button" data-action="config"><span class="ico">⚙️</span><span>Configurações</span></button>
      <div class="fs-v16-menu-sep"></div>
      <button type="button" data-action="access"><span class="ico">➕</span><span>Criar acesso</span></button>
      <button type="button" data-action="permissions"><span class="ico">🔐</span><span>Autorizações</span></button>
      <button type="button" data-action="data"><span class="ico">🗂️</span><span>Dados do período</span></button>
      <div class="fs-v16-menu-sep"></div>
      <a href="./orcamentos.html?crm=1"><span class="ico">←</span><span>Voltar aos orçamentos</span></a>
    </div>`;
  document.body.appendChild(d);
  btn.addEventListener('click',()=>{if(!d.open)d.showModal()});
  d.querySelector('.fs-v16-close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d)d.close()});
  d.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{d.close();setTimeout(()=>go(b.dataset.go),40)}));
  d.querySelector('[data-action="access"]')?.addEventListener('click',()=>{d.close();setTimeout(()=>$('fs-v13-access-link')?.click(),50)});
  d.querySelector('[data-action="permissions"]')?.addEventListener('click',()=>{d.close();setTimeout(openPermissions,50)});
  d.querySelector('[data-action="data"]')?.addEventListener('click',()=>{d.close();setTimeout(openData,50)});
  d.querySelector('[data-action="config"]')?.addEventListener('click',()=>{d.close();setTimeout(openPermissions,50)});
}
function filterDialog(){
  let d=$('fs-v17-filter-dialog');
  if(d)return d;
  d=document.createElement('dialog');
  d.id='fs-v17-filter-dialog';
  d.innerHTML='<div class="fs-v17-filter-head"><div><small>GESTÃO DA EQUIPE</small><h2>Filtros da análise</h2></div><button type="button" class="fs-v17-filter-close" aria-label="Fechar">×</button></div><div class="fs-v17-filter-body"></div>';
  document.body.appendChild(d);
  d.querySelector('.fs-v17-filter-close').addEventListener('click',()=>d.close());
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  return d;
}
function syncFilterToolbarLocation(){
  const toolbar=$('fs-v13-toolbar'),top=document.querySelector('.fs-bi-topbar');
  if(!toolbar||!top)return;
  const d=filterDialog(),body=d.querySelector('.fs-v17-filter-body');
  if(window.innerWidth<=900){
    if(toolbar.parentElement!==body)body.appendChild(toolbar);
  }else{
    if(d.open)d.close();
    if(toolbar.parentElement!==top)top.appendChild(toolbar);
  }
}
function stableHeader(){
  const summary=$('fs-v13-mobile-summary');if(!summary)return;
  syncFilterToolbarLocation();
  if(summary.dataset.fsV17==='1')return;
  summary.dataset.fsV17='1';
  summary.setAttribute('role','button');
  summary.setAttribute('tabindex','0');
  summary.setAttribute('aria-expanded','false');
  const openFilters=()=>{
    if(window.innerWidth>900)return;
    syncFilterToolbarLocation();
    const d=filterDialog();
    if(!d.open)d.showModal();
    summary.setAttribute('aria-expanded','true');
  };
  summary.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openFilters()});
  summary.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openFilters()}});
  filterDialog().addEventListener('close',()=>summary.setAttribute('aria-expanded','false'));
  $('refresh')?.addEventListener('click',()=>{
    document.body.classList.remove('fs-v17-awaiting-apply');
    document.body.classList.add('fs-v17-analysis-applied');
    const d=$('fs-v17-filter-dialog');if(d?.open)d.close();
    setTimeout(()=>document.getElementById('metrics')?.scrollIntoView({behavior:'smooth',block:'start'}),180);
  });
  window.addEventListener('resize',syncFilterToolbarLocation);
}
function cleanupBottom(){
  document.body.classList.add('fs-v16-ready');
  $('relatorios')?.setAttribute('hidden','');
  const p=$('permissions');if(p&&!p.closest('#fs-v16-permissions-dialog'))p.style.display='none';
  const d=$('data-admin-addon');if(d&&!d.closest('#fs-v16-data-dialog'))d.style.display='none';
}
function enhance(){style();desktop();mobileMenu();stableHeader();cleanupBottom()}
function boot(){
  document.body.classList.add('fs-v17-awaiting-apply');
  document.body.classList.remove('fs-v17-analysis-applied');
  const accessList=document.querySelector('.access-list-wrap');if(accessList)accessList.open=false;
  enhance();
  let n=0;const t=setInterval(()=>{enhance();const a=document.querySelector('.access-list-wrap');if(a&&!document.body.classList.contains('fs-v17-analysis-applied'))a.open=false;if(++n>40)clearInterval(t)},250);
  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.documentElement,{childList:true,subtree:true})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

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
    /* Antes de Aplicar análise, nenhum conteúdo da gestão aparece. */
    body.fs-v17-awaiting-apply #content > *{display:none!important}
    body.fs-v17-awaiting-apply #access-admin{display:none!important}
    body.fs-v17-awaiting-apply #state:empty::before{content:'Selecione os filtros da análise e toque em Aplicar análise.';display:block;color:#667085}
    /* Removido definitivamente: texto explicativo solicitado para sair. */
    .fs-v12-funnel-note{display:none!important}

    /* 18/09/2026 12:46 — usuários cadastrados em faixa compacta */
    .access-list-wrap>summary{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto 22px!important;align-items:center!important;gap:10px!important;text-align:left!important;padding:14px 16px!important;min-height:54px!important}
    .fs-v18-access-title{font-weight:850!important;text-align:left!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .fs-v18-access-meta{margin:0!important;color:#7b8495!important;font-size:10px!important;font-weight:800!important;text-align:right!important;white-space:nowrap!important}
    .fs-v18-access-arrow{position:static!important;display:grid!important;place-items:center!important;width:22px!important;height:22px!important;transform:rotate(0deg)!important;color:#7b8495!important;font-size:16px!important;font-weight:900!important;transition:transform .18s ease!important}
    .access-list-wrap[open]>summary .fs-v18-access-arrow{transform:rotate(180deg)!important}
    @media(max-width:560px){.access-list-wrap>summary{grid-template-columns:minmax(0,1fr) auto 18px!important;gap:7px!important;padding:12px 14px!important;min-height:50px!important}.fs-v18-access-title{font-size:14px!important}.fs-v18-access-meta{font-size:9px!important}.fs-v18-access-arrow{font-size:15px!important}}
    #access-user-list .access-branch-group-addon>summary{display:none!important}
    #access-user-list .access-branch-group-addon{border:0!important;background:transparent!important;margin:0!important;overflow:visible!important}
    #access-user-list .access-branch-users-addon{padding:0!important}

    /* 18/09/2026 12:46 — popup motivacional sobre a estrutura, com progresso na borda */
    body.fs-v19-loading:before{content:"";position:fixed;inset:0;z-index:1440;background:rgba(28,35,48,.20);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:none}
    .fs-v19-loading-card{--fs-progress:0;position:fixed;display:none;z-index:1450;left:50%;top:50%;transform:translate(-50%,-50%);width:min(600px,calc(100% - 38px));padding:24px 24px 22px;border:3px solid transparent;border-radius:24px;background:linear-gradient(rgba(255,255,255,.98),rgba(255,255,255,.98)) padding-box,conic-gradient(from -90deg,#4f8df7 0%,#6551d6 calc(var(--fs-progress)*1%),#e4e8f0 calc(var(--fs-progress)*1%),#e4e8f0 100%) border-box;box-shadow:0 24px 70px rgba(29,40,67,.22);text-align:center;overflow:hidden;pointer-events:none}
    .fs-v19-loading-card.is-visible{display:block}
    body.fs-v19-loading #state{visibility:hidden!important}
    .fs-v19-loading-quote{margin:0;color:#25324a;font-size:15px;line-height:1.55;font-weight:700}
    .fs-v19-loading-author{display:block;margin-top:8px;color:#8490a3;font-size:10px;font-weight:750}
    .fs-v19-loading-progress{display:none!important}
    .fs-v19-loading-percent{display:block;margin-top:10px;color:#8995a8;font-size:10px;font-weight:850;letter-spacing:.04em}
    @media(max-width:900px){.fs-v19-loading-card{top:50%;width:min(600px,calc(100% - 28px));padding:22px 20px 20px;border-radius:22px;transform:translate(-50%,-50%)}.fs-v19-loading-quote{font-size:14px}}

    /* Alternância segura entre visual mobile e visual desktop */
    .fs-v19-desktop-return{display:flex!important;align-items:center;gap:7px;margin-top:8px!important;text-decoration:none;color:#53617a;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:800;background:#f7f9fc;border:1px solid #e2e8f2;cursor:pointer}
    html.fs-force-desktop body{min-width:1180px}

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
      <button type="button" data-action="desktop"><span class="ico">🖥️</span><span>Modo desktop</span></button>
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
  d.querySelector('[data-action="desktop"]')?.addEventListener('click',()=>{d.close();setViewMode(true)});
}
function setViewMode(desktopMode){
  try{
    if(desktopMode)localStorage.setItem('fs_gestao_desktop','1');
    else localStorage.removeItem('fs_gestao_desktop');
  }catch(_e){}
  location.reload();
}
function desktopReturnControl(){
  const forced=document.documentElement.classList.contains('fs-force-desktop');
  const nav=document.querySelector('.fs-bi-nav');
  let b=$('fs-v19-desktop-return');
  if(!forced){b?.remove();return;}
  if(!nav||b)return;
  b=document.createElement('button');
  b.type='button';b.id='fs-v19-desktop-return';b.className='fs-v19-desktop-return';
  b.innerHTML='<span>📱</span><span>Voltar ao modo mobile</span>';
  b.addEventListener('click',()=>setViewMode(false));
  nav.appendChild(b);
}

const FS_V19_REFLECTIONS=[
  ['Conhecer a si mesmo é o começo de toda mudança.','Reflexão inspirada em Sócrates'],
  ['Não controlamos tudo o que acontece; controlamos como respondemos.','Reflexão inspirada em Epicteto'],
  ['A excelência nasce de hábitos praticados todos os dias.','Reflexão inspirada em Aristóteles'],
  ['O obstáculo também pode se tornar parte do caminho.','Reflexão inspirada em Marco Aurélio'],
  ['Use bem o tempo que está diante de você.','Reflexão inspirada em Sêneca'],
  ['Grandes resultados começam com pequenas ações consistentes.','Reflexão de liderança'],
  ['Aprender, ajustar e continuar também é progresso.','Reflexão de desenvolvimento'],
  ['Clareza na decisão transforma esforço em direção.','Reflexão de gestão']
];
const FS_V20_MIN_LOADING_MS=7000;
let fsV19QuoteIndex=0,fsV19QuoteTimer=0,fsV20ProgressTimer=0,fsV20LoadingStarted=(window.__fsGestaoLoadingStarted||0),fsV20UnderlyingLoading=false,fsV20PendingHide=0;
function loadingCard(){
  let c=$('fs-v19-loading-card');if(c)return c;
  c=document.createElement('section');c.id='fs-v19-loading-card';c.className='fs-v19-loading-card';c.setAttribute('aria-live','polite');
  c.innerHTML='<p class="fs-v19-loading-quote" id="fs-v19-loading-quote"></p><small class="fs-v19-loading-author" id="fs-v19-loading-author"></small><span class="fs-v19-loading-percent" id="fs-v19-loading-percent">0%</span><div class="fs-v19-loading-progress" aria-hidden="true"><i id="fs-v19-loading-bar"></i></div>';
  const main=document.querySelector('main');
  const state=$('state');
  if(state&&state.parentElement)state.insertAdjacentElement('afterend',c);else main?.prepend(c);
  paintReflection();
  return c;
}
function paintReflection(){
  const qe=$('fs-v19-loading-quote'),ae=$('fs-v19-loading-author');
  if(qe&&String(qe.textContent||'').trim())return;
  const q=FS_V19_REFLECTIONS[fsV19QuoteIndex%FS_V19_REFLECTIONS.length];
  if(qe)qe.textContent='“'+q[0]+'”';if(ae)ae.textContent=q[1];
}
function paintLoadingProgress(forceComplete=false){
  if(!fsV20LoadingStarted)return;
  let pct=Number(window.__fsLoadingProgress||0);
  if(forceComplete){pct=100;window.__fsLoadingProgress=100;}
  const bar=$('fs-v19-loading-bar'),label=$('fs-v19-loading-percent');
  if(bar)bar.style.width=pct+'%';
  const card=$('fs-v19-loading-card');if(card)card.style.setProperty('--fs-progress',String(pct));
  if(label)label.textContent=pct+'%';
}
function finishLoadingReflection(){
  clearTimeout(fsV20PendingHide);fsV20PendingHide=0;
  clearInterval(fsV20ProgressTimer);fsV20ProgressTimer=0;
  clearInterval(window.__fsImmediateProgressTimer);window.__fsImmediateProgressTimer=0;
  paintLoadingProgress(true);
  setTimeout(()=>{
    const c=$('fs-v19-loading-card');if(c)c.classList.remove('is-visible');
    document.body.classList.remove('fs-v19-loading');
    clearInterval(fsV19QuoteTimer);fsV19QuoteTimer=0;
    fsV20LoadingStarted=0;
    window.__fsGestaoLoadingStarted=0;
    window.__fsGestaoLoadingVisibleAt=0;
  },320);
}
function setLoadingReflection(show){
  const c=loadingCard();
  fsV20UnderlyingLoading=!!show;
  if(show){
    clearTimeout(fsV20PendingHide);fsV20PendingHide=0;
    if(!fsV20LoadingStarted){
      fsV20LoadingStarted=window.__fsGestaoLoadingStarted||Date.now();
      window.__fsGestaoLoadingStarted=fsV20LoadingStarted;
      paintReflection();
    }
    c.classList.add('is-visible');
    document.body.classList.add('fs-v19-loading');
    document.documentElement.classList.remove('fs-boot-lock');
    paintLoadingProgress(false);
    return;
  }
  if(!fsV20LoadingStarted)return;
  const elapsed=Date.now()-fsV20LoadingStarted;
  const remaining=Math.max(0,FS_V20_MIN_LOADING_MS-elapsed);
  clearTimeout(fsV20PendingHide);
  fsV20PendingHide=setTimeout(()=>{
    if(fsV20UnderlyingLoading)return;
    finishLoadingReflection();
  },remaining);
}
function syncLoadingReflection(){
  const stateEl=$('state'),content=$('content'),refreshBtn=$('refresh');
  if(!stateEl)return;
  const txt=String(stateEl.textContent||'').trim();
  const isError=stateEl.dataset.error==='true';
  const awaiting=document.body.classList.contains('fs-v17-awaiting-apply');
  const contentHidden=!!(content&&content.hidden);
  const activelyRefreshing=!!(refreshBtn&&refreshBtn.disabled);
  const loadingText=/verificando|carregando|atualizando|sincronizando|aguarde/i.test(txt);

  // A fonte de verdade passa a ser o carregamento real. Um texto antigo de
  // "Verificando..." não pode manter o popup preso depois que a atualização acabou.
  const initialLoading=contentHidden&&!awaiting&&(activelyRefreshing||loadingText);
  const shouldShow=!isError&&(activelyRefreshing||initialLoading);
  setLoadingReflection(shouldShow);
}
function watchLoadingReflection(){
  const stateEl=$('state'),content=$('content');if(!stateEl||!content)return;
  if(document.body.dataset.fsV19LoadingWatch==='1'){syncLoadingReflection();return;}
  document.body.dataset.fsV19LoadingWatch='1';
  const obs=new MutationObserver(()=>setTimeout(syncLoadingReflection,0));
  obs.observe(stateEl,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-error']});
  obs.observe(content,{attributes:true,attributeFilter:['hidden']});
  const refreshBtn=$('refresh');
  if(refreshBtn)obs.observe(refreshBtn,{attributes:true,attributeFilter:['disabled']});
  window.addEventListener('pageshow',()=>setTimeout(syncLoadingReflection,40));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(syncLoadingReflection,60)});
  syncLoadingReflection();
  // Segurança contra estado visual preso após reload/restauração de página.
  setInterval(()=>{
    if(!fsV20LoadingStarted)return;
    const content=$('content'),refreshBtn=$('refresh');
    const awaiting=document.body.classList.contains('fs-v17-awaiting-apply');
    const realWork=!!(refreshBtn&&refreshBtn.disabled);
    if(!realWork && ((content&&!content.hidden)||awaiting)) setLoadingReflection(false);
  },500);
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
    setTimeout(stabilizeAccessRoster,80);
    const d=$('fs-v17-filter-dialog');if(d?.open)d.close();
    setTimeout(()=>document.getElementById('metrics')?.scrollIntoView({behavior:'smooth',block:'start'}),180);
  });
  window.addEventListener('resize',syncFilterToolbarLocation);
}
function stabilizeAccessRoster(){
  const wrap=document.querySelector('.access-list-wrap');
  const list=$('access-user-list');
  if(!wrap||!list)return;

  // O agrupador interno permanece aberto apenas para que a lista seja exibida
  // quando o bloco principal for aberto. O bloco principal nunca é aberto aqui.
  list.querySelectorAll('.access-branch-group-addon').forEach(g=>{g.open=true});

  const rows=[...list.querySelectorAll('.access-user')];
  if(!rows.length)return;

  const branches=[];
  rows.forEach(row=>{
    const small=row.querySelector('small');
    const raw=String(small?.textContent||'').trim();
    const branch=raw.split('·')[0].trim();
    if(branch&&!/^(VENDEDOR|GERENTE|COLABORADOR)$/i.test(branch)&&!branches.includes(branch))branches.push(branch);
  });
  const selected=$('hero-branch')?.selectedOptions?.[0]?.textContent?.trim();
  let branchLabel='';
  if(selected&&!/todas as filiais/i.test(selected)) branchLabel=selected.replace(/^Minha equipe\s*·\s*/i,'');
  else if(branches.length===1) branchLabel=branches[0];
  else if(branches.length>1) branchLabel=branches.length+' filiais';
  else branchLabel='Equipe';

  const summary=wrap.querySelector(':scope > summary');
  if(summary){
    summary.innerHTML='<span class="fs-v18-access-title">Usuários cadastrados</span><span class="fs-v18-access-meta">'+esc(branchLabel)+' · '+rows.length+' colaborador'+(rows.length===1?'':'es')+'</span><span class="fs-v18-access-arrow" aria-hidden="true">⌄</span>';
  }
}
function protectAccessRosterToggle(){
  const wrap=document.querySelector('.access-list-wrap');
  if(!wrap||wrap.dataset.fsV21Toggle==='1')return;
  wrap.dataset.fsV21Toggle='1';
  wrap.open=false;
  let userIntentUntil=0;
  const markIntent=()=>{userIntentUntil=Date.now()+700};
  const summary=wrap.querySelector(':scope > summary');
  summary?.addEventListener('pointerdown',markIntent,{passive:true});
  summary?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')markIntent()});
  new MutationObserver(()=>{
    if(wrap.open&&Date.now()>userIntentUntil){wrap.open=false;}
  }).observe(wrap,{attributes:true,attributeFilter:['open']});
}
function watchAccessRoster(){
  const list=$('access-user-list');if(!list)return;
  protectAccessRosterToggle();
  if(list.dataset.fsV18Watch==='1'){stabilizeAccessRoster();return;}
  list.dataset.fsV18Watch='1';
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{stabilizeAccessRoster();protectAccessRosterToggle()},60)};
  new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
  schedule();
}

function cleanupBottom(){
  document.body.classList.add('fs-v16-ready');
  $('relatorios')?.setAttribute('hidden','');
  const p=$('permissions');if(p&&!p.closest('#fs-v16-permissions-dialog'))p.style.display='none';
  const d=$('data-admin-addon');if(d&&!d.closest('#fs-v16-data-dialog'))d.style.display='none';
}
function enhance(){style();desktop();mobileMenu();stableHeader();cleanupBottom();watchAccessRoster();stabilizeAccessRoster();protectAccessRosterToggle();desktopReturnControl();watchLoadingReflection()}
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

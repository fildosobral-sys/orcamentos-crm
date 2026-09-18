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

    @media(max-width:900px){
      .fs-bi-sidebar{display:none!important}
      body.fs-bi-v12 main{padding-bottom:28px!important}

      /* Cabeçalho estável: sem abrir/fechar por scroll. Evita a tremedeira. */
      .fs-bi-topbar{position:sticky!important;top:0!important;z-index:1400!important;grid-template-columns:minmax(0,1fr) auto minmax(0,46vw)!important;grid-template-areas:'title menu summary' 'toolbar toolbar toolbar'!important;max-height:none!important;overflow:visible!important;transition:none!important;padding:10px 14px!important}
      .fs-v13-topbar-title{grid-area:title!important;align-self:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      #fs-v16-menu-btn{display:flex!important;grid-area:menu!important;align-self:center!important}
      #fs-v15-menu-btn{display:none!important}
      #fs-v13-mobile-summary{display:flex!important;grid-area:summary!important;max-width:46vw!important;min-width:0!important;align-self:center!important;cursor:pointer!important}

      /* Por padrão os filtros ficam recolhidos. Só abrem ao tocar em “Filtros da análise”. */
      .fs-v13-toolbar{display:none!important;grid-area:toolbar!important;max-height:none!important;opacity:1!important;transform:none!important;pointer-events:auto!important;overflow:visible!important;transition:none!important}
      body.fs-v16-filters-open .fs-v13-toolbar{display:grid!important}

      /* Neutraliza a classe antiga que era alternada a cada movimento da página. */
      body.fs-mobile-header-collapsed .fs-bi-topbar{max-height:none!important;padding:10px 14px!important;box-shadow:0 5px 24px rgba(28,28,30,.05)!important}
      body.fs-mobile-header-collapsed .fs-v13-toolbar{display:none!important;max-height:none!important;opacity:1!important;transform:none!important;pointer-events:auto!important;overflow:visible!important}
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
function openData(){
  const src=$('data-admin-addon'),d=dialog('fs-v16-data-dialog','ADMINISTRAÇÃO','Gerenciar dados do período'),body=d.querySelector('.fs-v16-dialog-body');
  if(src){src.open=true;body.replaceChildren(src)}else body.innerHTML='<p>O gerenciamento de dados ainda está sendo carregado. Aguarde alguns segundos e tente novamente.</p>';
  if(!d.open)d.showModal();
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
function stableHeader(){
  const summary=$('fs-v13-mobile-summary');if(!summary||summary.dataset.fsV16==='1')return;
  summary.dataset.fsV16='1';summary.setAttribute('role','button');summary.setAttribute('tabindex','0');summary.setAttribute('aria-expanded','false');
  const toggle=()=>{const open=document.body.classList.toggle('fs-v16-filters-open');summary.setAttribute('aria-expanded',String(open));};
  summary.addEventListener('click',toggle);summary.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
  // Remove o estado visual legado; o novo CSS não depende mais do scroll.
  document.body.classList.remove('fs-mobile-header-collapsed');
}
function cleanupBottom(){
  document.body.classList.add('fs-v16-ready');
  $('relatorios')?.setAttribute('hidden','');
  const p=$('permissions');if(p&&!p.closest('#fs-v16-permissions-dialog'))p.style.display='none';
  const d=$('data-admin-addon');if(d&&!d.closest('#fs-v16-data-dialog'))d.style.display='none';
}
function enhance(){style();desktop();mobileMenu();stableHeader();cleanupBottom()}
function boot(){enhance();let n=0;const t=setInterval(()=>{enhance();if(++n>40)clearInterval(t)},250);new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

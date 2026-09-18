(function(){
'use strict';

const $ = id => document.getElementById(id);

function esc(s){
  return String(s ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function addStyles(){
  if ($('fs-v15-style')) return;
  const s = document.createElement('style');
  s.id = 'fs-v15-style';
  s.textContent = `
    /* V15 - organização do menu de gestão */
    #relatorios{display:none!important}

    .fs-v15-special-link{
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
    }

    .fs-v15-special-dialog{
      width:min(760px,calc(100vw - 28px));
      max-height:min(82vh,760px);
      border:0!important;
      border-radius:24px!important;
      padding:0!important;
      overflow:hidden;
      background:#fff;
      color:#1c1c1e;
      box-shadow:0 30px 90px rgba(0,0,0,.24)!important;
    }
    .fs-v15-special-dialog::backdrop{
      background:rgba(20,20,24,.34)!important;
      backdrop-filter:blur(10px);
    }
    .fs-v15-dialog-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      padding:18px 20px;
      border-bottom:1px solid rgba(60,60,67,.12);
      background:rgba(248,248,250,.94);
      backdrop-filter:blur(20px) saturate(160%);
    }
    .fs-v15-dialog-head div{min-width:0}
    .fs-v15-dialog-head small{
      display:block;
      color:#6e6e73;
      font-size:11px;
      font-weight:800;
      letter-spacing:.08em;
      text-transform:uppercase;
      margin-bottom:3px;
    }
    .fs-v15-dialog-head h2{
      margin:0;
      font-size:21px;
      line-height:1.15;
      color:#1c1c1e;
    }
    .fs-v15-dialog-close{
      width:38px;
      height:38px;
      border:0;
      border-radius:12px;
      background:#eef0f5;
      color:#444b5a;
      font-size:22px;
      font-weight:800;
      cursor:pointer;
      flex:0 0 auto;
    }
    .fs-v15-dialog-body{
      padding:18px;
      overflow:auto;
      max-height:calc(82vh - 76px);
    }
    .fs-v15-dialog-body > details{
      display:block!important;
      margin:0!important;
      border:0!important;
      box-shadow:none!important;
      background:transparent!important;
    }
    .fs-v15-dialog-body > details > summary{
      display:none!important;
    }
    .fs-v15-dialog-body > details[hidden]{
      display:none!important;
    }

    /* Esconde as áreas originais depois que forem transformadas em modal */
    body.fs-v15-ready #permissions.fs-v15-moved,
    body.fs-v15-ready #data-admin-addon.fs-v15-moved{
      display:block;
    }

    #fs-v15-menu-btn{
      display:none;
      align-items:center;
      justify-content:center;
      width:42px;
      height:42px;
      border:1px solid rgba(60,60,67,.12);
      border-radius:14px;
      background:rgba(255,255,255,.82);
      color:#1c1c1e;
      font-size:24px;
      line-height:1;
      letter-spacing:2px;
      box-shadow:0 4px 14px rgba(28,28,30,.06);
      cursor:pointer;
    }

    #fs-v15-mobile-menu{
      width:min(390px,calc(100vw - 24px));
      border:0!important;
      border-radius:24px!important;
      padding:10px!important;
      background:rgba(248,248,250,.96);
      backdrop-filter:blur(24px) saturate(180%);
      box-shadow:0 28px 80px rgba(0,0,0,.25)!important;
    }
    #fs-v15-mobile-menu::backdrop{
      background:rgba(20,20,24,.28);
      backdrop-filter:blur(8px);
    }
    .fs-v15-menu-head{
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:8px 8px 10px;
    }
    .fs-v15-menu-head strong{
      font-size:18px;
      color:#1c1c1e;
    }
    .fs-v15-menu-grid{
      display:grid;
      gap:6px;
    }
    .fs-v15-menu-grid button,
    .fs-v15-menu-grid a{
      display:flex;
      align-items:center;
      gap:12px;
      width:100%;
      min-height:48px;
      padding:10px 12px;
      border:0;
      border-radius:14px;
      background:transparent;
      color:#1c1c1e;
      text-decoration:none;
      font:inherit;
      font-weight:700;
      text-align:left;
      cursor:pointer;
      white-space:nowrap;
    }
    .fs-v15-menu-grid button:hover,
    .fs-v15-menu-grid a:hover{
      background:rgba(10,132,255,.08);
    }
    .fs-v15-menu-grid .ico{
      width:28px;
      text-align:center;
      font-size:19px;
      flex:0 0 auto;
    }
    .fs-v15-menu-sep{
      height:1px;
      background:rgba(60,60,67,.12);
      margin:6px 4px;
    }

    @media(max-width:900px){
      /* No mobile, sai a barra inferior e entra menu no cabeçalho */
      .fs-bi-sidebar{
        display:none!important;
      }
      body.fs-bi-v12 main{
        padding-bottom:28px!important;
      }
      .fs-bi-topbar{
        grid-template-columns:1fr auto auto!important;
        grid-template-areas:
          'title menu summary'
          'toolbar toolbar toolbar'!important;
      }
      #fs-v15-menu-btn{
        display:flex!important;
        grid-area:menu;
        align-self:start;
      }
      #fs-v13-mobile-summary{
        max-width:46vw!important;
      }
    }
  `;
  document.head.appendChild(s);
}

function ensureDialog(id, kicker, title){
  let d = $(id);
  if (d) return d;
  d = document.createElement('dialog');
  d.id = id;
  d.className = 'fs-v15-special-dialog';
  d.innerHTML = `
    <div class="fs-v15-dialog-head">
      <div>
        <small>${esc(kicker)}</small>
        <h2>${esc(title)}</h2>
      </div>
      <button type="button" class="fs-v15-dialog-close" aria-label="Fechar">×</button>
    </div>
    <div class="fs-v15-dialog-body"></div>
  `;
  document.body.appendChild(d);
  d.querySelector('.fs-v15-dialog-close').addEventListener('click',()=>d.close());
  d.addEventListener('click',e=>{
    if(e.target===d)d.close();
  });
  return d;
}

function openPermissions(){
  const src = $('permissions');
  const d = ensureDialog('fs-v15-permissions-dialog','GESTÃO DE ACESSO','Autorizações da visão da equipe');
  const body = d.querySelector('.fs-v15-dialog-body');
  if(src){
    src.classList.add('fs-v15-moved');
    src.open = true;
    body.replaceChildren(src);
  }else{
    body.innerHTML='<p>As autorizações ainda não foram carregadas.</p>';
  }
  if(!d.open)d.showModal();
}

function locateDataAdmin(){
  return $('data-admin-addon');
}

function openDataAdmin(){
  const src = locateDataAdmin();
  const d = ensureDialog('fs-v15-data-dialog','ADMINISTRAÇÃO','Gerenciar dados do período');
  const body = d.querySelector('.fs-v15-dialog-body');
  if(src){
    src.classList.add('fs-v15-moved');
    src.open = true;
    body.replaceChildren(src);
  }else{
    body.innerHTML='<p>O gerenciamento de dados ainda está sendo carregado. Aguarde alguns segundos e tente novamente.</p>';
  }
  if(!d.open)d.showModal();
}

function navItem(label, icon, id, handler){
  const a = document.createElement('a');
  a.href = '#';
  a.id = id;
  a.className = 'fs-v15-special-link';
  a.innerHTML = `<span>${icon}</span> ${esc(label)}`;
  a.addEventListener('click',e=>{
    e.preventDefault();
    handler();
  });
  return a;
}

function buildDesktopSpecialItems(){
  const nav = document.querySelector('.fs-bi-nav');
  if(!nav || $('fs-v15-permissions-link')) return;

  const createAccess = $('fs-v13-access-link');
  const perms = navItem('Autorizações','🔐','fs-v15-permissions-link',openPermissions);
  const data = navItem('Dados do período','🗂️','fs-v15-data-link',openDataAdmin);

  if(createAccess){
    createAccess.insertAdjacentElement('afterend',perms);
    perms.insertAdjacentElement('afterend',data);
  }else{
    nav.appendChild(perms);
    nav.appendChild(data);
  }
}

function goTo(selector){
  const el = document.querySelector(selector);
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
}

function buildMobileMenu(){
  const top = document.querySelector('.fs-bi-topbar');
  if(!top || $('fs-v15-menu-btn')) return;

  const btn = document.createElement('button');
  btn.type='button';
  btn.id='fs-v15-menu-btn';
  btn.setAttribute('aria-label','Abrir menu');
  btn.textContent='⋮';

  const summary = $('fs-v13-mobile-summary');
  if(summary)summary.insertAdjacentElement('beforebegin',btn);
  else top.appendChild(btn);

  const d = document.createElement('dialog');
  d.id='fs-v15-mobile-menu';
  d.innerHTML=`
    <div class="fs-v15-menu-head">
      <strong>Menu da gestão</strong>
      <button type="button" class="fs-v15-dialog-close" aria-label="Fechar">×</button>
    </div>
    <div class="fs-v15-menu-grid">
      <button type="button" data-go="#visao-executiva"><span class="ico">📊</span><span>Visão Executiva</span></button>
      <button type="button" data-go="#metrics"><span class="ico">🎯</span><span>Oportunidades</span></button>
      <button type="button" data-go="#equipe"><span class="ico">👥</span><span>Equipe</span></button>
      <button type="button" data-go="#loss-intel"><span class="ico">📉</span><span>Perdas</span></button>
      <button type="button" data-go="#fs-team-intelligence"><span class="ico">📑</span><span>Relatórios</span></button>
      <button type="button" data-action="config"><span class="ico">⚙️</span><span>Configurações</span></button>

      <div class="fs-v15-menu-sep"></div>

      <button type="button" data-action="access"><span class="ico">➕</span><span>Criar acesso</span></button>
      <button type="button" data-action="permissions"><span class="ico">🔐</span><span>Autorizações</span></button>
      <button type="button" data-action="data"><span class="ico">🗂️</span><span>Dados do período</span></button>

      <div class="fs-v15-menu-sep"></div>

      <a href="./orcamentos.html?crm=1"><span class="ico">←</span><span>Voltar aos orçamentos</span></a>
    </div>
  `;
  document.body.appendChild(d);

  btn.addEventListener('click',()=>{ if(!d.open)d.showModal(); });
  d.querySelector('.fs-v15-dialog-close').addEventListener('click',()=>d.close());
  d.addEventListener('click',e=>{ if(e.target===d)d.close(); });

  d.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{
    d.close();
    setTimeout(()=>goTo(b.dataset.go),50);
  }));

  d.querySelector('[data-action="access"]')?.addEventListener('click',()=>{
    d.close();
    setTimeout(()=>$('fs-v13-access-link')?.click(),60);
  });

  d.querySelector('[data-action="permissions"]')?.addEventListener('click',()=>{
    d.close();
    setTimeout(openPermissions,60);
  });

  d.querySelector('[data-action="data"]')?.addEventListener('click',()=>{
    d.close();
    setTimeout(openDataAdmin,60);
  });

  d.querySelector('[data-action="config"]')?.addEventListener('click',()=>{
    d.close();
    setTimeout(openPermissions,60);
  });
}

function hideDuplicates(){
  const reasons = $('relatorios');
  if(reasons)reasons.hidden = true;
}

function relocateBottomControls(){
  const perms = $('permissions');
  if(perms)perms.classList.add('fs-v15-moved');

  const admin = locateDataAdmin();
  if(admin)admin.classList.add('fs-v15-moved');
}

function enhance(){
  addStyles();
  buildDesktopSpecialItems();
  buildMobileMenu();
  hideDuplicates();
  relocateBottomControls();
  document.body.classList.add('fs-v15-ready');
}

function boot(){
  enhance();

  let tries=0;
  const timer=setInterval(()=>{
    enhance();
    tries++;
    if(tries>40)clearInterval(timer);
  },250);

  const mo = new MutationObserver(()=>{
    enhance();
  });
  mo.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
})();

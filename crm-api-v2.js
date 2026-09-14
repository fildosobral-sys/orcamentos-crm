(function(){
'use strict';
const config=window.FSCRMConfig||{};let session=null;
const digits=s=>String(s||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
const SESSION_OK_KEY='crm_session_ok_v1';


function readCentralTicket(){
  try{
    const raw=localStorage.getItem('fs_central_return_ticket_backup_v3')||'';
    const ticket=raw?JSON.parse(raw):null;
    if(!ticket||!ticket.ts||!ticket.snapshot)return null;
    // Só aceita como origem da Central se o clique aconteceu recentemente.
    if(Date.now()-Number(ticket.ts)>10*60*1000)return null;
    return ticket;
  }catch(_e){return null;}
}

function centralSSOCredentials(){
  try{
    const ticket=readCentralTicket();
    const marked=
      sessionStorage.getItem('fs_module_from_index')==='1' ||
      sessionStorage.getItem('crm_sso_from_central')==='1' ||
      !!ticket;

    if(!marked)return null;

    const token=String(localStorage.getItem('fs_access_token')||'').trim();
    const branch=String(localStorage.getItem('fs_filial')||'').trim();
    const name=String(localStorage.getItem('fs_nome')||'').trim();
    const role=String(localStorage.getItem('fs_cargo')||'').trim();
    const phone=digits(localStorage.getItem('fs_whatsapp')||'');
    const deviceId=String(localStorage.getItem('fs_device_id')||'').trim();

    if(!token||!branch||!name||!role||!/^\d{10,11}$/.test(phone))return null;

    sessionStorage.setItem('crm_sso_from_central','1');

    return {
      mode:'central',
      central:{token,branch,name,role,phone,deviceId}
    };
  }catch(_e){
    return null;
  }
}

function storedCredentials(){
  const central=centralSSOCredentials();
  if(central)return central;

  const token=String(localStorage.getItem('crm_access_token')||'').trim();
  const branch=String(localStorage.getItem('crm_filial')||'').trim();
  const phone=digits(localStorage.getItem('crm_whatsapp')||'');
  if(!token||!branch||!phone){const e=Error('LOGIN_REQUIRED');e.code='LOGIN_REQUIRED';throw e;}
  if(token.length<12){const e=Error('A credencial individual precisa ter no mínimo 12 caracteres.');e.code='LOGIN_REQUIRED';throw e;}
  if(!/^\d{10,11}$/.test(phone)){const e=Error('Informe um WhatsApp válido com DDD.');e.code='LOGIN_REQUIRED';throw e;}
  return {token,branch,phone,deviceId:localStorage.getItem('fs_device_id')||''};
}
async function call(action,data={}){
  if(!config.apiUrl)throw Error('O banco central ainda não foi conectado.');
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.apiUrl))throw Error('Configure o endereço /exec do Apps Script.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),config.timeoutMs||25000);
  try{
    const auth=storedCredentials();
    const response=await fetch(config.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({version:2,action,auth,data}),redirect:'follow',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('O banco central não respondeu.');
    const result=await response.json();
    if(!result.ok){const e=Error(result.message||'Operação não autorizada.');e.code=result.code;throw e;}
    return result.data;
  }catch(e){if(e.name==='AbortError')throw Error('A conexão demorou. Tente novamente.');throw e;}finally{clearTimeout(timer);}
}
function clearCredentials(){
  session=null;
  ['crm_access_token','crm_filial','crm_whatsapp','crm_nome','crm_cargo'].forEach(k=>localStorage.removeItem(k));
  ['vendedorLogado','nomeVendedorLogado','plataformaAutorizada','dataAutorizacao'].forEach(k=>localStorage.removeItem(k));
  try{sessionStorage.removeItem('crm_sso_from_central');}catch(_e){}
  // A sessão fs_* pertence à Central FS e nunca é apagada pelo CRM.
}

const SUPPORT_PHONE='5588988222564';
const LOGIN_ATTEMPTS_KEY='fs_login_attempts';
function getLoginAttempts(){return Number(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY)||0)||0;}
function resetLoginAttempts(){sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);}
function addLoginAttempt(){const n=getLoginAttempts()+1;sessionStorage.setItem(LOGIN_ATTEMPTS_KEY,String(n));return n;}
function supportUrl(reason){
  const branch=String(localStorage.getItem('crm_filial')||document.getElementById('crmLoginBranch')?.value||'').trim();
  const phone=digits(localStorage.getItem('crm_whatsapp')||document.getElementById('crmLoginPhone')?.value||'');
  const actor=String(localStorage.getItem('crm_nome')||localStorage.getItem('fs_nome')||'').trim();
  const text=[
    'Olá, preciso de suporte no Sistema de Vendas Zenir / Orçamentos CRM.',
    reason?'Motivo: '+reason:'',
    actor?'Usuário: '+actor:'',
    branch?'Filial: '+branch:'',
    phone?'WhatsApp informado: '+phone:''
  ].filter(Boolean).join('\n');
  return 'https://wa.me/'+SUPPORT_PHONE+'?text='+encodeURIComponent(text);
}
function openSupport(reason){window.open(supportUrl(reason||'Solicitação de suporte pelo menu.'),'_blank','noopener');}
window.FSCRMOpenSupport=openSupport;

function emitAuthState(ok, actor=null){
  try{
    document.dispatchEvent(new CustomEvent(ok?'fscrm:authenticated':'fscrm:auth-required',{detail:{actor}}));
  }catch(_e){}
}

function applyRoleUI(actor){
  const canManage=!!actor?.canManage;
  const menuHeader=document.querySelector('#menuDropdown .menu-header');
  if(menuHeader)menuHeader.textContent=canManage?'🔧 Gerenciar Usuários':'👤 Menu do Usuário';
  const share=document.getElementById('btnShareAccess');
  if(share)share.style.display=canManage?'':'none';
  const team=document.getElementById('fscrm-team-link');
  if(team)team.hidden=!canManage;
}

async function connect(){session=null;session=await call('session');return session;}
window.FSCRMRemote={
  enabled:!!config.apiUrl,
  call,
  connect,
  get session(){return session;},
  clearCredentials,
  hasCredentials(){
    try{storedCredentials();return true;}catch(_e){return false;}
  }
};
function hidePrivateArea(){
  ['loginCard','calculatorCard','historySection','headerActions'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  const panel=document.getElementById('fscrm-panel');if(panel)panel.hidden=true;
}
function buildLoginCard(message){
  const card=document.getElementById('authCard');if(!card)return;
  hidePrivateArea();card.style.display='block';emitAuthState(false,null);
  const attempts=getLoginAttempts(),showSupport=attempts>=5;
  card.innerHTML=`<div class="login-header"><h2>🔐 Acesso ao Orçamentos CRM</h2><p>Entre com sua credencial individual cadastrada no sistema.</p></div>
  <form id="crmStandaloneLoginForm" autocomplete="off">
    <div class="input-group">
      <label class="input-label" for="crmLoginToken">🔑 Credencial individual:</label>
      <div class="crm-password-wrap"><input type="password" id="crmLoginToken" class="input-field" placeholder="Digite sua credencial" required autocomplete="current-password"><button type="button" class="crm-eye" id="crmTogglePassword" aria-label="Mostrar credencial" title="Mostrar/ocultar credencial">👁️</button></div>
    </div>
    <div class="input-group"><label class="input-label" for="crmLoginBranch">🏢 Filial:</label><input type="text" id="crmLoginBranch" class="input-field" placeholder="Ex.: Iguatu III" required></div>
    <div class="input-group"><label class="input-label" for="crmLoginPhone">📱 WhatsApp com DDD:</label><input type="tel" id="crmLoginPhone" class="input-field" placeholder="Ex.: 88999999999" inputmode="numeric" required></div>
    <div id="crmStandaloneError" style="${message?'':'display:none;'}margin:0 0 1rem;padding:.85rem 1rem;border-radius:10px;background:rgba(239,68,68,.10);color:#991b1b;font-weight:700;">${message||''}</div>
    <button type="submit" class="btn-login" id="crmStandaloneLoginBtn">🚀 Entrar no CRM</button>
    <button type="button" id="crmSupportBtn" class="crm-support-btn" style="${showSupport?'':'display:none;'}">📱 WhatsApp · Solicitar suporte</button>
    <p id="crmAttemptInfo" class="crm-attempt-info">${attempts?attempts+' tentativa'+(attempts===1?'':'s')+' sem sucesso.':''}</p>
  </form>`;
  const toggle=document.getElementById('crmTogglePassword'),tokenInput=document.getElementById('crmLoginToken');
  toggle?.addEventListener('click',()=>{const show=tokenInput.type==='password';tokenInput.type=show?'text':'password';toggle.textContent=show?'🙈':'👁️';toggle.setAttribute('aria-label',show?'Ocultar credencial':'Mostrar credencial');});
  document.getElementById('crmSupportBtn')?.addEventListener('click',()=>openSupport('Não consegui acessar o CRM após várias tentativas.'));
  document.getElementById('crmStandaloneLoginForm').addEventListener('submit',async function(e){
    e.preventDefault();const btn=document.getElementById('crmStandaloneLoginBtn'),box=document.getElementById('crmStandaloneError');
    const token=String(document.getElementById('crmLoginToken').value||'').trim();
    const branch=String(document.getElementById('crmLoginBranch').value||'').trim().toUpperCase();
    const phone=digits(document.getElementById('crmLoginPhone').value||'');
    box.style.display='none';
    const localFail=(msg)=>{box.textContent=msg;box.style.display='block';const n=addLoginAttempt();const info=document.getElementById('crmAttemptInfo');if(info)info.textContent=n+' tentativa'+(n===1?'':'s')+' sem sucesso.';if(n>=5){const s=document.getElementById('crmSupportBtn');if(s)s.style.display='block';}};
    if(token.length<12){localFail('A credencial precisa ter no mínimo 12 caracteres.');return;}
    if(!branch){localFail('Informe sua filial.');return;}
    if(!/^\d{10,11}$/.test(phone)){localFail('Informe um WhatsApp válido com DDD.');return;}
    btn.disabled=true;btn.textContent='Validando...';
    localStorage.setItem('crm_access_token',token);localStorage.setItem('crm_filial',branch);localStorage.setItem('crm_whatsapp',phone);
    try{
      const s=await connect(),actor=s&&s.actor?s.actor:null;if(!actor||!actor.name)throw Error('O CRM não retornou a identificação do usuário.');
      resetLoginAttempts();
      localStorage.setItem('crm_nome',actor.name);localStorage.setItem('crm_cargo',actor.role||'');localStorage.setItem('crm_filial',actor.branch||branch);localStorage.setItem(SESSION_OK_KEY,new Date().toISOString());localStorage.setItem('vendedorLogado',actor.name);localStorage.setItem('nomeVendedorLogado',actor.name);localStorage.setItem('plataformaAutorizada','true');
      applyRoleUI(actor);emitAuthState(true,actor);location.reload();
    }catch(err){
      const n=addLoginAttempt();
      clearCredentials();
      box.textContent=err.message||'Não foi possível validar o acesso.';box.style.display='block';btn.disabled=false;btn.textContent='🚀 Entrar no CRM';
      const info=document.getElementById('crmAttemptInfo');if(info)info.textContent=n+' tentativa'+(n===1?'':'s')+' sem sucesso.';
      if(n>=5){const s=document.getElementById('crmSupportBtn');if(s)s.style.display='block';}
    }
  });
}
async function verifyStandaloneAccess(){
  try{
    const creds=storedCredentials();
    // Se já existe sessão local válida, não mostra a tela de credencial enquanto confirma no servidor.
    const cachedName=String(localStorage.getItem('crm_nome')||localStorage.getItem('fs_nome')||localStorage.getItem('vendedorLogado')||'').trim();
    const a=document.getElementById('authCard'),l=document.getElementById('loginCard');
    if(a)a.style.display='none';if(l)l.style.display='none';
    if(cachedName&&typeof window.entrarNaCalculadora==='function'){
      window.vendedorAtual=cachedName;window.entrarNaCalculadora(cachedName);
    }else hidePrivateArea();

    const s=await connect(),actor=s&&s.actor?s.actor:null;if(!actor||!actor.name)throw Error('Usuário não identificado pelo CRM.');
    localStorage.setItem('crm_nome',actor.name);localStorage.setItem('crm_cargo',actor.role||'');localStorage.setItem('crm_filial',actor.branch||creds.branch);localStorage.setItem(SESSION_OK_KEY,new Date().toISOString());localStorage.setItem('vendedorLogado',actor.name);localStorage.setItem('nomeVendedorLogado',actor.name);localStorage.setItem('plataformaAutorizada','true');
    if(creds&&creds.mode==='central')sessionStorage.setItem('crm_sso_from_central','1');applyRoleUI(actor);emitAuthState(true,actor);
    if(!cachedName&&typeof window.entrarNaCalculadora==='function'){window.vendedorAtual=actor.name;window.entrarNaCalculadora(actor.name);}
  }catch(err){
    // Credencial ausente/realmente inválida: pede login. Falha transitória de rede não apaga a sessão salva.
    const cachedName=String(localStorage.getItem('crm_nome')||localStorage.getItem('fs_nome')||localStorage.getItem('vendedorLogado')||'').trim();
    const hasStoredCredentials=!!(localStorage.getItem('crm_access_token')&&localStorage.getItem('crm_filial')&&localStorage.getItem('crm_whatsapp'));
    const explicitRevocation=err.code==='UNAUTHORIZED'||err.code==='REVOKED'||err.code==='CRM_ACCESS_REQUIRED'||/revogad|não autorizad|crm ainda não está liberado/i.test(String(err.message||''));
    if(explicitRevocation){
      clearCredentials();
      buildLoginCard(err.message||'Seu acesso foi revogado. Entre novamente.');
    }else if(cachedName&&hasStoredCredentials){
      // Sessão já validada neste aparelho: falha de rede/tempo não força novo login.
      emitAuthState(true,{name:cachedName,branch:localStorage.getItem('crm_filial')||'',role:localStorage.getItem('crm_cargo')||''});
    }else{
      buildLoginCard(err.code==='LOGIN_REQUIRED'?'Informe suas credenciais para iniciar esta sessão.':'Não foi possível confirmar a conexão agora. Tente novamente.');
    }
  }
}
function confirmSessionReset(kind){
  const msg=kind==='switch'
    ?'Trocar de usuário encerrará esta sessão e as credenciais serão solicitadas novamente. Deseja continuar?'
    :'Sair do sistema encerrará esta sessão e suas credenciais serão solicitadas no próximo acesso. Deseja realmente sair?';
  return window.confirm(msg);
}
function installStandaloneGate(){
  const old=document.getElementById('loginCard');if(old)old.style.display='none';
  window.mostrarTelaAutorizacao=function(){buildLoginCard('');};
  window.mostrarTelaLogin=function(){buildLoginCard('');};
  window.verificarEstadoAcesso=verifyStandaloneAccess;
  window.trocarUsuario=function(){
    if(!confirmSessionReset('switch'))return;
    clearCredentials();resetLoginAttempts();buildLoginCard('Entre com a credencial do próximo usuário.');
  };
  window.logout=function(){
    if(!confirmSessionReset('logout'))return;
    clearCredentials();resetLoginAttempts();
    try{if(typeof window.limparFormulario==='function')window.limparFormulario();}catch(_e){}
    buildLoginCard('Sessão encerrada com segurança.');
  };
  const boot=()=>{try{storedCredentials();verifyStandaloneAccess();}catch(_e){buildLoginCard('');}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
installStandaloneGate();
})();

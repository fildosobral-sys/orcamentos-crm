(function(){
'use strict';
const config=window.FSCRMConfig||{};let session=null;
const digits=s=>String(s||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');

const CRM_SNAPSHOT_KEY='fs_crm_auth_snapshot_v1';
function readCRMSnapshot(){
  try{
    const v=JSON.parse(localStorage.getItem(CRM_SNAPSHOT_KEY)||'null');
    return v&&typeof v==='object'?v:null;
  }catch(_e){return null;}
}
function saveCRMSnapshot(){
  try{
    const token=String(localStorage.getItem('fs_access_token')||'').trim();
    const branch=String(localStorage.getItem('fs_filial')||'').trim();
    const phone=digits(localStorage.getItem('fs_whatsapp')||'');
    if(token.length<12||!branch||!/^\d{10,11}$/.test(phone))return;
    const keys=['fs_access_token','fs_filial','fs_whatsapp','fs_nome','fs_cargo','vendedorLogado','nomeVendedorLogado','plataformaAutorizada','dataAutorizacao','fsAuthGlobal','fs_device_id'];
    const data={};
    keys.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)data[k]=v;});
    localStorage.setItem(CRM_SNAPSHOT_KEY,JSON.stringify(data));
  }catch(_e){}
}

function storedCredentials(){
  const snap=readCRMSnapshot();
  const liveToken=String(localStorage.getItem('fs_access_token')||'').trim();
  const liveBranch=String(localStorage.getItem('fs_filial')||'').trim();
  const livePhone=digits(localStorage.getItem('fs_whatsapp')||'');
  const token=String(liveToken||((snap&&snap.fs_access_token)||'')).trim();
  const branch=String(liveBranch||((snap&&snap.fs_filial)||'')).trim();
  const phone=digits(livePhone||((snap&&snap.fs_whatsapp)||''));
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
  ['fs_access_token','fs_filial','fs_whatsapp','fs_nome','fs_cargo','vendedorLogado','nomeVendedorLogado','plataformaAutorizada','dataAutorizacao','fsAuthGlobal','fs_crm_validated_v1'].forEach(k=>localStorage.removeItem(k));
}

const SUPPORT_PHONE='5588988222564';
const LOGIN_ATTEMPTS_KEY='fs_login_attempts';
function getLoginAttempts(){return Number(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY)||0)||0;}
function resetLoginAttempts(){sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);}
function addLoginAttempt(){const n=getLoginAttempts()+1;sessionStorage.setItem(LOGIN_ATTEMPTS_KEY,String(n));return n;}
function supportUrl(reason){
  const branch=String(localStorage.getItem('fs_filial')||document.getElementById('crmLoginBranch')?.value||'').trim();
  const phone=digits(localStorage.getItem('fs_whatsapp')||document.getElementById('crmLoginPhone')?.value||'');
  const actor=String(localStorage.getItem('fs_nome')||'').trim();
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
window.FSCRMRemote={enabled:!!config.apiUrl,call,connect,get session(){return session;},clearCredentials};
function hidePrivateArea(){
  ['loginCard','calculatorCard','historySection','headerActions'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  const panel=document.getElementById('fscrm-panel');if(panel)panel.hidden=true;
}
function buildLoginCard(message){
  const card=document.getElementById('authCard');if(!card)return;
  hidePrivateArea();card.style.display='block';
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
    try{localStorage.removeItem(CRM_SNAPSHOT_KEY);}catch(_e){}
    localStorage.setItem('fs_access_token',token);localStorage.setItem('fs_filial',branch);localStorage.setItem('fs_whatsapp',phone);
    try{
      const s=await connect(),actor=s&&s.actor?s.actor:null;if(!actor||!actor.name)throw Error('O CRM não retornou a identificação do usuário.');
      resetLoginAttempts();
      localStorage.setItem('fs_nome',actor.name);localStorage.setItem('fs_cargo',actor.role||'');localStorage.setItem('fs_filial',actor.branch||branch);localStorage.setItem('vendedorLogado',actor.name);localStorage.setItem('nomeVendedorLogado',actor.name);localStorage.setItem('plataformaAutorizada','true');
      localStorage.setItem('fs_crm_validated_v1','1');localStorage.setItem('fs_crm_validated_v1','1');saveCRMSnapshot();applyRoleUI(actor);location.reload();
    }catch(err){
      const n=addLoginAttempt();
      try{localStorage.removeItem(CRM_SNAPSHOT_KEY);}catch(_e){}
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
    const cachedName=String(localStorage.getItem('fs_nome')||localStorage.getItem('vendedorLogado')||'').trim();
    const a=document.getElementById('authCard'),l=document.getElementById('loginCard');
    if(a)a.style.display='none';if(l)l.style.display='none';
    if(cachedName&&typeof window.entrarNaCalculadora==='function'){
      window.vendedorAtual=cachedName;window.entrarNaCalculadora(cachedName);
    }else hidePrivateArea();

    const s=await connect(),actor=s&&s.actor?s.actor:null;if(!actor||!actor.name)throw Error('Usuário não identificado pelo CRM.');
    localStorage.setItem('fs_nome',actor.name);localStorage.setItem('fs_cargo',actor.role||'');localStorage.setItem('fs_filial',actor.branch||creds.branch);localStorage.setItem('vendedorLogado',actor.name);localStorage.setItem('nomeVendedorLogado',actor.name);localStorage.setItem('plataformaAutorizada','true');
    saveCRMSnapshot();applyRoleUI(actor);
    if(!cachedName&&typeof window.entrarNaCalculadora==='function'){window.vendedorAtual=actor.name;window.entrarNaCalculadora(actor.name);}
  }catch(err){
    // Credencial ausente/realmente inválida: pede login. Falha transitória de rede não apaga a sessão salva.
    const authFailure=err.code==='LOGIN_REQUIRED'||err.code==='UNAUTHORIZED'||/credencial|revogad|não autorizad|usuário não identificado/i.test(String(err.message||''));
    if(authFailure){
      try{localStorage.removeItem(CRM_SNAPSHOT_KEY);}catch(_e){}
      const cachedName=String(localStorage.getItem('fs_nome')||localStorage.getItem('vendedorLogado')||'').trim();
      const hasAnyCred=!!(localStorage.getItem('fs_access_token')||localStorage.getItem('fs_filial')||localStorage.getItem('fs_whatsapp'));
      if(cachedName && err.code==='LOGIN_REQUIRED' && hasAnyCred){
        // Mantém a sessão visual durante uma inconsistência transitória de leitura/localStorage.
        if(typeof window.showToast==='function')window.showToast('Reconectando ao CRM…','warning');
      }else{
        clearCredentials();
        buildLoginCard(err.code==='LOGIN_REQUIRED'?'Informe suas credenciais para iniciar esta sessão.':(err.message||'Não foi possível validar seu acesso.'));
      }
    }
    else{
      const cachedName=String(localStorage.getItem('fs_nome')||'').trim();
      if(!cachedName)buildLoginCard('Não foi possível confirmar a conexão agora. Tente novamente.');
      else if(typeof window.showToast==='function')window.showToast('Sem conexão para validar o CRM. Sua sessão local foi mantida.','warning');
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

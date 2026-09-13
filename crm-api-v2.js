(function(){
'use strict';
const config=window.FSCRMConfig||{};let session=null;
const digits=s=>String(s||'').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
function storedCredentials(){
  const token=String(localStorage.getItem('fs_access_token')||'').trim();
  const branch=String(localStorage.getItem('fs_filial')||'').trim();
  const phone=digits(localStorage.getItem('fs_whatsapp')||'');
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
  ['fs_access_token','fs_filial','fs_whatsapp','fs_nome','fs_cargo','vendedorLogado','nomeVendedorLogado','plataformaAutorizada','dataAutorizacao','fsAuthGlobal'].forEach(k=>localStorage.removeItem(k));
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
  card.innerHTML=`<div class="login-header"><h2>🔐 Acesso ao Orçamentos CRM</h2><p>Entre com sua credencial individual cadastrada no sistema.</p></div>
  <form id="crmStandaloneLoginForm" autocomplete="off">
    <div class="input-group"><label class="input-label" for="crmLoginToken">🔑 Credencial individual:</label><input type="password" id="crmLoginToken" class="input-field" placeholder="Digite sua credencial" required autocomplete="current-password"></div>
    <div class="input-group"><label class="input-label" for="crmLoginBranch">🏢 Filial:</label><input type="text" id="crmLoginBranch" class="input-field" placeholder="Ex.: Iguatu III" required></div>
    <div class="input-group"><label class="input-label" for="crmLoginPhone">📱 WhatsApp com DDD:</label><input type="tel" id="crmLoginPhone" class="input-field" placeholder="Ex.: 88999999999" inputmode="numeric" required></div>
    <div id="crmStandaloneError" style="${message?'':'display:none;'}margin:0 0 1rem;padding:.85rem 1rem;border-radius:10px;background:rgba(239,68,68,.10);color:#991b1b;font-weight:700;">${message||''}</div>
    <button type="submit" class="btn-login" id="crmStandaloneLoginBtn">🚀 Entrar no CRM</button>
  </form>`;
  document.getElementById('crmStandaloneLoginForm').addEventListener('submit',async function(e){
    e.preventDefault();const btn=document.getElementById('crmStandaloneLoginBtn'),box=document.getElementById('crmStandaloneError');
    const token=String(document.getElementById('crmLoginToken').value||'').trim();
    const branch=String(document.getElementById('crmLoginBranch').value||'').trim();
    const phone=digits(document.getElementById('crmLoginPhone').value||'');
    box.style.display='none';
    if(token.length<12){box.textContent='A credencial precisa ter no mínimo 12 caracteres.';box.style.display='block';return;}
    if(!branch){box.textContent='Informe sua filial.';box.style.display='block';return;}
    if(!/^\d{10,11}$/.test(phone)){box.textContent='Informe um WhatsApp válido com DDD.';box.style.display='block';return;}
    btn.disabled=true;btn.textContent='Validando...';
    localStorage.setItem('fs_access_token',token);localStorage.setItem('fs_filial',branch);localStorage.setItem('fs_whatsapp',phone);
    try{
      const s=await connect(),actor=s&&s.actor?s.actor:null;if(!actor||!actor.name)throw Error('O CRM não retornou a identificação do usuário.');
      localStorage.setItem('fs_nome',actor.name);localStorage.setItem('fs_cargo',actor.role||'');localStorage.setItem('fs_filial',actor.branch||branch);localStorage.setItem('vendedorLogado',actor.name);localStorage.setItem('nomeVendedorLogado',actor.name);location.reload();
    }catch(err){clearCredentials();box.textContent=err.message||'Não foi possível validar o acesso.';box.style.display='block';btn.disabled=false;btn.textContent='🚀 Entrar no CRM';}
  });
}
async function verifyStandaloneAccess(){
  hidePrivateArea();
  try{
    const creds=storedCredentials();const s=await connect(),actor=s&&s.actor?s.actor:null;if(!actor||!actor.name)throw Error('Usuário não identificado pelo CRM.');
    localStorage.setItem('fs_nome',actor.name);localStorage.setItem('fs_cargo',actor.role||'');localStorage.setItem('fs_filial',actor.branch||creds.branch);localStorage.setItem('vendedorLogado',actor.name);localStorage.setItem('nomeVendedorLogado',actor.name);
    const a=document.getElementById('authCard'),l=document.getElementById('loginCard');if(a)a.style.display='none';if(l)l.style.display='none';
    if(typeof window.entrarNaCalculadora==='function'){window.vendedorAtual=actor.name;window.entrarNaCalculadora(actor.name);}
  }catch(err){clearCredentials();buildLoginCard(err.code==='LOGIN_REQUIRED'?'':(err.message||'Não foi possível validar seu acesso.'));}
}
function installStandaloneGate(){
  const old=document.getElementById('loginCard');if(old)old.style.display='none';
  window.mostrarTelaAutorizacao=function(){buildLoginCard('');};
  window.mostrarTelaLogin=function(){buildLoginCard('');};
  window.verificarEstadoAcesso=verifyStandaloneAccess;
  window.trocarUsuario=function(){clearCredentials();buildLoginCard('Entre com a credencial do próximo usuário.');};
  window.logout=function(){clearCredentials();try{if(typeof window.limparFormulario==='function')window.limparFormulario();}catch(_e){}buildLoginCard('Sessão encerrada com segurança.');};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>buildLoginCard(''),{once:true});else buildLoginCard('');
}
installStandaloneGate();
})();

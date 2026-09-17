(function () {
  'use strict';
  const C = window.FSCRMCore;
  const remote=window.FSCRMRemote; let serverRows=[], syncing=null;
  if (!C) return;
  let db, panel, modal, draft, messageDraft, revision, lastFocus, activityPeriod = '7', batchQueue = [], batchIndex = 0, authReady = !!remote?.session || !!remote?.hasCredentials?.() || !!(localStorage.getItem('crm_access_token')&&localStorage.getItem('crm_nome')&&localStorage.getItem('crm_filial'));
  const RECORD_CACHE_KEY='fscrm_records_cache_v2';
  const $ = (id) => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const date = v => v ? new Date(v.length === 10 ? v + 'T12:00:00' : v).toLocaleDateString('pt-BR') : 'Não definido';
  const selectedStatuses = () => [...document.querySelectorAll('input[name="fscrm-status-multi"]:checked')].map(x=>x.value);
  const hardContactBlock = r => {
    if(!r.consent) return 'Contato sem autorização registrada.';
    if(!C.validPhone(r.phone)) return 'WhatsApp inválido.';
    const group=db.all().filter(x=>x.id===r.id||C.sameClient(r,x));
    if(group.some(x=>(x.history||[]).some(h=>h.type==='nao_contatar')&&!x.consent)) return 'Cliente pediu para não receber contatos.';
    return '';
  };

  async function prepareEvidence(file){
    if(!file)throw Error('Selecione uma imagem ou PDF.');
    if(file.type==='application/pdf'){
      if(file.size>300000)throw Error('PDF maior que 300 KB. Reduza o arquivo antes de anexar.');
      return {name:file.name,mime:file.type,base64:await fileToBase64(file)};
    }
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Use JPG, PNG, WEBP ou PDF.');
    const img=await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);resolve(i)};i.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Não foi possível ler a imagem.'))};i.src=u;});
    const max=1280,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
    let quality=.78,data=canvas.toDataURL('image/jpeg',quality);
    while(data.length>430000&&quality>.42){quality-=.08;data=canvas.toDataURL('image/jpeg',quality);}
    if(data.length>430000)throw Error('A imagem continua grande. Recorte ou reduza antes de anexar.');
    return {name:file.name.replace(/\.[^.]+$/,'.jpg'),mime:'image/jpeg',base64:data.split(',')[1]};
  }
  function uppercaseOperationalFields(root=document){
    root.querySelectorAll('.fscrm input[type="text"], .fscrm textarea').forEach(el=>{
      if(el.dataset.upperReady==='1')return;
      el.dataset.upperReady='1';el.style.textTransform='uppercase';
      el.addEventListener('input',()=>{const a=el.selectionStart,b=el.selectionEnd,v=String(el.value||'').toUpperCase();if(el.value!==v){el.value=v;try{el.setSelectionRange(a,b)}catch(e){}}});
      if(el.value)el.value=String(el.value).toUpperCase();
    });
  }

  function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Falha ao ler o arquivo.'));r.readAsDataURL(file);});}

  const actor = () => remote?.session
    ? {...remote.session.actor,canManage:false}
    : ({name:localStorage.getItem('crm_nome')||'',branch:localStorage.getItem('crm_filial')||'',role:localStorage.getItem('crm_cargo')||'',canManage:false});
  function persistServerRows(){try{localStorage.setItem(RECORD_CACHE_KEY,JSON.stringify(serverRows.slice(-1200)));}catch(_e){}}
  function readServerCache(){try{const rows=JSON.parse(localStorage.getItem(RECORD_CACHE_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch(_e){return [];}}
  function cacheRecord(r){const i=serverRows.findIndex(x=>x.id===r.id);if(i<0)serverRows.push(r);else serverRows[i]=r;persistServerRows();return r;}
  function removeCachedRecord(id){serverRows=serverRows.filter(x=>x.id!==id);persistServerRows();}
  async function queueWrite(action,data,optimistic){
    if(!remote?.enqueue)throw Error('Armazenamento offline indisponível.');
    await remote.enqueue(action,data);
    if(optimistic)cacheRecord(optimistic);
    notify('Salvo neste aparelho. Sincronização com a nuvem pendente.',false);
    return optimistic;
  }
  async function remoteWrite(action,data,optimistic){
    try{return await remote.call(action,data);}
    catch(e){
      if(remote?.isNetworkError?.(e)||navigator.onLine===false)return queueWrite(action,data,optimistic);
      throw e;
    }
  }
  async function refreshData(){
    if(remote?.enabled && !authReady && !remote?.session && !remote?.hasCredentials?.()){
      // Sem qualquer credencial válida: mantém somente a estrutura local conhecida.
      render();
      return;
    }
    if(remote?.enabled){
      try{
        await remote.flushQueue?.();
        await remote.connect();
        authReady=!!remote.session;
        serverRows=(await remote.call('listMine')).records;
        persistServerRows();
        for(const record of serverRows)window.FSCRMBridge?.setSale(record.id,record.status==='ganha');
        window.dispatchEvent(new CustomEvent('fscrm:records',{detail:{records:serverRows}}));
      }catch(e){
        if(remote?.isNetworkError?.(e)||navigator.onLine===false){
          if(!serverRows.length)serverRows=readServerCache();
          notify('Modo offline: mostrando os dados salvos neste aparelho. A nuvem será atualizada automaticamente quando a conexão voltar.',false);
        }else throw e;
      }
    }
    await reconcile().catch(e=>{
      if(!(remote?.isNetworkError?.(e)||navigator.onLine===false))throw e;
    });render();
    const link=$('fscrm-team-link');if(link)link.hidden=remote?.enabled?!remote.session?.actor.canManage:!['DESENVOLVEDOR_MASTER','DESENVOLVER_MASTER'].includes(C.norm(actor().role));
  }
  function scheduleWarmRefresh(){
    [500,2200].forEach(ms=>setTimeout(()=>refreshData().catch(()=>{}),ms));
  }
  const opt = (v, label, selected) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(label)}</option>`;
  const field = (label, id, value, type = 'text', extra = '') => `<label>${label}<input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const select = (label, id, entries, val) => `<label>${label}<select id="${id}">${entries.map(([k,v]) => opt(k,v,val)).join('')}</select></label>`;
  const compactTime = (label,id,value='09:00') => { const safe=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value||''))?String(value):'09:00'; return `<label class="fscrm-compact-time">${label}<input id="${id}" type="text" inputmode="numeric" maxlength="5" placeholder="09:00" value="${esc(safe)}" autocomplete="off"></label>`; };
  function notify(message, error = false) { const box = $('fscrm-notice'); if (box) { box.textContent = message; box.dataset.error = String(error); } if (error && typeof showToast === 'function') showToast(message, 'error'); }
  function fail(e) { notify(e.message || String(e), true); const box = $('fscrm-modal-error'); if (box) box.textContent = e.message || String(e); }
  function source() { const data = JSON.parse(localStorage.getItem('calculosDesconto') || '[]'); if (!Array.isArray(data)) throw Error('O histórico original não está em um formato válido.'); return data.filter(r=>C.norm(r.vendedor)===C.norm(actor().name)); }
  function available() { return db.all().filter(r => C.canRead(r, actor())); }
  async function ingest(row) {
    if (!row.fs_crm_v1 || row.fs_crm_v1.kind !== 'cliente' || db.get(row.__backendId)) return;
    const meta = row.fs_crm_v1;
    if(remote?.enabled && meta.storage!=='central')return;
    // Não atribuir silenciosamente a outra filial ou a outro vendedor.
    if (C.norm(meta.branch) !== C.norm(actor().branch)) return;
    if (!C.leader(actor()) && C.norm(row.vendedor) !== C.norm(actor().name)) return;
    const record = C.create(row, meta, actor());
    if(record){
      if(remote?.enabled){
        const saved=await remoteWrite('create',{legacy:row,meta},record);
        cacheRecord(saved||record);
      }else db.put(record);
    }
  }
  async function reconcile() {
    if(syncing)return syncing;
    syncing=(async()=>{for(const row of source())await ingest(row);})();
    try{await syncing;}finally{syncing=null;}
  }
  function capture() {
    if(remote?.enabled && !remote.session && !remote?.hasCredentials?.())throw Error('Aguarde a validação do acesso central ou use Atualizar painel.');
    const kind = $('fscrm-kind')?.value;
    if (!kind) throw Error('A área de acompanhamento não está pronta. Recarregue a página antes de salvar.');
    if (kind === 'simulacao') return { kind };
    const a = actor();
    if (!a.name || !a.branch) throw Error('Entre pela página inicial para identificar vendedor e filial.');
    const number = $('whatsapp').value.trim();
    if (number && !C.validPhone(number)) throw Error('Informe o WhatsApp do cliente com DDD.');
    return { kind, ownerId:a.id||null, version:2,storage:remote?.enabled?'central':'local', branch: a.branch, channel: $('fscrm-channel').value, buyer: $('fscrm-buyer').value, next: C.plus(C.day(),1), consent: true, nextManual:false };
  }
  function captureSafe() { try { return capture(); } catch(e) { fail(e); return false; } }
  async function save(r, oldRevision, command) {
    if(remote?.enabled){
      const keys=['status','customStatus','reason','customReason','lossNote','lossCompetitor','lossCompetitorPrice','note','phone','consent','next','nextTime','followupType','nextManual','delivered','post','issue','issueOwner','issueDue','relation','channel','buyer'];
      const patch={};keys.forEach(k=>patch[k]=r[k]);
      const action=command?.action||'update';
      const payload={id:r.id,expectedRevision:oldRevision,requestId:(crypto.randomUUID?crypto.randomUUID():('req_'+Date.now())),patch,...(command?.data||{})};
      const saved=await remoteWrite(action,payload,r);
      r=cacheRecord(saved||r);
    }else db.put(r,oldRevision);
    try { window.FSCRMBridge?.setSale(r.id, r.status === 'ganha'); }
    catch(e) { notify('Acompanhamento salvo. O histórico antigo não foi atualizado: ' + e.message, true); }
    render();
  }
  async function setLegacyStatus(id, sold) {
    try {
      const r = db.get(id); if (!r) return false;
      const updated = C.edit(r, { status: sold ? 'ganha' : 'negociacao', next: C.plus(C.day(), 1), nextManual:false }, actor());
      await save(updated, r.revision);
      notify(sold ? 'Venda concluída. Registre a entrega para agendar o pós-venda.' : 'Negociação reaberta. Ela voltará para a agenda após 24 horas se não houver novo agendamento.');
    } catch(e) { fail(e); }
    return true;
  }
  function setupHistoryFilterCollapse(){
    const section=document.getElementById('historySection');
    if(!section||section.querySelector('.history-filter-details'))return;
    const title=section.querySelector('.history-title'),filter=section.querySelector('.date-filter');
    if(!title||!filter)return;
    const details=document.createElement('details');details.className='history-filter-details';
    const summary=document.createElement('summary');
    const hint=document.createElement('span');hint.className='history-filter-hint';hint.textContent='Filtros';
    title.parentNode.insertBefore(details,title);
    summary.appendChild(title);summary.appendChild(hint);details.appendChild(summary);details.appendChild(filter);
  }
  function mount() {
    if(remote?.enabled)serverRows=readServerCache();
    db=remote?.enabled?{all:()=>serverRows,get:id=>serverRows.find(r=>r.id===id)||null}:C.store(localStorage);
    setupHistoryFilterCollapse();
    const metadata = document.createElement('div');
    metadata.id = 'fscrm-capture'; metadata.className = 'fscrm';
    metadata.innerHTML = `<h3>Acompanhamento do cliente</h3><p class="fscrm-capture-copy">Pesquisas reais entram no painel. Simulações internas continuam apenas no histórico de cálculos.</p><div class="fscrm-grid fscrm-capture-grid">
      ${select('Tipo de registro', 'fscrm-kind', [['cliente','Pesquisa de cliente'],['simulacao','Simulação interna']], 'cliente')}
      ${select('Atendimento', 'fscrm-channel', [['presencial','Presencial'],['online','Online']], 'presencial')}
      ${select('Compra para', 'fscrm-buyer', [['proprio','O próprio cliente'],['terceiro','Terceiro']], 'proprio')}
      </div>`;
    $('discountForm').appendChild(metadata);
    $('discountForm').addEventListener('reset', () => setTimeout(() => {
      ['fscrm-channel','fscrm-buyer'].forEach(id => $(id).disabled = false);
    },0));
    $('fscrm-kind').addEventListener('change', () => {
      ['fscrm-channel','fscrm-buyer'].forEach(id => $(id).disabled = $('fscrm-kind').value === 'simulacao');
    });
    panel = document.createElement('section'); panel.id = 'fscrm-panel'; panel.className = 'fscrm';
    panel.innerHTML = `<details><summary>Acompanhamento comercial <span id="fscrm-count"></span></summary>
      <div class="fscrm-body"><p class="fscrm-local">${remote?.enabled?'Banco central configurado • Somente seus registros':'Modo local de preparação • Sem dados compartilhados entre aparelhos'}</p>
      <div id="fscrm-notice" role="status" aria-live="polite"></div>
      <div class="fscrm-toolbar"><a id="fscrm-team-link" href="./orcamentos-gestao.html" hidden>Gestão da equipe</a><button type="button" data-action="refresh">Atualizar painel</button><button type="button" data-action="export">Exportar backup</button><button type="button" data-action="restore">Restaurar backup</button><input id="fscrm-file" type="file" accept="application/json,.json" hidden></div>
      <h3>Agenda de acompanhamento</h3><p>Retornos de hoje e atrasados, independentemente da data do orçamento. Lembretes atualizados ao abrir esta página.</p><div id="fscrm-agenda"></div>
      <h3>Orçamentos</h3><div class="fscrm-filters">
      ${field('Criados a partir de', 'fscrm-from', '', 'date')}${field('Criados até', 'fscrm-to', '', 'date')}
      <fieldset class="fscrm-status-multi">
        <legend>Situação · marque uma ou mais</legend>
        ${Object.entries(C.STATUS).map(([k,v])=>`<label><input type="checkbox" name="fscrm-status-multi" value="${esc(k)}"> <span>${esc(v)}</span></label>`).join('')}
      </fieldset>
      <label id="fscrm-seller-wrap">Vendedor<select id="fscrm-seller-filter"><option value="">Todos</option></select></label>
      ${field('Buscar cliente ou produto', 'fscrm-search', '', 'search')}
      </div>
      <div class="fscrm-batch-bar">
        <div><strong>Sequência de contatos</strong><small>Organiza os retornos individualmente e prepara uma mensagem diferente para cada cliente.</small></div>
        <button type="button" data-action="prepare-batch">Iniciar contatos</button>
      </div>
      <div id="fscrm-stats" class="fscrm-stats"></div><div id="fscrm-records"></div>
      
      <details class="fscrm-old"><summary>Classificar registros anteriores</summary><p>Registros antigos não entram automaticamente nos indicadores. Inclua apenas pesquisas reais de clientes. A inclusão mantém o cálculo original.</p><div id="fscrm-old-list"></div></details>
      </div></details>`;
    $('historySection').before(panel);
    panel.hidden=true;
    modal = document.createElement('dialog'); modal.id = 'fscrm-modal'; modal.className = 'fscrm'; modal.setAttribute('aria-labelledby','fscrm-modal-title'); document.body.appendChild(modal);
    modal.addEventListener('close', () => lastFocus?.focus());
    modal.addEventListener('click', click);
    modal.addEventListener('focusin',e=>{if(e.target?.id==='fscrm-edit-status'||e.target?.id==='fscrm-edit-reason')e.target.dataset.before=e.target.value;});
    modal.addEventListener('change',handleCustomSelect);
    panel.addEventListener('click', click);
    panel.addEventListener('keydown',e=>{const card=e.target.closest?.('.fscrm-deal-row[data-action="open"]');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(card.dataset.id);}});
    panel.addEventListener('change', e => { if(e.target.id === 'fscrm-activity-period') { activityPeriod = e.target.value; render(); } });
    ['fscrm-from','fscrm-to','fscrm-seller-filter'].forEach(id => $(id).addEventListener('change', render));
    document.querySelectorAll('input[name="fscrm-status-multi"]').forEach(el=>el.addEventListener('change',render));
    $('fscrm-search').addEventListener('input', render);
    $('fscrm-file').addEventListener('change', restore);
    window.addEventListener('storage', e => { if(e.key&&e.key.startsWith('fs_')&&!e.key.startsWith(C.PREFIX)){serverRows=[];panel.hidden=true;location.reload();return;}
      if(e.key===null||e.key.startsWith(C.PREFIX)||e.key==='calculosDesconto'){
        if(!remote?.enabled || authReady || remote?.session) refreshData().catch(fail);
      } });
    document.addEventListener('visibilitychange', () => {
      if(!document.hidden && (!remote?.enabled || authReady || remote?.session)){
        refreshData().catch(()=>{});
        scheduleWarmRefresh();
      }
    });
    render();
    if(remote?.enabled)panel.querySelector('[data-action="restore"]').hidden=true;

    if(remote?.enabled){
      panel.hidden=!(actor().name&&actor().branch);
      document.addEventListener('fscrm:authenticated',async function(){
        authReady=true;
        try{
          await refreshData();
          scheduleWarmRefresh();
        }catch(e){fail(e);}
      });
      document.addEventListener('fscrm:auth-required',function(){
        authReady=false;
        serverRows=[];
        if(panel)panel.hidden=true;
        const notice=$('fscrm-notice');
        if(notice){notice.textContent='';notice.dataset.error='false';}
      });

      // Se o crm-api já autenticou antes de o painel terminar de montar.
      if(remote.session){
        authReady=true;
        refreshData().catch(()=>{});
        scheduleWarmRefresh();
      }
    }else{
      refreshData().catch(fail);
      scheduleWarmRefresh();
    }
  }

  const REMINDER_PREFIX='fscrm_reminder_seen_v1:';
  function reminderStamp(r){return `${r.id}|${r.next||''}|${r.nextTime||'09:00'}|${r.status||''}`;}
  function dueNow(r){
    if(!['agendado','aguardando_produto'].includes(r.status)||!r.next)return false;
    const now=new Date(), today=C.day(now);
    if(r.next<today)return true;
    if(r.next>today)return false;
    const hhmm=r.nextTime||'09:00';
    const [h,m]=hhmm.split(':').map(Number);
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now);
    const ph=Number(parts.find(x=>x.type==='hour')?.value||0), pm=Number(parts.find(x=>x.type==='minute')?.value||0);
    return ph*60+pm >= h*60+m;
  }
  function softBeep(){
    if(document.visibilityState!=='visible')return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      const ctx=new AC(),osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.frequency.value=740;gain.gain.value=.045;osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.18);osc.onended=()=>ctx.close();
    }catch(_e){}
  }

  const REMINDER_SESSION_PREFIX='fscrm_reminder_session_v1:';
  function ensureReminderAlertUi(){
    if(document.getElementById('fscrm-reminder-alert'))return;
    const style=document.createElement('style');
    style.textContent=`
      #fscrm-reminder-alert{width:min(92vw,430px);max-width:430px;border:0;border-radius:24px;padding:0;background:#fff;color:#27324a;box-shadow:0 28px 80px rgba(17,24,39,.40)}
      #fscrm-reminder-alert::backdrop{background:rgba(15,23,42,.60);backdrop-filter:blur(5px)}
      .fscrm-reminder-alert-head{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:18px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
      .fscrm-reminder-alert-head h3{margin:0;font-size:1.18rem;color:#fff}.fscrm-reminder-alert-head p{margin:5px 0 0;font-size:.90rem;opacity:.94}
      .fscrm-reminder-alert-close{width:40px;height:40px;border:1px solid rgba(255,255,255,.45);border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:1.4rem}
      .fscrm-reminder-alert-body{padding:18px}.fscrm-reminder-customer{font-size:1.12rem;font-weight:800;margin:0 0 4px}
      .fscrm-reminder-product{font-size:.94rem;color:#5f6978;margin:0 0 14px}.fscrm-reminder-date{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:10px 12px;border-radius:13px;font-weight:700;margin-bottom:14px}
      .fscrm-reminder-instruction{padding:12px 13px;border-radius:14px;background:#f8fafc;border:1px solid #e5e7eb;line-height:1.45;font-size:.94rem;margin-bottom:15px}
      .fscrm-reminder-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.fscrm-reminder-actions button{min-height:48px;border-radius:13px;border:1px solid #d8dee9;background:#fff;color:#344054;font:inherit;font-weight:700;padding:8px 10px}
      .fscrm-reminder-actions .primary{grid-column:1/-1;background:#16a34a;border-color:#16a34a;color:#fff}.fscrm-reminder-actions .warn{border-color:#f59e0b;color:#92400e;background:#fffbeb}
      @media(max-width:390px){#fscrm-reminder-alert{width:94vw}.fscrm-reminder-actions{grid-template-columns:1fr}.fscrm-reminder-actions .primary{grid-column:auto}}`;
    document.head.appendChild(style);
    const dlg=document.createElement('dialog');
    dlg.id='fscrm-reminder-alert';
    dlg.innerHTML=`<div class="fscrm-reminder-alert-head"><div><h3 id="fscrm-reminder-alert-title"></h3><p id="fscrm-reminder-alert-subtitle"></p></div><button type="button" class="fscrm-reminder-alert-close" data-reminder-action="close">×</button></div><div class="fscrm-reminder-alert-body"><p class="fscrm-reminder-customer" id="fscrm-reminder-client"></p><p class="fscrm-reminder-product" id="fscrm-reminder-product"></p><div class="fscrm-reminder-date" id="fscrm-reminder-date"></div><div class="fscrm-reminder-instruction" id="fscrm-reminder-instruction"></div><div class="fscrm-reminder-actions"><button type="button" class="primary" data-reminder-action="whatsapp">✅ Produto chegou — enviar WhatsApp</button><button type="button" class="warn" data-reminder-action="reschedule">📅 Reagendar</button><button type="button" data-reminder-action="open">Abrir negociação</button></div></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click',e=>{
      const b=e.target.closest('[data-reminder-action]');if(!b||!dlg._record)return;
      const r=dlg._record, stamp=reminderStamp(r), mark=()=>{try{sessionStorage.setItem(REMINDER_SESSION_PREFIX+stamp,'1')}catch(_e){}};
      if(b.dataset.reminderAction==='close'){mark();dlg.close();setTimeout(()=>checkProductReminders().catch(()=>{}),80);return;}
      if(b.dataset.reminderAction==='open'){mark();dlg.close();open(r.id);return;}
      if(b.dataset.reminderAction==='reschedule'){mark();dlg.close();open(r.id);setTimeout(()=>{$('fscrm-edit-next')?.scrollIntoView({behavior:'smooth',block:'center'});$('fscrm-edit-next')?.focus();},180);return;}
      if(b.dataset.reminderAction==='whatsapp'){
        if(!C.validPhone(r.phone)){fail(Error('Este cliente não possui um WhatsApp válido cadastrado.'));return;}
        const first=String(r.client||'cliente').trim().split(/\s+/)[0]||'cliente';
        const text=`Olá, ${first}! 😊 Passando para avisar que o seu produto ${String(r.product||'').trim()} chegou. Quando puder, pode vir à loja para finalizarmos sua compra. Se precisar, estou à disposição!`;
        mark();window.open('https://wa.me/'+C.phone(r.phone)+'?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');dlg.close();
      }
    });
  }
  function showInAppReminder(r){
    ensureReminderAlertUi();
    const dlg=$('fscrm-reminder-alert');if(!dlg||dlg.open)return false;
    const produto=r.status==='aguardando_produto'||r.followupType==='produto';
    dlg._record=r;
    $('fscrm-reminder-alert-title').textContent=produto?'📦 Verifique a chegada do produto':'📅 Retorno agendado';
    $('fscrm-reminder-alert-subtitle').textContent=produto?'A previsão chegou. Confirme com a logística antes de falar com o cliente.':'Chegou a hora combinada para retomar esta negociação.';
    $('fscrm-reminder-client').textContent=r.client||'Cliente';$('fscrm-reminder-product').textContent=r.product||'Produto não informado';
    $('fscrm-reminder-date').textContent=`🕒 ${date(r.next)}${r.nextTime?' às '+r.nextTime:''}`;
    $('fscrm-reminder-instruction').textContent=produto?'Confirme se o produto já chegou. Se chegou, envie a mensagem ao cliente. Se ainda não chegou, use Reagendar e informe a nova previsão.':'Retome o contato com o cliente ou use Reagendar para marcar uma nova data.';
    dlg.querySelector('[data-reminder-action="whatsapp"]').textContent=produto?'✅ Produto chegou — enviar WhatsApp':'💬 Enviar mensagem ao cliente';
    dlg.showModal();return true;
  }

  async function checkProductReminders(){
    const rows=(db?.all?.()||[]).filter(dueNow).sort((a,b)=>String(a.next||'').localeCompare(String(b.next||''))||String(a.nextTime||'').localeCompare(String(b.nextTime||'')));
    for(const r of rows){
      const produto=r.status==='aguardando_produto'||r.followupType==='produto';
      const title=produto?'📦 Produto previsto para hoje':'📅 Retorno agendado';
      const body=`${r.client} · ${r.product}${r.nextTime?' · '+r.nextTime:''}`;
      const nativeKey=REMINDER_PREFIX+reminderStamp(r);
      if(!localStorage.getItem(nativeKey)){
        localStorage.setItem(nativeKey,new Date().toISOString());
        if('Notification' in window&&Notification.permission==='granted'){
          try{
            let shown=false;
            if('serviceWorker' in navigator){
              const reg=await Promise.race([navigator.serviceWorker.ready,new Promise(resolve=>setTimeout(()=>resolve(null),700))]);
              if(reg?.showNotification){await reg.showNotification(title,{body,tag:'fscrm-'+r.id,renotify:true,icon:'./favicon.svg'});shown=true;}
            }
            if(!shown)new Notification(title,{body,tag:'fscrm-'+r.id,renotify:true});
          }catch(_e){}
        }
      }
      const sessionKey=REMINDER_SESSION_PREFIX+reminderStamp(r);
      if(!sessionStorage.getItem(sessionKey)){
        notify(produto?`${title}: ${r.client} — confirme com a logística e dê continuidade à negociação.`:`${title}: ${r.client} — hora de retomar esta negociação.`,false);
        softBeep();
        if(showInAppReminder(r))break;
      }
    }
  }

  function render() {
    const a = actor();
    panel.hidden = (remote?.enabled && !authReady && !remote?.session) || !a.name || !a.branch || document.documentElement.classList.contains('fs-module-auth-lock');
    if (panel.hidden) return;
    const all = available(), today = C.day();
    const sellerChoice = $('fscrm-seller-filter').value;
    $('fscrm-seller-wrap').hidden = !C.leader(a);
    $('fscrm-seller-filter').innerHTML = opt('', 'Todos', sellerChoice) + [...new Set(all.map(r => r.seller))].sort().map(s => opt(s,s,sellerChoice)).join('');
    let rows = all.filter(r => !C.leader(a) || !sellerChoice || r.seller === sellerChoice);
    const agenda = rows.flatMap(r => C.tasks(r).filter(t => t.date && t.date <= today).map(t => ({r,t}))).sort((a,b) => a.t.date.localeCompare(b.t.date));
    $('fscrm-count').textContent = `${all.length} registros · ${agenda.length} ações para hoje ou atrasadas`;
    $('fscrm-agenda').innerHTML = agenda.length ? agenda.map(({r,t}) => `<button class="fscrm-agenda-row" data-action="open" data-id="${esc(r.id)}"><span><strong>${esc(t.title)} · ${esc(r.client)}</strong><small>${esc(r.seller)} · ${esc(r.product)}</small></span><span class="${t.date < today ? 'fscrm-overdue' : ''}">${date(t.date)}${t.time ? ' · '+esc(t.time) : ''}${t.date < today ? ' · Atrasado' : ' · Hoje'}</span></button>`).join('') : '<p class="fscrm-empty">Nenhuma ação vencendo hoje. Os retornos futuros aparecem nos respectivos orçamentos.</p>';
    const from = $('fscrm-from').value, to = $('fscrm-to').value, statuses = selectedStatuses(), search = C.norm($('fscrm-search').value);
    if (from && to && from > to) { notify('A data inicial deve ser anterior à data final.',true); return; }
    rows = rows.filter(r => {
      const d = C.day(new Date(r.createdAt));
      return (!from || d >= from) &&
        (!to || d <= to) &&
        (!statuses.length || statuses.includes(r.status)) &&
        (!search || C.norm(r.client + ' ' + r.product).includes(search));
    });
    rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const wins = rows.filter(r => r.status === 'ganha');
    $('fscrm-stats').innerHTML = [['Orçamentos',rows.length],['Em negociação',rows.filter(r=>!C.closed(r)).length],['Vendas concluídas',wins.length],['Conversão',rows.length ? (100*wins.length/rows.length).toFixed(1)+'%' : '—'],['Valor concluído',money(wins.reduce((s,r)=>s+r.amount,0))]].map(([k,v])=>`<div><small>${k}</small><strong>${v}</strong></div>`).join('');
    $('fscrm-records').innerHTML = rows.length ? rows.map(r => `<article class="fscrm-deal-row" data-action="open" data-id="${esc(r.id)}" tabindex="0" role="button" aria-label="Acompanhar negociação de ${esc(r.client)}"><i class="fscrm-status-dot" data-status="${r.status}" aria-hidden="true"></i><div class="fscrm-deal-main"><div class="fscrm-deal-top"><strong>${esc(r.client)}</strong><span class="fscrm-badge" data-status="${r.status}">${r.status==='outro'?(r.customStatus||'Outro'):C.STATUS[r.status]}</span></div><div class="fscrm-deal-product">${esc(r.product)}</div><div class="fscrm-deal-foot"><span>${money(r.amount)}</span><span>${r.next ? ((r.status==='aguardando_produto'||r.followupType==='produto'?'Produto previsto ':'Retorno ')+date(r.next)+(r.nextTime?' · '+esc(r.nextTime):'')) : r.reason ? esc(r.reason==='Outro'&&r.customReason?r.customReason:r.reason) : date(r.createdAt)}</span></div></div><button type="button" class="fscrm-deal-delete" data-action="delete-record" data-id="${esc(r.id)}" data-revision="${r.revision}" aria-label="Excluir orçamento" title="Excluir">×</button><span class="fscrm-deal-chevron" aria-hidden="true">›</span></article>`).join('') : '<p class="fscrm-empty">Nenhum orçamento corresponde aos filtros.</p>';
    setTimeout(()=>checkProductReminders().catch(()=>{}),0);
    
    const old = source().filter(r => r.fs_crm_v1?.kind!=='simulacao' && !db.get(r.__backendId) && r.__backendId && (C.leader(a) || C.norm(r.vendedor) === C.norm(a.name)));
    $('fscrm-old-list').innerHTML = old.length ? old.map(r => `<div class="fscrm-old-row"><span>${esc(r.cliente)} · ${esc(r.codigo_produto)} · ${esc(r.vendedor)}</span><button type="button" data-action="enroll" data-id="${esc(r.__backendId)}">Classificar</button></div>`).join('') : '<p>Nenhum registro anterior aguardando classificação.</p>';
  }
  function show(title, body, actions) {
    if (!modal.open) lastFocus = document.activeElement;
    modal.innerHTML = `<div class="fscrm-modal-head"><h2 id="fscrm-modal-title">${esc(title)}</h2><button type="button" data-action="close" aria-label="Fechar">×</button></div><div id="fscrm-modal-error" role="alert"></div>${body}<div class="fscrm-modal-actions">${actions}<button type="button" data-action="close">Fechar</button></div>`;
    if (!modal.open) modal.showModal();
  }
  async function askUppercase(title, placeholder, initial='') {
    return new Promise(resolve => {
      document.getElementById('fscrm-custom-prompt')?.remove();
      const wrap=document.createElement('div');
      wrap.id='fscrm-custom-prompt';
      wrap.className='fscrm-custom-prompt-backdrop';
      wrap.innerHTML=`<div class="fscrm-custom-prompt-card" role="dialog" aria-modal="true">
        <div class="fscrm-custom-prompt-head"><h3>${esc(title)}</h3><button type="button" data-cancel aria-label="Fechar">×</button></div>
        <input id="fscrm-custom-prompt-input" type="text" maxlength="120" value="${esc(String(initial||'').toUpperCase())}" placeholder="${esc(placeholder)}">
        <div class="fscrm-custom-prompt-actions"><button type="button" data-cancel>Cancelar</button><button type="button" class="fscrm-primary" data-ok>Confirmar</button></div>
      </div>`;
      document.body.appendChild(wrap);
      const input=wrap.querySelector('#fscrm-custom-prompt-input');
      const done=v=>{wrap.remove();resolve(v);};
      input.addEventListener('input',()=>{const p=input.selectionStart;input.value=String(input.value||'').toUpperCase();try{input.setSelectionRange(p,p)}catch(_e){}});
      wrap.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click',()=>done(null)));
      wrap.querySelector('[data-ok]').addEventListener('click',()=>{const v=String(input.value||'').trim().toUpperCase();if(v)done(v);});
      wrap.addEventListener('click',e=>{if(e.target===wrap)done(null)});
      setTimeout(()=>input.focus(),30);
    });
  }

  async function handleCustomSelect(e){
    const el=e.target;
    if(el?.id==='fscrm-edit-status'){
      if(el.value==='outro'){
        const hidden=$('fscrm-edit-customStatus');
        const v=await askUppercase('OUTRO STATUS','INFORME O STATUS',hidden?.value||'');
        if(v){ hidden.value=v; $('fscrm-custom-status-view').textContent='STATUS: '+v; }
        else { el.value=el.dataset.before||'negociacao'; hidden.value=''; $('fscrm-custom-status-view').textContent=''; }
      }else{
        $('fscrm-edit-customStatus').value=''; $('fscrm-custom-status-view').textContent='';
      }
    }
    if(el?.id==='fscrm-edit-status'){
      const box=$('fscrm-return-schedule');
      if(box) box.hidden=!['agendado','aguardando_produto'].includes(el.value);
      const purpose=$('fscrm-edit-followupType');
      if(purpose && el.value==='aguardando_produto') purpose.value='produto';
      if(purpose && el.value==='agendado' && purpose.value==='produto') purpose.value='cliente';
      syncScheduledMode();
    }
    if(el?.id==='fscrm-edit-followupType'){
      const status=$('fscrm-edit-status');
      if(status){
        if(el.value==='produto') status.value='aguardando_produto';
        else if(status.value==='aguardando_produto') status.value='agendado';
        syncScheduledMode();
      }
    }
    if(el?.id==='fscrm-edit-reason'){
      if(el.value==='Outro'){
        const hidden=$('fscrm-edit-customReason');
        const v=await askUppercase('OUTRO MOTIVO DA PERDA','INFORME O MOTIVO',hidden?.value||'');
        if(v){ hidden.value=v; $('fscrm-custom-reason-view').textContent='MOTIVO: '+v; }
        else { el.value=el.dataset.before||''; hidden.value=''; $('fscrm-custom-reason-view').textContent=''; }
      }else{
        $('fscrm-edit-customReason').value=''; $('fscrm-custom-reason-view').textContent='';
      }
    }
  }

  function isScheduledStatus(v){return ['agendado','aguardando_produto'].includes(v);}
  function syncScheduledMode(){
    const scheduled=isScheduledStatus($('fscrm-edit-status')?.value||'');
    for(const id of ['fscrm-loss-reason-wrap','fscrm-loss-box','fscrm-standard-fields','fscrm-postsale-details','fscrm-history-details']){const el=$(id);if(el)el.hidden=scheduled;}
    const msg=$('fscrm-message-action'), stop=$('fscrm-stop-action'), saveBtn=$('fscrm-save-action');
    if(msg)msg.hidden=scheduled;if(stop)stop.hidden=scheduled;if(saveBtn)saveBtn.textContent=scheduled?'Confirmar agendamento':'Salvar alterações';
  }

  function open(id) {
    draft = db.get(id); if (!draft || !C.canRead(draft,actor())) throw Error('Orçamento não disponível para este usuário.');
    const r = draft; revision=r.revision;
    show('Acompanhar negociação', `<p><strong>${esc(r.client)}</strong> · ${esc(r.product)}<br>${esc(r.seller)} · ${money(r.amount)}</p><div class="fscrm-grid">
      ${select('Status','fscrm-edit-status',Object.entries(C.STATUS),r.status)}
      <input id="fscrm-edit-customStatus" type="hidden" value="${esc(r.customStatus||'')}"><p id="fscrm-custom-status-view" class="fscrm-custom-choice">${r.status==='outro'&&r.customStatus?'STATUS: '+esc(r.customStatus):''}</p>
      <section id="fscrm-return-schedule" class="fscrm-return-schedule" ${['agendado','aguardando_produto'].includes(r.status)?'':'hidden'}>
        <h3>📅 Agendar retorno</h3>
        <p class="fscrm-hint">Use para combinar um novo contato ou lembrar a previsão de chegada de um produto.</p>
        <div class="fscrm-grid">
          ${select('Finalidade','fscrm-edit-followupType',[['cliente','Retorno com o cliente'],['produto','Aguardando produto']],r.status==='aguardando_produto'?'produto':(r.followupType||'cliente'))}
          ${field(r.status==='aguardando_produto'?'Previsão de chegada':'Data do retorno','fscrm-edit-next',r.next||C.plus(C.day(),1),'date',`min="${C.day()}"`)}
          ${compactTime('Horário do lembrete','fscrm-edit-nextTime',r.nextTime||'09:00')}
        </div>
      </section>
      <div id="fscrm-loss-reason-wrap">${select('Motivo da perda','fscrm-edit-reason',[['','Selecione'],...C.REASONS.filter(x=>x!=='Preço').map(x=>[x,x])],r.reason==='Preço'?'Preço da concorrência':r.reason)}
      <input id="fscrm-edit-customReason" type="hidden" value="${esc(r.customReason||'')}"><p id="fscrm-custom-reason-view" class="fscrm-custom-choice">${r.reason==='Outro'&&r.customReason?'MOTIVO: '+esc(r.customReason):''}</p></div>
      <div id="fscrm-standard-fields">${field('WhatsApp com DDD','fscrm-edit-phone',r.phone,'tel')}
      <label class="fscrm-consent-check"><input id="fscrm-edit-consent" type="checkbox" ${r.consent?'checked':''}> Cliente autorizou contato pelo WhatsApp</label>
      ${select('Atendimento','fscrm-edit-channel',[['presencial','Presencial'],['online','Online']],r.channel)}
      ${select('Compra para','fscrm-edit-buyer',[['proprio','O próprio cliente'],['terceiro','Terceiro']],r.buyer)}</div>
      </div>
      <label id="fscrm-note-wrap">Observações gerais<textarea id="fscrm-edit-note" rows="3" maxlength="2000">${esc(r.note)}</textarea></label>
      <section id="fscrm-loss-box" class="fscrm-loss-box">
        <h3>Registro da perda / negativa</h3>
        <p>Preencha quando o cliente não fechar a compra. Esses dados alimentam os rankings e relatórios da gestão.</p>
        <div class="fscrm-grid">
          ${field('Concorrente (opcional)','fscrm-edit-lossCompetitor',r.lossCompetitor||'')}
          ${field('Valor da concorrência (R$)','fscrm-edit-lossCompetitorPrice',r.lossCompetitorPrice||'','number','min="0" step="0.01"')}
        </div>
        <label>Observação da perda (opcional)<textarea id="fscrm-edit-lossNote" rows="3" maxlength="2000">${esc(r.lossNote||'')}</textarea></label>
        <label>Evidência: foto, print ou PDF
          <input id="fscrm-evidence-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf">
        </label>
        <p class="fscrm-hint">A imagem é comprimida antes do envio. Limite: 5 anexos por negociação.</p>
        <div id="fscrm-evidence-list" class="fscrm-evidence-list">${(Array.isArray(r.evidence)?r.evidence:[]).map(x=>`<button type="button" data-action="view-evidence" data-file-id="${esc(x.id)}">${esc(x.name)}</button>`).join('')||'<span>Nenhum anexo.</span>'}</div>
      </section>
      <details id="fscrm-postsale-details" ${r.status==='ganha'?'open':''}><summary>Entrega e pós-venda</summary><p>O lembrete aparece três dias após a entrega ou retirada confirmada.</p><div class="fscrm-grid">
      ${field('Entrega / retirada confirmada','fscrm-edit-delivered',r.delivered,'date',`max="${C.day()}"`)}
      ${select('Resultado do pós-venda','fscrm-edit-post',[['pendente','Aguardando contato'],['bem','Está tudo certo'],['sem_resposta','Aguardando resposta'],['problema','Precisa de atendimento'],['resolvido','Problema resolvido']],r.post)}
      ${field('Problema relatado','fscrm-edit-issue',r.issue)}${field('Responsável pela solução','fscrm-edit-issueOwner',r.issueOwner)}${field('Prazo de solução','fscrm-edit-issueDue',r.issueDue,'date')}${field('Próximo relacionamento (opcional)','fscrm-edit-relation',r.relation,'date')}
      </div></details><details id="fscrm-history-details"><summary>Histórico de acompanhamento (${r.history.length})</summary><ol class="fscrm-history">${r.history.slice().reverse().map(h=>`<li><strong>${esc(h.actor)} · ${new Date(h.at).toLocaleString('pt-BR')}</strong><p>${esc(h.detail)}</p></li>`).join('')}</ol></details>
      <p class="fscrm-hint">Salve as alterações antes de preparar uma mensagem.</p>`,
      `<button type="button" id="fscrm-save-action" class="fscrm-primary" data-action="save">Salvar alterações</button><button type="button" id="fscrm-message-action" data-action="message">Preparar contato</button><button type="button" id="fscrm-stop-action" class="fscrm-danger" data-action="stop">Não contatar este cliente</button>`);
    syncScheduledMode();
  }
  async function editSave() {
    const modalError=$('fscrm-modal-error');
    if(modalError){modalError.textContent='';delete modalError.dataset.error;}
    const patch = {};
    ['status','reason','phone','note','delivered','post','issue','issueOwner','issueDue','relation','channel','buyer','lossNote','lossCompetitor'].forEach(k=>patch[k]=$('fscrm-edit-'+k).value.trim());
    patch.next=String($('fscrm-edit-next')?.value||draft.next||'').trim();
    patch.nextTime=String($('fscrm-edit-nextTime')?.value||draft.nextTime||'').trim();
    patch.followupType=String($('fscrm-edit-followupType')?.value||draft.followupType||'cliente').trim();
    patch.nextTime=patch.nextTime.replace(/[^0-9:]/g,'');
    if(/^\d{1,2}:\d{1,2}$/.test(patch.nextTime)){const [h,m]=patch.nextTime.split(':').map(Number);patch.nextTime=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
    if(patch.nextTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.nextTime)) throw Error('Informe o horário no formato HH:MM.');
    if(patch.followupType==='produto') patch.status='aguardando_produto';
    else if(patch.status==='aguardando_produto') patch.status='agendado';
    patch.nextManual=['agendado','aguardando_produto'].includes(patch.status);
    if(patch.nextManual){patch.reason='';patch.customReason='';patch.lossNote='';patch.lossCompetitor='';patch.lossCompetitorPrice=0;}
    patch.customStatus=String($('fscrm-edit-customStatus')?.value||'').trim().toUpperCase();
    patch.customReason=String($('fscrm-edit-customReason')?.value||'').trim().toUpperCase();
    ['note','issue','issueOwner','relation','lossNote','lossCompetitor'].forEach(k=>{ if(patch[k]) patch[k]=patch[k].toUpperCase(); });
    patch.lossCompetitorPrice=Number($('fscrm-edit-lossCompetitorPrice').value||0);
    patch.consent=!!$('fscrm-edit-consent')?.checked;
    let r = C.edit(draft,patch,actor()); await save(r,revision);
    if(['agendado','aguardando_produto'].includes(r.status) && 'Notification' in window && Notification.permission==='default'){
      try{await Notification.requestPermission();}catch(_e){}
    }
    draft=db.get(r.id)||r;
    revision=draft.revision;
    const file=$('fscrm-evidence-file')?.files?.[0];
    if(file){
      try{
        if(!remote?.enabled)throw Error('Anexos exigem o banco central conectado.');
        const prepared=await prepareEvidence(file);
        const evidencePayload={id:r.id,expectedRevision:r.revision,file:prepared};
        const evidenceSaved=await remoteWrite('addEvidence',evidencePayload,r);
        r=cacheRecord(evidenceSaved||r);
        draft=r;revision=r.revision;
        const list=$('fscrm-evidence-list');
        if(list){
          list.innerHTML=(Array.isArray(r.evidence)?r.evidence:[]).map(x=>`<button type="button" data-action="view-evidence" data-file-id="${esc(x.id)}">👁 ${esc(x.name)}</button>`).join('')||'<span>Nenhum anexo.</span>';
        }
        const input=$('fscrm-evidence-file');if(input)input.value='';
        notify('Alterações salvas e evidência anexada.');
        if(modalError){modalError.textContent='✓ Arquivo anexado e disponível para visualização.';modalError.dataset.error='false';}
      }catch(err){
        // O registro principal já foi salvo. A falha do anexo NÃO desfaz a perda/negociação.
        const msg='Registro salvo. A evidência não foi anexada: '+(err.message||'falha no envio.');
        notify(msg, true);
        const modalError=$('fscrm-modal-error');
        if(modalError){
          modalError.textContent=msg;
          modalError.dataset.error='true';
          modalError.scrollIntoView({behavior:'smooth',block:'start'});
        }
        // Mantém a janela aberta para tentar o anexo novamente ou simplesmente fechar.
      }
    } else {
      notify('Registro salvo.');
      modal.close();
    }
  }
  async function messageOpen() {
    const r=db.get(draft.id); if(r.revision!==revision) throw Error('O orçamento mudou. Feche e abra novamente.');
    const kind=r.post==='problema'?'suporte':r.status==='ganha'?(r.post==='bem'||r.post==='resolvido'?'relacionamento':'pos'):'retorno';
    const block=C.contactBlock(r,kind,db.all());
    if(block){
      if(!r.consent)throw Error('Marque "Cliente autorizou contato pelo WhatsApp" e salve antes de preparar a mensagem.');
      throw Error(block);
    }
    const task=C.tasks(r).find(t=>t.kind===kind);
    const lastContact=db.all().filter(x=>x.id===r.id||C.sameClient(r,x)).flatMap(x=>x.history||[]).filter(h=>String(h.type||'').startsWith('contato_')).sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0];
    const advisories=[];
    if(task?.date && task.date>C.day())advisories.push('Contato preferencialmente agendado para '+date(task.date)+'. Você pode enviar antes se a negociação exigir.');
    if(lastContact && Date.now()-new Date(lastContact.at).getTime()<2*86400000)advisories.push('Já houve contato recente com este cliente. Prefira espaçar as mensagens quando possível.');
    messageDraft={r,kind};
    show('Preparar contato', `<p><strong>${esc(r.client)}</strong> · ${esc(r.phone)}</p>${advisories.length?'<div class="fscrm-contact-advisory">'+advisories.map(x=>'<p>ℹ️ '+esc(x)+'</p>').join('')+'</div>':''}<label>Mensagem para revisar<textarea id="fscrm-message" rows="7" maxlength="2000">${esc(C.message(r,kind,actor()))}</textarea></label><p>O WhatsApp será aberto para você revisar e enviar. Só confirme o contato depois de realizá-lo.</p>
      ${select('Resultado do contato','fscrm-outcome',[['','Selecione após o contato'],['Mensagem enviada','Mensagem enviada'],['Cliente respondeu','Cliente respondeu'],['Sem resposta','Sem resposta']], '')}
      ${field('Observação do contato (opcional)','fscrm-contact-note','')}
      ${kind==='retorno'||kind==='relacionamento'?field('Próximo contato','fscrm-contact-next',C.plus(C.day(),kind==='relacionamento'?60:3),'date'):''}`,
      `<button type="button" class="fscrm-primary" data-action="whatsapp">Abrir WhatsApp</button><button type="button" data-action="copy">Copiar mensagem</button><button type="button" data-action="confirm-contact">Confirmar contato realizado</button>`);
  }
  async function confirmContact() {
    const {r,kind}=messageDraft;
    const updated=C.contact(r,kind,$('fscrm-outcome').value,$('fscrm-contact-note').value,$('fscrm-contact-next')?.value||'',actor(),db.all());
    await save(updated,r.revision,{action:'contact',data:{kind,outcome:$('fscrm-outcome').value,note:$('fscrm-contact-note').value,next:$('fscrm-contact-next')?.value||''}}); modal.close(); notify('Contato registrado. Atualize o status ou o pós-venda conforme a resposta do cliente.');
  }
  const CONTACT_TEMPLATES = [
    ({first,product,seller}) => `Oi, ${first}! Tudo bem? Aqui é ${seller}, da Zenir. Lembrei do ${product} que você viu com a gente. Quer que eu confira as condições de hoje pra você? 😊`,
    ({first,product,seller}) => `Olá, ${first}! Aqui é ${seller}, da Zenir. Você ainda está olhando o ${product}? Se quiser, posso verificar como estão as condições hoje.`,
    ({first,product,seller}) => `Oi, ${first}! Passando rapidinho sobre o ${product} que você pesquisou com a gente. Se ainda tiver interesse, posso dar uma olhada nas melhores condições pra você.`,
    ({first,product,seller}) => `Oi, ${first}! Tudo certo? Só queria saber se você conseguiu resolver aquela compra do ${product} ou se ainda posso te ajudar. 🙂`,
    ({first,product,seller}) => `Olá, ${first}! Lembrei da sua consulta do ${product}. Apareceram algumas condições interessantes por aqui. Quer que eu confira pra você?`,
    ({first,product,seller}) => `Oi, ${first}! Aqui é ${seller}, da Zenir. Sobre o ${product} que conversamos: ainda posso te ajudar com ele ou você já resolveu sua compra?`,
    ({first,product,seller}) => `Oi, ${first}! Tudo bem? Vi aqui sua pesquisa do ${product}. Se você ainda estiver avaliando, posso conferir uma condição atualizada pra você, sem compromisso.`,
    ({first,product,seller}) => `Olá, ${first}! Passando só pra não deixar sua consulta do ${product} esquecida. Se quiser, vejo as opções de hoje e te passo por aqui. 😉`,
    ({first,product,seller}) => `Oi, ${first}! Como você está? Sobre aquele ${product}: se ainda fizer sentido pra você, posso verificar se temos alguma oportunidade melhor hoje.`,
    ({first,product,seller}) => `Oi, ${first}! Só passando mais uma vez sobre o ${product} que você consultou. Se ainda quiser ajuda, me chama que eu verifico as condições pra você. 😊`
  ];

  function contactHistoryForClient(r){
    return db.all()
      .filter(x=>x.id===r.id||C.sameClient(r,x))
      .flatMap(x=>x.history||[])
      .filter(h=>String(h.type||'').startsWith('contato_'))
      .sort((a,b)=>String(a.at||'').localeCompare(String(b.at||'')));
  }

  function usedTemplateIndexes(r){
    return contactHistoryForClient(r)
      .map(h=>{
        const m=String(h.detail||'').match(/Modelo\s+(\d{1,2})/i);
        return m ? Number(m[1])-1 : null;
      })
      .filter(n=>Number.isInteger(n)&&n>=0&&n<CONTACT_TEMPLATES.length);
  }

  function nextTemplateIndex(r, offset=0){
    const used=usedTemplateIndexes(r);
    const recent=new Set(used.slice(-CONTACT_TEMPLATES.length));
    let start=(contactHistoryForClient(r).length+offset)%CONTACT_TEMPLATES.length;
    for(let i=0;i<CONTACT_TEMPLATES.length;i++){
      const idx=(start+i)%CONTACT_TEMPLATES.length;
      if(!recent.has(idx))return idx;
    }
    return start;
  }

  function buildContactMessage(r, idx){
    const first=String(r.client||'').trim().split(/\s+/)[0]||'Cliente';
    const product=String(r.product||'produto').trim();
    const seller=String(actor().name||r.seller||'seu vendedor').trim();
    return CONTACT_TEMPLATES[idx]({first,product,seller});
  }

  function currentFilteredRows(){
    const a=actor(),all=available();
    const sellerChoice=$('fscrm-seller-filter')?.value||'';
    const from=$('fscrm-from')?.value||'',to=$('fscrm-to')?.value||'';
    const statuses=selectedStatuses(),search=C.norm($('fscrm-search')?.value||'');
    return all.filter(r=>{
      const d=C.day(new Date(r.createdAt));
      return (!C.leader(a)||!sellerChoice||r.seller===sellerChoice) &&
        (!from||d>=from) && (!to||d<=to) &&
        (!statuses.length||statuses.includes(r.status)) &&
        (!search||C.norm(r.client+' '+r.product).includes(search));
    });
  }

  function prepareBatch(){
    const filtered=currentFilteredRows();
    const eligible=[],skipped=[];
    filtered.forEach(r=>{
      const reason=hardContactBlock(r);
      if(reason||r.status==='ganha')skipped.push({r,reason:reason||'Venda já concluída.'});
      else eligible.push(r);
    });
    if(!eligible.length)throw Error('Nenhum contato elegível nos filtros atuais. Verifique status, WhatsApp e autorização de contato.');
    batchQueue=eligible;batchIndex=0;
    show('Sequência de contatos',
      `<div class="fscrm-batch-summary"><strong>${eligible.length} contato(s) para realizar</strong><p>${skipped.length?skipped.length+' registro(s) foram ignorados por venda concluída, falta de autorização, telefone inválido ou bloqueio de contato.':'Os contatos selecionados estão aptos.'}</p><p class="fscrm-human-note">💬 Cada conversa é individual. O sistema alterna entre 10 mensagens para não ficar repetitivo.</p></div>
       <div id="fscrm-batch-current"></div>
       <label>Mensagem para revisar<textarea id="fscrm-batch-message" rows="6" maxlength="2000"></textarea></label>`,
      `<button type="button" class="fscrm-primary" data-action="batch-open">Abrir WhatsApp</button><button type="button" data-action="batch-change-message">Trocar mensagem</button><button type="button" data-action="batch-confirm-next">Confirmar enviado e próximo</button>`);
    renderBatchCurrent();
  }

  function renderBatchCurrent(forceOffset=0){
    const box=$('fscrm-batch-current');
    const area=$('fscrm-batch-message');
    if(!box)return;
    const r=batchQueue[batchIndex];
    if(!r){
      box.innerHTML='<p class="fscrm-empty">Sequência concluída. ✅</p>';
      if(area)area.value='';
      return;
    }
    const idx=nextTemplateIndex(r,forceOffset);
    r.__templateIndex=idx;
    box.innerHTML=`<div class="fscrm-batch-current"><small>${batchIndex+1} de ${batchQueue.length} · Modelo ${idx+1} de ${CONTACT_TEMPLATES.length}</small><strong>${esc(r.client)}</strong><span>${esc(r.product)} · ${esc(r.phone)}</span><em>Mensagem escolhida automaticamente pelo histórico deste cliente.</em></div>`;
    if(area)area.value=buildContactMessage(r,idx);
  }

  function batchOpen(){
    const r=batchQueue[batchIndex];
    if(!r)throw Error('A sequência de contatos foi concluída.');
    const msg=String($('fscrm-batch-message')?.value||'').trim();
    if(!msg)throw Error('A mensagem está vazia.');
    window.open('https://wa.me/'+C.phone(r.phone)+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
  }

  function batchChangeMessage(){
    const r=batchQueue[batchIndex];
    if(!r)return;
    const current=Number.isInteger(r.__templateIndex)?r.__templateIndex:nextTemplateIndex(r);
    const used=usedTemplateIndexes(r);
    const recent=new Set(used.slice(-CONTACT_TEMPLATES.length));
    let next=(current+1)%CONTACT_TEMPLATES.length;
    for(let i=0;i<CONTACT_TEMPLATES.length;i++){
      if(!recent.has(next))break;
      next=(next+1)%CONTACT_TEMPLATES.length;
    }
    r.__templateIndex=next;
    const area=$('fscrm-batch-message');
    if(area)area.value=buildContactMessage(r,next);
    const box=$('fscrm-batch-current');
    if(box){
      box.querySelector('small').textContent=`${batchIndex+1} de ${batchQueue.length} · Modelo ${next+1} de ${CONTACT_TEMPLATES.length}`;
    }
  }

  async function batchConfirmNext(){
    const r=batchQueue[batchIndex];
    if(!r)throw Error('A sequência de contatos foi concluída.');
    const idx=Number.isInteger(r.__templateIndex)?r.__templateIndex:nextTemplateIndex(r);
    const msg=String($('fscrm-batch-message')?.value||'').trim();
    const current=db.get(r.id)||r;
    const updated=C.contact(
      current,
      'retorno',
      'Mensagem enviada',
      `Sequência individual · Modelo ${idx+1}`,
      '',
      actor(),
      db.all()
    );
    const saved=await save(updated,current.revision,{
      action:'contact',
      data:{
        kind:'retorno',
        outcome:'Mensagem enviada',
        note:`Sequência individual · Modelo ${idx+1}`,
        next:''
      }
    });
    batchQueue[batchIndex]=saved||updated;
    notify('Contato registrado no histórico.');
    if(batchIndex<batchQueue.length-1){
      batchIndex++;
      renderBatchCurrent();
    }else{
      batchIndex=batchQueue.length;
      renderBatchCurrent();
    }
  }

  async function stop() {
    const r = db.get(draft.id); if(!C.canRead(r,actor())) throw Error('Sem acesso.');
    const updated=C.edit(r,{consent:false},actor());
    const next=JSON.parse(JSON.stringify(updated));
    next.history.push({at:new Date().toISOString(),actor:actor().name,type:'nao_contatar',detail:'Cliente pediu interrupção dos contatos. Bloqueio também considerado em outros orçamentos com o mesmo telefone nesta filial.'});
    if(next.revision===r.revision) next.revision++;
    next.updatedAt=new Date().toISOString(); await save(next,r.revision,{action:'stop'});modal.close();notify('Pedido de interrupção registrado.');
  }


  async function deleteRecord(id, expectedRevision){
    const r=db.get(id); if(!r)throw Error('Registro não encontrado.');
    const ok=window.confirm('Excluir este orçamento? Use esta opção apenas para lançamento feito por engano. Esta ação remove o registro do acompanhamento e dos indicadores.');
    if(!ok)return;
    if(remote?.enabled){
      try{
        await remote.call('delete',{id,expectedRevision:Number(expectedRevision)});
      }catch(e){
        if(remote?.isNetworkError?.(e)||navigator.onLine===false){
          await remote.enqueue('delete',{id,expectedRevision:Number(expectedRevision)});
          notify('Exclusão salva neste aparelho. Será concluída na nuvem quando a conexão voltar.',false);
        }else throw e;
      }
      removeCachedRecord(id);
    }else{
      localStorage.removeItem(C.PREFIX+id);
    }
    try{
      const rows=JSON.parse(localStorage.getItem('calculosDesconto')||'[]');
      localStorage.setItem('calculosDesconto',JSON.stringify(rows.filter(x=>x.__backendId!==id)));
    }catch(_e){}
    window.dispatchEvent(new CustomEvent('fscrm:records',{detail:{records:serverRows}}));
    render();
    if(remote?.enabled && navigator.onLine!==false)await refreshData().catch(()=>{});
    notify(navigator.onLine===false?'Exclusão registrada. A nuvem será atualizada quando a conexão voltar.':'Orçamento excluído de todo o sistema.');
  }

  async function viewEvidence(fileId){
    if(!remote?.enabled)throw Error('Visualização de anexo disponível apenas no banco central.');
    const item=await remote.call('attachment',{id:draft.id,fileId});
    const src='data:'+item.mime+';base64,'+item.base64;
    if(item.mime==='application/pdf'){const w=window.open();w.document.write('<iframe style="border:0;width:100%;height:100vh" src="'+src+'"></iframe>');return;}
    show('Evidência comercial', `<p>${esc(item.name)}</p><img class="fscrm-evidence-preview" src="${src}" alt="Evidência comercial">`, '');
  }

  function enroll(id) {
    const r=source().find(x=>x.__backendId===id); if(!r || (!C.leader(actor())&&C.norm(r.vendedor)!==C.norm(actor().name))) throw Error('Registro não disponível.');
    draft=r;
    show('Classificar pesquisa anterior', `<p>${esc(r.cliente)} · ${esc(r.codigo_produto)}</p><p>Confirme que foi uma pesquisa real de cliente e que pertence à ${esc(actor().branch)}.</p><div class="fscrm-grid">${select('Atendimento','fscrm-enroll-channel',[['presencial','Presencial'],['online','Online']],'presencial')}${select('Compra para','fscrm-enroll-buyer',[['proprio','O próprio cliente'],['terceiro','Terceiro']],'proprio')}</div>`, `<button type="button" data-action="enroll-confirm" class="fscrm-primary">Incluir pesquisa no acompanhamento</button>`);
  }
  function exportBackup() {
    const payload={type:'fs-crm-backup',version:1,branch:actor().branch,exportedAt:new Date().toISOString(),records:available()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='acompanhamento-orcamentos-'+C.day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('Backup exportado com os registros disponíveis para este usuário.');
  }
  async function restore(e) {
    try {
      if(remote?.enabled)throw Error('Restauração local indisponível no banco central. Use Classificar registros anteriores para importar pesquisas identificadas.');
      const file=e.target.files[0]; if(!file)return;
      if(file.size>10*1024*1024)throw Error('Backup maior que o limite de 10 MB.');
      const data=JSON.parse(await file.text());
      if(data.type!=='fs-crm-backup'||data.version!==1||!Array.isArray(data.records)||C.norm(data.branch)!==C.norm(actor().branch))throw Error('Backup incompatível ou de outra filial.');
      for(const r of data.records) {
        if(!r || r.schema!==1 || typeof r.id!=='string' || !r.id || !Number.isInteger(r.revision) || r.revision<1 || !C.STATUS[r.status] || !Array.isArray(r.history) || !C.canRead(r,actor()) || !Number.isFinite(Date.parse(r.createdAt)) || !Number.isFinite(Date.parse(r.updatedAt)) || !Number.isFinite(r.amount))throw Error('Backup contém registros inválidos ou sem permissão para este usuário.');
        for(const k of ['client','seller','branch','product','phone','note']) if(typeof r[k]!=='string')throw Error('Backup com campos inválidos.');
        for(const h of r.history)if(!h||typeof h.type!=='string'||typeof h.actor!=='string'||typeof h.detail!=='string'||!Number.isFinite(Date.parse(h.at)))throw Error('Histórico inválido no backup.');
        C.edit(r,{},actor());
      }
      let added=0,skipped=0;
      for(const r of data.records){if(db.get(r.id)){skipped++;continue;}db.put(r);added++;}
      render();notify(`${added} registros restaurados; ${skipped} já existentes preservados. Nenhum registro foi sobrescrito.`);
    }catch(err){fail(err);}finally{e.target.value='';}
  }
  async function click(e) {
    const b=e.target.closest('button[data-action], .fscrm-deal-row[data-action="open"]');if(!b)return;
    if(b.tagName==='BUTTON'&&b.disabled)return;
    if(b.tagName==='BUTTON')b.disabled=true;
    try {
      switch(b.dataset.action){
        case 'close':modal.close();break;
        case 'refresh':await refreshData();notify('Painel atualizado.');break;
        case 'open':open(b.dataset.id);break;
        case 'save':await editSave();break;
        case 'message':await messageOpen();break;
        case 'stop':await stop();break;
        case 'confirm-contact':await confirmContact();break;
        case 'whatsapp': {
          const {r,kind}=messageDraft,block=C.contactBlock(db.get(r.id),kind,db.all());if(block)throw Error(block);
          const text=$('fscrm-message').value.trim();if(!text)throw Error('Escreva a mensagem antes de abrir o WhatsApp.');
          window.open('https://wa.me/'+C.phone(r.phone)+'?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');break;
        }
        case 'copy':await navigator.clipboard.writeText($('fscrm-message').value);$('fscrm-modal-error').textContent='Mensagem copiada. O contato ainda não foi registrado.';break;
        case 'delete-record':await deleteRecord(b.dataset.id,b.dataset.revision);break;
        case 'view-evidence':await viewEvidence(b.dataset.fileId);break;
        case 'enroll':enroll(b.dataset.id);break;
        case 'enroll-confirm':
        case 'enroll-confirm-open':{
          const shouldOpen=b.dataset.action==='enroll-confirm-open';
          const legacyId=draft.__backendId;
          const r=C.create(draft,{kind:'cliente',channel:$('fscrm-enroll-channel').value,buyer:$('fscrm-enroll-buyer').value,next:C.plus(C.day(),1),consent:true,nextManual:false},actor());if(remote?.enabled){const saved=await remoteWrite('create',{legacy:draft,meta:{kind:'cliente',channel:r.channel,buyer:r.buyer,next:r.next||C.plus(C.day(),1),consent:true},imported:true},r);cacheRecord(saved||r);}else db.put(r);modal.close();render();notify('Pesquisa incluída. O cálculo original foi preservado.');if(shouldOpen)setTimeout(()=>open(legacyId),0);break;
        }
        case 'prepare-batch':prepareBatch();break;
        case 'batch-open':batchOpen();break;
        case 'batch-change-message':batchChangeMessage();break;
        case 'batch-confirm-next':await batchConfirmNext();break;
        case 'export':exportBackup();break;
        case 'restore':$('fscrm-file').click();break;
      }
    }catch(err){fail(err);}finally{if(b.tagName==='BUTTON')b.disabled=false;}
  }
  async function openFromHistory(id){
    try{
      let r=db?.get(id);
      if(!r){
        const legacy=source().find(x=>String(x.__backendId)===String(id));
        if(!legacy)throw Error('Este registro não está disponível no acompanhamento.');
        if(legacy.fs_crm_v1?.kind!=='cliente'){
          draft=legacy;
          show('Incluir no acompanhamento', `<p><strong>${esc(legacy.cliente||'Cliente')}</strong> · ${esc(legacy.codigo_produto||'Produto')}</p><p>Este cálculo ainda não foi marcado como pesquisa de cliente. Confirme para incluí-lo no acompanhamento comercial.</p><div class="fscrm-grid">${select('Atendimento','fscrm-enroll-channel',[['presencial','Presencial'],['online','Online']],legacy.fs_crm_v1?.channel||'presencial')}${select('Compra para','fscrm-enroll-buyer',[['proprio','O próprio cliente'],['terceiro','Terceiro']],legacy.fs_crm_v1?.buyer||'proprio')}</div>`, `<button type="button" data-action="enroll-confirm-open" class="fscrm-primary">Incluir e acompanhar</button>`);
          return;
        }
        await ingest(legacy);
        if(remote?.enabled)await refreshData();
        r=db?.get(id);
      }
      if(!r)throw Error('Não foi possível abrir este acompanhamento agora. Atualize o painel e tente novamente.');
      open(id);
    }catch(e){fail(e);}
  }

  window.FSCRM={capture:captureSafe,has:id=>!!db?.get(id),open:id=>openFromHistory(id),openFromHistory,setLegacyStatus,remove:async id=>{
      const r=db?.get(id);if(!r)throw Error('Registro não encontrado.');
      return deleteRecord(id,r.revision);
    },
    async saved(row){
      try{await ingest(row);render();}
      catch(e){
        if(remote?.isNetworkError?.(e)||navigator.onLine===false){
          notify('Cálculo salvo neste aparelho. O acompanhamento será sincronizado automaticamente quando a conexão voltar.',false);
        }else fail(Error('Cálculo salvo no histórico. Não foi possível atualizar o acompanhamento: '+e.message));
      }
    },
    async refresh(){try{await refreshData(); scheduleWarmRefresh();}catch(e){fail(e);}}
  };

  window.addEventListener('fscrm:sync-state',e=>{
    const pending=Number(e.detail?.pending||0);
    if(pending>0)notify(`${pending} alteração(ões) salva(s) neste aparelho aguardando sincronização.`,false);
    else if(Number(e.detail?.synced||0)>0)notify('Sincronização com a nuvem concluída.',false);
  });
  window.addEventListener('online',()=>{refreshData().catch(()=>{});});

    document.addEventListener('input',e=>{
    if(e.target?.id!=='fscrm-edit-nextTime')return;
    let v=String(e.target.value||'').replace(/\D/g,'').slice(0,4);
    if(v.length>2)v=v.slice(0,2)+':'+v.slice(2);
    e.target.value=v;
  });

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkProductReminders().catch(()=>{});});
  setInterval(()=>checkProductReminders().catch(()=>{}),60000);
  document.addEventListener('DOMContentLoaded',()=>{try{mount();}catch(e){console.error('Acompanhamento comercial:',e);if(typeof showToast==='function')showToast('Não foi possível carregar o acompanhamento. Os cálculos originais continuam disponíveis.','error');}});
})();

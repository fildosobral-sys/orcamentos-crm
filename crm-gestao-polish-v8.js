(function(){
  'use strict';

  const R = window.FSCRMRemote;
  const B = window.FSCRMBI;
  const $ = id => document.getElementById(id);
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();

  const STATUS = {
    negociacao:'Em negociação',
    aguardando:'Aguardando resposta',
    agendado:'Retorno agendado',
    aguardando_produto:'Aguardando produto',
    ganha:'Concluída',
    perdida:'Não concluída',
    outro:'Outro'
  };

  let cache = null;
  let loading = false;
  let scheduled = false;

  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function prettyBranch(value){
    const raw=String(value||'').trim().replace(/\s+/g,' ');
    if(!raw)return 'Filial não informada';
    return raw.split(' ').map(part=>{
      if(/^\d+$/.test(part))return part;
      if(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(part))return part.toUpperCase();
      return part.charAt(0).toUpperCase()+part.slice(1).toLowerCase();
    }).join(' ');
  }

  function avatar(user, cls='v8-user-avatar'){
    const photo=String(user?.photo||'').trim();
    const initials=String(user?.name||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return photo
      ? `<span class="${cls} has-photo"><img src="${esc(photo)}" alt="Foto de ${esc(user?.name||'colaborador')}"></span>`
      : `<span class="${cls}">${esc(initials||'👤')}</span>`;
  }

  function groupUsersByBranch(users){
    const m = new Map();
    (users||[]).forEach(u=>{
      const key=norm(u.branch);
      if(!m.has(key))m.set(key,{name:prettyBranch(u.branch),users:[]});
      m.get(key).users.push(u);
    });
    return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }

  function renderAccessUsers(data){
    const box=$('access-user-list');
    if(!box || !data?.actor?.isOwner) return;

    const groups=groupUsersByBranch(data.users);
    const html=groups.map((g,idx)=>`
      <details class="v8-access-branch" ${groups.length===1 || idx===0 ? 'open':''}>
        <summary>
          <span><strong>${esc(g.name)}</strong><small>${g.users.length} colaborador${g.users.length===1?'':'es'}</small></span>
          <i>⌄</i>
        </summary>
        <div class="v8-access-branch-list">
          ${g.users.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(u=>`
            <article class="v8-access-user">
              <div class="v8-access-user-main">
                ${avatar(u)}
                <div class="v8-access-user-copy">
                  <strong>${esc(u.name)}</strong>
                  <small>${esc(String(u.role||'').replaceAll('_',' '))}${u.isOwner?' · Administrador geral':''}</small>
                </div>
              </div>
              <div class="v8-access-user-badges">
                <span class="access-status ${u.active?'on':'off'}">${u.active?'Ativo':'Inativo'}</span>
                ${u.canManage?'<span class="access-manage-badge">Gestão</span>':''}
              </div>
            </article>
          `).join('')}
        </div>
      </details>
    `).join('');

    if(box.dataset.v8Html !== html){
      box.innerHTML=html || '<p>Nenhum usuário cadastrado.</p>';
      box.dataset.v8Html=html;
    }
  }

  function selectedPeriod(){
    const pressed=document.querySelector('[data-period][aria-pressed="true"]');
    return pressed?.dataset?.period || 'mes';
  }

  function selectedBranch(){
    const hero=$('hero-branch');
    const filter=$('branch');
    return String(hero?.value ?? filter?.value ?? '');
  }

  function inPeriod(record,p){
    if(!record?.createdAt)return false;
    const d=B.day(record.createdAt);
    return d>=p.start && d<=p.end;
  }

  function sellerForCard(card,data){
    const name=card.querySelector('.seller-top h3')?.textContent?.trim()||'';
    return (data.users||[]).find(u=>norm(u.name)===norm(name));
  }

  function applySellerStatus(data){
    if(!B || !data) return;
    const anchor=$('anchor')?.value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor||''))return;
    const p=B.period(selectedPeriod(),anchor);
    const branchKey=selectedBranch();

    document.querySelectorAll('.seller-card').forEach(card=>{
      const user=sellerForCard(card,data);
      if(!user)return;
      const records=(data.records||[]).filter(r=>{
        if(String(r.ownerId||'')!==String(user.id||''))return false;
        if(branchKey && norm(r.branch)!==branchKey)return false;
        return inPeriod(r,p);
      });
      const counts={};
      records.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);

      const tagBox=card.querySelector('.tags');
      if(tagBox){
        const order=['negociacao','aguardando','agendado','aguardando_produto','ganha','perdida','outro'];
        tagBox.innerHTML=order.filter(k=>counts[k]!==undefined).map(k=>{
          const cls=k==='ganha'?'won':k==='perdida'?'lost':k==='aguardando_produto'?'product':k==='agendado'?'scheduled':'';
          return `<span class="tag ${cls}">${esc(STATUS[k]||k)}: ${counts[k]||0}</span>`;
        }).join('');
      }

      const top=card.querySelector('.seller-top');
      if(top){
        const old=top.querySelector('.avatar');
        if(old && user.photo){
          const wrap=document.createElement('span');
          wrap.className='avatar avatar-photo';
          wrap.innerHTML=`<img src="${esc(user.photo)}" alt="Foto de ${esc(user.name)}">`;
          old.replaceWith(wrap);
        }
      }

      card.dataset.v8Ready='1';
    });
  }

  function decorateLosses(){
    document.querySelectorAll('.loss-panel,.loss-kpi,.seller-card,.metric').forEach(el=>{
      el.classList.add('v8-bi-card');
    });
    document.querySelectorAll('.loss-case').forEach(el=>el.classList.add('v8-loss-case'));
  }

  function apply(data){
    if(!data)return;
    renderAccessUsers(data);
    applySellerStatus(data);
    decorateLosses();
  }

  async function refresh(){
    if(loading || !R?.enabled)return;
    loading=true;
    try{
      await R.connect();
      if(!R.session?.actor?.canManage)return;
      cache=await R.call('team');
      apply(cache);
    }catch(_e){
      if(cache)apply(cache);
    }finally{
      loading=false;
    }
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{
      scheduled=false;
      if(cache)apply(cache);
      else refresh();
    },80);
  }

  function bind(){
    ['anchor','seller','sort','branch','hero-branch'].forEach(id=>{
      $(id)?.addEventListener('change',()=>setTimeout(()=>{refresh();},120));
    });
    document.querySelectorAll('[data-period]').forEach(b=>{
      b.addEventListener('click',()=>setTimeout(()=>{refresh();},120));
    });
    $('refresh')?.addEventListener('click',()=>setTimeout(()=>{refresh();},250));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{bind();refresh();},{once:true});
  }else{
    bind();refresh();
  }

  const content=$('content')||document.body;
  new MutationObserver((mutations)=>{
    const relevant=mutations.some(m=>[...m.addedNodes].some(n=>
      n.nodeType===1 && (n.matches?.('.seller-card,.access-user,.loss-case') || n.querySelector?.('.seller-card,.access-user,.loss-case'))
    ));
    if(relevant)schedule();
  }).observe(content,{childList:true,subtree:true});

  setInterval(()=>{if(!document.hidden)refresh();},60000);
})();

/* =========================================================
   FS CRM V9 — acabamento do cabeçalho da gestão
   ========================================================= */
(function(){
  'use strict';
  function apply(){
    if(document.title!=='Gestão da equipe')document.title='Gestão da equipe';
    const hero=document.querySelector('.hero');
    if(hero)hero.classList.add('fs-v9-hero');
    const team=document.getElementById('hero-team-wrap');
    if(team)team.classList.add('fs-v9-team-selector');
    const filters=document.querySelector('.executive-filter-wrap');
    if(filters)filters.classList.add('fs-v9-analysis-card');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();

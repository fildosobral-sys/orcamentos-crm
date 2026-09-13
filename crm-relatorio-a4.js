(function(){
'use strict';

function txt(id){return (document.getElementById(id)?.textContent||'').trim();}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cloneClean(id){
  const src=document.getElementById(id);
  if(!src)return '<div class="empty">Sem dados.</div>';
  const c=src.cloneNode(true);
  c.querySelectorAll('button,a').forEach(el=>{
    if(el.matches('[data-loss-evidence]')){
      const span=document.createElement('span');
      span.className='evidence-note';
      span.textContent=el.textContent;
      el.replaceWith(span);
    }else el.remove();
  });
  c.removeAttribute('id');
  return c.outerHTML;
}
function caseCards(){
  const src=document.getElementById('loss-cases');
  if(!src)return '<div class="empty">Nenhum caso.</div>';
  const cards=[...src.querySelectorAll('.loss-case')];
  if(!cards.length)return '<div class="empty">Nenhuma perda registrada no período.</div>';
  return cards.map(card=>{
    const c=card.cloneNode(true);
    c.querySelectorAll('button').forEach(b=>{
      const s=document.createElement('span');
      s.className='evidence-note';
      s.textContent=b.textContent;
      b.replaceWith(s);
    });
    c.className='report-case';
    return c.outerHTML;
  }).join('');
}
function printA4(){
  const identity=txt('identity')||'Gestão comercial';
  const period=txt('period-label')||'Período selecionado';
  const seller=document.getElementById('seller')?.selectedOptions?.[0]?.textContent||'Toda a equipe';
  const caseCount=txt('loss-case-count')||'0 casos';

  const win=window.open('','_blank');
  if(!win)return;

  const css=`
  <style>
  @page{size:A4 landscape;margin:7mm}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#22304a;background:#fff}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{width:100%;max-width:283mm;margin:0 auto}
  .top{display:grid;grid-template-columns:1fr auto;gap:10mm;align-items:center;padding:6mm 7mm;border-radius:5mm;background:linear-gradient(125deg,#234bd5,#624ac4);color:#fff}
  .top small{font-size:8pt;font-weight:800;letter-spacing:1.2px}.top h1{margin:2mm 0 1mm;font-size:20pt}.top p{margin:0;font-size:9pt;opacity:.92}
  .meta{display:flex;gap:2mm;flex-wrap:wrap;justify-content:flex-end;max-width:110mm}
  .meta span{font-size:8pt;padding:2mm 3mm;border-radius:99px;background:rgba(255,255,255,.14);white-space:nowrap}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-top:3mm}
  .kpis>div{position:relative;min-height:23mm;border:1px solid #e0e5ef;border-radius:3mm;padding:3mm;background:#fff}
  .kpis small{display:block;font-size:7pt;font-weight:800;text-transform:uppercase;color:#717b90;letter-spacing:.4px}
  .kpis strong{display:block;font-size:16pt;margin-top:2mm;color:#26344f}
  .kpis em{display:block;font-size:7pt;font-style:normal;color:#8790a1;margin-top:1mm}
  .analysis{display:grid;grid-template-columns:1.15fr 1.15fr 1fr;gap:3mm;margin-top:3mm}
  .panel{border:1px solid #e0e5ef;border-radius:3mm;padding:3mm;background:#fff;min-height:48mm;overflow:hidden}
  .panel-head{display:flex;gap:2mm;align-items:center;margin-bottom:2mm}
  .num{width:7mm;height:7mm;border-radius:2mm;background:#f0edfb;color:#5f4ab1;display:grid;place-items:center;font-size:7pt;font-weight:800}
  .panel h3{margin:0;font-size:10pt}.panel small{font-size:6.5pt;letter-spacing:.8px;color:#9199aa;font-weight:800}
  .loss-rank-row{display:flex;gap:2mm;align-items:center;padding:1.2mm 0}
  .loss-rank-pos{width:6mm;height:6mm;border-radius:50%;background:#f1eff9;display:grid;place-items:center;font-size:7pt;font-weight:800}
  .loss-rank-main{flex:1}.loss-rank-main>div:first-child{display:flex;justify-content:space-between;gap:2mm;font-size:7.5pt}
  .loss-rank-bar{height:1.8mm;background:#eef1f6;border-radius:99px;overflow:hidden;margin-top:1mm}.loss-rank-bar i{display:block;height:100%;background:#6553c7}
  .donut-wrap{display:flex!important;align-items:center!important;gap:5mm!important;min-height:35mm!important}
  .donut-chart{position:relative!important;width:34mm!important;height:34mm!important;min-width:34mm!important}
  .donut-chart svg{width:100%!important;height:100%!important;transform:rotate(-90deg)}
  .donut-bg,.donut-seg{fill:none;stroke-width:12}.donut-bg{stroke:#edf0f5}.donut-seg{stroke:#6553c7;stroke-linecap:round}
  .donut-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column}.donut-center strong{font-size:15pt}.donut-center span{font-size:6.5pt}
  .donut-legend{flex:1}.donut-legend-row{display:flex;justify-content:space-between;padding:1.2mm 0;border-bottom:1px solid #eef1f6;font-size:7pt}
  .legend-dot{display:none}
  .trend{margin-top:3mm;border:1px solid #e0e5ef;border-radius:3mm;padding:3mm;background:#fff}
  .trend-head{display:flex;align-items:center;gap:2mm}.trend h3{font-size:10pt;margin:0}
  .loss-trend{height:28mm!important;min-height:28mm!important;display:flex!important;align-items:flex-end!important;gap:3mm!important;overflow:hidden!important;padding:2mm!important}
  .loss-trend-col{height:24mm!important;min-width:10mm!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;flex-direction:column!important;gap:1mm!important}
  .loss-trend-col i{display:block!important;width:5mm!important;min-height:1mm;background:#5e58c7!important;border-radius:2mm 2mm 0 0!important}.loss-trend-col span,.loss-trend-col strong{font-size:6.5pt!important}
  .cases{margin-top:3mm;border:1px solid #e0e5ef;border-radius:3mm;padding:3mm;background:#fff}
  .cases-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm}.cases-title h2{font-size:11pt;margin:0}.cases-title span{font-size:7pt;color:#707a90}
  .case-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm}
  .report-case{border:1px solid #e4e8f0;border-radius:2.5mm;padding:2.5mm;break-inside:avoid;min-height:25mm}
  .report-case h4{font-size:9pt;margin:1mm 0}.report-case p,.report-case small{font-size:7pt!important;line-height:1.35;margin:1mm 0!important}
  .loss-badge{display:inline-block;padding:1mm 2mm;border-radius:99px;background:#fff0f2;color:#a23b50;font-size:6.5pt;font-weight:700}
  .evidence-note{font-size:6.5pt;color:#6c7690}
  .empty{font-size:8pt;color:#7a8395;padding:3mm}
  .foot{margin-top:2.5mm;font-size:6.5pt;color:#7a8395;text-align:right}
  .controls{margin:4mm 0;display:flex;gap:2mm}.controls button{padding:2mm 4mm}
  @media print{
    .controls{display:none!important}
    .sheet{max-width:none}
    .top,.kpis>div,.panel,.trend,.cases,.report-case{box-shadow:none!important}
    .cases{break-inside:auto}
    .report-case{break-inside:avoid;page-break-inside:avoid}
  }
  </style>`;

  const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de perdas - A4 paisagem</title>'+css+'</head><body>'
  +'<main class="sheet">'
  +'<section class="top"><div><small>ACOMPANHAMENTO COMERCIAL</small><h1>Relatório de perdas de vendas</h1><p>Visão consolidada para análise da liderança.</p></div>'
  +'<div class="meta"><span>'+esc(identity)+'</span><span>'+esc(period)+'</span><span>'+esc(seller)+'</span><span>BI atualizado</span></div></section>'
  +'<section class="kpis">'+cloneClean('loss-kpis').replace(/^<div[^>]*>|<\/div>$/g,'')+'</section>'
  +'<section class="analysis">'
  +'<div class="panel"><div class="panel-head"><span class="num">01</span><div><small>CAUSA</small><h3>Ranking dos motivos</h3></div></div>'+cloneClean('loss-ranking')+'</div>'
  +'<div class="panel"><div class="panel-head"><span class="num">02</span><div><small>PARTICIPAÇÃO</small><h3>Distribuição das perdas</h3></div></div>'+cloneClean('loss-donut')+'</div>'
  +'<div class="panel"><div class="panel-head"><span class="num">03</span><div><small>MERCADO</small><h3>Concorrentes mais citados</h3></div></div>'+cloneClean('competitor-ranking')+'</div>'
  +'</section>'
  +'<section class="trend"><div class="trend-head"><span class="num">04</span><h3>Evolução das perdas no período</h3></div>'+cloneClean('loss-trend')+'</section>'
  +'<section class="cases"><div class="cases-title"><h2>Casos detalhados</h2><span>'+esc(caseCount)+'</span></div><div class="case-grid">'+caseCards()+'</div></section>'
  +'<p class="foot">Relatório gerado automaticamente pelo CRM de Orçamentos - dados registrados pelos vendedores e consolidados para análise da liderança.</p>'
  +'<div class="controls"><button onclick="window.print()">Imprimir / Salvar PDF</button><button onclick="window.close()">Fechar</button></div>'
  +'</main><script>window.onload=function(){setTimeout(function(){window.print()},350)}<\/script></body></html>';

  win.document.open();win.document.write(html);win.document.close();
}

function bind(){
  const btn=document.getElementById('print-loss-report');
  if(!btn||btn.dataset.a4Bound==='1')return;
  btn.dataset.a4Bound='1';
  btn.addEventListener('click',function(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    printA4();
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);
else bind();
})();
(function () {
  'use strict';

  function veioDaCentral() {
    try {
      if (!document.referrer) return false;

      var atual = new URL(window.location.href);
      var anterior = new URL(document.referrer);

      if (anterior.origin !== atual.origin) return false;

      // Se o anterior não era o próprio repositório do Orçamentos,
      // então o acesso veio da Central / outro módulo da plataforma.
      return !anterior.pathname.toLowerCase().startsWith('/orcamentos-crm/');
    } catch (_) {
      return false;
    }
  }

  function voltarHome(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
    }

    /*
      FLUXO CORRETO:
      Central -> Orçamentos -> casinha
      Volta pela pilha real do navegador, preservando a Central já autenticada.
    */
    if (veioDaCentral() && window.history.length > 1) {
      window.history.back();
      return;
    }

    /*
      Se o usuário entrou diretamente no Orçamentos, sem vir da Central,
      a casinha retorna para a tela inicial do próprio módulo.
    */
    window.location.assign('./orcamentos.html');
  }

  window.FSVoltarHome = voltarHome;

  function aplicarVisual() {
    if (document.getElementById('fs-home-button-style-final')) return;

    var style = document.createElement('style');
    style.id = 'fs-home-button-style-final';
    style.textContent = `
      .fs-back-home,
      .bottom-home-button,
      .floating-home-button,
      .fixed-home-btn,
      #btnHome,
      #homeBtn,
      #fsUniversalHomeButton {
        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
        background: rgba(255,255,255,.16) !important;
        border: 1px solid rgba(255,255,255,.32) !important;
        color: #fff !important;
        opacity: .68 !important;
        box-shadow: 0 5px 14px rgba(15,23,42,.14) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        text-decoration: none !important;
        font-size: 16px !important;
        transition: opacity .18s ease, background .18s ease, transform .18s ease !important;
      }

      .fs-back-home:hover,
      .bottom-home-button:hover,
      .floating-home-button:hover,
      .fixed-home-btn:hover,
      #btnHome:hover,
      #homeBtn:hover,
      #fsUniversalHomeButton:hover {
        opacity: .95 !important;
        background: rgba(255,255,255,.24) !important;
        transform: translateY(-1px) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function vincular() {
    aplicarVisual();

    var seletor = [
      '.fs-back-home',
      '.bottom-home-button',
      '.floating-home-button',
      '.fixed-home-btn',
      '#btnHome',
      '#homeBtn',
      '#fsUniversalHomeButton'
    ].join(',');

    document.querySelectorAll(seletor).forEach(function (botao) {
      if (botao.dataset.fsHomeHistory === '1') return;

      botao.dataset.fsHomeHistory = '1';
      botao.setAttribute('title', 'Voltar');
      botao.setAttribute('aria-label', 'Voltar');

      if (botao.tagName === 'A') {
        botao.setAttribute('href', '#');
      }

      botao.addEventListener('click', voltarHome, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vincular);
  } else {
    vincular();
  }

  new MutationObserver(vincular).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

(function () {
  'use strict';

  // Home real da Central FS.
  const CENTRAL_HOME = '../index.html';

  function voltarParaCentral(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
    }

    try{
      sessionStorage.removeItem('crm_sso_from_central');
      sessionStorage.removeItem('fs_module_from_index');
      sessionStorage.setItem('fs_returning_home','1');
    }catch(_e){}
    window.location.assign(CENTRAL_HOME);
  }

  window.FSVoltarHome = voltarParaCentral;

  function aplicarVisual() {
    if (document.getElementById('fs-home-button-central-final')) return;

    const style = document.createElement('style');
    style.id = 'fs-home-button-central-final';
    style.textContent = `
      .fs-back-home {
        position: fixed !important;
        right: 14px !important;
        bottom: 14px !important;
        left: auto !important;
        z-index: 9999 !important;

        width: 50px !important;
        height: 50px !important;
        min-width: 50px !important;
        min-height: 50px !important;
        padding: 0 !important;

        display: flex !important;
        align-items: center !important;
        justify-content: center !important;

        border-radius: 50% !important;
        background: rgba(255,255,255,.68) !important;
        border: 1px solid rgba(255,255,255,.90) !important;
        box-shadow: 0 5px 16px rgba(15,23,42,.10) !important;

        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;

        color: inherit !important;
        text-decoration: none !important;
        font-size: 19px !important;
        line-height: 1 !important;

        opacity: .58 !important;
        transition:
          opacity .18s ease,
          transform .18s ease,
          background .18s ease !important;
      }

      .fs-back-home:hover {
        opacity: .90 !important;
        background: rgba(255,255,255,.86) !important;
        transform: translateY(-1px) !important;
        filter: none !important;
      }

      .fs-back-home:active {
        transform: scale(.96) !important;
      }

      @media (max-width: 640px) {
        .fs-back-home {
          right: 10px !important;
          bottom: 10px !important;
          width: 46px !important;
          height: 46px !important;
          min-width: 46px !important;
          min-height: 46px !important;
          font-size: 18px !important;
          opacity: .54 !important;
        }
      }

      body:has(input:focus) .fs-back-home,
      body:has(textarea:focus) .fs-back-home,
      body:has(select:focus) .fs-back-home {
        opacity: .22 !important;
      }
    `;

    document.head.appendChild(style);
  }

  function vincular() {
    aplicarVisual();

    document.querySelectorAll('.fs-back-home').forEach(function (botao) {
      if (botao.dataset.fsCentralHome === '1') return;

      botao.dataset.fsCentralHome = '1';
      botao.setAttribute('href', CENTRAL_HOME);
      botao.setAttribute('title', 'Voltar para a Central');
      botao.setAttribute('aria-label', 'Voltar para a Central');

      botao.addEventListener('click', voltarParaCentral, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', vincular, { once: true });
  } else {
    vincular();
  }

  new MutationObserver(vincular).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

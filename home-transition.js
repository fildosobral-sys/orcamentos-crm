(function () {
  'use strict';

  function currentOrigin() {
    return window.location.origin || '';
  }

  function centralRootFromReferrer() {
    try {
      if (!document.referrer) return '';

      var ref = new URL(document.referrer);
      var atual = new URL(window.location.href);

      // Para GitHub Pages da mesma conta/origem.
      if (ref.origin !== atual.origin) return '';

      var p = (ref.pathname || '').replace(/\/+/g, '/').toLowerCase();

      // A Central principal pode estar no index normal, mobile, desktop ou na raiz.
      if (
        p === '/' ||
        p.endsWith('/index.html') ||
        p.endsWith('/index-mobile.html') ||
        p.endsWith('/index-desktop.html')
      ) {
        // Volta para a pasta da Central e deixa o index.html decidir mobile/desktop.
        var pasta = ref.pathname.replace(/\/(?:index(?:-mobile|-desktop)?\.html)?$/i, '/');
        return ref.origin + pasta;
      }
    } catch (_) {}

    return '';
  }

  async function exists(url) {
    if (!/^https?:$/i.test(window.location.protocol)) return false;

    try {
      var r = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (r.ok) return true;
    } catch (_) {}

    try {
      var r2 = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin'
      });
      return r2.ok;
    } catch (_) {
      return false;
    }
  }

  function crmStart() {
    // Tela inicial do próprio módulo quando não houver uma Central/index externa.
    try {
      var here = new URL(window.location.href);

      // Se existir orcamentos.html no módulo, usa ele.
      var localStart = new URL('./orcamentos.html', here.href).href;
      window.location.assign(localStart);
    } catch (_) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function goHome(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // 1) Prioridade: voltar para a Central de onde o usuário veio.
    var central = centralRootFromReferrer();
    if (central) {
      window.location.assign(central);
      return;
    }

    try {
      var here = new URL(window.location.href);

      // 2) Quando o CRM está numa pasta separada do GitHub Pages
      //    (ex.: /orcamentos-crm/), verifica primeiro o index da raiz da conta.
      if (here.protocol === 'https:' || here.protocol === 'http:') {
        var rootIndex = here.origin + '/index.html';

        // Só usa a raiz se estivermos em uma subpasta.
        if (here.pathname.split('/').filter(Boolean).length >= 1 && await exists(rootIndex)) {
          window.location.assign(here.origin + '/');
          return;
        }
      }

      // 3) Estrutura comum: index.html na mesma pasta do módulo.
      var sameFolderIndex = new URL('./index.html', here.href).href;
      if (await exists(sameFolderIndex)) {
        window.location.assign(sameFolderIndex);
        return;
      }
    } catch (_) {}

    // 4) Sem index disponível: tela inicial do próprio CRM.
    crmStart();
  }

  window.FSVoltarHome = goHome;

  function bind() {
    var selectors = [
      '.fs-back-home',
      '.bottom-home-button',
      '.floating-home-button',
      '.fixed-home-btn',
      '#btnHome',
      '#homeBtn',
      '#fsUniversalHomeButton'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(function (btn) {
      if (btn.dataset.fsSmartHome === '1') return;

      btn.dataset.fsSmartHome = '1';
      btn.setAttribute('title', 'Voltar ao início');
      btn.setAttribute('aria-label', 'Voltar ao início');

      if (btn.tagName === 'A') btn.setAttribute('href', '#');

      btn.addEventListener('click', goHome, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  new MutationObserver(bind).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

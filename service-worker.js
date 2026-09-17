const VERSION='fs-orcamentos-pwa-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Sem cache agressivo: cada abertura continua buscando a versão atual publicada no GitHub Pages.
self.addEventListener('fetch',()=>{});

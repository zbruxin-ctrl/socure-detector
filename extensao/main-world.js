// Roda diretamente no mundo PRINCIPAL da pagina (world: MAIN)
// Tem acesso total ao window real — sem postMessage, sem race condition
(function () {

  // evita dupla injecao
  if (window.__kycEngineLoaded) return;
  window.__kycEngineLoaded = true;

  const PROVIDERS = {
    Socure:  ['socure', 'devicer.io', 'sigma.socure', 'verify.socure'],
    Veriff:  ['veriff', 'magic.veriff', 'api.veriff.me', 'cdn.veriff'],
    Jumio:   ['jumio'],
    Onfido:  ['onfido'],
    Persona: ['withpersona', 'persona.id'],
    Plaid:   ['plaid.com', 'cdn.plaid'],
  };

  function detect(url, source) {
    if (!url || typeof url !== 'string') return;
    const u = url.toLowerCase();
    for (const [provider, patterns] of Object.entries(PROVIDERS)) {
      if (patterns.some(p => u.includes(p))) {
        window.__kycSignal(provider, source, url);
        return;
      }
    }
  }

  // expoe funcao para o content.js (isolated world) escutar
  window.__kycSignal = function (provider, source, url) {
    window.dispatchEvent(new CustomEvent('__kyc_hit', {
      detail: { provider, source, url }
    }));
    console.log(`[KYC] ${provider} detectado via ${source} — ${url}`);
  };

  // --- FETCH ---
  const _fetch = window.fetch;
  window.fetch = function (...args) {
    try { detect(typeof args[0] === 'string' ? args[0] : args[0]?.url, 'fetch'); } catch(e){}
    return _fetch.apply(this, args);
  };

  // --- XHR ---
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, url) {
    try { detect(url, 'xhr'); } catch(e){}
    return _open.apply(this, arguments);
  };

  // --- WEBSOCKET ---
  const _WS = window.WebSocket;
  window.WebSocket = function (url, proto) {
    try { detect(url, 'websocket'); } catch(e){}
    return proto ? new _WS(url, proto) : new _WS(url);
  };
  Object.assign(window.WebSocket, _WS);
  window.WebSocket.prototype = _WS.prototype;

  // --- SCRIPT e IFRAME dinamicos ---
  const _create = document.createElement.bind(document);
  document.createElement = function (tag) {
    const el = _create(tag);
    const t = tag.toLowerCase();
    if (t === 'script' || t === 'iframe') {
      const proto = t === 'script' ? HTMLScriptElement.prototype : HTMLIFrameElement.prototype;
      const d = Object.getOwnPropertyDescriptor(proto, 'src');
      Object.defineProperty(el, 'src', {
        set(v) { detect(v, t + '-tag'); return d.set.call(this, v); },
        get()  { return d.get.call(this); },
        configurable: true
      });
    }
    return el;
  };

  // --- MutationObserver (scripts/iframes via innerHTML) ---
  new MutationObserver(ms => {
    for (const m of ms)
      for (const n of m.addedNodes)
        if (n.tagName && (n.tagName === 'SCRIPT' || n.tagName === 'IFRAME'))
          detect(n.src || n.getAttribute?.('src'), n.tagName.toLowerCase() + '-dom');
  }).observe(document.documentElement, { childList: true, subtree: true });

  console.log('[KYC Engine] main-world.js ativo no mundo MAIN ✅');

})();

(function () {

  function send(provider, source, url, weight) {
    window.postMessage({
      __kyc_engine: true,
      type: 'signal',
      payload: { provider, source, url: url || '', weight }
    }, '*');
  }

  function analyze(url, source) {
    if (!url || typeof url !== 'string') return;

    // ignora as próprias mensagens da extensão
    if (url === '' || url === window.location.href) return;

    const u = url.toLowerCase();

    if (
      u.includes('socure') ||
      u.includes('devicer.io') ||
      u.includes('sigma.socure') ||
      u.includes('verify.socure')
    ) {
      send('Socure', source, url, 5);
    }

    if (
      u.includes('veriff') ||
      u.includes('magic.veriff') ||
      u.includes('api.veriff.me') ||
      u.includes('cdn.veriff')
    ) {
      send('Veriff', source, url, 5);
    }
  }

  // ── FETCH ────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = function (...args) {
    try { analyze(typeof args[0] === 'string' ? args[0] : args[0]?.url, 'fetch'); } catch (e) {}
    return _fetch.apply(this, args);
  };

  // ── XHR ─────────────────────────────────────────
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try { analyze(url, 'xhr'); } catch (e) {}
    return _open.apply(this, arguments);
  };

  // ── WEBSOCKET ────────────────────────────────────
  const _WS = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    try { analyze(url, 'websocket'); } catch (e) {}
    return protocols ? new _WS(url, protocols) : new _WS(url);
  };
  window.WebSocket.prototype = _WS.prototype;
  window.WebSocket.CONNECTING = _WS.CONNECTING;
  window.WebSocket.OPEN       = _WS.OPEN;
  window.WebSocket.CLOSING    = _WS.CLOSING;
  window.WebSocket.CLOSED     = _WS.CLOSED;

  // ── SCRIPT tags dinâmicas ────────────────────────
  const _createElement = document.createElement.bind(document);
  document.createElement = function (tag) {
    const el = _createElement(tag);

    if (tag.toLowerCase() === 'script') {
      const srcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      Object.defineProperty(el, 'src', {
        set(v) { analyze(v, 'script-tag'); return srcDesc.set.call(this, v); },
        get()  { return srcDesc.get.call(this); },
        configurable: true
      });
    }

    if (tag.toLowerCase() === 'iframe') {
      const srcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
      Object.defineProperty(el, 'src', {
        set(v) { analyze(v, 'iframe'); return srcDesc.set.call(this, v); },
        get()  { return srcDesc.get.call(this); },
        configurable: true
      });
    }

    return el;
  };

  // ── postMessage sniff ────────────────────────────
  // BUG ORIGINAL: sobrescrevia postMessage e depois chamava _post que era
  // a versão JÁ sobrescrita → loop infinito silencioso.
  // Fix: guardar referência ANTES de qualquer sobrescrita.
  const _nativePost = window.postMessage;

  const _origPost = _nativePost; // alias claro
  window.postMessage = function (msg, target, transfer) {
    // não analisar as próprias mensagens da engine
    if (msg && msg.__kyc_engine) {
      return _origPost.call(window, msg, target || '*');
    }

    try {
      const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (str.includes('socure')) send('Socure', 'postMessage', '', 4);
      if (str.includes('veriff')) send('Veriff', 'postMessage', '', 4);
    } catch (e) {}

    return transfer
      ? _origPost.call(window, msg, target, transfer)
      : _origPost.call(window, msg, target || '*');
  };

  // ── MutationObserver: scripts/iframes adicionados via innerHTML ──
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!node.tagName) continue;
        const tag = node.tagName.toLowerCase();
        if (tag === 'script' || tag === 'iframe') {
          // .src já definido antes de inserir no DOM
          analyze(node.src || node.getAttribute('src'), tag + '-dom');
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  console.log('[KYC Engine] injected.js carregado ✅');

})();

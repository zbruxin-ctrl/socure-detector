(function () {

  const state = { providers: {} };

  function updateScore(provider, weight, source, url) {
    if (!state.providers[provider]) {
      state.providers[provider] = { score: 0, events: [] };
    }
    const p = state.providers[provider];
    p.score += weight;
    p.events.push({ source, url: url || '', time: new Date().toLocaleTimeString() });
    render();
    // log no console para debug
    console.log(`[KYC Engine] ${provider} +${weight} via ${source}`, url || '');
  }

  function getLevel(score) {
    if (score >= 8) return 'CONFIRMED';
    if (score >= 4) return 'LIKELY';
    return 'WEAK';
  }

  function render() {
    let panel = document.getElementById('kyc-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'kyc-panel';
      document.documentElement.appendChild(panel);
    }

    let html = `<div class="kyc-header">KYC Engine</div>`;
    for (const [provider, data] of Object.entries(state.providers)) {
      const level = getLevel(data.score);
      html += `
        <div class="kyc-block">
          <div class="kyc-provider">${provider}</div>
          <div class="kyc-score">Score: ${data.score} (${level})</div>
          <div class="kyc-events">
            ${data.events.slice(-5).map(e =>
              `<div>${e.time} · ${e.source}${e.url ? ' · ' + e.url.slice(0, 60) : ''}</div>`
            ).join('')}
          </div>
        </div>
      `;
    }
    panel.innerHTML = html;
  }

  // ── injeta o script no contexto PRINCIPAL da página ──────────────
  // IMPORTANTE: deve acontecer o mais cedo possível (document_start)
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => {
    console.log('[KYC Engine] injected.js injetado no contexto da página ✅');
    script.remove();
  };
  script.onerror = (e) => console.error('[KYC Engine] falha ao carregar injected.js', e);
  (document.head || document.documentElement).appendChild(script);

  // ── recebe sinais do injected.js via postMessage ─────────────────
  window.addEventListener('message', (e) => {
    if (!e.data?.__kyc_engine) return;
    if (e.data.type === 'signal') {
      const { provider, weight, source, url } = e.data.payload;
      updateScore(provider, weight, source, url);
    }
  });

})();

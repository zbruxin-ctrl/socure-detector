// Roda no mundo ISOLATED — apenas renderiza o painel
// Recebe eventos do main-world.js via CustomEvent
(function () {

  const state = {};

  function updateScore(provider, source, url) {
    if (!state[provider]) state[provider] = { score: 0, events: [] };
    state[provider].score += 5;
    state[provider].events.push({
      source,
      url: (url || '').slice(0, 70),
      time: new Date().toLocaleTimeString()
    });
    render();
  }

  function getLevel(score) {
    if (score >= 10) return 'CONFIRMED';
    if (score >= 5)  return 'LIKELY';
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
    for (const [provider, data] of Object.entries(state)) {
      const level = getLevel(data.score);
      html += `
        <div class="kyc-block">
          <div class="kyc-provider">${provider}</div>
          <div class="kyc-score">Score: ${data.score} &mdash; ${level}</div>
          <div class="kyc-events">
            ${data.events.slice(-5).map(e =>
              `<div>${e.time} &middot; ${e.source}${e.url ? ' &middot; ' + e.url : ''}</div>`
            ).join('')}
          </div>
        </div>`;
    }

    panel.innerHTML = html;
  }

  // Escuta os CustomEvents disparados pelo main-world.js
  window.addEventListener('__kyc_hit', (e) => {
    const { provider, source, url } = e.detail;
    updateScore(provider, source, url);
  });

  console.log('[KYC Engine] content.js (isolated) pronto ✅');

})();

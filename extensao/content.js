(function () {

  const state = {
    providers: {}
  };

  function updateScore(provider, weight, source) {
    if (!state.providers[provider]) {
      state.providers[provider] = {
        score: 0,
        events: []
      };
    }

    const p = state.providers[provider];
    p.score += weight;
    p.events.push({ source, time: new Date().toLocaleTimeString() });

    render();
  }

  function getLevel(score) {
    if (score >= 8) return "CONFIRMED";
    if (score >= 4) return "LIKELY";
    return "WEAK";
  }

  // 🔥 painel
  function render() {
    let panel = document.getElementById("kyc-panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "kyc-panel";
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
              `<div>${e.time} - ${e.source}</div>`
            ).join("")}
          </div>
        </div>
      `;
    }

    panel.innerHTML = html;
  }

  // 🔥 injeta script profundo
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // 🔥 recebe sinais
  window.addEventListener("message", (e) => {
    if (!e.data?.__kyc_engine) return;

    if (e.data.type === "signal") {
      const { provider, weight, source } = e.data.payload;
      updateScore(provider, weight, source);
    }
  });

})();
(function () {

  function send(type, payload) {
    window.postMessage({
      __kyc_engine: true,
      type,
      payload,
      time: Date.now()
    }, "*");
  }

  function analyze(url, source) {
    if (!url) return;

    if (url.includes("socure")) {
      send("signal", { provider: "Socure", source, url, weight: 5 });
    }

    if (url.includes("veriff") || url.includes("magic.veriff.me")) {
      send("signal", { provider: "Veriff", source, url, weight: 5 });
    }
  }

  // 🔥 FETCH
  const _fetch = window.fetch;
  window.fetch = function (...args) {
    analyze(args[0]?.toString(), "fetch");
    return _fetch.apply(this, args);
  };

  // 🔥 XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    analyze(url, "xhr");
    return _open.apply(this, arguments);
  };

  // 🔥 WEBSOCKET
  const _ws = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    analyze(url, "websocket");
    return new _ws(url, protocols);
  };

  // 🔥 IFRAME
  const origCreate = document.createElement;
  document.createElement = function (tag) {
    const el = origCreate.apply(this, arguments);

    if (tag.toLowerCase() === "iframe") {
      const desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");

      Object.defineProperty(el, "src", {
        set(value) {
          analyze(value, "iframe");
          return desc.set.call(this, value);
        }
      });
    }

    return el;
  };

  // 🔥 postMessage sniff
  const _post = window.postMessage;
  window.postMessage = function (msg, target) {

    try {
      const str = JSON.stringify(msg);

      if (str.includes("socure")) {
        send("signal", { provider: "Socure", source: "postMessage", weight: 4 });
      }

      if (str.includes("veriff")) {
        send("signal", { provider: "Veriff", source: "postMessage", weight: 4 });
      }

    } catch (e) {}

    return _post.apply(this, arguments);
  };

})();
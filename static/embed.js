(function () {
  "use strict";

  var script = document.currentScript;
  var serverUrl = (script && script.getAttribute("data-server")) || new URL(script.src).origin;

  var TEASER_DELAY_MS = 1000;
  var TEASER_VISIBLE_MS = 5000;

  var styles = document.createElement("style");
  styles.textContent = [
    "#lt-chat-root {",
    "  position: fixed;",
    "  right: 20px;",
    "  bottom: 20px;",
    "  z-index: 2147483000;",
    "  display: flex;",
    "  flex-direction: column;",
    "  align-items: flex-end;",
    "  gap: 12px;",
    "  font-family: 'Segoe UI', system-ui, sans-serif;",
    "}",
    "#lt-chat-panel {",
    "  width: 380px;",
    "  height: 560px;",
    "  max-width: calc(100vw - 32px);",
    "  max-height: calc(100vh - 120px);",
    "  border: none;",
    "  border-radius: 16px;",
    "  overflow: hidden;",
    "  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.22);",
    "  opacity: 0;",
    "  transform: translateY(16px) scale(0.96);",
    "  pointer-events: none;",
    "  transition: opacity 0.25s ease, transform 0.25s ease;",
    "}",
    "#lt-chat-panel.is-open {",
    "  opacity: 1;",
    "  transform: translateY(0) scale(1);",
    "  pointer-events: auto;",
    "}",
    "#lt-chat-panel iframe {",
    "  width: 100%;",
    "  height: 100%;",
    "  border: none;",
    "}",
    "#lt-chat-launcher {",
    "  display: flex;",
    "  align-items: center;",
    "  gap: 14px;",
    "  padding: 12px 16px 12px 18px;",
    "  border: 2px solid #c8a15f;",
    "  border-radius: 999px;",
    "  background: #fff;",
    "  color: #094144;",
    "  cursor: pointer;",
    "  box-shadow: 0 8px 32px rgba(9, 65, 68, 0.28);",
    "  max-width: min(340px, calc(100vw - 24px));",
    "  text-align: left;",
    "  transition: transform 0.2s ease, box-shadow 0.2s ease, padding 0.25s ease, border-color 0.25s ease, background 0.25s ease;",
    "}",
    "#lt-chat-launcher:hover {",
    "  transform: translateY(-2px);",
    "  box-shadow: 0 12px 36px rgba(9, 65, 68, 0.34);",
    "}",
    "#lt-chat-launcher:focus-visible {",
    "  outline: 3px solid rgba(200, 161, 95, 0.55);",
    "  outline-offset: 2px;",
    "}",
    "#lt-chat-teaser {",
    "  display: flex;",
    "  flex-direction: column;",
    "  gap: 2px;",
    "  min-width: 0;",
    "  overflow: hidden;",
    "  max-width: 0;",
    "  opacity: 0;",
    "  transition: max-width 0.35s ease, opacity 0.35s ease;",
    "}",
    "#lt-chat-teaser-title {",
    "  font-size: 0.92rem;",
    "  font-weight: 700;",
    "  line-height: 1.25;",
    "  color: #094144;",
    "  white-space: nowrap;",
    "}",
    "#lt-chat-teaser-text {",
    "  font-size: 0.78rem;",
    "  line-height: 1.35;",
    "  color: #5c3d2e;",
    "  white-space: nowrap;",
    "}",
    "#lt-chat-icon {",
    "  width: 52px;",
    "  height: 52px;",
    "  flex-shrink: 0;",
    "  border-radius: 50%;",
    "  background: linear-gradient(135deg, #094144, #256f73);",
    "  color: #fff;",
    "  display: grid;",
    "  place-items: center;",
    "  box-shadow: 0 4px 14px rgba(9, 65, 68, 0.35);",
    "  transition: width 0.25s ease, height 0.25s ease;",
    "}",
    "#lt-chat-icon svg {",
    "  width: 26px;",
    "  height: 26px;",
    "}",
    "#lt-chat-root.is-compact #lt-chat-launcher {",
    "  padding: 0;",
    "  border-color: transparent;",
    "  background: transparent;",
    "  box-shadow: none;",
    "}",
    "#lt-chat-root.is-compact #lt-chat-icon {",
    "  width: 56px;",
    "  height: 56px;",
    "}",
    "#lt-chat-root.is-teaser-visible #lt-chat-teaser {",
    "  max-width: 280px;",
    "  opacity: 1;",
    "}",
    "#lt-chat-root.is-teaser-visible #lt-chat-launcher {",
    "  animation: lt-chat-attention 2.8s ease-in-out 1;",
    "}",
    "#lt-chat-root.is-open #lt-chat-teaser {",
    "  max-width: 0;",
    "  opacity: 0;",
    "}",
    "#lt-chat-root.is-open #lt-chat-launcher {",
    "  padding: 0;",
    "  border-radius: 50%;",
    "  border-color: transparent;",
    "  background: transparent;",
    "  box-shadow: none;",
    "  animation: none;",
    "}",
    "#lt-chat-root.is-open #lt-chat-icon {",
    "  width: 56px;",
    "  height: 56px;",
    "}",
    "@keyframes lt-chat-attention {",
    "  0%, 100% { box-shadow: 0 8px 32px rgba(9, 65, 68, 0.28); }",
    "  50% { box-shadow: 0 8px 32px rgba(9, 65, 68, 0.28), 0 0 0 6px rgba(200, 161, 95, 0.28); }",
    "}",
    "@media (max-width: 480px) {",
    "  #lt-chat-root { right: 12px; bottom: 12px; }",
    "  #lt-chat-panel {",
    "    width: calc(100vw - 24px);",
    "    height: calc(100vh - 96px);",
    "  }",
    "  #lt-chat-teaser-text {",
    "    white-space: normal;",
    "    max-width: 180px;",
    "  }",
    "  #lt-chat-teaser-title {",
    "    font-size: 0.84rem;",
    "    white-space: normal;",
    "  }",
    "  #lt-chat-root.is-teaser-visible #lt-chat-teaser {",
    "    max-width: 190px;",
    "  }",
    "  #lt-chat-root.is-teaser-visible #lt-chat-launcher {",
    "    padding: 10px 12px 10px 14px;",
    "    gap: 10px;",
    "  }",
    "  #lt-chat-icon {",
    "    width: 46px;",
    "    height: 46px;",
    "  }",
    "  #lt-chat-root.is-compact #lt-chat-icon,",
    "  #lt-chat-root.is-open #lt-chat-icon {",
    "    width: 52px;",
    "    height: 52px;",
    "  }",
    "}",
  ].join("\n");
  document.head.appendChild(styles);

  var chatIcon =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    "</svg>";

  var root = document.createElement("div");
  root.id = "lt-chat-root";
  root.classList.add("is-compact");

  var panel = document.createElement("div");
  panel.id = "lt-chat-panel";

  var iframe = document.createElement("iframe");
  iframe.src = serverUrl + "/widget";
  iframe.title = "La Trattoria KI-Assistent";
  iframe.setAttribute("loading", "lazy");
  panel.appendChild(iframe);

  var launcher = document.createElement("button");
  launcher.id = "lt-chat-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "KI-Assistent öffnen");
  launcher.innerHTML =
    '<span id="lt-chat-teaser" class="lt-chat-teaser">' +
    '<span class="lt-chat-teaser-title">Haben Sie Fragen?</span>' +
    '<span class="lt-chat-teaser-text">Stellen Sie sie gern unserem KI-Assistenten.</span>' +
    "</span>" +
    '<span id="lt-chat-icon" class="lt-chat-icon">' +
    chatIcon +
    "</span>";

  root.appendChild(panel);
  root.appendChild(launcher);
  document.body.appendChild(root);

  var isOpen = false;
  var teaserDismissed = false;
  var teaserHideTimer = null;
  var teaserDone = false;

  function hideTeaser() {
    root.classList.remove("is-teaser-visible");
    root.classList.add("is-compact");
    teaserDismissed = true;
    if (teaserHideTimer) {
      clearTimeout(teaserHideTimer);
      teaserHideTimer = null;
    }
  }

  function showTeaserBriefly() {
    if (isOpen || teaserDismissed || teaserDone) return;
    teaserDone = true;

    root.classList.remove("is-compact");
    root.classList.add("is-teaser-visible");

    teaserHideTimer = setTimeout(function () {
      if (!isOpen) hideTeaser();
    }, TEASER_VISIBLE_MS);
  }

  setTimeout(showTeaserBriefly, TEASER_DELAY_MS);

  function setOpen(open) {
    isOpen = open;
    panel.classList.toggle("is-open", open);
    root.classList.toggle("is-open", open);

    if (open) {
      hideTeaser();
    }

    launcher.setAttribute(
      "aria-label",
      open ? "KI-Assistent schließen" : "KI-Assistent öffnen"
    );
  }

  launcher.addEventListener("click", function () {
    setOpen(!isOpen);
  });

  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "lt-chat-close") {
      setOpen(false);
    }
  });
})();

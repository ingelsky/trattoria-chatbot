(function () {
  "use strict";

  var script = document.currentScript;
  var serverUrl = (script && script.getAttribute("data-server")) || new URL(script.src).origin;

  var styles = document.createElement("style");
  styles.textContent = [
    "#lt-chat-root {",
    "  position: fixed;",
    "  right: 20px;",
    "  bottom: 20px;",
    "  z-index: 2147483000;",
    "  font-family: 'Segoe UI', system-ui, sans-serif;",
    "}",
    "#lt-chat-bubble {",
    "  width: 60px;",
    "  height: 60px;",
    "  border: none;",
    "  border-radius: 50%;",
    "  background: linear-gradient(135deg, #094144, #256f73);",
    "  color: #fff;",
    "  cursor: pointer;",
    "  box-shadow: 0 6px 24px rgba(60, 16, 16, 0.35);",
    "  display: grid;",
    "  place-items: center;",
    "  transition: transform 0.2s ease, box-shadow 0.2s ease;",
    "}",
    "#lt-chat-bubble:hover {",
    "  transform: scale(1.05);",
    "  box-shadow: 0 8px 28px rgba(60, 16, 16, 0.45);",
    "}",
    "#lt-chat-bubble svg {",
    "  width: 28px;",
    "  height: 28px;",
    "}",
    "#lt-chat-panel {",
    "  position: absolute;",
    "  right: 0;",
    "  bottom: 72px;",
    "  width: 380px;",
    "  height: 560px;",
    "  max-width: calc(100vw - 32px);",
    "  max-height: calc(100vh - 100px);",
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
    "@media (max-width: 480px) {",
    "  #lt-chat-root { right: 12px; bottom: 12px; }",
    "  #lt-chat-panel {",
    "    width: calc(100vw - 24px);",
    "    height: calc(100vh - 88px);",
    "    bottom: 68px;",
    "  }",
    "}",
  ].join("\n");
  document.head.appendChild(styles);

  var root = document.createElement("div");
  root.id = "lt-chat-root";

  var panel = document.createElement("div");
  panel.id = "lt-chat-panel";

  var iframe = document.createElement("iframe");
  iframe.src = serverUrl + "/widget";
  iframe.title = "La Trattoria KI-Assistent";
  iframe.setAttribute("loading", "lazy");
  panel.appendChild(iframe);

  var bubble = document.createElement("button");
  bubble.id = "lt-chat-bubble";
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Chat öffnen");
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    "</svg>";

  root.appendChild(panel);
  root.appendChild(bubble);
  document.body.appendChild(root);

  var isOpen = false;

  function setOpen(open) {
    isOpen = open;
    panel.classList.toggle("is-open", open);
    bubble.setAttribute("aria-label", open ? "Chat schließen" : "Chat öffnen");
  }

  bubble.addEventListener("click", function () {
    setOpen(!isOpen);
  });

  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "lt-chat-close") {
      setOpen(false);
    }
  });
})();

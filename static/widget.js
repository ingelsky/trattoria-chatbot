const sessionId = crypto.randomUUID();

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const closeBtn = document.getElementById("close-btn");
const headerSubtitle = document.getElementById("header-subtitle");

const chatView = document.getElementById("chat-view");
const menuView = document.getElementById("menu-view");
const menuBtn = document.getElementById("menu-btn");
const backToChatBtn = document.getElementById("back-to-chat");

const menuLoading = document.getElementById("menu-loading");
const menuError = document.getElementById("menu-error");
const categoryTabsEl = document.getElementById("category-tabs");
const menuItemsEl = document.getElementById("menu-items");

let menuCategories = [];
let activeCategoryId = null;
let menuLoaded = false;

function showPanel(panel) {
  chatView.classList.toggle("panel-active", panel === "chat");
  menuView.classList.toggle("panel-active", panel === "menu");
  headerSubtitle.textContent =
    panel === "chat" ? "KI-Assistent · Bad Nauheim" : "Speisekarte · Bad Nauheim";
}

function renderCategoryTabs() {
  categoryTabsEl.innerHTML = "";
  menuCategories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-tab${category.id === activeCategoryId ? " is-active" : ""}`;
    button.textContent = category.name;
    button.addEventListener("click", () => {
      activeCategoryId = category.id;
      renderCategoryTabs();
      renderMenuItems();
    });
    categoryTabsEl.appendChild(button);
  });
}

function renderMenuItems() {
  const category = menuCategories.find((entry) => entry.id === activeCategoryId);
  menuItemsEl.innerHTML = "";
  if (!category) return;

  category.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "menu-item";

    const info = document.createElement("div");
    info.className = "menu-item-info";

    const name = document.createElement("div");
    name.className = "menu-item-name";
    name.textContent = item.name;
    info.appendChild(name);

    if (item.description) {
      const desc = document.createElement("div");
      desc.className = "menu-item-desc";
      desc.textContent = item.description;
      info.appendChild(desc);
    }

    const price = document.createElement("div");
    price.className = "menu-item-price";
    price.textContent = item.price;
    info.appendChild(price);

    row.appendChild(info);
    menuItemsEl.appendChild(row);
  });
}

async function loadMenu() {
  menuLoading.hidden = false;
  menuError.hidden = true;
  categoryTabsEl.innerHTML = "";
  menuItemsEl.innerHTML = "";

  try {
    const response = await fetch("/api/menu");
    if (!response.ok) throw new Error("Speisekarte konnte nicht geladen werden.");

    menuCategories = await response.json();
    if (menuCategories.length === 0) throw new Error("Speisekarte ist leer.");

    activeCategoryId = menuCategories[0].id;
    menuLoaded = true;
    renderCategoryTabs();
    renderMenuItems();
  } catch (error) {
    menuError.textContent = error.message || "Fehler beim Laden der Speisekarte.";
    menuError.hidden = false;
    throw error;
  } finally {
    menuLoading.hidden = true;
  }
}

async function openMenu() {
  menuError.hidden = true;
  showPanel("menu");

  if (!menuLoaded) {
    try {
      await loadMenu();
    } catch {
      /* error shown in menuError */
    }
  } else {
    renderCategoryTabs();
    renderMenuItems();
  }
}

function appendMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = role === "user" ? "msg user" : "msg assistant";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

function appendTyping(text) {
  const msg = document.createElement("div");
  msg.className = "msg assistant typing";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

async function fetchChat(message) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data.detail;
      throw new Error(
        typeof detail === "string" ? detail : "Chat-Anfrage fehlgeschlagen."
      );
    }

    return data.reply || "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message) return;

  appendMessage("user", message);
  inputEl.value = "";
  inputEl.style.height = "auto";
  sendBtn.disabled = true;
  inputEl.disabled = true;

  const typingEl = appendTyping("Einen Moment...");

  try {
    const reply = await fetchChat(message);
    appendMessage(
      "assistant",
      reply ||
        "Entschuldigung, keine Antwort erhalten. Bitte rufen Sie uns an: 06032 9359977."
    );
  } catch (error) {
    const isTimeout = error.name === "AbortError";
    appendMessage(
      "assistant",
      isTimeout
        ? "Die Antwort dauert zu lange. Bitte versuchen Sie es erneut oder rufen Sie 06032 9359977 an."
        : "Entschuldigung, es ist ein Fehler aufgetreten. Bitte rufen Sie uns an: 06032 9359977."
    );
  } finally {
    typingEl.remove();
    sendBtn.disabled = false;
    inputEl.disabled = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    inputEl.focus();
  }
}

menuBtn.addEventListener("click", openMenu);
backToChatBtn.addEventListener("click", () => showPanel("chat"));

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(inputEl.value);
});

inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 120)}px`;
});

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    formEl.requestSubmit();
  }
});

document.querySelectorAll(".quick-btn[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt || ""));
});

closeBtn.addEventListener("click", () => {
  window.parent.postMessage({ type: "lt-chat-close" }, "*");
});

const sessionId = crypto.randomUUID();

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const closeBtn = document.getElementById("close-btn");
const headerSubtitle = document.getElementById("header-subtitle");

const chatView = document.getElementById("chat-view");
const reservationView = document.getElementById("reservation-view");
const reservationBtn = document.getElementById("reservation-btn");
const backToChatBtn = document.getElementById("back-to-chat");
const backToMenuBtn = document.getElementById("back-to-menu");
const toCheckoutBtn = document.getElementById("to-checkout-btn");
const stepLabel = document.getElementById("step-label");
const stepMenu = document.getElementById("step-menu");
const stepCheckout = document.getElementById("step-checkout");

const menuLoading = document.getElementById("menu-loading");
const menuError = document.getElementById("menu-error");
const categoryTabsEl = document.getElementById("category-tabs");
const menuItemsEl = document.getElementById("menu-items");
const cartBadgeEl = document.getElementById("cart-badge");
const cartListEl = document.getElementById("cart-list");
const cartTotalEl = document.getElementById("cart-total");
const cartEmptyHint = document.getElementById("cart-empty-hint");
const reservationForm = document.getElementById("reservation-form");
const reservationError = document.getElementById("reservation-error");

let menuCategories = [];
let activeCategoryId = null;
let menuLoaded = false;
const cart = new Map();

function parsePrice(value) {
  const match = String(value).match(/([\d,]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(",", "."));
}

function formatTotal(amount) {
  return `€ ${amount.toFixed(2).replace(".", ",")}`;
}

function cartCount() {
  let total = 0;
  cart.forEach((item) => {
    total += item.qty;
  });
  return total;
}

function cartTotalAmount() {
  let total = 0;
  cart.forEach((item) => {
    total += parsePrice(item.price) * item.qty;
  });
  return total;
}

function updateCartUi() {
  const count = cartCount();
  cartBadgeEl.textContent = String(count);
  toCheckoutBtn.textContent =
    count > 0
      ? `Weiter zur Reservierung (${count})`
      : "Weiter zur Reservierung";
}

function showPanel(panel) {
  chatView.classList.toggle("panel-active", panel === "chat");
  reservationView.classList.toggle("panel-active", panel === "reservation");
  headerSubtitle.textContent =
    panel === "chat" ? "KI-Assistent · Bad Nauheim" : "Reservierung · Bad Nauheim";
}

function showReservationStep(step) {
  const isMenu = step === "menu";
  stepMenu.classList.toggle("step-active", isMenu);
  stepCheckout.classList.toggle("step-active", !isMenu);
  stepLabel.textContent = isMenu ? "Schritt 1: Speisekarte" : "Schritt 2: Reservierung";
}

function cartKey(itemId) {
  return itemId;
}

function getCartQty(itemId) {
  return cart.get(cartKey(itemId))?.qty || 0;
}

function setCartQty(item, qty) {
  const key = cartKey(item.id);
  if (qty <= 0) {
    cart.delete(key);
  } else {
    cart.set(key, {
      id: item.id,
      name: item.name,
      price: item.price,
      qty,
    });
  }
  updateCartUi();
  renderMenuItems();
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

    const controls = document.createElement("div");
    controls.className = "qty-controls";
    const current = getCartQty(item.id);

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "qty-btn";
    minusBtn.textContent = "−";
    minusBtn.disabled = current === 0;
    minusBtn.addEventListener("click", () => setCartQty(item, current - 1));

    const qtyLabel = document.createElement("span");
    qtyLabel.className = "qty-value";
    qtyLabel.textContent = String(current);

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "qty-btn";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => setCartQty(item, current + 1));

    controls.append(minusBtn, qtyLabel, plusBtn);
    row.append(info, controls);
    menuItemsEl.appendChild(row);
  });
}

function renderCart() {
  cartListEl.innerHTML = "";

  if (cart.size === 0) {
    cartEmptyHint.hidden = false;
    cartTotalEl.textContent = "";
    return;
  }

  cartEmptyHint.hidden = true;
  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `<span>${item.name} × ${item.qty}</span><span>${item.price}</span>`;
    cartListEl.appendChild(row);
  });
  cartTotalEl.textContent = `Gesamt (ca.): ${formatTotal(cartTotalAmount())}`;
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

async function openReservation() {
  reservationError.hidden = true;
  showPanel("reservation");
  showReservationStep("menu");

  if (!menuLoaded) {
    try {
      await loadMenu();
    } catch {
      /* error shown in menuError — user can still go to checkout without items */
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

reservationBtn.addEventListener("click", openReservation);
backToChatBtn.addEventListener("click", () => showPanel("chat"));
backToMenuBtn.addEventListener("click", () => showReservationStep("menu"));

toCheckoutBtn.addEventListener("click", () => {
  renderCart();
  showReservationStep("checkout");
});

reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  reservationError.hidden = true;

  const formData = new FormData(reservationForm);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    date: String(formData.get("date") || "").trim(),
    time: String(formData.get("time") || "").trim(),
    guests: Number(formData.get("guests")),
    note: String(formData.get("note") || "").trim(),
    items: Array.from(cart.values()),
  };

  const submitBtn = reservationForm.querySelector(".submit-reservation-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Wird gesendet...";

  try {
    const response = await fetch("/api/reservation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : "Reservierung konnte nicht gesendet werden."
      );
    }

    const itemsSummary =
      payload.items.length > 0
        ? `\n🍽 ${payload.items.length} Gericht(e) vorausgewählt`
        : "";

    cart.clear();
    updateCartUi();
    reservationForm.reset();
    showPanel("chat");
    showReservationStep("menu");

    appendMessage(
      "assistant",
      `Grazie! Ihre Reservierung wurde gesendet.\n\n` +
        `📅 ${payload.date} um ${payload.time}\n` +
        `👥 ${payload.guests} Personen\n` +
        `📞 ${payload.phone}${itemsSummary}\n\n` +
        `Wir bestätigen in Kürze. Tel: 06032 9359977.`
    );
  } catch (error) {
    reservationError.textContent =
      error.message || "Bitte rufen Sie uns an: 06032 9359977.";
    reservationError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Reservierung senden";
  }
});

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

const dateInput = reservationForm.querySelector('input[name="date"]');
if (dateInput) {
  dateInput.min = new Date().toISOString().split("T")[0];
}

updateCartUi();

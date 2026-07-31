# La Trattoria Chat Widget

Embeddable AI chatbot for [La Trattoria da Massimo](https://www.latrattoria-da-massimo.de) — a floating chat window that integrates directly into the restaurant website.

## Features

- Floating chat bubble (bottom-right), opens as a small panel — no page redirect
- RAG-powered answers from the real Speisekarte (PDF) + restaurant info
- **Reservierung flow**: pick dishes & drinks from menu, submit reservation request
- German-language assistant for menu, allergens, hours, reservations
- One-line embed script for the client's website

## Setup

```bash
cd trattoria-chatbot
pip install -r requirements.txt
cp .env.example .env
# Add OPENAI_API_KEY to .env
python -m uvicorn server:app --reload --port 8080
```

Open:
- **Demo page** (simulated restaurant site): http://localhost:8080/demo
- **Widget only**: http://localhost:8080/widget

## Embed on website

Add before `</body>` on latrattoria-da-massimo.de:

```html
<script src="https://YOUR-SERVER.com/embed.js" defer></script>
```

For local testing:

```html
<script src="http://localhost:8080/embed.js" defer></script>
```

## Project structure

```
trattoria-chatbot/
  server.py              FastAPI backend + routes
  chat.py                RAG chat logic (German)
  vector_store.py        ChromaDB index from data/
  data/
    restaurant_info.txt  Hours, address, contact
    speisekarte.txt      Full menu from PDF
  static/
    embed.js             Widget loader (inject on client site)
    widget.html/css/js   Chat UI inside iframe
    demo.html            Demo restaurant page
```

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for a full Render walkthrough (GitHub → env vars → smoke test → client embed).

Quick start on Render:
- Build: `pip install -r requirements.txt`
- Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Env: `OPENAI_API_KEY`

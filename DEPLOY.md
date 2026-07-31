# Deploy walkthrough (Render)

Step-by-step guide to put the chatbot online.

## What you need before starting

- GitHub account
- [Render](https://render.com) account (free tier is enough for a demo)
- OpenAI API key

---

## Part 1 — Push code to GitHub

1. Create a new repo on GitHub, e.g. `trattoria-chatbot` (private is fine).

2. In PowerShell, from the project folder:

```powershell
cd "C:\Users\vlady\OneDrive\Рабочий стол\my_first_rag\trattoria-chatbot"
git init
git add .
git commit -m "Initial trattoria chatbot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trattoria-chatbot.git
git push -u origin main
```

> Do **not** commit `.env` — it is in `.gitignore`. Secrets go into Render only.

---

## Part 2 — Deploy on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your GitHub account and select the `trattoria-chatbot` repo.
3. Settings:
   - **Name:** `trattoria-chatbot` (becomes part of the URL)
   - **Region:** Frankfurt (EU) — closest to Bad Nauheim
   - **Branch:** `main`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

4. **Environment variables** (Environment tab):

| Key | Value |
|-----|--------|
| `OPENAI_API_KEY` | your OpenAI key |

5. Click **Create Web Service**. First deploy takes ~3–5 minutes.

6. Your URL will look like:
   `https://trattoria-chatbot.onrender.com`

---

## Part 3 — Smoke test on production

Open these URLs (replace with your Render URL):

| URL | Expected |
|-----|----------|
| `/api/health` | `{"status":"ok"}` |
| `/demo` | Demo page with chat bubble |
| `/widget` | Chat UI |
| Chat: “Öffnungszeiten” | German answer in ~2s |
| **Reservierung** → submit form | Success message in widget |

If the free tier slept, the first request may take ~30s to wake up — normal for demos.

---

## Part 4 — Client embed snippet

Send the restaurant this one line (before `</body>` on their site):

```html
<script src="https://trattoria-chatbot.onrender.com/embed.js" defer></script>
```

Replace the hostname with your actual Render URL.

They do **not** need a separate domain for the chatbot — your Render URL is fine for a pilot.

---

## Part 5 — Follow-up message to client (template)

Subject: KI-Chat für Ihre Website — Demo

```
Guten Tag,

wie besprochen habe ich einen Demo-Chat für La Trattoria da Massimo vorbereitet:

Demo: https://YOUR-APP.onrender.com/demo

Der Chat beantwortet Fragen zu Speisekarte, Allergenen und Öffnungszeiten.
Gäste können auch eine Reservierung anfragen.

Einbindung auf Ihrer Website (eine Zeile vor </body>):

<script src="https://YOUR-APP.onrender.com/embed.js" defer></script>

Gerne zeige ich Ihnen das in einem kurzen Gespräch.

Mit freundlichen Grüßen
Andrii
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Chat hangs on “Einen Moment…” | Check `OPENAI_API_KEY` on Render; view **Logs** tab |
| 502 on first load | Free tier cold start — wait and retry |
| ChromaDB errors on deploy | `.chroma/` is rebuilt on startup from `data/` — ensure `data/` is in repo |

---

## Local test

```powershell
cd trattoria-chatbot
python -m uvicorn server:app --port 8080
```

Open http://localhost:8080/demo

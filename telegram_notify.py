import json
import os
import urllib.error
import urllib.parse
import urllib.request


def send_order_notification(order: dict) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        raise RuntimeError(
            "Telegram ist nicht konfiguriert. Bitte TELEGRAM_BOT_TOKEN und "
            "TELEGRAM_CHAT_ID in .env setzen."
        )

    lines = order.get("items", [])
    items_text = "\n".join(
        f"  • {item['name']} × {item['qty']} — {item['price']}"
        for item in lines
    )
    total = order.get("total", "")

    message = (
        "🍝 <b>Neue Reservierung / Bestellung</b>\n"
        "🏠 La Trattoria da Massimo\n\n"
        f"👤 <b>Name:</b> {order['name']}\n"
        f"📞 <b>Telefon:</b> {order['phone']}\n"
        f"📅 <b>Datum:</b> {order['date']}\n"
        f"🕐 <b>Uhrzeit:</b> {order['time']}\n"
        f"👥 <b>Personen:</b> {order['guests']}\n\n"
        f"<b>Bestellung:</b>\n{items_text}\n\n"
        f"💶 <b>Gesamt (ca.):</b> {total}"
    )

    if order.get("note"):
        message += f"\n\n📝 <b>Hinweis:</b> {order['note']}"

    payload = urllib.parse.urlencode(
        {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
        }
    ).encode("utf-8")

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    request = urllib.request.Request(url, data=payload, method="POST")

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Telegram API Fehler: {details}") from error

    if not body.get("ok"):
        raise RuntimeError(f"Telegram API Fehler: {body}")

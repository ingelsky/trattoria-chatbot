import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)


def send_reservation_notification(reservation: dict) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        logger.info("Reservation received (no notify channel): %s", reservation)
        return

    message = (
        "📅 <b>Neue Reservierungsanfrage</b>\n"
        "🏠 La Trattoria da Massimo\n\n"
        f"👤 <b>Name:</b> {reservation['name']}\n"
        f"📞 <b>Telefon:</b> {reservation['phone']}\n"
        f"📅 <b>Datum:</b> {reservation['date']}\n"
        f"🕐 <b>Uhrzeit:</b> {reservation['time']}\n"
        f"👥 <b>Personen:</b> {reservation['guests']}"
    )

    items = reservation.get("items") or []
    if items:
        items_text = "\n".join(
            f"  • {item['name']} × {item['qty']} — {item['price']}" for item in items
        )
        message += f"\n\n<b>Vorauswahl:</b>\n{items_text}"
        if reservation.get("total"):
            message += f"\n\n💶 <b>Gesamt (ca.):</b> {reservation['total']}"

    if reservation.get("note"):
        message += f"\n\n📝 <b>Hinweis:</b> {reservation['note']}"

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

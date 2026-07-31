from contextlib import asynccontextmanager
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from chat import ChatBot
from reservation_notify import send_reservation_notification
from menu import get_menu
from telegram_notify import send_order_notification
from vector_store import get_vector_store

PROJECT_DIR = Path(__file__).resolve().parent
STATIC_DIR = PROJECT_DIR / "static"

load_dotenv(PROJECT_DIR / ".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = get_vector_store()
    store.retrieve("Öffnungszeiten")
    yield


app = FastAPI(title="La Trattoria Chat Widget", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

sessions: dict[str, ChatBot] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    reply: str


class ResetRequest(BaseModel):
    session_id: str = "default"


class OrderItem(BaseModel):
    id: str
    name: str
    price: str
    qty: int = Field(ge=1, le=20)


class OrderRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    date: str = Field(min_length=4, max_length=20)
    time: str = Field(min_length=3, max_length=10)
    guests: int = Field(ge=1, le=50)
    items: list[OrderItem] = Field(min_length=1)
    note: str = ""


class ReservationItem(BaseModel):
    id: str
    name: str
    price: str
    qty: int = Field(ge=1, le=20)


class ReservationRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    date: str = Field(min_length=4, max_length=20)
    time: str = Field(min_length=3, max_length=10)
    guests: int = Field(ge=1, le=50)
    note: str = ""
    items: list[ReservationItem] = Field(default_factory=list)


def _parse_price(value: str) -> float:
    cleaned = value.replace("€", "").strip()
    match = re.search(r"([\d,]+)", cleaned)
    if not match:
        return 0.0
    return float(match.group(1).replace(",", "."))


def get_bot(session_id: str) -> ChatBot:
    if session_id not in sessions:
        sessions[session_id] = ChatBot()
    return sessions[session_id]


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/demo")


@app.get("/widget")
def widget_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "widget.html")


@app.get("/embed.js")
def embed_script() -> FileResponse:
    return FileResponse(STATIC_DIR / "embed.js", media_type="application/javascript")


@app.get("/demo")
def demo_page() -> FileResponse:
    return FileResponse(STATIC_DIR / "demo.html")


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Leere Nachricht.")

    try:
        bot = get_bot(request.session_id)
        reply = bot.chat(message)
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Chat vorübergehend nicht verfügbar. Bitte 06032 9359977 anrufen. ({error})",
        ) from error

    if not reply or not reply.strip():
        reply = (
            "Entschuldigung, ich konnte gerade keine Antwort generieren. "
            "Bitte rufen Sie uns an: 06032 9359977."
        )

    return ChatResponse(reply=reply)

@app.post("/api/reset")
def reset_chat(request: ResetRequest) -> dict[str, str]:
    if request.session_id in sessions:
        sessions[request.session_id].reset()
    return {"status": "ok"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/menu")
def menu() -> list[dict]:
    return get_menu()


@app.post("/api/order")
def submit_order(request: OrderRequest) -> dict[str, str]:
    items = [item.model_dump() for item in request.items]
    total = sum(_parse_price(item["price"]) * item["qty"] for item in items)

    order = {
        "name": request.name.strip(),
        "phone": request.phone.strip(),
        "date": request.date.strip(),
        "time": request.time.strip(),
        "guests": request.guests,
        "items": items,
        "note": request.note.strip(),
        "total": f"€ {total:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
    }

    try:
        send_order_notification(order)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {"status": "ok", "message": "Bestellung wurde gesendet."}


@app.post("/api/reservation")
def submit_reservation(request: ReservationRequest) -> dict[str, str]:
    items = [item.model_dump() for item in request.items]
    total = sum(_parse_price(item["price"]) * item["qty"] for item in items)

    reservation = {
        "name": request.name.strip(),
        "phone": request.phone.strip(),
        "date": request.date.strip(),
        "time": request.time.strip(),
        "guests": request.guests,
        "note": request.note.strip(),
        "items": items,
        "total": f"€ {total:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if items else "",
    }

    try:
        send_reservation_notification(reservation)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return {"status": "ok", "message": "Reservierung wurde gesendet."}

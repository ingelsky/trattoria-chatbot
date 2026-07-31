import re

from openai import OpenAI

from vector_store import get_vector_store

MODEL = "gpt-4o-mini"
MAX_HISTORY = 4
MAX_TOKENS = 280

SYSTEM_INSTRUCTIONS = """Du bist der KI-Assistent von La Trattoria da Massimo (Bad Nauheim).
Antworte auf Deutsch, freundlich und kurz (2–4 Sätze, bei Menüfragen max. 5 Bulletpoints).
Nutze NUR den Kontext unten.

Regeln für Telefon/E-Mail:
- Beantworte Fragen direkt aus dem Kontext — ohne Telefonnummer am Ende.
- Erwähne 06032 9359977 oder info@latrattoria-da-massimo.de NUR wenn die Info wirklich nicht im Kontext steht oder der Gast ausdrücklich reservieren/kontaktieren will.
- KEINE Abschlussfloskeln wie „rufen Sie an, wenn Sie weitere Fragen haben", „bei weiteren Fragen" oder ähnliches.
- Der Gast chattet bereits mit dir — weitere Fragen kann er hier stellen."""

TRAILING_PHONE_BOILERPLATE = re.compile(
    r"(?:[\s\n]*(?:"
    r"Bitte rufen Sie(?: uns)?(?: bitte)?(?: an)?:?\s*06032[\s\d]*"
    r"(?:,?\s*(?:wenn|falls) Sie (?:noch )?weitere Fragen haben)?"
    r"|(?:Bei|Für) (?:weitere|noch) Fragen(?: rufen Sie(?: uns)?(?: bitte)?(?: an)?:?\s*06032[\s\d]*)?"
    r"|(?:Wenn|Falls) Sie (?:noch )?weitere Fragen haben,?\s*"
    r"(?:rufen Sie(?: uns)?(?: bitte)?(?: an)?:?\s*06032[\s\d]*|kann ich gern weiterhelfen)\.?"
    r"))+\.?\s*$",
    re.IGNORECASE,
)


def build_system_prompt(context: str) -> str:
    if context:
        context_block = f"Kontext (nur relevante Auszüge):\n{context}"
    else:
        context_block = "Kein passender Kontext gefunden."

    return f"{SYSTEM_INSTRUCTIONS}\n\n{context_block}"


def _trim_phone_boilerplate(answer: str) -> str:
    cleaned = answer.strip()
    while True:
        trimmed = TRAILING_PHONE_BOILERPLATE.sub("", cleaned).strip()
        if trimmed == cleaned:
            break
        cleaned = trimmed
    return cleaned


class ChatBot:
    def __init__(self) -> None:
        self.client = OpenAI(timeout=30.0, max_retries=2)
        self.vector_store = get_vector_store()
        self.messages: list[dict[str, str]] = []

    def _recent_history(self) -> list[dict[str, str]]:
        return self.messages[-MAX_HISTORY:]

    def _retrieve_context(self, user_message: str) -> str:
        chunks = self.vector_store.retrieve(user_message)
        return "\n---\n".join(chunks)

    def chat(self, user_message: str) -> str:
        context = self._retrieve_context(user_message)
        messages = [
            {"role": "system", "content": build_system_prompt(context)},
            *self._recent_history(),
            {"role": "user", "content": user_message},
        ]

        response = self.client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.2,
            max_tokens=MAX_TOKENS,
        )

        answer = _trim_phone_boilerplate(response.choices[0].message.content or "")
        self.messages.append({"role": "user", "content": user_message})
        self.messages.append({"role": "assistant", "content": answer})

        if len(self.messages) > MAX_HISTORY * 2:
            self.messages = self.messages[-MAX_HISTORY * 2 :]

        return answer

    def reset(self) -> None:
        self.messages = []

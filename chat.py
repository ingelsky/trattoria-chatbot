from openai import OpenAI

from vector_store import get_vector_store

MODEL = "gpt-4o-mini"
MAX_HISTORY = 4
MAX_TOKENS = 280

SYSTEM_INSTRUCTIONS = """Du bist der KI-Assistent von La Trattoria da Massimo (Bad Nauheim).
Antworte auf Deutsch, kurz (2–4 Sätze, bei Menüfragen max. 5 Bulletpoints).
Nutze NUR den Kontext unten. Unbekanntes → „Bitte rufen Sie 06032 9359977 an."
Reservierung: 06032 9359977 oder info@latrattoria-da-massimo.de"""


def build_system_prompt(context: str) -> str:
    if context:
        context_block = f"Kontext (nur relevante Auszüge):\n{context}"
    else:
        context_block = "Kein passender Kontext gefunden."

    return f"{SYSTEM_INSTRUCTIONS}\n\n{context_block}"


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

        answer = response.choices[0].message.content or ""
        self.messages.append({"role": "user", "content": user_message})
        self.messages.append({"role": "assistant", "content": answer})

        if len(self.messages) > MAX_HISTORY * 2:
            self.messages = self.messages[-MAX_HISTORY * 2 :]

        return answer

    def reset(self) -> None:
        self.messages = []

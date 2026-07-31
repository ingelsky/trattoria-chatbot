from pathlib import Path
import re

import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parent
DATA_DIR = PROJECT_DIR / "data"
CHROMA_DIR = PROJECT_DIR / ".chroma"

load_dotenv(PROJECT_DIR / ".env")

COLLECTION_NAME = "trattoria_knowledge_v2"
CHUNK_SIZE = 450
CHUNK_OVERLAP = 60
MAX_CHUNKS = 3
MAX_CONTEXT_CHARS = 1400

CATEGORY_LINE = re.compile(r"^-\s+(.+?)\s+-+\s*$")


def _chunk_by_size(text: str, prefix: str = "") -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = prefix

    for paragraph in paragraphs:
        block = f"{current}\n{paragraph}".strip() if current else paragraph
        if len(block) <= CHUNK_SIZE:
            current = block
            continue

        if current:
            chunks.append(current)
            current = ""

        if len(paragraph) <= CHUNK_SIZE:
            current = paragraph
        else:
            start = 0
            while start < len(paragraph):
                end = start + CHUNK_SIZE
                chunks.append(paragraph[start:end])
                start = end - CHUNK_OVERLAP

    if current:
        chunks.append(current)

    return chunks


def _chunk_speisekarte(text: str) -> list[str]:
    chunks: list[str] = []
    category = "Speisekarte"
    buffer: list[str] = []
    char_count = 0

    def flush() -> None:
        nonlocal buffer, char_count
        if not buffer:
            return
        body = "\n".join(buffer).strip()
        if body:
            chunks.append(f"[{category}]\n{body}")
        buffer = []
        char_count = 0

    for line in text.splitlines():
        stripped = line.strip()
        category_match = CATEGORY_LINE.match(stripped)
        if category_match:
            flush()
            category = category_match.group(1).split("/")[0].strip()
            continue

        if not stripped:
            continue

        buffer.append(stripped)
        char_count += len(stripped)

        if char_count >= CHUNK_SIZE:
            flush()

    flush()
    return chunks


def _chunk_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    if path.stem == "speisekarte":
        return _chunk_speisekarte(text)
    return _chunk_by_size(text, prefix=f"[{path.stem}]")


class VectorStore:
    def __init__(self) -> None:
        self.client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=OpenAIEmbeddingFunction(
                model_name="text-embedding-3-small",
                api_key_env_var="OPENAI_API_KEY",
            ),
        )

    def _load_documents(self) -> list[tuple[str, str, str]]:
        documents: list[tuple[str, str, str]] = []
        for path in sorted(DATA_DIR.glob("*.txt")):
            source = path.stem
            for index, chunk in enumerate(_chunk_file(path)):
                documents.append((f"{source}_{index}", chunk, source))
        return documents

    def ensure_indexed(self) -> None:
        if self.collection.count() > 0:
            return

        documents = self._load_documents()
        if not documents:
            raise RuntimeError("No knowledge files found in data/")

        ids, texts, sources = zip(*documents)
        self.collection.add(
            ids=list(ids),
            documents=list(texts),
            metadatas=[{"source": source} for source in sources],
        )

    def _route_sources(self, query: str) -> list[str] | None:
        lowered = query.lower()

        info_keywords = (
            "öffnung",
            "offnung",
            "uhr",
            "zeit",
            "adresse",
            "telefon",
            "reserv",
            "kontakt",
            "donnerstag",
            "ruhetag",
            "park",
            "anfahrt",
            "email",
            "e-mail",
            "bad nauheim",
            "terrasse",
            "frühstück",
            "fruhstuck",
        )
        if any(keyword in lowered for keyword in info_keywords):
            return ["restaurant_info"]

        menu_keywords = (
            "gericht",
            "speise",
            "menü",
            "menu",
            "pizza",
            "pasta",
            "pinsa",
            "vegetar",
            "vegan",
            "gluten",
            "allerg",
            "preis",
            "kosten",
            "empfehl",
            "wein",
            "bier",
            "getränk",
            "getrank",
            "dessert",
            "fleisch",
            "fisch",
            "suppe",
            "salat",
        )
        if any(keyword in lowered for keyword in menu_keywords):
            return ["speisekarte"]

        return None

    def retrieve(self, query: str) -> list[str]:
        sources = self._route_sources(query)
        query_kwargs: dict = {
            "query_texts": [query],
            "n_results": MAX_CHUNKS,
            "include": ["documents"],
        }
        if sources:
            query_kwargs["where"] = {"source": {"$in": sources}}

        result = self.collection.query(**query_kwargs)
        documents = [doc for doc in result.get("documents", [[]])[0] if doc]

        selected: list[str] = []
        total_chars = 0
        for doc in documents:
            if total_chars + len(doc) > MAX_CONTEXT_CHARS:
                remaining = MAX_CONTEXT_CHARS - total_chars
                if remaining >= 80:
                    selected.append(doc[:remaining])
                break
            selected.append(doc)
            total_chars += len(doc)

        return selected if selected else documents[:1]


_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore()
        _store.ensure_indexed()
    return _store

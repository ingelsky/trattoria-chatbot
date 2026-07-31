import json
import re
from pathlib import Path

CATEGORY_LINE = re.compile(r"^-\s+(.+?)\s+-+\s*$")
DISH_LINE = re.compile(r"^(\d+(?:\.\d+)?)\.\s+(.+)$")
DRINK_LINE = re.compile(r"^(\d+(?:\.\d+)?)\s+(.+)$")
PRICE_PATTERN = re.compile(
    r"(?:€\s*[\d,\.]+(?:\s*\([^)]+\))?|[\d,\.]+\s*€(?:\s*\([^)]+\))?)"
)
ALLERGEN_LINE = re.compile(r"^[\d\s,\.]+$")
NOISE_PREFIX = re.compile(
    r"^(vegetarisch|Le Insalate|Unsere Salate|diese Saucen|diese Sauce|Tagliolini|"
    r"Weinflasche|Wir weisen|Allergene|Deklarationspflichtige|\([A-Z,\s]+\)$)",
    re.I,
)


def _slug(name: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", name.lower())
    return re.sub(r"[\s_]+", "-", cleaned.strip())[:40]


def _extract_price(text: str) -> str | None:
    match = PRICE_PATTERN.search(text.replace("\t", " "))
    return match.group(0).strip() if match else None


def _is_noise(line: str) -> bool:
    if not line:
        return True
    if ALLERGEN_LINE.match(line):
        return True
    if NOISE_PREFIX.match(line):
        return True
    if line.startswith("(") and line.endswith(")"):
        return True
    return False


def parse_speisekarte(path: Path) -> list[dict]:
    lines = [line.rstrip() for line in path.read_text(encoding="utf-8").splitlines()]
    categories: list[dict] = []
    current: dict | None = None
    index = 0

    while index < len(lines):
        raw = lines[index].strip()
        index += 1

        if not raw:
            continue

        category_match = CATEGORY_LINE.match(raw)
        if category_match:
            label = category_match.group(1).split("/")[0].strip()
            current = {"id": _slug(label), "name": label, "items": []}
            categories.append(current)
            continue

        if current is None or _is_noise(raw):
            continue

        normalized = raw.replace("\t", " ")
        price_on_line = _extract_price(normalized)

        drink_match = DRINK_LINE.match(normalized)
        if drink_match and price_on_line and not DISH_LINE.match(raw):
            name = PRICE_PATTERN.sub("", drink_match.group(2)).strip().rstrip(".")
            if len(name) > 2:
                current["items"].append(
                    {
                        "id": drink_match.group(1),
                        "name": name,
                        "price": price_on_line,
                    }
                )
            continue

        dish_match = DISH_LINE.match(raw)
        if not dish_match:
            continue

        item_id = dish_match.group(1)
        name = dish_match.group(2).strip()
        description_parts: list[str] = []
        price: str | None = None

        lookahead = index
        while lookahead < len(lines) and lookahead < index + 4:
            candidate = lines[lookahead].strip()
            if not candidate:
                lookahead += 1
                continue
            if CATEGORY_LINE.match(candidate) or DISH_LINE.match(candidate):
                break

            found_price = _extract_price(candidate)
            if found_price:
                price = found_price
                break

            if not _is_noise(candidate):
                description_parts.append(candidate)
            lookahead += 1

        if price and name:
            item = {"id": item_id, "name": name, "price": price}
            if description_parts:
                item["description"] = " ".join(description_parts[:2])
            current["items"].append(item)

    return [category for category in categories if category["items"]]


def load_menu(data_dir: Path) -> list[dict]:
    menu_path = data_dir / "menu.json"
    speisekarte_path = data_dir / "speisekarte.txt"

    if menu_path.exists():
        return json.loads(menu_path.read_text(encoding="utf-8"))

    menu = parse_speisekarte(speisekarte_path)
    merged: dict[str, dict] = {}
    for category in menu:
        if category["id"] in merged:
            merged[category["id"]]["items"].extend(category["items"])
        else:
            merged[category["id"]] = category
    menu = list(merged.values())
    menu_path.write_text(json.dumps(menu, ensure_ascii=False, indent=2), encoding="utf-8")
    return menu

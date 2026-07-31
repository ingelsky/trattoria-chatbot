from pathlib import Path

from menu_parser import load_menu

DATA_DIR = Path(__file__).resolve().parent / "data"


def get_menu() -> list[dict]:
    return load_menu(DATA_DIR)

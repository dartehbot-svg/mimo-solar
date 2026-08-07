"""Модуль интерпретаций — толкования планет в домах и домов в знаках."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .ephemeris import PlanetPosition, SIGNS

DATA_DIR = Path(__file__).parent.parent / "data"


@dataclass
class Interpretation:
    planet: str
    house: int
    sign: str
    text: str
    mode: str  # "short" or "full"


# Загружаем базу толкований при первом импорте
_interp_db: dict | None = None


def _load_db() -> dict:
    global _interp_db
    if _interp_db is None:
        db_path = DATA_DIR / "interpretations.json"
        if db_path.exists():
            with open(db_path, "r", encoding="utf-8") as f:
                _interp_db = json.load(f)
        else:
            _interp_db = {"planet_in_house": {}, "house_in_sign": {}}
    return _interp_db


def get_interpretation(
    planet: str,
    house: int,
    sign: str,
    mode: Literal["short", "full"] = "short",
) -> str:
    """Получить толкование для планеты в доме и знаке."""
    db = _load_db()

    # Пробуем: планета в доме
    pih = db.get("planet_in_house", {}).get(planet, {}).get(str(house), {})
    text_planet_house = pih.get(mode, pih.get("short", ""))

    # Пробуем: дом в знаке
    his = db.get("house_in_sign", {}).get(str(house), {}).get(sign.lower(), {})
    text_house_sign = his.get(mode, his.get("short", ""))

    parts = []
    if text_planet_house:
        parts.append(text_planet_house)
    if text_house_sign:
        parts.append(text_house_sign)

    return " ".join(parts) if parts else f"{planet.capitalize()} в {house}-м доме в {sign}"


def get_full_report(
    planets: list[PlanetPosition],
    mode: Literal["short", "full"] = "short",
    max_planets: int = 10,
) -> list[Interpretation]:
    """Собрать толкования для всех планет."""
    interpretations = []
    main_planets = [p for p in planets if p.name in (
        "sun", "moon", "mercury", "venus", "mars",
        "jupiter", "saturn", "uranus", "neptune", "pluto",
    )]

    for planet in main_planets[:max_planets]:
        if planet.house is not None:
            text = get_interpretation(planet.name, planet.house, planet.sign, mode)
            interpretations.append(Interpretation(
                planet=planet.name,
                house=planet.house,
                sign=planet.sign,
                text=text,
                mode=mode,
            ))

    return interpretations


def get_adaptive_text(
    interpretation: str,
    age: int | None = None,
    profession: str | None = None,
) -> str:
    """Адаптировать текст интерпретации под профиль пользователя (rule-based)."""
    # Пока возвращаем как есть — адаптивность добавим позже
    return interpretation

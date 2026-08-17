"""Модуль интерпретаций — толкования планет в домах и домов в знаках."""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .ephemeris import PlanetPosition, AspectData, SIGNS

DATA_DIR = Path(__file__).parent.parent / "data"

MAIN_PLANETS = (
    "sun", "moon", "mercury", "venus", "mars",
    "jupiter", "saturn", "uranus", "neptune", "pluto",
)

PLANET_NAMES_RU = {
    "sun": "Солнце", "moon": "Луна", "mercury": "Меркурий", "venus": "Венера",
    "mars": "Марс", "jupiter": "Юпитер", "saturn": "Сатурн", "uranus": "Уран",
    "neptune": "Нептун", "pluto": "Плутон",
}

PLANET_SYMBOLS = {
    "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀", "mars": "♂",
    "jupiter": "♃", "saturn": "♄", "uranus": "♅", "neptune": "♆", "pluto": "♇",
}

ASPECT_NAMES_RU = {
    "conjunction": "соединение", "sextile": "секстиль", "square": "квадратура",
    "trine": "тригон", "opposition": "оппозиция",
}


@dataclass
class Interpretation:
    planet: str
    house: int
    sign: str
    text: str
    mode: str


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
            _interp_db = {"planet_in_house": {}, "house_in_sign": {}, "aspects": {},
                          "planets_in_signs": {}, "connectors": {}}
    return _interp_db


def _pick(items: list[str]) -> str:
    """Выбрать случайный элемент из списка."""
    return random.choice(items) if items else ""


def get_planet_in_sign(planet: str, sign: str) -> str:
    """Получить описание планеты в знаке."""
    db = _load_db()
    return db.get("planets_in_signs", {}).get(planet, {}).get(sign, "")


def get_planet_in_house(planet: str, house: int, mode: str = "short") -> str:
    """Получить описание планеты в доме."""
    db = _load_db()
    pih = db.get("planet_in_house", {}).get(planet, {}).get(str(house), {})
    return pih.get(mode, pih.get("short", ""))


def get_house_in_sign(house: int, sign: str, mode: str = "short") -> str:
    """Получить описание куспида дома в знаке."""
    db = _load_db()
    his = db.get("house_in_sign", {}).get(str(house), {}).get(sign.lower(), {})
    return his.get(mode, his.get("short", ""))


def get_aspect_description(aspect_type: str, mode: str = "short") -> str:
    """Получить описание типа аспекта."""
    db = _load_db()
    asp = db.get("aspects", {}).get(aspect_type, {})
    return asp.get(mode, asp.get("short", ""))


def get_connector(category: str) -> str:
    """Получить случайную связующую фразу."""
    db = _load_db()
    connectors = db.get("connectors", {}).get(category, [])
    return _pick(connectors)


def get_interpretation(
    planet: str,
    house: int,
    sign: str,
    mode: Literal["short", "full"] = "short",
) -> str:
    """Получить толкование для планеты в доме и знаке."""
    parts = []

    # Планета в знаке
    pis = get_planet_in_sign(planet, sign)
    if pis:
        parts.append(pis)

    # Планета в доме
    pih = get_planet_in_house(planet, house, mode)
    if pih:
        parts.append(pih)

    # Куспид дома в знаке (для полного режима)
    if mode == "full":
        his = get_house_in_sign(house, sign, mode)
        if his:
            parts.append(his)

    return " ".join(parts) if parts else f"{PLANET_NAMES_RU.get(planet, planet)} в {house}-м доме в {sign}"


def get_full_report(
    planets: list[PlanetPosition],
    mode: Literal["short", "full"] = "short",
    max_planets: int = 10,
    aspects: list[AspectData] | None = None,
) -> list[Interpretation]:
    """Собрать толкования для всех планет."""
    interpretations = []
    main_planets = [p for p in planets if p.name in MAIN_PLANETS]

    for planet in main_planets[:max_planets]:
        if planet.house is not None:
            text = get_interpretation(planet.name, planet.house, planet.sign, mode)

            # Для полного режима добавляем аспекты планеты
            if mode == "full" and aspects:
                planet_aspects = [
                    a for a in aspects
                    if a.planet1 == planet.name or a.planet2 == planet.name
                ]
                if planet_aspects:
                    aspect_texts = []
                    for a in planet_aspects[:3]:
                        other = a.planet2 if a.planet1 == planet.name else a.planet1
                        other_name = PLANET_NAMES_RU.get(other, other)
                        asp_name = ASPECT_NAMES_RU.get(a.aspect_type, a.aspect_type)
                        aspect_texts.append(f"{asp_name} с {other_name}")
                    text += f" Аспекты: {', '.join(aspect_texts)}."

            interpretations.append(Interpretation(
                planet=planet.name,
                house=planet.house,
                sign=planet.sign,
                text=text,
                mode=mode,
            ))

    return interpretations


def generate_short_description(
    planets: list[PlanetPosition],
    asc: float = 0,
    mc: float = 0,
    aspects: list[AspectData] | None = None,
) -> str:
    """Сгенерировать короткое описание натальной карты (150-300 слов).

    Формат по ТЗ: Солнце + Луна + ASC + доминанта + 2-3 аспекта.
    """
    db = _load_db()
    parts = []

    # Вводная фраза
    intro = get_connector("intro")
    if intro:
        parts.append(intro)
        parts.append("")

    # Солнце
    sun = next((p for p in planets if p.name == "sun"), None)
    if sun:
        text = get_interpretation(sun.name, sun.house or 1, sun.sign, "short")
        parts.append(text)

    # Луна
    moon = next((p for p in planets if p.name == "moon"), None)
    if moon:
        text = get_interpretation(moon.name, moon.house or 1, moon.sign, "short")
        parts.append(text)

    # Асцендент
    asc_sign_idx = int(asc / 30) % 12
    asc_sign = SIGNS[asc_sign_idx]
    asc_text = db.get("house_in_sign", {}).get("1", {}).get(asc_sign.lower(), "")
    if asc_text:
        parts.append(f"Асцендент в {asc_sign}: {asc_text}")
    else:
        parts.append(f"Асцендент в {asc_sign}: ваша внешняя маска и первое впечатление.")

    # Ключевые аспекты (топ-3)
    if aspects:
        asp_intro = get_connector("aspect_intro")
        if asp_intro:
            parts.append("")
            parts.append(asp_intro)

        for asp in aspects[:3]:
            p1_name = PLANET_NAMES_RU.get(asp.planet1, asp.planet1)
            p2_name = PLANET_NAMES_RU.get(asp.planet2, asp.planet2)
            asp_name = ASPECT_NAMES_RU.get(asp.aspect_type, asp.aspect_type)
            asp_desc = get_aspect_description(asp.aspect_type, "short")
            parts.append(f"{p1_name} — {p2_name}: {asp_name}. {asp_desc}")

    # Заключение
    conclusion = get_connector("conclusion")
    if conclusion:
        parts.append("")
        parts.append(conclusion)

    return "\n\n".join(parts)


def generate_full_description(
    planets: list[PlanetPosition],
    asc: float = 0,
    mc: float = 0,
    aspects: list[AspectData] | None = None,
    chart_type: str = "natal",
) -> str:
    """Сгенерировать полное описание карты.

    Формат по ТЗ: все 10 планет в знаках и домах с аспектами.
    """
    db = _load_db()
    parts = []

    # Вводная фраза
    if chart_type == "solar":
        intro = get_connector("solar_intro")
    else:
        intro = get_connector("intro")
    if intro:
        parts.append(intro)
        parts.append("")

    # Все планеты
    main_planets = [p for p in planets if p.name in MAIN_PLANETS]
    for planet in main_planets:
        if planet.house is None:
            continue

        name = PLANET_NAMES_RU.get(planet.name, planet.name)
        sym = PLANET_SYMBOLS.get(planet.name, "")
        retro = " ℞" if planet.retrograde else ""

        # Заголовок планеты
        parts.append(f"{sym} {name} в {planet.sign}, {planet.house}-й дом{retro}")
        parts.append("")

        # Планета в знаке
        pis = get_planet_in_sign(planet.name, planet.sign)
        if pis:
            parts.append(pis)

        # Планета в доме
        pih = get_planet_in_house(planet.name, planet.house, "full")
        if pih:
            parts.append(pih)

        # Аспекты планеты
        if aspects:
            planet_aspects = [
                a for a in aspects
                if a.planet1 == planet.name or a.planet2 == planet.name
            ]
            if planet_aspects:
                aspect_lines = []
                for a in planet_aspects[:3]:
                    other = a.planet2 if a.planet1 == planet.name else a.planet1
                    other_name = PLANET_NAMES_RU.get(other, other)
                    asp_name = ASPECT_NAMES_RU.get(a.aspect_type, a.aspect_type)
                    orb_str = f" (орб {a.orb:.1f}°)" if a.orb else ""
                    aspect_lines.append(f"• {asp_name} с {other_name}{orb_str}")
                parts.append("Аспекты: " + ", ".join(aspect_lines))

        parts.append("")

    # ASC и MC
    asc_sign_idx = int(asc / 30) % 12
    mc_sign_idx = int(mc / 30) % 12
    parts.append(f"Асцендент: {SIGNS[asc_sign_idx]} ({asc:.1f}°)")
    parts.append(f"MC: {SIGNS[mc_sign_idx]} ({mc:.1f}°)")
    parts.append("")

    # Итоговое заключение
    conclusion = get_connector("conclusion")
    if conclusion:
        parts.append(conclusion)

    return "\n".join(parts)


def get_adaptive_text(
    interpretation: str,
    age: int | None = None,
    profession: str | None = None,
) -> str:
    """Адаптировать текст интерпретации под профиль пользователя (rule-based)."""
    return interpretation

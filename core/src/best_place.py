"""Поиск лучшего места для встречи дня рождения."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from .natal import NatalChart
from .solar import calculate_solar_chart
from .scoring import score_city, CityScore

DATA_DIR = Path(__file__).parent.parent / "data"


@dataclass
class BestPlaceResult:
    """Результат поиска лучшего места."""
    results: list[CityScore]
    sphere: str
    year: int


def load_cities() -> list[dict]:
    """Загрузить справочник городов."""
    cities_path = DATA_DIR / "cities.json"
    if not cities_path.exists():
        return []
    with open(cities_path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_best_places(
    natal: NatalChart,
    year: int,
    spheres: list[str],
    city_names: list[str] | None = None,
    visa_free_only: bool = False,
    top_n: int = 10,
    sphere_mapping: dict[str, list[int]] | None = None,
    planet_weights: dict[str, int] | None = None,
) -> BestPlaceResult:
    """Найти лучшие места для встречи дня рождения.

    Args:
        natal: Натальная карта
        year: Год соляра
        spheres: Целевые сферы (career, love, health, finance, ...)
        city_names: Список городов для проверки. Если None — все из справочника.
        visa_free_only: Только города без визы для РФ
        top_n: Количество лучших результатов
        sphere_mapping: Маппинг сфер → домов (из JSON)
        planet_weights: Веса планет (из JSON)
    """
    cities = load_cities()

    # Фильтрация
    if city_names:
        cities = [c for c in cities if c["name"] in city_names]
    if visa_free_only:
        cities = [c for c in cities if c.get("visa_free_russia", False)]

    # Загружаем маппинг и веса по умолчанию
    if sphere_mapping is None:
        sphere_mapping = _load_sphere_mapping()
    if planet_weights is None:
        planet_weights = _load_planet_weights()

    results = []
    for city in cities:
        try:
            solar = calculate_solar_chart(
                natal, year, city["lat"], city["lon"],
            )
            city_score = score_city(solar, spheres, sphere_mapping, planet_weights)
            city_score.city_name = city["name"]
            city_score.country = city["country"]
            results.append(city_score)
        except Exception:
            continue  # пропускаем города с ошибками расчёта

    # Сортируем по score (убывание)
    results.sort(key=lambda r: r.score, reverse=True)

    return BestPlaceResult(
        results=results[:top_n],
        sphere=", ".join(spheres),
        year=year,
    )


def _load_sphere_mapping() -> dict[str, list[int]]:
    """Загрузить маппинг сфер из JSON."""
    db_path = DATA_DIR / "interpretations.json"
    if db_path.exists():
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {k: v for k, v in data.get("sphere_mapping", {}).items()}
    return {}


def _load_planet_weights() -> dict[str, int]:
    """Загрузить веса планет из JSON."""
    db_path = DATA_DIR / "interpretations.json"
    if db_path.exists():
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("planet_weights", {})
    return {}

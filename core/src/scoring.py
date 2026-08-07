"""Модуль скоринга городов для поиска лучшего места."""

from __future__ import annotations

from dataclasses import dataclass

from .ephemeris import _get_house_number
from .solar import SolarChart


@dataclass
class CityScore:
    """Результат оценки города."""
    city_name: str
    country: str
    score: float
    details: list[str]  # объяснение: какие планеты в каких домах


def score_city(
    solar: SolarChart,
    target_spheres: list[str],
    sphere_mapping: dict[str, list[int]],
    planet_weights: dict[str, int],
) -> CityScore:
    """Оценить город по целевым сферам.

    Args:
        solar: Солярная карта для данного города
        target_spheres: Целевые сферы пользователя (напр. ["career", "love"])
        sphere_mapping: Маппинг сферы → номера домов
        planet_weights: Веса планет (benefics +, malefics -)
    """
    score = 0.0
    details = []

    for sphere in target_spheres:
        target_houses = sphere_mapping.get(sphere, [])
        for house_num in target_houses:
            for planet in solar.planets:
                if planet.house == house_num:
                    weight = planet_weights.get(planet.name, 0)
                    score += weight
                    detail = f"{planet.name} в {house_num}-м доме ({sphere}): {'+' if weight > 0 else ''}{weight}"
                    details.append(detail)

    return CityScore(
        city_name="",  # заполняется вызывающим кодом
        country="",
        score=score,
        details=details,
    )

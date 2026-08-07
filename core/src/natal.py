"""Расчёт натальной карты."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from .ephemeris import (
    PlanetPosition, HouseData, AspectData,
    get_all_planets, get_houses, assign_houses, calculate_aspects,
)
from .timezone_utils import get_tz_offset, datetime_to_jd


@dataclass
class NatalChart:
    """Полная натальная карта."""
    birth_date: str            # ISO формат "YYYY-MM-DD"
    birth_time: str            # "HH:MM"
    latitude: float
    longitude: float
    tz_offset_hours: float     # смещение UTC в часах
    jd_ut: float               # юлианская дата (UT1)
    planets: list[PlanetPosition] = field(default_factory=list)
    houses: HouseData | None = None
    aspects: list[AspectData] = field(default_factory=list)
    house_system: str = "P"


def calculate_natal(
    birth_date: str,
    birth_time: str,
    latitude: float,
    longitude: float,
    house_system: str = "P",
    tz_offset: float | None = None,
) -> NatalChart:
    """Рассчитать натальную карту.

    Args:
        birth_date: Дата рождения "YYYY-MM-DD"
        birth_time: Время рождения "HH:MM"
        latitude: Широта места рождения
        longitude: Долгота места рождения
        house_system: Система домов (P=Placidus, K=Koch, E=Equal, O=Porphyry)
        tz_offset: Смещение UTC в часах. Если None — определяется автоматически по координатам.
    """
    # Парсим дату и время
    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")

    # Определяем смещение часового пояса
    if tz_offset is not None:
        offset = timedelta(hours=tz_offset)
    else:
        offset = get_tz_offset(latitude, longitude, dt)

    offset_hours = offset.total_seconds() / 3600

    # Преобразуем в юлианскую дату (UT1)
    jd_ut = datetime_to_jd(dt, offset)

    # Рассчитываем позиции планет
    planets = get_all_planets(jd_ut, include_minor=True)

    # Рассчитываем дома
    houses = get_houses(jd_ut, latitude, longitude, house_system)

    # Привязываем планеты к домам
    planets = assign_houses(planets, houses)

    # Рассчитываем аспекты
    aspects = calculate_aspects(planets)

    return NatalChart(
        birth_date=birth_date,
        birth_time=birth_time,
        latitude=latitude,
        longitude=longitude,
        tz_offset_hours=offset_hours,
        jd_ut=jd_ut,
        planets=planets,
        houses=houses,
        aspects=aspects,
        house_system=house_system,
    )

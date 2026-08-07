"""Расчёт солярного возвращения (Solar Return)."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import swisseph as swe

from .ephemeris import (
    PlanetPosition, HouseData, AspectData,
    get_all_planets, get_houses, assign_houses, calculate_aspects,
    _angle_diff,
)
from .natal import NatalChart


@dataclass
class SolarChart:
    """Солярная карта."""
    year: int
    latitude: float
    longitude: float
    solar_jd_ut: float           # точный момент соляра (юлианская дата)
    solar_datetime_utc: str      # дата/время соляра в UTC
    natal_sun_lon: float         # натальная долгота Солнца
    planets: list[PlanetPosition] = field(default_factory=list)
    houses: HouseData | None = None
    aspects: list[AspectData] = field(default_factory=list)
    house_system: str = "P"


@dataclass
class OverlayResult:
    """Наложение соляра на натал."""
    solar_planets_in_natal_houses: dict[str, int]   # планета соляра → натальный дом
    natal_planets_in_solar_houses: dict[str, int]   # планета натала → солярный дом


def find_solar_return(natal_sun_lon: float, year: int) -> float:
    """Найти точный момент солярного возвращения.

    Алгоритм:
    1. Грубый поиск: шаг 1 день, найти JD где |sun_lon - natal_sun_lon| < 1°
    2. Уточнение: шаг 1 час в окне ±2 дня
    3. Детальное: бисекция до точности < 0.001" (секунды дуги)

    Args:
        natal_sun_lon: Долгота натального Солнца (градусы, 0-360)
        year: Год соляра

    Returns:
        JD_UT момента солярного возвращения
    """
    # Стартовая точка: 1 января года, 0:00 UTC
    jd_start = swe.julday(year, 1, 1, 0.0)

    # Шаг 1: Грубый поиск с шагом 1 день (±366 дней)
    jd_coarse = None
    prev_diff = None

    for day_offset in range(-1, 367):
        jd = jd_start + day_offset
        sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
        diff = _angle_diff(sun_lon, natal_sun_lon)

        if diff < 1.0:
            jd_coarse = jd
            break

        # Проверяем, не перешли ли через точку совпадения
        if prev_diff is not None and prev_diff > 350 and diff < 10:
            # Перешли через 0° Овна, нужна коррекция
            pass
        prev_diff = diff

    if jd_coarse is None:
        # Фallback: используем дату рождения как приближение
        jd_coarse = swe.julday(year, 1, 1, 12.0)

    # Шаг 2: Уточнение с шагом 1 час (±48 часов)
    best_jd = jd_coarse
    best_diff = _angle_diff(swe.calc_ut(jd_coarse, swe.SUN)[0][0], natal_sun_lon)

    for hour_offset in range(-48, 49):
        jd = jd_coarse + hour_offset / 24.0
        sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
        diff = _angle_diff(sun_lon, natal_sun_lon)

        if diff < best_diff:
            best_diff = diff
            best_jd = jd

    # Шаг 3: Бинарный поиск с использованием знаковой разницы
    jd_low = best_jd - 1 / 24  # ±1 час
    jd_high = best_jd + 1 / 24

    def _signed_diff(jd: float) -> float:
        """Знаковая разница долгот Солнца (учёт перехода через 0°)."""
        sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
        d = (sun_lon - natal_sun_lon + 180) % 360 - 180
        return d

    for _ in range(100):
        jd_mid = (jd_low + jd_high) / 2
        d_mid = _signed_diff(jd_mid)

        if abs(d_mid) < 1e-9:
            break

        d_low = _signed_diff(jd_low)

        # Солнце движется вперёд (d увеличивается), поэтому:
        # если d_low и d_mid одного знака — корень правее
        if d_low * d_mid > 0:
            jd_low = jd_mid
        else:
            jd_high = jd_mid

    return (jd_low + jd_high) / 2


def calculate_solar_chart(
    natal: NatalChart,
    year: int,
    latitude: float,
    longitude: float,
    house_system: str = "P",
) -> SolarChart:
    """Рассчитать полную солярную карту.

    Args:
        natal: Натальная карта
        year: Год соляра
        latitude: Широта места встречи дня рождения
        longitude: Долгота места встречи дня рождения
        house_system: Система домов
    """
    # Находим натальную долготу Солнца
    natal_sun = next(p for p in natal.planets if p.name == "sun")
    natal_sun_lon = natal_sun.longitude

    # Находим момент соляра
    solar_jd = find_solar_return(natal_sun_lon, year)

    # Рассчитываем позиции планет в момент соляра
    planets = get_all_planets(solar_jd, include_minor=True)

    # Рассчитываем дома для места встречи дня рождения
    houses = get_houses(solar_jd, latitude, longitude, house_system)

    # Привязываем планеты к домам
    planets = assign_houses(planets, houses)

    # Рассчитываем аспекты
    aspects = calculate_aspects(planets)

    # Форматируем дату/время соляра в UTC
    from .timezone_utils import jd_to_datetime
    solar_dt = jd_to_datetime(solar_jd)
    solar_datetime_str = solar_dt.strftime("%Y-%m-%d %H:%M:%S UTC")

    return SolarChart(
        year=year,
        latitude=latitude,
        longitude=longitude,
        solar_jd_ut=solar_jd,
        solar_datetime_utc=solar_datetime_str,
        natal_sun_lon=natal_sun_lon,
        planets=planets,
        houses=houses,
        aspects=aspects,
        house_system=house_system,
    )


def overlay_solar_on_natal(solar: SolarChart, natal: NatalChart) -> OverlayResult:
    """Наложение солярной карты на натальную.

    Определяет:
    - В каких натальных домах стоят планеты соляра
    - В каких солярных домах стоят планеты натала
    """
    from .ephemeris import _get_house_number

    solar_in_natal = {}
    natal_in_solar = {}

    # Планеты соляра в натальных домах
    if natal.houses:
        for sp in solar.planets:
            if sp.name in ("sun", "moon", "mercury", "venus", "mars",
                          "jupiter", "saturn", "uranus", "neptune", "pluto"):
                house = _get_house_number(sp.longitude, natal.houses.cusps)
                solar_in_natal[sp.name] = house

    # Планеты натала в солярных домах
    if solar.houses:
        for np in natal.planets:
            if np.name in ("sun", "moon", "mercury", "venus", "mars",
                          "jupiter", "saturn", "uranus", "neptune", "pluto"):
                house = _get_house_number(np.longitude, solar.houses.cusps)
                natal_in_solar[np.name] = house

    return OverlayResult(
        solar_planets_in_natal_houses=solar_in_natal,
        natal_planets_in_solar_houses=natal_in_solar,
    )

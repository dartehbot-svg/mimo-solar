"""Обёртка над pyswisseph — инициализация, позиции планет, системы домов."""

from __future__ import annotations

import math
import swisseph as swe
from dataclasses import dataclass
from pathlib import Path

# Константы планет
PLANET_IDS = {
    "sun": swe.SUN,
    "moon": swe.MOON,
    "mercury": swe.MERCURY,
    "venus": swe.VENUS,
    "mars": swe.MARS,
    "jupiter": swe.JUPITER,
    "saturn": swe.SATURN,
    "uranus": swe.URANUS,
    "neptune": swe.NEPTUNE,
    "pluto": swe.PLUTO,
    "true_node": swe.TRUE_NODE,
    "chiron": swe.CHIRON,
}

# Малые тела
MINOR_IDS = {
    "lilith": swe.MEAN_APOG,  # Чёрная Луна (средний апогей)
    "ceres": swe.CERES,
    "pallas": swe.PALLAS,
    "juno": swe.JUNO,
    "vesta": swe.VESTA,
}

# Системы домов
HOUSE_SYSTEMS = {
    "P": "Placidus",
    "K": "Koch",
    "R": "Regiomontanus",
    "C": "Campanus",
    "E": "Equal",
    "W": "Whole Sign",
    "O": "Porphyry",
}

# Символы знаков зодиака
SIGNS = [
    "Овен", "Телец", "Близнецы", "Рак",
    "Лев", "Дева", "Весы", "Скорпион",
    "Стрелец", "Козерог", "Водолей", "Рыбы",
]

SIGN_SYMBOLS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]

PLANET_SYMBOLS = {
    "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀", "mars": "♂",
    "jupiter": "♃", "saturn": "♄", "uranus": "♅", "neptune": "♆", "pluto": "♇",
    "true_node": "☊", "chiron": "⚷", "lilith": "⚸",
}


@dataclass
class PlanetPosition:
    name: str
    longitude: float       # эклиптическая долгота, градусы
    latitude: float        # эклиптическая широта
    speed: float           # скорость по долготе (град/день)
    sign: str              # знак зодиака
    sign_degree: float     # градус внутри знака (0-30)
    sign_minute: int       # минуты
    sign_second: int       # секунды
    house: int | None      # номер дома (1-12), None если не рассчитан
    retrograde: bool       # ретроградность
    symbol: str            # Unicode символ


@dataclass
class HouseData:
    cusps: list[float]     # 12 куспидов домов (градусы эклиптики)
    asc: float             # Асцендент
    mc: float              # Midheaven (MC)
    system: str            # Система домов


@dataclass
class AspectData:
    planet1: str
    planet2: str
    aspect_type: str       # "conjunction", "sextile", "square", "trine", "opposition"
    angle: float           # точный угол аспекта
    orb: float             # орб (отклонение от точного)
    exact: bool            # орб < 1°


# Орбы аспектов (градусы)
ASPECT_ORBS = {
    "conjunction": 8,    # 0°
    "sextile": 6,        # 60°
    "square": 7,         # 90°
    "trine": 7,          # 120°
    "opposition": 8,     # 180°
}

ASPECT_ANGLES = {
    "conjunction": 0,
    "sextile": 60,
    "square": 90,
    "trine": 120,
    "opposition": 180,
}

# Веса планет для орбов (личные планеты — меньше орб)
PLANET_ORB_WEIGHT = {
    "sun": 1.0, "moon": 1.0,
    "mercury": 0.9, "venus": 0.9, "mars": 0.9,
    "jupiter": 0.8, "saturn": 0.8,
    "uranus": 0.7, "neptune": 0.7, "pluto": 0.7,
    "true_node": 0.6, "chiron": 0.6, "lilith": 0.6,
}


def init_ephe(swe_path: str | Path | None = None) -> None:
    """Инициализация Swiss Ephemeris. Вызвать один раз при старте."""
    if swe_path is None:
        swe_path = Path(__file__).parent.parent.parent / "swe"
    swe_path = Path(swe_path)
    if swe_path.exists():
        swe.set_ephe_path(str(swe_path))
    swe.set_topo(0, 0, 0)


def _split_deg(deg: float) -> tuple[str, int, int, float]:
    """Разбить абсолютный градус на знак, градус, минуту, секунду."""
    sign_idx = int(deg / 30) % 12
    sign_name = SIGNS[sign_idx]
    within_sign = deg % 30
    d = int(within_sign)
    m = int((within_sign - d) * 60)
    s = int(((within_sign - d) * 60 - m) * 60)
    return sign_name, d, m, s


def _angle_diff(a: float, b: float) -> float:
    """Минимальная угловая разница между двумя градусами (0-180)."""
    diff = abs(a - b) % 360
    return min(diff, 360 - diff)


def get_planet_position(jd_ut: float, planet_key: str) -> PlanetPosition:
    """Получить позицию одной планеты на заданную юлианскую дату."""
    pid = PLANET_IDS.get(planet_key)
    if pid is None:
        pid = MINOR_IDS.get(planet_key)
    if pid is None:
        raise ValueError(f"Неизвестная планета: {planet_key}")

    # calc_ut возвращает (lon, lat, distance, speed_lon, speed_lat, speed_dist)
    result = swe.calc_ut(jd_ut, pid)
    lon = result[0][0]
    lat = result[0][1]
    speed = result[0][3]

    sign, d, m, s = _split_deg(lon)
    retrograde = speed < 0

    return PlanetPosition(
        name=planet_key,
        longitude=lon,
        latitude=lat,
        speed=speed,
        sign=sign,
        sign_degree=d,
        sign_minute=m,
        sign_second=s,
        house=None,  # заполняется отдельно
        retrograde=retrograde,
        symbol=PLANET_SYMBOLS.get(planet_key, ""),
    )


def get_all_planets(jd_ut: float, include_minor: bool = False) -> list[PlanetPosition]:
    """Получить позиции всех планет."""
    planets = []
    for key in PLANET_IDS:
        planets.append(get_planet_position(jd_ut, key))
    if include_minor:
        for key in MINOR_IDS:
            planets.append(get_planet_position(jd_ut, key))
    return planets


def get_houses(jd_ut: float, lat: float, lon: float, system: str = "P") -> HouseData:
    """Рассчитать дома. system: P=Placidus, K=Koch, E=Equal, O=Porphyry и т.д."""
    if system not in HOUSE_SYSTEMS:
        raise ValueError(f"Неизвестная система домов: {system}. Доступны: {list(HOUSE_SYSTEMS.keys())}")

    # swe.houses возвращает (cusps, ascmc)
    # cusps: tuple из 12 или 13 элементов (для某些 систем 13-й = cusp 1)
    # ascmc: [ASC, MC, ARMC, Vertex, Equatorial ASC, ...]
    cusps_tuple, ascmc = swe.houses(jd_ut, lat, lon, system.encode())

    cusps = list(cusps_tuple[:12])
    asc = ascmc[0]
    mc = ascmc[1]

    return HouseData(cusps=cusps, asc=asc, mc=mc, system=system)


def assign_houses(planets: list[PlanetPosition], houses: HouseData) -> list[PlanetPosition]:
    """Определить дом для каждой планеты по её долготе."""
    for planet in planets:
        planet.house = _get_house_number(planet.longitude, houses.cusps)
    return planets


def _get_house_number(lon: float, cusps: list[float]) -> int:
    """Определить номер дома для заданной эклиптической долготы."""
    for i in range(12):
        cusp_start = cusps[i]
        cusp_end = cusps[(i + 1) % 12]

        if cusp_start < cusp_end:
            if cusp_start <= lon < cusp_end:
                return i + 1
        else:
            # Переход через 0° Овна
            if lon >= cusp_start or lon < cusp_end:
                return i + 1

    return 1  # fallback


def calculate_aspects(
    planets: list[PlanetPosition],
    aspect_types: dict[str, float] | None = None,
) -> list[AspectData]:
    """Рассчитать аспекты между планетами."""
    if aspect_types is None:
        aspect_types = ASPECT_ANGLES

    aspects = []
    for i, p1 in enumerate(planets):
        for p2 in planets[i + 1:]:
            diff = _angle_diff(p1.longitude, p2.longitude)

            for asp_name, asp_angle in aspect_types.items():
                orb = abs(diff - asp_angle)
                max_orb = ASPECT_ORBS.get(asp_name, 6)

                # Учитываем вес планет для орба
                w1 = PLANET_ORB_WEIGHT.get(p1.name, 0.7)
                w2 = PLANET_ORB_WEIGHT.get(p2.name, 0.7)
                effective_orb = max_orb * max(w1, w2)

                if orb <= effective_orb:
                    aspects.append(AspectData(
                        planet1=p1.name,
                        planet2=p2.name,
                        aspect_type=asp_name,
                        angle=asp_angle,
                        orb=round(orb, 2),
                        exact=orb < 1.0,
                    ))
                    break  # только один аспект на пару планет

    return aspects


def format_position(planet: PlanetPosition) -> str:
    """Форматированная позиция планеты: '☉ Овен 15°23'45"."""
    return f"{planet.symbol} {planet.sign} {planet.sign_degree}°{planet.sign_minute:02d}'{planet.sign_second:02d}\""

"""Утилиты для работы с часовыми поясами, включая исторические."""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

try:
    from timezonefinder import TimezoneFinder
    _tf = TimezoneFinder()
except ImportError:
    _tf = None


# Исторические смещения часовых поясов для крупных городов
# Формат: { "zone_name": [(год_начала, год_конца, смещение_часы), ...] }
HISTORICAL_TZ_OVERRIDES: dict[str, list[tuple[int, int | None, float]]] = {
    "Europe/Moscow": [
        (1880, 1919, 2.0 + 30 / 60),   # МСК = UTC+2:30 (среднее солнечное время)
        (1919, 1930, 3.0),              # МСК = UTC+3
        (1930, 1981, 3.0),              # Декретное время (UTC+3)
        (1981, 1991, 3.0),              # Летнее время применялось, но зимой = UTC+3
        (1991, 2011, 3.0),              # UTC+3 зимой, UTC+4 летом (handled by DST)
        (2011, 2014, 4.0),              # Постоянное летнее время UTC+4
        (2014, None, 3.0),              # Возврат к UTC+3
    ],
}


def get_tz_offset(lat: float, lon: float, dt: datetime | None = None) -> timedelta:
    """Получить смещение часового пояса по координатам и дате."""
    if _tf is not None:
        tz_name = _tf.timezone_at(lat=lat, lng=lon)
        if tz_name:
            try:
                tz = ZoneInfo(tz_name)
                if dt is None:
                    dt = datetime.now()
                aware = dt.replace(tzinfo=tz)
                return aware.utcoffset() or timedelta(0)
            except Exception:
                pass

    # Fallback: грубое приближение по долготе
    offset_hours = round(lon / 15)
    return timedelta(hours=offset_hours)


def get_tz_name(lat: float, lon: float) -> str | None:
    """Получить имя часового пояса по координатам."""
    if _tf is not None:
        return _tf.timezone_at(lat=lat, lng=lon)
    return None


def datetime_to_jd(dt: datetime, tz_offset: timedelta | None = None) -> float:
    """Преобразовать datetime в юлианскую дату (UT1).

    Если tz_offset задан, datetime считается местным временем.
    Если tz_offset=None, datetime считается UTC.
    """
    import swisseph as swe

    if tz_offset is not None:
        dt_utc = dt - tz_offset
    else:
        dt_utc = dt

    # swe.julday(year, month, day, hour_decimal)
    hour_decimal = dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600
    jd = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, hour_decimal)
    return jd


def jd_to_datetime(jd: float) -> datetime:
    """Преобразовать юлианскую дату (UT1) в datetime (UTC)."""
    import swisseph as swe

    # revjul возвращает (year, month, day, hour_decimal)
    y, m, d, h = swe.revjul(jd)
    hour = int(h)
    minute = int((h - hour) * 60)
    second = int(((h - hour) * 60 - minute) * 60)
    return datetime(y, m, d, hour, minute, second, tzinfo=timezone.utc)


def get_historical_offset(tz_name: str, year: int) -> float | None:
    """Получить историческое смещение часового пояса для заданного года."""
    overrides = HISTORICAL_TZ_OVERRIDES.get(tz_name)
    if not overrides:
        return None

    for start_year, end_year, offset in overrides:
        if end_year is None:
            end_year = 9999
        if start_year <= year < end_year:
            return offset

    return None

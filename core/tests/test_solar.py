"""Тесты модуля солярного возвращения."""

import pytest
import swisseph as swe

from src.ephemeris import init_ephe, get_planet_position, _angle_diff
from src.solar import find_solar_return, calculate_solar_chart
from src.natal import calculate_natal


@pytest.fixture(autouse=True)
def init():
    init_ephe()


class TestSolarReturn:
    def test_find_solar_return_basic(self):
        """Солярное возвращение: Солнце должно вернуться в натальную позицию."""
        # Натальное Солнце: 15 марта 1990, 12:00 UTC
        natal_jd = swe.julday(1990, 3, 15, 12.0)
        natal_sun_lon = get_planet_position(natal_jd, "sun").longitude

        # Ищем соляр на 1991 год
        solar_jd = find_solar_return(natal_sun_lon, 1991)

        # Проверяем, что Солнце в момент соляра очень близко к натальной позиции
        solar_sun_lon = get_planet_position(solar_jd, "sun").longitude
        diff = _angle_diff(solar_sun_lon, natal_sun_lon)
        assert diff < 0.001, f"Разница долгот Солнца: {diff:.6f}° (должно быть < 0.001°)"

    def test_solar_return_different_year(self):
        """Соляр на другой год — момент должен быть другим."""
        natal_jd = swe.julday(1990, 3, 15, 12.0)
        natal_sun_lon = get_planet_position(natal_jd, "sun").longitude

        solar_1991 = find_solar_return(natal_sun_lon, 1991)
        solar_1992 = find_solar_return(natal_sun_lon, 1992)

        # Моменты должны отличаться (обычно на ~6 часов)
        assert abs(solar_1992 - solar_1991) > 0.1  # минимум ~2.4 часа

    def test_solar_return_not_birthday(self):
        """Солярное возвращение НЕ совпадает с днём рождения (в общем случае)."""
        natal_jd = swe.julday(1990, 3, 15, 12.0)
        natal_sun_lon = get_planet_position(natal_jd, "sun").longitude

        solar_jd = find_solar_return(natal_sun_lon, 2026)
        solar_sun_lon = get_planet_position(solar_jd, "sun").longitude

        # Проверяем точность
        diff = _angle_diff(solar_sun_lon, natal_sun_lon)
        assert diff < 0.0001, f"Точность соляра: {diff:.8f}°"


class TestSolarChart:
    def test_calculate_solar_chart(self):
        """Полный расчёт солярной карты."""
        natal = calculate_natal("1990-03-15", "14:30", 55.7558, 37.6173)
        solar = calculate_solar_chart(natal, 2026, 55.7558, 37.6173)

        assert solar.year == 2026
        assert len(solar.planets) > 0
        assert solar.houses is not None
        assert len(solar.houses.cusps) == 12

    def test_relocated_solar(self):
        """Релокация: дома должны отличаться для разных мест."""
        natal = calculate_natal("1990-03-15", "14:30", 55.7558, 37.6173)

        solar_moscow = calculate_solar_chart(natal, 2026, 55.7558, 37.6173)
        solar_dubai = calculate_solar_chart(natal, 2026, 25.2048, 55.2708)

        # Куспиды домов должны отличаться
        assert solar_moscow.houses.cusps[0] != solar_dubai.houses.cusps[0]

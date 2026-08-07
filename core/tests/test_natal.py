"""Тесты модуля натальной карты."""

import pytest

from src.ephemeris import init_ephe
from src.natal import calculate_natal


@pytest.fixture(autouse=True)
def init():
    init_ephe()


class TestNatalChart:
    def test_basic_natal(self):
        """Базовый расчёт натальной карты."""
        natal = calculate_natal("1990-03-15", "14:30", 55.7558, 37.6173)

        assert natal.birth_date == "1990-03-15"
        assert natal.birth_time == "14:30"
        assert natal.latitude == 55.7558
        assert natal.longitude == 37.6173
        assert len(natal.planets) > 0
        assert natal.houses is not None
        assert len(natal.houses.cusps) == 12

    def test_planets_have_houses(self):
        """Все планеты должны быть привязаны к домам."""
        natal = calculate_natal("1990-03-15", "14:30", 55.7558, 37.6173)

        main_planets = [p for p in natal.planets if p.name in (
            "sun", "moon", "mercury", "venus", "mars",
            "jupiter", "saturn", "uranus", "neptune", "pluto",
        )]
        for p in main_planets:
            assert p.house is not None, f"{p.name} не привязан к дому"
            assert 1 <= p.house <= 12, f"{p.name}: неверный дом {p.house}"

    def test_aspects_calculated(self):
        """Аспекты должны быть рассчитаны."""
        natal = calculate_natal("1990-03-15", "14:30", 55.7558, 37.6173)
        assert len(natal.aspects) > 0

    def test_different_timezone(self):
        """Разные часовые пояса должны давать разные результаты."""
        # Одно и то же время, но разные координаты (разные TZ)
        natal1 = calculate_natal("1990-03-15", "14:30", 55.7558, 37.6173)  # Москва
        natal2 = calculate_natal("1990-03-15", "14:30", 40.7128, -74.0060)  # Нью-Йорк

        # Юлианские даты должны отличаться из-за разных TZ
        assert abs(natal1.jd_ut - natal2.jd_ut) > 0.1

    def test_midnight_birth(self):
        """Рождение в полночь — не должно вызывать ошибок."""
        natal = calculate_natal("2000-01-01", "00:00", 55.7558, 37.6173)
        assert len(natal.planets) > 0

    def test_houses_asc_mc(self):
        """ASC и MC должны быть в диапазоне 0-360."""
        natal = calculate_natal("1990-03-15", "14:30", 55.7558, 37.6173)
        assert 0 <= natal.houses.asc < 360
        assert 0 <= natal.houses.mc < 360

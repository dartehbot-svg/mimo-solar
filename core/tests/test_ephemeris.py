"""Тесты модуля эфемерид."""

import pytest
import swisseph as swe

from src.ephemeris import (
    init_ephe, get_planet_position, get_all_planets,
    get_houses, assign_houses, calculate_aspects,
    _split_deg, _angle_diff,
)


@pytest.fixture(autouse=True)
def init():
    """Инициализация Swiss Ephemeris перед каждым тестом."""
    init_ephe()


class TestSplitDeg:
    def test_zero(self):
        sign, d, m, s = _split_deg(0)
        assert sign == "Овен"
        assert d == 0

    def test_mid_aries(self):
        sign, d, m, s = _split_deg(15.5)
        assert sign == "Овен"
        assert d == 15
        assert m == 30

    def test_taurus(self):
        sign, d, m, s = _split_deg(45.0)
        assert sign == "Телец"
        assert d == 15

    def test_full_circle(self):
        sign, d, m, s = _split_deg(359.99)
        assert sign == "Рыбы"


class TestAngleDiff:
    def test_same(self):
        assert _angle_diff(100, 100) == 0

    def test_small(self):
        assert abs(_angle_diff(10, 15) - 5) < 0.001

    def test_wrap(self):
        assert abs(_angle_diff(359, 1) - 2) < 0.001

    def test_opposite(self):
        assert abs(_angle_diff(0, 180) - 180) < 0.001


class TestPlanetPositions:
    def test_sun_position_known_date(self):
        """Проверяем позицию Солнца на известную дату.

        15 марта 1990, 12:00 UTC — Солнце должно быть в Рыбах/Овне (~24-25° Рыб).
        JD ≈ 2447966.0
        """
        jd = swe.julday(1990, 3, 15, 12.0)
        sun = get_planet_position(jd, "sun")
        assert sun.sign in ("Рыбы", "Овен")  # ~24° Рыб
        assert 0 <= sun.sign_degree <= 30
        assert not sun.retrograde  # Солнце не бывает ретроградным

    def test_all_planets(self):
        """Проверяем, что все планеты возвращают позиции."""
        jd = swe.julday(2024, 1, 1, 12.0)
        planets = get_all_planets(jd)
        assert len(planets) == 12  # 10 планет + True Node + Chiron
        for p in planets:
            assert 0 <= p.longitude < 360
            assert p.sign in [
                "Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева",
                "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы",
            ]

    def test_moon_moves(self):
        """Луна должна менять позицию за день."""
        jd1 = swe.julday(2024, 1, 1, 0.0)
        jd2 = swe.julday(2024, 1, 2, 0.0)
        moon1 = get_planet_position(jd1, "moon")
        moon2 = get_planet_position(jd2, "moon")
        # Луна движется ~13°/день
        assert abs(moon2.longitude - moon1.longitude) > 5


class TestHouses:
    def test_placidus(self):
        """Проверяем расчёт домов по Плацидусу для Москвы."""
        jd = swe.julday(1990, 3, 15, 12.0)
        houses = get_houses(jd, 55.7558, 37.6173, "P")
        assert len(houses.cusps) == 12
        assert 0 <= houses.asc < 360
        assert 0 <= houses.mc < 360

    def test_koch(self):
        """Проверяем расчёт домов по Кох."""
        jd = swe.julday(1990, 3, 15, 12.0)
        houses = get_houses(jd, 55.7558, 37.6173, "K")
        assert len(houses.cusps) == 12

    def test_different_locations_different_asc(self):
        """ASC должен отличаться для разных широт."""
        jd = swe.julday(2024, 6, 21, 12.0)
        h1 = get_houses(jd, 55.7558, 37.6173)  # Москва
        h2 = get_houses(jd, -33.8688, 151.2093)  # Сидней
        # ASC будет разным из-за разных широт
        assert abs(h1.asc - h2.asc) > 10 or abs(h1.asc - h2.asc) > 350


class TestAspects:
    def test_conjunction(self):
        """Две планеты в одном градусе должны иметь конъюнкцию."""
        from src.ephemeris import PlanetPosition
        p1 = PlanetPosition("sun", 10.0, 0, 1, "Овен", 10, 0, 0, 1, False, "☉")
        p2 = PlanetPosition("moon", 12.0, 0, 13, "Овен", 12, 0, 0, 1, False, "☽")
        aspects = calculate_aspects([p1, p2])
        assert any(a.aspect_type == "conjunction" for a in aspects)

    def test_opposition(self):
        """Две планеты в оппозиции (180°)."""
        from src.ephemeris import PlanetPosition
        p1 = PlanetPosition("sun", 10.0, 0, 1, "Овен", 10, 0, 0, 1, False, "☉")
        p2 = PlanetPosition("moon", 190.0, 0, 13, "Весы", 10, 0, 0, 7, False, "☽")
        aspects = calculate_aspects([p1, p2])
        assert any(a.aspect_type == "opposition" for a in aspects)

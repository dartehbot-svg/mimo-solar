"""Тесты для chart_renderer.py."""

import pytest
from src.chart_renderer import render_chart_svg, render_chart_png, _place_planets


@pytest.fixture
def sample_planets():
    return [
        {"name": "sun", "longitude": 45.5, "retrograde": False},
        {"name": "moon", "longitude": 120.3, "retrograde": False},
        {"name": "mars", "longitude": 200.0, "retrograde": True},
        {"name": "venus", "longitude": 45.0, "retrograde": False},  # близко к Sun
    ]


@pytest.fixture
def sample_cusps():
    return [15.0, 45.0, 75.0, 105.0, 135.0, 165.0, 195.0, 225.0, 255.0, 285.0, 315.0, 345.0]


@pytest.fixture
def sample_aspects():
    return [
        {"planet1": "sun", "planet2": "moon", "aspect_type": "trine"},
        {"planet1": "sun", "planet2": "mars", "aspect_type": "opposition"},
    ]


def test_svg_basic(sample_planets, sample_cusps):
    svg = render_chart_svg(sample_planets, sample_cusps, asc=15.0, mc=105.0)
    assert svg.startswith("<svg")
    assert "circle" in svg
    assert "text" in svg


def test_svg_with_aspects(sample_planets, sample_cusps, sample_aspects):
    svg = render_chart_svg(sample_planets, sample_cusps, asc=15.0, mc=105.0, aspects=sample_aspects)
    assert "line" in svg
    assert "#4488FF" in svg  # trine color


def test_svg_planet_symbols(sample_planets, sample_cusps):
    svg = render_chart_svg(sample_planets, sample_cusps, asc=15.0, mc=105.0)
    assert "☉" in svg  # sun symbol
    assert "☽" in svg  # moon symbol


def test_svg_retrograde_color(sample_planets, sample_cusps):
    svg = render_chart_svg(sample_planets, sample_cusps, asc=15.0, mc=105.0)
    assert "#C00" in svg  # retrograde color for mars


def test_png_basic(sample_planets, sample_cusps):
    png = render_chart_png(sample_planets, sample_cusps, asc=15.0, mc=105.0)
    assert isinstance(png, bytes)
    assert png[:4] == b'\x89PNG'  # PNG magic bytes


def test_png_with_aspects(sample_planets, sample_cusps, sample_aspects):
    png = render_chart_png(sample_planets, sample_cusps, asc=15.0, mc=105.0, aspects=sample_aspects)
    assert isinstance(png, bytes)
    assert len(png) > 1000  # reasonable size


def test_place_planets_no_overlap():
    planets = [
        {"name": "a", "longitude": 10.0},
        {"name": "b", "longitude": 12.0},  # very close
        {"name": "c", "longitude": 200.0},
    ]
    placed = _place_planets(planets, 100.0)
    # First two should have different radii
    assert placed[0]["r"] != placed[1]["r"]


def test_place_planets_far_apart():
    planets = [
        {"name": "a", "longitude": 10.0},
        {"name": "b", "longitude": 180.0},
    ]
    placed = _place_planets(planets, 100.0)
    assert placed[0]["r"] == placed[1]["r"]  # same radius since far apart

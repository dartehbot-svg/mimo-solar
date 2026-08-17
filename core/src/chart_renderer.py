"""Рендер SVG-колеса натальной/солярной карты."""

from __future__ import annotations

import math
import io
from xml.etree.ElementTree import Element, SubElement, tostring

# Цвета аспектов
ASPECT_COLORS = {
    "conjunction": "#FFD700",  # золотой
    "sextile": "#44AA44",      # зелёный
    "square": "#FF4444",       # красный
    "trine": "#4488FF",        # синий
    "opposition": "#FF4444",   # красный
}

ASPECT_WIDTHS = {
    "conjunction": 2,
    "sextile": 1,
    "square": 2,
    "trine": 2,
    "opposition": 2,
}

# Знаки зодиака
SIGNS = [
    "♈", "♉", "♊", "♋", "♌", "♍",
    "♎", "♏", "♐", "♑", "♒", "♓",
]

# Символы планет
PLANET_SYMBOLS = {
    "sun": "☉", "moon": "☽", "mercury": "☿", "venus": "♀", "mars": "♂",
    "jupiter": "♃", "saturn": "♄", "uranus": "♅", "neptune": "♆", "pluto": "♇",
    "true_node": "☊", "chiron": "⚷", "lilith": "⚸",
}

# Цвета знаков
SIGN_COLORS = [
    "#FF4444", "#44AA44", "#FFCC00", "#8888CC",
    "#FF6600", "#888888", "#FF69B4", "#8B0000",
    "#9933FF", "#666666", "#0088FF", "#44AAAA",
]


def _deg_to_rad(deg: float) -> float:
    return (deg - 90) * math.pi / 180


def _hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    """Конвертировать hex-строку '#RRGGBB' в кортеж (r, g, b)."""
    hex_str = hex_str.lstrip('#')
    return (int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16))


def render_chart_svg(
    planets: list[dict],
    cusps: list[float],
    asc: float,
    mc: float,
    width: int = 500,
    height: int = 500,
    aspects: list[dict] | None = None,
) -> str:
    """Сгенерировать SVG-колесо карты.

    Args:
        planets: список {name, longitude, sign, sign_degree, house}
        cusps: 12 куспидов домов
        asc: градус ASC
        mc: градус MC
        width, height: размер SVG
    """
    cx, cy = width / 2, height / 2
    r_outer = min(cx, cy) - 30
    r_signs = r_outer - 25
    r_houses = r_signs - 30
    r_planets = r_houses - 40
    r_inner = 60

    svg = Element("svg", xmlns="http://www.w3.org/2000/svg",
                  width=str(width), height=str(height),
                  viewBox=f"0 0 {width} {height}")

    # Фон
    SubElement(svg, "rect", width=str(width), height=str(height),
               fill="white", stroke="none")

    # Внешний круг
    SubElement(svg, "circle", cx=str(cx), cy=str(cy), r=str(r_outer),
               fill="none", stroke="#333", **{"stroke-width": "2"})

    # Круг знаков
    SubElement(svg, "circle", cx=str(cx), cy=str(cy), r=str(r_signs),
               fill="none", stroke="#333", **{"stroke-width": "1"})

    # Круг домов
    SubElement(svg, "circle", cx=str(cx), cy=str(cy), r=str(r_houses),
               fill="none", stroke="#333", **{"stroke-width": "1"})

    # Внутренний круг
    SubElement(svg, "circle", cx=str(cx), cy=str(cy), r=str(r_inner),
               fill="none", stroke="#333", **{"stroke-width": "1.5"})

    # Сектора знаков (30° каждый)
    for i in range(12):
        angle = _deg_to_rad(i * 30)
        x1 = cx + r_outer * math.cos(angle)
        y1 = cy + r_outer * math.sin(angle)
        x2 = cx + r_signs * math.cos(angle)
        y2 = cy + r_signs * math.sin(angle)
        SubElement(svg, "line", x1=str(x1), y1=str(y1), x2=str(x2), y2=str(y2),
                   stroke="#999", **{"stroke-width": "0.5"})

    # Символы знаков
    for i in range(12):
        mid_angle = _deg_to_rad(i * 30 + 15)
        r_mid = (r_outer + r_signs) / 2
        x = cx + r_mid * math.cos(mid_angle)
        y = cy + r_mid * math.sin(mid_angle)
        SubElement(svg, "text", x=str(x), y=str(y + 5),
                   fill=SIGN_COLORS[i],
                   **{"text-anchor": "middle", "font-size": "14", "font-family": "serif"}).text = SIGNS[i]

    # Куспиды домов
    for i, cusp in enumerate(cusps):
        angle = _deg_to_rad(cusp)
        x1 = cx + r_signs * math.cos(angle)
        y1 = cy + r_signs * math.sin(angle)
        x2 = cx + r_inner * math.cos(angle)
        y2 = cy + r_inner * math.sin(angle)

        # Толстая линия для ASC/MC/IC/DC
        if i in (0, 3, 6, 9):
            SubElement(svg, "line", x1=str(x1), y1=str(y1), x2=str(x2), y2=str(y2),
                       stroke="#333", **{"stroke-width": "2"})
        else:
            SubElement(svg, "line", x1=str(x1), y1=str(y1), x2=str(x2), y2=str(y2),
                       stroke="#666", **{"stroke-width": "0.8", "stroke-dasharray": "4,3"})

        # Номер дома
        next_cusp = cusps[(i + 1) % 12]
        if next_cusp < cusp:
            next_cusp += 360
        mid_cusp = (cusp + next_cusp) / 2 % 360
        mid_angle = _deg_to_rad(mid_cusp)
        r_mid = (r_houses + r_inner) / 2
        hx = cx + r_mid * math.cos(mid_angle)
        hy = cy + r_mid * math.sin(mid_angle)
        SubElement(svg, "text", x=str(hx), y=str(hy + 4),
                   fill="#666",
                   **{"text-anchor": "middle", "font-size": "10"}).text = str(i + 1)

    # ASC/MC метки
    for label, angle_deg, offset in [("ASC", asc, -15), ("MC", mc, -15),
                                      ("DC", (asc + 180) % 360, -15),
                                      ("IC", (mc + 180) % 360, -15)]:
        angle = _deg_to_rad(angle_deg)
        lx = cx + (r_outer + 15) * math.cos(angle)
        ly = cy + (r_outer + 15) * math.sin(angle)
        SubElement(svg, "text", x=str(lx), y=str(ly + 4),
                   fill="#C00",
                   **{"text-anchor": "middle", "font-size": "11", "font-weight": "bold"}).text = label

    # Аспектные линии
    if aspects:
        planet_map = {p["name"]: p["longitude"] for p in planets}
        for asp in aspects:
            p1_name = asp.get("planet1", "")
            p2_name = asp.get("planet2", "")
            asp_type = asp.get("aspect_type", "")
            if p1_name not in planet_map or p2_name not in planet_map:
                continue
            color = ASPECT_COLORS.get(asp_type, "#CCCCCC")
            sw = ASPECT_WIDTHS.get(asp_type, 1)
            angle1 = _deg_to_rad(planet_map[p1_name])
            angle2 = _deg_to_rad(planet_map[p2_name])
            x1 = cx + r_inner * math.cos(angle1)
            y1 = cy + r_inner * math.sin(angle1)
            x2 = cx + r_inner * math.cos(angle2)
            y2 = cy + r_inner * math.sin(angle2)
            SubElement(svg, "line", x1=str(x1), y1=str(y1), x2=str(x2), y2=str(y2),
                       stroke=color, **{"stroke-width": str(sw), "stroke-dasharray": "4,2"})

    # Планеты — размещаем без наложений
    placed = _place_planets(planets, r_planets)

    for p in placed:
        angle = _deg_to_rad(p["longitude"])
        px = cx + p["r"] * math.cos(angle)
        py = cy + p["r"] * math.sin(angle)

        sym = PLANET_SYMBOLS.get(p["name"], p["name"][:2])
        color = "#C00" if p.get("retrograde") else "#000"

        SubElement(svg, "text", x=str(px), y=str(py + 5),
                   fill=color,
                   **{"text-anchor": "middle", "font-size": "13", "font-family": "serif"}).text = sym

    return tostring(svg, encoding="unicode")


def _place_planets(planets: list[dict], base_r: float) -> list[dict]:
    """Разместить планеты без наложений — корректируем радиус."""
    sorted_p = sorted(planets, key=lambda p: p["longitude"])
    result = []
    min_dist = 12  # минимум градусов между планетами

    for i, p in enumerate(sorted_p):
        r = base_r
        # Проверяем близость к предыдущим
        for prev in result:
            diff = abs(p["longitude"] - prev["longitude"])
            if diff > 180:
                diff = 360 - diff
            if diff < min_dist:
                r = prev["r"] - 18  # сдвигаем внутрь
                break
        result.append({**p, "r": r})

    return result


def render_chart_png(planets: list[dict], cusps: list[float], asc: float, mc: float, aspects: list[dict] | None = None) -> bytes:
    """Сгенерировать PNG колеса карты через Pillow."""
    from PIL import Image, ImageDraw, ImageFont

    size = 500
    img = Image.new("RGB", (size, size), "white")
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    r_outer = 220
    r_signs = r_outer - 25
    r_houses = r_signs - 30
    r_planets = r_houses - 40
    r_inner = 50

    # Круги
    for r, width in [(r_outer, 2), (r_signs, 1), (r_houses, 1), (r_inner, 2)]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline="black", width=width)

    # Сектора знаков
    for i in range(12):
        angle = _deg_to_rad(i * 30)
        x1 = int(cx + r_outer * math.cos(angle))
        y1 = int(cy + r_outer * math.sin(angle))
        x2 = int(cx + r_signs * math.cos(angle))
        y2 = int(cy + r_signs * math.sin(angle))
        draw.line([(x1, y1), (x2, y2)], fill="gray", width=1)

    # Символы знаков
    for i in range(12):
        mid_angle = _deg_to_rad(i * 30 + 15)
        r_mid = (r_outer + r_signs) / 2
        x = int(cx + r_mid * math.cos(mid_angle))
        y = int(cy + r_mid * math.sin(mid_angle))
        draw.text((x - 6, y - 8), SIGNS[i], fill=_hex_to_rgb(SIGN_COLORS[i]))

    # Куспиды домов
    for i, cusp in enumerate(cusps):
        angle = _deg_to_rad(cusp)
        x1 = int(cx + r_signs * math.cos(angle))
        y1 = int(cy + r_signs * math.sin(angle))
        x2 = int(cx + r_inner * math.cos(angle))
        y2 = int(cy + r_inner * math.sin(angle))
        w = 2 if i in (0, 3, 6, 9) else 1
        draw.line([(x1, y1), (x2, y2)], fill="black", width=w)

    # Номера домов
    for i in range(12):
        next_cusp = cusps[(i + 1) % 12]
        if next_cusp < cusps[i]:
            next_cusp += 360
        mid_cusp = (cusps[i] + next_cusp) / 2 % 360
        mid_angle = _deg_to_rad(mid_cusp)
        r_mid = (r_houses + r_inner) / 2
        hx = int(cx + r_mid * math.cos(mid_angle))
        hy = int(cy + r_mid * math.sin(mid_angle))
        draw.text((hx - 4, hy - 6), str(i + 1), fill="gray")

    # ASC/MC метки
    for label, angle_deg in [("ASC", asc), ("MC", mc), ("DC", (asc + 180) % 360), ("IC", (mc + 180) % 360)]:
        angle = _deg_to_rad(angle_deg)
        lx = int(cx + (r_outer + 12) * math.cos(angle))
        ly = int(cy + (r_outer + 12) * math.sin(angle))
        draw.text((lx - 10, ly - 6), label, fill="red")

    # Аспектные линии
    if aspects:
        planet_map = {p["name"]: p["longitude"] for p in planets}
        for asp in aspects:
            p1_name = asp.get("planet1", "")
            p2_name = asp.get("planet2", "")
            asp_type = asp.get("aspect_type", "")
            if p1_name not in planet_map or p2_name not in planet_map:
                continue
            color = _hex_to_rgb(ASPECT_COLORS.get(asp_type, "#CCCCCC"))
            w = int(ASPECT_WIDTHS.get(asp_type, 1))
            angle1 = _deg_to_rad(planet_map[p1_name])
            angle2 = _deg_to_rad(planet_map[p2_name])
            x1 = int(cx + r_inner * math.cos(angle1))
            y1 = int(cy + r_inner * math.sin(angle1))
            x2 = int(cx + r_inner * math.cos(angle2))
            y2 = int(cy + r_inner * math.sin(angle2))
            draw.line([(x1, y1), (x2, y2)], fill=color, width=w)

    # Планеты
    placed = _place_planets(planets, r_planets)
    for p in placed:
        angle = _deg_to_rad(p["longitude"])
        px = int(cx + p["r"] * math.cos(angle))
        py = int(cy + p["r"] * math.sin(angle))
        sym = PLANET_SYMBOLS.get(p["name"], p["name"][:2])
        color = "red" if p.get("retrograde") else "black"
        draw.text((px - 6, py - 8), sym, fill=color)

    # Рендер в PNG bytes
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

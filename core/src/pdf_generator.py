"""Генерация PDF-отчётов с солярной картой."""

from __future__ import annotations

import io
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from .ephemeris import PlanetPosition, HouseData, AspectData, PLANET_SYMBOLS, SIGNS
from .solar import SolarChart
from .natal import NatalChart


def _register_fonts() -> None:
    """Регистрация шрифтов с поддержкой кириллицы."""
    # Пытаемся найти DejaVu Sans (обычно доступен в системе)
    font_paths = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/times.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for fp in font_paths:
        if fp.exists():
            try:
                pdfmetrics.registerFont(TTFont("CyrFont", str(fp)))
                return
            except Exception:
                continue
    # Fallback — встроенный шрифт (без кириллицы)


FONT_NAME = "CyrFont"  # будет заменён после регистрации


def generate_pdf_report(
    natal: NatalChart,
    solar: SolarChart | None = None,
    interpretations: list | None = None,
    title: str = "Солярная карта",
) -> bytes:
    """Сгенерировать PDF-отчёт.

    Args:
        natal: Натальная карта
        solar: Солярная карта (опционально)
        interpretations: Список толкований (опционально)
        title: Заголовок отчёта

    Returns:
        PDF-файл в виде bytes
    """
    _register_fonts()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    # Стили для кириллицы
    title_style = ParagraphStyle(
        "CyrTitle",
        parent=styles["Title"],
        fontName=FONT_NAME,
        fontSize=18,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "CyrHeading",
        parent=styles["Heading2"],
        fontName=FONT_NAME,
        fontSize=14,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "CyrBody",
        parent=styles["Normal"],
        fontName=FONT_NAME,
        fontSize=10,
        spaceAfter=6,
    )

    elements = []

    # Заголовок
    elements.append(Paragraph(title, title_style))
    elements.append(Spacer(1, 8 * mm))

    # Данные рождения
    elements.append(Paragraph("Данные рождения", heading_style))
    birth_info = [
        ["Дата:", natal.birth_date],
        ["Время:", natal.birth_time],
        ["Координаты:", f"{natal.latitude:.4f}, {natal.longitude:.4f}"],
        ["Часовой пояс:", f"UTC{'+' if natal.tz_offset_hours >= 0 else ''}{natal.tz_offset_hours:.1f}"],
        ["Система домов:", natal.house_system],
    ]
    birth_table = Table(birth_info, colWidths=[40 * mm, 100 * mm])
    birth_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
        ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(birth_table)
    elements.append(Spacer(1, 8 * mm))

    # Таблица планет натала
    elements.append(Paragraph("Позиции планет (натальная карта)", heading_style))
    elements.append(_build_planet_table(natal.planets, body_style))
    elements.append(Spacer(1, 6 * mm))

    # Таблица домов натала
    if natal.houses:
        elements.append(Paragraph("Дома (натальная карта)", heading_style))
        elements.append(_build_house_table(natal.houses, body_style))
        elements.append(Spacer(1, 6 * mm))

    # Солярная карта
    if solar:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph(f"Солярная карта на {solar.year} год", heading_style))
        elements.append(Paragraph(
            f"Момент соляра: {solar.solar_datetime_utc}<br/>"
            f"Координаты: {solar.latitude:.4f}, {solar.longitude:.4f}",
            body_style,
        ))
        elements.append(Spacer(1, 4 * mm))

        elements.append(Paragraph("Позиции планет (соляр)", heading_style))
        elements.append(_build_planet_table(solar.planets, body_style))
        elements.append(Spacer(1, 6 * mm))

        if solar.houses:
            elements.append(Paragraph("Дома (соляр)", heading_style))
            elements.append(_build_house_table(solar.houses, body_style))
            elements.append(Spacer(1, 6 * mm))

    # Толкования
    if interpretations:
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph("Толкования", heading_style))
        for interp in interpretations:
            planet_name = interp.planet if hasattr(interp, "planet") else interp.get("planet", "")
            planet_sym = PLANET_SYMBOLS.get(planet_name, "")
            text = interp.text if hasattr(interp, "text") else interp.get("text", "")
            house = interp.house if hasattr(interp, "house") else interp.get("house", "")
            elements.append(Paragraph(
                f"<b>{planet_sym} {planet_name.capitalize()} в {house}-м доме:</b> {text}",
                body_style,
            ))

    # Дисклеймер
    elements.append(Spacer(1, 10 * mm))
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=body_style,
        fontSize=8,
        textColor=colors.grey,
        alignment=1,  # CENTER
    )
    elements.append(Paragraph(
        "Данный отчёт носит эвристический характер и не является научно доказанным методом предсказания. "
        "Используйте как инструмент для самопознания и рефлексии.",
        disclaimer_style,
    ))

    doc.build(elements)
    return buffer.getvalue()


def _build_planet_table(planets: list[PlanetPosition], style) -> Table:
    """Построить таблицу планет."""
    header = ["Планета", "Знак", "Градус", "Дом", "Ретро"]
    data = [header]

    main_planets = [p for p in planets if p.name in (
        "sun", "moon", "mercury", "venus", "mars",
        "jupiter", "saturn", "uranus", "neptune", "pluto",
        "true_node", "chiron", "lilith",
    )]

    for p in main_planets:
        retro = "Rx" if p.retrograde else ""
        house_str = str(p.house) if p.house else "—"
        degree_str = f"{p.sign_degree}°{p.sign_minute:02d}'{p.sign_second:02d}\""
        data.append([
            f"{p.symbol} {p.name.capitalize()}",
            p.sign,
            degree_str,
            house_str,
            retro,
        ])

    table = Table(data, colWidths=[35 * mm, 30 * mm, 25 * mm, 15 * mm, 15 * mm])
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _build_house_table(houses: HouseData, style) -> Table:
    """Построить таблицу домов."""
    header = ["Дом", "Градус", "Знак"]
    data = [header]

    for i, cusp in enumerate(houses.cusps):
        sign_idx = int(cusp / 30) % 12
        sign = SIGNS[sign_idx]
        degree = cusp % 30
        d = int(degree)
        m = int((degree - d) * 60)
        data.append([f"{i + 1}", f"{d}°{m:02d}'", sign])

    # Добавляем ASC и MC
    data.append(["ASC", f"{int(houses.asc % 30)}°{int((houses.asc % 30 - int(houses.asc % 30)) * 60):02d}'", SIGNS[int(houses.asc / 30) % 12]])
    data.append(["MC", f"{int(houses.mc % 30)}°{int((houses.mc % 30 - int(houses.mc % 30)) * 60):02d}'", SIGNS[int(houses.mc / 30) % 12]])

    table = Table(data, colWidths=[20 * mm, 30 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), FONT_NAME),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table

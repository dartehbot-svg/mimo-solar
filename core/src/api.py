"""FastAPI REST-сервер — точка входа для desktop и MAX-бота."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import ephemeris
from .natal import calculate_natal
from .solar import calculate_solar_chart, overlay_solar_on_natal
from .best_place import find_best_places
from .interpretation import get_full_report
from .pdf_generator import generate_pdf_report
from .chart_renderer import render_chart_png

# Путь к эфемеридам
SWE_PATH = Path(__file__).parent.parent.parent / "swe"

app = FastAPI(
    title="Solar Core API",
    description="Расчётное ядро для построения солярных карт",
    version="0.1.0",
)


@app.on_event("startup")
async def startup():
    """Инициализация Swiss Ephemeris при старте."""
    ephemeris.init_ephe(SWE_PATH)


# ── Модели запросов ──────────────────────────────────────────────


class NatalRequest(BaseModel):
    birth_date: str = Field(..., description="Дата рождения YYYY-MM-DD", examples=["1990-03-15"])
    birth_time: str = Field(..., description="Время рождения HH:MM", examples=["14:30"])
    latitude: float = Field(..., description="Широта места рождения", examples=[55.7558])
    longitude: float = Field(..., description="Долгота места рождения", examples=[37.6173])
    house_system: str = Field("P", description="Система домов: P=Placidus, K=Koch, E=Equal, O=Porphyry")


class SolarRequest(BaseModel):
    natal: NatalRequest
    year: int = Field(..., description="Год соляра", examples=[2026])
    latitude: float = Field(..., description="Широта места встречи дня рождения")
    longitude: float = Field(..., description="Долгота места встречи дня рождения")
    house_system: str = Field("P")


class BestPlaceRequest(BaseModel):
    natal: NatalRequest
    year: int
    spheres: list[str] = Field(..., description="Целевые сферы: career, love, health, finance, ...")
    city_names: list[str] | None = Field(None, description="Список городов для проверки")
    visa_free_only: bool = Field(False, description="Только города без визы для РФ")
    top_n: int = Field(10, description="Количество лучших результатов")


class PdfRequest(BaseModel):
    natal: NatalRequest
    year: int | None = Field(None, description="Год соляра (если нужен солярный отчёт)")
    latitude: float | None = Field(None, description="Широта места встречи дня рождения")
    longitude: float | None = Field(None, description="Долгота места встречи дня рождения")
    mode: Literal["short", "full"] = Field("full", description="Детализация толкований")


# ── Модели ответов ───────────────────────────────────────────────


class PlanetResponse(BaseModel):
    name: str
    longitude: float
    latitude: float
    speed: float
    sign: str
    sign_degree: int
    sign_minute: int
    sign_second: int
    house: int | None
    retrograde: bool
    symbol: str


class AspectResponse(BaseModel):
    planet1: str
    planet2: str
    aspect_type: str
    angle: float
    orb: float
    exact: bool


class NatalResponse(BaseModel):
    birth_date: str
    birth_time: str
    latitude: float
    longitude: float
    tz_offset_hours: float
    jd_ut: float
    planets: list[PlanetResponse]
    houses: list[float]
    asc: float
    mc: float
    aspects: list[AspectResponse]
    house_system: str


class SolarResponse(BaseModel):
    year: int
    solar_datetime_utc: str
    latitude: float
    longitude: float
    planets: list[PlanetResponse]
    houses: list[float]
    asc: float
    mc: float
    aspects: list[AspectResponse]
    overlay: dict[str, int]


class BestPlaceResponse(BaseModel):
    results: list[dict]
    sphere: str
    year: int


# ── Эндпоинты ────────────────────────────────────────────────────


def _planet_to_response(p: ephemeris.PlanetPosition) -> PlanetResponse:
    return PlanetResponse(
        name=p.name, longitude=p.longitude, latitude=p.latitude,
        speed=p.speed, sign=p.sign, sign_degree=p.sign_degree,
        sign_minute=p.sign_minute, sign_second=p.sign_second,
        house=p.house, retrograde=p.retrograde, symbol=p.symbol,
    )


def _aspect_to_response(a: ephemeris.AspectData) -> AspectResponse:
    return AspectResponse(
        planet1=a.planet1, planet2=a.planet2,
        aspect_type=a.aspect_type, angle=a.angle,
        orb=a.orb, exact=a.exact,
    )


@app.post("/api/natal", response_model=NatalResponse)
async def api_natal(req: NatalRequest):
    """Рассчитать натальную карту."""
    try:
        natal = calculate_natal(
            req.birth_date, req.birth_time,
            req.latitude, req.longitude, req.house_system,
        )
        return NatalResponse(
            birth_date=natal.birth_date,
            birth_time=natal.birth_time,
            latitude=natal.latitude,
            longitude=natal.longitude,
            tz_offset_hours=natal.tz_offset_hours,
            jd_ut=natal.jd_ut,
            planets=[_planet_to_response(p) for p in natal.planets],
            houses=natal.houses.cusps if natal.houses else [],
            asc=natal.houses.asc if natal.houses else 0,
            mc=natal.houses.mc if natal.houses else 0,
            aspects=[_aspect_to_response(a) for a in natal.aspects],
            house_system=natal.house_system,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/solar", response_model=SolarResponse)
async def api_solar(req: SolarRequest):
    """Рассчитать солярную карту."""
    try:
        natal = calculate_natal(
            req.natal.birth_date, req.natal.birth_time,
            req.natal.latitude, req.natal.longitude, req.natal.house_system,
        )
        solar = calculate_solar_chart(
            natal, req.year, req.latitude, req.longitude, req.house_system,
        )
        overlay = overlay_solar_on_natal(solar, natal)

        return SolarResponse(
            year=solar.year,
            solar_datetime_utc=solar.solar_datetime_utc,
            latitude=solar.latitude,
            longitude=solar.longitude,
            planets=[_planet_to_response(p) for p in solar.planets],
            houses=solar.houses.cusps if solar.houses else [],
            asc=solar.houses.asc if solar.houses else 0,
            mc=solar.houses.mc if solar.houses else 0,
            aspects=[_aspect_to_response(a) for a in solar.aspects],
            overlay=overlay.solar_planets_in_natal_houses,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/best-place", response_model=BestPlaceResponse)
async def api_best_place(req: BestPlaceRequest):
    """Найти лучшие места для встречи дня рождения."""
    try:
        natal = calculate_natal(
            req.natal.birth_date, req.natal.birth_time,
            req.natal.latitude, req.natal.longitude, req.natal.house_system,
        )
        result = find_best_places(
            natal, req.year, req.spheres,
            city_names=req.city_names,
            visa_free_only=req.visa_free_only,
            top_n=req.top_n,
        )
        return BestPlaceResponse(
            results=[
                {
                    "city": r.city_name,
                    "country": r.country,
                    "score": r.score,
                    "details": r.details,
                }
                for r in result.results
            ],
            sphere=result.sphere,
            year=result.year,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/generate-pdf")
async def api_generate_pdf(req: PdfRequest):
    """Сгенерировать PDF-отчёт."""
    try:
        natal = calculate_natal(
            req.natal.birth_date, req.natal.birth_time,
            req.natal.latitude, req.natal.longitude, req.natal.house_system,
        )
        solar = None
        if req.year and req.latitude and req.longitude:
            solar = calculate_solar_chart(
                natal, req.year, req.latitude, req.longitude,
            )

        # Собираем толкования
        chart = solar if solar else natal
        interpretations = get_full_report(chart.planets, mode=req.mode)

        pdf_bytes = generate_pdf_report(
            natal=natal,
            solar=solar,
            interpretations=interpretations,
            title=f"Солярная карта {req.year}" if solar else "Натальная карта",
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=solar_report.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/cities")
async def api_cities():
    """Получить список доступных городов."""
    import json
    cities_path = Path(__file__).parent.parent / "data" / "cities.json"
    if not cities_path.exists():
        return []
    with open(cities_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/health")
async def health():
    """Проверка работоспособности сервера."""
    return {"status": "ok", "version": "0.1.0"}


class ChartImageRequest(BaseModel):
    birth_date: str
    birth_time: str
    latitude: float
    longitude: float
    house_system: str = "P"
    year: int | None = None
    solar_latitude: float | None = None
    solar_longitude: float | None = None


@app.post("/api/chart-image")
async def api_chart_image(req: ChartImageRequest):
    """Сгенерировать PNG колеса карты."""
    try:
        natal = calculate_natal(
            req.birth_date, req.birth_time,
            req.latitude, req.longitude, req.house_system,
        )

        if req.year and req.solar_latitude and req.solar_longitude:
            solar = calculate_solar_chart(
                natal, req.year, req.solar_latitude, req.solar_longitude, req.house_system,
            )
            chart = solar
        else:
            chart = natal

        planets_data = [
            {
                "name": p.name,
                "longitude": p.longitude,
                "retrograde": p.retrograde,
            }
            for p in chart.planets
        ]

        png_bytes = render_chart_png(
            planets=planets_data,
            cusps=chart.houses.cusps,
            asc=chart.houses.asc,
            mc=chart.houses.mc,
        )

        return Response(
            content=png_bytes,
            media_type="image/png",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

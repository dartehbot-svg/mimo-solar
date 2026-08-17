"""Тесты для модуля database.py."""

import pytest
from src.database import (
    init_db, upsert_user, get_user,
    create_profile, get_profiles, get_profile, update_profile, delete_profile,
    add_history, get_history, get_last_action,
)


@pytest.fixture(autouse=True)
async def setup_db(tmp_path, monkeypatch):
    """Создаём временную БД для каждого теста."""
    import src.database as db_mod
    test_db = tmp_path / "test.db"
    monkeypatch.setattr(db_mod, "DB_PATH", test_db)
    await init_db()
    yield


async def _ensure_user(user_id=12345):
    await upsert_user(user_id, name="Тест")


async def test_upsert_user_new():
    user = await upsert_user(12345, name="Тест", username="test_user")
    assert user["user_id"] == 12345
    assert user["name"] == "Тест"


async def test_upsert_user_update():
    await upsert_user(12345, name="Старое имя")
    await upsert_user(12345, name="Новое имя")
    user = await get_user(12345)
    assert user["name"] == "Новое имя"


async def test_get_user_not_found():
    user = await get_user(99999)
    assert user is None


async def test_create_profile():
    await _ensure_user()
    profile = await create_profile(
        12345, label="Мой профиль",
        birth_date="1990-03-15", birth_time="14:30",
        latitude=55.75, longitude=37.62, city_name="Москва",
    )
    assert profile["label"] == "Мой профиль"
    assert profile["birth_date"] == "1990-03-15"
    assert profile["city_name"] == "Москва"


async def test_get_profiles():
    await _ensure_user()
    await create_profile(12345, label="Я")
    await create_profile(12345, label="Мама")
    profiles = await get_profiles(12345)
    assert len(profiles) == 2
    assert profiles[0]["label"] == "Я"
    assert profiles[1]["label"] == "Мама"


async def test_update_profile():
    await _ensure_user()
    profile = await create_profile(12345, label="Старое")
    updated = await update_profile(profile["id"], label="Новое", city_name="Сочи")
    assert updated["label"] == "Новое"
    assert updated["city_name"] == "Сочи"


async def test_delete_profile():
    await _ensure_user()
    profile = await create_profile(12345, label="Удалить")
    result = await delete_profile(profile["id"])
    assert result is True
    assert await get_profile(profile["id"]) is None


async def test_add_and_get_history():
    await _ensure_user()
    await add_history(12345, "natal", request_data={"date": "1990-03-15"}, response_data={"planets": 10})
    history = await get_history(12345)
    assert len(history) == 1
    assert history[0]["action"] == "natal"
    assert history[0]["request"]["date"] == "1990-03-15"


async def test_get_last_action():
    await _ensure_user()
    await add_history(12345, "natal")
    await add_history(12345, "solar")
    last = await get_last_action(12345, "natal")
    assert last["action"] == "natal"


async def test_history_limit():
    await _ensure_user()
    for i in range(5):
        await add_history(12345, f"action_{i}")
    history = await get_history(12345, limit=3)
    assert len(history) == 3


async def test_history_with_profile():
    await _ensure_user()
    profile = await create_profile(12345, label="Я")
    await add_history(12345, "natal", profile_id=profile["id"])
    history = await get_history(12345)
    assert history[0]["profile_label"] == "Я"

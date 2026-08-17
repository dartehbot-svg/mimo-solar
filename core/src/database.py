"""SQLite база данных для хранения пользователей, профилей и истории."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).parent.parent / "data" / "solar.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    name TEXT,
    phone TEXT,
    username TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    label TEXT NOT NULL DEFAULT 'Мой профиль',
    birth_date TEXT,
    birth_time TEXT,
    latitude REAL,
    longitude REAL,
    city_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    profile_id INTEGER,
    action TEXT NOT NULL,
    request_json TEXT,
    response_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
"""


async def get_db() -> aiosqlite.Connection:
    """Открыть соединение с базой данных."""
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db() -> None:
    """Создать таблицы, если их нет."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = await get_db()
    try:
        await db.executescript(SCHEMA)
        await db.commit()
    finally:
        await db.close()


# ── Пользователи ──────────────────────────────────────────────────


async def upsert_user(
    user_id: int,
    name: str | None = None,
    phone: str | None = None,
    username: str | None = None,
) -> dict:
    """Создать или обновить пользователя. Возвращает данные пользователя."""
    db = await get_db()
    try:
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """
            INSERT INTO users (user_id, name, phone, username, created_at, last_seen)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name = COALESCE(excluded.name, users.name),
                phone = COALESCE(excluded.phone, users.phone),
                username = COALESCE(excluded.username, users.username),
                last_seen = excluded.last_seen
            """,
            (user_id, name, phone, username, now, now),
        )
        await db.commit()
        row = await db.execute_fetchall(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        )
        return dict(row[0]) if row else {"user_id": user_id}
    finally:
        await db.close()


async def get_user(user_id: int) -> dict | None:
    """Получить пользователя по ID."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM users WHERE user_id = ?", (user_id,)
        )
        return dict(rows[0]) if rows else None
    finally:
        await db.close()


# ── Профили ───────────────────────────────────────────────────────


async def create_profile(
    user_id: int,
    label: str = "Мой профиль",
    birth_date: str | None = None,
    birth_time: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    city_name: str | None = None,
) -> dict:
    """Создать профиль для пользователя."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """
            INSERT INTO profiles (user_id, label, birth_date, birth_time, latitude, longitude, city_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, label, birth_date, birth_time, latitude, longitude, city_name),
        )
        await db.commit()
        profile_id = cursor.lastrowid
        rows = await db.execute_fetchall(
            "SELECT * FROM profiles WHERE id = ?", (profile_id,)
        )
        return dict(rows[0]) if rows else {"id": profile_id}
    finally:
        await db.close()


async def get_profiles(user_id: int) -> list[dict]:
    """Получить все профили пользователя."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM profiles WHERE user_id = ? ORDER BY id", (user_id,)
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def get_profile(profile_id: int) -> dict | None:
    """Получить профиль по ID."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT * FROM profiles WHERE id = ?", (profile_id,)
        )
        return dict(rows[0]) if rows else None
    finally:
        await db.close()


async def update_profile(profile_id: int, **fields) -> dict | None:
    """Обновить поля профиля."""
    if not fields:
        return await get_profile(profile_id)
    allowed = {"label", "birth_date", "birth_time", "latitude", "longitude", "city_name"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return await get_profile(profile_id)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [profile_id]
    db = await get_db()
    try:
        await db.execute(
            f"UPDATE profiles SET {set_clause} WHERE id = ?", values
        )
        await db.commit()
        return await get_profile(profile_id)
    finally:
        await db.close()


async def delete_profile(profile_id: int) -> bool:
    """Удалить профиль."""
    db = await get_db()
    try:
        cursor = await db.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


# ── История ───────────────────────────────────────────────────────


async def add_history(
    user_id: int,
    action: str,
    profile_id: int | None = None,
    request_data: dict | None = None,
    response_data: dict | None = None,
) -> int:
    """Записать действие в историю. Возвращает ID записи."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """
            INSERT INTO history (user_id, profile_id, action, request_json, response_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                profile_id,
                action,
                json.dumps(request_data, ensure_ascii=False) if request_data else None,
                json.dumps(response_data, ensure_ascii=False) if response_data else None,
            ),
        )
        await db.commit()
        return cursor.lastrowid  # type: ignore[return-value]
    finally:
        await db.close()


async def get_history(user_id: int, limit: int = 20) -> list[dict]:
    """Получить историю пользователя."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            """
            SELECT h.*, p.label as profile_label
            FROM history h
            LEFT JOIN profiles p ON h.profile_id = p.id
            WHERE h.user_id = ?
            ORDER BY h.created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        )
        result = []
        for r in rows:
            d = dict(r)
            if d.get("request_json"):
                d["request"] = json.loads(d["request_json"])
            if d.get("response_json"):
                d["response"] = json.loads(d["response_json"])
            d.pop("request_json", None)
            d.pop("response_json", None)
            result.append(d)
        return result
    finally:
        await db.close()


async def get_last_action(user_id: int, action: str | None = None) -> dict | None:
    """Получить последнее действие пользователя (опционально по типу)."""
    db = await get_db()
    try:
        if action:
            rows = await db.execute_fetchall(
                """
                SELECT h.*, p.label as profile_label
                FROM history h
                LEFT JOIN profiles p ON h.profile_id = p.id
                WHERE h.user_id = ? AND h.action = ?
                ORDER BY h.created_at DESC LIMIT 1
                """,
                (user_id, action),
            )
        else:
            rows = await db.execute_fetchall(
                """
                SELECT h.*, p.label as profile_label
                FROM history h
                LEFT JOIN profiles p ON h.profile_id = p.id
                WHERE h.user_id = ?
                ORDER BY h.created_at DESC LIMIT 1
                """,
                (user_id,),
            )
        if rows:
            d = dict(rows[0])
            if d.get("request_json"):
                d["request"] = json.loads(d["request_json"])
            if d.get("response_json"):
                d["response"] = json.loads(d["response_json"])
            d.pop("request_json", None)
            d.pop("response_json", None)
            return d
        return None
    finally:
        await db.close()

# Инструкция по запуску и использованию

## Обзор проекта

Проект «Солярная карта» состоит из трёх модулей:

| Модуль | Папка | Технология | Статус |
|--------|-------|------------|--------|
| Расчётное ядро | `core/` | Python + pyswisseph + FastAPI | Работает, 46 тестов |
| MAX-бот | `bot/` | Node.js + TypeScript + @maxhub/max-bot-api | Работает |
| Desktop-приложение | `desktop/` | Electron + React + TypeScript | Работает |

### Что работает
- Расчёт натальной карты (позиции планет, дома Плацидуса/Коха, аспекты)
- Расчёт солярного возвращения (точный момент, релокация)
- Наложение соляра на натал
- Поиск лучшего места (скоринг 167 городов по сферам)
- Фильтры поиска: по странам, по часовому поясу, только безвизовые
- База толкований: 120 planet-in-house (short + full) + 144 house-in-sign (все 12 домов × 12 знаков)
- REST API с эндпоинтами: natal, solar, best-place, generate-pdf, chart-image, cities, cities/search, health
- API для пользователей: users/register, users/{id}, users/{id}/profiles, profiles, history
- SQLite база данных (пользователи, профили, история расчётов)
- Генерация PDF-отчётов
- Desktop UI с 4 страницами + визуализация колеса карты (astrochart)
- MAX-бот: команды /start, /natal, /solar, /bestplace, /profile, /history, /help
- MAX-бот: идентификация пользователя, история расчётов, профили, автодополнение городов
- MAX-бот: гибкий парсинг дат (точки, запятые, пробелы, неполный год)
- Генерация PNG колеса карты с аспектными линиями (цвета по типу аспекта)
- Панель мониторинга (dashboard) с управлением через PM2
- Скрипты автообновлений через GitHub Releases

### Что нужно доделать
- LLM-интеграция для персонализированных прогнозов (Мимо)
- Webhook для MAX-бота (нужен домен с HTTPS)
- Система подписок и монетизации
- Автообновления desktop через GitHub Releases

---

## Требования

- **Python 3.11+** — для расчётного ядра
- **Node.js 20+** — для бота и desktop
- **Visual C++ Build Tools** — для компиляции pyswisseph (уже установлены)
- **npm** — для установки зависимостей Node.js

---

## Подготовка

### 1. Установка зависимостей Python (ядро)

```bash
cd H:\mimo_solar\core
pip install pyswisseph fastapi uvicorn pydantic timezonefinder reportlab pytest httpx
```

Если pyswisseph не ставится (ошибка MSVC):
```bash
# Открыть Developer Command Prompt для VS 2022 и выполнить:
pip install pyswisseph
```

### 2. Установка зависимостей Node.js (бот)

```bash
cd H:\mimo_solar\bot
npm install
```

### 3. Установка зависимостей Node.js (desktop)

```bash
cd H:\mimo_solar\desktop
npm install
```

---

## Запуск

### Вариант 1: Только ядро (API-сервер)

Запускает REST API на `http://127.0.0.1:8000`. Нужен для бота и desktop.

```bash
cd H:\mimo_solar\core
python -m uvicorn src.api:app --host 127.0.0.1 --port 8000 --reload
```

После запуска:
- API документация: http://127.0.0.1:8000/docs
- Проверка здоровья: http://127.0.0.1:8000/api/health

### Вариант 2: MAX-бот

Сначала убедитесь, что ядро запущено (Вариант 1), затем:

```bash
cd H:\mimo_solar\bot
npm run dev
```

Бот подключится к MAX через Long Polling (для разработки).

Для продакшна (нужен домен с HTTPS):
```bash
# В .env добавить:
# WEBHOOK_URL=https://your-domain.com/webhook
npm run start
```

### Вариант 3: Desktop-приложение

Сначала убедитесь, что ядро запущено (Вариант 1), затем:

```bash
cd H:\mimo_solar\desktop
npm run dev
```

Приложение автоматически:
1. Запустит Python core API на порту 18765
2. Откроет окно Electron с UI

### Вариант 4: Всё вместе

Откройте 3 терминала:

**Терминал 1 — Ядро:**
```bash
cd H:\mimo_solar\core
python -m uvicorn src.api:app --host 127.0.0.1 --port 8000
```

**Терминал 2 — Бот:**
```bash
cd H:\mimo_solar\bot
npm run dev
```

**Терминал 3 — Desktop:**
```bash
cd H:\mimo_solar\desktop
npm run dev
```

---

## Тесты

Запуск всех тестов расчётного ядра:

```bash
cd H:\mimo_solar\core
python -m pytest tests/ -v
```

Ожидаемый результат: 46 passed (27 расчётных + 11 БД + 8 chart_renderer).

Запуск конкретного файла тестов:

```bash
python -m pytest tests/test_ephemeris.py -v
python -m pytest tests/test_natal.py -v
python -m pytest tests/test_solar.py -v
```

---

## API-эндпоинты

Ядро предоставляет REST API. Все запросы — POST с JSON body.

### POST /api/natal
Расчёт натальной карты.

```json
{
  "birth_date": "1990-03-15",
  "birth_time": "14:30",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "house_system": "P"
}
```

Ответ: позиции планет, дома, аспекты, ASC, MC.

### POST /api/solar
Расчёт солярной карты.

```json
{
  "natal": {
    "birth_date": "1990-03-15",
    "birth_time": "14:30",
    "latitude": 55.7558,
    "longitude": 37.6173
  },
  "year": 2026,
  "latitude": 55.7558,
  "longitude": 37.6173
}
```

### POST /api/best-place
Поиск лучшего места для встречи дня рождения.

```json
{
  "natal": { "birth_date": "1990-03-15", "birth_time": "14:30", "latitude": 55.7558, "longitude": 37.6173 },
  "year": 2026,
  "spheres": ["career", "love"],
  "visa_free_only": true,
  "top_n": 10
}
```

### POST /api/generate-pdf
Генерация PDF-отчёта. Возвращает PDF-файл.

### GET /api/cities
Список всех городов из справочника (68 городов).

### POST /api/chart-image
Генерация PNG колеса карты. Принимает те же параметры что и /api/natal, возвращает PNG.

### GET /api/cities/search?q=...
Поиск городов по подстроке (название или страна).

### POST /api/users/register
Регистрация/обновление пользователя. Принимает: user_id, name, phone, username.

### GET /api/users/{user_id}
Получить данные пользователя.

### GET /api/users/{user_id}/profiles
Получить все профили пользователя.

### POST /api/profiles
Создать профиль (user_id, label, birth_date, birth_time, lat, lon, city_name).

### PUT /api/profiles/{profile_id}
Обновить профиль.

### DELETE /api/profiles/{profile_id}
Удалить профиль.

### POST /api/history
Записать действие в историю (user_id, action, profile_id, request_data, response_data).

### GET /api/history/{user_id}?limit=20
Получить историю расчётов пользователя.

### GET /api/health
Проверка работоспособности сервера.

---

## Команды MAX-бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие, начало работы (регистрирует пользователя) |
| `/natal` | Расчёт натальной карты |
| `/solar` | Расчёт солярной карты на год |
| `/bestplace` | Лучшее место для встречи дня рождения |
| `/profile` | Просмотр сохранённых профилей |
| `/profile_add` | Добавить профиль (формат: /profile_add Имя ДД.ММ.ГГГГ ЧЧ:ММ Город) |
| `/history` | История расчётов |
| `/help` | Справка |

### Кнопки (после расчёта)
После расчёта натала/соляра бот показывает кнопки:
- **Натальная карта** — пересчитать натал
- **Соляр** — расчёт соляра на текущий год
- **Колесо карты** — генерация PNG колеса
- **Лучшее место** — поиск лучшего города
- **Соляр на другой год** — ввести год вручную

### Диалоговый сценарий

1. `/natal` или `/solar` → ввести дату (ДД.ММ.ГГГГ)
2. → ввести время (ЧЧ:ММ или "не знаю")
3. → выбрать город рождения
4. → получить результат + кнопки
5. Нажать кнопку для следующего действия

### Поддерживаемые города (в боте)

Бот поддерживает автодополнение по базе из 167 городов. Пользователь начинает вводить название — бот показывает совпадающие варианты. Основные направления: Россия (18 городов), Турция (8), Таиланд (6), Вьетнам (5), ОАЭ (2), Египет (5), Грузия (2), Европа (25+), Азия (30+), Америка (15+), Африка (10+).

---

## Структура проекта

```
mimo_solar/
├── .env                    # Токен MAX-бота (НЕ коммитить!)
├── .gitignore
├── README.md
├── INSTRUCTIONS.md         # Этот файл
│
├── core/                   # Python — расчётное ядро
│   ├── src/
│   │   ├── ephemeris.py    # Обёртка pyswisseph (планеты, дома, аспекты)
│   │   ├── natal.py        # Расчёт натальной карты
│   │   ├── solar.py        # Поиск момента соляра, релокация
│   │   ├── scoring.py      # Скоринг городов
│   │   ├── best_place.py   # Поиск лучшего места
│   │   ├── interpretation.py # Толкования
│   │   ├── database.py      # SQLite: пользователи, профили, история
│   │   ├── pdf_generator.py # PDF-отчёты
│   │   ├── chart_renderer.py # PNG колеса карты (Pillow)
│   │   ├── timezone_utils.py # Часовые пояса
│   │   └── api.py          # FastAPI REST-сервер
│   ├── data/
│   │   ├── cities.json     # 68 городов с координатами
│   │   └── interpretations.json # Толкования, веса, маппинги
│   ├── tests/              # 38 тестов (эфемериды, натал, соляр, БД)
│   └── pyproject.toml
│
├── bot/                    # MAX-бот
│   ├── src/
│   │   ├── index.ts        # Точка входа, обработчики команд
│   │   ├── bot.ts          # Диалоговый сценарий, вызов API
│   │   ├── api.ts          # Клиент для Core API (пользователи, профили, расчёты)
│   │   └── state.ts        # Менеджер состояний пользователей
│   ├── package.json
│   └── tsconfig.json
│
├── desktop/                # Electron-приложение
│   ├── src/
│   │   ├── main/index.ts   # Main process (Electron)
│   │   ├── preload/index.ts # Preload script (IPC bridge)
│   │   └── renderer/       # React UI
│   │       ├── App.tsx     # Главная страница с навигацией
│   │       ├── pages/
│   │       │   ├── NatalChart.tsx   # Натальная карта
│   │       │   ├── SolarChart.tsx   # Соляр
│   │       │   ├── BestPlace.tsx    # Лучшее место
│   │       │   └── Settings.tsx     # Настройки
│   │       └── components/
│   │           ├── PlanetTable.tsx  # Таблица планет
│   │           └── ChartWheel.tsx   # SVG-визуализация колеса карты
│   ├── electron.vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
└── swe/                    # Swiss Ephemeris данные
    ├── sepl_18.se1         # Планеты
    ├── semo_18.se1         # Луна
    ├── seas_18.se1         # Астероиды
    ├── fixstars.cat        # Неподвижные звёзды
    └── swedll32.dll        # DLL (32-bit, не используется напрямую)
```

---

## Переменные окружения

Файл `.env` в корне проекта:

```
BOT_TOKEN=ваш_токен_бота
```

- Токен получается от @masterbot в MAX
- Никогда не коммитить `.env` в git (файл уже в .gitignore)

---

## Устранение неполадок

### pyswisseph не устанавливается
```
error: Microsoft Visual C++ 14.0 or greater is required
```
Решение: Visual C++ Build Tools уже установлены. Запустите установку из Developer Command Prompt:
```cmd
"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
pip install pyswisseph
```

### Ошибка «SwissEph file not found»
Файлы эфемерид не найдены. Проверьте, что папка `swe/` существует и содержит `sepl_18.se1`, `semo_18.se1`, `seas_18.se1`.

### Desktop не запускается
Убедитесь, что:
1. `npm install` выполнен в папке `desktop/`
2. Python доступен в PATH (нужен для автозапуска core API)

### Бот не подключается к MAX (ошибка SSL)
Если в консоли: `Ошибка проверки токена: fetch failed` — это проблема с SSL на Windows.

Решение уже встроено в код бота (`bot/src/index.ts`):
```typescript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

Если помогает — проблема в сертификатах Windows. В продакшне нужно настроить сертификаты правильно.

### Бот не отвечает на сообщения
1. Убедитесь, что ядро запущено (порт 8000)
2. В консоли бота должны быть логи `[msg] user=... text=...`
3. Если логов нет — проблема с polling, перезапустите бота
4. Если логи есть, но нет ответа — проверьте консоль на ошибки API

### Кнопки не работают (сфера = undefined)
В MAX Bot API `bot.action(regex, handler)` — match доступен через `ctx.match`, а не вторым аргументом:
```typescript
// Неправильно:
bot.action(/sphere:(.+)/, (ctx, match) => { const sphere = match[1]; });
// Правильно:
bot.action(/sphere:(.+)/, (ctx) => { const sphere = ctx.match[1]; });
```

### Desktop показывает ошибку API
Убедитесь, что ядро запущено на порту 8000:
```bash
curl http://127.0.0.1:8000/api/health
```
Должен вернуть: `{"status":"ok","version":"0.1.0"}`

---

## Горячие клавиши Desktop

- `Ctrl+R` — перезагрузить страницу
- `Ctrl+Shift+I` — открыть DevTools
- `Ctrl+Q` — выйти

---

## Сборка для распространения

### Desktop (Electron)
```bash
cd H:\mimo_solar\desktop
npm run build
```
Результат: установщик в папке `desktop/release/`.

### Бот (продакшн)
```bash
cd H:\mimo_solar\bot
npm run build
npm run start
```

---

## Развёртывание на Mac mini

### Подготовка

1. Установить Python 3.11+ и Node.js 20+ на Mac mini.
2. Установить PM2: `npm install -g pm2`
3. Склонировать проект в `~/solar/`:
   ```bash
   git clone <repo-url> ~/solar
   cd ~/solar
   ```

### Установка зависимостей

```bash
# Ядро (Python)
cd ~/solar/core
pip3 install pyswisseph fastapi uvicorn pydantic timezonefinder reportlab

# Бот (Node.js)
cd ~/solar/bot
npm install
npm run build

# Панель мониторинга
cd ~/solar/dashboard
npm install
```

### Настройка окружения

Создать файл `~/solar/.env`:
```
BOT_TOKEN=ваш_токен_бота
GITHUB_OWNER=ваш_владелец_репозитория
GITHUB_REPO=ваш_репозиторий
```

### Запуск через PM2

```bash
cd ~/solar
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # автозапуск при загрузке Mac mini
```

Проверить статус: `pm2 status`
Логи: `pm2 logs` или `pm2 logs core` / `pm2 logs bot`

### Панель мониторинга

Открыть в браузере: `http://<ip-mac-mini>:3000`

Панель показывает:
- Статус каждого сервиса (работает / завис / остановлен / ошибка)
- Кнопки перезапуска и остановки
- Список установленных версий с возможностью отката

### Автообновления

1. Опубликовать релиз на GitHub через скрипт:
   ```bash
   ./scripts/publish.sh v1.2.0
   ```
   Или создать тег `v*` вручную — GitHub Actions соберёт релиз автоматически.

2. На Mac mini проверка обновлений запускается:
   - Вручную: кнопка «Проверить обновления» в панели
   - По расписанию: добавить в crontab:
     ```bash
     crontab -e
     # Добавить строку (проверка каждый час):
     0 * * * * bash ~/solar/scripts/update.sh >> ~/solar/update.log 2>&1
     ```

3. Структура версий на диске:
   ```
   ~/solar/
   ├── current -> versions/v1.2.0/   # симлинк
   ├── versions/
   │   ├── v1.0.0/
   │   ├── v1.1.0/
   │   └── v1.2.0/
   └── current_version.txt
   ```

4. Откат: через панель мониторинга (кнопка «Откатиться») или вручную:
   ```bash
   ln -sfn ~/solar/versions/v1.1.0 ~/solar/current
   pm2 restart core bot
   ```

### Сетевой доступ для MAX-бота (Webhook)

Для продакшн-режима MAX-бота нужен публичный HTTPS-эндпоинт. Варианты:

1. **Cloudflare Tunnel** (рекомендуется):
   ```bash
   brew install cloudflared
   cloudflared tunnel create solar
   cloudflared tunnel route dns solar bot.your-domain.com
   ```
   Конфиг `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: ~/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: bot.your-domain.com
       service: http://localhost:8000
     - service: http_status:404
   ```

2. **ngrok** (для тестирования):
   ```bash
   ngrok http 8000
   ```

В `.env` добавить:
```
WEBHOOK_URL=https://bot.your-domain.com/webhook
```

---

## Контакты и лицензия

Проект разрабатывается для интеграции с мессенджером MAX.
Swiss Ephemeris лицензия: GNU GPL v3 или Professional License.

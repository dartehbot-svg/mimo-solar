# Развёртывание на Mac mini — пошаговая инструкция

Эта инструкция описывает все шаги от чистого Mac mini до работающего сервера с ботом, панелью мониторинга и автообновлениями.

---

## 0. Что понадобится

- Mac mini с доступом к интернету
- Учётная запись Apple (для установки Xcode Command Line Tools)
- Токен MAX-бота (получить у @masterbot в MAX)
- Доступ к GitHub (логин: `dartehbot-svg`)
- Доступ к Cloudflare (dartehbot@gmail.com)
- Доступ к reg.ru (для смены NS-записей домена)

---

## 1. Установка базовых инструментов

### 1.1 Xcode Command Line Tools

Открыть Терминал (Finder → Программы → Утилиты → Терминал) и выполнить:

```bash
xcode-select --install
```

Появится окно — нажать «Установить». Подождать ~5-10 минут.

### 1.2 Homebrew (менеджер пакетов для macOS)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

После установки добавить brew в PATH (покажет инструкция в терминале):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 1.3 Python 3.11+

```bash
brew install python@3.11
```

Проверка: `python3 --version` → должно показать 3.11.x

### 1.4 Node.js 20+

```bash
brew install node@20
```

Проверка: `node --version` → должно показать v20.x.x

### 1.5 PM2 (процесс-менеджер)

```bash
npm install -g pm2
```

Проверка: `pm2 --version`

### 1.6 cloudflared (для туннеля)

```bash
brew install cloudflared
```

---

## 2. Копирование проекта

### 2.1 Через git (рекомендуется)

```bash
cd ~
git clone https://github.com/dartehbot-svg/mimo-solar.git solar
cd solar
```

### 2.2 Или вручную

Скопировать папку `mimo_solar` на Mac mini любым способом (флешка, AirDrop, scp) в `~/solar/`:

```bash
# Если копировали в ~/Desktop/mimo_solar:
mv ~/Desktop/mimo_solar ~/solar
```

---

## 3. Установка зависимостей

### 3.1 Расчётное ядро (Python)

```bash
cd ~/solar/core
pip3 install pyswisseph fastapi uvicorn pydantic timezonefinder reportlab
```

Если pyswisseph не ставится:
```bash
brew install swig
pip3 install pyswisseph
```

### 3.2 MAX-бот (Node.js)

```bash
cd ~/solar/bot
npm install
npm run build
```

### 3.3 Панель мониторинга

```bash
cd ~/solar/dashboard
npm install
```

---

## 4. Настройка окружения

Отредактировать файл `~/solar/.env`:

```bash
nano ~/solar/.env
```

Убедиться что заполнены:

```env
# Токен MAX-бота
BOT_TOKEN=ваш_токен_бота

# GitHub (для автообновлений)
GITHUB_OWNER=dartehbot-svg
GITHUB_REPO=mimo-solar

# Webhook URL (раскомментировать после настройки Cloudflare Tunnel)
# WEBHOOK_URL=https://daptex.ru/webhook

# Порт панели мониторинга
DASHBOARD_PORT=3000
```

Сохранить: `Ctrl+O`, `Enter`, выйти: `Ctrl+X`.

---

## 5. Первый запуск через PM2

```bash
cd ~/solar
pm2 start ecosystem.config.js
pm2 save
```

Проверить статус:
```bash
pm2 status
```

Должны быть три процесса: `core`, `bot`, `dashboard` — все в статусе `online`.

Посмотреть логи:
```bash
pm2 logs          # все логи
pm2 logs core     # только ядро
pm2 logs bot      # только бот
```

### Автозапуск при загрузке Mac mini

```bash
pm2 startup
```

Выполнить команду, которую покажет pm2 (обычно `sudo env PATH=... pm2 startup launchd -u ...`).

Затем:
```bash
pm2 save
```

Теперь при перезагрузке Mac mini все сервисы запустятся автоматически.

---

## 6. Настройка Cloudflare Tunnel

### 6.1 Перенос DNS на Cloudflare

1. Открыть https://dash.cloudflare.com (войти через dartehbot@gmail.com)
2. Нажать «Add a site» → ввести `daptex.ru` → выбрать Free план
3. Cloudflare покажет два NS-записи, например:
   - `anna.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`
4. Открыть https://www.reg.ru → Войти → Мои домены → `daptex.ru` → Управление DNS
5. Сменить NS-записи на те, что дал Cloudflare
6. Вернуться в Cloudflare → нажать «Done, check nameservers»

Подтверждение занимает от 5 минут до 2 часов.

### 6.2 Создание туннеля на Mac mini

```bash
# Авторизация в Cloudflare
cloudflared tunnel login
```

Откроется браузер → выбрать домен `daptex.ru` → разрешить доступ.

```bash
# Создать туннель
cloudflared tunnel create solar
```

Запомнить ID туннеля (показывается в выводе).

```bash
# Привязать домен к туннелю
cloudflared tunnel route dns solar daptex.ru
cloudflared tunnel route dns solar panel.daptex.ru
```

### 6.3 Конфигурация туннеля

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Вставить (заменить `<TUNNEL_ID>` на реальный ID):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /Users/ваш_user/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: daptex.ru
    service: http://localhost:8080
  - hostname: panel.daptex.ru
    service: http://localhost:3000
  - service: http_status:404
```

### 6.4 Запуск туннеля через PM2

```bash
pm2 start cloudflared --name tunnel -- tunnel run solar
pm2 save
```

Проверить: `pm2 status` — должен появиться процесс `tunnel` в статусе `online`.

### 6.5 Проверка

Открыть в браузере: `https://panel.daptex.ru` — должна открыться панель мониторинга.

---

## 7. Регистрация Webhook для MAX-бота

### 7.1 Раскомментировать WEBHOOK_URL

```bash
nano ~/solar/.env
```

Раскомментировать строку:
```env
WEBHOOK_URL=https://daptex.ru/webhook
```

### 7.2 Перезапустить бота

```bash
pm2 restart bot
pm2 logs bot
```

В логах должно быть:
```
Режим: Webhook
Webhook-сервер запущен на порту 8080
Webhook зарегистрирован: https://daptex.ru/webhook
```

### 7.3 Тест

Отправить боту в MAX сообщение `/start` — должен ответить.

---

## 8. Настройка автообновлений

### 8.1 Ручная проверка

```bash
cd ~/solar
bash scripts/update.sh
```

Должно вывести: `Обновление не требуется` (если ещё нет релизов на GitHub).

### 8.2 Cron-задание (проверка каждый час)

```bash
crontab -e
```

Добавить строку:
```
0 * * * * bash ~/solar/scripts/update.sh >> ~/solar/update.log 2>&1
```

Сохранить: `:wq`

### 8.3 Ротация версий

По умолчанию хранятся последние 5 версий. Изменить можно в `scripts/update.sh` (переменная `MAX_VERSIONS`) или в `.env`:
```env
MAX_VERSIONS=10
```

---

## 9. Публикация обновлений (с компьютера разработки)

Когда нужно выпустить новую версию:

```bash
# На компьютере разработки:
cd H:\mimo_solar
git add .
git commit -m "описание изменений"
git push origin main

# Создать релиз:
git tag v1.1.0
git push origin v1.1.0
```

GitHub Actions автоматически соберёт архив и создаст релиз.

Или вручную:
```bash
./scripts/publish.sh v1.1.0
```

Mac mini подхватит обновление автоматически (в течение часа по cron).

---

## 10. Полезные команды

| Команда | Что делает |
|---------|------------|
| `pm2 status` | Статус всех процессов |
| `pm2 logs` | Логи всех процессов |
| `pm2 logs core` | Логи только ядра |
| `pm2 restart all` | Перезапустить всё |
| `pm2 restart bot` | Перезапустить только бота |
| `pm2 monit` | Мониторинг в реальном времени |
| `pm2 list` | Список процессов |
| `pm2 delete all` | Удалить все процессы |
| `bash ~/solar/scripts/update.sh` | Ручная проверка обновлений |

---

## 11. Устранение неполадок

### Бот не отвечает
```bash
pm2 logs bot
```
Проверить что `BOT_TOKEN` правильный в `~/solar/.env`.

### Ядро не запускается
```bash
pm2 logs core
```
Проверить что Python установлен: `python3 --version`.
Проверить что pyswisseph установлен: `python3 -c "import swisseph"`.

### Панель мониторинга не открывается
```bash
pm2 logs dashboard
```
Проверить что порт 3000 не занят: `lsof -i :3000`.

### Cloudflare Tunnel не работает
```bash
pm2 logs tunnel
```
Проверить конфиг: `cat ~/.cloudflared/config.yml`.
Проверить что NS-записи в reg.ru指向 Cloudflare.

### Webhook не работает
Проверить что туннель запущен: `pm2 status` — процесс `tunnel` должен быть `online`.
Проверить URL: `curl https://daptex.ru/api/health` (должен вернуть ответ от ядра).

---

## Структура на Mac mini после развёртывания

```
~/solar/
├── .env                        # Переменные окружения
├── ecosystem.config.js         # PM2 конфиг
├── core/                       # Python — расчётное ядро
├── bot/                        # MAX-бот (Node.js)
├── dashboard/                  # Панель мониторинга
├── swe/                        # Эфемериды Swiss Ephemeris
├── scripts/
│   ├── update.sh               # Скрипт автообновлений
│   └── publish.sh              # Скрипт публикации релизов
├── versions/                   # Хранилище версий (при автообновлениях)
│   ├── v1.0.0/
│   └── v1.1.0/
├── current -> versions/v1.1.0/ # Симлинк на текущую версию
└── current_version.txt         # Текущая версия
```

```
~/.cloudflared/
├── config.yml                  # Конфигурация туннеля
└── <tunnel-id>.json            # Учётные данные туннеля
```

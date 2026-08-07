# ТЗ: Программа построения солярной карты с интеграцией в мессенджер MAX

## 1. Обзор предметной области

Соляр (карта солнечного возвращения, Solar Return) — прогностическая техника, при которой строится гороскоп на момент точного возвращения транзитного Солнца в градус, минуту и секунду его натального положения. Этот момент почти никогда не совпадает с календарной датой рождения — расчёт может отличаться на несколько часов, иногда на 1-2 дня. Работа ведётся в два этапа: сначала анализируется сама солярная карта по принципам натальной, затем она накладывается на натал, чтобы увидеть пересечение сфер жизни.[^1][^2][^3][^4]

Ключевая особенность для данного проекта — влияние места на карту: координаты точки, где встречается день рождения, определяют asc/MC и распределение планет по домам солярной карты (релоцированный соляр, relocated solar return). Это отдельное направление от классической астрокартографии, но использует схожий математический аппарат смещения координат.[^5][^6][^7][^8][^9]

Расчёт эфемерид основан на численном поиске момента, когда долгота транзитного Солнца совпадает с натальной долготой Солнца. Стандартом для точных расчётов является библиотека Swiss Ephemeris (Astrodienst), основанная на эфемеридах NASA JPL.[^10][^11][^3][^12]

## 2. Интеграция с мессенджером MAX

MAX — российский мессенджер с открытым Bot API. Официальная библиотека доступна для Node.js/TypeScript, есть клиенты для Go и .NET. Продакшн-режим поддерживает только Webhook (обязателен публичный HTTPS-эндпоинт с валидным сертификатом), Long Polling допустим только на этапе разработки.[^13][^14][^15][^16][^17]

С 25 мая 2026 прекращена поддержка вебхуков без HTTPS и самоподписных сертификатов; до 19 июля 2026 требуется миграция на домен `platform-api2.max.ru`. Токен бота передаётся через заголовок `Authorization`.[^18][^15][^19]

## 3. Архитектура решения

Система разделена на три слоя:

- **Ядро расчётов** — офлайн-библиотека (эфемериды, соляр, дома, интерпретации).
- **Desktop-приложение (Windows)** — GUI, локальная БД, печать, автообновление через GitHub Releases.
- **MAX-бот-сервис** — серверный компонент с тем же расчётным ядром, доступный по HTTPS webhook, отдающий адаптированный текст и PDF.

| Слой | Технология |
|---|---|
| Ядро | Python + pyswisseph / C++/C# Swiss Ephemeris[^12] |
| Desktop UI | .NET (WPF/WinUI) или Electron/Tauri |
| MAX-бот | Node.js + `@maxhub/max-bot-api`[^13] |
| БД | SQLite (локально) |
| Обновления | GitHub Releases |
| Печать | Генерация PDF |

## 4. Функциональные модули

### 4.1 Расчёт натальной и солярной карты
Ввод даты/времени/места рождения, расчёт натала, итеративный поиск момента солярного возвращения, дома по Плацидус/Кох, возможность указать место встречи дня рождения.[^2][^6][^3][^20][^5]

### 4.2 Поиск лучшего места
Вместо произвольной геосетки — управляемый справочник из 40-80 популярных и доступных городов с готовыми координатами и часовыми поясами. Список редактируется администратором/пользователем, выбор — чекбоксами, с пресетами ("Европа", "без визы для РФ") и возможностью добавить свою точку.

Логика: запрос пользователя (карьера/любовь/здоровье/финансы) → привязка к домам → расчёт соляра для каждого отмеченного города → скоринг по весу планет в нужных домах и отсутствию вредителей → топ-N с пояснением. Обратный сценарий — анализ уже прошедшего дня рождения по факту и меры компенсации.

Дисклеймер об эвристичности метода не дублируется в интерфейсе — размещается один раз в пользовательском соглашении при оформлении подписки (см. 4.8).[^21]

### 4.3 Модуль интерпретации
База толкований "планета в доме" / "дом в знаке" — короткая версия для чата, подробная — для печатного отчёта.

### 4.4 Адаптивное описание
Профиль пользователя (доход, семейное положение, профессия, возраст) влияет на выбор варианта текстового шаблона рекомендаций через правила (rule-based) или LLM-подстановку.

### 4.5 Печать/экспорт
PDF-отчёт: карта, таблица планет/домов, толкования, готов к печати на A4.

### 4.6 Обновления
Проверка версии через GitHub Releases API, скачивание обновлений при наличии интернета, полный офлайн-режим при его отсутствии.

### 4.7 MAX-бот
Диалоговый сбор данных рождения, вызов серверного расчётного ядра, короткий адаптированный ответ (эмодзи, кнопки), Webhook на продакшне.[^15][^16]

### 4.8 Монетизация (подписка через MAX)
Расчётное ядро для MAX-ветки работает на сервере — бот не считает локально, а отправляет запрос и получает готовый результат (текст + PDF).

| Компонент | Desktop (офлайн) | MAX-бот (сервер) |
|---|---|---|
| Расчёт карт | Локально, бесплатно | На сервере, требует подписку |
| Поиск лучшего места | Входит в основной функционал | Платная функция |
| PDF для печати | Бесплатно | Входит в подписку |
| Адаптивные рекомендации | Входит в основной функционал | Входит в подписку |

Бесплатный тариф в MAX — ограниченное число расчётов или только базовая карта без поиска места. Платная подписка (месяц/год) открывает неограниченные расчёты, поиск по списку городов, выгрузку PDF, расширенные рекомендации. Дисклеймер об эвристической природе метода фиксируется в оферте при оформлении подписки. Способ приёма платежей в MAX требует отдельного уточнения у команды MAX. На сервере ведётся учёт активных подписок по id чата пользователя с проверкой перед каждым платным запросом.[^21]

## 5. Дополнительные аспекты
Исторические часовые пояса и переход на летнее время, юридический дисклеймер, защита персональных данных (шифрование БД, политика обработки), гибкость систем домов, режим без точного времени рождения, ограничение перебора координат крупными городами (реализовано через справочник в 4.2).

## 6. Поэтапный план разработки

- **Этап 0 (1-2 нед).** Финализация ТЗ, выбор библиотеки эфемерид, выбор хостинга под сервер.
- **Этап 1 (3-5 нед).** Расчётное ядро, тесты на эталонных данных.[^22][^5]
- **Этап 2 (2-4 нед, параллельно).** База интерпретаций, адаптивные теги.
- **Этап 3 (4-6 нед).** Desktop-приложение, UI, печать.
- **Этап 4 (3-5 нед).** Модуль поиска лучшего места со справочником городов, анализ прошедшего дня рождения.
- **Этап 5 (3-4 нед).** MAX-бот, Webhook, диалоговый сценарий.[^16][^15]
- **Этап 6 (2-3 нед).** Серверный расчётный сервис + система подписок и биллинга.
- **Этап 7 (1-2 нед).** Автообновления desktop через GitHub Releases.
- **Этап 8 (2-3 нед).** Тестирование, юридическая проверка оферты, запуск.

Ориентировочный срок: 20-32 недели при одном разработчике; 12-16 недель при команде из 2-3 специалистов.

---

## References

1. [Соляр в астрологии: что это простыми словами, как ...](https://www.kp.ru/woman/goroskop/solyar/) - На его основе строится карта соляра — гороскоп на следующие 12 месяцев, который показывает потенциал...

2. [Как построить свой Соляр](https://dzen.ru/a/YZFSEHUSqgyFyX1a) - Статья автора «Астропсихология на каждый день» в Дзене ✍: Предыдущие статьи про Соляр вызвали интере...

3. [Sun Return and Moon Return Calculation using swetest](https://groups.io/g/swisseph/topic/sun_return_and_moon_return/107060648) - The Solar Return Chart is calculated for the moment when the Sun returns to the exact position it he...

4. [How Accurate Are Solar Return Charts, Really?](https://helenawoods.com/how-accurate-are-solar-return-charts-on-the-astrocartography-maps-really/) - Your Solar Return happens when the Sun returns to the exact degree it was in your natal chart at you...

5. [Solar Return Chart Calculator with AI Reading](https://astrocarto.net/solar-return-chart) - Calculate a free Solar Return chart for a selected return year and return location. Review the Ascen...

6. [Solar Return Chart LOCATION](https://bonniegillespie.com/solar-return-chart-location/) - One of the settings for creating this chart is location. Should it be the location of your birth? Yo...

7. [Solar Return Chart Calculator](https://astrocarto.org/solar-return-chart-calculator/) - Free solar return chart calculator: cast your annual solar return chart for any year from your birth...

8. [Relocation Astrology - Legit Or Not?](https://mysticmedusa.com/planets-in-astrology/relocation-astrology-legit-or-not/) - Relocation astrology is a new birth chart that's calculated as if you were born in a particular plac...

9. [Astrocartography & Relocation Charts - by Alice Bell](https://alicebell.substack.com/p/astrocartography-and-relocation-charts) - When pulling up a relocation chart, you will want to go to astro.com, then click on the “charts and ...

10. [ducrouxolivier/swiss-ephemeris-mcp-server](https://github.com/ducrouxolivier/swiss-ephemeris-mcp-server) - Calculate solar return chart for a specific year (when Sun returns to natal position). Parameters: b...

11. [SwissEphemeris](https://hackage.haskell.org/package/swiss-ephemeris/docs/SwissEphemeris.html) - Given a JulianDay in UT1 , and a Planet , returns either the position of that planet at the given ti...

12. [Swiss Ephemeris - for 8000 years and more](https://www.astro.com/swisseph/swephinfo_e.htm) - The Swiss Ephemeris is the high precision ephemeris developed by Astrodienst, largely based upon the...

13. [Установка MAX Bot API](https://dev.max.ru/docs/chatbots/bots-coding/js) - 1. Создайте новый проект в терминале и установите библиотеку для своего менеджера пакетов. Используй...

14. [MaxMessenger.Bot 0.3.8-alpha](https://www.nuget.org/packages/MaxMessenger.Bot/0.3.8-alpha) - Полнофункциональная библиотека для работы с Max Messenger Bot API на .NET 9. Проект фокусируется на ...

15. [Настройка сценариев работы бота с помощью API](https://dev.max.ru/docs/chatbots/bots-coding/prepare) - API поддерживает два типа уведомлений о действиях пользователей с ботом — выбор зависит от этапа раб...

16. [Как создать чат-бота в Max — пошаговый гайд 2026](https://lidzavod.ru/blog/prodazhi/kak-sozdat-chat-bota-v-messendzhere-max/) - Пошаговая инструкция по созданию чат-бота в Max в 2026. ✓ Разбираем 2 способа: через конструктор (бе...

17. [max-messenger/max-bot-api-client-go](https://github.com/max-messenger/max-bot-api-client-go) - В документации вы можете найти подробные инструкции по использованию фреймворка. Быстрый старт. Если...

18. [API ботов](https://dev.max.ru/docs-api) - API (Application Programming Interface) — это посредник между разработчиком приложений и средой, с к...

19. [Webhook](https://dev.max.ru/docs-api/methods/POST/subscriptions) - Если при создании подписки указан secret , проверяется заголовок X-Max-Bot-Api-Secret; При успешной ...

20. [Как правильно построить соляр? - anastasiya_351 - Ответы](https://otvet.mail.ru/question/168748539) - я так понимаю, что в одной карте натальные данные пишутся, а во второй солярной какую ...

21. [Does anyone had success relocating to avoid a hard solar ...](https://www.reddit.com/r/astrology/comments/1jkosj0/does_anyone_had_success_relocating_to_avoid_a/) - The quesion is, does anyone had success relocating to have the malefics in different houses of the s...

22. [Соляр - Солярный гороскоп на год онлайн бесплатно](https://ru.astro-seek.com/solyar-solyarnyy-goroskop-onlayn-besplatno) - Соляр (Солнечное возвращение) за определенный год рассчитывает точный момент, когда Солнце возвращае...


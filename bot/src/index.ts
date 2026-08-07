import 'dotenv/config';

// Обход SSL-проверки только для разработки
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { Bot, Keyboard } from '@maxhub/max-bot-api';
import express from 'express';
import { handleStart, handleBirthDate, handleBirthTime, handleBirthCity, handleAction, handleSolarYear, handleSolarCity, handleSphere } from './bot';
import { StateManager } from './state';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN не задан. Установите переменную окружения BOT_TOKEN.');
  process.exit(1);
}

console.log('Токен загружен:', token.slice(0, 8) + '...');

const bot = new Bot(token);
const states = new StateManager();

// Клавиатура сфер
const sphereKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Карьера', 'sphere:career'),
    Keyboard.button.callback('Любовь', 'sphere:love'),
    Keyboard.button.callback('Здоровье', 'sphere:health'),
  ],
  [
    Keyboard.button.callback('Финансы', 'sphere:finance'),
    Keyboard.button.callback('Творчество', 'sphere:creativity'),
    Keyboard.button.callback('Духовность', 'sphere:spirituality'),
  ],
]);

// Вспомогательные функции для action-обработчиков
import axios from 'axios';
const CORE_API = process.env.CORE_API_URL || 'http://localhost:8000';

const QUICK_CITIES: Record<string, { lat: number; lon: number }> = {
  'москва': { lat: 55.7558, lon: 37.6173 },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351 },
  'сочи': { lat: 43.6028, lon: 39.7342 },
  'дубай': { lat: 25.2048, lon: 55.2708 },
  'стамбул': { lat: 41.0082, lon: 28.9784 },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPlanetTable(planets: any[]): string {
  const mainPlanets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const symbols: Record<string, string> = {
    sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
    jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  };
  return planets
    .filter(p => mainPlanets.includes(p.name))
    .map(p => {
      const sym = symbols[p.name] || '';
      const retro = p.retrograde ? ' ℞' : '';
      return `${sym} ${capitalize(p.name)}: ${p.sign} ${p.sign_degree}°${p.sign_minute.toString().padStart(2, '0')}' — ${p.house}-й дом${retro}`;
    })
    .join('\n');
}

function formatAspects(aspects: any[]): string {
  const aspectNames: Record<string, string> = {
    conjunction: 'соединение', sextile: 'секстиль', square: 'квадратура',
    trine: 'тригон', opposition: 'оппозиция',
  };
  return aspects.slice(0, 8).map(a =>
    `${capitalize(a.planet1)} — ${capitalize(a.planet2)}: ${aspectNames[a.aspect_type] || a.aspect_type}`
  ).join('\n');
}

const actionKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Натальная карта', 'natal', { intent: 'positive' }),
    Keyboard.button.callback('Соляр', 'solar', { intent: 'positive' }),
  ],
  [
    Keyboard.button.callback('Лучшее место', 'bestplace'),
    Keyboard.button.callback('Соляр на другой год', 'solar_year'),
  ],
]);

async function sendChartImage(ctx: any, imageData: Buffer): Promise<void> {
  try {
    console.log(`[img] Размер буфера: ${imageData.length} байт`);
    const image = await ctx.api.uploadImage({ source: imageData });
    console.log('[img] Загружено, token:', image.token || 'нет');
    await ctx.reply('', { attachments: [image.toJson()] });
    console.log('[img] Отправлено');
  } catch (err: any) {
    console.error('[img] Ошибка:', err.message, err.status, JSON.stringify(err.data));
  }
}

async function calculateNatalFromCtx(ctx: any, data: Record<string, any>, states: StateManager): Promise<void> {
  const userId = ctx.user?.user_id || ctx.message?.sender?.user_id;
  ctx.reply('Рассчитываю натальную карту...');
  try {
    const response = await axios.post(`${CORE_API}/api/natal`, {
      birth_date: data.birthDate, birth_time: data.birthTime,
      latitude: data.birthLat, longitude: data.birthLon, house_system: 'P',
    });
    const result = response.data;
    const planetTable = formatPlanetTable(result.planets);
    const aspects = formatAspects(result.aspects);
    try {
      const imgResponse = await axios.post(`${CORE_API}/api/chart-image`, {
        birth_date: data.birthDate, birth_time: data.birthTime,
        latitude: data.birthLat, longitude: data.birthLon,
      }, { responseType: 'arraybuffer' });
      await sendChartImage(ctx, Buffer.from(imgResponse.data));
    } catch (imgErr: any) {
      console.error('[chart] Ошибка:', imgErr.message);
    }
    const message = `Натальная карта\n${data.birthDate} ${data.birthTime}, ${data.birthCity}\n\nПланеты:\n${planetTable}\n\nASC: ${Math.round(result.asc)}° | MC: ${Math.round(result.mc)}°\n\nАспекты:\n${aspects}`;
    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [actionKeyboard] });
  } catch (err: any) {
    console.error('Ошибка натала:', err.message);
    ctx.reply('Ошибка при расчёте. Попробуйте снова.');
  }
}

async function calculateBestPlaceFromCtx(ctx: any, data: Record<string, any>, states: StateManager): Promise<void> {
  const userId = ctx.user?.user_id || ctx.message?.sender?.user_id || ctx.callback?.user_id;
  console.log(`[bestplace] userId=${userId}, data=`, JSON.stringify(data));
  ctx.reply('Ищу лучшие места...');
  try {
    const response = await axios.post(`${CORE_API}/api/best-place`, {
      natal: { birth_date: data.birthDate, birth_time: data.birthTime, latitude: data.birthLat, longitude: data.birthLon, house_system: 'P' },
      year: new Date().getFullYear(), spheres: data.spheres, top_n: 5,
    });
    const results = response.data.results;
    const message = `Лучшие места\nСфера: ${data.spheres.join(', ')}\n\n` +
      results.map((r: any, i: number) => `${i + 1}. ${r.city} (${r.country}) — ${r.score > 0 ? '+' : ''}${r.score}`).join('\n');
    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [actionKeyboard] });
  } catch (err: any) {
    console.error('[bestplace] Ошибка:', err.message, err.response?.status, err.response?.data);
    ctx.reply('Ошибка при расчёте.');
  }
}

async function main() {
  // Прямой тест подключения к MAX API
  console.log('Тестирую подключение к MAX API...');
  try {
    const res = await fetch('https://platform-api2.max.ru/me', {
      headers: { Authorization: token! }
    });
    console.log('Статус ответа:', res.status);
    const data = await res.json();
    console.log('Ответ:', JSON.stringify(data, null, 2));
  } catch (fetchErr: any) {
    console.error('Ошибка fetch:', fetchErr.message);
    console.error('Тип:', fetchErr.name);
    console.error('Код:', fetchErr.code);
  }

  // Проверяем токен через Bot API
  console.log('\nПроверяю токен через Bot API...');
  try {
    const info = await bot.api.getMyInfo();
    console.log(`Бот найден: @${info.username} (${info.name})`);
  } catch (err: any) {
    console.error('Ошибка проверки токена:');
    console.error('  Сообщение:', err.message);
    console.error('  Статус:', err.status);
    console.error('  Данные:', JSON.stringify(err.data, null, 2));
    console.error('  Полная ошибка:', JSON.stringify(err, null, 2));
    process.exit(1);
  }

  // Устанавливаем команды (не критично если упадёт)
  try {
    await bot.api.setMyCommands([
      { name: 'start', description: 'Начать работу с ботом' },
      { name: 'natal', description: 'Рассчитать натальную карту' },
      { name: 'solar', description: 'Рассчитать солярную карту' },
      { name: 'help', description: 'Помощь' },
    ]);
    console.log('Команды установлены');
  } catch (err: any) {
    console.warn('Не удалось установить команды:', err.message || err);
  }

  // Обработчик всех сообщений
  bot.on('message_created', (ctx: any) => {
    const userId = ctx.message?.sender?.user_id || ctx.message?.sender_id;
    const text = ctx.message?.body?.text?.trim();
    if (!text || !userId) return;

    console.log(`[msg] user=${userId} text="${text}"`);

    // Команды
    if (text === '/start') {
      states.reset(userId);
      handleStart(ctx);
      return;
    }

    if (text === '/natal') {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'natal' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
      return;
    }

    if (text === '/solar') {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'solar' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
      return;
    }

    if (text === '/help') {
      ctx.reply(
        'Бот для расчёта солярных карт\n\n' +
        'Команды:\n' +
        '/natal — Натальная карта\n' +
        '/solar — Соляр на год\n' +
        '/bestplace — Лучшее место для встречи дня рождения\n' +
        '/start — Начать заново\n' +
        '/help — Помощь'
      );
      return;
    }

    if (text === '/bestplace') {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'bestplace' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
      return;
    }

    // Диалог
    const state = states.get(userId);
    if (!state) {
      ctx.reply('Отправьте /start, /natal или /solar для начала работы.');
      return;
    }

    switch (state.step) {
      case 'awaiting_birth_date':
        handleBirthDate(ctx, text, states);
        break;
      case 'awaiting_birth_time':
        handleBirthTime(ctx, text, states);
        break;
      case 'awaiting_birth_city':
        handleBirthCity(ctx, text, states);
        break;
      case 'awaiting_action':
        handleAction(ctx, text, states);
        break;
      case 'awaiting_solar_year':
        handleSolarYear(ctx, text, states);
        break;
      case 'awaiting_solar_city':
        handleSolarCity(ctx, text, states);
        break;
      case 'awaiting_sphere':
        handleSphere(ctx, text, states);
        break;
      default:
        ctx.reply('Отправьте /start для начала работы.');
    }
  });

  // Обработка callback-кнопок
  bot.action('natal', (ctx: any) => {
    const userId = ctx.user?.user_id || ctx.message?.sender?.user_id;
    if (!userId) return;
    console.log(`[action] user=${userId} action=natal`);
    const data = states.getData(userId);
    if (data.birthDate) {
      calculateNatalFromCtx(ctx, data, states);
    } else {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'natal' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    }
  });

  bot.action('solar', (ctx: any) => {
    const userId = ctx.user?.user_id || ctx.message?.sender?.user_id;
    if (!userId) return;
    console.log(`[action] user=${userId} action=solar`);
    const data = states.getData(userId);
    if (data.birthDate) {
      states.setData(userId, { solarYear: new Date().getFullYear() });
      states.setStep(userId, 'awaiting_solar_city');
      ctx.reply('Где планируете встретить день рождения?\n\nМосква, Санкт-Петербург, Сочи, Дубай...');
    } else {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'solar' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    }
  });

  bot.action('bestplace', (ctx: any) => {
    const userId = ctx.user?.user_id || ctx.message?.sender?.user_id;
    if (!userId) return;
    console.log(`[action] user=${userId} action=bestplace`);
    const data = states.getData(userId);
    if (data.birthDate) {
      states.setData(userId, { action: 'bestplace' });
      states.setStep(userId, 'awaiting_sphere');
      ctx.reply('Что хотите улучшить?', { attachments: [sphereKeyboard] });
    } else {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'bestplace' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    }
  });

  bot.action('solar_year', (ctx: any) => {
    const userId = ctx.user?.user_id || ctx.message?.sender?.user_id;
    if (!userId) return;
    console.log(`[action] user=${userId} action=solar_year`);
    states.setStep(userId, 'awaiting_solar_year');
    ctx.reply('Введите год соляра (например: 2026)');
  });

  // Кнопка "Колесо карты"
  bot.action('chart', async (ctx: any) => {
    const userId = ctx.user?.user_id || ctx.message?.sender?.user_id;
    if (!userId) return;
    console.log(`[action] user=${userId} action=chart`);
    const data = states.getData(userId);
    if (!data.birthDate) {
      ctx.reply('Сначала рассчитайте натальную карту (/natal)');
      return;
    }
    ctx.reply('Генерирую колесо карты...');
    try {
      const imgResponse = await axios.post(`${CORE_API}/api/chart-image`, {
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        latitude: data.birthLat,
        longitude: data.birthLon,
      }, { responseType: 'arraybuffer' });
      console.log(`[chart] Получено ${imgResponse.data.byteLength || imgResponse.data.length} байт`);
      await sendChartImage(ctx, Buffer.from(imgResponse.data));
    } catch (imgErr: any) {
      console.error('[chart] Ошибка:', imgErr.message, imgErr.response?.status);
      ctx.reply('Ошибка генерации колеса. Попробуйте позже.');
    }
  });

  // Обработка выбора сферы через кнопки
  bot.action(/sphere:(.+)/, (ctx: any) => {
    const userId = ctx.user?.user_id || ctx.message?.sender?.user_id || ctx.callback?.user_id;
    if (!userId) {
      console.error('[action] Не удалось определить userId');
      ctx.reply('Ошибка: попробуйте /start');
      return;
    }
    const sphere = ctx.match[1];
    console.log(`[action] user=${userId} sphere=${sphere}`);
    states.setData(userId, { spheres: [sphere] });
    calculateBestPlaceFromCtx(ctx, states.getData(userId), states);
  });

  // Обработка ошибок
  bot.catch((err: any) => {
    console.error('Ошибка бота:', err);
  });

  const webhookUrl = process.env.WEBHOOK_URL;

  if (webhookUrl) {
    // Webhook-режим (продакшн)
    console.log('Режим: Webhook');
    const app = express();
    app.use(express.json());

    app.post('/webhook', async (req: express.Request, res: express.Response) => {
      try {
        await (bot as any).handleUpdate(req.body);
        res.sendStatus(200);
      } catch (err: any) {
        console.error('Webhook ошибка:', err.message);
        res.sendStatus(500);
      }
    });

    // Health-check для панели мониторинга
    app.get('/api/health', (_req: express.Request, res: express.Response) => {
      res.json({ status: 'ok', mode: 'webhook' });
    });

    const port = parseInt(process.env.BOT_PORT || '8080');
    app.listen(port, () => {
      console.log(`Webhook-сервер запущен на порту ${port}`);
      console.log(`Зарегистрируйте webhook URL в MAX: ${webhookUrl}`);
    });
  } else {
    // Long Polling (разработка)
    console.log('Режим: Long Polling');
    await bot.start();
    console.log('Polling запущен, ожидаю сообщения...');
  }
}

main().catch(err => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});

import 'dotenv/config';

// Обход SSL-проверки только для разработки
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { Bot, Keyboard } from '@maxhub/max-bot-api';
import express from 'express';
import {
  handleStart, handleBirthDate, handleBirthTime, handleBirthCity,
  handleAction, handleSolarYear, handleSolarCity, handleSphere,
  handleProfileCommand, handleProfileAdd, handleHistoryCommand,
  handleProfileName, handleProfileDate, handleProfileTime, handleProfileCity,
  calculateNatal, calculateSolar, calculateBestPlace, sendChartImage,
  showShortDescription, showFullDescription, downloadFullDescription,
  startKeyboard, natalResultKeyboard, descKeyboard, fullDescKeyboard, sphereKeyboard,
  getUserId, capitalize, formatPlanetTable, formatAspects,
} from './bot';
import { StateManager } from './state';
import * as api from './api';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN не задан.');
  process.exit(1);
}

console.log('Токен загружен:', token.slice(0, 8) + '...');

const bot = new Bot(token);
const states = new StateManager();

async function main() {
  // Проверяем токен
  console.log('Проверяю токен через Bot API...');
  try {
    const info = await bot.api.getMyInfo();
    console.log(`Бот найден: @${info.username} (${info.name})`);
  } catch (err: any) {
    console.error('Ошибка проверки токена:', err.message);
    process.exit(1);
  }

  // Устанавливаем команды
  try {
    await bot.api.setMyCommands([
      { name: 'start', description: 'Начать работу' },
      { name: 'natal', description: 'Натальная карта' },
      { name: 'solar', description: 'Соляр на год' },
      { name: 'bestplace', description: 'Лучшее место' },
      { name: 'profile', description: 'Мои профили' },
      { name: 'history', description: 'История расчётов' },
      { name: 'help', description: 'Помощь' },
    ]);
    console.log('Команды установлены');
  } catch (err: any) {
    console.warn('Не удалось установить команды:', err.message);
  }

  // Обработчик сообщений
  bot.on('message_created', async (ctx: any) => {
    const userId = ctx.message?.sender?.user_id || ctx.message?.sender_id;
    const text = ctx.message?.body?.text?.trim();
    const userName = ctx.message?.sender?.name;
    if (!text || !userId) return;

    console.log(`[msg] user=${userId} text="${text}"`);

    // Команды
    if (text === '/start') {
      states.reset(userId);
      await handleStart(ctx, userId, userName);
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

    if (text === '/bestplace') {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'bestplace' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
      return;
    }

    if (text === '/profile') {
      await handleProfileCommand(ctx, userId);
      return;
    }

    if (text.startsWith('/profile_add')) {
      await handleProfileAdd(ctx, text, userId);
      return;
    }

    if (text === '/history') {
      await handleHistoryCommand(ctx, userId);
      return;
    }

    if (text === '/help') {
      ctx.reply(
        'Бот для расчёта солярных карт\n\n' +
        'Команды:\n' +
        '/natal — Натальная карта\n' +
        '/solar — Соляр на год\n' +
        '/bestplace — Лучшее место\n' +
        '/profile — Мои профили\n' +
        '/history — История расчётов\n' +
        '/start — Начать заново\n' +
        '/help — Помощь'
      );
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
        handleBirthDate(ctx, text, states, userId);
        break;
      case 'awaiting_birth_time':
        handleBirthTime(ctx, text, states, userId);
        break;
      case 'awaiting_birth_city':
        await handleBirthCity(ctx, text, states, userId);
        break;
      case 'awaiting_action':
        handleAction(ctx, text, states, userId);
        break;
      case 'awaiting_solar_year':
        handleSolarYear(ctx, text, states, userId);
        break;
      case 'awaiting_solar_city':
        await handleSolarCity(ctx, text, states, userId);
        break;
      case 'awaiting_sphere':
        await handleSphere(ctx, text, states, userId);
        break;
      case 'awaiting_profile_name':
        handleProfileName(ctx, text, states, userId);
        break;
      case 'awaiting_profile_date':
        handleProfileDate(ctx, text, states, userId);
        break;
      case 'awaiting_profile_time':
        handleProfileTime(ctx, text, states, userId);
        break;
      case 'awaiting_profile_city':
        await handleProfileCity(ctx, text, states, userId);
        break;
      default:
        ctx.reply('Отправьте /start для начала работы.');
    }
  });

  // Callback-кнопки

  // ── Навигация ────────────────────────────────
  bot.action('start_cmd', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    const userName = ctx.user?.name || ctx.message?.sender?.name;
    await handleStart(ctx, userId, userName);
  });

  bot.action('natal_back', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    const data = states.getData(userId);
    if (data.lastNatalResult) {
      const planetTable = formatPlanetTable(data.lastNatalResult.planets);
      const aspects = formatAspects(data.lastNatalResult.aspects);
      const message =
        `Натальная карта\n` +
        `${data.birthDate} ${data.birthTime}, ${data.birthCity}\n\n` +
        `Планеты:\n${planetTable}\n\n` +
        `ASC: ${Math.round(data.lastNatalResult.asc)}° | MC: ${Math.round(data.lastNatalResult.mc)}°\n\n` +
        `Аспекты:\n${aspects}`;
      ctx.reply(message, { attachments: [natalResultKeyboard] });
    } else {
      ctx.reply('Нет данных натала. Рассчитайте заново:', { attachments: [startKeyboard] });
    }
  });

  // ── Основные действия ────────────────────────
  bot.action('natal', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    console.log(`[action] user=${userId} action=natal`);
    const data = states.getData(userId);
    if (data.birthDate) {
      await calculateNatal(ctx, data, states, userId);
    } else {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'natal' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    }
  });

  bot.action('solar', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    console.log(`[action] user=${userId} action=solar`);
    const data = states.getData(userId);
    if (data.birthDate) {
      states.setData(userId, { solarYear: new Date().getFullYear() });
      states.setStep(userId, 'awaiting_solar_city');
      ctx.reply('Где планируете встретить день рождения?\n\nНачните вводить город...');
    } else {
      states.reset(userId);
      states.setStep(userId, 'awaiting_birth_date');
      states.setData(userId, { action: 'solar' });
      ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    }
  });

  bot.action('bestplace', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
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
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    console.log(`[action] user=${userId} action=solar_year`);
    states.setStep(userId, 'awaiting_solar_year');
    ctx.reply('Введите год соляра (например: 2026)');
  });

  bot.action('chart', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    console.log(`[action] user=${userId} action=chart`);
    const data = states.getData(userId);
    if (!data.birthDate) {
      ctx.reply('Сначала рассчитайте натальную карту.', { attachments: [startKeyboard] });
      return;
    }
    await sendChartImage(ctx, data, userId);
  });

  bot.action(/sphere:(.+)/, async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) {
      console.error('[action] Не удалось определить userId');
      ctx.reply('Ошибка: попробуйте /start');
      return;
    }
    const sphere = ctx.match[1];
    console.log(`[action] user=${userId} sphere=${sphere}`);
    states.setData(userId, { spheres: [sphere] });
    await calculateBestPlace(ctx, states.getData(userId), states, userId);
  });

  // ── Описание ─────────────────────────────────
  bot.action('description', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    ctx.reply('Выберите тип описания:', { attachments: [descKeyboard] });
  });

  bot.action('desc_short', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    const data = states.getData(userId);
    if (!data.birthDate) {
      ctx.reply('Сначала рассчитайте натальную карту.', { attachments: [startKeyboard] });
      return;
    }
    await showShortDescription(ctx, data, userId);
  });

  bot.action('desc_full', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    const data = states.getData(userId);
    if (!data.birthDate) {
      ctx.reply('Сначала рассчитайте натальную карту.', { attachments: [startKeyboard] });
      return;
    }
    ctx.reply('Полное описание:', { attachments: [fullDescKeyboard] });
  });

  bot.action('desc_screen', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    const data = states.getData(userId);
    if (!data.birthDate) {
      ctx.reply('Сначала рассчитайте натальную карту.', { attachments: [startKeyboard] });
      return;
    }
    await showFullDescription(ctx, data, userId);
  });

  bot.action('desc_download', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    const data = states.getData(userId);
    if (!data.birthDate) {
      ctx.reply('Сначала рассчитайте натальную карту.', { attachments: [startKeyboard] });
      return;
    }
    await downloadFullDescription(ctx, data, userId);
  });

  // ── Профили и история ────────────────────────
  bot.action('profile_cmd', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    await handleProfileCommand(ctx, userId);
  });

  bot.action('history_cmd', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    await handleHistoryCommand(ctx, userId);
  });

  bot.action('add_profile', async (ctx: any) => {
    ctx.answerOnCallback?.();
    const userId = getUserId(ctx);
    if (!userId) return;
    states.setStep(userId, 'awaiting_profile_name');
    ctx.reply('Введите имя человека (например: Мама, Петр, Аня):');
  });

  bot.catch((err: any) => {
    console.error('Ошибка бота:', err);
  });

  const webhookUrl = process.env.WEBHOOK_URL;

  if (webhookUrl) {
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

    app.get('/api/health', (_req: express.Request, res: express.Response) => {
      res.json({ status: 'ok', mode: 'webhook' });
    });

    const port = parseInt(process.env.BOT_PORT || '8080');
    app.listen(port, () => {
      console.log(`Webhook-сервер запущен на порту ${port}`);
    });
  } else {
    console.log('Режим: Long Polling');
    await bot.start();
    console.log('Polling запущен, ожидаю сообщения...');
  }
}

main().catch(err => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});

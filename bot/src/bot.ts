import axios from 'axios';
import { Keyboard } from '@maxhub/max-bot-api';
import { StateManager } from './state';

const CORE_API = process.env.CORE_API_URL || 'http://localhost:8000';

// Клавиатуры
const actionKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Натальная карта', 'natal', { intent: 'positive' }),
    Keyboard.button.callback('Соляр', 'solar', { intent: 'positive' }),
  ],
  [
    Keyboard.button.callback('Колесо карты', 'chart', { intent: 'positive' }),
    Keyboard.button.callback('Лучшее место', 'bestplace'),
  ],
  [
    Keyboard.button.callback('Соляр на другой год', 'solar_year'),
  ],
]);

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

// Города
const QUICK_CITIES: Record<string, { lat: number; lon: number }> = {
  'москва': { lat: 55.7558, lon: 37.6173 },
  'санкт-петербург': { lat: 59.9343, lon: 30.3351 },
  'сочи': { lat: 43.6028, lon: 39.7342 },
  'казань': { lat: 55.7887, lon: 49.1221 },
  'екатеринбург': { lat: 56.8389, lon: 60.6057 },
  'новосибирск': { lat: 55.0084, lon: 82.9357 },
  'калининград': { lat: 54.7104, lon: 20.4522 },
  'дубай': { lat: 25.2048, lon: 55.2708 },
  'стамбул': { lat: 41.0082, lon: 28.9784 },
  'париж': { lat: 48.8566, lon: 2.3522 },
  'лондон': { lat: 51.5074, lon: -0.1278 },
  'нью-йорк': { lat: 40.7128, lon: -74.0060 },
  'токио': { lat: 35.6762, lon: 139.6503 },
  'бангкок': { lat: 13.7563, lon: 100.5018 },
  'бали': { lat: -8.6500, lon: 115.2167 },
  'тбилиси': { lat: 41.7151, lon: 44.8271 },
  'ереван': { lat: 40.1792, lon: 44.4991 },
  'белград': { lat: 44.7866, lon: 20.4489 },
  'алматы': { lat: 43.2220, lon: 76.8512 },
};

const SPHERES: Record<string, string[]> = {
  'карьера': ['career'],
  'любовь': ['love'],
  'здоровье': ['health'],
  'финансы': ['finance'],
  'творчество': ['creativity'],
  'духовность': ['spirituality'],
};

function parseDate(text: string): string | null {
  const match = text.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = parseInt(match[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return null;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseTime(text: string): string | null {
  if (text.toLowerCase() === 'не знаю' || text.toLowerCase() === 'неизвестно') return '12:00';
  const match = text.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) {
    const hourMatch = text.match(/^(\d{1,2})$/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      if (hour >= 0 && hour <= 23) return `${hour.toString().padStart(2, '0')}:00`;
    }
    return null;
  }
  const hour = parseInt(match[1]);
  const minute = parseInt(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function getCityCoords(text: string): { lat: number; lon: number } | null {
  return QUICK_CITIES[text.toLowerCase().trim()] || null;
}

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

function getUserId(ctx: any): number {
  return ctx.message?.sender?.user_id || ctx.message?.sender_id;
}

// Отправка картинки колеса
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

// ─── Обработчики ─────────────────────────────────────────

export function handleStart(ctx: any): void {
  ctx.reply(
    'Добро пожаловать! Я помогу рассчитать солярную карту.\n\n' +
    'Команды:\n' +
    '/natal — Натальная карта\n' +
    '/solar — Соляр на год\n' +
    '/bestplace — Лучшее место для встречи дня рождения\n' +
    '/help — Помощь'
  );
}

export function handleBirthDate(ctx: any, text: string, states: StateManager): void {
  const userId = getUserId(ctx);
  const date = parseDate(text);
  if (!date) {
    ctx.reply('Неверный формат даты. Введите в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    return;
  }
  states.setData(userId, { birthDate: date });
  states.setStep(userId, 'awaiting_birth_time');
  ctx.reply('Введите время рождения в формате ЧЧ:ММ\n\nЕсли не знаете точное время — напишите "не знаю"');
}

export function handleBirthTime(ctx: any, text: string, states: StateManager): void {
  const userId = getUserId(ctx);
  const time = parseTime(text);
  if (!time) {
    ctx.reply('Неверный формат времени. Введите в формате ЧЧ:ММ\n\nНапример: 14:30');
    return;
  }
  states.setData(userId, { birthTime: time });
  states.setStep(userId, 'awaiting_birth_city');
  ctx.reply('Введите город рождения\n\nМосква, Санкт-Петербург, Сочи, Дубай, Стамбул...');
}

export function handleBirthCity(ctx: any, text: string, states: StateManager): void {
  const userId = getUserId(ctx);
  const coords = getCityCoords(text);
  if (!coords) {
    ctx.reply(
      'Город не найден. Попробуйте:\n' +
      Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n')
    );
    return;
  }
  states.setData(userId, { birthLat: coords.lat, birthLon: coords.lon, birthCity: text });
  const data = states.getData(userId);

  if (data.action === 'natal') {
    calculateNatal(ctx, data, states);
  } else if (data.action === 'solar') {
    // Сначала спрашиваем город встречи дня рождения
    states.setStep(userId, 'awaiting_solar_city');
    ctx.reply(
      'Данные рождения сохранены!\n\n' +
      'Где планируете встретить день рождения?\n\n' +
      Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n') +
      '\n\nИли введите свой город'
    );
  } else if (data.action === 'bestplace') {
    states.setStep(userId, 'awaiting_sphere');
    ctx.reply('Что хотите улучшить?', { attachments: [sphereKeyboard] });
  }
}

export function handleAction(ctx: any, text: string, states: StateManager): void {
  const userId = getUserId(ctx);
  const data = states.getData(userId);
  const lower = text.toLowerCase();

  if (lower.includes('натал')) {
    calculateNatal(ctx, data, states);
  } else if (lower.includes('соляр') && lower.includes('другой')) {
    states.setStep(userId, 'awaiting_solar_year');
    ctx.reply('Введите год соляра (например: 2026)');
  } else if (lower.includes('соляр') || lower.includes('текущий')) {
    states.setData(userId, { solarYear: new Date().getFullYear() });
    states.setStep(userId, 'awaiting_solar_city');
    ctx.reply(
      'Где планируете встретить день рождения?\n\n' +
      Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n')
    );
  } else if (lower.includes('лучшее') || lower.includes('место')) {
    states.setData(userId, { action: 'bestplace' });
    states.setStep(userId, 'awaiting_sphere');
    ctx.reply('Что хотите улучшить?', { attachments: [sphereKeyboard] });
  } else {
    ctx.reply('Выберите действие:', { attachments: [actionKeyboard] });
  }
}

export function handleSolarYear(ctx: any, text: string, states: StateManager): void {
  const userId = getUserId(ctx);
  const year = parseInt(text);
  if (year >= 2020 && year <= 2050) {
    states.setData(userId, { solarYear: year });
    states.setStep(userId, 'awaiting_solar_city');
    ctx.reply(
      'Где планируете встретить день рождения?\n\n' +
      Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n')
    );
  } else {
    ctx.reply('Введите год (2020-2050)');
  }
}

export function handleSolarCity(ctx: any, text: string, states: StateManager): void {
  const userId = getUserId(ctx);
  const coords = getCityCoords(text);
  if (!coords) {
    ctx.reply(
      'Город не найден. Попробуйте:\n' +
      Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n')
    );
    return;
  }
  const data = states.getData(userId);
  states.setData(userId, { solarLat: coords.lat, solarLon: coords.lon, solarCity: text });
  calculateSolar(ctx, states.getData(userId), data.solarYear || new Date().getFullYear(), states);
}

export function handleSphere(ctx: any, text: string, states: StateManager): void {
  const userId = getUserId(ctx);
  const lower = text.toLowerCase();
  const spheres = SPHERES[lower];
  if (!spheres) {
    ctx.reply('Выберите: Карьера / Любовь / Здоровье / Финансы / Творчество / Духовность');
    return;
  }
  states.setData(userId, { spheres });
  calculateBestPlace(ctx, states.getData(userId), states);
}

// ─── Расчёты ─────────────────────────────────────────────

async function calculateNatal(ctx: any, data: Record<string, any>, states: StateManager): Promise<void> {
  const userId = getUserId(ctx);
  ctx.reply('Рассчитываю натальную карту...');

  try {
    const response = await axios.post(`${CORE_API}/api/natal`, {
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: data.birthLat,
      longitude: data.birthLon,
      house_system: 'P',
    });

    const result = response.data;
    const planetTable = formatPlanetTable(result.planets);
    const aspects = formatAspects(result.aspects);

    const message =
      `Натальная карта\n` +
      `${data.birthDate} ${data.birthTime}, ${data.birthCity}\n\n` +
      `Планеты:\n${planetTable}\n\n` +
      `ASC: ${Math.round(result.asc)}° | MC: ${Math.round(result.mc)}°\n\n` +
      `Аспекты:\n${aspects}`;

    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [actionKeyboard] });
  } catch (err: any) {
    console.error('Ошибка расчёта натала:', err.message);
    ctx.reply('Ошибка при расчёте. Попробуйте снова.\n/start');
  }
}

async function calculateSolar(ctx: any, data: Record<string, any>, year: number, states: StateManager): Promise<void> {
  const userId = getUserId(ctx);
  ctx.reply(`Рассчитываю соляр на ${year} год в ${data.solarCity || 'Москве'}...`);

  try {
    const response = await axios.post(`${CORE_API}/api/solar`, {
      natal: {
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        latitude: data.birthLat,
        longitude: data.birthLon,
        house_system: 'P',
      },
      year,
      latitude: data.solarLat || data.birthLat,
      longitude: data.solarLon || data.birthLon,
    });

    const result = response.data;
    const planetTable = formatPlanetTable(result.planets);
    const aspects = formatAspects(result.aspects);

    const overlay = Object.entries(result.overlay)
      .map(([planet, house]) => `${capitalize(planet)} соляра в ${house}-м натальном доме`)
      .join('\n');

    const message =
      `Солярная карта на ${year} год\n` +
      `Место: ${data.solarCity || 'Москва'}\n` +
      `Момент соляра: ${result.solar_datetime_utc}\n\n` +
      `Планеты:\n${planetTable}\n\n` +
      `ASC: ${Math.round(result.asc)}° | MC: ${Math.round(result.mc)}°\n\n` +
      `Наложение на натал:\n${overlay}`;

    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [actionKeyboard] });
  } catch (err: any) {
    console.error('Ошибка расчёта соляра:', err.message);
    ctx.reply('Ошибка при расчёте. Попробуйте снова.\n/start');
  }
}

async function calculateBestPlace(ctx: any, data: Record<string, any>, states: StateManager): Promise<void> {
  const userId = getUserId(ctx);
  ctx.reply('Ищу лучшие места для встречи дня рождения...');

  try {
    const response = await axios.post(`${CORE_API}/api/best-place`, {
      natal: {
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        latitude: data.birthLat,
        longitude: data.birthLon,
        house_system: 'P',
      },
      year: new Date().getFullYear(),
      spheres: data.spheres,
      top_n: 5,
    });

    const results = response.data.results;
    if (results.length === 0) {
      ctx.reply('Не удалось найти подходящие места. Попробуйте другую сферу.');
      return;
    }

    const message =
      `Лучшие места для встречи дня рождения\n` +
      `Сфера: ${data.spheres.join(', ')}\n\n` +
      results.map((r: any, i: number) =>
        `${i + 1}. ${r.city} (${r.country}) — ${r.score > 0 ? '+' : ''}${r.score}\n` +
        r.details.slice(0, 3).map((d: string) => `   ${d}`).join('\n')
      ).join('\n\n');

    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [actionKeyboard] });
  } catch (err: any) {
    console.error('Ошибка расчёта лучшего места:', err.message);
    ctx.reply('Ошибка при расчёте. Попробуйте снова.\n/start');
  }
}

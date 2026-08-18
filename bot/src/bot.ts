import { Keyboard } from '@maxhub/max-bot-api';
import { StateManager } from './state';
import * as api from './api';

// ── Клавиатуры ──────────────────────────────────────────────────

// Стартовое меню
export const startKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Натальная карта', 'natal', { intent: 'positive' }),
    Keyboard.button.callback('Соляр', 'solar', { intent: 'positive' }),
  ],
  [
    Keyboard.button.callback('Лучшее место', 'bestplace'),
    Keyboard.button.callback('Колесо карты', 'chart'),
  ],
  [
    Keyboard.button.callback('Мои профили', 'profile_cmd'),
    Keyboard.button.callback('История', 'history_cmd'),
  ],
]);

// После расчёта натала
export const natalResultKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Описание', 'description'),
    Keyboard.button.callback('Колесо карты', 'chart'),
  ],
  [
    Keyboard.button.callback('Соляр', 'solar'),
    Keyboard.button.callback('Лучшее место', 'bestplace'),
  ],
  [
    Keyboard.button.callback('В начало', 'start_cmd'),
  ],
]);

// Выбор типа карты для описания (натал/соляр)
export const chartTypeKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Натальная карта', 'desc_natal'),
    Keyboard.button.callback('Соляр', 'desc_solar'),
  ],
  [
    Keyboard.button.callback('Назад', 'natal_back'),
    Keyboard.button.callback('В начало', 'start_cmd'),
  ],
]);

// Построить клавиатуру списка соляров
export function buildSolarListKeyboard(solars: any[]) {
  const buttons = solars.map((s: any) => {
    const params = s.input_params || {};
    const label = `Соляр ${params.year || '?'} ${params.city || ''}`;
    return [Keyboard.button.callback(label, `desc_solar_chart:${s.id}`)];
  });
  buttons.push([Keyboard.button.callback('Назад', 'description'), Keyboard.button.callback('В начало', 'start_cmd')]);
  return Keyboard.inlineKeyboard(buttons);
}

// Выбор типа описания
export const descKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('Краткое', 'desc_short'),
    Keyboard.button.callback('Полное', 'desc_full'),
  ],
  [
    Keyboard.button.callback('Назад', 'natal_back'),
    Keyboard.button.callback('В начало', 'start_cmd'),
  ],
]);

// Полное описание — показать или скачать
export const fullDescKeyboard = Keyboard.inlineKeyboard([
  [
    Keyboard.button.callback('На экран', 'desc_screen'),
    Keyboard.button.callback('Скачать файл', 'desc_download'),
  ],
  [
    Keyboard.button.callback('Назад', 'description'),
    Keyboard.button.callback('В начало', 'start_cmd'),
  ],
]);

// Сферы для лучшего места
export const sphereKeyboard = Keyboard.inlineKeyboard([
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
  [
    Keyboard.button.callback('Назад', 'start_cmd'),
  ],
]);

// Города (fallback, если API недоступен)
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
  'липецк': { lat: 52.6031, lon: 39.5708 },
};

const SPHERES: Record<string, string[]> = {
  'карьера': ['career'],
  'любовь': ['love'],
  'здоровье': ['health'],
  'финансы': ['finance'],
  'творчество': ['creativity'],
  'духовность': ['spirituality'],
};

export function parseDate(text: string): string | null {
  // Нормализуем: запятые → точки, множественные пробелы → один
  let cleaned = text.trim().replace(/[,]/g, '.').replace(/\s+/g, ' ');

  // Паттерн: день.месяц.год (разделители: точка, пробел, /, -)
  const match = cleaned.match(/^(\d{1,2})[.\s\/\-](\d{1,2})[.\s\/\-](\d{2,4})$/);
  if (!match) return null;

  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  let year = parseInt(match[3]);

  // Конвертируем 2-значный год: 00-30 → 2000+, 31-99 → 1900+
  if (year < 100) {
    year = year <= 30 ? 2000 + year : 1900 + year;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return null;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parseTime(text: string): string | null {
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

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPlanetTable(planets: any[]): string {
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

export function formatAspects(aspects: any[]): string {
  const aspectNames: Record<string, string> = {
    conjunction: 'соединение', sextile: 'секстиль', square: 'квадратура',
    trine: 'тригон', opposition: 'оппозиция',
  };
  return aspects.slice(0, 8).map(a =>
    `${capitalize(a.planet1)} — ${capitalize(a.planet2)}: ${aspectNames[a.aspect_type] || a.aspect_type}`
  ).join('\n');
}

// ── Поиск города с автодополнением ───────────────────────────────

export async function findCityCoords(text: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const lower = text.toLowerCase().trim();

  // Сначала быстрый поиск по хардкоду
  if (QUICK_CITIES[lower]) {
    return { ...QUICK_CITIES[lower], name: text };
  }

  // Поиск через API
  try {
    const cities = await api.searchCities(text);
    if (cities.length === 1) {
      return { lat: cities[0].lat, lon: cities[0].lon, name: cities[0].name };
    }
    if (cities.length > 1) {
      // Сохраняем кандидатов в state для выбора
      return null; // Вызывающий код должен обработать
    }
  } catch {
    // Fallback — ничего не нашли
  }
  return null;
}

export async function getCitySuggestions(query: string): Promise<string[]> {
  try {
    const cities = await api.searchCities(query);
    return cities.slice(0, 5).map((c: any) => `${c.name} (${c.country})`);
  } catch {
    return Object.keys(QUICK_CITIES).map(c => capitalize(c)).slice(0, 5);
  }
}

// ── Обработчики диалога ──────────────────────────────────────────

export function getUserId(ctx: any): number {
  // MAX Bot API: для callback'ов пользователь в ctx.user (SDK берёт из update.callback.user)
  // Для сообщений — в ctx.message.sender.user_id
  const id =
    ctx.user?.user_id ??
    ctx.message?.sender?.user_id ??
    ctx.message?.sender_id ??
    0;

  if (!id) {
    console.warn('[getUserId] Не удалось определить userId. ctx keys:', Object.keys(ctx));
    if (ctx.update) {
      console.warn('[getUserId] update type:', ctx.update.update_type);
      console.warn('[getUserId] update.callback:', JSON.stringify(ctx.update.callback)?.slice(0, 200));
    }
  }

  return id;
}

export async function handleStart(ctx: any, userId: number, userName?: string): Promise<void> {
  // Регистрируем пользователя
  await api.registerUser(userId, userName);

  // Берём только имя (первое слово), убираем фамилию
  const firstName = userName?.split(/\s+/)[0] || '';

  // Проверяем, есть ли сохранённые профили
  const profiles = await api.getProfiles(userId);

  let greeting = '';
  if (firstName) {
    greeting = `Привет, ${firstName}!\n\n`;
  } else {
    greeting = 'Добро пожаловать!\n\n';
  }

  greeting += 'Я помогу рассчитать:\n';
  greeting += '• Натальную карту — карта рождения\n';
  greeting += '• Соляр — прогноз на год\n';
  greeting += '• Лучшее место — где встретить день рождения\n';

  if (profiles.length > 0) {
    greeting += '\nВаши профили:\n';
    profiles.forEach((p: any) => {
      greeting += `• ${p.label}: ${p.birth_date || '—'} ${p.birth_time || ''}\n`;
    });
    greeting += '\nВыберите действие:';
  } else {
    greeting += '\nДля начала мне понадобятся ваши данные рождения.';
  }

  ctx.reply(greeting, { attachments: [startKeyboard] });
}

export function handleBirthDate(ctx: any, text: string, states: StateManager, userId: number): void {
  const date = parseDate(text);
  if (!date) {
    ctx.reply('Не удалось распознать дату. Попробуйте так:\n\n15.03.1990\n15/03/1990\n15 03 1990\n15.03.90');
    return;
  }
  states.setData(userId, { birthDate: date });
  states.setStep(userId, 'awaiting_birth_time');
  ctx.reply('Введите время рождения в формате ЧЧ:ММ\n\nЕсли не знаете точное время — напишите "не знаю"');
}

export function handleBirthTime(ctx: any, text: string, states: StateManager, userId: number): void {
  const time = parseTime(text);
  if (!time) {
    ctx.reply('Неверный формат времени. Введите в формате ЧЧ:ММ\n\nНапример: 14:30');
    return;
  }
  states.setData(userId, { birthTime: time });
  states.setStep(userId, 'awaiting_birth_city');
  ctx.reply('Введите город рождения\n\nМосква, Санкт-Петербург, Сочи, Дубай, Стамбул...\n\nНачните вводить — покажу варианты');
}

export async function handleBirthCity(ctx: any, text: string, states: StateManager, userId: number): Promise<void> {
  const coords = await findCityCoords(text);
  if (!coords) {
    const suggestions = await getCitySuggestions(text);
    if (suggestions.length > 0) {
      ctx.reply('Город не найден. Возможно, вы имели в виду:\n\n' + suggestions.map(s => `• ${s}`).join('\n'));
    } else {
      ctx.reply('Город не найден. Попробуйте:\n' + Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n'));
    }
    return;
  }
  states.setData(userId, { birthLat: coords.lat, birthLon: coords.lon, birthCity: coords.name });
  const data = states.getData(userId);

  if (data.action === 'natal') {
    await calculateNatal(ctx, data, states, userId);
  } else if (data.action === 'solar') {
    states.setStep(userId, 'awaiting_solar_city');
    ctx.reply(
      'Данные рождения сохранены!\n\nГде планируете встретить день рождения?\n\n' +
      Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n') +
      '\n\nИли введите свой город'
    );
  } else if (data.action === 'bestplace') {
    states.setStep(userId, 'awaiting_sphere');
    ctx.reply('Что хотите улучшить?', { attachments: [sphereKeyboard] });
  }
}

export function handleAction(ctx: any, text: string, states: StateManager, userId: number): void {
  const data = states.getData(userId);
  const lower = text.toLowerCase();

  if (lower.includes('натал')) {
    calculateNatal(ctx, data, states, userId);
  } else if (lower.includes('соляр') && lower.includes('другой')) {
    states.setStep(userId, 'awaiting_solar_year');
    ctx.reply('Введите год соляра (например: 2026)');
  } else if (lower.includes('соляр') || lower.includes('текущий')) {
    states.setData(userId, { solarYear: new Date().getFullYear() });
    states.setStep(userId, 'awaiting_solar_city');
    ctx.reply('Где планируете встретить день рождения?\n\nНачните вводить город...');
  } else if (lower.includes('лучшее') || lower.includes('место')) {
    states.setData(userId, { action: 'bestplace' });
    states.setStep(userId, 'awaiting_sphere');
    ctx.reply('Что хотите улучшить?', { attachments: [sphereKeyboard] });
  } else if (parseDate(text)) {
    // Пользователь ввёл дату — начинаем новый расчёт натала
    states.setData(userId, { birthDate: parseDate(text), action: 'natal' });
    states.setStep(userId, 'awaiting_birth_time');
    ctx.reply('Введите время рождения в формате ЧЧ:ММ\n\nЕсли не знаете — напишите "не знаю"');
  } else {
    ctx.reply('Выберите действие:', { attachments: [startKeyboard] });
  }
}

export function handleSolarYear(ctx: any, text: string, states: StateManager, userId: number): void {
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

export async function handleSolarCity(ctx: any, text: string, states: StateManager, userId: number): Promise<void> {
  const coords = await findCityCoords(text);
  if (!coords) {
    const suggestions = await getCitySuggestions(text);
    if (suggestions.length > 0) {
      ctx.reply('Город не найден. Возможно:\n\n' + suggestions.map(s => `• ${s}`).join('\n'));
    } else {
      ctx.reply('Город не найден. Попробуйте:\n' + Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n'));
    }
    return;
  }
  const data = states.getData(userId);
  states.setData(userId, { solarLat: coords.lat, solarLon: coords.lon, solarCity: coords.name });
  await calculateSolar(ctx, states.getData(userId), data.solarYear || new Date().getFullYear(), states, userId);
}

export async function handleSphere(ctx: any, text: string, states: StateManager, userId: number): Promise<void> {
  const lower = text.toLowerCase();
  const spheres = SPHERES[lower];
  if (!spheres) {
    ctx.reply('Выберите: Карьера / Любовь / Здоровье / Финансы / Творчество / Духовность');
    return;
  }
  states.setData(userId, { spheres });
  await calculateBestPlace(ctx, states.getData(userId), states, userId);
}

// ── Профили ──────────────────────────────────────────────────────

const profileKeyboard = Keyboard.inlineKeyboard([
  [Keyboard.button.callback('Добавить человека', 'add_profile')],
  [Keyboard.button.callback('Назад', 'start_cmd')],
]);

export async function handleProfileCommand(ctx: any, userId: number): Promise<void> {
  try {
    const profiles = await api.getProfiles(userId);

    if (profiles.length === 0) {
      ctx.reply('У вас пока нет сохранённых профилей.\n\nПрофили создаются автоматически при расчёте натальной карты.', { attachments: [profileKeyboard] });
      return;
    }

    const list = profiles.map((p: any, i: number) =>
      `${i + 1}. ${p.label}\n   Дата: ${p.birth_date || '—'} ${p.birth_time || ''}\n   Город: ${p.city_name || '—'}`
    ).join('\n\n');

    ctx.reply(`Ваши профили:\n\n${list}`, { attachments: [profileKeyboard] });
  } catch (err: any) {
    console.error('[profile] Ошибка:', err.message);
    ctx.reply('Ошибка загрузки профилей.', { attachments: [profileKeyboard] });
  }
}

export async function handleProfileAdd(ctx: any, text: string, userId: number): Promise<void> {
  // Формат: /profile_add Имя ДД.ММ.ГГГГ ЧЧ:ММ Город
  const parts = text.replace('/profile_add', '').trim().split(/\s+/);
  if (parts.length < 2) {
    ctx.reply('Формат: /profile_add Имя ДД.ММ.ГГГГ ЧЧ:ММ Город\n\nПример: /profile_add Мама 25.06.1965 10:30 Москва');
    return;
  }

  const label = parts[0];
  const dateStr = parts[1];
  const timeStr = parts[2] || '12:00';
  const cityStr = parts.slice(3).join(' ') || 'Москва';

  const date = parseDate(dateStr);
  const time = parseTime(timeStr);
  if (!date) {
    ctx.reply('Неверный формат даты. Используйте ДД.ММ.ГГГГ');
    return;
  }

  const coords = await findCityCoords(cityStr);
  const lat = coords?.lat || 55.7558;
  const lon = coords?.lon || 37.6173;

  const profile = await api.createProfile({
    user_id: userId,
    label,
    birth_date: date,
    birth_time: time || '12:00',
    latitude: lat,
    longitude: lon,
    city_name: coords?.name || cityStr,
  });

  if (profile) {
    ctx.reply(`Профиль "${label}" создан!\nДата: ${date} ${time}\nГород: ${coords?.name || cityStr}`);
  } else {
    ctx.reply('Ошибка создания профиля.');
  }
}

// ── Интерактивное создание профиля ────────────────────────────────

export function handleProfileName(ctx: any, text: string, states: StateManager, userId: number): void {
  const name = text.trim();
  if (!name || name.length < 1) {
    ctx.reply('Введите имя (например: Мама, Петр, Аня):');
    return;
  }
  states.setData(userId, { profileName: name });
  states.setStep(userId, 'awaiting_profile_date');
  ctx.reply(`Имя: ${name}\n\nТеперь введите дату рождения в формате ДД.ММ.ГГГГ`);
}

export function handleProfileDate(ctx: any, text: string, states: StateManager, userId: number): void {
  const date = parseDate(text);
  if (!date) {
    ctx.reply('Не удалось распознать дату. Попробуйте:\n15.03.1990\n15/03/1990\n15 03 1990');
    return;
  }
  states.setData(userId, { profileDate: date });
  states.setStep(userId, 'awaiting_profile_time');
  ctx.reply('Введите время рождения в формате ЧЧ:ММ\n\nЕсли не знаете — напишите "не знаю"');
}

export function handleProfileTime(ctx: any, text: string, states: StateManager, userId: number): void {
  const time = parseTime(text);
  if (!time) {
    ctx.reply('Неверный формат времени. Введите в формате ЧЧ:ММ\n\nНапример: 14:30');
    return;
  }
  states.setData(userId, { profileTime: time });
  states.setStep(userId, 'awaiting_profile_city');
  ctx.reply('Введите место рождения (город):\n\nНачните вводить — покажу варианты');
}

export async function handleProfileCity(ctx: any, text: string, states: StateManager, userId: number): Promise<void> {
  const coords = await findCityCoords(text);
  if (!coords) {
    const suggestions = await getCitySuggestions(text);
    if (suggestions.length > 0) {
      ctx.reply('Город не найден. Возможно:\n\n' + suggestions.map(s => `• ${s}`).join('\n'));
    } else {
      ctx.reply('Город не найден. Попробуйте:\n' + Object.keys(QUICK_CITIES).map(c => `• ${capitalize(c)}`).join('\n'));
    }
    return;
  }

  const data = states.getData(userId);
  const profile = await api.createProfile({
    user_id: userId,
    label: data.profileName,
    birth_date: data.profileDate,
    birth_time: data.profileTime,
    latitude: coords.lat,
    longitude: coords.lon,
    city_name: coords.name,
  });

  if (profile) {
    ctx.reply(`Профиль "${data.profileName}" создан!\nДата: ${data.profileDate} ${data.profileTime}\nГород: ${coords.name}`, { attachments: [startKeyboard] });
  } else {
    ctx.reply('Ошибка создания профиля.', { attachments: [startKeyboard] });
  }

  states.setStep(userId, 'awaiting_action');
}

// ── История ──────────────────────────────────────────────────────

export async function handleHistoryCommand(ctx: any, userId: number): Promise<void> {
  const history = await api.getHistory(userId, 10);
  if (history.length === 0) {
    ctx.reply('История пуста. Сделайте первый расчёт!');
    return;
  }

  const actionNames: Record<string, string> = {
    natal: 'Натальная карта',
    solar: 'Соляр',
    bestplace: 'Лучшее место',
    chart: 'Колесо карты',
  };

  const list = history.map((h: any) => {
    const date = new Date(h.created_at).toLocaleDateString('ru-RU');
    const action = actionNames[h.action] || h.action;
    const profile = h.profile_label ? ` (${h.profile_label})` : '';
    return `• ${date} — ${action}${profile}`;
  }).join('\n');

  ctx.reply(`Последние расчёты:\n\n${list}`);
}

// ── Выбор персоны ────────────────────────────────────────────────

export async function showPersonSelector(ctx: any, userId: number, states: StateManager, action: string): Promise<void> {
  const persons = await api.getPersons(userId);

  if (persons.length === 0) {
    // Нет сохранённых персон — обычный ввод данных
    states.reset(userId);
    states.setStep(userId, 'awaiting_birth_date');
    states.setData(userId, { action });
    ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    return;
  }

  // Есть персоны — показываем выбор
  states.setData(userId, { action, pendingAction: action });
  states.setStep(userId, 'awaiting_person_selection');

  const buttons = persons.map((p: any) => {
    const label = p.label + (p.birth_date ? ` (${p.birth_date})` : '');
    return [Keyboard.button.callback(label, `person:${p.id}`)];
  });
  buttons.push([Keyboard.button.callback('+ Новый человек', 'person:new')]);

  const keyboard = Keyboard.inlineKeyboard(buttons);
  ctx.reply('Для кого рассчитать карту?', { attachments: [keyboard] });
}

export async function handlePersonSelection(ctx: any, userId: number, states: StateManager, personId: string): Promise<void> {
  const data = states.getData(userId);
  const action = data.pendingAction || data.action || 'natal';

  if (personId === 'new') {
    // Новый человек — стандартный ввод
    states.reset(userId);
    states.setStep(userId, 'awaiting_birth_date');
    states.setData(userId, { action });
    ctx.reply('Введите дату рождения в формате ДД.ММ.ГГГГ\n\nНапример: 15.03.1990');
    return;
  }

  // Выбрана существующая персона
  const person = await api.getPersons(userId).then((ps: any[]) => ps.find((p: any) => String(p.id) === personId));
  if (!person || !person.birth_date) {
    ctx.reply('Данные персоны неполны. Введите данные вручную:', { attachments: [startKeyboard] });
    states.reset(userId);
    return;
  }

  // Заполняем данные из персоны
  states.setData(userId, {
    birthDate: person.birth_date,
    birthTime: person.birth_time || '12:00',
    birthLat: person.latitude,
    birthLon: person.longitude,
    birthCity: person.birth_place || '',
    personId: person.id,
    personLabel: person.label,
  });

  if (action === 'natal') {
    await calculateNatal(ctx, states.getData(userId), states, userId);
  } else if (action === 'solar') {
    states.setData(userId, { solarYear: new Date().getFullYear() });
    states.setStep(userId, 'awaiting_solar_city');
    ctx.reply(
      `Данные: ${person.label}, ${person.birth_date}\n\n` +
      'Где планируете встретить день рождения?\n\nНачните вводить город...'
    );
  } else if (action === 'bestplace') {
    states.setStep(userId, 'awaiting_sphere');
    ctx.reply('Что хотите улучшить?', { attachments: [sphereKeyboard] });
  }
}

// ── Расчёты ──────────────────────────────────────────────────────

export async function calculateNatal(ctx: any, data: Record<string, any>, states: StateManager, userId: number): Promise<void> {
  ctx.reply('Рассчитываю натальную карту...');

  try {
    const result = await api.calculateNatal({
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: data.birthLat,
      longitude: data.birthLon,
    });

    const planetTable = formatPlanetTable(result.planets);
    const aspects = formatAspects(result.aspects);

    const message =
      `Натальная карта\n` +
      `${data.birthDate} ${data.birthTime}, ${data.birthCity}\n\n` +
      `Планеты:\n${planetTable}\n\n` +
      `ASC: ${Math.round(result.asc)}° | MC: ${Math.round(result.mc)}°\n\n` +
      `Аспекты:\n${aspects}`;

    // Сохраняем в историю
    await api.addHistory(userId, 'natal', undefined, { birthDate: data.birthDate }, { planets: result.planets?.length });

    // Сохраняем/обновляем профиль (обратная совместимость)
    const profiles = await api.getProfiles(userId);
    if (profiles.length === 0) {
      await api.createProfile({
        user_id: userId,
        label: 'Мой профиль',
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        latitude: data.birthLat,
        longitude: data.birthLon,
        city_name: data.birthCity,
      });
    }

    // Сохраняем персону, если ещё нет
    let personId = data.personId;
    if (!personId) {
      const person = await api.createPerson({
        user_id: userId,
        label: data.personLabel || 'Я',
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        latitude: data.birthLat,
        longitude: data.birthLon,
        birth_place: data.birthCity,
      });
      if (person) {
        personId = person.id;
        states.setData(userId, { personId });
      }
    }

    // Сохраняем расчёт в charts
    if (personId) {
      await api.saveChart({
        person_id: personId,
        type: 'natal',
        input_params: { birth_date: data.birthDate, birth_time: data.birthTime },
        result_data: { planets: result.planets?.length, asc: result.asc, mc: result.mc },
      });
    }

    // Сохраняем данные натала для последующего использования (описание)
    states.setData(userId, { lastNatalResult: result });
    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [natalResultKeyboard] });
  } catch (err: any) {
    console.error('Ошибка расчёта натала:', err.message);
    states.setStep(userId, 'awaiting_action');
    ctx.reply('Ошибка при расчёте. Попробуйте снова.', { attachments: [startKeyboard] });
  }
}

export async function calculateSolar(ctx: any, data: Record<string, any>, year: number, states: StateManager, userId: number): Promise<void> {
  ctx.reply(`Рассчитываю соляр на ${year} год в ${data.solarCity || 'Москве'}...`);

  try {
    const result = await api.calculateSolar(
      { birth_date: data.birthDate, birth_time: data.birthTime, latitude: data.birthLat, longitude: data.birthLon },
      year,
      data.solarLat || data.birthLat,
      data.solarLon || data.birthLon,
    );

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

    await api.addHistory(userId, 'solar', undefined, { year, city: data.solarCity }, { planets: result.planets?.length });

    // Сохраняем расчёт соляра в charts
    if (data.personId) {
      await api.saveChart({
        person_id: data.personId,
        type: 'solar',
        input_params: { year, city: data.solarCity, latitude: data.solarLat, longitude: data.solarLon },
        result_data: { planets: result.planets?.length, asc: result.asc, mc: result.mc, overlay: result.overlay },
      });
    }

    states.setData(userId, { lastSolarResult: result, lastSolarYear: year, lastSolarCity: data.solarCity });
    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [natalResultKeyboard] });
  } catch (err: any) {
    console.error('Ошибка расчёта соляра:', err.message);
    states.setStep(userId, 'awaiting_action');
    ctx.reply('Ошибка при расчёте. Попробуйте снова.', { attachments: [startKeyboard] });
  }
}

export async function calculateBestPlace(ctx: any, data: Record<string, any>, states: StateManager, userId: number): Promise<void> {
  ctx.reply('Ищу лучшие места для встречи дня рождения...');

  try {
    const result = await api.calculateBestPlace(
      { birth_date: data.birthDate, birth_time: data.birthTime, latitude: data.birthLat, longitude: data.birthLon },
      new Date().getFullYear(),
      data.spheres,
      5,
    );

    const results = result.results;
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

    await api.addHistory(userId, 'bestplace', undefined, { spheres: data.spheres }, { topCity: results[0]?.city });

    states.setStep(userId, 'awaiting_action');
    ctx.reply(message, { attachments: [natalResultKeyboard] });
  } catch (err: any) {
    console.error('Ошибка расчёта лучшего места:', err.message);
    states.setStep(userId, 'awaiting_action');
    ctx.reply('Ошибка при расчёте. Попробуйте снова.', { attachments: [startKeyboard] });
  }
}

export async function sendChartImage(ctx: any, data: Record<string, any>, userId: number): Promise<void> {
  ctx.reply('Генерирую колесо карты...');
  try {
    const imageData = await api.getChartImage({
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: data.birthLat,
      longitude: data.birthLon,
    });
    console.log(`[img] Размер: ${imageData.length} байт`);
    const image = await ctx.api.uploadImage({ source: imageData });
    await ctx.reply('', { attachments: [image.toJson()] });
    await api.addHistory(userId, 'chart');
  } catch (err: any) {
    console.error('[chart] Ошибка:', err.message);
    ctx.reply('Ошибка генерации колеса. Попробуйте позже.');
  }
}

// ── Описание ──────────────────────────────────────────────────────

const PLANET_NAMES_RU: Record<string, string> = {
  sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера',
  mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран',
  neptune: 'Нептун', pluto: 'Плутон',
};

// Генерация имени файла
export function buildFilename(chartType: string, personName: string, dateOrPeriod: string, ext: string = 'pdf'): string {
  const typeNames: Record<string, string> = {
    natal: 'Натальная карта',
    solar: 'Соляр',
    chart: 'Колесо натальной карты',
    solar_chart: 'Колесо соляра',
  };
  const typeName = typeNames[chartType] || chartType;
  const name = (personName || '').replace(/[/\\:*?"<>|]/g, ' ').trim();
  const date = (dateOrPeriod || '').replace(/[/\\:*?"<>|]/g, ' ').trim();
  let filename = `${typeName} ${name} ${date}.${ext}`.replace(/\s+/g, ' ').trim();
  if (filename.length > 100) {
    filename = filename.slice(0, 96) + '.' + ext;
  }
  return filename;
}

export async function showShortDescription(ctx: any, data: Record<string, any>, userId: number): Promise<void> {
  try {
    const result = await api.getInterpretations({
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: data.birthLat,
      longitude: data.birthLon,
    }, 'short');

    const text = result.text || 'Не удалось сгенерировать описание.';
    ctx.reply(`Краткое описание натальной карты:\n\n${text}`, { attachments: [natalResultKeyboard] });
  } catch (err: any) {
    console.error('[desc] Ошибка:', err.message);
    ctx.reply('Ошибка получения описания.');
  }
}

export async function showFullDescription(ctx: any, data: Record<string, any>, userId: number): Promise<void> {
  try {
    const result = await api.getInterpretations({
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: data.birthLat,
      longitude: data.birthLon,
    }, 'full');

    const text = result.text || 'Не удалось сгенерировать описание.';
    ctx.reply(`Полное описание натальной карты:\n\n${text}`, { attachments: [natalResultKeyboard] });
  } catch (err: any) {
    console.error('[desc] Ошибка:', err.message);
    ctx.reply('Ошибка получения описания.');
  }
}

export async function downloadFullDescription(ctx: any, data: Record<string, any>, userId: number): Promise<void> {
  try {
    const result = await api.getInterpretations({
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      latitude: data.birthLat,
      longitude: data.birthLon,
    }, 'full');

    const text = result.text || 'Не удалось сгенерировать описание.';
    const header = `Натальная карта\nДата: ${data.birthDate} ${data.birthTime}\nГород: ${data.birthCity || ''}\n\n`;
    const fullText = header + text;
    const personName = data.personLabel || '';
    const filename = buildFilename('natal', personName, data.birthDate, 'pdf');

    // Генерируем PDF через Core API
    try {
      const pdfResponse = await require('axios').post(
        `${process.env.CORE_API_URL || 'http://localhost:8000'}/api/generate-pdf`,
        {
          natal: {
            birth_date: data.birthDate,
            birth_time: data.birthTime,
            latitude: data.birthLat,
            longitude: data.birthLon,
          },
          mode: 'full',
        },
        { responseType: 'arraybuffer' }
      );
      const buffer = Buffer.from(pdfResponse.data);
      const file = await ctx.api.uploadFile({ source: buffer, filename });
      await ctx.reply('PDF с полным описанием:', { attachments: [file.toJson()] });
    } catch {
      // Fallback — если PDF не сгенерировался, отправляем текст
      const txtFilename = buildFilename('natal', personName, data.birthDate, 'txt');
      const buffer = Buffer.from(fullText, 'utf-8');
      try {
        const file = await ctx.api.uploadFile({ source: buffer, filename: txtFilename });
        await ctx.reply('Файл с описанием:', { attachments: [file.toJson()] });
      } catch {
        await ctx.reply(fullText, { attachments: [natalResultKeyboard] });
      }
    }
  } catch (err: any) {
    console.error('[desc] Ошибка:', err.message);
    ctx.reply('Ошибка генерации файла.');
  }
}

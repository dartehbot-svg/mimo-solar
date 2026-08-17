import axios from 'axios';

const CORE_API = process.env.CORE_API_URL || 'http://localhost:8000';

// ── Пользователи ─────────────────────────────────────────────────

export async function registerUser(userId: number, name?: string, username?: string) {
  try {
    await axios.post(`${CORE_API}/api/users/register`, {
      user_id: userId,
      name: name || undefined,
      username: username || undefined,
    });
  } catch (err: any) {
    console.warn('[api] registerUser error:', err.message);
  }
}

export async function getUser(userId: number) {
  try {
    const res = await axios.get(`${CORE_API}/api/users/${userId}`);
    return res.data;
  } catch {
    return null;
  }
}

// ── Профили ──────────────────────────────────────────────────────

export async function getProfiles(userId: number) {
  try {
    const res = await axios.get(`${CORE_API}/api/users/${userId}/profiles`);
    return res.data;
  } catch {
    return [];
  }
}

export async function createProfile(data: {
  user_id: number;
  label: string;
  birth_date?: string;
  birth_time?: string;
  latitude?: number;
  longitude?: number;
  city_name?: string;
}) {
  try {
    const res = await axios.post(`${CORE_API}/api/profiles`, data);
    return res.data;
  } catch (err: any) {
    console.warn('[api] createProfile error:', err.message);
    return null;
  }
}

export async function deleteProfile(profileId: number) {
  try {
    await axios.delete(`${CORE_API}/api/profiles/${profileId}`);
    return true;
  } catch {
    return false;
  }
}

// ── История ──────────────────────────────────────────────────────

export async function addHistory(userId: number, action: string, profileId?: number, requestData?: any, responseData?: any) {
  try {
    await axios.post(`${CORE_API}/api/history`, {
      user_id: userId,
      action,
      profile_id: profileId,
      request_data: requestData,
      response_data: responseData,
    });
  } catch (err: any) {
    console.warn('[api] addHistory error:', err.message);
  }
}

export async function getHistory(userId: number, limit = 10) {
  try {
    const res = await axios.get(`${CORE_API}/api/history/${userId}?limit=${limit}`);
    return res.data;
  } catch {
    return [];
  }
}

// ── Города ───────────────────────────────────────────────────────

export async function searchCities(query: string) {
  try {
    const res = await axios.get(`${CORE_API}/api/cities/search`, { params: { q: query } });
    return res.data;
  } catch {
    return [];
  }
}

// ── Расчёты ──────────────────────────────────────────────────────

export async function calculateNatal(data: {
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
}) {
  const res = await axios.post(`${CORE_API}/api/natal`, { ...data, house_system: 'P' });
  return res.data;
}

export async function calculateSolar(natal: any, year: number, lat: number, lon: number) {
  const res = await axios.post(`${CORE_API}/api/solar`, {
    natal: { ...natal, house_system: 'P' },
    year,
    latitude: lat,
    longitude: lon,
  });
  return res.data;
}

export async function calculateBestPlace(natal: any, year: number, spheres: string[], topN = 5) {
  const res = await axios.post(`${CORE_API}/api/best-place`, {
    natal: { ...natal, house_system: 'P' },
    year,
    spheres,
    top_n: topN,
  });
  return res.data;
}

export async function getChartImage(data: {
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
}) {
  const res = await axios.post(`${CORE_API}/api/chart-image`, data, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

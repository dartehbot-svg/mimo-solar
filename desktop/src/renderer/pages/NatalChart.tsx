import React, { useState } from 'react';
import PlanetTable from '../components/PlanetTable';
import ChartWheel from '../components/ChartWheel';

interface Props {
  onCalculated: (data: any) => void;
}

export default function NatalChart({ onCalculated }: Props) {
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CITIES: Record<string, { lat: number; lon: number }> = {
    'москва': { lat: 55.7558, lon: 37.6173 },
    'санкт-петербург': { lat: 59.9343, lon: 30.3351 },
    'сочи': { lat: 43.6028, lon: 39.7342 },
    'дубай': { lat: 25.2048, lon: 55.2708 },
    'стамбул': { lat: 41.0082, lon: 28.9784 },
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    const coords = CITIES[value.toLowerCase()];
    if (coords) {
      setLat(String(coords.lat));
      setLon(String(coords.lon));
    }
  };

  const handleCalculate = async () => {
    if (!birthDate || !birthTime || !lat || !lon) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await (window as any).api.coreRequest('POST', '/api/natal', {
        birth_date: birthDate,
        birth_time: birthTime,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        house_system: 'P',
      });

      if (res.success) {
        setResult(res.data);
        onCalculated(res.data);
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Натальная карта</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Время рождения</label>
            <input
              type="time"
              value={birthTime}
              onChange={e => setBirthTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
            <input
              type="text"
              value={city}
              onChange={e => handleCityChange(e.target.value)}
              placeholder="Москва"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Широта</label>
              <input
                type="number"
                value={lat}
                onChange={e => setLat(e.target.value)}
                step="0.0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Долгота</label>
              <input
                type="number"
                value={lon}
                onChange={e => setLon(e.target.value)}
                step="0.0001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Рассчитываю...' : 'Рассчитать'}
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-center">
            <ChartWheel
              planets={result.planets}
              cusps={result.houses}
              width={480}
              height={480}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Позиции планет</h3>
            <PlanetTable planets={result.planets} />
            <div className="mt-4 text-sm text-gray-600">
              <span className="font-medium">ASC:</span> {Math.round(result.asc)}° |
              <span className="font-medium ml-2">MC:</span> {Math.round(result.mc)}° |
              <span className="font-medium ml-2">Система домов:</span> {result.house_system}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

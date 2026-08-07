import React, { useState } from 'react';
import PlanetTable from '../components/PlanetTable';
import ChartWheel from '../components/ChartWheel';

interface Props {
  natalData: any;
}

export default function SolarChart({ natalData }: Props) {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [solarLat, setSolarLat] = useState('');
  const [solarLon, setSolarLon] = useState('');
  const [solarCity, setSolarCity] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CITIES: Record<string, { lat: number; lon: number }> = {
    'москва': { lat: 55.7558, lon: 37.6173 },
    'санкт-петербург': { lat: 59.9343, lon: 30.3351 },
    'сочи': { lat: 43.6028, lon: 39.7342 },
    'дубай': { lat: 25.2048, lon: 55.2708 },
    'стамбул': { lat: 41.0082, lon: 28.9784 },
    'париж': { lat: 48.8566, lon: 2.3522 },
    'лондон': { lat: 51.5074, lon: -0.1278 },
    'нью-йорк': { lat: 40.7128, lon: -74.0060 },
  };

  const handleCityChange = (value: string) => {
    setSolarCity(value);
    const coords = CITIES[value.toLowerCase()];
    if (coords) {
      setSolarLat(String(coords.lat));
      setSolarLon(String(coords.lon));
    }
  };

  const handleCalculate = async () => {
    if (!natalData) {
      setError('Сначала рассчитайте натальную карту');
      return;
    }
    if (!solarLat || !solarLon) {
      setError('Укажите место встречи дня рождения');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await (window as any).api.coreRequest('POST', '/api/solar', {
        natal: {
          birth_date: natalData.birth_date,
          birth_time: natalData.birth_time,
          latitude: natalData.latitude,
          longitude: natalData.longitude,
          house_system: 'P',
        },
        year: parseInt(year),
        latitude: parseFloat(solarLat),
        longitude: parseFloat(solarLon),
      });

      if (res.success) {
        setResult(res.data);
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Солярная карта</h2>

      {!natalData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-yellow-800">
          Сначала рассчитайте натальную карту на вкладке «Натальная карта»
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Год соляра</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              min="2020"
              max="2050"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Город встречи дня рождения</label>
            <input
              type="text"
              value={solarCity}
              onChange={e => handleCityChange(e.target.value)}
              placeholder="Москва"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Широта</label>
            <input
              type="number"
              value={solarLat}
              onChange={e => setSolarLat(e.target.value)}
              step="0.0001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Долгота</label>
            <input
              type="number"
              value={solarLon}
              onChange={e => setSolarLon(e.target.value)}
              step="0.0001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleCalculate}
          disabled={loading || !natalData}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Рассчитываю...' : 'Рассчитать соляр'}
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
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Соляр на {result.year} год
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Момент соляра: {result.solar_datetime_utc}
            </p>
            <PlanetTable planets={result.planets} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Наложение на натал</h3>
            <div className="space-y-2">
              {Object.entries(result.overlay).map(([planet, house]) => (
                <div key={planet} className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{planet}</span>
                  <span className="text-gray-600">соляра в {String(house)}-м натальном доме</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

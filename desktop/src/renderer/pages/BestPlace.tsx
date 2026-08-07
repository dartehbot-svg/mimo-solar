import React, { useState } from 'react';

interface Props {
  natalData: any;
}

const SPHERES = [
  { id: 'career', label: 'Карьера', icon: '💼' },
  { id: 'love', label: 'Любовь', icon: '❤️' },
  { id: 'health', label: 'Здоровье', icon: '🏥' },
  { id: 'finance', label: 'Финансы', icon: '💰' },
  { id: 'creativity', label: 'Творчество', icon: '🎨' },
  { id: 'spirituality', label: 'Духовность', icon: '🔮' },
];

export default function BestPlace({ natalData }: Props) {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>(['career']);
  const [visaFreeOnly, setVisaFreeOnly] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSphere = (id: string) => {
    setSelectedSpheres(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSearch = async () => {
    if (!natalData) {
      setError('Сначала рассчитайте натальную карту');
      return;
    }
    if (selectedSpheres.length === 0) {
      setError('Выберите хотя бы одну сферу');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await (window as any).api.coreRequest('POST', '/api/best-place', {
        natal: {
          birth_date: natalData.birth_date,
          birth_time: natalData.birth_time,
          latitude: natalData.latitude,
          longitude: natalData.longitude,
          house_system: 'P',
        },
        year: parseInt(year),
        spheres: selectedSpheres,
        visa_free_only: visaFreeOnly,
        top_n: 10,
      });

      if (res.success) {
        setResults(res.data.results);
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Лучшее место для встречи дня рождения</h2>

      {!natalData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-yellow-800">
          Сначала рассчитайте натальную карту на вкладке «Натальная карта»
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
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
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visaFreeOnly}
                onChange={e => setVisaFreeOnly(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Только без визы для РФ</span>
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Что хотите улучшить?</label>
          <div className="flex flex-wrap gap-2">
            {SPHERES.map(sphere => (
              <button
                key={sphere.id}
                onClick={() => toggleSphere(sphere.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedSpheres.includes(sphere.id)
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {sphere.icon} {sphere.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSearch}
          disabled={loading || !natalData}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Ищу...' : 'Найти лучшие места'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">Результаты</h3>
          {results.map((r, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl shadow-sm border p-4 ${
                i === 0 ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-lg font-bold text-indigo-600 mr-2">#{i + 1}</span>
                  <span className="text-lg font-semibold text-gray-800">{r.city}</span>
                  <span className="text-sm text-gray-500 ml-2">{r.country}</span>
                </div>
                <span className={`text-lg font-bold ${r.score > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {r.score > 0 ? '+' : ''}{r.score}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {r.details.slice(0, 5).map((d: string, j: number) => (
                  <div key={j}>{d}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

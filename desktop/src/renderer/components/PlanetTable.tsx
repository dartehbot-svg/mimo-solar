import React from 'react';

interface Planet {
  name: string;
  sign: string;
  sign_degree: number;
  sign_minute: number;
  sign_second: number;
  house: number | null;
  retrograde: boolean;
  symbol: string;
}

const PLANET_NAMES: Record<string, string> = {
  sun: 'Солнце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
  true_node: 'Сев. узел',
  chiron: 'Хирон',
  lililth: 'Лилит',
};

export default function PlanetTable({ planets }: { planets: Planet[] }) {
  const mainPlanets = planets.filter(p =>
    ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(p.name)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 font-semibold text-gray-700">Планета</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700">Знак</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700">Градус</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700">Дом</th>
            <th className="text-left py-2 px-3 font-semibold text-gray-700"></th>
          </tr>
        </thead>
        <tbody>
          {mainPlanets.map((p, i) => (
            <tr
              key={p.name}
              className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="py-2 px-3 font-medium text-gray-800">
                <span className="mr-1">{p.symbol}</span>
                {PLANET_NAMES[p.name] || p.name}
              </td>
              <td className="py-2 px-3 text-gray-600">{p.sign}</td>
              <td className="py-2 px-3 text-gray-600">
                {p.sign_degree}°{p.sign_minute.toString().padStart(2, '0')}'{p.sign_second.toString().padStart(2, '0')}"
              </td>
              <td className="py-2 px-3 text-gray-600">{p.house || '—'}</td>
              <td className="py-2 px-3 text-red-500 text-xs font-medium">
                {p.retrograde ? 'Rx' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

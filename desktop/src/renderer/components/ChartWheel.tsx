import React, { useEffect, useRef } from 'react';

interface PlanetData {
  name: string;
  longitude: number;
}

interface ChartWheelProps {
  planets: PlanetData[];
  cusps: number[];
  width?: number;
  height?: number;
  className?: string;
}

// Маппинг имён планет из нашего формата в формат astrochart
const PLANET_NAME_MAP: Record<string, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  chiron: 'Chiron',
  lililth: 'Lilith',
  lilith: 'Lilith',
  true_node: 'NNode',
  north_node: 'NNode',
};

function convertPlanets(planets: PlanetData[]): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const p of planets) {
    const name = PLANET_NAME_MAP[p.name.toLowerCase()] || p.name;
    result[name] = [p.longitude];
  }
  return result;
}

export default function ChartWheel({ planets, cusps, width = 480, height = 480, className = '' }: ChartWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!cusps || cusps.length !== 12) return;
    if (!planets || planets.length === 0) return;

    // astrochart загружена через script tag в index.html
    const astro = (window as any).astrochart;
    if (!astro || !astro.Chart) {
      console.error('astrochart not loaded. window.astrochart:', astro);
      return;
    }

    // Очищаем контейнер
    containerRef.current.innerHTML = '';

    // Создаём уникальный ID для контейнера astrochart
    const chartId = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const wrapper = document.createElement('div');
    wrapper.id = chartId;
    containerRef.current.appendChild(wrapper);

    try {
      const chart = new astro.Chart(chartId, width, height);

      const data = {
        planets: convertPlanets(planets),
        cusps: cusps,
      };

      chart.radix(data);
    } catch (err) {
      console.error('Error rendering chart:', err);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [planets, cusps, width, height]);

  return (
    <div
      ref={containerRef}
      className={`chart-wheel ${className}`}
      style={{ width, height, margin: '0 auto' }}
    />
  );
}

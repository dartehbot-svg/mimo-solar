import React, { useState } from 'react';
import NatalChart from './pages/NatalChart';
import SolarChart from './pages/SolarChart';
import BestPlace from './pages/BestPlace';
import Settings from './pages/Settings';

type Page = 'natal' | 'solar' | 'bestplace' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('natal');
  const [natalData, setNatalData] = useState<any>(null);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">Соляр</h1>
          <p className="text-xs text-gray-500 mt-1">Построение карт</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem label="Натальная карта" active={page === 'natal'} onClick={() => setPage('natal')} />
          <NavItem label="Соляр" active={page === 'solar'} onClick={() => setPage('solar')} />
          <NavItem label="Лучшее место" active={page === 'bestplace'} onClick={() => setPage('bestplace')} />
          <NavItem label="Настройки" active={page === 'settings'} onClick={() => setPage('settings')} />
        </nav>
        <div className="p-3 text-xs text-gray-400 border-t border-gray-200">
          v0.1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {page === 'natal' && <NatalChart onCalculated={setNatalData} />}
        {page === 'solar' && <SolarChart natalData={natalData} />}
        {page === 'bestplace' && <BestPlace natalData={natalData} />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}

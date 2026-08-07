import React from 'react';

export default function Settings() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Настройки</h2>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Система домов</h3>
          <div className="space-y-2">
            {[
              { id: 'P', name: 'Placidus', desc: 'Наиболее распространённая система' },
              { id: 'K', name: 'Koch', desc: 'Альтернативная система' },
              { id: 'E', name: 'Equal', desc: 'Равнодомная система' },
              { id: 'O', name: 'Porphyry', desc: 'Простая трёхсекторная система' },
            ].map(sys => (
              <label key={sys.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="house_system"
                  value={sys.id}
                  defaultChecked={sys.id === 'P'}
                  className="w-4 h-4 text-indigo-600"
                />
                <div>
                  <div className="font-medium text-gray-800">{sys.name}</div>
                  <div className="text-sm text-gray-500">{sys.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Профиль</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Возраст</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option>18-25</option>
                <option>26-35</option>
                <option>36-45</option>
                <option>46-55</option>
                <option>56+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Профессия</label>
              <input
                type="text"
                placeholder="Например: программист"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">О программе</h3>
          <p className="text-sm text-gray-600">
            Солярная карта v0.1.0
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Данный инструмент носит эвристический характер и не является научно доказанным методом предсказания.
          </p>
        </div>
      </div>
    </div>
  );
}

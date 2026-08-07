# Солярная карта — Solar Return Calculator

Программа построения солярной карты с интеграцией в мессенджер MAX.

## Архитектура

- **core/** — Python-ядро расчётов (эфемериды, натал, соляр, интерпретации, PDF)
- **bot/** — MAX-бот (Node.js/TypeScript)
- **desktop/** — Desktop-приложение (Electron + React + TypeScript)

## Быстрый старт

### Ядро расчётов (Python)
```bash
cd core
uv sync
uv run uvicorn src.api:app --reload
```

### MAX-бот (Node.js)
```bash
cd bot
npm install
npm run dev
```

### Desktop (Electron)
```bash
cd desktop
npm install
npm run dev
```

## Требования

- Python 3.11+
- Node.js 20+
- uv (Python package manager)
- Эфемериды Swiss Ephemeris в папке `swe/`

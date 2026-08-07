module.exports = {
  apps: [
    {
      name: 'core',
      cwd: './core',
      script: 'python3',
      args: '-m uvicorn src.api:app --host 127.0.0.1 --port 8000',
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
    {
      name: 'bot',
      cwd: './bot',
      script: 'dist/index.js',
      interpreter: 'node',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'dashboard',
      cwd: './dashboard',
      script: 'src/server.js',
      interpreter: 'node',
      autorestart: true,
      max_restarts: 5,
      restart_delay: 3000,
      env: {
        DASHBOARD_PORT: '3000',
      },
    },
  ],
};

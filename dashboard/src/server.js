const express = require('express');
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const INSTALL_DIR = process.env.SOLAR_INSTALL_DIR || path.join(process.env.HOME || '/root', 'solar');
const VERSIONS_DIR = path.join(INSTALL_DIR, 'versions');
const VERSION_FILE = path.join(INSTALL_DIR, 'current_version.txt');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function pm2Command(cmd) {
  try {
    const output = execSync(`pm2 ${cmd} --no-color`, { encoding: 'utf8', timeout: 10000 });
    return output;
  } catch (err) {
    return err.stdout || err.message;
  }
}

function getPm2Status() {
  try {
    const output = execSync('pm2 jlist', { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(output);
  } catch {
    return [];
  }
}

async function healthCheck(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

const SERVICES = [
  { name: 'core', displayName: 'Расчётное ядро', healthUrl: 'http://127.0.0.1:8000/api/health' },
  { name: 'bot', displayName: 'MAX-бот', healthUrl: null },
  { name: 'dashboard', displayName: 'Панель управления', healthUrl: `http://127.0.0.1:${PORT}/api/status` },
];

app.get('/api/status', async (_req, res) => {
  const processes = getPm2Status();
  const statuses = [];

  for (const svc of SERVICES) {
    const proc = processes.find(p => p.name === svc.name);
    let status = 'stopped';
    let healthy = null;

    if (proc) {
      if (proc.pm2_env?.status === 'online') {
        status = 'online';
        if (svc.healthUrl) {
          healthy = await healthCheck(svc.healthUrl);
          if (!healthy) status = 'hung';
        }
      } else if (proc.pm2_env?.status === 'errored') {
        status = 'errored';
      }
    }

    statuses.push({
      name: svc.name,
      displayName: svc.displayName,
      status,
      healthy,
      pid: proc?.pid || null,
      uptime: proc?.pm2_env?.pm_uptime || null,
      restarts: proc?.pm2_env?.restart_time || 0,
      cpu: proc?.monit?.cpu || 0,
      memory: proc?.monit?.memory || 0,
    });
  }

  res.json({ services: statuses });
});

app.post('/api/:action/:name', (req, res) => {
  const { action, name } = req.params;
  const allowed = ['start', 'stop', 'restart'];

  if (!allowed.includes(action)) {
    return res.status(400).json({ error: `Недопустимое действие: ${action}` });
  }

  if (!SERVICES.find(s => s.name === name)) {
    return res.status(404).json({ error: `Сервис не найден: ${name}` });
  }

  try {
    pm2Command(`${action} ${name}`);
    res.json({ ok: true, message: `${action} ${name} выполнен` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/versions', (_req, res) => {
  const current = fs.existsSync(VERSION_FILE) ? fs.readFileSync(VERSION_FILE, 'utf8').trim() : 'unknown';
  let versions = [];

  if (fs.existsSync(VERSIONS_DIR)) {
    versions = fs.readdirSync(VERSIONS_DIR)
      .filter(d => d.startsWith('v'))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }

  res.json({ current, versions });
});

app.post('/api/rollback/:version', (req, res) => {
  const { version } = req.params;
  const targetDir = path.join(VERSIONS_DIR, version);

  if (!fs.existsSync(targetDir)) {
    return res.status(404).json({ error: `Версия не найдена: ${version}` });
  }

  try {
    const currentLink = path.join(INSTALL_DIR, 'current');
    fs.unlinkSync(currentLink);
    fs.symlinkSync(targetDir, currentLink);
    fs.writeFileSync(VERSION_FILE, version);

    pm2Command('restart core');
    pm2Command('restart bot');

    res.json({ ok: true, message: `Откат на ${version} выполнен` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/update', (_req, res) => {
  const updateScript = path.join(INSTALL_DIR, 'scripts', 'update.sh');
  if (!fs.existsSync(updateScript)) {
    return res.status(404).json({ error: 'Скрипт обновления не найден' });
  }

  exec(`bash "${updateScript}"`, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ ok: true, output: stdout });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Панель мониторинга: http://localhost:${PORT}`);
});

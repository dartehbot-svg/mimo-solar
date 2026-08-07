import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join } from 'path';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;
let coreProcess: ChildProcess | null = null;

const CORE_PORT = 18765;
const CORE_URL = `http://127.0.0.1:${CORE_PORT}`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Солярная карта',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function getPythonExecutable(): string {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    return join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe');
  }
  return 'python3';
}

function startCoreServer() {
  const pythonExe = process.env.PYTHON_PATH || getPythonExecutable();
  coreProcess = spawn(pythonExe, ['-m', 'uvicorn', 'src.api:app', '--host', '127.0.0.1', '--port', String(CORE_PORT)], {
    cwd: join(__dirname, '../../../core'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  coreProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[core] ${data.toString()}`);
  });

  coreProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[core] ${data.toString()}`);
  });

  coreProcess.on('close', (code: number | null) => {
    console.log(`Core server exited with code ${code}`);
    coreProcess = null;
  });
}

function stopCoreServer() {
  if (coreProcess) {
    coreProcess.kill();
    coreProcess = null;
  }
}

// IPC handlers
ipcMain.handle('core-request', async (_event, method: string, path: string, data?: any) => {
  try {
    const response = await axios({
      method,
      url: `${CORE_URL}${path}`,
      data,
      timeout: 30000,
    });
    return { success: true, data: response.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle('generate-pdf', async (_event, data: any) => {
  try {
    const response = await axios.post(`${CORE_URL}/api/generate-pdf`, data, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return { success: true, data: Buffer.from(response.data).toString('base64') };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Проверяю обновления...');
  });

  autoUpdater.on('update-available', async (info) => {
    console.log(`[updater] Доступно обновление: ${info.version}`);
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Обновление доступно',
      message: `Доступна версия ${info.version}. Скачать и установить?`,
      buttons: ['Скачать', 'Позже'],
    });
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] Обновлений нет');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[updater] Скачивание: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', async () => {
    console.log('[updater] Обновление скачано');
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Обновление готово',
      message: 'Обновление скачано. Перезапустить приложение для установки?',
      buttons: ['Перезапустить', 'Позже'],
    });
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Ошибка:', err.message);
  });

  // Проверка обновлений через 3 секунды после запуска
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] Ошибка проверки:', err.message);
    });
  }, 3000);
}

// IPC для ручной проверки обновлений
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { hasUpdate: !!result?.updateInfo };
  } catch (err: any) {
    return { error: err.message };
  }
});

app.whenReady().then(() => {
  startCoreServer();
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopCoreServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopCoreServer();
});

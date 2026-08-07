import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  coreRequest: (method: string, path: string, data?: any) =>
    ipcRenderer.invoke('core-request', method, path, data),

  generatePdf: (data: any) =>
    ipcRenderer.invoke('generate-pdf', data),

  openExternal: (url: string) =>
    ipcRenderer.invoke('open-external', url),

  checkForUpdates: () =>
    ipcRenderer.invoke('check-for-updates'),
});

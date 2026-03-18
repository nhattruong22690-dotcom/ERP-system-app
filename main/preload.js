const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternalBrowser: (url) => ipcRenderer.send('open-external-browser', url),
  openExcel: (filePath) => ipcRenderer.send('open-excel', filePath),
  playBeep: () => ipcRenderer.send('play-beep'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback),
});

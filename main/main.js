const { app, BrowserWindow, ipcMain, shell, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');
const isDev = !app.isPackaged;

// Register the custom protocol BEFORE app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true } }
]);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    // In dev, load the Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load via custom protocol to fully support absolute Next.js asset paths
    mainWindow.loadURL('app://-/index.html');
  }

  // Intercept downloads and open Excel if it's an xlsx file
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    item.once('done', (event, state) => {
      if (state === 'completed') {
        const filePath = item.getSavePath();
        if (filePath && (filePath.endsWith('.xlsx') || filePath.endsWith('.xls'))) {
          shell.openPath(filePath);
        }
      }
    });
  });

  // Intercept window.open or target="_blank" to open in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' }; // Prevent Electron new windows
  });

  // Forward renderer console logs to the main terminal for debugging
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Line ${line}]: ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Setup custom protocol handler for serving Next.js static files
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    let relativePath = decodeURIComponent(url.pathname);
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1);
    }
    const absoluteFilePath = path.join(__dirname, '../out', relativePath);
    return net.fetch(pathToFileURL(absoluteFilePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Setup auto-updater logic
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Open external link in default browser
ipcMain.on('open-external-browser', (event, url) => {
  if (url) {
    shell.openExternal(url);
  }
});

// IPC: Play system beep sound
ipcMain.on('play-beep', () => {
  shell.beep();
});

// IPC: Open file (e.g., Excel) with default application
ipcMain.on('open-excel', (event, filePath) => {
  if (filePath) {
    shell.openPath(filePath);
  }
});

// IPC: Get app version
ipcMain.handle('get-version', () => app.getVersion());

// IPC: Manual check for update
ipcMain.handle('check-for-update', async () => {
  if (!isDev) {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result !== null;
    } catch (e) {
      console.error('Update check failed', e);
      throw e;
    }
  }
  return null;
});

// IPC: Install downloaded update
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Forward updater events to renderer if needed
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update_downloaded');
});

import { BrowserWindow, app, screen, WebContents } from 'electron';
import path from 'node:path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: true, // Initial hide --- TEMPORARILY SET TO TRUE FOR DEBUGGING
    frame: false, // No frame
    skipTaskbar: true, // Don't show in taskbar, managed by shortcut/tray
    alwaysOnTop: false, // Can be configured later
    webPreferences: {
      preload: (() => {
        const preloadPath = path.join(__dirname, '../preload/index.js'); // Restore to original index.js
        console.log(`[WindowManager DEBUG] Calculated preload path: ${preloadPath}`);
        try {
          require('fs').statSync(preloadPath); // Check if file exists
          console.log(`[WindowManager DEBUG] Preload file at ${preloadPath} exists.`);
        } catch (err) {
          console.error(`[WindowManager DEBUG] ERROR: Preload file at ${preloadPath} does NOT exist or is not accessible!`, err);
        }
        return preloadPath;
      })(),
      sandbox: false, // Required for preload script if not sandboxed
      contextIsolation: true, // Explicitly set for contextBridge
      devTools: !app.isPackaged, // Open DevTools in dev mode
    },
  });

  // Load the index.html of the app.
  if (!app.isPackaged) { // Devrfaceelopment mode
    const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    console.log(`[WindowManager] Development mode. Loading URL: ${viteDevServerUrl}`);
    mainWindow.loadURL(viteDevServerUrl).catch(err => {
      console.error(`[WindowManager] Failed to load dev URL ${viteDevServerUrl}:`, err);
      console.error('[WindowManager] Ensure Vite dev server is running and accessible.');
    });
    // Open DevTools only if not already opened, and in dev mode (webPreferences.devTools already handles initial state)
    if (mainWindow.webContents && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    // Production mode
    const indexPath = path.join(__dirname, '../renderer/index.html');
    console.log(`[WindowManager] Production mode. Loading file: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch(err => {
        console.error(`[WindowManager] Failed to load prod file ${indexPath}:`, err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('blur', () => {
    if (mainWindow && mainWindow.isVisible() && !mainWindow.webContents.isDevToolsFocused()) {
      // Optional: Hide on blur, can be made configurable
      // For P0, primary control is via shortcut
      // mainWindow.hide();
    }
  });

  return mainWindow;
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function showMainWindow(): void {
  if (!mainWindow) {
    mainWindow = createWindow();
  }
  if (mainWindow) {
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
    // Center window on show, can be improved with remembering last position
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const [winWidth, winHeight] = mainWindow.getSize();
    mainWindow.setPosition(Math.round((width - winWidth) / 2), Math.round((height - winHeight) / 3));
  }
}

function hideMainWindow(): void {
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide();
  }
}

function getMainWindowWebContents(): WebContents | null {
  const mw = getMainWindow();
  return mw ? mw.webContents : null;
}

function toggleMainWindowVisibility(): void {
  if (!mainWindow || !mainWindow.isVisible()) {
    showMainWindow();
  } else {
    hideMainWindow();
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

export {
  createWindow,
  getMainWindow,
  showMainWindow,
  hideMainWindow,
  toggleMainWindowVisibility,
  getMainWindowWebContents, // Export the new function
};
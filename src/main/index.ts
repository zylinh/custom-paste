import { app, Menu, MenuItemConstructorOptions, Tray, nativeImage } from 'electron'; // Added Tray and nativeImage
// import * as path from 'path'; // path is used in windowManager
import { ClipboardMonitor } from './services/ClipboardMonitor';
import { HistoryManager } from './services/HistoryManager';
import { StorageService } from './db/StorageService';
import { ClipboardItem } from '../shared/types/clipboard';
import { createWindow as createMainWindow, getMainWindow, showMainWindow, getMainWindowWebContents, toggleMainWindowVisibility, hideMainWindow } from './windowManager';
import { initializeGlobalShortcuts, unregisterAllShortcuts } from './shortcutManager';
import { setupMainProcessIpcHandlers } from './ipcHandlers';
import { IPC_HISTORY_ITEM_ADDED } from '../shared/constants/ipcChannels';
import { settingsManager } from './services/SettingsManager';
import { SnippetResolver } from './services/SnippetResolver'; // Added
import { TemplateShortcutManager } from './services/TemplateShortcutManager'; // Added

// electron-squirrel-startup is not used with electron-builder typically
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

let clipboardMonitor: ClipboardMonitor | null = null;
let historyManager: HistoryManager | null = null;
let storageService: StorageService | null = null;
let snippetResolver: SnippetResolver | null = null; // Added
let templateShortcutManager: TemplateShortcutManager | null = null; // Added
let tray: Tray | null = null;

// Window creation is now handled by windowManager.ts
// const createWindow = () => { ... existing code ... };

function initializeServices() {
  try {
    storageService = new StorageService();
    historyManager = new HistoryManager(storageService);
    snippetResolver = new SnippetResolver(); // Initialize SnippetResolver (no args needed)
    templateShortcutManager = new TemplateShortcutManager(storageService, snippetResolver); // Initialize TemplateShortcutManager

    clipboardMonitor = new ClipboardMonitor(); // Uses default poll interval

    clipboardMonitor.on('new-item', async (item: ClipboardItem) => {
      console.log('Main: Detected new clipboard item from monitor:', item.preview_text);
      if (historyManager) {
        try {
          const addedItemWithId = await historyManager.addHistoryItem(item);
          
          if (addedItemWithId) {
            console.log('Main: Item processed by HistoryManager and retrieved with ID:', addedItemWithId.id);
            // Notify renderer process that a new item has been added
            const webContents = getMainWindowWebContents();
            if (webContents && !webContents.isDestroyed()) {
              webContents.send(IPC_HISTORY_ITEM_ADDED, addedItemWithId); // Send the item with DB ID
              console.log('Main: Sent IPC_HISTORY_ITEM_ADDED to renderer with full item data.');
            } else {
              console.warn('Main: Could not send IPC_HISTORY_ITEM_ADDED, webContents not available or destroyed, but item was added to DB.');
            }
          } else {
            console.log('Main: Item was not added by HistoryManager (e.g., duplicate or error), no IPC sent.');
          }
        } catch (error) {
          console.error('Main: Error processing item with HistoryManager:', error);
        }
      } else {
        console.error('Main: HistoryManager not initialized.');
      }
    });

    clipboardMonitor.startMonitoring();
    console.log('Main: Services initialized and clipboard monitoring started.');

  } catch (error) {
    console.error('Main: Failed to initialize services:', error);
    // Consider quitting the app or showing an error dialog if critical services fail
    app.quit();
  }
}


// Function to create the tray icon and context menu
function createTray() {
  // TODO: Replace 'assets/icon.png' with the actual path to your icon
  // For now, using a placeholder. On Windows, .ico is preferred. On macOS, .png.
  // Electron can often handle .png પોલીસ for both.
  // A simple way to get a path that works in dev and packaged app:
  // const iconPath = path.join(__dirname, app.isPackaged ? '../renderer/assets/icon.png' : '../../assets/icon.png');
  // For simplicity, assuming an icon is in an 'assets' folder relative to the package root,
  // or you might need to adjust this path or copy it during build.
  // As we couldn't find an icon, we'll use a placeholder string and let Electron try to load it.
  // If it fails, it might show a default icon or nothing.
  // IMPORTANT: User needs to provide a valid icon file and update this path.
  const iconName = process.platform === 'win32' ? 'assets/icon.ico' : 'assets/icon.png';
  // const icon = nativeImage.createFromPath(iconName); // This would be ideal if icon exists
  // For now, let's try creating a simple data URL icon as a fallback if no file is found.
  // This is a very basic placeholder.
  let icon;
  try {
    // This path needs to be relative to the app's root directory when packaged,
    // or relative to the project root during development.
    // A common practice is to put assets in a folder that gets copied to the output directory.
    // For now, we'll assume an 'assets' folder in the root of the packaged app or project.
    // If 'assets/icon.png' or 'assets/icon.ico' doesn't exist, this will fail.
    const iconPath = require('path').join(app.getAppPath(), iconName);
    // Check if the file actually exists before trying to create an image from it
    if (require('fs').existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      console.warn(`[Tray] Icon file not found at ${iconPath}. Using a default Electron icon or placeholder.`);
      // Fallback to a very simple built-in image if possible, or let Tray use default.
      // Creating a minimal data URL based icon as a true placeholder:
      const placeholderIcon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAB5JREFUOE9jZGBg4P///38QDAtDQRQMo6EABgAADgAF2hR2+AAAAABJRU5ErkJggg=='
      );
      icon = placeholderIcon;
    }
  } catch (e) {
    console.error('[Tray] Error creating native image for tray icon:', e);
    // Fallback if path resolution or image creation fails
    const placeholderIcon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAB5JREFUOE9jZGBg4P///38QDAtDQRQMo6EABgAADgAF2hR2+AAAAABJRU5ErkJggg=='
    );
    icon = placeholderIcon;
  }


  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏主窗口',
      click: () => {
        toggleMainWindowVisibility();
      },
    },
    {
      label: '设置',
      click: () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          const webContents = getMainWindowWebContents();
          if (webContents && !webContents.isDestroyed()) {
            webContents.send('navigate-to-settings');
            if (!mainWindow.isVisible()) {
              showMainWindow(); // Show window if it's hidden before navigating
            }
            mainWindow.focus(); // Focus it
          } else {
             // If no window, create and then navigate (or handle as error)
            createMainWindow(); // This will create and show
            const newWebContents = getMainWindowWebContents();
            if (newWebContents) {
                // Wait for the window to be ready before sending IPC message
                newWebContents.once('did-finish-load', () => {
                    newWebContents.send('navigate-to-settings');
                });
            }
          }
        } else {
          // If main window doesn't exist, create it. The settings navigation
          // can be handled once the window is ready.
          createMainWindow();
          const newWebContents = getMainWindowWebContents();
          if (newWebContents) {
            newWebContents.once('did-finish-load', () => {
              newWebContents.send('navigate-to-settings');
            });
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('CustomPaste');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    // On single click, toggle window visibility
    toggleMainWindowVisibility();
  });

  // Optional: On Windows, sometimes a double-click is preferred for the main action.
  // tray.on('double-click', () => {
  //   toggleMainWindowVisibility();
  // });
}

app.on('ready', async () => {
  console.log('App is ready. Initializing services and UI...');
  initializeServices();
  createMainWindow(); // Create the main window using windowManager
  initializeGlobalShortcuts(); // Initialize global shortcuts
  setupMainProcessIpcHandlers(); // Setup IPC handlers
  createApplicationMenu(); // Create and set the application menu
  createTray(); // Create the system tray icon and menu
  if (templateShortcutManager) {
    await templateShortcutManager.registerTemplateShortcuts(); // Register template shortcuts after services are ready
  }

  // Apply auto-launch setting on startup
  const autoLaunchEnabled = settingsManager.getAutoLaunchStatus();
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: autoLaunchEnabled,
      // path: app.getPath('exe'), // Consider if needed, especially for Windows
    });
    console.log(`Main: Auto-launch setting applied on startup. Enabled: ${autoLaunchEnabled}`);
  } else {
    console.log('Main: App is not packaged. Skipping app.setLoginItemSettings on startup.');
  }
});

// With a tray icon, we usually don't quit the app when all windows are closed,
// especially on Windows. The app should continue running in the tray.
// On macOS, the behavior is often to hide the window but keep the app active.
app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') {
  //   app.quit(); // Default behavior without tray
  // }
  // With a tray, we typically don't quit. The user can quit via the tray menu.
  // If the main window is closed, we might just hide it or do nothing if it's already handled.
  // For now, we'll prevent quitting here. The quit action is in the tray menu.
  console.log('Main: All windows closed. App remains running due to tray icon.');
});

app.on('activate', () => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  } else {
    showMainWindow(); // If window exists but is hidden (e.g. on macOS), show it.
  }
});

app.on('will-quit', () => {
  if (clipboardMonitor) {
    clipboardMonitor.stopMonitoring();
  }
  if (storageService) {
    storageService.close();
  }
  unregisterAllShortcuts(); // Unregister general shortcuts
  if (templateShortcutManager) {
    templateShortcutManager.cleanup(); // Unregister template shortcuts
  }
  console.log('App is quitting. Services stopped and shortcuts unregistered.');
});

// MAIN_WINDOW_VITE_DEV_SERVER_URL and MAIN_WINDOW_VITE_NAME are Electron Forge specific.
// Vite uses process.env.VITE_DEV_SERVER_URL, which is handled in windowManager.ts
// declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
// declare const MAIN_WINDOW_VITE_NAME: string;

function createApplicationMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
          click: () => {
            const mainWindow = getMainWindow();
            if (mainWindow) {
              // Option 1: Directly load URL if settings is a separate window or simple page
              // mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL + '#/settings'); // Adjust URL as needed

              // Option 2: Send IPC message to renderer to navigate
              const webContents = getMainWindowWebContents();
              if (webContents && !webContents.isDestroyed()) {
                webContents.send('navigate-to-settings');
                // Ensure window is visible if navigating
                if (!mainWindow.isVisible()) {
                  showMainWindow();
                } else {
                  mainWindow.focus();
                }
              }
            }
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin'
          ? ([
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: '语音',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ] as MenuItemConstructorOptions[])
          : ([{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }] as MenuItemConstructorOptions[])),
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? ([{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }] as MenuItemConstructorOptions[])
          : ([{ role: 'close' }] as MenuItemConstructorOptions[])),
      ],
    },
  ];

  if (process.platform !== 'darwin') {
    // Remove the first "App" menu on Windows/Linux as it's usually "File"
    // and Electron's default behavior for the app menu is more macOS-like.
    // For a more standard Windows/Linux "File" menu, this would need more specific items.
    // For now, we'll keep it simple and just remove the app-specific one.
    // A better approach for cross-platform might be to define the first menu
    // as 'File' and conditionally add macOS specific items like 'About AppName'.
    const appMenuIndex = template.findIndex(item => item.label === app.name);
    if (appMenuIndex > -1) {
      template.splice(appMenuIndex, 1);
      // Optionally, prepend a 'File' menu for non-Darwin platforms
      template.unshift({
        label: '文件',
        submenu: [
          {
            label: '设置',
            accelerator: 'Ctrl+,',
            click: () => {
              const mainWindow = getMainWindow();
              if (mainWindow) {
                const webContents = getMainWindowWebContents();
                if (webContents && !webContents.isDestroyed()) {
                  webContents.send('navigate-to-settings');
                  if (!mainWindow.isVisible()) {
                    showMainWindow();
                  } else {
                    mainWindow.focus();
                  }
                }
              }
            },
          },
          { type: 'separator' },
          { role: 'quit', label: '退出' }
        ]
      });
    }
  }


  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
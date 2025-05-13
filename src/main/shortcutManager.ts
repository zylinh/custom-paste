import { app, globalShortcut } from 'electron';
import Store from 'electron-store';
import { toggleMainWindowVisibility, getMainWindow, showMainWindow } from './windowManager';

interface AppSettings {
  globalShortcutKey?: string;
}

const store = new Store<AppSettings>();
const DEFAULT_SHORTCUT = 'Alt+C'; // Changed default shortcut

function getShortcutKey(): string {
  return store.get('globalShortcutKey', DEFAULT_SHORTCUT);
}

function setShortcutKey(shortcut: string): boolean {
  // Basic validation (Electron will do more thorough validation on registration)
  if (typeof shortcut !== 'string' || shortcut.trim() === '') {
    console.error('Invalid shortcut format provided.');
    return false;
  }

  const currentShortcut = getShortcutKey();
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut);
  }

  try {
    const success = globalShortcut.register(shortcut, () => {
      toggleMainWindowVisibility();
    });

    if (success) {
      store.set('globalShortcutKey', shortcut);
      console.log(`Global shortcut "${shortcut}" registered.`);
      return true;
    } else {
      console.error(`Failed to register shortcut "${shortcut}". It might be in use by another application or invalid.`);
      // Re-register the default or previous valid shortcut if registration fails
      if (currentShortcut && currentShortcut !== shortcut) {
        globalShortcut.register(currentShortcut, toggleMainWindowVisibility);
        console.warn(`Re-registered previous shortcut "${currentShortcut}".`);
      } else if (DEFAULT_SHORTCUT !== shortcut) {
        globalShortcut.register(DEFAULT_SHORTCUT, toggleMainWindowVisibility);
        console.warn(`Re-registered default shortcut "${DEFAULT_SHORTCUT}".`);
      }
      return false;
    }
  } catch (error) {
    console.error('Error during shortcut registration:', error);
    return false;
  }
}

function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
  console.log('All global shortcuts unregistered.');
}

function initializeGlobalShortcuts(): void {
  const shortcutKey = getShortcutKey();
  if (!globalShortcut.isRegistered(shortcutKey)) {
    const registered = globalShortcut.register(shortcutKey, () => {
      // When shortcut is triggered, ensure window is created if it doesn't exist
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        showMainWindow(); // This will create and then show
      } else {
        toggleMainWindowVisibility();
      }
    });

    if (registered) {
      console.log(`Global shortcut "${shortcutKey}" registered successfully.`);
    } else {
      console.error(`Failed to register global shortcut "${shortcutKey}" on startup.`);
      // Attempt to register default if custom one fails and is different
      if (shortcutKey !== DEFAULT_SHORTCUT) {
        console.warn(`Attempting to register default shortcut "${DEFAULT_SHORTCUT}" instead.`);
        const defaultRegistered = globalShortcut.register(DEFAULT_SHORTCUT, toggleMainWindowVisibility);
        if (defaultRegistered) {
          store.set('globalShortcutKey', DEFAULT_SHORTCUT); // Save default if it works
          console.log(`Default global shortcut "${DEFAULT_SHORTCUT}" registered successfully.`);
        } else {
          console.error(`Failed to register default global shortcut "${DEFAULT_SHORTCUT}" as well.`);
        }
      }
    }
  }

  app.on('will-quit', () => {
    unregisterAllShortcuts();
    store.delete('globalShortcutKey'); // Optional: clear on quit or keep for next launch
  });
}

export { initializeGlobalShortcuts, setShortcutKey, getShortcutKey, unregisterAllShortcuts };
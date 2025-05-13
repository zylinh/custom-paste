import { ipcMain, clipboard, nativeImage, app, shell, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path'; // Added for path operations
import * as mime from 'mime-types'; // For determining MIME type
import * as robot from 'robotjs'; // Added for simulating key presses
import { StorageService } from './db/StorageService'; // Existing service
import { SnippetResolver } from './services/SnippetResolver';
import { TemplateShortcutManager } from './services/TemplateShortcutManager'; // Added
import {
  IPC_REQUEST_HISTORY_ITEMS,
  IPC_PASTE_ITEM,
  IPC_DELETE_HISTORY_ITEM,
  IPC_GET_GLOBAL_SHORTCUT,
  IPC_SET_GLOBAL_SHORTCUT,
  IPC_GET_HISTORY_LIMIT, // Added
  IPC_SET_HISTORY_LIMIT,  // Added
  IPC_GET_AUTO_LAUNCH_STATUS, // Added for auto-launch
  IPC_SET_AUTO_LAUNCH_STATUS,  // Added for auto-launch
  IPC_CLEAR_ALL_HISTORY, // Added for clearing history
  IPC_WRITE_FILES_TO_CLIPBOARD, // Added for writing files
  IPC_GET_IMAGE_DATA_URL, // Added for image preview
  IPC_OPEN_IMAGE_EXTERNAL, // Added for opening image externally
  IPC_TOGGLE_FAVORITE_STATUS, // Added for toggling favorite status
  IPC_WINDOW_MINIMIZE, // Added for window control
  IPC_WINDOW_MAXIMIZE, // Added for window control
  IPC_WINDOW_CLOSE, // Added for window control
  IPC_GET_THEME, // Added for theme
  IPC_SET_THEME, // Added for theme
  IPC_OPEN_PATH, // Added for UIX-008
  IPC_COPY_PATH_TO_CLIPBOARD, // Added for UIX-008
  IPC_GET_AUTO_HIDE_AFTER_PASTE, // Added for paste behavior
  IPC_SET_AUTO_HIDE_AFTER_PASTE, // Added for paste behavior
  IPC_SIMULATE_PASTE, // Added for simulating paste
  IPC_GET_DEDUPLICATE_STATUS, // Added for deduplication
  IPC_SET_DEDUPLICATE_STATUS,  // Added for deduplication
  // Template/Keyword Channels
  IPC_ADD_TEMPLATE,
  IPC_GET_ALL_TEMPLATES,
  IPC_UPDATE_TEMPLATE,
  IPC_DELETE_TEMPLATE,
  IPC_TOGGLE_TEMPLATE_STATUS,
  IPC_RESOLVE_SNIPPET // Added for snippet resolution
} from '../shared/constants/ipcChannels';
import { ClipboardItem } from '../shared/types/clipboard';
import { TemplateItem } from '../shared/types/template'; // Import TemplateItem
import { getShortcutKey, setShortcutKey } from './shortcutManager';
import { settingsManager } from './services/SettingsManager'; // Added
import { getMainWindow } from './windowManager'; // Added for window controls

// TODO: Proper dependency injection or service locator for services like StorageService
// For now, instantiate StorageService directly.
// In a larger app, this would be managed by a DI container or passed via initializeIpcServices.
const storageService = new StorageService();
const snippetResolver = new SnippetResolver();
// Instantiate TemplateShortcutManager - requires StorageService and SnippetResolver
// Note: Ideally, these would be singletons injected, but for simplicity here, we re-instantiate.
const templateShortcutManager = new TemplateShortcutManager(storageService, snippetResolver);

// Commented out as HistoryManager is not directly used for fetching in this iteration.
// import { HistoryManager } from './services/HistoryManager';
// let historyManagerInstance: HistoryManager;
// export function initializeIpcServices(hm: HistoryManager, ss: StorageService) {
//   historyManagerInstance = hm;
//   // storageServiceInstance = ss; // storageService is now instantiated directly
// }

function setupMainProcessIpcHandlers(): void {
  console.log(`DEBUG_IPC_HANDLER: IPC_REQUEST_HISTORY_ITEMS constant value is "${IPC_REQUEST_HISTORY_ITEMS}"`); // Debug log
  // Handler for requesting history items
  ipcMain.handle(IPC_REQUEST_HISTORY_ITEMS, async (): Promise<ClipboardItem[]> => {
    console.log('MainIPC: Received request for history items.');
    try {
      // P0: Load recent 50 items, no pagination yet from renderer.
      const items = await storageService.getClipboardItems(50, 0);
      console.log(`MainIPC: Returning ${items.length} history items.`);
      return items;
    } catch (error) {
      console.error('MainIPC: Error fetching history items:', error);
      return []; // Return empty array on error
    }
  });

  // Handler for pasting an item (writing to system clipboard)
  ipcMain.handle(IPC_PASTE_ITEM, async (event, item: ClipboardItem) => {
    console.log(
      `MainIPC: Received request to paste item ID: ${item.id}, Type: ${item.content_type}, ` +
      `Text Preview: "${item.text_content ? item.text_content.substring(0, 50) + '...' : 'N/A'}", ` +
      `Image Path: "${item.image_path || 'N/A'}"`
    );
    if (!item || !item.content_type) {
      console.warn('MainIPC: Invalid item received for pasting (item or content_type missing).');
      return { success: false, message: 'Invalid item for pasting (item or content_type missing).' };
    }

    try {
      if (item.content_type === 'text') {
        if (item.text_content !== null && item.text_content !== undefined) {
          clipboard.writeText(item.text_content);
          console.log('MainIPC: Text content written to clipboard successfully.');
          return { success: true, message: 'Text content pasted to clipboard.' };
        } else {
          console.warn('MainIPC: Text item has no text_content.');
          return { success: false, message: 'Text item has no content.' };
        }
      } else if (item.content_type === 'image') {
        if (item.image_path) {
          try {
            const imageBuffer = await fs.readFile(item.image_path);
            const image = nativeImage.createFromBuffer(imageBuffer);
            if (image.isEmpty()) {
              console.error('MainIPC: Failed to create nativeImage from buffer or image is empty.');
              return { success: false, message: 'Failed to create image for pasting or image is empty.' };
            }
            clipboard.writeImage(image);
            console.log('MainIPC: Image content written to clipboard successfully.');
            return { success: true, message: 'Image content pasted to clipboard.' };
          } catch (readError: any) {
            console.error(`MainIPC: Failed to read image file at ${item.image_path}:`, readError);
            return { success: false, message: `Failed to read image file: ${readError.message || String(readError)}`, error: String(readError) };
          }
        } else {
          console.warn('MainIPC: Image item has no image_path.');
          return { success: false, message: 'Image item has no path.' };
        }
      } else {
        console.warn(`MainIPC: Unsupported content type for pasting: ${item.content_type}`);
        return { success: false, message: `Unsupported content type: ${item.content_type}` };
      }
    } catch (error: any) {
      console.error('MainIPC: General error during paste operation:', error);
      return { success: false, message: `Failed to paste content: ${error.message || String(error)}`, error: String(error) };
    }
  });

  // Handler for deleting a history item
  ipcMain.handle(IPC_DELETE_HISTORY_ITEM, async (event, itemId: number): Promise<boolean> => {
    console.log(`MainIPC: Received request to delete history item ID: ${itemId}`);
    if (itemId === undefined || itemId === null) {
      console.warn('MainIPC: Invalid item ID received for deletion.');
      return false;
    }

    try {
      // 1. Get item details to check for associated files (e.g., images)
      const itemToDelete = await storageService.getClipboardItemById(itemId);

      if (!itemToDelete) {
        console.warn(`MainIPC: Item ID ${itemId} not found for deletion.`);
        return false; // Or throw an error, depending on desired behavior
      }

      // 2. Delete the item from the database
      const dbDeleteSuccess = await storageService.deleteClipboardItem(itemId);

      if (!dbDeleteSuccess) {
        console.error(`MainIPC: Failed to delete item ID ${itemId} from database.`);
        return false;
      }
      console.log(`MainIPC: Item ID ${itemId} successfully deleted from database.`);

      // 3. If it's an image and has a path, delete the associated file
      if (itemToDelete.content_type === 'image' && itemToDelete.image_path) {
        try {
          await fs.unlink(itemToDelete.image_path);
          console.log(`MainIPC: Associated image file ${itemToDelete.image_path} deleted successfully.`);
        } catch (fileError: any) {
          // Log the error but consider the main deletion successful if DB part worked.
          // Or, decide if this should make the whole operation fail.
          // For P0, logging and continuing might be acceptable.
          console.error(`MainIPC: Failed to delete associated image file ${itemToDelete.image_path}:`, fileError);
          // Optionally, you could return false here if file deletion is critical
        }
      }
      return true; // Overall success
    } catch (error: any) {
      console.error(`MainIPC: Error deleting history item ID ${itemId}:`, error);
      return false;
    }
  });

  // Example: ipcMain.on for one-way communication from renderer to main
  // ipcMain.on('some-action', (event, arg) => {
  //   console.log('MainIPC: Received some-action with arg:', arg);
  //   // Do something
  // });

  // Handler for getting the current global shortcut
  ipcMain.handle(IPC_GET_GLOBAL_SHORTCUT, async (): Promise<string> => {
    console.log('MainIPC: Received request for global shortcut.');
    try {
      const shortcut = getShortcutKey();
      console.log(`MainIPC: Returning global shortcut "${shortcut}".`);
      return shortcut;
    } catch (error) {
      console.error('MainIPC: Error fetching global shortcut:', error);
      // In case of an unexpected error, though getShortcutKey itself doesn't throw.
      // It might be better to return a default or an error indicator if necessary.
      return ''; // Return empty string or a default if an error occurs
    }
  });

  // Handler for setting a new global shortcut
  ipcMain.handle(IPC_SET_GLOBAL_SHORTCUT, async (event, shortcut: string): Promise<{ success: boolean; message?: string; newShortcut?: string }> => {
    console.log(`MainIPC: Received request to set global shortcut to "${shortcut}".`);
    if (!shortcut || typeof shortcut !== 'string' || shortcut.trim() === '') {
      console.warn('MainIPC: Invalid shortcut string received.');
      return { success: false, message: 'Invalid shortcut string provided.' };
    }

    try {
      const success = setShortcutKey(shortcut);
      if (success) {
        console.log(`MainIPC: Global shortcut successfully set to "${shortcut}".`);
        return { success: true, newShortcut: shortcut, message: `Global shortcut updated to ${shortcut}.` };
      } else {
        // setShortcutKey handles logging the specific error (e.g., already in use)
        // It also attempts to re-register the previous/default shortcut.
        // We should inform the renderer that the requested shortcut was not set.
        const currentEffectiveShortcut = getShortcutKey(); // Get what is actually active now
        console.warn(`MainIPC: Failed to set global shortcut to "${shortcut}". Current effective shortcut is "${currentEffectiveShortcut}".`);
        return {
          success: false,
          message: `Failed to set shortcut to "${shortcut}". It might be in use or invalid. The active shortcut is now "${currentEffectiveShortcut}".`,
          newShortcut: currentEffectiveShortcut // Return the currently active shortcut
        };
      }
    } catch (error: any) {
      console.error('MainIPC: Error setting global shortcut:', error);
      const currentEffectiveShortcut = getShortcutKey();
      return {
        success: false,
        message: `An error occurred: ${error.message || String(error)}. The active shortcut is "${currentEffectiveShortcut}".`,
        newShortcut: currentEffectiveShortcut
      };
    }
  });

  // Handler for getting the current history limit
  ipcMain.handle(IPC_GET_HISTORY_LIMIT, async (): Promise<number> => {
    console.log('MainIPC: Received request for history limit.');
    try {
      const limit = settingsManager.getHistoryLimit();
      console.log(`MainIPC: Returning history limit "${limit}".`);
      return limit;
    } catch (error) {
      console.error('MainIPC: Error fetching history limit:', error);
      return settingsManager.getHistoryLimit(); // Return default on error
    }
  });

  // Handler for setting a new history limit
  ipcMain.handle(IPC_SET_HISTORY_LIMIT, async (event, limit: number): Promise<{ success: boolean; message?: string; newLimit?: number }> => {
    console.log(`MainIPC: Received request to set history limit to "${limit}".`);
    if (typeof limit !== 'number' || limit <= 0) {
      console.warn('MainIPC: Invalid history limit value received.');
      return { success: false, message: 'Invalid history limit value provided. Must be a positive number.' };
    }

    try {
      settingsManager.setHistoryLimit(limit);
      const newLimit = settingsManager.getHistoryLimit(); // Get the actual stored limit
      console.log(`MainIPC: History limit successfully set to "${newLimit}".`);
      // TODO: Potentially trigger history cleanup if new limit is smaller than current count
      // This might be better handled within HistoryManager or StorageService when items are added.
      return { success: true, newLimit, message: `History limit updated to ${newLimit}.` };
    } catch (error: any) {
      console.error('MainIPC: Error setting history limit:', error);
      const currentLimit = settingsManager.getHistoryLimit();
      return {
        success: false,
        message: `An error occurred: ${error.message || String(error)}. The active limit is "${currentLimit}".`,
        newLimit: currentLimit
      };
    }
  });

  // Handler for getting the current auto-launch status
  ipcMain.handle(IPC_GET_AUTO_LAUNCH_STATUS, async (): Promise<boolean> => {
    console.log('MainIPC: Received request for auto-launch status.');
    try {
      const status = settingsManager.getAutoLaunchStatus();
      console.log(`MainIPC: Returning auto-launch status "${status}".`);
      return status;
    } catch (error) {
      console.error('MainIPC: Error fetching auto-launch status:', error);
      return settingsManager.getAutoLaunchStatus(); // Return current value on error
    }
  });

  // Handler for setting a new auto-launch status
  ipcMain.handle(IPC_SET_AUTO_LAUNCH_STATUS, async (event, isEnabled: boolean): Promise<{ success: boolean; message?: string; newStatus?: boolean }> => {
    console.log(`MainIPC: Received request to set auto-launch status to "${isEnabled}".`);
    if (typeof isEnabled !== 'boolean') {
      console.warn('MainIPC: Invalid auto-launch status value received.');
      return { success: false, message: 'Invalid auto-launch status value provided. Must be a boolean.' };
    }

    try {
      settingsManager.setAutoLaunchStatus(isEnabled);
      const newStatus = settingsManager.getAutoLaunchStatus(); // Get the actual stored status

      // Apply the setting to the system
      if (app.isPackaged) { // Only set login item settings for packaged app
        app.setLoginItemSettings({
          openAtLogin: newStatus,
          // You might need to specify the path for some OS, especially on Windows if it's not finding the app.
          // path: app.getPath('exe'), // Uncomment and test if needed
        });
      } else {
        console.log('MainIPC: App is not packaged. Skipping app.setLoginItemSettings. Auto-launch will only work in packaged mode.');
      }
      
      console.log(`MainIPC: Auto-launch status successfully set to "${newStatus}". System setting updated (if packaged).`);
      return { success: true, newStatus, message: `Auto-launch status updated to ${newStatus}.` };
    } catch (error: any) {
      console.error('MainIPC: Error setting auto-launch status:', error);
      const currentStatus = settingsManager.getAutoLaunchStatus();
      return {
        success: false,
        message: `An error occurred: ${error.message || String(error)}. The active status is "${currentStatus}".`,
        newStatus: currentStatus
      };
    }
  });

  // Handler for clearing all history items
  ipcMain.handle(IPC_CLEAR_ALL_HISTORY, async (): Promise<{ success: boolean; message?: string; errors?: any[] }> => {
    console.log('MainIPC: Received request to clear all history items.');
    try {
      const result = await storageService.clearAllHistory();
      if (result.success) {
        console.log('MainIPC: All history items cleared successfully.');
      } else {
        console.warn('MainIPC: Clearing history items finished with issues.', result.message, result.errors);
      }
      return result;
    } catch (error: any) {
      console.error('MainIPC: Critical error during clearAllHistory operation:', error);
      return { success: false, message: `Critical error: ${error.message || String(error)}` };
    }
  });

  // Handler for writing file paths to the system clipboard
  ipcMain.handle(IPC_WRITE_FILES_TO_CLIPBOARD, async (event, paths: string[]): Promise<{ success: boolean; message?: string; error?: string }> => {
    console.log(`MainIPC: Received request to write ${paths.length} file(s)/folder(s) to clipboard:`, paths.join(', '));
    if (!paths || !Array.isArray(paths) || paths.some(p => typeof p !== 'string')) {
      console.warn('MainIPC: Invalid paths received for writing files to clipboard.');
      return { success: false, message: 'Invalid paths provided. Must be an array of strings.' };
    }

    if (paths.length === 0) {
      // Electron's clipboard.writeFiles([]) clears the clipboard of files.
      // This might be desired behavior, or you might want to prevent it if unintentional.
      // For now, allow it as it's valid API usage.
      console.log('MainIPC: Received empty array for paths. This will clear file paths from clipboard.');
    }

    try {
      (clipboard as any).writeFiles(paths);
      console.log('MainIPC: File paths written to clipboard successfully.');
      return { success: true, message: 'File paths written to clipboard.' };
    } catch (error: any) {
      console.error('MainIPC: Error writing file paths to clipboard:', error);
      return { success: false, message: `Failed to write file paths to clipboard: ${error.message || String(error)}`, error: String(error) };
    }
  });

  // Handler for getting image data as DataURL
  ipcMain.handle(IPC_GET_IMAGE_DATA_URL, async (event, imagePath: string): Promise<{ success: boolean; dataUrl?: string; message?: string }> => {
    console.log(`MainIPC: Received request to get image data for path: ${imagePath}`);
    if (!imagePath || typeof imagePath !== 'string') {
      return { success: false, message: 'Invalid image path provided.' };
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);
      let mimeType = mime.lookup(imagePath);
      if (!mimeType) {
        // Fallback for unknown mime types, common types
        const ext = path.extname(imagePath).toLowerCase();
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.svg') mimeType = 'image/svg+xml';
        else {
          console.warn(`MainIPC: Could not determine MIME type for ${imagePath}. Falling back to application/octet-stream.`);
          mimeType = 'application/octet-stream'; // Generic fallback
        }
      }
      
      const dataUrl = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
      console.log(`MainIPC: Successfully converted image ${imagePath} to DataURL (length: ${dataUrl.length}).`);
      return { success: true, dataUrl };
    } catch (error: any) {
      console.error(`MainIPC: Error reading or converting image file ${imagePath}:`, error);
      return { success: false, message: `Failed to get image data: ${error.message || String(error)}` };
    }
  });

  // Handler for opening an image file with the default system viewer
  ipcMain.handle(IPC_OPEN_IMAGE_EXTERNAL, async (event, imagePath: string): Promise<{ success: boolean; message?: string }> => {
    console.log(`MainIPC: Received request to open image externally: ${imagePath}`);
    if (!imagePath || typeof imagePath !== 'string') {
      return { success: false, message: 'Invalid image path provided.' };
    }

    try {
      // Check if file exists before attempting to open
      await fs.access(imagePath, fs.constants.F_OK); // Check for file existence
      await shell.openPath(imagePath);
      console.log(`MainIPC: Successfully requested to open image ${imagePath} externally.`);
      return { success: true, message: `Successfully requested to open ${imagePath}.` };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`MainIPC: Error opening image externally - file not found: ${imagePath}`, error);
        return { success: false, message: `File not found: ${imagePath}` };
      }
      console.error(`MainIPC: Error opening image externally ${imagePath}:`, error);
      return { success: false, message: `Failed to open image: ${error.message || String(error)}` };
    }
  });

  // Handler for toggling the favorite status of an item
  ipcMain.handle(IPC_TOGGLE_FAVORITE_STATUS, async (event, itemId: number, isFavorite: boolean): Promise<{ success: boolean; newFavoriteStatus?: number; message?: string }> => {
    console.log(`MainIPC: Received request to toggle favorite status for item ID: ${itemId} to ${isFavorite}`);
    if (itemId === undefined || itemId === null || typeof isFavorite !== 'boolean') {
      console.warn('MainIPC: Invalid parameters received for toggling favorite status.');
      return { success: false, message: 'Invalid parameters for toggling favorite status.' };
    }

    try {
      const result = await storageService.toggleFavoriteStatus(itemId, isFavorite);
      if (result.success) {
        console.log(`MainIPC: Favorite status for item ID ${itemId} successfully updated to ${result.newFavoriteStatus}.`);
        return { success: true, newFavoriteStatus: result.newFavoriteStatus, message: 'Favorite status updated.' };
      } else {
        console.warn(`MainIPC: Failed to toggle favorite status for item ID ${itemId}.`, result.message);
        return { success: false, message: result.message || 'Failed to toggle favorite status.' };
      }
    } catch (error: any) {
      console.error(`MainIPC: Error toggling favorite status for item ID ${itemId}:`, error);
      return { success: false, message: `Error toggling favorite status: ${error.message || String(error)}` };
    }
  });

  // Window control handlers (Renderer to Main, one-way)
  ipcMain.on(IPC_WINDOW_MINIMIZE, () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.minimize();
      console.log('MainIPC: Window minimize requested.');
    }
  });

  ipcMain.on(IPC_WINDOW_MAXIMIZE, () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        console.log('MainIPC: Window unmaximize requested.');
      } else {
        mainWindow.maximize();
        console.log('MainIPC: Window maximize requested.');
      }
    }
  });

  ipcMain.on(IPC_WINDOW_CLOSE, () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.close();
      console.log('MainIPC: Window close requested.');
    }
  });

  // Handler for getting the current theme
  ipcMain.handle(IPC_GET_THEME, async (): Promise<string> => {
    console.log('MainIPC: Received request for theme.');
    try {
      const theme = settingsManager.getTheme();
      console.log(`MainIPC: Returning theme "${theme}".`);
      return theme;
    } catch (error) {
      console.error('MainIPC: Error fetching theme:', error);
      return settingsManager.getTheme(); // Return default on error
    }
  });

  // Handler for setting a new theme
  ipcMain.handle(IPC_SET_THEME, async (event, theme: string): Promise<{ success: boolean; message?: string; newTheme?: string }> => {
    console.log(`MainIPC: Received request to set theme to "${theme}".`);
    if (!['light', 'dark', 'system'].includes(theme)) {
      console.warn('MainIPC: Invalid theme value received.');
      return { success: false, message: 'Invalid theme value provided. Must be "light", "dark", or "system".' };
    }

    try {
      settingsManager.setTheme(theme as 'light' | 'dark' | 'system');
      const newTheme = settingsManager.getTheme(); // Get the actual stored theme
      console.log(`MainIPC: Theme successfully set to "${newTheme}".`);

      // Broadcast the theme change to all renderer windows
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && win.webContents && !win.webContents.isDestroyed()) {
          win.webContents.send('theme-changed-event', newTheme);
          console.log(`MainIPC: Sent 'theme-changed-event' with theme '${newTheme}' to window ID ${win.id}`);
        }
      });

      return { success: true, newTheme, message: `Theme updated to ${newTheme}.` };
    } catch (error: any) {
      console.error('MainIPC: Error setting theme:', error);
      const currentTheme = settingsManager.getTheme();
      return {
        success: false,
        message: `An error occurred: ${error.message || String(error)}. The active theme is "${currentTheme}".`,
        newTheme: currentTheme
      };
    }
  });

  // Handler for opening a file or folder path
  ipcMain.handle(IPC_OPEN_PATH, async (event, targetPath: string): Promise<{ success: boolean; message?: string }> => {
    console.log(`MainIPC: Received request to open path: ${targetPath}`);
    if (!targetPath || typeof targetPath !== 'string') {
      return { success: false, message: 'Invalid path provided.' };
    }
    try {
      await fs.access(targetPath, fs.constants.F_OK); // Check for existence
      await shell.openPath(targetPath);
      console.log(`MainIPC: Successfully requested to open path ${targetPath}.`);
      return { success: true, message: `Successfully requested to open ${targetPath}.` };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`MainIPC: Error opening path - not found: ${targetPath}`, error);
        return { success: false, message: `Path not found: ${targetPath}` };
      }
      console.error(`MainIPC: Error opening path ${targetPath}:`, error);
      return { success: false, message: `Failed to open path: ${error.message || String(error)}` };
    }
  });

  // Handler for copying a path to the clipboard
  ipcMain.handle(IPC_COPY_PATH_TO_CLIPBOARD, async (event, pathToCopy: string): Promise<{ success: boolean; message?: string }> => {
    console.log(`MainIPC: Received request to copy path to clipboard: ${pathToCopy}`);
    if (!pathToCopy || typeof pathToCopy !== 'string') {
      return { success: false, message: 'Invalid path provided for copying.' };
    }
    try {
      clipboard.writeText(pathToCopy);
      console.log(`MainIPC: Path "${pathToCopy}" copied to clipboard successfully.`);
      return { success: true, message: `Path "${pathToCopy}" copied to clipboard.` };
    } catch (error: any) {
      console.error(`MainIPC: Error copying path "${pathToCopy}" to clipboard:`, error);
      return { success: false, message: `Failed to copy path: ${error.message || String(error)}` };
    }
  });

  // Handler for getting the current auto-hide-after-paste setting
  ipcMain.handle(IPC_GET_AUTO_HIDE_AFTER_PASTE, async (): Promise<boolean> => {
    console.log('MainIPC: Received request for auto-hide-after-paste status.');
    try {
      const status = settingsManager.getAutoHideAfterPaste();
      console.log(`MainIPC: Returning auto-hide-after-paste status "${status}".`);
      return status;
    } catch (error) {
      console.error('MainIPC: Error fetching auto-hide-after-paste status:', error);
      return settingsManager.getAutoHideAfterPaste(); // Return current value on error
    }
  });

  // Handler for setting a new auto-hide-after-paste setting
  ipcMain.handle(IPC_SET_AUTO_HIDE_AFTER_PASTE, async (event, isEnabled: boolean): Promise<{ success: boolean; message?: string; newStatus?: boolean }> => {
    console.log(`MainIPC: Received request to set auto-hide-after-paste status to "${isEnabled}".`);
    if (typeof isEnabled !== 'boolean') {
      console.warn('MainIPC: Invalid auto-hide-after-paste status value received.');
      return { success: false, message: 'Invalid auto-hide-after-paste status value provided. Must be a boolean.' };
    }

    try {
      settingsManager.setAutoHideAfterPaste(isEnabled);
      const newStatus = settingsManager.getAutoHideAfterPaste();
      console.log(`MainIPC: Auto-hide-after-paste status successfully set to "${newStatus}".`);
      return { success: true, newStatus, message: `Auto-hide-after-paste status updated to ${newStatus}.` };
    } catch (error: any) {
      console.error('MainIPC: Error setting auto-hide-after-paste status:', error);
      const currentStatus = settingsManager.getAutoHideAfterPaste();
      return {
        success: false,
        message: `An error occurred: ${error.message || String(error)}. The active status is "${currentStatus}".`,
        newStatus: currentStatus
      };
    }
  });

  // Handler for simulating paste (Ctrl+V or Cmd+V)
  ipcMain.on(IPC_SIMULATE_PASTE, () => {
    console.log('MainIPC: Received request to simulate paste.');
    try {
      // Determine the modifier key based on the platform
      const modifier = process.platform === 'darwin' ? 'command' : 'control';
      // Simulate Ctrl+V or Cmd+V
      robot.keyTap('v', [modifier]);
      console.log(`MainIPC: Simulated paste (${modifier}+v).`);
    } catch (error: any) {
      console.error('MainIPC: Error simulating paste:', error);
      // Optionally notify the renderer of the error? For now, just log.
    }
  });

  // Handler for getting deduplication status
  ipcMain.handle(IPC_GET_DEDUPLICATE_STATUS, async () => {
    try {
      const status = settingsManager.getDeduplicateEnabled();
      console.log(`[IPC Handler] Returning deduplicate status: ${status}`);
      return status;
    } catch (error) {
      console.error('[IPC Handler] Error getting deduplicate status:', error);
      return settingsManager.getDeduplicateEnabled(); // Return current or default on error
    }
  });

  // Handler for setting deduplication status
  ipcMain.handle(IPC_SET_DEDUPLICATE_STATUS, async (_event, isEnabled: boolean) => {
    try {
      if (typeof isEnabled !== 'boolean') {
        throw new Error('Invalid value provided for deduplication status.');
      }
      settingsManager.setDeduplicateEnabled(isEnabled);
      const newStatus = settingsManager.getDeduplicateEnabled();
      console.log(`[IPC Handler] Deduplicate status set to: ${newStatus}`);
      // Notify HistoryManager if it needs to adjust its behavior
      // Example: historyManagerInstance?.setDeduplicationEnabled(newStatus);
      return { success: true, newStatus };
    } catch (error: any) {
      console.error('[IPC Handler] Error setting deduplicate status:', error);
      return { success: false, message: error.message || 'Failed to set deduplicate status.', newStatus: settingsManager.getDeduplicateEnabled() };
    }
  });

  // --- Template/Keyword IPC Handlers ---

  ipcMain.handle(IPC_ADD_TEMPLATE, async (event, templateData: Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; template?: TemplateItem; message?: string }> => {
    console.log('MainIPC: Received request to add template:', templateData?.description);
    if (!templateData) {
      return { success: false, message: 'Invalid template data provided.' };
    }
    try {
      const newTemplate = await storageService.addTemplate(templateData);
      console.log(`MainIPC: Template added successfully with ID: ${newTemplate.id}. Updating shortcuts...`);
      // Update shortcuts after successful add
      try {
        await templateShortcutManager.updateShortcuts();
      } catch (shortcutError) {
        console.error(`MainIPC: Error updating shortcuts after adding template ${newTemplate.id}:`, shortcutError);
        // Log error but don't fail the overall operation
      }
      return { success: true, template: newTemplate };
    } catch (error: any) {
      console.error('MainIPC: Error adding template:', error);
      return { success: false, message: `Failed to add template: ${error.message || String(error)}` };
    }
  });

  ipcMain.handle(IPC_GET_ALL_TEMPLATES, async (): Promise<TemplateItem[]> => {
    console.log('MainIPC: Received request for all templates.');
    try {
      const templates = await storageService.getAllTemplates();
      console.log(`MainIPC: Returning ${templates.length} templates.`);
      return templates;
    } catch (error) {
      console.error('MainIPC: Error fetching all templates:', error);
      return []; // Return empty array on error
    }
  });

  ipcMain.handle(IPC_UPDATE_TEMPLATE, async (event, templateId: string, updates: Partial<Omit<TemplateItem, 'id' | 'created_at'>>): Promise<{ success: boolean; template?: TemplateItem | null; message?: string }> => {
    console.log(`MainIPC: Received request to update template ID: ${templateId} with updates:`, Object.keys(updates));
    if (!templateId || !updates || typeof updates !== 'object') {
      return { success: false, message: 'Invalid template ID or update data provided.' };
    }
    try {
      const updatedTemplate = await storageService.updateTemplate(templateId, updates);
      if (updatedTemplate) {
        console.log(`MainIPC: Template ID ${templateId} updated successfully. Updating shortcuts...`);
        // Update shortcuts after successful update
        try {
          await templateShortcutManager.updateShortcuts();
        } catch (shortcutError) {
          console.error(`MainIPC: Error updating shortcuts after updating template ${templateId}:`, shortcutError);
          // Log error but don't fail the overall operation
        }
        return { success: true, template: updatedTemplate };
      } else {
        console.warn(`MainIPC: Template ID ${templateId} not found for update.`);
        return { success: false, message: `Template with ID ${templateId} not found.` };
      }
    } catch (error: any) {
      console.error(`MainIPC: Error updating template ID ${templateId}:`, error);
      return { success: false, message: `Failed to update template: ${error.message || String(error)}` };
    }
  });

  ipcMain.handle(IPC_DELETE_TEMPLATE, async (event, templateId: string): Promise<boolean> => {
    console.log(`MainIPC: Received request to delete template ID: ${templateId}`);
    if (!templateId) {
      console.warn('MainIPC: Invalid template ID received for deletion.');
      return false;
    }
    try {
      const success = await storageService.deleteTemplate(templateId);
      if (success) {
        console.log(`MainIPC: Template ID ${templateId} deleted successfully. Updating shortcuts...`);
        // Update shortcuts after successful delete
        try {
          await templateShortcutManager.updateShortcuts();
        } catch (shortcutError) {
          console.error(`MainIPC: Error updating shortcuts after deleting template ${templateId}:`, shortcutError);
          // Log error but don't fail the overall operation
        }
      } else {
        console.warn(`MainIPC: Template ID ${templateId} not found for deletion or delete failed.`);
      }
      return success;
    } catch (error: any) {
      console.error(`MainIPC: Error deleting template ID ${templateId}:`, error);
      return false;
    }
  });

  ipcMain.handle(IPC_TOGGLE_TEMPLATE_STATUS, async (event, templateId: string): Promise<{ success: boolean; newStatus?: boolean; message?: string }> => {
    console.log(`MainIPC: Received request to toggle status for template ID: ${templateId}`);
    if (!templateId) {
      return { success: false, message: 'Invalid template ID provided.' };
    }
    try {
      const newStatus = await storageService.toggleTemplateStatus(templateId);
      if (newStatus !== null) {
        console.log(`MainIPC: Template status for ID ${templateId} toggled successfully to ${newStatus}. Updating shortcuts...`);
        // Update shortcuts after successful toggle
        try {
          await templateShortcutManager.updateShortcuts();
        } catch (shortcutError) {
          console.error(`MainIPC: Error updating shortcuts after toggling template ${templateId}:`, shortcutError);
          // Log error but don't fail the overall operation
        }
        return { success: true, newStatus };
      } else {
        console.warn(`MainIPC: Template ID ${templateId} not found for status toggle or toggle failed.`);
        return { success: false, message: `Template with ID ${templateId} not found or toggle failed.` };
      }
    } catch (error: any) {
      console.error(`MainIPC: Error toggling template status for ID ${templateId}:`, error);
      return { success: false, message: `Failed to toggle template status: ${error.message || String(error)}` };
    }
  });

  // --- End Template/Keyword IPC Handlers ---

  // Handler for resolving snippet content
  ipcMain.handle(IPC_RESOLVE_SNIPPET, async (event, template: TemplateItem): Promise<string> => {
    console.log(`MainIPC: Received request to resolve snippet for template ID: ${template?.id}`);
    if (!template) { // Removed check for snippet_type
      console.warn('MainIPC: Invalid template data received for snippet resolution.');
      return `[Error: Invalid template data]`; // Return error string
    }
    try {
      const resolvedContent = await snippetResolver.resolveSnippet(template);
      console.log(`MainIPC: Snippet resolved successfully for template ID: ${template.id}. Preview: "${resolvedContent.substring(0, 50)}..."`);
      return resolvedContent;
    } catch (error: any) {
      console.error(`MainIPC: Error resolving snippet for template ID ${template.id}:`, error);
      return `[Error resolving snippet: ${error.message || String(error)}]`; // Return error string
    }
  });

  console.log('MainIPC: Main process IPC handlers set up.');
}

export { setupMainProcessIpcHandlers };
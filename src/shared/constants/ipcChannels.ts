/**
 * IPC Channel Constants
 *
 * Define all IPC channel names here to ensure consistency across
 * main, renderer, and preload scripts.
 */

// Channels for invoking from renderer to main (ipcRenderer.invoke -> ipcMain.handle)
export const IPC_REQUEST_HISTORY_ITEMS = 'ipc-request-history-items';
export const IPC_PASTE_ITEM = 'ipc-paste-item';
export const IPC_DELETE_HISTORY_ITEM = 'ipc-delete-history-item'; // For deleting a history item

// Example: Channel for sending from renderer to main (ipcRenderer.send -> ipcMain.on)
// export const IPC_SOME_ACTION = 'ipc-some-action';

// Example: Channel for sending from main to renderer (webContents.send)
// export const IPC_UPDATE_COUNTER = 'ipc-update-counter';
export const IPC_HISTORY_ITEM_ADDED = 'ipc-history-item-added'; // Main to renderer: new history item was added

// Add more channel constants as needed for other features.

// Channels for global shortcut settings
export const IPC_GET_GLOBAL_SHORTCUT = 'ipc-get-global-shortcut'; // Renderer to Main: Get current global shortcut
export const IPC_SET_GLOBAL_SHORTCUT = 'ipc-set-global-shortcut'; // Renderer to Main: Set new global shortcut

// Channels for history limit settings
export const IPC_GET_HISTORY_LIMIT = 'ipc-get-history-limit'; // Renderer to Main: Get current history limit
export const IPC_SET_HISTORY_LIMIT = 'ipc-set-history-limit'; // Renderer to Main: Set new history limit

// Channels for auto-launch settings
export const IPC_GET_AUTO_LAUNCH_STATUS = 'ipc-get-auto-launch-status'; // Renderer to Main: Get current auto-launch status
export const IPC_SET_AUTO_LAUNCH_STATUS = 'ipc-set-auto-launch-status'; // Renderer to Main: Set new auto-launch status

// Channel for clearing all history
export const IPC_CLEAR_ALL_HISTORY = 'ipc-clear-all-history'; // Renderer to Main: Clear all history items

// Channel for writing files to clipboard
export const IPC_WRITE_FILES_TO_CLIPBOARD = 'ipc-write-files-to-clipboard'; // Renderer to Main: Write file paths to system clipboard

// Channels for image preview
export const IPC_GET_IMAGE_DATA_URL = 'ipc-get-image-data-url'; // Renderer to Main: Get image data as DataURL
export const IPC_OPEN_IMAGE_EXTERNAL = 'ipc-open-image-external'; // Renderer to Main: Open image with default system viewer

// Channel for toggling favorite status
export const IPC_TOGGLE_FAVORITE_STATUS = 'ipc-toggle-favorite-status'; // Renderer to Main: Toggle favorite status of an item

// Channels for window controls (Renderer to Main, send/on)
export const IPC_WINDOW_MINIMIZE = 'ipc-window-minimize';
export const IPC_WINDOW_MAXIMIZE = 'ipc-window-maximize';
export const IPC_WINDOW_CLOSE = 'ipc-window-close';
// Channels for theme settings
export const IPC_GET_THEME = 'ipc-get-theme'; // Renderer to Main: Get current theme
export const IPC_SET_THEME = 'ipc-set-theme'; // Renderer to Main: Set new theme
export const IPC_SYSTEM_THEME_UPDATED = 'ipc-system-theme-updated'; // Main to Renderer: System theme has changed

// Channels for paste behavior settings
export const IPC_GET_AUTO_HIDE_AFTER_PASTE = 'ipc-get-auto-hide-after-paste'; // Renderer to Main: Get current auto-hide-after-paste setting
export const IPC_SET_AUTO_HIDE_AFTER_PASTE = 'ipc-set-auto-hide-after-paste'; // Renderer to Main: Set new auto-hide-after-paste setting

// Channel for simulating paste (Ctrl+V)
export const IPC_SIMULATE_PASTE = 'ipc-simulate-paste'; // Renderer to Main: Request simulation of paste action
// Channels for File Path Preview (UIX-008)
export const IPC_OPEN_PATH = 'ipc-open-path'; // Renderer to Main: Open a file or folder path
export const IPC_COPY_PATH_TO_CLIPBOARD = 'ipc-copy-path-to-clipboard'; // Renderer to Main: Copy a path to clipboard

// Channels for Deduplication Settings
export const IPC_GET_DEDUPLICATE_STATUS = 'ipc-get-deduplicate-status'; // Renderer to Main: Get current deduplication status
export const IPC_SET_DEDUPLICATE_STATUS = 'ipc-set-deduplicate-status'; // Renderer to Main: Set new deduplication status
// Channels for Template/Keyword Management
export const IPC_ADD_TEMPLATE = 'ipc-add-template'; // Renderer to Main: Add a new template
export const IPC_GET_ALL_TEMPLATES = 'ipc-get-all-templates'; // Renderer to Main: Get all templates
export const IPC_UPDATE_TEMPLATE = 'ipc-update-template'; // Renderer to Main: Update an existing template
export const IPC_DELETE_TEMPLATE = 'ipc-delete-template'; // Renderer to Main: Delete a template
export const IPC_TOGGLE_TEMPLATE_STATUS = 'ipc-toggle-template-status'; // Renderer to Main: Toggle enabled status of a template
export const IPC_RESOLVE_SNIPPET = 'ipc-resolve-snippet'; // Renderer to Main: Resolve snippet content based on type
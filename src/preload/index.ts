console.log('[Preload Script] PRELOAD SCRIPT STARTED - TOP LEVEL');
try {
  const { contextBridge, ipcRenderer, nativeTheme } = require('electron'); // Added nativeTheme
  const {
    IPC_REQUEST_HISTORY_ITEMS,
    IPC_PASTE_ITEM,
    IPC_DELETE_HISTORY_ITEM,
    IPC_HISTORY_ITEM_ADDED,
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
    IPC_SYSTEM_THEME_UPDATED, // Added for theme (though direct nativeTheme access might be used more)
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
  } = require('../shared/constants/ipcChannels');
  // Note: ClipboardItem type import is not strictly needed for runtime if only used for type hints in IpcApi
  // For simplicity in this debug step, we'll rely on 'any' or infer types for parameters if direct type import causes issues with esbuild/preload context.

  console.log(`[Preload Script] DEBUG_IPC_PRELOAD: IPC_REQUEST_HISTORY_ITEMS constant value is "${IPC_REQUEST_HISTORY_ITEMS}"`);

  if (!contextBridge || !ipcRenderer) {
    console.error('[Preload Script] CRITICAL: contextBridge or ipcRenderer is not available from require("electron").');
    throw new Error('Electron contextBridge or ipcRenderer not available in preload.');
  }
  
  const exposedApi = {
    requestHistoryItems: () => ipcRenderer.invoke(IPC_REQUEST_HISTORY_ITEMS),
    pasteItem: (item: any /* ClipboardItem */) => ipcRenderer.invoke(IPC_PASTE_ITEM, item),
    deleteHistoryItem: (itemId: number) => ipcRenderer.invoke(IPC_DELETE_HISTORY_ITEM, itemId),
    ping: () => {
      console.log('[Preload Script] ping called from renderer!');
      return 'pong from preload';
    },
    // Listener for when a new history item is added
    onHistoryItemAdded: (callback: (event: Electron.IpcRendererEvent, item: any /* ClipboardItem */) => void) => {
      ipcRenderer.on(IPC_HISTORY_ITEM_ADDED, callback);
    },
    offHistoryItemAdded: (callback: (event: Electron.IpcRendererEvent, item: any /* ClipboardItem */) => void) => {
      ipcRenderer.removeListener(IPC_HISTORY_ITEM_ADDED, callback);
    },
    // Global shortcut methods
    getGlobalShortcut: () => ipcRenderer.invoke(IPC_GET_GLOBAL_SHORTCUT),
    setGlobalShortcut: (shortcut: string) => ipcRenderer.invoke(IPC_SET_GLOBAL_SHORTCUT, shortcut),
    // History limit methods
    getHistoryLimit: () => ipcRenderer.invoke(IPC_GET_HISTORY_LIMIT),
    setHistoryLimit: (limit: number) => ipcRenderer.invoke(IPC_SET_HISTORY_LIMIT, limit),
    // Auto-launch methods
    getAutoLaunchStatus: () => ipcRenderer.invoke(IPC_GET_AUTO_LAUNCH_STATUS),
    setAutoLaunchStatus: (isEnabled: boolean) => ipcRenderer.invoke(IPC_SET_AUTO_LAUNCH_STATUS, isEnabled),
    // Clear all history
    clearAllHistory: () => ipcRenderer.invoke(IPC_CLEAR_ALL_HISTORY),
    // Method to write file paths to clipboard
    writeFilesToClipboard: (paths: string[]) => ipcRenderer.invoke(IPC_WRITE_FILES_TO_CLIPBOARD, paths),
    // Image preview methods
    getImageDataUrl: (imagePath: string): Promise<{ success: boolean; dataUrl?: string; message?: string }> =>
      ipcRenderer.invoke(IPC_GET_IMAGE_DATA_URL, imagePath),
    openImageExternal: (imagePath: string): Promise<{ success: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_OPEN_IMAGE_EXTERNAL, imagePath),
    // Toggle favorite status
    toggleFavoriteStatus: (itemId: number, isFavorite: boolean): Promise<{ success: boolean; newFavoriteStatus?: number; message?: string }> =>
      ipcRenderer.invoke(IPC_TOGGLE_FAVORITE_STATUS, itemId, isFavorite),
    // Generic listener for events sent from main to renderer
    onRendererEvent: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
      ipcRenderer.on(channel, listener);
    },
    offRendererEvent: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, listener);
    },
    // Window control methods
    windowMinimize: () => ipcRenderer.send(IPC_WINDOW_MINIMIZE),
    windowMaximize: () => ipcRenderer.send(IPC_WINDOW_MAXIMIZE),
    windowClose: () => ipcRenderer.send(IPC_WINDOW_CLOSE),
    // Theme settings
    getTheme: () => ipcRenderer.invoke(IPC_GET_THEME),
    setTheme: (theme: 'light' | 'dark' | 'system') => ipcRenderer.invoke(IPC_SET_THEME, theme),
onThemeChanged: (callback: (newTheme: 'light' | 'dark' | 'system') => void) => {
      // Define the handler function that will be passed to ipcRenderer.on
      // It receives the Electron.IpcRendererEvent and any arguments sent from the main process.
      // In this case, we expect 'newTheme' as the argument.
      const handler = (_event: Electron.IpcRendererEvent, newTheme: 'light' | 'dark' | 'system') => {
        callback(newTheme);
      };
      
      // Register the listener for 'theme-changed-event'
      ipcRenderer.on('theme-changed-event', handler);
      
      // Return a cleanup function that the renderer can call to remove this specific listener
      return () => {
        ipcRenderer.removeListener('theme-changed-event', handler);
      };
    },
    // Listener for system theme updates pushed from main process
    onSystemThemeUpdated: (callback: (event: Electron.IpcRendererEvent, shouldUseDarkColors: boolean) => void) => {
      ipcRenderer.on(IPC_SYSTEM_THEME_UPDATED, callback);
    },
    offSystemThemeUpdated: (callback: (event: Electron.IpcRendererEvent, shouldUseDarkColors: boolean) => void) => {
      ipcRenderer.removeListener(IPC_SYSTEM_THEME_UPDATED, callback);
    },
    // UIX-008 File Path Preview
    openPath: (path: string): Promise<{ success: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_OPEN_PATH, path),
    copyPathToClipboard: (path: string): Promise<{ success: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_COPY_PATH_TO_CLIPBOARD, path),
    // Auto-hide after paste methods
    getAutoHideAfterPaste: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_GET_AUTO_HIDE_AFTER_PASTE),
    setAutoHideAfterPaste: (isEnabled: boolean): Promise<{ success: boolean; message?: string; newStatus?: boolean }> =>
      ipcRenderer.invoke(IPC_SET_AUTO_HIDE_AFTER_PASTE, isEnabled),
    hideMainWindow: (): void => // Changed return type to void
      ipcRenderer.send(IPC_WINDOW_MINIMIZE), // Changed invoke to send
    // Simulate paste
    simulatePaste: (): void =>
      ipcRenderer.send(IPC_SIMULATE_PASTE),
    // Deduplication settings
    getDeduplicateStatus: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_GET_DEDUPLICATE_STATUS),
    setDeduplicateStatus: (isEnabled: boolean): Promise<{ success: boolean; message?: string; newStatus?: boolean }> =>
      ipcRenderer.invoke(IPC_SET_DEDUPLICATE_STATUS, isEnabled),
    // --- Template/Keyword Management ---
    addTemplate: (templateData: any /* Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'> */): Promise<{ success: boolean; template?: any /* TemplateItem */; message?: string }> =>
      ipcRenderer.invoke(IPC_ADD_TEMPLATE, templateData),
    getAllTemplates: (): Promise<any[] /* TemplateItem[] */> =>
      ipcRenderer.invoke(IPC_GET_ALL_TEMPLATES),
    updateTemplate: (templateId: string, updates: any /* Partial<Omit<TemplateItem, 'id' | 'created_at'>> */): Promise<{ success: boolean; template?: any /* TemplateItem | null */; message?: string }> =>
      ipcRenderer.invoke(IPC_UPDATE_TEMPLATE, templateId, updates),
    deleteTemplate: (templateId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_DELETE_TEMPLATE, templateId),
    toggleTemplateStatus: (templateId: string): Promise<{ success: boolean; newStatus?: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_TOGGLE_TEMPLATE_STATUS, templateId),
    // --- End Template/Keyword Management ---
    // --- Snippet Resolution ---
    resolveSnippet: (template: any /* TemplateItem */): Promise<string> =>
      ipcRenderer.invoke(IPC_RESOLVE_SNIPPET, template)
    // --- End Snippet Resolution ---
  };

  console.log('[Preload Script] About to enter try block for contextBridge.exposeInMainWorld.');
  try {
    console.log('[Preload Script] INSIDE try block, BEFORE contextBridge.exposeInMainWorld.');
    contextBridge.exposeInMainWorld('ipcRenderer', exposedApi);
    console.log('[Preload Script] SUCCESS: ipcRenderer API exposed to main world.');

    // Expose nativeTheme properties and events directly for renderer convenience
    // This allows the renderer to directly query system theme and listen for its changes.
    contextBridge.exposeInMainWorld('nativeThemeUtils', {
      getShouldUseDarkColors: () => {
        if (nativeTheme && typeof nativeTheme.shouldUseDarkColors === 'boolean') {
          return nativeTheme.shouldUseDarkColors;
        }
        console.warn('[Preload Script] nativeTheme.shouldUseDarkColors is not available as expected. Defaulting to false (light theme).');
        return false; // Default to light theme if detection fails
      },
      onNativeThemeUpdated: (callback: () => void) => {
        // nativeTheme.on('updated', callback) can be directly used if the callback doesn't need event/args
        // For safety and consistency with other listeners, let's wrap it if needed,
        // but direct usage of nativeTheme.on in renderer (if it could access it) is also an option.
        // Here, we provide a way to subscribe.
        const handler = () => callback(); // Simple wrapper
        nativeTheme.on('updated', handler);
        // Return a function to remove the listener, similar to how ipcRenderer.off works
        return () => nativeTheme.removeListener('updated', handler);
      }
      // Note: nativeTheme.themeSource can also be exposed if needed.
    });
    console.log('[Preload Script] SUCCESS: nativeThemeUtils API exposed to main world.');

  } catch (e: any) {
    console.error('[Preload Script] ERROR exposing API to main world:', e, e.stack);
  }

  contextBridge.exposeInMainWorld('electronPreloadCheck', {
    loadedTimestamp: Date.now(),
    message: "Preload script finished its contextBridge attempts."
  });

} catch (e: any) {
  console.error('[Preload Script] CRITICAL ERROR at top level of preload script:', e, e.stack);
}
console.log('[Preload Script] PRELOAD SCRIPT EXECUTION FINISHED.');
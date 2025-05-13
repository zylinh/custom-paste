import { ClipboardItem } from '../shared/types/clipboard';
import { TemplateItem } from '../shared/types/template'; // Import TemplateItem type
import type { IpcRendererEvent } from 'electron'; // Import Electron event type
import type { ThemeSetting } from '../shared/types/settings'; // Import ThemeSetting type from shared location
   export interface IpcApi {
     requestHistoryItems: () => Promise<ClipboardItem[]>;
     pasteItem: (item: ClipboardItem) => Promise<{ success: boolean; message: string; error?: string }>;
     deleteHistoryItem: (itemId: number) => Promise<boolean>;
     onHistoryItemAdded: (callback: (event: IpcRendererEvent, item: ClipboardItem) => void) => void;
     offHistoryItemAdded: (callback: (event: IpcRendererEvent, item: ClipboardItem) => void) => void;
     clearAllHistory: () => Promise<{ success: boolean; message?: string; errors?: any[] }>;
     getGlobalShortcut: () => Promise<string>;
     setGlobalShortcut: (shortcut: string) => Promise<{ success: boolean; message?: string; newShortcut?: string }>;
     getHistoryLimit: () => Promise<number>;
     setHistoryLimit: (limit: number) => Promise<{ success: boolean; message?: string; newLimit?: number }>;
     getAutoLaunchStatus: () => Promise<boolean>;
     setAutoLaunchStatus: (isEnabled: boolean) => Promise<{ success: boolean; message?: string; newStatus?: boolean }>;
     writeFilesToClipboard: (paths: string[]) => Promise<{ success: boolean; message?: string; error?: string }>;
     // Image preview methods
     getImageDataUrl: (imagePath: string) => Promise<{ success: boolean; dataUrl?: string; message?: string }>;
     openImageExternal: (imagePath: string) => Promise<{ success: boolean; message?: string }>;
     // Method for toggling favorite status
     toggleFavoriteStatus: (itemId: number, isFavorite: boolean) => Promise<{ success: boolean; newFavoriteStatus?: number; message?: string }>;
     // Generic event listeners
     onRendererEvent: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void;
     offRendererEvent: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void;
     // Window control methods
     windowMinimize: () => void;
     windowMaximize: () => void;
     windowClose: () => void;
     // Theme settings
     getTheme: () => Promise<ThemeSetting>;
     setTheme: (theme: ThemeSetting) => Promise<{ success: boolean; message?: string; newTheme?: ThemeSetting }>;
onThemeChanged: (callback: (newTheme: ThemeSetting) => void) => (() => void); // Returns a cleanup function
     onSystemThemeUpdated: (callback: (event: IpcRendererEvent, shouldUseDarkColors: boolean) => void) => void;
     offSystemThemeUpdated: (callback: (event: IpcRendererEvent, shouldUseDarkColors: boolean) => void) => void;
     // UIX-008 File Path Preview
     openPath: (path: string) => Promise<{ success: boolean; message?: string }>;
     copyPathToClipboard: (path: string) => Promise<{ success: boolean; message?: string }>;
     // Add any other methods exposed in preload.ts here
     getAutoHideAfterPaste: () => Promise<boolean>;
     setAutoHideAfterPaste: (isEnabled: boolean) => Promise<{ success: boolean; message?: string; newStatus?: boolean }>; // Added set method type
     hideMainWindow: () => void; // Changed return type to void
     simulatePaste: () => void; // Added for simulating paste
     // Deduplication settings
     getDeduplicateStatus: () => Promise<boolean>;
     setDeduplicateStatus: (isEnabled: boolean) => Promise<{ success: boolean; message?: string; newStatus?: boolean }>;
     // --- Template/Keyword Management ---
     addTemplate: (templateData: Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; template?: TemplateItem; message?: string }>;
     getAllTemplates: () => Promise<TemplateItem[]>;
     updateTemplate: (templateId: string, updates: Partial<Omit<TemplateItem, 'id' | 'created_at'>>) => Promise<{ success: boolean; template?: TemplateItem | null; message?: string }>;
     deleteTemplate: (templateId: string) => Promise<boolean>;
     toggleTemplateStatus: (templateId: string) => Promise<{ success: boolean; newStatus?: boolean; message?: string }>;
     // --- End Template/Keyword Management ---
// --- Snippet Resolution ---
     resolveSnippet: (template: TemplateItem) => Promise<string>;
     // --- End Snippet Resolution ---
   }

   export interface NativeThemeUtilsApi {
     getShouldUseDarkColors: () => boolean;
     onNativeThemeUpdated: (callback: () => void) => (() => void); // Returns an unlistener function
   }

   declare global {
     interface Window {
       ipcRenderer: IpcApi;
       nativeThemeUtils: NativeThemeUtilsApi; // Added for direct nativeTheme access
       electronPreloadCheck: { // Also declare the check object we added
         loadedTimestamp: number;
         message: string;
       };
     }
   }
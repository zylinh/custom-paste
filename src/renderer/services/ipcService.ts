/// <reference path="../electron.d.ts" />
import { ClipboardItem } from '../../shared/types/clipboard';
import { TemplateItem } from '../../shared/types/template'; // Import TemplateItem

// It's good practice to have a d.ts file that defines the structure of window.ipcRenderer
// based on what's exposed in preload.ts. For example, in an `electron.d.ts`:
/*
declare global {
  interface Window {
    ipcRenderer: {
      requestHistoryItems: () => Promise<ClipboardItem[]>;
      pasteItem: (item: ClipboardItem) => Promise<{ success: boolean; message: string; error?: string }>;
      deleteHistoryItem: (itemId: number) => Promise<boolean>;
      onHistoryItemAdded: (callback: (event: any, item: ClipboardItem) => void) => void;
      offHistoryItemAdded: (callback: (event: any, item: ClipboardItem) => void) => void;
      getGlobalShortcut: () => Promise<string>;
      setGlobalShortcut: (shortcut: string) => Promise<{ success: boolean; message?: string; newShortcut?: string }>;
      getHistoryLimit: () => Promise<number>;
      setHistoryLimit: (limit: number) => Promise<{ success: boolean; message?: string; newLimit?: number }>;
      getAutoLaunchStatus: () => Promise<boolean>;
      setAutoLaunchStatus: (isEnabled: boolean) => Promise<{ success: boolean; message?: string; newStatus?: boolean }>;
      clearAllHistory: () => Promise<{ success: boolean; message?: string; errors?: any[] }>;
      writeFilesToClipboard: (paths: string[]) => Promise<{ success: boolean; message?: string; error?: string }>;
      // New methods for image preview
      getImageDataUrl: (imagePath: string) => Promise<{ success: boolean; dataUrl?: string; message?: string }>;
      openImageExternal: (imagePath: string) => Promise<{ success: boolean; message?: string }>;
      // Add other exposed methods here
    };
  }
}
*/
// Assuming such a d.ts file exists or will be created for better type safety.
// If not, the `as any` or explicit typing on window.ipcRenderer methods will be necessary.

const ipcService = {
  requestHistoryItems: async (): Promise<ClipboardItem[]> => {
    console.log('[ipcService DEBUG] requestHistoryItems function CALLED.');
    console.log(`[ipcService DEBUG] typeof window.ipcRenderer: ${typeof window.ipcRenderer}`);
    console.log(`[ipcService DEBUG] typeof window.ipcRenderer?.requestHistoryItems: ${typeof window.ipcRenderer?.requestHistoryItems}`);

    if (window.ipcRenderer && typeof window.ipcRenderer.requestHistoryItems === 'function') {
      try {
        console.log('[ipcService DEBUG] Attempting to call window.ipcRenderer.requestHistoryItems().');
        const items: ClipboardItem[] = await window.ipcRenderer.requestHistoryItems();
        console.log('ipcService: History items received:', items);
        return items;
      } catch (error) {
        console.error('ipcService: Error requesting history items:', error);
        throw error; // Re-throw to be caught by caller
      }
    } else {
      console.error('ipcService: requestHistoryItems API is not available on window.ipcRenderer.');
      // Fallback or error handling
      return Promise.reject(new Error('IPC API for requestHistoryItems not available.'));
    }
  },

  pasteItem: async (item: ClipboardItem): Promise<{ success: boolean; message: string; error?: string }> => {
    if (window.ipcRenderer?.pasteItem) {
      try {
        const result = await (window.ipcRenderer.pasteItem as unknown as (item: ClipboardItem) => Promise<{ success: boolean; message: string; error?: string }>)(item);
        console.log(`ipcService: Paste item request sent for item ID: ${item.id}. Result:`, result);
        return result;
      } catch (error) {
        console.error('ipcService: Error pasting item:', error);
        throw error; // Re-throw
      }
    } else {
      console.error('ipcService: pasteItem API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for pasteItem not available.')); // Or return a default error object
    }
  },

  deleteHistoryItem: async (itemId: number): Promise<boolean> => {
    if (window.ipcRenderer?.deleteHistoryItem) {
      try {
        // Assuming preload.ts exposes deleteHistoryItem: (itemId: number) => Promise<boolean>
        const success: boolean = await (window.ipcRenderer.deleteHistoryItem as unknown as (id: number) => Promise<boolean>)(itemId);
        console.log(`ipcService: Delete item request sent for item ID: ${itemId}. Success: ${success}`);
        return success;
      } catch (error) {
        console.error(`ipcService: Error deleting item ID ${itemId}:`, error);
        throw error; // Re-throw to be caught by caller
      }
    } else {
      console.error('ipcService: deleteHistoryItem API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for deleteHistoryItem not available.'));
    }
  },

  // Example for a listener, if you had one in preload
  // onUpdateCounter: (callback: (value: number) => void): (() => void) | undefined => {
  //   if (window.ipcRenderer?.onUpdateCounter && window.ipcRenderer?.offUpdateCounter) {
  //     const eventCallback = (event: any, value: number) => callback(value);
  //     window.ipcRenderer.onUpdateCounter(eventCallback);
  //     // Return a cleanup function
  //     return () => {
  //       if (window.ipcRenderer?.offUpdateCounter) {
  //         window.ipcRenderer.offUpdateCounter(eventCallback);
  //       }
  //     };
  //   } else {
  //     console.error('ipcService: onUpdateCounter API is not available.');
  //     return undefined;
  //   }
  // },

  listenForHistoryUpdates: (callback: (item: ClipboardItem) => void): (() => void) | undefined => {
    if (window.ipcRenderer?.onHistoryItemAdded && window.ipcRenderer?.offHistoryItemAdded) {
      // The event object from ipcRenderer.on is not needed by the final callback,
      // so we adapt the signature.
      const eventCallback = (_event: any, item: ClipboardItem) => callback(item);
      
      window.ipcRenderer.onHistoryItemAdded(eventCallback);
      console.log('ipcService: Listener for history updates registered.');

      // Return a cleanup function to unregister the listener
      return () => {
        if (window.ipcRenderer?.offHistoryItemAdded) {
          window.ipcRenderer.offHistoryItemAdded(eventCallback);
          console.log('ipcService: Listener for history updates unregistered.');
        }
      };
    } else {
      console.error('ipcService: onHistoryItemAdded or offHistoryItemAdded API is not available on window.ipcRenderer.');
      return undefined;
    }
  },

  clearAllHistory: async (): Promise<{ success: boolean; message?: string; errors?: any[] }> => {
    if (window.ipcRenderer?.clearAllHistory) {
      try {
        const result = await (window.ipcRenderer.clearAllHistory as unknown as () => Promise<{ success: boolean; message?: string; errors?: any[] }> )();
        console.log('ipcService: Clear all history request sent. Result:', result);
        return result;
      } catch (error) {
        console.error('ipcService: Error clearing all history:', error);
        throw error; // Re-throw
      }
    } else {
      console.error('ipcService: clearAllHistory API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for clearAllHistory not available.'));
    }
  },

  writeFilesToClipboard: async (paths: string[]): Promise<{ success: boolean; message?: string; error?: string }> => {
    // Ensure the IpcApi type in electron.d.ts (or equivalent) includes writeFilesToClipboard
    // For now, using type assertion.
    const ipcRendererTyped = window.ipcRenderer as any;
    if (ipcRendererTyped && typeof ipcRendererTyped.writeFilesToClipboard === 'function') {
      try {
        const result = await ipcRendererTyped.writeFilesToClipboard(paths) as { success: boolean; message?: string; error?: string };
        console.log(`ipcService: Write files to clipboard request sent. Paths: ${paths.join(', ')}. Result:`, result);
        return result;
      } catch (error) {
        console.error('ipcService: Error writing files to clipboard:', error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to write files to clipboard.', error: String(err) };
      }
    } else {
      console.error('ipcService: writeFilesToClipboard API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for writeFilesToClipboard not available.'));
    }
  },

  getImageDataUrl: async (imagePath: string): Promise<{ success: boolean; dataUrl?: string; message?: string }> => {
    const ipcRendererTyped = window.ipcRenderer as any; // Adjust type as per your electron.d.ts
    if (ipcRendererTyped && typeof ipcRendererTyped.getImageDataUrl === 'function') {
      try {
        const result = await ipcRendererTyped.getImageDataUrl(imagePath);
        console.log(`ipcService: Get image data URL request sent for path: ${imagePath}. Success: ${result.success}`);
        return result;
      } catch (error) {
        console.error('ipcService: Error getting image data URL:', error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to get image data URL.' };
      }
    } else {
      console.error('ipcService: getImageDataUrl API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for getImageDataUrl not available.'));
    }
  },

  openImageExternal: async (imagePath: string): Promise<{ success: boolean; message?: string }> => {
    const ipcRendererTyped = window.ipcRenderer as any; // Adjust type as per your electron.d.ts
    if (ipcRendererTyped && typeof ipcRendererTyped.openImageExternal === 'function') {
      try {
        const result = await ipcRendererTyped.openImageExternal(imagePath);
        console.log(`ipcService: Open image external request sent for path: ${imagePath}. Success: ${result.success}`);
        return result;
      } catch (error) {
        console.error('ipcService: Error opening image externally:', error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to open image externally.' };
      }
    } else {
      console.error('ipcService: openImageExternal API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for openImageExternal not available.'));
    }
  },

  toggleFavoriteStatus: async (itemId: number, isFavorite: boolean): Promise<{ success: boolean; newFavoriteStatus?: number; message?: string }> => {
    const ipcRendererTyped = window.ipcRenderer as any; // Adjust type as per your electron.d.ts
    if (ipcRendererTyped && typeof ipcRendererTyped.toggleFavoriteStatus === 'function') {
      try {
        const result = await ipcRendererTyped.toggleFavoriteStatus(itemId, isFavorite);
        console.log(`ipcService: Toggle favorite status request sent for item ID: ${itemId} to ${isFavorite}. Success: ${result.success}`);
        return result;
      } catch (error) {
        console.error('ipcService: Error toggling favorite status:', error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to toggle favorite status.' };
      }
    } else {
      console.error('ipcService: toggleFavoriteStatus API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for toggleFavoriteStatus not available.'));
    }
  },

  openPath: async (path: string): Promise<{ success: boolean; message?: string }> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.openPath === 'function') {
      try {
        const result = await window.ipcRenderer.openPath(path);
        console.log(`ipcService: Open path request sent for path: ${path}. Success: ${result.success}`);
        return result;
      } catch (error) {
        console.error('ipcService: Error opening path:', error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to open path.' };
      }
    } else {
      console.error('ipcService: openPath API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for openPath not available.'));
    }
  },

  copyPathToClipboard: async (path: string): Promise<{ success: boolean; message?: string }> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.copyPathToClipboard === 'function') {
      try {
        const result = await window.ipcRenderer.copyPathToClipboard(path);
        console.log(`ipcService: Copy path to clipboard request sent for path: ${path}. Success: ${result.success}`);
        return result;
      } catch (error) {
        console.error('ipcService: Error copying path to clipboard:', error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to copy path to clipboard.' };
      }
    } else {
      console.error('ipcService: copyPathToClipboard API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for copyPathToClipboard not available.'));
    }
  },

  getAutoHideAfterPaste: async (): Promise<boolean> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.getAutoHideAfterPaste === 'function') {
      try {
        const result = await window.ipcRenderer.getAutoHideAfterPaste();
        console.log('ipcService: Get auto-hide-after-paste status. Result:', result);
        return result;
      } catch (error) {
        console.error('ipcService: Error getting auto-hide-after-paste status:', error);
        throw error; // Re-throw to allow caller handling
      }
    } else {
      console.error('ipcService: getAutoHideAfterPaste API is not available on window.ipcRenderer.');
      throw new Error('IPC API for getAutoHideAfterPaste not available.'); // Throw error instead of returning rejected promise
    }
  },

  setAutoHideAfterPaste: async (isEnabled: boolean): Promise<{ success: boolean; message?: string; newStatus?: boolean }> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.setAutoHideAfterPaste === 'function') {
      try {
        const result = await window.ipcRenderer.setAutoHideAfterPaste(isEnabled);
        console.log(`ipcService: Set auto-hide-after-paste status to ${isEnabled}. Result:`, result);
        return result;
      } catch (error) {
        console.error(`ipcService: Error setting auto-hide-after-paste status to ${isEnabled}:`, error);
        throw error; // Re-throw
      }
    } else {
      console.error('ipcService: setAutoHideAfterPaste API is not available on window.ipcRenderer.');
      throw new Error('IPC API for setAutoHideAfterPaste not available.'); // Throw error
    }
  },

  hideMainWindow: (): void => { // Changed return type to void, removed async
    if (window.ipcRenderer && typeof window.ipcRenderer.hideMainWindow === 'function') {
      try {
        window.ipcRenderer.hideMainWindow(); // Removed await
        console.log('ipcService: Hide main window request sent.');
      } catch (error) {
        // Although send is typically sync, wrap in try/catch just in case preload throws an error during check
        console.error('ipcService: Error sending hide main window request:', error);
        // Cannot easily throw here as the function is void, log is the best option
      }
    } else {
      console.error('ipcService: hideMainWindow API is not available on window.ipcRenderer.');
      // Cannot easily throw here as the function is void
    }
  },

  simulatePaste: (): void => {
    if (window.ipcRenderer && typeof window.ipcRenderer.simulatePaste === 'function') {
      try {
        window.ipcRenderer.simulatePaste();
        console.log('ipcService: Simulate paste request sent.');
      } catch (error) {
        console.error('ipcService: Error sending simulate paste request:', error);
      }
    } else {
      console.error('ipcService: simulatePaste API is not available on window.ipcRenderer.');
    }
  },

  // --- Template/Keyword Management ---

  addTemplate: async (templateData: Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; template?: TemplateItem; message?: string }> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.addTemplate === 'function') {
      try {
        const result = await window.ipcRenderer.addTemplate(templateData);
        console.log('ipcService: Add template request sent. Result:', result);
        return result;
      } catch (error) {
        console.error('ipcService: Error adding template:', error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to add template.' };
      }
    } else {
      console.error('ipcService: addTemplate API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for addTemplate not available.'));
    }
  },

  getAllTemplates: async (): Promise<TemplateItem[]> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.getAllTemplates === 'function') {
      try {
        const templates = await window.ipcRenderer.getAllTemplates();
        console.log('ipcService: Get all templates request sent. Received:', templates.length);
        return templates;
      } catch (error) {
        console.error('ipcService: Error getting all templates:', error);
        throw error; // Re-throw
      }
    } else {
      console.error('ipcService: getAllTemplates API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for getAllTemplates not available.'));
    }
  },

  updateTemplate: async (templateId: string, updates: Partial<Omit<TemplateItem, 'id' | 'created_at'>>): Promise<{ success: boolean; template?: TemplateItem | null; message?: string }> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.updateTemplate === 'function') {
      try {
        const result = await window.ipcRenderer.updateTemplate(templateId, updates);
        console.log(`ipcService: Update template request sent for ID: ${templateId}. Result:`, result);
        return result;
      } catch (error) {
        console.error(`ipcService: Error updating template ID ${templateId}:`, error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to update template.' };
      }
    } else {
      console.error('ipcService: updateTemplate API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for updateTemplate not available.'));
    }
  },

  deleteTemplate: async (templateId: string): Promise<boolean> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.deleteTemplate === 'function') {
      try {
        const success = await window.ipcRenderer.deleteTemplate(templateId);
        console.log(`ipcService: Delete template request sent for ID: ${templateId}. Success: ${success}`);
        return success;
      } catch (error) {
        console.error(`ipcService: Error deleting template ID ${templateId}:`, error);
        throw error; // Re-throw
      }
    } else {
      console.error('ipcService: deleteTemplate API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for deleteTemplate not available.'));
    }
  },

  toggleTemplateStatus: async (templateId: string): Promise<{ success: boolean; newStatus?: boolean; message?: string }> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.toggleTemplateStatus === 'function') {
      try {
        const result = await window.ipcRenderer.toggleTemplateStatus(templateId);
        console.log(`ipcService: Toggle template status request sent for ID: ${templateId}. Result:`, result);
        return result;
      } catch (error) {
        console.error(`ipcService: Error toggling template status for ID ${templateId}:`, error);
        const err = error as Error;
        return { success: false, message: err.message || 'Failed to toggle template status.' };
      }
    } else {
      console.error('ipcService: toggleTemplateStatus API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for toggleTemplateStatus not available.'));
    }
  }
  // --- End Template/Keyword Management ---
, // Add comma after the last method

  // --- Snippet Resolution ---
  resolveSnippet: async (template: TemplateItem): Promise<string> => {
    if (window.ipcRenderer && typeof window.ipcRenderer.resolveSnippet === 'function') {
      try {
        const resolvedContent = await window.ipcRenderer.resolveSnippet(template);
        console.log(`ipcService: Resolve snippet request sent for template ID: ${template.id}. Result: "${resolvedContent.substring(0, 50)}..."`);
        return resolvedContent;
      } catch (error) {
        console.error(`ipcService: Error resolving snippet for template ID ${template.id}:`, error);
        // Return error message or re-throw depending on desired handling
        return `[Error resolving snippet: ${error instanceof Error ? error.message : String(error)}]`;
      }
    } else {
      console.error('ipcService: resolveSnippet API is not available on window.ipcRenderer.');
      return Promise.reject(new Error('IPC API for resolveSnippet not available.'));
    }
  }
  // --- End Snippet Resolution ---
};

export default ipcService;
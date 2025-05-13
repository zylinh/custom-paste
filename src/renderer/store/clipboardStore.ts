import { defineStore } from 'pinia';
import { ClipboardItem } from '../../shared/types/clipboard';
import ipcService from '../services/ipcService';

export interface ClipboardState {
  historyItems: ClipboardItem[];
  selectedItem: ClipboardItem | null;
  isLoading: boolean;
  error: string | null;
  searchTerm: string; // Added for search
}

export const useClipboardStore = defineStore('clipboard', {
  state: (): ClipboardState => ({
    historyItems: [],
    selectedItem: null,
    isLoading: false,
    error: null,
    searchTerm: '', // Added for search
  }),

  actions: {
    async fetchHistoryItems() {
      this.isLoading = true;
      this.error = null;
      try {
        const items = await ipcService.requestHistoryItems();
        this.historyItems = items;
        console.log('ClipboardStore: History items fetched', items.length);
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch history items';
        console.error('ClipboardStore: Error fetching history items:', err);
        this.historyItems = []; // Clear items on error
      } finally {
        this.isLoading = false;
      }
    },

    async pasteItem(itemToPaste?: ClipboardItem, options?: { simulatePaste?: boolean; hideWindowOverride?: boolean }) {
      const item = itemToPaste || this.selectedItem;
      const simulatePaste = options?.simulatePaste ?? false; // Default to false
      const hideWindowOverride = options?.hideWindowOverride; // Can be true, false, or undefined

      if (!item) {
        console.warn('ClipboardStore: No item selected or provided to paste.');
        return { success: false, message: 'No item selected or provided to paste.' };
      }
      try {
        // Enhanced logging to see what's being sent
        console.log(
          `ClipboardStore: Requesting paste for item ID: ${item.id}, Type: ${item.content_type}, ` +
          `Text Preview: "${item.text_content ? item.text_content.substring(0, 50) + '...' : 'N/A'}", ` +
          `Image Path: "${item.image_path || 'N/A'}", ` +
          `File Paths: "${item.file_paths ? item.file_paths.join(', ').substring(0, 100) + '...' : 'N/A'}"`
        );
        // Convert item to a plain JavaScript object to avoid issues with Proxies in IPC
        const plainItem = { ...item };
        // For debugging, log the plain item
        console.log('ClipboardStore: Plain item being sent to IPC:', JSON.stringify(plainItem, null, 2));

        let result: { success: boolean; message?: string; error?: string };

        if (plainItem.content_type === 'file' && plainItem.file_paths && Array.isArray(plainItem.file_paths)) {
          console.log(`ClipboardStore: Requesting paste for FILE item ID: ${plainItem.id}. Paths:`, plainItem.file_paths);
          result = await ipcService.writeFilesToClipboard(plainItem.file_paths);
          if (result.success) {
            console.log(`ClipboardStore: File paths for item ID ${plainItem.id} written successfully to system clipboard.`);
          } else {
            console.error(`ClipboardStore: Failed to write file paths for item ID ${plainItem.id} to system clipboard: ${result.message}`, result.error ? `Error details: ${result.error}` : '');
          }
        } else if (plainItem.content_type === 'text' || plainItem.content_type === 'image') {
          result = await ipcService.pasteItem(plainItem);
          if (result.success) {
            console.log(`ClipboardStore: Item ID ${plainItem.id} (type: ${plainItem.content_type}) pasted successfully to system clipboard.`);
          } else {
            console.error(`ClipboardStore: Failed to paste item ID ${plainItem.id} (type: ${plainItem.content_type}) to system clipboard: ${result.message}`, result.error ? `Error details: ${result.error}` : '');
          }
        } else {
          console.warn(`ClipboardStore: pasteItem called with unhandled item type: ${plainItem.content_type} for item ID ${plainItem.id}`);
          result = { success: false, message: `Unhandled item type: ${plainItem.content_type}` };
        }
        // Check if copy was successful before proceeding
        if (result.success) {
          // Simulate paste if requested
          if (simulatePaste) {
            try {
              console.log('ClipboardStore: Simulating paste...');
              ipcService.simulatePaste();
            } catch (simulateError) {
              console.error('ClipboardStore: Error simulating paste:', simulateError);
              // Log error but don't necessarily fail the overall operation
            }
          }

          // Check if we should hide window after paste, considering override
          if (hideWindowOverride === false) {
            console.log('ClipboardStore: Hiding window explicitly overridden for this paste action.');
          } else {
            try {
              const shouldHideSetting = await ipcService.getAutoHideAfterPaste();
              if (shouldHideSetting) {
                console.log('ClipboardStore: Auto-hide after paste enabled, hiding window...');
                ipcService.hideMainWindow();
              } else {
                 console.log('ClipboardStore: Auto-hide after paste disabled.');
              }
            } catch (hideError) {
              console.error('ClipboardStore: Error checking/hiding window after paste:', hideError);
              // Don't fail the paste operation if hide fails
            }
          }
        }
        return result;
      } catch (err: any) {
        console.error(`ClipboardStore: Exception during pasteItem for item ID ${item.id}:`, err);
        // Optionally set an error state
        return { success: false, message: err.message || 'Exception occurred while attempting to paste item.', error: String(err) };
      }
    },

    selectItem(item: ClipboardItem | null) {
      this.selectedItem = item;
      console.log('ClipboardStore: Item selected:', item ? item.id : null);
    },

    // Example: Action to clear selection if needed
    clearSelection() {
      this.selectedItem = null;
    },

    updateSearchTerm(term: string) {
      this.searchTerm = term;
      console.log('ClipboardStore: Search term updated', term);
    },

    async deleteHistoryItem(itemId: number) {
      if (itemId === undefined) {
        console.error('ClipboardStore: Item ID is undefined, cannot delete.');
        this.error = 'Cannot delete item: ID is missing.';
        return false;
      }
      this.isLoading = true; // Optional: set loading state for delete
      this.error = null;
      try {
        const success = await ipcService.deleteHistoryItem(itemId);
        if (success) {
          this.historyItems = this.historyItems.filter(item => item.id !== itemId);
          // If the deleted item was selected, clear the selection
          if (this.selectedItem?.id === itemId) {
            this.selectedItem = null;
          }
          console.log(`ClipboardStore: Item ID ${itemId} deleted successfully.`);
          return true;
        } else {
          this.error = `Failed to delete item ID ${itemId} from main process.`;
          console.error(`ClipboardStore: Main process failed to delete item ID ${itemId}.`);
          return false;
        }
      } catch (err: any) {
        this.error = err.message || `Failed to delete item ID ${itemId}.`;
        console.error(`ClipboardStore: Error deleting item ID ${itemId}:`, err);
        return false;
      } finally {
        this.isLoading = false; // Optional: clear loading state for delete
      }
    },

    initializeHistoryListener() {
      console.log('ClipboardStore: Initializing history listener.');
      const cleanupListener = ipcService.listenForHistoryUpdates((newItem: ClipboardItem) => { // Added type for newItem
        console.log('ClipboardStore: Received IPC_HISTORY_ITEM_ADDED with new item:', newItem);
        // Directly add the new item to the beginning of the list
        // This assumes new items should appear at the top.
        if (newItem && typeof newItem === 'object' && newItem.id !== undefined) { // Basic validation for newItem
          // Prevent duplicates if by some chance the item is already there (e.g., from a rapid fetch)
          const exists = this.historyItems.some(existingItem => existingItem.id === newItem.id);
          if (!exists) {
            this.historyItems.unshift(newItem);
            console.log('ClipboardStore: New item unshifted to historyItems.');
          } else {
            console.log('ClipboardStore: New item already exists in historyItems, not adding again via IPC listener.');
          }
        } else {
          console.warn('ClipboardStore: Received invalid newItem from IPC_HISTORY_ITEM_ADDED, not adding to store.', newItem);
        }
      });

      // Pinia stores are not Vue components, so there's no 'unmounted' hook directly.
      // If this store instance could be destroyed and recreated,
      // managing the cleanupListener would be more complex.
      // For a global store like this, it's often set up once and lives for the app's lifetime.
      // If cleanup is strictly needed upon app close, it would typically be handled
      // by main process signals or window events, not directly within the store's lifecycle.
      // However, ipcService.listenForHistoryUpdates returns a cleanup function,
      // which *could* be called if there was a mechanism to do so.
      // For now, we'll log its existence.
      if (cleanupListener) {
        console.log('ClipboardStore: History update listener registered. Cleanup function available.');
        // Storing the cleanup function if needed later, though Pinia doesn't have a direct unmount.
        // (this as any)._cleanupHistoryListener = cleanupListener;
      }
    },

    clearAllLocalHistory() {
      this.historyItems = [];
      this.selectedItem = null;
      this.searchTerm = ''; // Optionally reset search term as well
      this.error = null; // Clear any existing errors
      console.log('ClipboardStore: All local history items cleared.');
      // No need to call isLoading as this is a local synchronous operation
      // after the main process has confirmed deletion.
    },

    async toggleFavoriteStatus(itemId: number) {
      const itemIndex = this.historyItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        console.error(`ClipboardStore: Item ID ${itemId} not found to toggle favorite status.`);
        this.error = `Item ID ${itemId} not found.`;
        return;
      }

      const item = this.historyItems[itemIndex];
      const currentIsFavorite = item.is_favorite === 1;
      const newIsFavoriteState = !currentIsFavorite;

      // Optimistic update
      this.historyItems[itemIndex] = {
        ...item,
        is_favorite: newIsFavoriteState ? 1 : 0,
      };
      // If the selected item is the one being toggled, update its favorite status too
      if (this.selectedItem?.id === itemId) {
        this.selectedItem = { ...this.historyItems[itemIndex] };
      }

      try {
        console.log(`ClipboardStore: Toggling favorite for item ID ${itemId} to ${newIsFavoriteState}`);
        const result = await ipcService.toggleFavoriteStatus(itemId, newIsFavoriteState);
        if (result.success && result.newFavoriteStatus !== undefined) {
          // Confirm state, though optimistic update should match
          this.historyItems[itemIndex].is_favorite = result.newFavoriteStatus;
          if (this.selectedItem?.id === itemId) {
            this.selectedItem.is_favorite = result.newFavoriteStatus;
          }
          console.log(`ClipboardStore: Favorite status for item ID ${itemId} confirmed to ${result.newFavoriteStatus}.`);
        } else {
          console.error(`ClipboardStore: Failed to toggle favorite status for item ID ${itemId} in main process. Reverting optimistic update. Message: ${result.message}`);
          // Revert optimistic update
          this.historyItems[itemIndex].is_favorite = currentIsFavorite ? 1 : 0;
          if (this.selectedItem?.id === itemId) {
            this.selectedItem.is_favorite = currentIsFavorite ? 1 : 0;
          }
          this.error = result.message || 'Failed to update favorite status.';
        }
      } catch (err: any) {
        console.error(`ClipboardStore: Error toggling favorite status for item ID ${itemId}:`, err);
        // Revert optimistic update on exception
        this.historyItems[itemIndex].is_favorite = currentIsFavorite ? 1 : 0;
        if (this.selectedItem?.id === itemId) {
          this.selectedItem.is_favorite = currentIsFavorite ? 1 : 0;
        }
        this.error = err.message || 'Error updating favorite status.';
      }
    },
  },

  getters: {
    filteredHistoryItems: (state): ClipboardItem[] => {
      if (!state.searchTerm) {
        return state.historyItems;
      }
      const lowerCaseSearchTerm = state.searchTerm.toLowerCase().trim();
      if (!lowerCaseSearchTerm) { // Also return all if search term is just spaces
        return state.historyItems;
      }
      return state.historyItems.filter(item => {
        // Search in textContent (if available)
        if (item.text_content && item.text_content.toLowerCase().includes(lowerCaseSearchTerm)) {
          return true;
        }
        // Search in preview_text (if available)
        if (item.preview_text && item.preview_text.toLowerCase().includes(lowerCaseSearchTerm)) {
          return true;
        }
        // Search in search_text (if available) - assuming this field is populated for search purposes
        // This field should ideally be pre-populated in the main process with relevant searchable text
        if (item.search_text && item.search_text.toLowerCase().includes(lowerCaseSearchTerm)) {
          return true;
        }
        // For images, search in image_path (filename)
        if (item.content_type === 'image' && item.image_path) {
          const filenameWithExtension = item.image_path.replace(/^.*[\\\/]/, '');
          if (filenameWithExtension.toLowerCase().includes(lowerCaseSearchTerm)) {
            return true;
          }
        }
        // Search in file paths (basenames)
        if (item.content_type === 'file' && item.file_paths && item.file_paths.length > 0) {
          for (const filePath of item.file_paths) {
            const basename = filePath.replace(/^.*[\\\/]/, '');
            if (basename.toLowerCase().includes(lowerCaseSearchTerm)) {
              return true;
            }
          }
        }
        return false;
      });
    },
    // Existing getters
    hasItems: (state): boolean => state.historyItems.length > 0,
    getSelectedItemId: (state): number | undefined => state.selectedItem?.id,
  },
});
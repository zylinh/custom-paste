import { ClipboardItem } from '../../shared/types/clipboard';
import { StorageService } from '../db/StorageService';

export class HistoryManager {
  private storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
    console.log('HistoryManager initialized.');
  }

  public async addHistoryItem(item: ClipboardItem): Promise<ClipboardItem | null> {
    if (!item) {
      console.warn('HistoryManager: Attempted to add null or undefined item.');
      return null;
    }

    console.log('HistoryManager: Received item to add:', item.preview_text);

    // Basic validation (more can be added)
    if (!item.hash || (!item.text_content && !item.image_path && (!item.file_paths || item.file_paths.length === 0))) {
      console.error('HistoryManager: Invalid item, missing hash or content.', item);
      // Optionally throw an error or return a status
      return null;
    }

    try {
      const addedItem = await this.storageService.addClipboardItem(item);
      if (addedItem) {
        console.log(`HistoryManager: Item with hash ${item.hash} (ID: ${addedItem.id}) processed by StorageService.`);
      } else {
        console.log(`HistoryManager: Item with hash ${item.hash} was not added by StorageService (e.g., duplicate).`);
      }
      return addedItem;
    } catch (error) {
      console.error('HistoryManager: Error adding item to storage:', error);
      // Handle or re-throw error, or return null if error indicates non-addition
      return null;
    }
  }

  // Other methods for managing history might be added later, e.g.:
  // - getHistoryItems(page: number, limit: number): Promise<ClipboardItem[]>
  // - deleteHistoryItem(id: number): Promise<void>
  // - toggleFavorite(id: number): Promise<void>
  // - clearHistory(): Promise<void>
}

// Example Usage (for testing, to be integrated properly in main.ts)
/*
if (require.main === module) {
  // Mock StorageService for testing
  const mockStorageService = {
    addClipboardItem: async (item: ClipboardItem) => {
      console.log('MockStorageService: addClipboardItem called with', item.preview_text);
      return Promise.resolve(1); // Mocked DB insert ID
    }
  };

  const historyManager = new HistoryManager(mockStorageService as any);

  const testTextItem: ClipboardItem = {
    content_type: 'text',
    text_content: 'Hello from HistoryManager test',
    image_path: null,
    source_app: 'test-app',
    timestamp: Date.now(),
    hash: 'testhash123',
    preview_text: 'Hello from HistoryManager test',
    search_text: 'Hello from HistoryManager test',
  };

  historyManager.addHistoryItem(testTextItem).then(() => {
    console.log('Test item processed by HistoryManager.');
  });
}
*/
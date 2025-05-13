import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs/promises'; // For ensuring directory exists
import crypto from 'crypto'; // For generating UUIDs
import { ClipboardItem } from '../../shared/types/clipboard';
import { TemplateItem } from '../../shared/types/template'; // Import TemplateItem
import { settingsManager } from '../services/SettingsManager'; // Added for history limit

const DB_FILE_NAME = 'custompaste_history.db';
const DB_DIR = 'database';

export class StorageService {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbDirectoryPath = path.join(userDataPath, DB_DIR);
    // Ensure directory exists (fs.mkdir with recursive can be used, or fs-extra)
    // For simplicity, assuming directory will be created or handled by an init step.
    // A proper init method should handle this.
    
    const dbPath = path.join(dbDirectoryPath, DB_FILE_NAME);
    
    // Ensure directory exists before trying to open DB
    // This is a simplified way; a more robust app would handle this in an init phase
    try {
        fs.mkdir(dbDirectoryPath, { recursive: true });
    } catch (e) {
        // if it fails, it might be because it already exists, which is fine.
        // console.warn("Could not create DB directory, may already exist:", e);
    }


    this.db = new Database(dbPath, { verbose: console.log }); // verbose for dev
    console.log(`StorageService: Database initialized at ${dbPath}`);
    this.initSchema();
  }

  private initSchema(): void {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS clipboard_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_type TEXT NOT NULL CHECK(content_type IN ('text', 'image', 'file')),
        text_content TEXT,
        image_path TEXT,
        file_paths TEXT, -- JSON stringified array of file paths
        source_app TEXT,
        timestamp INTEGER NOT NULL,
        is_favorite INTEGER DEFAULT 0,
        hash TEXT NOT NULL UNIQUE, -- Assuming hash should be unique to prevent exact duplicates
        preview_text TEXT,
        search_text TEXT
      );
    `;
    // Add indexes for performance on common queries
    const createIndexSqlTimestamp = `CREATE INDEX IF NOT EXISTS idx_timestamp ON clipboard_history (timestamp);`;
    const createIndexSqlContentType = `CREATE INDEX IF NOT EXISTS idx_content_type ON clipboard_history (content_type);`;
    const createIndexSqlFavorite = `CREATE INDEX IF NOT EXISTS idx_is_favorite ON clipboard_history (is_favorite);`;

    // --- Add Template Table ---
    const createTemplatesTableSql = `
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        keywords TEXT, -- JSON stringified array
        -- snippet_type removed as part of placeholder refactoring
        snippet_content TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        shortcut TEXT NULL -- Added for shortcut trigger
      );
    `;
    const createIndexTemplatesEnabled = `CREATE INDEX IF NOT EXISTS idx_templates_enabled ON templates (enabled);`;
    // --- End Template Table ---


    try {
      this.db.exec(createTableSql);
      this.db.exec(createIndexSqlTimestamp);
      this.db.exec(createIndexSqlContentType);
      this.db.exec(createIndexSqlFavorite);

      // Initialize templates table and index
      this.db.exec(createTemplatesTableSql);
      this.db.exec(createIndexTemplatesEnabled);

      console.log('StorageService: Database schema initialized (or already exists).');
    } catch (error) {
      console.error('StorageService: Error initializing database schema:', error);
      throw error; // Critical error
    }
  }

  public async addClipboardItem(item: ClipboardItem): Promise<ClipboardItem | null> {
    const deduplicateEnabled = settingsManager.getDeduplicateEnabled();
    
    if (deduplicateEnabled) {
      const sql = `
        INSERT INTO clipboard_history
          (content_type, text_content, image_path, file_paths, source_app, timestamp, is_favorite, hash, preview_text, search_text)
        VALUES
          (@content_type, @text_content, @image_path, @file_paths, @source_app, @timestamp, @is_favorite, @hash, @preview_text, @search_text)
        ON CONFLICT(hash) DO UPDATE SET
          timestamp = @timestamp,
          source_app = @source_app,
          preview_text = @preview_text,
          search_text = @search_text
      `;
      
      try {
        const stmt = this.db.prepare(sql);
        const result = stmt.run({
          content_type: item.content_type,
          text_content: item.text_content,
          image_path: item.image_path,
          file_paths: item.file_paths ? JSON.stringify(item.file_paths) : null,
          source_app: item.source_app,
          timestamp: item.timestamp,
          is_favorite: item.is_favorite || 0,
          hash: item.hash,
          preview_text: item.preview_text,
          search_text: item.search_text,
        });
        
        if (result.changes > 0) {
          console.log(`StorageService: Item ${result.lastInsertRowid ? 'added' : 'updated'} with ID: ${result.lastInsertRowid || 'N/A'}`);
          const rowId = Number(result.lastInsertRowid) || this._getItemIdByHash(item.hash);
          if (rowId) {
            return this.getClipboardItemById(rowId);
          }
        }
        return null;
      } catch (error: any) {
        console.error('StorageService: Error adding/updating clipboard item:', error);
        throw error;
      }
    } else {
      // Original insert without deduplication
      const sql = `
        INSERT INTO clipboard_history
          (content_type, text_content, image_path, file_paths, source_app, timestamp, is_favorite, hash, preview_text, search_text)
        VALUES
          (@content_type, @text_content, @image_path, @file_paths, @source_app, @timestamp, @is_favorite, @hash, @preview_text, @search_text)
      `;

      try {
        const stmt = this.db.prepare(sql);
        const result = stmt.run({
          content_type: item.content_type,
          text_content: item.text_content,
          image_path: item.image_path,
          file_paths: item.file_paths ? JSON.stringify(item.file_paths) : null,
          source_app: item.source_app,
          timestamp: item.timestamp,
          is_favorite: item.is_favorite || 0,
          hash: item.hash,
          preview_text: item.preview_text,
          search_text: item.search_text,
        });
        console.log(`StorageService: Item added with ID: ${result.lastInsertRowid}`);
        const newRowId = Number(result.lastInsertRowid);
        // After adding, enforce the history limit
        this._enforceHistoryLimit().catch(err => {
          console.error('StorageService: Error enforcing history limit after adding item:', err);
        });
        if (newRowId) {
          return this.getClipboardItemById(newRowId);
        }
        return null;
      } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.warn(`StorageService: Attempted to insert item with duplicate hash: ${item.hash}. Item not added.`);
          return null;
        }
        console.error('StorageService: Error adding clipboard item to database:', error);
        throw error;
      }
    }
  }

  private _getItemIdByHash(hash: string): number | null {
    const sql = `SELECT id FROM clipboard_history WHERE hash = @hash LIMIT 1;`;
    try {
      const stmt = this.db.prepare(sql);
      const row = stmt.get({ hash }) as { id: number } | undefined;
      return row?.id || null;
    } catch (error) {
      console.error(`StorageService: Error getting item ID by hash ${hash}:`, error);
      return null;
    }
  }

  // Placeholder for future methods (P0 might not need them immediately for capture)
  public async getClipboardItems(limit: number = 20, offset: number = 0): Promise<ClipboardItem[]> {
    const sql = `
        SELECT * FROM clipboard_history 
        ORDER BY timestamp DESC 
        LIMIT @limit OFFSET @offset;
    `;
    try {
        const stmt = this.db.prepare(sql);
        const rows = stmt.all({ limit, offset }) as any[]; // Read as any first
        return rows.map(row => {
          if (row.content_type === 'file' && row.file_paths) {
            try {
              row.file_paths = JSON.parse(row.file_paths);
            } catch (e) {
              console.error(`StorageService: Failed to parse file_paths for item ID ${row.id}:`, e);
              row.file_paths = []; // Default to empty array on parse error
            }
          }
          return row as ClipboardItem;
        });
    } catch (error) {
        console.error('StorageService: Error fetching items:', error);
        return [];
    }
  }

  public async getClipboardItemById(id: number): Promise<ClipboardItem | null> {
    const sql = `SELECT * FROM clipboard_history WHERE id = @id;`;
    try {
      const stmt = this.db.prepare(sql);
      const row = stmt.get({ id }) as any | undefined;
      if (row && row.content_type === 'file' && row.file_paths) {
        try {
          row.file_paths = JSON.parse(row.file_paths);
        } catch (e) {
          console.error(`StorageService: Failed to parse file_paths for item ID ${row.id}:`, e);
          row.file_paths = [];
        }
      }
      return row ? row as ClipboardItem : null;
    } catch (error) {
      console.error(`StorageService: Error fetching item with ID ${id}:`, error);
      return null;
    }
  }

  public async deleteClipboardItem(id: number): Promise<boolean> {
    const sql = `DELETE FROM clipboard_history WHERE id = @id;`;
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run({ id });
      if (result.changes > 0) {
        console.log(`StorageService: Item with ID ${id} deleted successfully.`);
        return true;
      } else {
        console.warn(`StorageService: No item found with ID ${id} to delete.`);
        return false; // No rows affected
      }
    } catch (error) {
      console.error(`StorageService: Error deleting item with ID ${id}:`, error);
      return false;
    }
  }

  private async _enforceHistoryLimit(): Promise<void> {
    const limit = settingsManager.getHistoryLimit();
    console.log(`StorageService: Enforcing history limit. Configured limit: ${limit}`);

    const countSql = `SELECT COUNT(*) as total FROM clipboard_history;`;
    let totalItems: number;
    try {
      const row = this.db.prepare(countSql).get() as { total: number };
      totalItems = row.total;
      console.log(`StorageService: Current total items: ${totalItems}`);
    } catch (error) {
      console.error('StorageService: Error counting total items:', error);
      return; // Cannot proceed without total count
    }

    if (totalItems <= limit) {
      console.log('StorageService: Total items within limit. No cleanup needed.');
      return;
    }

    const itemsToDeleteCount = totalItems - limit;
    console.log(`StorageService: Need to delete ${itemsToDeleteCount} oldest non-favorite items.`);

    // Find the IDs of the oldest, non-favorite items to delete
    // This query selects the 'itemsToDeleteCount' oldest items that are not favorites.
    const findOldestSql = `
      SELECT id, image_path, content_type, file_paths FROM clipboard_history
      WHERE is_favorite = 0
      ORDER BY timestamp ASC
      LIMIT @count;
    `;
    // file_paths is not directly used for deletion logic here, but good to be aware of its existence
    let itemsToDelete: { id: number; image_path: string | null; content_type: string; file_paths: string | null }[] = [];
    try {
      const stmt = this.db.prepare(findOldestSql);
      itemsToDelete = stmt.all({ count: itemsToDeleteCount }) as { id: number; image_path: string | null; content_type: string; file_paths: string | null }[];
    } catch (error) {
        console.error('StorageService: Error finding oldest non-favorite items to delete:', error);
        return;
    }

    if (itemsToDelete.length === 0) {
        console.log('StorageService: No non-favorite items found to delete, or all over-limit items are favorites.');
        return;
    }
    
    console.log(`StorageService: Found ${itemsToDelete.length} items to delete.`);

    const deleteSql = `DELETE FROM clipboard_history WHERE id = @id;`;
    const deleteStmt = this.db.prepare(deleteSql);

    // Use a transaction for batch deletion
    const deleteTransaction = this.db.transaction((itemsToClean: { id: number; image_path: string | null; content_type: string; file_paths: string | null }[]) => {
      for (const item of itemsToClean) {
        const result = deleteStmt.run({ id: item.id });
        if (result.changes > 0) {
          console.log(`StorageService: Deleted item ID ${item.id} (type: ${item.content_type}) as part of cleanup.`);
          // If it's an image and has a path, delete the associated file
          if (item.content_type === 'image' && item.image_path) {
            fs.unlink(item.image_path).then(() => {
              console.log(`StorageService: Associated image file ${item.image_path} deleted successfully during cleanup.`);
            }).catch(fileError => {
              console.error(`StorageService: Failed to delete associated image file ${item.image_path} during cleanup:`, fileError);
            });
          }
          // For 'file' type, we are storing original paths, so no file deletion from cache needed here.
        }
      }
    });

    try {
      deleteTransaction(itemsToDelete);
      console.log(`StorageService: History cleanup finished. Deleted ${itemsToDelete.length} items.`);
    } catch (error) {
      console.error('StorageService: Error during history cleanup transaction:', error);
    }
  }

  public async clearAllHistory(): Promise<{ success: boolean; message?: string; errors?: any[] }> {
    console.log('StorageService: Attempting to clear all history items.');
    const errors: any[] = [];

    // 1. Get all image paths before deleting records
    const getAllItemsSql = `SELECT id, image_path, content_type, file_paths FROM clipboard_history;`;
    let allItems: { id: number; image_path: string | null; content_type: string; file_paths: string | null }[] = [];
    try {
      const stmt = this.db.prepare(getAllItemsSql);
      allItems = stmt.all() as { id: number; image_path: string | null; content_type: string; file_paths: string | null }[];
      console.log(`StorageService: Found ${allItems.filter(item => item.content_type === 'image' && item.image_path).length} items with image paths to potentially delete.`);
      // console.log(`StorageService: Found ${itemsWithImages.length} items with image paths to potentially delete.`); // Already logged above after fetching allItems
    } catch (error) {
      console.error('StorageService: Error fetching items with image paths:', error);
      errors.push({ type: 'db_fetch_images', error });
      // Proceed to delete DB records even if fetching image paths fails, but log the error.
    }

    // 2. Delete all records from the database
    const deleteAllSql = `DELETE FROM clipboard_history;`;
    try {
      const stmt = this.db.prepare(deleteAllSql);
      const result = stmt.run();
      console.log(`StorageService: All history items deleted from database. Rows affected: ${result.changes}`);
    } catch (error) {
      console.error('StorageService: Error deleting all items from database:', error);
      errors.push({ type: 'db_delete_all', error });
      // If DB deletion fails, it's a significant issue.
      return { success: false, message: 'Failed to delete history from database.', errors };
    }

    // 3. Attempt to delete associated image files
    if (allItems.length > 0) {
      console.log(`StorageService: Attempting to delete ${allItems.filter(item => item.content_type === 'image' && item.image_path).length} associated image files.`);
      for (const item of allItems) {
        if (item.content_type === 'image' && item.image_path) {
          try {
            await fs.unlink(item.image_path);
            console.log(`StorageService: Associated image file ${item.image_path} deleted successfully.`);
          } catch (fileError: any) {
            console.error(`StorageService: Failed to delete associated image file ${item.image_path}:`, fileError);
            errors.push({ type: 'file_delete', path: item.image_path, error: fileError.message || fileError });
          }
        }
        // For 'file' type, we are storing original paths, so no file deletion from cache needed here.
      }
    }

    if (errors.length > 0) {
      return { success: true, message: 'History cleared, but some associated files might not have been deleted.', errors };
    }

    return { success: true, message: 'All history items and associated images cleared successfully.' };
  }

  public async toggleFavoriteStatus(id: number, isFavorite: boolean): Promise<{ success: boolean; newFavoriteStatus?: number; message?: string }> {
    const newFavoriteValue = isFavorite ? 1 : 0;
    const sql = `UPDATE clipboard_history SET is_favorite = @is_favorite WHERE id = @id;`;
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run({ id, is_favorite: newFavoriteValue });

      if (result.changes > 0) {
        console.log(`StorageService: Favorite status for item ID ${id} updated to ${newFavoriteValue}.`);
        return { success: true, newFavoriteStatus: newFavoriteValue };
      } else {
        console.warn(`StorageService: No item found with ID ${id} to update favorite status.`);
        return { success: false, message: `Item with ID ${id} not found.` };
      }
    } catch (error: any) {
      console.error(`StorageService: Error toggling favorite status for item ID ${id}:`, error);
      return { success: false, message: `Database error: ${error.message || String(error)}` };
    }
  }

  // --- Template CRUD Operations ---

  public async addTemplate(templateData: Omit<TemplateItem, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateItem> {
    const newId = crypto.randomUUID();
    const now = Date.now();
    const sql = `
      INSERT INTO templates
        (id, description, enabled, keywords, snippet_content, trigger_type, created_at, updated_at, shortcut)
      VALUES
        (@id, @description, @enabled, @keywords, @snippet_content, @trigger_type, @created_at, @updated_at, @shortcut)
    `;
    try {
      const stmt = this.db.prepare(sql);
      stmt.run({
        id: newId,
        description: templateData.description,
        enabled: templateData.enabled ? 1 : 0,
        keywords: JSON.stringify(templateData.keywords || []), // Ensure keywords is an array and stringify
        // snippet_type removed
        snippet_content: templateData.snippet_content,
        trigger_type: templateData.trigger_type,
        created_at: now,
        updated_at: now,
        shortcut: templateData.shortcut ?? null, // Handle optional shortcut
      });
      console.log(`StorageService: Template added with ID: ${newId}`);
      // Fetch the newly created item to return it
      const newItem = await this.getTemplateById(newId);
      if (!newItem) {
          throw new Error('Failed to retrieve newly added template');
      }
      return newItem;
    } catch (error: any) {
      console.error('StorageService: Error adding template:', error);
      throw error; // Re-throw the error for the caller to handle
    }
  }

  public async getTemplateById(id: string): Promise<TemplateItem | null> {
    const sql = `SELECT * FROM templates WHERE id = @id;`;
    try {
      const stmt = this.db.prepare(sql);
      const row = stmt.get({ id }) as any | undefined;
      if (row) {
        // Deserialize keywords
        try {
          row.keywords = JSON.parse(row.keywords || '[]');
        } catch (e) {
          console.error(`StorageService: Failed to parse keywords for template ID ${row.id}:`, e);
          row.keywords = []; // Default to empty array on parse error
        }
        // Convert enabled from integer to boolean
        row.enabled = Boolean(row.enabled);
        // Ensure shortcut is included (it should be selected by SELECT *)
        // No specific parsing needed for shortcut as it's TEXT NULL
        // Ensure a plain JavaScript object is returned for IPC compatibility
        return {
          id: row.id,
          description: row.description,
          enabled: row.enabled, // Already converted to boolean
          keywords: row.keywords, // Already parsed
          snippet_content: row.snippet_content,
          trigger_type: row.trigger_type,
          created_at: row.created_at,
          updated_at: row.updated_at,
          shortcut: row.shortcut,
        } as TemplateItem;
      }
      return null;
    } catch (error) {
      console.error(`StorageService: Error fetching template with ID ${id}:`, error);
      return null;
    }
  }

  public async getAllTemplates(): Promise<TemplateItem[]> {
    const sql = `SELECT * FROM templates ORDER BY created_at DESC;`;
    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all() as any[];
      return rows.map(row => {
        // Deserialize keywords
        try {
          row.keywords = JSON.parse(row.keywords || '[]');
        } catch (e) {
          console.error(`StorageService: Failed to parse keywords for template ID ${row.id}:`, e);
          row.keywords = [];
        }
        // Convert enabled from integer to boolean
        row.enabled = Boolean(row.enabled);
        // Ensure shortcut is included (it should be selected by SELECT *)
        // No specific parsing needed for shortcut as it's TEXT NULL
        return row as TemplateItem;
      });
    } catch (error) {
      console.error('StorageService: Error fetching all templates:', error);
      return [];
    }
  }

  public async updateTemplate(templateId: string, updates: Partial<Omit<TemplateItem, 'id' | 'created_at'>>): Promise<TemplateItem | null> {
    const now = Date.now();
    const fieldsToUpdate = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at');
    if (fieldsToUpdate.length === 0) {
      console.warn('StorageService: updateTemplate called with no fields to update.');
      return this.getTemplateById(templateId); // Return current item if no updates
    }

    const setClauses = fieldsToUpdate.map(key => `${key} = @${key}`).join(', ');
    const sql = `UPDATE templates SET ${setClauses}, updated_at = @updated_at WHERE id = @id;`;

    const params: any = { id: templateId, updated_at: now };
    for (const key of fieldsToUpdate) {
        const typedKey = key as keyof typeof updates;
        if (typedKey === 'keywords' && updates.keywords) {
            params[key] = JSON.stringify(updates.keywords);
        } else if (typedKey === 'enabled') {
            params[key] = updates.enabled ? 1 : 0;
        } else {
            // Handle other fields, including the new 'shortcut' field
            params[key] = updates[typedKey];
        }
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);

      if (result.changes > 0) {
        console.log(`StorageService: Template with ID ${templateId} updated successfully.`);
        return this.getTemplateById(templateId); // Fetch and return the updated item
      } else {
        console.warn(`StorageService: No template found with ID ${templateId} to update.`);
        return null;
      }
    } catch (error: any) {
      console.error(`StorageService: Error updating template with ID ${templateId}:`, error);
      throw error;
    }
  }

  public async deleteTemplate(templateId: string): Promise<boolean> {
    const sql = `DELETE FROM templates WHERE id = @id;`;
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run({ id: templateId });
      if (result.changes > 0) {
        console.log(`StorageService: Template with ID ${templateId} deleted successfully.`);
        return true;
      } else {
        console.warn(`StorageService: No template found with ID ${templateId} to delete.`);
        return false;
      }
    } catch (error) {
      console.error(`StorageService: Error deleting template with ID ${templateId}:`, error);
      return false;
    }
  }

  public async toggleTemplateStatus(templateId: string): Promise<boolean | null> {
      const currentTemplate = await this.getTemplateById(templateId);
      if (!currentTemplate) {
          console.warn(`StorageService: No template found with ID ${templateId} to toggle status.`);
          return null; // Indicate not found
      }

      const newStatus = !currentTemplate.enabled;
      const sql = `UPDATE templates SET enabled = @enabled, updated_at = @updated_at WHERE id = @id;`;
      const now = Date.now();

      try {
          const stmt = this.db.prepare(sql);
          const result = stmt.run({
              id: templateId,
              enabled: newStatus ? 1 : 0,
              updated_at: now
          });

          if (result.changes > 0) {
              console.log(`StorageService: Template status for ID ${templateId} toggled to ${newStatus}.`);
              return newStatus;
          } else {
              // This case should ideally not happen if getTemplateById succeeded, but handle defensively
              console.warn(`StorageService: Failed to toggle status for template ID ${templateId} (update affected 0 rows).`);
              return null;
          }
      } catch (error: any) {
          console.error(`StorageService: Error toggling template status for ID ${templateId}:`, error);
          throw error; // Re-throw
      }
  }

  // --- End Template CRUD Operations ---

  public close(): void {
    if (this.db) {
      this.db.close();
      console.log('StorageService: Database connection closed.');
    }
  }
}

// Example Usage (for testing)
/*
async function testStorageService() {
    // Ensure app is ready for app.getPath
    if (!app.isReady()) {
        await app.whenReady();
    }

    const storageService = new StorageService();

    const testTextItem: ClipboardItem = {
        content_type: 'text',
        text_content: 'Hello from StorageService test ' + Date.now(),
        image_path: null,
        source_app: 'test-app-storage',
        timestamp: Date.now(),
        hash: 'storagehash' + Date.now(), // Unique hash for testing
        preview_text: 'Hello preview',
        search_text: 'Hello search text',
        is_favorite: 0,
    };

    try {
        const id = await storageService.addClipboardItem(testTextItem);
        if (id) {
            console.log(`Test item added with id: ${id}`);
        } else {
            console.log('Test item was a duplicate or failed to insert.');
        }

        // Test duplicate insertion
        console.log("Attempting to add the same item (should be blocked by UNIQUE hash constraint or handled):");
        const duplicateItem = { ...testTextItem, timestamp: Date.now() + 1000 }; // Change timestamp but keep hash
        await storageService.addClipboardItem(duplicateItem);


        const items = await storageService.getClipboardItems(5);
        console.log('Fetched items:', items.map(i => ({id: i.id, preview: i.preview_text, hash: i.hash}) ));

    } catch (e) {
        console.error("Error during StorageService test:", e);
    } finally {
        storageService.close();
        // app.quit(); // Quit app if running for standalone test
    }
}

if (require.main === module) {
    // This check might not work as expected in Electron's main process context
    // without specific configuration.
    // For testing, you'd typically call this from your main Electron setup.
    // app.on('ready', testStorageService); 
    console.log("To test StorageService, call testStorageService() after app is ready.");
}
*/
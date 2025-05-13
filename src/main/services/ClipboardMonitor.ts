import { clipboard, app, NativeImage } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ClipboardItem, ClipboardItemType } from '../../shared/types/clipboard';

const DEFAULT_POLL_INTERVAL = 500; // ms
const IMAGE_CACHE_DIR = 'image_cache';

export class ClipboardMonitor extends EventEmitter {
  private pollInterval: number;
  private timerId: NodeJS.Timeout | null = null;
  private lastTextHash: string | null = null;
  private lastImageHash: string | null = null;
  private lastFilePathsHash: string | null = null;

  constructor(pollInterval: number = DEFAULT_POLL_INTERVAL) {
    super();
    this.pollInterval = pollInterval;
    this._ensureImageCacheDir();
  }

  private async _ensureImageCacheDir(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      const cachePath = path.join(userDataPath, IMAGE_CACHE_DIR);
      await fs.mkdir(cachePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create image cache directory:', error);
      // Potentially emit an error event or handle more gracefully
    }
  }

  private _calculateHash(data: string | Buffer): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  public startMonitoring(): void {
    if (this.timerId) {
      console.warn('Clipboard monitor is already running.');
      return;
    }
    console.log('Clipboard monitor started.');
    this.timerId = setInterval(() => this._checkClipboard(), this.pollInterval);
  }

  public stopMonitoring(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('Clipboard monitor stopped.');
    }
  }

  private async _checkClipboard(): Promise<void> {
    try {
      const availableFormats = clipboard.availableFormats();
      const timestamp = Date.now();
      const sourceApp = this._getSourceApplication();

      // console.log('ClipboardMonitor polling. Available formats:', JSON.stringify(availableFormats)); // Removed as per user request

      // 1. Check for files first
      //    Electron's `readFiles()` returns an array of file paths.
      //    It's available on macOS and Windows.
      //    `public.file-url` (macOS) or `CF_HDROP` (Windows) are older ways.
      //    `readFiles()` is the modern, cross-platform way.
      let filePaths: string[] = [];
      try {
        if (process.platform === 'darwin') {
          const fileUrlList = clipboard.read('public.file-url');
          if (fileUrlList) {
            // fileUrlList is a string with one or more file:// URLs, separated by newlines
            filePaths = fileUrlList.split(/\r?\n/).filter(url => url.startsWith('file://')).map(url => decodeURIComponent(new URL(url).pathname));
          }
        } else if (process.platform === 'win32') {
          // On Windows, clipboard.read('FileNameW') might give paths for CF_HDROP
          // However, the original code used `readFiles()`. Let's try to see if specific formats give us something.
          // For now, let's stick to a try-catch around the original problematic call for non-darwin,
          // or accept that it might not work without a proper implementation for CF_HDROP or text/uri-list.
          // The error indicates `readFiles` is not a function, so we should avoid calling it directly without checks.
          // A more robust solution would involve checking available formats for 'text/uri-list' or 'CF_HDROP' (via custom read)
          // For now, we'll make it safer to avoid crashing.
          const rawFilePaths = (clipboard as any).readFiles ? ((clipboard as any).readFiles() as string[]) : [];
          if (Array.isArray(rawFilePaths)) {
            filePaths = rawFilePaths;
          } else {
            console.warn('ClipboardMonitor: clipboard.readFiles() did not return an array or does not exist. File path detection might be limited on this platform.');
          }
        } else { // Linux and other platforms
           // Try 'text/uri-list' which is common on Linux for file drags/copies
          const uriList = clipboard.read('text/uri-list');
          if (uriList) {
            filePaths = uriList.split(/\r?\n/).filter(line => !line.startsWith('#') && line.trim() !== '').map(line => {
              try {
                return decodeURIComponent(new URL(line).pathname);
              } catch (e) {
                console.warn(`ClipboardMonitor: Could not parse URI: ${line}`, e);
                return ''; // Or handle error appropriately
              }
            }).filter(Boolean); // Remove empty strings from failed parsing
          } else {
            console.warn('ClipboardMonitor: No "public.file-url" (macOS) or "text/uri-list" (Linux) found. File path detection might be limited.');
          }
        }
      } catch (e) {
        console.error('ClipboardMonitor: Error reading file paths from clipboard:', e);
        // Ensure filePaths is an empty array on error to prevent further issues
        filePaths = [];
      }

      if (filePaths.length > 0) {
        console.log('ClipboardMonitor: Detected file paths.');
        const filePathsString = filePaths.join('|'); // Create a consistent string for hashing
        const currentFilePathsHash = this._calculateHash(filePathsString);

        if (currentFilePathsHash !== this.lastFilePathsHash) {
          this.lastFilePathsHash = currentFilePathsHash;
          this.lastTextHash = null;
          this.lastImageHash = null;

          const previewText = filePaths.length === 1
            ? path.basename(filePaths[0])
            : `${filePaths.length} files/folders`;
          
          const searchText = filePaths.map((p: string) => path.basename(p)).join(' ');

          const newItem: ClipboardItem = {
            content_type: 'file',
            text_content: null,
            image_path: null,
            file_paths: filePaths, // Store the array of paths
            source_app: sourceApp,
            timestamp,
            hash: currentFilePathsHash,
            preview_text: previewText,
            search_text: searchText,
          };
          this.emit('new-item', newItem);
          console.log('New file paths captured:', filePaths);
        }
      }
      // 2. Else, check for images
      else if (availableFormats.some(format => format.startsWith('image/'))) {
        // console.log('ClipboardMonitor: Detected image format (no files). Calling _handleImage.');
        // _handleImage will set lastImageHash and clear others if new image is found
        await this._handleImage(timestamp, sourceApp);
      }
      // 3. Else, check for text
      else if (availableFormats.includes('text/plain') || availableFormats.includes('text/html')) {
        // console.log('ClipboardMonitor: Detected text/plain or text/html (no files or image).');
        const currentText = clipboard.readText();
        if (currentText.trim() === '') {
          this.lastTextHash = null;
          // No need to clear other hashes here as they would have been nullified by prior checks if they were active
          return;
        }
        const currentTextHash = this._calculateHash(currentText);

        if (currentTextHash !== this.lastTextHash) {
          this.lastTextHash = currentTextHash;
          this.lastImageHash = null; // Text supersedes previous non-file/non-image content
          this.lastFilePathsHash = null; // Text supersedes previous non-file/non-image content

          const newItem: ClipboardItem = {
            content_type: 'text',
            text_content: currentText,
            image_path: null,
            file_paths: null,
            source_app: sourceApp,
            timestamp,
            hash: currentTextHash,
            preview_text: currentText.substring(0, 100),
            search_text: currentText,
          };
          this.emit('new-item', newItem);
          console.log('New text content captured:', newItem.preview_text);
        }
      } else {
        console.log('ClipboardMonitor: No recognized file, image, or text format detected.');
        // If clipboard is cleared or contains an unknown format, reset all known hashes
        // to allow re-capture if a known type reappears.
        this.lastTextHash = null;
        this.lastImageHash = null;
        this.lastFilePathsHash = null;
      }
    } catch (error) {
      console.error('Error checking clipboard:', error);
    }
  }

  private async _handleImage(timestamp: number, sourceApp: string | null): Promise<void> {
    const image: NativeImage = clipboard.readImage();
    if (image.isEmpty()) {
        this.lastImageHash = null; // Reset if clipboard becomes empty image
        return;
    }

    // It's important to use a consistent format for hashing and saving, e.g., PNG.
    // Using toBitmap() for hashing as it's generally faster if we don't need compression.
    // However, for consistency with saved file, toPNG() or toJPEG() might be better.
    // Let's use toPNG() for hashing to match potential save format.
    const imageBuffer = image.toPNG(); // Or toJPEG(), choose one for consistency
    if (imageBuffer.length === 0) return; // Should not happen if not empty, but good check

    const currentImageHash = this._calculateHash(imageBuffer);

    if (currentImageHash !== this.lastImageHash) {
        this.lastImageHash = currentImageHash;
        this.lastTextHash = null; // New image content overrides last text
        this.lastFilePathsHash = null; // New image content overrides last file paths

        const userDataPath = app.getPath('userData');
        const cachePath = path.join(userDataPath, IMAGE_CACHE_DIR);
        const imageName = `${uuidv4()}-${timestamp}.png`; // Assuming PNG
        const imagePath = path.join(cachePath, imageName);

        try {
            await fs.writeFile(imagePath, imageBuffer);
            console.log('Image saved to:', imagePath);

            const newItem: ClipboardItem = {
                content_type: 'image',
                text_content: null,
                image_path: imagePath,
                file_paths: null,
                source_app: sourceApp,
                timestamp,
                hash: currentImageHash,
                preview_text: imageName, // Basic preview (filename)
                search_text: imageName, // Search by filename
            };
            this.emit('new-item', newItem);
            console.log('New image content captured:', imageName);

        } catch (error) {
            console.error('Failed to save image:', error);
            // Potentially emit an error or revert lastImageHash if save fails
        }
    }
  }


  private _getSourceApplication(): string | null {
    // Attempt to get source application, highly platform-dependent
    // On macOS:
    if (process.platform === 'darwin') {
      try {
        // This specific key might not always be available or might be empty.
        // Electron's clipboard.read() for custom types is the way.
        // 'public.source.application' is a common one but not guaranteed.
        const appName = clipboard.read('public.source.application');
        if (appName) return appName;
      } catch (e) {
        // console.warn("Could not read 'public.source.application':", e);
      }
    }
    // On Windows, it's much harder. May require native modules or specific OS calls.
    // For P0, returning null if not easily found is acceptable.
    // console.warn('Source application detection is limited on this platform or not implemented yet.');
    return null;
  }
}

// Example Usage (for testing, to be removed or placed in main.ts)
/*
if (require.main === module) {
  // This code runs only if the file is executed directly
  // For testing purposes, ensure Electron app is ready
  app.on('ready', () => {
    const monitor = new ClipboardMonitor(1000);
    monitor.startMonitoring();
    monitor.on('new-item', (item: ClipboardItem) => {
      console.log('EVENT: New clipboard item:', item);
    });

    setTimeout(() => {
      monitor.stopMonitoring();
      console.log('Monitoring stopped after some time.');
      app.quit();
    }, 20000); // Stop after 20 seconds
  });
}
*/
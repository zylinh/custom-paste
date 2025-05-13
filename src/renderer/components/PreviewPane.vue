<template>
  <div class="preview-pane p-2.5 border-l border-border bg-background overflow-y-auto h-full flex flex-col justify-center items-center text-center">
    <div v-if="isLoading" class="loading-state text-muted-foreground">Loading image...</div>
    <div v-else-if="error" class="error-state text-destructive">
      <p>Error loading image:</p>
      <p>{{ error }}</p>
    </div>
    <!-- Image Preview -->
    <div v-else-if="selectedItem && selectedItem.content_type === 'image' && imageDataUrl" class="image-preview-container w-full h-full flex justify-center items-center">
      <img
        :src="imageDataUrl"
        alt="Image Preview"
        class="image-preview max-w-full max-h-full object-contain cursor-pointer border border-border shadow-sm"
        @click="handleImageClick"
        title="Click to open in default viewer"
      />
    </div>
    <!-- Text Preview -->
    <div v-else-if="selectedItem && selectedItem.content_type === 'text'" class="text-preview-container w-full h-full overflow-y-auto text-left p-1.5">
      <pre class="text-preview whitespace-pre-wrap break-words font-mono text-sm text-foreground">{{ selectedItem.text_content }}</pre>
    </div>
    <!-- File Paths Preview -->
    <div v-else-if="selectedItem && selectedItem.content_type === 'file' && filePaths.length" class="file-paths-preview-container w-full h-full overflow-y-auto text-left p-2.5 box-border">
      <ul class="file-path-list list-none p-0 m-0 space-y-1">
        <li v-for="(filePath, index) in filePaths" :key="index" class="file-path-item flex justify-between items-center px-1.25 py-2 border-b border-border last:border-b-0 text-sm transition-colors duration-200 ease-in-out hover:bg-secondary">
          <span class="path-text flex-grow mr-2.5 whitespace-nowrap overflow-hidden text-ellipsis" :title="filePath">{{ truncatePath(filePath) }}</span>
          <div class="path-actions flex gap-2">
             <Button variant="outline" size="icon" @click="handleOpenPath(filePath)" title="Open Path">
               <Folder class="h-4 w-4" />
             </Button>
             <Button variant="outline" size="icon" @click="handleCopyPath(filePath)" title="Copy Path">
               <Copy class="h-4 w-4" />
             </Button>
          </div>
        </li>
      </ul>
    </div>
    <!-- Fallback States -->
    <div v-else-if="selectedItem && selectedItem.content_type === 'file' && !filePaths.length" class="unsupported-state text-muted-foreground">
      <p>No file paths found in this item, or paths are invalid.</p>
    </div>
    <div v-else-if="selectedItem" class="unsupported-state text-muted-foreground">
      <p>Preview for "{{ selectedItem.content_type }}" is not yet supported.</p>
    </div>
    <div v-else class="no-selection-state text-muted-foreground">
      <p>Select an item to preview its content.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Folder, Copy } from 'lucide-vue-next'; // Import icons
import { Button } from '../../components/ui/button'; // Import Shadcn Button
import { useClipboardStore } from '../store/clipboardStore';
import ipcService from '../services/ipcService';
import type { ClipboardItem } from '../../shared/types/clipboard';

const clipboardStore = useClipboardStore();
const selectedItem = computed<ClipboardItem | null>(() => clipboardStore.selectedItem);

const imageDataUrl = ref<string | null>(null);
const isLoading = ref<boolean>(false);
const error = ref<string | null>(null);

watch(selectedItem, async (newItem) => {
  imageDataUrl.value = null;
  error.value = null;
  isLoading.value = false;

  if (newItem && newItem.content_type === 'image' && newItem.image_path) {
    isLoading.value = true;
    try {
      console.log(`PreviewPane: Requesting image data for ${newItem.image_path}`);
      const result = await ipcService.getImageDataUrl(newItem.image_path);
      if (result.success && result.dataUrl) {
        imageDataUrl.value = result.dataUrl;
        console.log(`PreviewPane: Image data URL received (length: ${result.dataUrl.length})`);
      } else {
        error.value = result.message || 'Failed to load image data.';
        console.error('PreviewPane: Failed to get image data URL:', result.message);
      }
    } catch (e: any) {
      error.value = e.message || 'An unexpected error occurred while fetching the image.';
      console.error('PreviewPane: Exception while fetching image data URL:', e);
    } finally {
      isLoading.value = false;
    }
  }
}, { immediate: true }); // immediate: true to run on component mount if an item is already selected

const filePaths = computed<string[]>(() => {
  if (selectedItem.value && selectedItem.value.content_type === 'file' && selectedItem.value.file_paths) {
    try {
      // Assuming selectedItem.value.file_paths is already string[] as per ClipboardItem type
      // If it's a JSON string from DB, parsing should happen before it reaches here or type should be string.
      // Given the TS error, it's likely already an array.
      const paths = selectedItem.value.file_paths;
      return Array.isArray(paths) ? paths.filter(p => typeof p === 'string') : [];
    } catch (e) {
      console.error('PreviewPane: Error parsing file_paths JSON:', e);
      return [];
    }
  }
  return [];
});

const handleImageClick = async () => {
  if (selectedItem.value && selectedItem.value.content_type === 'image' && selectedItem.value.image_path) {
    try {
      console.log(`PreviewPane: Requesting to open image externally: ${selectedItem.value.image_path}`);
      const result = await ipcService.openImageExternal(selectedItem.value.image_path);
      if (!result.success) {
        console.error('PreviewPane: Failed to open image externally:', result.message);
        // alert(`Could not open image: ${result.message}`);
      } else {
        console.log(`PreviewPane: Image open request successful for ${selectedItem.value.image_path}`);
      }
    } catch (e: any) {
      console.error('PreviewPane: Exception while opening image externally:', e);
      // alert(`Error opening image: ${e.message}`);
    }
  }
};

const handleOpenPath = async (path: string) => {
  console.log(`PreviewPane: Requesting to open path: ${path}`);
  try {
    const result = await ipcService.openPath(path);
    if (!result.success) {
      console.error('PreviewPane: Failed to open path:', result.message);
      // alert(`Could not open path: ${result.message}`);
    }
  } catch (e: any) {
    console.error('PreviewPane: Exception while opening path:', e);
    // alert(`Error opening path: ${e.message}`);
  }
};

const handleCopyPath = async (path: string) => {
  console.log(`PreviewPane: Requesting to copy path: ${path}`);
  try {
    const result = await ipcService.copyPathToClipboard(path);
    if (!result.success) {
      console.error('PreviewPane: Failed to copy path:', result.message);
      // alert(`Could not copy path: ${result.message}`);
    } else {
      // Optionally, show a success notification (e.g., "Path copied!")
      console.log('PreviewPane: Path copied successfully.');
    }
  } catch (e: any) {
    console.error('PreviewPane: Exception while copying path:', e);
    // alert(`Error copying path: ${e.message}`);
  }
};

const truncatePath = (path: string, maxLength = 60): string => {
  if (path.length <= maxLength) {
    return path;
  }
  const startLength = Math.floor((maxLength - 3) / 2);
  const endLength = Math.ceil((maxLength - 3) / 2);
  return `${path.substring(0, startLength)}...${path.substring(path.length - endLength)}`;
};

</script>

<!-- <style scoped> block removed -->
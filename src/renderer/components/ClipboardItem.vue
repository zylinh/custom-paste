<template>
  <div
    class="clipboard-item flex items-center px-3 py-2 border-b border-border cursor-pointer transition-colors duration-200 ease-in-out relative"
    :class="{ 'bg-muted font-semibold': isSelected, 'hover:bg-secondary': !isSelected }"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="showContextMenu"
  >
    <div class="item-icon mr-2.5 text-lg">
      <span v-if="item.content_type === 'text'">📝</span>
      <span v-else-if="item.content_type === 'image'">📷</span>
      <span v-else-if="item.content_type === 'file'">📁</span>
    </div>
    <div class="item-content flex flex-col overflow-hidden flex-grow min-w-0">
      <p class="preview-text m-0 mb-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]" :title="item.text_content || (item.content_type === 'image' ? item.image_path : item.preview_text) || ''">
        {{ item.preview_text || (item.content_type === 'image' ? (item.image_path ? getFileName(item.image_path) : '[Image]') : (item.content_type === 'file' ? item.preview_text : '[No Preview]')) }}
      </p>
      <small class="timestamp text-xs text-muted-foreground">{{ formattedTimestamp }}</small>
      <small v-if="item.source_app" class="source-app text-xs text-muted-foreground ml-1.25">from {{ item.source_app }}</small>
    </div>
    <div class="item-actions ml-2.5 flex items-center">
      <span class="favorite-icon text-lg text-yellow-500 cursor-pointer p-1 rounded hover:bg-muted" @click.stop="toggleFavorite" :title="isFavorite ? '取消收藏' : '收藏'">
        {{ isFavorite ? '★' : '☆' }}
      </span>
    </div>
    <!-- Removed delete button from here -->
    <!-- Custom Context Menu (Styled with Tailwind) -->
    <div
      v-if="isContextMenuVisible"
      class="context-menu fixed bg-popover border border-border rounded shadow-md z-50 min-w-[120px]"
      :style="{ top: contextMenuPosition.y + 'px', left: contextMenuPosition.x + 'px' }"
      @click.stop
    >
      <div class="context-menu-item px-3 py-2 cursor-pointer text-sm hover:bg-accent" @click="copyItemViaMenu">复制</div>
      <div class="context-menu-item px-3 py-2 cursor-pointer text-sm hover:bg-accent" @click="deleteItemViaMenu">删除</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { ClipboardItem } from '../../shared/types/clipboard';
import { useClipboardStore } from '../store/clipboardStore';
const props = defineProps<{
  item: ClipboardItem;
}>();

const clipboardStore = useClipboardStore();

const isSelected = computed(() => clipboardStore.selectedItem?.id === props.item.id);

const formattedTimestamp = computed(() => {
  if (!props.item.timestamp) return '';
  return new Date(props.item.timestamp).toLocaleString();
});

const isFavorite = computed(() => props.item.is_favorite === 1);

const isContextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });

function handleClick() {
  clipboardStore.selectItem(props.item);
  hideContextMenu(); // Hide context menu if it's open and user clicks normally
}

async function handleDoubleClick() {
  // Pass simulatePaste: true for double-click action
  await clipboardStore.pasteItem(props.item, { simulatePaste: true });
  hideContextMenu();
}

function showContextMenu(event: MouseEvent) {
  event.preventDefault();
  clipboardStore.selectItem(props.item); // Select the item on right click
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  isContextMenuVisible.value = true;
}

function hideContextMenu() {
  isContextMenuVisible.value = false;
}

async function copyItemViaMenu() {
  clipboardStore.selectItem(props.item); // Explicitly select item before pasting
  // Pass simulatePaste: false and hideWindowOverride: false for context menu copy
  await clipboardStore.pasteItem(props.item, { simulatePaste: false, hideWindowOverride: false });
  hideContextMenu();
}

async function deleteItemViaMenu() {
  await deleteItem(); // Reuse existing deleteItem logic
  hideContextMenu();
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function handleClickOutside(event: MouseEvent) {
  // Check if the click is outside the context menu
  // This requires the context menu to have a ref or a specific class
  // For simplicity, we'll assume any click outside the item itself (if menu is open) hides it.
  // A more robust solution would check if event.target is not part of the menu.
  if (isContextMenuVisible.value) {
    // A simple way: if the click is not on a context-menu-item, hide.
    // This might need refinement if menu items have complex children.
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu')) {
       hideContextMenu();
    }
  }
}

function getFileName(filePath: string): string {
  if (!filePath) return '';
  // Basic file name extraction
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || 'Image';
}

async function deleteItem() {
  if (props.item.id === undefined) {
    console.error('ClipboardItem: Item ID is undefined, cannot delete.');
    return;
  }
  try {
    // Optional: Add a confirmation dialog here in the future
    // const confirmed = window.confirm('Are you sure you want to delete this item?');
    // if (!confirmed) return;

    await clipboardStore.deleteHistoryItem(props.item.id);
    // The store will handle removing the item from the list,
    // and the UI will update reactively.
  } catch (error) {
    console.error('ClipboardItem: Error deleting item:', error);
    // Optionally, show an error message to the user
  }
}

async function toggleFavorite() {
  if (props.item.id === undefined) {
    console.error('ClipboardItem: Item ID is undefined, cannot toggle favorite.');
    return;
  }
  await clipboardStore.toggleFavoriteStatus(props.item.id);
  // The store action handles optimistic update and backend sync.
  // The UI will react to changes in `props.item.is_favorite` via the `isFavorite` computed prop.
}
</script>

<!-- <style scoped> block removed -->
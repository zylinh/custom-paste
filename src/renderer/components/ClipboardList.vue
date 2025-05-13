<template>
  <div
    class="clipboard-list-container flex-grow overflow-y-auto p-2.5 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    tabindex="0"
    @keydown="handleKeyDown"
    ref="listContainerRef"
  >
    <div v-if="isLoading" class="status-message text-center p-5 text-muted-foreground italic">Loading history...</div>
    <div v-else-if="error" class="status-message error-message text-center p-5 text-destructive font-semibold italic">
      Error loading history: {{ error }}
    </div>
    <div v-else-if="!hasAnyItemsInStore" class="status-message text-center p-5 text-muted-foreground italic">
      No clipboard history items found. Start copying!
    </div>
    <div v-else-if="!hasItems && (clipboardStore.searchTerm || props.activeFilterType !== 'all')" class="status-message text-center p-5 text-muted-foreground italic">
      No items match your search for "{{ clipboardStore.searchTerm }}" and filter "{{ props.activeFilterType }}".
    </div>
    <div v-else class="clipboard-list space-y-1" ref="listElementRef"> <!-- Added space-y-1 for item spacing -->
      <ClipboardItemComponent
        v-for="(item, index) in filteredHistoryItems"
        :key="item.id || item.hash"
        :item="item"
        :data-index="index"
        :ref="el => setItemRef(el, index)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick, defineProps } from 'vue'; // Added defineProps
import { useClipboardStore } from '../store/clipboardStore';
import ClipboardItemComponent from './ClipboardItem.vue'; // Renamed for clarity
import type { ClipboardItem, FilterType } from '../../shared/types/clipboard'; // Added FilterType

const clipboardStore = useClipboardStore();

// Props for UIX-013
const props = defineProps<{
  activeFilterType: FilterType;
}>();

const listContainerRef = ref<HTMLElement | null>(null);
const listElementRef = ref<HTMLElement | null>(null);
const itemRefs = ref<InstanceType<typeof ClipboardItemComponent>[]>([]);

// Modified for UIX-013 to include type filtering
const filteredHistoryItems = computed(() => {
  let items = clipboardStore.filteredHistoryItems; // Already filtered by search term

  if (props.activeFilterType === 'all') {
    return items;
  }
  return items.filter(item => item.content_type === props.activeFilterType);
});
const isLoading = computed(() => clipboardStore.isLoading);
const error = computed(() => clipboardStore.error);
const hasItems = computed(() => clipboardStore.hasItems && filteredHistoryItems.value.length > 0);
const hasAnyItemsInStore = computed(() => clipboardStore.historyItems.length > 0);

const selectedItemIndex = ref(-1);

const setItemRef = (el: any, index: number) => {
  // el can be the component instance or null if element is unmounted
  // We expect el to be InstanceType<typeof ClipboardItemComponent> when not null
  if (el) {
    itemRefs.value[index] = el as InstanceType<typeof ClipboardItemComponent>;
  }
};

watch(filteredHistoryItems, () => {
  // Reset selection or try to maintain it if possible when list changes
  selectedItemIndex.value = -1;
  if (clipboardStore.selectedItem) {
    const currentIndex = filteredHistoryItems.value.findIndex(item => item.id === clipboardStore.selectedItem?.id);
    if (currentIndex !== -1) {
      selectedItemIndex.value = currentIndex;
    } else {
      clipboardStore.selectItem(null); // Clear selection if item not in new list
    }
  }
  itemRefs.value = []; // Reset item refs when list changes
}, { deep: true });


watch(() => clipboardStore.selectedItem, (newItem) => {
  if (newItem) {
    const newIndex = filteredHistoryItems.value.findIndex(item => item.id === newItem.id);
    if (newIndex !== -1 && newIndex !== selectedItemIndex.value) {
      selectedItemIndex.value = newIndex;
    }
    // Scroll to selected item and ensure list container retains focus
    nextTick(() => {
      const itemElement = listElementRef.value?.querySelector(`.clipboard-item.selected`) as HTMLElement;
      if (itemElement) {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      // Ensure the list container gets focus after selection changes,
      // especially after a click selection, so Enter key works immediately.
      listContainerRef.value?.focus();
    });
  } else if (selectedItemIndex.value !== -1) {
    selectedItemIndex.value = -1;
  }
});

function handleKeyDown(event: KeyboardEvent) {
  if (!hasItems.value) return;

  const itemsCount = filteredHistoryItems.value.length;
  if (itemsCount === 0) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      if (selectedItemIndex.value < itemsCount - 1) {
        selectedItemIndex.value++;
      } else {
        // Stop at the last item as per decision
        selectedItemIndex.value = itemsCount - 1;
      }
      clipboardStore.selectItem(filteredHistoryItems.value[selectedItemIndex.value]);
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (selectedItemIndex.value > 0) {
        selectedItemIndex.value--;
      } else {
         // Stop at the first item as per decision
        selectedItemIndex.value = 0;
      }
      // Ensure an item is selected if list is not empty and index is 0
      if (itemsCount > 0 && selectedItemIndex.value === 0 && !clipboardStore.selectedItem) {
         clipboardStore.selectItem(filteredHistoryItems.value[0]);
      } else if (selectedItemIndex.value >= 0) {
        clipboardStore.selectItem(filteredHistoryItems.value[selectedItemIndex.value]);
      }
      break;
    case 'Enter':
      event.preventDefault();
      if (clipboardStore.selectedItem) {
        // Pass simulatePaste: true for Enter key action
        clipboardStore.pasteItem(clipboardStore.selectedItem, { simulatePaste: true });
      }
      break;
  }
}

// Focus the list container when component is mounted, if desired.
// For now, assuming focus can be managed by parent or Tab.
onMounted(() => {
  // listContainerRef.value?.focus(); // Example: to auto-focus
  // Ensure itemRefs are cleared initially
  itemRefs.value = [];
});

// Public method to allow parent to focus this component
defineExpose({
  focusList: () => {
    listContainerRef.value?.focus();
  }
});

</script>

<!-- <style scoped> block removed -->
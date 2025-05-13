<template>
  <div class="search-bar-container relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
    <Input
      type="text"
      :value="searchTerm"
      @input="updateSearchTerm(($event.target as HTMLInputElement).value)"
      placeholder="搜索历史记录..."
      class="w-full pl-10"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Search } from 'lucide-vue-next';
import { Input } from '../../components/ui/input'; // Relative path to Shadcn Input
import { useClipboardStore } from '../store/clipboardStore'; // Corrected relative path

const clipboardStore = useClipboardStore();
const searchTerm = computed(() => clipboardStore.searchTerm);

const updateSearchTerm = (term: string) => {
  clipboardStore.updateSearchTerm(term);
};
</script>

<!-- <style scoped> block removed -->
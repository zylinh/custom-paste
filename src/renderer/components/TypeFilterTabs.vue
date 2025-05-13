<template>
  <Tabs :defaultValue="activeTab" @update:modelValue="selectTab" class="w-full bg-secondary border-b border-border">
    <TabsList>
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.type"
        :value="tab.type"
      >
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    <!-- No TabsContent needed here as filtering happens in parent -->
  </Tabs>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'; // Relative path
type FilterType = 'all' | 'text' | 'image' | 'file';

interface Tab {
  label: string;
  type: FilterType;
}

const tabs: Tab[] = [
  { label: '全部', type: 'all' },
  { label: '文本', type: 'text' },
  { label: '图片', type: 'image' },
  { label: '文件', type: 'file' },
];

const activeTab = ref<FilterType>('all');
const emit = defineEmits<{
  (e: 'filter-changed', type: FilterType): void;
}>();

// The value parameter comes from the @update:modelValue event (string | number | undefined)
const selectTab = (value: string | number | undefined) => {
  // Validate that the received value is a string and one of our defined FilterTypes
  if (typeof value === 'string' && ['all', 'text', 'image', 'file'].includes(value)) {
    const type = value as FilterType; // Cast to FilterType after validation
    activeTab.value = type; // Keep internal state if needed, though Tabs handles visual
    emit('filter-changed', type);
  } else if (value !== undefined) { // Log warning only if value is defined but invalid
    console.warn(`Invalid or non-string tab value received: ${value}`);
  }
};
</script>

<!-- <style scoped> block removed -->
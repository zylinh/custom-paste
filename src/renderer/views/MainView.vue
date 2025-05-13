<template>
  <div class="main-view flex flex-col h-full overflow-hidden p-4">
    <SearchBarComponent />
    <TypeFilterTabsComponent @filter-changed="handleFilterChange" />
    <div class="content-area flex flex-row flex-grow overflow-hidden">
      <ClipboardListComponent :active-filter-type="activeFilterType" class="clipboard-list-panel flex-[3_1_0%] min-w-[300px] overflow-y-auto border-r border-border" />
      <PreviewPaneComponent class="preview-panel flex-[2_1_0%] min-w-[250px]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClipboardListComponent from '../components/ClipboardList.vue';
import SearchBarComponent from '../components/SearchBar.vue';
import PreviewPaneComponent from '../components/PreviewPane.vue'; // Added
import TypeFilterTabsComponent from '../components/TypeFilterTabs.vue'; // Added for UIX-013

type FilterType = 'all' | 'text' | 'image' | 'file'; // Added for UIX-013

const activeFilterType = ref<FilterType>('all'); // Added for UIX-013

const handleFilterChange = (type: FilterType) => { // Added for UIX-013
  activeFilterType.value = type;
};
</script>

<template>
  <header class="app-header h-[30px] flex justify-between items-center px-2.5 bg-secondary text-foreground border-b border-border box-border flex-shrink-0" style="-webkit-app-region: drag;">
    <div class="title text-sm font-bold ml-1.25">CustomPaste</div>
    <div class="window-controls flex" style="-webkit-app-region: no-drag;">
      <button class="control-button bg-transparent border-none text-foreground text-base px-2.5 cursor-pointer min-w-[30px] leading-5 hover:bg-border" @click="minimizeWindow" title="Minimize">-</button>
      <button class="control-button bg-transparent border-none text-foreground text-base px-2.5 cursor-pointer min-w-[30px] leading-5 hover:bg-border" @click="maximizeWindow" title="Maximize">◻</button>
      <button class="control-button close-button bg-transparent border-none text-foreground text-base px-2.5 cursor-pointer min-w-[30px] leading-5 hover:bg-destructive" @click="closeWindow" title="Close">✕</button>
    </div>
  </header>
</template>

<script setup lang="ts">
const minimizeWindow = () => {
  window.ipcRenderer?.windowMinimize();
};

const maximizeWindow = () => {
  window.ipcRenderer?.windowMaximize();
};

const closeWindow = () => {
  window.ipcRenderer?.windowClose();
};
</script>

<style scoped>
/* Add any component-specific styles here if needed, though Tailwind is preferred */
</style>
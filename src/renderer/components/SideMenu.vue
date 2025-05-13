<template>
  <nav class="side-menu w-[40px] h-full bg-secondary flex flex-col justify-between items-center py-2.5 box-border border-r border-border flex-shrink-0">
    <!-- Top Icons Group -->
    <div class="flex flex-col items-center w-full">
       <Button variant="ghost" size="icon" @click="navigateTo('/')" title="主视图" class="w-full rounded-none" :class="{ 'bg-accent text-accent-foreground': $route.path === '/' }">
         <Icon icon="typcn:clipboard" class="h-6 w-6" />
       </Button>
       <Button variant="ghost" size="icon" @click="navigateTo('/templates')"  title="模版/关键字" class="w-full rounded-none [&.router-link-exact-active]:bg-accent [&.router-link-exact-active]:text-accent-foreground">
         <Icon icon="mdi:file-document-edit-outline" class="h-6 w-6" />
       </Button>
    </div>
    <!-- Bottom Icons Group -->
    <div class="flex flex-col items-center w-full">
       <Button variant="ghost" size="icon"  @click="navigateTo('/settings')" title="设置" class="w-full rounded-none [&.router-link-exact-active]:bg-accent [&.router-link-exact-active]:text-accent-foreground">
         <Icon icon="line-md:cog" class="h-6 w-6" />
       </Button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { Button } from '../../components/ui/button'; // Use relative path
import { useRouter } from 'vue-router';

console.log('[SideMenu.vue] Script setup executing.');
const router = useRouter();
console.log('[SideMenu.vue] Router instance obtained:', router);

const navigateTo = (path: string) => {
  console.log(`[SideMenu.vue] navigateTo called with path: ${path}`);
  try {
    console.log('[SideMenu.vue] Attempting router.push...');
    router.push(path);
    console.log('[SideMenu.vue] router.push finished (does not guarantee success, check URL)');
  } catch (error) {
    console.error('[SideMenu.vue] Error during router.push:', error);
  }
};
</script>

<!-- <style scoped> block removed -->
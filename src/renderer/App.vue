<template>
  <div id="app-container" class="flex flex-col h-screen font-sans bg-background text-foreground box-border overflow-hidden">
    <AppHeader />
    <div class="content-body flex flex-grow overflow-hidden">
      <SideMenu />
      <div class="main-and-footer-wrapper flex flex-col flex-grow overflow-hidden">
        <main class="app-main flex-grow p-3.75 overflow-y-auto bg-background">
          <router-view />
        </main>
        <footer class="app-footer p-2 bg-secondary border-t border-border text-center text-sm flex-shrink-0">
          <p>Status: Ready</p>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import SideMenu from './components/SideMenu.vue';
import AppHeader from './components/AppHeader.vue';
import { useClipboardStore } from './store/clipboardStore';
import type { ThemeSetting } from '../shared/types/settings';

// --- Theme related state and functions ---
const ipcApi = (window as any).ipcRenderer;
const nativeThemeUtils = (window as any).nativeThemeUtils;
const currentThemeRef = ref<ThemeSetting>('system');
let unlistenNativeThemeUpdate: (() => void) | null = null;
let unlistenThemeChangedEvent: (() => void) | null = null; // For IPC theme-changed-event

const applyTheme = (themeToApply: ThemeSetting) => {
  console.log(`[App.vue] Applying theme setting: ${themeToApply}`);
  const htmlElement = document.documentElement;
  let effectiveTheme: 'light' | 'dark' = 'light';

  if (themeToApply === 'system') {
    if (nativeThemeUtils && typeof nativeThemeUtils.getShouldUseDarkColors === 'function') {
      effectiveTheme = nativeThemeUtils.getShouldUseDarkColors() ? 'dark' : 'light';
      console.log(`[App.vue] System theme resolved to: ${effectiveTheme}`);
    } else {
      console.warn('[App.vue] nativeThemeUtils.getShouldUseDarkColors not available. Defaulting to light for system theme.');
      // effectiveTheme remains 'light' as per initialization
    }
  } else {
    effectiveTheme = themeToApply;
  }

  htmlElement.classList.remove('light-theme', 'dark-theme'); // Clean up old classes if any

  if (effectiveTheme === 'dark') {
    htmlElement.classList.add('dark');
    console.log('[App.vue] Applied "dark" class to <html> element.');
  } else {
    htmlElement.classList.remove('dark');
    console.log('[App.vue] Ensured "dark" class is removed from <html> element (light theme).');
  }

  // Temporarily commenting out native theme listener logic for debugging navigation issue
  // console.log('[App.vue] Native theme listener logic temporarily disabled for debugging.');
  /*
  if (themeToApply === 'system') {
    if (nativeThemeUtils && typeof nativeThemeUtils.onNativeThemeUpdated === 'function' && !unlistenNativeThemeUpdate) {
      unlistenNativeThemeUpdate = nativeThemeUtils.onNativeThemeUpdated(() => {
        console.log('[App.vue] Native system theme updated by OS. Re-evaluating and applying theme.');
        if (currentThemeRef.value === 'system') {
          applyTheme('system');
        }
      });
      console.log('[App.vue] Subscribed to native theme updates for "system" theme.');
    }
  } else {
    if (unlistenNativeThemeUpdate) {
      unlistenNativeThemeUpdate();
      unlistenNativeThemeUpdate = null;
      console.log('[App.vue] Unsubscribed from native theme updates because theme is not "system".');
    }
  }
  */
};

const loadInitialTheme = async () => {
  if (!ipcApi || !ipcApi.getTheme) {
    console.error('[App.vue] ipcApi or getTheme is not available for loading initial theme.');
    applyTheme('light'); // Fallback to light theme if IPC is not available
    return;
  }
  try {
    console.log('[App.vue] Loading initial theme setting...');
    const themeSetting = await ipcApi.getTheme() as ThemeSetting;
    currentThemeRef.value = themeSetting || 'system'; // Default to system if undefined
    applyTheme(currentThemeRef.value);
    console.log(`[App.vue] Initial theme setting loaded and applied: ${currentThemeRef.value}`);
  } catch (error: any) {
    console.error('[App.vue] Loading initial theme setting failed:', error);
    currentThemeRef.value = 'system'; // Fallback
    applyTheme(currentThemeRef.value);
  }
};

// Original imports and setup continue below, ensure they are not duplicated by this diff

const clipboardStore = useClipboardStore();
const router = useRouter();

// navigateToSettings is removed as it's handled by SideMenu


const handleNavigateToSettings = () => { // This is for IPC from main, keep it
  console.log('Renderer: Received navigate-to-settings IPC message.');
  router.push('/settings');
};

onMounted(async () => {
  await loadInitialTheme(); // Load and apply initial theme

  console.log('App.vue - onMounted hook EXECUTED. Restoring full onMounted logic.');
  console.log('Current Router Instance in App.vue:', router);
  console.log('Current Routes in App.vue:', router.getRoutes());
  try {
    console.log('Attempting manual navigation to / in App.vue onMounted');
    await router.push('/'); // Attempt to navigate to ensure router is responsive
    console.log('Manual navigation to / in App.vue onMounted SUCCEEDED. Current path:', router.currentRoute.value.path);
  } catch (error) {
    console.error('Manual navigation to / in App.vue onMounted FAILED:', error);
  }

  console.log('App.vue: Fetching history items and initializing listener...');
  await clipboardStore.fetchHistoryItems();
  clipboardStore.initializeHistoryListener(); // Initialize the listener for real-time updates

  // Listen for navigation requests from the main process
  if (ipcApi) { // Use the already defined ipcApi const
    console.log('App.vue: Registering IPC listener for navigate-to-settings.');
    // Assuming onRendererEvent is a method on your ipcApi if you have a custom wrapper
    // If using raw ipcRenderer, it would be ipcApi.on('navigate-to-settings', handleNavigateToSettings)
    // For now, assuming a structure like the one in SettingsView for nativeThemeUtils
    // This might need adjustment based on actual preload.ts exposure
    if (typeof (ipcApi as any).onRendererEvent === 'function') {
       (ipcApi as any).onRendererEvent('navigate-to-settings', handleNavigateToSettings);
    } else if (typeof (ipcApi as any).on === 'function') { // Standard ipcRenderer.on
       (ipcApi as any).on('navigate-to-settings', handleNavigateToSettings);
    } else {
        console.warn('[App.vue] ipcApi does not have a recognized event listening method (onRendererEvent or on).');
    }
  } else {
    console.warn('App.vue: ipcApi not available on window object. Cannot listen for navigate-to-settings.');
  }

  // Watch for changes to currentThemeRef if its source is 'system' and OS theme changes
  // This is largely handled by the nativeTheme listener inside applyTheme,
  // but this watch ensures if currentThemeRef itself is programmatically changed to 'system',
  // the listener setup logic in applyTheme is re-evaluated.
  watch(currentThemeRef, (newThemeSetting) => {
    // If the setting itself changes (e.g., user changes it in SettingsView and it propagates here),
    // re-apply. This is more for reacting to the setting value changing.
    applyTheme(newThemeSetting); // This applies the theme when currentThemeRef changes
  });

  // Listen for theme changes pushed from the main process (e.g., after SettingsView saves a theme)
  if (ipcApi && typeof ipcApi.onThemeChanged === 'function') {
    unlistenThemeChangedEvent = ipcApi.onThemeChanged((newTheme: ThemeSetting) => {
      console.log(`[App.vue] Received 'theme-changed-event' via IPC with new theme: ${newTheme}`);
      if (currentThemeRef.value !== newTheme) {
        currentThemeRef.value = newTheme; // Update local ref, which will trigger the watch above to applyTheme
      }
    });
    console.log("[App.vue] Subscribed to 'theme-changed-event' via IPC.");
  } else {
    console.warn("[App.vue] ipcApi.onThemeChanged is not available. Cannot listen for IPC theme changes.");
  } // This closes the else block for 'if (ipcApi && typeof ipcApi.onThemeChanged === 'function')'

  console.log('App.vue: onMounted logic fully executed.');
});

onUnmounted(() => {
  // Clean up the IPC listener for navigation
  if (ipcApi) { // Use the already defined ipcApi const
    if (typeof (ipcApi as any).offRendererEvent === 'function') {
        (ipcApi as any).offRendererEvent('navigate-to-settings', handleNavigateToSettings);
    } else if (typeof (ipcApi as any).removeListener === 'function') { // Standard ipcRenderer.removeListener
        (ipcApi as any).removeListener('navigate-to-settings', handleNavigateToSettings);
    }
  }

  // Clean up the native theme update listener
  if (unlistenNativeThemeUpdate) {
    unlistenNativeThemeUpdate();
    unlistenNativeThemeUpdate = null;
    console.log('[App.vue] Unsubscribed from native theme updates on unmount.');
  }

  // Clean up the IPC theme changed event listener
  if (unlistenThemeChangedEvent) {
    unlistenThemeChangedEvent();
    unlistenThemeChangedEvent = null;
    console.log("[App.vue] Unsubscribed from 'theme-changed-event' via IPC on unmount.");
  }
});

// The global declaration for window.ipcRenderer is better placed in a dedicated .d.ts file
// (e.g., src/renderer/electron.d.ts) to avoid repetition and ensure TS picks it up globally.
// Removing it from here to rely on a central definition or the explicit casts in ipcService.ts.
// If type errors arise related to window.ipcRenderer elsewhere, creating/updating that .d.ts file
// with the correct signatures from preload.ts (IpcApi) would be the proper fix.
/*
declare global {
  interface Window {
    ipcRenderer?: { // This should match the IpcApi interface in preload.ts
      requestHistoryItems: () => Promise<import('../../shared/types/clipboard').ClipboardItem[]>;
      pasteItem: (item: import('../../shared/types/clipboard').ClipboardItem) => Promise<{ success: boolean; message: string; error?: string }>;
    }
  }
}
*/
</script>

<!-- <style scoped> block removed and replaced with Tailwind utility classes -->
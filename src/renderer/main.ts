console.log('[Main.ts] Script start');
import { createApp } from 'vue';
console.log('[Main.ts] createApp imported');
import App from './App.vue';
console.log('[Main.ts] App.vue imported');
// import './style.css'; // Optional: if you have a global stylesheet
import './styles/theme.css'; // Import theme and global styles
console.log('[Main.ts] theme.css imported');

console.log('[Main.ts] Before createApp(App)');
const app = createApp(App);
console.log('[Main.ts] After createApp(App), app instance:', app);

// If using Pinia for state management (as per docs/1 & docs/3), initialize it here:
import { createPinia } from 'pinia';
console.log('[Main.ts] Before createPinia()');
const pinia = createPinia();
console.log('[Main.ts] After createPinia(), pinia instance:', pinia);
console.log('[Main.ts] Before app.use(pinia)');
app.use(pinia);
console.log('[Main.ts] After app.use(pinia)');

// If using Vue Router (not explicitly P0, but good for structure):
console.log('[Main.ts] Before importing router');
import router from './router/index'; // Ensuring the path points to the router file
console.log('[Main.ts] After importing router, router instance:', router);
console.log('[Main.ts] Before app.use(router)');
app.use(router);
console.log('[Main.ts] After app.use(router)');

// Listen for navigation requests from the main process
if (window.ipcRenderer && typeof (window.ipcRenderer as any).onRendererEvent === 'function') {
  (window.ipcRenderer as any).onRendererEvent('navigate-to-settings', () => {
    console.log('[Renderer Main] Received navigate-to-settings IPC. Navigating to /settings.');
    router.push('/settings').catch((err: any) => {
      console.error('[Renderer Main] Error navigating to /settings:', err);
    });
  });
  console.log('[Renderer Main] IPC listener for "navigate-to-settings" registered.');
} else {
  console.warn('[Renderer Main] window.ipcRenderer.onRendererEvent is not available. Navigation from main process menu/tray might not work.');
}

console.log('[Main.ts] Before app.mount("#app")');
app.mount('#app');
console.log('[Main.ts] After app.mount("#app") - App should be mounted now.');
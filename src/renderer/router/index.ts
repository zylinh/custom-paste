import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import MainView from '../views/MainView.vue';
import SettingsView from '../views/SettingsView.vue';
import TemplateView from '../views/TemplateView.vue'; // Import the new view

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Main',
    component: MainView,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
  },
  {
    path: '/templates',
    name: 'Templates',
    component: TemplateView, // Add the new route
  },
  // Future routes can be added here
];

const router = createRouter({
  history: createWebHashHistory(), // Using hash history for Electron compatibility
  routes,
});

export default router;
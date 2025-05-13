import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: './postcss.config.js' // Explicitly point to your postcss config
  },
  root: path.join(__dirname, 'src/renderer'), // Set the root to the renderer source directory
  base: './', // Use relative paths for assets in build
  build: {
    outDir: path.join(__dirname, 'dist/renderer'), // Output directory for the build
    emptyOutDir: true, // Clean the output directory before building
    rollupOptions: {
      // Ensure that an index.html is generated in the outDir
      // Vite by default looks for index.html in the root directory.
      // If your src/renderer/index.html is the entry, this might not be needed
      // or might need adjustment based on your index.html location.
    }
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'), // Alias for @ pointing to src/
    },
  },
  server: {
    port: 5173, // Default Vite port, ensure it matches Electron's loadURL
  },
});





import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

/**
 * Vite configuration for pipeline-dashboard development.
 *
 * Key design decisions:
 * - viteSingleFile: inlines ALL CSS and JS into a single HTML file for file:// offline use.
 * - React plugin: enables JSX transform and Fast Refresh during development.
 * - Path alias "@": maps to src/ for clean imports.
 * - build.outDir: outputs to ../dashboard-dist/ (committed to repo as prebuilt shell).
 * - build.rollupOptions: ensures the single HTML file is self-contained.
 */
export default defineConfig({
  plugins: [
    react(),
    viteSingleFile({
      removeViteModuleLoader: true,
      inlinePattern: ['**/*'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, '..', 'dashboard-dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        'dashboard-shell': resolve(__dirname, 'dashboard-shell.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
});

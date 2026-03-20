import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    base44({
      pwa: {
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
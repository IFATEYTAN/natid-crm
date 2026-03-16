import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    base44({
      disablePWA: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
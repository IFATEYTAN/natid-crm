import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    base44({
      pwa: {
        workbox: {
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
          globPatterns: ['**/*.{js,html,css,ico,png,svg,woff,woff2,webp}'],
        },
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          maps: ['react-leaflet'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
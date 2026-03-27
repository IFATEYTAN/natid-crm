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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('leaflet')) return 'maps';
            if (id.includes('radix-ui')) return 'radix';
            if (id.includes('react-dom')) return 'react-dom';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('xlsx') || id.includes('jspdf')) return 'export-libs';
            if (id.includes('@tanstack')) return 'tanstack';
            return 'vendor';
          }
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
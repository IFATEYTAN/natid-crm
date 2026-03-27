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
            if (id.includes('react-dom')) return 'vendor-react-dom';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('leaflet')) return 'vendor-maps';
            if (id.includes('radix') || id.includes('shadcn')) return 'vendor-ui';
            if (id.includes('lucide')) return 'vendor-icons';
            if (id.includes('zod') || id.includes('react-hook-form') || id.includes('hookform')) return 'vendor-forms';
            if (id.includes('date-fns') || id.includes('moment')) return 'vendor-dates';
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('xlsx') || id.includes('jspdf')) return 'vendor-export';
            return 'vendor-misc';
          }
          // Split app code by directory
          if (id.includes('/src/pages/')) return 'app-pages';
          if (id.includes('/src/components/')) return 'app-components';
          if (id.includes('/src/features/')) return 'app-features';
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
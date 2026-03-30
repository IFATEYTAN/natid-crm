import { defineConfig } from 'vite';
import base44 from '@base44/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    base44({
      pwa: {
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,html,css,ico,png,svg,woff,woff2,webp}'],
        },
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 3000,
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
            if (id.includes('tanstack')) return 'vendor-tanstack';
            if (id.includes('sonner') || id.includes('toast')) return 'vendor-toast';
            return 'vendor-misc';
          }
          // Split pages individually
          if (id.includes('/src/pages/')) {
            const match = id.match(/\/src\/pages\/([^/.]+)/);
            if (match) return 'page-' + match[1].toLowerCase();
          }
          // Split components by subdirectory
          if (id.includes('/src/components/')) {
            if (id.includes('/components/ui/')) return 'comp-ui';
            if (id.includes('/components/vendor/')) return 'comp-vendor';
            if (id.includes('/components/dashboard/')) return 'comp-dashboard';
            if (id.includes('/components/reports/')) return 'comp-reports';
            if (id.includes('/components/call-details/')) return 'comp-calldetails';
            if (id.includes('/components/maps/')) return 'comp-maps';
            if (id.includes('/components/ai/')) return 'comp-ai';
            if (id.includes('/components/layout/')) return 'comp-layout';
            if (id.includes('/components/auth/')) return 'comp-auth';
            if (id.includes('/components/permissions/')) return 'comp-permissions';
            return 'comp-misc';
          }
          // Split features by subdirectory
          if (id.includes('/src/features/')) {
            const match = id.match(/\/src\/features\/([^/.]+)/);
            if (match) return 'feat-' + match[1].toLowerCase();
          }
          // Split other app directories
          if (id.includes('/src/lib/')) return 'app-lib';
          if (id.includes('/src/hooks/')) return 'app-hooks';
          if (id.includes('/src/config/')) return 'app-config';
          if (id.includes('/src/demo/')) return 'app-demo';
          if (id.includes('/src/utils/')) return 'app-utils';
          if (id.includes('/src/providers/')) return 'app-providers';
          if (id.includes('/src/api/')) return 'app-api';
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
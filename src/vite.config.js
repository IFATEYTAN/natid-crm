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
            if (id.includes('react/')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('leaflet')) return 'vendor-maps';
            if (id.includes('radix-ui/react-dialog') || id.includes('radix-ui/react-popover') || id.includes('radix-ui/react-dropdown') || id.includes('radix-ui/react-select') || id.includes('radix-ui/react-menu')) return 'vendor-ui-overlay';
            if (id.includes('radix')) return 'vendor-ui';
            if (id.includes('lucide')) return 'vendor-icons';
            if (id.includes('zod') || id.includes('react-hook-form') || id.includes('hookform')) return 'vendor-forms';
            if (id.includes('date-fns') || id.includes('moment')) return 'vendor-dates';
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-export';
            if (id.includes('tanstack')) return 'vendor-tanstack';
            if (id.includes('sonner') || id.includes('toast')) return 'vendor-toast';
            if (id.includes('class-variance') || id.includes('clsx') || id.includes('tailwind-merge')) return 'vendor-styling';
            if (id.includes('cmdk') || id.includes('embla')) return 'vendor-widgets';
            if (id.includes('animejs') || id.includes('lottie') || id.includes('canvas-confetti')) return 'vendor-anim';
            return 'vendor-misc';
          }
          // Split pages individually
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/([^/.]+)/);
            if (match) return 'page-' + match[1].toLowerCase();
          }
          // Split components by subdirectory
          if (id.includes('/components/')) {
            if (id.includes('/components/ui/dialog') || id.includes('/components/ui/sheet') || id.includes('/components/ui/drawer') || id.includes('/components/ui/alert-dialog')) return 'comp-ui-overlay';
            if (id.includes('/components/ui/table') || id.includes('/components/ui/DataTable') || id.includes('/components/ui/command') || id.includes('/components/ui/form')) return 'comp-ui-data';
            if (id.includes('/components/ui/chart') || id.includes('/components/ui/calendar') || id.includes('/components/ui/carousel')) return 'comp-ui-complex';
            if (id.includes('/components/ui/')) return 'comp-ui';
            if (id.includes('/components/vendor/')) return 'comp-vendor';
            if (id.includes('/components/dashboard/')) return 'comp-dashboard';
            if (id.includes('/components/reports/Annual') || id.includes('/components/reports/Company') || id.includes('/components/reports/Financial') || id.includes('/components/reports/Fleet')) return 'comp-reports-main';
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
          if (id.includes('/features/')) {
            const match = id.match(/\/features\/([^/.]+)/);
            if (match) return 'feat-' + match[1].toLowerCase();
          }
          // Split other app directories
          if (id.includes('/lib/')) return 'app-lib';
          if (id.includes('/hooks/')) return 'app-hooks';
          if (id.includes('/config/')) return 'app-config';
          if (id.includes('/demo/')) return 'app-demo';
          if (id.includes('/utils/')) return 'app-utils';
          if (id.includes('/providers/')) return 'app-providers';
          if (id.includes('/api/')) return 'app-api';
          // Catch ALL remaining source files so nothing lands in the default index chunk
          if (id.includes('/src/')) return 'app-core';
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
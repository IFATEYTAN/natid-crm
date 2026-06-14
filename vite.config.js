import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI primitives (Radix)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-accordion',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-progress',
            '@radix-ui/react-slider',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
          ],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
          // Maps
          'vendor-maps': ['leaflet', 'react-leaflet'],
          // Animation
          'vendor-motion': ['framer-motion'],
          // Charts (recharts)
          'vendor-charts': ['recharts'],
          // PDF export (used only in export flows)
          'vendor-pdf': ['jspdf', 'html2canvas'],
          // Icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: false,
      navigationNotifier: false,
      visualEditAgent: false
    }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/*.png'],
      manifest: false, // Using external manifest.json
      workbox: {
        // Activate a new service worker immediately and take control of open
        // tabs, then drop the old precache. Without these, a freshly deployed
        // SW stays "waiting" while the old one keeps serving stale chunks,
        // causing "Failed to fetch dynamically imported module" / white screen.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Don't intercept navigation to /login - let it reach the platform server
        navigateFallbackDenylist: [/^\/login/, /^\/api\//],
        // Files to cache
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Runtime caching for API calls
        runtimeCaching: [
          {
            // Cache API responses (Base44 API)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes for fresh data
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Cache map tiles (OpenStreetMap)
            urlPattern: /^https:\/\/.*tile.*\.openstreetmap\.org/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable SW in development to avoid caching issues
      }
    })
  ]
});
import type { CapacitorConfig } from '@capacitor/cli';

// Wraps the existing Vite web build (dist/) as native iOS/Android apps so the
// vendor portal can use OS background location. Generate the native projects
// locally with `npx cap add ios` / `npx cap add android` — see
// docs/LIVE_TRACKING_CAPACITOR_PLAN.md.
const config: CapacitorConfig = {
  appId: 'co.natid.crm',
  appName: 'NatID CRM',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Required by @capacitor-community/background-geolocation: without the
    // legacy bridge, Android halts background location updates after ~5 minutes.
    // See docs/LIVE_TRACKING_CAPACITOR_PLAN.md.
    useLegacyBridge: true,
  },
  plugins: {
    // Route WebView fetch/XHR through the native HTTP stack. After ~5 minutes in
    // the background Android throttles HTTP requests initiated from the WebView,
    // which would stall the updateVendorLocation posts that carry the tracked
    // location. CapacitorHttp keeps those requests flowing natively. Native-only;
    // no effect on the web build.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

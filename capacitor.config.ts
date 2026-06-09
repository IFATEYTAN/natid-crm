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
};

export default config;

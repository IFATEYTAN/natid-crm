#!/usr/bin/env node
/**
 * capture-screenshots.mjs — Capture a screenshot of every screen in the system.
 *
 * Used to populate docs/screenshots/ referenced by SYSTEM_SPECIFICATION_v4.md.
 *
 * How it works:
 *   - Runs in DEMO MODE (?demo=true) — the Base44 SDK is mocked with demo data,
 *     so no backend/credentials are required. The demo user is an admin, and
 *     admin bypasses RoleGuard, so ALL screens (including vendor/agent) render.
 *   - Iterates every page key from src/pages.config.js and saves
 *     docs/screenshots/<PageKey>.png (desktop) and mobile shots for the
 *     vendor/agent screens.
 *
 * Usage:
 *   1. npm install  (once)
 *   2. npm run dev  (in another terminal)  — or pass a deployed URL
 *   3. node scripts/qa/capture-screenshots.mjs [baseUrl]
 *      e.g. node scripts/qa/capture-screenshots.mjs http://localhost:5173
 *
 * To capture against production with REAL data instead of demo data, pass the
 * production URL and set CAPTURE_DEMO=false, then log in manually in the
 * browser window that opens (run with HEADED=1).
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUT_DIR = join(ROOT, 'docs', 'screenshots');
const BASE_URL = (process.argv[2] || process.env.E2E_BASE_URL || 'http://localhost:5173').replace(
  /\/$/,
  ''
);
const USE_DEMO = process.env.CAPTURE_DEMO !== 'false';
const HEADED = process.env.HEADED === '1';

// Screens best captured at mobile viewport (vendor/agent field usage)
const MOBILE_PAGES = new Set([
  'VendorPortal',
  'VendorCallManagement',
  'MyVendorProfile',
  'VendorGuide',
  'AgentDashboard',
  'AgentCallManagement',
]);

// Pages that need an entity id to show content. In demo mode we pass a demo
// entity id so the screenshot shows real content instead of an empty state.
const DETAIL_PAGE_IDS = {
  CallDetails: 'demo_call_20',
  CustomerDetails: 'demo_customer_1',
  EditCustomer: 'demo_customer_1',
  VendorDetails: 'demo_vendor_1',
  EditVendor: 'demo_vendor_1',
};
// Pages that need a token/form id we can't provide — captured as empty state.
const DETAIL_PAGES = new Set([...Object.keys(DETAIL_PAGE_IDS), 'CustomerFeedback', 'FormView']);

function getPageKeys() {
  const src = readFileSync(join(ROOT, 'src', 'pages.config.js'), 'utf8');
  const keys = [...src.matchAll(/^\s*([A-Za-z0-9_]+):\s*lazy\(/gm)].map((m) => m[1]);
  if (!keys.length) throw new Error('No page keys parsed from src/pages.config.js');
  return keys;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const pages = getPageKeys();
  console.log(`Capturing ${pages.length} screens from ${BASE_URL} (demo=${USE_DEMO})`);

  const browser = await chromium.launch({ headless: !HEADED });
  const failures = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'he-IL',
      timezoneId: 'Asia/Jerusalem',
    });
    const page = await context.newPage();

    // Activate demo mode once — persists via localStorage.
    if (USE_DEMO) {
      await page.goto(`${BASE_URL}/?demo=true`, { waitUntil: 'networkidle' });
    } else {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      if (HEADED) {
        console.log('Log in manually in the browser window, then press Enter here...');
        await new Promise((resolve) => process.stdin.once('data', resolve));
      }
    }

    for (const key of pages) {
      const isMobile = MOBILE_PAGES.has(key);
      try {
        await page.setViewportSize(
          isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
        );
        const idParam = USE_DEMO && DETAIL_PAGE_IDS[key] ? `?id=${DETAIL_PAGE_IDS[key]}` : '';
        await page.goto(`${BASE_URL}/${key}${idParam}`, { waitUntil: 'networkidle', timeout: 30_000 });
        // Let lazy chunks, charts and maps settle.
        await page.waitForTimeout(2500);
        await page.screenshot({ path: join(OUT_DIR, `${key}.png`), fullPage: false });
        const note = DETAIL_PAGES.has(key)
          ? ' (detail page — may show empty state without an id)'
          : '';
        console.log(`  ok  ${key}${isMobile ? ' [mobile]' : ''}${note}`);
      } catch (err) {
        failures.push(key);
        console.warn(`  FAIL ${key}: ${err.message.split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`\nDone. ${pages.length - failures.length}/${pages.length} captured → docs/screenshots/`);
  if (failures.length) {
    console.warn(`Failed: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

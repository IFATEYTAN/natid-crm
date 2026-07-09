#!/usr/bin/env node
/**
 * E2E deployment smoke check — is the backend role fix live for invited users?
 *
 * Logs in as the invited operator, loads the dashboard, and reports the HTTP
 * status of key backend functions. 200 = deployed & working; 403/404 = the fix
 * is NOT live in production (ask the owner to Publish in the Base44 editor).
 *
 * Usage:
 *   BASE_URL=https://<app>.base44.app OP_EMAIL=... OP_PW=... \
 *   PROXY=$HTTPS_PROXY TLS_MAX=tls1.2 CHROMIUM_PATH=/opt/pw-browsers/chromium \
 *   node scripts/qa/e2e-smoke.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL;
const OP = { email: process.env.OP_EMAIL, pw: process.env.OP_PW };
if (!BASE || !OP.email || !OP.pw) {
  console.error('Missing env: BASE_URL, OP_EMAIL, OP_PW');
  process.exit(2);
}
const args = [];
if (process.env.PROXY) args.push(`--proxy-server=${process.env.PROXY}`);
if (process.env.TLS_MAX) args.push(`--ssl-version-max=${process.env.TLS_MAX}`);

const FNS = ['detectSmartAlerts', 'getUsageReport', 'processStaleAssignments', 'getVendorScopedData'];
const status = {};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
page.on('response', (r) => { for (const f of FNS) if (r.url().includes(f)) status[f] = r.status(); });

try {
  await page.goto(`${BASE}/login?from_url=${encodeURIComponent(BASE + '/Dashboard')}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#email', { timeout: 30000 });
  await page.fill('#email', OP.email);
  await page.fill('#password', OP.pw);
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(16000);
} catch (e) {
  console.error('NAV ERROR (network/proxy blocked?):', String(e).slice(0, 120));
  await browser.close();
  process.exit(3);
}

console.log('Backend function statuses (invited operator):');
for (const f of FNS) console.log(`  ${f.padEnd(24)} ${status[f] ?? 'not called'}`);
const bad = FNS.filter((f) => status[f] && status[f] >= 400);
if (bad.length) {
  console.log(`\n❌ NOT DEPLOYED — ${bad.join(', ')} return >=400. Ask owner to Publish in Base44 editor.`);
  process.exit(1);
}
console.log('\n✅ Deployment looks live for invited users.');
await browser.close();

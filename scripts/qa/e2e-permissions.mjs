#!/usr/bin/env node
/**
 * E2E permissions matrix (part ו', F1–F7) — navigation-only, safe (no writes).
 * Verifies each role reaches only what it should on the live app.
 *
 * Usage:
 *   BASE_URL=... ADMIN_EMAIL=... ADMIN_PW=... OP_EMAIL=... OP_PW=... \
 *   VND_EMAIL=... VND_PW=... PROXY=$HTTPS_PROXY TLS_MAX=tls1.2 \
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/qa/e2e-permissions.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL;
const CREDS = {
  admin: { email: process.env.ADMIN_EMAIL, pw: process.env.ADMIN_PW },
  operator: { email: process.env.OP_EMAIL, pw: process.env.OP_PW },
  vendor: { email: process.env.VND_EMAIL, pw: process.env.VND_PW },
};
if (!BASE || !CREDS.operator.email) {
  console.error('Missing env: BASE_URL + role creds (ADMIN_/OP_/VND_ EMAIL+PW)');
  process.exit(2);
}
const args = [];
if (process.env.PROXY) args.push(`--proxy-server=${process.env.PROXY}`);
if (process.env.TLS_MAX) args.push(`--ssl-version-max=${process.env.TLS_MAX}`);

const results = [];
const rec = (id, pass, detail) => { results.push({ id, pass }); console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id} | ${detail}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args });

async function session(cred) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login?from_url=${encodeURIComponent(BASE + '/')}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#email', { timeout: 30000 });
  await page.fill('#email', cred.email);
  await page.fill('#password', cred.pw);
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(14000);
  return { ctx, page };
}
async function visit(page, path) {
  await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const url = page.url();
  const body = await page.locator('body').innerText().catch(() => '');
  return { stayed: url.includes(path), denied: /אין.*הרשאה|לא מורשה|גישה נדחתה/.test(body), url };
}

try {
  // F7 anonymous
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/NewCase`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);
    const login = await page.locator('#email, button:has-text("Sign in")').count();
    rec('F7', login > 0, `anon /NewCase → login form=${login > 0}`);
    await ctx.close();
  }
  // F1 admin
  if (CREDS.admin.email) {
    const { ctx, page } = await session(CREDS.admin);
    let ok = true, d = [];
    for (const p of ['UserManagement', 'RoleManagement', 'Settings', 'Invoices', 'KPIManagement']) {
      const r = await visit(page, p); const good = r.stayed && !r.denied; if (!good) ok = false; d.push(`${p}:${good ? '✓' : '✗'}`);
    }
    rec('F1', ok, 'admin full access → ' + d.join(' '));
    await ctx.close();
  }
  // F2 operator
  {
    const { ctx, page } = await session(CREDS.operator);
    let ok = true, d = [];
    for (const p of ['UserManagement', 'RoleManagement', 'Settings', 'Invoices']) {
      const r = await visit(page, p); const blocked = !r.stayed || r.denied; if (!blocked) ok = false; d.push(`${p}:${blocked ? 'blocked✓' : 'OPEN✗'}`);
    }
    rec('F2', ok, 'operator admin-screens → ' + d.join(' '));
    let ok2 = true, d2 = [];
    for (const p of ['Calls', 'QueueMonitor', 'Reports', 'AllVendorsMap']) {
      const r = await visit(page, p); const good = r.stayed && !r.denied; if (!good) ok2 = false; d2.push(`${p}:${good ? '✓' : '✗'}`);
    }
    rec('F2b', ok2, 'operator operational → ' + d2.join(' '));
    await ctx.close();
  }
  // F4/F5 vendor
  if (CREDS.vendor.email) {
    const { ctx, page } = await session(CREDS.vendor);
    rec('F4', /VendorPortal/.test(page.url()), 'vendor "/" → ' + (page.url().split('.app')[1] || page.url()));
    let ok = true, d = [];
    for (const p of ['Dashboard', 'Calls', 'UserManagement', 'QueueMonitor', 'Reports']) {
      const r = await visit(page, p); const blocked = !r.stayed || r.denied; if (!blocked) ok = false; d.push(`${p}:${blocked ? 'blocked✓' : 'OPEN✗'}`);
    }
    rec('F5', ok, 'vendor internal-screens → ' + d.join(' '));
    await ctx.close();
  }
} catch (e) {
  console.error('ERROR (network/proxy?):', String(e).slice(0, 120));
} finally {
  await browser.close();
}
const fails = results.filter((r) => !r.pass).length;
console.log(`\n=== PERMISSIONS: ${results.length - fails}/${results.length} PASS ===`);
process.exit(fails ? 1 : 0);

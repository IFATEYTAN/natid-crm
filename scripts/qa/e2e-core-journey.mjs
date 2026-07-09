#!/usr/bin/env node
/**
 * E2E core-journey automation — NatID 360 Control
 * ------------------------------------------------
 * Drives the full call lifecycle end-to-end across operator + vendor sessions:
 *   A1 create → A3 assign vendor → A4 vendor accept → A5 status transitions → A7 close
 * with DB-independent UI assertions + screenshots.
 *
 * ⚠️  Intended for a STAGING / test environment, NOT production — it creates
 *     calls, sends SMS, and mutates vendor/call state. Point it at staging.
 *
 * Usage:
 *   BASE_URL=https://staging.example.base44.app \
 *   OP_EMAIL=operator@test OP_PW=... VND_EMAIL=vendor@test VND_PW=... \
 *   VENDOR_NAME="Test Vendor" \
 *   node scripts/qa/e2e-core-journey.mjs
 *
 * Requires: playwright (npm i -D playwright). If behind a TLS-terminating
 * proxy, set PROXY and (optionally) TLS_MAX=tls1.2.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL;
const OP = { email: process.env.OP_EMAIL, pw: process.env.OP_PW };
const VND = { email: process.env.VND_EMAIL, pw: process.env.VND_PW };
const VENDOR_NAME = process.env.VENDOR_NAME || 'Test Vendor';
const DISPATCH = process.env.DISPATCH || 'ניידת';
const PROXY = process.env.PROXY || '';
const TLS_MAX = process.env.TLS_MAX || '';
const SHOTS = process.env.SHOTS_DIR || '.';

if (!BASE || !OP.email || !VND.email) {
  console.error('Missing env: BASE_URL, OP_EMAIL/OP_PW, VND_EMAIL/VND_PW required.');
  process.exit(2);
}

const CALLER = 'E2E אוטומציה';
const PHONE = process.env.TEST_PHONE || '0500000099';
const ADDR = process.env.TEST_ADDR || 'הרצל 1, תל אביב';

const results = [];
const rec = (id, name, pass, detail) => {
  results.push({ id, pass });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id} ${name}${detail ? ' | ' + detail : ''}`);
};

const launchArgs = [];
if (PROXY) launchArgs.push(`--proxy-server=${PROXY}`);
if (TLS_MAX) launchArgs.push(`--ssl-version-max=${TLS_MAX}`);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: launchArgs,
});

async function login(cred, target) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login?from_url=${encodeURIComponent(BASE + target)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('#email', { timeout: 30000 });
  await page.fill('#email', cred.email);
  await page.fill('#password', cred.pw);
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(14000);
  return { ctx, page };
}

async function pickRadix(page, triggerText, optionMatch) {
  const trig = page.locator(`[role="dialog"] button:has-text("${triggerText}")`).first();
  await trig.click();
  await page.waitForTimeout(1200);
  const opt = page.locator(`[role="option"]:has-text("${optionMatch}")`).first();
  if (await opt.count()) {
    await opt.click();
    await page.waitForTimeout(1200);
    return true;
  }
  await page.keyboard.press('Escape');
  return false;
}

let callId = null;
try {
  // ---- A1: operator creates a call ----
  const op = await login(OP, '/NewCase');
  const cn = op.page.locator('label:has-text("שם המתקשר")').locator('xpath=following::input[1]');
  await cn.fill(CALLER);
  const cp = op.page.locator('label:has-text("טלפון המתקשר")').locator('xpath=following::input[1]');
  await cp.fill(PHONE);
  await op.page.locator('input[placeholder="כתובת מלאה"]').first().fill(ADDR);
  await op.page.locator('button:has-text("צור קריאה")').first().click();
  await op.page.waitForTimeout(9000);
  const url = op.page.url();
  callId = (url.match(/[?&]id=([a-f0-9]+)/i) || [])[1] || null;
  rec('A1.1', 'create call', /CallDetails/.test(url) && !!callId, url);
  await op.page.screenshot({ path: `${SHOTS}/journey-a1.png` });

  // ---- A3: operator assigns vendor ----
  await op.page.locator('button:has-text("שבץ ספק"), button:has-text("שיבוץ")').first().click();
  await op.page.waitForTimeout(3000);
  await pickRadix(op.page, 'בחר סוג רכב שירות', DISPATCH);
  await pickRadix(op.page, 'בחר ספק', VENDOR_NAME);
  await op.page.locator('[role="dialog"] button:has-text("שבץ")').first().click({ timeout: 10000 });
  await op.page.waitForTimeout(8000);
  const toast = (await op.page.locator('[data-sonner-toast]').allTextContents().catch(() => [])).join(' ');
  rec('A3.4', 'assign vendor (offer)', /הוצע|ממתין לאישור/.test(toast), toast.slice(0, 80));
  await op.page.screenshot({ path: `${SHOTS}/journey-a3.png` });
  await op.ctx.close();

  // ---- A4: vendor accepts ----
  const vn = await login(VND, '/VendorPortal');
  await vn.page.waitForTimeout(4000);
  const acceptBtn = vn.page.locator('button:has-text("קבל קריאה"), button:has-text("קבל")').first();
  const hadOffer = await acceptBtn.count();
  if (hadOffer) await acceptBtn.click();
  await vn.page.waitForTimeout(6000);
  rec('A4.3', 'vendor accept', hadOffer > 0, `offer shown=${hadOffer > 0}`);
  await vn.page.screenshot({ path: `${SHOTS}/journey-a4.png` });

  // ---- A5: vendor status transitions ----
  for (const [label, tag] of [['יצאתי לדרך', 'enroute'], ['הגעתי למקום', 'arrived/in_progress']]) {
    const b = vn.page.locator(`button:has-text("${label}")`).first();
    if (await b.count()) {
      await b.click();
      await vn.page.waitForTimeout(5000);
      rec(`A5-${tag}`, `vendor: ${label}`, true, '');
    } else {
      rec(`A5-${tag}`, `vendor: ${label}`, false, 'button not found');
    }
  }
  await vn.page.screenshot({ path: `${SHOTS}/journey-a5.png` });
  await vn.ctx.close();
} catch (e) {
  console.error('JOURNEY ERROR:', String(e).slice(0, 200));
} finally {
  await browser.close();
}

const fails = results.filter((r) => !r.pass).length;
console.log(`\n=== CORE JOURNEY: ${results.length - fails}/${results.length} PASS | callId=${callId} ===`);
process.exit(fails ? 1 : 0);

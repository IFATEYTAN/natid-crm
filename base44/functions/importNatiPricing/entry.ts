/**
 * importNatiPricing — Mirror vendor towing pricing from the Nati MySQL DB into
 * our VendorPricing entity (read-only mirror; Nati stays the source of truth).
 *
 * Source: supplier_distance_price_list (per supplier_id) JOIN suppliers (name/type).
 * Target: VendorPricing — one record per supplier, typed/computable fields, shown
 *         in "ניהול חוזים והסכמי תמחור" → tab "תעריפי ספקים (נתי)".
 *
 * Architecture: Nati = source of truth, so this is a periodic READ-ONLY mirror.
 * Records carry source='nati' + is_managed_externally=true so the UI shows them
 * read-only and manual edits are never expected (they'd be overwritten here).
 * To later flip ownership to our CRM: stop calling this and drop the flag.
 *
 * Connection goes through the shared _shared/natiDb circuit breaker (NOT a raw
 * inline connection) — Nati blocks IPs after too many failed connects, so every
 * connection must be guarded and backed off. ONE connection per run.
 *
 * dry_run defaults to TRUE — first run is always a safe preview.
 * Auth: admin user OR scheduled automation (SYNC_AUTOMATION_KEY).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate
import mysql from 'npm:mysql2@3.9.7/promise';
import net from 'node:net';

// ===== Inline Nati DB layer (kept per-file: an earlier shared _shared/natiDb
// import failed to deploy. Circuit state below lives in Deno KV, so it is
// shared + persistent across all Nati functions and warm/cold starts — unlike
// a plain in-memory variable, which let each function keep hammering Nati
// independently even while a sibling function was already cooling down) =====
const NATI_CONNECT_TIMEOUT_MS = 20_000;
const NATI_FAIL_THRESHOLD = 3;
const NATI_GENERIC_COOLDOWN_MS = 2 * 60_000;
const NATI_BLOCKED_COOLDOWN_MS = 10 * 60_000;
const NATI_CIRCUIT_KV_KEY = ['nati_circuit'];

// TLS: we dial the DigitalOcean relay (static IP whitelisted at Nati), but the
// certificate presented is the RDS server's — so validation must run against
// the real RDS hostname, pinned to the official Amazon RDS il-central-1 CAs.
const NATI_TLS_SERVERNAME = Deno.env.get('NATID_DB_TLS_SERVERNAME') ||
  'natid-staging.crmlhqnchhgn.il-central-1.rds.amazonaws.com';
const NATI_RDS_CA_PEM = `-----BEGIN CERTIFICATE-----
MIIGBTCCA+2gAwIBAgIRAO9dVdiLTEGO8kjUFExJmgowDQYJKoZIhvcNAQEMBQAw
gZoxCzAJBgNVBAYTAlVTMSIwIAYDVQQKDBlBbWF6b24gV2ViIFNlcnZpY2VzLCBJ
bmMuMRMwEQYDVQQLDApBbWF6b24gUkRTMQswCQYDVQQIDAJXQTEzMDEGA1UEAwwq
QW1hem9uIFJEUyBpbC1jZW50cmFsLTEgUm9vdCBDQSBSU0E0MDk2IEcxMRAwDgYD
VQQHDAdTZWF0dGxlMCAXDTIyMTIwMjIwMjYwOFoYDzIxMjIxMjAyMjEyNjA4WjCB
mjELMAkGA1UEBhMCVVMxIjAgBgNVBAoMGUFtYXpvbiBXZWIgU2VydmljZXMsIElu
Yy4xEzARBgNVBAsMCkFtYXpvbiBSRFMxCzAJBgNVBAgMAldBMTMwMQYDVQQDDCpB
bWF6b24gUkRTIGlsLWNlbnRyYWwtMSBSb290IENBIFJTQTQwOTYgRzExEDAOBgNV
BAcMB1NlYXR0bGUwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDkVHmJ
bUc8CNDGBcgPmXHSHj5dS1PDnnpk3doCu6pahyYXW8tqAOmOqsDuNz48exY7YVy4
u9I9OPBeTYB9ZUKwxq+1ZNLsr1cwVz5DdOyDREVFOjlU4rvw0eTgzhP5yw/d+Ai/
+WmPebZG0irwPKN2f60W/KJ45UNtR+30MT8ugfnPuSHWjjV+dqCOCp/mj8nOCckn
k8GoREwjuTFJMKInpQUC0BaVVX6LiIdgtoLY4wdx00EqNBuROoRTAvrked0jvm7J
UI39CSYxhNZJ9F6LdESZXjI4u2apfNQeSoy6WptxFHr+kh2yss1B2KT6lbwGjwWm
l9HODk9kbBNSy2NeewAms36q+p8wSLPavL28IRfK0UaBAiN1hr2a/2RDGCwOJmw6
5erRC5IIX5kCStyXPEGhVPp18EvMuBd37eLIxjZBBO8AIDf4Ue8QmxSeZH0cT204
3/Bd6XR6+Up9iMTxkHr1URcL1AR8Zd62lg/lbEfxePNMK9mQGxKP8eTMG5AjtW9G
TatEoRclgE0wZQalXHmKpBNshyYdGqQZhzL1MxCxWzfHNgZkTKIsdzxrjnP7RiBR
jdRH0YhXn6Y906QfLwMCaufwfQ5J8+nj/tu7nG138kSxsu6VUkhnQJhUcUsxuHD/
NnBx0KGVEldtZiZf7ccgtRVp1lA0OrVtq3ZLMQIDAQABo0IwQDAPBgNVHRMBAf8E
BTADAQH/MB0GA1UdDgQWBBQ2WC3p8rWeE2N0S4Om01KsNLpk/jAOBgNVHQ8BAf8E
BAMCAYYwDQYJKoZIhvcNAQEMBQADggIBAFFEVDt45Obr6Ax9E4RMgsKjj4QjMFB9
wHev1jL7hezl/ULrHuWxjIusaIZEIcKfn+v2aWtqOq13P3ht7jV5KsV29CmFuCdQ
q3PWiAXVs+hnMskTOmGMDnptqd6/UuSIha8mlOKKAvnmRQJvfX9hIfb/b/mVyKWD
uvTTmcy3cOTJY5ZIWGyzuvmcqA0YNcb7rkJt/iaLq4RX3/ofq4y4w36hefbcvj++
pXHOmXk3dAej3y6SMBOUcGMyCJcCluRPNYKDTLn+fitcPxPC3JG7fI5bxQ0D6Hpa
qbyGBQu96sfahQyMc+//H8EYlo4b0vPeS5RFFXJS/VBf0AyNT4vVc7H17Q6KjeNp
wEARqsIa7UalHx9MnxrQ/LSTTxiC8qmDkIFuQtw8iQMN0SoL5S0eCZNRD31awgaY
y1PvY8JMN549ugIUjOXnown/OxharLW1evWUraU5rArq3JfeFpPXl4K/u10T5SCL
iJRoxFilGPMFE3hvnmbi5rEy8wRUn7TpLb4I4s/CB/lT2qZTPqvQHwxKCnMm9BKF
NHb4rLL5dCvUi5NJ6fQ/exOoGdOVSfT7jqFeq2TtNunERSz9vpriweliB6iIe1Al
Thj8aEs1GqA764rLVGA+vUe18NhjJm9EemrdIzjSQFy/NdbN/DMaHqEzJogWloAI
izQWYnCS19TJ
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIEBDCCAuygAwIBAgIQFn6AJ+uxaPDpNVx7174CpjANBgkqhkiG9w0BAQsFADCB
mjELMAkGA1UEBhMCVVMxIjAgBgNVBAoMGUFtYXpvbiBXZWIgU2VydmljZXMsIElu
Yy4xEzARBgNVBAsMCkFtYXpvbiBSRFMxCzAJBgNVBAgMAldBMTMwMQYDVQQDDCpB
bWF6b24gUkRTIGlsLWNlbnRyYWwtMSBSb290IENBIFJTQTIwNDggRzExEDAOBgNV
BAcMB1NlYXR0bGUwIBcNMjIxMjAyMjAxNDA4WhgPMjA2MjEyMDIyMTE0MDhaMIGa
MQswCQYDVQQGEwJVUzEiMCAGA1UECgwZQW1hem9uIFdlYiBTZXJ2aWNlcywgSW5j
LjETMBEGA1UECwwKQW1hem9uIFJEUzELMAkGA1UECAwCV0ExMzAxBgNVBAMMKkFt
YXpvbiBSRFMgaWwtY2VudHJhbC0xIFJvb3QgQ0EgUlNBMjA0OCBHMTEQMA4GA1UE
BwwHU2VhdHRsZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAL2xGTSJ
fXorki/dkkTqdLyv4U1neeFYEyUCPN/HJ7ZloNwhj8RBrHYhZ4qtvUAvN+rs8fUm
L0wmaL69ye61S+CSfDzNwBDGwOzUm/cc1NEJOHCm8XA0unBNBvpJTjsFk2LQ+rz8
oU0lVV4mjnfGektrTDeADonO1adJvUTYmF6v1wMnykSkp8AnW9EG/6nwcAJuAJ7d
BfaLThm6lfxPdsBNG81DLKi2me2TLQ4yl+vgRKJi2fJWwA77NaDqQuD5upRIcQwt
5noJt2kFFmeiro98ZMMRaDTHAHhJfWkwkw5f2QNIww7T4r85IwbQCgJVRo4m4ZTC
W/1eiEccU2407mECAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQU
DNhVvGHzKXv0Yh6asK0apP9jJlUwDgYDVR0PAQH/BAQDAgGGMA0GCSqGSIb3DQEB
CwUAA4IBAQCoEVTUY/rF9Zrlpb1Y1hptEguw0i2pCLakcmv3YNj6thsubbGeGx8Z
RjUA/gPKirpoae2HU1y64WEu7akwr6pdTRtXXjbe9NReT6OW/0xAwceSXCOiStqS
cMsWWTGg6BA3uHqad5clqITjDZr1baQ8X8en4SXRBxXyhJXbOkB60HOQeFR9CNeh
pJdrWLeNYXwU0Z59juqdVMGwvDAYdugWUhW2rhafVUXszfRA5c8Izc+E31kq90aY
LmxFXUHUfG0eQOmxmg+Z/nG7yLUdHIFA3id8MRh22hye3KvRdQ7ZVGFni0hG2vQQ
Q01AvD/rhzyjg0czzJKLK9U/RttwdMaV
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIICtDCCAjmgAwIBAgIQKKqVZvk6NsLET+uYv5myCzAKBggqhkjOPQQDAzCBmTEL
MAkGA1UEBhMCVVMxIjAgBgNVBAoMGUFtYXpvbiBXZWIgU2VydmljZXMsIEluYy4x
EzARBgNVBAsMCkFtYXpvbiBSRFMxCzAJBgNVBAgMAldBMTIwMAYDVQQDDClBbWF6
b24gUkRTIGlsLWNlbnRyYWwtMSBSb290IENBIEVDQzM4NCBHMTEQMA4GA1UEBwwH
U2VhdHRsZTAgFw0yMjEyMDIyMDMyMjBaGA8yMTIyMTIwMjIxMzIyMFowgZkxCzAJ
BgNVBAYTAlVTMSIwIAYDVQQKDBlBbWF6b24gV2ViIFNlcnZpY2VzLCBJbmMuMRMw
EQYDVQQLDApBbWF6b24gUkRTMQswCQYDVQQIDAJXQTEyMDAGA1UEAwwpQW1hem9u
IFJEUyBpbC1jZW50cmFsLTEgUm9vdCBDQSBFQ0MzODQgRzExEDAOBgNVBAcMB1Nl
YXR0bGUwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAASYwfvj8BmvLAP6UkNQ4X4dXBB/
webBO7swW+8HnFN2DAu+Cn/lpcDpu+dys1JmkVX435lrCH3oZjol0kCDIM1lF4Cv
+78yoY1Jr/YMat22E4iz4AZd9q0NToS7+ZA0r2yjQjBAMA8GA1UdEwEB/wQFMAMB
Af8wHQYDVR0OBBYEFO/8Py16qPr7J2GWpvxlTMB+op7XMA4GA1UdDwEB/wQEAwIB
hjAKBggqhkjOPQQDAwNpADBmAjEAwk+rg788+u8JL6sdix7l57WTo8E/M+o3TO5x
uRuPdShrBFm4ArGR2PPs4zCQuKgqAjEAi0TA3PVqAxKpoz+Ps8/054p9WTgDfBFZ
i/lm2yTaPs0xjY6FNWoy7fsVw5oEKxOn
-----END CERTIFICATE-----`;

// Deno KV can be unavailable on some runtimes ("Default database is not
// available" comes from Deno.openKv — NOT from Nati's MySQL). Never let the
// circuit-breaker bookkeeping kill an otherwise healthy DB connection: fall
// back to in-memory state.
let memCircuit = { blockedUntil: 0, failures: 0, reason: '' };

async function getNatiCircuit() {
  try {
    const kv = await Deno.openKv();
    const entry = await kv.get(NATI_CIRCUIT_KV_KEY);
    return entry.value || { blockedUntil: 0, failures: 0, reason: '' };
  } catch (_) {
    return memCircuit;
  }
}

async function setNatiCircuit(circuit) {
  memCircuit = circuit;
  try {
    const kv = await Deno.openKv();
    await kv.set(NATI_CIRCUIT_KV_KEY, circuit);
  } catch (_) { /* Deno KV unavailable — in-memory fallback only */ }
}

class NatiBlockedError extends Error {
  retryAfterSec: number;
  reason: string;
  constructor(message: string, retryAfterSec: number, reason: string) {
    super(message);
    this.name = 'NatiBlockedError';
    this.retryAfterSec = retryAfterSec;
    this.reason = reason;
  }
}

function isHostBlockedError(err) {
  const e = err || {};
  return e.code === 'ER_HOST_IS_BLOCKED' || e.errno === 1129 ||
    /blocked because of many connection errors/i.test(String(e.message || ''));
}

async function withNatiConnection(fn, opts = {}) {
  const config = {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: NATI_CONNECT_TIMEOUT_MS,
  };
  // TLS: mysql2 hardcodes the TLS validation name to config.host and Deno's
  // TLS layer always verifies the peer cert. config.host therefore carries the
  // real RDS hostname (validated against the pinned Amazon RDS CA bundle)
  // while a custom stream dials the relay's static IP from NATID_DB_HOST.
  {
    const dialHost = config.host;
    const dialPort = config.port;
    config.host = NATI_TLS_SERVERNAME;
    config.stream = () => net.connect(dialPort, dialHost);
    config.ssl = { ca: NATI_RDS_CA_PEM };
  }
  if (!config.host || !config.user || !config.password) throw new Error('Missing NATID_DB_* secrets');

  const now = Date.now();
  const natiCircuit = await getNatiCircuit();
  if (!opts.force && natiCircuit.blockedUntil > now) {
    const retryAfterSec = Math.ceil((natiCircuit.blockedUntil - now) / 1000);
    const base = natiCircuit.reason === 'host_blocked'
      ? 'נתי חסמו זמנית את הכתובת שלנו (Host is blocked) — צריך שמנהל ה-DB בצד של נתי יריץ FLUSH HOSTS.'
      : 'החיבור לנתי מושהה זמנית בגלל כשלי חיבור חוזרים.';
    throw new NatiBlockedError(`${base} כדי לא להחמיר את החסימה, ננסה שוב בעוד ${retryAfterSec} שניות.`, retryAfterSec, natiCircuit.reason || 'cooldown');
  }

  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    if (isHostBlockedError(err)) {
      await setNatiCircuit({ blockedUntil: now + NATI_BLOCKED_COOLDOWN_MS, failures: natiCircuit.failures + 1, reason: 'host_blocked' });
      throw new NatiBlockedError(
        'נתי חסמו זמנית את הכתובת שלנו (Host is blocked). צריך שמנהל ה-DB בצד של נתי יריץ FLUSH HOSTS. עד אז עוצרים את הניסיונות ל-10 דקות כדי לא להחמיר.',
        Math.ceil(NATI_BLOCKED_COOLDOWN_MS / 1000),
        'host_blocked'
      );
    }
    const failures = natiCircuit.failures + 1;
    await setNatiCircuit({
      blockedUntil: failures >= NATI_FAIL_THRESHOLD ? now + NATI_GENERIC_COOLDOWN_MS : 0,
      failures,
      reason: failures >= NATI_FAIL_THRESHOLD ? 'connect_failures' : '',
    });
    throw err;
  }

  try {
    await setNatiCircuit({ blockedUntil: 0, failures: 0, reason: '' });
    return await fn(connection);
  } finally {
    await connection.end().catch(() => {});
  }
}

function natiErrorResponse(err) {
  if (err instanceof NatiBlockedError) {
    return Response.json(
      { error: err.message, reason: err.reason, retry_after_seconds: err.retryAfterSec },
      { status: 503, headers: { 'Retry-After': String(err.retryAfterSec) } }
    );
  }
  if (isHostBlockedError(err)) {
    return Response.json(
      { error: 'נתי חסמו זמנית את הכתובת שלנו (Host is blocked). צריך FLUSH HOSTS בצד של נתי.', reason: 'host_blocked' },
      { status: 503 }
    );
  }
  const message = (err && err.message) || 'שגיאה לא ידועה';
  return Response.json({ error: message }, { status: 500 });
}
// ===== End inline Nati DB layer =====

const BATCH_SIZE = 20;
const ITEM_DELAY_MS = 150;
const BATCH_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retryOp<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [500, 1500, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = (e as { message?: string })?.message || '';
      const isRateLimit = msg.includes('Rate limit') || msg.includes('429') || (e as { status?: number })?.status === 429;
      if (isRateLimit && attempt < delays.length) {
        await sleep(delays[attempt]);
      } else {
        throw e;
      }
    }
  }
  throw new Error(`unreachable: ${label}`);
}

function clean(obj: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function dateStr(v: unknown): string | undefined {
  if (!v) return undefined;
  // mysql2 returns DATE columns as JS Date objects → convert to YYYY-MM-DD.
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return undefined;
  // Nati uses 1899-11-30 (or year < 1970) as an "empty" date — treat as missing.
  if (d.getUTCFullYear() < 1970) return undefined;
  return d.toISOString().slice(0, 10);
}

const SOURCE_SELECT = `
  SELECT
    p.supplier_id,
    s.fullname              AS supplier_name,
    s.type                  AS supplier_type,
    p.default_distance_km,
    p.default_distance_price,
    p.double_distance_price,
    p.extra_km_price,
    p.double_extra_km_price,
    p.futile_km_price,
    p.double_futile_km_price,
    p.regular_extra,
    p.commercial_extra,
    p.evening_extra,
    p.commercial_evening_extra,
    p.night_extra,
    p.commercial_night_extra,
    p.holiday_extra,
    p.commercial_holiday_extra,
    p.truck_extra,
    p.palestina_extra,
    p.commercial_palestina_extra,
    p.road6,
    p.from_d,
    p.to_d
  FROM supplier_distance_price_list p
  LEFT JOIN suppliers s ON s.id = p.supplier_id
`;

// One Nati row → VendorPricing (typed, computable). Required: vendor_id.
function mapToVendorPricing(row: Record<string, unknown>, syncedAt: string) {
  return clean({
    vendor_id: row.supplier_id != null ? String(row.supplier_id) : '',
    vendor_name: (row.supplier_name as string) || `ספק ${row.supplier_id}`,
    supplier_type: row.supplier_type != null ? String(row.supplier_type) : '',
    // supplier_distance_price_list is the towing distance rate card.
    service_category: 'towing',
    base_distance_km: num(row.default_distance_km),
    base_price: num(row.default_distance_price),
    double_base_price: num(row.double_distance_price),
    extra_km_price: num(row.extra_km_price),
    double_extra_km_price: num(row.double_extra_km_price),
    futile_km_price: num(row.futile_km_price),
    double_futile_km_price: num(row.double_futile_km_price),
    regular_extra_pct: num(row.regular_extra),
    commercial_extra_pct: num(row.commercial_extra),
    evening_extra_pct: num(row.evening_extra),
    commercial_evening_extra_pct: num(row.commercial_evening_extra),
    night_extra_pct: num(row.night_extra),
    commercial_night_extra_pct: num(row.commercial_night_extra),
    holiday_extra_pct: num(row.holiday_extra),
    commercial_holiday_extra_pct: num(row.commercial_holiday_extra),
    truck_extra_pct: num(row.truck_extra),
    territories_extra_pct: num(row.palestina_extra),
    commercial_territories_extra_pct: num(row.commercial_palestina_extra),
    road6_price: num(row.road6),
    valid_from: dateStr(row.from_d),
    valid_to: dateStr(row.to_d),
    source: 'nati',
    is_managed_externally: true,
    last_synced_at: syncedAt,
  });
}

async function upsertAll(
  sdk: { entities: Record<string, { create: (d: unknown) => Promise<{ id: string }>; update: (id: string, d: unknown) => Promise<unknown> }> },
  entityName: string,
  items: Record<string, unknown>[],
  keyField: string,
  existingLookup: Record<string, string>
) {
  let created = 0, updated = 0, skipped = 0, errors = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      try {
        const key = item[keyField] != null ? String(item[keyField]) : '';
        if (!key) { skipped++; continue; }
        const existingId = existingLookup[key];
        if (existingId) {
          await retryOp(() => sdk.entities[entityName].update(existingId, item), `${entityName}.update(${key})`);
          updated++;
        } else {
          const res = await retryOp(() => sdk.entities[entityName].create(item), `${entityName}.create(${key})`);
          existingLookup[key] = res.id;
          created++;
        }
      } catch (e) {
        console.error(`[IMPORT] ${entityName} error:`, (e as { message?: string })?.message);
        errors++;
      }
      await sleep(ITEM_DELAY_MS);
    }
    if (i + BATCH_SIZE < items.length) await sleep(BATCH_DELAY_MS);
  }
  return { created, updated, skipped, errors };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const automationKey = Deno.env.get('SYNC_AUTOMATION_KEY');
    const isAutomation = (!!automationKey && body.automation_key === automationKey) || !!body.automation;
    if (!isAutomation) {
      let user = null;
      try { user = await base44.auth.me(); } catch (_) { /* no user */ }
      const appRole = await resolveAppRole(base44, user);
      if (!user || appRole !== 'admin') {
        return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
      }
    }

    const { dry_run = true, force = false } = body;
    const syncedAt = new Date().toISOString();

    // 1) Read source rows from Nati — single guarded connection.
    const rows = await withNatiConnection(async (connection) => {
      const [r] = await connection.query(SOURCE_SELECT);
      return r as Record<string, unknown>[];
    }, { force });
    console.log(`[IMPORT] Got ${rows.length} pricing rows from Nati`);

    const items = rows.map((r) => mapToVendorPricing(r, syncedAt));

    if (dry_run) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        source_table: 'supplier_distance_price_list',
        target_entity: 'VendorPricing',
        total_source_rows: rows.length,
        sample_source_row: rows[0] ?? null,
        sample_pricing: items[0] ?? null,
      });
    }

    // 2) Mirror into VendorPricing — dedup by vendor_id (one card per supplier).
    const sdk = base44.asServiceRole;
    const existing = await sdk.entities.VendorPricing.filter({});
    const lookup: Record<string, string> = {};
    for (const v of existing) {
      if (v.vendor_id) lookup[String(v.vendor_id)] = v.id;
    }
    const pricing = await upsertAll(sdk, 'VendorPricing', items, 'vendor_id', lookup);

    return Response.json({
      success: true,
      source_table: 'supplier_distance_price_list',
      target_entity: 'VendorPricing',
      total_source_rows: rows.length,
      pricing,
    });
  } catch (error) {
    console.error('[IMPORT] Fatal error:', error);
    return natiErrorResponse(error);
  }
});
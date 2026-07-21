/**
 * syncNatiData — Optimized sync from Nati MySQL DB (direct connection)
 * Uses call_open_appeals with JOIN to suppliers for vendor names.
 * Rate-limit protection: 150ms between items, batches of 20, exponential backoff retry.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';
import net from 'node:net';

// ===== Inline Nati DB layer (kept per-file: an earlier shared _shared/natiDb
// import failed to deploy. Circuit + last-run state below live in Deno KV, so
// they are shared + persistent across all Nati functions and warm/cold starts
// — unlike a plain in-memory variable, which let each function keep hammering
// Nati independently even while a sibling function was already cooling down) =====
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
const NATI_LAST_SYNC_KV_KEY = ['nati_last_sync_run'];

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

async function recordSyncRun(run) {
  try {
    const kv = await Deno.openKv();
    await kv.set(NATI_LAST_SYNC_KV_KEY, run);
  } catch (_) { /* Deno KV unavailable — skip persisting last-run info */ }
}

async function getNatiStatus() {
  const now = Date.now();
  let lastRun = null;
  try {
    const kv = await Deno.openKv();
    lastRun = (await kv.get(NATI_LAST_SYNC_KV_KEY)).value ?? null;
  } catch (_) { /* Deno KV unavailable — no persisted last-run info */ }
  const circuit = await getNatiCircuit();
  const blocked = circuit.blockedUntil > now;
  return {
    lastRun,
    circuit: {
      blocked,
      blockedUntil: circuit.blockedUntil,
      reason: circuit.reason,
      retryAfterSec: blocked ? Math.ceil((circuit.blockedUntil - now) / 1000) : 0,
    },
  };
}
// ===== End inline Nati DB layer =====

// ========== RATE LIMIT HELPERS ==========

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOp(fn, label) {
  const delays = [500, 1500, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const isRateLimit = e.message?.includes('Rate limit') || e.message?.includes('429') || e.status === 429;
      if (isRateLimit && attempt < delays.length) {
        console.log(`[RETRY] ${label} attempt ${attempt + 1}, waiting ${delays[attempt]}ms`);
        await sleep(delays[attempt]);
      } else {
        throw e;
      }
    }
  }
}

const BATCH_SIZE = 20;
const ITEM_DELAY_MS = 150;
const BATCH_DELAY_MS = 1000;

// ========== MAPPINGS ==========

const DEPT_MAP = { 0: 'אחר', 3: 'גרירה', 4: 'ניידת שירות', 5: 'שמשות', 10: 'רכב חליפי' };
const CASE_STATUS_MAP = { 0: 'new', 1: 'assigned', 2: 'completed', 3: 'cancelled', 6: 'completed', 7: 'completed' };
const CALL_STATUS_MAP = { 0: 'waiting_treatment', 1: 'assigning', 2: 'completed', 3: 'cancelled', 6: 'completed', 7: 'completed' };
const VEHICLE_TYPE_MAP = { 1: 'private', 2: 'motorcycle', 3: 'truck', 4: 'commercial_light' };

// ========== HELPERS ==========

// Nati MySQL returns datetimes as strings in Asia/Jerusalem local time without
// a timezone suffix. If we hand them to Base44 as a naive ISO string, the
// platform treats them as UTC and the value drifts by 2-3h depending on DST.
// Append the correct fixed offset so downstream date math is correct.
function jerusalemOffsetForDate(yyyy, mm, dd) {
  // Israel DST runs from the last Friday before April 2 through the last
  // Sunday of October. We approximate with month boundaries: Apr-Oct => +03:00,
  // Nov-Mar => +02:00. This is correct for ~99% of the year and the edge cases
  // are off by at most one hour, which is acceptable for sync timestamps.
  const month = Number(mm);
  return month >= 4 && month <= 10 ? '+03:00' : '+02:00';
}

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (s.startsWith('0000')) return null;
  if (!s.includes('-') || s.length < 10) return null;
  let iso = s.replace(' ', 'T').substring(0, 19);
  // A date-only value (e.g. a DATE column) has no time part — pad midnight,
  // otherwise the appended offset would produce an invalid ISO string
  // ("2026-07-15+03:00") that downstream new Date() calls reject.
  if (iso.length === 10) iso += 'T00:00:00';
  const yyyy = iso.substring(0, 4);
  const mm = iso.substring(5, 7);
  const dd = iso.substring(8, 10);
  return `${iso}${jerusalemOffsetForDate(yyyy, mm, dd)}`;
}

function clean(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') result[k] = v;
  }
  return result;
}

function mapServiceType(deptId) {
  if (deptId === 3) return 'towing';
  if (deptId === 4) return 'mechanical';
  return 'other';
}

function mapIssueType(deptId) {
  if (deptId === 3) return 'stopped_driving';
  if (deptId === 4) return 'mechanical';
  return 'other';
}

// Nati's open appeal statuses (0/1) don't encode the dispatch stage — their
// dispatcher screen derives the color from the appeal's fields instead
// (supplier assigned -> yellow, arrived -> orange, closure data entered but
// still open -> white). Mirror that derivation here so both screens agree
// (QA 21.07: an appeal with no supplier must not appear as "ספק שובץ").
const NATI_TERMINAL_STATUSES = new Set([2, 3, 6, 7]);

function hasAssignedSupplier(a) {
  if (a.supplier_id !== null && a.supplier_id !== undefined && Number(a.supplier_id) > 0) return true;
  return String(a.supplier_name || '').trim() !== '';
}

function deriveCallStatus(a) {
  if (NATI_TERMINAL_STATUSES.has(Number(a.status))) return CALL_STATUS_MAP[a.status];
  if (parseNatiDate(a.finish_time)) return 'awaiting_closure_call';
  if (parseNatiDate(a.arrive_actual_time)) return 'vendor_arrived';
  if (hasAssignedSupplier(a)) return 'vendor_enroute';
  return 'waiting_treatment';
}

function deriveCaseStatus(a) {
  if (NATI_TERMINAL_STATUSES.has(Number(a.status))) return CASE_STATUS_MAP[a.status];
  if (parseNatiDate(a.arrive_actual_time) || parseNatiDate(a.finish_time)) return 'on_site';
  if (hasAssignedSupplier(a)) return 'en_route';
  return 'new';
}

// ========== MAPPERS ==========

function mapToCall(a) {
  const data = {
    call_number: String(a.id),
    call_status: deriveCallStatus(a),
    call_priority: 'normal',
    service_category: a.department_id === 3 ? 'towing' : (a.department_id === 4 ? 'mobile_unit' : 'other'),
    issue_type: mapIssueType(a.department_id),
    issue_description: a.diagnose || '',
    issue_detail: String(a.serve_type || ''),
    // customer_name is REQUIRED on the Call schema, and clean() strips empty
    // strings — an appeal without a requester must still carry a placeholder,
    // otherwise every such Call.create fails validation (sync 14.07: errors=30)
    customer_name: (a.requester || '').trim() || 'לא צוין',
    customer_phone: a.tel || a.tel1 || 'לא צוין',
    customer_phone_2: a.tel1 || '',
    customer_id_number: a.client_id ? String(a.client_id) : '',
    membership_number: a.sub_num ? String(a.sub_num) : '',
    vehicle_plate: a.car_num || '',
    vehicle_type: VEHICLE_TYPE_MAP[a.car_type] || 'private',
    vehicle_code: a.car_code ? String(a.car_code) : '',
    pickup_location_address: a.address || 'לא צוין',
    pickup_location_city: a.city || '',
    dropoff_location_address: a.grar_address || '',
    dropoff_location_city: a.grar_city || '',
    dropoff_garage_name: a.garage || '',
    dropoff_garage_phone: a.garage_tel || '',
    storage_location_address: a.store_address || '',
    storage_location_city: a.store_city || '',
    assigned_vendor_name: a.supplier_name || '',
    operator_notes: a.q_notes || '',
    passed_quality_control: a.inspector_approves === 1,
    quality_control_source: 'nati',
    created_by_source: a.open_from_api === 1 ? 'bot' : 'operator',
    customer_response_code: a.car_pin || '',
    key_location: a.key_location || '',
    early_notification_minutes: a.reminder ? parseInt(a.reminder) : 30,
    operation_instructions: a.continue_id && a.continue_id !== 0 ? `קריאת המשך מ-${a.continue_id}` : '',
  };

  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) data.assigned_at = assignedAt;
  const etaTime = parseNatiDate(a.arrive_expected_time);
  if (etaTime) data.vendor_arrival_time_estimated = etaTime;
  const arriveTime = parseNatiDate(a.arrive_actual_time);
  if (arriveTime) data.vendor_arrival_time_actual = arriveTime;
  const finishTime = parseNatiDate(a.finish_time);
  // A finish_time on a still-open appeal is Nati's white state (closure data
  // entered, closing call pending) — the call is NOT closed yet, so closed_at
  // is only stamped once Nati actually moves the appeal to a terminal status.
  if (finishTime) {
    data.service_end_time = finishTime;
    if (NATI_TERMINAL_STATUSES.has(Number(a.status))) data.closed_at = finishTime;
  }
  // SLA response deadline for open appeals: 30 minutes from opening (matches
  // the Call schema's sla_target default), so the notifications engine can
  // track synced calls too. Closed appeals don't need one.
  if (!finishTime) {
    const openedAt = parseNatiDate(a.date_added);
    if (openedAt) {
      const deadline = new Date(new Date(openedAt).getTime() + 30 * 60 * 1000).toISOString();
      data.sla_deadline = deadline;
      data.sla_response_deadline = deadline;
    }
  }
  if (a.num_of_km && a.num_of_km > 0) data.estimated_distance_km = a.num_of_km;
  if (a.future_service_from) {
    const fs = parseNatiDate(a.future_service_from);
    if (fs) {
      data.future_service_date = fs.split('T')[0];
      if (a.future_service_to) {
        const fst = parseNatiDate(a.future_service_to);
        if (fst) {
          const fromTime = fs.split('T')[1] || '';
          const toTime = fst.split('T')[1] || '';
          if (fromTime && toTime) data.future_service_time_range = `${fromTime.substring(0,5)}-${toTime.substring(0,5)}`;
        }
      }
    }
  }
  return clean(data);
}

function mapToCase(a) {
  const data = {
    case_number: String(a.id),
    customer_name: (a.requester || '').trim() || 'לא צוין',
    caller_name: (a.requester || '').trim() || 'לא צוין',
    caller_phone: a.tel || a.tel1 || '',
    vehicle_number: a.car_num || '',
    vehicle_year: a.car_year || undefined,
    vehicle_type: VEHICLE_TYPE_MAP[a.car_type] || 'private',
    vehicle_model_code: a.car_code ? String(a.car_code) : '',
    service_type: mapServiceType(a.department_id),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: deriveCaseStatus(a),
    assigned_provider_name: a.supplier_name || '',
    department: DEPT_MAP[a.department_id] || 'אחר',
    problem_description: a.diagnose || '',
    internal_notes: a.q_notes || '',
    passed_qa: a.inspector_approves === 1,
    opening_source: a.open_from_api === 1 ? 'app' : 'call_center',
    source_status: NATI_TERMINAL_STATUSES.has(Number(a.status)) ? 'closed' : 'open',
    case_reference_code: a.sub_num ? String(a.sub_num) : '',
    customer_id: a.client_id ? String(a.client_id) : '',
    early_alert_minutes: a.reminder ? parseInt(a.reminder) : 30,
    early_alert_sent: a.reminder_canceled === 1,
  };

  if (a.num_of_km && a.num_of_km > 0) data.distance_km = a.num_of_km;
  const arrivedAt = parseNatiDate(a.arrive_actual_time);
  if (arrivedAt) data.arrived_at = arrivedAt;
  // Same white-state guard as mapToCall: finish_time alone doesn't close a case.
  const completedAt = parseNatiDate(a.finish_time);
  if (completedAt && NATI_TERMINAL_STATUSES.has(Number(a.status))) data.completed_at = completedAt;
  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) data.assigned_at = assignedAt;
  const etaTime = parseNatiDate(a.arrive_expected_time);
  if (etaTime) data.vendor_arrival_time = etaTime;
  if (a.future_service_from) {
    const fs = parseNatiDate(a.future_service_from);
    if (fs) data.future_service_time = fs;
  }
  return clean(data);
}

function extractVendors(appeals) {
  const map = new Map();
  for (const a of appeals) {
    const name = String(a.supplier_name || '').trim();
    if (name && !map.has(name)) {
      map.set(name, clean({
        vendor_name: name,
        vendor_number: a.supplier_id || undefined,
        is_active: true,
        is_available_now: true,
        availability_status: 'available',
      }));
    }
  }
  return Array.from(map.values());
}

function extractCustomers(appeals) {
  const map = new Map();
  for (const a of appeals) {
    const name = String(a.requester || '').trim();
    if (!name) continue;
    const key = a.client_id ? String(a.client_id) : name;
    if (!map.has(key)) {
      map.set(key, clean({
        name,
        customer_id_external: a.client_id ? String(a.client_id) : '',
        phone: a.tel || a.tel1 || '',
        vehicle_number: a.car_num || '',
        subscription_sequence: a.sub_num ? parseInt(a.sub_num) || 0 : 0,
        customer_type: 'individual',
        status: 'active',
      }));
    }
  }
  return Array.from(map.values());
}

// ========== BULK SYNC HELPER ==========

async function syncEntity(sdk, entityName, items, keyField, existingLookup, linkFn) {
  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`[SYNC] ${entityName} batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}`);

    for (const item of batch) {
      try {
        if (linkFn) linkFn(item);
        const key = item[keyField];
        const existingId = key ? existingLookup[key] : null;
        if (existingId) {
          await retryOp(() => sdk.entities[entityName].update(existingId, item), `${entityName}.update(${key})`);
          updated++;
        } else {
          const result = await retryOp(() => sdk.entities[entityName].create(item), `${entityName}.create(${key})`);
          if (key) existingLookup[key] = result.id;
          created++;
        }
      } catch (e) {
        console.error(`[SYNC] ${entityName} error:`, e.message);
        errors++;
      }
      await sleep(ITEM_DELAY_MS);
    }
    if (i + BATCH_SIZE < items.length) await sleep(BATCH_DELAY_MS);
  }
  return { created, updated, skipped, errors };
}

// ===== Inline work-queue enqueue + least-busy on-shift auto-assign (kept
// per-file: shared-module bundling is broken on this platform — see
// docs/LESSONS_LEARNED.md 2026-07-09). Mirrors onNewCase's assignment logic. =====
async function enqueueAndAutoAssign(sdk, calls) {
  const out = { enqueued: 0, assigned: 0, skipped: 0, errors: 0 };

  // Resolve on-shift operators (today, active/scheduled, within hours) and
  // their current open-item load — once per run, updated locally per assignment
  // so a batch of new calls spreads across operators instead of piling on one.
  let loadMap = null;
  try {
    // Shift dates/hours are entered in Israel local time — compare in the same
    // zone, and support shifts that span midnight (e.g. 22:00-06:00).
    const now = new Date();
    const israelParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
    const todayStr = `${israelParts.year}-${israelParts.month}-${israelParts.day}`;
    const currentHHMM = `${israelParts.hour === '24' ? '00' : israelParts.hour}:${israelParts.minute}`;
    const allShifts = await sdk.entities.AgentShift.filter({ shift_date: todayStr });
    const activeShifts = allShifts.filter((s) => {
      if (s.status !== 'active' && s.status !== 'scheduled') return false;
      if (s.start_time && s.end_time) {
        return s.start_time <= s.end_time
          ? currentHHMM >= s.start_time && currentHHMM <= s.end_time
          : currentHHMM >= s.start_time || currentHHMM <= s.end_time;
      }
      return true;
    });
    const onShiftEmails = [...new Set(activeShifts.map((s) => s.agent_email).filter(Boolean))];
    if (onShiftEmails.length > 0) {
      const allQueueItems = await sdk.entities.WorkQueue.filter({});
      const openStatuses = ['assigned_to_agent', 'in_progress', 'waiting_in_queue'];
      loadMap = {};
      for (const email of onShiftEmails) loadMap[email] = 0;
      for (const item of allQueueItems) {
        if (
          openStatuses.includes(item.queue_status) &&
          item.assigned_to_agent &&
          loadMap[item.assigned_to_agent] !== undefined
        ) {
          loadMap[item.assigned_to_agent]++;
        }
      }
    } else {
      console.log('[SYNC] No on-shift operators — new calls stay unassigned in queue');
    }
  } catch (e) {
    console.error('[SYNC] Shift/load lookup failed, calls stay unassigned in queue:', e.message);
  }

  for (const call of calls) {
    try {
      const existing = await sdk.entities.WorkQueue.filter({ call_id: call.id });
      if (existing.length > 0) { out.skipped++; continue; }

      const priorityScore =
        call.call_priority === 'urgent' ? 90 : call.call_priority === 'high' ? 75 : 50;

      // Least-busy on-shift operator — only for calls without a vendor yet
      // (a call Nati already dispatched doesn't need an operator to work it).
      let assignee = null;
      if (!call.hasVendor && loadMap && Object.keys(loadMap).length > 0) {
        assignee = Object.entries(loadMap).sort((a, b) => a[1] - b[1])[0][0];
        loadMap[assignee]++;
      }

      await sdk.entities.WorkQueue.create(clean({
        call_id: call.id,
        queue_status: assignee ? 'assigned_to_agent' : 'waiting_in_queue',
        assigned_to_agent: assignee || undefined,
        assigned_at: assignee ? new Date().toISOString() : undefined,
        priority_score: priorityScore,
        added_to_queue_at: new Date().toISOString(),
      }));
      out.enqueued++;
      if (assignee) out.assigned++;
      await sleep(ITEM_DELAY_MS);
    } catch (e) {
      console.error(`[SYNC] WorkQueue enqueue error (call ${call.call_number}):`, e.message);
      out.errors++;
    }
  }
  return out;
}

// ========== MAIN HANDLER ========== (redeploy 2026-07-15: queue enqueue + operator auto-assign)

// Server-side cooldown. Module-level state persists between invocations on
// warm starts, which is the common case under steady traffic. It will not
// protect across cold starts, but it is enough to stop an accidental click-
// loop or runaway automation from hammering Nati MySQL.
const COOLDOWN_MS = 60_000;
let lastWriteSyncAtMs = 0;

Deno.serve(async (req) => {
  const startTime = Date.now();
  // Hoisted so the catch block can record run status with the right context.
  let isAutomationRun = false;
  let isDryRun = false;

  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));

    // Auth: allow either an admin user OR a scheduled automation run. Scheduled runs
    // have no logged-in user; the platform includes an "automation" object in the body.
    // We also accept an explicit automation_key secret as a fallback for manual triggers.
    const automationKey = Deno.env.get('SYNC_AUTOMATION_KEY');
    const isAutomation = (!!automationKey && body.automation_key === automationKey) || !!body.automation;
    isAutomationRun = isAutomation;
    if (!isAutomation) {
      let user = null;
      try { user = await base44.auth.me(); } catch (_) {}
      if (!user) {
        return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
      }
      // Invited users carry platform role "user" — their app-level role lives in UserPermission.
      let isAdmin = user.role === 'admin';
      if (!isAdmin && user.email) {
        try {
          const perms = await base44.asServiceRole.entities.UserPermission.filter({
            user_email: user.email,
          });
          isAdmin = perms.some((p) => ['admin', 'מנהל', 'מנהל מערכת'].includes(p.role_name));
        } catch (_) {}
      }
      if (!isAdmin) {
        return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
      }
    }

    // Lightweight status check for the admin "last sync" indicator. Returns the
    // persisted last-run + circuit-breaker state WITHOUT touching the Nati DB.
    // Folded into this (already-deployed) function so the UI needs no new function.
    if (body.status_only) {
      const status = await getNatiStatus();
      return Response.json({ success: true, ...status });
    }

    const {
      dep = -1, callStatus = -1, dry_run = false,
      sync_calls = true, sync_cases = true,
      sync_vendors = true, sync_customers = true,
      close_missing = false,
      force = false,
    } = body;
    isDryRun = dry_run;

    // Cooldown only applies to real writes. Dry-runs are read-only and safe to repeat.
    if (!dry_run && !force) {
      const sinceLast = Date.now() - lastWriteSyncAtMs;
      if (sinceLast < COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((COOLDOWN_MS - sinceLast) / 1000);
        return Response.json({
          error: `יש להמתין ${retryAfterSec} שניות בין סנכרונים`,
          retry_after_seconds: retryAfterSec,
        }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } });
      }
    }

    console.log('[SYNC] Connecting to Nati DB...');
    const allAppeals = await withNatiConnection(async (connection) => {
      let sql = 'SELECT a.*, s.fullname as supplier_name FROM call_open_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1';
      const params = [];
      if (dep !== -1) {
        sql += ' AND a.department_id = ?';
        params.push(dep);
      } else {
        // Department scope (Adiel, Nati DBA, 20.07): call_open_appeals holds the
        // open appeals of ALL Nati departments (121 rows vs 10 towing), but the
        // CRM operates on the towing department — an unscoped pull floods the
        // dashboard with calls the dispatchers will never handle. Default scope:
        // towing only (department_id 3, see DEPT_MAP). Widen via the
        // NATI_SYNC_DEPARTMENT_IDS env var (comma-separated ids, e.g. '3,10';
        // '*' = all departments). An explicit dep request param always wins.
        const deptScope = (Deno.env.get('NATI_SYNC_DEPARTMENT_IDS') || '3').trim();
        if (deptScope !== '*') {
          const ids = deptScope
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map(Number)
            .filter((n) => Number.isInteger(n) && n >= 0);
          if (ids.length > 0) {
            sql += ` AND a.department_id IN (${ids.map(() => '?').join(',')})`;
            params.push(...ids);
          }
        }
      }
      if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
      // TEMPORARY (20.07): Nati's call_open_appeals still contains ~115 stale
      // pre-cleanup rows marked open (some years old, e.g. appeal 144760), while
      // their staging UI shows only the real open calls from 15.07 onward. Until
      // Nati cleans the table, ignore appeals opened before the cutoff so they
      // don't flood back into the CRM. Override via the NATI_SYNC_MIN_DATE_ADDED
      // env var (YYYY-MM-DD, Jerusalem local; set to '1970-01-01' to disable);
      // remove this block entirely once Nati's table is cleaned.
      let minDateAdded = (Deno.env.get('NATI_SYNC_MIN_DATE_ADDED') || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(minDateAdded)) {
        minDateAdded = '2026-07-15';
      }
      if (!minDateAdded.includes(' ')) minDateAdded += ' 00:00:00';
      sql += ' AND a.date_added >= ?';
      params.push(minDateAdded);
      sql += ' ORDER BY a.date_added DESC';
      const [rows] = await connection.query(sql, params);
      return rows;
    }, { force });

    console.log(`[SYNC] Got ${allAppeals.length} open appeals from Nati DB`);

    const sdk = base44.asServiceRole;

    // Backlog priority: appeals not yet in the CRM (by call_number) go first, so
    // an old backlog of open Nati appeals actually drains over successive runs
    // instead of the same "30 newest/updated" appeals being reprocessed forever.
    // Then appeals Nati marked as updated, then most recently added.
    let existingCallRows = [];
    try {
      existingCallRows = await sdk.entities.Call.filter({});
    } catch (e) {
      console.error('[SYNC] Failed to load existing calls for backlog prioritization:', e.message);
    }
    const existingCallNumbers = new Set(
      existingCallRows.filter((c) => c.call_number).map((c) => c.call_number)
    );

    const MAX_PER_RUN = 30;
    const sorted = [...allAppeals].sort((a, b) => {
      const aIsNew = !existingCallNumbers.has(String(a.id));
      const bIsNew = !existingCallNumbers.has(String(b.id));
      if (aIsNew !== bIsNew) return aIsNew ? -1 : 1;
      if (a.has_updated === 1 && b.has_updated !== 1) return -1;
      if (b.has_updated === 1 && a.has_updated !== 1) return 1;
      return new Date(b.date_added || 0) - new Date(a.date_added || 0);
    });
    const appeals = sorted.slice(0, MAX_PER_RUN);
    console.log(`[SYNC] Processing ${appeals.length} of ${allAppeals.length} (prioritized new/updated/recent)`);

    // How many of Nati's currently-open appeals have never been synced into the
    // CRM at all (as opposed to already-synced ones just waiting for an update).
    // This is what "backlog" means for the admin UI: it should trend to 0 as
    // successive runs catch up, even though total_from_nati itself won't (Nati
    // keeps opening new appeals). Computed before this run's own writes.
    const backlogRemaining = allAppeals.filter((a) => !existingCallNumbers.has(String(a.id))).length;

    if (dry_run) {
      return Response.json({
        success: true, mode: 'dry_run',
        total_from_nati: allAppeals.length,
        backlog_remaining: backlogRemaining,
        appeals_count: appeals.length,
        sample_call: appeals.length > 0 ? mapToCall(appeals[0]) : null,
        sample_case: appeals.length > 0 ? mapToCase(appeals[0]) : null,
        vendors_found: extractVendors(appeals).length,
        customers_found: extractCustomers(appeals).length,
      });
    }

    const results = {};

    console.log('[SYNC] Loading existing records...');
    const [existingVendors, existingCustomers, existingCases] = await Promise.all([
      sync_vendors ? sdk.entities.Vendor.filter({}) : [],
      sync_customers ? sdk.entities.Customer.filter({}) : [],
      sync_cases ? sdk.entities.Case.filter({}) : [],
    ]);
    // Reuse the fetch done above for backlog prioritization instead of querying Call twice.
    const existingCalls = sync_calls ? existingCallRows : [];

    // Build vendor lookups by both stable supplier id (preferred) and by name
    // (fallback for legacy rows that pre-date the supplier_id mapping). Looking
    // up by id first prevents duplicate vendor rows when Nati renames a supplier.
    const vendorByNumber = {};
    const vendorLookup = {};
    for (const v of existingVendors) {
      if (v.vendor_number !== undefined && v.vendor_number !== null && v.vendor_number !== '') {
        vendorByNumber[String(v.vendor_number)] = v.id;
      }
      if (v.vendor_name) vendorLookup[v.vendor_name.trim()] = v.id;
    }
    const custByExtId = {}, custByName = {};
    for (const c of existingCustomers) {
      if (c.customer_id_external) custByExtId[c.customer_id_external] = c.id;
      if (c.name) custByName[c.name.trim()] = c.id;
    }
    const callLookup = {};
    for (const c of existingCalls) { if (c.call_number) callLookup[c.call_number] = c.id; }
    const caseLookup = {};
    for (const c of existingCases) { if (c.case_number) caseLookup[c.case_number] = c.id; }

    // VENDORS — dedup by supplier_id first, fall back to name only when no id.
    if (sync_vendors) {
      console.log('[SYNC] Syncing vendors...');
      const vendorData = extractVendors(appeals);
      let vendorsCreated = 0, vendorsSkipped = 0;
      for (const vd of vendorData) {
        const idKey = vd.vendor_number !== undefined && vd.vendor_number !== null
          ? String(vd.vendor_number)
          : null;
        const existingId = (idKey && vendorByNumber[idKey]) || vendorLookup[vd.vendor_name];
        if (existingId) {
          if (idKey) vendorByNumber[idKey] = existingId;
          vendorLookup[vd.vendor_name] = existingId;
          vendorsSkipped++;
          continue;
        }
        try {
          const created = await retryOp(() => sdk.entities.Vendor.create(vd), `Vendor.create(id=${idKey ?? 'n/a'})`);
          if (idKey) vendorByNumber[idKey] = created.id;
          vendorLookup[vd.vendor_name] = created.id;
          vendorsCreated++;
          await sleep(ITEM_DELAY_MS);
        } catch (e) { console.error('[SYNC] Vendor create error:', e.message); }
      }
      results.vendors = { existing: existingVendors.length, created: vendorsCreated, skipped: vendorsSkipped };
    }

    // CUSTOMERS
    if (sync_customers) {
      console.log('[SYNC] Syncing customers...');
      const custData = extractCustomers(appeals);
      let customersCreated = 0, customersSkipped = 0;
      for (const cd of custData) {
        const existsId = cd.customer_id_external ? custByExtId[cd.customer_id_external] : custByName[cd.name];
        if (existsId) { customersSkipped++; continue; }
        try {
          const created = await retryOp(() => sdk.entities.Customer.create(cd), `Customer.create(${cd.name})`);
          if (cd.customer_id_external) custByExtId[cd.customer_id_external] = created.id;
          custByName[cd.name] = created.id;
          customersCreated++;
          await sleep(ITEM_DELAY_MS);
        } catch (e) { console.error('[SYNC] Customer create error:', e.message); }
      }
      results.customers = { existing: existingCustomers.length, created: customersCreated, skipped: customersSkipped };
    }

    // CALLS
    if (sync_calls) {
      console.log('[SYNC] Syncing calls...');
      const callRowByNumber = {};
      for (const c of existingCalls) { if (c.call_number) callRowByNumber[c.call_number] = c; }
      // Bidirectional guard (pushNatiUpdates is the outbound half): the pull
      // derives statuses along Nati's dispatch progression (waiting -> assigned
      // -> en route -> arrived -> awaiting closure call), so a pull may only
      // ADVANCE a call along that ladder — never regress it (mirror of the push
      // side's forward-only rule). Statuses without a rank are CRM-only workflow
      // states (storage, follow-up, payment, future service...) that Nati has no
      // equivalent for, so a pull must never flatten them.
      const PULL_STATUS_RANK = {
        waiting_treatment: 0, awaiting_assignment: 1, assigning: 2,
        vendor_enroute: 3, in_progress: 3, vendor_arrived: 4, awaiting_closure_call: 5,
      };
      const TERMINAL_CRM_STATUSES = new Set(['completed', 'cancelled']);
      const callItems = appeals.map(mapToCall);
      for (const item of callItems) {
        // A QC decision made manually in this CRM (special cases) must survive
        // the sync: Nati still reports inspector_approves=0 for it, which would
        // flip the call back to "pending QC" here on every run. Nati becomes
        // the source again only once the appeal is actually approved there.
        const existing = callRowByNumber[item.call_number];
        if (existing?.quality_control_source === 'manual' && item.passed_quality_control !== true) {
          delete item.passed_quality_control;
          delete item.quality_control_source;
        }
        // A call closed/cancelled in the CRM stays closed even while Nati still
        // reports it open — pushNatiUpdates closes it on the Nati side on its
        // next run. Reverting it here would lose the closure entirely (the push
        // diff would then see CRM == Nati == open and write nothing).
        if (existing && item.call_status) {
          const localTerminal = TERMINAL_CRM_STATUSES.has(existing.call_status);
          const incomingTerminal = TERMINAL_CRM_STATUSES.has(item.call_status);
          if (!incomingTerminal) {
            // A row with no local status yet (legacy/bad data) must accept any
            // ranked incoming status — rank it below the whole ladder.
            const localRank = existing.call_status ? PULL_STATUS_RANK[existing.call_status] : -1;
            const incomingRank = PULL_STATUS_RANK[item.call_status];
            // Both ranks must be defined for an advance: an unranked local
            // status is a CRM-only state the pull must not touch, and an
            // unranked incoming status can't prove it's further along.
            const advances =
              localRank !== undefined && incomingRank !== undefined && incomingRank > localRank;
            if (localTerminal || !advances) {
              delete item.call_status;
            }
          }
        }
      }
      // Snapshot before syncEntity mutates callLookup, so we can tell which
      // calls were created in this run (vs. pre-existing ones that got updated).
      const preExistingCallNumbers = new Set(Object.keys(callLookup));
      results.calls = await syncEntity(sdk, 'Call', callItems, 'call_number', callLookup, (item) => {
        if (item.assigned_vendor_name && vendorLookup[item.assigned_vendor_name]) {
          item.assigned_vendor_id = vendorLookup[item.assigned_vendor_name];
        }
      });

      // Newly created open calls enter the work queue and get auto-assigned to
      // the least-busy on-shift operator — same treatment a call opened in the
      // NewCase form gets, so synced Nati calls don't bypass the queue.
      // Every open synced call needs an operator (שיוך למוקדן), including ones
      // that already arrive with a supplier assigned on the Nati side — the
      // pull now derives those as vendor_enroute/vendor_arrived/awaiting_closure_call.
      const OPEN_FOR_QUEUE = new Set([
        'waiting_treatment', 'awaiting_assignment', 'assigning',
        'vendor_enroute', 'vendor_arrived', 'awaiting_closure_call',
      ]);
      const newlyCreated = callItems
        .filter((i) =>
          i.call_number &&
          !preExistingCallNumbers.has(i.call_number) &&
          callLookup[i.call_number] &&
          OPEN_FOR_QUEUE.has(i.call_status)
        )
        .map((i) => ({
          id: callLookup[i.call_number],
          call_number: i.call_number,
          call_priority: i.call_priority,
          hasVendor: !!(i.assigned_vendor_id || i.assigned_vendor_name),
        }));
      if (newlyCreated.length > 0) {
        console.log(`[SYNC] Enqueuing ${newlyCreated.length} new calls into WorkQueue...`);
        results.work_queue = await enqueueAndAutoAssign(sdk, newlyCreated);
      }
    }

    // CASES
    if (sync_cases) {
      console.log('[SYNC] Syncing cases...');
      const caseItems = appeals.map(mapToCase);
      results.cases = await syncEntity(sdk, 'Case', caseItems, 'case_number', caseLookup, (item) => {
        if (item.assigned_provider_name && vendorLookup[item.assigned_provider_name]) {
          item.assigned_provider_id = vendorLookup[item.assigned_provider_name];
        }
      });
    }

    // AUTO-CLOSE
    if (close_missing) {
      console.log('[SYNC] Checking for calls/cases to auto-close...');
      const natiOpenIds = new Set(allAppeals.map(a => String(a.id)));
      const OPEN_CALL_STATUSES = ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress', 'vendor_arrived', 'awaiting_closure_call', 'future_service', 'in_followup', 'in_storage', 'continued_treatment', 'awaiting_payment'];
      const OPEN_CASE_STATUSES = ['new', 'assigned', 'en_route', 'on_site', 'in_progress'];
      let callsClosed = 0, casesClosed = 0;

      if (sync_calls) {
        const openLocalCalls = existingCalls.filter(c =>
          c.call_number && OPEN_CALL_STATUSES.includes(c.call_status) && !natiOpenIds.has(c.call_number)
        );
        for (const call of openLocalCalls.slice(0, 10)) {
          try {
            await retryOp(() => sdk.entities.Call.update(call.id, {
              call_status: 'completed', closed_at: new Date().toISOString(),
              operator_notes: (call.operator_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
            }), `Call.close(${call.call_number})`);
            callsClosed++;
            await sleep(ITEM_DELAY_MS);
          } catch (e) { console.error('[SYNC] Call close error:', e.message); }
        }
      }
      if (sync_cases) {
        const openLocalCases = existingCases.filter(c =>
          c.case_number && OPEN_CASE_STATUSES.includes(c.status) && !natiOpenIds.has(c.case_number)
        );
        for (const cs of openLocalCases.slice(0, 10)) {
          try {
            await retryOp(() => sdk.entities.Case.update(cs.id, {
              status: 'completed', completed_at: new Date().toISOString(), source_status: 'closed',
              internal_notes: (cs.internal_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
            }), `Case.close(${cs.case_number})`);
            casesClosed++;
            await sleep(ITEM_DELAY_MS);
          } catch (e) { console.error('[SYNC] Case close error:', e.message); }
        }
      }
      results.auto_closed = { calls_closed: callsClosed, cases_closed: casesClosed };
    }

    const duration = Date.now() - startTime;
    console.log(`[SYNC] Done in ${duration}ms`);
    lastWriteSyncAtMs = Date.now();

    await recordSyncRun({
      at: new Date().toISOString(),
      ok: true,
      trigger: isAutomationRun ? 'automation' : 'manual',
      total_from_nati: allAppeals.length,
      backlog_remaining: backlogRemaining,
      processed: appeals.length,
      created: (results.calls?.created || 0) + (results.cases?.created || 0),
      updated: (results.calls?.updated || 0) + (results.cases?.updated || 0),
      errors: (results.calls?.errors || 0) + (results.cases?.errors || 0),
      error: null,
    });

    return Response.json({
      success: true,
      total_from_nati: allAppeals.length,
      backlog_remaining: backlogRemaining,
      processed_appeals: appeals.length,
      duration_ms: duration,
      ...results,
    });
  } catch (error) {
    console.error('[SYNC] Fatal error:', error);
    // Record real-sync failures only (a failed dry-run preview isn't a "last sync").
    if (!isDryRun) {
      await recordSyncRun({
        at: new Date().toISOString(),
        ok: false,
        trigger: isAutomationRun ? 'automation' : 'manual',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return natiErrorResponse(error);
  }
});
// deployed 2026-07-15 v3 (bidirectional sync: pull-side conflict guards)
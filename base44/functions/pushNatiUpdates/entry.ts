/**
 * pushNatiUpdates — Outbound half of the bidirectional Nati sync (CRM -> Nati MySQL).
 *
 * Mirrors CRM-side changes on Calls back into Nati's call_open_appeals table.
 * Conservative write policy (never destroys Nati data):
 *   - status: only moves FORWARD (0 -> 1 on assignment; open -> 2/3 on close/cancel).
 *     Never reopens a closed appeal and never downgrades an in-progress one.
 *   - supplier_id / supplier_assigned_date: fill-empty only (CRM assignment lands
 *     in Nati only when Nati has no supplier yet — a Nati dispatcher's choice wins).
 *   - arrive_expected_time / arrive_actual_time / finish_time: fill-empty only.
 *   - q_notes: fill-empty only.
 *   - inspector_approves: 0 -> 1 only, and only for QC passed manually in the CRM.
 * Every write is diff-based (SELECT current row first, UPDATE only changed columns),
 * so a pull (syncNatiData) followed by a push never echoes data back and forth.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';
import net from 'node:net';

// ===== Inline Nati DB layer (kept per-file: an earlier shared _shared/natiDb
// import failed to deploy. Circuit + last-run state below live in Deno KV, so
// they are shared + persistent across all Nati functions and warm/cold starts) =====
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
const NATI_LAST_PUSH_KV_KEY = ['nati_last_push_run'];
const NATI_PUSH_WATERMARK_KV_KEY = ['nati_push_watermark'];
const NATI_PUSH_RETRY_KV_KEY = ['nati_push_retry'];

// Deno KV can be unavailable on some runtimes — fall back to in-memory state.
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

async function recordPushRun(run) {
  try {
    const kv = await Deno.openKv();
    await kv.set(NATI_LAST_PUSH_KV_KEY, run);
  } catch (_) { /* Deno KV unavailable — skip persisting last-run info */ }
}

async function getPushStatus() {
  const now = Date.now();
  let lastRun = null;
  try {
    const kv = await Deno.openKv();
    lastRun = (await kv.get(NATI_LAST_PUSH_KV_KEY)).value ?? null;
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

async function getPushWatermark() {
  try {
    const kv = await Deno.openKv();
    return (await kv.get(NATI_PUSH_WATERMARK_KV_KEY)).value ?? null;
  } catch (_) {
    return null;
  }
}

async function setPushWatermark(iso) {
  try {
    const kv = await Deno.openKv();
    await kv.set(NATI_PUSH_WATERMARK_KV_KEY, iso);
  } catch (_) { /* Deno KV unavailable — next run re-diffs everything (safe, diff-based) */ }
}

// Retry queue for calls whose UPDATE failed: { [call_number]: attempts }.
// Lets the watermark advance past errors (no poison-pill stall) without losing
// the failed updates — they are re-examined on subsequent runs until
// MAX_PUSH_RETRY_ATTEMPTS, then dropped with a log.
async function getPushRetryMap() {
  try {
    const kv = await Deno.openKv();
    return (await kv.get(NATI_PUSH_RETRY_KV_KEY)).value ?? {};
  } catch (_) {
    return {};
  }
}

async function setPushRetryMap(map) {
  try {
    const kv = await Deno.openKv();
    await kv.set(NATI_PUSH_RETRY_KV_KEY, map);
  } catch (_) { /* Deno KV unavailable — failed calls retry only via the overlap window */ }
}
// ===== End inline Nati DB layer =====

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ITEM_DELAY_MS = 150;
const MAX_UPDATES_PER_RUN = 30;
const MAX_PUSH_RETRY_ATTEMPTS = 5;
const SELECT_CHUNK_SIZE = 200;
// Overlap window on the incremental watermark so a Call updated exactly while
// the previous push ran is still re-examined next run. Re-examining is free of
// side effects because every write is diff-based.
const WATERMARK_OVERLAP_MS = 10 * 60_000;
const Q_NOTES_MAX_LEN = 1000;

// ========== CRM -> NATI MAPPINGS ==========

// Nati's call_open_appeals.status buckets, mirrored from the pull direction
// (syncNatiData CALL_STATUS_MAP): 0=waiting, 1=in treatment, 2=completed,
// 3=cancelled, 6/7=completed variants. Statuses 4/5/8/9/10 exist in Nati as
// finer-grained OPEN states — we treat them as "in treatment" and never touch
// them (status is only pushed 0->1, open->2, open->3).
const NATI_CLOSED_STATUSES = new Set([2, 3, 6, 7]);

const CRM_STATUS_TO_NATI = {
  waiting_treatment: 0,
  awaiting_assignment: 0,
  assigning: 1,
  vendor_enroute: 1,
  vendor_arrived: 1,
  in_progress: 1,
  cannot_complete: 1,
  future_service: 1,
  in_followup: 1,
  in_storage: 1,
  continued_treatment: 1,
  awaiting_payment: 1,
  completed: 2,
  cancelled: 3,
};

// Nati stores datetimes as naive strings in Asia/Jerusalem local time. The CRM
// stores ISO timestamps (UTC). Convert before writing so Nati sees local time.
function toNatiDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}:${parts.second}`;
}

function isEmptyNatiDate(v) {
  if (!v) return true;
  const s = String(v);
  return s.startsWith('0000') || s.trim() === '';
}

/**
 * Computes the column updates a single CRM Call implies for its Nati row.
 * Returns { updates: {col: value}, reasons: [str] } — empty updates = nothing to push.
 */
function diffCallAgainstNatiRow(call, row, vendorNumberById) {
  const updates = {};
  const reasons = [];

  // --- status: forward-only transitions ---
  const desired = CRM_STATUS_TO_NATI[call.call_status];
  const current = Number(row.status);
  if (desired !== undefined && !Number.isNaN(current)) {
    const natiClosed = NATI_CLOSED_STATUSES.has(current);
    if ((desired === 2 || desired === 3) && !natiClosed) {
      updates.status = desired;
      reasons.push(`status ${current} -> ${desired} (${call.call_status})`);
    } else if (desired === 1 && current === 0) {
      updates.status = 1;
      reasons.push(`status 0 -> 1 (${call.call_status})`);
    }
    // desired === 0 (or Nati already closed / further along): never downgrade or reopen.
  }

  // --- supplier assignment: fill-empty only (a Nati dispatcher's choice wins) ---
  const natiHasSupplier = row.supplier_id !== null && row.supplier_id !== undefined && Number(row.supplier_id) > 0;
  if (!natiHasSupplier && call.assigned_vendor_id) {
    const vendorNumber = vendorNumberById[call.assigned_vendor_id];
    if (vendorNumber !== undefined && vendorNumber !== null && Number(vendorNumber) > 0) {
      updates.supplier_id = Number(vendorNumber);
      reasons.push(`supplier_id -> ${vendorNumber}`);
      if (isEmptyNatiDate(row.supplier_assigned_date)) {
        const assignedAt = toNatiDateTime(call.assigned_at) || toNatiDateTime(new Date().toISOString());
        if (assignedAt) updates.supplier_assigned_date = assignedAt;
      }
    }
  }

  // --- timestamps: fill-empty only ---
  if (isEmptyNatiDate(row.arrive_expected_time) && call.vendor_arrival_time_estimated) {
    const v = toNatiDateTime(call.vendor_arrival_time_estimated);
    if (v) { updates.arrive_expected_time = v; reasons.push('arrive_expected_time'); }
  }
  if (isEmptyNatiDate(row.arrive_actual_time) && call.vendor_arrival_time_actual) {
    const v = toNatiDateTime(call.vendor_arrival_time_actual);
    if (v) { updates.arrive_actual_time = v; reasons.push('arrive_actual_time'); }
  }
  const crmClosed = call.call_status === 'completed' || call.call_status === 'cancelled';
  if (crmClosed && isEmptyNatiDate(row.finish_time)) {
    const v = toNatiDateTime(call.service_end_time || call.closed_at);
    if (v) { updates.finish_time = v; reasons.push('finish_time'); }
  }

  // --- operator notes: fill-empty only (never overwrite Nati-side notes) ---
  const crmNotes = String(call.operator_notes || '').trim();
  const natiNotes = String(row.q_notes || '').trim();
  if (crmNotes && !natiNotes) {
    updates.q_notes = crmNotes.substring(0, Q_NOTES_MAX_LEN);
    reasons.push('q_notes');
  }

  // --- QC approval: only a manual CRM decision, and only 0 -> 1 ---
  if (
    call.passed_quality_control === true &&
    call.quality_control_source === 'manual' &&
    Number(row.inspector_approves) !== 1
  ) {
    updates.inspector_approves = 1;
    reasons.push('inspector_approves -> 1');
  }

  return { updates, reasons };
}

// ========== MAIN HANDLER ==========

// Server-side cooldown between real (writing) pushes — same pattern as syncNatiData.
const COOLDOWN_MS = 60_000;
let lastWritePushAtMs = 0;

Deno.serve(async (req) => {
  const startTime = Date.now();
  let isAutomationRun = false;
  let isDryRun = false;

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Auth: admin user OR scheduled automation (same contract as syncNatiData).
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

    // Lightweight status check for the admin "last push" indicator — no DB touch.
    if (body.status_only) {
      const status = await getPushStatus();
      return Response.json({ success: true, ...status });
    }

    const {
      dry_run = false,
      force = false,
      full_scan = false,
      max_updates = MAX_UPDATES_PER_RUN,
    } = body;
    isDryRun = dry_run;
    const updatesCap = Math.max(1, Math.min(Number(max_updates) || MAX_UPDATES_PER_RUN, 100));

    if (!dry_run && !force) {
      const sinceLast = Date.now() - lastWritePushAtMs;
      if (sinceLast < COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((COOLDOWN_MS - sinceLast) / 1000);
        return Response.json({
          error: `יש להמתין ${retryAfterSec} שניות בין דחיפות לנתי`,
          retry_after_seconds: retryAfterSec,
        }, { status: 429, headers: { 'Retry-After': String(retryAfterSec) } });
      }
    }

    const sdk = base44.asServiceRole;

    // Candidate calls: only ones that originated in Nati (numeric call_number ==
    // Nati appeal id), changed since the incremental watermark (with overlap).
    console.log('[PUSH] Loading CRM calls...');
    const allCalls = await sdk.entities.Call.filter({});
    const watermark = full_scan ? null : await getPushWatermark();
    const retryMap = full_scan ? {} : await getPushRetryMap();
    const sinceMs = watermark ? new Date(watermark).getTime() - WATERMARK_OVERLAP_MS : 0;
    const candidates = allCalls.filter((c) => {
      if (!c.call_number || !/^\d+$/.test(String(c.call_number))) return false;
      // Previously failed updates are re-examined regardless of the watermark.
      if (retryMap[c.call_number] !== undefined) return true;
      const changedAt = new Date(c.updated_date || c.created_date || 0).getTime();
      return changedAt >= sinceMs;
    });
    console.log(`[PUSH] ${candidates.length} candidate calls (of ${allCalls.length}) since watermark=${watermark || 'none'}, retrying=${Object.keys(retryMap).length}`);

    // Vendor id -> Nati supplier id (vendor_number) for assignment write-back.
    const vendorNumberById = {};
    try {
      const vendors = await sdk.entities.Vendor.filter({});
      for (const v of vendors) {
        if (v.vendor_number !== undefined && v.vendor_number !== null && v.vendor_number !== '') {
          vendorNumberById[v.id] = v.vendor_number;
        }
      }
    } catch (e) {
      console.error('[PUSH] Vendor lookup failed — supplier assignment will not be pushed this run:', e.message);
    }

    const runStartedAtIso = new Date().toISOString();
    const result = await withNatiConnection(async (connection) => {
      // Fetch the current Nati rows for all candidates (chunked IN queries).
      const rowsById = {};
      const ids = candidates.map((c) => Number(c.call_number));
      for (let i = 0; i < ids.length; i += SELECT_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + SELECT_CHUNK_SIZE);
        if (chunk.length === 0) continue;
        const placeholders = chunk.map(() => '?').join(',');
        const [rows] = await connection.query(
          `SELECT id, status, supplier_id, supplier_assigned_date, arrive_expected_time,
                  arrive_actual_time, finish_time, q_notes, inspector_approves
           FROM call_open_appeals WHERE id IN (${placeholders})`,
          chunk
        );
        for (const row of rows) rowsById[String(row.id)] = row;
      }

      // Diff every candidate against its live Nati row.
      const planned = [];
      let notInNati = 0;
      let noChange = 0;
      for (const call of candidates) {
        const row = rowsById[String(call.call_number)];
        if (!row) { notInNati++; continue; }
        const { updates, reasons } = diffCallAgainstNatiRow(call, row, vendorNumberById);
        if (Object.keys(updates).length === 0) { noChange++; continue; }
        planned.push({ call_number: call.call_number, updates, reasons });
      }

      const toApply = planned.slice(0, updatesCap);
      const deferred = planned.length - toApply.length;

      if (dry_run) {
        return {
          planned: toApply.map((p) => ({ call_number: p.call_number, fields: p.reasons })),
          counts: {
            candidates: candidates.length,
            matched_in_nati: candidates.length - notInNati,
            not_in_nati: notInNati,
            no_change: noChange,
            would_update: toApply.length,
            deferred_to_next_run: deferred,
          },
        };
      }

      // Apply — one parameterized UPDATE per call, only the changed columns.
      let updated = 0, errors = 0;
      const fieldCounts = {};
      const errorSamples = [];
      const erroredCallNumbers = [];
      for (const p of toApply) {
        try {
          const cols = Object.keys(p.updates);
          const setClause = cols.map((c) => `${c} = ?`).join(', ');
          const values = cols.map((c) => p.updates[c]);
          await connection.query(
            `UPDATE call_open_appeals SET ${setClause} WHERE id = ?`,
            [...values, Number(p.call_number)]
          );
          updated++;
          for (const c of cols) fieldCounts[c] = (fieldCounts[c] || 0) + 1;
          console.log(`[PUSH] Updated appeal ${p.call_number}: ${p.reasons.join(', ')}`);
        } catch (e) {
          errors++;
          erroredCallNumbers.push(p.call_number);
          if (errorSamples.length < 3) errorSamples.push(`${p.call_number}: ${e.message}`);
          console.error(`[PUSH] Update error (appeal ${p.call_number}):`, e.message);
        }
        await sleep(ITEM_DELAY_MS);
      }

      return {
        counts: {
          candidates: candidates.length,
          matched_in_nati: candidates.length - notInNati,
          not_in_nati: notInNati,
          no_change: noChange,
          updated,
          errors,
          deferred_to_next_run: deferred,
        },
        field_counts: fieldCounts,
        error_samples: errorSamples,
        errored_call_numbers: erroredCallNumbers,
        applied: toApply.map((p) => ({ call_number: p.call_number, fields: p.reasons })),
      };
    }, { force });

    const duration = Date.now() - startTime;

    if (dry_run) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        duration_ms: duration,
        ...result,
      });
    }

    lastWritePushAtMs = Date.now();
    // Advance the watermark whenever every candidate was examined (nothing
    // deferred by the per-run cap) — even if some UPDATEs failed. A stuck
    // watermark would make one persistently-failing call ("poison pill")
    // re-scan the whole backlog forever. Failed calls are not lost: they go
    // into the KV retry queue and are re-examined on the next runs, up to
    // MAX_PUSH_RETRY_ATTEMPTS.
    if (result.counts.deferred_to_next_run === 0) {
      await setPushWatermark(runStartedAtIso);
    }

    // Update the retry queue: failed calls accumulate attempts (dropped with a
    // log once exhausted); anything that succeeded or no longer needs a change
    // simply falls out of the queue.
    {
      const newRetryMap = {};
      let retriesDropped = 0;
      for (const cn of result.errored_call_numbers || []) {
        const attempts = (retryMap[cn] || 0) + 1;
        if (attempts >= MAX_PUSH_RETRY_ATTEMPTS) {
          retriesDropped++;
          console.error(`[PUSH] Giving up on appeal ${cn} after ${attempts} failed attempts — dropping from retry queue`);
        } else {
          newRetryMap[cn] = attempts;
        }
      }
      result.counts.retry_queued = Object.keys(newRetryMap).length;
      result.counts.retry_dropped = retriesDropped;
      await setPushRetryMap(newRetryMap);
    }

    await recordPushRun({
      at: new Date().toISOString(),
      ok: true,
      trigger: isAutomationRun ? 'automation' : 'manual',
      ...result.counts,
      error: null,
    });

    console.log(`[PUSH] Done in ${duration}ms:`, JSON.stringify(result.counts));
    return Response.json({
      success: true,
      duration_ms: duration,
      ...result,
    });
  } catch (error) {
    console.error('[PUSH] Fatal error:', error);
    if (!isDryRun) {
      await recordPushRun({
        at: new Date().toISOString(),
        ok: false,
        trigger: isAutomationRun ? 'automation' : 'manual',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Scheduled runs during a known Nati-side block/cooldown are an expected,
    // self-healing condition — report them as a graceful skip (200) so the
    // automation doesn't register a failure every 5 minutes. The push is
    // diff-based, so skipped runs lose nothing: the next successful run
    // pushes everything that accumulated. Manual runs still get the 503
    // so the admin sees the real state.
    if (isAutomationRun && error instanceof NatiBlockedError) {
      console.warn(`[PUSH] Skipping automation run — Nati unavailable (${error.reason}), retry in ${error.retryAfterSec}s`);
      return Response.json({
        success: true,
        skipped: true,
        reason: error.reason,
        message: error.message,
        retry_after_seconds: error.retryAfterSec,
      });
    }
    return natiErrorResponse(error);
  }
});
// deployed 2026-07-15 v2 (automation runs skip gracefully during Nati host-block cooldown)
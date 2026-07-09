/**
 * fetchNatiAppeals — Direct MySQL query to Natid database
 * Admin-only. Supports filters: dep, callStatus, from_date, to_date, q, source (open/closed/all)
 *
 * Connection handling + circuit breaker live in ./_shared/natiDb.ts.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const appRole = await resolveAppRole(base44, user);
    if (!user || appRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dep = -1, callStatus = -1, dir = 'DESC', from_date, to_date, q, source = 'open' } = body;

    const allRows = await withNatiConnection(async (connection) => {
      const table = source === 'closed' ? 'call_closed_appeals' : 'call_open_appeals';
      let sql = `SELECT a.*, s.fullname as supplier_name FROM ${table} a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1`;
      const params = [];

      if (dep !== -1) { sql += ' AND a.department_id = ?'; params.push(dep); }
      if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
      if (from_date) { sql += ' AND a.date_added >= ?'; params.push(from_date); }
      if (to_date) { sql += ' AND a.date_added <= ?'; params.push(to_date); }
      if (q) {
        sql += ' AND (a.requester LIKE ? OR a.id LIKE ? OR a.tel LIKE ? OR a.car_num LIKE ?)';
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY a.date_added ${dir === 'ASC' ? 'ASC' : 'DESC'}`;

      const [rows] = await connection.query(sql, params);

      // If source is 'all', also query the closed table on the same connection.
      if (source === 'all') {
        let sql2 = `SELECT a.*, s.fullname as supplier_name FROM call_closed_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1`;
        const params2 = [];
        if (dep !== -1) { sql2 += ' AND a.department_id = ?'; params2.push(dep); }
        if (callStatus !== -1) { sql2 += ' AND a.status = ?'; params2.push(callStatus); }
        if (from_date) { sql2 += ' AND a.date_added >= ?'; params2.push(from_date); }
        if (to_date) { sql2 += ' AND a.date_added <= ?'; params2.push(to_date); }
        if (q) {
          sql2 += ' AND (a.requester LIKE ? OR a.id LIKE ? OR a.tel LIKE ? OR a.car_num LIKE ?)';
          const s2 = `%${q}%`;
          params2.push(s2, s2, s2, s2);
        }
        sql2 += ` ORDER BY a.date_added ${dir === 'ASC' ? 'ASC' : 'DESC'} LIMIT 5000`;
        const [closedRows] = await connection.query(sql2, params2);
        return [...rows, ...closedRows];
      }
      return rows;
    });

    return Response.json({ success: true, total: allRows.length, data: allRows });
  } catch (error) {
    console.error('fetchNatiAppeals error:', error);
    return natiErrorResponse(error);
  }
});
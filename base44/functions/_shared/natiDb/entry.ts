/**
 * Shared Nati MySQL access layer.
 *
 * Why this exists: the Nati RDS blocks any IP that accumulates more than
 * `max_connect_errors` (default 100) failed connection attempts, and Nati will
 * NOT raise that limit on their side. So the entire burden of staying under the
 * threshold is on us. Two things historically pushed us over it:
 *   1. An aggressive 5s connectTimeout — a momentary RDS slowdown counted as a
 *      failed connect. Raised to 20s here.
 *   2. No back-off — once blocked, background syncs kept hammering, and every
 *      attempt while blocked adds ANOTHER error, so Nati's manual FLUSH HOSTS
 *      relief evaporated within minutes.
 *
 * The single biggest source of failed connects turned out to be TLS: RDS
 * presents an Amazon-RDS-CA certificate that the Deno runtime doesn't trust, so
 * connections failed with "invalid peer certificate: UnknownIssuer" — each one
 * counting toward the block. See getDbConfig() for the ssl handling that fixes it.
 *
 * This module centralises connection handling and adds a Deno-KV-backed circuit
 * breaker shared across ALL Nati functions and warm/cold starts. When a connect
 * fails (and especially when Nati reports "Host is blocked"), we stop attempting
 * for a cooldown window instead of piling on more errors.
 */
import mysql from 'npm:mysql2@3.9.7/promise';

const CONNECT_TIMEOUT_MS = 20_000;

// Circuit-breaker tuning.
const GENERIC_FAIL_THRESHOLD = 3; // consecutive connect failures before backing off
const GENERIC_COOLDOWN_MS = 2 * 60_000; // 2 min after repeated transient failures
const BLOCKED_COOLDOWN_MS = 10 * 60_000; // 10 min once Nati reports "Host is blocked"
const CIRCUIT_KEY = ['nati_db', 'circuit'];

interface CircuitState {
  blockedUntil: number; // epoch ms; 0 = open (allowed)
  failures: number; // consecutive connect failures
  reason: string; // 'host_blocked' | 'connect_failures' | ''
}

const EMPTY_CIRCUIT: CircuitState = { blockedUntil: 0, failures: 0, reason: '' };

/** Thrown when the breaker is open (we refuse to connect) — never reaches MySQL. */
export class NatiBlockedError extends Error {
  retryAfterSec: number;
  reason: string;
  constructor(message: string, retryAfterSec: number, reason: string) {
    super(message);
    this.name = 'NatiBlockedError';
    this.retryAfterSec = retryAfterSec;
    this.reason = reason;
  }
}

// AWS RDS presents a TLS certificate signed by the Amazon RDS CA, which is NOT in
// the Deno runtime's default trust store. An otherwise-unconfigured connection
// that negotiates TLS therefore fails with "invalid peer certificate:
// UnknownIssuer" — and every such failure counts toward Nati's max_connect_errors
// block. This was the hidden, recurring root cause. We connect over TLS but skip
// CA verification: the channel is still encrypted, and access is already locked
// down by RDS IP allow-listing. (To pin the cert instead, set ssl.ca to the RDS
// CA bundle and rejectUnauthorized: true.)
function getDbConfig() {
  return {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: CONNECT_TIMEOUT_MS,
    ssl: { rejectUnauthorized: false },
  };
}

/** True when the error is Nati's "Host '...' is blocked because of many connection errors". */
export function isHostBlockedError(err: unknown): boolean {
  const e = err as { code?: string; errno?: number; message?: string };
  return (
    e?.code === 'ER_HOST_IS_BLOCKED' ||
    e?.errno === 1129 ||
    /blocked because of many connection errors/i.test(String(e?.message || ''))
  );
}

async function readCircuit(kv: Deno.Kv): Promise<CircuitState> {
  const entry = await kv.get<CircuitState>(CIRCUIT_KEY);
  return entry.value ?? EMPTY_CIRCUIT;
}

async function writeCircuit(kv: Deno.Kv, state: CircuitState): Promise<void> {
  await kv.set(CIRCUIT_KEY, state);
}

/**
 * Run `fn` against a fresh Nati MySQL connection, guarded by the circuit breaker.
 *
 * - If the breaker is open (cooldown active) we throw NatiBlockedError WITHOUT
 *   touching MySQL, so we add zero new connection errors.
 * - A successful connect resets the breaker.
 * - A failed connect records the failure; a "Host is blocked" failure opens the
 *   breaker for a long cooldown so we stop hammering.
 * - The connection is always closed, even on error.
 *
 * @param fn    receives the live connection, returns a result.
 * @param opts.force  bypass the cooldown (for an admin who knows Nati just ran
 *                    FLUSH HOSTS). Background automation must never set this.
 */
export async function withNatiConnection<T>(
  fn: (connection: mysql.Connection) => Promise<T>,
  opts: { force?: boolean } = {}
): Promise<T> {
  const config = getDbConfig();
  if (!config.host || !config.user || !config.password) {
    throw new Error('Missing NATID_DB_* secrets');
  }

  const kv = await Deno.openKv();
  const now = Date.now();
  const state = await readCircuit(kv);

  // Breaker open → refuse to connect (don't add more errors).
  if (!opts.force && state.blockedUntil > now) {
    const retryAfterSec = Math.ceil((state.blockedUntil - now) / 1000);
    const base =
      state.reason === 'host_blocked'
        ? 'נתי חסמו זמנית את הכתובת שלנו (Host is blocked) — צריך שמנהל ה-DB בצד של נתי יריץ FLUSH HOSTS.'
        : 'החיבור לנתי מושהה זמנית בגלל כשלי חיבור חוזרים.';
    throw new NatiBlockedError(
      `${base} כדי לא להחמיר את החסימה, ננסה שוב בעוד ${retryAfterSec} שניות.`,
      retryAfterSec,
      state.reason || 'cooldown'
    );
  }

  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    if (isHostBlockedError(err)) {
      await writeCircuit(kv, {
        blockedUntil: now + BLOCKED_COOLDOWN_MS,
        failures: (state.failures || 0) + 1,
        reason: 'host_blocked',
      });
      throw new NatiBlockedError(
        'נתי חסמו זמנית את הכתובת שלנו (Host is blocked). צריך שמנהל ה-DB בצד של נתי יריץ FLUSH HOSTS. ' +
          `עד אז עוצרים את הניסיונות ל-${Math.round(BLOCKED_COOLDOWN_MS / 60_000)} דקות כדי לא להחמיר.`,
        Math.ceil(BLOCKED_COOLDOWN_MS / 1000),
        'host_blocked'
      );
    }
    const failures = (state.failures || 0) + 1;
    await writeCircuit(kv, {
      blockedUntil: failures >= GENERIC_FAIL_THRESHOLD ? now + GENERIC_COOLDOWN_MS : 0,
      failures,
      reason: failures >= GENERIC_FAIL_THRESHOLD ? 'connect_failures' : '',
    });
    throw err;
  }

  // Connected — the IP is clearly not blocked, so reset the breaker.
  try {
    if (state.failures || state.blockedUntil) {
      await writeCircuit(kv, { ...EMPTY_CIRCUIT });
    }
    return await fn(connection);
  } finally {
    await connection.end().catch(() => {});
  }
}

// ========== SYNC STATUS (for the admin "last run" indicator) ==========

const LAST_RUN_KEY = ['nati_db', 'last_sync_run'];

export interface SyncRunStatus {
  at: string; // ISO timestamp
  ok: boolean;
  trigger: string; // 'automation' | 'manual'
  total_from_nati?: number;
  processed?: number;
  created?: number;
  updated?: number;
  errors?: number;
  error?: string | null;
}

/** Persist the outcome of a real (non-dry-run) sync. Never throws. */
export async function recordSyncRun(run: SyncRunStatus): Promise<void> {
  try {
    const kv = await Deno.openKv();
    await kv.set(LAST_RUN_KEY, run);
  } catch (_) {
    // Status recording must never break a sync.
  }
}

/** Read the last sync outcome + current circuit-breaker state for the UI. */
export async function getNatiStatus(): Promise<{
  lastRun: SyncRunStatus | null;
  circuit: { blocked: boolean; blockedUntil: number; reason: string; retryAfterSec: number };
}> {
  const kv = await Deno.openKv();
  const runEntry = await kv.get<SyncRunStatus>(LAST_RUN_KEY);
  const circuitEntry = await kv.get<CircuitState>(CIRCUIT_KEY);
  const c = circuitEntry.value ?? EMPTY_CIRCUIT;
  const now = Date.now();
  const blocked = c.blockedUntil > now;
  return {
    lastRun: runEntry.value ?? null,
    circuit: {
      blocked,
      blockedUntil: c.blockedUntil,
      reason: c.reason,
      retryAfterSec: blocked ? Math.ceil((c.blockedUntil - now) / 1000) : 0,
    },
  };
}

/** Map any Nati DB error to a clear Hebrew HTTP response. */
export function natiErrorResponse(err: unknown): Response {
  if (err instanceof NatiBlockedError) {
    return Response.json(
      { error: err.message, reason: err.reason, retry_after_seconds: err.retryAfterSec },
      { status: 503, headers: { 'Retry-After': String(err.retryAfterSec) } }
    );
  }
  if (isHostBlockedError(err)) {
    return Response.json(
      {
        error:
          'נתי חסמו זמנית את הכתובת שלנו (Host is blocked). צריך FLUSH HOSTS בצד של נתי.',
        reason: 'host_blocked',
      },
      { status: 503 }
    );
  }
  const message = (err as { message?: string })?.message || 'שגיאה לא ידועה';
  return Response.json({ error: message }, { status: 500 });
}

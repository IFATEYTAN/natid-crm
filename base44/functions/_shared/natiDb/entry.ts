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
 * This module centralises connection handling and adds a Deno-KV-backed circuit
 * breaker shared across ALL Nati functions and warm/cold starts. When a connect
 * fails (and especially when Nati reports "Host is blocked"), we stop attempting
 * for a cooldown window instead of piling on more errors.
 */
import mysql from 'npm:mysql2@3.9.7/promise';

// Single connection attempt, no SSL negotiation (RDS accepts plain on this
// host). mysql2 does not use TLS unless `ssl` is set, so we simply never set it.
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

function getDbConfig() {
  return {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: CONNECT_TIMEOUT_MS,
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

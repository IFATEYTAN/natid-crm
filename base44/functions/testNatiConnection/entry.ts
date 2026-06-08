/**
 * testNatiConnection — Tests direct MySQL connection to Natid DB
 * Admin only. Returns connection diagnostics + sample table list.
 *
 * Uses a SINGLE connection (via ./_shared/natiDb.ts) for both the ping and the
 * table list — every extra connection is one more chance to trip Nati's
 * max_connect_errors block. The shared circuit breaker also means that if we are
 * already in a cooldown, we report it instead of adding another failed connect.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { withNatiConnection, NatiBlockedError } from './_shared/natiDb.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  }

  const results: Record<string, unknown> = {
    config: {
      host: Deno.env.get('NATID_DB_HOST'),
      port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
      user: Deno.env.get('NATID_DB_USER'),
      database: Deno.env.get('NATID_DB_NAME'),
      has_password: !!Deno.env.get('NATID_DB_PASSWORD'),
    },
  };

  try {
    const data = await withNatiConnection(async (connection) => {
      const [ping] = await connection.query('SELECT 1 as test, NOW() as server_time');
      const [tables] = await connection.query('SHOW TABLES');
      return { ping: ping[0], tables: tables.map((t) => Object.values(t)[0]) };
    });
    results.test1_ssl = { status: 'OK', data: data.ping };
    results.test3_tables = { status: 'OK', tables: data.tables };
  } catch (e) {
    if (e instanceof NatiBlockedError) {
      results.test1_ssl = {
        status: 'COOLDOWN',
        error: e.message,
        retry_after_seconds: e.retryAfterSec,
        reason: e.reason,
      };
    } else {
      results.test1_ssl = { status: 'FAILED', error: (e as { message?: string })?.message };
    }
  }

  return Response.json(results, { status: 200 });
});

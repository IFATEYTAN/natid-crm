/**
 * closeStaleNatiCalls — Direct MySQL: Close calls/cases that are open locally
 * but no longer appear in call_open_appeals.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

const OPEN_CALL_STATUSES = [
  'waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute',
  'in_progress', 'vendor_arrived', 'future_service', 'in_followup',
  'in_storage', 'continued_treatment', 'awaiting_payment'
];
const OPEN_CASE_STATUSES = ['new', 'assigned', 'en_route', 'on_site', 'in_progress'];

function getDbConfig() {
  return {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: 15000,
    ssl: { rejectUnauthorized: false },
  };
}

async function getConnection() {
  const config = getDbConfig();
  if (!config.host || !config.user || !config.password) throw new Error('Missing NATID_DB_* secrets');
  try { return await mysql.createConnection(config); }
  catch (e) { const { ssl, ...noSsl } = config; return await mysql.createConnection(noSsl); }
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { limit = 30, dry_run = false } = body;

    // Step 1: Fetch ALL open appeal IDs from call_open_appeals
    console.log('[CLOSE] Fetching open appeal IDs from Nati DB...');
    const connection = await getConnection();
    const [natiRows] = await connection.query('SELECT id FROM call_open_appeals');
    await connection.end();

    const natiOpenIds = new Set(natiRows.map(r => String(r.id)));
    console.log(`[CLOSE] Nati has ${natiOpenIds.size} open appeals`);

    // Step 2: Load our open calls and cases
    const sdk = base44.asServiceRole;
    const [existingCalls, existingCases] = await Promise.all([
      sdk.entities.Call.filter({}),
      sdk.entities.Case.filter({}),
    ]);

    const staleCalls = existingCalls.filter(c =>
      c.call_number && OPEN_CALL_STATUSES.includes(c.call_status) && !natiOpenIds.has(c.call_number)
    );
    const staleCases = existingCases.filter(c =>
      c.case_number && OPEN_CASE_STATUSES.includes(c.status) && !natiOpenIds.has(c.case_number)
    );

    console.log(`[CLOSE] Found ${staleCalls.length} stale calls, ${staleCases.length} stale cases`);

    if (dry_run) {
      return Response.json({
        success: true, mode: 'dry_run',
        nati_open_count: natiOpenIds.size,
        stale_calls: staleCalls.length,
        stale_cases: staleCases.length,
        sample_stale_calls: staleCalls.slice(0, 5).map(c => ({
          id: c.id, call_number: c.call_number, status: c.call_status, customer: c.customer_name
        })),
        sample_stale_cases: staleCases.slice(0, 5).map(c => ({
          id: c.id, case_number: c.case_number, status: c.status, customer: c.customer_name
        })),
      });
    }

    // Step 3: Close stale records
    const callsToClose = staleCalls.slice(0, limit);
    const casesToClose = staleCases.slice(0, limit);
    let callsClosed = 0, casesClosed = 0, errors = 0;
    const now = new Date().toISOString();

    for (const call of callsToClose) {
      try {
        await sdk.entities.Call.update(call.id, {
          call_status: 'completed', closed_at: now,
          operator_notes: (call.operator_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
        });
        callsClosed++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`[CLOSE] Call ${call.call_number} error:`, e.message);
        errors++;
        if (e.message?.includes('Rate limit')) await new Promise(r => setTimeout(r, 5000));
      }
    }

    for (const cs of casesToClose) {
      try {
        await sdk.entities.Case.update(cs.id, {
          status: 'completed', completed_at: now, source_status: 'closed',
          internal_notes: (cs.internal_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
        });
        casesClosed++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`[CLOSE] Case ${cs.case_number} error:`, e.message);
        errors++;
        if (e.message?.includes('Rate limit')) await new Promise(r => setTimeout(r, 5000));
      }
    }

    const duration = Date.now() - startTime;
    return Response.json({
      success: true,
      nati_open_count: natiOpenIds.size,
      stale_calls_total: staleCalls.length,
      stale_cases_total: staleCases.length,
      calls_closed: callsClosed, cases_closed: casesClosed,
      remaining_stale_calls: staleCalls.length - callsClosed,
      remaining_stale_cases: staleCases.length - casesClosed,
      errors, duration_ms: duration,
    });
  } catch (error) {
    console.error('[CLOSE] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
/**
 * closeStaleNatiCalls — Close calls/cases that are open locally but 
 * no longer appear in Nati's open appeals list.
 * 
 * Runs separately from sync to avoid timeout issues.
 * Processes up to `limit` records per run (default 30).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const NATI_API_BASE = 'https://api.natid.co.il/api';

const OPEN_CALL_STATUSES = [
  'waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute',
  'in_progress', 'vendor_arrived', 'future_service', 'in_followup',
  'in_storage', 'continued_treatment', 'awaiting_payment'
];
const OPEN_CASE_STATUSES = ['new', 'assigned', 'en_route', 'on_site', 'in_progress'];

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

    // Get Nati API credentials
    const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
    const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();
    
    if (!JWT_TOKEN || !CLIENT_ID) {
      return Response.json({ error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets' }, { status: 500 });
    }

    // Step 1: Fetch ALL open appeals from Nati (no limit, we need the full list)
    console.log('[CLOSE] Fetching all open appeals from Nati...');
    const url = `${NATI_API_BASE}/get_appeals_list?dep=-1&callStatus=-1&dir=DESC`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 203) {
      return Response.json({ error: 'Nati auth failure' }, { status: 401 });
    }
    if (!response.ok) {
      return Response.json({ error: `Nati API error ${response.status}` }, { status: 502 });
    }

    const natiData = await response.json();
    if (!natiData.success || !natiData.data) {
      return Response.json({ error: 'Nati API unsuccessful' }, { status: 502 });
    }

    // Build set of ALL open appeal IDs from Nati
    const natiOpenIds = new Set(natiData.data.map(a => a.appeal_id));
    console.log(`[CLOSE] Nati has ${natiOpenIds.size} open appeals`);

    // Step 2: Load our open calls and cases
    const sdk = base44.asServiceRole;
    const [existingCalls, existingCases] = await Promise.all([
      sdk.entities.Call.filter({}),
      sdk.entities.Case.filter({}),
    ]);

    // Find open records that are NOT in Nati
    const staleCalls = existingCalls.filter(c => 
      c.call_number && OPEN_CALL_STATUSES.includes(c.call_status) && !natiOpenIds.has(c.call_number)
    );
    const staleCases = existingCases.filter(c => 
      c.case_number && OPEN_CASE_STATUSES.includes(c.status) && !natiOpenIds.has(c.case_number)
    );

    console.log(`[CLOSE] Found ${staleCalls.length} stale calls, ${staleCases.length} stale cases`);

    if (dry_run) {
      return Response.json({
        success: true,
        mode: 'dry_run',
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

    // Step 3: Close stale records (limited per run)
    const callsToClose = staleCalls.slice(0, limit);
    const casesToClose = staleCases.slice(0, limit);
    let callsClosed = 0, casesClosed = 0, errors = 0;
    const now = new Date().toISOString();

    // Close calls sequentially to avoid rate limits
    for (const call of callsToClose) {
      try {
        await sdk.entities.Call.update(call.id, { 
          call_status: 'completed',
          closed_at: now,
          operator_notes: (call.operator_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
        });
        callsClosed++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`[CLOSE] Call ${call.call_number} error:`, e.message);
        errors++;
        // On rate limit, wait longer
        if (e.message?.includes('Rate limit')) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    // Close cases sequentially
    for (const cs of casesToClose) {
      try {
        await sdk.entities.Case.update(cs.id, { 
          status: 'completed',
          completed_at: now,
          source_status: 'closed',
          internal_notes: (cs.internal_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
        });
        casesClosed++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`[CLOSE] Case ${cs.case_number} error:`, e.message);
        errors++;
        if (e.message?.includes('Rate limit')) {
          await new Promise(r => setTimeout(r, 5000));
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CLOSE] Done in ${duration}ms — closed ${callsClosed} calls, ${casesClosed} cases`);

    return Response.json({
      success: true,
      nati_open_count: natiOpenIds.size,
      stale_calls_total: staleCalls.length,
      stale_cases_total: staleCases.length,
      calls_closed: callsClosed,
      cases_closed: casesClosed,
      remaining_stale_calls: staleCalls.length - callsClosed,
      remaining_stale_cases: staleCases.length - casesClosed,
      errors,
      duration_ms: duration,
    });
  } catch (error) {
    console.error('[CLOSE] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
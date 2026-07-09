import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { syncCallStatus } from './_shared/syncCallStatus.ts';

/**
 * Operator/admin generic call-status update (e.g. moving a call to vendor_enroute,
 * in_progress, cancelled, or reactivating it back to waiting_treatment).
 *
 * CallDetails.jsx used to write Call.update() directly from the browser for these
 * transitions, which silently skipped mirroring the status onto WorkQueue/Case.
 *
 * NOT for closing statuses — those go through closeCall, which additionally applies
 * the closing rules (customer SMS, linked continuation call) on top of the same sync.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const appRole = await resolveAppRole(base44, user);
    if (!user || !['admin', 'operator'].includes(appRole)) {
      return Response.json(
        { error: 'Unauthorized - admin or operator role required' },
        { status: 403 }
      );
    }

    const { call_id, call_status, reason } = await req.json();
    if (!call_id || !call_status) {
      return Response.json({ error: 'call_id and call_status are required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    const updates: Record<string, any> = { call_status };
    if (call_status === 'completed') {
      updates.closed_at = new Date().toISOString();
    }
    if (call_status === 'waiting_treatment' && reason) {
      updates.closed_at = null;
      updates.closed_by = null;
    }

    await base44.asServiceRole.entities.Call.update(call_id, updates);

    const extraCaseUpdates: Record<string, any> = {};
    if (updates.closed_at) extraCaseUpdates.completed_at = updates.closed_at;
    await syncCallStatus(base44, call, call_status, extraCaseUpdates);

    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: call.call_number,
      change_type: 'status',
      old_value: call.call_status,
      new_value: call_status,
      changed_by: user.full_name || user.email || 'operator',
    });

    return Response.json({ success: true, call_status });
  } catch (error) {
    console.error('updateCallStatus error:', error);
    return Response.json({ error: 'Failed to update call status' }, { status: 500 });
  }
});

// ===== Inline app-role resolution (kept per-file: a NEW _shared module cannot be
// registered on this platform - its standalone deploy fails ISOLATE_INTERNAL_FAILURE and
// importers then fail with Module not found; see docs/LESSONS_LEARNED.md 2026-07-09) =====
const APP_ROLE_MAP: Record<string, string> = {
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  מנהל: 'admin',
  'מנהל מערכת': 'admin',
  מוקדן: 'operator',
  מתפעל: 'operator',
  'מנהל תפעול': 'operator',
  טכנאי: 'agent',
  'נציג שטח': 'agent',
  ספק: 'vendor',
  'ספק שירות': 'vendor',
  Vendor: 'vendor',
  'Vendor ': 'vendor',
};

// deno-lint-ignore no-explicit-any
async function resolveAppRole(base44: any, user: any): Promise<string | null> {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.role === 'vendor' || user.role === 'ספק') return 'vendor';
  if (APP_ROLE_MAP[user.role]) return APP_ROLE_MAP[user.role];
  try {
    let perms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: user.id });
    if (!perms.length && user.email) {
      perms = await base44.asServiceRole.entities.UserPermission.filter({
        user_email: user.email,
      });
    }
    const mapped = APP_ROLE_MAP[perms[0]?.role_name];
    if (mapped) return mapped;
  } catch (_) {
    // Permission lookup failed - fall through to the frontend-matching default.
  }
  return 'operator';
}
// ===== End inline app-role resolution =====

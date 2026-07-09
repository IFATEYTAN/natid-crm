import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * "הפעלת קריאה מחדש" (QA audit #109, requirement ג'): when a call was
 * rejected/stalled for a customer-side reason (e.g. needs to bring a credit
 * card, hasn't given a dropoff destination yet), resets the arrival-time
 * clock from the moment this is clicked instead of the call's original
 * open time. Operator/admin only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { call_id } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    if (['completed', 'cancelled'].includes(call.call_status)) {
      return Response.json(
        { error: 'לא ניתן להפעיל מחדש קריאה סגורה/מבוטלת' },
        { status: 409 }
      );
    }

    const reactivatedAt = new Date().toISOString();
    await base44.asServiceRole.entities.Call.update(call_id, { reactivated_at: reactivatedAt });

    await base44.asServiceRole.entities.CallHistory.create({
      call_id,
      call_number: call.call_number,
      change_type: 'status',
      notes: 'הקריאה הופעלה מחדש — טיימר ההגעה ללקוח אופס',
      changed_by: user.full_name || user.email || 'system',
    });

    return Response.json({ success: true, reactivated_at: reactivatedAt });
  } catch (error) {
    console.error('reactivateCall error:', error);
    return Response.json({ error: 'Failed to reactivate call' }, { status: 500 });
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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Fields a vendor is allowed to update on a call
const ALLOWED_VENDOR_FIELDS = [
  'call_status',
  'vendor_notes',
  'vendor_arrival_time_actual',
  'cannot_complete_reason',
  'closed_at',
  'closed_by',
];

// Valid status transitions for vendors.
// 'cannot_complete' is an intermediate state a vendor can report when they reached
// the site but cannot finish (e.g. locked underground parking, complex extraction).
// It hands the call back to the operator to decide on a continuation / reassignment.
const VENDOR_STATUS_TRANSITIONS = {
  assigning: ['vendor_enroute'],
  awaiting_assignment: ['vendor_enroute'],
  assigned: ['vendor_enroute'],
  vendor_enroute: ['vendor_arrived', 'in_progress', 'cannot_complete'],
  vendor_arrived: ['in_progress', 'cannot_complete'],
  in_progress: ['completed', 'cannot_complete'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id, updates } = await req.json();

    if (!call_id || !updates || typeof updates !== 'object') {
      return Response.json({ error: 'Missing call_id or updates' }, { status: 400 });
    }

    // Get the call
    const allCalls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!allCalls || allCalls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = allCalls[0];

    const appRole = await resolveAppRole(base44, user);

    // Ownership check: vendors can only update calls assigned to them
    if (appRole === 'vendor') {
      const vendorRecords = await base44.asServiceRole.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || call.assigned_vendor_id !== vendorRecords[0].id) {
        return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
      }
    } else if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    // Filter to allowed fields only (vendors can't change arbitrary fields)
    const sanitizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if ((appRole === 'vendor') && !ALLOWED_VENDOR_FIELDS.includes(key)) {
        continue; // Silently skip disallowed fields for vendors
      }
      sanitizedUpdates[key] = value;
    }

    // Validate status transitions for vendors
    if ((appRole === 'vendor') && sanitizedUpdates.call_status) {
      const currentStatus = call.call_status;
      const allowedNext = VENDOR_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(sanitizedUpdates.call_status)) {
        return Response.json({
          error: `Invalid status transition from ${currentStatus} to ${sanitizedUpdates.call_status}`,
        }, { status: 400 });
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Perform the update
    await base44.asServiceRole.entities.Call.update(call_id, sanitizedUpdates);

    // Mirror status onto WorkQueue + Case
    if (sanitizedUpdates.call_status) {
      const extraCaseUpdates: Record<string, any> = {};
      if (sanitizedUpdates.vendor_arrival_time_actual) {
        extraCaseUpdates.arrived_at = sanitizedUpdates.vendor_arrival_time_actual;
      }
      if (sanitizedUpdates.closed_at) {
        extraCaseUpdates.completed_at = sanitizedUpdates.closed_at;
      }
      await syncCallStatus(base44, call, sanitizedUpdates.call_status, extraCaseUpdates);
    }

    // When a vendor reports they cannot complete the call, log it and alert the desk
    // so an operator can open a continuation call or reassign.
    if (sanitizedUpdates.call_status === 'cannot_complete') {
      const reason = sanitizedUpdates.cannot_complete_reason || 'לא צוינה סיבה';
      const vendorName = call.assigned_vendor_name || 'ספק';
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: call.call_number,
        change_type: 'status',
        old_value: call.call_status,
        new_value: 'cannot_complete',
        notes: `הספק ${vendorName} דיווח שלא ניתן לטפל. סיבה: ${reason}`,
        changed_by: user?.email || 'system',
      });

      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      for (const op of [...admins, ...operators]) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: 'ספק לא יכול לטפל בקריאה',
          message: `הספק ${vendorName} דיווח שלא ניתן לטפל בקריאה ${call.call_number || call.id.substring(0, 8)}. סיבה: ${reason}`,
          type: 'warning',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call',
        });
      }
    }

    return Response.json({
      success: true,
      updated_fields: Object.keys(sanitizedUpdates),
    });

  } catch (error) {
    console.error('Error updating vendor call:', error);
    return Response.json({ error: 'Failed to update call' }, { status: 500 });
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

// ===== Inline call-status sync (kept per-file: re-saving a _shared module through the
// platform invalidates its deployment record and breaks every importer - see
// docs/LESSONS_LEARNED.md 2026-07-09) =====
// Call.call_status -> WorkQueue.queue_status
const QUEUE_STATUS_MAP: Record<string, string> = {
  waiting_treatment: 'waiting_in_queue',
  awaiting_assignment: 'waiting_in_queue',
  assigning: 'in_progress',
  vendor_enroute: 'in_progress',
  vendor_arrived: 'in_progress',
  in_progress: 'in_progress',
  cannot_complete: 'in_progress',
  completed: 'completed',
  cancelled: 'completed',
  in_storage: 'completed',
};

// Call.call_status -> Case.status
const CASE_STATUS_MAP: Record<string, string> = {
  assigning: 'assigned',
  vendor_enroute: 'en_route',
  vendor_arrived: 'on_site',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  in_storage: 'completed',
};

/**
 * Sync the WorkQueue item(s) and Case linked to a call to a new call_status.
 * Best-effort and non-throwing - status mirroring must never block the primary update.
 */
// deno-lint-ignore no-explicit-any
async function syncCallStatus(
  base44: any,
  call: any,
  newCallStatus: string,
  extraCaseUpdates: Record<string, any> = {}
) {
  const svc = base44.asServiceRole;
  try {
    const queueStatus = QUEUE_STATUS_MAP[newCallStatus];
    if (queueStatus) {
      const items = await svc.entities.WorkQueue.filter({ call_id: call.id });
      for (const item of items) {
        if (item.queue_status !== queueStatus) {
          const upd: Record<string, any> = { queue_status: queueStatus };
          if (queueStatus === 'completed' && !item.completed_at) {
            upd.completed_at = new Date().toISOString();
          }
          await svc.entities.WorkQueue.update(item.id, upd);
        }
      }
    }
  } catch (e) {
    console.error('syncCallStatus: WorkQueue sync failed', e);
  }
  try {
    const caseStatus = CASE_STATUS_MAP[newCallStatus];
    const caseUpdates: Record<string, any> = { ...extraCaseUpdates };
    if (caseStatus) caseUpdates.status = caseStatus;
    if (Object.keys(caseUpdates).length > 0 && call.call_number) {
      const cases = await svc.entities.Case.filter({ case_number: call.call_number });
      if (cases.length > 0) {
        await svc.entities.Case.update(cases[0].id, caseUpdates);
      }
    }
  } catch (e) {
    console.error('syncCallStatus: Case sync failed', e);
  }
}
// ===== End inline call-status sync =====

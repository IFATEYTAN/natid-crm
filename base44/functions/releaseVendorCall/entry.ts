import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { autoOfferCall } from './_shared/assignVendor.ts';

/**
 * Release a call back to the queue.
 *
 * A vendor (or an operator/admin on their behalf) can hand a call back mid-flow when
 * they cannot continue. The call is detached from the vendor, the vendor is freed,
 * and an automatic re-assignment to the next best vendor is attempted (excluding the
 * releasing vendor). If no vendor is found the call stays in 'awaiting_assignment'
 * for the operator to handle manually.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator', 'vendor'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    const { call_id, reason } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    if (!call.assigned_vendor_id) {
      return Response.json({ error: 'Call is not currently assigned to a vendor' }, { status: 400 });
    }

    // Ownership check: a vendor can only release a call assigned to them
    if (appRole === 'vendor') {
      const vendorRecords = await base44.asServiceRole.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || call.assigned_vendor_id !== vendorRecords[0].id) {
        return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
      }
    }

    const releasedVendorId = call.assigned_vendor_id;
    const releasedVendorName = call.assigned_vendor_name || 'ספק';
    const releaseReason = reason || 'לא צוינה סיבה';

    // Detach the call from the vendor and return it to the queue
    await base44.asServiceRole.entities.Call.update(call.id, {
      call_status: 'awaiting_assignment',
      assigned_vendor_id: null,
      assigned_vendor_name: null,
    });

    // Mirror status onto WorkQueue + Case
    await syncCallStatus(base44, call, 'awaiting_assignment');

    // Free the vendor
    const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: releasedVendorId });
    if (vendors?.[0]) {
      await base44.asServiceRole.entities.Vendor.update(vendors[0].id, {
        availability_status: 'available',
      });
    }

    // Log to call history
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: call.call_number,
      change_type: 'status',
      old_value: call.call_status,
      new_value: 'awaiting_assignment',
      notes: `הספק ${releasedVendorName} החזיר את הקריאה לשיבוץ מחדש. סיבה: ${releaseReason}`,
      changed_by: user?.email || 'system',
    });

    // Notify operators/admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
    for (const op of [...admins, ...operators]) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: op.id,
        title: 'ספק החזיר קריאה',
        message: `הספק ${releasedVendorName} החזיר את קריאה ${call.call_number || call.id.substring(0, 8)} לשיבוץ מחדש. סיבה: ${releaseReason}`,
        type: 'warning',
        is_read: false,
        link: `/CallDetails?id=${call.id}`,
        related_entity_id: call.id,
        related_entity_type: 'call',
      });
    }

    // Attempt automatic re-assignment to the next best vendor, excluding the releasing
    // vendor and any vendor that previously declined this call.
    const previousAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
      call_id: call.id,
      status: 'declined',
    });
    const excludeVendorIds = [
      ...new Set([releasedVendorId, ...previousAttempts.map((a) => a.vendor_id)]),
    ];

    let nextRecommendation = null;
    try {
      const offer = await autoOfferCall(base44, { ...call, call_status: 'awaiting_assignment', assigned_vendor_id: null }, excludeVendorIds);
      if (offer.success && offer.recommendation) {
        nextRecommendation = offer.recommendation;
        // Mirror the 'assigning' status onto WorkQueue + Case
        await syncCallStatus(base44, call, 'assigning');
      }
    } catch (e) {
      console.error('releaseVendorCall: auto re-assign failed', e);
    }

    return Response.json({
      success: true,
      message: 'Call released back to queue',
      next_recommendation: nextRecommendation,
    });
  } catch (error) {
    console.error('Error releasing vendor call:', error);
    return Response.json({ error: 'Failed to release call' }, { status: 500 });
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

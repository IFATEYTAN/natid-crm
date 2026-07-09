import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { getBusyVendorIds, commitVendorAssignment, hasActivePendingAttemptForCall } from './_shared/assignVendor.ts';

/**
 * Assign a SPECIFIC vendor to a call as an offer (offer + accept model).
 *
 * Used by the operator's AssignVendorDialog (manual pick and after an auto recommendation).
 * Creates a pending CallAssignmentAttempt, moves the call to 'assigning', and notifies the
 * vendor (in-app + SMS). The vendor then accepts/declines via handleAssignmentResponse.
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

    const { call_id, vendor_id } = await req.json();
    if (!call_id || !vendor_id) {
      return Response.json({ error: 'call_id and vendor_id are required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Don't re-offer a call that is already being actively handled
    if (call.assigned_vendor_id && ['vendor_enroute', 'in_progress'].includes(call.call_status)) {
      return Response.json(
        {
          success: false,
          error: 'Call already assigned to a vendor',
          assigned_vendor_name: call.assigned_vendor_name,
        },
        { status: 409 }
      );
    }

    // Don't create a second offer while one is already pending on this call — the
    // earlier vendor's offer would otherwise be silently orphaned (still shown to
    // them, still acceptable) while assigned_vendor_id gets overwritten underneath it.
    if (await hasActivePendingAttemptForCall(base44, call_id)) {
      return Response.json(
        { success: false, error: 'Call already has a pending assignment offer' },
        { status: 409 }
      );
    }

    const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendor_id });
    const vendor = vendors?.[0];
    if (!vendor) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Duplicate prevention: the chosen vendor must be available and not already occupied
    if (vendor.availability_status && vendor.availability_status !== 'available') {
      return Response.json(
        { success: false, error: 'Vendor is not available', availability: vendor.availability_status },
        { status: 409 }
      );
    }
    const busy = await getBusyVendorIds(base44, call_id);
    if (busy.has(vendor_id)) {
      return Response.json(
        { success: false, error: 'Vendor is already handling another call or has a pending offer' },
        { status: 409 }
      );
    }

    const attempt = await commitVendorAssignment(base44, { call, vendor });

    // Mirror the 'assigning' status onto WorkQueue + Case
    await syncCallStatus(base44, call, 'assigning');

    // History entry for the offer
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: call.call_number,
      change_type: 'vendor_assignment',
      new_value: vendor.vendor_name,
      notes: `הוצעה קריאה לספק ${vendor.vendor_name} (ממתין לאישור)`,
      changed_by: user?.email || 'operator',
    });

    return Response.json({
      success: true,
      attempt_id: attempt.id,
      expires_at: attempt.expires_at,
      vendor_name: vendor.vendor_name,
    });
  } catch (error) {
    console.error('assignVendorToCall error:', error);
    return Response.json({ error: 'Failed to assign vendor' }, { status: 500 });
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
// ===== End inline call-status sync ===== (redeploy)

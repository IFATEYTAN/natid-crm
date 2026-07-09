import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { autoOfferCall } from './_shared/assignVendor.ts';

/**
 * Scheduled job: handle assignment offers that vendors did not accept in time.
 *
 * Business rules (configured with the operations team):
 *   - A vendor has REASSIGN_AFTER_MIN (10) minutes to accept an offer
 *     (enforced via CallAssignmentAttempt.expires_at set by autoAssignVendor).
 *   - When an offer expires without acceptance, the call is reassigned to the
 *     next-best available vendor (excluding everyone who already passed on it).
 *   - If the call is still unaccepted ESCALATE_AFTER_MIN (30) minutes after the
 *     first offer, it is pushed into the operations queue (awaiting_assignment)
 *     with a prominent alert for admins/operators.
 *
 * Invoke on a short schedule (every 1-2 minutes) via the platform scheduler.
 * Auth: allows unauthenticated scheduled/cron runs, or admin/operator users.
 */

const ESCALATE_AFTER_MIN = 30; // total minutes before handing to the ops queue

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cron runs have no user; manual runs must be admin/operator.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    const appRole = user ? await resolveAppRole(base44, user) : null;
    if (user && !['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const now = Date.now();

    // 1. Find pending offers that have passed their expiry.
    const pending = await svc.entities.CallAssignmentAttempt.filter({ status: 'pending' });
    const expired = pending.filter((a) => a.expires_at && new Date(a.expires_at).getTime() < now);

    const results = { expired: 0, reassigned: 0, escalated: 0, skipped: 0 };

    // Group expired offers by call.
    const byCall = {};
    for (const a of expired) {
      (byCall[a.call_id] = byCall[a.call_id] || []).push(a);
    }

    for (const callId of Object.keys(byCall)) {
      // Mark the expired offers.
      for (const a of byCall[callId]) {
        await svc.entities.CallAssignmentAttempt.update(a.id, { status: 'expired' });
        results.expired++;
      }

      const calls = await svc.entities.Call.filter({ id: callId });
      const call = calls[0];
      if (!call) {
        results.skipped++;
        continue;
      }

      // Only act on calls still in the assignment phase. If a vendor already
      // accepted (vendor_enroute/in_progress/...) or it was cancelled, leave it.
      if (!['assigning', 'awaiting_assignment', 'waiting_treatment'].includes(call.call_status)) {
        results.skipped++;
        continue;
      }

      const allAttempts = await svc.entities.CallAssignmentAttempt.filter({ call_id: callId });

      // If there is already a fresh (non-expired) pending offer, it's actively
      // being offered — don't touch it.
      const hasActiveOffer = allAttempts.some(
        (a) => a.status === 'pending' && a.expires_at && new Date(a.expires_at).getTime() >= now
      );
      if (hasActiveOffer) {
        results.skipped++;
        continue;
      }

      const excludeVendorIds = [...new Set(allAttempts.map((a) => a.vendor_id))];
      const earliest = allAttempts.reduce(
        (min, a) => Math.min(min, new Date(a.created_date).getTime()),
        now
      );
      const elapsedMin = (now - earliest) / 60000;

      if (elapsedMin >= ESCALATE_AFTER_MIN) {
        await escalateToOps(svc, call, elapsedMin);
        results.escalated++;
        continue;
      }

      // Try to offer the call to the next-best available vendor (shared module:
      // creates a fresh offer + notifies the vendor in-app + SMS).
      const offer = await autoOfferCall(base44, call, excludeVendorIds);
      if (offer.success) {
        // Mirror the 'assigning' status onto WorkQueue + Case
        await syncCallStatus(base44, call, 'assigning');
        await svc.entities.CallHistory.create({
          call_id: call.id,
          call_number: call.call_number || '',
          change_type: 'note',
          notes: `שיבוץ אוטומטי מחדש (ההצעה הקודמת פגה) לספק ${offer.recommendation?.vendor_name || ''}`,
          changed_by: 'מערכת',
        });
        results.reassigned++;
      } else {
        await escalateToOps(svc, call, elapsedMin, true);
        results.escalated++;
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('processStaleAssignments error:', error);
    return Response.json({ error: 'Failed to process stale assignments' }, { status: 500 });
  }
});

// ---- Escalation to the operations queue -----------------------------------

async function escalateToOps(svc, call, elapsedMin, noVendors = false) {
  await svc.entities.Call.update(call.id, {
    call_status: 'awaiting_assignment',
    assigned_vendor_id: null,
    assigned_vendor_name: null,
  });
  await syncCallStatus({ asServiceRole: svc }, call, 'awaiting_assignment');

  const reason = noVendors
    ? 'לא נמצא ספק זמין נוסף'
    : `לא אושרה ע"י אף ספק ${Math.round(elapsedMin)} דקות`;

  await svc.entities.CallHistory.create({
    call_id: call.id,
    call_number: call.call_number || '',
    change_type: 'note',
    notes: `הקריאה הוחזרה לתור התפעול לשיבוץ ידני (${reason})`,
    changed_by: 'מערכת',
  });

  const admins = await svc.entities.User.filter({ role: 'admin' });
  const operators = await svc.entities.User.filter({ role: 'operator' });
  for (const op of [...admins, ...operators]) {
    await svc.entities.Notification.create({
      user_id: op.id,
      title: '🚨 קריאה דורשת שיבוץ ידני',
      message: `קריאה ${call.call_number || call.id.substring(0, 8)} (${reason}) — בתור התפעול וממתינה לשיבוץ ידני.`,
      type: 'error',
      is_read: false,
      link: `/CallDetails?id=${call.id}`,
      related_entity_id: call.id,
      related_entity_type: 'call',
    });
  }
}

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

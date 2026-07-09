import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate
import { autoOfferCall } from './_shared/assignVendor.ts';
import { syncCallStatus } from './_shared/syncCallStatus.ts';

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


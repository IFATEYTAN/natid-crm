import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';
import { autoOfferCall } from './_shared/assignVendor.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * Handle vendor response to assignment (accept/decline)
 * If declined, automatically find next best vendor
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only vendors (and admins for override) can respond to assignments
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'vendor'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - vendor role required' }, { status: 403 });
    }

    const rl = await limiter.check('handleAssignment', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const {
      attempt_id,
      action, // 'accept' | 'decline'
      decline_reason
    } = await req.json();

    if (!attempt_id || !action) {
      return Response.json({ error: 'attempt_id and action are required' }, { status: 400 });
    }

    // Get the assignment attempt
    const attempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({ id: attempt_id });
    if (!attempts || attempts.length === 0) {
      return Response.json({ error: 'Assignment attempt not found' }, { status: 404 });
    }
    const attempt = attempts[0];

    // Ownership check: vendors can only respond to their own assignments
    if (appRole === 'vendor') {
      const vendorRecords = await base44.asServiceRole.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || vendorRecords[0].id !== attempt.vendor_id) {
        return Response.json({ error: 'Forbidden - this assignment belongs to another vendor' }, { status: 403 });
      }
    }

    // Check if already processed
    if (attempt.status !== 'pending') {
      return Response.json({ 
        error: 'Assignment already processed', 
        status: attempt.status 
      }, { status: 400 });
    }

    // Check if expired
    if (new Date(attempt.expires_at) < new Date()) {
      await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
        status: 'expired'
      });
      return Response.json({ error: 'Assignment offer expired' }, { status: 400 });
    }

    // Get the call
    const calls = await base44.asServiceRole.entities.Call.filter({ id: attempt.call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    if (action === 'accept') {
      // Race condition check: verify call hasn't been assigned to another vendor
      if (call.assigned_vendor_id && ['vendor_enroute', 'in_progress'].includes(call.call_status)) {
        await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
          status: 'expired',
          decline_reason: 'קריאה כבר שובצה לספק אחר'
        });
        return Response.json({
          success: false,
          error: 'Call already assigned to another vendor',
          assigned_vendor_name: call.assigned_vendor_name
        }, { status: 409 });
      }

      // Duplicate prevention: a vendor cannot accept this call while already handling
      // another active call (guards against being offered two calls at once).
      const ACTIVE_CALL_STATUSES = ['vendor_enroute', 'vendor_arrived', 'in_progress'];
      const vendorActiveGroups = await Promise.all(
        ACTIVE_CALL_STATUSES.map(s =>
          base44.asServiceRole.entities.Call.filter({ assigned_vendor_id: attempt.vendor_id, call_status: s })
        )
      );
      const vendorOtherActive = vendorActiveGroups.flat().filter(c => c.id !== call.id);
      if (vendorOtherActive.length > 0) {
        await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
          status: 'expired',
          decline_reason: 'הספק כבר מטפל בקריאה פעילה אחרת'
        });
        return Response.json({
          success: false,
          error: 'Vendor already handling another active call',
          active_call_id: vendorOtherActive[0].id
        }, { status: 409 });
      }

      // Narrow the accept race: re-check the attempt is still pending right before
      // committing (best-effort — the SDK has no atomic compare-and-swap update, so
      // this shrinks the concurrent-accept window but doesn't eliminate it entirely).
      const recheck = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({ id: attempt_id });
      if (!recheck.length || recheck[0].status !== 'pending') {
        return Response.json({
          error: 'Assignment already processed',
          status: recheck[0]?.status
        }, { status: 400 });
      }

      // Update attempt status
      const responseTime = Math.round((Date.now() - new Date(attempt.created_date).getTime()) / 1000);
      await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
        status: 'accepted',
        response_time_seconds: responseTime
      });

      // Get vendor details
      const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: attempt.vendor_id });
      const vendor = vendors?.[0];

      // Update call with assigned vendor
      await base44.asServiceRole.entities.Call.update(call.id, {
        call_status: 'vendor_enroute',
        assigned_vendor_id: attempt.vendor_id,
        assigned_vendor_name: vendor?.vendor_name,
        assigned_at: new Date().toISOString()
      });

      // Mirror status onto WorkQueue + Case
      await syncCallStatus(base44, call, 'vendor_enroute');

      // Update vendor status to busy
      if (vendor) {
        await base44.asServiceRole.entities.Vendor.update(vendor.id, {
          availability_status: 'busy',
          total_calls_assigned: (vendor.total_calls_assigned || 0) + 1
        });
      }

      // Log to call history
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: call.call_number,
        change_type: 'vendor_assignment',
        new_value: vendor?.vendor_name,
        notes: `ספק ${vendor?.vendor_name} אישר את הקריאה`,
        changed_by: user?.email || 'system'
      });

      // Fetch admins and operators for notifications
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      const notifyUsers = [...admins, ...operators];

      for (const op of notifyUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: 'ספק אישר קריאה',
          message: `הספק ${vendor?.vendor_name} אישר את קריאה ${call.call_number || call.id.substring(0,8)}`,
          type: 'success',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call'
        });
      }

      return Response.json({
        success: true,
        action: 'accepted',
        message: 'Assignment accepted successfully'
      });

    } else if (action === 'decline') {
      // Update attempt status
      const responseTime = Math.round((Date.now() - new Date(attempt.created_date).getTime()) / 1000);
      await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
        status: 'declined',
        decline_reason: decline_reason || 'לא צוינה סיבה',
        response_time_seconds: responseTime
      });

      // Log to call history
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: call.call_number,
        change_type: 'note',
        notes: `ספק דחה את הקריאה. סיבה: ${decline_reason || 'לא צוינה'}`,
        changed_by: user?.email || 'system'
      });

      // Fetch admins and operators for notifications
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      const notifyUsers = [...admins, ...operators];
      const vendorName = (await base44.asServiceRole.entities.Vendor.filter({ id: attempt.vendor_id }))[0]?.vendor_name || 'ספק';

      for (const op of notifyUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: 'ספק דחה קריאה',
          message: `הספק ${vendorName} דחה את קריאה ${call.call_number || call.id.substring(0,8)}. סיבה: ${decline_reason || 'לא צוינה'}`,
          type: 'warning',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call'
        });
      }

      // Get all previous declined vendors for this call
      const previousAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
        call_id: call.id,
        status: 'declined'
      });
      const excludeVendorIds = previousAttempts.map(a => a.vendor_id);

      // Try to offer the call to the next best vendor (direct, service-role)
      const offer = await autoOfferCall(base44, call, excludeVendorIds);

      if (offer.success && offer.recommendation) {
        // Mirror the 'assigning' status onto WorkQueue + Case
        await syncCallStatus(base44, call, 'assigning');

        return Response.json({
          success: true,
          action: 'declined',
          message: 'Assignment declined, offered to alternative vendor',
          next_recommendation: offer.recommendation
        });
      } else {
        // No more vendors available - update call status
        await base44.asServiceRole.entities.Call.update(call.id, {
          call_status: 'awaiting_assignment'
        });
        await syncCallStatus(base44, call, 'awaiting_assignment');

        return Response.json({
          success: true,
          action: 'declined',
          message: 'Assignment declined, no alternative vendors available',
          next_recommendation: null
        });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Handle assignment error:', error);
    return Response.json({ error: 'Failed to handle assignment response' }, { status: 500 });
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

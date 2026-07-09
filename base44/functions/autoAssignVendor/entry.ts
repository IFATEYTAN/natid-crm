import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';
import { pickBestVendor, commitVendorAssignment, hasActivePendingAttemptForCall } from './_shared/assignVendor.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * Recommend (and optionally offer) the optimal vendor for a call.
 *
 * Default: advisory — returns the best vendor + ETA WITHOUT creating an offer (used by
 * the operator dialog to preview before committing). Pass { commit: true } to also
 * create the offer (CallAssignmentAttempt) and notify the vendor.
 *
 * Note: re-assignment flows (decline / release / bot) call the shared module directly
 * with a service-role client rather than invoking this endpoint, to avoid auth ambiguity.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    const appRole = await resolveAppRole(base44, user);
    if (!user || !['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
    }

    const rl = await limiter.check('autoAssignVendor', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { call_id, exclude_vendor_ids = [], commit = false } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Duplicate assignment prevention: call already actively handled
    if (call.assigned_vendor_id && ['vendor_enroute', 'in_progress'].includes(call.call_status)) {
      return Response.json({
        success: false,
        error: 'Call already assigned to a vendor',
        assigned_vendor_id: call.assigned_vendor_id,
        assigned_vendor_name: call.assigned_vendor_name,
      });
    }

    // Existing pending (non-expired) offer for this call
    if (await hasActivePendingAttemptForCall(base44, call_id)) {
      return Response.json({
        success: false,
        error: 'Call has a pending assignment attempt',
      });
    }

    const { top, scoredVendors } = await pickBestVendor(base44, call, exclude_vendor_ids);
    if (!top) {
      return Response.json({ success: false, error: 'No available vendors', recommendation: null });
    }

    // ETA via OSRM (fallback to distance-based estimate)
    let estimatedMinutes = top.details.distance_km
      ? Math.round(top.details.distance_km * 2) + 10
      : 30;
    const topVendor = top.vendor;
    if (
      topVendor.current_latitude &&
      topVendor.current_longitude &&
      call.pickup_location_lat &&
      call.pickup_location_lon
    ) {
      try {
        const osrmUrl =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${topVendor.current_longitude},${topVendor.current_latitude};` +
          `${call.pickup_location_lon},${call.pickup_location_lat}?overview=false`;
        const osrmResponse = await fetch(osrmUrl, { signal: AbortSignal.timeout(5000) });
        if (osrmResponse.ok) {
          const osrmData = await osrmResponse.json();
          if (osrmData.code === 'Ok' && osrmData.routes?.[0]) {
            estimatedMinutes = Math.round(osrmData.routes[0].duration / 60) + 5;
            top.details.route_distance_km = Math.round((osrmData.routes[0].distance / 1000) * 10) / 10;
            top.details.eta_source = 'osrm';
          }
        }
      } catch (osrmError) {
        console.log('OSRM routing failed, using fallback ETA:', osrmError.message);
        top.details.eta_source = 'fallback';
      }
    }

    // Optionally commit the offer (create attempt + notify). Default is advisory only.
    let attempt = null;
    if (commit) {
      attempt = await commitVendorAssignment(base44, {
        call,
        vendor: top.vendor,
        score: top.score,
        distanceKm: top.details.distance_km,
      });
      // Mirror the 'assigning' status onto WorkQueue + Case
      await syncCallStatus(base44, call, 'assigning');
    }

    return Response.json({
      success: true,
      committed: !!commit,
      recommendation: {
        vendor_id: top.vendor.id,
        vendor_name: top.vendor.vendor_name,
        vendor_phone: top.vendor.phone,
        score: top.score,
        details: top.details,
        estimated_arrival_minutes: estimatedMinutes,
        attempt_id: attempt?.id || null,
        expires_at: attempt?.expires_at || null,
      },
      alternatives: scoredVendors.slice(1, 4).map((sv) => ({
        vendor_id: sv.vendor.id,
        vendor_name: sv.vendor.vendor_name,
        score: sv.score,
        details: sv.details,
      })),
    });
  } catch (error) {
    console.error('Auto-assign error:', error);
    return Response.json({ error: 'Failed to auto-assign vendor' }, { status: 500 });
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

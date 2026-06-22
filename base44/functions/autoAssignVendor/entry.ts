import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';
import { pickBestVendor, commitVendorAssignment } from './_shared/assignVendor.ts';

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
    if (!user || !['admin', 'operator'].includes(user.role)) {
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
    const pendingAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
      call_id,
      status: 'pending',
    });
    const activePending = pendingAttempts.filter((a) => new Date(a.expires_at) > new Date());
    if (activePending.length > 0) {
      return Response.json({
        success: false,
        error: 'Call has a pending assignment attempt',
        pending_vendor_id: activePending[0].vendor_id,
        expires_at: activePending[0].expires_at,
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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
    if (user && !['admin', 'operator'].includes(user.role)) {
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

      // Try to reassign to the next-best available vendor.
      const next = await pickNextVendor(svc, call, excludeVendorIds);
      if (next) {
        await reassign(svc, call, next, now);
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

// ---- Reassignment ---------------------------------------------------------

async function reassign(svc, call, scored, now) {
  const vendor = scored.vendor;
  const expiresAt = new Date(now + 10 * 60 * 1000); // 10-minute acceptance window

  await svc.entities.CallAssignmentAttempt.create({
    call_id: call.id,
    vendor_id: vendor.id,
    status: 'pending',
    score: scored.score,
    distance_km: scored.distance_km,
    expires_at: expiresAt.toISOString(),
  });

  await svc.entities.Call.update(call.id, {
    assigned_vendor_id: vendor.id,
    assigned_vendor_name: vendor.vendor_name,
    assigned_vendor_area: call.pickup_location_area || null,
    assigned_at: new Date(now).toISOString(),
    call_status: 'assigning',
    estimated_distance_km: scored.distance_km ?? call.estimated_distance_km,
  });

  await svc.entities.CallHistory.create({
    call_id: call.id,
    call_number: call.call_number || '',
    change_type: 'note',
    notes: `שיבוץ אוטומטי מחדש (ההצעה הקודמת פגה) לספק ${vendor.vendor_name}`,
    changed_by: 'מערכת',
  });
}

// ---- Escalation to the operations queue -----------------------------------

async function escalateToOps(svc, call, elapsedMin, noVendors = false) {
  await svc.entities.Call.update(call.id, {
    call_status: 'awaiting_assignment',
    assigned_vendor_id: null,
    assigned_vendor_name: null,
  });

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

// ---- Vendor selection (mirrors autoAssignVendor scoring) ------------------
// NOTE: kept in sync with autoAssignVendor/entry.ts. If the scoring there
// changes, update it here too (or extract to a shared module).

async function pickNextVendor(svc, call, excludeVendorIds) {
  const allVendors = await svc.entities.Vendor.filter({ is_active: true });
  const available = allVendors.filter(
    (v) => v.availability_status === 'available' && !excludeVendorIds.includes(v.id)
  );
  if (available.length === 0) return null;

  const serviceCategoryMap = {
    towing: ['tow_truck', 'multi_service'],
    towing_storage: ['tow_truck', 'multi_service'],
    towing_mobile: ['tow_truck', 'mechanic', 'multi_service'],
    mobile_unit: ['mechanic', 'multi_service'],
    storage_only: ['tow_truck', 'multi_service'],
    other: ['multi_service', 'tow_truck'],
  };
  const issueTypeMap = {
    mechanical: ['mechanic', 'multi_service'],
    stopped_driving: ['tow_truck', 'multi_service'],
    flat_tire: ['tire_service', 'tow_truck', 'multi_service'],
    stuck_wheel: ['tow_truck', 'multi_service'],
    accident: ['tow_truck', 'multi_service'],
    no_fuel: ['fuel_delivery', 'multi_service'],
    dead_battery: ['mechanic', 'multi_service'],
    locked_keys: ['locksmith', 'multi_service'],
    other: ['multi_service', 'tow_truck'],
  };
  const neededServices =
    serviceCategoryMap[call.service_category] || issueTypeMap[call.issue_type] || ['tow_truck'];

  const scored = available.map((vendor) => {
    let score = 0;
    let distance_km = null;

    if (
      vendor.current_latitude &&
      vendor.current_longitude &&
      call.pickup_location_lat &&
      call.pickup_location_lon
    ) {
      const d = calculateDistance(
        vendor.current_latitude,
        vendor.current_longitude,
        call.pickup_location_lat,
        call.pickup_location_lon
      );
      distance_km = Math.round(d * 10) / 10;
      if (d <= 5) score += 40;
      else if (d <= 10) score += 35;
      else if (d <= 20) score += 25;
      else if (d <= 30) score += 15;
      else if (d <= 50) score += 10;
      else score += 5;
    } else if (vendor.coverage_areas?.includes(call.pickup_location_area)) {
      score += 25;
    }

    if (neededServices.some((s) => (vendor.service_type || []).includes(s))) score += 20;
    if (vendor.average_rating) score += (vendor.average_rating / 5) * 20;
    if (vendor.average_response_time) {
      if (vendor.average_response_time <= 10) score += 10;
      else if (vendor.average_response_time <= 20) score += 8;
      else if (vendor.average_response_time <= 30) score += 6;
      else if (vendor.average_response_time <= 45) score += 4;
      else score += 2;
    }
    if (vendor.completion_rate) score += (vendor.completion_rate / 100) * 10;
    if (call.vehicle_type && vendor.vehicle_types_supported?.includes(call.vehicle_type)) score += 5;

    const active = vendor.total_calls_assigned || 0;
    if (active < 3) score += 5;
    else if (active < 5) score += 2;
    else if (active > 10) score -= 5;

    return { vendor, score: Math.round(score), distance_km };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
// ===== End inline app-role resolution ===== (redeploy)

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

// ===== Inline _shared/rateLimit (kept per-file: shared-module bundling is broken
// platform-wide for new deployments - see docs/LESSONS_LEARNED.md 2026-07-09) =====
/**
 * Deno KV-based rate limiter for serverless functions.
 * Uses sliding window counters for per-key rate limiting.
 *
 * Usage:
 *   const kv = await Deno.openKv();
 *   const limiter = createRateLimiter(kv);
 *   const result = await limiter.check('sms', userId, 10, 60_000); // 10 per minute
 *   if (!result.allowed) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function createRateLimiter(kv: Deno.Kv) {
  return {
    /**
     * Check and consume a rate limit token.
     * @param prefix - Category prefix (e.g., 'sms', 'webhook', 'maps')
     * @param key - Unique identifier (user ID, IP address, phone number)
     * @param maxRequests - Maximum requests allowed in the window
     * @param windowMs - Time window in milliseconds
     */
    async check(
      prefix: string,
      key: string,
      maxRequests: number,
      windowMs: number
    ): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = now - windowMs;
      const kvKey = ['rate_limit', prefix, key];

      // Get current window data
      const entry = await kv.get<{ timestamps: number[] }>(kvKey);
      const timestamps = (entry.value?.timestamps || []).filter(
        (t) => t > windowStart
      );

      if (timestamps.length >= maxRequests) {
        const oldestInWindow = timestamps[0];
        return {
          allowed: false,
          remaining: 0,
          resetAt: oldestInWindow + windowMs,
        };
      }

      // Add current request timestamp
      timestamps.push(now);
      await kv.set(kvKey, { timestamps }, { expireIn: windowMs });

      return {
        allowed: true,
        remaining: maxRequests - timestamps.length,
        resetAt: now + windowMs,
      };
    },

    /**
     * Get daily counter for quota monitoring (e.g., Google Maps API).
     * @param prefix - Category prefix
     * @returns Current daily count
     */
    async getDailyCount(prefix: string): Promise<number> {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const kvKey = ['daily_count', prefix, today];
      const entry = await kv.get<{ count: number }>(kvKey);
      return entry.value?.count || 0;
    },

    /**
     * Increment daily counter.
     */
    async incrementDaily(prefix: string): Promise<number> {
      const today = new Date().toISOString().slice(0, 10);
      const kvKey = ['daily_count', prefix, today];
      const entry = await kv.get<{ count: number }>(kvKey);
      const newCount = (entry.value?.count || 0) + 1;
      // Expire after 48 hours to auto-cleanup
      await kv.set(kvKey, { count: newCount }, { expireIn: 48 * 60 * 60 * 1000 });
      return newCount;
    },
  };
}

/**
 * Extract client IP from request headers (for webhook rate limiting).
 */
function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Build a standard 429 response with rate limit headers.
 */
function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: 'Too many requests - please try again later',
      retry_after_seconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
// ===== End inline _shared/rateLimit =====

// ===== Inline _shared/assignVendor (kept per-file: shared-module bundling is broken
// platform-wide for new deployments - see docs/LESSONS_LEARNED.md 2026-07-09) =====
/**
 * Shared vendor-assignment core.
 *
 * Single source of truth for: vendor scoring, "is this vendor busy" detection, and
 * committing an assignment as an OFFER (CallAssignmentAttempt) + notifying the vendor.
 *
 * Called directly (with a service-role base44 client) by autoAssignVendor,
 * assignVendorToCall, handleAssignmentResponse, releaseVendorCall and the bot — this
 * avoids cross-function HTTP auth ambiguity (the caller already holds the right context).
 *
 * NOTE: this module deliberately does NOT import other _shared modules (e.g.
 * syncCallStatus) — cross-_shared imports have previously failed to deploy silently
 * on this platform (see docs/LESSONS_LEARNED.md, 2026-07-05). Every caller below is
 * responsible for calling syncCallStatus itself after commitVendorAssignment/
 * autoOfferCall moves a call to 'assigning'.
 */

const ACTIVE_CALL_STATUSES = ['vendor_enroute', 'vendor_arrived', 'in_progress'];

function toRad(deg: number) {
  return deg * (Math.PI / 180);
}

// Haversine distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Vendor ids that must not receive a new offer: those already on an active call, or
 * holding a pending (non-expired) offer on a different call.
 */
async function getBusyVendorIds(base44: any, excludeCallId: string | null = null) {
  const groups = await Promise.all(
    ACTIVE_CALL_STATUSES.map((s) => base44.asServiceRole.entities.Call.filter({ call_status: s }))
  );
  const busy = new Set<string>(
    groups.flat().map((c: any) => c.assigned_vendor_id).filter(Boolean)
  );
  const pending = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
    status: 'pending',
  });
  pending
    .filter((a: any) => a.call_id !== excludeCallId && new Date(a.expires_at) > new Date())
    .forEach((a: any) => busy.add(a.vendor_id));
  return busy;
}

/**
 * Whether a call already has a fresh (non-expired) pending offer to some vendor.
 * Callers that create a NEW offer directly (assignVendorToCall, autoAssignVendor's
 * commit branch) must check this first — otherwise two offers can end up pending
 * on the same call at once (the earlier vendor's offer is orphaned but still
 * acceptable, and the call's assigned_vendor_id gets silently overwritten).
 */
async function hasActivePendingAttemptForCall(base44: any, callId: string) {
  const pendingAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
    call_id: callId,
    status: 'pending',
  });
  return pendingAttempts.some((a: any) => new Date(a.expires_at) > new Date());
}

// Pure scoring of a single vendor against a call. Returns { score, details }.
function scoreVendor(call: any, vendor: any) {
  let score = 0;
  const details: any = {};

  // 1. Distance (40) or coverage-area fallback (25)
  if (
    vendor.current_latitude &&
    vendor.current_longitude &&
    call.pickup_location_lat &&
    call.pickup_location_lon
  ) {
    const distance = calculateDistance(
      vendor.current_latitude,
      vendor.current_longitude,
      call.pickup_location_lat,
      call.pickup_location_lon
    );
    details.distance_km = Math.round(distance * 10) / 10;
    if (distance <= 5) score += 40;
    else if (distance <= 10) score += 35;
    else if (distance <= 20) score += 25;
    else if (distance <= 30) score += 15;
    else if (distance <= 50) score += 10;
    else score += 5;
  } else if (vendor.coverage_areas?.includes(call.pickup_location_area)) {
    score += 25;
    details.coverage_match = true;
  }

  // 2. Service type match (20) — explicit service_type/category, fallback to issue_type
  const serviceCategoryMap: Record<string, string[]> = {
    towing: ['tow_truck', 'multi_service'],
    towing_storage: ['tow_truck', 'multi_service'],
    towing_mobile: ['tow_truck', 'mechanic', 'multi_service'],
    mobile_unit: ['mechanic', 'multi_service'],
    storage_only: ['tow_truck', 'multi_service'],
    other: ['multi_service', 'tow_truck'],
  };
  const issueTypeMap: Record<string, string[]> = {
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
    serviceCategoryMap[call.service_type] ||
    serviceCategoryMap[call.service_category] ||
    issueTypeMap[call.issue_type] ||
    ['tow_truck'];
  const vendorServices = vendor.service_type || [];
  if (neededServices.some((s) => vendorServices.includes(s))) {
    score += 20;
    details.service_match = true;
  }

  // 3. Rating (20)
  if (vendor.average_rating) {
    const ratingScore = (vendor.average_rating / 5) * 20;
    score += ratingScore;
    details.rating = vendor.average_rating;
  }

  // 4. Response time (10)
  if (vendor.average_response_time) {
    if (vendor.average_response_time <= 10) score += 10;
    else if (vendor.average_response_time <= 20) score += 8;
    else if (vendor.average_response_time <= 30) score += 6;
    else if (vendor.average_response_time <= 45) score += 4;
    else score += 2;
    details.avg_response_time = vendor.average_response_time;
  }

  // 5. Completion rate (10)
  if (vendor.completion_rate) {
    score += (vendor.completion_rate / 100) * 10;
    details.completion_rate = vendor.completion_rate;
  }

  // 6. Vehicle type support (5)
  if (call.vehicle_type && vendor.vehicle_types_supported?.includes(call.vehicle_type)) {
    score += 5;
    details.vehicle_type_match = true;
  }

  // 7. Workload balancing (-5..+5)
  const activeCallsToday = vendor.total_calls_assigned || 0;
  if (activeCallsToday < 3) score += 5;
  else if (activeCallsToday < 5) score += 2;
  else if (activeCallsToday > 10) score -= 5;

  return { score: Math.round(score), details };
}

/**
 * Load active vendors, exclude busy/excluded ones, score and rank them.
 * Returns { top, scoredVendors } (top is null when none available).
 */
async function pickBestVendor(base44: any, call: any, excludeVendorIds: string[] = []) {
  const allVendors = await base44.asServiceRole.entities.Vendor.filter({ is_active: true });
  const busy = await getBusyVendorIds(base44, call.id);
  const available = allVendors.filter(
    (v: any) =>
      v.availability_status === 'available' &&
      !excludeVendorIds.includes(v.id) &&
      !busy.has(v.id)
  );

  const scoredVendors = available
    .map((vendor: any) => ({ vendor, ...scoreVendor(call, vendor) }))
    .sort((a: any, b: any) => b.score - a.score);

  return { top: scoredVendors[0] || null, scoredVendors };
}

/**
 * Commit an assignment as an OFFER: create a pending CallAssignmentAttempt, move the
 * call to 'assigning' with the tentative vendor, and notify the vendor (in-app + SMS).
 * The vendor then accepts/declines via handleAssignmentResponse.
 */
async function commitVendorAssignment(
  base44: any,
  {
    call,
    vendor,
    score = null,
    distanceKm = null,
    windowMinutes = 10,
  }: { call: any; vendor: any; score?: number | null; distanceKm?: number | null; windowMinutes?: number }
) {
  const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000);

  const attempt = await base44.asServiceRole.entities.CallAssignmentAttempt.create({
    call_id: call.id,
    vendor_id: vendor.id,
    status: 'pending',
    score: score ?? undefined,
    distance_km: distanceKm ?? undefined,
    expires_at: expiresAt.toISOString(),
  });

  // Set assigned_vendor_id BEFORE the SMS — sendVendorAssignmentSMS reads it off the call.
  await base44.asServiceRole.entities.Call.update(call.id, {
    assigned_vendor_id: vendor.id,
    assigned_vendor_name: vendor.vendor_name,
    assigned_at: new Date().toISOString(),
    call_status: 'assigning',
  });

  // In-app notification to the vendor's user account
  try {
    const users = vendor.email
      ? await base44.asServiceRole.entities.User.filter({ email: vendor.email })
      : [];
    if (users?.[0]) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: users[0].id,
        title: 'הצעת קריאה חדשה',
        message: `הוצעה לך קריאה ${call.call_number || call.id.substring(0, 8)}. היכנס לפורטל לאישור.`,
        type: 'info',
        is_read: false,
        link: `/VendorPortal`,
        related_entity_id: call.id,
        related_entity_type: 'call',
      });
    }
  } catch (e) {
    console.error('commitVendorAssignment: in-app notify failed', e);
  }

  // SMS to the vendor (function is service-role and does its own lookups)
  try {
    await base44.functions.invoke('sendVendorAssignmentSMS', { call_id: call.id });
  } catch (e) {
    console.error('commitVendorAssignment: SMS failed', e);
  }

  return attempt;
}

/**
 * Pick the best vendor and offer the call to them. Returns the offer info or a reason.
 */
async function autoOfferCall(base44: any, call: any, excludeVendorIds: string[] = []) {
  const { top, scoredVendors } = await pickBestVendor(base44, call, excludeVendorIds);
  if (!top) {
    return { success: false, error: 'No available vendors', recommendation: null };
  }
  const attempt = await commitVendorAssignment(base44, {
    call,
    vendor: top.vendor,
    score: top.score,
    distanceKm: top.details?.distance_km ?? null,
  });
  return {
    success: true,
    recommendation: {
      vendor_id: top.vendor.id,
      vendor_name: top.vendor.vendor_name,
      vendor_phone: top.vendor.phone,
      score: top.score,
      details: top.details,
      attempt_id: attempt.id,
      expires_at: attempt.expires_at,
    },
    alternatives: scoredVendors.slice(1, 4).map((sv: any) => ({
      vendor_id: sv.vendor.id,
      vendor_name: sv.vendor.vendor_name,
      score: sv.score,
    })),
  };
}
// ===== End inline _shared/assignVendor =====

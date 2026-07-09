import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    // Rate limit: 100 webhook requests per IP per minute
    const clientIP = getClientIP(req);
    const rl = await limiter.check('bot_webhook', clientIP, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const base44 = createClientFromRequest(req);

    // Verify webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-bot-api-key');
    const expectedSecret = Deno.env.get('BOT_WEBHOOK_SECRET');

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return Response.json({
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'Invalid or missing webhook secret'
      }, { status: 401 });
    }

    // Parse incoming data from 99 Digital Bot
    const data = await req.json();
    
    // ===== Commercial Vehicle Detection (משימה 290) =====
    // If vehicle type is not provided, attempt MOT lookup
    let vehicleTypeResolved = data.vehicle?.type || '';
    let isCommercialVehicle = false;
    let hasCargo = data.vehicle?.has_cargo || false;
    let cargoDescription = data.vehicle?.cargo_description || '';

    if (data.vehicle?.plate && !vehicleTypeResolved) {
      try {
        const motUrl = new URL('https://data.gov.il/api/3/action/datastore_search');
        motUrl.searchParams.set('resource_id', '053cea08-09bc-40ec-8f7a-156f0677aff3');
        motUrl.searchParams.set('q', data.vehicle.plate.replace(/[-\s]/g, ''));
        motUrl.searchParams.set('limit', '1');
        const motRes = await fetch(motUrl.toString(), { signal: AbortSignal.timeout(5000) });
        if (motRes.ok) {
          const motData = await motRes.json();
          const record = motData?.result?.records?.[0];
          if (record) {
            const rawType = record['sug_degem'] || '';
            isCommercialVehicle = ['מסחרי', 'משאית', 'אוטובוס', 'רכב עבודה'].includes(rawType.trim());
            if (isCommercialVehicle) vehicleTypeResolved = 'van';
            else vehicleTypeResolved = 'car';
          }
        }
      } catch (motErr) {
        console.log('MOT lookup skipped in bot:', motErr.message);
      }
    } else if (['van', 'truck', 'bus'].includes(vehicleTypeResolved)) {
      isCommercialVehicle = true;
    }

    // If commercial vehicle and cargo not answered — require it
    if (isCommercialVehicle && data.vehicle?.has_cargo === undefined) {
      return Response.json({
        success: false,
        error_code: 'CARGO_QUESTION_REQUIRED',
        message: 'רכב מסחרי זוהה — יש לענות על שאלת הסחורה',
        question: {
          field: 'vehicle.has_cargo',
          text: 'האם יש סחורה / מטען ברכב?',
          type: 'boolean',
          follow_up: {
            if_true: { field: 'vehicle.cargo_description', text: 'תאר את הסחורה / המטען (סוג, משקל, הערות מיוחדות)' }
          }
        }
      }, { status: 422 });
    }

    // Validate required fields
    const requiredFields = [
      'customer.name',
      'customer.phone',
      'vehicle.plate',
      'incident.type',
      'incident.pickup_location.address'
    ];
    
    const missingFields = [];
    if (!data.customer?.name) missingFields.push('customer.name');
    if (!data.customer?.phone) missingFields.push('customer.phone');
    if (!data.vehicle?.plate) missingFields.push('vehicle.plate');
    if (!data.incident?.type) missingFields.push('incident.type');
    if (!data.incident?.pickup_location?.address) missingFields.push('incident.pickup_location.address');
    
    if (missingFields.length > 0) {
      return Response.json({
        success: false,
        error_code: 'VALIDATION_ERROR',
        message: 'חסרים שדות חובה',
        missing_fields: missingFields
      }, { status: 400 });
    }

    // Calculate area from city if not provided
    let area = data.incident.pickup_location.area;
    if (!area && data.incident.pickup_location.city) {
      const city = data.incident.pickup_location.city;
      const centerCities = ['תל אביב', 'רמת גן', 'גבעתיים', 'בני ברק', 'חולון', 'בת ים', 'רמת השרון'];
      const northCities = ['חיפה', 'נהריה', 'עכו', 'טבריה', 'צפת', 'קריית שמונה'];
      const southCities = ['באר שבע', 'אילת', 'אשדוד', 'אשקלון', 'קרית גת'];
      const jerusalemCities = ['ירושלים', 'בית שמש', 'מעלה אדומים'];
      
      if (centerCities.includes(city)) area = 'center';
      else if (northCities.includes(city)) area = 'north';
      else if (southCities.includes(city)) area = 'south';
      else if (jerusalemCities.includes(city)) area = 'jerusalem';
      else area = 'center'; // default
    }

    // Generate call number
    const callNumber = `C-${Date.now().toString().slice(-8)}`;
    
    // Generate customer response code if not provided
    let customerResponseCode = data.questionnaire?.customer_response_code;
    if (!customerResponseCode) {
      const randomBytes = new Uint32Array(1);
      crypto.getRandomValues(randomBytes);
      customerResponseCode = `NC${(randomBytes[0] % 900000 + 100000).toString()}`;
    }
    
    // Calculate priority score
    let priorityScore = 50; // Base score for bot calls
    if (data.customer.is_vip) priorityScore += 30;
    if (data.incident.priority === 'דחוף' || data.incident.priority === 'urgent') priorityScore += 25;
    if (area === 'center') priorityScore += 5;
    if (data.incident.type === 'accident') priorityScore += 20;
    
    // Create Call entity
    const call = await base44.asServiceRole.entities.Call.create({
      call_number: callNumber,
      call_status: 'waiting_treatment',
      created_by_source: 'bot',
      call_priority: data.incident.priority === 'דחוף' ? 'urgent' : 'normal',
      is_vip: data.customer.is_vip || false,
      
      // Customer
      customer_name: data.customer.name,
      customer_phone: data.customer.phone,
      customer_phone_2: data.customer.phone_2,
      customer_id_number: data.customer.id_number,
      customer_email: data.customer.email,
      customer_address: data.customer.address,
      insurance_company: data.customer.insurance_company,
      membership_number: data.customer.membership_number,
      membership_package: data.customer.membership_package,
      
      // Vehicle
      vehicle_plate: data.vehicle.plate,
      vehicle_model: data.vehicle.model,
      vehicle_year: data.vehicle.year,
      vehicle_type: vehicleTypeResolved || data.vehicle.type,
      fuel_type: data.vehicle.fuel_type,
      is_commercial_vehicle: isCommercialVehicle,
      has_cargo: hasCargo,
      cargo_description: cargoDescription,
      
      // Incident
      issue_type: data.incident.type,
      issue_description: data.incident.description,
      pickup_location_address: data.incident.pickup_location.address,
      pickup_location_city: data.incident.pickup_location.city,
      pickup_location_area: area,
      pickup_location_lat: data.incident.pickup_location.lat,
      pickup_location_lon: data.incident.pickup_location.lon,
      dropoff_location_address: data.incident.dropoff_location?.address,
      dropoff_location_city: data.incident.dropoff_location?.city,
      dropoff_garage_name: data.incident.dropoff_location?.garage_name,
      dropoff_garage_phone: data.incident.dropoff_location?.garage_phone,
      
      // Questionnaire
      is_road_accessible: data.questionnaire?.is_road_accessible,
      is_underground_parking: data.questionnaire?.is_underground_parking,
      is_gear_neutral: data.questionnaire?.is_gear_neutral,
      is_steering_locked: data.questionnaire?.is_steering_locked,
      is_handbrake_released: data.questionnaire?.is_handbrake_released,
      is_toll_road: data.questionnaire?.is_toll_road,
      is_customer_with_vehicle: data.questionnaire?.is_customer_with_vehicle,
      has_key: data.questionnaire?.has_key,
      customer_response_code: customerResponseCode,
      
      sla_target: 30
    });

    // Mirror a matching Case (best-effort, non-blocking) — Call is the operational
    // source of truth, but Reports, ServiceProviders and detectSmartAlerts read from
    // Case. Without this, bot-opened calls were invisible to reporting and to the
    // smart-alerts engine.
    try {
      await base44.asServiceRole.entities.Case.create({
        case_number: callNumber,
        customer_name: data.customer.name,
        caller_name: data.customer.name,
        caller_phone: data.customer.phone,
        vehicle_number: data.vehicle.plate,
        vehicle_type: vehicleTypeResolved || data.vehicle.type,
        vehicle_model: data.vehicle.model,
        vehicle_year: data.vehicle.year,
        fuel_type: data.vehicle.fuel_type,
        service_type: data.incident.type || 'other',
        location_address: data.incident.pickup_location.address,
        location_city: data.incident.pickup_location.city,
        location_lat: data.incident.pickup_location.lat,
        location_lng: data.incident.pickup_location.lon,
        destination_address: data.incident.dropoff_location?.address,
        destination_city: data.incident.dropoff_location?.city,
        status: 'new',
        priority: data.incident.priority === 'דחוף' ? 'urgent' : 'normal',
        problem_description: data.incident.description,
        is_toll_road: data.questionnaire?.is_toll_road,
        is_vip: data.customer.is_vip || false,
        insurance_company: data.customer.insurance_company,
        package_name: data.customer.membership_package,
        opening_source: 'bot',
      });
    } catch (caseError) {
      console.log('Case mirror creation failed (non-blocking):', caseError.message);
    }

    // Find available desk handler (load balancing).
    // Match operator/agent roles incl. Hebrew variants (Base44 often returns 'user').
    const HANDLER_ROLES = ['operator', 'agent', 'user', 'מוקדן', 'מתפעל', 'מנהל תפעול', 'נציג שטח'];
    const agents = await base44.asServiceRole.entities.User.list();
    const operatorAgents = agents.filter(
      a => HANDLER_ROLES.includes(a.role) && a.role !== 'vendor' && a.role !== 'ספק'
    );
    
    if (operatorAgents.length === 0) {
      // No agents available, add to general queue
      await base44.asServiceRole.entities.WorkQueue.create({
        call_id: call.id,
        assigned_to_agent: null,
        queue_status: 'waiting_in_queue',
        priority_score: priorityScore,
        added_to_queue_at: new Date().toISOString()
      });
      
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: callNumber,
        change_type: 'status',
        new_value: 'waiting_treatment',
        notes: `קריאה נוצרה מבוט 99 Digital דרך ${data.channel || 'WhatsApp'}. ממתין לשיבוץ נציג`,
        changed_by: 'בוט'
      });
      
      return Response.json({
        success: true,
        call_id: call.id,
        call_number: callNumber,
        status: 'created',
        message: 'קריאה נוצרה בהצלחה וממתינה בתור',
        assigned_to_agent: null,
        estimated_time: '10-15 דקות',
        customer_response_code: customerResponseCode
      });
    }
    
    // Get current queue counts per agent
    const queueItems = await base44.asServiceRole.entities.WorkQueue.list();
    const activeQueues = queueItems.filter(q => 
      ['assigned_to_agent', 'in_progress'].includes(q.queue_status)
    );
    
    // Count per agent
    const agentCounts = {};
    operatorAgents.forEach(agent => {
      agentCounts[agent.email] = activeQueues.filter(q => q.assigned_to_agent === agent.email).length;
    });
    
    // Find agent with minimum load
    let assignedAgent = null;
    let minLoad = Infinity;
    for (const agent of operatorAgents) {
      const load = agentCounts[agent.email] || 0;
      if (load < 5 && load < minLoad) { // Max 5 calls per agent
        minLoad = load;
        assignedAgent = agent;
      }
    }
    
    // Add to work queue
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.WorkQueue.create({
      call_id: call.id,
      assigned_to_agent: assignedAgent?.email,
      queue_status: assignedAgent ? 'assigned_to_agent' : 'waiting_in_queue',
      priority_score: priorityScore,
      added_to_queue_at: now,
      assigned_at: assignedAgent ? now : null
    });
    
    // Log to call history
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: callNumber,
      change_type: 'status',
      new_value: 'waiting_treatment',
      notes: `קריאה נוצרה מבוט 99 Digital דרך ${data.channel || 'WhatsApp'}${assignedAgent ? `, שובץ ל-${assignedAgent.full_name}` : ', הוכנס לתור כללי'}`,
      changed_by: 'בוט'
    });
    
    // Auto-offer the call to the best vendor (offer + accept model).
    // Calls the shared module directly with the service-role client.
    try {
      const offer = await autoOfferCall(base44, call, []);
      if (offer.success) {
        // Mirror the 'assigning' status onto WorkQueue + Case
        await syncCallStatus(base44, call, 'assigning');
        console.log('Vendor auto-offered:', offer.recommendation?.vendor_name);
      } else {
        console.log('Auto-offer skipped:', offer.error);
      }
    } catch (autoAssignError) {
      console.log('Auto-offer not triggered:', autoAssignError.message);
    }

    // Send SMS to customer
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'נתי שירותי דרך',
        to: data.customer.email || data.customer.phone + '@sms-gateway.co.il',
        subject: `קריאה ${callNumber} נפתחה`,
        body: `שלום ${data.customer.name},\n\nקריאה מספר ${callNumber} נפתחה בהצלחה.\n\nהקוד שלך: ${customerResponseCode}\n\nנעדכן אותך ב-SMS ברגע שספק ישובץ.\n\nנתי שירותי דרך`
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }
    
    return Response.json({
      success: true,
      call_id: call.id,
      call_number: callNumber,
      status: 'created',
      message: 'קריאה נוצרה בהצלחה',
      assigned_to_agent: assignedAgent?.full_name || null,
      estimated_time: assignedAgent ? '5-10 דקות' : '10-15 דקות',
      customer_response_code: customerResponseCode,
      bot_session_id: data.bot_session_id
    });
    
  } catch (error) {
    console.error('Error creating call from 99 Digital bot:', error);
    return Response.json({
      success: false,
      error_code: 'INTERNAL_ERROR',
      message: 'שגיאה ביצירת קריאה',
      details: 'Internal server error'
    }, { status: 500 });
  }
});

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

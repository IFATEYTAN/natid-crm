import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    // Rate limit: 100 webhook requests per IP per minute
    const clientIP = getClientIP(req);
    const rl = await limiter.check('crm_webhook', clientIP, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const base44 = createClientFromRequest(req);

    // Verify webhook secret - fail closed if not configured
    const webhookSecret = req.headers.get('x-webhook-secret');
    const savedSettings = Deno.env.get('WEBHOOK_SECRET');

    if (!savedSettings || webhookSecret !== savedSettings) {
      return Response.json({
        error: 'Invalid or missing webhook secret',
        success: false
      }, { status: 401 });
    }

    // Parse incoming payload
    const payload = await req.json();

    // Validate required fields
    if (!payload.customer || !payload.case) {
      return Response.json({
        success: false,
        error: 'Missing required fields: customer and case are required'
      }, { status: 400 });
    }

    // Map issue type
    const issueTypeMap = {
      'mechanical': 'mechanical',
      'towing': 'stopped_driving',
      'flat_tire': 'flat_tire',
      'tire': 'flat_tire',
      'battery': 'dead_battery',
      'lockout': 'locked_keys',
      'fuel': 'no_fuel',
      'accident': 'accident',
      'default': 'mechanical'
    };

    const issueType = issueTypeMap[payload.case.type?.toLowerCase()] || 'mechanical';

    // Map priority
    const priorityMap = {
      'low': 'normal',
      'normal': 'normal',
      'medium': 'normal',
      'high': 'urgent',
      'urgent': 'urgent',
      'critical': 'urgent'
    };

    const priority = priorityMap[payload.case.priority?.toLowerCase()] || 'normal';

    // Calculate area from city
    let area = 'center';
    if (payload.case.location?.city) {
      const city = payload.case.location.city;
      const centerCities = ['תל אביב', 'רמת גן', 'Tel Aviv', 'Ramat Gan'];
      const northCities = ['חיפה', 'Haifa', 'נהריה', 'Nahariya'];
      const southCities = ['באר שבע', 'Beer Sheva', 'אילת', 'Eilat'];
      const jerusalemCities = ['ירושלים', 'Jerusalem'];
      
      if (northCities.some(c => city.includes(c))) area = 'north';
      else if (southCities.some(c => city.includes(c))) area = 'south';
      else if (jerusalemCities.some(c => city.includes(c))) area = 'jerusalem';
    }

    // Generate call number
    const callNumber = `C-${Date.now().toString().slice(-8)}`;

    // Create Call
    const call = await base44.asServiceRole.entities.Call.create({
      call_number: callNumber,
      call_status: 'waiting_treatment',
      created_by_source: 'customer_app',
      call_priority: priority,
      
      // Customer info
      customer_name: payload.customer.name,
      customer_phone: payload.customer.phone,
      customer_email: payload.customer.email,
      
      // Issue details
      issue_type: issueType,
      issue_description: payload.case.description,
      
      // Location
      pickup_location_address: payload.case.location?.address,
      pickup_location_city: payload.case.location?.city,
      pickup_location_area: area,
      pickup_location_lat: payload.case.location?.lat,
      pickup_location_lon: payload.case.location?.lon,
      
      // Vehicle
      vehicle_plate: payload.case.vehicle?.plate,
      vehicle_model: payload.case.vehicle?.model,
      vehicle_type: payload.case.vehicle?.type || 'private',
      
      sla_target: 30
    });

    // Add to work queue
    const queueItem = await base44.asServiceRole.entities.WorkQueue.create({
      call_id: call.id,
      queue_status: 'waiting_in_queue',
      priority_score: priority === 'urgent' ? 80 : 50,
      added_to_queue_at: new Date().toISOString()
    });

    // Log to call history
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: callNumber,
      change_type: 'status',
      new_value: 'waiting_treatment',
      notes: `קריאה נוצרה מ-CRM חיצוני (${payload.metadata?.source || 'unknown'}). CRM ID: ${payload.metadata?.crm_id || 'N/A'}`,
      changed_by: 'External CRM Webhook'
    });

    // Try auto-assign vendor
    try {
      const autoAssignResult = await base44.functions.invoke('autoAssignVendor', {
        callId: call.id
      });
      
      if (autoAssignResult?.data?.success) {
        console.log('Vendor auto-assigned:', autoAssignResult.data.vendor.name);
      }
    } catch (autoAssignError) {
      console.log('Auto-assign skipped:', autoAssignError.message);
    }

    // Send SMS to customer
    try {
      await base44.functions.invoke('sendSMS', {
        phone: payload.customer.phone,
        message: `שלום ${payload.customer.name}, קריאתך ${callNumber} נוצרה בהצלחה. נעדכן אותך בהקדם.`,
        callId: call.id
      });
    } catch (smsError) {
      console.log('SMS not sent:', smsError.message);
    }

    return Response.json({
      success: true,
      call_id: call.id,
      call_number: callNumber,
      queue_id: queueItem.id,
      message: 'Call created successfully from external CRM',
      status: 'created'
    });

  } catch (error) {
    console.error('External CRM webhook error:', error);
    return Response.json({
      success: false,
      error: 'Failed to process webhook'
    }, { status: 500 });
  }
});

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

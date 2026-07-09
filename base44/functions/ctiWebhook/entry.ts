import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * CTI Webhook endpoint for PBX integration.
 * Receives incoming call events and returns customer identification data.
 *
 * POST body: { event: 'incoming_call', caller_id: string, extension: string }
 * Response: { customer_name, customer_id, open_calls_count, last_call_date } or { customer_name: null, is_new: true }
 */
Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed. Use POST.' },
      { status: 405 }
    );
  }

  try {
    const base44 = createClientFromRequest(req);

    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rl = await limiter.check('ctiWebhook', ip, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await req.json();
    const { event, caller_id, extension } = body;

    // Validate required fields
    if (!event || !caller_id) {
      return Response.json(
        { error: 'Missing required fields: event, caller_id' },
        { status: 400 }
      );
    }

    // Only handle incoming_call events
    if (event !== 'incoming_call') {
      return Response.json(
        { error: `Unsupported event type: ${event}. Only "incoming_call" is supported.` },
        { status: 400 }
      );
    }

    // Normalize phone number (remove spaces, dashes, parentheses)
    const normalizedPhone = caller_id.replace(/[\s\-()]/g, '');

    // Look up customer by phone number
    const customers = await base44.asServiceRole.entities.Customer.filter({
      phone: normalizedPhone,
    });

    // If no exact match, try alternative formats
    let customer = customers.length > 0 ? customers[0] : null;

    if (!customer) {
      // Try with leading zero removed/added
      const altPhone = normalizedPhone.startsWith('0')
        ? normalizedPhone.slice(1)
        : '0' + normalizedPhone;

      const altCustomers = await base44.asServiceRole.entities.Customer.filter({
        phone: altPhone,
      });
      customer = altCustomers.length > 0 ? altCustomers[0] : null;
    }

    // If still no match, try with +972 prefix
    if (!customer && normalizedPhone.startsWith('0')) {
      const intlPhone = '972' + normalizedPhone.slice(1);
      const intlCustomers = await base44.asServiceRole.entities.Customer.filter({
        phone: intlPhone,
      });
      customer = intlCustomers.length > 0 ? intlCustomers[0] : null;
    }

    if (!customer) {
      return Response.json({
        customer_name: null,
        customer_id: null,
        is_new: true,
        phone: caller_id,
        extension: extension || null,
        open_calls_count: 0,
        last_call_date: null,
      });
    }

    // Count open calls for this customer
    const openCalls = await base44.asServiceRole.entities.Call.filter({
      customer_id: customer.id,
      call_status: ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress', 'vendor_arrived'],
    });

    // Get last call date
    const recentCalls = await base44.asServiceRole.entities.Call.filter(
      { customer_id: customer.id },
      '-created_date'
    );
    const lastCallDate = recentCalls.length > 0 ? recentCalls[0].created_date : null;

    return Response.json({
      customer_name: customer.name || customer.full_name || null,
      customer_id: customer.id,
      is_new: false,
      phone: caller_id,
      extension: extension || null,
      open_calls_count: openCalls.length,
      last_call_date: lastCallDate,
    });
  } catch (error) {
    console.error('CTI webhook error:', error);
    return Response.json(
      { error: 'שגיאה בעיבוד בקשת CTI' },
      { status: 500 }
    );
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

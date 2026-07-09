import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Verify caller is authenticated admin or operator
        const user = await base44.auth.me();
        const appRole = await resolveAppRole(base44, user);
        if (!user || !['admin', 'operator'].includes(appRole)) {
            return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
        }

        const rl = await limiter.check('analyzeVendorPerf', user.id, 5, 60_000);
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { vendor_id } = await req.json();

        // Fetch vendor data
        const vendor = await base44.entities.Vendor.get(vendor_id);
        
        // Fetch recent calls for this vendor
        const calls = await base44.entities.Call.filter({ assigned_vendor_id: vendor_id, call_status: 'completed' }, '-created_date', 50);
        
        // Fetch ratings
        const ratings = await base44.entities.VendorRating.filter({ vendor_id: vendor_id }, '-created_date', 20);

        const prompt = `
        Analyze the performance of the following service provider (Vendor) based on their recent history.
        
        Vendor: ${vendor.vendor_name}
        
        Recent Calls Data (Last 50):
        ${JSON.stringify(calls.map(c => ({
            service: c.service_type,
            area: c.pickup_location_area,
            response_time: c.vendor_arrival_time_actual ? (new Date(c.vendor_arrival_time_actual) - new Date(c.assigned_at)) / 60000 : null,
            rating: c.customer_rating,
            day_of_week: new Date(c.created_date).getDay()
        })))}

        Recent Ratings:
        ${JSON.stringify(ratings.map(r => ({ score: r.overall_rating, feedback: r.feedback })))}

        Provide a comprehensive analysis including:
        1. "strengths": List of 3 key strengths.
        2. "weaknesses": List of 3 areas for improvement.
        3. "patterns": Any noticeable patterns (e.g., "Faster on weekends", "Struggles with towing in Tel Aviv").
        4. "predicted_trend": Prediction for future performance (improving/declining/stable) with a reason.
        5. "actionable_advice": One specific tip for the operator on how to best utilize this vendor.

        Output in Hebrew.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                    patterns: { type: "array", items: { type: "string" } },
                    predicted_trend: { type: "string" },
                    predicted_trend_reason: { type: "string" },
                    actionable_advice: { type: "string" }
                },
                required: ["strengths", "weaknesses", "patterns", "predicted_trend", "actionable_advice"]
            }
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: 'Failed to analyze vendor performance' }, { status: 500 });
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

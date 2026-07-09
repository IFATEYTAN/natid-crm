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

        const rl = await limiter.check('recommendVendor', user.id, 10, 60_000);
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { call_details } = await req.json();

        // Fetch active vendors
        const vendors = await base44.entities.Vendor.filter({ is_active: true, is_available_now: true });

        // Prepare vendor summary
        const vendorsSummary = vendors.map(v => ({
            id: v.id,
            name: v.vendor_name,
            rating: v.average_rating,
            services: v.service_type,
            areas: v.coverage_areas,
            avg_response: v.average_response_time,
            location: { lat: v.current_latitude, lng: v.current_longitude } // Simplified
        }));

        const prompt = `
        Recommend the best 3 vendors for this specific service call based on the available data.
        
        Call Details: ${JSON.stringify(call_details)}
        
        Available Vendors: ${JSON.stringify(vendorsSummary)}
        
        Consider:
        1. Service match (does the vendor support the requested service type?)
        2. Location/Area match (is the vendor covering the area?)
        3. Performance (rating, response time)
        
        Return exactly 3 recommendations sorted by best fit.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                vendor_id: { type: "string" },
                                match_score: { type: "number", description: "Score from 0-100" },
                                reason: { type: "string", description: "Reason for recommendation in Hebrew" }
                            },
                            required: ["vendor_id", "match_score", "reason"]
                        }
                    }
                },
                required: ["recommendations"]
            }
        });

        // Enrich recommendations with full vendor objects
        const enrichedRecs = response.recommendations.map(rec => {
            const vendor = vendors.find(v => v.id === rec.vendor_id);
            return { ...rec, vendor };
        }).filter(r => r.vendor); // Filter out if vendor not found for some reason

        return Response.json({ recommendations: enrichedRecs });

    } catch (error) {
        return Response.json({ error: 'Failed to recommend vendor' }, { status: 500 });
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

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await limiter.check('categorizeCall', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { problem_description, location_address, location_city, vehicle_type } = await req.json();

    if (!problem_description || problem_description.trim().length < 3) {
      return Response.json({ error: 'problem_description is required' }, { status: 400 });
    }

    const prompt = `אתה מערכת מיון חכמה לקריאות שירות דרך בישראל.
בהינתן תיאור תקלה מלקוח, סווג את הקריאה.

תיאור התקלה: "${problem_description}"
מיקום: ${location_address || 'לא צוין'}${location_city ? ', ' + location_city : ''}
סוג רכב: ${vehicle_type || 'לא צוין'}

סוגי תקלות אפשריים:
- mechanical: תקלה מכנית
- stopped_driving: רכב לא נוסע
- flat_tire: פנצ'ר
- stuck_wheel: גלגל תקוע
- accident: תאונה
- no_fuel: אין דלק
- dead_battery: מצבר ריק
- locked_keys: מפתחות נעולים
- other: אחר

סוגי שירות אפשריים:
- towing: גרירה
- flat_tire: פנצ'ר
- battery: מצבר
- lockout: פתיחת רכב
- fuel: דלק
- accident: תאונה
- mechanical: תקלה מכנית
- other: אחר

רמות עדיפות:
- low: נמוכה
- normal: רגילה
- high: גבוהה
- urgent: דחופה

קבע את סוג התקלה, סוג השירות הנדרש, רמת העדיפות, וכתוב הסבר קצר.
שים לב: תאונות, רכב באמצע כביש מהיר, ילדים/תינוקות ברכב = עדיפות דחופה.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          issue_type: {
            type: "string",
            enum: ["mechanical", "stopped_driving", "flat_tire", "stuck_wheel", "accident", "no_fuel", "dead_battery", "locked_keys", "other"]
          },
          service_type: {
            type: "string",
            enum: ["towing", "flat_tire", "battery", "lockout", "fuel", "accident", "mechanical", "other"]
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"]
          },
          confidence: {
            type: "number",
            description: "Confidence score 0-100"
          },
          reasoning: {
            type: "string",
            description: "Short explanation in Hebrew"
          }
        },
        required: ["issue_type", "service_type", "priority", "confidence", "reasoning"]
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Categorize call error:', error);
    return Response.json({ error: 'Failed to categorize call' }, { status: 500 });
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

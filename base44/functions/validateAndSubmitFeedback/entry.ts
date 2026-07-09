import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Deno KV is unavailable at isolate boot on this platform - a top-level
// `await Deno.openKv()` crashes every deploy (UNCAUGHT_EXCEPTION: "Default
// database is not available"). Open lazily at request time and fail open.
// See docs/LESSONS_LEARNED.md 2026-07-09.
let _lazyKv: Deno.Kv | null = null;
let _lazyKvUnavailable = false;
async function openKvSafe(): Promise<Deno.Kv | null> {
  if (_lazyKv || _lazyKvUnavailable) return _lazyKv;
  try {
    _lazyKv = await Deno.openKv();
  } catch (e) {
    console.error('Deno KV unavailable - falling back to no-op storage', e);
    _lazyKvUnavailable = true;
  }
  return _lazyKv;
}

const kv: Deno.Kv | null = null; // opened lazily via openKvSafe() - see below
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Rate limit by IP (no auth - public feedback endpoint)
    const ip = getClientIP(req);
    const rl = await limiter.check('submitFeedback', ip, 5, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    // Only accept POST with JSON content type
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 });
    }

    const body = await req.json();
    const { token, rating, feedback_text, would_recommend } = body;

    if (!token || typeof token !== 'string' || token.length > 200) {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Sanitize feedback text to prevent injection
    const sanitizedFeedback = feedback_text ? String(feedback_text).slice(0, 2000) : '';

    // Find token record
    const tokens = await base44.asServiceRole.entities.FeedbackToken.filter({ token: token });
    
    if (tokens.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 404 });
    }

    const tokenRecord = tokens[0];

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({ error: 'Token expired' }, { status: 410 });
    }

    // Check if token already used
    if (tokenRecord.is_used) {
      return Response.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Update token record with feedback
    await base44.asServiceRole.entities.FeedbackToken.update(tokenRecord.id, {
      is_used: true,
      used_at: new Date().toISOString(),
      rating: rating,
      feedback_text: sanitizedFeedback,
      would_recommend: would_recommend
    });

    // Update call with customer feedback
    if (tokenRecord.call_id) {
      try {
        await base44.asServiceRole.entities.Call.update(tokenRecord.call_id, {
          customer_rating: rating,
          customer_feedback: sanitizedFeedback
        });
      } catch (e) {
        console.error('Failed to update call:', e);
      }
    }

    // Create vendor rating if vendor exists
    if (tokenRecord.vendor_id) {
      try {
        await base44.asServiceRole.entities.VendorRating.create({
          vendor_id: tokenRecord.vendor_id,
          vendor_name: tokenRecord.vendor_name,
          call_id: tokenRecord.call_id,
          call_number: tokenRecord.call_number,
          rating_source: 'customer',
          overall_rating: rating,
          feedback: sanitizedFeedback,
          would_recommend: would_recommend
        });

        // Update vendor average rating
        const vendorRatings = await base44.asServiceRole.entities.VendorRating.filter({ 
          vendor_id: tokenRecord.vendor_id 
        });
        
        if (vendorRatings.length > 0) {
          const avgRating = vendorRatings.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / vendorRatings.length;
          await base44.asServiceRole.entities.Vendor.update(tokenRecord.vendor_id, {
            average_rating: Math.round(avgRating * 10) / 10,
            total_ratings: vendorRatings.length
          });
        }
      } catch (e) {
        console.error('Failed to create vendor rating:', e);
      }
    }

    // Log to audit
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: 'customer_feedback',
        user_name: tokenRecord.customer_first_name,
        action: 'create',
        entity_type: 'FeedbackToken',
        entity_id: tokenRecord.id,
        entity_name: tokenRecord.call_number,
        details: `לקוח דירג את השירות: ${rating}/5`,
        severity: 'info'
      });
    } catch (e) {
      console.error('Failed to log audit:', e);
    }

    return Response.json({ 
      success: true,
      message: 'תודה על המשוב שלך!'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return Response.json({ error: 'Failed to process feedback' }, { status: 500 });
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

function createRateLimiter(_bootKv: Deno.Kv | null) {
  return {
    /**
     * Check and consume a rate limit token. Fails OPEN (allowed) when Deno KV
     * is unavailable in this runtime - availability must not block business flows.
     */
    async check(
      prefix: string,
      key: string,
      maxRequests: number,
      windowMs: number
    ): Promise<RateLimitResult> {
      const kv = await openKvSafe();
      const now = Date.now();
      if (!kv) return { allowed: true, remaining: maxRequests, resetAt: now + windowMs };
      const windowStart = now - windowMs;
      const kvKey = ['rate_limit', prefix, key];
      const entry = await kv.get<{ timestamps: number[] }>(kvKey);
      const timestamps = (entry.value?.timestamps || []).filter((t) => t > windowStart);
      if (timestamps.length >= maxRequests) {
        const oldestInWindow = timestamps[0];
        return { allowed: false, remaining: 0, resetAt: oldestInWindow + windowMs };
      }
      timestamps.push(now);
      await kv.set(kvKey, { timestamps }, { expireIn: windowMs });
      return { allowed: true, remaining: maxRequests - timestamps.length, resetAt: now + windowMs };
    },

    /** Daily counter for quota monitoring (0 when KV is unavailable). */
    async getDailyCount(prefix: string): Promise<number> {
      const kv = await openKvSafe();
      if (!kv) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const entry = await kv.get<{ count: number }>(['daily_count', prefix, today]);
      return entry.value?.count || 0;
    },

    /** Increment daily counter (no-op returning 0 when KV is unavailable). */
    async incrementDaily(prefix: string): Promise<number> {
      const kv = await openKvSafe();
      if (!kv) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const kvKey = ['daily_count', prefix, today];
      const entry = await kv.get<{ count: number }>(kvKey);
      const newCount = (entry.value?.count || 0) + 1;
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
// ===== End inline _shared/rateLimit ===== (redeploy)

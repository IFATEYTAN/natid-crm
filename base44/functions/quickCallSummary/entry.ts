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
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await limiter.check('quickCallSummary', user.id, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { call_id } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    const calls = await base44.entities.Call.filter({ id: call_id });
    if (calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    const history = await base44.entities.CallHistory.filter({ call_id }, '-created_date', 20);
    const messages = await base44.entities.Message.filter({ call_id }, '-created_date', 20);

    const issueLabels = {
      mechanical: 'תקלה מכנית', stopped_driving: 'רכב לא נוסע', flat_tire: "פנצ'ר",
      stuck_wheel: 'גלגל תקוע', accident: 'תאונה', no_fuel: 'אין דלק',
      dead_battery: 'מצבר', locked_keys: 'מפתחות נעולים', other: 'אחר'
    };

    const statusLabels = {
      waiting_treatment: 'ממתין לטיפול', awaiting_assignment: 'ממתין לשיוך',
      assigning: 'ספק שובץ', vendor_enroute: 'ספק בדרך', in_progress: 'בטיפול',
      completed: 'סגור', cancelled: 'בוטל'
    };

    let durationMinutes = null;
    const start = new Date(call.created_date);
    const now = call.closed_at ? new Date(call.closed_at) : new Date();
    durationMinutes = Math.round((now - start) / (1000 * 60));

    const historyText = history.slice(0, 10).map(h => 
      `[${h.change_type}] ${h.notes || ''} ${h.old_value ? h.old_value + ' → ' + h.new_value : h.new_value || ''}`
    ).join('\n');

    const messagesText = messages.slice(0, 10).map(m =>
      `[${m.sender_role}] ${m.sender_name}: ${m.message_text}`
    ).join('\n');

    const prompt = `צור סיכום מהיר וקצר בעברית לקריאת שירות דרך. הסיכום צריך להיות מקצועי, תמציתי (3-5 שורות), וקל לקריאה מהירה.

פרטי הקריאה:
- מספר: ${call.call_number || 'לא ידוע'}
- לקוח: ${call.customer_name} (${call.customer_phone})
- סטטוס: ${statusLabels[call.call_status] || call.call_status}
- סוג תקלה: ${issueLabels[call.issue_type] || call.issue_type || 'לא צוין'}
- תיאור: ${call.issue_description || 'לא צוין'}
- רכב: ${call.vehicle_model || 'לא צוין'} ${call.vehicle_plate || ''}
- מיקום: ${call.pickup_location_address || 'לא צוין'}${call.pickup_location_city ? ', ' + call.pickup_location_city : ''}
- יעד: ${call.dropoff_location_address || 'לא צוין'}
- ספק: ${call.assigned_vendor_name || 'לא שובץ'}
- משך עד כה: ${durationMinutes ? durationMinutes + ' דקות' : 'לא ידוע'}
- הערות מוקדן: ${call.operator_notes || 'אין'}
- הערות ספק: ${call.vendor_notes || 'אין'}

${historyText ? 'היסטוריה:\n' + historyText : ''}
${messagesText ? 'הודעות:\n' + messagesText : ''}

צור:
1. סיכום קצר (3-5 שורות)
2. נקודות מפתח (2-4 נקודות)
3. המלצות לפעולה (אם רלוונטי, 1-2 המלצות)`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string", description: "סיכום קצר בעברית" },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "נקודות מפתח"
          },
          action_items: {
            type: "array",
            items: { type: "string" },
            description: "המלצות לפעולה"
          }
        },
        required: ["summary", "key_points"]
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Quick summary error:', error);
    return Response.json({ error: 'Failed to generate quick summary' }, { status: 500 });
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
// ===== End inline _shared/rateLimit =====

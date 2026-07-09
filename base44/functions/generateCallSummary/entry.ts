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

/**
 * Generate automatic call summary using AI
 * Called when a call is marked as completed
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - admin or operator role required' }, { status: 403 });
    }

    const rl = await limiter.check('generateCallSummary', user.id, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { call_id } = await req.json();

    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    // Fetch call details
    const calls = await base44.entities.Call.filter({ id: call_id });
    if (calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Fetch call history/notes
    const history = await base44.entities.CallHistory.filter({ call_id }, '-created_date', 50);
    
    // Fetch photos
    const photos = await base44.entities.CallPhoto.filter({ call_id });

    // Build context for AI
    const issueTypeLabels = {
      mechanical: 'תקלה מכנית',
      stopped_driving: 'רכב לא נוסע',
      flat_tire: 'פנצ\'ר',
      stuck_wheel: 'גלגל תקוע',
      accident: 'תאונה',
      no_fuel: 'אין דלק',
      dead_battery: 'מצבר ריק',
      locked_keys: 'מפתחות נעולים',
      other: 'אחר'
    };

    const vehicleTypeLabels = {
      private: 'פרטי',
      commercial_light: 'מסחרי קל',
      truck: 'משאית',
      motorcycle: 'אופנוע'
    };

    // Calculate duration
    let durationMinutes = null;
    if (call.created_date && call.closed_at) {
      const start = new Date(call.created_date);
      const end = new Date(call.closed_at);
      durationMinutes = Math.round((end - start) / (1000 * 60));
    }

    // Build structured data for the prompt
    const callData = {
      callNumber: call.call_number || 'לא ידוע',
      customerName: call.customer_name || 'לא ידוע',
      customerPhone: call.customer_phone || 'לא ידוע',
      vehiclePlate: call.vehicle_plate || 'לא ידוע',
      vehicleModel: call.vehicle_model || 'לא ידוע',
      vehicleType: vehicleTypeLabels[call.vehicle_type] || call.vehicle_type || 'לא ידוע',
      issueType: issueTypeLabels[call.issue_type] || call.issue_type || 'לא ידוע',
      issueDescription: call.issue_description || '',
      pickupAddress: call.pickup_location_address || 'לא ידוע',
      pickupCity: call.pickup_location_city || '',
      dropoffAddress: call.dropoff_location_address || '',
      dropoffCity: call.dropoff_location_city || '',
      vendorName: call.assigned_vendor_name || 'לא שובץ',
      createdAt: call.created_date ? new Date(call.created_date).toLocaleString('he-IL') : 'לא ידוע',
      closedAt: call.closed_at ? new Date(call.closed_at).toLocaleString('he-IL') : 'לא ידוע',
      durationMinutes: durationMinutes,
      vendorNotes: call.vendor_notes || '',
      customerRating: call.customer_rating,
      customerFeedback: call.customer_feedback || '',
      historyNotes: history.filter(h => h.notes).map(h => h.notes).join('\n'),
      photosCount: photos.length
    };

    // Generate summary using AI
    const prompt = `אתה מערכת ליצירת סיכומי קריאות שירות דרך. צור סיכום מקצועי וקצר בעברית עבור הקריאה הבאה.

פרטי הקריאה:
- מספר קריאה: ${callData.callNumber}
- לקוח: ${callData.customerName} (${callData.customerPhone})
- רכב: ${callData.vehicleModel}, ${callData.vehicleType}, מספר רישוי: ${callData.vehiclePlate}
- סוג תקלה: ${callData.issueType}
- תיאור התקלה: ${callData.issueDescription || 'לא צוין'}
- מיקום איסוף: ${callData.pickupAddress}${callData.pickupCity ? ', ' + callData.pickupCity : ''}
- יעד: ${callData.dropoffAddress || 'לא צוין'}${callData.dropoffCity ? ', ' + callData.dropoffCity : ''}
- ספק מטפל: ${callData.vendorName}
- זמן פתיחה: ${callData.createdAt}
- זמן סגירה: ${callData.closedAt}
- משך טיפול: ${callData.durationMinutes ? callData.durationMinutes + ' דקות' : 'לא ידוע'}
- הערות הספק: ${callData.vendorNotes || 'אין'}
- תמונות: ${callData.photosCount} תמונות צורפו
${callData.customerRating ? `- דירוג לקוח: ${callData.customerRating}/5` : ''}
${callData.customerFeedback ? `- משוב לקוח: ${callData.customerFeedback}` : ''}
${callData.historyNotes ? `\nהיסטוריית פעולות:\n${callData.historyNotes}` : ''}

צור סיכום מקצועי שיכלול:
1. תיאור קצר של האירוע
2. פעולות שבוצעו
3. תוצאה סופית
4. הערות מיוחדות (אם יש)

הסיכום צריך להיות ברור, תמציתי ומקצועי.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "סיכום הקריאה"
          }
        },
        required: ["summary"]
      }
    });

    const summary = aiResponse.summary || aiResponse;

    // Update call with summary draft
    await base44.entities.Call.update(call_id, {
      summary_draft: summary,
      summary_generated_at: new Date().toISOString()
    });

    // Log this action
    await base44.asServiceRole.entities.CallHistory.create({
      call_id,
      call_number: call.call_number,
      change_type: 'note',
      notes: 'סיכום קריאה נוצר אוטומטית',
      changed_by: user.email
    });

    return Response.json({
      success: true,
      summary,
      call_id
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    return Response.json({ error: 'Failed to generate call summary' }, { status: 500 });
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

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

const STATUS_MESSAGES = {
  awaiting_assignment: 'הקריאה התקבלה ואנחנו מחפשים ספק זמין',
  assigning: 'מצאנו ספק מתאים ומחכים לאישורו',
  vendor_enroute: 'הספק בדרך אליך! צפי הגעה: {eta}',
  in_progress: 'הספק הגיע ומתחיל בטיפול',
  completed: 'הטיפול הושלם בהצלחה. תודה שבחרת בנו!'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin, operator, or vendor can send status updates
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator', 'vendor'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    const rl = await limiter.check('sendCallStatusUpdate', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { call_id, status, eta, custom_message } = await req.json();

    if (!call_id || !status) {
      return Response.json({ error: 'Missing call_id or status' }, { status: 400 });
    }

    // Get the call details
    const calls = await base44.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Ownership check: vendors can only update calls assigned to them
    if (appRole === 'vendor') {
      const vendorRecords = await base44.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || call.assigned_vendor_id !== vendorRecords[0].id) {
        return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
      }
    }

    // Determine message to send
    let messageText = custom_message || STATUS_MESSAGES[status];
    if (!messageText) {
      messageText = `סטטוס הקריאה עודכן: ${status}`;
    }

    // Replace placeholders
    if (eta) {
      messageText = messageText.replace('{eta}', eta);
    }

    // Create system message in chat
    await base44.entities.Message.create({
      call_id: call_id,
      sender_name: 'מערכת',
      sender_role: 'system',
      message_text: messageText,
      message_type: 'status_update',
      is_read: false
    });

    // Notify operators about significant status changes
    if (['in_progress', 'completed', 'cancelled', 'on_site'].includes(status)) {
      // Fetch admins and operators for notifications
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      const notifyUsers = [...admins, ...operators];

      const titleMap = {
        in_progress: 'טיפול החל',
        completed: 'טיפול הושלם',
        cancelled: 'קריאה בוטלה',
        on_site: 'ספק הגיע'
      };

      for (const op of notifyUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: titleMap[status] || 'עדכון סטטוס',
          message: `קריאה ${call.call_number || call.id.substring(0,8)}: ${messageText}`,
          type: status === 'completed' ? 'success' : 'info',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call'
        });
      }
    }

    // Send SMS to customer if phone exists (via Twilio)
    if (call.customer_phone) {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          // Format phone number for Israel
          let formattedPhone = call.customer_phone.replace(/\D/g, '');
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '972' + formattedPhone.substring(1);
          }
          if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
          }

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

          const formData = new URLSearchParams();
          formData.append('To', formattedPhone);
          formData.append('From', twilioPhoneNumber);
          formData.append('Body', `נתיב: ${messageText}`);

          const smsResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
          });

          if (!smsResponse.ok) {
            const errorText = await smsResponse.text();
            console.log('SMS send failed:', errorText);
          }
        } catch (smsError) {
          console.log('Could not send SMS notification:', smsError.message);
        }
      } else {
        console.log('Twilio not configured - SMS not sent');
      }

      // Also send email if customer email exists
      if (call.customer_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: call.customer_email,
            subject: `עדכון קריאה ${call.call_number || call_id.slice(-6)}`,
            body: `
              <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
                <h2 style="color: #FF0000;">עדכון קריאה</h2>
                <p>${messageText}</p>
                ${call.call_number ? `<p><strong>מספר קריאה:</strong> ${call.call_number}</p>` : ''}
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">הודעה זו נשלחה ממערכת נתיב - שירותי דרך</p>
              </div>
            `
          });
        } catch (emailError) {
          console.log('Could not send email notification:', emailError.message);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Status update sent',
      sent_message: messageText
    });

  } catch (error) {
    console.error('Error sending status update:', error);
    return Response.json({ error: 'Failed to send status update' }, { status: 500 });
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

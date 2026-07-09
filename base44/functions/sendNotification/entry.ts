import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * Send notification to customer or vendor
 * Supports: In-app, Email, SMS
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/operator can send notifications
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - admin or operator role required' }, { status: 403 });
    }

    const rl = await limiter.check('sendNotification', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const {
      recipient_type, // 'customer' | 'vendor' | 'user'
      recipient_phone,
      recipient_email,
      recipient_name,
      notification_type, // 'call_assigned' | 'vendor_enroute' | 'call_completed' | 'custom'
      call_id,
      call_number,
      message,
      channels = ['in_app'] // ['in_app', 'email', 'sms']
    } = await req.json();

    const results = {
      in_app: null,
      email: null,
      sms: null
    };

    // Generate message based on notification type
    let title = '';
    let body = message || '';

    switch (notification_type) {
      case 'call_assigned':
        title = 'קריאה שובצה';
        body = body || `קריאה ${call_number} שובצה לטיפול. נציג בדרך אליך.`;
        break;
      case 'vendor_enroute':
        title = 'ספק בדרך';
        body = body || `הספק יצא לדרך לטיפול בקריאה ${call_number}.`;
        break;
      case 'call_completed':
        title = 'קריאה הושלמה';
        body = body || `הטיפול בקריאה ${call_number} הושלם בהצלחה.`;
        break;
      case 'eta_update':
        title = 'עדכון זמן הגעה';
        body = body || `זמן הגעה משוער עודכן לקריאה ${call_number}.`;
        break;
      default:
        title = title || 'עדכון מנתיב';
    }

    // 1. In-App Notification
    if (channels.includes('in_app')) {
      try {
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_id: user.id, // Or recipient user ID
          title,
          message: body,
          type: 'info',
          related_entity_id: call_id,
          related_entity_type: 'call',
          link: call_id ? `/CallDetails?id=${call_id}` : null
        });
        results.in_app = { success: true, id: notification.id };
      } catch (error) {
        results.in_app = { success: false, error: error.message };
      }
    }

    // 2. Email Notification
    if (channels.includes('email') && recipient_email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient_email,
          subject: title,
          body: `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
              <h2 style="color: #FF0000;">${title}</h2>
              <p>${body}</p>
              ${call_number ? `<p><strong>מספר קריאה:</strong> ${call_number}</p>` : ''}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                הודעה זו נשלחה ממערכת נתיב - שירותי דרך
              </p>
            </div>
          `
        });
        results.email = { success: true };
      } catch (error) {
        results.email = { success: false, error: error.message };
      }
    }

    // 3. SMS Notification (requires Twilio setup)
    if (channels.includes('sms') && recipient_phone) {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          // Format phone number for Israel
          let formattedPhone = recipient_phone.replace(/\D/g, '');
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
          formData.append('Body', `נתיב: ${title}\n${body}`);

          const smsResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
          });

          if (smsResponse.ok) {
            const smsResult = await smsResponse.json();
            results.sms = { success: true, sid: smsResult.sid };
          } else {
            const errorText = await smsResponse.text();
            results.sms = { success: false, error: errorText };
          }
        } catch (error) {
          results.sms = { success: false, error: error.message };
        }
      } else {
        results.sms = { success: false, error: 'Twilio not configured' };
      }
    }

    // Log the notification activity
    if (call_id) {
      await base44.asServiceRole.entities.CallHistory.create({
        call_id,
        call_number,
        change_type: 'note',
        notes: `התראה נשלחה: ${title}`,
        changed_by: user.email
      });
    }

    return Response.json({
      success: true,
      notification_type,
      results
    });

  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
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

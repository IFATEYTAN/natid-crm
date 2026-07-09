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

    // Only admin/operator can create notifications
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - admin or operator role required' }, { status: 403 });
    }

    const rl = await limiter.check('createNotification', user.id, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const {
      user_ids, // Array of user IDs to notify, or 'all_admins' for all admins
      event_type, // The type of event (new_call, call_status_change, etc.)
      title,
      message,
      type = 'info', // info, success, warning, error
      link,
      related_entity_id,
      related_entity_type
    } = await req.json();

    // Get users to notify
    let targetUsers = [];
    
    if (user_ids === 'all_admins') {
      // Get all admin and operator users
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      targetUsers = [...admins, ...operators];
    } else if (Array.isArray(user_ids)) {
      // Get specific users
      for (const userId of user_ids) {
        try {
          const targetUser = await base44.asServiceRole.entities.User.get(userId);
          if (targetUser) {
            targetUsers.push(targetUser);
          }
        } catch (e) {
          // User not found, skip
        }
      }
    }

    const notifications = [];
    
    for (const targetUser of targetUsers) {
      // Check user preferences
      const prefs = targetUser.notification_preferences || {};
      
      // If push is disabled, skip
      if (targetUser.push_enabled === false) {
        continue;
      }
      
      // Check if user wants this event type
      if (event_type && prefs[event_type] === false) {
        continue;
      }

      // Create the notification
      const notification = await base44.asServiceRole.entities.Notification.create({
        user_id: targetUser.id,
        title,
        message,
        type,
        link,
        related_entity_id,
        related_entity_type,
        is_read: false
      });
      
      notifications.push(notification);
    }

    return Response.json({ 
      success: true, 
      notifications_created: notifications.length 
    });

  } catch (error) {
    return Response.json({ error: 'Failed to create notification' }, { status: 500 });
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

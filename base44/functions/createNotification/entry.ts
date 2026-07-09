import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
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

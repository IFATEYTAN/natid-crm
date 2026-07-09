import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Link an email address to a vendor profile.
 * Admin-only operation — allows vendors to log in and see their portal.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appRole = await resolveAppRole(base44, user);
    if (appRole !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { vendor_id, email } = await req.json();

    if (!vendor_id || !email) {
      return Response.json({ error: 'Missing vendor_id or email' }, { status: 400 });
    }

    // Normalize email to lowercase so it matches the user record regardless of
    // how it was typed (user emails are stored lowercase).
    const normalizedEmail = email.trim().toLowerCase();

    // Update vendor with the email
    await base44.asServiceRole.entities.Vendor.update(vendor_id, { email: normalizedEmail });

    // Promote the matching user to a vendor so they get the vendor portal.
    // Without this the user keeps role 'user' and cannot access the portal.
    const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
    if (users.length > 0) {
      const targetUser = users[0];
      if (targetUser.role !== 'vendor' && targetUser.role !== 'ספק') {
        await base44.asServiceRole.entities.User.update(targetUser.id, {
          role: 'vendor',
          vendor_id,
        });
      }
      return Response.json({ success: true, vendor_id, email: normalizedEmail, role_updated: true });
    }

    // No user registered with this email yet — the email is linked, but the role
    // will only flip once the user signs up. Surface a warning instead of a silent success.
    return Response.json({
      success: true,
      vendor_id,
      email: normalizedEmail,
      role_updated: false,
      warning: 'האימייל קושר לספק, אך לא נמצא משתמש רשום עם כתובת זו. לאחר שהספק יירשם, יש לקשר שוב כדי להפוך אותו ל-vendor.',
    });
  } catch (error) {
    console.error('linkVendorEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
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

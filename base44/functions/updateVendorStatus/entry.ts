import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Update vendor status (available/break) and notify operators
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only vendor or admin
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'vendor'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { vendor_id, status } = await req.json();

    if (!vendor_id || !status) {
      return Response.json({ error: 'Missing vendor_id or status' }, { status: 400 });
    }

    // Get vendor
    const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendor_id });
    if (!vendors.length) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }
    const vendor = vendors[0];

    // Ownership check: vendors can only update their own status
    if (appRole === 'vendor' && vendor.email !== user.email) {
      return Response.json({ error: 'Forbidden - can only update your own status' }, { status: 403 });
    }

    // Update status
    await base44.asServiceRole.entities.Vendor.update(vendor_id, {
      availability_status: status,
      last_location_update: new Date().toISOString() // refresh timestamp
    });

    // Fetch admins and operators for notifications
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
    const notifyUsers = [...admins, ...operators];

    let title = 'עדכון סטטוס ספק';
    let message = '';
    let type = 'info';

    if (status === 'on_break') {
      title = 'ספק בהפסקה';
      message = `הספק ${vendor.vendor_name} יצא להפסקה`;
      type = 'warning';
    } else if (status === 'available') {
      title = 'ספק זמין';
      message = `הספק ${vendor.vendor_name} חזר להיות זמין`;
      type = 'success';
    } else if (status === 'offline') {
      title = 'ספק התנתק';
      message = `הספק ${vendor.vendor_name} סיים משמרת`;
      type = 'warning';
    }

    for (const op of notifyUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: op.id,
        title,
        message,
        type,
        is_read: false,
        link: `/ServiceProviders`, // Link to vendors list
        related_entity_id: vendor.id,
        related_entity_type: 'vendor'
      });
    }

    return Response.json({ success: true, status });

  } catch (error) {
    console.error('Update status error:', error);
    return Response.json({ error: 'Failed to update vendor status' }, { status: 500 });
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

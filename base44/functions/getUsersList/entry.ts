import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Admin-only function to fetch the full users list with their app permissions.
 *
 * The Base44 platform blocks client-side User.list() with a 403 for security,
 * which crashed the user-management screen. This runs with the service role so
 * authorized admins get the complete list reliably.
 *
 * It also self-heals UserPermission records: the invite flow creates them with
 * an empty user_id (to be filled "when the user logs in"), which breaks role
 * resolution that filters by user_id. We backfill it here by matching email.
 */

// Role names (English + Hebrew) that grant admin-level access in the app.
const ADMIN_ROLE_NAMES = ['admin', 'מנהל', 'מנהל מערכת'];

function matchRole(perm, roles) {
  if (!perm) return null;
  return (
    roles.find(
      (r) =>
        r.id === perm.role_id ||
        r.display_name === perm.role_name ||
        r.name === perm.role_name
    ) || null
  );
}

function isAdminPermission(perm, roles) {
  if (!perm) return false;
  const role = matchRole(perm, roles);
  const names = [perm.role_name, role?.name, role?.display_name].filter(Boolean);
  return names.some((name) => ADMIN_ROLE_NAMES.includes(name));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await base44.asServiceRole.entities.Role.list();

    // Authorize: platform admin OR app-level admin (via UserPermission).
    let isAdmin = user.role === 'admin';
    if (!isAdmin) {
      let myPerms = await base44.asServiceRole.entities.UserPermission.filter({
        user_id: user.id,
      });
      if (!myPerms.length && user.email) {
        myPerms = await base44.asServiceRole.entities.UserPermission.filter({
          user_email: user.email,
        });
      }
      isAdmin = isAdminPermission(myPerms[0], roles);
    }

    if (!isAdmin) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const permissions = await base44.asServiceRole.entities.UserPermission.list();

    // Self-heal empty user_id on permissions by matching email -> user.id.
    // Run the updates in parallel so a long list doesn't risk a function timeout.
    const usersByEmail = {};
    for (const u of users) {
      if (u.email) usersByEmail[u.email.trim().toLowerCase()] = u;
    }
    const backfills = [];
    for (const perm of permissions) {
      if (!perm.user_id && perm.user_email) {
        const match = usersByEmail[perm.user_email.trim().toLowerCase()];
        if (match) {
          perm.user_id = match.id;
          backfills.push(
            base44.asServiceRole.entities.UserPermission.update(perm.id, {
              user_id: match.id,
            }).catch((_e) => {
              // Non-fatal: keep returning data even if a single backfill fails.
            })
          );
        }
      }
    }
    if (backfills.length > 0) {
      await Promise.all(backfills);
    }

    return Response.json({
      success: true,
      users,
      permissions,
      roles,
      count: users.length,
    });
  } catch (error) {
    console.error('getUsersList error:', error);
    return Response.json({ error: 'Failed to get users list' }, { status: 500 });
  }
});

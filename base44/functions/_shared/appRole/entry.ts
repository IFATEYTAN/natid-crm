/**
 * App-level role resolution for backend functions. (v2 — force redeploy)
 *
 * Invited users carry the Base44 platform role "user"; their real app role
 * lives in the UserPermission entity (role_name, Hebrew or English). Any
 * function that gates on user.role alone silently blocks every invited user —
 * gate on resolveAppRole() instead.
 *
 * Mirrors src/components/permissions/PermissionsContext.jsx (APP_ROLE_MAP and
 * the operator default), so backend authorization matches what the UI shows.
 */

const APP_ROLE_MAP: Record<string, string> = {
  // English (from Role.name or the Base44 platform)
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  // Hebrew (from UserPermission.role_name or Role.display_name)
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
export async function resolveAppRole(base44: any, user: any): Promise<string | null> {
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
    // Permission lookup failed — fall through to the frontend-matching default.
  }
  // Same default as the frontend: unknown or unmapped invited users act as operator.
  return 'operator';
}
  
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { syncCallStatus } from './_shared/syncCallStatus.ts';

// Fields an agent is allowed to set directly
const ALLOWED_AGENT_FIELDS = ['call_status', 'cannot_complete_reason', 'agent_notes'];

// Valid status transitions for a field agent updating a call from the field.
// Gated by the 'calls.update_status' permission (admin-granted) — see permission check below.
const AGENT_STATUS_TRANSITIONS = {
  awaiting_assignment: ['vendor_enroute', 'in_progress'],
  assigning: ['vendor_enroute', 'in_progress'],
  assigned: ['vendor_enroute', 'in_progress'],
  vendor_enroute: ['vendor_arrived', 'in_progress', 'cannot_complete'],
  vendor_arrived: ['in_progress', 'cannot_complete'],
  in_progress: ['completed', 'cannot_complete'],
};

/**
 * Resolve whether a user is granted a specific granular permission, server-side.
 * Mirrors the client PermissionsContext resolution order:
 *   custom_permissions (per-user override) -> Role.permissions -> false.
 * Admins always pass (checked by the caller).
 */
async function userHasPermission(base44, user, category, permission) {
  // Load the UserPermission record (by id, then email)
  let perms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: user.id });
  if ((!perms || perms.length === 0) && user.email) {
    perms = await base44.asServiceRole.entities.UserPermission.filter({ user_email: user.email });
  }
  const perm = perms?.[0];
  if (!perm) return false;

  // 1) Per-user custom override
  const custom = perm.custom_permissions?.[category]?.[permission];
  if (custom !== undefined) return custom === true;

  // 2) Role-level permission
  if (perm.role_id) {
    const roles = await base44.asServiceRole.entities.Role.filter({ id: perm.role_id });
    const rolePerm = roles?.[0]?.permissions?.[category]?.[permission];
    if (rolePerm !== undefined) return rolePerm === true;
  }

  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id, updates } = await req.json();
    if (!call_id || !updates || typeof updates !== 'object') {
      return Response.json({ error: 'Missing call_id or updates' }, { status: 400 });
    }

    const isAdmin = (await resolveAppRole(base44, user)) === 'admin';

    // Permission gate: admins bypass; everyone else needs the granted permission.
    if (!isAdmin) {
      const allowed = await userHasPermission(base44, user, 'calls', 'update_status');
      if (!allowed) {
        return Response.json(
          { error: 'Forbidden - missing calls.update_status permission' },
          { status: 403 }
        );
      }
    }

    // Get the call
    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Ownership: a non-admin may only update a call assigned to them via the work queue.
    if (!isAdmin) {
      const queueItems = await base44.asServiceRole.entities.WorkQueue.filter({
        call_id: call_id,
        assigned_to_agent: user.email,
      });
      if (!queueItems || queueItems.length === 0) {
        return Response.json(
          { error: 'Forbidden - this call is not assigned to you' },
          { status: 403 }
        );
      }
    }

    // Filter to allowed fields only
    const sanitizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (!isAdmin && !ALLOWED_AGENT_FIELDS.includes(key)) continue;
      sanitizedUpdates[key] = value;
    }

    // Validate status transition
    if (sanitizedUpdates.call_status) {
      const allowedNext = AGENT_STATUS_TRANSITIONS[call.call_status] || [];
      if (!allowedNext.includes(sanitizedUpdates.call_status)) {
        return Response.json(
          {
            error: `Invalid status transition from ${call.call_status} to ${sanitizedUpdates.call_status}`,
          },
          { status: 400 }
        );
      }

      // Server-set timestamps for known transitions
      if (sanitizedUpdates.call_status === 'vendor_arrived' || sanitizedUpdates.call_status === 'in_progress') {
        if (!call.vendor_arrival_time_actual) {
          sanitizedUpdates.vendor_arrival_time_actual = new Date().toISOString();
        }
      }
      if (sanitizedUpdates.call_status === 'completed') {
        sanitizedUpdates.closed_at = new Date().toISOString();
        sanitizedUpdates.closed_by = user.email;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Perform the update
    await base44.asServiceRole.entities.Call.update(call_id, sanitizedUpdates);

    // Mirror status onto WorkQueue + Case
    if (sanitizedUpdates.call_status) {
      const extraCaseUpdates: Record<string, any> = {};
      if (sanitizedUpdates.vendor_arrival_time_actual) {
        extraCaseUpdates.arrived_at = sanitizedUpdates.vendor_arrival_time_actual;
      }
      if (sanitizedUpdates.closed_at) {
        extraCaseUpdates.completed_at = sanitizedUpdates.closed_at;
      }
      await syncCallStatus(base44, call, sanitizedUpdates.call_status, extraCaseUpdates);
    }

    // Log to call history
    if (sanitizedUpdates.call_status) {
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: call.call_number,
        change_type: 'status',
        old_value: call.call_status,
        new_value: sanitizedUpdates.call_status,
        notes:
          sanitizedUpdates.call_status === 'cannot_complete'
            ? `הטכנאי דיווח שלא ניתן לטפל. סיבה: ${sanitizedUpdates.cannot_complete_reason || 'לא צוינה'}`
            : `עודכן ע"י טכנאי`,
        changed_by: user?.email || 'system',
      });
    }

    // Alert the desk when a technician reports they cannot complete the call
    if (sanitizedUpdates.call_status === 'cannot_complete') {
      const reason = sanitizedUpdates.cannot_complete_reason || 'לא צוינה סיבה';
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      for (const op of [...admins, ...operators]) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: 'טכנאי לא יכול לטפל בקריאה',
          message: `הטכנאי ${user.email} דיווח שלא ניתן לטפל בקריאה ${call.call_number || call.id.substring(0, 8)}. סיבה: ${reason}`,
          type: 'warning',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call',
        });
      }
    }

    return Response.json({
      success: true,
      updated_fields: Object.keys(sanitizedUpdates),
    });
  } catch (error) {
    console.error('Error updating agent call status:', error);
    return Response.json({ error: 'Failed to update call status' }, { status: 500 });
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

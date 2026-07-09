import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate
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

    // Only admins and operators can create audit log entries
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    const rl = await limiter.check('logAuditAction', user.id, 60, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await req.json();
    const { action, entity_type, entity_id, details, severity = 'info' } = body;

    if (!action || !entity_type) {
      return Response.json({ error: 'Missing required fields: action, entity_type' }, { status: 400 });
    }

    // Create audit log entry using service role
    const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
      action,
      entity_type,
      entity_id: entity_id || null,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      user_role: appRole,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      severity,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      audit_id: auditEntry.id 
    });

  } catch (error) {
    console.error('Audit log error:', error);
    return Response.json({
      error: 'Failed to log audit action',
      success: false
    }, { status: 500 });
  }
});
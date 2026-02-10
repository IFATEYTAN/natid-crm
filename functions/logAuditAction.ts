import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and operators can create audit log entries
    if (!['admin', 'operator'].includes(user.role)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

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
      user_role: user.role,
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
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate

/**
 * "הפעלת קריאה מחדש" (QA audit #109, requirement ג'): when a call was
 * rejected/stalled for a customer-side reason (e.g. needs to bring a credit
 * card, hasn't given a dropoff destination yet), resets the arrival-time
 * clock from the moment this is clicked instead of the call's original
 * open time. Operator/admin only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { call_id } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    if (['completed', 'cancelled'].includes(call.call_status)) {
      return Response.json(
        { error: 'לא ניתן להפעיל מחדש קריאה סגורה/מבוטלת' },
        { status: 409 }
      );
    }

    const reactivatedAt = new Date().toISOString();
    await base44.asServiceRole.entities.Call.update(call_id, { reactivated_at: reactivatedAt });

    await base44.asServiceRole.entities.CallHistory.create({
      call_id,
      call_number: call.call_number,
      change_type: 'status',
      notes: 'הקריאה הופעלה מחדש — טיימר ההגעה ללקוח אופס',
      changed_by: user.full_name || user.email || 'system',
    });

    return Response.json({ success: true, reactivated_at: reactivatedAt });
  } catch (error) {
    console.error('reactivateCall error:', error);
    return Response.json({ error: 'Failed to reactivate call' }, { status: 500 });
  }
});

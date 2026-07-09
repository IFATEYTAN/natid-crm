import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate
import { autoOfferCall } from './_shared/assignVendor.ts';
import { syncCallStatus } from './_shared/syncCallStatus.ts';

/**
 * Release a call back to the queue.
 *
 * A vendor (or an operator/admin on their behalf) can hand a call back mid-flow when
 * they cannot continue. The call is detached from the vendor, the vendor is freed,
 * and an automatic re-assignment to the next best vendor is attempted (excluding the
 * releasing vendor). If no vendor is found the call stays in 'awaiting_assignment'
 * for the operator to handle manually.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator', 'vendor'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    const { call_id, reason } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    if (!call.assigned_vendor_id) {
      return Response.json({ error: 'Call is not currently assigned to a vendor' }, { status: 400 });
    }

    // Ownership check: a vendor can only release a call assigned to them
    if (appRole === 'vendor') {
      const vendorRecords = await base44.asServiceRole.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || call.assigned_vendor_id !== vendorRecords[0].id) {
        return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
      }
    }

    const releasedVendorId = call.assigned_vendor_id;
    const releasedVendorName = call.assigned_vendor_name || 'ספק';
    const releaseReason = reason || 'לא צוינה סיבה';

    // Detach the call from the vendor and return it to the queue
    await base44.asServiceRole.entities.Call.update(call.id, {
      call_status: 'awaiting_assignment',
      assigned_vendor_id: null,
      assigned_vendor_name: null,
    });

    // Mirror status onto WorkQueue + Case
    await syncCallStatus(base44, call, 'awaiting_assignment');

    // Free the vendor
    const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: releasedVendorId });
    if (vendors?.[0]) {
      await base44.asServiceRole.entities.Vendor.update(vendors[0].id, {
        availability_status: 'available',
      });
    }

    // Log to call history
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: call.call_number,
      change_type: 'status',
      old_value: call.call_status,
      new_value: 'awaiting_assignment',
      notes: `הספק ${releasedVendorName} החזיר את הקריאה לשיבוץ מחדש. סיבה: ${releaseReason}`,
      changed_by: user?.email || 'system',
    });

    // Notify operators/admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
    for (const op of [...admins, ...operators]) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: op.id,
        title: 'ספק החזיר קריאה',
        message: `הספק ${releasedVendorName} החזיר את קריאה ${call.call_number || call.id.substring(0, 8)} לשיבוץ מחדש. סיבה: ${releaseReason}`,
        type: 'warning',
        is_read: false,
        link: `/CallDetails?id=${call.id}`,
        related_entity_id: call.id,
        related_entity_type: 'call',
      });
    }

    // Attempt automatic re-assignment to the next best vendor, excluding the releasing
    // vendor and any vendor that previously declined this call.
    const previousAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
      call_id: call.id,
      status: 'declined',
    });
    const excludeVendorIds = [
      ...new Set([releasedVendorId, ...previousAttempts.map((a) => a.vendor_id)]),
    ];

    let nextRecommendation = null;
    try {
      const offer = await autoOfferCall(base44, { ...call, call_status: 'awaiting_assignment', assigned_vendor_id: null }, excludeVendorIds);
      if (offer.success && offer.recommendation) {
        nextRecommendation = offer.recommendation;
        // Mirror the 'assigning' status onto WorkQueue + Case
        await syncCallStatus(base44, call, 'assigning');
      }
    } catch (e) {
      console.error('releaseVendorCall: auto re-assign failed', e);
    }

    return Response.json({
      success: true,
      message: 'Call released back to queue',
      next_recommendation: nextRecommendation,
    });
  } catch (error) {
    console.error('Error releasing vendor call:', error);
    return Response.json({ error: 'Failed to release call' }, { status: 500 });
  }
});

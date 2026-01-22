import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Handle vendor response to assignment (accept/decline)
 * If declined, automatically find next best vendor
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const { 
      attempt_id, 
      action, // 'accept' | 'decline'
      decline_reason 
    } = await req.json();

    if (!attempt_id || !action) {
      return Response.json({ error: 'attempt_id and action are required' }, { status: 400 });
    }

    // Get the assignment attempt
    const attempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({ id: attempt_id });
    if (!attempts || attempts.length === 0) {
      return Response.json({ error: 'Assignment attempt not found' }, { status: 404 });
    }
    const attempt = attempts[0];

    // Check if already processed
    if (attempt.status !== 'pending') {
      return Response.json({ 
        error: 'Assignment already processed', 
        status: attempt.status 
      }, { status: 400 });
    }

    // Check if expired
    if (new Date(attempt.expires_at) < new Date()) {
      await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
        status: 'expired'
      });
      return Response.json({ error: 'Assignment offer expired' }, { status: 400 });
    }

    // Get the call
    const calls = await base44.asServiceRole.entities.Call.filter({ id: attempt.call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    if (action === 'accept') {
      // Update attempt status
      const responseTime = Math.round((Date.now() - new Date(attempt.created_date).getTime()) / 1000);
      await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
        status: 'accepted',
        response_time_seconds: responseTime
      });

      // Get vendor details
      const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: attempt.vendor_id });
      const vendor = vendors?.[0];

      // Update call with assigned vendor
      await base44.asServiceRole.entities.Call.update(call.id, {
        call_status: 'vendor_enroute',
        assigned_vendor_id: attempt.vendor_id,
        assigned_vendor_name: vendor?.vendor_name,
        assigned_at: new Date().toISOString()
      });

      // Update vendor status to busy
      if (vendor) {
        await base44.asServiceRole.entities.Vendor.update(vendor.id, {
          availability_status: 'busy',
          total_calls_assigned: (vendor.total_calls_assigned || 0) + 1
        });
      }

      // Log to call history
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: call.call_number,
        change_type: 'vendor_assignment',
        new_value: vendor?.vendor_name,
        notes: `ספק ${vendor?.vendor_name} אישר את הקריאה`,
        changed_by: user?.email || 'system'
      });

      return Response.json({
        success: true,
        action: 'accepted',
        message: 'Assignment accepted successfully'
      });

    } else if (action === 'decline') {
      // Update attempt status
      const responseTime = Math.round((Date.now() - new Date(attempt.created_date).getTime()) / 1000);
      await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
        status: 'declined',
        decline_reason: decline_reason || 'לא צוינה סיבה',
        response_time_seconds: responseTime
      });

      // Log to call history
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: call.call_number,
        change_type: 'note',
        notes: `ספק דחה את הקריאה. סיבה: ${decline_reason || 'לא צוינה'}`,
        changed_by: user?.email || 'system'
      });

      // Get all previous declined vendors for this call
      const previousAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
        call_id: call.id,
        status: 'declined'
      });
      const excludeVendorIds = previousAttempts.map(a => a.vendor_id);

      // Try to find next best vendor
      const autoAssignResponse = await base44.functions.invoke('autoAssignVendor', {
        call_id: call.id,
        exclude_vendor_ids: excludeVendorIds
      });

      if (autoAssignResponse.data?.success && autoAssignResponse.data?.recommendation) {
        return Response.json({
          success: true,
          action: 'declined',
          message: 'Assignment declined, found alternative vendor',
          next_recommendation: autoAssignResponse.data.recommendation
        });
      } else {
        // No more vendors available - update call status
        await base44.asServiceRole.entities.Call.update(call.id, {
          call_status: 'awaiting_assignment'
        });

        return Response.json({
          success: true,
          action: 'declined',
          message: 'Assignment declined, no alternative vendors available',
          next_recommendation: null
        });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Handle assignment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
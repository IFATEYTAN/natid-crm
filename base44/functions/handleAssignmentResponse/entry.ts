import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';
import { autoOfferCall } from './_shared/assignVendor.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * Handle vendor response to assignment (accept/decline)
 * If declined, automatically find next best vendor
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only vendors (and admins for override) can respond to assignments
    if (!['admin', 'vendor'].includes(user.role)) {
      return Response.json({ error: 'Forbidden - vendor role required' }, { status: 403 });
    }

    const rl = await limiter.check('handleAssignment', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

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

    // Ownership check: vendors can only respond to their own assignments
    if (user.role === 'vendor') {
      const vendorRecords = await base44.asServiceRole.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || vendorRecords[0].id !== attempt.vendor_id) {
        return Response.json({ error: 'Forbidden - this assignment belongs to another vendor' }, { status: 403 });
      }
    }

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
      // Race condition check: verify call hasn't been assigned to another vendor
      if (call.assigned_vendor_id && ['vendor_enroute', 'in_progress'].includes(call.call_status)) {
        await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
          status: 'expired',
          decline_reason: 'קריאה כבר שובצה לספק אחר'
        });
        return Response.json({
          success: false,
          error: 'Call already assigned to another vendor',
          assigned_vendor_name: call.assigned_vendor_name
        }, { status: 409 });
      }

      // Duplicate prevention: a vendor cannot accept this call while already handling
      // another active call (guards against being offered two calls at once).
      const ACTIVE_CALL_STATUSES = ['vendor_enroute', 'vendor_arrived', 'in_progress'];
      const vendorActiveGroups = await Promise.all(
        ACTIVE_CALL_STATUSES.map(s =>
          base44.asServiceRole.entities.Call.filter({ assigned_vendor_id: attempt.vendor_id, call_status: s })
        )
      );
      const vendorOtherActive = vendorActiveGroups.flat().filter(c => c.id !== call.id);
      if (vendorOtherActive.length > 0) {
        await base44.asServiceRole.entities.CallAssignmentAttempt.update(attempt.id, {
          status: 'expired',
          decline_reason: 'הספק כבר מטפל בקריאה פעילה אחרת'
        });
        return Response.json({
          success: false,
          error: 'Vendor already handling another active call',
          active_call_id: vendorOtherActive[0].id
        }, { status: 409 });
      }

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

      // Fetch admins and operators for notifications
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      const notifyUsers = [...admins, ...operators];

      for (const op of notifyUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: 'ספק אישר קריאה',
          message: `הספק ${vendor?.vendor_name} אישר את קריאה ${call.call_number || call.id.substring(0,8)}`,
          type: 'success',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call'
        });
      }

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

      // Fetch admins and operators for notifications
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      const notifyUsers = [...admins, ...operators];
      const vendorName = (await base44.asServiceRole.entities.Vendor.filter({ id: attempt.vendor_id }))[0]?.vendor_name || 'ספק';

      for (const op of notifyUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: 'ספק דחה קריאה',
          message: `הספק ${vendorName} דחה את קריאה ${call.call_number || call.id.substring(0,8)}. סיבה: ${decline_reason || 'לא צוינה'}`,
          type: 'warning',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call'
        });
      }

      // Get all previous declined vendors for this call
      const previousAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
        call_id: call.id,
        status: 'declined'
      });
      const excludeVendorIds = previousAttempts.map(a => a.vendor_id);

      // Try to offer the call to the next best vendor (direct, service-role)
      const offer = await autoOfferCall(base44, call, excludeVendorIds);

      if (offer.success && offer.recommendation) {
        return Response.json({
          success: true,
          action: 'declined',
          message: 'Assignment declined, offered to alternative vendor',
          next_recommendation: offer.recommendation
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
    return Response.json({ error: 'Failed to handle assignment response' }, { status: 500 });
  }
});
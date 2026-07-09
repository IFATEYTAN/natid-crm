import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts';
import { getBusyVendorIds, commitVendorAssignment, hasActivePendingAttemptForCall } from './_shared/assignVendor.ts';
import { syncCallStatus } from './_shared/syncCallStatus.ts';

/**
 * Assign a SPECIFIC vendor to a call as an offer (offer + accept model).
 *
 * Used by the operator's AssignVendorDialog (manual pick and after an auto recommendation).
 * Creates a pending CallAssignmentAttempt, moves the call to 'assigning', and notifies the
 * vendor (in-app + SMS). The vendor then accepts/declines via handleAssignmentResponse.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const appRole = await resolveAppRole(base44, user);
    if (!user || !['admin', 'operator'].includes(appRole)) {
      return Response.json(
        { error: 'Unauthorized - admin or operator role required' },
        { status: 403 }
      );
    }

    const { call_id, vendor_id } = await req.json();
    if (!call_id || !vendor_id) {
      return Response.json({ error: 'call_id and vendor_id are required' }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Don't re-offer a call that is already being actively handled
    if (call.assigned_vendor_id && ['vendor_enroute', 'in_progress'].includes(call.call_status)) {
      return Response.json(
        {
          success: false,
          error: 'Call already assigned to a vendor',
          assigned_vendor_name: call.assigned_vendor_name,
        },
        { status: 409 }
      );
    }

    // Don't create a second offer while one is already pending on this call — the
    // earlier vendor's offer would otherwise be silently orphaned (still shown to
    // them, still acceptable) while assigned_vendor_id gets overwritten underneath it.
    if (await hasActivePendingAttemptForCall(base44, call_id)) {
      return Response.json(
        { success: false, error: 'Call already has a pending assignment offer' },
        { status: 409 }
      );
    }

    const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendor_id });
    const vendor = vendors?.[0];
    if (!vendor) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Duplicate prevention: the chosen vendor must be available and not already occupied
    if (vendor.availability_status && vendor.availability_status !== 'available') {
      return Response.json(
        { success: false, error: 'Vendor is not available', availability: vendor.availability_status },
        { status: 409 }
      );
    }
    const busy = await getBusyVendorIds(base44, call_id);
    if (busy.has(vendor_id)) {
      return Response.json(
        { success: false, error: 'Vendor is already handling another call or has a pending offer' },
        { status: 409 }
      );
    }

    const attempt = await commitVendorAssignment(base44, { call, vendor });

    // Mirror the 'assigning' status onto WorkQueue + Case
    await syncCallStatus(base44, call, 'assigning');

    // History entry for the offer
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: call.call_number,
      change_type: 'vendor_assignment',
      new_value: vendor.vendor_name,
      notes: `הוצעה קריאה לספק ${vendor.vendor_name} (ממתין לאישור)`,
      changed_by: user?.email || 'operator',
    });

    return Response.json({
      success: true,
      attempt_id: attempt.id,
      expires_at: attempt.expires_at,
      vendor_name: vendor.vendor_name,
    });
  } catch (error) {
    console.error('assignVendorToCall error:', error);
    return Response.json({ error: 'Failed to assign vendor' }, { status: 500 });
  }
});

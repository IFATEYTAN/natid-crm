import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fields a vendor is allowed to update on a call
const ALLOWED_VENDOR_FIELDS = [
  'call_status',
  'vendor_notes',
  'vendor_arrival_time_actual',
  'closed_at',
  'closed_by',
];

// Valid status transitions for vendors
const VENDOR_STATUS_TRANSITIONS: Record<string, string[]> = {
  vendor_assigned: ['vendor_enroute'],
  vendor_enroute: ['in_progress'],
  in_progress: ['completed'],
};

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

    // Get the call
    const calls = await base44.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Ownership check: vendors can only update calls assigned to them
    if (user.role === 'vendor') {
      const vendorRecords = await base44.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || call.assigned_vendor_id !== vendorRecords[0].id) {
        return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
      }
    } else if (!['admin', 'operator'].includes(user.role)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    // Filter to allowed fields only (vendors can't change arbitrary fields)
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (user.role === 'vendor' && !ALLOWED_VENDOR_FIELDS.includes(key)) {
        continue; // Silently skip disallowed fields for vendors
      }
      sanitizedUpdates[key] = value;
    }

    // Validate status transitions for vendors
    if (user.role === 'vendor' && sanitizedUpdates.call_status) {
      const currentStatus = call.call_status;
      const allowedNext = VENDOR_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(sanitizedUpdates.call_status as string)) {
        return Response.json({
          error: `Invalid status transition from ${currentStatus} to ${sanitizedUpdates.call_status}`,
        }, { status: 400 });
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Perform the update
    await base44.entities.Call.update(call_id, sanitizedUpdates);

    return Response.json({
      success: true,
      updated_fields: Object.keys(sanitizedUpdates),
    });

  } catch (error) {
    console.error('Error updating vendor call:', error);
    return Response.json({ error: 'Failed to update call' }, { status: 500 });
  }
});

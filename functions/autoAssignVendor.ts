import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { callId } = await req.json();

    if (!callId) {
      return Response.json({ error: 'Call ID is required' }, { status: 400 });
    }

    // Get call details
    const calls = await base44.asServiceRole.entities.Call.filter({ id: callId });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const call = calls[0];

    // Get all active vendors
    const vendors = await base44.asServiceRole.entities.Vendor.filter({ 
      is_active: true,
      is_available_now: true 
    });

    if (vendors.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No available vendors found' 
      });
    }

    // Filter by service type and coverage area
    let suitableVendors = vendors.filter(v => {
      // Check if vendor provides required service
      const providesService = v.service_type?.includes(mapIssueToService(call.issue_type));
      
      // Check if vendor covers the area
      const coversArea = v.coverage_areas?.includes(call.pickup_location_area);
      
      return providesService && coversArea;
    });

    if (suitableVendors.length === 0) {
      // If no exact match, try any vendor that covers the area
      suitableVendors = vendors.filter(v => 
        v.coverage_areas?.includes(call.pickup_location_area)
      );
    }

    if (suitableVendors.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No suitable vendors found for this area and service type' 
      });
    }

    // Sort by rating and availability
    suitableVendors.sort((a, b) => {
      const ratingDiff = (b.average_rating || 0) - (a.average_rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (a.average_response_time || 999) - (b.average_response_time || 999);
    });

    const selectedVendor = suitableVendors[0];

    // Assign vendor to call
    await base44.asServiceRole.entities.Call.update(callId, {
      assigned_vendor_id: selectedVendor.id,
      assigned_vendor_name: selectedVendor.vendor_name,
      call_status: 'assigning',
      assigned_at: new Date().toISOString()
    });

    // Log assignment
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: callId,
      call_number: call.call_number,
      change_type: 'vendor_assignment',
      new_value: selectedVendor.vendor_name,
      changed_by: 'System (Auto-Assignment)',
      notes: `שובץ אוטומטית על פי מיקום, סוג שירות וזמינות`
    });

    // Send SMS to vendor
    try {
      await base44.functions.invoke('sendSMS', {
        phone: selectedVendor.phone,
        message: `קריאה חדשה ${call.call_number}: ${call.customer_name}, ${call.pickup_location_address}. ${call.issue_type}`,
        callId
      });
    } catch (smsError) {
      console.error('Failed to send SMS to vendor:', smsError);
    }

    return Response.json({ 
      success: true,
      vendor: {
        id: selectedVendor.id,
        name: selectedVendor.vendor_name,
        phone: selectedVendor.phone
      },
      message: `Vendor assigned successfully: ${selectedVendor.vendor_name}`
    });

  } catch (error) {
    console.error('Auto-assign error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

// Helper function to map issue types to service types
function mapIssueToService(issueType) {
  const mapping = {
    'mechanical': 'mechanic',
    'stopped_driving': 'tow_truck',
    'flat_tire': 'tire_service',
    'stuck_wheel': 'tow_truck',
    'accident': 'tow_truck',
    'no_fuel': 'fuel_delivery',
    'dead_battery': 'mechanic',
    'locked_keys': 'locksmith'
  };
  return mapping[issueType] || 'tow_truck';
}
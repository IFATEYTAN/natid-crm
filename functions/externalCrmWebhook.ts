import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify webhook secret - fail closed if not configured
    const webhookSecret = req.headers.get('x-webhook-secret');
    const savedSettings = Deno.env.get('WEBHOOK_SECRET');

    if (!savedSettings || webhookSecret !== savedSettings) {
      return Response.json({
        error: 'Invalid or missing webhook secret',
        success: false
      }, { status: 401 });
    }

    // Parse incoming payload
    const payload = await req.json();

    // Validate required fields
    if (!payload.customer || !payload.case) {
      return Response.json({
        success: false,
        error: 'Missing required fields: customer and case are required'
      }, { status: 400 });
    }

    // Map issue type
    const issueTypeMap = {
      'mechanical': 'mechanical',
      'towing': 'stopped_driving',
      'flat_tire': 'flat_tire',
      'tire': 'flat_tire',
      'battery': 'dead_battery',
      'lockout': 'locked_keys',
      'fuel': 'no_fuel',
      'accident': 'accident',
      'default': 'mechanical'
    };

    const issueType = issueTypeMap[payload.case.type?.toLowerCase()] || 'mechanical';

    // Map priority
    const priorityMap = {
      'low': 'normal',
      'normal': 'normal',
      'medium': 'normal',
      'high': 'urgent',
      'urgent': 'urgent',
      'critical': 'urgent'
    };

    const priority = priorityMap[payload.case.priority?.toLowerCase()] || 'normal';

    // Calculate area from city
    let area = 'center';
    if (payload.case.location?.city) {
      const city = payload.case.location.city;
      const centerCities = ['תל אביב', 'רמת גן', 'Tel Aviv', 'Ramat Gan'];
      const northCities = ['חיפה', 'Haifa', 'נהריה', 'Nahariya'];
      const southCities = ['באר שבע', 'Beer Sheva', 'אילת', 'Eilat'];
      const jerusalemCities = ['ירושלים', 'Jerusalem'];
      
      if (northCities.some(c => city.includes(c))) area = 'north';
      else if (southCities.some(c => city.includes(c))) area = 'south';
      else if (jerusalemCities.some(c => city.includes(c))) area = 'jerusalem';
    }

    // Generate call number
    const callNumber = `C-${Date.now().toString().slice(-8)}`;

    // Create Call
    const call = await base44.asServiceRole.entities.Call.create({
      call_number: callNumber,
      call_status: 'waiting_treatment',
      created_by_source: 'customer_app',
      call_priority: priority,
      
      // Customer info
      customer_name: payload.customer.name,
      customer_phone: payload.customer.phone,
      customer_email: payload.customer.email,
      
      // Issue details
      issue_type: issueType,
      issue_description: payload.case.description,
      
      // Location
      pickup_location_address: payload.case.location?.address,
      pickup_location_city: payload.case.location?.city,
      pickup_location_area: area,
      pickup_location_lat: payload.case.location?.lat,
      pickup_location_lon: payload.case.location?.lon,
      
      // Vehicle
      vehicle_plate: payload.case.vehicle?.plate,
      vehicle_model: payload.case.vehicle?.model,
      vehicle_type: payload.case.vehicle?.type || 'private',
      
      sla_target: 30
    });

    // Add to work queue
    const queueItem = await base44.asServiceRole.entities.WorkQueue.create({
      call_id: call.id,
      queue_status: 'waiting_in_queue',
      priority_score: priority === 'urgent' ? 80 : 50,
      added_to_queue_at: new Date().toISOString()
    });

    // Log to call history
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: callNumber,
      change_type: 'status',
      new_value: 'waiting_treatment',
      notes: `קריאה נוצרה מ-CRM חיצוני (${payload.metadata?.source || 'unknown'}). CRM ID: ${payload.metadata?.crm_id || 'N/A'}`,
      changed_by: 'External CRM Webhook'
    });

    // Try auto-assign vendor
    try {
      const autoAssignResult = await base44.functions.invoke('autoAssignVendor', {
        callId: call.id
      });
      
      if (autoAssignResult?.data?.success) {
        console.log('Vendor auto-assigned:', autoAssignResult.data.vendor.name);
      }
    } catch (autoAssignError) {
      console.log('Auto-assign skipped:', autoAssignError.message);
    }

    // Send SMS to customer
    try {
      await base44.functions.invoke('sendSMS', {
        phone: payload.customer.phone,
        message: `שלום ${payload.customer.name}, קריאתך ${callNumber} נוצרה בהצלחה. נעדכן אותך בהקדם.`,
        callId: call.id
      });
    } catch (smsError) {
      console.log('SMS not sent:', smsError.message);
    }

    return Response.json({
      success: true,
      call_id: call.id,
      call_number: callNumber,
      queue_id: queueItem.id,
      message: 'Call created successfully from external CRM',
      status: 'created'
    });

  } catch (error) {
    console.error('External CRM webhook error:', error);
    return Response.json({
      success: false,
      error: 'Failed to process webhook'
    }, { status: 500 });
  }
});
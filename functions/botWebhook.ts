import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify webhook secret to prevent unauthorized call creation
    const webhookSecret = req.headers.get('x-webhook-secret');
    const savedSecret = Deno.env.get('BOT_WEBHOOK_SECRET');

    if (!savedSecret || webhookSecret !== savedSecret) {
      return Response.json({
        success: false,
        error: 'Invalid or missing webhook secret'
      }, { status: 401 });
    }

    // Parse incoming webhook data from bot
    const data = await req.json();

    // Validate required fields
    if (!data.customer_name || !data.customer_phone || !data.pickup_location_address) {
      return Response.json({
        success: false,
        error: 'חסרים שדות חובה'
      }, { status: 400 });
    }
    
    // Generate unique call number
    const callNumber = `C-${Date.now().toString().slice(-8)}`;
    
    // Map bot data to Call entity
    const callData = {
      call_number: callNumber,
      call_status: 'waiting_treatment',
      created_by_source: 'bot',
      call_priority: data.is_urgent ? 'urgent' : 'normal',
      
      // Customer details
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_phone_2: data.customer_phone_2,
      customer_id_number: data.customer_id_number,
      customer_email: data.customer_email,
      customer_address: data.customer_address,
      
      // Insurance & membership
      insurance_company: data.insurance_company,
      membership_package: data.membership_package,
      membership_number: data.membership_number,
      
      // Vehicle details
      vehicle_plate: data.vehicle_plate,
      vehicle_model: data.vehicle_model,
      vehicle_year: data.vehicle_year,
      vehicle_type: data.vehicle_type || 'private',
      fuel_type: data.fuel_type,
      
      // Issue details
      issue_type: data.issue_type,
      issue_description: data.issue_description,
      
      // Location
      pickup_location_address: data.pickup_location_address,
      pickup_location_city: data.pickup_location_city,
      pickup_location_area: data.pickup_location_area,
      pickup_location_lat: data.pickup_location_lat,
      pickup_location_lon: data.pickup_location_lon,
      
      // Dropoff location
      dropoff_location_address: data.dropoff_location_address,
      dropoff_location_city: data.dropoff_location_city,
      dropoff_location_area: data.dropoff_location_area,
      dropoff_garage_name: data.dropoff_garage_name,
      dropoff_garage_phone: data.dropoff_garage_phone,
      
      // Questionnaire data
      is_road_accessible: data.questionnaire?.is_road_accessible,
      is_underground_parking: data.questionnaire?.is_underground_parking,
      is_gear_neutral: data.questionnaire?.is_gear_neutral,
      is_steering_locked: data.questionnaire?.is_steering_locked,
      is_handbrake_released: data.questionnaire?.is_handbrake_released,
      is_toll_road: data.questionnaire?.is_toll_road,
      is_customer_with_vehicle: data.questionnaire?.is_customer_with_vehicle,
      has_key: data.questionnaire?.has_key,
      
      // Generate customer response code for identification
      customer_response_code: Math.floor(1000 + Math.random() * 9000).toString(),
      
      // SLA settings (30 minutes default)
      sla_target: 30,
      sla_status: 'on_track',
      time_waiting: 0
    };
    
    // Create the call using service role
    const newCall = await base44.asServiceRole.entities.Call.create(callData);
    
    // Create history record
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: newCall.id,
      call_number: callNumber,
      change_type: 'status',
      new_value: 'waiting_treatment',
      notes: 'קריאה נוצרה מבוט 99 Digital',
      changed_by: 'Bot System'
    });
    
    // Send SMS to customer (using Core integration)
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: data.customer_email || 'notifications@natidroad.co.il',
        subject: `קריאה #${callNumber} נפתחה בהצלחה`,
        body: `שלום ${data.customer_name},\n\nקריאה מספר ${callNumber} נפתחה בהצלחה.\nקוד זיהוי: ${callData.customer_response_code}\n\nנציג יחזור אליך בהקדם.\n\nבברכה,\nנתי שירותי דרך`
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }
    
    // Return success response to bot
    return Response.json({
      success: true,
      call_id: newCall.id,
      call_number: callNumber,
      customer_response_code: callData.customer_response_code,
      message: `קריאה #${callNumber} נוצרה בהצלחה`
    });
    
  } catch (error) {
    console.error('Bot webhook error:', error);
    return Response.json({
      success: false,
      error: 'שגיאה ביצירת קריאה'
    }, { status: 500 });
  }
});
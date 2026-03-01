import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, getClientIP, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    // Rate limit: 100 webhook requests per IP per minute
    const clientIP = getClientIP(req);
    const rl = await limiter.check('bot_webhook', clientIP, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const base44 = createClientFromRequest(req);

    // Verify webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-bot-api-key');
    const expectedSecret = Deno.env.get('BOT_WEBHOOK_SECRET');

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return Response.json({
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'Invalid or missing webhook secret'
      }, { status: 401 });
    }

    // Parse incoming data from 99 Digital Bot
    const data = await req.json();
    
    // Validate required fields
    const requiredFields = [
      'customer.name',
      'customer.phone',
      'vehicle.plate',
      'incident.type',
      'incident.pickup_location.address'
    ];
    
    const missingFields = [];
    if (!data.customer?.name) missingFields.push('customer.name');
    if (!data.customer?.phone) missingFields.push('customer.phone');
    if (!data.vehicle?.plate) missingFields.push('vehicle.plate');
    if (!data.incident?.type) missingFields.push('incident.type');
    if (!data.incident?.pickup_location?.address) missingFields.push('incident.pickup_location.address');
    
    if (missingFields.length > 0) {
      return Response.json({
        success: false,
        error_code: 'VALIDATION_ERROR',
        message: 'חסרים שדות חובה',
        missing_fields: missingFields
      }, { status: 400 });
    }

    // Calculate area from city if not provided
    let area = data.incident.pickup_location.area;
    if (!area && data.incident.pickup_location.city) {
      const city = data.incident.pickup_location.city;
      const centerCities = ['תל אביב', 'רמת גן', 'גבעתיים', 'בני ברק', 'חולון', 'בת ים', 'רמת השרון'];
      const northCities = ['חיפה', 'נהריה', 'עכו', 'טבריה', 'צפת', 'קריית שמונה'];
      const southCities = ['באר שבע', 'אילת', 'אשדוד', 'אשקלון', 'קרית גת'];
      const jerusalemCities = ['ירושלים', 'בית שמש', 'מעלה אדומים'];
      
      if (centerCities.includes(city)) area = 'center';
      else if (northCities.includes(city)) area = 'north';
      else if (southCities.includes(city)) area = 'south';
      else if (jerusalemCities.includes(city)) area = 'jerusalem';
      else area = 'center'; // default
    }

    // Generate call number
    const callNumber = `C-${Date.now().toString().slice(-8)}`;
    
    // Generate customer response code if not provided
    let customerResponseCode = data.questionnaire?.customer_response_code;
    if (!customerResponseCode) {
      const randomBytes = new Uint32Array(1);
      crypto.getRandomValues(randomBytes);
      customerResponseCode = `NC${(randomBytes[0] % 900000 + 100000).toString()}`;
    }
    
    // Calculate priority score
    let priorityScore = 50; // Base score for bot calls
    if (data.customer.is_vip) priorityScore += 30;
    if (data.incident.priority === 'דחוף' || data.incident.priority === 'urgent') priorityScore += 25;
    if (area === 'center') priorityScore += 5;
    if (data.incident.type === 'accident') priorityScore += 20;
    
    // Create Call entity
    const call = await base44.asServiceRole.entities.Call.create({
      call_number: callNumber,
      call_status: 'waiting_treatment',
      created_by_source: 'bot',
      call_priority: data.incident.priority === 'דחוף' ? 'urgent' : 'normal',
      is_vip: data.customer.is_vip || false,
      
      // Customer
      customer_name: data.customer.name,
      customer_phone: data.customer.phone,
      customer_phone_2: data.customer.phone_2,
      customer_id_number: data.customer.id_number,
      customer_email: data.customer.email,
      customer_address: data.customer.address,
      insurance_company: data.customer.insurance_company,
      membership_number: data.customer.membership_number,
      membership_package: data.customer.membership_package,
      
      // Vehicle
      vehicle_plate: data.vehicle.plate,
      vehicle_model: data.vehicle.model,
      vehicle_year: data.vehicle.year,
      vehicle_type: data.vehicle.type,
      fuel_type: data.vehicle.fuel_type,
      
      // Incident
      issue_type: data.incident.type,
      issue_description: data.incident.description,
      pickup_location_address: data.incident.pickup_location.address,
      pickup_location_city: data.incident.pickup_location.city,
      pickup_location_area: area,
      pickup_location_lat: data.incident.pickup_location.lat,
      pickup_location_lon: data.incident.pickup_location.lon,
      dropoff_location_address: data.incident.dropoff_location?.address,
      dropoff_location_city: data.incident.dropoff_location?.city,
      dropoff_garage_name: data.incident.dropoff_location?.garage_name,
      dropoff_garage_phone: data.incident.dropoff_location?.garage_phone,
      
      // Questionnaire
      is_road_accessible: data.questionnaire?.is_road_accessible,
      is_underground_parking: data.questionnaire?.is_underground_parking,
      is_gear_neutral: data.questionnaire?.is_gear_neutral,
      is_steering_locked: data.questionnaire?.is_steering_locked,
      is_handbrake_released: data.questionnaire?.is_handbrake_released,
      is_toll_road: data.questionnaire?.is_toll_road,
      is_customer_with_vehicle: data.questionnaire?.is_customer_with_vehicle,
      has_key: data.questionnaire?.has_key,
      customer_response_code: customerResponseCode,
      
      sla_target: 30
    });

    // Find available agent (load balancing)
    const agents = await base44.asServiceRole.entities.User.list();
    const operatorAgents = agents.filter(a => a.role === 'user');
    
    if (operatorAgents.length === 0) {
      // No agents available, add to general queue
      await base44.asServiceRole.entities.WorkQueue.create({
        call_id: call.id,
        assigned_to_agent: null,
        queue_status: 'waiting_in_queue',
        priority_score: priorityScore,
        added_to_queue_at: new Date().toISOString()
      });
      
      await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        call_number: callNumber,
        change_type: 'status',
        new_value: 'waiting_treatment',
        notes: `קריאה נוצרה מבוט 99 Digital דרך ${data.channel || 'WhatsApp'}. ממתין לשיבוץ נציג`,
        changed_by: 'בוט'
      });
      
      return Response.json({
        success: true,
        call_id: call.id,
        call_number: callNumber,
        status: 'created',
        message: 'קריאה נוצרה בהצלחה וממתינה בתור',
        assigned_to_agent: null,
        estimated_time: '10-15 דקות',
        customer_response_code: customerResponseCode
      });
    }
    
    // Get current queue counts per agent
    const queueItems = await base44.asServiceRole.entities.WorkQueue.list();
    const activeQueues = queueItems.filter(q => 
      ['assigned_to_agent', 'in_progress'].includes(q.queue_status)
    );
    
    // Count per agent
    const agentCounts = {};
    operatorAgents.forEach(agent => {
      agentCounts[agent.email] = activeQueues.filter(q => q.assigned_to_agent === agent.email).length;
    });
    
    // Find agent with minimum load
    let assignedAgent = null;
    let minLoad = Infinity;
    for (const agent of operatorAgents) {
      const load = agentCounts[agent.email] || 0;
      if (load < 5 && load < minLoad) { // Max 5 calls per agent
        minLoad = load;
        assignedAgent = agent;
      }
    }
    
    // Add to work queue
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.WorkQueue.create({
      call_id: call.id,
      assigned_to_agent: assignedAgent?.email,
      queue_status: assignedAgent ? 'assigned_to_agent' : 'waiting_in_queue',
      priority_score: priorityScore,
      added_to_queue_at: now,
      assigned_at: assignedAgent ? now : null
    });
    
    // Log to call history
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: callNumber,
      change_type: 'status',
      new_value: 'waiting_treatment',
      notes: `קריאה נוצרה מבוט 99 Digital דרך ${data.channel || 'WhatsApp'}${assignedAgent ? `, שובץ ל-${assignedAgent.full_name}` : ', הוכנס לתור כללי'}`,
      changed_by: 'בוט'
    });
    
    // Try auto-assign vendor if automation is enabled
    try {
      const autoAssignResult = await base44.functions.invoke('autoAssignVendor', {
        callId: call.id
      });
      
      if (autoAssignResult?.data?.success) {
        console.log('Vendor auto-assigned:', autoAssignResult.data.vendor.name);
      }
    } catch (autoAssignError) {
      console.log('Auto-assign not triggered:', autoAssignError.message);
    }

    // Send SMS to customer
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'נתי שירותי דרך',
        to: data.customer.email || data.customer.phone + '@sms-gateway.co.il',
        subject: `קריאה ${callNumber} נפתחה`,
        body: `שלום ${data.customer.name},\n\nקריאה מספר ${callNumber} נפתחה בהצלחה.\n\nהקוד שלך: ${customerResponseCode}\n\nנעדכן אותך ב-SMS ברגע שספק ישובץ.\n\nנתי שירותי דרך`
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }
    
    return Response.json({
      success: true,
      call_id: call.id,
      call_number: callNumber,
      status: 'created',
      message: 'קריאה נוצרה בהצלחה',
      assigned_to_agent: assignedAgent?.full_name || null,
      estimated_time: assignedAgent ? '5-10 דקות' : '10-15 דקות',
      customer_response_code: customerResponseCode,
      bot_session_id: data.bot_session_id
    });
    
  } catch (error) {
    console.error('Error creating call from 99 Digital bot:', error);
    return Response.json({
      success: false,
      error_code: 'INTERNAL_ERROR',
      message: 'שגיאה ביצירת קריאה',
      details: 'Internal server error'
    }, { status: 500 });
  }
});
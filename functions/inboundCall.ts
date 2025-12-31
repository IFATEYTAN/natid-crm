import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse incoming data from external CRM
    const data = await req.json();
    
    // Validate required fields
    if (!data.customer?.name || !data.customer?.phone || !data.incident?.pickup_location?.address) {
      return Response.json({
        success: false,
        error_code: 'VALIDATION_ERROR',
        message: 'חסרים שדות חובה',
        details: {
          required: ['customer.name', 'customer.phone', 'incident.pickup_location.address']
        }
      }, { status: 400 });
    }

    // Generate call number
    const callNumber = `C-${Date.now().toString().slice(-8)}`;
    
    // Calculate priority score
    let priorityScore = 0;
    if (data.customer.is_vip) priorityScore += 30;
    if (data.incident.priority === 'urgent' || data.incident.priority === 'critical') priorityScore += 25;
    if (data.incident.pickup_location.area === 'center') priorityScore += 5;
    
    // Create Call entity
    const call = await base44.asServiceRole.entities.Call.create({
      call_number: callNumber,
      call_status: 'waiting_treatment',
      created_by_source: data.source_system || 'api',
      call_priority: data.incident.priority || 'normal',
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
      vehicle_plate: data.vehicle?.plate,
      vehicle_model: data.vehicle?.model,
      vehicle_year: data.vehicle?.year,
      vehicle_type: data.vehicle?.type,
      fuel_type: data.vehicle?.fuel_type,
      
      // Incident
      issue_type: data.incident.type,
      issue_description: data.incident.description,
      pickup_location_address: data.incident.pickup_location.address,
      pickup_location_city: data.incident.pickup_location.city,
      pickup_location_area: data.incident.pickup_location.area,
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
      customer_response_code: data.questionnaire?.customer_response_code,
      
      sla_target: 30
    });

    // Find available agent (simple round-robin logic)
    const agents = await base44.asServiceRole.entities.User.list();
    const operatorAgents = agents.filter(a => a.role === 'user'); // assuming operators are 'user' role
    
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
    const queueItem = await base44.asServiceRole.entities.WorkQueue.create({
      call_id: call.id,
      assigned_to_agent: assignedAgent?.email,
      queue_status: assignedAgent ? 'assigned_to_agent' : 'waiting_in_queue',
      priority_score: priorityScore,
      added_to_queue_at: new Date().toISOString(),
      assigned_at: assignedAgent ? new Date().toISOString() : null
    });
    
    // Log to call history
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: callNumber,
      change_type: 'status',
      new_value: 'waiting_treatment',
      notes: `קריאה נוצרה ממערכת ${data.source_system || 'חיצונית'}${assignedAgent ? `, שובץ ל-${assignedAgent.full_name}` : ''}`,
      changed_by: 'system'
    });
    
    return Response.json({
      success: true,
      call_id: call.id,
      call_number: callNumber,
      status: 'created',
      message: 'קריאה נוצרה בהצלחה',
      assigned_to_agent: assignedAgent?.email,
      estimated_processing_time: '5 minutes'
    });
    
  } catch (error) {
    console.error('Error creating call:', error);
    return Response.json({
      success: false,
      error_code: 'INTERNAL_ERROR',
      message: 'שגיאה ביצירת קריאה',
      details: error.message
    }, { status: 500 });
  }
});
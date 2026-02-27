import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Verify caller is admin/operator
    const user = await base44.auth.me();
    if (!user || !['admin', 'operator'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
    }
    
    // Fetch all enabled settings
    const settings = await base44.asServiceRole.entities.NotificationSetting.filter({ enabled: true });
    
    if (!settings || settings.length === 0) {
      return Response.json({ success: true, message: 'No enabled settings found' });
    }

    // Get active calls for checking
    const calls = await base44.asServiceRole.entities.Case.filter({ 
      status: ['new', 'assigned', 'en_route', 'on_site', 'in_progress'] // Active statuses
    });

    const notifications = [];
    const now = new Date();

    // Get all users to map roles/ids if needed (caching this would be better in real app)
    // For now, we might just notify admins or specific users.
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminIds = admins.map(u => u.id);

    for (const setting of settings) {
      // 1. Unassigned Calls
      if (setting.event === 'call_unassigned') {
        const timeThreshold = setting.conditions?.timeThreshold || 10;
        
        for (const call of calls) {
          if (!call.assigned_provider_id && call.status === 'new') {
            const createdDate = new Date(call.created_date);
            const minutesWaiting = (now - createdDate) / 1000 / 60;
            
            if (minutesWaiting >= timeThreshold) {
              // Check if we already notified recently? (Hard without extra state)
              // For now, we will create notification. The Notification Center can dedup or we just spam for urgency.
              // To avoid spam: check if notification exists for this call & event in last X time.
              // Skipping complexity for this MVP.
              
              await createNotifications(base44, setting, adminIds, {
                call_number: call.case_number || call.id.substring(0,8),
                customer_name: call.customer_name,
                time: Math.floor(minutesWaiting),
                link: `/CaseDetails?id=${call.id}`,
                id: call.id,
                entityType: 'case'
              });
              notifications.push(`Unassigned: ${call.id}`);
            }
          }
        }
      }

      // 2. SLA Near Breach
      if (setting.event === 'sla_near_breach') {
        const minutesBefore = setting.conditions?.minutesBefore || 15;
        
        for (const call of calls) {
          // Check Response SLA
          if (call.sla_response_deadline && !call.sla_response_met) {
             const deadline = new Date(call.sla_response_deadline);
             const minutesUntil = (deadline - now) / 1000 / 60;
             
             if (minutesUntil > 0 && minutesUntil <= minutesBefore) {
               await createNotifications(base44, setting, adminIds, {
                call_number: call.case_number || call.id.substring(0,8),
                customer_name: call.customer_name,
                time: Math.floor(minutesUntil),
                type: 'Response SLA',
                link: `/CaseDetails?id=${call.id}`,
                id: call.id,
                entityType: 'case'
              });
               notifications.push(`SLA Response: ${call.id}`);
             }
          }
          
          // Check Arrival SLA
           if (call.sla_arrival_deadline && !call.sla_arrival_met) {
             const deadline = new Date(call.sla_arrival_deadline);
             const minutesUntil = (deadline - now) / 1000 / 60;
             
             if (minutesUntil > 0 && minutesUntil <= minutesBefore) {
               await createNotifications(base44, setting, adminIds, {
                call_number: call.case_number || call.id.substring(0,8),
                customer_name: call.customer_name,
                time: Math.floor(minutesUntil),
                type: 'Arrival SLA',
                link: `/CaseDetails?id=${call.id}`,
                id: call.id,
                entityType: 'case'
              });
               notifications.push(`SLA Arrival: ${call.id}`);
             }
          }
        }
      }
    }

    return Response.json({
      success: true,
      notifications_created: notifications.length
    });

  } catch (error) {
    console.error('Notification check error:', error);
    return Response.json({ error: 'Failed to check notifications' }, { status: 500 });
  }
});

async function createNotifications(base44, setting, recipientIds, data) {
  if (!setting.channels?.inApp) return;

  let title = setting.message_template?.title || setting.name;
  let body = setting.message_template?.body || 'התראה מערכת';

  // Replace variables
  Object.keys(data).forEach(key => {
    // Regex to replace all occurrences
    title = title.replace(new RegExp(`{${key}}`, 'g'), data[key] || '');
    body = body.replace(new RegExp(`{${key}}`, 'g'), data[key] || '');
  });

  // Dedup: Ideally check if notification exists
  // For MVP, simply create.
  
  for (const userId of recipientIds) {
    await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      title: title,
      message: body,
      type: 'warning',
      is_read: false,
      link: data.link,
      related_entity_id: data.id,
      related_entity_type: data.entityType,
      created_at: new Date().toISOString()
    });
  }
}
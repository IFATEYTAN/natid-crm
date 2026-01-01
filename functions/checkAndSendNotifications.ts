import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get notification settings
    const { notificationSettings } = await req.json();
    
    if (!notificationSettings || notificationSettings.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No notifications configured',
        notifications_sent: 0
      });
    }

    // Get all active calls
    const calls = await base44.asServiceRole.entities.Call.list();
    const queueItems = await base44.asServiceRole.entities.WorkQueue.list();
    
    const notifications = [];
    const now = new Date();

    for (const setting of notificationSettings) {
      if (!setting.enabled) continue;

      for (const call of calls) {
        let shouldNotify = false;
        let reason = '';

        // Check event type
        switch (setting.event) {
          case 'call_unassigned':
            if (!call.assigned_vendor_id) {
              const createdDate = new Date(call.created_date);
              const minutesWaiting = (now - createdDate) / 1000 / 60;
              
              if (minutesWaiting >= setting.conditions.timeThreshold) {
                shouldNotify = true;
                reason = `קריאה ${call.call_number} לא שובצה ${Math.floor(minutesWaiting)} דקות`;
              }
            }
            break;

          case 'sla_near_breach':
            if (call.sla_target) {
              const createdDate = new Date(call.created_date);
              const minutesElapsed = (now - createdDate) / 1000 / 60;
              const minutesUntilBreach = call.sla_target - minutesElapsed;
              
              if (minutesUntilBreach <= (setting.conditions.minutesBefore || 5) && 
                  minutesUntilBreach > 0 &&
                  call.call_status !== 'completed') {
                shouldNotify = true;
                reason = `קריאה ${call.call_number} תחרוג מ-SLA בעוד ${Math.floor(minutesUntilBreach)} דקות`;
              }
            }
            break;

          case 'low_rating':
            if (call.customer_rating && 
                call.customer_rating <= (setting.conditions.ratingThreshold || 3)) {
              shouldNotify = true;
              reason = `קריאה ${call.call_number} קיבלה דירוג נמוך: ${call.customer_rating}`;
            }
            break;

          case 'call_cancelled':
            if (call.call_status === 'cancelled') {
              const cancelledDate = new Date(call.updated_date);
              const minutesSinceCancelled = (now - cancelledDate) / 1000 / 60;
              
              // Only notify if cancelled in last 5 minutes (avoid duplicates)
              if (minutesSinceCancelled < 5) {
                shouldNotify = true;
                reason = `קריאה ${call.call_number} בוטלה`;
              }
            }
            break;

          case 'vendor_delayed':
            if (call.assigned_vendor_id && 
                call.vendor_arrival_time_estimated &&
                call.call_status === 'vendor_enroute') {
              const estimatedArrival = new Date(call.vendor_arrival_time_estimated);
              const minutesLate = (now - estimatedArrival) / 1000 / 60;
              
              if (minutesLate >= (setting.conditions.delayMinutes || 15)) {
                shouldNotify = true;
                reason = `ספק מאחר ${Math.floor(minutesLate)} דקות לקריאה ${call.call_number}`;
              }
            }
            break;
        }

        if (!shouldNotify) continue;

        // Check conditions
        if (setting.conditions.priority !== 'all') {
          if (call.call_priority !== setting.conditions.priority) {
            continue;
          }
        }

        if (setting.conditions.area !== 'all') {
          if (call.pickup_location_area !== setting.conditions.area) {
            continue;
          }
        }

        // Check location radius
        if (setting.conditions.lat && setting.conditions.lon && setting.conditions.radius) {
          if (call.pickup_location_lat && call.pickup_location_lon) {
            const distance = calculateDistance(
              setting.conditions.lat,
              setting.conditions.lon,
              call.pickup_location_lat,
              call.pickup_location_lon
            );
            
            if (distance > setting.conditions.radius) {
              continue;
            }
          } else {
            continue; // Skip if call doesn't have location
          }
        }

        // Send notifications
        const message = setting.message.body
          .replace('{call_number}', call.call_number)
          .replace('{customer_name}', call.customer_name)
          .replace('{time}', Math.floor((now - new Date(call.created_date)) / 1000 / 60));

        // SMS
        if (setting.channels.sms) {
          try {
            await base44.functions.invoke('sendSMS', {
              phone: '+972500000000', // Manager's phone (should be configurable)
              message: `${setting.message.title}: ${message}`,
              callId: call.id
            });
          } catch (e) {
            console.error('SMS failed:', e);
          }
        }

        // Email
        if (setting.channels.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'נתי שירותי דרך - התראות',
              to: 'manager@example.com', // Should be configurable
              subject: setting.message.title,
              body: `${message}\n\nקריאה: ${call.call_number}\nלקוח: ${call.customer_name}\nמיקום: ${call.pickup_location_address}`
            });
          } catch (e) {
            console.error('Email failed:', e);
          }
        }

        // In-App (log to history)
        if (setting.channels.inApp) {
          await base44.asServiceRole.entities.CallHistory.create({
            call_id: call.id,
            call_number: call.call_number,
            change_type: 'note',
            new_value: setting.message.title,
            notes: message,
            changed_by: 'System - Notification'
          });
        }

        notifications.push({
          call_number: call.call_number,
          notification: setting.name,
          reason
        });
      }
    }

    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      details: notifications
    });

  } catch (error) {
    console.error('Notification check error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
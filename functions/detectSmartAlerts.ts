import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { differenceInMinutes, subHours } from 'npm:date-fns@3.6.0';

/**
 * Detect smart alerts and create notifications
 * Scenarios:
 * 1. Vendor unavailable > X time
 * 2. Call unassigned > Y time
 * 3. High rejection rate
 * 4. SLA breach risk
 * 5. High average completion time
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Use service role for system tasks
    const client = base44.asServiceRole;

    const admins = await client.entities.User.filter({ role: 'admin' });
    if (!admins.length) return Response.json({ message: 'No admins to notify' });

    const notifications = [];
    const now = new Date();

    // 1. Vendor unavailable > 4 hours
    const unavailableVendors = await client.entities.Vendor.filter({ 
      availability_status: { $ne: 'available' } 
    });
    
    for (const vendor of unavailableVendors) {
      if (vendor.last_location_update) {
        const lastUpdate = new Date(vendor.last_location_update);
        const minutes = differenceInMinutes(now, lastUpdate);
        if (minutes > 240) { // 4 hours
          notifications.push({
            title: 'ספק לא זמין זמן רב',
            message: `הספק ${vendor.vendor_name} לא זמין כבר ${Math.floor(minutes/60)} שעות`,
            type: 'smart_alert',
            link: `/ServiceProviders?search=${vendor.vendor_name}`,
            related_entity_id: vendor.id,
            related_entity_type: 'vendor'
          });
        }
      }
    }

    // 2. Unassigned calls > 15 minutes
    const unassignedCalls = await client.entities.Case.filter({ 
      status: 'new',
      assigned_provider_id: null 
    });

    for (const call of unassignedCalls) {
      const created = new Date(call.created_date);
      const minutes = differenceInMinutes(now, created);
      if (minutes > 15) {
        notifications.push({
          title: 'קריאה ללא שיבוץ',
          message: `קריאה ${call.case_number || call.id.substring(0,8)} ממתינה לשיבוץ כבר ${minutes} דקות`,
          type: 'smart_alert',
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'case'
        });
      }
    }

    // 3. High rejection rate (last 24h)
    const oneDayAgo = subHours(now, 24).toISOString();
    // Fetch attempts manually since we can't do complex aggregation easily via simple SDK yet
    // filtering by created_date might need check if supported, assuming filter works or we fetch all and filter
    const attempts = await client.entities.CallAssignmentAttempt.filter({
      // simple filter, if date filtering not supported, we filter in memory (assuming not huge volume for now)
      // optimization: limit or sort
    });
    
    const attemptsLast24h = attempts.filter(a => a.created_date >= oneDayAgo);
    const vendorStats = {};
    
    for (const att of attemptsLast24h) {
      if (!vendorStats[att.vendor_id]) vendorStats[att.vendor_id] = { total: 0, declined: 0 };
      vendorStats[att.vendor_id].total++;
      if (att.status === 'declined' || att.status === 'expired') {
        vendorStats[att.vendor_id].declined++;
      }
    }

    for (const [vendorId, stats] of Object.entries(vendorStats)) {
      if (stats.total >= 5) { // Minimum samples
        const rate = stats.declined / stats.total;
        if (rate > 0.5) { // 50% rejection
          // Get vendor name
          const vendor = (await client.entities.Vendor.filter({ id: vendorId }))[0];
          if (vendor) {
            notifications.push({
              title: 'אחוז דחיות גבוה',
              message: `הספק ${vendor.vendor_name} דחה ${Math.round(rate*100)}% מהקריאות ביממה האחרונה`,
              type: 'smart_alert',
              link: `/ServiceProviders?id=${vendorId}`,
              related_entity_id: vendorId,
              related_entity_type: 'vendor'
            });
          }
        }
      }
    }

    // 4. SLA Breach Risk (< 30 mins left)
    const activeCalls = await client.entities.Case.filter({ 
      status: { $in: ['new', 'assigned', 'en_route'] } 
    });

    for (const call of activeCalls) {
      if (call.sla_arrival_deadline && !call.sla_arrival_met) {
        const deadline = new Date(call.sla_arrival_deadline);
        const minutesLeft = differenceInMinutes(deadline, now);
        if (minutesLeft > 0 && minutesLeft < 30) {
          notifications.push({
            title: 'סיכון חריגת SLA',
            message: `קריאה ${call.case_number || call.id.substring(0,8)} עומדת לחרוג מזמן הגעה בעוד ${minutesLeft} דקות`,
            type: 'smart_alert',
            link: `/CallDetails?id=${call.id}`,
            related_entity_id: call.id,
            related_entity_type: 'case'
          });
        }
      }
    }

    // 5. High Average Completion Time
    // Calculate global average for last week? Or just use static threshold for now as simpler start
    // Let's compare vendor vs global average for completed calls in last 24h
    const completedCalls = await client.entities.Case.filter({ 
      status: 'completed'
      // filter date in memory
    });
    
    const completedLast24h = completedCalls.filter(c => c.completed_at >= oneDayAgo);
    
    if (completedLast24h.length > 10) {
        const globalTotalTime = completedLast24h.reduce((acc, c) => acc + (c.time_to_completion || 0), 0);
        const globalAvg = globalTotalTime / completedLast24h.length;
        
        const vendorTimes = {};
        for (const c of completedLast24h) {
            if (!c.assigned_provider_id) continue;
            if (!vendorTimes[c.assigned_provider_id]) vendorTimes[c.assigned_provider_id] = [];
            vendorTimes[c.assigned_provider_id].push(c.time_to_completion || 0);
        }

        for (const [vendorId, times] of Object.entries(vendorTimes)) {
            if (times.length >= 3) {
                const vendorAvg = times.reduce((a, b) => a + b, 0) / times.length;
                if (vendorAvg > globalAvg * 1.5) { // 50% slower than average
                    const vendor = (await client.entities.Vendor.filter({ id: vendorId }))[0];
                    if (vendor) {
                         notifications.push({
                            title: 'זמן טיפול חריג',
                            message: `הספק ${vendor.vendor_name} עם זמן טיפול ממוצע של ${Math.round(vendorAvg)} דקות (ממוצע ארצי: ${Math.round(globalAvg)})`,
                            type: 'smart_alert',
                            link: `/ServiceProviders?id=${vendorId}`,
                            related_entity_id: vendorId,
                            related_entity_type: 'vendor'
                        });
                    }
                }
            }
        }
    }

    // Deduplicate and send
    // Simple deduplication: Check if similar notification exists for today?
    // For MVP, just send. But try to avoid spamming every run.
    // Maybe check if smart_alert for same related_entity_id exists in last 1 hour?
    
    const recentAlerts = await client.entities.Notification.filter({
        type: 'smart_alert',
        // filter by date later
    });
    const recentAlertsMap = new Set(recentAlerts.filter(n => 
        new Date(n.created_date) > subHours(now, 1) // last hour
    ).map(n => `${n.related_entity_id}_${n.title}`));

    let createdCount = 0;
    for (const notif of notifications) {
        const key = `${notif.related_entity_id}_${notif.title}`;
        if (!recentAlertsMap.has(key)) {
            // Notify all admins
            for (const admin of admins) {
                await client.entities.Notification.create({
                    ...notif,
                    user_id: admin.id
                });
            }
            createdCount++;
        }
    }

    return Response.json({ success: true, alerts_created: createdCount });

  } catch (error) {
    console.error('Smart alerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
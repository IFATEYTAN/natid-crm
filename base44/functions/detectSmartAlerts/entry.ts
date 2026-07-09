import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate (deploy-check-2)
import { differenceInMinutes, subHours } from 'npm:date-fns@3.6.0';

/**
 * Detect smart alerts and create notifications
 * Scenarios:
 * 1. Vendor unavailable > X time
 * 2. Call unassigned > Y time
 * 3. High rejection rate
 * 4. SLA breach risk
 * 5. High average completion time
 *
 * Recommended schedule: every ~5 minutes. Auth: cron (no user) or admin/operator.
 * The SmartAlertsTab dashboard panel also invokes this on load so alerts stay
 * live even before the platform scheduler is enabled.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));

    // Auth (fail-closed): allow a scheduled automation run OR an admin/operator user.
    // Scheduled runs have no logged-in user; the platform includes an "automation"
    // object in the body (an explicit SYNC_AUTOMATION_KEY secret is accepted as a
    // fallback). Anything else — including unauthenticated requests — is rejected,
    // so the engine cannot be triggered anonymously under the service role.
    const automationKey = Deno.env.get('SYNC_AUTOMATION_KEY');
    const isAutomation =
      (!!automationKey && body.automation_key === automationKey) || !!body.automation;
    if (!isAutomation) {
      let user = null;
      try {
        user = await base44.auth.me();
      } catch {
        user = null;
      }
      const appRole = await resolveAppRole(base44, user);
      if (!user || !['admin', 'operator'].includes(appRole)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Use service role for system tasks
    const client = base44.asServiceRole;

    const admins = await client.entities.User.filter({ role: 'admin' });
    const operators = await client.entities.User.filter({ role: 'operator' });
    const notifyUsers = [...admins, ...operators];
    if (!notifyUsers.length) return Response.json({ message: 'No users to notify' });

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

    // 2. Unassigned calls > 15 minutes. Bounded + sorted so this can't pull an
    // unbounded table. Consolidated into ONE alert (instead of one per call) so
    // a real backlog (e.g. from the Nati sync) doesn't spam every admin/operator
    // with a notification per stale call.
    const unassignedCalls = await client.entities.Case.filter(
      { status: 'new', assigned_provider_id: null },
      '-created_date',
      500
    );

    const staleUnassigned = unassignedCalls
      .map((call) => ({ call, minutes: differenceInMinutes(now, new Date(call.created_date)) }))
      .filter(({ minutes }) => minutes > 15);

    if (staleUnassigned.length === 1) {
      const { call, minutes } = staleUnassigned[0];
      notifications.push({
        title: 'קריאה ללא שיבוץ',
        message: `קריאה ${call.case_number || call.id.substring(0,8)} ממתינה לשיבוץ כבר ${minutes} דקות`,
        type: 'smart_alert',
        link: `/CallDetails?id=${call.id}`,
        related_entity_id: call.id,
        related_entity_type: 'case'
      });
    } else if (staleUnassigned.length > 1) {
      const oldest = staleUnassigned.reduce((a, b) => (b.minutes > a.minutes ? b : a));
      notifications.push({
        title: 'קריאות ללא שיבוץ',
        message: `${staleUnassigned.length} קריאות ממתינות לשיבוץ מעל 15 דקות (הישנה ביותר: ${oldest.minutes} דקות)`,
        type: 'smart_alert',
        link: `/Calls?status=awaiting_assignment`,
        related_entity_id: 'unassigned_backlog',
        related_entity_type: 'case'
      });
    }

    // 3. High rejection rate (last 24h). Bounded + sorted by recency since the
    // SDK filter doesn't support date-range queries — we still filter the 24h
    // window in memory, but capped at the most recent 2000 attempts instead of
    // the whole table.
    const oneDayAgo = subHours(now, 24).toISOString();
    const attempts = await client.entities.CallAssignmentAttempt.filter({}, '-created_date', 2000);

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
    const activeCalls = await client.entities.Case.filter(
      { status: { $in: ['new', 'assigned', 'en_route'] } },
      '-created_date',
      500
    );

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
    const completedCalls = await client.entities.Case.filter(
      { status: 'completed' },
      '-completed_at',
      500
    );

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

    // Deduplicate: skip alerts that already fired for the same entity+title in
    // the last hour. Bounded + sorted (only the last hour's worth is ever
    // relevant) instead of scanning the whole Notification table.
    const recentAlerts = await client.entities.Notification.filter(
        { type: 'smart_alert' },
        '-created_date',
        500
    );
    const recentAlertsMap = new Set(recentAlerts.filter(n =>
        new Date(n.created_date) > subHours(now, 1) // last hour
    ).map(n => `${n.related_entity_id}_${n.title}`));

    // Spam guard: cap how many distinct alerts a single run can create. The
    // per-scenario consolidation above (one alert for the whole unassigned-calls
    // backlog, rather than one per call) already does most of the work; this cap
    // is a backstop against any scenario producing a burst of distinct alerts.
    const MAX_ALERTS_PER_RUN = 10;

    let createdCount = 0;
    let skippedForCap = 0;
    for (const notif of notifications) {
        const key = `${notif.related_entity_id}_${notif.title}`;
        if (recentAlertsMap.has(key)) continue;
        if (createdCount >= MAX_ALERTS_PER_RUN) { skippedForCap++; continue; }
        // Notify all admins and operators
        for (const recipient of notifyUsers) {
            await client.entities.Notification.create({
                ...notif,
                user_id: recipient.id
            });
        }
        createdCount++;
    }
    if (skippedForCap > 0) {
      console.log(`[SMART_ALERTS] Capped run at ${MAX_ALERTS_PER_RUN} alerts, skipped ${skippedForCap} more`);
    }

    return Response.json({ success: true, alerts_created: createdCount, alerts_skipped_cap: skippedForCap });

  } catch (error) {
    console.error('Smart alerts error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
});
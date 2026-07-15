import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // ===== Access gate: scheduled job. Allowed for a platform automation run
    // (the scheduler includes an "automation" object in the body; an explicit
    // SYNC_AUTOMATION_KEY / x-internal-secret is accepted as a fallback) or an
    // authenticated platform admin. Anonymous public invocation is rejected.
    // Platform scheduled-automations cannot attach secrets to their payload,
    // so a body.automation object must be honored even when a secret is
    // configured (secrets remain for external cron callers). body.automation
    // is spoofable by design — the worst an attacker can trigger here is the
    // same admin-notification scan the scheduler runs every 5 minutes, with
    // the 30-minute dedup below bounding any spam.
    const internalSecret = Deno.env.get('INTERNAL_JOB_SECRET');
    const automationKey = Deno.env.get('SYNC_AUTOMATION_KEY');
    const isAutomation =
      !!body.automation ||
      (!!automationKey && body.automation_key === automationKey) ||
      (!!internalSecret && req.headers.get('x-internal-secret') === internalSecret);
    if (!isAutomation) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 1. Fetch enabled notification settings
    const settings = await base44.asServiceRole.entities.NotificationSetting.filter({ enabled: true });
    if (!settings || settings.length === 0) {
      return Response.json({ success: true, message: 'No enabled settings found' });
    }

    // 2. Fetch active calls. The operational source of truth is the Call entity
    //    (Nati sync and the intake flows create Calls; Case is only a reporting
    //    mirror that may not exist), so SLA/unassigned checks must run on Call.
    //    SDK filter doesn't support array values, so fetch recent and filter in-memory.
    const recentCalls = await base44.asServiceRole.entities.Call.list('-created_date', 200);
    const activeStatuses = new Set([
      'waiting_treatment', 'awaiting_assignment', 'assigning',
      'vendor_enroute', 'vendor_arrived', 'in_progress',
    ]);
    const activeCases = recentCalls.filter(c => activeStatuses.has(c.call_status));

    if (activeCases.length === 0) {
      return Response.json({ success: true, message: 'No active calls', notifications_created: 0 });
    }

    // 3. Fetch admins once
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const adminIds = admins.map(u => u.id);
    if (adminIds.length === 0) {
      return Response.json({ success: true, message: 'No admins to notify', notifications_created: 0 });
    }

    // 4. Fetch recent notifications (last 30 min) for dedup — avoid spamming same alert every 5 min
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    let recentNotifications = [];
    try {
      recentNotifications = await base44.asServiceRole.entities.Notification.filter({
        type: 'warning',
        created_date: { $gte: thirtyMinAgo }
      });
    } catch {
      // If filter with $gte is not supported, fetch latest and filter in-memory
      try {
        const latest = await base44.asServiceRole.entities.Notification.list('-created_date', 50);
        recentNotifications = latest.filter(n => n.type === 'warning' && n.created_date >= thirtyMinAgo);
      } catch {
        recentNotifications = [];
      }
    }

    // Build dedup set: "entity_id" keys that already have a recent notification
    const recentlyNotifiedIds = new Set(
      recentNotifications.map(n => n.related_entity_id).filter(Boolean)
    );

    const now = new Date();
    const notificationsToCreate = [];

    for (const setting of settings) {
      // --- Unassigned Calls ---
      if (setting.event === 'call_unassigned') {
        const timeThreshold = setting.conditions?.timeThreshold || 10;

        for (const call of activeCases) {
          const unassignedStatuses = ['waiting_treatment', 'awaiting_assignment'];
          if (call.assigned_vendor_id || !unassignedStatuses.includes(call.call_status)) continue;
          if (recentlyNotifiedIds.has(call.id)) continue;

          if (!call.created_date) continue;
          const minutesWaiting = (now.getTime() - new Date(call.created_date).getTime()) / 60000;
          if (isNaN(minutesWaiting) || minutesWaiting < timeThreshold) continue;

          const { title, body } = buildMessage(setting, {
            call_number: call.call_number || call.id.substring(0, 8),
            customer_name: call.customer_name,
            time: Math.floor(minutesWaiting),
          });

          for (const userId of adminIds) {
            notificationsToCreate.push({
              user_id: userId,
              title,
              message: body,
              type: 'warning',
              is_read: false,
              link: `/CallDetails?id=${call.id}`,
              related_entity_id: call.id,
              related_entity_type: 'call',
            });
          }
          recentlyNotifiedIds.add(call.id); // prevent double-alert within this run
        }
      }

      // --- SLA Near Breach ---
      if (setting.event === 'sla_near_breach') {
        const minutesBefore = setting.conditions?.minutesBefore || 15;

        for (const call of activeCases) {
          // Response SLA is "met" once a vendor is assigned; arrival SLA once
          // the vendor actually arrived (or the call moved past arrival).
          const responseMet = !!call.assigned_vendor_id;
          const arrivalMet =
            !!call.vendor_arrival_time_actual ||
            ['vendor_arrived', 'in_progress'].includes(call.call_status);
          const slaChecks = [
            { deadline: call.sla_response_deadline || call.sla_deadline, met: responseMet, type: 'Response SLA' },
            { deadline: call.sla_arrival_deadline, met: arrivalMet, type: 'Arrival SLA' },
          ];

          for (const check of slaChecks) {
            if (!check.deadline || check.met) continue;

            const dedupKey = `${call.id}_${check.type}`;
            if (recentlyNotifiedIds.has(dedupKey)) continue;

            const minutesUntil = (new Date(check.deadline).getTime() - now.getTime()) / 60000;
            if (isNaN(minutesUntil) || minutesUntil <= 0 || minutesUntil > minutesBefore) continue;

            const { title, body } = buildMessage(setting, {
              call_number: call.call_number || call.id.substring(0, 8),
              customer_name: call.customer_name,
              time: Math.floor(minutesUntil),
              type: check.type,
            });

            for (const userId of adminIds) {
              notificationsToCreate.push({
                user_id: userId,
                title,
                message: body,
                type: 'warning',
                is_read: false,
                link: `/CallDetails?id=${call.id}`,
                related_entity_id: call.id,
                related_entity_type: 'call',
              });
            }
            recentlyNotifiedIds.add(dedupKey);
          }
        }
      }
    }

    // 5. Bulk-create all notifications in parallel batches (max 10 concurrent)
    let created = 0;
    const BATCH_SIZE = 10;
    for (let i = 0; i < notificationsToCreate.length; i += BATCH_SIZE) {
      const batch = notificationsToCreate.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(n => base44.asServiceRole.entities.Notification.create(n))
      );
      created += results.filter(r => r.status === 'fulfilled').length;
    }

    console.log(`Notifications check complete: ${created} created out of ${notificationsToCreate.length} planned`);

    return Response.json({
      success: true,
      notifications_created: created,
      active_cases_checked: activeCases.length,
    });

  } catch (error) {
    console.error('Notification check error:', error);
    return Response.json({ error: error.message || 'Failed to check notifications' }, { status: 500 });
  }
});

function buildMessage(setting, data) {
  let title = setting.message_template?.title || setting.name || 'התראת מערכת';
  let body = setting.message_template?.body || 'התראה מערכת';

  for (const [key, value] of Object.entries(data)) {
    const safeValue = value != null ? String(value) : '';
    title = title.replaceAll(`{${key}}`, safeValue);
    body = body.replaceAll(`{${key}}`, safeValue);
  }

  return { title, body };
}
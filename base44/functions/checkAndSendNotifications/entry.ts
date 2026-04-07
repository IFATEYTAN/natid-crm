import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Fetch enabled notification settings
    const settings = await base44.asServiceRole.entities.NotificationSetting.filter({ enabled: true });
    if (!settings || settings.length === 0) {
      return Response.json({ success: true, message: 'No enabled settings found' });
    }

    // 2. Fetch active cases (only 'new' and 'assigned' are relevant for SLA/unassigned checks)
    //    SDK filter doesn't support array values, so fetch recent cases and filter in-memory
    const recentCases = await base44.asServiceRole.entities.Case.list('-created_date', 100);
    const activeStatuses = new Set(['new', 'assigned', 'en_route', 'on_site', 'in_progress']);
    const activeCases = recentCases.filter(c => activeStatuses.has(c.status));

    if (activeCases.length === 0) {
      return Response.json({ success: true, message: 'No active cases', notifications_created: 0 });
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
          if (call.assigned_provider_id || call.status !== 'new') continue;
          if (recentlyNotifiedIds.has(call.id)) continue;

          const minutesWaiting = (now - new Date(call.created_date)) / 60000;
          if (minutesWaiting < timeThreshold) continue;

          const { title, body } = buildMessage(setting, {
            call_number: call.case_number || call.id.substring(0, 8),
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
              link: `/CaseDetails?id=${call.id}`,
              related_entity_id: call.id,
              related_entity_type: 'case',
            });
          }
          recentlyNotifiedIds.add(call.id); // prevent double-alert within this run
        }
      }

      // --- SLA Near Breach ---
      if (setting.event === 'sla_near_breach') {
        const minutesBefore = setting.conditions?.minutesBefore || 15;

        for (const call of activeCases) {
          const slaChecks = [
            { deadline: call.sla_response_deadline, met: call.sla_response_met, type: 'Response SLA' },
            { deadline: call.sla_arrival_deadline, met: call.sla_arrival_met, type: 'Arrival SLA' },
          ];

          for (const check of slaChecks) {
            if (!check.deadline || check.met) continue;

            const dedupKey = `${call.id}_${check.type}`;
            if (recentlyNotifiedIds.has(dedupKey)) continue;

            const minutesUntil = (new Date(check.deadline) - now) / 60000;
            if (minutesUntil <= 0 || minutesUntil > minutesBefore) continue;

            const { title, body } = buildMessage(setting, {
              call_number: call.case_number || call.id.substring(0, 8),
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
                link: `/CaseDetails?id=${call.id}`,
                related_entity_id: call.id,
                related_entity_type: 'case',
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  webpush.setVapidDetails(
    'mailto:admin@natid.co.il',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const { title, body, icon, url, target_user_ids } = await req.json();

  // Get subscriptions - either for specific users or all active
  let subscriptions;
  if (target_user_ids && target_user_ids.length > 0) {
    subscriptions = [];
    for (const uid of target_user_ids) {
      const subs = await base44.asServiceRole.entities.PushSubscription.filter({
        user_id: uid,
        is_active: true,
      });
      subscriptions.push(...subs);
    }
  } else {
    subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ is_active: true });
  }

  const payload = JSON.stringify({
    title: title || 'התראה חדשה',
    body: body || '',
    icon: icon || '/icons/icon-192x192.png',
    url: url || '/',
    timestamp: Date.now(),
  });

  const results = { sent: 0, failed: 0, expired: [] };

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      results.sent++;
    } catch (err) {
      // 410 Gone = subscription expired, deactivate it
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base44.asServiceRole.entities.PushSubscription.update(sub.id, { is_active: false });
        results.expired.push(sub.id);
      }
      results.failed++;
    }
  }

  return Response.json({ success: true, ...results });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription } = await req.json();

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return Response.json({ error: 'Invalid subscription data' }, { status: 400 });
  }

  // Deactivate old subscriptions for this user with the same endpoint
  const existing = await base44.asServiceRole.entities.PushSubscription.filter({
    user_id: user.id,
    endpoint: subscription.endpoint,
  });

  for (const sub of existing) {
    await base44.asServiceRole.entities.PushSubscription.update(sub.id, { is_active: false });
  }

  // Save new subscription
  const saved = await base44.asServiceRole.entities.PushSubscription.create({
    user_id: user.id,
    user_email: user.email,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: req.headers.get('user-agent') || '',
    is_active: true,
  });

  return Response.json({ success: true, id: saved.id });
});
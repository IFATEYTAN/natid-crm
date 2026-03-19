import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import webPush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const vapidKeys = webPush.generateVAPIDKeys();

    return Response.json({
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
        instructions: "Copy these keys and paste them as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in the secrets panel"
    });
});
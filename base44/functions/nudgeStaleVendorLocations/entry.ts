import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate
import webpush from 'npm:web-push@3.6.7';

/**
 * Scheduled job: nudge vendors whose GPS has gone stale during an active call.
 *
 * Browser geolocation stops streaming once the vendor's app is backgrounded or
 * the screen locks. When a vendor is on an active call but we haven't heard a
 * location in a few minutes, send them a push prompting them to reopen the app
 * so live tracking resumes. This is a mitigation — the real fix is a native
 * background-location client (see docs/LIVE_TRACKING_CAPACITOR_PLAN.md).
 *
 * Recommended schedule: every ~5 minutes. Auth: cron (no user) or admin/operator.
 */

const ACTIVE_CALL_STATUSES = ['vendor_enroute', 'vendor_arrived', 'in_progress'];
const STALE_MINUTES = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    const appRole = user ? await resolveAppRole(base44, user) : null;
    if (user && !['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return Response.json({ error: 'VAPID keys not configured', skipped: true }, { status: 200 });
    }
    webpush.setVapidDetails('mailto:admin@natid.co.il', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const svc = base44.asServiceRole;
    const now = Date.now();
    const staleBefore = now - STALE_MINUTES * 60 * 1000;

    const calls = await svc.entities.Call.filter({});
    const activeCalls = calls.filter(
      (c) => c.assigned_vendor_id && ACTIVE_CALL_STATUSES.includes(c.call_status)
    );

    const results = { checked: 0, nudged: 0, skipped: 0 };
    const nudgedVendorIds = new Set();

    for (const call of activeCalls) {
      const vendorId = call.assigned_vendor_id;
      if (nudgedVendorIds.has(vendorId)) continue;

      const vendor = (await svc.entities.Vendor.filter({ id: vendorId }))[0];
      if (!vendor || vendor.is_location_sharing_enabled === false || !vendor.email) {
        results.skipped++;
        continue;
      }
      results.checked++;

      const lastTs = vendor.last_location_update
        ? new Date(vendor.last_location_update).getTime()
        : 0;
      if (lastTs && lastTs >= staleBefore) {
        results.skipped++;
        continue; // location is fresh — nothing to do
      }

      const vendorUser = (await svc.entities.User.filter({ email: vendor.email }))[0];
      if (!vendorUser) {
        results.skipped++;
        continue;
      }

      const subs = await svc.entities.PushSubscription.filter({
        user_id: vendorUser.id,
        is_active: true,
      });
      if (!subs.length) {
        results.skipped++;
        continue;
      }

      const payload = JSON.stringify({
        title: 'עדכון מיקום נדרש',
        body: `קריאה ${call.call_number || ''} פעילה — פתח את האפליקציה כדי לשתף מיקום עדכני`,
        icon: '/icons/icon-192x192.png',
        url: `/VendorCallManagement?id=${call.id}`,
        timestamp: now,
      });

      let delivered = false;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          delivered = true;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await svc.entities.PushSubscription.update(sub.id, { is_active: false });
          }
        }
      }
      if (delivered) {
        results.nudged++;
        nudgedVendorIds.add(vendorId);
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('nudgeStaleVendorLocations error:', error);
    return Response.json({ error: 'Failed to nudge stale vendor locations' }, { status: 500 });
  }
});

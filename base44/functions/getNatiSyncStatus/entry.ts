/**
 * getNatiSyncStatus — Returns the last Nati sync outcome + current circuit-breaker
 * state, so the admin Data Cleanup page can show a quick "last run" indicator
 * (including the automated 03:00 run) without digging through Base44 logs.
 *
 * Read-only, admin-only, and does NOT touch the Nati DB — it only reads the
 * status we persist in Deno KV. Safe to call even while the breaker is open.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getNatiStatus } from './_shared/natiDb.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  }

  try {
    const status = await getNatiStatus();
    return Response.json({ success: true, ...status });
  } catch (e) {
    return Response.json(
      { error: (e as { message?: string })?.message || 'status error' },
      { status: 500 }
    );
  }
});

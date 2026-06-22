import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * In-app fallback scheduler for stale vendor offers.
 *
 * While an admin/operator tab is open, periodically invokes processStaleAssignments
 * so expired offers get re-offered / escalated even without a platform cron.
 * For production, configure the Base44 platform scheduler instead (see
 * docs/SCHEDULED_FUNCTIONS.md) — this poller is a safety net, not a replacement.
 */
export function useStaleAssignmentPoller(enabled, intervalMs = 120000) {
  const running = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        await base44.functions.invoke('processStaleAssignments', {});
      } catch {
        // Best-effort: the platform scheduler (if configured) is the source of truth.
      } finally {
        running.current = false;
      }
    };

    const initial = setTimeout(tick, 15000); // first pass shortly after load
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [enabled, intervalMs]);
}

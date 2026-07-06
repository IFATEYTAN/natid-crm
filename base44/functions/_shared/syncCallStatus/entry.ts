/**
 * Keep the three status surfaces in sync: Call ↔ WorkQueue ↔ Case.
 *
 * Call.call_status is the source of truth; this maps it onto WorkQueue.queue_status
 * (matched reliably by call_id) and Case.status (best-effort by case_number/call_number).
 * Called from the backend functions that mutate Call.call_status.
 */

// Call.call_status -> WorkQueue.queue_status
const QUEUE_STATUS_MAP: Record<string, string> = {
  waiting_treatment: 'waiting_in_queue',
  awaiting_assignment: 'waiting_in_queue',
  assigning: 'in_progress',
  vendor_enroute: 'in_progress',
  vendor_arrived: 'in_progress',
  in_progress: 'in_progress',
  cannot_complete: 'in_progress',
  completed: 'completed',
  cancelled: 'completed',
  // Storage is a holding state (closeCall's "tow_to_storage" closing status) — off
  // the active queue like a completion, though a continuation leg may reopen later.
  in_storage: 'completed',
};

// Call.call_status -> Case.status
const CASE_STATUS_MAP: Record<string, string> = {
  assigning: 'assigned',
  vendor_enroute: 'en_route',
  vendor_arrived: 'on_site',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  in_storage: 'completed',
};

/**
 * Sync the WorkQueue item(s) and Case linked to a call to a new call_status.
 * Best-effort and non-throwing — status mirroring must never block the primary update.
 */
export async function syncCallStatus(
  base44: any,
  call: any,
  newCallStatus: string,
  extraCaseUpdates: Record<string, any> = {}
) {
  const svc = base44.asServiceRole;

  // 1. WorkQueue — matched by call_id (reliable)
  try {
    const queueStatus = QUEUE_STATUS_MAP[newCallStatus];
    if (queueStatus) {
      const items = await svc.entities.WorkQueue.filter({ call_id: call.id });
      for (const item of items) {
        if (item.queue_status !== queueStatus) {
          const upd: Record<string, any> = { queue_status: queueStatus };
          if (queueStatus === 'completed' && !item.completed_at) {
            upd.completed_at = new Date().toISOString();
          }
          await svc.entities.WorkQueue.update(item.id, upd);
        }
      }
    }
  } catch (e) {
    console.error('syncCallStatus: WorkQueue sync failed', e);
  }

  // 2. Case — best-effort match by case_number === call.call_number
  try {
    const caseStatus = CASE_STATUS_MAP[newCallStatus];
    const caseUpdates: Record<string, any> = { ...extraCaseUpdates };
    if (caseStatus) caseUpdates.status = caseStatus;
    if (Object.keys(caseUpdates).length > 0 && call.call_number) {
      const cases = await svc.entities.Case.filter({ case_number: call.call_number });
      if (cases.length > 0) {
        await svc.entities.Case.update(cases[0].id, caseUpdates);
      }
    }
  } catch (e) {
    console.error('syncCallStatus: Case sync failed', e);
  }
}

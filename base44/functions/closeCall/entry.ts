import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Close a call with a closing_status — the single business-closure path for
 * operator, vendor and agent. Applies the closing rules (resulting status, customer
 * SMS, and linked continuation call), keeps WorkQueue/Case in sync, and logs history.
 *
 * Ownership:
 *   - admin/operator: always allowed.
 *   - vendor: only the assigned vendor of the call.
 *   - agent: only when assigned via WorkQueue (offers the desk-granted completion).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id, closing_status, closing_notes } = await req.json();
    if (!call_id || !closing_status) {
      return Response.json({ error: 'call_id and closing_status are required' }, { status: 400 });
    }

    const cfg = getClosingStatus(closing_status);
    if (!cfg) {
      return Response.json({ error: `Unknown closing_status: ${closing_status}` }, { status: 400 });
    }

    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Authorization / ownership (app-level role — invited users carry platform role "user")
    const role = await resolveAppRole(base44, user);
    const isOps = role === 'admin' || role === 'operator';
    if (!isOps) {
      if (role === 'vendor' || role === 'ספק') {
        const vendorRecords = await base44.asServiceRole.entities.Vendor.filter({ email: user.email });
        if (!vendorRecords.length || call.assigned_vendor_id !== vendorRecords[0].id) {
          return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
        }
      } else {
        // Treat anyone else as a field agent: must be the assigned agent via WorkQueue
        const queueItems = await base44.asServiceRole.entities.WorkQueue.filter({
          call_id,
          assigned_to_agent: user.email,
        });
        if (!queueItems || queueItems.length === 0) {
          return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
        }
      }
    }

    const caseCode =
      call.case_reference_code || call.call_number || `EVT-${Date.now().toString().slice(-8)}`;

    const updates: Record<string, any> = {
      call_status: cfg.resultingStatus,
      closing_status,
      case_reference_code: caseCode,
    };
    if (closing_notes) updates.closing_notes = closing_notes;
    if (cfg.resultingStatus === 'completed') {
      updates.closed_at = new Date().toISOString();
      updates.closed_by = user.full_name || user.email || 'system';
    }

    await base44.asServiceRole.entities.Call.update(call_id, updates);

    // Mirror onto WorkQueue + Case
    const extraCaseUpdates: Record<string, any> = {};
    if (updates.closed_at) extraCaseUpdates.completed_at = updates.closed_at;
    await syncCallStatus(base44, call, cfg.resultingStatus, extraCaseUpdates);

    await base44.asServiceRole.entities.CallHistory.create({
      call_id: call.id,
      call_number: call.call_number,
      change_type: 'status',
      old_value: call.call_status,
      new_value: cfg.resultingStatus,
      notes: `סטטוס סגירה: ${cfg.label}${closing_notes ? ` — ${closing_notes}` : ''}`,
      changed_by: user.full_name || user.email || 'system',
    });

    // Customer SMS per closing status (storage sends none by design)
    if (cfg.sendsSms && call.customer_phone && cfg.smsText) {
      try {
        await base44.functions.invoke('sendSMS', {
          phone: call.customer_phone,
          message: cfg.smsText,
          callId: call.id,
        });
      } catch (e) {
        console.error('closeCall: customer SMS failed', e);
      }
    }

    // AI summary + satisfaction-survey SMS for completed calls (best-effort).
    // The legacy CallDetails status-change path already sends the survey on
    // 'completed'; this closing-status path bypassed it entirely (D-09).
    //
    // sendFeedbackSMS itself hard-gates to admin/operator callers, but
    // closeCall is also legitimately called by vendors/agents closing their
    // own assigned call (see the ownership check above) — invoking
    // sendFeedbackSMS with the original caller's auth would 403 in exactly
    // that scenario. Replicate its (small, non-role-gated) token+SMS steps
    // directly via service role instead of routing through its HTTP handler.
    if (cfg.resultingStatus === 'completed') {
      base44.functions.invoke('generateCallSummary', { call_id: call.id }).catch(() => {});
      if (call.customer_phone) {
        (async () => {
          try {
            const tokenResponse = await base44.asServiceRole.functions.invoke('createFeedbackToken', {
              call_id: call.id,
            });
            const token = tokenResponse.data?.token;
            if (!token) return;
            const feedbackUrl = `https://app.base44.com/a/6955a04a2de0845ff4cb8a71/CustomerFeedback?token=${token}`;
            const smsMessage = `שלום ${call.customer_name?.split(' ')[0] || 'לקוח יקר'}, תודה שבחרת בנתי! נשמח אם תדרג את השירות שקיבלת: ${feedbackUrl}`;
            await base44.asServiceRole.functions.invoke('sendSMS', {
              phone: call.customer_phone,
              message: smsMessage,
            });
          } catch (e) {
            console.error('closeCall: feedback survey SMS failed', e);
          }
        })();
      }
    }

    // Linked continuation call for failure / extraction outcomes
    let continuationCallId = null;
    if (cfg.createsContinuation) {
      try {
        const continuation = await createContinuationCall(base44, call, {
          serviceCategory: cfg.continuationCategory || 'towing',
          caseCode,
        });
        continuationCallId = continuation.id;
        await base44.asServiceRole.entities.Call.update(call.id, {
          continuation_call_id: continuation.id,
        });
        // Enqueue the continuation so it enters the assignment pipeline
        await base44.asServiceRole.entities.WorkQueue.create({
          call_id: continuation.id,
          assigned_to_agent: null,
          queue_status: 'waiting_in_queue',
          priority_score: call.call_priority === 'critical' ? 100 : call.call_priority === 'urgent' ? 70 : 40,
          added_to_queue_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('closeCall: continuation creation failed', e);
      }
    }

    return Response.json({
      success: true,
      resulting_status: cfg.resultingStatus,
      is_storage: !!cfg.isStorage,
      continuation_call_id: continuationCallId,
    });
  } catch (error) {
    console.error('closeCall error:', error);
    return Response.json({ error: 'Failed to close call' }, { status: 500 });
  }
});

// ===== Inline app-role resolution (kept per-file: a NEW _shared module cannot be
// registered on this platform - its standalone deploy fails ISOLATE_INTERNAL_FAILURE and
// importers then fail with Module not found; see docs/LESSONS_LEARNED.md 2026-07-09) =====
const APP_ROLE_MAP: Record<string, string> = {
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  מנהל: 'admin',
  'מנהל מערכת': 'admin',
  מוקדן: 'operator',
  מתפעל: 'operator',
  'מנהל תפעול': 'operator',
  טכנאי: 'agent',
  'נציג שטח': 'agent',
  ספק: 'vendor',
  'ספק שירות': 'vendor',
  Vendor: 'vendor',
  'Vendor ': 'vendor',
};

// deno-lint-ignore no-explicit-any
async function resolveAppRole(base44: any, user: any): Promise<string | null> {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.role === 'vendor' || user.role === 'ספק') return 'vendor';
  if (APP_ROLE_MAP[user.role]) return APP_ROLE_MAP[user.role];
  try {
    let perms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: user.id });
    if (!perms.length && user.email) {
      perms = await base44.asServiceRole.entities.UserPermission.filter({
        user_email: user.email,
      });
    }
    const mapped = APP_ROLE_MAP[perms[0]?.role_name];
    if (mapped) return mapped;
  } catch (_) {
    // Permission lookup failed - fall through to the frontend-matching default.
  }
  return 'operator';
}
// ===== End inline app-role resolution =====

// ===== Inline call-status sync (kept per-file: re-saving a _shared module through the
// platform invalidates its deployment record and breaks every importer - see
// docs/LESSONS_LEARNED.md 2026-07-09) =====
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
 * Best-effort and non-throwing - status mirroring must never block the primary update.
 */
// deno-lint-ignore no-explicit-any
async function syncCallStatus(
  base44: any,
  call: any,
  newCallStatus: string,
  extraCaseUpdates: Record<string, any> = {}
) {
  const svc = base44.asServiceRole;
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
// ===== End inline call-status sync =====

// ===== Inline _shared/closingStatuses (kept per-file: shared-module bundling is broken
// platform-wide for new deployments - see docs/LESSONS_LEARNED.md 2026-07-09) =====
/**
 * Backend mirror of src/config/closingStatuses.js (rules only).
 *
 * MUST be kept in sync with the frontend copy. The frontend can't import backend
 * modules and vice-versa (Base44 Call/Function split), so the closing rules live in
 * both places. SMS texts are placeholders pending final wording from the client.
 */

const PLACEHOLDER = '⚠️ נוסח SMS זמני — להחלפה בנוסח הסופי מהלקוח';

const CLOSING_STATUS_MAP: Record<string, any> = {
  mobile_done: {
    label: 'ניידת שירות סיימה (התנעה / החלפת מצבר / החלפת גלגל)',
    resultingStatus: 'completed',
    isFinal: true,
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: false,
  },
  mobile_failed_evac: {
    label: 'ניידת לא צלחה — בוצע פינוי לפלטפורמה',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  mobile_failed_send: {
    label: 'ניידת לא צלחה — יש לשלוח ניידת / גרר',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  tow_done: {
    label: 'גרר הגיע ליעד הסופי בהצלחה',
    resultingStatus: 'completed',
    isFinal: true,
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: false,
  },
  tow_failed_complex: {
    label: 'גרר לא הצליח — מקרה מורכב, יישלח גרר מותאם',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  extraction_continue: {
    label: 'לאחר חילוץ / חניון תת-קרקעי — גרירת המשך',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  tow_to_storage: {
    label: 'גרר לאחסנה',
    resultingStatus: 'in_storage',
    sendsSms: false,
    createsContinuation: false,
    isStorage: true,
  },
};

function getClosingStatus(key: string) {
  return CLOSING_STATUS_MAP[key] || null;
}

// Fields copied from an origin call to a continuation call.
const COPIED_FIELDS = [
  'customer_name',
  'customer_phone',
  'customer_id_number',
  'customer_email',
  'customer_address',
  'insurance_company',
  'insurance_agent',
  'membership_package',
  'membership_number',
  'coverage_details',
  'vehicle_plate',
  'vehicle_model',
  'vehicle_year',
  'vehicle_type',
  'fuel_type',
  'vehicle_code',
  'issue_type',
  'is_vip',
  'call_priority',
];

/**
 * Create a linked continuation call (service-role). Mirrors
 * src/features/calls/createContinuationCall.js.
 */
async function createContinuationCall(
  base44: any,
  originCall: any,
  { serviceCategory = 'towing', caseCode }: { serviceCategory?: string; caseCode?: string } = {}
) {
  const pickupAddress =
    originCall.storage_location_address ||
    originCall.dropoff_location_address ||
    originCall.pickup_location_address;
  const pickupCity =
    originCall.storage_location_city ||
    originCall.dropoff_location_city ||
    originCall.pickup_location_city;
  const pickupArea =
    originCall.storage_location_area ||
    originCall.dropoff_location_area ||
    originCall.pickup_location_area;

  const payload: Record<string, any> = {
    service_category: serviceCategory,
    call_status: 'waiting_treatment',
    created_by_source: 'operator',
    pickup_location_address: pickupAddress,
    pickup_location_city: pickupCity || undefined,
    pickup_location_area: pickupArea || undefined,
    parent_call_id: originCall.id,
    case_reference_code:
      caseCode || originCall.case_reference_code || originCall.call_number || undefined,
    operator_notes: `קריאת המשך מקריאה ${originCall.call_number || originCall.id}`,
  };
  for (const field of COPIED_FIELDS) {
    if (originCall[field] !== undefined && originCall[field] !== null) {
      payload[field] = originCall[field];
    }
  }

  return base44.asServiceRole.entities.Call.create(payload);
}
// ===== End inline _shared/closingStatuses ===== (redeploy)

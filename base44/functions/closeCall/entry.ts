import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { getClosingStatus, createContinuationCall } from './_shared/closingStatuses.ts';
import { syncCallStatus } from './_shared/syncCallStatus.ts';

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

    // Authorization / ownership
    const role = user.role;
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

    // AI summary for completed calls (best-effort)
    if (cfg.resultingStatus === 'completed') {
      base44.functions.invoke('generateCallSummary', { call_id: call.id }).catch(() => {});
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

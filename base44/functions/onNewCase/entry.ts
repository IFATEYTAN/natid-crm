// Triggered on new Case creation (redeploy 2026-07-15: WorkQueue linked to Call id, Israel-time shifts)
// 1. Creates WorkQueue entry
// 2. Auto-assigns to least-busy on-shift operator (only if no vendor assigned)
// 3. Sends notification to operators
// 4. Links vendor by name matching
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data || !event) {
      return Response.json({ error: 'No event data' }, { status: 400 });
    }

    const caseId = event.entity_id;
    if (!caseId) {
      // Guard: filter({ id: undefined }) would match ALL cases
      return Response.json({ error: 'Missing entity_id' }, { status: 400 });
    }
    const results = { workQueue: null, autoAssigned: null, notifications: 0, vendorLinked: false };
    const sdk = base44.asServiceRole;

    // ===== Access hardening (security scan 2026-07-14): this endpoint is invoked
    // anonymously by the platform's entity automation, so it cannot require auth.
    // Instead, never trust the caller-supplied payload — re-fetch the Case by id
    // via service role. A forged request can then only re-process a real record,
    // and the WorkQueue creation below is already deduped.
    const fetchedCases = await sdk.entities.Case.filter({ id: caseId });
    if (!fetchedCases || fetchedCases.length === 0) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }
    const caseData = fetchedCases[0];

    // Determine if this case already has a vendor assigned
    const hasVendor = !!(caseData.assigned_provider_name && caseData.assigned_provider_name.trim());

    // WorkQueue rows must point at the Call entity (QueueMonitor joins
    // WorkQueue.call_id against Call.id and drops rows it can't resolve, so a
    // row keyed by the Case id renders as an orphan). Resolve the sibling Call
    // by number — Case and Call are mirrored with case_number === call_number.
    let queueCallId = caseId;
    try {
      if (caseData.case_number) {
        const siblingCalls = await sdk.entities.Call.filter({ call_number: String(caseData.case_number) });
        if (siblingCalls.length > 0) queueCallId = siblingCalls[0].id;
      }
    } catch (e) {
      console.error('Sibling Call lookup failed, falling back to case id:', e.message);
    }

    // ===== 1. CREATE WORK QUEUE ENTRY =====
    let queueEntry = null;
    try {
      const existingQueue = await sdk.entities.WorkQueue.filter({ call_id: queueCallId });
      if (existingQueue.length === 0) {
        let priorityScore = 50;
        if (caseData.priority === 'urgent') priorityScore = 90;
        else if (caseData.priority === 'high') priorityScore = 75;
        else if (caseData.priority === 'low') priorityScore = 25;
        if (caseData.is_vip) priorityScore = Math.min(100, priorityScore + 15);

        queueEntry = await sdk.entities.WorkQueue.create({
          call_id: queueCallId,
          queue_status: 'waiting_in_queue',
          priority_score: priorityScore,
          added_to_queue_at: new Date().toISOString(),
        });
        results.workQueue = 'created';
        console.log(`WorkQueue entry created for case ${caseData.case_number}`);
      } else {
        queueEntry = existingQueue[0];
        results.workQueue = 'already_exists';
      }
    } catch (e) {
      console.error('WorkQueue creation error:', e.message);
      results.workQueue = 'error: ' + e.message;
    }

    // ===== 2. AUTO-ASSIGN TO LEAST-BUSY ON-SHIFT OPERATOR =====
    // Only for cases WITHOUT an assigned vendor
    if (!hasVendor && queueEntry) {
      try {
        const assignedAgent = await findLeastBusyAgent(sdk);
        if (assignedAgent) {
          await sdk.entities.WorkQueue.update(queueEntry.id, {
            assigned_to_agent: assignedAgent.email,
            queue_status: 'assigned_to_agent',
            assigned_at: new Date().toISOString(),
          });
          results.autoAssigned = assignedAgent.email;
          console.log(`Auto-assigned case ${caseData.case_number} to ${assignedAgent.name} (${assignedAgent.email}) — load: ${assignedAgent.openCount} open calls`);
        } else {
          console.log(`No on-shift operators available for case ${caseData.case_number}, staying in queue`);
          results.autoAssigned = 'no_available_agent';
        }
      } catch (e) {
        console.error('Auto-assign error:', e.message);
        results.autoAssigned = 'error: ' + e.message;
      }
    } else if (hasVendor) {
      results.autoAssigned = 'skipped_has_vendor';
    }

    // ===== 3. NOTIFY OPERATORS =====
    try {
      const users = await sdk.entities.User.filter({});
      const operators = users.filter(u => {
        const role = (u.role || '').toLowerCase().trim();
        return role === 'admin' || role === 'operator' || role === 'מנהל' || role === 'מוקדן';
      });

      const deptLabel = caseData.department || 'כללי';
      const customerName = caseData.customer_name || 'לא ידוע';
      const location = caseData.location_city || caseData.location_address || '';
      const assignedNote = results.autoAssigned && results.autoAssigned !== 'no_available_agent' && results.autoAssigned !== 'skipped_has_vendor'
        ? ` | שובץ ל: ${results.autoAssigned}`
        : '';

      for (const op of operators) {
        await sdk.entities.Notification.create({
          user_id: op.id,
          title: `קריאה חדשה #${caseData.case_number || ''}`,
          message: `${deptLabel} | ${customerName} | ${location}${assignedNote}`,
          type: caseData.priority === 'urgent' ? 'warning' : 'info',
          is_read: false,
          // CallDetails expects a Call id — use the resolved sibling Call
          link: `/CallDetails?id=${queueCallId}`,
          related_entity_id: caseId,
          related_entity_type: 'case',
        });
        results.notifications++;
      }
      console.log(`Sent ${results.notifications} notifications for case ${caseData.case_number}`);
    } catch (e) {
      console.error('Notification error:', e.message);
    }

    // ===== 4. LINK VENDOR BY NAME =====
    try {
      const vendorName = caseData.assigned_provider_name;
      if (vendorName && vendorName.trim()) {
        const vendors = await sdk.entities.Vendor.filter({});
        const match = vendors.find(v =>
          v.vendor_name === vendorName ||
          v.vendor_name?.includes(vendorName) ||
          vendorName.includes(v.vendor_name)
        );

        if (match) {
          await sdk.entities.Case.update(caseId, {
            assigned_provider_id: match.id,
            assigned_provider_name: match.vendor_name,
          });
          results.vendorLinked = true;
          console.log(`Linked vendor "${match.vendor_name}" to case ${caseData.case_number}`);
        } else {
          console.log(`No vendor match found for "${vendorName}"`);
        }
      }
    } catch (e) {
      console.error('Vendor linking error:', e.message);
    }

    return Response.json({ success: true, case_number: caseData.case_number, results });
  } catch (error) {
    console.error('onNewCase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Find the on-shift operator with the fewest open (non-completed) queue items.
 * Returns { email, name, openCount } or null if nobody is on shift.
 */
async function findLeastBusyAgent(sdk) {
  // Shift dates/hours are entered in Israel local time — compare in the same
  // zone, and support shifts that span midnight (e.g. 22:00-06:00).
  const now = new Date();
  const israelParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const todayStr = `${israelParts.year}-${israelParts.month}-${israelParts.day}`;
  const currentHHMM = `${israelParts.hour === '24' ? '00' : israelParts.hour}:${israelParts.minute}`;

  // 1. Get today's active/scheduled shifts
  const allShifts = await sdk.entities.AgentShift.filter({ shift_date: todayStr });
  const activeShifts = allShifts.filter(s => {
    if (s.status !== 'active' && s.status !== 'scheduled') return false;
    // Check if current time is within shift hours (incl. spans past midnight)
    if (s.start_time && s.end_time) {
      return s.start_time <= s.end_time
        ? currentHHMM >= s.start_time && currentHHMM <= s.end_time
        : currentHHMM >= s.start_time || currentHHMM <= s.end_time;
    }
    return true; // If no times specified, consider them on shift
  });

  if (activeShifts.length === 0) {
    console.log('[AUTO-ASSIGN] No active shifts found for today');
    return null;
  }

  // Collect unique agent emails from active shifts
  const onShiftEmails = [...new Set(activeShifts.map(s => s.agent_email).filter(Boolean))];
  console.log(`[AUTO-ASSIGN] On-shift agents: ${onShiftEmails.join(', ')}`);

  if (onShiftEmails.length === 0) return null;

  // 2. Count open queue items per agent
  const allQueueItems = await sdk.entities.WorkQueue.filter({});
  const openStatuses = ['assigned_to_agent', 'in_progress', 'waiting_in_queue'];
  const openItems = allQueueItems.filter(q => openStatuses.includes(q.queue_status));

  // Count per agent
  const loadMap = {};
  for (const email of onShiftEmails) {
    loadMap[email] = 0;
  }
  for (const item of openItems) {
    if (item.assigned_to_agent && loadMap[item.assigned_to_agent] !== undefined) {
      loadMap[item.assigned_to_agent]++;
    }
  }

  // 3. Pick the agent with the least open items
  let bestEmail = null;
  let bestCount = Infinity;
  for (const email of onShiftEmails) {
    const count = loadMap[email] || 0;
    if (count < bestCount) {
      bestCount = count;
      bestEmail = email;
    }
  }

  if (!bestEmail) return null;

  // Get agent name from shift data
  const shift = activeShifts.find(s => s.agent_email === bestEmail);
  return {
    email: bestEmail,
    name: shift?.agent_name || bestEmail,
    openCount: bestCount,
  };
}
// deployed 2026-07-15 v2
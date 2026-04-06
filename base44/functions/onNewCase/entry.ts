// Triggered on new Case creation
// 1. Creates WorkQueue entry
// 2. Sends notification to operators
// 3. Links vendor by name matching
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (!data || !event) {
      return Response.json({ error: 'No event data' }, { status: 400 });
    }

    const caseId = event.entity_id;
    const caseData = data;
    const results = { workQueue: null, notifications: 0, vendorLinked: false };

    // ===== 1. CREATE WORK QUEUE ENTRY =====
    try {
      // Check if already in queue
      const existingQueue = await base44.asServiceRole.entities.WorkQueue.filter({ call_id: caseId });
      if (existingQueue.length === 0) {
        // Calculate priority score based on case properties
        let priorityScore = 50; // default
        if (caseData.priority === 'urgent') priorityScore = 90;
        else if (caseData.priority === 'high') priorityScore = 75;
        else if (caseData.priority === 'low') priorityScore = 25;
        if (caseData.is_vip) priorityScore = Math.min(100, priorityScore + 15);

        await base44.asServiceRole.entities.WorkQueue.create({
          call_id: caseId,
          queue_status: 'waiting_in_queue',
          priority_score: priorityScore,
          added_to_queue_at: new Date().toISOString(),
        });
        results.workQueue = 'created';
        console.log(`WorkQueue entry created for case ${caseData.case_number}`);
      } else {
        results.workQueue = 'already_exists';
      }
    } catch (e) {
      console.error('WorkQueue creation error:', e.message);
      results.workQueue = 'error: ' + e.message;
    }

    // ===== 2. NOTIFY OPERATORS =====
    try {
      const users = await base44.asServiceRole.entities.User.filter({});
      const operators = users.filter(u => {
        const role = (u.role || '').toLowerCase().trim();
        return role === 'admin' || role === 'operator' || role === 'מנהל' || role === 'מוקדן';
      });

      const deptLabel = caseData.department || 'כללי';
      const customerName = caseData.customer_name || 'לא ידוע';
      const location = caseData.location_city || caseData.location_address || '';

      for (const op of operators) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: `קריאה חדשה #${caseData.case_number || ''}`,
          message: `${deptLabel} | ${customerName} | ${location}`,
          type: caseData.priority === 'urgent' ? 'warning' : 'info',
          is_read: false,
          link: `/CallDetails?id=${caseId}`,
          related_entity_id: caseId,
          related_entity_type: 'case',
        });
        results.notifications++;
      }
      console.log(`Sent ${results.notifications} notifications for case ${caseData.case_number}`);
    } catch (e) {
      console.error('Notification error:', e.message);
    }

    // ===== 3. LINK VENDOR BY NAME =====
    try {
      const vendorName = caseData.assigned_provider_name;
      if (vendorName && vendorName.trim()) {
        const vendors = await base44.asServiceRole.entities.Vendor.filter({});
        // Find vendor by exact or partial name match
        const match = vendors.find(v => 
          v.vendor_name === vendorName || 
          v.vendor_name?.includes(vendorName) || 
          vendorName.includes(v.vendor_name)
        );

        if (match) {
          await base44.asServiceRole.entities.Case.update(caseId, {
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
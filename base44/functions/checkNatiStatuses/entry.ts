// Check what statuses exist in the Nati API data and whether closed calls are included
Deno.serve(async (req) => {
  const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
  const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '');

  try {
    // Fetch ALL statuses (callStatus=-1 means all)
    const url = 'https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1&dir=DESC';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!data.success || !data.data) {
      return Response.json({ error: 'API failed', raw: data }, { status: 502 });
    }

    const records = data.data;

    // Count by status
    const statusCounts = {};
    const statusLabels = {
      '0': 'חדשה/ממתינה (0)',
      '1': 'בשיבוץ (1)', 
      '2': 'ספק בדרך (2)',
      '3': 'ספק הגיע (3)',
      '4': 'בטיפול (4)',
      '5': 'הושלמה (5)',
      '6': 'בוטלה (6)',
    };
    
    for (const r of records) {
      const s = String(r.status);
      const label = statusLabels[s] || `לא מוכר (${s})`;
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    }

    // Check has_updated flag
    const updatedCount = records.filter(r => r.has_updated === '1').length;
    const notUpdatedCount = records.filter(r => r.has_updated !== '1').length;

    // Find examples of closed calls (status 5)
    const closedCalls = records.filter(r => r.status === '5').slice(0, 3);
    const closedExamples = closedCalls.map(r => ({
      appeal_id: r.appeal_id,
      status: r.status,
      supplier_name: r.supplier_name,
      finish_time: r.finish_time,
      arrive_time: r.arrive_time,
      claim_total_cost: r.claim_total_cost,
      inspector_approves: r.inspector_approves,
      inspector_name: r.inspector_name,
      wait_time: r.wait_time,
    }));

    // Find examples of cancelled calls (status 6)
    const cancelledCalls = records.filter(r => r.status === '6').slice(0, 2);
    const cancelledExamples = cancelledCalls.map(r => ({
      appeal_id: r.appeal_id,
      status: r.status,
      supplier_name: r.supplier_name,
      finish_time: r.finish_time,
    }));

    // Check: do we get supplier assignment info?
    const withSupplier = records.filter(r => r.supplier_name && r.supplier_name.trim());
    const withoutSupplier = records.filter(r => !r.supplier_name || !r.supplier_name.trim());

    return Response.json({
      total_records: records.length,
      status_breakdown: statusCounts,
      has_updated_flag: { updated: updatedCount, not_updated: notUpdatedCount },
      supplier_info: {
        with_supplier: withSupplier.length,
        without_supplier: withoutSupplier.length,
      },
      closed_call_examples: closedExamples,
      cancelled_call_examples: cancelledExamples,
      summary: {
        note: 'ה-API מחזיר רק קריאות מסטטוס מסוים? או את הכל?',
        has_closed_calls: closedCalls.length > 0,
        has_cancelled_calls: cancelledCalls.length > 0,
      }
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
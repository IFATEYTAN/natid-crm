import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate automatic call summary using AI
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id } = await req.json();

    if (!call_id) {
      return Response.json({ error: 'Missing call_id' }, { status: 400 });
    }

    // Fetch call details
    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    const call = calls[0];

    if (!call) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }

    // Fetch call history
    const history = await base44.asServiceRole.entities.CallHistory.filter(
      { call_id },
      '-created_date',
      20
    );

    // Fetch vendor details if assigned
    let vendor = null;
    if (call.assigned_vendor_id) {
      const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: call.assigned_vendor_id });
      vendor = vendors[0];
    }

    // Build structured data for summary
    const issueTypeLabels = {
      mechanical: 'תקלה מכנית',
      stopped_driving: 'הפסקת נסיעה',
      flat_tire: 'פנצ\'ר',
      stuck_wheel: 'גלגל תקוע',
      accident: 'תאונה',
      no_fuel: 'אין דלק',
      dead_battery: 'מצבר ריק',
      locked_keys: 'מפתחות נעולים',
      other: 'אחר'
    };

    const callData = {
      callNumber: call.call_number || call.id?.slice(-6),
      customerName: call.customer_name,
      customerPhone: call.customer_phone,
      vehiclePlate: call.vehicle_plate,
      vehicleModel: call.vehicle_model,
      issueType: issueTypeLabels[call.issue_type] || call.issue_type,
      issueDescription: call.issue_description,
      pickupAddress: call.pickup_location_address,
      pickupCity: call.pickup_location_city,
      dropoffAddress: call.dropoff_location_address,
      dropoffCity: call.dropoff_location_city,
      vendorName: call.assigned_vendor_name,
      vendorPhone: vendor?.phone,
      createdAt: call.created_date,
      assignedAt: call.assigned_at,
      closedAt: call.closed_at,
      vendorNotes: call.vendor_notes,
      historyNotes: history.filter(h => h.notes).map(h => h.notes).join(', ')
    };

    // Calculate duration
    let duration = '';
    if (call.created_date && call.closed_at) {
      const start = new Date(call.created_date);
      const end = new Date(call.closed_at);
      const diffMinutes = Math.round((end - start) / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      duration = hours > 0 ? `${hours} שעות ו-${minutes} דקות` : `${minutes} דקות`;
    }

    // Generate summary using LLM
    const prompt = `אתה מייצר סיכום קריאה מקצועי למערכת ניהול שירותי דרך.
צור סיכום קצר ומקצועי בעברית עבור הקריאה הבאה:

פרטי קריאה:
- מספר קריאה: ${callData.callNumber}
- לקוח: ${callData.customerName} (${callData.customerPhone})
- רכב: ${callData.vehicleModel || 'לא צוין'} (${callData.vehiclePlate || 'לא צוין'})
- סוג תקלה: ${callData.issueType || 'לא צוין'}
- תיאור: ${callData.issueDescription || 'לא צוין'}
- מיקום איסוף: ${callData.pickupAddress}, ${callData.pickupCity || ''}
- מיקום יעד: ${callData.dropoffAddress || 'לא צוין'} ${callData.dropoffCity || ''}
- ספק מטפל: ${callData.vendorName || 'לא שובץ'}
- משך טיפול: ${duration || 'לא ידוע'}
- הערות ספק: ${callData.vendorNotes || 'אין'}
- הערות נוספות: ${callData.historyNotes || 'אין'}

כתוב סיכום מקצועי של 3-5 משפטים המתאר את הקריאה, הטיפול והתוצאה.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "סיכום הקריאה"
          }
        },
        required: ["summary"]
      }
    });

    const summaryText = llmResponse.summary || llmResponse;

    // Update call with draft summary
    await base44.asServiceRole.entities.Call.update(call_id, {
      summary_draft: summaryText
    });

    return Response.json({
      success: true,
      summary: summaryText
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
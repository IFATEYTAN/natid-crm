import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate automatic call summary using AI
 * Called when a call is marked as completed
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
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    // Fetch call details
    const calls = await base44.entities.Call.filter({ id: call_id });
    if (calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Fetch call history/notes
    const history = await base44.entities.CallHistory.filter({ call_id }, '-created_date', 50);
    
    // Fetch photos
    const photos = await base44.entities.CallPhoto.filter({ call_id });

    // Build context for AI
    const issueTypeLabels = {
      mechanical: 'תקלה מכנית',
      stopped_driving: 'רכב לא נוסע',
      flat_tire: 'פנצ\'ר',
      stuck_wheel: 'גלגל תקוע',
      accident: 'תאונה',
      no_fuel: 'אין דלק',
      dead_battery: 'מצבר ריק',
      locked_keys: 'מפתחות נעולים',
      other: 'אחר'
    };

    const vehicleTypeLabels = {
      private: 'פרטי',
      commercial_light: 'מסחרי קל',
      truck: 'משאית',
      motorcycle: 'אופנוע'
    };

    // Calculate duration
    let durationMinutes = null;
    if (call.created_date && call.closed_at) {
      const start = new Date(call.created_date);
      const end = new Date(call.closed_at);
      durationMinutes = Math.round((end - start) / (1000 * 60));
    }

    // Build structured data for the prompt
    const callData = {
      callNumber: call.call_number || 'לא ידוע',
      customerName: call.customer_name || 'לא ידוע',
      customerPhone: call.customer_phone || 'לא ידוע',
      vehiclePlate: call.vehicle_plate || 'לא ידוע',
      vehicleModel: call.vehicle_model || 'לא ידוע',
      vehicleType: vehicleTypeLabels[call.vehicle_type] || call.vehicle_type || 'לא ידוע',
      issueType: issueTypeLabels[call.issue_type] || call.issue_type || 'לא ידוע',
      issueDescription: call.issue_description || '',
      pickupAddress: call.pickup_location_address || 'לא ידוע',
      pickupCity: call.pickup_location_city || '',
      dropoffAddress: call.dropoff_location_address || '',
      dropoffCity: call.dropoff_location_city || '',
      vendorName: call.assigned_vendor_name || 'לא שובץ',
      createdAt: call.created_date ? new Date(call.created_date).toLocaleString('he-IL') : 'לא ידוע',
      closedAt: call.closed_at ? new Date(call.closed_at).toLocaleString('he-IL') : 'לא ידוע',
      durationMinutes: durationMinutes,
      vendorNotes: call.vendor_notes || '',
      customerRating: call.customer_rating,
      customerFeedback: call.customer_feedback || '',
      historyNotes: history.filter(h => h.notes).map(h => h.notes).join('\n'),
      photosCount: photos.length
    };

    // Generate summary using AI
    const prompt = `אתה מערכת ליצירת סיכומי קריאות שירות דרך. צור סיכום מקצועי וקצר בעברית עבור הקריאה הבאה.

פרטי הקריאה:
- מספר קריאה: ${callData.callNumber}
- לקוח: ${callData.customerName} (${callData.customerPhone})
- רכב: ${callData.vehicleModel}, ${callData.vehicleType}, מספר רישוי: ${callData.vehiclePlate}
- סוג תקלה: ${callData.issueType}
- תיאור התקלה: ${callData.issueDescription || 'לא צוין'}
- מיקום איסוף: ${callData.pickupAddress}${callData.pickupCity ? ', ' + callData.pickupCity : ''}
- יעד: ${callData.dropoffAddress || 'לא צוין'}${callData.dropoffCity ? ', ' + callData.dropoffCity : ''}
- ספק מטפל: ${callData.vendorName}
- זמן פתיחה: ${callData.createdAt}
- זמן סגירה: ${callData.closedAt}
- משך טיפול: ${callData.durationMinutes ? callData.durationMinutes + ' דקות' : 'לא ידוע'}
- הערות הספק: ${callData.vendorNotes || 'אין'}
- תמונות: ${callData.photosCount} תמונות צורפו
${callData.customerRating ? `- דירוג לקוח: ${callData.customerRating}/5` : ''}
${callData.customerFeedback ? `- משוב לקוח: ${callData.customerFeedback}` : ''}
${callData.historyNotes ? `\nהיסטוריית פעולות:\n${callData.historyNotes}` : ''}

צור סיכום מקצועי שיכלול:
1. תיאור קצר של האירוע
2. פעולות שבוצעו
3. תוצאה סופית
4. הערות מיוחדות (אם יש)

הסיכום צריך להיות ברור, תמציתי ומקצועי.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
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

    const summary = aiResponse.summary || aiResponse;

    // Update call with summary draft
    await base44.entities.Call.update(call_id, {
      summary_draft: summary,
      summary_generated_at: new Date().toISOString()
    });

    // Log this action
    await base44.asServiceRole.entities.CallHistory.create({
      call_id,
      call_number: call.call_number,
      change_type: 'note',
      notes: 'סיכום קריאה נוצר אוטומטית',
      changed_by: user.email
    });

    return Response.json({
      success: true,
      summary,
      call_id
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
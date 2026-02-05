import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const calls = await base44.entities.Call.filter({ id: call_id });
    if (calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    const history = await base44.entities.CallHistory.filter({ call_id }, '-created_date', 20);
    const messages = await base44.entities.Message.filter({ call_id }, '-created_date', 20);

    const issueLabels = {
      mechanical: 'תקלה מכנית', stopped_driving: 'רכב לא נוסע', flat_tire: "פנצ'ר",
      stuck_wheel: 'גלגל תקוע', accident: 'תאונה', no_fuel: 'אין דלק',
      dead_battery: 'מצבר', locked_keys: 'מפתחות נעולים', other: 'אחר'
    };

    const statusLabels = {
      waiting_treatment: 'ממתין לטיפול', awaiting_assignment: 'ממתין לשיוך',
      assigning: 'בשיוך', vendor_enroute: 'ספק בדרך', in_progress: 'בטיפול',
      completed: 'הושלם', cancelled: 'בוטל'
    };

    let durationMinutes = null;
    const start = new Date(call.created_date);
    const now = call.closed_at ? new Date(call.closed_at) : new Date();
    durationMinutes = Math.round((now - start) / (1000 * 60));

    const historyText = history.slice(0, 10).map(h => 
      `[${h.change_type}] ${h.notes || ''} ${h.old_value ? h.old_value + ' → ' + h.new_value : h.new_value || ''}`
    ).join('\n');

    const messagesText = messages.slice(0, 10).map(m =>
      `[${m.sender_role}] ${m.sender_name}: ${m.message_text}`
    ).join('\n');

    const prompt = `צור סיכום מהיר וקצר בעברית לקריאת שירות דרך. הסיכום צריך להיות מקצועי, תמציתי (3-5 שורות), וקל לקריאה מהירה.

פרטי הקריאה:
- מספר: ${call.call_number || 'לא ידוע'}
- לקוח: ${call.customer_name} (${call.customer_phone})
- סטטוס: ${statusLabels[call.call_status] || call.call_status}
- סוג תקלה: ${issueLabels[call.issue_type] || call.issue_type || 'לא צוין'}
- תיאור: ${call.issue_description || 'לא צוין'}
- רכב: ${call.vehicle_model || 'לא צוין'} ${call.vehicle_plate || ''}
- מיקום: ${call.pickup_location_address || 'לא צוין'}${call.pickup_location_city ? ', ' + call.pickup_location_city : ''}
- יעד: ${call.dropoff_location_address || 'לא צוין'}
- ספק: ${call.assigned_vendor_name || 'לא שובץ'}
- משך עד כה: ${durationMinutes ? durationMinutes + ' דקות' : 'לא ידוע'}
- הערות מוקדן: ${call.operator_notes || 'אין'}
- הערות ספק: ${call.vendor_notes || 'אין'}

${historyText ? 'היסטוריה:\n' + historyText : ''}
${messagesText ? 'הודעות:\n' + messagesText : ''}

צור:
1. סיכום קצר (3-5 שורות)
2. נקודות מפתח (2-4 נקודות)
3. המלצות לפעולה (אם רלוונטי, 1-2 המלצות)`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string", description: "סיכום קצר בעברית" },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "נקודות מפתח"
          },
          action_items: {
            type: "array",
            items: { type: "string" },
            description: "המלצות לפעולה"
          }
        },
        required: ["summary", "key_points"]
      }
    });

    return Response.json(response);

  } catch (error) {
    console.error('Quick summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
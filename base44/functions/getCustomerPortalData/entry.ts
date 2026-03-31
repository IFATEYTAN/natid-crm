import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Public endpoint for customer self-service portal.
 * Authenticates via phone + call number, returns call status and history.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { phone, call_number } = await req.json();

    if (!phone || !call_number) {
      return Response.json(
        { error: 'יש להזין מספר טלפון ומספר קריאה' },
        { status: 400 }
      );
    }

    // Normalize phone
    const normalizedPhone = phone.replace(/[\s\-()]/g, '');

    // Find matching call
    const calls = await base44.asServiceRole.entities.Call.filter({
      call_number: call_number.trim(),
    });

    if (calls.length === 0) {
      return Response.json(
        { error: 'קריאה לא נמצאה. ודא שמספר הקריאה נכון.' },
        { status: 404 }
      );
    }

    const call = calls[0];

    // Verify phone matches (check both caller_phone and customer_phone)
    const callPhones = [call.caller_phone, call.customer_phone]
      .filter(Boolean)
      .map((p) => p.replace(/[\s\-()]/g, ''));

    const phoneMatch = callPhones.some(
      (p) =>
        p === normalizedPhone ||
        p.replace(/^0/, '972') === normalizedPhone.replace(/^0/, '972') ||
        p === normalizedPhone.replace(/^\+/, '')
    );

    if (!phoneMatch) {
      return Response.json(
        { error: 'מספר הטלפון אינו תואם לקריאה זו' },
        { status: 403 }
      );
    }

    // Fetch call history (limited, sanitized)
    const history = await base44.asServiceRole.entities.CallHistory.filter(
      { call_id: call.id },
      '-created_date'
    );

    // Return sanitized data (no internal notes or vendor details)
    const statusLabels: Record<string, string> = {
      waiting_treatment: 'ממתין לטיפול',
      awaiting_assignment: 'ממתין לשיבוץ',
      assigning: 'בתהליך שיבוץ',
      vendor_enroute: 'נותן שירות בדרך',
      in_progress: 'בטיפול',
      vendor_arrived: 'נותן שירות הגיע',
      future_service: 'שירות עתידי',
      completed: 'הושלם',
      cancelled: 'בוטל',
    };

    return Response.json({
      success: true,
      call: {
        call_number: call.call_number,
        status: call.call_status,
        status_label: statusLabels[call.call_status] || call.call_status,
        created_date: call.created_date,
        service_type: call.service_type,
        location_address: call.location_address,
        location_city: call.location_city,
        destination_address: call.destination_address,
        vendor_name: call.assigned_vendor_name || null,
        vendor_eta: call.vendor_eta || null,
        closed_at: call.closed_at || null,
        customer_name: call.caller_name || call.customer_name,
      },
      history: history.slice(0, 20).map((h) => ({
        change_type: h.change_type,
        new_value: h.new_value,
        created_date: h.created_date,
      })),
    });
  } catch (error) {
    console.error('Customer portal error:', error);
    return Response.json({ error: 'שגיאה בטעינת הנתונים' }, { status: 500 });
  }
});
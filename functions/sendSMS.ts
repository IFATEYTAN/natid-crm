import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, message, callId } = await req.json();

    if (!phone || !message) {
      return Response.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    // Log SMS sending to call history if callId provided
    if (callId) {
      await base44.entities.CallHistory.create({
        call_id: callId,
        change_type: 'note',
        new_value: `נשלח SMS ללקוח: ${message}`,
        changed_by: user.full_name,
        notes: `טלפון: ${phone}`
      });
    }

    // In production, integrate with SMS provider (Twilio, Infobip, etc.)
    // For now, we'll simulate sending
    console.log(`Sending SMS to ${phone}: ${message}`);

    return Response.json({ 
      success: true, 
      message: 'SMS sent successfully',
      phone,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SMS Error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
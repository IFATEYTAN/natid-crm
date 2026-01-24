import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STATUS_MESSAGES = {
  awaiting_assignment: 'הקריאה התקבלה ואנחנו מחפשים ספק זמין',
  assigning: 'מצאנו ספק מתאים ומחכים לאישורו',
  vendor_enroute: 'הספק בדרך אליך! צפי הגעה: {eta}',
  in_progress: 'הספק הגיע ומתחיל בטיפול',
  completed: 'הטיפול הושלם בהצלחה. תודה שבחרת בנו!'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id, status, eta, custom_message } = await req.json();

    if (!call_id || !status) {
      return Response.json({ error: 'Missing call_id or status' }, { status: 400 });
    }

    // Get the call details
    const calls = await base44.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Determine message to send
    let messageText = custom_message || STATUS_MESSAGES[status];
    if (!messageText) {
      messageText = `סטטוס הקריאה עודכן: ${status}`;
    }

    // Replace placeholders
    if (eta) {
      messageText = messageText.replace('{eta}', eta);
    }

    // Create system message in chat
    await base44.entities.Message.create({
      call_id: call_id,
      sender_name: 'מערכת',
      sender_role: 'system',
      message_text: messageText,
      message_type: 'status_update',
      is_read: false
    });

    // Send SMS to customer if phone exists
    if (call.customer_phone) {
      try {
        await base44.integrations.Core.SendEmail({
          to: call.customer_email || `${call.customer_phone}@sms.placeholder.com`,
          subject: `עדכון קריאה ${call.call_number || call_id.slice(-6)}`,
          body: messageText
        });
      } catch (smsError) {
        console.log('Could not send SMS notification:', smsError.message);
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Status update sent',
      sent_message: messageText
    });

  } catch (error) {
    console.error('Error sending status update:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
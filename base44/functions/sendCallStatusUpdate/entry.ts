import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveAppRole } from './_shared/appRole.ts';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

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

    // Only admin, operator, or vendor can send status updates
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator', 'vendor'].includes(appRole)) {
      return Response.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    const rl = await limiter.check('sendCallStatusUpdate', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

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

    // Ownership check: vendors can only update calls assigned to them
    if (appRole === 'vendor') {
      const vendorRecords = await base44.entities.Vendor.filter({ email: user.email });
      if (!vendorRecords.length || call.assigned_vendor_id !== vendorRecords[0].id) {
        return Response.json({ error: 'Forbidden - this call is not assigned to you' }, { status: 403 });
      }
    }

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

    // Notify operators about significant status changes
    if (['in_progress', 'completed', 'cancelled', 'on_site'].includes(status)) {
      // Fetch admins and operators for notifications
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
      const notifyUsers = [...admins, ...operators];

      const titleMap = {
        in_progress: 'טיפול החל',
        completed: 'טיפול הושלם',
        cancelled: 'קריאה בוטלה',
        on_site: 'ספק הגיע'
      };

      for (const op of notifyUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: op.id,
          title: titleMap[status] || 'עדכון סטטוס',
          message: `קריאה ${call.call_number || call.id.substring(0,8)}: ${messageText}`,
          type: status === 'completed' ? 'success' : 'info',
          is_read: false,
          link: `/CallDetails?id=${call.id}`,
          related_entity_id: call.id,
          related_entity_type: 'call'
        });
      }
    }

    // Send SMS to customer if phone exists (via Twilio)
    if (call.customer_phone) {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          // Format phone number for Israel
          let formattedPhone = call.customer_phone.replace(/\D/g, '');
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '972' + formattedPhone.substring(1);
          }
          if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
          }

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

          const formData = new URLSearchParams();
          formData.append('To', formattedPhone);
          formData.append('From', twilioPhoneNumber);
          formData.append('Body', `נתיב: ${messageText}`);

          const smsResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
          });

          if (!smsResponse.ok) {
            const errorText = await smsResponse.text();
            console.log('SMS send failed:', errorText);
          }
        } catch (smsError) {
          console.log('Could not send SMS notification:', smsError.message);
        }
      } else {
        console.log('Twilio not configured - SMS not sent');
      }

      // Also send email if customer email exists
      if (call.customer_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: call.customer_email,
            subject: `עדכון קריאה ${call.call_number || call_id.slice(-6)}`,
            body: `
              <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
                <h2 style="color: #FF0000;">עדכון קריאה</h2>
                <p>${messageText}</p>
                ${call.call_number ? `<p><strong>מספר קריאה:</strong> ${call.call_number}</p>` : ''}
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">הודעה זו נשלחה ממערכת נתיב - שירותי דרך</p>
              </div>
            `
          });
        } catch (emailError) {
          console.log('Could not send email notification:', emailError.message);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Status update sent',
      sent_message: messageText
    });

  } catch (error) {
    console.error('Error sending status update:', error);
    return Response.json({ error: 'Failed to send status update' }, { status: 500 });
  }
});
// redeploy-marker v2

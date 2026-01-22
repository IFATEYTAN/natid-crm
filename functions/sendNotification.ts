import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send notification to customer or vendor
 * Supports: In-app, Email, SMS
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      recipient_type, // 'customer' | 'vendor' | 'user'
      recipient_phone,
      recipient_email,
      recipient_name,
      notification_type, // 'call_assigned' | 'vendor_enroute' | 'call_completed' | 'custom'
      call_id,
      call_number,
      message,
      channels = ['in_app'] // ['in_app', 'email', 'sms']
    } = await req.json();

    const results = {
      in_app: null,
      email: null,
      sms: null
    };

    // Generate message based on notification type
    let title = '';
    let body = message || '';

    switch (notification_type) {
      case 'call_assigned':
        title = 'קריאה שובצה';
        body = body || `קריאה ${call_number} שובצה לטיפול. נציג בדרך אליך.`;
        break;
      case 'vendor_enroute':
        title = 'ספק בדרך';
        body = body || `הספק יצא לדרך לטיפול בקריאה ${call_number}.`;
        break;
      case 'call_completed':
        title = 'קריאה הושלמה';
        body = body || `הטיפול בקריאה ${call_number} הושלם בהצלחה.`;
        break;
      case 'eta_update':
        title = 'עדכון זמן הגעה';
        body = body || `זמן הגעה משוער עודכן לקריאה ${call_number}.`;
        break;
      default:
        title = title || 'עדכון מנתיב';
    }

    // 1. In-App Notification
    if (channels.includes('in_app')) {
      try {
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_id: user.id, // Or recipient user ID
          title,
          message: body,
          type: 'info',
          related_entity_id: call_id,
          related_entity_type: 'call',
          link: call_id ? `/CallDetails?id=${call_id}` : null
        });
        results.in_app = { success: true, id: notification.id };
      } catch (error) {
        results.in_app = { success: false, error: error.message };
      }
    }

    // 2. Email Notification
    if (channels.includes('email') && recipient_email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient_email,
          subject: title,
          body: `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
              <h2 style="color: #FF0000;">${title}</h2>
              <p>${body}</p>
              ${call_number ? `<p><strong>מספר קריאה:</strong> ${call_number}</p>` : ''}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                הודעה זו נשלחה ממערכת נתיב - שירותי דרך
              </p>
            </div>
          `
        });
        results.email = { success: true };
      } catch (error) {
        results.email = { success: false, error: error.message };
      }
    }

    // 3. SMS Notification (requires Twilio setup)
    if (channels.includes('sms') && recipient_phone) {
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          // Format phone number for Israel
          let formattedPhone = recipient_phone.replace(/\D/g, '');
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
          formData.append('Body', `נתיב: ${title}\n${body}`);

          const smsResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
          });

          if (smsResponse.ok) {
            const smsResult = await smsResponse.json();
            results.sms = { success: true, sid: smsResult.sid };
          } else {
            const errorText = await smsResponse.text();
            results.sms = { success: false, error: errorText };
          }
        } catch (error) {
          results.sms = { success: false, error: error.message };
        }
      } else {
        results.sms = { success: false, error: 'Twilio not configured' };
      }
    }

    // Log the notification activity
    if (call_id) {
      await base44.asServiceRole.entities.CallHistory.create({
        call_id,
        call_number,
        change_type: 'note',
        notes: `התראה נשלחה: ${title}`,
        changed_by: user.email
      });
    }

    return Response.json({
      success: true,
      notification_type,
      results
    });

  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'operator'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
    }

    // Rate limit: 10 SMS per user per minute, 100 per day
    const perMinute = await limiter.check('sms', user.id, 10, 60_000);
    if (!perMinute.allowed) return rateLimitResponse(perMinute.resetAt);

    const dailyCount = await limiter.getDailyCount('sms');
    if (dailyCount >= 10_000) {
      console.error('Daily SMS quota reached:', dailyCount);
      return Response.json({ error: 'Daily SMS quota exceeded' }, { status: 429 });
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

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log('Twilio not configured - SMS not sent');
      return Response.json({
        success: false,
        error: 'שירות SMS לא מוגדר - יש להגדיר משתני Twilio',
        phone,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Format phone number for Israel
    let formattedPhone = phone.replace(/[\s\-()]/g, '');
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
    formData.append('Body', message);

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
      console.error('Twilio SMS failed:', errorText);
      return Response.json({
        success: false,
        error: 'שליחת SMS נכשלה',
        phone,
        timestamp: new Date().toISOString()
      }, { status: 502 });
    }

    const smsResult = await smsResponse.json();
    await limiter.incrementDaily('sms');

    return Response.json({
      success: true,
      message: 'SMS sent successfully',
      phone,
      sid: smsResult.sid,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SMS Error:', error);
    return Response.json({
      error: 'Failed to send SMS',
      success: false
    }, { status: 500 });
  }
});
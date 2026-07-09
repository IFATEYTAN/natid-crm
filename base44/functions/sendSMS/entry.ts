import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const appRole = await resolveAppRole(base44, user);
    if (!user || !['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
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

// ===== Inline app-role resolution (kept per-file: a NEW _shared module cannot be
// registered on this platform - its standalone deploy fails ISOLATE_INTERNAL_FAILURE and
// importers then fail with Module not found; see docs/LESSONS_LEARNED.md 2026-07-09) =====
const APP_ROLE_MAP: Record<string, string> = {
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  מנהל: 'admin',
  'מנהל מערכת': 'admin',
  מוקדן: 'operator',
  מתפעל: 'operator',
  'מנהל תפעול': 'operator',
  טכנאי: 'agent',
  'נציג שטח': 'agent',
  ספק: 'vendor',
  'ספק שירות': 'vendor',
  Vendor: 'vendor',
  'Vendor ': 'vendor',
};

// deno-lint-ignore no-explicit-any
async function resolveAppRole(base44: any, user: any): Promise<string | null> {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.role === 'vendor' || user.role === 'ספק') return 'vendor';
  if (APP_ROLE_MAP[user.role]) return APP_ROLE_MAP[user.role];
  try {
    let perms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: user.id });
    if (!perms.length && user.email) {
      perms = await base44.asServiceRole.entities.UserPermission.filter({
        user_email: user.email,
      });
    }
    const mapped = APP_ROLE_MAP[perms[0]?.role_name];
    if (mapped) return mapped;
  } catch (_) {
    // Permission lookup failed - fall through to the frontend-matching default.
  }
  return 'operator';
}
// ===== End inline app-role resolution =====

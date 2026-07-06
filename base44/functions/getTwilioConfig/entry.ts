import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const token = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const auth = 'Basic ' + btoa(`${sid}:${token}`);

    // Validate credentials against Twilio (no message is sent)
    const accountRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: auth },
    });
    const account = accountRes.ok ? await accountRes.json() : null;

    // Check the configured phone number capabilities
    const numbersRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PageSize=20`,
      { headers: { Authorization: auth } }
    );
    const numbers = numbersRes.ok ? await numbersRes.json() : null;

    return Response.json({
      sms_number: Deno.env.get('TWILIO_PHONE_NUMBER') || null,
      whatsapp_number: Deno.env.get('TWILIO_WHATSAPP_NUMBER') || null,
      credentials_valid: accountRes.ok,
      account_status: account?.status || null,
      account_type: account?.type || null,
      owned_numbers: numbers?.incoming_phone_numbers?.map((n) => ({
        number: n.phone_number,
        sms: n.capabilities?.sms,
        voice: n.capabilities?.voice,
      })) || null,
      account_error: accountRes.ok ? null : await accountRes.text(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
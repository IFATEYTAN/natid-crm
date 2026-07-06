import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    return Response.json({
      sms_number: Deno.env.get('TWILIO_PHONE_NUMBER') || null,
      whatsapp_number: Deno.env.get('TWILIO_WHATSAPP_NUMBER') || null,
      account_sid_prefix: (Deno.env.get('TWILIO_ACCOUNT_SID') || '').slice(0, 8),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
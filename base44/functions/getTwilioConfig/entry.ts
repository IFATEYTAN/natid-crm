import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const appRole = await resolveAppRole(base44, user);
    if (!user || appRole !== 'admin') {
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

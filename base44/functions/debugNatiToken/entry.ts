import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';
const FALLBACK_JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJOYXRpZCIsImlhdCI6MTc3NTUwMTkwMSwiZXhwIjo0MDc5MTg1MDgyLCJhdWQiOiJhcGkubmF0aWQuY28uaWwiLCJzdWIiOiJhZG1pbkBuYXRpZC5jby5pbCIsInVzZXJuYW1lIjoiYmFzZTQ0In0.msS8au2-b4nF770ngilLaYvSaAsmDZwWxPLM0f6S0CiJA82x3x1_fNQuwJZTezjd4mup9AsLkl0_v1p6-fvGxA';
const FALLBACK_CLIENT_ID = '62c66127-cdb9-4579-9f18-a9b6ff9d06fd';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const envToken = Deno.env.get('NATI_API_JWT_TOKEN');
    const envClientId = Deno.env.get('NATI_API_CLIENT_ID');
    
    const tokenUsed = envToken || FALLBACK_JWT;
    const clientIdUsed = envClientId || FALLBACK_CLIENT_ID;

    // Test with env token
    const testEnv = await fetch(`${NATI_API_BASE}/get_appeals_list?dep=-1&callStatus=-1&dir=DESC`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenUsed}`,
        'clientId': clientIdUsed,
        'Content-Type': 'application/json',
      },
    });

    // Test with fallback token directly
    const testFallback = await fetch(`${NATI_API_BASE}/get_appeals_list?dep=-1&callStatus=-1&dir=DESC`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FALLBACK_JWT}`,
        'clientId': FALLBACK_CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    return Response.json({
      env_token_exists: !!envToken,
      env_token_first20: envToken ? envToken.substring(0, 20) + '...' : 'NOT SET',
      env_client_id: envClientId || 'NOT SET',
      fallback_token_first20: FALLBACK_JWT.substring(0, 20) + '...',
      tokens_match: envToken === FALLBACK_JWT,
      test_with_env: { status: testEnv.status },
      test_with_fallback: { status: testFallback.status },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
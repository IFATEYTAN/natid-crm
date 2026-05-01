import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const envTokenRaw = Deno.env.get('NATI_API_JWT_TOKEN') || '';
    const envClientIdRaw = Deno.env.get('NATI_API_CLIENT_ID') || '';
    const envToken = envTokenRaw.trim();
    const envClientId = envClientIdRaw.trim().replace(/\s+JWT$/i, '').trim();

    if (!envToken || !envClientId) {
      return Response.json({
        env_token_exists: !!envToken,
        env_client_id_exists: !!envClientId,
        error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets',
      }, { status: 500 });
    }

    const testEnv = await fetch(`${NATI_API_BASE}/get_appeals_list?dep=-1&callStatus=-1&dir=DESC`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${envToken}`,
        'clientId': envClientId,
        'Content-Type': 'application/json',
      },
    });

    let responseBody = null;
    try {
      const text = await testEnv.text();
      responseBody = text.substring(0, 2000);
      try { responseBody = JSON.parse(text); } catch {}
    } catch {}

    return Response.json({
      env_token_exists: true,
      env_token_first20: envToken.substring(0, 20) + '...',
      env_client_id: envClientId,
      env_client_id_was_trimmed: envClientIdRaw !== envClientId,
      test_with_env: { status: testEnv.status, body: responseBody },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';

// Hardcoded fallback credentials (also set as secrets)
const FALLBACK_JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJOYXRpZCIsImlhdCI6MTc3NTUwMTkwMSwiZXhwIjo0MDc5MTg1MDgyLCJhdWQiOiJhcGkubmF0aWQuY28uaWwiLCJzdWIiOiJhZG1pbkBuYXRpZC5jby5pbCIsInVzZXJuYW1lIjoiYmFzZTQ0In0.msS8au2-b4nF770ngilLaYvSaAsmDZwWxPLM0f6S0CiJA82x3x1_fNQuwJZTezjd4mup9AsLkl0_v1p6-fvGxA';
const FALLBACK_CLIENT_ID = '62c66127-cdb9-4579-9f18-a9b6ff9d06fd';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can fetch from external API
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const JWT_TOKEN = Deno.env.get('NATI_API_JWT_TOKEN') || FALLBACK_JWT;
    const CLIENT_ID = Deno.env.get('NATI_API_CLIENT_ID') || FALLBACK_CLIENT_ID;

    // Parse optional filters from request body
    const body = await req.json().catch(() => ({}));
    const {
      dep = -1,
      callStatus = -1,
      dir = 'DESC',
      from_date,
      to_date,
      q,
    } = body;

    // Build query params
    const params = new URLSearchParams();
    params.set('dep', String(dep));
    params.set('callStatus', String(callStatus));
    if (dir) params.set('dir', dir);
    if (from_date) params.set('from_date', from_date);
    if (to_date) params.set('to_date', to_date);
    if (q) params.set('q', q);

    const url = `${NATI_API_BASE}/get_appeals_list?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: `Nati API returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';

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

    const JWT_TOKEN = Deno.env.get('NATI_API_JWT_TOKEN') || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJOYXRpZCIsImlhdCI6MTc3NTUwMTkwMSwiZXhwIjo0MDc5MTg1MDgyLCJhdWQiOiJhcGkubmF0aWQuY28uaWwiLCJzdWIiOiJhZG1pbkBuYXRpZC5jby5pbCIsInVzZXJuYW1lIjoiYmFzZTQ0In0.msS8au2-b4nF770ngilLaYvSaAsmDZwWxPLM0f6S0CiJA82x3x1_fNQuwJZTezjd4mup9AsLkl0_v1p6-fvGxA';
    const CLIENT_ID = Deno.env.get('NATI_API_CLIENT_ID') || '62c66127-cdb9-4579-9f18-a9b6ff9d06fd';

    console.log('Using CLIENT_ID:', CLIENT_ID.substring(0, 12) + '...');
    console.log('Using JWT (first 30):', JWT_TOKEN.substring(0, 30) + '...');

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
    console.log('Fetching Nati API:', url);

    // Try with different header variations
    const headers = {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'clientId': CLIENT_ID,
      'client_id': CLIENT_ID,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    console.log('Request URL:', url);
    console.log('Headers keys:', Object.keys(headers).join(', '));

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Nati API error:', response.status, errorText);
      return Response.json(
        { error: `Nati API returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Nati API response: success=' + data.success + ', total=' + data.total);

    return Response.json(data);
  } catch (error) {
    console.error('fetchNatiAppeals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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

    const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
    const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();

    if (!JWT_TOKEN || !CLIENT_ID) {
      return Response.json(
        { error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets' },
        { status: 500 }
      );
    }

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

    // Build query params - שמות הפרמטרים לפי תיעוד ה-API של נתי
    const params = new URLSearchParams();
    params.set('dep', String(dep));
    params.set('callStatus', String(callStatus));
    if (dir) params.set('dir', dir);
    if (from_date) params.set('fromdate', from_date);
    if (to_date) params.set('todate', to_date);
    if (q) params.set('q', q);

    const url = `${NATI_API_BASE}/getappealslist?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Accept': 'application/json',
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
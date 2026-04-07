import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';
const FALLBACK_JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJOYXRpZCIsImlhdCI6MTc3NTUwMTkwMSwiZXhwIjo0MDc5MTg1MDgyLCJhdWQiOiJhcGkubmF0aWQuY28uaWwiLCJzdWIiOiJhZG1pbkBuYXRpZC5jby5pbCIsInVzZXJuYW1lIjoiYmFzZTQ0In0.msS8au2-b4nF770ngilLaYvSaAsmDZwWxPLM0f6S0CiJA82x3x1_fNQuwJZTezjd4mup9AsLkl0_v1p6-fvGxA';
const FALLBACK_CLIENT_ID = '62c66127-cdb9-4579-9f18-a9b6ff9d06fd';

/**
 * Fetch live data directly from Nati API on-demand.
 * Used for real-time status checks without waiting for sync.
 * 
 * Params:
 *   - action: "appeals_list" | "appeal_details"
 *   - appeal_id: (for appeal_details)
 *   - dep: department filter (-1 = all)
 *   - callStatus: status filter (-1 = all)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action = 'appeals_list', appeal_id, dep = -1, callStatus = -1 } = await req.json();

    const JWT_TOKEN = FALLBACK_JWT;
    const CLIENT_ID = FALLBACK_CLIENT_ID;

    if (!JWT_TOKEN || !CLIENT_ID) {
      return Response.json({ error: 'Nati API credentials not configured' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'clientId': CLIENT_ID,
      'Content-Type': 'application/json',
    };

    if (action === 'appeal_details' && appeal_id) {
      // Fetch single appeal details
      const url = `${NATI_API_BASE}/get_appeal_details?appealId=${appeal_id}`;
      const response = await fetch(url, { method: 'GET', headers });

      if (!response.ok) {
        const errorText = await response.text();
        return Response.json({ error: `Nati API error ${response.status}`, details: errorText }, { status: 502 });
      }

      const data = await response.json();
      return Response.json({ success: true, data: data.data || data });
    }

    // Default: fetch appeals list
    const params = new URLSearchParams({
      dep: String(dep),
      callStatus: String(callStatus),
      dir: 'DESC',
    });
    const url = `${NATI_API_BASE}/get_appeals_list?${params.toString()}`;
    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `Nati API error ${response.status}`, details: errorText }, { status: 502 });
    }

    const natiData = await response.json();
    if (!natiData.success) {
      return Response.json({ error: 'Nati API returned unsuccessful', raw: natiData }, { status: 502 });
    }

    return Response.json({
      success: true,
      total: natiData.total,
      data: natiData.data,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('fetchLiveNatiData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';

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

    const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
    const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();

    if (!JWT_TOKEN || !CLIENT_ID) {
      return Response.json({ error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets' }, { status: 500 });
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
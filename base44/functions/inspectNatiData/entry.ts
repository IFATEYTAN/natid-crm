// Inspect full structure of Nati API data - returns first record with all fields

Deno.serve(async (req) => {
  const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
  const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();

  if (!JWT_TOKEN || !CLIENT_ID) {
    return Response.json({ error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets' }, { status: 500 });
  }

  try {
    const url = 'https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1&dir=DESC';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // Return summary + first 2 full records
    return Response.json({
      success: data.success,
      total: data.total,
      fields: data.data && data.data.length > 0 ? Object.keys(data.data[0]) : [],
      sample_records: data.data ? data.data.slice(0, 2) : [],
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
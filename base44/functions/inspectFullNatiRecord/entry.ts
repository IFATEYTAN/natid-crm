// Inspect full raw record from Nati API to see ALL available fields
Deno.serve(async (req) => {
  const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
  const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '');

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
    if (!data.success || !data.data) {
      return Response.json({ error: 'API failed', raw: data }, { status: 502 });
    }

    const records = data.data;

    // Find a record WITH a supplier (assigned)
    const assigned = records.find(r => r.supplier_name && r.supplier_name.trim());
    // Find one WITHOUT supplier
    const unassigned = records.find(r => !r.supplier_name || !r.supplier_name.trim());

    // List ALL unique field names across all records
    const allFields = new Set();
    for (const r of records) {
      Object.keys(r).forEach(k => allFields.add(k));
    }

    return Response.json({
      total_fields: allFields.size,
      all_field_names: [...allFields].sort(),
      assigned_example_full: assigned || 'none found',
      unassigned_example_full: unassigned || 'none found',
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
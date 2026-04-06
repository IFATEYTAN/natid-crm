// Inspect full structure of Nati API data - returns first record with all fields

Deno.serve(async (req) => {
  const JWT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJOYXRpZCIsImlhdCI6MTc3NTUwMTkwMSwiZXhwIjo0MDc5MTg1MDgyLCJhdWQiOiJhcGkubmF0aWQuY28uaWwiLCJzdWIiOiJhZG1pbkBuYXRpZC5jby5pbCIsInVzZXJuYW1lIjoiYmFzZTQ0In0.msS8au2-b4nF770ngilLaYvSaAsmDZwWxPLM0f6S0CiJA82x3x1_fNQuwJZTezjd4mup9AsLkl0_v1p6-fvGxA';
  const CLIENT_ID = '62c66127-cdb9-4579-9f18-a9b6ff9d06fd';

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
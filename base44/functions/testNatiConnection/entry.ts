// Simple test function - no auth required, just tests the Nati API connection
// Like running a Postman test

Deno.serve(async (req) => {
  const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
  const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();

  if (!JWT_TOKEN || !CLIENT_ID) {
    return Response.json({ error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets' }, { status: 500 });
  }

  const results = {};

  // Test 1: Basic GET with Bearer + clientId header
  try {
    const url1 = 'https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1&dir=DESC';
    const res1 = await fetch(url1, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });
    const body1 = await res1.text();
    results.test1_bearer_clientId = { status: res1.status, body: body1.substring(0, 500) };
  } catch (e) {
    results.test1_bearer_clientId = { error: e.message };
  }

  // Test 2: POST instead of GET
  try {
    const url2 = 'https://api.natid.co.il/api/get_appeals_list';
    const res2 = await fetch(url2, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dep: -1, callStatus: -1, dir: 'DESC' }),
    });
    const body2 = await res2.text();
    results.test2_post = { status: res2.status, body: body2.substring(0, 500) };
  } catch (e) {
    results.test2_post = { error: e.message };
  }

  // Test 3: clientId as query param instead of header
  try {
    const url3 = `https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1&dir=DESC&clientId=${CLIENT_ID}`;
    const res3 = await fetch(url3, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const body3 = await res3.text();
    results.test3_clientId_query = { status: res3.status, body: body3.substring(0, 500) };
  } catch (e) {
    results.test3_clientId_query = { error: e.message };
  }

  // Test 4: Client-Id header (hyphenated)
  try {
    const url4 = 'https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1&dir=DESC';
    const res4 = await fetch(url4, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Client-Id': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });
    const body4 = await res4.text();
    results.test4_hyphen_header = { status: res4.status, body: body4.substring(0, 500) };
  } catch (e) {
    results.test4_hyphen_header = { error: e.message };
  }

  // Test 5: X-Client-Id header
  try {
    const url5 = 'https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1&dir=DESC';
    const res5 = await fetch(url5, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'X-Client-Id': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });
    const body5 = await res5.text();
    results.test5_x_client_id = { status: res5.status, body: body5.substring(0, 500) };
  } catch (e) {
    results.test5_x_client_id = { error: e.message };
  }

  // Test 6: Check if API is reachable at all (health check / root)
  try {
    const res6 = await fetch('https://api.natid.co.il/', { method: 'GET' });
    const body6 = await res6.text();
    results.test6_root = { status: res6.status, body: body6.substring(0, 300) };
  } catch (e) {
    results.test6_root = { error: e.message };
  }

  return Response.json(results, { status: 200 });
});
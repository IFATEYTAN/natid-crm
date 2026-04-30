// Test sync without auth - just to verify the mapping works

const NATI_API_BASE = 'https://api.natid.co.il/api';

// Nati status codes (per src/docs/nati-api-reference.md):
// 0=ממתין, 1=בטיפול, 2=באחסנה, 3=המשך טיפול, 4=בוצע לא סגור, 5=הגיע, 6=שירות עתידי
function mapStatus(s) {
  return { '0': 'new', '1': 'in_progress', '2': 'in_progress', '3': 'in_progress', '4': 'in_progress', '5': 'on_site', '6': 'new' }[String(s)] || 'new';
}

function mapDepartment(d) {
  return { 'גרירה': 'גרירה', 'ניידת': 'ניידת שירות', 'ניידת שירות': 'ניידת שירות', 'שמשות': 'שמשות', 'רכב חליפי': 'רכב חליפי', 'רדיו דיסק': 'רדיו דיסק' }[d] || 'אחר';
}

function mapServiceType(st, dept) {
  if (dept === 'גרירה') return 'towing';
  for (const [k, v] of Object.entries({ 'תקר': 'flat_tire', 'מצבר': 'battery', 'נעילה': 'lockout', 'דלק': 'fuel', 'תאונה': 'accident', 'מכני': 'mechanical' })) {
    if (st && st.includes(k)) return v;
  }
  return 'other';
}

function mapAppeal(a) {
  return {
    case_number: a.appeal_id,
    customer_name: a.client_name || a.user_name || '',
    caller_name: a.requester || a.user_name || '',
    caller_phone: a.tel || '',
    vehicle_number: a.car_num || '',
    vehicle_model: a.kod_degem_name || '',
    service_type: mapServiceType(a.serve_type, a.department),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: mapStatus(a.status),
    priority: a.vip === '1' ? 'urgent' : 'normal',
    assigned_provider_name: a.supplier_name || '',
    department: mapDepartment(a.department),
    insurance_company: a.agent_name || '',
    package_name: a.package_name || '',
    problem_description: a.problem_desc || a.diagnose || '',
    inspector_name: a.inspector_name || '',
    is_vip: a.vip === '1',
    source_status: a.finish_time && !a.finish_time.startsWith('0000') ? 'closed' : 'open',
    dispatcher_name: a.user_name || '',
    case_reference_code: a.sub_num || '',
  };
}

Deno.serve(async (req) => {
  try {
    const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
    const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();

    if (!JWT_TOKEN || !CLIENT_ID) {
      return Response.json({ error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets' }, { status: 500 });
    }

    const url = `${NATI_API_BASE}/get_appeals_list?dep=-1&callStatus=-1&dir=DESC`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${JWT_TOKEN}`, 'clientId': CLIENT_ID, 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    if (!data.success) return Response.json({ error: 'API failed', data }, { status: 502 });

    const mapped = data.data.map(mapAppeal);

    return Response.json({
      total: data.total,
      sample: mapped.slice(0, 3),
      departments: [...new Set(data.data.map(a => a.department))],
      statuses: [...new Set(data.data.map(a => a.status))],
      serve_types: [...new Set(data.data.map(a => a.serve_type).filter(Boolean))],
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
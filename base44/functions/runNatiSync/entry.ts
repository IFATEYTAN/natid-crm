// Run actual sync - creates/updates Case entities from Nati API data
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, min, sec] = match;
  return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
}

function mapAppeal(a) {
  const mapped = {
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
    internal_notes: a.q_notes || '',
    inspector_name: a.inspector_name || '',
    passed_qa: a.inspector_approves === '1',
    is_vip: a.vip === '1',
    opening_source: a.open_from_api === '1' ? 'app' : 'call_center',
    source_status: a.finish_time && !a.finish_time.startsWith('0000') ? 'closed' : 'open',
    dispatcher_name: a.user_name || '',
    case_reference_code: a.sub_num || '',
  };

  if (a.claim_total_cost && parseFloat(a.claim_total_cost) > 0) mapped.price = parseFloat(a.claim_total_cost);
  if (a.wait_time && parseInt(a.wait_time) > 0) mapped.waiting_time_minutes = parseInt(a.wait_time);
  
  const arrivedAt = parseNatiDate(a.arrive_time);
  if (arrivedAt) mapped.arrived_at = arrivedAt;
  const completedAt = parseNatiDate(a.finish_time);
  if (completedAt) mapped.completed_at = completedAt;
  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) mapped.assigned_at = assignedAt;
  if (a.future_service_from) mapped.future_service_time = a.future_service_from;

  // Clean empty/undefined
  const clean = {};
  for (const [k, v] of Object.entries(mapped)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
    const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();

    if (!JWT_TOKEN || !CLIENT_ID) {
      return Response.json({ error: 'Missing NATI_API_JWT_TOKEN or NATI_API_CLIENT_ID secrets' }, { status: 500 });
    }

    // Fetch from Nati
    const url = `${NATI_API_BASE}/get_appeals_list?dep=-1&callStatus=-1&dir=DESC`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${JWT_TOKEN}`, 'clientId': CLIENT_ID, 'Content-Type': 'application/json' },
    });

    const natiData = await response.json();
    if (!natiData.success || !natiData.data) {
      return Response.json({ error: 'Nati API failed' }, { status: 502 });
    }

    const mapped = natiData.data.map(mapAppeal);

    // Get existing cases to check for duplicates
    const existing = await base44.asServiceRole.entities.Case.filter({});
    const existingMap = {};
    for (const c of existing) {
      if (c.case_number) existingMap[c.case_number] = c.id;
    }

    let created = 0, updated = 0, errors = 0;
    const errorDetails = [];

    for (const caseData of mapped) {
      try {
        const existingId = existingMap[caseData.case_number];
        if (existingId) {
          await base44.asServiceRole.entities.Case.update(existingId, caseData);
          updated++;
        } else {
          await base44.asServiceRole.entities.Case.create(caseData);
          created++;
        }
      } catch (e) {
        errors++;
        if (errorDetails.length < 5) errorDetails.push({ case_number: caseData.case_number, error: e.message });
      }
    }

    return Response.json({ success: true, total: natiData.total, created, updated, errors, errorDetails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
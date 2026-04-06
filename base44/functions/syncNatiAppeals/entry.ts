import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';
const FALLBACK_JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJOYXRpZCIsImlhdCI6MTc3NTUwMTkwMSwiZXhwIjo0MDc5MTg1MDgyLCJhdWQiOiJhcGkubmF0aWQuY28uaWwiLCJzdWIiOiJhZG1pbkBuYXRpZC5jby5pbCIsInVzZXJuYW1lIjoiYmFzZTQ0In0.msS8au2-b4nF770ngilLaYvSaAsmDZwWxPLM0f6S0CiJA82x3x1_fNQuwJZTezjd4mup9AsLkl0_v1p6-fvGxA';
const FALLBACK_CLIENT_ID = '62c66127-cdb9-4579-9f18-a9b6ff9d06fd';

// Map Nati status codes to our Case status
function mapStatus(natiStatus) {
  const statusMap = {
    '0': 'new',          // חדש
    '1': 'assigned',     // שובץ ספק
    '2': 'en_route',     // ספק בדרך
    '3': 'on_site',      // ספק הגיע
    '4': 'in_progress',  // בטיפול
    '5': 'completed',    // הושלם
    '6': 'cancelled',    // בוטל
  };
  return statusMap[String(natiStatus)] || 'new';
}

// Map Nati department to our department
function mapDepartment(dept) {
  const deptMap = {
    'גרירה': 'גרירה',
    'ניידת': 'ניידת שירות',
    'ניידת שירות': 'ניידת שירות',
    'שמשות': 'שמשות',
    'רכב חליפי': 'רכב חליפי',
    'רדיו דיסק': 'רדיו דיסק',
  };
  return deptMap[dept] || 'אחר';
}

// Map Nati serve_type to our service_type
function mapServiceType(serveType, dept) {
  if (dept === 'גרירה') return 'towing';
  const typeMap = {
    'תקר': 'flat_tire',
    'מצבר': 'battery',
    'נעילה': 'lockout',
    'דלק': 'fuel',
    'תאונה': 'accident',
    'מכני': 'mechanical',
  };
  for (const [key, val] of Object.entries(typeMap)) {
    if (serveType && serveType.includes(key)) return val;
  }
  return 'other';
}

// Parse Nati date format "DD/MM/YYYY HH:mm:ss" to ISO
function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  // Format: "07/04/2026 00:32:57"
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, min, sec] = match;
  return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
}

// Map a single Nati appeal to Case entity
function mapAppealToCase(appeal) {
  return {
    case_number: appeal.appeal_id,
    customer_name: appeal.client_name || appeal.user_name || '',
    caller_name: appeal.requester || appeal.user_name || '',
    caller_phone: appeal.tel || '',
    vehicle_number: appeal.car_num || '',
    vehicle_model: appeal.kod_degem_name || '',
    vehicle_type: appeal.vehicle_class === '1' ? 'car' : appeal.vehicle_class === '2' ? 'motorcycle' : appeal.vehicle_class === '3' ? 'truck' : 'car',
    service_type: mapServiceType(appeal.serve_type, appeal.department),
    location_address: appeal.address || '',
    location_city: appeal.city || '',
    destination_address: appeal.grar_address || '',
    destination_city: appeal.grar_city || '',
    status: mapStatus(appeal.status),
    priority: appeal.vip === '1' ? 'urgent' : 'normal',
    assigned_provider_name: appeal.supplier_name || '',
    department: mapDepartment(appeal.department),
    insurance_company: appeal.agent_name || '',
    package_name: appeal.package_name || '',
    problem_description: appeal.problem_desc || appeal.diagnose || '',
    internal_notes: appeal.q_notes || '',
    inspector_name: appeal.inspector_name || '',
    passed_qa: appeal.inspector_approves === '1',
    is_vip: appeal.vip === '1',
    opening_source: appeal.open_from_api === '1' ? 'app' : 'call_center',
    source_status: appeal.status === '5' || appeal.status === '6' ? 'closed' : 'open',
    dispatcher_name: appeal.user_name || '',
    price: appeal.claim_total_cost ? parseFloat(appeal.claim_total_cost) : undefined,
    waiting_time_minutes: appeal.wait_time ? parseInt(appeal.wait_time) : undefined,
    case_reference_code: appeal.sub_num || '',
    // Dates
    ...(parseNatiDate(appeal.date_added) ? { } : {}),
    ...(appeal.arrive_time ? { arrived_at: parseNatiDate(appeal.arrive_time) || undefined } : {}),
    ...(appeal.finish_time ? { completed_at: parseNatiDate(appeal.finish_time) || undefined } : {}),
    ...(appeal.supplier_assigned_date ? { assigned_at: parseNatiDate(appeal.supplier_assigned_date) || undefined } : {}),
    ...(appeal.future_service_from ? { future_service_time: appeal.future_service_from } : {}),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dep = -1, callStatus = -1, dryRun = false } = body;

    const JWT_TOKEN = Deno.env.get('NATI_API_JWT_TOKEN') || FALLBACK_JWT;
    const CLIENT_ID = Deno.env.get('NATI_API_CLIENT_ID') || FALLBACK_CLIENT_ID;

    // Fetch appeals from Nati
    const params = new URLSearchParams({ dep: String(dep), callStatus: String(callStatus), dir: 'DESC' });
    const url = `${NATI_API_BASE}/get_appeals_list?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `Nati API error ${response.status}`, details: errorText }, { status: 502 });
    }

    const natiData = await response.json();
    if (!natiData.success || !natiData.data) {
      return Response.json({ error: 'Nati API returned unsuccessful response', raw: natiData }, { status: 502 });
    }

    const appeals = natiData.data;
    const mappedCases = appeals.map(mapAppealToCase);

    // If dry run, just return what would be synced
    if (dryRun) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        total_from_nati: natiData.total,
        sample_mapped: mappedCases.slice(0, 3),
      });
    }

    // Get existing cases by case_number to determine create vs update
    const existingCases = await base44.asServiceRole.entities.Case.filter({});
    const existingByNumber = {};
    for (const c of existingCases) {
      if (c.case_number) existingByNumber[c.case_number] = c;
    }

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const caseData of mappedCases) {
      try {
        // Clean undefined values
        const cleanData = {};
        for (const [k, v] of Object.entries(caseData)) {
          if (v !== undefined && v !== null && v !== '') {
            cleanData[k] = v;
          }
        }

        const existing = existingByNumber[caseData.case_number];
        if (existing) {
          await base44.asServiceRole.entities.Case.update(existing.id, cleanData);
          updated++;
        } else {
          await base44.asServiceRole.entities.Case.create(cleanData);
          created++;
        }
      } catch (e) {
        console.error(`Error syncing appeal ${caseData.case_number}:`, e.message);
        errors++;
      }
    }

    return Response.json({
      success: true,
      total_from_nati: natiData.total,
      created,
      updated,
      errors,
    });
  } catch (error) {
    console.error('syncNatiAppeals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
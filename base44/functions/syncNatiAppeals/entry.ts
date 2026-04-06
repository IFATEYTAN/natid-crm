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

// Parse future service date "YYYY-MM-DD HH:MM:SS" - skip zero dates
function parseFutureDate(dateStr) {
  if (!dateStr || dateStr.startsWith('0000')) return null;
  return dateStr.replace(' ', 'T');
}

// Map a single Nati appeal to Case entity
function mapAppealToCase(appeal) {
  return {
    case_number: appeal.appeal_id,
    customer_name: appeal.client_name || appeal.user_name || '',
    caller_name: appeal.requester || appeal.user_name || '',
    caller_phone: appeal.tel || appeal.intermediary_phone || '',
    vehicle_number: appeal.car_num || '',
    vehicle_model: appeal.kod_degem_name || '',
    vehicle_type: appeal.vehicle_class === '1' ? 'car' : appeal.vehicle_class === '2' ? 'motorcycle' : appeal.vehicle_class === '3' ? 'truck' : 'car',
    vehicle_model_code: appeal.car_code || '',
    service_type: mapServiceType(appeal.serve_type, appeal.department),
    location_address: appeal.address || '',
    location_city: appeal.city || '',
    destination_address: appeal.grar_address || '',
    destination_city: appeal.grar_city || '',
    status: mapStatus(appeal.status),
    priority: appeal.vip === '1' ? 'urgent' : 'normal',
    assigned_provider_name: (appeal.supplier_name || '').trim(),
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
    customer_id: appeal.client_id || '',
    customer_email: appeal.client_email || '',
    remaining_days: appeal.days_remain ? parseInt(appeal.days_remain) : undefined,
    coverage_details: appeal.serve_type || '',
    // Dates
    ...(appeal.arrive_time ? { arrived_at: parseNatiDate(appeal.arrive_time) || undefined } : {}),
    ...(appeal.finish_time ? { completed_at: parseNatiDate(appeal.finish_time) || undefined } : {}),
    ...(appeal.supplier_assigned_date ? { assigned_at: parseNatiDate(appeal.supplier_assigned_date) || undefined } : {}),
    ...(parseFutureDate(appeal.future_service_from) ? { future_service_time: parseFutureDate(appeal.future_service_from) } : {}),
    ...(appeal.arrive_expected_time ? { vendor_arrival_time: parseNatiDate(appeal.arrive_expected_time) || undefined } : {}),
  };
}

// Extract unique vendor names from appeals
function extractUniqueVendors(appeals) {
  const vendors = new Map();
  for (const appeal of appeals) {
    const name = (appeal.supplier_name || '').trim();
    if (name && !vendors.has(name)) {
      vendors.set(name, { vendor_name: name, is_active: true });
    }
  }
  return Array.from(vendors.values());
}

// Extract unique customers from appeals
function extractUniqueCustomers(appeals) {
  const customers = new Map();
  for (const appeal of appeals) {
    const clientId = appeal.client_id;
    const name = (appeal.client_name || '').trim();
    if (!name) continue;
    
    // Use client_id as key if available, otherwise name
    const key = clientId || name;
    if (!customers.has(key)) {
      customers.set(key, {
        name: name,
        customer_id_external: clientId || '',
        phone: appeal.tel || '',
        email: appeal.client_email || '',
        insurance_company: appeal.agent_name || '',
        package_name: appeal.package_name || '',
        vehicle_number: appeal.car_num || '',
        vehicle_model: appeal.kod_degem_name || '',
        customer_type: appeal.agent_name ? 'insurance_company' : 'individual',
        status: 'active',
      });
    }
  }
  return Array.from(customers.values());
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

    // If dry run, return what would be synced
    if (dryRun) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        total_from_nati: natiData.total,
        unique_vendors: extractUniqueVendors(appeals).length,
        unique_customers: extractUniqueCustomers(appeals).length,
        sample_mapped: mappedCases.slice(0, 3),
      });
    }

    // ============ STEP 1: Sync Vendors ============
    const existingVendors = await base44.asServiceRole.entities.Vendor.filter({});
    const vendorByName = {};
    for (const v of existingVendors) {
      if (v.vendor_name) vendorByName[v.vendor_name.trim()] = v;
    }

    const newVendors = extractUniqueVendors(appeals);
    let vendorsCreated = 0;
    for (const vendorData of newVendors) {
      if (!vendorByName[vendorData.vendor_name]) {
        const created = await base44.asServiceRole.entities.Vendor.create(vendorData);
        vendorByName[vendorData.vendor_name] = created;
        vendorsCreated++;
      }
    }

    // ============ STEP 2: Sync Customers ============
    const existingCustomers = await base44.asServiceRole.entities.Customer.filter({});
    const customerByExtId = {};
    const customerByName = {};
    for (const c of existingCustomers) {
      if (c.customer_id_external) customerByExtId[c.customer_id_external] = c;
      if (c.name) customerByName[c.name.trim()] = c;
    }

    const newCustomers = extractUniqueCustomers(appeals);
    let customersCreated = 0;
    for (const custData of newCustomers) {
      const key = custData.customer_id_external || custData.name;
      const exists = custData.customer_id_external
        ? customerByExtId[custData.customer_id_external]
        : customerByName[custData.name];
      if (!exists) {
        const created = await base44.asServiceRole.entities.Customer.create(custData);
        if (custData.customer_id_external) customerByExtId[custData.customer_id_external] = created;
        customerByName[custData.name] = created;
        customersCreated++;
      }
    }

    // ============ STEP 3: Sync Cases ============
    const existingCases = await base44.asServiceRole.entities.Case.filter({});
    const existingByNumber = {};
    for (const c of existingCases) {
      if (c.case_number) existingByNumber[c.case_number] = c;
    }

    let casesCreated = 0;
    let casesUpdated = 0;
    let casesErrors = 0;

    for (const caseData of mappedCases) {
      try {
        // Clean undefined/null/empty values
        const cleanData = {};
        for (const [k, v] of Object.entries(caseData)) {
          if (v !== undefined && v !== null && v !== '') {
            cleanData[k] = v;
          }
        }

        // Link vendor ID
        const vendorName = cleanData.assigned_provider_name;
        if (vendorName && vendorByName[vendorName]) {
          cleanData.assigned_provider_id = vendorByName[vendorName].id;
        }

        // Link customer ID (use external id stored in customer_id field)
        const extCustId = cleanData.customer_id;
        if (extCustId && customerByExtId[extCustId]) {
          cleanData.customer_id = customerByExtId[extCustId].id;
        } else if (cleanData.customer_name) {
          const custByName = customerByName[cleanData.customer_name.trim()];
          if (custByName) {
            cleanData.customer_id = custByName.id;
          }
        }

        const existing = existingByNumber[caseData.case_number];
        if (existing) {
          await base44.asServiceRole.entities.Case.update(existing.id, cleanData);
          casesUpdated++;
        } else {
          await base44.asServiceRole.entities.Case.create(cleanData);
          casesCreated++;
        }
      } catch (e) {
        console.error(`Error syncing appeal ${caseData.case_number}:`, e.message);
        casesErrors++;
      }
    }

    return Response.json({
      success: true,
      total_from_nati: natiData.total,
      vendors: { existing: existingVendors.length, created: vendorsCreated },
      customers: { existing: existingCustomers.length, created: customersCreated },
      cases: { created: casesCreated, updated: casesUpdated, errors: casesErrors },
    });
  } catch (error) {
    console.error('syncNatiAppeals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
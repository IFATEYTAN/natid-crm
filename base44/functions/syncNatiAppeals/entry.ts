import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NATI_API_BASE = 'https://api.natid.co.il/api';
const FALLBACK_JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJOYXRpZCIsImlhdCI6MTc3NTUwMTkwMSwiZXhwIjo0MDc5MTg1MDgyLCJhdWQiOiJhcGkubmF0aWQuY28uaWwiLCJzdWIiOiJhZG1pbkBuYXRpZC5jby5pbCIsInVzZXJuYW1lIjoiYmFzZTQ0In0.msS8au2-b4nF770ngilLaYvSaAsmDZwWxPLM0f6S0CiJA82x3x1_fNQuwJZTezjd4mup9AsLkl0_v1p6-fvGxA';
const FALLBACK_CLIENT_ID = '62c66127-cdb9-4579-9f18-a9b6ff9d06fd';

// ========== STATUS MAPPINGS ==========

// Map Nati status codes to Case entity status
function mapCaseStatus(natiStatus) {
  const statusMap = {
    '0': 'new',
    '1': 'assigned',
    '2': 'en_route',
    '3': 'on_site',
    '4': 'in_progress',
    '5': 'completed',
    '6': 'cancelled',
  };
  return statusMap[String(natiStatus)] || 'new';
}

// Map Nati status codes to Call entity status (different enum!)
function mapCallStatus(natiStatus) {
  const statusMap = {
    '0': 'waiting_treatment',
    '1': 'assigning',
    '2': 'vendor_enroute',
    '3': 'vendor_arrived',
    '4': 'in_progress',
    '5': 'completed',
    '6': 'cancelled',
  };
  return statusMap[String(natiStatus)] || 'waiting_treatment';
}

// Map Nati department
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

// Map Nati serve_type to Case service_type
function mapCaseServiceType(serveType, dept) {
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

// Map Nati serve_type to Call service_category
function mapCallServiceCategory(serveType, dept) {
  if (dept === 'גרירה') return 'towing';
  if (dept === 'ניידת' || dept === 'ניידת שירות') return 'mobile_unit';
  return 'other';
}

// Map Nati serve_type to Call issue_type
function mapCallIssueType(serveType, dept) {
  if (dept === 'גרירה') return 'stopped_driving';
  const typeMap = {
    'תקר': 'flat_tire',
    'מצבר': 'dead_battery',
    'נעילה': 'locked_keys',
    'דלק': 'no_fuel',
    'תאונה': 'accident',
    'מכני': 'mechanical',
    'גלגל': 'stuck_wheel',
  };
  for (const [key, val] of Object.entries(typeMap)) {
    if (serveType && serveType.includes(key)) return val;
  }
  return 'other';
}

// Map vehicle type
function mapVehicleType(vehicleClass) {
  const map = { '1': 'private', '2': 'motorcycle', '3': 'truck', '4': 'commercial_light' };
  return map[String(vehicleClass)] || 'private';
}

// Map area from Nati area codes
function mapArea(area) {
  const areaMap = {
    'מרכז': 'center',
    'שרון': 'sharon',
    'צפון': 'north',
    'דרום': 'south',
    'ירושלים': 'jerusalem',
    'שפלה': 'lowlands',
  };
  return areaMap[area] || 'undefined';
}

// ========== DATE PARSING ==========

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, min, sec] = match;
  return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
}

function parseFutureDate(dateStr) {
  if (!dateStr || dateStr.startsWith('0000')) return null;
  return dateStr.replace(' ', 'T');
}

// ========== ENTITY MAPPERS ==========

// Map Nati appeal → Case entity
function mapAppealToCase(appeal) {
  return {
    case_number: appeal.appeal_id,
    customer_name: appeal.client_name || appeal.user_name || '',
    caller_name: appeal.requester || appeal.user_name || '',
    caller_phone: appeal.tel || appeal.intermediary_phone || '',
    vehicle_number: appeal.car_num || '',
    vehicle_model: appeal.kod_degem_name || '',
    vehicle_type: mapVehicleType(appeal.vehicle_class),
    vehicle_model_code: appeal.car_code || '',
    service_type: mapCaseServiceType(appeal.serve_type, appeal.department),
    location_address: appeal.address || '',
    location_city: appeal.city || '',
    destination_address: appeal.grar_address || '',
    destination_city: appeal.grar_city || '',
    status: mapCaseStatus(appeal.status),
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
    ...(appeal.arrive_time ? { arrived_at: parseNatiDate(appeal.arrive_time) || undefined } : {}),
    ...(appeal.finish_time ? { completed_at: parseNatiDate(appeal.finish_time) || undefined } : {}),
    ...(appeal.supplier_assigned_date ? { assigned_at: parseNatiDate(appeal.supplier_assigned_date) || undefined } : {}),
    ...(parseFutureDate(appeal.future_service_from) ? { future_service_time: parseFutureDate(appeal.future_service_from) } : {}),
    ...(appeal.arrive_expected_time ? { vendor_arrival_time: parseNatiDate(appeal.arrive_expected_time) || undefined } : {}),
  };
}

// Map Nati appeal → Call entity (this is what the app UI uses!)
function mapAppealToCall(appeal) {
  return {
    call_number: appeal.appeal_id,
    call_status: mapCallStatus(appeal.status),
    call_priority: appeal.vip === '1' ? 'urgent' : 'normal',
    is_vip: appeal.vip === '1',
    service_category: mapCallServiceCategory(appeal.serve_type, appeal.department),
    issue_type: mapCallIssueType(appeal.serve_type, appeal.department),
    issue_description: appeal.problem_desc || appeal.diagnose || '',
    issue_detail: appeal.serve_type || '',
    // Customer info
    customer_name: appeal.client_name || appeal.user_name || '',
    customer_phone: appeal.tel || appeal.intermediary_phone || 'לא צוין',
    customer_phone_2: appeal.intermediary_phone || '',
    customer_id_number: appeal.client_id || '',
    customer_email: appeal.client_email || '',
    // Insurance / package
    insurance_company: appeal.agent_name || '',
    insurance_agent: appeal.agent_name || '',
    membership_package: appeal.package_name || '',
    membership_number: appeal.sub_num || '',
    coverage_details: appeal.serve_type || '',
    // Vehicle
    vehicle_plate: appeal.car_num || '',
    vehicle_model: appeal.kod_degem_name || '',
    vehicle_type: mapVehicleType(appeal.vehicle_class),
    vehicle_code: appeal.car_code || '',
    // Pickup location
    pickup_location_address: appeal.address || 'לא צוין',
    pickup_location_city: appeal.city || '',
    pickup_location_area: mapArea(appeal.area || ''),
    // Dropoff location
    dropoff_location_address: appeal.grar_address || '',
    dropoff_location_city: appeal.grar_city || '',
    dropoff_garage_name: appeal.grar_address || '',
    // Vendor info
    assigned_vendor_name: (appeal.supplier_name || '').trim(),
    // Operator / notes
    operator_notes: appeal.q_notes || '',
    vendor_notes: appeal.supplier_notes || '',
    // Timestamps
    ...(appeal.supplier_assigned_date ? { assigned_at: parseNatiDate(appeal.supplier_assigned_date) || undefined } : {}),
    ...(appeal.arrive_expected_time ? { vendor_arrival_time_estimated: parseNatiDate(appeal.arrive_expected_time) || undefined } : {}),
    ...(appeal.arrive_time ? { vendor_arrival_time_actual: parseNatiDate(appeal.arrive_time) || undefined } : {}),
    ...(appeal.finish_time ? { service_end_time: parseNatiDate(appeal.finish_time) || undefined } : {}),
    ...(appeal.finish_time ? { closed_at: parseNatiDate(appeal.finish_time) || undefined } : {}),
    // Financial
    ...(appeal.claim_total_cost && parseFloat(appeal.claim_total_cost) > 0 ? { total_cost: parseFloat(appeal.claim_total_cost) } : {}),
    ...(appeal.wait_time && parseInt(appeal.wait_time) > 0 ? { time_waiting: parseInt(appeal.wait_time) } : {}),
    // Future service
    ...(parseFutureDate(appeal.future_service_from) ? { future_service_date: parseFutureDate(appeal.future_service_from).split('T')[0] } : {}),
    // QA
    passed_quality_control: appeal.inspector_approves === '1',
    quality_controller_name: appeal.inspector_name || '',
    // Source info
    created_by_source: appeal.open_from_api === '1' ? 'bot' : 'operator',
  };
}

// ========== VENDOR / CUSTOMER EXTRACTION ==========

function extractUniqueVendors(appeals) {
  const vendors = new Map();
  for (const appeal of appeals) {
    const name = (appeal.supplier_name || '').trim();
    if (name && !vendors.has(name)) {
      vendors.set(name, {
        vendor_name: name,
        phone: appeal.supplier_phone || '',
        is_active: true,
        is_available_now: true,
        availability_status: 'available',
      });
    }
  }
  return Array.from(vendors.values());
}

function extractUniqueCustomers(appeals) {
  const customers = new Map();
  for (const appeal of appeals) {
    const name = (appeal.client_name || '').trim();
    if (!name) continue;
    const key = appeal.client_id || name;
    if (!customers.has(key)) {
      customers.set(key, {
        name: name,
        customer_id_external: appeal.client_id || '',
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

// ========== HELPER: clean empty/undefined/null ==========
function cleanData(obj) {
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }
  return clean;
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dep = -1, callStatus = -1, dryRun = false, dry_run = false } = body;
    const isDryRun = dryRun || dry_run;

    const JWT_TOKEN = FALLBACK_JWT;
    const CLIENT_ID = FALLBACK_CLIENT_ID;

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

    // If dry run, return what would be synced
    if (isDryRun) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        total_from_nati: natiData.total,
        unique_vendors: extractUniqueVendors(appeals).length,
        unique_customers: extractUniqueCustomers(appeals).length,
        sample_case: appeals.length > 0 ? cleanData(mapAppealToCase(appeals[0])) : null,
        sample_call: appeals.length > 0 ? cleanData(mapAppealToCall(appeals[0])) : null,
      });
    }

    // ============ STEP 1: Sync Vendors ============
    console.log('[SYNC] Step 1: Syncing vendors...');
    const existingVendors = await base44.asServiceRole.entities.Vendor.filter({});
    const vendorByName = {};
    for (const v of existingVendors) {
      if (v.vendor_name) vendorByName[v.vendor_name.trim()] = v;
    }

    const newVendors = extractUniqueVendors(appeals);
    let vendorsCreated = 0;
    let vendorsUpdated = 0;
    for (const vendorData of newVendors) {
      const existing = vendorByName[vendorData.vendor_name];
      if (!existing) {
        const created = await base44.asServiceRole.entities.Vendor.create(vendorData);
        vendorByName[vendorData.vendor_name] = created;
        vendorsCreated++;
      } else {
        // Update phone if we have it from Nati and vendor doesn't have one
        if (vendorData.phone && (!existing.phone || existing.phone === '')) {
          await base44.asServiceRole.entities.Vendor.update(existing.id, { phone: vendorData.phone });
          existing.phone = vendorData.phone;
          vendorsUpdated++;
        }
      }
    }
    console.log(`[SYNC] Vendors: ${vendorsCreated} created, ${existingVendors.length} existing`);

    // ============ STEP 2: Sync Customers ============
    console.log('[SYNC] Step 2: Syncing customers...');
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
    console.log(`[SYNC] Customers: ${customersCreated} created, ${existingCustomers.length} existing`);

    // Batch config to avoid rate limiting
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1500;

    // ============ STEP 3: Sync Cases ============
    console.log('[SYNC] Step 3: Syncing cases...');
    const existingCases = await base44.asServiceRole.entities.Case.filter({});
    const caseByNumber = {};
    for (const c of existingCases) {
      if (c.case_number) caseByNumber[c.case_number] = c;
    }

    let casesCreated = 0, casesUpdated = 0, casesErrors = 0;

    for (let i = 0; i < appeals.length; i += BATCH_SIZE) {
      const batch = appeals.slice(i, i + BATCH_SIZE);
      
      for (const appeal of batch) {
        try {
          const caseData = cleanData(mapAppealToCase(appeal));

          // Link vendor ID
          const vendorName = caseData.assigned_provider_name;
          if (vendorName && vendorByName[vendorName]) {
            caseData.assigned_provider_id = vendorByName[vendorName].id;
          }

          // Link customer ID
          const extCustId = caseData.customer_id;
          if (extCustId && customerByExtId[extCustId]) {
            caseData.customer_id = customerByExtId[extCustId].id;
          } else if (caseData.customer_name) {
            const custByName = customerByName[caseData.customer_name.trim()];
            if (custByName) caseData.customer_id = custByName.id;
          }

          const existing = caseByNumber[caseData.case_number];
          if (existing) {
            await base44.asServiceRole.entities.Case.update(existing.id, caseData);
            casesUpdated++;
          } else {
            await base44.asServiceRole.entities.Case.create(caseData);
            casesCreated++;
          }
        } catch (e) {
          console.error(`[SYNC] Case error ${appeal.appeal_id}:`, e.message);
          casesErrors++;
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < appeals.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
    console.log(`[SYNC] Cases: ${casesCreated} created, ${casesUpdated} updated, ${casesErrors} errors`);

    // ============ STEP 4: Sync Calls (main UI entity) ============
    console.log('[SYNC] Step 4: Syncing calls (UI entity)...');
    const existingCalls = await base44.asServiceRole.entities.Call.filter({});
    const callByNumber = {};
    for (const c of existingCalls) {
      if (c.call_number) callByNumber[c.call_number] = c;
    }

    let callsCreated = 0, callsUpdated = 0, callsErrors = 0;


    for (let i = 0; i < appeals.length; i += BATCH_SIZE) {
      const batch = appeals.slice(i, i + BATCH_SIZE);
      
      for (const appeal of batch) {
        try {
          const callData = cleanData(mapAppealToCall(appeal));

          // Link vendor ID
          const vendorName = callData.assigned_vendor_name;
          if (vendorName && vendorByName[vendorName]) {
            callData.assigned_vendor_id = vendorByName[vendorName].id;
          }

          const existing = callByNumber[callData.call_number];
          if (existing) {
            await base44.asServiceRole.entities.Call.update(existing.id, callData);
            callsUpdated++;
          } else {
            await base44.asServiceRole.entities.Call.create(callData);
            callsCreated++;
          }
        } catch (e) {
          console.error(`[SYNC] Call error ${appeal.appeal_id}:`, e.message);
          callsErrors++;
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < appeals.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
    console.log(`[SYNC] Calls: ${callsCreated} created, ${callsUpdated} updated, ${callsErrors} errors`);

    return Response.json({
      success: true,
      total_from_nati: natiData.total,
      vendors: { existing: existingVendors.length, created: vendorsCreated },
      customers: { existing: existingCustomers.length, created: customersCreated },
      cases: { created: casesCreated, updated: casesUpdated, errors: casesErrors },
      calls: { created: callsCreated, updated: callsUpdated, errors: callsErrors },
    });
  } catch (error) {
    console.error('syncNatiAppeals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
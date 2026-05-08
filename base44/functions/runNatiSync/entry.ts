/**
 * runNatiSync — Direct MySQL: creates/updates Case entities from call_open_appeals
 * With rate-limit protection: 150ms sleep, batches of 20, exponential backoff retry.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

function getDbConfig() {
  return {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: 15000,
    ssl: { rejectUnauthorized: false },
  };
}

async function getConnection() {
  const config = getDbConfig();
  if (!config.host || !config.user || !config.password) throw new Error('Missing NATID_DB_* secrets');
  try { return await mysql.createConnection(config); }
  catch (e) { const { ssl, ...noSsl } = config; return await mysql.createConnection(noSsl); }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOp(fn, label) {
  const delays = [500, 1500, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const isRateLimit = e.message?.includes('Rate limit') || e.message?.includes('429') || e.status === 429;
      if (isRateLimit && attempt < delays.length) {
        console.log(`[RETRY] ${label} attempt ${attempt + 1}, waiting ${delays[attempt]}ms`);
        await sleep(delays[attempt]);
      } else {
        throw e;
      }
    }
  }
}

const DEPT_MAP = { 0: 'אחר', 3: 'גרירה', 4: 'ניידת שירות', 5: 'שמשות', 10: 'רכב חליפי' };
const CASE_STATUS_MAP = { 0: 'new', 1: 'assigned', 2: 'completed', 3: 'cancelled', 6: 'completed', 7: 'completed' };

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (s.startsWith('0000')) return null;
  if (s instanceof Date || (s.includes('-') && s.length >= 10)) return s.replace(' ', 'T').substring(0, 19);
  return null;
}

function mapServiceType(deptId) {
  if (deptId === 3) return 'towing';
  if (deptId === 4) return 'mechanical';
  return 'other';
}

function mapAppeal(a) {
  const mapped = {
    case_number: String(a.id),
    customer_name: a.requester || '',
    caller_name: a.requester || '',
    caller_phone: a.tel || a.tel1 || '',
    vehicle_number: a.car_num || '',
    vehicle_year: a.car_year || undefined,
    vehicle_model_code: a.car_code ? String(a.car_code) : '',
    service_type: mapServiceType(a.department_id),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: CASE_STATUS_MAP[a.status] || 'new',
    assigned_provider_name: a.supplier_name || '',
    department: DEPT_MAP[a.department_id] || 'אחר',
    problem_description: a.diagnose || '',
    internal_notes: a.q_notes || '',
    passed_qa: a.inspector_approves === 1,
    opening_source: a.open_from_api === 1 ? 'app' : 'call_center',
    source_status: a.finish_time ? 'closed' : 'open',
    case_reference_code: a.sub_num ? String(a.sub_num) : '',
    customer_id: a.client_id ? String(a.client_id) : '',
  };

  const arrivedAt = parseNatiDate(a.arrive_actual_time);
  if (arrivedAt) mapped.arrived_at = arrivedAt;
  const completedAt = parseNatiDate(a.finish_time);
  if (completedAt) mapped.completed_at = completedAt;
  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) mapped.assigned_at = assignedAt;
  const etaTime = parseNatiDate(a.arrive_expected_time);
  if (etaTime) mapped.vendor_arrival_time = etaTime;
  if (a.future_service_from) {
    const fs = parseNatiDate(a.future_service_from);
    if (fs) mapped.future_service_time = fs;
  }
  if (a.num_of_km && a.num_of_km > 0) mapped.distance_km = a.num_of_km;

  const clean = {};
  for (const [k, v] of Object.entries(mapped)) { if (v !== undefined && v !== null && v !== '') clean[k] = v; }
  return clean;
}

const BATCH_SIZE = 20;
const ITEM_DELAY_MS = 150;
const BATCH_DELAY_MS = 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const connection = await getConnection();
    const [rows] = await connection.query(`
      SELECT a.*, s.fullname as supplier_name 
      FROM call_open_appeals a 
      LEFT JOIN suppliers s ON a.supplier_id = s.id 
      ORDER BY a.date_added DESC
    `);
    await connection.end();

    const mapped = rows.map(mapAppeal);

    const existing = await base44.asServiceRole.entities.Case.filter({});
    const existingMap = {};
    for (const c of existing) { if (c.case_number) existingMap[c.case_number] = c.id; }

    let created = 0, updated = 0, skipped = 0, errors = 0;
    const errorDetails = [];

    for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
      const batch = mapped.slice(i, i + BATCH_SIZE);
      console.log(`[SYNC] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mapped.length / BATCH_SIZE)} (${batch.length} items)`);

      for (const caseData of batch) {
        try {
          const existingId = existingMap[caseData.case_number];
          if (existingId) {
            await retryOp(() => base44.asServiceRole.entities.Case.update(existingId, caseData), `update ${caseData.case_number}`);
            updated++;
          } else {
            await retryOp(() => base44.asServiceRole.entities.Case.create(caseData), `create ${caseData.case_number}`);
            created++;
          }
        } catch (e) {
          errors++;
          if (errorDetails.length < 10) errorDetails.push({ case_number: caseData.case_number, error: e.message });
        }
        await sleep(ITEM_DELAY_MS);
      }

      if (i + BATCH_SIZE < mapped.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return Response.json({ success: true, total: rows.length, created, updated, skipped, errors, errorDetails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
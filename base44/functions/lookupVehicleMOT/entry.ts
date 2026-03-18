/**
 * lookupVehicleMOT.ts
 * -------------------------------------------------------
 * פונקציית שרת לזיהוי רכב ממשרד התחבורה
 * משתמשת ב-API הציבורי של data.gov.il (ללא מפתח API)
 * -------------------------------------------------------
 * POST { plate: "1234567" }
 * Returns: { success, data: { vehicle_type, fuel_type, model, year, color, test_valid_until, is_commercial, ... } }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, getClientIP, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

// MOT API endpoint (data.gov.il - public, no key required)
const MOT_API_URL = 'https://data.gov.il/api/3/action/datastore_search';
const MOT_RESOURCE_ID = '053cea08-09bc-40ec-8f7a-156f0677aff3';

// Fuel type mapping from MOT codes to system codes
const FUEL_TYPE_MAP: Record<string, string> = {
  '1': 'gasoline',
  '2': 'diesel',
  '3': 'gas',
  '4': 'electric',
  '5': 'hybrid',
  '6': 'hybrid',
  'בנזין': 'gasoline',
  'דיזל': 'diesel',
  'גז': 'gas',
  'חשמל': 'electric',
  'היברידי': 'hybrid',
  'היברידי טעין': 'hybrid',
};

// Vehicle type mapping
const VEHICLE_TYPE_MAP: Record<string, string> = {
  'פרטי': 'car',
  'מסחרי': 'van',
  'משאית': 'truck',
  'אוטובוס': 'bus',
  'אופנוע': 'motorcycle',
  'טרקטור': 'truck',
  'רכב עבודה': 'truck',
};

function mapFuelType(motFuel: string | undefined): string {
  if (!motFuel) return 'gasoline';
  const key = motFuel.trim();
  return FUEL_TYPE_MAP[key] || 'gasoline';
}

function mapVehicleType(motType: string | undefined): string {
  if (!motType) return 'car';
  const key = motType.trim();
  return VEHICLE_TYPE_MAP[key] || 'car';
}

function isCommercialVehicle(vehicleType: string | undefined, weight: string | undefined): boolean {
  if (!vehicleType) return false;
  const type = vehicleType.trim();
  if (['מסחרי', 'משאית', 'אוטובוס', 'רכב עבודה', 'טרקטור'].includes(type)) return true;
  // Also check by weight - vehicles over 3500kg are commercial
  if (weight) {
    const weightNum = parseInt(weight, 10);
    if (!isNaN(weightNum) && weightNum > 3500) return true;
  }
  return false;
}

function isTestValid(testDate: string | undefined): boolean {
  if (!testDate) return false;
  try {
    const test = new Date(testDate);
    return test > new Date();
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    // Rate limit: 30 requests per IP per minute (MOT lookups)
    const clientIP = getClientIP(req);
    const rl = await limiter.check('lookupVehicleMOT', clientIP, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    // Auth check
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { plate } = await req.json();

    if (!plate || typeof plate !== 'string') {
      return Response.json(
        { success: false, error: 'מספר לוחית חובה' },
        { status: 400 }
      );
    }

    // Normalize plate: remove dashes, spaces
    const normalizedPlate = plate.replace(/[-\s]/g, '').trim();

    if (normalizedPlate.length < 5 || normalizedPlate.length > 8) {
      return Response.json(
        { success: false, error: 'מספר לוחית לא תקין' },
        { status: 400 }
      );
    }

    // Query MOT API
    const motUrl = new URL(MOT_API_URL);
    motUrl.searchParams.set('resource_id', MOT_RESOURCE_ID);
    motUrl.searchParams.set('q', normalizedPlate);
    motUrl.searchParams.set('limit', '1');

    const motResponse = await fetch(motUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NatID-CRM/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!motResponse.ok) {
      console.error('MOT API error:', motResponse.status, await motResponse.text());
      return Response.json(
        { success: false, error: 'שגיאה בחיבור למשרד התחבורה', code: 'MOT_API_ERROR' },
        { status: 502 }
      );
    }

    const motData = await motResponse.json();

    if (!motData.success || !motData.result?.records?.length) {
      return Response.json({
        success: false,
        error: 'רכב לא נמצא במאגר משרד התחבורה',
        code: 'VEHICLE_NOT_FOUND',
      });
    }

    const record = motData.result.records[0];

    // Extract and map fields
    const vehicleTypeRaw = record['sug_degem'] || record['tozeret_nm'] || '';
    const fuelTypeRaw = record['sug_delek_nm'] || '';
    const testDateRaw = record['tokef_dt'] || '';
    const weightRaw = record['mishkal_kolel'] || '';

    const vehicleType = mapVehicleType(vehicleTypeRaw);
    const fuelType = mapFuelType(fuelTypeRaw);
    const isCommercial = isCommercialVehicle(vehicleTypeRaw, weightRaw);
    const testValid = isTestValid(testDateRaw);

    // Build year from first registration date
    let year: number | null = null;
    const firstRegDate = record['moed_aliya_lakvish'] || record['shnat_yitzur'] || '';
    if (firstRegDate) {
      const yearMatch = firstRegDate.toString().match(/(\d{4})/);
      if (yearMatch) year = parseInt(yearMatch[1], 10);
    }

    const result = {
      // Core vehicle info
      vehicle_plate: normalizedPlate,
      vehicle_type: vehicleType,
      vehicle_type_raw: vehicleTypeRaw,
      vehicle_model: record['kinuy_mishari'] || record['degem_nm'] || '',
      vehicle_manufacturer: record['tozeret_nm'] || '',
      vehicle_year: year,
      fuel_type: fuelType,
      fuel_type_raw: fuelTypeRaw,
      vehicle_color: record['tzeva_rechev'] || '',
      engine_volume: record['nefach_manoa'] || null,
      seats: record['mispar_moshavim'] || null,
      total_weight: weightRaw ? parseInt(weightRaw, 10) : null,

      // Test (טסט)
      test_valid_until: testDateRaw,
      has_valid_test: testValid,
      test_status: testValid ? 'בתוקף' : 'פג תוקף',

      // Commercial flag
      is_commercial: isCommercial,

      // Raw MOT record for debugging
      _mot_raw: {
        mispar_rechev: record['mispar_rechev'],
        degem_cd: record['degem_cd'],
        tozeret_cd: record['tozeret_cd'],
      },
    };

    // Log the lookup for audit
    try {
      await base44.asServiceRole.entities.AuditLog?.create({
        action: 'vehicle_lookup',
        entity_type: 'vehicle',
        entity_id: normalizedPlate,
        performed_by: user.email,
        details: `זיהוי רכב ${normalizedPlate}: ${result.vehicle_model} ${result.vehicle_year || ''}`,
      });
    } catch {
      // Audit log is optional
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('lookupVehicleMOT error:', error);
    return Response.json(
      { success: false, error: 'שגיאה פנימית בזיהוי הרכב', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Seed Demo Data for QA Testing
 *
 * Creates realistic test data across all entity types:
 * - 3 Customers (insurance, fleet, individual)
 * - 5 Vendors (different service types and areas)
 * - 10 Calls (various statuses and service types)
 * - Related entities (history, ratings, payments, locations)
 *
 * Usage: POST /functions/seedDemoData
 * Body: { "clear_existing": false }
 *
 * IMPORTANT: This is for QA/staging environments only.
 * Never run on production.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin only
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized - admin role required' },
        { status: 403 }
      );
    }

    const { clear_existing = false } = await req.json().catch(() => ({}));
    const results: Record<string, unknown[]> = {};

    // =====================
    // 1. CUSTOMERS
    // =====================
    const customers = [
      {
        name: 'הראל ביטוח',
        customer_type: 'insurance_company',
        contact_person: 'דוד כהן',
        phone: '03-5100000',
        email: 'david@harel-ins.co.il',
        address: 'אבא הלל 3',
        city: 'רמת גן',
        contract_type: 'monthly',
        sla_response_minutes: 15,
        sla_arrival_minutes: 45,
        monthly_budget: 80000,
        status: 'active',
      },
      {
        name: 'אלדן רכב',
        customer_type: 'fleet',
        contact_person: 'שרה לוי',
        phone: '03-5200000',
        email: 'sarah@eldan.co.il',
        address: 'דרך מנחם בגין 122',
        city: 'תל אביב',
        contract_type: 'yearly',
        sla_response_minutes: 20,
        sla_arrival_minutes: 60,
        monthly_budget: 50000,
        status: 'active',
      },
      {
        name: 'ישראל ישראלי',
        customer_type: 'individual',
        contact_person: '',
        phone: '050-1234567',
        email: 'israel@gmail.com',
        address: 'רחוב הרצל 15',
        city: 'חיפה',
        contract_type: 'per_call',
        sla_response_minutes: 30,
        sla_arrival_minutes: 90,
        monthly_budget: null,
        status: 'active',
      },
    ];

    const createdCustomers = [];
    for (const customer of customers) {
      const created = await base44.asServiceRole.entities.Customer.create(customer);
      createdCustomers.push(created);
    }
    results.customers = createdCustomers;

    // =====================
    // 2. VENDORS
    // =====================
    const vendors = [
      {
        vendor_name: 'גרר הצפון - מוחמד',
        phone: '052-1111111',
        email: 'mohamad@tow-north.co.il',
        contact_person: 'מוחמד חסן',
        phone_2: '052-1111112',
        service_type: ['tow_truck'],
        coverage_areas: ['north', 'haifa'],
        availability_status: 'available',
        is_active: true,
        is_available_now: true,
        vendor_type: 'external',
        payment_rate_per_call: 350,
        notes: 'ספק אמין, זמן תגובה מהיר',
        works_24_7: true,
        working_hours_start: '00:00',
        working_hours_end: '23:59',
        latitude: 32.794,
        longitude: 34.989,
        service_radius: 50,
      },
      {
        vendor_name: 'מכונאות דרך - יוסי',
        phone: '052-2222222',
        email: 'yossi@road-mech.co.il',
        contact_person: 'יוסי אברהם',
        phone_2: '',
        service_type: ['mechanic', 'battery'],
        coverage_areas: ['center', 'tel_aviv'],
        availability_status: 'available',
        is_active: true,
        is_available_now: true,
        vendor_type: 'external',
        payment_rate_per_call: 280,
        notes: 'מומחה מצברים ותקלות מנוע',
        works_24_7: false,
        working_hours_start: '07:00',
        working_hours_end: '22:00',
        latitude: 32.085,
        longitude: 34.781,
        service_radius: 30,
      },
      {
        vendor_name: 'צמיגי השרון - אבי',
        phone: '052-3333333',
        email: 'avi@sharon-tires.co.il',
        contact_person: 'אבי מזרחי',
        phone_2: '052-3333334',
        service_type: ['tire_service'],
        coverage_areas: ['sharon', 'center'],
        availability_status: 'busy',
        is_active: true,
        is_available_now: false,
        vendor_type: 'external',
        payment_rate_per_call: 200,
        notes: 'מומחה צמיגים, מלאי גדול',
        works_24_7: false,
        working_hours_start: '08:00',
        working_hours_end: '18:00',
        latitude: 32.184,
        longitude: 34.871,
        service_radius: 25,
      },
      {
        vendor_name: 'גרר המרכז - פנימי',
        phone: '052-4444444',
        email: 'internal@natid.co.il',
        contact_person: 'רון גולדברג',
        phone_2: '',
        service_type: ['tow_truck', 'mechanic'],
        coverage_areas: ['center', 'tel_aviv', 'sharon'],
        availability_status: 'available',
        is_active: true,
        is_available_now: true,
        vendor_type: 'internal',
        payment_rate_per_call: null,
        notes: 'גרר פנימי - עדיפות ראשונה',
        works_24_7: true,
        working_hours_start: '00:00',
        working_hours_end: '23:59',
        latitude: 32.073,
        longitude: 34.791,
        service_radius: 40,
      },
      {
        vendor_name: 'מנעולן אקספרס - מאור',
        phone: '052-5555555',
        email: 'maor@locksmith-express.co.il',
        contact_person: 'מאור דהן',
        phone_2: '',
        service_type: ['locksmith'],
        coverage_areas: ['south', 'beer_sheva'],
        availability_status: 'offline',
        is_active: true,
        is_available_now: false,
        vendor_type: 'external',
        payment_rate_per_call: 300,
        notes: 'מומחה פתיחת רכבים',
        works_24_7: false,
        working_hours_start: '08:00',
        working_hours_end: '20:00',
        latitude: 31.252,
        longitude: 34.791,
        service_radius: 35,
      },
    ];

    const createdVendors = [];
    for (const vendor of vendors) {
      const created = await base44.asServiceRole.entities.Vendor.create(vendor);
      createdVendors.push(created);
    }
    results.vendors = createdVendors;

    // =====================
    // 3. CALLS
    // =====================
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const calls = [
      // Active calls in various statuses
      {
        call_status: 'waiting_treatment',
        priority: 'urgent',
        customer_name: 'הראל ביטוח - אורי כהן',
        customer_phone: '050-9999001',
        insurance_company: 'הראל',
        vehicle_plate: '12-345-67',
        vehicle_type: 'private',
        vehicle_model: 'טויוטה קורולה 2022',
        service_type: 'tow',
        issue_type: 'engine_failure',
        issue_description: 'רכב לא מניע, נורת שמן דולקת',
        dispatch_type: 'tow_truck',
        customer_source: 'phone',
        pickup_location_address: 'כביש 2 ליד מחלף גלילות',
        pickup_location_city: 'הרצליה',
        pickup_location_lat: 32.161,
        pickup_location_lng: 34.791,
        internal_notes: 'לקוח VIP - עדיפות גבוהה',
      },
      {
        call_status: 'awaiting_assignment',
        priority: 'high',
        customer_name: 'אלדן - רכב מספר 4521',
        customer_phone: '050-9999002',
        insurance_company: '',
        vehicle_plate: '45-678-90',
        vehicle_type: 'van',
        vehicle_model: 'פיאט דוקאטו 2021',
        service_type: 'tire',
        issue_type: 'flat_tire',
        issue_description: 'פנצ\'ר בגלגל אחורי ימני, אין גלגל חלופי',
        dispatch_type: 'mobile_unit',
        customer_source: 'phone',
        pickup_location_address: 'רחוב אבן גבירול 100',
        pickup_location_city: 'תל אביב',
        pickup_location_lat: 32.087,
        pickup_location_lng: 34.781,
      },
      {
        call_status: 'vendor_enroute',
        priority: 'normal',
        customer_name: 'שרה ביטון',
        customer_phone: '050-9999003',
        insurance_company: 'הראל',
        vehicle_plate: '78-901-23',
        vehicle_type: 'private',
        vehicle_model: 'מאזדה 3 2020',
        service_type: 'battery',
        issue_type: 'dead_battery',
        issue_description: 'מצבר מת, רכב לא מניע בבוקר',
        dispatch_type: 'mobile_unit',
        customer_source: 'phone',
        pickup_location_address: 'רחוב ויצמן 30',
        pickup_location_city: 'כפר סבא',
        pickup_location_lat: 32.178,
        pickup_location_lng: 34.907,
        assigned_vendor_id: createdVendors[1]?.id,
        assigned_vendor_name: 'מכונאות דרך - יוסי',
      },
      {
        call_status: 'in_progress',
        priority: 'normal',
        customer_name: 'משה אדרי',
        customer_phone: '050-9999004',
        insurance_company: 'הפניקס',
        vehicle_plate: '11-222-33',
        vehicle_type: 'private',
        vehicle_model: 'יונדאי i30 2023',
        service_type: 'locksmith',
        issue_type: 'locked_out',
        issue_description: 'מפתחות ננעלו בתוך הרכב, חניון קניון',
        dispatch_type: 'mobile_unit',
        customer_source: 'bot',
        pickup_location_address: 'קניון עזריאלי',
        pickup_location_city: 'תל אביב',
        pickup_location_lat: 32.074,
        pickup_location_lng: 34.792,
        assigned_vendor_id: createdVendors[4]?.id,
        assigned_vendor_name: 'מנעולן אקספרס - מאור',
      },
      {
        call_status: 'assigning',
        priority: 'high',
        customer_name: 'רינת גולדשטיין',
        customer_phone: '050-9999005',
        insurance_company: 'מגדל',
        vehicle_plate: '44-555-66',
        vehicle_type: 'suv',
        vehicle_model: 'קיה ספורטאז\' 2024',
        service_type: 'tow',
        issue_type: 'accident',
        issue_description: 'תאונה קלה, רכב לא נוסע',
        dispatch_type: 'tow_truck',
        customer_source: 'phone',
        pickup_location_address: 'כביש 4 צומת מסובים',
        pickup_location_city: 'ראשון לציון',
        pickup_location_lat: 31.963,
        pickup_location_lng: 34.804,
        internal_notes: 'לתאם עם המשטרה בשטח',
      },
      // Completed calls (for history)
      {
        call_status: 'completed',
        priority: 'normal',
        customer_name: 'יעקב פרץ',
        customer_phone: '050-9999006',
        insurance_company: 'הראל',
        vehicle_plate: '77-888-99',
        vehicle_type: 'private',
        vehicle_model: 'סקודה אוקטביה 2021',
        service_type: 'tow',
        issue_type: 'engine_failure',
        issue_description: 'רתחת מנוע בכביש 1',
        dispatch_type: 'tow_truck',
        customer_source: 'phone',
        pickup_location_address: 'כביש 1 ליד שער הגיא',
        pickup_location_city: 'שער הגיא',
        pickup_location_lat: 31.799,
        pickup_location_lng: 34.989,
        dropoff_location_address: 'מוסך רימון',
        dropoff_location_city: 'ירושלים',
        assigned_vendor_id: createdVendors[0]?.id,
        assigned_vendor_name: 'גרר הצפון - מוחמד',
        cost_to_vendor: 450,
        closing_call_done: true,
        call_summary: 'רכב נגרר ממחלף שער הגיא למוסך רימון בירושלים. זמן תגובה 25 דקות. הלקוח שבע רצון.',
      },
      {
        call_status: 'completed',
        priority: 'high',
        customer_name: 'אלדן - רכב 3012',
        customer_phone: '050-9999007',
        insurance_company: '',
        vehicle_plate: '30-120-00',
        vehicle_type: 'private',
        vehicle_model: 'טויוטה יאריס 2022',
        service_type: 'battery',
        issue_type: 'dead_battery',
        issue_description: 'החלפת מצבר בשטח',
        dispatch_type: 'mobile_unit',
        customer_source: 'phone',
        pickup_location_address: 'רחוב רוטשילד 50',
        pickup_location_city: 'תל אביב',
        pickup_location_lat: 32.063,
        pickup_location_lng: 34.774,
        assigned_vendor_id: createdVendors[1]?.id,
        assigned_vendor_name: 'מכונאות דרך - יוסי',
        cost_to_vendor: 280,
        closing_call_done: true,
        call_summary: 'החלפת מצבר בשטח ברחוב רוטשילד. המצבר הישן נלקח לפינוי. הלקוח חתם דיגיטלית.',
      },
      {
        call_status: 'completed',
        priority: 'normal',
        customer_name: 'נועה רביד',
        customer_phone: '050-9999008',
        insurance_company: 'הראל',
        vehicle_plate: '55-666-77',
        vehicle_type: 'private',
        vehicle_model: 'הונדה סיוויק 2023',
        service_type: 'tire',
        issue_type: 'flat_tire',
        issue_description: 'החלפת צמיג בשטח',
        dispatch_type: 'mobile_unit',
        customer_source: 'bot',
        pickup_location_address: 'רחוב ז\'בוטינסקי 70',
        pickup_location_city: 'רמת גן',
        pickup_location_lat: 32.083,
        pickup_location_lng: 34.809,
        assigned_vendor_id: createdVendors[2]?.id,
        assigned_vendor_name: 'צמיגי השרון - אבי',
        cost_to_vendor: 200,
        closing_call_done: true,
      },
      // Cancelled call
      {
        call_status: 'cancelled',
        priority: 'low',
        customer_name: 'דני ברק',
        customer_phone: '050-9999009',
        insurance_company: 'כלל',
        vehicle_plate: '88-999-11',
        vehicle_type: 'private',
        vehicle_model: 'ניסאן קשקאי 2020',
        service_type: 'mechanic',
        issue_type: 'wont_start',
        issue_description: 'רכב לא מניע - הלקוח הצליח להניע לבד',
        dispatch_type: 'mobile_unit',
        customer_source: 'phone',
        pickup_location_address: 'רחוב סוקולוב 20',
        pickup_location_city: 'הרצליה',
        pickup_location_lat: 32.162,
        pickup_location_lng: 34.787,
        internal_notes: 'הלקוח ביטל - הרכב הניע',
      },
      // Bot-originated call
      {
        call_status: 'waiting_treatment',
        priority: 'normal',
        customer_name: 'אחמד סעיד',
        customer_phone: '050-9999010',
        insurance_company: 'הראל',
        vehicle_plate: '22-333-44',
        vehicle_type: 'private',
        vehicle_model: 'רנו מגאן 2021',
        service_type: 'fuel',
        issue_type: 'out_of_fuel',
        issue_description: 'נגמר הדלק בכביש 6',
        dispatch_type: 'mobile_unit',
        customer_source: 'bot',
        pickup_location_address: 'כביש 6 צפון, ק"מ 145',
        pickup_location_city: 'עפולה',
        pickup_location_lat: 32.608,
        pickup_location_lng: 35.292,
      },
    ];

    const createdCalls = [];
    for (const call of calls) {
      const created = await base44.asServiceRole.entities.Call.create(call);
      createdCalls.push(created);
    }
    results.calls = createdCalls;

    // =====================
    // 4. VENDOR RATINGS
    // =====================
    const completedCallsWithVendors = createdCalls.filter(
      (c) => c.call_status === 'completed' && c.assigned_vendor_id
    );

    const ratings = [];
    for (const call of completedCallsWithVendors) {
      const rating = await base44.asServiceRole.entities.VendorRating.create({
        vendor_id: call.assigned_vendor_id,
        call_id: call.id,
        overall_rating: Math.floor(Math.random() * 2) + 4, // 4 or 5
        comment: 'שירות מהיר ומקצועי',
      });
      ratings.push(rating);
    }
    results.ratings = ratings;

    // =====================
    // 5. VENDOR LOCATIONS (GPS snapshots)
    // =====================
    const locations = [];
    for (const vendor of createdVendors) {
      if (vendor.latitude && vendor.longitude) {
        const loc = await base44.asServiceRole.entities.VendorLocation.create({
          vendor_id: vendor.id,
          latitude: vendor.latitude + (Math.random() - 0.5) * 0.01,
          longitude: vendor.longitude + (Math.random() - 0.5) * 0.01,
          address: 'מיקום נוכחי',
          city: '',
        });
        locations.push(loc);
      }
    }
    results.locations = locations;

    // =====================
    // 6. CALL HISTORY (for completed calls)
    // =====================
    const histories = [];
    for (const call of completedCallsWithVendors) {
      const history = await base44.asServiceRole.entities.CallHistory.create({
        call_id: call.id,
        change_type: 'status_change',
        new_value: 'completed',
        notes: 'קריאה הושלמה בהצלחה',
        changed_by: 'system',
      });
      histories.push(history);
    }
    results.histories = histories;

    // =====================
    // Summary
    // =====================
    const summary = {
      customers_created: createdCustomers.length,
      vendors_created: createdVendors.length,
      calls_created: createdCalls.length,
      ratings_created: ratings.length,
      locations_created: locations.length,
      histories_created: histories.length,
      call_statuses: {
        waiting_treatment: createdCalls.filter((c) => c.call_status === 'waiting_treatment').length,
        awaiting_assignment: createdCalls.filter((c) => c.call_status === 'awaiting_assignment').length,
        assigning: createdCalls.filter((c) => c.call_status === 'assigning').length,
        vendor_enroute: createdCalls.filter((c) => c.call_status === 'vendor_enroute').length,
        in_progress: createdCalls.filter((c) => c.call_status === 'in_progress').length,
        completed: createdCalls.filter((c) => c.call_status === 'completed').length,
        cancelled: createdCalls.filter((c) => c.call_status === 'cancelled').length,
      },
    };

    return Response.json({
      success: true,
      message: 'Demo data seeded successfully',
      summary,
      data: results,
    });
  } catch (error) {
    console.error('seedDemoData error:', error);
    return Response.json(
      { error: error.message || 'Failed to seed demo data' },
      { status: 500 }
    );
  }
});

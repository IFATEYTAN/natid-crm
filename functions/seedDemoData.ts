import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden - only admins can seed demo data' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      seed_users = true,
      seed_customers = true,
      seed_vendors = true,
      seed_calls = true,
      seed_history = true,
      seed_ratings = true,
      seed_notifications = true,
      seed_queue = true,
      clear_existing = false,
    } = body;

    const results: Record<string, number> = {};
    const now = new Date();

    // ===================================================================
    // HELPER FUNCTIONS
    // ===================================================================

    function randomItem<T>(arr: T[]): T {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function randomInt(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomDate(daysBack: number): string {
      const d = new Date(now);
      d.setDate(d.getDate() - randomInt(0, daysBack));
      d.setHours(randomInt(6, 22), randomInt(0, 59), 0, 0);
      return d.toISOString();
    }

    function futureDate(daysAhead: number): string {
      const d = new Date(now);
      d.setDate(d.getDate() + daysAhead);
      return d.toISOString();
    }

    function generateCallNumber(): string {
      return `C-${Date.now().toString().slice(-8)}${randomInt(10, 99)}`;
    }

    function generateContractNumber(): string {
      return `CON-${now.getFullYear()}-${randomInt(1000, 9999)}`;
    }

    // ===================================================================
    // DEMO DATA CONSTANTS
    // ===================================================================

    const ISRAELI_CITIES = [
      { city: 'תל אביב', area: 'center', lat: 32.0853, lon: 34.7818 },
      { city: 'ירושלים', area: 'jerusalem', lat: 31.7683, lon: 35.2137 },
      { city: 'חיפה', area: 'north', lat: 32.794, lon: 34.9896 },
      { city: 'באר שבע', area: 'south', lat: 31.2518, lon: 34.7913 },
      { city: 'נתניה', area: 'sharon', lat: 32.3215, lon: 34.8532 },
      { city: 'ראשון לציון', area: 'center', lat: 31.9635, lon: 34.8041 },
      { city: 'פתח תקווה', area: 'center', lat: 32.0868, lon: 34.8872 },
      { city: 'אשדוד', area: 'lowlands', lat: 31.8044, lon: 34.6553 },
      { city: 'הרצליה', area: 'sharon', lat: 32.1629, lon: 34.8447 },
      { city: 'רמת גן', area: 'center', lat: 32.0686, lon: 34.8248 },
      { city: 'כפר סבא', area: 'sharon', lat: 32.1717, lon: 34.9069 },
      { city: 'רחובות', area: 'lowlands', lat: 31.8928, lon: 34.811 },
      { city: 'מודיעין', area: 'center', lat: 31.8969, lon: 35.0101 },
      { city: 'עפולה', area: 'north', lat: 32.608, lon: 35.2917 },
      { city: 'אילת', area: 'south', lat: 29.5577, lon: 34.9519 },
    ];

    const STREETS = [
      'רחוב הרצל',
      'שדרות רוטשילד',
      'רחוב דיזנגוף',
      'רחוב אלנבי',
      'דרך בן גוריון',
      'רחוב ז\'בוטינסקי',
      'שדרות ירושלים',
      'רחוב ויצמן',
      'דרך השלום',
      'רחוב הנשיא',
      'רחוב סוקולוב',
      'רחוב בגין',
    ];

    const FIRST_NAMES = [
      'יוסי',
      'דוד',
      'משה',
      'אבי',
      'רונן',
      'שרה',
      'מיכל',
      'רחל',
      'נועה',
      'יעל',
      'אורי',
      'גיל',
      'עומר',
      'תמר',
      'ליאור',
    ];
    const LAST_NAMES = [
      'כהן',
      'לוי',
      'מזרחי',
      'פרץ',
      'ביטון',
      'אברהם',
      'דהן',
      'אגבריה',
      'שפירא',
      'גולדשטיין',
      'רוזנברג',
      'אזולאי',
    ];

    const VEHICLE_MODELS = [
      'טויוטה קורולה',
      'יונדאי i30',
      'קיה ספורטאז\'',
      'מאזדה 3',
      'סקודה אוקטביה',
      'סוזוקי סוויפט',
      'שברולט ספארק',
      'הונדה סיוויק',
      'ניסאן קשקאי',
      'פולקסווגן גולף',
      'רנו קליאו',
      'סיאט איביזה',
    ];

    const VEHICLE_PLATES = [
      '12-345-67',
      '23-456-78',
      '34-567-89',
      '45-678-90',
      '56-789-01',
      '67-890-12',
      '78-901-23',
      '89-012-34',
      '90-123-45',
      '11-222-33',
      '44-555-66',
      '77-888-99',
      '10-203-40',
      '50-607-80',
      '31-425-63',
    ];

    const INSURANCE_COMPANIES = ['הראל', 'מגדל', 'כלל', 'הפניקס', 'מנורה מבטחים', 'AIG', 'ביטוח ישיר'];

    const ISSUE_TYPES = [
      'mechanical',
      'stopped_driving',
      'flat_tire',
      'stuck_wheel',
      'accident',
      'no_fuel',
      'dead_battery',
      'locked_keys',
      'other',
    ] as const;

    const ISSUE_DESCRIPTIONS: Record<string, string[]> = {
      mechanical: ['מנוע לא מניע', 'רעש חריג מהמנוע', 'חום יתר במנוע', 'דליפת שמן'],
      stopped_driving: ['רכב נעצר באמצע הדרך', 'רכב לא מתניע', 'תקלה חשמלית'],
      flat_tire: ['פנצ\'ר בגלגל קדמי', 'פנצ\'ר בגלגל אחורי', 'שני פנצ\'רים'],
      stuck_wheel: ['גלגל תקוע', 'בלם נתקע'],
      accident: ['תאונה קלה — פח', 'תאונה עם נפגעים', 'פגע וברח'],
      no_fuel: ['נגמר הדלק', 'דלק מזוהם'],
      dead_battery: ['מצבר ריק', 'מצבר ישן', 'בעיה בטעינת מצבר'],
      locked_keys: ['מפתחות נעולים ברכב', 'מפתח נשבר', 'איבוד מפתח'],
      other: ['בעיה בגיר', 'בעיה בהגה', 'בעיה בבלמים'],
    };

    const SERVICE_TYPES = [
      'tow_truck',
      'mechanic',
      'tire_service',
      'locksmith',
      'fuel_delivery',
      'multi_service',
    ] as const;

    const VENDOR_NAMES = [
      'גרר המרכז — יוסי כהן',
      'מכונאי ניידות — דוד לוי',
      'צמיגי השרון — אבי מזרחי',
      'מנעולן 24/7 — רונן פרץ',
      'גרר הצפון — משה ביטון',
      'מכונאי אקספרס — גיל אברהם',
      'גרר הדרום — עומר דהן',
      'שירותי דרך פלוס — ליאור שפירא',
      'גרר ירושלים — אורי גולדשטיין',
      'טכנו-גרר — תמר רוזנברג',
    ];

    const CALL_STATUSES = [
      'waiting_treatment',
      'awaiting_assignment',
      'assigning',
      'vendor_enroute',
      'in_progress',
      'completed',
      'cancelled',
    ] as const;

    // ===================================================================
    // 1. SEED USERS (invite)
    // ===================================================================

    if (seed_users) {
      const usersToInvite = [
        { email: 'admin@natid-demo.com', role: 'admin' },
        { email: 'admin2@natid-demo.com', role: 'admin' },
        { email: 'operator1@natid-demo.com', role: 'operator' },
        { email: 'operator2@natid-demo.com', role: 'operator' },
        { email: 'operator3@natid-demo.com', role: 'operator' },
        { email: 'vendor1@natid-demo.com', role: 'vendor' },
        { email: 'vendor2@natid-demo.com', role: 'vendor' },
        { email: 'vendor3@natid-demo.com', role: 'vendor' },
        { email: 'vendor4@natid-demo.com', role: 'vendor' },
        { email: 'vendor5@natid-demo.com', role: 'vendor' },
        { email: 'agent1@natid-demo.com', role: 'user' },
        { email: 'agent2@natid-demo.com', role: 'user' },
      ];

      let invited = 0;
      for (const u of usersToInvite) {
        try {
          await base44.users.inviteUser(u.email, u.role);
          invited++;
        } catch (e) {
          // User may already exist — skip
          console.log(`User ${u.email} skipped: ${e.message}`);
        }
      }
      results['users_invited'] = invited;
    }

    // ===================================================================
    // 2. SEED CUSTOMERS
    // ===================================================================

    const customerIds: string[] = [];

    if (seed_customers) {
      const customers = [
        {
          name: 'הראל ביטוח',
          customer_type: 'insurance_company',
          contact_person: 'רונית כהן',
          phone: '03-5123456',
          email: 'service@harel-demo.co.il',
          address: 'שדרות אבא הלל 13',
          city: 'רמת גן',
          contract_type: 'monthly',
          sla_response_minutes: 30,
          sla_arrival_minutes: 45,
          monthly_budget: 50000,
          status: 'active',
        },
        {
          name: 'מגדל ביטוח',
          customer_type: 'insurance_company',
          contact_person: 'אלי לוי',
          phone: '03-5234567',
          email: 'service@migdal-demo.co.il',
          address: 'דרך השלום 67',
          city: 'תל אביב',
          contract_type: 'yearly',
          sla_response_minutes: 20,
          sla_arrival_minutes: 40,
          monthly_budget: 80000,
          status: 'active',
        },
        {
          name: 'כלל ביטוח',
          customer_type: 'insurance_company',
          contact_person: 'שרה מזרחי',
          phone: '03-5345678',
          email: 'service@clal-demo.co.il',
          address: 'רחוב יהודה הלוי 36',
          city: 'תל אביב',
          contract_type: 'yearly',
          sla_response_minutes: 25,
          sla_arrival_minutes: 50,
          monthly_budget: 60000,
          status: 'active',
        },
        {
          name: 'צי רכב — אלדן',
          customer_type: 'fleet',
          contact_person: 'משה פרץ',
          phone: '03-5456789',
          email: 'fleet@eldan-demo.co.il',
          address: 'דרך בן גוריון 1',
          city: 'בני ברק',
          contract_type: 'monthly',
          sla_response_minutes: 15,
          sla_arrival_minutes: 30,
          monthly_budget: 30000,
          status: 'active',
        },
        {
          name: 'צי רכב — שלמה SIXT',
          customer_type: 'fleet',
          contact_person: 'דוד אברהם',
          phone: '03-5567890',
          email: 'fleet@shlomo-demo.co.il',
          address: 'רחוב הברזל 30',
          city: 'תל אביב',
          contract_type: 'monthly',
          sla_response_minutes: 20,
          sla_arrival_minutes: 35,
          monthly_budget: 45000,
          status: 'active',
        },
        {
          name: 'מוסך גולדשטיין',
          customer_type: 'garage',
          contact_person: 'יעקב גולדשטיין',
          phone: '04-6123456',
          email: 'info@goldstein-garage-demo.co.il',
          address: 'אזור תעשייה',
          city: 'חיפה',
          contract_type: 'per_call',
          sla_response_minutes: 60,
          sla_arrival_minutes: 90,
          monthly_budget: 10000,
          status: 'active',
        },
        {
          name: 'ישראל ישראלי',
          customer_type: 'individual',
          contact_person: 'ישראל ישראלי',
          phone: '054-1234567',
          email: 'israel@demo.co.il',
          address: 'רחוב הרצל 10',
          city: 'תל אביב',
          contract_type: 'none',
          sla_response_minutes: 60,
          sla_arrival_minutes: 90,
          monthly_budget: 0,
          status: 'active',
        },
        {
          name: 'הפניקס ביטוח',
          customer_type: 'insurance_company',
          contact_person: 'נועה דהן',
          phone: '03-5678901',
          email: 'service@phoenix-demo.co.il',
          address: 'דרך השלום 25',
          city: 'תל אביב',
          contract_type: 'yearly',
          sla_response_minutes: 30,
          sla_arrival_minutes: 45,
          monthly_budget: 70000,
          status: 'active',
        },
      ];

      for (const c of customers) {
        try {
          const created = await base44.asServiceRole.entities.Customer.create(c);
          customerIds.push(created.id);
        } catch (e) {
          console.log(`Customer ${c.name} error: ${e.message}`);
        }
      }
      results['customers_created'] = customerIds.length;
    }

    // ===================================================================
    // 3. SEED VENDORS
    // ===================================================================

    const vendorIds: string[] = [];
    const vendorData: Array<{ id: string; name: string; phone: string }> = [];

    if (seed_vendors) {
      const vendors = [
        {
          vendor_name: 'גרר המרכז — יוסי כהן',
          contact_person: 'יוסי כהן',
          phone: '054-7001001',
          email: 'vendor1@natid-demo.com',
          service_type: ['tow_truck'],
          vehicle_types_supported: ['private', 'commercial_light'],
          coverage_areas: ['center', 'sharon'],
          availability_status: 'available',
          is_active: true,
          is_available_now: true,
          current_latitude: 32.0853,
          current_longitude: 34.7818,
          service_radius: 30,
          average_rating: 4.5,
          total_ratings: 28,
          average_response_time: 12,
          completion_rate: 0.92,
          total_calls_assigned: 145,
          works_24_7: false,
          working_hours_start: '07:00',
          working_hours_end: '23:00',
          payment_rate_per_call: 350,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'ספק ותיק ואמין, מתמחה בגרירות במרכז',
        },
        {
          vendor_name: 'מכונאי ניידות — דוד לוי',
          contact_person: 'דוד לוי',
          phone: '054-7002002',
          email: 'vendor2@natid-demo.com',
          service_type: ['mechanic', 'tire_service'],
          vehicle_types_supported: ['private', 'commercial_light', 'motorcycle'],
          coverage_areas: ['center', 'lowlands'],
          availability_status: 'available',
          is_active: true,
          is_available_now: true,
          current_latitude: 31.9635,
          current_longitude: 34.8041,
          service_radius: 25,
          average_rating: 4.8,
          total_ratings: 42,
          average_response_time: 8,
          completion_rate: 0.97,
          total_calls_assigned: 210,
          works_24_7: true,
          working_hours_start: '00:00',
          working_hours_end: '23:59',
          payment_rate_per_call: 280,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'מכונאי מעולה, עובד 24/7',
        },
        {
          vendor_name: 'צמיגי השרון — אבי מזרחי',
          contact_person: 'אבי מזרחי',
          phone: '054-7003003',
          email: 'vendor3@natid-demo.com',
          service_type: ['tire_service'],
          vehicle_types_supported: ['private', 'commercial_light', 'truck'],
          coverage_areas: ['sharon', 'center'],
          availability_status: 'available',
          is_active: true,
          is_available_now: true,
          current_latitude: 32.3215,
          current_longitude: 34.8532,
          service_radius: 20,
          average_rating: 4.2,
          total_ratings: 15,
          average_response_time: 15,
          completion_rate: 0.88,
          total_calls_assigned: 67,
          works_24_7: false,
          working_hours_start: '06:00',
          working_hours_end: '22:00',
          payment_rate_per_call: 200,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'מתמחה בצמיגים, כולל רכבים כבדים',
        },
        {
          vendor_name: 'מנעולן 24/7 — רונן פרץ',
          contact_person: 'רונן פרץ',
          phone: '054-7004004',
          email: 'vendor4@natid-demo.com',
          service_type: ['locksmith'],
          vehicle_types_supported: ['private', 'commercial_light', 'motorcycle'],
          coverage_areas: ['center', 'sharon', 'lowlands'],
          availability_status: 'busy',
          is_active: true,
          is_available_now: false,
          current_latitude: 32.0686,
          current_longitude: 34.8248,
          service_radius: 35,
          average_rating: 4.6,
          total_ratings: 33,
          average_response_time: 10,
          completion_rate: 0.95,
          total_calls_assigned: 120,
          works_24_7: true,
          working_hours_start: '00:00',
          working_hours_end: '23:59',
          payment_rate_per_call: 320,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'מנעולן מקצועי, זמין 24/7',
        },
        {
          vendor_name: 'גרר הצפון — משה ביטון',
          contact_person: 'משה ביטון',
          phone: '054-7005005',
          email: 'vendor5@natid-demo.com',
          service_type: ['tow_truck', 'mechanic'],
          vehicle_types_supported: ['private', 'commercial_light', 'truck'],
          coverage_areas: ['north'],
          availability_status: 'available',
          is_active: true,
          is_available_now: true,
          current_latitude: 32.794,
          current_longitude: 34.9896,
          service_radius: 40,
          average_rating: 4.0,
          total_ratings: 18,
          average_response_time: 20,
          completion_rate: 0.85,
          total_calls_assigned: 78,
          works_24_7: false,
          working_hours_start: '06:00',
          working_hours_end: '21:00',
          payment_rate_per_call: 400,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'מכסה את כל אזור הצפון',
        },
        {
          vendor_name: 'מכונאי אקספרס — גיל אברהם',
          contact_person: 'גיל אברהם',
          phone: '054-7006006',
          email: 'vendor6@natid-demo.com',
          service_type: ['mechanic', 'fuel_delivery'],
          vehicle_types_supported: ['private', 'motorcycle'],
          coverage_areas: ['center'],
          availability_status: 'offline',
          is_active: true,
          is_available_now: false,
          current_latitude: 32.0868,
          current_longitude: 34.8872,
          service_radius: 15,
          average_rating: 3.8,
          total_ratings: 10,
          average_response_time: 25,
          completion_rate: 0.8,
          total_calls_assigned: 35,
          works_24_7: false,
          working_hours_start: '08:00',
          working_hours_end: '20:00',
          payment_rate_per_call: 250,
          contract_status: 'active',
          is_location_sharing_enabled: false,
          notes: 'ספק חדש יחסית',
        },
        {
          vendor_name: 'גרר הדרום — עומר דהן',
          contact_person: 'עומר דהן',
          phone: '054-7007007',
          email: 'vendor7@natid-demo.com',
          service_type: ['tow_truck'],
          vehicle_types_supported: ['private', 'commercial_light', 'truck', 'motorcycle'],
          coverage_areas: ['south'],
          availability_status: 'available',
          is_active: true,
          is_available_now: true,
          current_latitude: 31.2518,
          current_longitude: 34.7913,
          service_radius: 50,
          average_rating: 4.3,
          total_ratings: 22,
          average_response_time: 18,
          completion_rate: 0.9,
          total_calls_assigned: 95,
          works_24_7: false,
          working_hours_start: '06:00',
          working_hours_end: '22:00',
          payment_rate_per_call: 450,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'מכסה את כל אזור הדרום כולל אילת',
        },
        {
          vendor_name: 'שירותי דרך פלוס — ליאור שפירא',
          contact_person: 'ליאור שפירא',
          phone: '054-7008008',
          email: 'vendor8@natid-demo.com',
          service_type: ['multi_service'],
          vehicle_types_supported: ['private', 'commercial_light'],
          coverage_areas: ['center', 'sharon', 'lowlands'],
          availability_status: 'available',
          is_active: true,
          is_available_now: true,
          current_latitude: 31.8928,
          current_longitude: 34.811,
          service_radius: 30,
          average_rating: 4.7,
          total_ratings: 55,
          average_response_time: 9,
          completion_rate: 0.96,
          total_calls_assigned: 280,
          works_24_7: true,
          working_hours_start: '00:00',
          working_hours_end: '23:59',
          payment_rate_per_call: 300,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'ספק מוביל — רב תחומי, ביצועים מצוינים',
        },
        {
          vendor_name: 'גרר ירושלים — אורי גולדשטיין',
          contact_person: 'אורי גולדשטיין',
          phone: '054-7009009',
          email: 'vendor9@natid-demo.com',
          service_type: ['tow_truck', 'mechanic'],
          vehicle_types_supported: ['private', 'commercial_light'],
          coverage_areas: ['jerusalem'],
          availability_status: 'available',
          is_active: true,
          is_available_now: true,
          current_latitude: 31.7683,
          current_longitude: 35.2137,
          service_radius: 25,
          average_rating: 4.4,
          total_ratings: 30,
          average_response_time: 14,
          completion_rate: 0.91,
          total_calls_assigned: 110,
          works_24_7: false,
          working_hours_start: '06:00',
          working_hours_end: '23:00',
          payment_rate_per_call: 380,
          contract_status: 'active',
          is_location_sharing_enabled: true,
          notes: 'מכסה ירושלים והסביבה',
        },
        {
          vendor_name: 'טכנו-גרר — תמר רוזנברג',
          contact_person: 'תמר רוזנברג',
          phone: '054-7010010',
          email: 'vendor10@natid-demo.com',
          service_type: ['tow_truck', 'tire_service', 'mechanic'],
          vehicle_types_supported: ['private', 'commercial_light', 'motorcycle'],
          coverage_areas: ['center', 'sharon'],
          availability_status: 'on_break',
          is_active: true,
          is_available_now: false,
          current_latitude: 32.1629,
          current_longitude: 34.8447,
          service_radius: 20,
          average_rating: 4.1,
          total_ratings: 12,
          average_response_time: 16,
          completion_rate: 0.87,
          total_calls_assigned: 50,
          works_24_7: false,
          working_hours_start: '07:00',
          working_hours_end: '21:00',
          payment_rate_per_call: 320,
          contract_status: 'pending',
          is_location_sharing_enabled: true,
          notes: 'ספקית חדשה, ביצועים טובים',
        },
      ];

      for (const v of vendors) {
        try {
          const created = await base44.asServiceRole.entities.Vendor.create(v);
          vendorIds.push(created.id);
          vendorData.push({
            id: created.id,
            name: v.vendor_name,
            phone: v.phone,
          });
        } catch (e) {
          console.log(`Vendor ${v.vendor_name} error: ${e.message}`);
        }
      }
      results['vendors_created'] = vendorIds.length;

      // Create vendor contracts
      let contractsCreated = 0;
      for (let i = 0; i < vendorData.length; i++) {
        try {
          await base44.asServiceRole.entities.VendorContract.create({
            vendor_id: vendorData[i].id,
            vendor_name: vendorData[i].name,
            contract_number: generateContractNumber(),
            contract_type: randomItem(['monthly', 'yearly', 'per_call']),
            status: i < 8 ? 'active' : 'pending',
            start_date: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
            end_date: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0],
            terms: 'תנאי חוזה סטנדרטיים — שירותי גרירה ודרך',
            expiry_reminder_sent: false,
          });
          contractsCreated++;
        } catch (e) {
          console.log(`Contract for ${vendorData[i].name} error: ${e.message}`);
        }
      }
      results['vendor_contracts_created'] = contractsCreated;

      // Create vendor locations (GPS history)
      let locationsCreated = 0;
      for (const v of vendorData) {
        for (let j = 0; j < 5; j++) {
          try {
            const city = randomItem(ISRAELI_CITIES);
            await base44.asServiceRole.entities.VendorLocation.create({
              vendor_id: v.id,
              vendor_name: v.name,
              latitude: city.lat + (Math.random() - 0.5) * 0.02,
              longitude: city.lon + (Math.random() - 0.5) * 0.02,
              accuracy: randomInt(5, 50),
              speed: randomInt(0, 90),
              heading: randomInt(0, 360),
              battery_level: randomInt(20, 100),
              is_available: true,
              is_tracking_active: true,
            });
            locationsCreated++;
          } catch (e) {
            console.log(`VendorLocation error: ${e.message}`);
          }
        }
      }
      results['vendor_locations_created'] = locationsCreated;
    }

    // ===================================================================
    // 4. SEED CALLS
    // ===================================================================

    const callIds: Array<{ id: string; number: string; vendorIdx: number; status: string }> = [];

    if (seed_calls) {
      // Generate 30 calls with different statuses
      const callConfigs = [
        // 5 completed calls
        ...Array.from({ length: 5 }, () => ({ status: 'completed' as const })),
        // 3 in_progress calls
        ...Array.from({ length: 3 }, () => ({ status: 'in_progress' as const })),
        // 3 vendor_enroute calls
        ...Array.from({ length: 3 }, () => ({ status: 'vendor_enroute' as const })),
        // 2 assigning calls
        ...Array.from({ length: 2 }, () => ({ status: 'assigning' as const })),
        // 5 awaiting_assignment calls
        ...Array.from({ length: 5 }, () => ({ status: 'awaiting_assignment' as const })),
        // 5 waiting_treatment calls
        ...Array.from({ length: 5 }, () => ({ status: 'waiting_treatment' as const })),
        // 2 cancelled calls
        ...Array.from({ length: 2 }, () => ({ status: 'cancelled' as const })),
        // 5 more completed (older)
        ...Array.from({ length: 5 }, () => ({ status: 'completed' as const })),
      ];

      for (let i = 0; i < callConfigs.length; i++) {
        const config = callConfigs[i];
        const city = randomItem(ISRAELI_CITIES);
        const dropoffCity = randomItem(ISRAELI_CITIES);
        const issueType = randomItem(ISSUE_TYPES);
        const callNumber = generateCallNumber();
        const vendorIdx = vendorData.length > 0 ? randomInt(0, vendorData.length - 1) : -1;
        const hasVendor = [
          'assigning',
          'vendor_enroute',
          'in_progress',
          'completed',
        ].includes(config.status);
        const createdDate = randomDate(config.status === 'completed' ? 30 : 7);
        const firstName = randomItem(FIRST_NAMES);
        const lastName = randomItem(LAST_NAMES);
        const customerName = `${firstName} ${lastName}`;
        const customerIdx =
          customerIds.length > 0 ? randomInt(0, customerIds.length - 1) : -1;

        const callData: Record<string, unknown> = {
          call_number: callNumber,
          call_status: config.status,
          call_priority: randomItem(['normal', 'normal', 'normal', 'urgent', 'critical']),
          customer_name: customerName,
          customer_phone: `05${randomInt(0, 4)}${randomInt(1000000, 9999999)}`,
          vehicle_plate: randomItem(VEHICLE_PLATES),
          vehicle_type: randomItem(['private', 'private', 'commercial_light', 'motorcycle']),
          vehicle_model: randomItem(VEHICLE_MODELS),
          issue_type: issueType,
          issue_description: randomItem(ISSUE_DESCRIPTIONS[issueType] || ['בעיה כללית']),
          pickup_location_address: `${randomItem(STREETS)} ${randomInt(1, 120)}, ${city.city}`,
          pickup_location_city: city.city,
          pickup_location_lat: city.lat + (Math.random() - 0.5) * 0.03,
          pickup_location_lon: city.lon + (Math.random() - 0.5) * 0.03,
          internal_notes: i % 3 === 0 ? 'לקוח VIP — טיפול מועדף' : '',
          customer_source: randomItem(['phone', 'phone', 'phone', 'bot']),
          created_date: createdDate,
        };

        // Add customer reference
        if (customerIdx >= 0) {
          callData.customer_id = customerIds[customerIdx];
          callData.insurance_company = randomItem(INSURANCE_COMPANIES);
        }

        // Add dropoff for tow calls
        if (issueType === 'stopped_driving' || issueType === 'accident') {
          callData.dropoff_location_address = `${randomItem(STREETS)} ${randomInt(1, 120)}, ${dropoffCity.city}`;
          callData.dropoff_location_city = dropoffCity.city;
          callData.dropoff_location_lat = dropoffCity.lat;
          callData.dropoff_location_lon = dropoffCity.lon;
        }

        // Add vendor for assigned statuses
        if (hasVendor && vendorIdx >= 0) {
          callData.assigned_vendor_id = vendorData[vendorIdx].id;
          callData.assigned_vendor_name = vendorData[vendorIdx].name;
          callData.assigned_at = createdDate;
          callData.estimated_distance_km = randomInt(2, 30);
          const eta = new Date(createdDate);
          eta.setMinutes(eta.getMinutes() + randomInt(10, 40));
          callData.estimated_arrival_time = eta.toISOString();
        }

        // Completed calls
        if (config.status === 'completed') {
          const completedDate = new Date(createdDate);
          completedDate.setMinutes(completedDate.getMinutes() + randomInt(30, 120));
          callData.completed_date = completedDate.toISOString();
          callData.closed_at = completedDate.toISOString();
          callData.time_to_completion = randomInt(30, 120);
          callData.customer_rating = randomInt(3, 5);
          callData.customer_feedback = randomItem([
            'שירות מעולה, הגיע מהר',
            'ספק מקצועי מאוד',
            'זמן המתנה סביר',
            'מרוצה מהשירות',
            'טיפול מהיר ויעיל',
          ]);
          callData.vendor_notes = randomItem([
            'טיפול הושלם בהצלחה',
            'הגעתי תוך 15 דקות',
            'בוצעה גרירה למוסך',
            'הוחלף גלגל, לקוח המשיך בנסיעה',
          ]);
          callData.cost_to_vendor = randomInt(150, 500);
          callData.call_summary = `קריאה ${callNumber}: ${randomItem(ISSUE_DESCRIPTIONS[issueType] || ['תקלה כללית'])}. הספק ${hasVendor && vendorIdx >= 0 ? vendorData[vendorIdx].name : 'לא ידוע'} הגיע וטיפל בהצלחה.`;
        }

        // SLA deadlines
        const slaDate = new Date(createdDate);
        slaDate.setMinutes(slaDate.getMinutes() + 30);
        callData.sla_response_deadline = slaDate.toISOString();
        const slaArrival = new Date(createdDate);
        slaArrival.setMinutes(slaArrival.getMinutes() + 45);
        callData.sla_arrival_deadline = slaArrival.toISOString();

        try {
          const created = await base44.asServiceRole.entities.Call.create(callData);
          callIds.push({
            id: created.id,
            number: callNumber,
            vendorIdx: hasVendor ? vendorIdx : -1,
            status: config.status,
          });
        } catch (e) {
          console.log(`Call ${callNumber} error: ${e.message}`);
        }
      }
      results['calls_created'] = callIds.length;
    }

    // ===================================================================
    // 5. SEED CALL HISTORY
    // ===================================================================

    if (seed_history && callIds.length > 0) {
      let historyCreated = 0;

      for (const call of callIds) {
        // Initial creation entry
        try {
          await base44.asServiceRole.entities.CallHistory.create({
            call_id: call.id,
            call_number: call.number,
            change_type: 'status_change',
            new_value: 'waiting_treatment',
            notes: 'קריאה נוצרה',
            changed_by: 'מערכת',
          });
          historyCreated++;
        } catch (e) {
          console.log(`CallHistory error: ${e.message}`);
        }

        // Add more history for advanced statuses
        if (['vendor_enroute', 'in_progress', 'completed'].includes(call.status) && call.vendorIdx >= 0) {
          try {
            await base44.asServiceRole.entities.CallHistory.create({
              call_id: call.id,
              call_number: call.number,
              change_type: 'vendor_assignment',
              new_value: vendorData[call.vendorIdx]?.name || 'ספק',
              notes: 'ספק שובץ לקריאה',
              changed_by: 'operator1@natid-demo.com',
            });
            historyCreated++;
          } catch (e) {
            console.log(`CallHistory assignment error: ${e.message}`);
          }
        }

        if (['in_progress', 'completed'].includes(call.status)) {
          try {
            await base44.asServiceRole.entities.CallHistory.create({
              call_id: call.id,
              call_number: call.number,
              change_type: 'status_change',
              new_value: 'in_progress',
              notes: 'ספק הגיע למיקום',
              changed_by: vendorData[call.vendorIdx]?.name || 'ספק',
            });
            historyCreated++;
          } catch (e) {
            console.log(`CallHistory in_progress error: ${e.message}`);
          }
        }

        if (call.status === 'completed') {
          try {
            await base44.asServiceRole.entities.CallHistory.create({
              call_id: call.id,
              call_number: call.number,
              change_type: 'status_change',
              new_value: 'completed',
              notes: 'קריאה הושלמה — חתימת לקוח התקבלה',
              changed_by: vendorData[call.vendorIdx]?.name || 'ספק',
            });
            historyCreated++;
          } catch (e) {
            console.log(`CallHistory completed error: ${e.message}`);
          }
        }
      }
      results['call_history_created'] = historyCreated;

      // Create assignment attempts for some calls
      let attemptsCreated = 0;
      const assignedCalls = callIds.filter(
        (c) => c.vendorIdx >= 0 && ['vendor_enroute', 'in_progress', 'completed'].includes(c.status)
      );

      for (const call of assignedCalls) {
        // Accepted attempt
        try {
          await base44.asServiceRole.entities.CallAssignmentAttempt.create({
            call_id: call.id,
            vendor_id: vendorData[call.vendorIdx].id,
            status: 'accepted',
            score: randomInt(60, 100),
            distance_km: randomInt(2, 25),
            response_time_seconds: randomInt(10, 120),
            expires_at: futureDate(1),
          });
          attemptsCreated++;
        } catch (e) {
          console.log(`Assignment attempt error: ${e.message}`);
        }

        // Some declined attempts from other vendors
        if (Math.random() > 0.5 && vendorData.length > 1) {
          const otherVendorIdx = (call.vendorIdx + 1) % vendorData.length;
          try {
            await base44.asServiceRole.entities.CallAssignmentAttempt.create({
              call_id: call.id,
              vendor_id: vendorData[otherVendorIdx].id,
              status: 'declined',
              score: randomInt(40, 80),
              distance_km: randomInt(10, 40),
              decline_reason: randomItem(['עסוק בקריאה אחרת', 'מרחק רחוק מדי', 'לא זמין כרגע']),
              response_time_seconds: randomInt(30, 120),
              expires_at: futureDate(0),
            });
            attemptsCreated++;
          } catch (e) {
            console.log(`Declined attempt error: ${e.message}`);
          }
        }
      }
      results['assignment_attempts_created'] = attemptsCreated;

      // Create messages (chat) for some calls
      let messagesCreated = 0;
      const activeCalls = callIds.filter((c) =>
        ['vendor_enroute', 'in_progress', 'completed'].includes(c.status)
      );

      for (const call of activeCalls.slice(0, 8)) {
        const chatMessages = [
          { sender_id: 'operator1@natid-demo.com', message_text: 'שלום, קריאה חדשה שובצה אליך' },
          {
            sender_id: vendorData[call.vendorIdx]?.id || 'vendor',
            message_text: 'קיבלתי, יוצא לדרך',
          },
          {
            sender_id: vendorData[call.vendorIdx]?.id || 'vendor',
            message_text: 'אני בדרך, צפי הגעה 15 דקות',
          },
        ];

        if (call.status === 'completed') {
          chatMessages.push({
            sender_id: vendorData[call.vendorIdx]?.id || 'vendor',
            message_text: 'הגעתי, מתחיל טיפול',
          });
          chatMessages.push({
            sender_id: vendorData[call.vendorIdx]?.id || 'vendor',
            message_text: 'טיפול הושלם בהצלחה',
          });
        }

        for (const msg of chatMessages) {
          try {
            await base44.asServiceRole.entities.Message.create({
              call_id: call.id,
              ...msg,
            });
            messagesCreated++;
          } catch (e) {
            console.log(`Message error: ${e.message}`);
          }
        }
      }
      results['messages_created'] = messagesCreated;
    }

    // ===================================================================
    // 6. SEED RATINGS
    // ===================================================================

    if (seed_ratings && vendorData.length > 0) {
      let ratingsCreated = 0;
      const completedCalls = callIds.filter((c) => c.status === 'completed' && c.vendorIdx >= 0);

      for (const call of completedCalls) {
        try {
          await base44.asServiceRole.entities.VendorRating.create({
            vendor_id: vendorData[call.vendorIdx].id,
            vendor_name: vendorData[call.vendorIdx].name,
            call_id: call.id,
            call_number: call.number,
            overall_rating: randomInt(3, 5),
            response_time_rating: randomInt(3, 5),
            service_quality_rating: randomInt(3, 5),
            professionalism_rating: randomInt(3, 5),
            communication_rating: randomInt(3, 5),
            feedback: randomItem([
              'שירות מעולה ומקצועי',
              'הגיע מהר, עבודה יעילה',
              'טיפול סביר',
              'מרוצה מאוד מהשירות',
              'מקצועי ואמין',
              'זמן המתנה קצר, עבודה טובה',
            ]),
            completed_on_time: Math.random() > 0.2,
            would_recommend: Math.random() > 0.15,
            rating_source: randomItem(['customer', 'customer', 'admin']),
          });
          ratingsCreated++;
        } catch (e) {
          console.log(`Rating error: ${e.message}`);
        }
      }
      results['vendor_ratings_created'] = ratingsCreated;

      // Create vendor payments
      let paymentsCreated = 0;
      for (const call of completedCalls) {
        try {
          await base44.asServiceRole.entities.VendorPayment.create({
            vendor_id: vendorData[call.vendorIdx].id,
            call_id: call.id,
            amount: randomInt(150, 500),
            payment_status: randomItem(['paid', 'paid', 'pending']),
          });
          paymentsCreated++;
        } catch (e) {
          console.log(`Payment error: ${e.message}`);
        }
      }
      results['vendor_payments_created'] = paymentsCreated;
    }

    // ===================================================================
    // 7. SEED NOTIFICATIONS
    // ===================================================================

    if (seed_notifications) {
      let notificationsCreated = 0;
      const notificationTemplates = [
        {
          title: 'קריאה חדשה התקבלה',
          message: 'קריאה C-12345678 נכנסה למערכת — ממתינה לטיפול',
          type: 'info',
          related_entity_type: 'call',
        },
        {
          title: 'ספק שובץ לקריאה',
          message: 'גרר המרכז שובץ לקריאה C-12345678',
          type: 'success',
          related_entity_type: 'call',
        },
        {
          title: 'אזהרת SLA',
          message: 'קריאה C-87654321 קרובה לחריגת SLA — 10 דקות נותרו',
          type: 'warning',
          related_entity_type: 'call',
        },
        {
          title: 'ספק לא זמין',
          message: 'הספק מכונאי ניידות סימן עצמו כלא זמין',
          type: 'warning',
          related_entity_type: 'vendor',
        },
        {
          title: 'קריאה הושלמה',
          message: 'קריאה C-11223344 הושלמה בהצלחה',
          type: 'success',
          related_entity_type: 'call',
        },
        {
          title: 'חוזה קרוב לתפוגה',
          message: 'חוזה CON-2026-1234 של גרר הצפון יפוג בעוד 7 ימים',
          type: 'error',
          related_entity_type: 'vendor',
        },
      ];

      // Create notifications for "admin" user
      for (const tmpl of notificationTemplates) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_id: user.id,
            title: tmpl.title,
            message: tmpl.message,
            type: tmpl.type,
            related_entity_type: tmpl.related_entity_type,
            is_read: Math.random() > 0.5,
            link: tmpl.related_entity_type === 'call' ? '/calls' : '/vendors',
          });
          notificationsCreated++;
        } catch (e) {
          console.log(`Notification error: ${e.message}`);
        }
      }
      results['notifications_created'] = notificationsCreated;
    }

    // ===================================================================
    // 8. SEED WORK QUEUE
    // ===================================================================

    if (seed_queue) {
      let queueCreated = 0;
      const waitingCalls = callIds.filter((c) =>
        ['waiting_treatment', 'awaiting_assignment'].includes(c.status)
      );

      for (const call of waitingCalls) {
        try {
          await base44.asServiceRole.entities.WorkQueue.create({
            call_id: call.id,
            queue_status: 'waiting',
            priority_score: randomInt(50, 100),
            waiting_since: randomDate(1),
          });
          queueCreated++;
        } catch (e) {
          console.log(`WorkQueue error: ${e.message}`);
        }
      }
      results['queue_items_created'] = queueCreated;
    }

    // ===================================================================
    // 9. SEED AUDIT LOG
    // ===================================================================

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: 'seed_demo_data',
        entity_type: 'System',
        entity_name: 'Demo Data Seed',
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        user_role: user.role,
        details: JSON.stringify(results),
        severity: 'info',
        timestamp: now.toISOString(),
      });
    } catch (e) {
      console.log(`AuditLog error: ${e.message}`);
    }

    // ===================================================================
    // RESPONSE
    // ===================================================================

    return Response.json({
      success: true,
      message: 'נתוני דמו נוצרו בהצלחה',
      results,
      total_records: Object.values(results).reduce((sum, val) => sum + val, 0),
    });
  } catch (error) {
    console.error('seedDemoData error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
});

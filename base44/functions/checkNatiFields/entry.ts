// Quick check: extract specific field values from first 3 Nati API records
// to see what data is available and what's missing

Deno.serve(async (req) => {
  const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
  const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '');

  try {
    const url = 'https://api.natid.co.il/api/get_appeals_list?dep=-1&callStatus=-1&dir=DESC';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'clientId': CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!data.success || !data.data) {
      return Response.json({ error: 'API failed', raw: data }, { status: 502 });
    }

    // Check first 5 records for key fields
    const records = data.data.slice(0, 5);
    const fieldsToCheck = [
      'appeal_id', 'tel', 'tel1', 'tel2', 'intermediary_phone',
      'supplier_name', 'supplier_phone', 'supplier_mobile', 'supplier_tel',
      'city', 'grar_city', 'area', 'tow_area', 'pickup_area',
      'from_location', 'to_location',
      'client_name', 'client_email', 'client_id',
      'car_num', 'car_code', 'kod_degem_name',
      'mispar_shilda', 'car_pin', 'key_location',
      'status', 'department', 'serve_type',
    ];

    const summary = records.map(r => {
      const extracted = {};
      for (const f of fieldsToCheck) {
        extracted[f] = r[f] !== undefined ? r[f] : '❌ NOT IN API';
      }
      return extracted;
    });

    // Also check: are there any NEW fields we don't know about?
    const allKnownFields = [
      'appeal_id', 'continue_id', 'supplier_choice_time', 'department_id', 'department',
      'sub_num', 'user_name', 'date_added', 'date_added_unix', 'status', 'type',
      'initial_serve_type', 'city', 'grar_city', 'store_city', 'future_service_from',
      'future_service_to', 'address', 'grar_address', 'store_address', 'agent_id',
      'client_id', 'agent_name', 'client_name', 'serve_type', 'serve_type_code',
      'reminder', 'reminder_canceled', 'arrive_expected_time', 'requester', 'tel', 'tel1',
      'car_num', 'arrive_time', 'expected_time', 'supplier_name', 'car_type', 'car_type_name',
      'package_id', 'package_name', 'supplier_assigned_date', 'car_code', 'intermediary_phone',
      'car_pin', 'key_location', 'kod_degem_name', 'inspected', 'inspector_approves',
      'inspector_name', 'q_notes', 'open_from_api', 'finish_time', 'vip', 'vehicle_class',
      'has_updated', 'mispar_shilda', 'yashir_top_client', 'client_email', 'problem_desc',
      'claim_total_cost', 'diagnose', 'return_date', 'days_remain', 'call_type', 'wait_time',
      'colorClass', 'from_location', 'to_location',
    ];

    const actualFields = Object.keys(data.data[0]);
    const newFields = actualFields.filter(f => !allKnownFields.includes(f));
    const missingFields = fieldsToCheck.filter(f => data.data[0][f] === undefined);

    return Response.json({
      total_records: data.total,
      total_fields: actualFields.length,
      new_fields_not_previously_known: newFields.length > 0 ? newFields : 'אין שדות חדשים',
      missing_fields_we_wanted: missingFields.length > 0 ? missingFields : 'הכל קיים',
      sample_data: summary,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
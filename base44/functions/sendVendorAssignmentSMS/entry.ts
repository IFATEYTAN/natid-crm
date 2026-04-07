import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  
  // Entity automation payload: { event: { type, entity_name, entity_id }, data: {...}, old_data: {...} }
  // Direct call: { call_id, vendor_id }
  const isAutomation = !!body.event;
  
  let callId, callData;
  
  if (isAutomation) {
    callId = body.event?.entity_id;
    callData = body.data;
    console.log(`[SMS] Automation trigger: call ${callId}, vendor changed to ${callData?.assigned_vendor_id}`);
  } else {
    callId = body.call_id;
    callData = null;
    console.log(`[SMS] Direct call: call_id=${callId}`);
  }
  
  if (!callId) {
    return Response.json({ success: false, error: 'Missing call_id' }, { status: 400 });
  }
  
  // Fetch full call if needed
  if (!callData || !callData.assigned_vendor_id) {
    const calls = await base44.asServiceRole.entities.Call.filter({});
    const found = calls.find(c => c.id === callId);
    if (!found) {
      return Response.json({ success: false, error: 'Call not found' }, { status: 404 });
    }
    callData = found;
  }
  
  const vendorId = callData.assigned_vendor_id;
  if (!vendorId) {
    return Response.json({ success: false, error: 'No vendor assigned to this call' }, { status: 400 });
  }
  
  // Fetch vendor
  const vendors = await base44.asServiceRole.entities.Vendor.filter({});
  const vendor = vendors.find(v => v.id === vendorId);
  if (!vendor) {
    console.error(`[SMS] Vendor ${vendorId} not found`);
    return Response.json({ success: false, error: 'Vendor not found' }, { status: 404 });
  }
  
  if (!vendor.phone) {
    console.log(`[SMS] Vendor ${vendor.vendor_name} has no phone — skipping SMS`);
    return Response.json({ success: false, error: `Vendor "${vendor.vendor_name}" has no phone number`, skipped: true });
  }
  
  // Build SMS message
  const message = `נתיד - קריאה חדשה #${callData.call_number || ''}\n` +
    `לקוח: ${callData.customer_name || ''}\n` +
    `כתובת: ${callData.pickup_location_address || ''}\n` +
    `סוג: ${callData.issue_type || callData.service_category || ''}\n` +
    `היכנס לפורטל לאישור.`;
  
  // Check Twilio config
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log('[SMS] Twilio not configured — SMS not sent');
    return Response.json({ success: false, error: 'Twilio not configured' }, { status: 503 });
  }
  
  // Format Israeli phone
  let phone = vendor.phone.replace(/[\s\-()]/g, '');
  if (phone.startsWith('0')) phone = '972' + phone.substring(1);
  if (!phone.startsWith('+')) phone = '+' + phone;
  
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append('To', phone);
  formData.append('From', twilioPhoneNumber);
  formData.append('Body', message);
  
  const smsResponse = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });
  
  if (!smsResponse.ok) {
    const errorText = await smsResponse.text();
    console.error('[SMS] Twilio error:', errorText);
    return Response.json({ success: false, error: 'SMS send failed', details: errorText }, { status: 502 });
  }
  
  const smsResult = await smsResponse.json();
  console.log(`[SMS] Sent to ${vendor.vendor_name} (${phone}): SID ${smsResult.sid}`);
  
  // Log to call history
  await base44.asServiceRole.entities.CallHistory.create({
    call_id: callId,
    call_number: callData.call_number || '',
    change_type: 'note',
    new_value: `SMS נשלח לספק ${vendor.vendor_name}: ${vendor.phone}`,
    changed_by: 'מערכת',
  });
  
  return Response.json({ success: true, sid: smsResult.sid, vendor_phone: phone });
});
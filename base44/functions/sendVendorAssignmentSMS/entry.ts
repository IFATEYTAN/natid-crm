import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // This function can be called from automations (entity trigger) or directly
  const body = await req.json();
  
  // Support both direct call and entity automation payload
  const callData = body.data || body;
  const callId = callData.id || body.call_id;
  const vendorId = callData.assigned_vendor_id || body.vendor_id;
  
  if (!vendorId || !callId) {
    return Response.json({ success: false, error: 'Missing vendor_id or call_id' }, { status: 400 });
  }
  
  // Fetch vendor details
  const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendorId });
  if (vendors.length === 0) {
    return Response.json({ success: false, error: 'Vendor not found' }, { status: 404 });
  }
  const vendor = vendors[0];
  
  if (!vendor.phone) {
    return Response.json({ success: false, error: 'Vendor has no phone number' }, { status: 400 });
  }
  
  // Fetch call details
  const calls = await base44.asServiceRole.entities.Call.filter({ id: callId });
  if (calls.length === 0) {
    return Response.json({ success: false, error: 'Call not found' }, { status: 404 });
  }
  const call = calls[0];
  
  // Build SMS message
  const message = `נתיד - קריאה חדשה #${call.call_number || ''}\n` +
    `לקוח: ${call.customer_name || ''}\n` +
    `כתובת: ${call.pickup_location_address || ''}\n` +
    `סוג תקלה: ${call.issue_type || ''}\n` +
    `היכנס לפורטל לאישור הקריאה.`;
  
  // Send SMS via Twilio
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log('Twilio not configured - SMS not sent');
    return Response.json({ success: false, error: 'Twilio not configured' }, { status: 503 });
  }
  
  // Format phone number for Israel
  let formattedPhone = vendor.phone.replace(/[\s\-()]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '972' + formattedPhone.substring(1);
  }
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }
  
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('To', formattedPhone);
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
    console.error('Twilio SMS to vendor failed:', errorText);
    return Response.json({ success: false, error: 'SMS send failed' }, { status: 502 });
  }
  
  const smsResult = await smsResponse.json();
  
  // Log to call history
  await base44.asServiceRole.entities.CallHistory.create({
    call_id: callId,
    call_number: call.call_number,
    change_type: 'note',
    new_value: `SMS נשלח לספק ${vendor.vendor_name}: ${vendor.phone}`,
    changed_by: 'מערכת',
  });
  
  return Response.json({
    success: true,
    sid: smsResult.sid,
    vendor_phone: vendor.phone,
  });
});
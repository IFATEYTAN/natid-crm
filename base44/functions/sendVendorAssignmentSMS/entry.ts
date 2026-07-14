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
    console.log(`[SMS] Automation trigger: call ${callId}`);
  } else {
    // ===== Access gate (security scan 2026-07-14): direct (non-automation)
    // invocation triggers a paid SMS — allowed only for an authenticated app
    // user or a matching x-internal-secret header (INTERNAL_JOB_SECRET env var).
    const internalSecret = Deno.env.get('INTERNAL_JOB_SECRET');
    const secretOk =
      !!internalSecret && req.headers.get('x-internal-secret') === internalSecret;
    if (!secretOk) {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }
    callId = body.call_id;
    console.log(`[SMS] Direct call: call_id=${callId}`);
  }

  if (!callId) {
    return Response.json({ success: false, error: 'Missing call_id' }, { status: 400 });
  }

  // Never trust the caller-supplied payload (the automation endpoint is publicly
  // reachable) — always re-fetch the call by id via service role. A forged
  // request can then only re-send the SMS of a real assignment, and the recent-SMS
  // dedup below bounds that too.
  {
    const calls = await base44.asServiceRole.entities.Call.filter({ id: callId });
    if (!calls || calls.length === 0) {
      return Response.json({ success: false, error: 'Call not found' }, { status: 404 });
    }
    callData = calls[0];
  }
  
  const vendorId = callData.assigned_vendor_id;
  if (!vendorId) {
    return Response.json({ success: false, error: 'No vendor assigned to this call' }, { status: 400 });
  }
  
  // Recent-SMS dedup: skip if an assignment SMS for this call+vendor was already
  // logged in the last 10 minutes (bounds replay of the public automation endpoint
  // and duplicate automation triggers alike).
  try {
    const recentHistory = await base44.asServiceRole.entities.CallHistory.filter(
      { call_id: callId },
      '-created_date',
      20
    );
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const dup = (recentHistory || []).find(
      (h) =>
        h.change_type === 'note' &&
        typeof h.new_value === 'string' &&
        h.new_value.startsWith('SMS נשלח לספק') &&
        new Date(h.created_date).getTime() > tenMinAgo
    );
    if (dup) {
      console.log(`[SMS] Duplicate suppressed for call ${callId} — SMS already sent recently`);
      return Response.json({ success: true, skipped: true, reason: 'duplicate_recent_sms' });
    }
  } catch {
    // Dedup check is best-effort — never block a legitimate send on its failure
  }

  // Fetch vendor
  const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendorId });
  const vendor = vendors && vendors.length > 0 ? vendors[0] : null;
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
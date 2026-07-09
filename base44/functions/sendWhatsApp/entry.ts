/**
 * sendWhatsApp.ts
 * -------------------------------------------------------
 * פונקציית שרת לשליחת הודעות WhatsApp
 * -------------------------------------------------------
 * תומך ב:
 * 1. שליחת פרטי קריאה לספק (direct message)
 * 2. שליחת הודעות לקבוצות WhatsApp (משימה 199)
 * 3. הודעת ביטול קריאה לספק (משימה 366)
 * 4. הודעות הרגעה ללקוח לשירות עתידי (משימה 252)
 *
 * ספק WhatsApp: Twilio WhatsApp API (או Green API כחלופה)
 * -------------------------------------------------------
 * POST {
 *   type: 'vendor_call_details' | 'vendor_cancellation' | 'group_message' | 'customer_reassurance',
 *   call_id?: string,
 *   vendor_phone?: string,
 *   group_id?: string,
 *   message?: string,
 *   scheduled_time?: string  // for future service reassurance
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, getClientIP, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

// ─── WhatsApp provider helpers ────────────────────────────────────────────────

/**
 * Send via Twilio WhatsApp API
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 */
async function sendViaTwilio(
  to: string,
  body: string,
  mediaUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    return { ok: false, error: 'Twilio credentials not configured' };
  }

  // Normalize Israeli phone number
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '972' + phone.substring(1);
  if (!phone.startsWith('+')) phone = '+' + phone;
  const toWhatsApp = `whatsapp:${phone}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append('To', toWhatsApp);
  formData.append('From', from);
  formData.append('Body', body);
  if (mediaUrl) formData.append('MediaUrl', mediaUrl);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Twilio WhatsApp error:', errText);
    return { ok: false, error: errText };
  }
  return { ok: true };
}

/**
 * Send via Green API (alternative WhatsApp provider popular in Israel)
 * Requires: GREEN_API_INSTANCE_ID, GREEN_API_TOKEN
 */
async function sendViaGreenAPI(
  to: string,
  body: string,
  isGroup = false
): Promise<{ ok: boolean; error?: string }> {
  const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
  const token = Deno.env.get('GREEN_API_TOKEN');

  if (!instanceId || !token) {
    return { ok: false, error: 'Green API credentials not configured' };
  }

  let chatId: string;
  if (isGroup) {
    // Group IDs are in format: XXXXXXXXXX@g.us
    chatId = to.includes('@g.us') ? to : `${to}@g.us`;
  } else {
    let phone = to.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '972' + phone.substring(1);
    chatId = `${phone}@c.us`;
  }

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message: body }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Green API error:', errText);
    return { ok: false, error: errText };
  }
  return { ok: true };
}

/**
 * Main send function — tries Twilio first, falls back to Green API
 */
async function sendWhatsAppMessage(
  to: string,
  body: string,
  isGroup = false,
  mediaUrl?: string
): Promise<{ ok: boolean; provider?: string; error?: string }> {
  // For groups, use Green API (Twilio doesn't support group messages)
  if (isGroup) {
    const result = await sendViaGreenAPI(to, body, true);
    return { ...result, provider: 'green_api' };
  }

  // Try Twilio first
  const twilioResult = await sendViaTwilio(to, body, mediaUrl);
  if (twilioResult.ok) return { ok: true, provider: 'twilio' };

  // Document sends require Twilio's MediaUrl support — Green API uses a
  // different (file-upload) endpoint we don't implement, so don't silently
  // fall back to a text-only message that omits the attachment.
  if (mediaUrl) return { ok: false, provider: 'twilio', error: twilioResult.error };

  // Fallback to Green API
  console.log('Twilio failed, trying Green API:', twilioResult.error);
  const greenResult = await sendViaGreenAPI(to, body, false);
  return { ...greenResult, provider: 'green_api' };
}

// ─── Message templates ────────────────────────────────────────────────────────

function buildVendorCallDetailsMessage(call: Record<string, unknown>): string {
  const lines = [
    `🚗 *קריאה חדשה — נתיב שירותי דרך*`,
    ``,
    `📋 *מספר קריאה:* ${call.call_number || call.id?.toString().slice(-8)}`,
    `👤 *לקוח:* ${call.customer_name || 'לא צוין'}`,
    `📞 *טלפון לקוח:* ${call.customer_phone || 'לא צוין'}`,
    ``,
    `📍 *מיקום איסוף:*`,
    `${call.pickup_location_address || call.location_address || 'לא צוין'}`,
    call.pickup_location_city ? `עיר: ${call.pickup_location_city}` : '',
    ``,
    call.dropoff_location_address
      ? `🏁 *יעד:*\n${call.dropoff_location_address}${call.dropoff_location_city ? `\nעיר: ${call.dropoff_location_city}` : ''}\n`
      : '',
    `🔧 *סוג שירות:* ${call.service_type || call.issue_type || 'לא צוין'}`,
    call.vehicle_model ? `🚘 *רכב:* ${call.vehicle_model} ${call.vehicle_year || ''}` : '',
    call.vehicle_plate ? `🔢 *לוחית:* ${call.vehicle_plate}` : '',
    call.fuel_type ? `⛽ *דלק:* ${call.fuel_type}` : '',
    ``,
    call.issue_description ? `📝 *תיאור:* ${call.issue_description}` : '',
    call.vendor_notes ? `⚠️ *הוראות:* ${call.vendor_notes}` : '',
    ``,
    `✅ אנא אשר קבלת הקריאה בהקדם.`,
    `📞 לתמיכה: ${Deno.env.get('SUPPORT_PHONE') || '03-XXXXXXX'}`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}

function buildVendorCancellationMessage(call: Record<string, unknown>, reason?: string): string {
  return [
    `❌ *ביטול קריאה — נתיב שירותי דרך*`,
    ``,
    `📋 *מספר קריאה:* ${call.call_number || call.id?.toString().slice(-8)}`,
    `👤 *לקוח:* ${call.customer_name || 'לא צוין'}`,
    `📍 *מיקום:* ${call.pickup_location_address || call.location_address || 'לא צוין'}`,
    ``,
    reason ? `📝 *סיבת ביטול:* ${reason}` : '',
    ``,
    `הקריאה בוטלה. אין צורך להגיע למיקום.`,
    `לשאלות: ${Deno.env.get('SUPPORT_PHONE') || '03-XXXXXXX'}`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

function buildCustomerReassuranceMessage(call: Record<string, unknown>, scheduledTime?: string): string {
  return [
    `✅ *שלום ${call.customer_name || 'לקוח יקר'}!*`,
    ``,
    `קריאת השירות שלך *${call.call_number || ''}* נקלטה בהצלחה.`,
    scheduledTime
      ? `⏰ הטיפול מתוכנן ל: *${scheduledTime}*`
      : '',
    ``,
    `ספק שירות ישובץ בהקדם ויצור איתך קשר לפני ההגעה.`,
    ``,
    `לבירורים ועדכונים: ${Deno.env.get('SUPPORT_PHONE') || '03-XXXXXXX'}`,
    ``,
    `_נתיב שירותי דרך — כאן בשבילך 24/7_ 🛣️`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const clientIP = getClientIP(req);
    const rl = await limiter.check('sendWhatsApp', clientIP, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      type,
      call_id,
      vendor_phone,
      group_id,
      message,
      scheduled_time,
      cancel_reason,
      phone: document_target_phone,
      email,
      document_url,
      document_name,
      call_number,
      customer_name,
    } = body;

    if (!type) {
      return Response.json({ error: 'Missing type' }, { status: 400 });
    }

    let call: Record<string, unknown> | null = null;
    if (call_id) {
      const calls = await base44.entities.Call.filter({ id: call_id });
      call = calls?.[0] || null;
      if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });
    }

    const results: Array<{ target: string; ok: boolean; provider?: string; error?: string }> = [];

    // ── 1. Vendor call details ─────────────────────────────────────────────
    if (type === 'vendor_call_details') {
      const phone = vendor_phone || call?.vendor_phone;
      if (!phone) return Response.json({ error: 'vendor_phone required' }, { status: 400 });

      const msg = buildVendorCallDetailsMessage(call!);
      const result = await sendWhatsAppMessage(phone, msg);
      results.push({ target: phone, ...result });

      // Log to call history
      if (call_id) {
        await base44.entities.CallHistory.create({
          call_id,
          call_number: call?.call_number,
          change_type: 'whatsapp_sent',
          new_value: 'vendor_notified',
          notes: `הודעת WhatsApp נשלחה לספק ${phone} — פרטי קריאה`,
          changed_by: user.full_name || user.email,
        }).catch(() => {});
      }
    }

    // ── 2. Vendor cancellation ─────────────────────────────────────────────
    else if (type === 'vendor_cancellation') {
      const phone = vendor_phone || call?.vendor_phone;
      if (!phone) return Response.json({ error: 'vendor_phone required' }, { status: 400 });

      const msg = buildVendorCancellationMessage(call!, cancel_reason);
      const result = await sendWhatsAppMessage(phone, msg);
      results.push({ target: phone, ...result });

      if (call_id) {
        await base44.entities.CallHistory.create({
          call_id,
          call_number: call?.call_number,
          change_type: 'whatsapp_sent',
          new_value: 'vendor_cancellation_notified',
          notes: `הודעת ביטול WhatsApp נשלחה לספק ${phone}`,
          changed_by: user.full_name || user.email,
        }).catch(() => {});
      }
    }

    // ── 3. Group message (משימה 199) ──────────────────────────────────────
    else if (type === 'group_message') {
      if (!group_id && !message) {
        return Response.json({ error: 'group_id and message required' }, { status: 400 });
      }

      // Support multiple groups (comma-separated)
      const groupIds = group_id
        ? group_id.split(',').map((g: string) => g.trim()).filter(Boolean)
        : [];

      for (const gid of groupIds) {
        const result = await sendWhatsAppMessage(gid, message, true);
        results.push({ target: gid, ...result });
      }

      // Also log to call history if call_id provided
      if (call_id) {
        await base44.entities.CallHistory.create({
          call_id,
          call_number: call?.call_number,
          change_type: 'whatsapp_sent',
          new_value: 'group_message_sent',
          notes: `הודעת WhatsApp נשלחה לקבוצות: ${group_id}`,
          changed_by: user.full_name || user.email,
        }).catch(() => {});
      }
    }

    // ── 4. Customer reassurance for future service (משימה 252) ────────────
    else if (type === 'customer_reassurance') {
      const phone = call?.customer_phone as string;
      if (!phone) return Response.json({ error: 'customer_phone not found on call' }, { status: 400 });

      const msg = buildCustomerReassuranceMessage(call!, scheduled_time);
      const result = await sendWhatsAppMessage(phone, msg);
      results.push({ target: phone, ...result });

      if (call_id) {
        await base44.entities.CallHistory.create({
          call_id,
          call_number: call?.call_number,
          change_type: 'whatsapp_sent',
          new_value: 'customer_reassurance_sent',
          notes: `הודעת הרגעה WhatsApp נשלחה ללקוח ${phone}`,
          changed_by: user.full_name || user.email,
        }).catch(() => {});
      }
    }

    // ── 5b. Document via WhatsApp (Send Document dialog, call-files tab) ──
    else if (type === 'document') {
      const targetPhone = document_target_phone || vendor_phone || (call?.customer_phone as string);
      if (!targetPhone) return Response.json({ error: 'phone required' }, { status: 400 });
      if (!document_url) return Response.json({ error: 'document_url required' }, { status: 400 });

      const msg = [
        `📎 *מסמך מצורף — נתיב שירותי דרך*`,
        (call_number || call?.call_number) ? `מספר קריאה: ${call_number || call?.call_number}` : '',
        `קובץ: ${document_name || 'מסמך'}`,
      ]
        .filter((l) => l !== '')
        .join('\n');

      const result = await sendWhatsAppMessage(targetPhone, msg, false, document_url);
      results.push({ target: targetPhone, ...result });

      if (call_id && result.ok) {
        await base44.entities.CallHistory.create({
          call_id,
          call_number: call?.call_number,
          change_type: 'whatsapp_sent',
          new_value: 'document_sent',
          notes: `מסמך "${document_name || ''}" נשלח ב-WhatsApp ל-${targetPhone}`,
          changed_by: user.full_name || user.email,
        }).catch(() => {});
      }
    }

    // ── 5c. Document via email (Send Document dialog, call-files tab) ─────
    else if (type === 'email_document') {
      if (!email) return Response.json({ error: 'email required' }, { status: 400 });
      if (!document_url) return Response.json({ error: 'document_url required' }, { status: 400 });

      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `מסמך מצורף${call_number ? ` — קריאה ${call_number}` : ''}`,
          body: `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
              <h2 style="color: #FF0000;">מסמך מצורף</h2>
              <p>${customer_name ? `שלום ${customer_name},` : 'שלום,'}</p>
              <p>מצורף אליך מסמך מ"נתיב שירותי דרך"${call_number ? ` בנוגע לקריאה ${call_number}` : ''}:</p>
              <p><a href="${document_url}" target="_blank">${document_name || 'לחץ/י כאן לצפייה במסמך'}</a></p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">הודעה זו נשלחה ממערכת נתיב - שירותי דרך</p>
            </div>
          `,
        });
        results.push({ target: email, ok: true });

        if (call_id) {
          await base44.entities.CallHistory.create({
            call_id,
            call_number: call?.call_number,
            change_type: 'email_sent',
            new_value: 'document_sent',
            notes: `מסמך "${document_name || ''}" נשלח במייל ל-${email}`,
            changed_by: user.full_name || user.email,
          }).catch(() => {});
        }
      } catch (emailError) {
        results.push({ target: email, ok: false, error: (emailError as Error)?.message });
      }
    }

    // ── 5. Custom message ──────────────────────────────────────────────────
    else if (type === 'custom') {
      const phone = vendor_phone || (call?.customer_phone as string);
      if (!phone || !message) {
        return Response.json({ error: 'phone and message required' }, { status: 400 });
      }
      const result = await sendWhatsAppMessage(phone, message);
      results.push({ target: phone, ...result });
    }

    else {
      return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    const allOk = results.every((r) => r.ok);
    return Response.json({
      success: allOk,
      results,
      message: allOk ? 'הודעות WhatsApp נשלחו בהצלחה' : 'חלק מהשליחות נכשלו',
    });
  } catch (error) {
    console.error('sendWhatsApp error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ===== Inline app-role resolution (kept per-file: a NEW _shared module cannot be
// registered on this platform - its standalone deploy fails ISOLATE_INTERNAL_FAILURE and
// importers then fail with Module not found; see docs/LESSONS_LEARNED.md 2026-07-09) =====
const APP_ROLE_MAP: Record<string, string> = {
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  מנהל: 'admin',
  'מנהל מערכת': 'admin',
  מוקדן: 'operator',
  מתפעל: 'operator',
  'מנהל תפעול': 'operator',
  טכנאי: 'agent',
  'נציג שטח': 'agent',
  ספק: 'vendor',
  'ספק שירות': 'vendor',
  Vendor: 'vendor',
  'Vendor ': 'vendor',
};

// deno-lint-ignore no-explicit-any
async function resolveAppRole(base44: any, user: any): Promise<string | null> {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.role === 'vendor' || user.role === 'ספק') return 'vendor';
  if (APP_ROLE_MAP[user.role]) return APP_ROLE_MAP[user.role];
  try {
    let perms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: user.id });
    if (!perms.length && user.email) {
      perms = await base44.asServiceRole.entities.UserPermission.filter({
        user_email: user.email,
      });
    }
    const mapped = APP_ROLE_MAP[perms[0]?.role_name];
    if (mapped) return mapped;
  } catch (_) {
    // Permission lookup failed - fall through to the frontend-matching default.
  }
  return 'operator';
}
// ===== End inline app-role resolution =====

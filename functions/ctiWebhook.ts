import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * CTI Webhook endpoint for PBX integration.
 * Receives incoming call events and returns customer identification data.
 *
 * POST body: { event: 'incoming_call', caller_id: string, extension: string }
 * Response: { customer_name, customer_id, open_calls_count, last_call_date } or { customer_name: null, is_new: true }
 */
Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed. Use POST.' },
      { status: 405 }
    );
  }

  try {
    const base44 = createClientFromRequest(req);

    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rl = await limiter.check('ctiWebhook', ip, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const body = await req.json();
    const { event, caller_id, extension } = body;

    // Validate required fields
    if (!event || !caller_id) {
      return Response.json(
        { error: 'Missing required fields: event, caller_id' },
        { status: 400 }
      );
    }

    // Only handle incoming_call events
    if (event !== 'incoming_call') {
      return Response.json(
        { error: `Unsupported event type: ${event}. Only "incoming_call" is supported.` },
        { status: 400 }
      );
    }

    // Normalize phone number (remove spaces, dashes, parentheses)
    const normalizedPhone = caller_id.replace(/[\s\-()]/g, '');

    // Look up customer by phone number
    const customers = await base44.asServiceRole.entities.Customer.filter({
      phone: normalizedPhone,
    });

    // If no exact match, try alternative formats
    let customer = customers.length > 0 ? customers[0] : null;

    if (!customer) {
      // Try with leading zero removed/added
      const altPhone = normalizedPhone.startsWith('0')
        ? normalizedPhone.slice(1)
        : '0' + normalizedPhone;

      const altCustomers = await base44.asServiceRole.entities.Customer.filter({
        phone: altPhone,
      });
      customer = altCustomers.length > 0 ? altCustomers[0] : null;
    }

    // If still no match, try with +972 prefix
    if (!customer && normalizedPhone.startsWith('0')) {
      const intlPhone = '972' + normalizedPhone.slice(1);
      const intlCustomers = await base44.asServiceRole.entities.Customer.filter({
        phone: intlPhone,
      });
      customer = intlCustomers.length > 0 ? intlCustomers[0] : null;
    }

    if (!customer) {
      return Response.json({
        customer_name: null,
        customer_id: null,
        is_new: true,
        phone: caller_id,
        extension: extension || null,
        open_calls_count: 0,
        last_call_date: null,
      });
    }

    // Count open calls for this customer
    const openCalls = await base44.asServiceRole.entities.Call.filter({
      customer_id: customer.id,
      call_status: ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress', 'vendor_arrived'],
    });

    // Get last call date
    const recentCalls = await base44.asServiceRole.entities.Call.filter(
      { customer_id: customer.id },
      '-created_date'
    );
    const lastCallDate = recentCalls.length > 0 ? recentCalls[0].created_date : null;

    return Response.json({
      customer_name: customer.name || customer.full_name || null,
      customer_id: customer.id,
      is_new: false,
      phone: caller_id,
      extension: extension || null,
      open_calls_count: openCalls.length,
      last_call_date: lastCallDate,
    });
  } catch (error) {
    console.error('CTI webhook error:', error);
    return Response.json(
      { error: 'שגיאה בעיבוד בקשת CTI' },
      { status: 500 }
    );
  }
});

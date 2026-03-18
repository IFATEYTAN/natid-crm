import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, getClientIP, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    // Rate limiting by IP (persisted in Deno KV)
    const ip = getClientIP(req);
    const rl = await limiter.check('getFeedbackTokenInfo', ip, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const token = body.token;

    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Basic token format validation to prevent DB query abuse
    if (typeof token !== 'string' || token.length < 10 || token.length > 128) {
      return Response.json({
        valid: false,
        error: 'invalid',
        message: 'קישור לא תקין'
      });
    }

    // Find token record
    const tokens = await base44.asServiceRole.entities.FeedbackToken.filter({ token: token });

    if (tokens.length === 0) {
      return Response.json({
        valid: false,
        error: 'invalid',
        message: 'קישור לא תקין'
      });
    }

    const tokenRecord = tokens[0];

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({
        valid: false,
        error: 'expired',
        message: 'הקישור פג תוקף'
      });
    }

    // Check if token already used
    if (tokenRecord.is_used) {
      return Response.json({
        valid: false,
        error: 'used',
        message: 'כבר מילאת את הסקר, תודה!',
        rating: tokenRecord.rating
      });
    }

    // Return only safe info for display
    return Response.json({
      valid: true,
      customer_first_name: tokenRecord.customer_first_name,
      service_date: tokenRecord.service_date,
      vendor_name: tokenRecord.vendor_name
    });

  } catch (error) {
    console.error('Error getting token info:', error);
    return Response.json({ error: 'Failed to get token info' }, { status: 500 });
  }
});

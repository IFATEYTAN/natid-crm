import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// In-memory rate limiter: max 10 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  try {
    // Rate limiting by IP
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (isRateLimited(clientIp)) {
      return Response.json({
        error: 'Too many requests - please try again later',
        message: 'יותר מדי בקשות, נסה שוב בעוד דקה'
      }, { status: 429 });
    }

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
    return Response.json({ error: error.message }, { status: 500 });
  }
});

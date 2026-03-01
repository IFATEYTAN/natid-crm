import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await limiter.check('createFeedbackToken', user.id, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { call_id } = await req.json();
    
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    // Get call details using service role
    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const call = calls[0];

    // Check if token already exists for this call
    const existingTokens = await base44.asServiceRole.entities.FeedbackToken.filter({ 
      call_id: call_id,
      is_used: false 
    });
    
    // If valid token exists, return it
    const now = new Date();
    for (const token of existingTokens) {
      if (new Date(token.expires_at) > now) {
        return Response.json({ 
          success: true, 
          token: token.token,
          already_exists: true 
        });
      }
    }

    // Generate secure token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray, b => b.toString(16).padStart(2, '0')).join('');

    // Set expiry to 72 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    // Extract first name only (for privacy)
    const customerFirstName = call.customer_name ? call.customer_name.split(' ')[0] : 'לקוח';

    // Create token record
    await base44.asServiceRole.entities.FeedbackToken.create({
      token: token,
      call_id: call_id,
      call_number: call.call_number || '',
      customer_first_name: customerFirstName,
      service_date: call.created_date ? call.created_date.split('T')[0] : new Date().toISOString().split('T')[0],
      vendor_id: call.assigned_vendor_id || '',
      vendor_name: call.assigned_vendor_name || '',
      expires_at: expiresAt.toISOString(),
      is_used: false
    });

    return Response.json({ 
      success: true, 
      token: token,
      expires_at: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error creating feedback token:', error);
    return Response.json({ error: 'Failed to create feedback token' }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    
    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
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
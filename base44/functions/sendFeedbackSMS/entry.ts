import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify caller is authenticated admin or operator
    const user = await base44.auth.me();
    if (!user || !['admin', 'operator'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
    }

    const rl = await limiter.check('sendFeedbackSMS', user.id, 10, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { call_id } = await req.json();
    
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    // Get call details
    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const call = calls[0];
    
    if (!call.customer_phone) {
      return Response.json({ error: 'Customer phone not found' }, { status: 400 });
    }

    // Create feedback token first
    const tokenResponse = await base44.asServiceRole.functions.invoke('createFeedbackToken', { call_id });
    
    if (!tokenResponse.data?.token) {
      return Response.json({ error: 'Failed to create token' }, { status: 500 });
    }

    const token = tokenResponse.data.token;
    
    // Build feedback URL - using the app's domain
    const feedbackUrl = `https://app.base44.com/a/6955a04a2de0845ff4cb8a71/CustomerFeedback?token=${token}`;
    
    // Shorten URL for SMS (optional - you can integrate with URL shortener)
    const shortUrl = feedbackUrl;

    // SMS message
    const smsMessage = `שלום ${call.customer_name?.split(' ')[0] || 'לקוח יקר'}, תודה שבחרת בנתי! נשמח אם תדרג את השירות שקיבלת: ${shortUrl}`;

    // Send SMS using the sendSMS function
    try {
      await base44.asServiceRole.functions.invoke('sendSMS', {
        phone: call.customer_phone,
        message: smsMessage
      });
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Log but don't fail - token was created
    }

    // Log to audit
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: 'system',
        user_name: 'מערכת',
        action: 'create',
        entity_type: 'FeedbackToken',
        entity_id: call_id,
        entity_name: call.call_number,
        details: `נשלח סקר שביעות רצון ללקוח ${call.customer_name}`,
        severity: 'info'
      });
    } catch (e) {
      console.error('Failed to log audit:', e);
    }

    return Response.json({ 
      success: true,
      token: token,
      feedback_url: feedbackUrl,
      message: 'SMS sent successfully'
    });

  } catch (error) {
    console.error('Error sending feedback SMS:', error);
    return Response.json({ error: 'Failed to send feedback SMS' }, { status: 500 });
  }
});
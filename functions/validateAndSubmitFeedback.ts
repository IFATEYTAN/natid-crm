import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, rating, feedback_text, would_recommend } = await req.json();
    
    if (!token) {
      return Response.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find token record
    const tokens = await base44.asServiceRole.entities.FeedbackToken.filter({ token: token });
    
    if (tokens.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 404 });
    }

    const tokenRecord = tokens[0];

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({ error: 'Token expired' }, { status: 410 });
    }

    // Check if token already used
    if (tokenRecord.is_used) {
      return Response.json({ error: 'Feedback already submitted' }, { status: 409 });
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Update token record with feedback
    await base44.asServiceRole.entities.FeedbackToken.update(tokenRecord.id, {
      is_used: true,
      used_at: new Date().toISOString(),
      rating: rating,
      feedback_text: feedback_text || '',
      would_recommend: would_recommend
    });

    // Update call with customer feedback
    if (tokenRecord.call_id) {
      try {
        await base44.asServiceRole.entities.Call.update(tokenRecord.call_id, {
          customer_rating: rating,
          customer_feedback: feedback_text || ''
        });
      } catch (e) {
        console.error('Failed to update call:', e);
      }
    }

    // Create vendor rating if vendor exists
    if (tokenRecord.vendor_id) {
      try {
        await base44.asServiceRole.entities.VendorRating.create({
          vendor_id: tokenRecord.vendor_id,
          vendor_name: tokenRecord.vendor_name,
          call_id: tokenRecord.call_id,
          call_number: tokenRecord.call_number,
          rating_source: 'customer',
          overall_rating: rating,
          feedback: feedback_text || '',
          would_recommend: would_recommend
        });

        // Update vendor average rating
        const vendorRatings = await base44.asServiceRole.entities.VendorRating.filter({ 
          vendor_id: tokenRecord.vendor_id 
        });
        
        if (vendorRatings.length > 0) {
          const avgRating = vendorRatings.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / vendorRatings.length;
          await base44.asServiceRole.entities.Vendor.update(tokenRecord.vendor_id, {
            average_rating: Math.round(avgRating * 10) / 10,
            total_ratings: vendorRatings.length
          });
        }
      } catch (e) {
        console.error('Failed to create vendor rating:', e);
      }
    }

    // Log to audit
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: 'customer_feedback',
        user_name: tokenRecord.customer_first_name,
        action: 'create',
        entity_type: 'FeedbackToken',
        entity_id: tokenRecord.id,
        entity_name: tokenRecord.call_number,
        details: `לקוח דירג את השירות: ${rating}/5`,
        severity: 'info'
      });
    } catch (e) {
      console.error('Failed to log audit:', e);
    }

    return Response.json({ 
      success: true,
      message: 'תודה על המשוב שלך!'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
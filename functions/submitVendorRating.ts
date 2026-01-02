import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      vendorId, 
      callId, 
      overallRating, 
      responseTimeRating,
      serviceQualityRating,
      professionalismRating,
      communicationRating,
      feedback,
      completedOnTime,
      wouldRecommend,
      ratingSource = 'customer'
    } = await req.json();

    if (!vendorId || !callId || !overallRating) {
      return Response.json({ 
        error: 'Missing required fields: vendorId, callId, overallRating' 
      }, { status: 400 });
    }

    // Get vendor and call details
    const vendors = await base44.entities.Vendor.filter({ id: vendorId });
    const vendor = vendors[0];

    if (!vendor) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const calls = await base44.entities.Call.filter({ id: callId });
    const call = calls[0];

    if (!call) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }

    // Create rating record
    const rating = await base44.entities.VendorRating.create({
      vendor_id: vendorId,
      vendor_name: vendor.vendor_name,
      call_id: callId,
      call_number: call.call_number,
      rating_source: ratingSource,
      overall_rating: overallRating,
      response_time_rating: responseTimeRating || null,
      service_quality_rating: serviceQualityRating || null,
      professionalism_rating: professionalismRating || null,
      communication_rating: communicationRating || null,
      feedback: feedback || null,
      completed_on_time: completedOnTime !== undefined ? completedOnTime : null,
      would_recommend: wouldRecommend !== undefined ? wouldRecommend : null
    });

    // Update vendor's average rating
    const allRatings = await base44.asServiceRole.entities.VendorRating.filter({ vendor_id: vendorId });
    const avgRating = allRatings.reduce((acc, r) => acc + r.overall_rating, 0) / allRatings.length;

    await base44.asServiceRole.entities.Vendor.update(vendorId, {
      average_rating: avgRating,
      total_ratings: allRatings.length
    });

    // Update call with rating
    await base44.asServiceRole.entities.Call.update(callId, {
      customer_rating: overallRating,
      customer_feedback: feedback
    });

    return Response.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: {
        id: rating.id,
        overall_rating: overallRating,
        vendor_average: avgRating.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Submit rating error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
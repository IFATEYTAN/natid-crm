import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Get vendor-scoped data - returns only data belonging to the authenticated vendor.
 * This is the secure alternative to client-side filtering.
 *
 * Supports: calls, ratings, payments, contracts, attempts
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only vendors use this endpoint; admins/operators have full access through normal APIs
    if (user.role !== 'vendor' && user.role !== 'ספק') {
      return Response.json({ error: 'This endpoint is for vendor role only' }, { status: 403 });
    }

    const { entity_type, sort = '-created_date', limit = 100 } = await req.json();

    if (!entity_type) {
      return Response.json({ error: 'entity_type is required' }, { status: 400 });
    }

    // Find vendor linked to this user - multiple strategies
    let vendors = await base44.asServiceRole.entities.Vendor.filter({ email: user.email });
    
    // Fallback: try matching by vendor_name to user full_name
    if (!vendors.length && user.full_name) {
      vendors = await base44.asServiceRole.entities.Vendor.filter({ vendor_name: user.full_name });
    }
    
    // Fallback: try matching by phone if user has vendor_phone saved on profile
    if (!vendors.length && user.vendor_phone) {
      vendors = await base44.asServiceRole.entities.Vendor.filter({ phone: user.vendor_phone });
    }
    
    // Fallback: try matching by vendor_id if admin saved it on user profile
    if (!vendors.length && user.vendor_id) {
      vendors = await base44.asServiceRole.entities.Vendor.filter({ id: user.vendor_id });
    }
    
    if (!vendors.length) {
      return Response.json({ 
        error: 'No vendor profile linked to this account',
        hint: 'Admin should set vendor email to match user email, or save vendor_id on user profile',
        user_email: user.email,
        user_name: user.full_name
      }, { status: 404 });
    }
    const vendor = vendors[0];

    let data = [];

    switch (entity_type) {
      case 'calls':
        data = await base44.asServiceRole.entities.Call.filter(
          { assigned_vendor_id: vendor.id },
          sort,
          limit
        );
        break;

      case 'ratings':
        data = await base44.asServiceRole.entities.VendorRating.filter(
          { vendor_id: vendor.id },
          sort,
          limit
        );
        break;

      case 'payments':
        data = await base44.asServiceRole.entities.VendorPayment.filter(
          { vendor_id: vendor.id },
          sort,
          limit
        );
        break;

      case 'contracts':
        data = await base44.asServiceRole.entities.VendorContract.filter(
          { vendor_id: vendor.id },
          sort,
          limit
        );
        break;

      case 'attempts':
        data = await base44.asServiceRole.entities.CallAssignmentAttempt.filter(
          { vendor_id: vendor.id },
          sort,
          limit
        );
        break;

      case 'profile':
        // Return only this vendor's profile
        data = [vendor];
        break;

      default:
        return Response.json({ error: `Unknown entity_type: ${entity_type}` }, { status: 400 });
    }

    return Response.json({
      success: true,
      vendor_id: vendor.id,
      entity_type,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error('getVendorScopedData error:', error);
    return Response.json({ error: 'Failed to get vendor data' }, { status: 500 });
  }
});
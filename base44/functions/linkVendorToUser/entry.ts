import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Admin function to link a vendor profile to a user account.
 * Sets the vendor's email to match the user's email, enabling the vendor portal.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { vendor_id, user_email } = await req.json();

    if (!vendor_id || !user_email) {
      return Response.json({ error: 'Missing vendor_id or user_email' }, { status: 400 });
    }

    // Verify vendor exists
    const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendor_id });
    if (!vendors.length) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Update vendor email
    await base44.asServiceRole.entities.Vendor.update(vendor_id, { 
      email: user_email 
    });

    // Try to set user role to vendor if they exist
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (users.length > 0) {
      const targetUser = users[0];
      if (targetUser.role !== 'vendor' && targetUser.role !== 'ספק') {
        await base44.asServiceRole.entities.User.update(targetUser.id, { 
          role: 'vendor',
          vendor_id: vendor_id 
        });
      }
    }

    return Response.json({
      success: true,
      vendor_name: vendors[0].vendor_name,
      linked_email: user_email,
    });
  } catch (error) {
    console.error('linkVendorToUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
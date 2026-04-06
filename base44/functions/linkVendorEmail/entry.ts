import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Link an email address to a vendor profile.
 * Admin-only operation — allows vendors to log in and see their portal.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { vendor_id, email } = await req.json();

    if (!vendor_id || !email) {
      return Response.json({ error: 'Missing vendor_id or email' }, { status: 400 });
    }

    // Update vendor with the email
    await base44.asServiceRole.entities.Vendor.update(vendor_id, { email });

    return Response.json({ success: true, vendor_id, email });
  } catch (error) {
    console.error('linkVendorEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
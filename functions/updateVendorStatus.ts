import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update vendor status (available/break) and notify operators
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only vendor or admin
    if (!['admin', 'vendor'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { vendor_id, status } = await req.json();

    if (!vendor_id || !status) {
      return Response.json({ error: 'Missing vendor_id or status' }, { status: 400 });
    }

    // Get vendor
    const vendors = await base44.entities.Vendor.filter({ id: vendor_id });
    if (!vendors.length) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }
    const vendor = vendors[0];

    // Ownership check: vendors can only update their own status
    if (user.role === 'vendor' && vendor.email !== user.email) {
      return Response.json({ error: 'Forbidden - can only update your own status' }, { status: 403 });
    }

    // Update status
    await base44.entities.Vendor.update(vendor_id, {
      availability_status: status,
      last_location_update: new Date().toISOString() // refresh timestamp
    });

    // Fetch admins and operators for notifications
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const operators = await base44.asServiceRole.entities.User.filter({ role: 'operator' });
    const notifyUsers = [...admins, ...operators];

    let title = 'עדכון סטטוס ספק';
    let message = '';
    let type = 'info';

    if (status === 'on_break') {
      title = 'ספק בהפסקה';
      message = `הספק ${vendor.vendor_name} יצא להפסקה`;
      type = 'warning';
    } else if (status === 'available') {
      title = 'ספק זמין';
      message = `הספק ${vendor.vendor_name} חזר להיות זמין`;
      type = 'success';
    } else if (status === 'offline') {
      title = 'ספק התנתק';
      message = `הספק ${vendor.vendor_name} סיים משמרת`;
      type = 'warning';
    }

    for (const op of notifyUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: op.id,
        title,
        message,
        type,
        is_read: false,
        link: `/ServiceProviders`, // Link to vendors list
        related_entity_id: vendor.id,
        related_entity_type: 'vendor'
      });
    }

    return Response.json({ success: true, status });

  } catch (error) {
    console.error('Update status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
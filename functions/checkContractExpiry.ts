import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active contracts
    const contracts = await base44.asServiceRole.entities.VendorContract.filter({
      status: 'active'
    });

    const now = new Date();
    const results = {
      checked: contracts.length,
      expiringSoon: [],
      expired: [],
      notificationsSent: 0
    };

    for (const contract of contracts) {
      const endDate = new Date(contract.end_date);
      const daysToExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      // Check if expired
      if (daysToExpiry < 0) {
        // Update status to expired
        await base44.asServiceRole.entities.VendorContract.update(contract.id, {
          status: 'expired'
        });
        
        results.expired.push({
          contract_number: contract.contract_number,
          vendor_name: contract.vendor_name,
          end_date: contract.end_date
        });

        // Create notification
        await base44.asServiceRole.entities.Notification.create({
          title: 'חוזה פג תוקף',
          message: `החוזה עם ${contract.vendor_name} פג תוקף`,
          type: 'warning',
          link: 'VendorContracts',
          related_entity_id: contract.id,
          related_entity_type: 'VendorContract'
        });

        results.notificationsSent++;
      }
      // Check if expiring within 30 days
      else if (daysToExpiry <= 30 && !contract.expiry_reminder_sent) {
        results.expiringSoon.push({
          contract_number: contract.contract_number,
          vendor_name: contract.vendor_name,
          end_date: contract.end_date,
          days_to_expiry: daysToExpiry
        });

        // Send reminder notification
        await base44.asServiceRole.entities.Notification.create({
          title: 'חוזה עומד לפוג תוקף',
          message: `החוזה עם ${contract.vendor_name} יפוג בעוד ${daysToExpiry} ימים`,
          type: 'warning',
          link: 'VendorContracts',
          related_entity_id: contract.id,
          related_entity_type: 'VendorContract'
        });

        // Mark reminder as sent
        await base44.asServiceRole.entities.VendorContract.update(contract.id, {
          expiry_reminder_sent: true,
          expiry_reminder_date: new Date().toISOString()
        });

        results.notificationsSent++;

        // Also update vendor entity
        await base44.asServiceRole.entities.Vendor.update(contract.vendor_id, {
          contract_status: 'pending'
        });
      }
    }

    return Response.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Contract expiry check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
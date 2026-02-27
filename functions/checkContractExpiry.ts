import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify caller is admin or system cron
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - admin role required' }, { status: 403 });
    }

    // Get all active contracts
    const contracts = await base44.asServiceRole.entities.VendorContract.filter({
      status: 'active'
    });

    // Get all admin users for notifications
    const adminUsers = await base44.asServiceRole.entities.User.filter({
      role: 'admin'
    });

    const now = new Date();
    const results = {
      checked: contracts.length,
      expiringSoon: [],
      expired: [],
      notificationsSent: 0,
      adminNotified: adminUsers.length
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

        // Create notification for each admin
        for (const admin of adminUsers) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: admin.id,
            title: '🔴 חוזה פג תוקף',
            message: `החוזה ${contract.contract_number || ''} עם ${contract.vendor_name} פג תוקף. נדרשת פעולה מיידית.`,
            type: 'error',
            link: 'VendorContracts',
            related_entity_id: contract.id,
            related_entity_type: 'VendorContract'
          });
          results.notificationsSent++;
        }

        // Update vendor contract status
        await base44.asServiceRole.entities.Vendor.update(contract.vendor_id, {
          contract_status: 'expired'
        });
      }
      // Check if expiring within 30 days
      else if (daysToExpiry <= 30 && !contract.expiry_reminder_sent) {
        results.expiringSoon.push({
          contract_number: contract.contract_number,
          vendor_name: contract.vendor_name,
          end_date: contract.end_date,
          days_to_expiry: daysToExpiry
        });

        // Send reminder notification to each admin
        for (const admin of adminUsers) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: admin.id,
            title: '⚠️ חוזה עומד לפוג תוקף',
            message: `החוזה ${contract.contract_number || ''} עם ${contract.vendor_name} יפוג בעוד ${daysToExpiry} ימים. מומלץ לטפל בחידוש החוזה.`,
            type: 'warning',
            link: 'VendorContracts',
            related_entity_id: contract.id,
            related_entity_type: 'VendorContract'
          });
          results.notificationsSent++;
        }

        // Mark reminder as sent
        await base44.asServiceRole.entities.VendorContract.update(contract.id, {
          expiry_reminder_sent: true,
          expiry_reminder_date: new Date().toISOString()
        });

        // Also update vendor entity
        await base44.asServiceRole.entities.Vendor.update(contract.vendor_id, {
          contract_status: 'pending'
        });
      }
      // Check if expiring within 7 days - send urgent reminder
      else if (daysToExpiry <= 7 && daysToExpiry > 0) {
        const lastReminderDate = contract.expiry_reminder_date ? new Date(contract.expiry_reminder_date) : null;
        const daysSinceLastReminder = lastReminderDate ? Math.ceil((now - lastReminderDate) / (1000 * 60 * 60 * 24)) : 999;
        
        // Send weekly urgent reminder
        if (daysSinceLastReminder >= 7) {
          for (const admin of adminUsers) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: admin.id,
              title: '🚨 דחוף: חוזה עומד לפוג בקרוב מאוד',
              message: `החוזה עם ${contract.vendor_name} יפוג בעוד ${daysToExpiry} ימים בלבד! נדרשת פעולה מיידית.`,
              type: 'error',
              link: 'VendorContracts',
              related_entity_id: contract.id,
              related_entity_type: 'VendorContract'
            });
            results.notificationsSent++;
          }
          
          // Update last reminder date
          await base44.asServiceRole.entities.VendorContract.update(contract.id, {
            expiry_reminder_date: new Date().toISOString()
          });
        }
      }
    }

    return Response.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Contract expiry check error:', error);
    return Response.json({ error: 'Failed to check contract expiry' }, { status: 500 });
  }
});
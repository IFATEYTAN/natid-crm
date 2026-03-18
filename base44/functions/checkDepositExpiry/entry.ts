import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scheduled function to auto-cancel deposits that haven't been charged
 * within 48 hours of the call being opened.
 *
 * Also marks deposits as expired if they pass their 21-day expiry date.
 *
 * Should be invoked via cron (e.g. every hour).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active deposits
    const activeDeposits = await base44.asServiceRole.entities.Deposit.filter({
      status: 'active',
    });

    const now = new Date();
    const results = {
      checked: activeDeposits.length,
      expired: 0,
      cancelledAfter48h: 0,
      errors: 0,
    };

    for (const deposit of activeDeposits) {
      try {
        const depositDate = new Date(deposit.deposit_date || deposit.created_date);
        const hoursSinceCreation = (now.getTime() - depositDate.getTime()) / (1000 * 60 * 60);

        // Check 21-day expiry
        if (deposit.expiry_date) {
          const expiryDate = new Date(deposit.expiry_date);
          if (now > expiryDate) {
            await base44.asServiceRole.entities.Deposit.update(deposit.id, {
              status: 'expired',
              notes: (deposit.notes || '') + '\nפג תוקף אוטומטית (21 יום)',
            });
            results.expired++;

            // Log to call history
            if (deposit.call_id) {
              await base44.asServiceRole.entities.CallHistory.create({
                call_id: deposit.call_id,
                call_number: deposit.call_number || '',
                change_type: 'note',
                new_value: `עירבון ₪${deposit.amount} פג תוקף אוטומטית (21 יום)`,
                changed_by: 'מערכת',
              });
            }
            continue;
          }
        }

        // Check 48-hour auto-cancel for uncollected deposits
        if (hoursSinceCreation >= 48) {
          // Verify the call is still open (not completed/cancelled)
          if (deposit.call_id) {
            const calls = await base44.asServiceRole.entities.Call.filter({
              id: deposit.call_id,
            });
            const call = calls[0];

            // Only auto-cancel if the call hasn't been completed
            // (completed calls may need the deposit for charging)
            if (call && !['completed', 'cancelled'].includes(call.call_status)) {
              await base44.asServiceRole.entities.Deposit.update(deposit.id, {
                status: 'cancelled',
                notes:
                  (deposit.notes || '') +
                  '\nבוטל אוטומטית — לא נגבה תוך 48 שעות מפתיחת הקריאה',
              });
              results.cancelledAfter48h++;

              // Log to call history
              await base44.asServiceRole.entities.CallHistory.create({
                call_id: deposit.call_id,
                call_number: deposit.call_number || '',
                change_type: 'note',
                new_value: `עירבון ₪${deposit.amount} בוטל אוטומטית — לא נגבה תוך 48 שעות`,
                changed_by: 'מערכת',
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error processing deposit ${deposit.id}:`, err);
        results.errors++;
      }
    }

    // Notify admins if there were auto-cancellations
    if (results.cancelledAfter48h > 0 || results.expired > 0) {
      const adminUsers = await base44.asServiceRole.entities.User.filter({
        role: 'admin',
      });

      for (const admin of adminUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          title: 'עדכון עירבונות אוטומטי',
          message: `${results.cancelledAfter48h} עירבונות בוטלו (48 שעות), ${results.expired} פגו תוקף (21 יום)`,
          type: 'info',
          link: 'Reports',
        });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Deposit expiry check error:', error);
    return Response.json({ error: 'Failed to check deposit expiry' }, { status: 500 });
  }
});

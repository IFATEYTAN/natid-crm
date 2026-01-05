import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { attemptId, response } = await req.json(); // response: 'accept' | 'decline'

        if (!attemptId || !response) {
            return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const attempt = await base44.asServiceRole.entities.CallAssignmentAttempt.get(attemptId);
        if (!attempt) return Response.json({ error: 'Attempt not found' }, { status: 404 });

        if (attempt.status !== 'pending') {
            return Response.json({ error: 'Attempt is not pending' }, { status: 400 });
        }

        if (response === 'accept') {
            // 1. Mark attempt as accepted
            await base44.asServiceRole.entities.CallAssignmentAttempt.update(attemptId, {
                status: 'accepted',
                response_time_seconds: (new Date() - new Date(attempt.created_date)) / 1000
            });

            // 2. Officially assign call
            await base44.asServiceRole.entities.Call.update(attempt.call_id, {
                call_status: 'vendor_enroute', // Or 'assigned'
                assigned_vendor_id: attempt.vendor_id,
                assigned_at: new Date().toISOString()
            });
            
            // 3. Mark vendor as busy? (Optional logic)
            // await base44.asServiceRole.entities.Vendor.update(attempt.vendor_id, { availability_status: 'busy' });

        } else if (response === 'decline') {
            // 1. Mark attempt as declined
            await base44.asServiceRole.entities.CallAssignmentAttempt.update(attemptId, {
                status: 'declined',
                response_time_seconds: (new Date() - new Date(attempt.created_date)) / 1000
            });

            // 2. Trigger Auto-Assign again to find next best
            // Calling the function asynchronously (fire and forget) or await it
            await base44.asServiceRole.functions.invoke('autoAssignVendor', { callId: attempt.call_id });
        }

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
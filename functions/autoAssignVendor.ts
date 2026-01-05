import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Haversine formula to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { callId } = await req.json();

        if (!callId) {
            return Response.json({ error: 'Missing callId' }, { status: 400 });
        }

        // 1. Fetch Call Details
        const call = await base44.asServiceRole.entities.Call.get(callId);
        if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });

        if (!call.pickup_location_lat || !call.pickup_location_lon) {
            return Response.json({ error: 'Call missing location data' }, { status: 400 });
        }

        // 2. Fetch Previous Attempts (to exclude declined vendors)
        const previousAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
            call_id: callId
        });
        const excludedVendorIds = new Set(previousAttempts.map(a => a.vendor_id));

        // 3. Fetch Available Vendors
        // Filter by service type and availability
        // Note: We fetch all and filter in memory for complex logic, or use filter if possible.
        // Assuming 'service_type' in vendor is an array. API filter might not support array contains easily, 
        // so we fetch available vendors and filter in code.
        const vendors = await base44.asServiceRole.entities.Vendor.filter({
            availability_status: 'available',
            is_active: true
        });

        // 4. Score Vendors (AI Scoring Engine)
        const candidates = vendors
            .filter(v => !excludedVendorIds.has(v.id))
            .filter(v => v.service_type && v.service_type.includes(call.service_type)) // Service match
            .filter(v => v.current_latitude && v.current_longitude) // Must have location
            .map(v => {
                const distance = calculateDistance(
                    call.pickup_location_lat,
                    call.pickup_location_lon,
                    v.current_latitude,
                    v.current_longitude
                );

                // Scoring Weights
                const W_DISTANCE = 0.5; // Lower is better
                const W_RATING = 0.3;   // Higher is better
                const W_WORKLOAD = 0.2; // Lower is better

                // Normalize metrics (simplified)
                const normDistance = Math.max(0, 100 - distance) / 100; // 0-100km range
                const normRating = (v.average_rating || 3) / 5;
                const normWorkload = Math.max(0, 10 - (v.active_calls_count || 0)) / 10;

                // Calculate Score (0 to 100)
                const score = (
                    (normDistance * W_DISTANCE) +
                    (normRating * W_RATING) +
                    (normWorkload * W_WORKLOAD)
                ) * 100;

                return { vendor: v, score, distance };
            });

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length === 0) {
             // No suitable vendors found
             await base44.asServiceRole.entities.Call.update(callId, {
                 call_status: 'waiting_treatment', // Fallback to manual
                 internal_notes: (call.internal_notes || '') + '\nAI Auto-assign: No suitable vendors found.'
             });
             return Response.json({ success: false, message: 'No candidates found' });
        }

        const bestCandidate = candidates[0];

        // 5. Create Assignment Attempt
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes to accept

        await base44.asServiceRole.entities.CallAssignmentAttempt.create({
            call_id: callId,
            vendor_id: bestCandidate.vendor.id,
            status: 'pending',
            score: Math.round(bestCandidate.score),
            distance_km: parseFloat(bestCandidate.distance.toFixed(1)),
            expires_at: expiresAt.toISOString()
        });

        // 6. Update Call Status
        await base44.asServiceRole.entities.Call.update(callId, {
            call_status: 'assigning', // Indicates waiting for vendor response
            assigned_vendor_id: bestCandidate.vendor.id, // Proposed vendor
            assigned_provider_name: bestCandidate.vendor.vendor_name, // Temporary display
            internal_notes: (call.internal_notes || '') + `\nAI Proposed: ${bestCandidate.vendor.vendor_name} (Score: ${Math.round(bestCandidate.score)})`
        });

        // 7. Notify Vendor (In a real app, send Push/SMS here)
        // We'll rely on the Vendor Portal polling or listening to updates for now.

        return Response.json({ 
            success: true, 
            vendor: bestCandidate.vendor.vendor_name,
            score: bestCandidate.score
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
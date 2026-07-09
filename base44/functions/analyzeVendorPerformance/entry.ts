import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { resolveAppRole } from './_shared/appRole.ts'; // app-level role gate
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Verify caller is authenticated admin or operator
        const user = await base44.auth.me();
        const appRole = await resolveAppRole(base44, user);
        if (!user || !['admin', 'operator'].includes(appRole)) {
            return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
        }

        const rl = await limiter.check('analyzeVendorPerf', user.id, 5, 60_000);
        if (!rl.allowed) return rateLimitResponse(rl.resetAt);

        const { vendor_id } = await req.json();

        // Fetch vendor data
        const vendor = await base44.entities.Vendor.get(vendor_id);
        
        // Fetch recent calls for this vendor
        const calls = await base44.entities.Call.filter({ assigned_vendor_id: vendor_id, call_status: 'completed' }, '-created_date', 50);
        
        // Fetch ratings
        const ratings = await base44.entities.VendorRating.filter({ vendor_id: vendor_id }, '-created_date', 20);

        const prompt = `
        Analyze the performance of the following service provider (Vendor) based on their recent history.
        
        Vendor: ${vendor.vendor_name}
        
        Recent Calls Data (Last 50):
        ${JSON.stringify(calls.map(c => ({
            service: c.service_type,
            area: c.pickup_location_area,
            response_time: c.vendor_arrival_time_actual ? (new Date(c.vendor_arrival_time_actual) - new Date(c.assigned_at)) / 60000 : null,
            rating: c.customer_rating,
            day_of_week: new Date(c.created_date).getDay()
        })))}

        Recent Ratings:
        ${JSON.stringify(ratings.map(r => ({ score: r.overall_rating, feedback: r.feedback })))}

        Provide a comprehensive analysis including:
        1. "strengths": List of 3 key strengths.
        2. "weaknesses": List of 3 areas for improvement.
        3. "patterns": Any noticeable patterns (e.g., "Faster on weekends", "Struggles with towing in Tel Aviv").
        4. "predicted_trend": Prediction for future performance (improving/declining/stable) with a reason.
        5. "actionable_advice": One specific tip for the operator on how to best utilize this vendor.

        Output in Hebrew.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                    patterns: { type: "array", items: { type: "string" } },
                    predicted_trend: { type: "string" },
                    predicted_trend_reason: { type: "string" },
                    actionable_advice: { type: "string" }
                },
                required: ["strengths", "weaknesses", "patterns", "predicted_trend", "actionable_advice"]
            }
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: 'Failed to analyze vendor performance' }, { status: 500 });
    }
});
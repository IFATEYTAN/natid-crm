import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { call_details } = await req.json();

        // Fetch active vendors
        const vendors = await base44.entities.Vendor.filter({ is_active: true, is_available_now: true });

        // Prepare vendor summary
        const vendorsSummary = vendors.map(v => ({
            id: v.id,
            name: v.vendor_name,
            rating: v.average_rating,
            services: v.service_type,
            areas: v.coverage_areas,
            avg_response: v.average_response_time,
            location: { lat: v.current_latitude, lng: v.current_longitude } // Simplified
        }));

        const prompt = `
        Recommend the best 3 vendors for this specific service call based on the available data.
        
        Call Details: ${JSON.stringify(call_details)}
        
        Available Vendors: ${JSON.stringify(vendorsSummary)}
        
        Consider:
        1. Service match (does the vendor support the requested service type?)
        2. Location/Area match (is the vendor covering the area?)
        3. Performance (rating, response time)
        
        Return exactly 3 recommendations sorted by best fit.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                vendor_id: { type: "string" },
                                match_score: { type: "number", description: "Score from 0-100" },
                                reason: { type: "string", description: "Reason for recommendation in Hebrew" }
                            },
                            required: ["vendor_id", "match_score", "reason"]
                        }
                    }
                },
                required: ["recommendations"]
            }
        });

        // Enrich recommendations with full vendor objects
        const enrichedRecs = response.recommendations.map(rec => {
            const vendor = vendors.find(v => v.id === rec.vendor_id);
            return { ...rec, vendor };
        }).filter(r => r.vendor); // Filter out if vendor not found for some reason

        return Response.json({ recommendations: enrichedRecs });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { location, service_type, time_of_day, vehicle_type } = await req.json();

        const prompt = `
        Predict the estimated response time (time until arrival) and completion time (total duration) for a roadside assistance service call.
        
        Context:
        - Location: ${location} (Assume Israel)
        - Service Type: ${service_type}
        - Time of Day: ${time_of_day}
        - Vehicle Type: ${vehicle_type}
        
        Base your prediction on general traffic patterns in Israel and typical service durations.
        Return realistic estimates in minutes.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    estimated_response_minutes: { type: "number" },
                    estimated_completion_minutes: { type: "number" },
                    confidence_score: { type: "number", description: "0-100" },
                    factors: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Factors influencing this prediction (e.g., 'Heavy traffic expected in Tel Aviv at 17:00') in Hebrew"
                    }
                },
                required: ["estimated_response_minutes", "estimated_completion_minutes", "factors"]
            }
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
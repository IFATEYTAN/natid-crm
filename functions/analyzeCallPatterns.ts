import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch recent completed calls for analysis
        const calls = await base44.entities.Call.list('-created_date', 50);
        
        // Prepare data summary for the LLM
        const callsSummary = calls.map(c => ({
            status: c.call_status,
            service: c.service_type || c.issue_type,
            area: c.pickup_location_area,
            city: c.pickup_location_city,
            time_to_complete: c.time_to_completion,
            time_waiting: c.time_waiting,
            created_at: c.created_date,
            priority: c.call_priority
        }));

        const prompt = `
        Analyze the following service call data for a roadside assistance company.
        Identify patterns, bottlenecks, and provide actionable recommendations.
        
        IMPORTANT: All output must be in Hebrew (עברית).
        
        Data: ${JSON.stringify(callsSummary)}
        
        Focus on:
        1. Peak hours or problematic areas.
        2. Service types that take longer than expected.
        3. Operational bottlenecks (e.g., long waiting times).
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    patterns: {
                        type: "array",
                        items: { type: "string" },
                        description: "Identified patterns in the data, in Hebrew"
                    },
                    bottlenecks: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string", description: "Title in Hebrew" },
                                severity: { type: "string", enum: ["low", "medium", "high"] },
                                description: { type: "string", description: "Description in Hebrew" }
                            }
                        },
                        description: "Identified bottlenecks, with titles and descriptions in Hebrew"
                    },
                    recommendations: {
                        type: "array",
                        items: { type: "string" },
                        description: "Actionable recommendations for improvement, in Hebrew"
                    },
                    summary: {
                        type: "string",
                        description: "Brief executive summary in Hebrew"
                    }
                },
                required: ["patterns", "bottlenecks", "recommendations", "summary"]
            }
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: 'Failed to analyze call patterns' }, { status: 500 });
    }
});
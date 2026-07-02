import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { computeCallSatisfaction } from './_shared/satisfaction.ts';

/**
 * Returns the final customer-satisfaction result for a call, aggregated
 * across every FeedbackToken (survey attempt) sent for it — ignoring
 * "no answer" attempts unless all of them were unanswered (QA audit Group E).
 *
 * POST { call_id: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    const tokens = await base44.asServiceRole.entities.FeedbackToken.filter({ call_id });
    const result = computeCallSatisfaction(tokens);

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('Error computing call satisfaction:', error);
    return Response.json({ error: 'Failed to compute satisfaction' }, { status: 500 });
  }
});

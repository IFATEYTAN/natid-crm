import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

// ===== Inline _shared/satisfaction (kept per-file: shared-module bundling is broken
// platform-wide for new deployments - see docs/LESSONS_LEARNED.md 2026-07-09) =====
/**
 * Shared customer-satisfaction aggregation logic.
 *
 * A call can be surveyed more than once (FeedbackToken rows accumulate: each
 * unexpired-unused token is reused on resend, but once one expires unused,
 * the next survey send creates a fresh row) — so a call's FeedbackToken
 * history is effectively its list of survey "attempts". QA audit ask
 * (Group E): the final result must ignore "no answer" attempts and use the
 * last real (green/yellow/red) answer; only report "no answer" when every
 * attempt was unanswered.
 */

type SatisfactionColor = 'green' | 'yellow' | 'red';
type SatisfactionStatus = SatisfactionColor | 'no_answer' | 'pending' | 'not_sent';

interface FeedbackTokenLike {
  is_used?: boolean;
  expires_at?: string;
  rating?: number;
  used_at?: string;
}

interface CallSatisfactionResult {
  status: SatisfactionStatus;
  color: SatisfactionColor | null;
  rating: number | null;
  answered_at: string | null;
}

function ratingToColor(rating: number): SatisfactionColor {
  if (rating >= 4) return 'green';
  if (rating === 3) return 'yellow';
  return 'red';
}

/**
 * Reduce a call's FeedbackToken rows to a single final satisfaction result.
 * Ignores "no answer" (expired, never used) attempts unless every attempt
 * was a no-answer.
 */
function computeCallSatisfaction(tokens: FeedbackTokenLike[]): CallSatisfactionResult {
  if (!tokens || tokens.length === 0) {
    return { status: 'not_sent', color: null, rating: null, answered_at: null };
  }

  const now = Date.now();
  const answered = tokens
    .filter((t) => t.is_used && typeof t.rating === 'number')
    .sort((a, b) => new Date(b.used_at || 0).getTime() - new Date(a.used_at || 0).getTime());

  if (answered.length > 0) {
    const last = answered[0];
    const color = ratingToColor(last.rating as number);
    return {
      status: color,
      color,
      rating: last.rating as number,
      answered_at: last.used_at || null,
    };
  }

  const stillPending = tokens.some((t) => !t.is_used && new Date(t.expires_at || 0).getTime() > now);
  if (stillPending) {
    return { status: 'pending', color: null, rating: null, answered_at: null };
  }

  // Every attempt was sent, expired, and never answered.
  return { status: 'no_answer', color: null, rating: null, answered_at: null };
}
// ===== End inline _shared/satisfaction ===== (redeploy)

// Temporary probe: does importing an untouched _shared module still deploy?
// Safe to delete. See docs/LESSONS_LEARNED.md 2026-07-09.
import { rateLimitResponse } from './_shared/rateLimit.ts';

Deno.serve(() => {
  if (Math.random() < 0) return rateLimitResponse(Date.now() + 1000);
  return Response.json({ ok: true, probe: 'shared-bundling' });
});

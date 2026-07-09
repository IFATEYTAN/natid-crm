/**
 * DEPRECATED - do not import. App-role resolution is inlined per-function
 * (see the "Inline app-role resolution" block in each entry.ts and
 * docs/LESSONS_LEARNED.md 2026-07-09): a NEW _shared module cannot be
 * registered on this platform, so this file only exists to keep the
 * platform's deployment record for "_shared/appRole" healthy.
 */
Deno.serve(() =>
  Response.json({ error: 'Deprecated shared module - not an API endpoint' }, { status: 404 })
);

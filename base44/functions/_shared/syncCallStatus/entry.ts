/**
 * DEPRECATED - do not import. Call-status sync is inlined per-function
 * (see the "Inline call-status sync" block in each entry.ts and
 * docs/LESSONS_LEARNED.md 2026-07-09): re-saving a _shared module through
 * the platform invalidates its deployment record and breaks every importer.
 * This stub only keeps the platform's deployment record healthy.
 */
Deno.serve(() =>
  Response.json({ error: 'Deprecated shared module - not an API endpoint' }, { status: 404 })
);

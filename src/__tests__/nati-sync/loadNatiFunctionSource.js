/**
 * Loads the pure mapping/diff logic out of the Nati sync Deno functions so it
 * can be unit-tested under vitest. The Deno entry files can't be imported
 * directly (npm: specifiers, Deno globals, Deno.serve at module top), so we
 * extract the self-contained pure sections between their section markers and
 * evaluate them. This tests the REAL production source — any edit to the
 * mapping logic in entry.ts is immediately reflected here, with zero drift.
 *
 * The extraction is anchored on the "// ========== X ==========" section
 * markers already present in both files. If a marker is renamed or a pure
 * section starts depending on Deno APIs, the loader throws and the suite
 * fails loudly instead of silently testing stale code.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

// vitest runs with cwd at the repo root (where vitest.config.js lives).
function readFunctionSource(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function extractSection(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Could not locate section "${label}" (markers: ${startMarker} .. ${endMarker})`
    );
  }
  return source.slice(start, end);
}

/**
 * Pull direction (Nati -> CRM): status/department/vehicle maps, date parsing,
 * and the appeal -> Call/Case/Vendor/Customer mappers from syncNatiData.
 */
export function loadSyncMappers() {
  const src = readFunctionSource('base44/functions/syncNatiData/entry.ts');
  const section = extractSection(
    src,
    '// ========== MAPPINGS ==========',
    '// ========== BULK SYNC HELPER ==========',
    'syncNatiData pure mappers'
  );
  // eslint-disable-next-line no-new-func
  return new Function(`${section}
    return {
      DEPT_MAP, CASE_STATUS_MAP, CALL_STATUS_MAP, VEHICLE_TYPE_MAP,
      jerusalemOffsetForDate, parseNatiDate, clean, mapServiceType,
      mapIssueType, mapToCall, mapToCase, extractVendors, extractCustomers,
    };`)();
}

/**
 * Pull-side conflict-guard tables (defined inline in the syncNatiData handler):
 * the CRM-status -> Nati-bucket map and the terminal-status set used to keep
 * local closures / finer-grained local statuses from being flattened by a pull.
 */
export function loadPullStatusGuardTables() {
  const src = readFunctionSource('base44/functions/syncNatiData/entry.ts');
  const mapMatch = src.match(/const\s+CRM_STATUS_TO_NATI_BUCKET\s*=\s*\{[\s\S]*?\};/);
  const setMatch = src.match(/const\s+TERMINAL_CRM_STATUSES\s*=\s*new\s+Set\(\[[\s\S]*?\]\);/);
  if (!mapMatch || !setMatch) {
    throw new Error(
      'Could not locate CRM_STATUS_TO_NATI_BUCKET / TERMINAL_CRM_STATUSES in syncNatiData/entry.ts'
    );
  }
  // eslint-disable-next-line no-new-func
  return new Function(`${mapMatch[0]}
    ${setMatch[0]}
    return { CRM_STATUS_TO_NATI_BUCKET, TERMINAL_CRM_STATUSES };`)();
}

/**
 * Push direction (CRM -> Nati): status map, datetime conversion, and the
 * diff-based, conservative row updater from pushNatiUpdates.
 */
export function loadPushMappers() {
  const src = readFunctionSource('base44/functions/pushNatiUpdates/entry.ts');
  // Start slightly before the section marker: the pure section reads
  // Q_NOTES_MAX_LEN / WATERMARK_OVERLAP_MS defined just above it.
  const section = extractSection(
    src,
    'const WATERMARK_OVERLAP_MS',
    '// ========== MAIN HANDLER ==========',
    'pushNatiUpdates pure mappers'
  );
  // eslint-disable-next-line no-new-func
  return new Function(`${section}
    return {
      WATERMARK_OVERLAP_MS, Q_NOTES_MAX_LEN, NATI_CLOSED_STATUSES,
      CRM_STATUS_TO_NATI, toNatiDateTime, isEmptyNatiDate, diffCallAgainstNatiRow,
    };`)();
}
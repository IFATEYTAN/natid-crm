/**
 * Shared display labels for srv.natid.co.il appeal fields — department_id and
 * call_open_appeals.status (row state, not the callStatus *view* selector).
 * See srv.natid.co.il CLAUDE.md "GET /appeals" for the authoritative list.
 */

export const DEPARTMENT_LABELS = {
  '-1': 'כל המחלקות',
  3: 'גרירה',
  4: 'רכב חליפי',
  5: 'שמשות',
  10: 'רדיודיסק',
  11: 'גרירה + רדיודיסק',
};

export const APPEAL_STATUS_LABELS = {
  0: 'ממתין',
  1: 'בטיפול',
  4: 'סגור ללא תשלום',
  5: 'ממשיך',
};

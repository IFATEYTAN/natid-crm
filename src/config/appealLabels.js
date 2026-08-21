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

/**
 * call_closed_appeals.status — a distinct vocabulary from the open-appeals
 * status above (see srv.natid.co.il CLAUDE.md's "three status vocabularies"
 * note). 2/3/6 are the documented values (natid-schema column comment);
 * 1/4/5 are carried over from the open vocabulary since a small number of
 * rows are archived without transitioning through a "closed" status first.
 */
export const CLOSED_APPEAL_STATUS_LABELS = {
  1: 'בטיפול',
  2: 'טופל',
  3: 'בוטל',
  4: 'ממתין לתשלום',
  5: 'המשך טיפול',
  6: 'בוטל במקום',
};

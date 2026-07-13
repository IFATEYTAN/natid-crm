/**
 * statusTransitions.js
 * -------------------------------------------------------
 * מקור האמת היחיד למעברי סטטוס ידניים של קריאה (מוקדן/מנהל).
 *
 * הגדרת הלקוח (דורית, נתי גרופ, 13.7):
 *   "צריך שיופיע רק מה שניתן ללחוץ" — בכל שלב מציגים רק את
 *   הצעדים הבאים האפשריים, לא את כל הסטטוסים פרוסים:
 *   - שובץ ספק           → ספק הגיע ללקוח, ביטול פניה
 *   - ספק הגיע ללקוח     → ספק הגיע לאחסנה / ליעד (סגירה), ביטול קריאה
 *   - ספק הגיע ליעד      → סגירת קריאה או ביטול קריאה
 *   - ספק הגיע לאחסנה    → המשך לאחסנה נוספת / יעד סופי (סגירה), ביטול קריאה
 *
 * הערות מיפוי:
 * - "ספק הגיע ליעד" אינו סטטוס נפרד — הגעה ליעד הסופי נרשמת דרך
 *   סגירת קריאה (closingStatuses: tow_done), ואחסנה דרך in_storage.
 * - בחירת completed פותחת את דיאלוג סטטוסי הסגירה (לא כתיבה ישירה).
 * - בחירת cancelled פותחת את דיאלוג ביטול הקריאה (כללי עירבון).
 * - המשך לאחסנה נוספת נעשה דרך סגירה ("גרר לאחסנה") או קריאת המשך
 *   ("שבץ ספק" → המשך עם ספק נוסף).
 * -------------------------------------------------------
 */

// אילו סטטוסים מותר להציע ידנית מכל סטטוס נוכחי. סטטוס שאינו במפה —
// לא מסננים (fallback להצגת הכל) כדי לא לחסום מצב לא-צפוי.
export const STATUS_TRANSITIONS = {
  waiting_treatment: ['awaiting_assignment', 'future_service', 'in_followup', 'cancelled'],
  awaiting_assignment: ['waiting_treatment', 'future_service', 'cancelled'],
  // שובץ ספק → רק "ספק הגיע ללקוח" + ביטול (הגדרת דורית)
  assigning: ['vendor_arrived', 'cancelled'],
  vendor_enroute: ['vendor_arrived', 'cancelled'],
  // ספק הגיע ללקוח → אחסנה / סגירה (=הגיע ליעד) / ביטול
  vendor_arrived: ['in_storage', 'completed', 'cancelled'],
  in_progress: ['in_storage', 'completed', 'cancelled'],
  // באחסנה → סגירה (אחסנה נוספת / יעד סופי דרך סטטוסי הסגירה) / ביטול
  in_storage: ['completed', 'cancelled'],
  cannot_complete: ['waiting_treatment', 'completed', 'cancelled'],
  future_service: ['waiting_treatment', 'cancelled'],
  in_followup: ['waiting_treatment', 'completed', 'cancelled'],
  continued_treatment: ['vendor_arrived', 'cancelled'],
  awaiting_payment: ['completed'],
  completed: [],
  cancelled: [],
};

// תוויות הקשריות למעבר (שונות מתווית המצב עצמו) — לפי הניסוח של דורית.
export const TRANSITION_LABELS = {
  vendor_arrived: 'ספק הגיע ללקוח',
  in_storage: 'ספק הגיע לאחסנה',
  completed: 'סגירת קריאה',
  cancelled: 'ביטול פניה',
};

/** רשימת המעברים המותרים מסטטוס נתון, או null אם הסטטוס לא ממופה. */
export const getAllowedTransitions = (status) => STATUS_TRANSITIONS[status] || null;

/** האם מותר להציע מעבר ידני from → to. סטטוס לא ממופה אינו נחסם. */
export const canTransition = (from, to) => {
  const allowed = STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : true;
};

/** תווית מעבר: תווית הקשרית אם קיימת, אחרת תווית הסטטוס הרגילה. */
export const getTransitionLabel = (statusKey, fallbackLabels = {}) =>
  TRANSITION_LABELS[statusKey] || fallbackLabels[statusKey] || statusKey;

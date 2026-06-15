/**
 * closingStatuses.js
 * -------------------------------------------------------
 * מקור האמת היחיד לסטטוסי סגירת קריאה (תוצאת הטיפול).
 *
 * כל סטטוס מגדיר:
 * - key                 : מפתח השמור בשדה Call.closing_status
 * - label               : תווית בעברית לבורר הסגירה
 * - resultingStatus     : ל-call_status שאליו עוברת הקריאה בעת הסגירה
 * - isFinal             : סיום סופי ללא צורך בהמשכיות
 * - sendsSms            : האם נשלח SMS ללקוח
 * - smsText             : נוסח ה-SMS ללקוח (TODO: נוסחים סופיים מהלקוח במייל)
 * - createsContinuation : האם להזניק אוטומטית קריאת המשך מקושרת
 * - continuationCategory: service_category של קריאת ההמשך
 * - isStorage           : מצב החזקה באחסנה (גרירת המשך תיפתח ידנית בהמשך)
 *
 * הגדרת הלקוח (דורית, נתי גרופ):
 *   המשך אוטומטי: 2,3,5,6  |  סיום: 1,4  |  אחסנה (ללא SMS): 7
 * -------------------------------------------------------
 */

// TODO: להחליף את נוסחי ה-SMS בנוסחים הסופיים שיגיעו מהלקוח במייל.
const PLACEHOLDER = '⚠️ נוסח SMS זמני — להחלפה בנוסח הסופי מהלקוח';

export const CLOSING_STATUSES = [
  {
    key: 'mobile_done',
    label: 'ניידת שירות סיימה (התנעה / החלפת מצבר / החלפת גלגל)',
    resultingStatus: 'completed',
    isFinal: true,
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: false,
  },
  {
    key: 'mobile_failed_evac',
    label: 'ניידת לא צלחה — בוצע פינוי לפלטפורמה',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  {
    key: 'mobile_failed_send',
    label: 'ניידת לא צלחה — יש לשלוח ניידת / גרר',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  {
    key: 'tow_done',
    label: 'גרר הגיע ליעד הסופי בהצלחה',
    resultingStatus: 'completed',
    isFinal: true,
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: false,
  },
  {
    key: 'tow_failed_complex',
    label: 'גרר לא הצליח — מקרה מורכב, יישלח גרר מותאם',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  {
    key: 'extraction_continue',
    label: 'לאחר חילוץ / חניון תת-קרקעי — גרירת המשך',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  {
    key: 'tow_to_storage',
    label: 'גרר לאחסנה',
    resultingStatus: 'in_storage',
    sendsSms: false, // לפי הגדרת הלקוח — ללא SMS ללקוח
    createsContinuation: false, // מצב החזקה; גרירת המשך תיפתח ידנית בהמשך
    isStorage: true,
  },
];

export const CLOSING_STATUS_MAP = Object.fromEntries(CLOSING_STATUSES.map((s) => [s.key, s]));

export const getClosingStatus = (key) => CLOSING_STATUS_MAP[key] || null;

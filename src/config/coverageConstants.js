/**
 * Shared coverage area labels and definitions.
 * Used across vendor forms, tables, maps, and dashboards.
 */
export const coverageLabels = {
  center: 'מרכז',
  sharon: 'שרון',
  north: 'צפון',
  south: 'דרום',
  jerusalem: 'ירושלים',
  lowlands: 'שפלה',
};

/**
 * Full coverage area definitions with cities per region.
 */
export const coverageAreas = [
  {
    key: 'center',
    label: 'מרכז',
    cities: [
      'תל אביב',
      'רמת גן',
      'גבעתיים',
      'בני ברק',
      'פתח תקווה',
      'ראשון לציון',
      'חולון',
      'בת ים',
    ],
  },
  {
    key: 'sharon',
    label: 'שרון',
    cities: ['נתניה', 'הרצליה', 'רעננה', 'כפר סבא', 'הוד השרון', 'רמת השרון'],
  },
  {
    key: 'north',
    label: 'צפון',
    cities: ['חיפה', 'עכו', 'נהריה', 'קריות', 'טבריה', 'צפת', 'נצרת'],
  },
  {
    key: 'south',
    label: 'דרום',
    cities: ['באר שבע', 'אשדוד', 'אשקלון', 'אילת', 'דימונה', 'קריית גת'],
  },
  {
    key: 'jerusalem',
    label: 'ירושלים והסביבה',
    cities: ['ירושלים', 'בית שמש', 'מודיעין', 'מעלה אדומים'],
  },
  {
    key: 'lowlands',
    label: 'שפלה',
    cities: ['רחובות', 'נס ציונה', 'לוד', 'רמלה', 'יבנה', 'גדרה'],
  },
];

/**
 * Translate a coverage area key to its Hebrew label.
 * Falls back to the raw key if not found.
 */
export const getCoverageLabel = (key) => coverageLabels[key] || key;

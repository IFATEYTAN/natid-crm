import { describe, it, expect } from 'vitest';
import {
  STATUS_TRANSITIONS,
  TRANSITION_LABELS,
  getAllowedTransitions,
  canTransition,
  getTransitionLabel,
} from '@/config/statusTransitions';
import { statusLabels } from '@/components/config/labels';

// הגדרת דורית (נתי גרופ, 13.7) — הזרימה המדורגת:
// שובץ ספק → ספק הגיע ללקוח + ביטול; הגיע ללקוח → אחסנה/סגירה + ביטול;
// באחסנה → סגירה (אחסנה נוספת/יעד סופי) + ביטול.
describe('STATUS_TRANSITIONS — הזרימה המדורגת של דורית', () => {
  it('שובץ ספק → רק "ספק הגיע ללקוח" + ביטול', () => {
    expect(STATUS_TRANSITIONS.assigning).toEqual(['vendor_arrived', 'cancelled']);
  });

  it('ספק בדרך → רק "ספק הגיע ללקוח" + ביטול', () => {
    expect(STATUS_TRANSITIONS.vendor_enroute).toEqual(['vendor_arrived', 'cancelled']);
  });

  it('ספק הגיע ללקוח → אחסנה / המתנה לשיחת סגירה / סגירה / ביטול בלבד', () => {
    expect(STATUS_TRANSITIONS.vendor_arrived).toEqual([
      'in_storage',
      'awaiting_closure_call',
      'completed',
      'cancelled',
    ]);
  });

  it('ממתין לשיחת סגירה → סגירה / ביטול בלבד (מצב הלבן של נתי)', () => {
    expect(STATUS_TRANSITIONS.awaiting_closure_call).toEqual(['completed', 'cancelled']);
  });

  it('באחסנה → סגירה / ביטול בלבד', () => {
    expect(STATUS_TRANSITIONS.in_storage).toEqual(['completed', 'cancelled']);
  });

  it('קריאה סגורה או מבוטלת — אין מעברים ידניים', () => {
    expect(STATUS_TRANSITIONS.completed).toEqual([]);
    expect(STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it('כל סטטוס שמוצג ב-UI ממופה במפת המעברים (אין סטטוס שנשמט)', () => {
    for (const key of Object.keys(statusLabels)) {
      expect(STATUS_TRANSITIONS, `סטטוס UI לא ממופה: "${key}"`).toHaveProperty(key);
    }
    // וגם הסטטוס התפעולי שאינו בבורר התצוגה
    expect(STATUS_TRANSITIONS).toHaveProperty('cannot_complete');
  });

  it('אף מפתח יעד אינו מומצא — כל יעד הוא סטטוס קיים', () => {
    for (const [from, targets] of Object.entries(STATUS_TRANSITIONS)) {
      for (const to of targets) {
        expect(statusLabels, `יעד לא מוכר "${to}" מ-"${from}"`).toHaveProperty(to);
      }
    }
  });

  it('אין מעבר-עצמי (סטטוס שמציע את עצמו)', () => {
    for (const [from, targets] of Object.entries(STATUS_TRANSITIONS)) {
      expect(targets, `מעבר עצמי ב-"${from}"`).not.toContain(from);
    }
  });

  it('ביטול זמין מכל סטטוס פתוח, כולל "המתנה לחיוב" (תיקון Bugbot ‎#181)', () => {
    for (const [status, targets] of Object.entries(STATUS_TRANSITIONS)) {
      if (status === 'completed' || status === 'cancelled') continue;
      expect(targets, `סטטוס "${status}" אינו מציע ביטול`).toContain('cancelled');
    }
    expect(STATUS_TRANSITIONS.awaiting_payment).toContain('completed');
  });
});

describe('canTransition', () => {
  it('מאשר מעבר חוקי', () => {
    expect(canTransition('assigning', 'vendor_arrived')).toBe(true);
  });

  it('חוסם מעבר לא חוקי (שובץ ספק ← סגירה ישירה)', () => {
    expect(canTransition('assigning', 'completed')).toBe(false);
  });

  it('סטטוס לא ממופה אינו נחסם (fallback פתוח)', () => {
    expect(canTransition('some_unknown_status', 'completed')).toBe(true);
  });
});

describe('getAllowedTransitions', () => {
  it('מחזיר את רשימת המעברים לסטטוס ממופה', () => {
    expect(getAllowedTransitions('vendor_arrived')).toEqual([
      'in_storage',
      'awaiting_closure_call',
      'completed',
      'cancelled',
    ]);
  });

  it('מחזיר null לסטטוס לא ממופה (מפעיל fallback בקומפוננטות)', () => {
    expect(getAllowedTransitions('some_unknown_status')).toBeNull();
  });
});

describe('getTransitionLabel — תוויות הקשריות', () => {
  it('מעבר ל-vendor_arrived מוצג כ"ספק הגיע ללקוח"', () => {
    expect(getTransitionLabel('vendor_arrived')).toBe('ספק הגיע ללקוח');
  });

  it('מעבר ל-in_storage מוצג כ"ספק הגיע לאחסנה"', () => {
    expect(getTransitionLabel('in_storage')).toBe('ספק הגיע לאחסנה');
  });

  it('מעבר ל-completed מוצג כ"סגירת קריאה"', () => {
    expect(getTransitionLabel('completed')).toBe('סגירת קריאה');
  });

  it('מעבר ל-cancelled מוצג כ"ביטול פניה"', () => {
    expect(getTransitionLabel('cancelled')).toBe('ביטול פניה');
  });

  it('סטטוס בלי תווית הקשרית נופל לתווית ה-fallback שסופקה', () => {
    const mockFallback = { waiting_treatment: 'ממתין לטיפול' };
    expect(getTransitionLabel('waiting_treatment', mockFallback)).toBe('ממתין לטיפול');
  });

  it('בלי תווית הקשרית ובלי fallback — מוחזר המפתח עצמו', () => {
    expect(getTransitionLabel('waiting_treatment')).toBe('waiting_treatment');
  });

  it('כל התוויות ההקשריות מפנות לסטטוסים קיימים', () => {
    for (const key of Object.keys(TRANSITION_LABELS)) {
      expect(statusLabels).toHaveProperty(key);
    }
  });
});

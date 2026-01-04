/**
 * Natid CRM Design System
 * מערכת עיצוב אחידה עם צבעים עדינים לכל המערכת
 */

export const colors = {
  // Primary Colors - גוונים עדינים של אדום/ורוד
  primary: {
    50: '#FFF5F5',   // רקע עדין מאוד
    100: '#FFE8E8',  // רקע עדין
    200: '#FFD1D1',  // גבול עדין
    300: '#FFB3B3',  // hover עדין
    400: '#FF8A8A',  // אלמנטים משניים
    500: '#FF6B6B',  // צבע ראשי - אדום עדין
    600: '#E85555',  // hover עיקרי
    700: '#D14343',  // לחוץ
    800: '#B93333',  // כהה
    900: '#9E2828',  // כהה מאוד
  },

  // Secondary Colors - גוונים עדינים של כחול/תכלת
  secondary: {
    50: '#F0F9FF',   // רקע עדין מאוד
    100: '#E0F2FE',  // רקע עדין
    200: '#B9E6FE',  // גבול עדין
    300: '#7DD3FC',  // אלמנטים משניים
    400: '#38BDF8',  // hover
    500: '#0EA5E9',  // צבע משני ראשי - תכלת
    600: '#0284C7',  // hover משני
    700: '#0369A1',  // לחוץ
    800: '#075985',  // כהה
    900: '#0C4A6E',  // כהה מאוד
  },

  // Success Colors - גוונים עדינים של ירוק
  success: {
    50: '#F0FDF4',   // רקע עדין מאוד
    100: '#DCFCE7',  // רקע עדין
    200: '#BBF7D0',  // גבול עדין
    300: '#86EFAC',  // אלמנטים משניים
    400: '#4ADE80',  // hover
    500: '#22C55E',  // ירוק עדין
    600: '#16A34A',  // hover ירוק
    700: '#15803D',  // לחוץ
    800: '#166534',  // כהה
    900: '#14532D',  // כהה מאוד
  },

  // Warning Colors - גוונים עדינים של כתום
  warning: {
    50: '#FFFBEB',   // רקע עדין מאוד
    100: '#FEF3C7',  // רקע עדין
    200: '#FDE68A',  // גבול עדין
    300: '#FCD34D',  // אלמנטים משניים
    400: '#FBBF24',  // hover
    500: '#F59E0B',  // כתום עדין
    600: '#D97706',  // hover כתום
    700: '#B45309',  // לחוץ
    800: '#92400E',  // כהה
    900: '#78350F',  // כהה מאוד
  },

  // Error Colors - גוונים עדינים של אדום שגיאה
  error: {
    50: '#FEF2F2',   // רקע עדין מאוד
    100: '#FEE2E2',  // רקע עדין
    200: '#FECACA',  // גבול עדין
    300: '#FCA5A5',  // אלמנטים משניים
    400: '#F87171',  // hover
    500: '#EF4444',  // אדום עדין לשגיאות
    600: '#DC2626',  // hover אדום
    700: '#B91C1C',  // לחוץ
    800: '#991B1B',  // כהה
    900: '#7F1D1D',  // כהה מאוד
  },

  // Info Colors - גוונים עדינים של סגול/כחול
  info: {
    50: '#F5F3FF',   // רקע עדין מאוד
    100: '#EDE9FE',  // רקע עדין
    200: '#DDD6FE',  // גבול עדין
    300: '#C4B5FD',  // אלמנטים משניים
    400: '#A78BFA',  // hover
    500: '#8B5CF6',  // סגול עדין
    600: '#7C3AED',  // hover סגול
    700: '#6D28D9',  // לחוץ
    800: '#5B21B6',  // כהה
    900: '#4C1D95',  // כהה מאוד
  },

  // Neutral Colors - גוונים אפורים עדינים
  neutral: {
    50: '#FAFAFA',   // רקע הבהיר ביותר
    100: '#F5F5F5',  // רקע עדין
    200: '#E5E5E5',  // גבולות עדינים
    300: '#D4D4D4',  // גבולות
    400: '#A3A3A3',  // טקסט משני
    500: '#737373',  // טקסט רגיל
    600: '#525252',  // טקסט כהה
    700: '#404040',  // טקסט כהה מאוד
    800: '#262626',  // טקסט ראשי
    900: '#171717',  // שחור כמעט
  },

  // Chart Colors - צבעים עדינים לגרפים
  chart: {
    1: '#FF6B6B',  // אדום עדין
    2: '#4ECDC4',  // תכלת עדין
    3: '#45B7D1',  // כחול עדין
    4: '#FFA07A',  // כתום עדין
    5: '#98D8C8',  // ירוק ים עדין
    6: '#F7B731',  // צהוב עדין
    7: '#5F27CD',  // סגול עדין
    8: '#00D2D3',  // ציאן עדין
    9: '#FF6348',  // אדום-כתום עדין
    10: '#1DD1A1', // ירוק מנטה עדין
  },

  // Status Colors - צבעים לסטטוסים
  status: {
    waiting: {
      bg: '#FFFBEB',
      text: '#D97706',
      border: '#FCD34D',
    },
    assigned: {
      bg: '#E0F2FE',
      text: '#0284C7',
      border: '#7DD3FC',
    },
    enRoute: {
      bg: '#DDD6FE',
      text: '#7C3AED',
      border: '#C4B5FD',
    },
    inProgress: {
      bg: '#DBEAFE',
      text: '#2563EB',
      border: '#93C5FD',
    },
    completed: {
      bg: '#DCFCE7',
      text: '#16A34A',
      border: '#86EFAC',
    },
    cancelled: {
      bg: '#FEE2E2',
      text: '#DC2626',
      border: '#FCA5A5',
    },
  },
};

// Typography Scale
export const typography = {
  fontFamily: {
    primary: "'Heebo', 'Assistant', Arial, sans-serif",
    mono: "'Courier New', monospace",
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing Scale
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  base: '0.5rem',  // 8px
  md: '0.75rem',   // 12px
  lg: '1rem',      // 16px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  full: '9999px',
};

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

// Transitions
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
};

// Z-Index Scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
};

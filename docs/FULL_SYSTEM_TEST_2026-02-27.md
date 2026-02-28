# דוח בדיקת מערכת מלאה - 2026-02-27

## סיכום מנהלים
- סטטוס כללי: ⚠️ יש ממצאים
- בנייה: ✅ תקין (אחרי תיקון 4 unused imports)
- הרשאות: ⚠️ ממצאים בינוניים
- אבטחה: ❌ ממצאים קריטיים
- פורטל ספקים: ⚠️ ממצאים בינוניים
- RTL ונגישות: ⚠️ ממצאים רבים
- Hooks & Queries: ⚠️ ממצאים בינוניים
- ביקורת קוד: ⚠️ ממצאים חשובים

---

## 1. בנייה (CI/Build Check) ✅

### תוצאות
- **lint:** ✅ עובר (אחרי תיקון 4 שגיאות unused-imports)
- **build:** ✅ עובר (Vite build הצליח)
- **format:** לא נבדק (חסר globals package)
- **typecheck:** לא נבדק

### תיקונים שבוצעו
1. `src/components/reports/Annual2025Report.jsx` - הוסר import של `Wrench` שלא בשימוש
2. `src/components/reports/Fleet2025Report.jsx` - הוסרו imports של `PieChart`, `Pie`, `Cell` שלא בשימוש

---

## 2. ביקורת אבטחה (Security Audit) ❌

### ממצאים קריטיים (5)

| # | ממצא | קובץ |
|---|------|------|
| C1 | `99digitalBot.ts` - אין אימות כלל! Webhook ציבורי שיוצר קריאות שירות | `functions/99digitalBot.ts` |
| C2 | `externalCrmWebhook.ts` - בדיקת secret מדולגת אם env var חסר | `functions/externalCrmWebhook.ts` |
| C3 | `sendFeedbackSMS.ts` - אין אימות, מאפשר שליחת SMS ללא הרשאה | `functions/sendFeedbackSMS.ts` |
| C4 | `validateAndSubmitFeedback.ts` - endpoint ציבורי ללא rate limiting | `functions/validateAndSubmitFeedback.ts` |
| C5 | 4 פונקציות ללא auth: `analyzeVendorPerformance`, `calculateDistanceAndETA`, `predictCallTimes`, `recommendVendor` | `functions/` |

### ממצאים בינוניים (7)

| # | ממצא |
|---|------|
| M1 | פונקציות מערכת (`checkAndSendNotifications`, `detectSmartAlerts`) ללא auth |
| M2 | `checkContractExpiry.ts` - ללא auth, יכול לשנות סטטוס חוזים |
| M3 | דף `EditCustomer` חסר מהגדרות הרשאות - נגיש לכל המשתמשים |
| M4 | הודעות שגיאה חושפות פרטים פנימיים בכל הפונקציות |
| M5 | `VITE_BOT_API_KEY` חשוף בקוד צד-לקוח |
| M6 | `BOT_WEBHOOK_SECRET` לא מתועד ב-.env.example |
| M7 | רשימת משתמשים מלאה נטענת בצד-לקוח ומסוננת ב-JS |

### ממצאים נמוכים (5)
- `dangerouslySetInnerHTML` בקומפוננט chart (נתונים סטטיים)
- `console.log` עם נתוני email בצד לקוח
- `Math.random()` ליצירת webhook secret (לא cryptographically secure)
- ניהול secrets תקין באופן כללי
- `VendorPricing` רשום בהרשאות אבל אין דף מתאים

---

## 3. פורטל ספקים (Vendor Portal Check) ⚠️

### מה עובד טוב
- ✅ הגנת דפים מוגדרת נכון - ספקים יכולים לגשת רק ל-4 דפים
- ✅ RoleGuard + PermissionsContext אוכפים הרשאות ברמת route
- ✅ בדיקות ownership קיימות בפונקציות: `updateVendorLocation`, `updateVendorStatus`, `handleAssignmentResponse`, `submitVendorRating`, `sendCallStatusUpdate`
- ✅ בידוד התראות - התראות נשלחות רק לספק הרלוונטי
- ✅ מניעת דירוג עצמי - ספקים לא יכולים לדרג את עצמם
- ✅ פונקציה מאובטחת `getVendorScopedData.ts` קיימת

### ממצאים

| # | חומרה | ממצא |
|---|--------|------|
| 1 | בינוני | `analyzeVendorPerformance.ts` - אין auth כלל, כל משתמש יכול לבקש נתוני ביצועים של כל ספק |
| 2 | בינוני | דפי פורטל ספקים משתמשים בשאילתות client-side ישירות במקום בפונקציה המאובטחת `getVendorScopedData` |
| 3 | נמוך | hook `useVendorScopedData` קיים אבל לא בשימוש - קוד מת |
| 4 | נמוך | `sendFeedbackSMS.ts` ללא auth check |

---

## 4. RTL ונגישות (RTL & Accessibility Check) ⚠️

### כיווניות RTL

| קלאס LTR | מופעים | קבצים | קלאס RTL מתאים |
|-----------|--------|-------|----------------|
| `ml-*` | **73** | 39 | `ms-*` (2 בשימוש) |
| `mr-*` | **26** | 19 | `me-*` (8 בשימוש) |
| `pl-*` | **21** | 9 | `ps-*` (0 בשימוש) |
| `pr-*` | **41** | 27 | `pe-*` (7 בשימוש) |
| `left-*` | **22** | 14 | `start-*` (1 בשימוש) |
| `right-*` | **55** | 39 | `end-*` (0 בשימוש) |
| `text-left` | **14** | 14 | `text-start` |
| `text-right` | **137** | 41 | `text-end` |
| `border-l/r` | **18** | 10 | `border-s/e` |
| `rounded-l/r` | **5** | 2 | `rounded-s/e` |

**סה"כ ~422 מופעים של קלאסים LTR hardcoded**

### נגישות

| בעיה | מספר |
|------|------|
| כפתורי אייקון ללא aria-label | **64** (מתוך 66) |
| טקסטים sr-only באנגלית (צריכים עברית) | **7** |
| טקסט Pagination באנגלית (Previous/Next) | **4** |
| inputs ללא htmlFor/id association | **~261** (מתוך 279) |
| תמונות ללא alt | **0** ✅ |
| דיאלוגים - מטופל ע"י Radix | ✅ |

### טקסט עברי
- ✅ פונטים עבריים (Heebo + Assistant) מוגדרים
- ✅ `dir="rtl"` מוגדר ב-HTML root
- ⚠️ ~13 placeholders באנגלית (חלקם לגיטימיים)
- ⚠️ AccessibilityWidget עם aria-label באנגלית

---

## 5. אנליטיקס (Codebase Analytics)

### סטטיסטיקות מפתח

| מטריקה | ערך |
|--------|-----|
| קבצי מקור | **317** |
| שורות קוד (src/) | **66,469** |
| שורות קוד (functions/) | **4,330** |
| **סה"כ שורות קוד** | **~70,800** |
| קומפוננטות | 171 (63 UI + 108 business) |
| דפים | 47 (כולם רשומים) |
| Hooks | 21 (5 shared + 16 feature) |
| פונקציות Backend | 32 |
| Feature modules | 10 |
| תלויות production | 72 |
| תלויות dev | 29 |
| בדיקות | 12 קבצים |

### 10 הקבצים הגדולים ביותר

| # | קובץ | שורות |
|---|------|-------|
| 1 | `src/demo/demoData.js` | 3,720 |
| 2 | `src/features/dashboard/index.jsx` | 1,065 |
| 3 | `src/components/queue/ShiftScheduleTab.jsx` | 745 |
| 4 | `src/pages/AdvancedExport.jsx` | 727 |
| 5 | `src/features/cases/CaseDetails.jsx` | 722 |
| 6 | `src/components/call-details/CallDetailsInfoTab.jsx` | 710 |
| 7 | `src/features/vendors/index.jsx` | 709 |
| 8 | `src/pages/QueueMonitor.jsx` | 705 |
| 9 | `src/pages/HistoricalDataAnalysis.jsx` | 699 |
| 10 | `src/components/ui/ExportMenu.jsx` | 689 |

### קבצים יתומים

| סוג | כמות |
|-----|------|
| קומפוננטות UI לא בשימוש | **17** |
| קומפוננטות business לא בשימוש | **4** |
| Hooks לא בשימוש | **3** |
| דפים לא בשימוש | **0** ✅ |

### תלויות כפולות
- `moment` + `date-fns` (שתי ספריות תאריכים)
- `chart.js` + `recharts` (שתי ספריות גרפים)
- `react-hot-toast` + `sonner` (שתי ספריות toast)
- `three.js` - ספרייה כבדה, לבדוק אם בשימוש
- `lodash` - להחליף ב-`lodash-es` ל-tree-shaking

### דפוסי קוד
- TODO/FIXME/HACK: **1 בלבד** ✅
- console.log (frontend): **2** בלבד ✅
- console.log (backend): **16** (רובם בטיפול שגיאות)
- שימוש ב-path alias `@/`: **93%** ✅

---

## 6. Hooks & Queries ⚠️

### סטטיסטיקות
| מטריקה | ערך |
|--------|-----|
| useQuery calls | **179** (83 קבצים) |
| useMutation calls | **96** (45 קבצים) |
| קבוצות queryKeys מרכזיות | **28** |
| feature hooks | **8** (כולם מייצאים דרך index.js) ✅ |

### שימוש ב-queryKeys מרכזיים
- **13 הפרות** של inline query keys (כולן ב-src/components/)
- דפים ו-features משתמשים נכון ב-queryKeys ✅

קבצים עם inline keys:
- `VendorPortalAdminTab.jsx`, `VendorRecommendation.jsx`, `VendorAIInsights.jsx`
- `VendorLiveMap.jsx` (2 מופעים), `CompanyReport.jsx`
- `Fleet2025Report.jsx`, `Annual2025Report.jsx`, `FinancialReport.jsx` (3 מופעים)
- `RemindersList.jsx` (2 מופעים)

### כפילויות
- **`useAuth` מוגדר בשני קבצים:** `src/lib/AuthContext.jsx` ו-`src/providers/AuthProvider.jsx`

### טיפול בשגיאות
- **18 mutations ללא onError** (מתוך 96) - Cases, Queue, Users, Settings
- Global handler רק מדפיס ל-console, ללא toast למשתמש
- 3+ קומפוננטות מציגות data ריק ללא בדיקת שגיאה

### Cache Invalidation
- **2 mutations ללא invalidation כלל:** `useCreateCallHistory`, `useCreateNotification`
- **4 callsites עם params חסרים:** `queryKeys.queue.my()`, `queryKeys.vendors.calls()`, `queryKeys.vendors.myProfile()` - גורמים ל-undefined ב-keys ומונעים invalidation נכון

### Query Options
- **27+ queries ללא staleTime** - מביאים refetch בכל mount
- **Polling מיותר:** `EnhancedCallChat` עושה poll כל 3 שניות + real-time subscription (מיותר)
- **33 queries עם polling** - חלקם אגרסיביים מדי

---

## 7. ביקורת קוד (Code Review) ⚠️

### React Patterns

**Business logic בקומפוננטות (חמור):**
- `Dashboard.jsx` (446 שורות) - מחשב 14+ KPIs ישירות ב-render ללא useMemo
- `AdvancedExport.jsx` (727 שורות) - לוגיקת CSV/Excel/download ישירות בקומפוננט
- `CallDetails.jsx` - קורא ל-`base44.entities.Call` ישירות במקום `useCalls` hook

**useEffect שצריך להיות React Query:**
- `features/dashboard/index.jsx` - fetches `base44.auth.me()` ב-useEffect
- `PermissionsContext.jsx` - ניהול state ידני במקום React Query
- `VendorPortal.jsx` - fetch ב-useEffect עם try/catch

**3 קריאות מיותרות ל-`base44.auth.me()`** ב-3 קבצים שונים

### ביצועים

**pages.config.js טוען את כל 47 הדפים eagerly (חמור):**
- כל ה-imports הם ישירים, לא `React.lazy()`
- רק `LandingPage` נטען lazy
- המרה ל-lazy תקטין משמעותית את ה-bundle הראשוני

**קומפוננטות גדולות לפיצול:** 9 קבצים מעל 600 שורות

**חיובי:** שימוש טוב ב-`React.lazy` בתוך דפים (Dashboard, CallDetails, Reports)

### איכות קוד

**קוד כפול (חמור):**
- `cn()` מוגדר ב-2 מקומות עם התנהגות שונה!
  - `src/lib/utils.js` - clsx + tailwind-merge (84 קבצים)
  - `src/components/utils.jsx` - filter(Boolean).join(' ') (41 קבצים)
- `openStatuses` מוגדר ב-3 מקומות - **ב-features/dashboard רק 5 מ-11 סטטוסים (באג!)**
- `availabilityColors` מוגדר ב-6 מקומות
- `statusOptions` מוגדר ב-6+ מקומות
- `COLORS` (צבעי גרפים) מוגדר ב-9 מקומות עם ערכים שונים

**קבצים כפולים:**
- `src/components/maps/mapUtils.jsx` + `mapUtils.js` - כמעט זהים
- `src/features/utils.jsx` - עותק מת של `src/components/utils.jsx`
- `src/lib/AuthContext.jsx` - עותק מת, לא מיובא

**384 צבעי hex hardcoded** ב-30+ קבצים במקום שימוש ב-Tailwind palette

### מבנה Feature Modules

**מודולים מתים (חמור):**
- `src/features/dashboard/` - 1065 שורות, **לא מיובא כלל!** (Dashboard פועל מ-pages/)
- `src/features/operators/` - 388 שורות, לא מיובא

**Feature hooks לא בשימוש:** `useUsers`, `useCases`, `useReports`, `useSettings` - הדפים קוראים ל-base44 ישירות

**29 מ-47 דפים מדלגים על שכבת features** וקוראים ל-API ישירות

---

## פעולות נדרשות (לפי עדיפות)

### קריטי (חוסם שחרור)
1. הוסף אימות webhook ל-`99digitalBot.ts` - כרגע ציבורי לחלוטין!
2. תקן `externalCrmWebhook.ts` - fail closed כש-secret חסר
3. הוסף auth ל-`sendFeedbackSMS.ts` - מאפשר שליחת SMS ללא אימות
4. הוסף rate limiting ל-`validateAndSubmitFeedback.ts`
5. הוסף auth ל-4 פונקציות חסרות: `analyzeVendorPerformance`, `calculateDistanceAndETA`, `predictCallTimes`, `recommendVendor`
6. תקן queryKeys עם params חסרים: `queue.my()`, `vendors.calls()`, `vendors.myProfile()` - מונעים invalidation תקין

### חשוב (צריך לתקן בהקדם)
1. הוסף `EditCustomer` להגדרות הרשאות (`src/config/permissions.js`)
2. העבר `VITE_BOT_API_KEY` למשתנה backend-only
3. הוסף aria-label ל-64 כפתורי אייקון
4. תרגם sr-only text ו-pagination לעברית
5. החלף `Math.random()` ב-`crypto.getRandomValues()` ליצירת secrets
6. הוסף auth לפונקציות מערכת (notifications, alerts, contracts)
7. מנע חשיפת error.message בתגובות HTTP
8. הוסף onError handlers ל-18 mutations חסרי טיפול בשגיאות
9. הוסף invalidation ל-`useCreateCallHistory` ו-`useCreateNotification`
10. איחד `useAuth` - מוגדר ב-2 קבצים

### שיפור (לטפל בהזדמנות)
1. החלף ~99 שימושים ב-`ml-`/`mr-` ל-`ms-`/`me-` (RTL)
2. הסר 17 קומפוננטות UI לא בשימוש
3. הסר 4 קומפוננטות business לא בשימוש + 3 hooks לא בשימוש
4. העבר 13 inline query keys ל-queryKeys.js מרכזי
5. איחוד ספריות כפולות (moment→date-fns, chart.js→recharts, react-hot-toast→sonner)
6. בדוק צורך ב-three.js
7. החלף lodash ב-lodash-es
8. פצל קבצים מעל 700 שורות (6 קבצים)
9. העבר דפי פורטל ספקים לשימוש ב-`useVendorScopedData`
10. הוסף htmlFor/id pairs לטפסים (~261 inputs חסרים)
11. הסר polling מיותר ב-`EnhancedCallChat` (יש כבר real-time subscription)
12. הוסף staleTime ל-27+ queries שמביאים refetch בכל mount

---

## אוטומציה שנוספה בסשן זה

### SessionStart Hook
- **קובץ:** `scripts/session-start.sh`
- **מה עושה:** בדיקת בריאות מהירה + הצגת skills זמינים
- **הגדרה:** `.claude/settings.json` → hooks.SessionStart

### עדכון CLAUDE.md
- טבלאות Skills מסודרות לפי סוג (Core / Analysis / Utility)
- הוראות auto-trigger ברורות לכל skill
- סקשן חדש "Automation & Hooks"

### תיקון Lint
- הוסרו 4 unused imports ב-2 קבצי reports

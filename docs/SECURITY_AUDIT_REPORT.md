# דוח ביקורת אבטחה ומערכת - NatID CRM

**תאריך:** 2026-02-10
**סוג:** ביקורת אבטחה, הרשאות, UI, כפילויות ולוגיקה מערכתית

---

## תקציר מנהלים

הביקורת כיסתה את כל שכבות המערכת: הרשאות ותפקידים, פונקציות צד-שרת, ממשק משתמש, כפילויות קוד וחיבורי לוגיקה.

| קטגוריה | קריטי | גבוה | בינוני | סה"כ |
|----------|--------|-------|--------|------|
| אבטחה והרשאות | 4 | 4 | 4 | 12 |
| זליגת מידע | 3 | 2 | 2 | 7 |
| באגי ממשק | 0 | 2 | 4 | 6 |
| כפילויות | 0 | 3 | 2 | 5 |
| לוגיקה מנותקת | 0 | 1 | 3 | 4 |
| **סה"כ** | **7** | **12** | **15** | **34** |

### תוצאות Build/Lint/TypeCheck
- **ESLint:** עובר ✅ (ללא שגיאות)
- **TypeCheck:** עובר ✅
- **Build (Vite):** עובר ✅

---

## 1. פירוט ממצאי אבטחה - קריטי 🔴

### 1.1 ספק יכול לעדכן מיקום של ספק אחר

**קובץ:** `functions/updateVendorLocation.ts:16-55`

**בעיה:** בדיקת תפקיד (role) קיימת, אבל **אין בדיקה שהספק מעדכן את עצמו בלבד**. כל ספק יכול לשלוח `vendor_id` של ספק אחר ולעדכן את המיקום שלו.

```typescript
// שורה 17: בודק רק תפקיד, לא בעלות
if (!['admin', 'vendor'].includes(user.role)) {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
const { vendor_id } = await req.json();
// ❌ חסר: if (user.email !== vendor.email) return 403
```

**סיכון:** זיוף מיקום GPS, הטעיית לקוחות לגבי מיקום הספק

**תיקון נדרש:** הוספת בדיקה `vendor.email === user.email` לפני עדכון

---

### 1.2 ספק יכול לשנות סטטוס זמינות של ספק אחר

**קובץ:** `functions/updateVendorStatus.ts:16-34`

**בעיה:** אותו כשל - בדיקת תפקיד בלבד ללא בדיקת בעלות.

```typescript
// שורה 16: בודק רק תפקיד
if (!['admin', 'vendor'].includes(user.role)) { ... }
const { vendor_id, status } = await req.json();
// ❌ ספק A יכול להגדיר את ספק B כ-offline
```

**סיכון:** ספק יכול להוציא מתחרים ממצב זמינות

---

### 1.3 ספק יכול לקבל/לדחות שיבוץ של ספק אחר

**קובץ:** `functions/handleAssignmentResponse.ts:16-36`

**בעיה:** הפונקציה מקבלת `attempt_id` אך **לא מוודאת שהספק המגיב הוא הספק ששובץ** ל-attempt הזה.

```typescript
const attempt = attempts[0];
// ❌ חסר: if (attempt.vendor_id !== currentVendorId) return 403
// ספק A יכול לקבל קריאות ששובצו לספק B
```

**סיכון:** גניבת קריאות, מניעת שירות מספקים אחרים

---

### 1.4 ספק יכול לשלוח עדכוני סטטוס לכל קריאה

**קובץ:** `functions/sendCallStatusUpdate.ts:20-36`

**בעיה:** כל משתמש עם role של vendor יכול לשלוח עדכון סטטוס לכל `call_id`, גם אם הקריאה לא משובצת אליו.

```typescript
const { call_id, status } = await req.json();
// ❌ חסר: בדיקה ש-call.assigned_vendor_id === currentVendor.id
```

**סיכון:** עדכוני סטטוס שקריים, בלבול לקוחות, שליחת SMS מטעה

---

### 1.5 botWebhook ללא אימות מקור

**קובץ:** `functions/botWebhook.ts:1-125`

**בעיה:** הפונקציה **לא מבצעת שום אימות** - לא auth, לא secret key, לא HMAC. כל אחד שיודע את ה-URL יכול ליצור קריאות שירות.

```typescript
// אין בדיקת auth.me()
// אין בדיקת webhook secret
const data = await req.json();
const newCall = await base44.asServiceRole.entities.Call.create(callData);
```

**השוואה:** `externalCrmWebhook.ts` כן מוודא secret - `botWebhook` לא.

**סיכון:** יצירת קריאות שירות מזויפות, הצפת המערכת

---

### 1.6 getFeedbackTokenInfo ללא אימות משתמש

**קובץ:** `functions/getFeedbackTokenInfo.ts:1-59`

**בעיה:** האנדפוינט חשוף לציבור ללא אימות. ניתן לבצע brute-force על טוקנים ולחשוף מידע לקוחות.

```typescript
// אין base44.auth.me()
const token = body.token;
// מחזיר: customer_first_name, service_date, vendor_name
```

**סיכון:** חשיפת שמות לקוחות ותאריכי שירות

---

### 1.7 submitVendorRating - כל משתמש מאומת יכול לדרג כל ספק

**קובץ:** `functions/submitVendorRating.ts:6-62`

**בעיה:** בדיקת auth בלבד, ללא בדיקה שהמדרג הוא הלקוח שקיבל שירות או שהקריאה שייכת לו.

```typescript
// שורה 6-10: רק בדיקת auth
if (!user) { return 401; }
// ❌ חסר: בדיקה שהקריאה שויכה ליוזר הזה
// ❌ חסר: בדיקת feedback token תקף
```

**סיכון:** מניפולציית דירוגים

---

## 2. פירוט ממצאי אבטחה - גבוה 🟠

### 2.1 מערכת הרשאות כפולה

**קבצים:**
- `src/config/permissions.js` - מערכת PAGE_PERMISSIONS מבוססת תפקיד (role-based)
- `src/components/permissions/PermissionsContext.jsx` - מערכת הרשאות גרנולרית (permission-based)

**בעיה:** שתי מערכות הרשאות מקבילות עם `PAGE_PERMISSIONS` מוגדר בשני מקומות:

| מערכת 1 (permissions.js) | מערכת 2 (PermissionsContext) |
|---------------------------|------------------------------|
| `Dashboard: ['admin', 'operator']` | `Dashboard: { category: 'monitoring', permission: 'queue' }` |
| בדיקת role ישירה | בדיקת permission גרנולרית |
| משמש ב-App.jsx + RoleGuard | משמש ב-PermissionsProvider |

**סיכון:** חוסר עקביות - דף יכול להיות חסום ברובד אחד ופתוח ברובד אחר

**תיקון:** לאחד למערכת אחת בלבד

---

### 2.2 סינון נתונים בצד הלקוח בלבד

**קבצים:**
- `src/features/calls/index.jsx:84` - טוען 500 קריאות
- `src/pages/Dashboard.jsx` - טוען כל הנתונים
- `src/pages/Reports.jsx` - טוען כל הנתונים

**בעיה:** כל הנתונים נטענים מהשרת לדפדפן, והסינון מתבצע בצד הלקוח. משתמש vendor שיבדוק את ה-Network tab יכול לראות נתונים של vendors אחרים.

```javascript
// useCalls.js - טוען הכל
queryFn: () => callsApi.getCalls(sort, 500)
// הסינון בצד הלקוח בלבד
```

**סיכון:** חשיפת מידע עסקי רגיש דרך כלי פיתוח

---

### 2.3 פונקציות backend ללא בדיקת role

**פונקציות לא מוגנות:**

| פונקציה | auth | role check | סיכון |
|----------|------|-----------|-------|
| `logAuditAction.ts` | ✅ | ❌ | כל משתמש יכול ליצור רשומות audit |
| `submitVendorRating.ts` | ✅ | ❌ | כל משתמש יכול לדרג כל ספק |
| `createNotification.ts` | ✅ | ❌ | כל משתמש יכול ליצור התראות |
| `sendNotification.ts` | ✅ | ❌ | כל משתמש יכול לשלוח התראות |
| `detectSmartAlerts.ts` | ✅ | ❌ | חסר role check |
| `botWebhook.ts` | ❌ | ❌ | **פתוח לחלוטין** |

**פונקציות מוגנות תקין:**

| פונקציה | auth | role check |
|----------|------|-----------|
| `autoAssignVendor.ts` | ✅ | ✅ admin/operator |
| `generateCallSummary.ts` | ✅ | ✅ admin/operator |
| `updateVendorStatus.ts` | ✅ | ✅ admin/vendor (אבל חסר ownership) |
| `handleAssignmentResponse.ts` | ✅ | ✅ admin/vendor (אבל חסר ownership) |
| `externalCrmWebhook.ts` | ✅ | ✅ secret validation |

---

### 2.4 תפקיד "Agent" (טכנאי) מוגדר בתיעוד אך לא ממומש

**בעיה:** ב-CLAUDE.md ו-SYSTEM_SPECIFICATION.md מוגדרים 4 תפקידים: Admin, Operator, Agent, Vendor.
ב-`permissions.js` מוגדרים רק 3: admin, operator, vendor.

**סיכון:** אם ייווצר משתמש עם role=agent, לא יהיו לו הרשאות מוגדרות ויקבל גישת ברירת מחדל

---

## 3. באגי ממשק (UI) 🟡

### 3.1 בעיות RTL - שוליים קשיחים

נמצאו **20+ מקרים** של שימוש ב-`ml-`, `mr-`, `pl-`, `pr-` במקום `ms-`, `me-`, `ps-`, `pe-` או `gap`/`space-x`:

| קובץ | שוליים שמאל/ימין קשיחים |
|-------|--------------------------|
| `src/pages/Dashboard.jsx` | `ml-2`, `mr-1`, `pl-10` |
| `src/pages/Calls.jsx` | `pr-9` |
| `src/pages/VendorTracking.jsx` | `pr-9` |
| `src/pages/UserProfile.jsx` | `pr-10`, `ml-2` |
| `src/pages/HistoricalDataAnalysis.jsx` | `pr-10` |
| `src/pages/ProductCatalog.jsx` | `pr-10`, `mr-2` |
| `src/pages/ServiceProviders.jsx` | `pr-10`, `ml-2` |
| `src/pages/CustomerFeedback.jsx` | `ml-2` |

**הערה:** ברוב המקרים הממשק עובד כי כל האפליקציה ב-RTL, אבל ב-Select ו-Dropdowns יש מקרים שה-padding לא סימטרי.

---

### 3.2 שימוש ב-window.location במקום React Router

**7 דפים** משתמשים ב-`window.location` ו-`URLSearchParams` ישירות:

| קובץ | שימוש |
|-------|--------|
| `src/pages/Dashboard.jsx` | `window.location.href` (ניווט) |
| `src/pages/CustomerFeedback.jsx` | `URLSearchParams(window.location.search)` |
| `src/pages/CustomerDetails.jsx` | `URLSearchParams(window.location.search)` |
| `src/pages/QueueMonitor.jsx` | `window.location.href` |
| `src/pages/VendorCallManagement.jsx` | `URLSearchParams(window.location.search)` |

**בעיה:** עוקף את React Router, גורם לטעינה מחדש של כל האפליקציה

**תיקון:** להשתמש ב-`useSearchParams()` ו-`useNavigate()` מ-React Router

---

### 3.3 חוסר טיפול בשגיאות ב-44 דפים

רוב הדפים לא מטפלים ב-`isError`/`error` מ-React Query:

- `Dashboard.jsx` - אין error handling למספר queries
- `Reports.jsx` - אין error handling
- `Calls.jsx` - אין error handling
- `VendorPortal.jsx` - חסר error state
- `MyVendorProfile.jsx` - חסר error state
- `RoleManagement.jsx` - חסר error state
- `AdminDisplaySettings.jsx` - חסר error state
- `AutomationSettings.jsx` - חסר error state

---

### 3.4 Accessibility - חוסר תמיכה בנגישות

- **0** שימושי `aria-label` בדפי האפליקציה
- **0** שימושי `role` attributes לקומפוננטות מותאמות
- **0** שימושי `tabIndex` לניווט מקלדת
- חסרים alt texts לאייקונים

---

### 3.5 קוד Debug בפרודקשן

```
src/pages/MyVendorProfile.jsx: console.log('Location updated:', location)
src/pages/CallDetails.jsx: console.log('Auto summary generation failed:', e)
```

---

## 4. כפילויות קוד 🔵

### 4.1 useAuditLog - שתי גרסאות לא תואמות

| גרסה | מיקום | יכולות |
|-------|-------|--------|
| מורחבת | `src/hooks/useAuditLog.js` | 11 מתודות (logCreate, logUpdate, logDelete, logStatusChange...) |
| מצומצמת | `src/components/hooks/useAuditLog.jsx` | 5 מתודות, חתימות שונות, דורש useAuth |

**שימושים:**
- `Reports.jsx` מייבא מ-`@/hooks/useAuditLog`
- `RoleManagement.jsx`, `CallDetails.jsx`, `UserManagement.jsx` מייבאים מ-`@/components/hooks/useAuditLog`

---

### 4.2 useCalls - שתי גרסאות

| גרסה | מיקום | יכולות |
|-------|-------|--------|
| פשוטה | `src/components/hooks/useCalls.jsx` | hook יחיד |
| מורחבת | `src/features/calls/hooks/useCalls.js` | 7+ hooks (useCalls, useCall, useFilteredCalls, useCallsByVendor...) |

**שימושים:**
- Dashboard, Calls, Reports, MyQueue, Calendar, QueueMonitor → `components/hooks/useCalls`
- VendorTracking → `features/calls/hooks/useCalls`

---

### 4.3 useVendors - שתי גרסאות

| גרסה | מיקום | יכולות |
|-------|-------|--------|
| פשוטה | `src/components/hooks/useVendors.jsx` | hook יחיד |
| מורחבת | `src/features/vendors/hooks/useVendors.js` | 13+ hooks |

**שימושים:**
- Dashboard, Reports, CallDetails → `components/hooks/useVendors`
- VendorTracking → `features/vendors/hooks/useVendors`

---

### 4.4 Query Keys - 30+ מפתחות מקודדים קשיח

קיים קובץ `src/lib/queryKeys.js` מרכזי, אבל **30+ דפים** משתמשים במפתחות מקודדים:

| דף | מפתח מקודד | צריך להיות |
|----|------------|------------|
| `CoverageAreas.jsx` | `['vendors-coverage']` | `queryKeys.vendors.all()` |
| `VendorPortal.jsx` | `['allVendors']`, `['vendorCalls']` | מפתחות מרכזיים |
| `ServiceProviders.jsx` | `['service-providers']` | `queryKeys.vendors.all()` |
| `ProductCatalog.jsx` | `['allProducts']` | צריך להגדיר ב-queryKeys |
| `Dashboard.jsx` | `['workQueue']` | `queryKeys.queue.all()` |
| `NewCase.jsx` | `['customers']` | `queryKeys.customers.all()` |
| `Reports.jsx` | `['reportRatings']` | `queryKeys.reports.vendorRatings()` |

**סיכון:** Cache misses, קריאות API כפולות, נתונים לא עדכניים

---

## 5. לוגיקה מנותקת

### 5.1 התראות - רק ל-admin במקום admin+operator

**קבצים:** `handleAssignmentResponse.ts:113`, `updateVendorStatus.ts:40`, `sendCallStatusUpdate.ts:61`

**בעיה:** כל הפונקציות שולחות התראות רק ל-`role: 'admin'`:
```typescript
const operators = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
// הערה בקוד: "Also notify operators if role exists"
```

מוקדנים (operators) לא מקבלים התראות על:
- ספק שאישר/דחה קריאה
- שינוי סטטוס ספק
- עדכוני סטטוס קריאה

---

### 5.2 Feature Modules חסרים

הארכיטקטורה מגדירה feature modules ב-`src/features/`, אבל חלק חסרים:
- `src/features/auth/` - לא קיים (הכול ב-`components/auth/`)
- `src/features/dashboard/` - אין hooks directory
- `src/features/operators/` - אין hooks directory

---

### 5.3 MainPage fallback לא מטפל בשגיאה

**קובץ:** `src/App.jsx:26`

```javascript
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
```

אם `mainPageKey` לא תקין, המשתמש מקבל דף ריק במקום הודעת שגיאה.

---

## 6. מטריצת תפקידים והרשאות

### הגדרת תפקידים

| תפקיד | דפים | פעולות |
|--------|------|--------|
| **Admin** | כל הדפים (57+) | גישה מלאה, ניהול משתמשים, הגדרות מערכת |
| **Operator** | 20 דפים (Dashboard, Calls, Customers, Reports...) | ניהול קריאות, לקוחות, ספקים. אין: מחיקה, הגדרות מערכת |
| **Vendor** | 4 דפים (VendorPortal, VendorCallManagement, MyVendorProfile, VendorGuide) | צפייה בקריאות משובצות, עדכון סטטוס |
| **Agent** ⚠️ | **לא מוגדר** | מוזכר בתיעוד אך לא ממומש |

### בדיקת הגנת דפים

| מנגנון | מצב |
|--------|-----|
| RoleGuard על כל route | ✅ עובד |
| Admin bypass | ✅ admin תמיד מקבל גישה |
| Vendor isolation (דפים) | ✅ דפי vendor חסומים לoperator |
| PermissionsContext גרנולרי | ✅ עובד אבל לא תמיד בשימוש |
| Backend ownership checks | ❌ **חסר** בפונקציות vendor |
| Data filtering server-side | ❌ **חסר** - סינון בצד הלקוח |

---

## 7. המלצות לתיקון - לפי עדיפות

### שלב 1 - קריטי (מיידי)

1. **הוסף בדיקות ownership בכל פונקציות vendor:**
   - `updateVendorLocation.ts` - וודא `vendor.email === user.email`
   - `updateVendorStatus.ts` - וודא `vendor.email === user.email`
   - `handleAssignmentResponse.ts` - וודא `attempt.vendor_id` תואם לספק הנוכחי
   - `sendCallStatusUpdate.ts` - וודא `call.assigned_vendor_id` תואם לספק

2. **הוסף אימות ל-botWebhook:**
   - הוסף webhook secret כמו ב-externalCrmWebhook
   - הוסף rate limiting

3. **הוסף rate limiting ל-getFeedbackTokenInfo:**
   - הגבל ניסיונות validation
   - הוסף CAPTCHA או secondary validation

### שלב 2 - גבוה (השבוע)

4. **אחד את מערכות ההרשאות** - בחר מערכת אחת (PermissionsContext) והסר כפילויות
5. **הוסף role checks לפונקציות backend** חסרות
6. **תקן שליחת התראות** - הוסף `role: 'operator'` בנוסף ל-admin
7. **הסר console.log** מפרודקשן
8. **אחד hooks כפולים** - מחק גרסאות פשוטות ב-`components/hooks/`

### שלב 3 - בינוני (השבוע הבא)

9. **העבר query keys** למפתחות מרכזיים
10. **החלף window.location** ב-React Router hooks
11. **הוסף error boundaries** לדפים ללא טיפול בשגיאות
12. **תקן RTL spacing** - החלף `ml-`/`mr-` ב-`gap` או `space-x`

### שלב 4 - נמוך (בהמשך)

13. הוסף נגישות (aria-labels, keyboard nav)
14. מימוש תפקיד Agent
15. הוסף server-side data filtering

---

## 8. סיכום

המערכת מכילה **תשתית אבטחה בסיסית טובה** - RoleGuard על כל route, PermissionsContext גרנולרי, ו-auth checks ברוב פונקציות ה-backend. הבעיה העיקרית היא **חוסר בבדיקות ownership** - ספק יכול לבצע פעולות על ספקים אחרים כי הבדיקה היא רק ברמת התפקיד ולא ברמת הזהות.

**ציון בריאות קוד:** 65/100
- אבטחת דפים: 85/100 ✅
- אבטחת backend: 45/100 ❌
- איכות UI: 70/100
- ארגון קוד: 60/100
- נגישות: 20/100 ❌

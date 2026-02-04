# ביקורת ארכיטקטורה - NatID CRM

**תאריך:** 2026-02-04
**סטטוס:** ניתוח נוכחי של המערכת

---

## תוכן עניינים

1. [סיכום מנהלים](#סיכום-מנהלים)
2. [מבנה ישויות](#מבנה-ישויות)
3. [מפת מסכים וניווט](#מפת-מסכים-וניווט)
4. [קבצים כפולים](#קבצים-כפולים)
5. [קבצים לא בשימוש](#קבצים-לא-בשימוש)
6. [מסכים לא מחוברים לתפריט](#מסכים-לא-מחוברים-לתפריט)
7. [בעיית גודל קבצים](#בעיית-גודל-קבצים)
8. [ניתוח מפות](#ניתוח-מפות)
9. [תוכנית פעולה מומלצת](#תוכנית-פעולה-מומלצת)

---

## סיכום מנהלים

| מדד | ערך |
|-----|-----|
| סה"כ שורות קוד | ~93,000 |
| קבצי מקור (JS/JSX) | 241 |
| ישויות נתונים | 26 ראשיות + 3 עקיפות |
| מסכים (pages) | 34 |
| מסכים בתפריט | 19 |
| מסכים ללא תפריט | 15 |
| Feature modules | 11 (8 עם API + hooks) |
| Backend functions | 24 |
| Hooks כפולים | 9 קבצים |
| קבצים חשודים כלא בשימוש | ~15 |
| קבצים קריטיים מעל 1,000 שורות | 3 |

### ממצאים עיקריים

1. **כפילויות hooks** - 9 קבצי hooks ב-`components/hooks/` כפולים ל-`features/*/hooks/`
2. **קבצים גדולים מדי** - 3 קבצים מעל 1,000 שורות גורמים לבעיות ביצועים
3. **מפות** - 5 קומפוננטות מפה עם כפילות קוד ואתחול Leaflet חוזר
4. **15 מסכים** לא מחוברים לתפריט הצדדי
5. **~12 functions** בצד שרת לא נקראות מהפרונט

---

## מבנה ישויות

### ישויות ליבה (Core Entities)

```
Call (קריאת שירות)
├── CallHistory (היסטוריית סטטוסים)
├── CallPhoto (תמונות)
├── CallFeedback (משוב)
├── CallAssignmentAttempt (ניסיונות שיבוץ)
└── Message (צ'אט)

Case (תיק שירות)
├── CaseActivity (פעילויות)
└── קשור ל-Call

Customer (לקוח)
└── CustomerInteraction (אינטראקציות)

Vendor (ספק/קבלן)
├── VendorLocation (מיקומים)
├── VendorPayment (תשלומים)
├── VendorRating (דירוגים)
├── VendorContract (חוזים)
└── ServiceProvider (alias ישן)

User (משתמש)
├── UserPermission (הרשאות)
└── UserDisplayPreference (העדפות תצוגה)

WorkQueue (תור עבודה)
Notification (התראה)
└── NotificationSetting (הגדרות התראות)

AuditLog (יומן ביקורת - דרך backend function)
```

### שכבות ארכיטקטורה לכל ישות

| ישות | API (features) | Hooks (features) | Hooks (components) | Services | סטטוס |
|------|:-:|:-:|:-:|:-:|--------|
| Call | ✅ | ✅ 10 hooks | ✅ כפול | - | כפילות hooks |
| Case | ✅ | ✅ 8 hooks | ✅ כפול | - | כפילות hooks |
| Customer | ✅ | ✅ 8 hooks | ✅ כפול | - | כפילות hooks |
| Vendor | ✅ | ✅ 18 hooks | ✅ כפול | distanceMatrix | כפילות hooks |
| User | ✅ | ✅ 6 hooks | - | - | תקין |
| WorkQueue | ✅ | ✅ 8 hooks | ✅ כפול | - | כפילות hooks |
| Notification | ✅ | ✅ 7 hooks | ✅ כפול | - | כפילות hooks |
| Reports | ✅ | ✅ 5 hooks | - | - | תקין |
| Message | ✅ (lib/api) | - | - | - | **חסר feature module** |
| UserPermission | - | - | - | - | **גישה ישירה בדף** |
| AuditLog | - | ✅ (comp) | - | - | **backend function בלבד** |

---

## מפת מסכים וניווט

### מסכים בתפריט (19)

#### תפעול יומי
| מסך | נתיב | קומפוננטה | שורות |
|------|-------|-----------|-------|
| לוח בקרה | `/Dashboard` | Dashboard.jsx | 1,101 🔴 |
| ניטור תורים | `/QueueMonitor` | QueueMonitor.jsx | 510 |
| מפת ספקים | `/AllVendorsMap` | AllVendorsMap.jsx | 587 🟠 |
| אזורי כיסוי | `/CoverageAreas` | CoverageAreas.jsx | ~300 |

#### ניהול ונתונים
| מסך | נתיב | קומפוננטה | שורות |
|------|-------|-----------|-------|
| דוחות | `/Reports` | Reports.jsx | 592 |
| ניתוח היסטורי | `/HistoricalDataAnalysis` | HistoricalDataAnalysis.jsx | 615 |
| לקוחות | `/Customers` | Customers.jsx | 476 |
| נותני שירות | `/ServiceProviders` | ServiceProviders.jsx | 427 |
| פורטל ספקים | `/VendorPortal` | VendorPortal.jsx | 723 🟠 |
| הפרופיל שלי | `/MyVendorProfile` | MyVendorProfile.jsx | 522 |

#### מערכת
| מסך | נתיב | קומפוננטה |
|------|-------|-----------|
| ניהול משתמשים | `/UserManagement` | UserManagement.jsx |
| אוטומציה | `/AutomationSettings` | AutomationSettings.jsx |
| אינטגרציות | `/IntegrationSettings` | IntegrationSettings.jsx |
| הגדרות התראות | `/NotificationSettings` | NotificationSettings.jsx |
| הגדרות מערכת | `/Settings` | Settings.jsx |

#### כלים
| מסך | נתיב | קומפוננטה |
|------|-------|-----------|
| סוכנים | `/Agents` | Agents.jsx |

#### פעולה מהירה
| מסך | נתיב | קומפוננטה |
|------|-------|-----------|
| קריאה חדשה | `/NewCase` | NewCase.jsx |

### מסכים ללא תפריט (15) - נגישים רק דרך URL ישיר או לינקים פנימיים

| מסך | נתיב | סוג | סטטוס |
|------|-------|------|--------|
| פרטי קריאה | `/CallDetails` | דף פרטים | ✅ מקושר מרשימות |
| פרטי לקוח | `/CustomerDetails` | דף פרטים | ✅ מקושר מרשימות |
| רשימת קריאות | `/Calls` | רשימה | ⚠️ **לא נגיש מהתפריט** |
| לוח שנה | `/Calendar` | כלי | ⚠️ **לא נגיש מהתפריט** |
| יצוא מתקדם | `/AdvancedExport` | כלי | ⚠️ **לא נגיש מהתפריט** |
| משוב לקוחות | `/CustomerFeedback` | ניהול | ⚠️ **לא נגיש מהתפריט** |
| יומן ביקורת | `/AuditLog` | ניהול | ⚠️ **לא נגיש מהתפריט** |
| ניהול תפקידים | `/RoleManagement` | ניהול | ⚠️ **לא נגיש מהתפריט** |
| התור שלי | `/MyQueue` | עבודה | ⚠️ **לא נגיש מהתפריט** |
| ספק חדש | `/NewVendor` | טופס | ✅ נגיש מכפתור |
| ניהול קריאות ספק | `/VendorCallManagement` | ספקים | ✅ פורטל ספק |
| חוזי ספקים | `/VendorContracts` | ספקים | ⚠️ **לא נגיש** |
| מעקב ספקים | `/VendorTracking` | ספקים | ⚠️ **לא נגיש** |
| ייבוא נתונים | `/ImportHistoricalData` | כלי | ⚠️ **לא נגיש** |
| הגדרות התראות אישיות | `/MyNotificationSettings` | הגדרות | ⚠️ **לא נגיש** |
| הגדרות תצוגה | `/AdminDisplaySettings` | הגדרות | ⚠️ **לא נגיש** |
| מדריך למשתמש | `/UserGuide` | עזרה | ⚠️ **לא נגיש** |

**ממצא חשוב:** כ-12 מסכים פונקציונליים לא נגישים מהתפריט - משתמשים לא יכולים למצוא אותם בלי לדעת את ה-URL.

---

## קבצים כפולים

### 1. Hooks כפולים (חומרה: 🔴 גבוהה)

הבעיה המרכזית: קיימות **שתי מערכות hooks** מקבילות לאותן ישויות.

| ישות | Feature hooks | Component hooks | מי בשימוש? |
|------|--------------|----------------|------------|
| Calls | `features/calls/hooks/useCalls.js` | `components/hooks/useCalls.jsx` | **שניהם** - כפילות |
| Vendors | `features/vendors/hooks/useVendors.js` | `components/hooks/useVendors.jsx` | **שניהם** - כפילות |
| Customers | `features/customers/hooks/useCustomers.js` | `components/hooks/useCustomers.jsx` | **שניהם** - כפילות |
| Cases | `features/cases/hooks/useCases.js` | `components/hooks/useCases.jsx` | component version פחות בשימוש |
| WorkQueue | `features/queue/hooks/useQueue.js` | `components/hooks/useWorkQueue.jsx` | **שניהם** - כפילות |
| Auth | `providers/AuthProvider.jsx` | `components/hooks/useAuth.jsx` | **components לא בשימוש** |
| Notifications | `features/settings/hooks/useSettings.js` | `components/hooks/useNotifications.jsx` | **components לא בשימוש** |
| ErrorLogger | - | `components/hooks/useErrorLogger.jsx` | **לא בשימוש** |
| AuditLog | - | `components/hooks/useAuditLog.jsx` | בשימוש (ייחודי) |

**פתרון מומלץ:** לאחד ל-feature hooks בלבד. להסיר את `components/hooks/` ולעדכן imports.

### 2. קומפוננטות כפולות (חומרה: 🟠 בינונית)

| קומפוננטה | קובץ 1 (פעיל) | קובץ 2 (כפול) | הבדל |
|-----------|---------------|---------------|------|
| CallSummaryEditor | `components/call/CallSummaryEditor.jsx` | `components/calls/CallSummaryEditor.jsx` | מימוש שונה, calls לא בשימוש |
| AIInsightsWidget | `components/ai/AIInsightsWidget.jsx` | `features/dashboard/components/AIInsightsWidget.jsx` | features version מפורט יותר |
| AuthContext | `providers/AuthProvider.jsx` | `components/AuthContext.jsx` | components version ישן |
| NavigationTracker | `lib/NavigationTracker.jsx` | `components/NavigationTracker.jsx` | components version import שבור |

### 3. Pages vs Features כפולים (חומרה: 🟠 בינונית)

מספר מסכים קיימים גם ב-`pages/` וגם ב-`features/` עם מימושים שונים:

| מסך | pages/ (פעיל) | features/ (כפול) |
|------|--------------|-----------------|
| Dashboard | `pages/Dashboard.jsx` (1,101 שורות) | `features/dashboard/index.jsx` (1,085 שורות) |
| CoverageAreas | `pages/CoverageAreas.jsx` | `features/vendors/CoverageAreas.jsx` |
| MyVendorProfile | `pages/MyVendorProfile.jsx` (522 שורות) | `features/vendors/MyVendorProfile.jsx` (495 שורות) |
| VendorPortal | `pages/VendorPortal.jsx` (723 שורות) | `features/vendors/VendorPortal.jsx` |

**הערה קריטית:** `pages.config.js` מייבא **רק** מ-`pages/`. קבצי ה-`features/` כנראה **לא בשימוש בפועל** אלא אם pages/ מייבא מהם.

### 4. Utils כפולים (חומרה: 🟡 נמוכה)

| קובץ | תוכן | שימוש |
|-------|-------|-------|
| `lib/utils.js` | `cn()`, `isIframe` | cn לסגנונות |
| `components/utils.jsx` | `createPageUrl()`, `formatCurrency()`, `formatDate()`, `cn()` | פונקציות עזר |

הפונקציה `cn()` מוגדרת בשני הקבצים.

---

## קבצים לא בשימוש

### Backend Functions לא נקראות מהפרונט (~12)

| פונקציה | שם קובץ | סטטוס |
|---------|---------|--------|
| בוט 99digital | `99digitalBot.ts` | ⚠️ webhook חיצוני? |
| ניתוח דפוסי קריאות | `analyzeCallPatterns.ts` | ⚠️ לא נקרא |
| ניתוח ביצועי ספקים | `analyzeVendorPerformance.ts` | ⚠️ לא נקרא |
| Webhook בוט | `botWebhook.ts` | ⚠️ webhook חיצוני? |
| בדיקת ושליחת התראות | `checkAndSendNotifications.ts` | ⚠️ scheduled task? |
| בדיקת תפוגת חוזים | `checkContractExpiry.ts` | ⚠️ scheduled task? |
| Webhook CRM חיצוני | `externalCrmWebhook.ts` | ⚠️ webhook חיצוני? |
| חיזוי זמני קריאות | `predictCallTimes.ts` | ⚠️ לא נקרא |
| המלצת ספק | `recommendVendor.ts` | ⚠️ לא נקרא |
| עדכון סטטוס קריאה | `sendCallStatusUpdate.ts` | ⚠️ לא נקרא |
| שליחת התראה | `sendNotification.ts` | ⚠️ לא נקרא |
| שליחת דירוג ספק | `submitVendorRating.ts` | ⚠️ לא נקרא |

**הערה:** חלק מהפונקציות עשויות להיקרא כ-webhooks או scheduled tasks מחוץ לפרונט.

### קבצי Frontend לא בשימוש

| קובץ | סיבה |
|-------|-------|
| `components/hooks/useAuth.jsx` | AuthProvider קיים - לא מיובא |
| `components/hooks/useErrorLogger.jsx` | לא מיובא |
| `components/hooks/useNotifications.jsx` | לא מיובא |
| `components/AuthContext.jsx` | מיובא רק ע"י NavigationTracker הישן |
| `components/NavigationTracker.jsx` | lib/NavigationTracker.jsx פעיל במקום |
| `components/calls/CallSummaryEditor.jsx` | call/CallSummaryEditor.jsx פעיל במקום |
| `features/vendors/CoverageAreas.jsx` | pages/CoverageAreas.jsx פעיל |

---

## בעיית גודל קבצים

### קבצים קריטיים (מעל 1,000 שורות) 🔴

| # | קובץ | שורות | בעיה |
|---|-------|-------|------|
| 1 | `pages/Dashboard.jsx` | 1,101 | גרפים, טבלאות, KPI, פילטרים - הכל בקובץ אחד |
| 2 | `features/dashboard/index.jsx` | 1,085 | **כפול!** מימוש Dashboard נוסף |
| 3 | `pages/CallDetails.jsx` | 1,013 | פרטי קריאה + צ'אט + מפה + חתימה + משוב |

### קבצים גדולים (700-900 שורות) 🟠

| # | קובץ | שורות | בעיה |
|---|-------|-------|------|
| 4 | `pages/VendorCallManagement.jsx` | 748 | ניהול קריאה + תמונות + חתימה + סטטוס |
| 5 | `pages/AdvancedExport.jsx` | 744 | הגדרות שדות מעורבות עם UI |
| 6 | `features/cases/CaseDetails.jsx` | 740 | פרטי תיק + ציר זמן + מסמכים |
| 7 | `pages/VendorPortal.jsx` | 723 | דשבורד ספק עם מספר חלקים |
| 8 | `features/vendors/index.jsx` | 708 | רשימת ספקים + חיפוש + דיאלוגים |

### קבצים גדולים בינוניים (500-700 שורות) 🟡

| # | קובץ | שורות |
|---|-------|-------|
| 9 | `components/ui/sidebar.jsx` | 653 |
| 10 | `components/ui/ExportMenu.jsx` | 648 |
| 11 | `features/settings/NotificationSettings.jsx` | 617 |
| 12 | `pages/HistoricalDataAnalysis.jsx` | 615 |
| 13 | `features/reports/index.jsx` | 592 |
| 14 | `features/vendors/AllVendorsMap.jsx` | 587 |
| 15 | `features/calls/CallDetailsVendor.jsx` | 577 |
| 16 | `components/contracts/ContractFormDialog.jsx` | 575 |
| 17 | `features/calls/index.jsx` | 574 |
| 18 | `features/agents/UserManagement.jsx` | 548 |
| 19 | `pages/MyVendorProfile.jsx` | 522 |
| 20 | `features/queue/QueueMonitor.jsx` | 510 |

### למה זה גורם לבעיות?

1. **Re-renders מיותרים** - כשקובץ גדול מכיל הכל, כל שינוי state קטן גורם ל-render מחדש של הקומפוננטה כולה
2. **Bundle size** - קבצים גדולים לא מאפשרים code splitting אפקטיבי
3. **זיכרון** - מפות Leaflet בפרט צורכות הרבה זיכרון, ובקומפוננטה גדולה הן לא משתחררות כראוי
4. **Developer experience** - קשה לנווט, לתחזק ולתקן באגים

---

## ניתוח מפות

### סה"כ קוד מפות: ~1,410 שורות ב-5 קבצים

| קובץ | שורות | תפקיד | בעיה |
|-------|-------|--------|------|
| `features/vendors/AllVendorsMap.jsx` | 587 | מפת כל הספקים + רשימה + פילטרים | **גדול מדי** - צריך פיצול |
| `features/vendors/VendorMap.jsx` | 274 | מפת מעקב ספק | בינוני |
| `components/maps/VendorLiveMap.jsx` | 269 | מעקב real-time | בינוני |
| `components/maps/VendorTrackingLeafletMap.jsx` | 143 | מפת מעקב Leaflet | תקין |
| `components/maps/AllVendorsLeafletMap.jsx` | 137 | מפת כל הספקים Leaflet | **כפול עם AllVendorsMap** |

### בעיות ספציפיות במפות

1. **כפילות אתחול Leaflet Icons** - כל קובץ מפה חוזר על:
   ```js
   delete L.Icon.Default.prototype._getIconUrl;
   L.Icon.Default.mergeOptions({ ... });
   ```
   צריך להיות בקובץ אחד: `utils/leafletSetup.js`

2. **AllVendorsMap vs AllVendorsLeafletMap** - שתי קומפוננטות למפת ספקים עם חפיפה

3. **Inline styles לmarkers** - חישובי סגנון בתוך render loop במקום memoization

4. **חוסר cleanup** - map instances לא תמיד מתנקות ב-unmount

### פתרון מומלץ למפות

```
src/utils/leafletSetup.js          ← אתחול חד-פעמי של Leaflet icons
src/components/maps/
  ├── MapContainer.jsx              ← wrapper משותף עם cleanup
  ├── VendorMarker.jsx              ← marker ספק ממומש (memoized)
  ├── AllVendorsMap.jsx             ← מפת כל הספקים (משולב)
  ├── VendorLiveMap.jsx             ← מפת מעקב real-time
  └── VendorTrackingMap.jsx         ← מפת מעקב ספק בודד
```

---

## תוכנית פעולה מומלצת

### שלב 1: ניקוי כפילויות (עדיפות גבוהה) 🔴

**1.1 איחוד Hooks**
- [ ] להעביר כל שימוש מ-`components/hooks/useCalls.jsx` ל-`features/calls/hooks/useCalls.js`
- [ ] להעביר כל שימוש מ-`components/hooks/useVendors.jsx` ל-`features/vendors/hooks/useVendors.js`
- [ ] להעביר כל שימוש מ-`components/hooks/useCustomers.jsx` ל-`features/customers/hooks/useCustomers.js`
- [ ] להעביר כל שימוש מ-`components/hooks/useWorkQueue.jsx` ל-`features/queue/hooks/useQueue.js`
- [ ] למחוק קבצים שלא בשימוש: `useAuth.jsx`, `useErrorLogger.jsx`, `useNotifications.jsx`
- [ ] לבדוק אם `useCases.jsx` בשימוש ולהעביר/למחוק

**1.2 הסרת כפילויות קומפוננטות**
- [ ] למחוק `components/AuthContext.jsx`
- [ ] למחוק `components/NavigationTracker.jsx`
- [ ] למחוק `components/calls/CallSummaryEditor.jsx`
- [ ] לבדוק ולהחליט לגבי features/dashboard vs pages/Dashboard

**חיסכון צפוי:** ~2,500 שורות קוד מיותר

### שלב 2: פיצול קבצים גדולים (עדיפות גבוהה) 🔴

**2.1 Dashboard.jsx (1,101 → ~300 שורות)**
- [ ] לחלץ גרפים ל-`components/dashboard/DashboardCharts.jsx`
- [ ] לחלץ פילטרים ל-`components/dashboard/DashboardFilters.jsx`
- [ ] לחלץ KPI cards ל-`components/dashboard/DashboardStats.jsx`
- [ ] לחלץ טבלת קריאות ל-`components/dashboard/CallsTable.jsx`

**2.2 CallDetails.jsx (1,013 → ~350 שורות)**
- [ ] לחלץ header ל-`components/call/CallDetailsHeader.jsx`
- [ ] לחלץ שיבוץ ספק ל-`components/call/CallAssignment.jsx`
- [ ] לחלץ metadata ל-`components/call/CallMetadata.jsx`
- [ ] להשתמש ב-lazy loading לצ'אט, מפה, קבצים

**2.3 מפות - איחוד וייעול**
- [ ] ליצור `utils/leafletSetup.js` עם אתחול אחיד
- [ ] לאחד AllVendorsMap + AllVendorsLeafletMap
- [ ] ליצור `VendorMarker.jsx` ממומש עם React.memo
- [ ] להוסיף cleanup ל-map instances

**חיסכון צפוי:** ~30% שיפור בזמני טעינה של מסכים מרכזיים

### שלב 3: חיבור מסכים לתפריט (עדיפות בינונית) 🟠

מסכים שכנראה צריכים להופיע בתפריט:

| מסך | קבוצה מוצעת |
|------|------------|
| Calls (רשימת קריאות) | תפעול יומי |
| Calendar (לוח שנה) | תפעול יומי |
| AuditLog (יומן ביקורת) | מערכת |
| RoleManagement (ניהול תפקידים) | מערכת |
| CustomerFeedback (משוב לקוחות) | ניהול ונתונים |
| VendorContracts (חוזי ספקים) | ניהול ונתונים |
| AdvancedExport (יצוא מתקדם) | כלים |
| MyQueue (התור שלי) | תפעול יומי (למוקדנים) |
| UserGuide (מדריך) | עזרה (footer) |

### שלב 4: ניקוי קוד מת (עדיפות נמוכה) 🟡

- [ ] לבדוק אילו backend functions בשימוש ולתעד/להסיר
- [ ] לנקות features/ files שהוחלפו ע"י pages/
- [ ] לאחד את שני קבצי utils
- [ ] להסיר `cn()` כפול מ-`components/utils.jsx`
- [ ] לבדוק אם `ServiceProvider` entity עדיין רלוונטי או alias ישן ל-Vendor

---

## סיכום

המערכת בנויה על ארכיטקטורה טובה (feature modules, React Query, Base44) אבל צברה כפילויות וקבצים גדולים מדי לאורך הזמן. שלושת הצעדים הדחופים ביותר:

1. **איחוד hooks** - להסיר את `components/hooks/` ולהשתמש רק ב-`features/*/hooks/`
2. **פיצול Dashboard + CallDetails** - לרדת מ-1,000+ שורות ל-300-350
3. **ייעול מפות** - אתחול Leaflet אחיד, cleanup, memoization

ביצוע שלבים 1-2 צפוי לשפר:
- **ביצועים:** ~30% שיפור בזמני render של מסכים מרכזיים
- **תחזוקתיות:** קוד פשוט יותר עם מקור אמת אחד לכל ישות
- **Bundle size:** ~15-20% הפחתה דרך code splitting טוב יותר

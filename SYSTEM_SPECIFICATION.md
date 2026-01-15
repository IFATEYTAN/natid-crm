# מסמך אפיון מערכת - NatID CRM
## מערכת ניהול קריאות שירות ונותני שירות

**תאריך עדכון אחרון:** ינואר 2026
**גרסה:** 1.0

---

## תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורה טכנית](#ארכיטקטורה-טכנית)
3. [מודולים ופיצ'רים](#מודולים-ופיצ'רים)
4. [ישויות נתונים (Entities)](#ישויות-נתונים)
5. [אינטגרציות](#אינטגרציות)
6. [מערכת הרשאות ותפקידים](#מערכת-הרשאות-ותפקידים)
7. [סטטוס פיתוח](#סטטוס-פיתוח)
8. [פיצ'רים חסרים ועבודה עתידית](#פיצ'רים-חסרים-ועבודה-עתידית)

---

## סקירה כללית

### תיאור המערכת
מערכת NatID CRM היא מערכת לניהול קריאות שירות (Service Calls) המיועדת לחברות שמספקות שירותי תחזוקה, תיקונים והתקנות. המערכת מאפשרת ניהול מלא של:
- לקוחות וכתובות
- נותני שירות (טכנאים/קבלני משנה)
- קריאות שירות מהפתיחה ועד הסגירה
- תזמון ושיבוץ אוטומטי
- מעקב בזמן אמת
- דוחות וניתוחים

### קהל יעד
1. **מנהלי מערכת (Admin)** - ניהול מלא של כל המערכת
2. **מוקדנים** - פתיחת קריאות, ניהול לקוחות, שיבוץ טכנאים
3. **טכנאים** - צפייה בתור עבודה, עדכון סטטוס קריאות
4. **ספקים חיצוניים (Vendors)** - פורטל ייעודי לקבלני משנה

---

## ארכיטקטורה טכנית

### Stack טכנולוגי

| רכיב | טכנולוגיה | גרסה |
|------|-----------|------|
| Frontend Framework | React | 18.2.0 |
| Build Tool | Vite | 4.4.5 |
| UI Components | Radix UI | Latest |
| Styling | Tailwind CSS | 3.4.1 |
| State Management | React Context | Built-in |
| Routing | React Router DOM | 6.15.0 |
| Charts | Recharts | 2.15.3 |
| Icons | Lucide React | 0.263.1 |
| Date Handling | date-fns | 2.30.0 |
| Backend/API | Base44 Platform | Custom |
| Maps | Google Maps API | - |

### מבנה תיקיות

```
src/
├── api/                    # חיבור ל-API
│   └── base44Client.js     # קליינט Base44
├── components/             # רכיבי UI
│   ├── ui/                 # רכיבים בסיסיים (85+ קבצים)
│   ├── call/               # רכיבי קריאות שירות
│   ├── customer/           # רכיבי לקוחות
│   └── service-provider/   # רכיבי נותני שירות
├── hooks/                  # Custom Hooks
│   ├── useRealtimeUpdates.js
│   └── use-toast.js
├── lib/                    # ספריות עזר
│   ├── AuthContext.jsx     # ניהול אותנטיקציה
│   └── utils.js
├── pages/                  # דפי האפליקציה
│   ├── Dashboard.jsx
│   ├── Customers.jsx
│   ├── ServiceProviders.jsx
│   ├── Calls.jsx
│   ├── CaseDetails.jsx
│   ├── NewCase.jsx
│   ├── MyQueue.jsx
│   ├── Reports.jsx
│   ├── VendorPortal.jsx
│   ├── Settings.jsx
│   └── UserManagement.jsx
├── services/               # שירותים
│   └── distanceMatrix.js   # חישוב מרחקים
├── utils/                  # פונקציות עזר
├── design-system.js        # מערכת עיצוב RTL
├── Layout.jsx              # תבנית ראשית
└── App.jsx                 # נקודת כניסה
```

---

## מודולים ופיצ'רים

### 1. דשבורד (Dashboard) ✅ הושלם

**קובץ:** `src/pages/Dashboard.jsx` (769 שורות)

#### פיצ'רים מומשים:
- **סטטיסטיקות כלליות:**
  - סה"כ קריאות פתוחות
  - קריאות חדשות היום
  - קריאות בטיפול
  - קריאות שהושלמו
  - אחוז השלמה
  - קריאות דחופות

- **תרשימים ויזואליים:**
  - גרף עמודות - קריאות לפי סטטוס
  - גרף עוגה - התפלגות לפי קטגוריה
  - גרף קווי - מגמות שבועיות
  - גרף עמודות - ביצועי טכנאים

- **טבלאות:**
  - קריאות דחופות (פתוחות יותר מ-24 שעות)
  - קריאות אחרונות
  - טכנאים מובילים

- **עיצוב:**
  - תמיכה מלאה ב-RTL
  - Design System מותאם
  - Responsive לכל המכשירים

---

### 2. ניהול לקוחות (Customers) ✅ הושלם

**קובץ:** `src/pages/Customers.jsx` (484 שורות)

#### פיצ'רים מומשים:
- **רשימת לקוחות:**
  - טבלה עם עמודות: שם, טלפון, אימייל, כתובת, סטטוס
  - חיפוש חופשי
  - סינון לפי סטטוס (פעיל/לא פעיל)
  - מיון לפי כל עמודה
  - Pagination

- **יצירת לקוח חדש:**
  - שם מלא
  - מספר טלפון (עם ולידציה)
  - אימייל
  - כתובת מלאה (רחוב, עיר, מיקוד)
  - הערות

- **עריכת לקוח:**
  - עריכה של כל השדות
  - שינוי סטטוס פעיל/לא פעיל

- **צפייה בפרטי לקוח:**
  - כל המידע
  - היסטוריית קריאות של הלקוח
  - יכולת פתיחת קריאה חדשה ישירות

---

### 3. ניהול נותני שירות (ServiceProviders) ✅ הושלם

**קובץ:** `src/pages/ServiceProviders.jsx` (686 שורות)

#### פיצ'רים מומשים:
- **רשימת נותני שירות:**
  - טבלה מתקדמת
  - חיפוש לפי שם/טלפון/התמחות
  - סינון לפי סטטוס (פעיל/לא פעיל)
  - סינון לפי זמינות (זמין/לא זמין)
  - מיון מתקדם

- **כרטיס נותן שירות:**
  - תמונה (עם אפשרות העלאה)
  - שם מלא
  - מספר טלפון
  - אימייל
  - כתובת בסיס
  - אזורי שירות (מרובים)
  - התמחויות (מרובות)
  - זמינות (זמין/לא זמין)
  - דירוג (1-5 כוכבים)

- **תצוגת Grid/Table:**
  - מעבר בין תצוגות
  - כרטיסים עם תמונה

- **פיצ'רים מתקדמים:**
  - העלאת תמונת פרופיל
  - בחירה מרובה של אזורי שירות
  - בחירה מרובה של התמחויות
  - חישוב מרחק מהלקוח (אינטגרציה עם Google Maps)

---

### 4. ניהול קריאות שירות (Calls) ✅ הושלם

**קובץ:** `src/pages/Calls.jsx` (573 שורות)

#### פיצ'רים מומשים:
- **רשימת קריאות:**
  - טבלה מפורטת
  - מספר קריאה ייחודי
  - שם לקוח
  - קטגוריה ותת-קטגוריה
  - סטטוס (קידוד צבע)
  - עדיפות (רגיל/גבוה/דחוף)
  - טכנאי משובץ
  - תאריך יצירה
  - תאריך עדכון

- **סינון מתקדם:**
  - חיפוש חופשי
  - סינון לפי סטטוס (פתוח/בטיפול/הושלם/מבוטל)
  - סינון לפי עדיפות
  - סינון לפי טכנאי
  - סינון לפי טווח תאריכים

- **פעולות:**
  - פתיחת קריאה חדשה
  - צפייה בפרטי קריאה
  - עריכה מהירה
  - שיבוץ טכנאי

- **סטטוסים:**
  - `new` - חדש (כחול)
  - `assigned` - שובץ טכנאי (סגול)
  - `in_progress` - בטיפול (כתום)
  - `pending_parts` - ממתין לחלקים (צהוב)
  - `completed` - הושלם (ירוק)
  - `cancelled` - בוטל (אפור)

---

### 5. פרטי קריאה (CaseDetails) ✅ הושלם

**קובץ:** `src/pages/CaseDetails.jsx` (728 שורות)

#### פיצ'רים מומשים:
- **מידע כללי:**
  - מספר קריאה
  - סטטוס נוכחי
  - עדיפות
  - תאריך יצירה
  - תאריך עדכון אחרון

- **פרטי לקוח:**
  - שם
  - טלפון (לחיץ להתקשרות)
  - כתובת (לחיצה לניווט)
  - אימייל

- **פרטי הקריאה:**
  - קטגוריה ראשית
  - תת-קטגוריה
  - תיאור הבעיה
  - הערות פנימיות

- **שיבוץ טכנאי:**
  - בחירת טכנאי מרשימה
  - תצוגת מרחק מהלקוח
  - תצוגת זמינות
  - תצוגת דירוג
  - המלצה אוטומטית (לפי מרחק והתמחות)

- **היסטוריית עדכונים:**
  - Timeline מלא
  - כל שינוי סטטוס
  - הערות של טכנאים
  - חותמות זמן

- **פעולות:**
  - עדכון סטטוס
  - הוספת הערה
  - שיבוץ/שינוי טכנאי
  - סגירת קריאה
  - ביטול קריאה

---

### 6. פתיחת קריאה חדשה (NewCase) ✅ הושלם

**קובץ:** `src/pages/NewCase.jsx` (381 שורות)

#### פיצ'רים מומשים:
- **טופס מובנה:**
  - בחירת לקוח קיים (Autocomplete)
  - יצירת לקוח חדש תוך כדי
  - כתובת (עם אפשרות לשימוש בכתובת הלקוח)

- **פרטי הקריאה:**
  - קטגוריה ראשית (Dropdown)
  - תת-קטגוריה (דינמי לפי קטגוריה)
  - עדיפות
  - תיאור הבעיה
  - הערות פנימיות

- **תבניות קריאה:**
  - טעינת תבנית מוגדרת מראש
  - מילוי אוטומטי של שדות

- **שיבוץ אוטומטי:**
  - המלצה על טכנאי מתאים
  - לפי מרחק
  - לפי התמחות
  - לפי זמינות

---

### 7. התור שלי (MyQueue) ✅ הושלם

**קובץ:** `src/pages/MyQueue.jsx` (410 שורות)

#### פיצ'רים מומשים:
- **תצוגת קריאות אישיות:**
  - קריאות משובצות לטכנאי המחובר
  - מיון לפי עדיפות
  - מיון לפי תאריך

- **פעולות מהירות:**
  - עדכון סטטוס
  - הוספת הערה
  - סימון כהושלם
  - ניווט לכתובת הלקוח

- **סטטיסטיקות אישיות:**
  - קריאות שהושלמו היום
  - קריאות פתוחות
  - ממוצע זמן טיפול

---

### 8. דוחות (Reports) ✅ הושלם

**קובץ:** `src/pages/Reports.jsx` (581 שורות)

#### פיצ'רים מומשים:
- **דוח קריאות:**
  - סינון לפי טווח תאריכים
  - סינון לפי סטטוס
  - סינון לפי טכנאי
  - סינון לפי קטגוריה

- **דוח ביצועי טכנאים:**
  - מספר קריאות לטכנאי
  - ממוצע זמן טיפול
  - אחוז השלמה
  - דירוג לקוחות

- **דוח לקוחות:**
  - לקוחות עם הכי הרבה קריאות
  - לקוחות לפי אזור

- **תרשימים:**
  - התפלגות קריאות לפי חודש
  - התפלגות לפי קטגוריה
  - מגמות זמן

- **ייצוא:**
  - ייצוא ל-Excel
  - ייצוא ל-PDF

---

### 9. פורטל ספקים (VendorPortal) ✅ הושלם

**קובץ:** `src/pages/VendorPortal.jsx` (358 שורות)

#### פיצ'רים מומשים:
- **תצוגה מותאמת לספקים:**
  - רק קריאות רלוונטיות לספק
  - ממשק מופשט

- **פעולות:**
  - קבלת קריאה
  - דחיית קריאה
  - עדכון סטטוס
  - הוספת הערות

- **מידע:**
  - פרטי קריאה
  - פרטי לקוח
  - כתובת וניווט

---

### 10. הגדרות מערכת (Settings) ⚠️ בסיסי

**קובץ:** `src/pages/Settings.jsx` (140 שורות)

#### פיצ'רים מומשים:
- **הגדרות כלליות:**
  - שם החברה
  - לוגו
  - פרטי התקשרות

- **הגדרות קריאות:**
  - קטגוריות ותת-קטגוריות
  - סטטוסים מותאמים

#### חסר:
- ניהול תבניות קריאה מתקדם
- הגדרות התראות
- הגדרות אינטגרציות

---

### 11. ניהול משתמשים (UserManagement) ✅ הושלם

**קובץ:** `src/pages/UserManagement.jsx` (532 שורות)

#### פיצ'רים מומשים:
- **רשימת משתמשים:**
  - טבלה מלאה
  - חיפוש
  - סינון לפי תפקיד

- **יצירת משתמש:**
  - שם מלא
  - אימייל
  - סיסמה
  - תפקיד (Admin/Technician/Vendor)
  - שיוך לנותן שירות (לטכנאים)

- **עריכת משתמש:**
  - כל השדות
  - איפוס סיסמה
  - שינוי תפקיד

- **מחיקת משתמש:**
  - עם אישור

---

## ישויות נתונים

### Customer (לקוח)
```javascript
{
  id: String,
  name: String,              // שם מלא
  phone: String,             // טלפון
  email: String,             // אימייל
  address: String,           // כתובת מלאה
  city: String,              // עיר
  notes: String,             // הערות
  status: String,            // active/inactive
  created_date: DateTime,
  updated_date: DateTime
}
```

### ServiceProvider (נותן שירות)
```javascript
{
  id: String,
  name: String,              // שם מלא
  phone: String,             // טלפון
  email: String,             // אימייל
  address: String,           // כתובת בסיס
  service_areas: [String],   // אזורי שירות
  specializations: [String], // התמחויות
  availability: Boolean,     // זמינות
  rating: Number,            // דירוג 1-5
  image_url: String,         // תמונת פרופיל
  status: String,            // active/inactive
  created_date: DateTime,
  updated_date: DateTime
}
```

### ServiceCall (קריאת שירות)
```javascript
{
  id: String,
  call_number: String,       // מספר קריאה ייחודי
  customer_id: String,       // קישור ללקוח
  service_provider_id: String, // קישור לטכנאי
  category: String,          // קטגוריה ראשית
  sub_category: String,      // תת-קטגוריה
  description: String,       // תיאור הבעיה
  status: String,            // סטטוס
  priority: String,          // עדיפות (normal/high/urgent)
  address: String,           // כתובת הקריאה
  internal_notes: String,    // הערות פנימיות
  customer_notes: String,    // הערות לקוח
  created_date: DateTime,
  updated_date: DateTime,
  scheduled_date: DateTime,  // תאריך מתוכנן
  completed_date: DateTime   // תאריך סיום
}
```

### CallUpdate (עדכון קריאה)
```javascript
{
  id: String,
  call_id: String,           // קישור לקריאה
  user_id: String,           // מי עדכן
  update_type: String,       // סוג העדכון
  old_value: String,         // ערך קודם
  new_value: String,         // ערך חדש
  notes: String,             // הערות
  created_date: DateTime
}
```

### CallTemplate (תבנית קריאה)
```javascript
{
  id: String,
  name: String,              // שם התבנית
  category: String,          // קטגוריה
  sub_category: String,      // תת-קטגוריה
  description: String,       // תיאור ברירת מחדל
  priority: String,          // עדיפות ברירת מחדל
  is_active: Boolean
}
```

### User (משתמש)
```javascript
{
  id: String,
  email: String,
  full_name: String,
  role: String,              // admin/technician/vendor
  service_provider_id: String, // קישור לנותן שירות (אופציונלי)
  is_active: Boolean,
  created_date: DateTime,
  last_login: DateTime
}
```

### Company (חברה)
```javascript
{
  id: String,
  name: String,
  logo_url: String,
  phone: String,
  email: String,
  address: String
}
```

### SystemSettings (הגדרות מערכת)
```javascript
{
  id: String,
  categories: [Object],      // קטגוריות קריאות
  statuses: [Object],        // סטטוסים מותאמים
  priorities: [Object],      // רמות עדיפות
  notifications: Object      // הגדרות התראות
}
```

---

## אינטגרציות

### 1. Google Maps Distance Matrix API ✅ מומש

**קובץ:** `src/services/distanceMatrix.js` (282 שורות)

#### פונקציונליות:
- חישוב מרחק בין שתי כתובות
- חישוב זמן נסיעה משוער
- Cache לתוצאות (חיסכון בקריאות API)
- Batch calculations למספר כתובות
- Geocoding כתובות

#### שימוש במערכת:
- המלצה על טכנאי קרוב
- תצוגת מרחק בשיבוץ
- מיון טכנאים לפי מרחק

#### סטטוס:
- ✅ לוגיקה מומשת
- ⚠️ צריך להגדיר API Key אמיתי

---

### 2. Base44 Backend Platform ✅ מומש

**קובץ:** `src/api/base44Client.js`

#### פונקציונליות:
- CRUD operations לכל הישויות
- Authentication
- File upload
- Real-time subscriptions

#### Entities מוגדרים:
- Customer
- ServiceProvider
- ServiceCall
- CallTemplate
- CallUpdate
- User
- Company
- SystemSettings

---

### 3. Real-time Updates System ✅ מומש

**קובץ:** `src/hooks/useRealtimeUpdates.js` (453 שורות)

#### פונקציונליות:
- Polling-based updates
- Optimistic updates
- Conflict resolution
- Auto-retry on failure
- Debouncing

#### שימוש:
- עדכוני סטטוס קריאות בזמן אמת
- סנכרון בין משתמשים
- התראות על שינויים

---

## מערכת הרשאות ותפקידים

### תפקידים (Roles)

| תפקיד | תיאור | הרשאות |
|-------|-------|--------|
| **admin** | מנהל מערכת | גישה מלאה לכל המערכת |
| **technician** | טכנאי/מוקדן | ניהול קריאות, לקוחות, צפייה בדוחות |
| **vendor** | ספק חיצוני | גישה רק לפורטל ספקים |

### מטריצת הרשאות

| מודול | Admin | Technician | Vendor |
|-------|-------|------------|--------|
| Dashboard | ✅ מלא | ✅ מלא | ❌ |
| Customers | ✅ מלא | ✅ צפייה+עריכה | ❌ |
| Service Providers | ✅ מלא | ✅ צפייה | ❌ |
| Calls | ✅ מלא | ✅ מלא | ❌ |
| Case Details | ✅ מלא | ✅ מלא | ✅ מוגבל |
| New Case | ✅ | ✅ | ❌ |
| My Queue | ✅ | ✅ | ❌ |
| Reports | ✅ מלא | ✅ צפייה | ❌ |
| Vendor Portal | ❌ | ❌ | ✅ מלא |
| Settings | ✅ מלא | ❌ | ❌ |
| User Management | ✅ מלא | ❌ | ❌ |

---

## סטטוס פיתוח

### סיכום כללי

| קטגוריה | מומש | חלקי | חסר |
|---------|------|------|-----|
| מודולים | 10 | 1 | 0 |
| אינטגרציות | 2 | 1 | 2 |
| UI/UX | ✅ | - | - |
| RTL Support | ✅ | - | - |
| Responsive | ✅ | - | - |
| Authentication | ✅ | - | - |
| Authorization | ✅ | - | - |

### פירוט מודולים

| מודול | סטטוס | הערות |
|-------|-------|-------|
| Dashboard | ✅ 100% | מלא עם גרפים וסטטיסטיקות |
| Customers | ✅ 100% | CRUD מלא |
| Service Providers | ✅ 100% | כולל העלאת תמונות |
| Calls | ✅ 100% | ניהול מלא |
| Case Details | ✅ 100% | עם Timeline |
| New Case | ✅ 100% | כולל תבניות |
| My Queue | ✅ 100% | תור אישי |
| Reports | ✅ 95% | חסר ייצוא PDF |
| Vendor Portal | ✅ 100% | פורטל ספקים |
| Settings | ⚠️ 60% | בסיסי, חסר הרבה |
| User Management | ✅ 100% | ניהול משתמשים מלא |

---

## פיצ'רים חסרים ועבודה עתידית

### עדיפות גבוהה 🔴

1. **התראות והודעות**
   - Email notifications
   - SMS notifications (Twilio/MessageBird)
   - Push notifications
   - In-app notifications center

2. **יומן ותזמון**
   - Calendar view לקריאות
   - תזמון חכם אוטומטי
   - התנגשויות תזמון
   - אינטגרציה עם Google Calendar

3. **אפליקציית מובייל**
   - PWA או React Native
   - עבודה offline
   - GPS tracking לטכנאים

### עדיפות בינונית 🟡

4. **דוחות מתקדמים**
   - ייצוא PDF מעוצב
   - דוחות מותאמים אישית (Report Builder)
   - Dashboard מותאם אישית
   - KPIs מותאמים

5. **ניהול מלאי וחלקים**
   - מעקב חלקי חילוף
   - הזמנות רכש
   - ניהול מחסן

6. **חתימה דיגיטלית**
   - חתימת לקוח על סיום עבודה
   - אישור תנאים

7. **צילום ותיעוד**
   - העלאת תמונות לקריאות
   - תיעוד לפני/אחרי
   - גלריית תמונות

### עדיפות נמוכה 🟢

8. **אינטגרציות נוספות**
   - WhatsApp Business API
   - חשבוניות (חשבונית ירוקה/Invoice4U)
   - ERP integration
   - Zapier/Make webhooks

9. **אוטומציות**
   - כללי אוטומציה מותאמים
   - Workflow builder
   - SLA monitoring

10. **BI ואנליטיקס**
    - חיבור ל-Power BI
    - Export לאנליטיקס
    - Machine Learning להמלצות

---

## אינטגרציות חסרות

| אינטגרציה | תיאור | עדיפות |
|-----------|-------|--------|
| SMS Gateway | שליחת SMS ללקוחות וטכנאים | 🔴 גבוהה |
| Email Service | שליחת מיילים אוטומטית | 🔴 גבוהה |
| WhatsApp Business | תקשורת עם לקוחות | 🟡 בינונית |
| Payment Gateway | תשלומים ב-CC | 🟡 בינונית |
| Invoice System | הפקת חשבוניות | 🟡 בינונית |
| Calendar Sync | סנכרון יומנים | 🟡 בינונית |
| ERP | סנכרון עם מערכות ארגוניות | 🟢 נמוכה |

---

## סיכום טכני

### מה עובד מעולה:
1. ✅ מערכת CRM מלאה ופונקציונלית
2. ✅ UI/UX מודרני ומותאם RTL
3. ✅ ניהול קריאות מקצה לקצה
4. ✅ שיבוץ טכנאים עם המלצות
5. ✅ דוחות וסטטיסטיקות
6. ✅ מערכת הרשאות
7. ✅ פורטל ספקים

### מה צריך שיפור:
1. ⚠️ הגדרות מערכת (Settings) - בסיסי מאוד
2. ⚠️ Google Maps API Key - צריך להגדיר
3. ⚠️ ייצוא PDF בדוחות

### מה חסר לחלוטין:
1. ❌ מערכת התראות (Email/SMS/Push)
2. ❌ יומן ותזמון גרפי
3. ❌ אפליקציית מובייל
4. ❌ ניהול מלאי
5. ❌ חתימה דיגיטלית
6. ❌ העלאת תמונות לקריאות

---

## נספח: רכיבי UI

### רכיבים בסיסיים (85+)
המערכת כוללת ספריית רכיבים מלאה מבוססת Radix UI:

- Accordion
- Alert / AlertDialog
- Avatar
- Badge
- Breadcrumb
- Button
- Calendar
- Card
- Carousel
- Checkbox
- Collapsible
- Command
- Context Menu
- Data Table
- Dialog
- Drawer
- Dropdown Menu
- Form
- Hover Card
- Input / Input OTP
- Label
- Menubar
- Navigation Menu
- Pagination
- Popover
- Progress
- Radio Group
- Resizable
- Scroll Area
- Select
- Separator
- Sheet
- Skeleton
- Slider
- Sonner (Toasts)
- Switch
- Table
- Tabs
- Textarea
- Toggle / Toggle Group
- Tooltip

### Design System
**קובץ:** `src/design-system.js` (260 שורות)

- צבעים מותאמים
- Typography RTL
- Spacing system
- Shadow system
- Border radius
- Animation presets

---

**סוף מסמך**

*מסמך זה מתאר את מצב המערכת נכון לינואר 2026. יש לעדכן אותו בכל שינוי משמעותי.*

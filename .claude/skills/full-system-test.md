# Skill: Full System Test (בדיקת מערכת מלאה)

## מתי להשתמש
לפני שחרור גרסה, אחרי שינויים גדולים, או כבדיקה תקופתית מקיפה. זהו ה-skill הכי מקיף - הוא מריץ את כל ה-skills האחרים ברצף.

## תהליך בדיקה מלא

### שלב 1: בדיקת בנייה (CI/Build Check)
הרץ את skill `ci-build-check`:

```bash
npm run lint && npm run format:check && npm run typecheck && npm run build
```

אם נכשל - תקן לפני שממשיכים. **אין טעם להמשיך אם הבנייה לא עוברת.**

### שלב 2: בדיקת הרשאות ותפקידים
```
"בצע בדיקת הרשאות מלאה:

1. קרא את src/config/permissions.js
2. רשום את כל הדפים ואת ההרשאות שלהם
3. עבור על App.jsx וודא שכל route מוגן:
   - דפי admin: AuditLog, AutomationSettings, UserManagement,
     RoleManagement, ImportHistoricalData, IntegrationSettings, Settings
   - דפי admin+operator: Dashboard, Calls, CallDetails, NewCase,
     Customers, ServiceProviders, NewVendor, QueueMonitor, MyQueue,
     Reports, AdvancedExport, Calendar, VendorTracking, AllVendorsMap,
     CoverageAreas, VendorContracts, HistoricalDataAnalysis,
     NotificationSettings, Agents, CustomerFeedback
   - דפי vendor: VendorPortal, VendorCallManagement,
     MyVendorProfile, VendorGuide
   - דפי כולם: MyNotificationSettings, UserGuide
4. בדוק שאין דפים ב-src/pages/ שחסרים ב-permissions.js
5. בדוק שאין routes ב-App.jsx בלי RoleGuard"
```

### שלב 3: בדיקת חיבור Feature Modules
```
"בדוק שכל feature module מחובר כראוי:

1. עבור על כל ספריה ב-src/features/:
   agents/, auth/, calls/, cases/, customers/, dashboard/,
   operators/, queue/, reports/, settings/, vendors/

2. לכל module בדוק:
   - יש index.js/jsx שמייצא את הקומפוננטות
   - ה-hooks מיוצאים דרך hooks/index.js
   - יש ייבוא של ה-module ב-App.jsx או בדפים רלוונטיים
   - אין circular dependencies

3. בדוק שכל דף ב-src/pages/ מייבא מ-features/ ולא כותב
   business logic ישירות"
```

### שלב 4: בדיקת קומפוננטות יתומות
```
"חפש קומפוננטות שלא בשימוש (orphaned):

1. רשום את כל הקומפוננטות ב-src/components/
2. לכל קומפוננטה, חפש ייבוא שלה בפרויקט
3. אם אין ייבוא - זו קומפוננטה יתומה
4. עשה את אותו הדבר עבור:
   - קומפוננטות ב-src/features/*/
   - דפים ב-src/pages/
   - hooks ב-src/hooks/ ו-src/features/*/hooks/
   - פונקציות ב-src/utils/ ו-src/services/
   - פונקציות ב-src/lib/
5. רשום את כל הקבצים היתומים עם גודל כל קובץ"
```

### שלב 5: הרצת Security Audit
הרץ את skill `security-audit`:
```
"בצע ביקורת אבטחה מקוצרת:
- בדוק auth checks בפונקציות backend
- בדוק webhook authentication
- בדוק permission consistency
- רשום ממצאים קריטיים בלבד"
```

### שלב 6: הרצת Vendor Portal Check
הרץ את skill `vendor-portal-check`:
```
"בדוק פורטל ספקים:
- בידוד נתונים
- ownership checks
- הרשאות דפים
- רשום ממצאים קריטיים בלבד"
```

### שלב 7: הרצת RTL & Accessibility Check
הרץ את skill `rtl-accessibility`:
```
"בדוק RTL ונגישות:
- סרוק hardcoded LTR classes
- בדוק aria-labels חסרים
- בדוק טקסט עברי חסר
- רשום ממצאים קריטיים בלבד"
```

### שלב 8: הרצת Hooks & Queries Check
הרץ את skill `hooks-and-queries`:
```
"בדוק hooks ו-queries:
- שימוש ב-queryKeys מרכזיים
- טיפול בשגיאות
- cache invalidation
- רשום ממצאים קריטיים בלבד"
```

### שלב 9: בדיקות נוספות
```
"בדיקות משלימות:

1. בדוק ש-src/design-system.js תואם את השימוש בפועל
2. בדוק שכל route ב-App.jsx מצביע לדף קיים
3. בדוק שאין TODO/FIXME/HACK קריטיים בקוד
4. בדוק שה-.env.example מעודכן עם כל המשתנים הדרושים
5. בדוק שה-PWA manifest תקין
6. בדוק שאין console.log/console.error שנשארו בקוד production"
```

## דוח בדיקת מערכת מלאה
```markdown
# דוח בדיקת מערכת מלאה - [תאריך]

## סיכום מנהלים
- סטטוס כללי: ✅ תקין / ⚠️ יש ממצאים / ❌ בעיות קריטיות
- בנייה: ✅/❌
- הרשאות: ✅/⚠️/❌
- אבטחה: ✅/⚠️/❌
- פורטל ספקים: ✅/⚠️/❌
- RTL ונגישות: ✅/⚠️/❌
- Hooks & Queries: ✅/⚠️/❌

## 1. בנייה
- lint: ✅/❌ (X errors, Y warnings)
- format: ✅/❌
- typecheck: ✅/❌ (X errors)
- build: ✅/❌

## 2. הרשאות ותפקידים
- דפים מוגנים כראוי: X/Y
- ממצאים: ...

## 3. Feature Modules
- modules מחוברים: X/Y
- קומפוננטות יתומות: X
- hooks יתומים: X

## 4. אבטחה (סיכום)
- ממצאים קריטיים: X
- ממצאים בינוניים: X

## 5. פורטל ספקים (סיכום)
- בידוד נתונים: ✅/❌
- ownership checks: ✅/❌

## 6. RTL ונגישות (סיכום)
- שימושי LTR hardcoded: X
- aria-labels חסרים: X

## 7. Hooks & Queries (סיכום)
- hooks עם queryKeys מרכזיים: X/Y
- mutations ללא invalidation: X

## פעולות נדרשות (לפי עדיפות)
### קריטי (חוסם שחרור)
1. ...

### חשוב (צריך לתקן בהקדם)
1. ...

### שיפור (לטפל בהזדמנות)
1. ...
```

## טיפים להרצה
- **הרצה מלאה:** כ-30-45 דקות. מומלץ להשתמש ב-subagents למקביליות
- **הרצה מהירה:** דלג על שלבים 4-8 ובדוק רק בנייה + הרשאות
- **הרצה ממוקדת:** הרץ רק את ה-skills הרלוונטיים לשינוי שעשית

## דגשים
- **שלב 1 הוא חוסם** - אם הבנייה לא עוברת, אין טעם להמשיך
- השתמש ב-`use subagents` להאצת הבדיקה כשמריצים בדיקה מלאה
- שמור את הדוח ב-docs/ לצורך השוואה בין גרסאות
- אם יש ממצאים קריטיים - תקן לפני שחרור
- עדכן את docs/LESSONS_LEARNED.md עם ממצאים חשובים

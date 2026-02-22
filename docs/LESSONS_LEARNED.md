# Lessons Learned - NatID CRM
## לקחים, תיקונים והערות חשובות

**מסמך זה מתעדכן אחרי כל תיקון משמעותי או לקח חשוב.**
**מטרה: למנוע חזרה על טעויות ולשפר את איכות העבודה של Claude.**

---

## איך להוסיף רשומה

```markdown
### [YYYY-MM-DD] קטגוריה: כותרת קצרה

**בעיה:** מה קרה?
**פתרון:** מה עשינו?
**לקח:** מה ללמוד מזה?
**קבצים:** אילו קבצים הושפעו?
```

קטגוריות: `Bug` | `Feature` | `Architecture` | `Performance` | `Security` | `Convention` | `Tooling`

---

## לקחים

### [2026-02-04] Convention: הקמת תשתית Claude Workflow

**בעיה:** לא הייתה תשתית מסודרת לעבודה עם Claude Code בפרויקט.
**פתרון:** נוצרו CLAUDE.md, skills, plan templates, workflow docs, worktree scripts.
**לקח:** תשתית מסודרת מראש חוסכת זמן רב ומפחיתה טעויות.
**קבצים:** `CLAUDE.md`, `.claude/`, `docs/CLAUDE_WORKFLOW.md`, `scripts/worktree-setup.sh`

---

### [2026-02-08] Tooling: ניקוי ESLint unused imports ו-npm audit fix

**בעיה:** 31 שגיאות ESLint מסוג unused-imports, 13 פגיעויות NPM.
**פתרון:** הרצת `eslint --fix` (31 שגיאות תוקנו, 0 errors נותרו), `npm audit fix` (13→4 פגיעויות). 4 הנותרות דורשות breaking changes (jspdf, react-quill).
**לקח:** להריץ `npm run lint:fix` ו-`npm audit fix` באופן קבוע. פגיעויות שדורשות `--force` צריכות בדיקה ידנית.
**קבצים:** 11 קבצי src (unused imports), `package-lock.json`

---

### [2026-02-22] Bug: שגיאת 422 ביצירת/עריכת ספק — שדות לא מוכרים

**בעיה:** טפסי יצירת ספק (NewVendor, EditVendor, ServiceProviders dialog) שלחו שדות שאינם קיימים בסכמת Base44: `vehicle_types_supported`, `coverage_cities`, `is_available_now`. בנוסף, `payment_rate_per_call` נשלח כ-string ריק במקום number/null. כל אלה גרמו לשגיאות 422 Unprocessable Entity.
**פתרון:** (1) נבנו סכמות Zod ב-`strict()` mode שדוחות שדות לא מוכרים. (2) נוצרו פונקציות `sanitizeVendorCreate/Update` שמנקות את הנתונים לפני שליחה ל-API. (3) הולידציה שולבה בכל 3 הטפסים.
**לקח:** לבדוק את הסכמה המדויקת של Base44 Entity לפני בניית טפסים. שימוש ב-Zod strict() מונע שגיאות 422 בזמן פיתוח במקום ב-production.
**קבצים:** `src/lib/schemas/vendor.js`, `src/pages/NewVendor.jsx`, `src/pages/EditVendor.jsx`, `src/features/vendors/index.jsx`

---

### [2026-02-22] Bug: הזמנת ספקים עם תפקיד 'user' במקום 'vendor'

**בעיה:** כשמנהל הזמין ספק דרך טופס NewVendor, התפקיד שנשלח ל-Base44 היה `'user'` במקום `'vendor'`. כתוצאה, ספקים שהוזמנו לא יכלו לגשת לפורטל הספקים.
**פתרון:** שינוי הפרמטר `role` מ-`'user'` ל-`'vendor'` בקריאת ההזמנה בעמוד NewVendor.
**לקח:** לוודא שתפקיד המשתמש תואם את סוג הישות שנוצרת. לבדוק את ה-invite flow מקצה לקצה (לא רק את יצירת הרשומה).
**קבצים:** `src/pages/NewVendor.jsx`

---

### [2026-02-22] Bug: מיפוי תפקיד Base44 'user' נכשל — שיטת ההרשאות

**בעיה:** Base44 מחזירה `role: "user"` לכל המשתמשים שאינם admin, אבל המערכת ציפתה לתפקידים ספציפיים (`admin`/`operator`/`vendor`/`agent`). כתוצאה, כל המשתמשים שלא היו admin נחסמו מגישה לכל הדפים.
**פתרון:** נוצרה פונקציית `resolveEffectiveRole()` ב-PermissionsContext שממפה את התפקיד מ-Base44 לתפקיד אפליקטיבי: (1) בודקת `UserPermission` entity. (2) בודקת `Role` entity. (3) תומכת בשמות תפקידים בעברית (מוקדן→operator, נציג שטח→agent). (4) Fallback ל-operator אם אין מידע.
**לקח:** אל תניח שה-role שה-platform מחזיר תואם לתפקיד באפליקציה. צריך שכבת תרגום מפורשת בין roles של ה-platform לבין roles של המערכת.
**קבצים:** `src/components/permissions/PermissionsContext.jsx`, `src/components/auth/RoleGuard.jsx`

---

### [2026-02-22] Architecture: סנכרון בין מערכת הרשאות role-based לבין granular permissions

**בעיה:** שלוש בעיות שהתגלו יחד: (1) `canAccessPage` בדק רק granular permissions ולא את PAGE_PERMISSIONS הרול-בייסד, מה שגרם לחוסר התאמה בין הסיידבר ל-routing. (2) 11 דפים (OperationalRates, ProductCatalog ועוד) לא היו מוגדרים כלל בקונפיגורציית ההרשאות — וכתוצאה היו נגישים לכל תפקיד כולל ספקים. (3) ברירות המחדל של Operator לא תאמו את PAGE_PERMISSIONS, מה שהסתיר 6 קישורים בסיידבר.
**פתרון:** (1) `canAccessPage` בודק עכשיו role-based first ואז granular. (2) כל 11 הדפים החסרים הוגדרו. (3) ברירות המחדל של Operator סונכרנו. (4) נמחקו הגדרות מתות (AgentDashboard/AgentCallManagement).
**לקח:** מערכת הרשאות כפולה (role-based + granular) דורשת סנכרון מתמיד. כשמוסיפים דף חדש — חובה להוסיף גם הגדרת הרשאה ב-PAGE_PERMISSIONS.
**קבצים:** `src/components/permissions/PermissionsContext.jsx`, `src/config/permissions.js`

---

### [2026-02-22] Tooling: תשתית בדיקות — Vitest + Zod schemas + 55 טסטים

**בעיה:** לא הייתה תשתית בדיקות בפרויקט — אין unit tests, אין ולידציית סכמות, ואין דרך אוטומטית לתפוס שגיאות לפני שליחה ל-API.
**פתרון:** (1) התקנת Vitest + React Testing Library + jsdom. (2) יצירת סכמות Zod לישויות Vendor, Call, Customer. (3) כתיבת 55 טסטים שמכסים ולידציית סכמות, queryKeys ו-utils. (4) הוספת npm scripts: `test`, `test:watch`, `test:coverage`. (5) שילוב בדיקות ב-pre-commit hooks.
**לקח:** Zod schemas עם strict() הם הדרך הטובה ביותר למנוע 422 errors. להוסיף טסטים כבר משלב מוקדם — זה חוסך debug ב-production.
**קבצים:** `vitest.config.js`, `src/lib/schemas/`, `src/__tests__/`, `package.json`

---

### [2026-02-22] Feature: כפתור טעינת נתוני דמו + תוכנית בדיקות QA

**בעיה:** לא הייתה דרך נוחה לטעון נתוני דמו לבדיקות, ולא היה מסמך בדיקות מסודר.
**פתרון:** (1) פונקציית `seedDemoData.ts` שיוצרת 12 משתמשים, 10 ספקים, 30 קריאות ונתונים נלווים. (2) כפתור "טען נתוני דמו" בדף הגדרות (admin בלבד). (3) מסמך `QA_DEMO_TEST_PLAN.md` עם 180+ תרחישי בדיקה.
**לקח:** נתוני דמו ריאליסטיים (לא random) מאפשרים בדיקות משמעותיות יותר. כפתור UI עדיף על קריאת API ידנית.
**קבצים:** `functions/seedDemoData.ts`, `src/pages/Settings.jsx`, `docs/QA_DEMO_TEST_PLAN.md`

---

<!-- הוסף רשומות חדשות מעל שורה זו -->

## סטטיסטיקות

| קטגוריה | מספר רשומות |
|----------|-------------|
| Bug | 3 |
| Feature | 1 |
| Architecture | 1 |
| Performance | 0 |
| Security | 0 |
| Convention | 1 |
| Tooling | 2 |
| **סה"כ** | **8** |

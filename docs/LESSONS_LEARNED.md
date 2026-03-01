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

### [2026-02-28] Security: דליפת נתוני ספקים — מעבר ל-server-side scoping

**בעיה:** דפי פורטל ספקים (VendorPortal, MyCallsVendor, VendorMap, VendorPayments) שלפו את **כל** הקריאות/ספקים/תשלומים דרך `base44.entities` וסיננו בצד הלקוח. ספק יכול היה לראות נתונים של ספקים אחרים דרך Network Inspector.
**פתרון:** (1) כל נתוני ספקים עוברים דרך `getVendorScopedData` — פונקציית שרת שמחזירה רק נתונים השייכים לספק המאומת. (2) נוצרה `updateVendorCall` — עדכון קריאה עם allowlist שדות, אימות בעלות, וולידציית מעברי סטטוס. (3) Pattern: ספקים → server-scoped, admin/operator → גישה ישירה.
**לקח:** לעולם אל תסנן נתונים רגישים בצד הלקוח. פונקציות server-side עם בדיקת בעלות הן הדרך היחידה לבידוד multi-tenant.
**קבצים:** `functions/getVendorScopedData.ts`, `functions/updateVendorCall.ts`, `src/pages/VendorPortal.jsx`, `src/pages/VendorCallManagement.jsx`, `src/pages/MyVendorProfile.jsx`

---

### [2026-02-27] Security: Rate limiting על כל פונקציות השרת

**בעיה:** 23+ פונקציות backend ללא rate limiting. משתמש מאומת יכול היה לקרוא ללא הגבלה — שימוש לרעה ב-SMS, AI, ופעולות ספקים.
**פתרון:** (1) נוצר מודול `_shared/rateLimit.ts` — Deno KV sliding window. (2) הוחל על 27 פונקציות עם דרגות: SMS 10/דק', AI 5-10/דק', ספקים 20-60/דק', webhooks 100/דק'/IP. (3) Google Maps cache 4 שעות + מכסה 20K/יום.
**לקח:** כל פונקציית backend צריכה rate limiting מיום אחד. מודול משותף מונע חוסר עקביות. סוגי פונקציות שונים דורשים limits שונים.
**קבצים:** `functions/_shared/rateLimit.ts`, כל 27 קבצי `functions/*.ts`

---

### [2026-02-27] Security: מניעת XSS, הקשחת auth, וסניטיזציית שגיאות

**בעיה:** ייצוא HTML/CSV פגיע ל-XSS ו-formula injection. Webhooks ללא auth. 4 פונקציות AI ו-sendFeedbackSMS ללא בדיקת auth. `Math.random()` לייצור secrets. הודעות שגיאה חושפות מידע פנימי.
**פתרון:** (1) `escapeHtml()` + `sanitizeCsvValue()` בייצוא. (2) Webhook auth ל-99digitalBot ו-externalCrmWebhook. (3) Auth checks לכל הפונקציות. (4) `crypto.getRandomValues()` במקום `Math.random()`. (5) הסרת `error.message` מתשובות backend.
**לקח:** סקירת אבטחה חייבת להיות שיטתית — כל endpoint לauth, כל output ל-injection, כל ערך אקראי ל-crypto safety, כל תשובת שגיאה לדליפת מידע.
**קבצים:** `functions/99digitalBot.ts`, `functions/externalCrmWebhook.ts`, `functions/sendSMS.ts`, `src/components/ui/ExportMenu.jsx`, 20+ קבצי backend

---

### [2026-02-27] Architecture: איחוד AuthProviders, API clients, labels, queryKeys

**בעיה:** (1) 3 AuthProviders שגרמו ל-2 קריאות `base44.auth.me()` מיותרות בכל טעינת דף. (2) 2 קבצי API client זהים. (3) `issueTypeLabels` מועתק ב-11+ קבצים עם חוסר עקביות. (4) React Query keys inline ב-56+ קבצים — גורם ל-cache misses. (5) 18 קריאות `base44.auth.me()` מיותרות.
**פתרון:** (1) AuthProvider אחד. (2) `lib/api.js` canonical. (3) `config/labels.js` מרכזי. (4) `lib/queryKeys.js` מרכזי ב-56 קבצים. (5) החלפה ב-`usePermissions()`. מחיקת ~1,600 שורות.
**לקח:** שכפול הוא חוב ארכיטקטוני מצטבר: auth כפול = API calls מיותרים, labels כפולים = חוסר עקביות בעברית, query keys כפולים = cache misses.
**קבצים:** `src/config/labels.js`, `src/lib/queryKeys.js`, `src/providers/AuthProvider.jsx`, 56+ קבצים

---

### [2026-02-27] Performance: staleTime ב-React Query hooks

**בעיה:** Feature hooks (calls, customers, queue) ללא `staleTime` — refetch בכל mount גם כשהנתונים נשלפו שניות קודם.
**פתרון:** staleTime לפי סוג: קריאות 1 דק', לקוחות 2 דק', אינטראקציות 5 דק', תור 30 שניות. Default staleTime 2 דק' ב-QueryClient.
**לקח:** React Query default staleTime=0 גורם ל-refetch בכל mount. להגדיר staleTime לפי תדירות השינוי בנתונים. Global default תופס hooks ששכחו.
**קבצים:** `src/features/calls/hooks/useCalls.js`, `src/features/customers/hooks/useCustomers.js`, `src/features/queue/hooks/useQueue.js`, `src/lib/query-client.js`

---

### [2026-02-28] Convention: מיגרציה מקיפה ל-RTL logical properties

**בעיה:** ~60+ קומפוננטות השתמשו ב-classes LTR קשיחים (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`) שנשברים ב-RTL עברית.
**פתרון:** החלפה גורפת: `ml/mr` → `ms/me`, `pl/pr` → `ps/pe`, `left/right` → `start/end` ב-~60 קבצים.
**לקח:** בפרויקט RTL-first, לעולם אל תשתמש ב-classes כיווניים. להוסיף ESLint rule שתופס `ml-`, `mr-`, `pl-`, `pr-` לפני שנכנסים ל-codebase.
**קבצים:** ~60 קבצים ב-`src/components/`, `src/features/`, `src/pages/`

---

### [2026-02-28] Convention: נגישות — htmlFor/id associations בטפסים

**בעיה:** רכיבי Label לא היו משויכים ל-Input/Select/Textarea שלהם דרך `htmlFor`/`id` — בלתי נגישים ל-screen readers.
**פתרון:** ~130 שיוכי label-input ב-14 קבצים: NewVendor, EditVendor, CallEditDialog (~49 שדות), ContractFormDialog (22 שדות ב-4 טאבים), הגדרות (8+7+4+8), דפי סינון. תרגום `aria-label` מאנגלית לעברית.
**לקח:** כל שדה טופס חייב `htmlFor`/`id` מפורש. Pattern כמו `FieldRow` (CallEditDialog) אוכף עקביות. Aria labels חייבים להיות בשפת האפליקציה.
**קבצים:** `src/pages/NewVendor.jsx`, `src/pages/EditVendor.jsx`, `src/components/call-details/CallEditDialog.jsx`, `src/components/contracts/ContractFormDialog.jsx`, 10+ קבצי הגדרות

---

### [2026-02-28] Architecture: הסרת dead code — ~6,000+ שורות בכמה מעברים

**בעיה:** הצטברות dead code: 7 רכיבי vendor feature יתומים (2,891 שורות), 12 רכיבי UI + 2 hooks מתים (~1,270 שורות), 13 רכיבי shadcn/ui לא בשימוש (~1,523 שורות), 3 פונקציות backend מתות, שירות מת, hooks מתים.
**פתרון:** הסרה שיטתית במעברים קטנים, אימות lint+build אחרי כל מעבר. סה"כ ~6,000+ שורות.
**לקח:** Dead code מצטבר מהר בפרויקטים עשירי-פיצ'רים. ביקורת תקופתית עם ניתוח imports (`grep -r` לאפס הפניות) צריכה להיות חלק ממחזור התחזוקה.
**קבצים:** 40+ קבצים שנמחקו ב-`src/components/ui/`, `src/features/`, `src/hooks/`, `functions/`

---

### [2026-02-27] Tooling: אימוץ feature hooks — החלפת קריאות API ישירות

**בעיה:** דפים רבים קראו ישירות ל-`base44.entities` במקום feature hooks (`useCalls`, `useCustomers`, `useVendors`), מה שגרם ל: query key mismatches, חסרון `onError` handlers, חסרון cache invalidation.
**פתרון:** מיגרציה של NotificationSettings, EditCustomer, EditVendor, Reports, Dashboard, CustomerDetails ל-feature hooks. הוספת `onError` + toast feedback לכל mutations. עטיפת `mutateAsync` ב-try/catch.
**לקח:** Feature hooks הם מקור אמת יחיד לגישה לנתונים. קריאות API ישירות בדפים יוצרות query key mismatches ועוקפות error handling משותף.
**קבצים:** `src/pages/NotificationSettings.jsx`, `src/pages/EditCustomer.jsx`, `src/pages/EditVendor.jsx`, `src/pages/Reports.jsx`, `src/pages/Dashboard.jsx`

---

<!-- הוסף רשומות חדשות מעל שורה זו -->

## סטטיסטיקות

| קטגוריה | מספר רשומות |
|----------|-------------|
| Bug | 3 |
| Feature | 1 |
| Architecture | 3 |
| Performance | 1 |
| Security | 3 |
| Convention | 3 |
| Tooling | 3 |
| **סה"כ** | **17** |

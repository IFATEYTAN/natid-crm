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

### [2026-06-17] Feature: שיבוץ ספק — סוג רכב בכל המסכים, יעדי אחסנה, וספק נוסף

**בעיה:** אחרי הוספת בורר "סוג רכב שירות" (ניידת/גרר/גרר עם אחסנה) לדיאלוג השיבוץ, התגלו שלושה פערים: (6) הבורר נוסף רק לקומפוננטה המשותפת ברשימת הקריאות — מסך "צפה" (CallDetails) השתמש בדיאלוג שיבוץ **משוכפל** משלו ולכן לא קיבל אותו; (7) ב"גרר עם אחסנה" לא ניתן היה לערוך את היעדים (איסוף→אחסנה→יעד סופי); (8) המערכת **חסמה** שיבוץ ספק נוסף על קריאה משובצת ללא מסלול חלופי.
**פתרון:** איחדתי את שני הדיאלוגים לקומפוננטה אחת (`AssignVendorDialog`) המשמשת גם ברשימה וגם ב"צפה" — כולל בורר סוג רכב, המלצת AI ואזהרת מיקום. נוספו שדות **אחסנה** + **יעד סופי** (נשמרים ל-`storage_location_*` / `dropoff_location_*`) כשנבחר "גרר עם אחסנה". בקריאה משובצת מוצגות שתי פעולות מפורשות: **החלף ספק** (אותה קריאה) או **המשך עם ספק נוסף** — האחרון פותח **קריאת המשך מקושרת** דרך `createContinuationCall` (נקודת איסוף = המיקום/אחסנה הנוכחיים), בהתאם לארכיטקטורת קריאות-ההמשך הקיימת. כן חולץ `CityAutocomplete` מ-`NewCase` לקומפוננטה משותפת, ונוסף השדה `dispatch_type` לסכמת ישות `Call`.
**לקח:** דיאלוג שיבוץ משוכפל גרם לכך ששיפור הוחל רק בחלק מהמסכים. כשמוסיפים יכולת לזרימה שמופיעה בכמה מסכים — לאחד לקומפוננטה אחת במקום לשכפל. "ספק נוסף" אינו שדה חדש אלא קריאת המשך — להישען על מנגנון קיים.
**קבצים:** `src/components/calls/AssignVendorDialog.jsx`, `src/components/forms/CityAutocomplete.jsx`, `src/pages/CallDetails.jsx`, `src/pages/NewCase.jsx`, `base44/entities/Call.jsonc`

---

### [2026-06-15] Bug: לולאת התחברות בפרודקשן (חזרה למסך כניסה)

**בעיה:** אחרי התחברות מוצלחת ב-Base44, המשתמש הוחזר שוב למסך הכניסה (redirect loop) — **רק בפרודקשן**, לא בפיתוח.
**פתרון:** ה-Service Worker (פעיל רק בפרודקשן; `devOptions.enabled: false`) שמר ב-cache את **כל** קריאות `/api/` כולל `User/me` ו-`public-settings` — בדיוק הנקודות שקובעות אם המשתמש מחובר. עם `NetworkFirst` + timeout של 10ש', תשובה ישנה (מלפני ההתחברות) הוגשה מה-cache והאפליקציה "חשבה" שהמשתמש מנותק → חזרה למסך כניסה. התיקון: כלל `NetworkOnly` ל-endpoints של אימות (`/entities/User/me`, `/public-settings/`, `/auth/`, `/login`) לפני כלל ה-`/api/` הכללי, כך שלעולם לא תוגש תשובת אימות ישנה. בנוסף: ניקוי token פגום מ-`localStorage` כש-`auth_required` מוחזר, כדי שטוקן ישן לא יתקע את הלולאה בין רענונים.
**לקח:** ב-PWA אסור לשמור ב-cache תשובות שקובעות מצב אימות. SW פעיל רק בפרודקשן — באג "שקורה רק בפרוד" מצביע כמעט תמיד על ה-SW/cache.
**קבצים:** `vite.config.js`, `src/providers/AuthProvider.jsx`, `src/lib/app-params.js`

---

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

### [2026-06-08] Bug: חסימות חוזרות של ה-IP מול ה-MySQL של נתי (max_connect_errors)

**בעיה:** ה-RDS של נתי חוסם את ה-IP שלנו (`209.38.223.238`) עם `Host is blocked because of many connection errors` — חוזר שוב ושוב, גם כשאף אחד לא עובד במערכת. נתי לא מוכנים להעלות את `max_connect_errors` (ברירת מחדל 100), אז כל הנטל עלינו. שתי דליפות שצברו שגיאות: (1) `connectTimeout` של 5 שניות — האטה רגעית של RDS נספרה ככשל; (2) אין back-off — ברגע שנחסמנו, סנכרון רקע המשיך לדפוק, וכל ניסיון בזמן חסימה מוסיף עוד שגיאה, כך שה-FLUSH HOSTS הידני של נתי התאפס תוך דקות.
**פתרון:** מודול משותף `base44/functions/_shared/natiDb.ts` עם: (א) `connectTimeout` שהוארך ל-20 שניות; (ב) circuit breaker מבוסס Deno KV (משותף לכל הפונקציות ועמיד בין הרצות) — ברגע שמזהים כשל חיבור / "Host is blocked" עוצרים את כל הניסיונות ל-cooldown (10 דק' לחסימה, 2 דק' אחרי 3 כשלים) במקום להוסיף עוד שגיאות; (ג) הודעות שגיאה ברורות בעברית במקום 500 מוצפן. כל 5 פונקציות הנתי עברו להשתמש בו.
**לקח:** כשמגבלת `max_connect_errors` בצד הספק לא ניתנת לשינוי, חובה circuit breaker עמיד (לא in-memory בלבד) — אחרת שחרור ידני של החסימה לא מחזיק, כי כל ניסיון בזמן חסימה בונה מחדש את המונה. גם: timeout אגרסיבי הוא מקור נסתר לכשלי-חיבור.
**קבצים:** `base44/functions/_shared/natiDb/entry.ts`, `base44/functions/{syncNatiData,closeStaleNatiCalls,fetchNatiAppeals,fetchLiveNatiData,testNatiConnection}/entry.ts`

---

### [2026-07-05] תיקון: ה-circuit breaker המשותף מה-08/06 מעולם לא היה בפועל משותף

**בעיה:** הרשומה למעלה מתעדת "מודול משותף עם Deno KV" — אבל בפועל, ה-import של `_shared/natiDb` נכשל בפריסה, אז מישהו הטמיע (inline) את הלוגיקה בנפרד בכל אחת מ-7 הפונקציות (גם `discoverNatiPricing` ו-`importNatiPricing` שנוספו מאז), עם משתנה זיכרון פשוט (`let natiCircuit = {...}`) במקום Deno KV, ותיעד בהערה "Deno KV unavailable in this runtime". זו טעות: Deno KV עובד מצוין ב-23+ פונקציות אחרות (`_shared/rateLimit`, וגם `_shared/rateLimit` עצמו מיובא בהצלחה כמודול משותף מ-23 פונקציות!) — כלומר גם ה"מודול משותף נכשל" וגם "Deno KV לא זמין" לא היו נכונים באופן עקרוני; מה שכשל היה ספציפית ל-`_shared/natiDb.ts` (הסיבה המדויקת לא ידועה, הקובץ נמחק). התוצאה בפועל: 7 "מדי כשלים" נפרדים לגמרי לא מודעים זה לזה ומתאפסים בכל cold start — בדיוק התרחיש שהלקח מ-08/06 הזהיר ממנו.
**פתרון:** כל 7 הפונקציות עברו לקרוא/לכתוב מפתח KV משותף אחד (`['nati_circuit']`) דרך `Deno.openKv()`, בלי תלות ב-import חוצה-קבצים (כל קובץ נשאר עצמאי, רק המצב עצמו חי ב-KV ולא בזיכרון). גם מצב "הסנכרון האחרון" (`syncNatiData`) עבר מזיכרון ל-KV מאותה סיבה.
**לקח:** לפני שכותבים בקוד "X לא זמין בסביבה הזו" — לבדוק אם X בשימוש במקום אחר בקודבייס. הערת קוד שמצדיקה ויתור ארכיטקטוני צריכה ראיה, לא רק ניסיון כושל אחד.
**קבצים:** `base44/functions/{syncNatiData,testNatiConnection,closeStaleNatiCalls,fetchNatiAppeals,fetchLiveNatiData,discoverNatiPricing,importNatiPricing}/entry.ts`

---

### [2026-06-14] Feature: עמודות אחידות ומלאות בכל מסכי הקריאות

**צורך:** כפתור "עמודות" (התאמת תצוגה) הציג רק חלק מהשדות, ולכל מסך הייתה רשימת עמודות שונה — `Calls.jsx` רינדר טבלה עם עמודות מקודדות-קשיח, בעוד `MyQueue`/`QueueMonitor` השתמשו ב-`buildCallColumns`. לכן השדות שביקש הלקוח (לפי 3 תמונות של טבלה רחבה) לא הופיעו במלואם.
**פתרון:** `buildCallColumns` הפך למקור אמת יחיד עם כל ~32 השדות מהתמונות בסדר 18→19→20 (פעולות → זמן המתנה/סטטוס/רכב/ספק/יעדים/תקלה → קוד קריאה/לקוח/טלפון/מוקדן → תשלום/מחלקה/בקר). `Calls.jsx` עבר לרנדר דינמית מאותו מקור במקום `<td>` קשיחים. שדות שאין להם עדיין נתון ב-Call (נציג מוכר, סיבת תשלום, תאריך תשלום, מוצר) מוצגים כ-"—" עם שמות שדה צפויים לעתיד. כל משתמש שומר את בחירת העמודות שלו דרך `useColumnVisibility` (UserDisplayPreference + localStorage).
**לקח:** כשאותה ישות מוצגת בכמה מסכים, הגדרת עמודות אחת משותפת (header+cell) מונעת סחף בין מסכים. רינדור עמודות מ-array דינמי במקום `<td>` ידני לכל שדה מאפשר הוספת שדות במקום אחד בלבד.
**קבצים:** `src/components/calls/callTableColumns.jsx`, `src/pages/Calls.jsx`

---

### [2026-06-15] Bug+Feature: גלילה אופקית בטבלאות, שיבוץ ספק מרשימת הקריאות, ונתונים בניטור תורים

**בעיה (משוב משתמשים):** (1) בטבלאות הרחבות (למשל "רשימת המתנה" בניטור תורים) הסינון עבד אבל לא הייתה גלילה אופקית — ~30 עמודות נדחסו לרוחב המסך מבלי שתופיע פס גלילה. (2) ברשימת הקריאות לא ניתן היה "לתפעל ספק" — השורות היו קישור בלבד ל-CallDetails ללא תפריט פעולות. (3) בניטור תורים לא הוצגו נתונים בחלק מהשורות.
**פתרון:** (1) `DataTable` המשותף קיבל `whitespace-nowrap` על תאי הכותרת והגוף, כך שהתוכן לא מתכווץ והגלילה האופקית (`overflow-x-auto` הקיים) נכנסת לפעולה — בדומה ל-`Calls.jsx` שכבר השתמש ב-`min-w` + `whitespace-nowrap`. (2) נוצר רכיב משותף `AssignVendorDialog` (שיבוץ אוטומטי לפי מיקום + בחירה ידנית + הגנת concurrency), ונוסף תפריט "פעולות" בכל שורה ברשימת הקריאות (`CallRowActions`) הפותח אותו ישירות מהטבלה. (3) ב-`QueueMonitor` הוגדל limit השליפה של הקריאות מ-300 ל-2000 כדי שכל פריט בתור ימצא את הקריאה המשויכת אליו (אחרת התאים מוצגים כ-"—").
**לקח:** טבלה עם הרבה עמודות לא תגלל אופקית רק בזכות `overflow-x-auto` — צריך למנוע התכווצות תוכן (`whitespace-nowrap` או `min-w`) כדי שהרוחב יחרוג מהמיכל. כשפעולה (שיבוץ ספק) נדרשת במספר מסכים — עדיף לחלץ דיאלוג משותף לשימוש חוזר במקום לשכפל לוגיקה. limit שליפה נמוך מדי שובר העשרת-נתונים (enrichment) שמסתמכת על מציאת הישות המקושרת.
**קבצים:** `src/components/ui/DataTable.jsx`, `src/components/calls/AssignVendorDialog.jsx`, `src/pages/Calls.jsx`, `src/pages/QueueMonitor.jsx`

---

### [2026-06-15] Feature: סטטוסי סגירה + קריאת המשך מקושרת

**בעיה:** סגירת קריאה לא תיעדה את תוצאת הטיפול בפועל, ולא היה מנגנון לפתיחת מקטע טיפול נוסף (למשל ניידת שלא צלחה → גרר, חילוץ → גרירת המשך, גרר לאחסנה).
**פתרון:** נוספו לסכמת Call השדות `closing_status` (7 ערכים), `parent_call_id`, `continuation_call_id`, `case_reference_code`. נוצר מודול קונפיג יחיד `src/config/closingStatuses.js` המגדיר לכל סטטוס: SMS ללקוח, פתיחת קריאת המשך, ומצב אחסנה. בעת סגירה נבחר סטטוס בדיאלוג; סטטוסי כשל/חילוץ (2,3,5,6) פותחים אוטומטית קריאת המשך מקושרת (createContinuationCall) עם קוד אירוע משותף; אחסנה (7) נסגרת ל-`in_storage` ללא SMS.
**לקח:** ריכוז כללי הסגירה בטבלת קונפיג אחת מאפשר השתלת נוסחי SMS סופיים ושינוי התנהגות ללא נגיעה בלוגיקה. נוסחי ה-SMS הם placeholder עד לקבלת הנוסחים הסופיים מהלקוח.
**קבצים:** `base44/entities/Call.jsonc`, `src/config/closingStatuses.js`, `src/features/calls/createContinuationCall.js`, `src/pages/CallDetails.jsx`

### [2026-06-22] Feature: חיווט תהליך קבלת קריאה → שיבוץ מקצה לקצה

**בעיה:** ביקורת מצאה שהתהליך לא עבד מקצה-לקצה: (1) שיבוץ ידני של מוקדן רק סימן `call_status='assigning'` בלי ליצור הצעה (`CallAssignmentAttempt`) ובלי להתריע לספק — הספק לא ראה דבר. (2) `sendVendorAssignmentSMS` לא נקראה מאף מקום. (3) המתזמן (`processStaleAssignments` ואחרים) לא רץ — פקיעת הצעות/שיבוץ-מחדש/הסלמה היו מתים. (4) הבוט קרא ל-`autoAssignVendor` עם פרמטר שגוי (`callId`) ועם בעיית auth, ומסנן המוקדנים שלו היה `role==='user'`. (5) `src/pages/NewCase.jsx` יצר קריאה בלי `WorkQueue`. (6) שלושת שדות הסטטוס (`Call`/`WorkQueue`/`Case`) לא היו מסונכרנים. (7) סיום-שדה ע"י ספק/טכנאי עקף את מנוע הסגירה (`closingStatuses`) — בלי SMS ובלי קריאת-המשך. (8) ל-`cannot_complete` לא הייתה פעולת המשך אצל המוקדן.
**פתרון:** הוחלט על מודל **הצעה + אישור ספק** ומתזמן כפול (poller + תיעוד פלטפורמה).
- **ליבת שיבוץ משותפת** `_shared/assignVendor`: ניקוד ספקים, זיהוי ספק תפוס, ו-`commitVendorAssignment` (יוצר הצעה, מסמן `assigning`, מתריע לספק in-app + SMS). כל המסלולים עוברים דרכה: `assignVendorToCall` (בחירת מוקדן), `autoAssignVendor` (advisory + commit אופציונלי), `handleAssignmentResponse`/`releaseVendorCall`/בוט (קוראים ישירות עם service-role — בלי עמימות auth בין-פונקציות). תוקנו פרמטר הבוט ומסנן התפקידים.
- **מתזמן**: `useStaleAssignmentPoller` (ב-Layout לאדמין/מוקדן) מפעיל `processStaleAssignments` כל ~2 דק'; `docs/SCHEDULED_FUNCTIONS.md` מתעד הגדרת מתזמן production. ה-reassign של המתזמן עבר ל-`autoOfferCall` (כולל התראה) והוסרה לוגיקת הניקוד המשוכפלת.
- **קליטה→תור**: `NewCase.jsx` יוצר כעת `WorkQueue`.
- **סנכרון סטטוס**: `_shared/syncCallStatus` ממפה `call_status`→`WorkQueue.queue_status`+`Case.status` (התאמה לפי `call_id`), מחווט ל-updateVendorCall/updateAgentCallStatus/handleAssignmentResponse/releaseVendorCall.
- **סגירה**: `closeCall` (משותף למוקדן/ספק/טכנאי) מיישם את כללי הסגירה (SMS ללקוח + קריאת-המשך + סנכרון תור) עם עותק backend ב-`_shared/closingStatuses`. סיום ע"י ספק/טכנאי דורש כעת בחירת `closing_status`. ב-CallDetails נוסף באנר טיפול ל-`cannot_complete`.
**לקח:** במערכת מבוזרת (Call/Function split של Base44) לוגיקה משותפת חייבת לחיות במודולי `_shared/<name>/entry.ts` (מיובאים כ-`./_shared/<name>.ts`); re-assignment בין-פונקציות עדיף שירוץ ישירות עם service-role במקום invoke-over-HTTP כדי להימנע מעמימות auth. סנכרון מצב חוצה-ישויות חייב מקור-אמת יחיד (Call) והתאמה לפי מזהה יציב (`call_id`).
**קבצים:** `base44/functions/_shared/{assignVendor,syncCallStatus,closingStatuses}/entry.ts`, `base44/functions/{assignVendorToCall,closeCall,autoAssignVendor,handleAssignmentResponse,releaseVendorCall,processStaleAssignments,updateVendorCall,updateAgentCallStatus,99digitalBot}/entry.ts`, `src/hooks/useStaleAssignmentPoller.js`, `src/components/layout/Layout.jsx`, `src/pages/NewCase.jsx`, `src/components/calls/AssignVendorDialog.jsx`, `src/pages/VendorCallManagement.jsx`, `src/components/agent/AgentCallCard.jsx`, `src/pages/CallDetails.jsx`, `docs/SCHEDULED_FUNCTIONS.md`

---

### [2026-06-22] Feature: עדכון סטטוס ע"י טכנאי — מאחורי הרשאה אדמיניסטרטיבית ייעודית

**בעיה:** נדרש לאפשר לטכנאי שטח לעדכן סטטוס קריאה מהשטח — אך לא לכל טכנאי/מוקדן באופן גורף, אלא רק למי שהמנהל הרשה במפורש.
**פתרון:** נוספה הרשאה גרנולרית חדשה `calls.update_status` (תווית "עדכון סטטוס קריאה") שברירת המחדל שלה `false` לכל התפקידים (גם agent וגם operator); מנהל מפעיל אותה per-role/per-user דרך `RoleManagement` (היא נכללת ב-`DEFAULT_PERMISSIONS` ולכן מופיעה כ-toggle). האכיפה היא **דו-שכבתית**: ב-UI הכפתורים בכרטיס הקריאה (`AgentCallCard`) מוצגים רק כש-`hasPermission('calls','update_status')`; ובצד שרת פונקציית `updateAgentCallStatus` קוראת בעצמה את `UserPermission` (custom_permissions → Role.permissions → false, עם bypass ל-admin), מאמתת בעלות דרך `WorkQueue.assigned_to_agent`, ומאמתת מעבר סטטוס חוקי (`AGENT_STATUS_TRANSITIONS`) לפני העדכון. נוספו לסכמת `Call` הערך `cannot_complete` ל-enum והשדות `agent_notes`, `cannot_complete_reason`.
**לקח:** הרשאה רגישה חייבת אכיפה בצד שרת ולא להסתמך על הסתרת כפתורים ב-UI; שכפול סדר הבדיקה של ה-client (custom→role→default) בתוך פונקציית ה-backend שומר על עקביות. הוספת מפתח ל-`DEFAULT_PERMISSIONS` היא מה שגורם לו להופיע אוטומטית בעורך התפקידים.
**קבצים:** `base44/functions/updateAgentCallStatus/entry.ts`, `base44/entities/Call.jsonc`, `src/components/permissions/PermissionsContext.jsx`, `src/pages/RoleManagement.jsx`, `src/components/agent/AgentCallCard.jsx`, `src/pages/AgentDashboard.jsx`, `src/pages/AgentCallManagement.jsx`

---

### [2026-06-22] Feature: סגירת פערים בתהליך שיוך — מניעת שיוך כפול, סטטוס "לא ניתן לטפל", החזרת קריאה ע"י ספק, ודפי טכנאי

**בעיה:** ארבעה פערים בתהליך מקבלת הקריאה ועד השיוך: (1) ספק יכול היה לקבל שתי קריאות במקביל — לא הייתה נעילה ברמת הספק (רק ברמת הקריאה). (2) לא היה סטטוס ביניים כשספק הגיע אך לא יכול להשלים (חניון נעול, חילוץ מורכב). (3) ספק לא יכול היה להחזיר קריאה באמצע — רק מוקדן/אדמין שייכו מחדש. (4) דפי הטכנאי (`AgentDashboard`, `AgentCallManagement`) לא מומשו, ולתפקיד `agent` לא היה פורטל.
**פתרון:**
- **מניעת שיוך כפול:** `autoAssignVendor` מסנן כעת גם ספקים שכבר מטפלים בקריאה פעילה (`vendor_enroute`/`vendor_arrived`/`in_progress`) או מחזיקים הצעה ממתינה (pending) על קריאה אחרת. `handleAssignmentResponse` חוסם קבלה אם לספק כבר יש קריאה פעילה אחרת (409).
- **סטטוס "לא ניתן לטפל":** נוסף `cannot_complete` ל-`labels.js` (תווית/צבע/openStatuses) ול-`VENDOR_STATUS_TRANSITIONS` ב-`updateVendorCall`; בעת דיווח נוצרת היסטוריה ונשלחת התראה למוקדנים/אדמינים.
- **החזרת קריאה ע"י ספק:** פונקציית backend חדשה `releaseVendorCall` — מנתקת את הספק, מחזירה את הקריאה ל-`awaiting_assignment`, משחררת את הספק, ומפעילה auto-reassign (החרגת הספק שהחזיר + ספקים שדחו). ב-UI נוסף דיאלוג "בעיה בטיפול / החזרת קריאה" ב-`VendorCallManagement`.
- **דפי טכנאי:** נוצרו `AgentDashboard` ו-`AgentCallManagement` (תצוגה מצומצמת לקריאה בלבד, ללא תלות ב-CallDetails שהוא operator-only), עם hook משותף `useAgentCalls` (חיבור WorkQueue↔Call לפי `assigned_to_agent`). נרשמו ב-`pages.config.js`, הורשו ל-`['admin','agent']` ב-`permissions.js`, ונוסף ניווט ייעודי + ניתוב בית לתפקיד agent ב-`App.jsx`/`Layout.jsx`.
**לקח:** מניעת מרוץ (race) בשיוך דורשת בדיקה גם ברמת המשאב (הספק) ולא רק ברמת היעד (הקריאה), ובשני הצדדים — בעת ההמלצה ובעת הקבלה. לתפקיד עם פורטל מצומצם (agent) עדיף לבנות מסכים עצמאיים שאינם נשענים על דפים מוגבלי-הרשאה.
**קבצים:** `base44/functions/autoAssignVendor/entry.ts`, `base44/functions/handleAssignmentResponse/entry.ts`, `base44/functions/updateVendorCall/entry.ts`, `base44/functions/releaseVendorCall/entry.ts`, `src/config/labels.js`, `src/config/permissions.js`, `src/pages.config.js`, `src/App.jsx`, `src/components/layout/Layout.jsx`, `src/pages/VendorCallManagement.jsx`, `src/components/vendor/VendorCallActionBar.jsx`, `src/pages/AgentDashboard.jsx`, `src/pages/AgentCallManagement.jsx`, `src/components/agent/AgentCallCard.jsx`, `src/hooks/useAgentCalls.js`

---

### [2026-07-05] Bug: שרשרת תקלות בחיבור לנתי — socat תקוע על DNS ישן, אימות TLS ב-Deno, ו-Deno KV לא זמין ב-Base44

**תיאור:** אחרי FLUSH HOSTS בצד נתי הסנכרון עדיין נכשל. האבחון חשף שלוש תקלות נפרדות שהתחזו לתקלה אחת:
1. **ה-relay ב-DigitalOcean‏ (socat על 209.38.223.238) היה תקוע על IP ישן** — socat מתרגם את שם ה-RDS ל-IP פעם אחת בעלייה, וה-IP של ה-RDS התחלף מאז יוני. כל התעבורה הגיעה למכונה זרה ב-AWS, שהחזירה שגיאות מוזרות. `systemctl restart socat-natid` פתר; נוסף `RuntimeMaxSec=86400` (override) לריענון DNS יומי אוטומטי.
2. **סביבת ה-Deno של Base44 תמיד מאמתת תעודות TLS** — היא מתעלמת מ-`rejectUnauthorized: false`, ו-mysql2 מקבע את שם האימות ל-`config.host` (ומתעלם מ-`ssl.servername`). הפתרון: הצמדת (pin) חבילת ה-CA הרשמית של Amazon RDS‏ il-central-1 בקוד, שם ה-RDS האמיתי ב-`config.host` (לאימות), וחיוג ל-IP הקבוע של ה-relay דרך `config.stream = () => net.connect(...)`. כך יש TLS מלא ומאומת דרך ה-relay. כשלי ה-TLS הקודמים נספרו כ-connection errors אצל נתי — כנראה המקור המרכזי לחסימות `max_connect_errors` החוזרות.
3. **‏Deno KV לא זמין בסביבת Base44** — `Deno.openKv()` זורק "Default database is not available", ולכן ה-circuit breaker המשותף (מ-08/06 ומ-PR ‎#159) מעולם לא באמת עבד שם, וגרוע מזה: הפיל ריצות שהחיבור עצמו הצליח בהן. כל הפונקציות עודכנו ל-fallback שקט לזיכרון מקומי.

**כללים תפעוליים שנקבעו:** `NATID_DB_HOST` חייב להצביע על ה-relay‏ (209.38.223.238), לא ישירות על ה-RDS (ה-Security Group של נתי מכניס רק את ה-IP הזה); הסוד `NATID_DB_TLS_SERVERNAME` מחזיק את שם ה-RDS לאימות התעודה; חיבור מוצלח מאפס את מונה השגיאות של נתי — סנכרון מתוזמן בריא הוא ההגנה הכי טובה מחסימה.

**לקח:** relay מבוסס socat חייב ריענון DNS מתוזמן (`RuntimeMaxSec`), אחרת החלפת IP של היעד מפילה אותו בשקט. בסביבת Deno אין לסמוך על `rejectUnauthorized:false` — תמיד להצמיד CA ולאמת מול שם אמיתי. ואסור להניח ש-API של הפלטפורמה (Deno KV) קיים בכל runtime — לעטוף ב-fallback ולדווח על זמינותו בנפרד, אחרת שגיאת תשתית פנימית מתחזה לשגיאת אינטגרציה חיצונית ומטעה את האבחון.

**קבצים:** `base44/functions/{testNatiConnection,syncNatiData,closeStaleNatiCalls,fetchNatiAppeals,fetchLiveNatiData,discoverNatiPricing,importNatiPricing}/entry.ts`; בצד השרת: `/etc/systemd/system/socat-natid.service.d/override.conf` ב-droplet של DigitalOcean

---

<!-- הוסף רשומות חדשות מעל שורה זו -->

## סטטיסטיקות

| קטגוריה | מספר רשומות |
|----------|-------------|
| Bug | 5 |
| Feature | 3 |
| Architecture | 3 |
| Performance | 1 |
| Security | 3 |
| Convention | 3 |
| Tooling | 3 |
| **סה"כ** | **21** |

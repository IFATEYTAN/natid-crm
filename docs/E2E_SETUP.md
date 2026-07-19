# E2E Test Pipeline — מדריך הקמה

מסמך זה מסביר את ה-pipeline האוטומטי של בדיקות לפרויקט: מה רץ, איפה, ומה דרוש כדי שהבדיקות המאומתות (full E2E) יעבדו ב-CI.

קהל יעד: צוות הפיתוח שמקבל את המערכת.

---

## ארכיטקטורה — Hybrid (מהיר + ריאליסטי)

```
┌─────────────────────────────────────────────────────────────┐
│  על כל PR / push לכל ענף (quick-tests, ~2 דקות)             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ npm run lint                                             ││
│  │ npm test            (Vitest — unit tests)                ││
│  │ npm run e2e         (Playwright structural — Vite local) ││
│  └─────────────────────────────────────────────────────────┘│
│  → רץ תמיד, חינם, מהיר. בלי secrets.                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  על push ל-main + nightly (full-e2e, ~10 דקות)              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ E2E מאומת על האפליקציה המפורסמת ב-Base44                 ││
│  │ עם משתמשי בדיקה (admin/operator/vendor)                  ││
│  │ ועם Test DB של Base44 (לא נוגע בפרודקשן)                ││
│  └─────────────────────────────────────────────────────────┘│
│  → רק אם GitHub Secrets מוגדרים. אחרת — מדלג בלי שגיאה.     │
└─────────────────────────────────────────────────────────────┘
```

---

## הקמה ראשונית (חד-פעמית)

### 1. ליצור 3 משתמשי בדיקה ב-Base44

צריך 3 משתמשים ייעודיים שלא יבלבלו עם הצוות:

| Email | Role | מטרה |
|---|---|---|
| `e2e-admin@natid.test` | admin | טסטים שדורשים הרשאת מנהל (sync, cleanup, settings) |
| `e2e-operator@natid.test` | operator | טסטים של יצירת קריאה, שיוך, ניהול |
| `e2e-vendor@natid.test` | vendor | טסטים של פורטל ספק, עדכון סטטוס |

**איך:**
1. Base44 Builder → **Users** → **Invite User**
2. צור 3 משתמשים עם המיילים לעיל
3. לכל אחד הגדר סיסמה חזקה (שמור בצד — תצטרכי בשלב 2)
4. לוודא ש-`enable_username_password: true` ב-Auth Config

> **הערה**: עדיף לא להשתמש במייל אמיתי שלך — אם יש שגיאה ב-test, את לא רוצה שיגיעו אליו 50 דוא"לים.

### 2. להוסיף GitHub Secrets

ב-GitHub: **Settings → Secrets and variables → Actions → New repository secret**

הוסיפי את 7 ה-secrets האלה:

| Secret name | ערך |
|---|---|
| `E2E_BASE_URL` | `https://nat-id-360-control-f4cb8a71.base44.app` (האפליקציה המפורסמת — לא נרדמת) |
| `E2E_ADMIN_EMAIL` | `e2e-admin@natid.test` |
| `E2E_ADMIN_PASSWORD` | (הסיסמה שהגדרת) |
| `E2E_OPERATOR_EMAIL` | `e2e-operator@natid.test` |
| `E2E_OPERATOR_PASSWORD` | (הסיסמה שהגדרת) |
| `E2E_VENDOR_EMAIL` | `e2e-vendor@natid.test` |
| `E2E_VENDOR_PASSWORD` | (הסיסמה שהגדרת) |
| `E2E_VENDOR_NAME` (אופציונלי) | שם התצוגה של ספק הבדיקה — כדי שהמוקדן יציע דווקא לו, וכך בדיקת המוקדן ובדיקת הספק ישתרשרו |
| `E2E_FOREIGN_CALL_ID` (אופציונלי) | מזהה קריאה אמיתי המשויך לספק **אחר** (לא ספק הבדיקה) — לחיזוק בדיקת ה-scoping ב-`e2e/vendor-scoping.spec.js`. בלעדיו הבדיקה משתמשת ב-UUID אקראי שלא קיים, שמכסה את אותו נתיב קוד (call not found / not owned) אך פחות ריאליסטי |
| `E2E_CUSTOMER_PHONE` + `E2E_CUSTOMER_CALL_NUMBER` (אופציונלי, זוג) | טלפון + מספר קריאה של קריאה אמיתית וקיימת ב-DB — מפעיל את בדיקת ה-lookup המלאה ב-`e2e/customer-portal.spec.js` (הזנה → כרטיס סטטוס). בלעדיהם רק הנתיב השלילי (bogus credentials) נבדק |

**שים לב:** Secrets שמתחילים ב-`E2E_` כי כך הקוד מצפה לקרוא אותם.

### תנאי seed לתהליך המלא

כדי שבדיקת ה-lifecycle תושלם ולא תדלג באמצע, צריך **ספק זמין אחד לפחות**:
רשומת `Vendor` עם `is_active: true` ו-`availability_status: 'available'`. רצוי שזה יהיה
אותו ספק שמתחברים אליו ב-`E2E_VENDOR_*` ושמופיע ב-`E2E_VENDOR_NAME` — אחרת ההצעה תגיע
לספק אחר וצד-הספק ידלג ("אין הצעה ממתינה").

### 3. לאמת שזה רץ

1. ב-GitHub: **Actions → Tests → Run workflow** (טריגר ידני)
2. תראי 2 jobs:
   - `quick-tests` — תמיד ירוץ
   - `full-e2e` — ירוץ אם ה-secrets מוגדרים
3. הורידי את `playwright-report-full` artifact כדי לראות screenshots/traces

---

## להריץ לוקאלית

```bash
# מהיר — נגד Vite מקומי, בלי auth
npm run e2e

# מלא — נגד Base44 עם משתמשי בדיקה
export E2E_BASE_URL=https://nat-id-360-control-f4cb8a71.base44.app
export E2E_ADMIN_EMAIL=e2e-admin@natid.test
export E2E_ADMIN_PASSWORD=...
npm run e2e

# Debug ספציפי בדפדפן פתוח
npx playwright test e2e/nati-sync.spec.js --debug

# רק טסט אחד
npx playwright test --grep "structural"
```

---

## כיסוי: תהליך הקריאה המלא (`call-lifecycle.spec.js`)

הבדיקה משקפת את מודל **הצעה + אישור** בפועל:

1. **Structural** (תמיד) — אנונימי לא מגיע ל-`/NewCase`.
2. **מוקדן** (`E2E_ADMIN_*`) — קליטה ב-`/NewCase` → **הצעת** ספק → הקריאה עוברת ל-"ספק שובץ" (`assigning`)
   ונוצרת `CallAssignmentAttempt` ממתינה + התראה לספק.
3. **ספק** (`E2E_VENDOR_*`) — **אישור** ההצעה ב-VendorPortal (`vendor_enroute`) → "הגעתי למקום"
   (`in_progress`) → חתימת לקוח → "סיים קריאה" → בחירת **סטטוס סגירה** → סגירה (ובמידת הצורך קריאת המשך).

צעדים שתלויים במצב ריצה (ספק זמין, הצעה ממתינה, קנבס החתימה) מדלגים בחן (`test.skip`) במקום להיכשל.

## הוספת test חדש

ראו `e2e/README.md` להוראות מלאות. כללי אצבע:

1. **קבצי spec** ב-`e2e/*.spec.js`
2. **קוד משותף** (login helpers, fixtures) — צור `e2e/helpers/` כשיהיו חוזרים
3. **שמות אסרטיביים** — `test('admin sees sync panel')` ולא `test('test1')`
4. **תמיד עדיף Locator על selector**: `page.getByRole('button', { name: /sync/i })` ולא `page.locator('button.sync-btn')` — שובר פחות
5. **אם הוספת test שדורש auth** — תוודאי שהוא מדלג בנגיעה כש-`E2E_ADMIN_EMAIL` לא מוגדר:
   ```js
   const hasAdminCreds = !!(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);
   test.describe('admin flow', () => {
     test.skip(!hasAdminCreds, 'No admin creds — skipping authenticated tests');
     // ...
   });
   ```

---

## טיפים לחברה שמקבלת

1. **אל תשבר טסטים שעוברים** — אם test כתוב, יש לזה סיבה. אם נשבר אחרי שינוי שלך, בדוק לפני שאתה מחליף אותו.
2. **כל baselined functionality חייב test**. אם הוספת feature חדש, הוסף לפחות smoke test אליו.
3. **לפני release** — תרוצי manually `workflow_dispatch` של "Tests" על main כדי לאמת שכל ה-full E2E ירוק.
4. **ה-reports נשמרים 14 יום** — אם CI נשבר ולא הסתכלת תוך שבועיים, הם נמחקים.
5. **לראות trace ל-failure**: הורידי את ה-artifact → `playwright show-report playwright-report-full/` → לחצי על test failed → לשונית "Trace".
6. **להריץ מול האפליקציה המפורסמת, לא מול ה-preview sandbox.** ה-preview sandbox נרדם כשעורך Base44 לא פתוח ופעיל (מחזיר 503 עם דף "Preview Loading"), ובקשות HTTP **לא** מעירות אותו — ריצה #435 (19.07) בוטלה אחרי 45 דקות כי ה-sandbox נרדם באמצע הריצה. האפליקציה המפורסמת לא נרדמת לעולם, ושתיהן עובדות מול אותו backend ואותם נתונים. ה-workflow עדיין בודק שהסביבה מגיבה לפני הריצה ונכשל מהר עם הודעה ברורה. **שימי לב:** האפליקציה המפורסמת מגישה את הגרסה האחרונה שפורסמה (Publish) — אחרי שינוי מהותי ב-UI יש לפרסם לפני שתריצי E2E, אחרת הבדיקות ירוצו מול גרסה ישנה.

---

## הרחבה עתידית (לא הוקם)

הצעות לסיבובים הבאים, מסודרים לפי השפעה:

1. **Permissions matrix tests** — קובץ `e2e/permissions.spec.js` שעובר על כל role×page ומוודא ש-403/אזור-ריק/redirect מתרחש כמצופה
2. ~~**Call lifecycle E2E**~~ — ✅ מומש ב-`e2e/call-lifecycle.spec.js` (ראו "כיסוי: תהליך הקריאה המלא" לעיל)
3. **Cross-browser** — להוסיף Firefox + WebKit ל-`playwright.config.js` projects
4. **Visual regression** — להוסיף `@playwright/test`'s `toHaveScreenshot()` לדפים קריטיים
5. **Performance budgets** — להריץ Lighthouse ב-CI על דפים מרכזיים, להיכשל אם LCP > 3s

ראו `docs/E2E_TEST_CHECKLIST.md` לרשימת הבדיקות שטרם הוסבו לאוטומציה.

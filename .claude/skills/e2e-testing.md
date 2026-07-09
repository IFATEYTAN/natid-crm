# Skill: E2E Testing (בדיקות מקצה-לקצה עם 3 משתמשים)

## מתי להשתמש
- להרצת מסע הבדיקות המלא של המערכת החיה עם 3 המשתמשים (admin / operator / vendor).
- אחרי כל פריסה של שינוי רוחבי — כבדיקת עשן לפני העברה לצוות הבדיקות הידני.
- כשמבקשים "הרץ בדיקות E2E" / "בדוק את המערכת החיה" / "בדוק שהפריסה תפסה".

מבוסס על: `docs/QA_E2E_TEST_SCENARIOS.md` (תסריטים) + מסמך ה-95 בדיקות של הצוות + `scripts/qa/e2e-core-journey.mjs` (אוטומציה).

---

## 0. דרישות מוקדמות — לוודא לפני שמתחילים

| # | דרישה | איך בודקים |
|---|---|---|
| 1 | **3 משתמשי בדיקה קיימים ומאומתים** | admin / operator / vendor — כל אחד עם אימייל+סיסמה |
| 2 | **פרופיל ספק מקושר** למשתמש הספק (Vendor.email == אימייל הספק) | `mcp__Base44__query_entities` על Vendor |
| 3 | **גישת רשת ל-base44.app מהסביבה** | `curl -s -o /dev/null -w "%{http_code}" https://<APP>.base44.app` → 200/302, לא 000 |
| 4 | **הפריסה עדכנית ב-production** | מבחן 403→200 (ראה סעיף 3) |
| 5 | **Playwright מותקן** | בסביבה: `/opt/pw-browsers/chromium` |

### פרטי סביבה (למלא/לעדכן)
```
APP_URL   = https://nat-id-360-control-f4cb8a71.base44.app
BASE44_APP_ID = 6955a04a2de0845ff4cb8a71
USERS:
  admin    = ifateytan298+admin@gmail.com
  operator = ifateytan298+operator@gmail.com
  vendor   = ifateytan298+vendor@gmail.com
  (הסיסמה מסופקת בנפרד — לא נשמרת בקוד/בריפו)
E2E Test Vendor = "E2E Test Vendor" (טלפון 0500000001, כל סוגי השירות)
```

---

## 1. הגדרת גישת רשת (קריטי — נכשל הכי הרבה)

סביבת הבדיקה חייבת גישת רשת ל-`base44.app`. אם הפרוקסי מחזיר **403 ל-CONNECT** / curl מחזיר **000**:

**פעולת המשתמש:** עורך Base44 → **Environment / Network access** → לשנות מ-"Trusted" ל-**Full** (או להוסיף `base44.app` ו-`app.base44.com`) → **Save**.
> שים לב: השינוי חל על סשנים חדשים; אם הסביבה אותחלה, ההגדרה עלולה לחזור ל-"Trusted" החוסם.

**בדיקת קישוריות:**
```bash
echo "proxy=$HTTPS_PROXY"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 20 https://<APP>.base44.app
# 200/302 = תקין ; 000 = חסום → לבקש מהמשתמש להחזיר גישת רשת
```

### הערת TLS חשובה
הפרוקסי המקומי לא תומך ב-TLS 1.3 של Chromium. **חובה** להריץ את Playwright עם:
```
--proxy-server=$HTTPS_PROXY  --ssl-version-max=tls1.2
executablePath: '/opt/pw-browsers/chromium'
```

---

## 2. התקנת כלי האוטומציה (חד-פעמי)
```bash
cd <scratchpad>
npm init -y >/dev/null 2>&1
npm install playwright --no-audit --no-fund
```

---

## 3. בדיקת עשן — האם הפריסה תפסה? (תמיד ראשון!)

**הסימן החד-משמעי לפריסה מוצלחת:** משתמש מוזמן מקבל **200** (ולא 403/404) מפונקציית backend.
מנגנון: משתמשים מוזמנים נושאים תפקיד-פלטפורמה `"user"`; התפקיד האפליקטיבי ב-UserPermission. פונקציה תקינה מפרשת אותו (ראה `docs/LESSONS_LEARNED.md`).

```js
// smoke.mjs — התחבר כמוקדן, טען Dashboard, בדוק detectSmartAlerts
page.on('response', r => { if (r.url().includes('detectSmartAlerts')) console.log('status:', r.status()); });
// 403/404 = הפריסה לא תפסה → לעצור ולדווח למשתמש (Publish בעורך Base44)
// 200 = פרוס ✅ → להמשיך למסע המלא
```
אם 404 "Request failed with status code 404" בשיוך ספק → מודול/פונקציה לא נפרסו. לדווח למשתמש לפרסם.

---

## 4. הרצת המסע המרכזי (אוטומטי)

```bash
BASE_URL=https://<APP>.base44.app \
OP_EMAIL=<operator> OP_PW=<pw> VND_EMAIL=<vendor> VND_PW=<pw> \
VENDOR_NAME="E2E Test Vendor" \
PROXY=$HTTPS_PROXY TLS_MAX=tls1.2 CHROMIUM_PATH=/opt/pw-browsers/chromium \
SHOTS_DIR=<scratchpad>/shots \
node scripts/qa/e2e-core-journey.mjs
```
מכסה: A1 יצירת קריאה → A3 שיוך ספק → A4 אישור ספק → A5 מעברי סטטוס.

**אימות מול DB אחרי כל שלב** (מקור אמת אמין יותר מה-UI):
```
mcp__Base44__query_entities → Call.call_status, WorkQueue.queue_status, CallAssignmentAttempt.status
```

---

## 5. מפת כיסוי — מה אוטומטי ומה ידני

| חלק | תוכן | אוטומטי | ידני (מכשיר/טלפון) |
|---|---|---|---|
| א' | מסע קריאה A1–A8 | A1 יצירה/ולידציה, A3 שיוך, A4 אישור, A5 סטטוסים, A7 סגירה | A1.4/1.5 בוט/CTI, A5.3 תמונות, A7.1 חתימה |
| ב' | GPS ומיקום ספקים | — | **הכל** (נייד אמיתי + GPS) |
| ג' | כלי AI | הצגת ווידג'טים | אימות פלט LLM |
| ד' | התראות | פעמון, detectSmartAlerts, checkAndSendNotifications | Push, SMS לטלפון לקוח |
| ה' | סנכרון Call↔WorkQueue↔Case | דרך DB (query_entities) | — |
| ו' | הרשאות F1–F7 | **הכל** (ניווט) | — |
| ז' | דוחות | טעינה, סינון, ייצוא | — |
| ח' | שליליות | מרוצי שיוך, מעברים לא-חוקיים, 404/403 | GPS חסום, חתימה |

**חלוקה מומלצת:** אני מריץ את האוטומטי (א' חלקי, ד', ה', ו', ז', ח'); המשתמש/דורית מריצה את הידני בנייד (ב', ג', תמונות, חתימה, SMS-לקוח) לפי מסמך ה-95 בדיקות.

---

## 6. בדיקות הרשאות (חלק ו' — ניווט בלבד, בטוח)
לכל תפקיד: התחבר → נסה לנווט ב-URL ישיר:
- **admin**: UserManagement/RoleManagement/Settings/Invoices/KPIManagement → נגישים ✅
- **operator**: מסכי ניהול → הפניה/חסימה; Calls/QueueMonitor/Reports → נגישים
- **vendor**: "/" → VendorPortal; Dashboard/Calls/UserManagement → חסומים
- **אנונימי**: /NewCase → טופס התחברות

---

## 7. אזהרות בטיחות (production!)
- E2E כותב על **production אמיתי**: יוצר קריאות, שולח SMS, משנה סטטוסי ספק.
- **קריאות בדיקה** — סמן שם ייחודי (`E2E ...`), טלפון בדיקה (0500000099), ונקה בסוף (סטטוס `cancelled`).
- **אל תסגור** קריאה שתשלח SMS/סקר לטלפון אמיתי — השתמש בטלפון בדיקה.
- **מומלץ מאוד:** סביבת **staging** נפרדת להרצה מלאה ובטוחה של כל 95 הבדיקות.

---

## 8. פלט
בסיום, הפק דוח (כמו `docs/QA_E2E_RUN_*.md`): טבלת מזהה/תוצאה/ראיה, ממצאים, ומטריצת כיסוי מול 95 הבדיקות. עדכן `docs/LESSONS_LEARNED.md` בכל באג חדש.

---

## 9. פתרון תקלות מהיר
| תופעה | סיבה | פתרון |
|---|---|---|
| curl → 000 / proxy 403 | גישת רשת חסומה | המשתמש מחזיר Network access ל-Full |
| ERR_PROXY_CONNECTION / SSL | פורט פרוקסי השתנה / TLS 1.3 | `--proxy-server=$HTTPS_PROXY --ssl-version-max=tls1.2` |
| detectSmartAlerts=403/404 | הפריסה לא תפסה | המשתמש עושה Publish בעורך Base44 |
| שיוך: "status code 404" | פונקציה לא נפרסה | Publish; ודא מבנה `_shared/<שם>/entry.ts` |
| רשימת ספקים ריקה בשיוך | `service_type` ריק לספקים | מלא לפי שם (גרר→גרירה, ניידת→ניידת) |
| "פרופיל ספק לא נמצא" | Vendor.email ≠ אימייל המשתמש | עדכן אימייל בפרופיל הספק |

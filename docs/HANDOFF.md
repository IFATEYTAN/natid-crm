# מסמך מסירה - NatID CRM

**עבור**: צוות הפיתוח שמקבל את המערכת
**תאריך מסירה**: יוני 2026
**מערכת**: NatID CRM - ניהול קריאות שירות (גרירה, מצברים, פנצ'רים וכו')

---

## 1. סקירה מהירה - מה זה?

**NatID CRM** הוא מערכת ניהול קריאות שירות בעברית (RTL), שמקשרת בין:
- **מוקדנים (Operators)** — פותחים קריאות, משייכים ספקים, סוגרים קריאות
- **ספקים (Vendors)** — מקבלים קריאות בנייד, מעדכנים סטטוס, מעלים תמונות
- **לקוחות (Customers)** — עוקבים אחרי הקריאה דרך פורטל ציבורי + מקבלים סקר משוב
- **מנהלים (Admins)** — הגדרות מערכת, דוחות, ניקוי נתונים, סנכרון

**Stack**: React 18 + Vite 6 + Tailwind 3 + Base44 platform (Deno serverless backend)
**שפה**: ממשק עברי בלבד (RTL); קוד באנגלית
**אינטגרציות**: MySQL של נתי שירותים (סנכרון לקוחות/ספקים/קריאות), Twilio (SMS), OpenStreetMap (מפות)

---

## 2. איפה הקוד

| מה | איפה |
|---|---|
| **Repo** | `github.com/IFATEYTAN/natid-crm` |
| **Frontend** | `src/` (React, Vite) |
| **Backend functions** | `functions/` (24 פונקציות TypeScript ב-Deno על Base44) |
| **Tests E2E** | `e2e/` (Playwright, 50 טסטים) |
| **Tests יחידה** | `src/**/*.test.js` (Vitest) |
| **תיעוד** | `docs/` (עברית) + `CLAUDE.md` (תקציר) |

תיעוד עיקרי לקריאה לפי הסדר:
1. `CLAUDE.md` - תקציר ארכיטקטורה (5 דקות)
2. `SYSTEM_SPECIFICATION.md` - אפיון מלא
3. `docs/WORKFLOWS.md` + `docs/BUSINESS_WORKFLOWS.md` - תהליכים עסקיים
4. `docs/LESSONS_LEARNED.md` - בעיות שטופלו וידע מצטבר (**חשוב מאוד**)
5. `docs/E2E_SETUP.md` - איך מקימים את ה-CI של הטסטים

---

## 3. איך מריצים מקומית

```bash
# התקנה ראשונית
bash scripts/quick-start.sh   # אוטומטי: deps + .env.local + build

# פיתוח
npm run dev          # שרת dev (Vite, port 5173)
npm run build        # build לפרודקשן
npm run lint         # בדיקת ESLint
npm run lint:fix     # תיקון אוטומטי
npm run typecheck    # TypeScript
npm test             # Vitest (unit tests)
npm run e2e          # Playwright (E2E)
npm run storybook    # ספריית רכיבים
```

**`.env.local`** הקובץ ייווצר אוטומטית. צריך לשים בו:
```
VITE_BASE44_APP_ID=<מ-Base44 Builder>
```

---

## 4. תשתית ה-Testing

המערכת מכוסה ב-**50 טסטים אוטומטיים** של Playwright + Vitest. CI דו-שכבתי:

### שכבה 1: `quick-tests` (רצה על כל PR)
- ESLint
- Vitest (unit)
- Playwright structural (20 טסטים, ללא auth, נגד Vite מקומי)
- זמן: ~2-5 דקות

### שכבה 2: `full-e2e` (רצה רק על main + nightly + manual dispatch)
- Playwright authenticated (30 טסטים, עם משתמשי בדיקה מול Base44 preview-sandbox)
- זמן: ~10 דקות
- **דורש 7 GitHub Secrets** (ראו `docs/E2E_SETUP.md`)

### Specs קיימים
| spec | טסטים | כיסוי |
|---|---|---|
| `smoke.spec.js` | 2 | האפליקציה נטענת + RTL |
| `login-form.spec.js` | 1 | מסך הלוגין מוצג |
| `nati-sync.spec.js` | 5 | סנכרון MySQL נתי, dry-run, cooldown, רענון |
| `permissions.spec.js` | 29 | מטריצת הרשאות מלאה (admin/operator/vendor) |
| `call-lifecycle.spec.js` | 6 | יצירת קריאה → vendor רואה → עדכון סטטוס |
| `customer-portal.spec.js` | 4 | פורטל לקוח ציבורי |
| `close-stale-calls.spec.js` | 3 | ניקוי קריאות רפאים |

### מה לא מכוסה אוטומטית (manual)
- GPS tracking (דורש נייד אמיתי)
- העלאת תמונות + AI extraction
- SMS notifications (דורש Twilio + טלפון אמיתי)
- Customer feedback token submission

ראו `docs/E2E_TEST_CHECKLIST.md` לרשימה המלאה + תהליך ידני.

---

## 5. בעיות שטופלו לאחרונה (חשוב!)

### 5.1 חסימות MySQL host blocks (PR #117)
**הבעיה**: שרת ה-MySQL של נתי חסם את ה-IP שלנו אחרי 100 ניסיונות התחברות נכשלים.
**שורש הבעיה**: כל קריאת `getConnection()` ניסתה SSL קודם, נכשלה ("invalid peer certificate"), ונפלה ל-plaintext. הניסיון הכושל נספר כ-failed connection.
**הפתרון**: הסרת ה-SSL לחלוטין מ-`getDbConfig()` ב-5 הפונקציות הרלוונטיות.
**מניעה**: אל תוסיפי `ssl:` ל-config של mysql client של Deno עד שיש לך תעודה אמיתית.

### 5.2 Dashboard ghost calls
**הבעיה**: הדאשבורד הציג 229 קריאות פעילות בעוד שבנתי היו 155.
**הסיבה**: סנכרונים ישנים יצרו רשומות שלא נסגרו כשנתי סגרה אותן.
**הפתרון**: כפתור "סגור קריאות רפאים" ב-`/AdminDataCleanup` שמשווה ל-API של נתי וסוגר חכם.
**הפעלה**: רץ דרך הממשק. יש Dry Run לפני. סוגר ב-batches של 20 עם הגנה (לא סוגר אם נתי מחזיר פחות מ-10 בטעות).

### 5.3 הפחתת console messages
היה ~2400 הודעות בקונסול. הפחתנו דרך כיבוי polling triple ו-Base44 hmrNotifier/navigationNotifier ב-`vite.config.js`.

ראו `docs/LESSONS_LEARNED.md` לפרטים מלאים + תיקונים נוספים.

---

## 6. תהליך עבודה מומלץ

### Daily flow
1. `git pull origin main`
2. `git checkout -b feature/X`
3. קוד + טסטים
4. `npm run lint && npm run build` (חובה לפני commit)
5. `git commit` (יש pre-commit hook עם lint-staged)
6. `git push -u origin feature/X`
7. פתחי PR → CI ירוץ אוטומטית → merge

### לפני release
1. `workflow_dispatch` ידני של "Tests" על main → לוודא שכל 50 הטסטים ירוקים
2. סבב manual checklist מ-`docs/E2E_TEST_CHECKLIST.md` (GPS, photos, SMS — דברים שלא מאוטמטים)
3. בדיקה ב-staging/preview-sandbox

### בעת התקלה
1. `docs/LESSONS_LEARNED.md` — לפעמים זה כבר תועד
2. Sentry / Base44 logs
3. Playwright traces (CI שומר את ה-artifacts 7-14 ימים)

---

## 7. מה נשאר לעשות (TODO)

### חובה לפני שמתחילים לעבוד אוטונומית
- [ ] ליצור 3 משתמשי בדיקה ב-Base44 (`e2e-admin@natid.test`, `e2e-operator@natid.test`, `e2e-vendor@natid.test`) — הוראות ב-`docs/E2E_SETUP.md`
- [ ] להגדיר 7 GitHub Secrets — הוראות ב-`docs/E2E_SETUP.md`
- [ ] לאמת ש-`workflow_dispatch` ידני של "Tests" רץ ירוק

### רשות (כיסוי עתידי)
- [ ] Cross-browser tests (Firefox + WebKit)
- [ ] Visual regression (`toHaveScreenshot()`)
- [ ] Performance budgets (Lighthouse ב-CI)
- [ ] לאוטמט יותר flows מ-`docs/E2E_TEST_CHECKLIST.md` (GPS, photos)

---

## 8. אנשי קשר ומקורות

- **Base44 Platform**: https://base44.com (בוני האפליקציה)
- **נתי שירותים** (MySQL source): צ'אט עם Adiel (מפתח של נתי) — היה לנו דיון מתועד על חסימות, אם תיתקלי שוב
- **בעלת המוצר**: יפעת איתן (ifateytan298@gmail.com)

---

## 9. צ'קליסט מסירה (לסמן בעת ההעברה)

- [ ] גישה ל-GitHub repo (read+write)
- [ ] גישה ל-Base44 Builder (Builder role)
- [ ] גישה ל-Twilio account (אם רוצים לבדוק SMS)
- [ ] מסמך זה נקרא במלואו
- [ ] `CLAUDE.md` + `docs/LESSONS_LEARNED.md` נקראו
- [ ] הקוד רץ מקומית (`npm run dev` עובד)
- [ ] CI רץ ירוק לפחות פעם אחת מאז קבלת הריפו
- [ ] 3 משתמשי הבדיקה קיימים
- [ ] 7 GitHub Secrets מוגדרים
- [ ] `workflow_dispatch` ידני של Tests רץ ירוק עם כל 50 הטסטים

---

**בהצלחה! 🚀**

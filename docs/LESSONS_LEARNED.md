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

### [2026-02-08] Security: תיקון דליפת credentials ב-roetoAuth

**בעיה:** הודעות שגיאה ב-`roetoAuth.ts` חשפו גוף תגובות שרת ומידע דיבאג רגיש.
**פתרון:** הוסרו גוף תגובות מהודעות שגיאה, מידע דיבאג הוסתר.
**לקח:** לעולם לא לכלול response body בהודעות שגיאה - עלול לחשוף tokens, credentials, או מבנה API פנימי.
**קבצים:** `functions/utils/roetoAuth.ts`

---

### [2026-02-08] Security: הקשחת אימות Webhook

**בעיה:** ה-webhook של Roeto השתמש רק ב-secret פשוט, ללא הגנה מפני timing attacks או payload גדול, והדפיס PII ללוגים.
**פתרון:** נוסף HMAC-SHA256 validation עם timing-safe comparison, הגבלת גודל payload, והסרת PII מלוגים.
**לקח:** webhooks חייבים HMAC signature validation (לא רק secret), השוואה timing-safe, והגבלת payload. לעולם לא להדפיס PII ללוגים.
**קבצים:** `functions/roetoWebhook.ts`

---

### [2026-02-08] Security: תיקון postMessage XSS

**בעיה:** 7 מופעים של `postMessage` עם target origin `'*'` (wildcard) ב-VisualEditAgent ו-iframe-messaging - מאפשר לכל אתר לקרוא הודעות.
**פתרון:** הוחלפו כל ה-wildcards ב-origin מאומת של חלון האב. נוספה רזולוציית origin ב-iframe-messaging.
**לקח:** `postMessage('*')` הוא XSS vector - תמיד להשתמש ב-origin ספציפי ומאומת.
**קבצים:** `src/lib/VisualEditAgent.jsx`, `src/lib/iframe-messaging.js`

---

### [2026-02-08] Security: מניעת XSS בתבניות אימייל

**בעיה:** משתני תבנית הוזרקו ישירות ל-HTML ללא escaping, מאפשרים הזרקת script.
**פתרון:** נוסף HTML escaping לכל משתני תבנית לפני הזרקה ל-HTML.
**לקח:** כל קלט המוזרק ל-HTML חייב escaping - גם אם מגיע ממקור "מהימן" כמו DB.
**קבצים:** `functions/sendEmailTemplate.ts`

---

### [2026-02-08] Security: הגנת CSRF ומגבלת payload

**בעיה:** טופס חיצוני ללא אימות Origin header וללא מגבלת גודל payload.
**פתרון:** נוסף אימות Origin header והגבלת payload ל-512KB.
**לקח:** כל endpoint שמקבל POST חייב אימות Origin/Referer header למניעת CSRF.
**קבצים:** `functions/secureFormSubmit.ts`

---

### [2026-02-08] Architecture: איחוד hooks סותרים להרשאות (RBAC)

**בעיה:** שני hooks שונים של `usePermissions` עם לוגיקה סותרת - אחד ב-`src/hooks/` ואחד ב-`src/components/hooks/`.
**פתרון:** מוזגו לmקור קנוני אחד ב-`src/hooks/usePermissions.jsx`. הקובץ השני הפך ל-re-export.
**לקח:** hook קריטי כמו permissions חייב להיות במקום אחד בלבד. כשמוצאים כפילות - למזג מיד.
**קבצים:** `src/hooks/usePermissions.jsx`, `src/components/hooks/usePermissions.jsx`

---

### [2026-02-08] Architecture: Error Boundary גלובלי

**בעיה:** לא היה Error Boundary - שגיאות ריאקט הפילו את כל האפליקציה ללא הודעה למשתמש.
**פתרון:** נוסף Error Boundary גלובלי עם UI בעברית ועטיפה כפולה (חיצוני + routes) ב-App.jsx.
**לקח:** Error Boundary הוא חובה בכל אפליקציית React - עדיף UI שגיאה מאשר מסך לבן.
**קבצים:** `src/components/ErrorBoundary.jsx`, `src/App.jsx`

---

### [2026-02-08] Performance: debounce חיפוש ואופטימיזציית React Query

**בעיה:** חיפוש גלובלי ללא debounce גרם לעומס מיותר. React Query ללא staleTime ביצע fetch בכל render.
**פתרון:** נוסף debounce של 300ms לחיפוש. נוספו staleTime: 2 דק', gcTime: 10 דק', retryDelay אקספוננציאלי ל-React Query.
**לקח:** חיפוש חייב debounce. React Query חייב staleTime סביר - ללא זה, כל focus/mount מבצע refetch.
**קבצים:** `src/components/layout/GlobalSearchDialog.jsx`, `src/lib/query-client.js`

---

### [2026-02-08] Performance: תיקון שאילתות N+1 ב-analytics

**בעיה:** לולאות מקוננות ב-analyticsService ביצעו חיפוש O(n²) על מערכי נתונים.
**פתרון:** הוחלפו ב-lookup maps (Map/Set) עם אגרגציה במעבר אחד.
**לקח:** כשעובדים עם מערכים גדולים - תמיד לבנות lookup map לפני לולאה. לולאות מקוננות עם find/filter הן כמעט תמיד N+1.
**קבצים:** `functions/analyticsService.ts`

---

### [2026-02-08] Tooling: ניקוי ESLint - unused imports ו-npm audit fix

**בעיה:** 352 אזהרות ESLint, 13 פגיעויות NPM.
**פתרון:** הוסרו unused React imports (138 קבצים), הרצת lint:fix (31 שגיאות נוספות), npm audit fix (13→4 פגיעויות). 4 הנותרות דורשות breaking changes (jspdf, react-quill).
**לקח:** להריץ `npm run lint:fix` ו-`npm audit fix` באופן קבוע. פגיעויות שדורשות `--force` צריכות בדיקה ידנית.
**קבצים:** 138+ קבצי src, `package-lock.json`

---

<!-- הוסף רשומות חדשות מעל שורה זו -->

## סטטיסטיקות

| קטגוריה | מספר רשומות |
|----------|-------------|
| Bug | 0 |
| Feature | 0 |
| Architecture | 2 |
| Performance | 2 |
| Security | 5 |
| Convention | 1 |
| Tooling | 1 |
| **סה"כ** | **11** |

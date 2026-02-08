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

<!-- הוסף רשומות חדשות מעל שורה זו -->

## סטטיסטיקות

| קטגוריה | מספר רשומות |
|----------|-------------|
| Bug | 0 |
| Feature | 0 |
| Architecture | 0 |
| Performance | 0 |
| Security | 0 |
| Convention | 1 |
| Tooling | 1 |
| **סה"כ** | **2** |

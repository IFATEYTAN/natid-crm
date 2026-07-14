# צילומי מסך למסמך האפיון

התיקייה הזו מאכלסת את צילומי המסך שאליהם מפנה `SYSTEM_SPECIFICATION_v4.md` (צילום אחד לכל מסך, לפי שם הדף — למשל `Dashboard.png`).

## איך מייצרים את הצילומים (פעם אחת, ~5 דקות)

```bash
npm install          # אם טרם הותקן
npm run dev          # טרמינל 1 — שרת פיתוח
node scripts/qa/capture-screenshots.mjs   # טרמינל 2
```

הסקריפט רץ ב**מצב דמו** (`?demo=true`) — ה-SDK של Base44 ממוקק עם נתוני דמו, כך שלא נדרשים סיסמאות או חיבור לשרת. משתמש הדמו הוא admin ולכן כל 62 המסכים נטענים (כולל מסכי ספק/טכנאי, שמצולמים ב-viewport של מובייל).

לצילום מול פרודקשן עם נתונים אמיתיים:

```bash
HEADED=1 CAPTURE_DEMO=false node scripts/qa/capture-screenshots.mjs https://nat-id-360-control-f4cb8a71.base44.app
# ייפתח דפדפן — התחברו ידנית ולחצו Enter בטרמינל
```

לאחר ההרצה: `git add docs/screenshots && git commit` — והתמונות יופיעו אוטומטית בתוך מסמך האפיון ב-GitHub.

# nati-db-service — מדריך התקנה ופריסה

מסמך זה מסביר איך להעלות את `nati-db-service` ל-DigitalOcean Droplet
שלנו (`209.38.178.128`), לחבר אותו ל-MySQL של נתי דרך ה-IP הסטטי שב-Whitelist,
ולחבר אליו את ה-CRM.

---

## למה השירות הזה קיים

ה-IP הסטטי `209.38.178.128` (Reserved IP ב-DigitalOcean) הוכנס ל-Whitelist של ה-RDS של נתי.
זה אומר שרק תעבורה שיוצאת מהכתובת הזו תוכל להגיע למסד הנתונים.

הדפדפן של המשתמש **לא יכול** ולא צריך לדבר ישירות עם MySQL - גם בגלל שה-IP שלו לא ב-Whitelist,
וגם כי זה היה חושף את הסיסמה לכל מי שפותח DevTools.

לכן השירות הזה רץ על ה-Droplet, ניגש ל-MySQL בצד אחד, ומשרת את ה-CRM ב-HTTPS בצד השני.

---

## מה צריך לפני שמתחילים

1. ✅ Droplet ב-DigitalOcean עם Ubuntu (קיים: `ubuntu-s-1vcpu-512mb-10gb-fra1-01`)
2. ✅ Reserved IP מחובר אליו (`209.38.178.128`)
3. ✅ ה-IP נכנס ל-Whitelist של נתי
4. גישת SSH ל-Droplet (`ssh root@209.38.178.128`)
5. דומיין/סאב-דומיין שמופנה ל-IP (לדוגמה `nati-db.yourcompany.co.il`) — לא חובה ברגע הראשון
6. פרטי ההתחברות ל-MySQL של נתי (כבר יש לנו)

---

## שלב 1 — הכנת ה-Droplet

התחברי ב-SSH:

```bash
ssh root@209.38.178.128
```

עדכון מערכת והתקנת Docker:

```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin git ufw
systemctl enable --now docker
```

חומת אש בסיסית:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## שלב 2 — העלאת הקוד

יש שתי אפשרויות. בחרי אחת:

### אפשרות א' — `git clone` (מומלץ)

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/ifateytan/natid-crm.git
cd natid-crm/nati-db-service
```

### אפשרות ב' — `scp` מהמחשב המקומי

מהמחשב שלך (לא מה-SSH):

```bash
scp -r nati-db-service root@209.38.178.128:/opt/
```

ואז ב-SSH:

```bash
cd /opt/nati-db-service
```

---

## שלב 3 — הגדרת משתני סביבה

צרי `.env` (לא נכנס ל-git):

```bash
cp .env.example .env
nano .env
```

מלאי את הערכים הבאים:

| משתנה | ערך |
|-------|-----|
| `SERVICE_API_KEY` | חזק ואקראי. הריצי `openssl rand -hex 32` כדי ליצור |
| `ALLOWED_ORIGINS` | הדומיין של ה-CRM שלכם (לדוגמה `https://app.base44.com`) |
| `NATI_DB_HOST` | `natid-staging.crmlhqnchhgn.il-central-1.rds.amazonaws.com` |
| `NATI_DB_PORT` | `3306` |
| `NATI_DB_USER` | `admin` |
| `NATI_DB_PASSWORD` | הסיסמה שעדיאל נתן (החליפו אותה ב-AWS אחרי שמסיימים!) |

שמרי את ה-`SERVICE_API_KEY` שיצרת — נצטרך אותו גם ב-CRM.

---

## שלב 4 — הגדרת Caddy (HTTPS)

ערכי את `Caddyfile` והחליפי את `nati-db.example.co.il` בדומיין האמיתי:

```bash
nano Caddyfile
```

⚠️ הדומיין חייב להפנות ל-`209.38.178.128` ב-DNS (רשומת A) **לפני** שמריצים את הקונטיינר,
אחרת Caddy לא יצליח לקבל סרטיפיקט מ-Let's Encrypt.

אם אין עדיין דומיין — השאירו את ה-`tls internal` (הבלוק התחתון ב-Caddyfile) פעיל. זה
יעבוד אבל הדפדפן יציג אזהרת אבטחה.

---

## שלב 5 — הרצה

```bash
docker compose up -d --build
docker compose logs -f
```

בדיקות שלום:

```bash
# מתוך ה-Droplet:
curl http://localhost:8080/health

# מבחוץ (מהמחשב שלך):
curl https://nati-db.example.co.il/health
```

בדיקת חיבור ל-DB:

```bash
curl https://nati-db.example.co.il/health/db
```

תשובה תקינה: `{"ok":true,"latencyMs":42}`. אם מקבלים שגיאה — בדקי את ה-Whitelist בנתי.

---

## שלב 6 — גילוי הסכמה

עכשיו אפשר לראות איך נראה ה-DB של נתי באמת:

```bash
KEY="<ה-SERVICE_API_KEY שיצרת>"

# רשימת מסדי נתונים
curl -H "X-API-Key: $KEY" https://nati-db.example.co.il/schema/databases

# רשימת טבלאות (כולל ספירת שורות)
curl -H "X-API-Key: $KEY" https://nati-db.example.co.il/schema/tables

# מבנה של טבלה ספציפית + 5 שורות לדוגמה
curl -H "X-API-Key: $KEY" "https://nati-db.example.co.il/schema/dbname.tablename?sample_limit=5"

# שאילתה חופשית (קריאה בלבד)
curl -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"sql":"SELECT COUNT(*) AS total FROM dbname.appeals"}' \
  https://nati-db.example.co.il/query
```

מהפלט הזה נבנה את ה-endpoints הספציפיים בשלב הבא (`/appeals`, `/customers`, `/vendors`).

---

## שלב 7 — חיבור ה-CRM

ב-`.env.local` של ה-CRM (לא ב-`.env.example`):

```ini
VITE_NATI_DB_SERVICE_URL=https://nati-db.example.co.il
NATI_DB_SERVICE_API_KEY=<אותו מפתח כמו בשרת>
```

⚠️ שימי לב: הקריאה לשירות **לא נעשית מהדפדפן** ישירות, אלא דרך פונקציית Backend ב-Base44
(כדי לא לחשוף את ה-API key). הפונקציה הקיימת `fetchNatiAppeals` תעודכן בהמשך לקרוא לשירות
הזה במקום ל-API של נתי.

---

## תחזוקה

### עדכון לגרסה חדשה

```bash
cd /opt/natid-crm
git pull
cd nati-db-service
docker compose up -d --build
```

### לוגים

```bash
docker compose logs -f nati-db-service     # יישום
docker compose logs -f caddy               # HTTPS / proxy
```

### גיבוי `.env`

מומלץ לשמור עותק של ה-`.env` במקום בטוח (1Password / Vault), כי הוא לא ב-git.

### החלפת מפתח API

1. צרי מפתח חדש: `openssl rand -hex 32`
2. עדכני ב-`.env` בשרת ובמשתני הסביבה ב-Base44
3. הריצי `docker compose restart nati-db-service`

---

## פתרון תקלות

| בעיה | פתרון |
|------|--------|
| `ETIMEDOUT` ב-`/health/db` | ה-IP לא ב-Whitelist של נתי, או ה-RDS דורש SSL — בדקי `NATI_DB_SSL=true` |
| `Access denied for user 'admin'` | סיסמה שגויה ב-`.env` |
| Caddy לא מקבל סרטיפיקט | ה-DNS לא מפנה ל-`209.38.178.128`, או פורט 80 חסום ב-firewall |
| `OOM` או הקונטיינר נופל | ה-Droplet רק 512MB — הקטיני `DB_POOL_LIMIT=3` או שדרגי ל-1GB |
| 403 על `/schema/*` | חסר/שגוי `X-API-Key` |

---

## מה הלאה

1. ✅ שירות תשתית עובד
2. ⏳ גילוי הסכמה האמיתית של נתי דרך `/schema/tables` ו-`/schema/:table`
3. ⏳ בניית endpoints טיפוסיים: `/appeals`, `/customers`, `/vendors`
4. ⏳ עדכון `base44/functions/fetchNatiAppeals` לקרוא לשירות במקום ל-API
5. ⏳ סנכרון דו-כיווני (POST/PUT) — רק אחרי אישור עדיאל

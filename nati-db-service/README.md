# nati-db-service

A small Node.js + TypeScript service that bridges the NatID CRM to Nati's MySQL database.
It runs on the DigitalOcean droplet whose static IP (`209.38.178.128`) is whitelisted at
Nati's RDS, so the CRM can read Nati data through HTTPS without exposing DB credentials
to the browser or whitelisting random user IPs.

## Architecture

```
React CRM  ──HTTPS+API key──►  nati-db-service (DO droplet, IP 209.38.178.128)
                                          │
                                          └──MySQL──►  Nati RDS
                                              (whitelisted)
```

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | none | Liveness probe (no DB call). |
| `GET` | `/health/db` | none | Readiness — runs `SELECT 1`. |
| `GET` | `/schema/databases` | API key | Lists user databases. |
| `GET` | `/schema/tables[?database=foo]` | API key | Lists tables (+ approx row counts). |
| `GET` | `/schema/:table[?sample_limit=5]` | API key | DESCRIBE + sample rows. `:table` may be `db.table`. |
| `POST` | `/query` | API key | Run a single read-only `SELECT/SHOW/DESCRIBE`. Body: `{ "sql": "...", "params": [...] }`. |

API key is sent via `Authorization: Bearer <key>` **or** `X-API-Key: <key>`.

## Local development

```bash
cp .env.example .env       # fill in real values
npm install
npm run dev
```

## Deploying to the DigitalOcean droplet

See `../docs/NATI_DB_SERVICE.md` (Hebrew) for the full step-by-step guide.

## Security notes

- The `.env` file with real credentials lives **only on the droplet**, never in git.
- Rotate `SERVICE_API_KEY` whenever a developer leaves.
- The DB credentials should belong to a **read-only MySQL user** until two-way sync is approved.
- Only `127.0.0.1:8080` is exposed; public traffic goes through Caddy on 443 with Let's Encrypt.

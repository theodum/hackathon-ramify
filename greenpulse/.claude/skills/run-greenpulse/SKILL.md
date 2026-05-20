---
name: run-greenpulse
description: Run, start, launch, screenshot, test, smoke-test, or interact with the GreenPulse Green IT audit platform. Use when asked to start the app, verify it works, take a screenshot, or drive the frontend or API.
---

GreenPulse is a full-stack Green IT audit SaaS (React/Vite frontend + NestJS backend) launched via Docker Compose. The frontend lives at **http://localhost:3000**, the REST API at **http://localhost:3001/api**. Vite proxies `/api` to the backend, so browser calls go through port 3000.

The **primary agent path** for API verification is `smoke.sh`. For browser interaction, use `chromium-cli` against `http://localhost:3000` (script below). There is no custom driver script — `chromium-cli` and `curl` are sufficient.

---

## Prerequisites

Stack only needs Docker and Docker Compose. No local Node.js required.

```bash
# Confirm Docker is running
docker info >/dev/null 2>&1 || echo "Docker not running"
```

On **Windows** (this project's host): use PowerShell or Git Bash. `chromium-cli` is available inside a Linux agent container; on Windows use the browser directly at http://localhost:3000.

---

## Start the stack

```bash
cd c:/Users/theod/epitech/hackathon_ramify/greenpulse
docker compose up -d
```

Services that come up:
| Service | URL |
|---------|-----|
| Frontend (Vite dev) | http://localhost:3000 |
| Backend (NestJS) | http://localhost:3001 |
| Grafana | http://localhost:3002 |
| MailHog (SMTP UI) | http://localhost:8025 |
| Prometheus | http://localhost:9090 |

Wait ~15 s for postgres + backend healthcheck. The backend shows `(unhealthy)` in `docker compose ps` because the healthcheck hits `/api/health/live` which returns 404 — this is a misconfigured healthcheck, not a real outage. The API works regardless.

To apply code changes (no hot reload on Windows Docker):
```bash
docker compose restart frontend   # picks up frontend file changes
docker compose restart backend    # picks up backend file changes
```

---

## Run (agent path — API smoke test)

This script runs against the live stack and verifies all major endpoints. Every check was verified to pass on 2026-05-20.

```bash
bash .claude/skills/run-greenpulse/smoke.sh
```

Expected output:
```
=== GreenPulse smoke test ===
  ✓ frontend HTML (http://localhost:3000)
  ✓ auth/login → JWT obtained
  ✓ GET /api/projects
  ✓ GET /api/audits
  ✓ GET /api/metrics/dashboard
  ✓ GET /api/reports
  ✓ GET /api/audits/<id>

=== All checks passed ===
```

Override credentials via env:
```bash
GREENPULSE_EMAIL=other@user.com GREENPULSE_PASSWORD=Other123! bash .claude/skills/run-greenpulse/smoke.sh
```

---

## Run (agent path — browser interaction via chromium-cli)

Use this inside a Linux agent with `chromium-cli` available to drive the UI.

```bash
# Login and reach the dashboard
chromium-cli --url "http://localhost:3000" --script - <<'JS'
// Fill login form
await page.fill('input[type="email"]', 'admin@greenpulse.io');
await page.fill('input[type="password"]', 'Admin123!');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 8000 });
await page.screenshot({ path: '/tmp/dashboard.png' });
JS
# Screenshot saved to /tmp/dashboard.png

# Navigate to audits
chromium-cli --url "http://localhost:3000/audits" --script - <<'JS'
await page.waitForSelector('h1', { timeout: 5000 });
await page.screenshot({ path: '/tmp/audits.png' });
JS

# Create a new audit (requires an existing project)
chromium-cli --url "http://localhost:3000/audits" --script - <<'JS'
await page.click('button:has-text("Nouvel audit")');
await page.waitForSelector('input[placeholder*="Audit"]', { timeout: 3000 });
await page.fill('input[placeholder*="Audit"]', 'Smoke test audit');
await page.screenshot({ path: '/tmp/new-audit-modal.png' });
JS
```

---

## Raw API calls (curl)

Useful for checking backend state without the browser.

```bash
# Get a token (valid 7 days)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@greenpulse.io","password":"Admin123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Projects
curl -s http://localhost:3001/api/projects -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Audits
curl -s http://localhost:3001/api/audits -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Dashboard metrics
curl -s http://localhost:3001/api/metrics/dashboard -H "Authorization: Bearer $TOKEN"

# Generate a report (needs a valid auditId)
AUDIT_ID=$(curl -s http://localhost:3001/api/audits -H "Authorization: Bearer $TOKEN" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -s -X POST http://localhost:3001/api/reports/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"auditId\":\"$AUDIT_ID\",\"format\":\"pdf\"}"
```

---

## Stop the stack

```bash
docker compose down          # stop only
docker compose down -v       # stop + wipe volumes (destroys DB data)
```

---

## Gotchas

**`(unhealthy)` in docker compose ps for backend** — the healthcheck probe hits `/api/health/live` which does not exist; the API is fully operational. Ignore the unhealthy label.

**File changes not picked up (Windows Docker)** — Vite's `usePolling: true` is set but inotify doesn't fire reliably on Docker Desktop for Windows. Always `docker compose restart frontend` or `docker compose restart backend` after editing files.

**PostgreSQL returns `numeric` as strings** — the TypeORM driver on Node returns `NUMERIC`/`DECIMAL` columns as JS strings, not numbers. Any `.toFixed()` call must be wrapped: `Number(value).toFixed(2)`.

**PostgreSQL array columns as strings** — `scan_category[]` comes back as the raw PG wire format `{frontend,backend,...}`. Parse with: `rawValue.replace(/^\{|\}$/g, '').split(',')`.

**Backend restart loses in-flight BullMQ jobs** — audit jobs queued in Redis survive, but the worker re-registers on startup. Jobs started just before restart may need to be re-run.

**`docker compose restart` vs `docker compose up --build`** — `restart` only restarts the container with existing image; `up --build` rebuilds the image. For `package.json` changes (new deps), use `up --build`.

**Demo credentials**: `admin@greenpulse.io` / `Admin123!` — seeded by `infrastructure/postgres/seed.sql`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ERR_EMPTY_RESPONSE` on all `/api/*` calls | Backend TypeScript compile error. Run `docker compose logs backend --tail 50` to see the error. Fix the TS error, then `docker compose restart backend`. |
| `batch.map is not a function` in audit execution | `scan_category[]` returned as string. Already fixed in `audits.service.ts`. |
| `toFixed is not a function` on AuditDetailPage | PostgreSQL `numeric` returned as string. Wrap with `Number(...)`. Already fixed. |
| Frontend shows blank/white screen | Vite HMR broke; `docker compose restart frontend`. |
| `Cannot find module 'react'` in IDE | False positive — local `node_modules` absent. The Docker container has them. Ignore. |

#!/usr/bin/env bash
# GreenPulse smoke test — curl-based, no browser needed.
# Run from repo root: bash .claude/skills/run-greenpulse/smoke.sh
# Requires: stack running via `docker compose up -d`

set -euo pipefail

FRONTEND="http://localhost:3000"
API="http://localhost:3001/api"
EMAIL="${GREENPULSE_EMAIL:-admin@greenpulse.io}"
PASSWORD="${GREENPULSE_PASSWORD:-Admin123!}"

ok()  { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail(){ printf "  \033[31m✗\033[0m %s\n" "$1"; exit 1; }

echo "=== GreenPulse smoke test ==="

# ── 1. Frontend HTML ──────────────────────────────────────────────────────────
body=$(curl -sf "$FRONTEND/" 2>/dev/null) || fail "frontend unreachable at $FRONTEND"
echo "$body" | grep -q "GreenPulse" || fail "frontend HTML missing <title>GreenPulse"
ok "frontend HTML ($FRONTEND)"

# ── 2. Auth — login ───────────────────────────────────────────────────────────
resp=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}") \
  || fail "POST /api/auth/login failed"
TOKEN=$(echo "$resp" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOKEN" ] || fail "no accessToken in login response"
ok "auth/login → JWT obtained"

AUTH="Authorization: Bearer $TOKEN"

# ── 3. Projects ───────────────────────────────────────────────────────────────
projects=$(curl -sf "$API/projects" -H "$AUTH") \
  || fail "GET /api/projects failed"
echo "$projects" | grep -q '"data"' || fail "/api/projects response missing 'data'"
ok "GET /api/projects"

# ── 4. Audits ─────────────────────────────────────────────────────────────────
audits=$(curl -sf "$API/audits" -H "$AUTH") \
  || fail "GET /api/audits failed"
echo "$audits" | grep -q '"data"' || fail "/api/audits response missing 'data'"
ok "GET /api/audits"

# ── 5. Dashboard metrics ──────────────────────────────────────────────────────
metrics=$(curl -sf "$API/metrics/dashboard" -H "$AUTH") \
  || fail "GET /api/metrics/dashboard failed"
echo "$metrics" | grep -q '"totalAudits"' || fail "/api/metrics/dashboard missing totalAudits"
ok "GET /api/metrics/dashboard"

# ── 6. Reports ────────────────────────────────────────────────────────────────
reports=$(curl -sf "$API/reports" -H "$AUTH") \
  || fail "GET /api/reports failed"
echo "$reports" | grep -q '"data"' || fail "/api/reports missing 'data'"
ok "GET /api/reports"

# ── 7. First audit detail (if any) ───────────────────────────────────────────
AUDIT_ID=$(echo "$audits" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$AUDIT_ID" ]; then
  detail=$(curl -sf "$API/audits/$AUDIT_ID" -H "$AUTH") \
    || fail "GET /api/audits/$AUDIT_ID failed"
  echo "$detail" | grep -q '"status"' || fail "audit detail missing 'status'"
  ok "GET /api/audits/$AUDIT_ID"
else
  ok "GET /api/audits/<id> — skipped (no audits yet)"
fi

echo ""
echo "=== All checks passed ==="

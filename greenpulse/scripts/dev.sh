#!/bin/bash
# =============================================================================
# GreenPulse — Dev Quick Start Script
# Lance l'environnement de développement local
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[dev]${NC} $*"; }
warn()    { echo -e "${YELLOW}[dev] WARN${NC} $*"; }
error()   { echo -e "${RED}[dev] ERROR${NC} $*" >&2; }
section() { echo -e "\n${BLUE}${BOLD}── $* ──${NC}"; }
url()     { echo -e "  ${CYAN}$*${NC}"; }

# ── Project root ──────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Cleanup on exit ───────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  log "Shutting down dev servers..."
  [[ -n "$BACKEND_PID" ]]  && kill "$BACKEND_PID"  2>/dev/null && log "Backend stopped"
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null && log "Frontend stopped"
  log "Dev environment stopped. Databases are still running (docker-compose)."
  log "To stop databases: cd ${PROJECT_ROOT} && docker-compose stop postgres redis mailhog"
  exit 0
}

trap cleanup SIGINT SIGTERM

# ── Checks ────────────────────────────────────────────────────────────────────

check_dependencies() {
  section "Checking dependencies"

  local missing=0

  # Docker
  if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Install from https://docs.docker.com/get-docker/"
    ((missing++))
  else
    log "Docker: $(docker --version | head -1)"
  fi

  # Docker Compose
  if ! docker compose version &>/dev/null 2>&1 && ! command -v docker-compose &>/dev/null; then
    error "docker-compose is not installed."
    ((missing++))
  else
    log "Docker Compose: OK"
  fi

  # Node
  if ! command -v node &>/dev/null; then
    error "Node.js is not installed. Install from https://nodejs.org/ (>= 20)"
    ((missing++))
  else
    local node_version
    node_version=$(node --version)
    local node_major
    node_major=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)
    if [[ "$node_major" -lt 20 ]]; then
      warn "Node.js ${node_version} detected. Recommended: >= v20"
    else
      log "Node.js: ${node_version}"
    fi
  fi

  # npm
  if ! command -v npm &>/dev/null; then
    error "npm is not installed."
    ((missing++))
  else
    log "npm: $(npm --version)"
  fi

  if [[ $missing -gt 0 ]]; then
    error "Missing ${missing} required dependency/ies. Please install them first."
    exit 1
  fi

  log "All dependencies satisfied"
}

check_env() {
  section "Checking environment"
  if [[ ! -f "${PROJECT_ROOT}/.env" ]]; then
    if [[ -f "${PROJECT_ROOT}/.env.example" ]]; then
      warn ".env not found — copying from .env.example"
      cp "${PROJECT_ROOT}/.env.example" "${PROJECT_ROOT}/.env"
      log "Created .env from .env.example"
      warn "Edit ${PROJECT_ROOT}/.env to set your API keys (OPENAI_API_KEY etc.)"
    else
      warn ".env not found and no .env.example available"
    fi
  else
    log ".env found"
  fi
}

check_node_modules() {
  local dir="$1"
  local name="$2"
  if [[ ! -d "${dir}/node_modules" ]]; then
    log "Installing ${name} dependencies..."
    (cd "$dir" && npm install)
  else
    log "${name} node_modules: OK"
  fi
}

# ── Docker services ───────────────────────────────────────────────────────────

start_docker_services() {
  section "Starting Docker infrastructure"

  cd "${PROJECT_ROOT}"

  log "Starting PostgreSQL, Redis, MailHog..."
  docker compose up -d postgres redis mailhog 2>&1 | grep -E "(Starting|Running|Healthy|Error)" || true

  # Wait for postgres to be healthy
  log "Waiting for PostgreSQL to be ready..."
  local retries=0
  until docker compose exec -T postgres pg_isready -U greenpulse -d greenpulse &>/dev/null; do
    ((retries++))
    if [[ $retries -ge 30 ]]; then
      error "PostgreSQL failed to start after 30 seconds"
      exit 1
    fi
    printf "."
    sleep 1
  done
  echo ""
  log "PostgreSQL is ready"

  # Wait for redis
  log "Waiting for Redis to be ready..."
  retries=0
  until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
    ((retries++))
    if [[ $retries -ge 15 ]]; then
      error "Redis failed to start after 15 seconds"
      exit 1
    fi
    printf "."
    sleep 1
  done
  echo ""
  log "Redis is ready"

  log "MailHog SMTP is available at localhost:1025"
}

# ── App servers ───────────────────────────────────────────────────────────────

start_backend() {
  section "Starting Backend (NestJS)"

  local backend_dir="${PROJECT_ROOT}/apps/backend"
  check_node_modules "$backend_dir" "backend"

  cd "$backend_dir"
  log "Launching NestJS in watch mode..."
  npm run start:dev &
  BACKEND_PID=$!
  log "Backend started (PID: ${BACKEND_PID})"
}

start_frontend() {
  section "Starting Frontend (React + Vite)"

  local frontend_dir="${PROJECT_ROOT}/apps/frontend"
  check_node_modules "$frontend_dir" "frontend"

  cd "$frontend_dir"
  log "Launching Vite dev server..."
  npm run dev &
  FRONTEND_PID=$!
  log "Frontend started (PID: ${FRONTEND_PID})"
}

# ── Main ──────────────────────────────────────────────────────────────────────

main() {
  echo -e "${GREEN}${BOLD}"
  echo "  ╔═══════════════════════════════════╗"
  echo "  ║  🌿  GreenPulse Dev Environment   ║"
  echo "  ╚═══════════════════════════════════╝"
  echo -e "${NC}"

  check_dependencies
  check_env
  start_docker_services
  start_backend
  start_frontend

  # Wait for servers to initialize
  sleep 4

  section "Dev environment ready"
  echo ""
  echo -e "  ${BOLD}Application URLs:${NC}"
  url "Frontend:       http://localhost:3000"
  url "Backend API:    http://localhost:3001/api"
  url "Swagger UI:     http://localhost:3001/api/docs"
  url "Health check:   http://localhost:3001/api/health"
  echo ""
  echo -e "  ${BOLD}Infrastructure:${NC}"
  url "MailHog UI:     http://localhost:8025"
  echo ""
  echo -e "  ${BOLD}Login (seed data):${NC}"
  url "Email:    admin@greenpulse.io"
  url "Password: Admin123!"
  echo ""
  echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
  echo ""

  # Keep script alive and wait for child processes
  wait
}

main "$@"

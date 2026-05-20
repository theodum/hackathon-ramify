#!/bin/bash
# =============================================================================
# GreenPulse — PostgreSQL Backup Script
# Backup quotidien avec rotation sur 7 jours et notification email en cas d'échec
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-greenpulse}"
DB_USER="${DB_USER:-greenpulse}"
DB_PASSWORD="${DB_PASSWORD:-greenpulse123}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"
SMTP_HOST="${SMTP_HOST:-localhost}"
SMTP_PORT="${SMTP_PORT:-1025}"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $*"; }
warn()  { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN${NC} $*"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR${NC} $*" >&2; }

# ── Timestamp & filename ──────────────────────────────────────────────────────
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILENAME="${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

# ── Functions ─────────────────────────────────────────────────────────────────

notify_failure() {
  local message="$1"
  error "Backup failed: ${message}"

  if [[ -n "${NOTIFY_EMAIL}" ]]; then
    if command -v curl &>/dev/null; then
      curl --silent \
        --url "smtp://${SMTP_HOST}:${SMTP_PORT}" \
        --mail-from "backup@greenpulse.io" \
        --mail-rcpt "${NOTIFY_EMAIL}" \
        --upload-file - <<EOF
From: GreenPulse Backup <backup@greenpulse.io>
To: ${NOTIFY_EMAIL}
Subject: [ALERT] GreenPulse DB Backup Failed — $(date '+%Y-%m-%d')
Content-Type: text/plain

GreenPulse database backup failed on $(hostname) at $(date '+%Y-%m-%d %H:%M:%S').

Error: ${message}

Database: ${DB_NAME}
Host: ${DB_HOST}:${DB_PORT}

Please check the backup script and restore if necessary.

-- GreenPulse Backup System
EOF
      log "Failure notification sent to ${NOTIFY_EMAIL}"
    else
      warn "curl not available — cannot send email notification"
    fi
  fi
}

cleanup_old_backups() {
  log "Cleaning up backups older than ${RETENTION_DAYS} days..."
  local count=0
  while IFS= read -r -d '' file; do
    rm -f "$file"
    ((count++))
  done < <(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null)

  if [[ $count -gt 0 ]]; then
    log "Removed ${count} old backup(s)"
  else
    log "No old backups to remove"
  fi
}

verify_backup() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  local size
  size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
  if [[ "$size" -lt 100 ]]; then
    error "Backup file is too small (${size} bytes) — likely empty or corrupted"
    return 1
  fi
  # Verify gzip integrity
  if ! gzip -t "$file" &>/dev/null; then
    error "Backup file gzip integrity check failed"
    return 1
  fi
  return 0
}

# ── Main ──────────────────────────────────────────────────────────────────────

main() {
  log "Starting GreenPulse database backup..."
  log "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
  log "Backup dir: ${BACKUP_DIR}"

  # Create backup directory if it doesn't exist
  mkdir -p "${BACKUP_DIR}"

  # Set PGPASSWORD for non-interactive authentication
  export PGPASSWORD="${DB_PASSWORD}"

  # Check pg_dump availability
  if ! command -v pg_dump &>/dev/null; then
    notify_failure "pg_dump not found. Install postgresql-client."
    exit 1
  fi

  # Check database connectivity
  if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" &>/dev/null; then
    notify_failure "Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT}"
    exit 1
  fi

  log "Database connectivity OK"

  # Run backup
  log "Dumping database to ${BACKUP_FILENAME}..."
  if ! pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=plain \
    --no-password \
    --verbose \
    2>>"${BACKUP_DIR}/backup.log" \
    | gzip -9 > "${BACKUP_PATH}"; then
    notify_failure "pg_dump failed. Check ${BACKUP_DIR}/backup.log for details."
    rm -f "${BACKUP_PATH}"
    exit 1
  fi

  # Verify backup integrity
  if ! verify_backup "${BACKUP_PATH}"; then
    notify_failure "Backup verification failed for ${BACKUP_PATH}"
    rm -f "${BACKUP_PATH}"
    exit 1
  fi

  local size
  size=$(du -sh "${BACKUP_PATH}" | cut -f1)
  log "Backup completed: ${BACKUP_FILENAME} (${size})"

  # Cleanup old backups
  cleanup_old_backups

  # Summary
  log "Backup summary:"
  log "  File: ${BACKUP_PATH}"
  log "  Size: ${size}"
  log "  Retention: ${RETENTION_DAYS} days"

  local backup_count
  backup_count=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" 2>/dev/null | wc -l)
  log "  Total backups stored: ${backup_count}"

  log "Backup completed successfully!"
}

# Handle errors
trap 'notify_failure "Unexpected error at line $LINENO"' ERR

main "$@"

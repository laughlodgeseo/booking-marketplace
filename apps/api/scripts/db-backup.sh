#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
#  PostgreSQL backup script for booking-marketplace
#  Usage:  ./scripts/db-backup.sh
#  Env:    DATABASE_URL (required)
#          BACKUP_DIR   (optional, defaults to ./backups)
# ──────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="booking_marketplace_${TIMESTAMP}.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Starting backup → ${BACKUP_DIR}/${FILENAME}"
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --format=plain \
  --clean \
  --if-exists \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "Backup complete: ${BACKUP_DIR}/${FILENAME} ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

# Retain only last 30 backups
cd "$BACKUP_DIR"
ls -1t booking_marketplace_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
echo "Retention policy applied (kept last 30)."

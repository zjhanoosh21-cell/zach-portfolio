#!/bin/bash
# Daily backup for CRI CRM — PostgreSQL database + uploaded resume files
#
# Set up as a daily cron job on the VPS:
#   0 2 * * * /opt/cri-crm/scripts/backup-db.sh >> /var/log/cri-crm-backup.log 2>&1

set -e

BACKUP_DIR="/backups/cri-crm"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30

mkdir -p "${BACKUP_DIR}"

# ── Database backup ──────────────────────────────────────────────────────────
DB_FILE="${BACKUP_DIR}/db-${DATE}.sql.gz"
echo "[$(date)] Backing up database..."
docker exec cri-crm-db pg_dump -U cri cri_crm | gzip > "${DB_FILE}"
echo "[$(date)] Database backup saved: ${DB_FILE} ($(du -sh "${DB_FILE}" | cut -f1))"

# ── Uploads backup (resume files) ───────────────────────────────────────────
echo "[$(date)] Backing up uploaded files..."
docker run --rm \
  -v crm-uploads:/uploads:ro \
  -v "${BACKUP_DIR}:/backup" \
  alpine \
  tar czf "/backup/uploads-${DATE}.tar.gz" -C / uploads
echo "[$(date)] Uploads backup saved: ${BACKUP_DIR}/uploads-${DATE}.tar.gz"

# ── Cleanup: remove old backups ──────────────────────────────────────────────
find "${BACKUP_DIR}" -name "db-*.sql.gz"      -mtime +${KEEP_DAYS} -delete
find "${BACKUP_DIR}" -name "uploads-*.tar.gz" -mtime +${KEEP_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${KEEP_DAYS} days."

# ─────────────────────────────────────────────────────────────────────────────
# Restore database (run manually when needed):
#   gunzip -c /backups/cri-crm/db-YYYYMMDD_HHMMSS.sql.gz | \
#     docker exec -i cri-crm-db psql -U cri cri_crm
#
# Restore uploads:
#   docker run --rm \
#     -v crm-uploads:/uploads \
#     -v /backups/cri-crm:/backup \
#     alpine \
#     tar xzf /backup/uploads-YYYYMMDD_HHMMSS.tar.gz -C /
# ─────────────────────────────────────────────────────────────────────────────

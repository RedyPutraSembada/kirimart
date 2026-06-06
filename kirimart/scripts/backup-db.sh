#!/bin/bash
# ============================================
# KawanBelanja — Database Backup Script
# ============================================
#
# Cara pakai (manual):
#   bash scripts/backup-db.sh
#
# Otomatis via cron (setiap hari jam 3 pagi):
#   crontab -e
#   0 3 * * * /home/deploy/kawanbelanja/kawanbelanja/scripts/backup-db.sh
#
# ============================================

set -e

# ── Konfigurasi ──
COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="kawanbelanja_backup_${DATE}.sql.gz"
KEEP_DAYS=7  # Hapus backup lebih lama dari 7 hari

cd "$PROJECT_DIR"

# ── Buat folder backup ──
mkdir -p "$BACKUP_DIR"

# ── Dump database ──
echo "[BACKUP] Starting database backup..."

docker compose -f $COMPOSE_FILE exec -T postgres \
    pg_dump -U kawanbelanja -d kawanbelanja --clean --if-exists --no-owner \
    | gzip > "$BACKUP_DIR/$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "[BACKUP] ✅ Backup saved: $BACKUP_FILE ($FILESIZE)"

# ── Hapus backup lama ──
DELETED=$(find "$BACKUP_DIR" -name "kawanbelanja_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "[BACKUP] 🧹 Deleted $DELETED old backup(s) (older than $KEEP_DAYS days)"
fi

echo "[BACKUP] Done. Backups in: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  (no backups found)"

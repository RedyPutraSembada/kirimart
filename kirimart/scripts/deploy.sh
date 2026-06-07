#!/bin/bash
# ============================================
# KawanBelanja — Deployment Script
# ============================================
#
# Jalankan setiap kali deploy update baru.
#
# Cara pakai:
#   cd ~/kawanbelanja/kirimart
#   bash scripts/deploy.sh
#
# Opsi:
#   bash scripts/deploy.sh --migrate    # Termasuk migrasi database
#   bash scripts/deploy.sh --rebuild    # Force rebuild semua image
#
# ============================================

set -e

# ── Konfigurasi ──
COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

echo "============================================"
echo "  KawanBelanja — Deploy"
echo "  Directory: $PROJECT_DIR"
echo "============================================"
echo ""

# ── Cek .env.production ──
if [ ! -f .env.production ]; then
    echo "❌ ERROR: .env.production tidak ditemukan!"
    echo "   Copy dari template: cp .env.production.example .env.production"
    echo "   Lalu isi semua nilai GANTI_INI"
    exit 1
fi

# ── Parse arguments ──
DO_MIGRATE=false
DO_REBUILD=false
for arg in "$@"; do
    case $arg in
        --migrate)  DO_MIGRATE=true ;;
        --rebuild)  DO_REBUILD=true ;;
    esac
done

# ── 1. Pull latest code ──
echo "[1/5] Pulling latest code..."
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "⚠️  Git pull skipped"

# Pull file-uploader juga
if [ -d "../../file-uploader-kawanbelanja" ]; then
    echo "      Pulling file-uploader..."
    cd ../../file-uploader-kawanbelanja
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "⚠️  Uploader pull skipped"
    cd "$PROJECT_DIR"
fi

# ── 2. Build Docker images ──
echo ""
if [ "$DO_REBUILD" = true ]; then
    echo "[2/5] Building ALL images (force rebuild)..."
    docker compose --env-file .env.production -f $COMPOSE_FILE build --no-cache
else
    echo "[2/5] Building images (cache enabled)..."
    docker compose --env-file .env.production -f $COMPOSE_FILE build
fi

# ── 3. Start infrastructure first (Postgres, Redis, NPM) ──
echo ""
echo "[3/5] Starting infrastructure (Postgres, Redis, NPM)..."
docker compose --env-file .env.production -f $COMPOSE_FILE up -d postgres redis nginx-proxy-manager

# Tunggu PostgreSQL healthy
echo "      Waiting for PostgreSQL to be ready..."
RETRIES=30
until docker compose --env-file .env.production -f $COMPOSE_FILE exec -T postgres pg_isready -U kawanbelanja > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    RETRIES=$((RETRIES-1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    echo "❌ PostgreSQL gagal start! Cek logs: docker compose --env-file .env.production -f $COMPOSE_FILE logs postgres"
    exit 1
fi
echo "      ✅ PostgreSQL ready"

# ── 4. Run migrations (if requested) ──
if [ "$DO_MIGRATE" = true ]; then
    echo ""
    echo "[4/5] Running database migrations..."
    docker compose --env-file .env.production -f $COMPOSE_FILE --profile tools run --rm migrate
    echo "      ✅ Migrations complete"
else
    echo ""
    echo "[4/5] Skipping migrations (gunakan --migrate untuk menjalankan)"
fi

# ── 5. Start application services ──
echo ""
echo "[5/5] Starting application services..."
docker compose --env-file .env.production -f $COMPOSE_FILE up -d

# ── Status ──
echo ""
echo "============================================"
echo "  ✅ Deployment Complete!"
echo "============================================"
echo ""
docker compose --env-file .env.production -f $COMPOSE_FILE ps
echo ""
echo "  Cek resource: docker stats"
echo "  Cek logs:     docker compose --env-file .env.production -f $COMPOSE_FILE logs -f nextjs"
echo ""
echo "============================================"

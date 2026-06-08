#!/bin/bash

# 1. Muat variabel environment
echo "Memuat environment variables..."
set -a
source .env 
set +a

# Fungsi untuk menjalankan service agar skrip lebih bersih
run_service() {
    folder=$1
    echo "Memulai $folder..."
    cd "$folder" && docker compose up -d --build && cd ..
}

echo "Memulai PostgreSQL..."
run_service "1-postgres"

# Menunggu PostgreSQL... (bagian ini sudah benar, tetap gunakan)
# ... (kode menunggu pg_isready Anda di sini)

echo "Memulai Redis..."
run_service "2-redis"

# ... (kode menunggu redis Anda di sini)

echo "Memulai Nginx Proxy Manager..."
run_service "3-nginx"

echo "Menyalin file env untuk build Next.js..."
cp .env ../.env.production

echo "Memulai WS Server..."
run_service "4-ws-server"

echo "Memulai File Uploader..."
run_service "5-file-uploader"

echo "Memulai Next.js (bisa memakan waktu untuk build)..."
run_service "6-nextjs"

echo "✅ Semua service berhasil dijalankan!"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "kb-"
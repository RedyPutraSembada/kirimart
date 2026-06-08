#!/bin/bash
# Script untuk start semua service berurutan

# 1. Muat variabel environment secara otomatis
echo "Memuat environment variables..."
set -a
# Jika kamu sebelumnya sudah menyalin .env.production ke .env, gunakan .env
source .env 
set +a

echo "Memulai PostgreSQL..."
cd 1-postgres && docker compose up -d && cd ..

echo "Menunggu PostgreSQL siap..."
RETRIES=30
# 2. Ubah -U kawanbelanja menjadi -U "$PG_USER" agar dinamis sesuai file .env
until docker exec kb-postgres pg_isready -U "$PG_USER" > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    RETRIES=$((RETRIES-1))
    sleep 1
done

if [ $RETRIES -eq 0 ]; then
    echo "❌ PostgreSQL gagal start!"
    exit 1
fi
echo "✅ PostgreSQL siap!"

echo "Memulai Redis..."
cd 2-redis && docker compose up -d && cd ..

echo "Menunggu Redis siap..."
RETRIES=30
until docker exec kb-redis redis-cli ping | grep -q PONG || [ $RETRIES -eq 0 ]; do
    RETRIES=$((RETRIES-1))
    sleep 1
done

if [ $RETRIES -eq 0 ]; then
    echo "❌ Redis gagal start!"
    exit 1
fi
echo "✅ Redis siap!"

echo "Memulai Nginx Proxy Manager..."
cd 3-nginx && docker compose up -d && cd ..

# Copy .env.production untuk Next.js build agar NEXT_PUBLIC_* ter-embed (workaround context)
echo "Menyalin file env untuk build Next.js..."
cp .env ../kirimart/.env.production

echo "Memulai Next.js (bisa memakan waktu untuk build)..."
cd 4-nextjs && docker compose up -d --build && cd ..

echo "Memulai WS Server..."
cd 5-ws-server && docker compose up -d --build && cd ..

echo "Memulai File Uploader..."
cd 6-file-uploader && docker compose up -d --build && cd ..

echo "✅ Semua service berhasil dijalankan!"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "kb-"
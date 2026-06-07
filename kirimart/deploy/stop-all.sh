#!/bin/bash
echo "Menghentikan File Uploader..."
cd 6-file-uploader && docker compose down && cd ..

echo "Menghentikan WS Server..."
cd 5-ws-server && docker compose down && cd ..

echo "Menghentikan Next.js..."
cd 4-nextjs && docker compose down && cd ..

echo "Menghentikan Nginx Proxy Manager..."
cd 3-nginx && docker compose down && cd ..

echo "Menghentikan Redis..."
cd 2-redis && docker compose down && cd ..

echo "Menghentikan PostgreSQL..."
cd 1-postgres && docker compose down && cd ..

echo "✅ Semua service berhasil dihentikan!"

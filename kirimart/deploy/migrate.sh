#!/bin/bash
# Menjalankan migrasi database via docker (drizzle-kit push)

echo "Menjalankan migrasi database (drizzle-kit push)..."
docker run --rm -it \
  --user root \
  --network kawanbelanja-net \
  -v /home/myapp/kawan-belanja/kirimart/kirimart:/app-src \
  -w /app-src \
  --env-file .env.production \
  6-nextjs-nextjs \
  sh -c "bun install && bunx drizzle-kit push"

echo "Migrasi selesai!"

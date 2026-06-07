#!/bin/bash
# Menjalankan migrasi database via docker (drizzle-kit push)

echo "Menjalankan migrasi database (drizzle-kit push)..."
docker run --rm -it \
  --network kawanbelanja-net \
  --env-file .env.production \
  kb-nextjs \
  bun run db:push

echo "Migrasi selesai!"

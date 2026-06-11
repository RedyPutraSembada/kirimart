# --- Tahap 1: Base ---
FROM oven/bun:1-alpine AS base
WORKDIR /app
# libc6-compat tetap diperlukan alpine untuk kestabilan modul backend
RUN apk add --no-cache libc6-compat

# --- Tahap 2: Dependencies ---
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install

# --- Tahap 3: Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY .env.production .env.production

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# --- Tahap 4: Runner ---
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Ambil hasil build standalone (Persis seperti aplikasi Anda yang lain)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# [KHUSUS KIRIMART] Menyalin css-tree utuh ke runner untuk mengatasi bug patch.json pada Bun Standalone
COPY --from=builder /app/node_modules/css-tree ./node_modules/css-tree

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Jalankan standalone server dengan Bun sebagai ROOT (Tanpa USER bun)
CMD ["bun", "server.js"]

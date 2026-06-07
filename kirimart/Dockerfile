# ============================================
# Dockerfile — KawanBelanja Next.js Production
# ============================================
#
# Multi-stage build:
#   1. deps    → Install dependencies
#   2. builder → Build Next.js (standalone mode)
#   3. runner  → Run production server
#
# Build:
#   docker build -t kawanbelanja-app .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.production kawanbelanja-app
#
# ============================================

# ===== Stage 1: Install Dependencies =====
FROM oven/bun:1-alpine AS deps

# libc6-compat diperlukan untuk beberapa native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files (support package.json and bun lockfile)
COPY package.json bun.lock* ./

# Install ALL dependencies (termasuk devDependencies untuk build)
RUN bun install

# ===== Stage 2: Build Application =====
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy dependencies dari stage sebelumnya
COPY --from=deps /app/node_modules ./node_modules

# Copy semua source code
COPY . .

# Copy .env.production agar NEXT_PUBLIC_* vars ter-embed saat build
# File ini HARUS sudah ada di build context sebelum docker build
COPY .env.production .env.production

# Set environment untuk build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js (standalone output)
RUN bun run build

# ===== Stage 3: Production Runner =====
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy public assets (favicon, images, manifest, sounds, dll)
COPY --from=builder /app/public ./public

# Copy standalone build output
# standalone/ berisi server.js + node_modules minimal yang dibutuhkan
COPY --from=builder --chown=bun:bun /app/.next/standalone ./

# Copy static files (.next/static = JS/CSS bundles)
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

# Gunakan user non-root bawaan image bun
USER bun

# Port yang dipakai Next.js
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Jalankan standalone server dengan bun
CMD ["bun", "server.js"]

# ============================================
# Dockerfile — KawanBelanja Next.js Production
# ============================================
#
# Multi-stage build:
#   1. deps    → Install dependencies
#   2. builder → Build Next.js (standalone mode)
#   3. runner  → Run production server (~200MB image)
#
# Build:
#   docker build -t kawanbelanja-app .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.production kawanbelanja-app
#
# ============================================

# ===== Stage 1: Install Dependencies =====
FROM node:22-alpine AS deps

# libc6-compat diperlukan untuk beberapa native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (termasuk devDependencies untuk build)
RUN npm ci

# ===== Stage 2: Build Application =====
FROM node:22-alpine AS builder

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
RUN npm run build

# ===== Stage 3: Production Runner =====
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Buat user non-root untuk keamanan
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets (favicon, images, manifest, sounds, dll)
COPY --from=builder /app/public ./public

# Copy standalone build output
# standalone/ berisi server.js + node_modules minimal yang dibutuhkan
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files (.next/static = JS/CSS bundles)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Gunakan user non-root
USER nextjs

# Port yang dipakai Next.js
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Jalankan standalone server
CMD ["node", "server.js"]

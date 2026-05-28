# ============================================
# Dockerfile untuk KiriMart WebSocket Server
# ============================================
#
# Multi-stage build:
# 1. Stage "deps"  → install dependencies
# 2. Stage "runner" → jalankan server (image ringan)
#
# Image akhir ±60MB (Node.js 22 Alpine)
# ============================================

# --- Stage 1: Install dependencies ---
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (production only)
RUN npm install --omit=dev

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

# Copy dependencies dari stage sebelumnya
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Port yang di-expose
EXPOSE 3001

# Health check — pastikan server masih hidup
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Jalankan server
CMD ["node", "src/index.js"]

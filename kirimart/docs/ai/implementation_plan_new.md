# 📋 Analisis Arsitektur Lengkap & Perencanaan Strategis — kawanbelanja

> Dokumen ini disusun setelah membedah **seluruh** codebase aplikasi — 21 file dokumentasi, 25 tabel database, 12+ server actions, 3 webhook endpoint, konfigurasi Docker/Redis/WebSocket, serta semua file konfigurasi dan fitur UI.

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Inventaris Codebase](#2-inventaris-codebase)
3. [Analisis Per-Layer (Plus & Minus)](#3-analisis-per-layer-plus--minus)
4. [Gap Analysis: Pilar Bisnis](#4-gap-analysis-pilar-bisnis)
5. [Rekomendasi Peningkatan Kode](#5-rekomendasi-peningkatan-kode)
6. [Fitur yang MASIH KURANG (Killer Features)](#6-fitur-yang-masih-kurang-killer-features)
7. [Roadmap Prioritas Eksekusi](#7-roadmap-prioritas-eksekusi)

---

## 1. Ringkasan Eksekutif

**kawanbelanja** (KiriMart) adalah platform multi-vendor e-commerce yang sudah memiliki pondasi arsitektur sangat matang. Dari sisi teknis, aplikasi ini sudah melampaui tahap MVP — terutama pada area:

| Aspek | Status | Keterangan |
|:------|:-------|:-----------|
| **Database Schema** | ✅ Lengkap (25 tabel) | Termasuk variant system, complaint, refund, withdrawal, platform settings |
| **Auth & RBAC** | ✅ Production-ready | Better Auth + 4 role (admin, seller, user, member) + email OTP + Google OAuth |
| **Payment Gateway** | ✅ Terintegrasi | Midtrans Core API + Snap + Webhook + Signature verification |
| **Shipping** | ✅ Terintegrasi | Biteship API + Webhook + Caching Area ID |
| **Real-time** | ✅ Fondasi sudah ada | WS Server (Socket.IO) + Redis Adapter + BullMQ Workers |
| **Caching** | ✅ Sudah ada layer | Redis singleton + `cached()` wrapper + invalidation pattern |
| **Dashboard Admin** | ✅ CRUD lengkap | Categories, Products, Stores, Users, Vouchers |
| **Dashboard Seller** | ✅ CRUD lengkap | Products, Orders, Vouchers, Store Profile |
| **Checkout & Cart** | ✅ Fungsional | Terintegrasi Biteship live ongkir + Midtrans payment |

> [!IMPORTANT]
> Secara arsitektur, kawanbelanja sudah jauh lebih matang dibanding banyak startup e-commerce Indonesia di tahap awal. **7-Layer Architecture** yang diterapkan sangat disiplin dan konsisten. Yang dibutuhkan sekarang adalah **penajaman fitur bisnis** dan **optimasi performa** untuk bisa bersaing dengan raksasa marketplace.

---

## 2. Inventaris Codebase

### 2A. Database Schema (25 Tabel)

| # | Tabel | Status | Catatan |
|:-:|:------|:-------|:--------|
| 1 | `user` | ✅ | Better Auth managed, custom fields: phoneNumber |
| 2 | `session` | ✅ | Better Auth sessions |
| 3 | `account` | ✅ | Google OAuth |
| 4 | `verification` | ✅ | Email verification |
| 5 | `rate_limit` | ✅ | Rate limiting |
| 6 | `addresses` | ✅ | Biteship Area ID cached, lat/lng, isDefault |
| 7 | `stores` | ✅ | Balance, bank info, enabledCouriers, rating, follower |
| 8 | `store_followers` | ✅ | Toggle follow |
| 9 | `categories` | ✅ | Hierarchical parent-child |
| 10 | `products` | ✅ | basePrice, originalPrice, soldCount, rating, discountRules (JSONB) |
| 11 | `product_images` | ✅ | Multi-image support |
| 12 | `product_options` | ✅ | JSONB values (Warna, Ukuran) |
| 13 | `product_variants` | ✅ | JSONB attributes, price, stock, SKU |
| 14 | `carts` | ✅ | 1 cart per user |
| 15 | `cart_items` | ✅ | variantId support |
| 16 | `vouchers` | ✅ | Global + toko, quota, min purchase, date range |
| 17 | `payments` | ✅ | Midtrans full integration, JSONB metadata |
| 18 | `orders` | ✅ | Per-store split, platformFee, voucherId |
| 19 | `order_items` | ✅ | Price snapshot, variant snapshot |
| 20 | `shipments` | ✅ | Biteship integration fields |
| 21 | `reviews` | ✅ | Per orderItem, rating + comment |
| 22 | `withdrawals` | ✅ | Seller withdrawal request |
| 23 | `conversations` | ✅ | Schema + `chat.actions.js` (15KB) + `chat-view.jsx` (26KB) + halaman `/chat` + unread badge di navbar |
| 24 | `messages` | ✅ | Terintegrasi dalam chat system + BroadcastChannel untuk real-time update badge |
| 25 | `notifications` | ✅ | Schema + actions + **Bell icon 🔔 di navbar** (Popover dropdown, unread badge, mark all read, optimistic update, BroadcastChannel) |
| 26 | `wishlists` | ✅ | Schema + `wishlist.actions.js` (toggle, check, getUserWishlists) + `wishlist-page.jsx` (heart icon, ProductCard grid) |
| 27 | `complaints` | ✅ | Order complaint system |
| 28 | `refund_requests` | ✅ | Refund linked to complaint |
| 29 | `platform_settings` | ✅ | Commission tiers, PG fee config (JSONB) |

### 2B. Server Actions (12+ files)

| Area | File | Fungsi Utama |
|:-----|:-----|:-------------|
| Public | `cart.actions.js` (13.7KB) | CRUD keranjang belanja |
| Public | `checkout.actions.js` (13.3KB) | Prepare checkout + Biteship live ongkir |
| Public | `payment/` | Midtrans Snap + Core API + payment method list |
| Public | `biteship.actions.js` (10.3KB) | Search area, rates, create/cancel order |
| Public | `chat.actions.js` (15.3KB) | CRUD conversations + messages |
| Public | `notification.actions.js` (5.3KB) | List, mark read, delete notifications |
| Public | `review.actions.js` (3.5KB) | Create review + update product/store rating |
| Public | `search.actions.js` (3.2KB) | Full-text search products |
| Public | `storefront.actions.js` (8.7KB) | Public store page + catalog |
| Public | `store-follow.actions.js` (2.3KB) | Toggle follow toko |
| Public | `tracking.actions.js` (6.3KB) | Track shipment + webhook status |
| Public | `voucher.actions.js` (4.9KB) | Validate & apply voucher |

### 2C. Infrastruktur

| Komponen | Status | Detail |
|:---------|:-------|:-------|
| **Docker Compose** | ✅ | Redis 7-alpine + WS Server |
| **WS Server** | ✅ | Socket.IO + Redis Adapter + BullMQ Workers |
| **Namespaces** | ✅ | `/chat` + `/notifications` |
| **REST Emit** | ✅ | `POST /emit` untuk Next.js → WS trigger |
| **BullMQ Workers** | ✅ | Auto-complete order + expire payment |
| **Redis Cache** | ✅ | `cached()` + `invalidateCache()` + pattern invalidation |

---

## 3. Analisis Per-Layer (Plus & Minus)

### Layer 1 — DB Schema

**✅ Plus:**
- Schema sudah **sangat mature** — 25+ tabel mencakup seluruh lifecycle e-commerce: product → cart → checkout → payment → shipment → review → withdrawal → refund
- **Variant system** (product_options + product_variants) menggunakan JSONB — sangat fleksibel dan bisa menampung kombinasi tak terbatas (Warna × Ukuran × Material)
- **Harga snapshot** di `order_items` — best practice mutlak untuk e-commerce agar riwayat harga tidak berubah
- **Platform fee** di `orders` — mendukung skema komisi bertingkat (tier-based)
- **discountRules JSONB** — sangat cerdas karena bisa support diskon qty-based tanpa tabel tambahan
- **Complaint & Refund** sudah ada schema-nya — ini menunjukkan visi bisnis yang matang

**⚠️ Minus:**
- **Tidak ada index eksplisit** — Semua tabel hanya menggunakan primary key. Untuk tabel besar seperti `products` (yang akan di-query berdasarkan `storeId`, `categoryId`, `status`, `name`), ini akan menjadi **bottleneck performa** saat data membesar
- **`products.rating`** menggunakan `decimal` — ini benar, tapi kalkulasi avg rating dilakukan di server action (on-write). Jika satu produk punya 10.000 review, recalculate all reviews setiap kali ada review baru bisa lambat. Pertimbangkan **incremental average** formula
- **Tidak ada `updatedAt`** pada beberapa tabel kritis (`orders`, `shipments`) — menyulitkan debugging dan audit trail
- **`stores.enabledCouriers`** disimpan sebagai comma-separated string — sebaiknya gunakan `text[]` (PostgreSQL array) atau JSONB agar query lebih bersih

### Layer 2 — Zod Validation

**✅ Plus:**
- Validasi ganda (client + server) sudah menjadi standar wajib — ini sangat aman
- `z.coerce.number()` untuk field numerik dari HTML input — best practice
- Pesan error dalam Bahasa Indonesia — sesuai target pasar

**⚠️ Minus:**
- Belum ada validasi schema untuk data yang masuk via **webhook** (Midtrans, Biteship). Meskipun payload sudah di-verify signature, validasi struktur data akan menambah lapisan keamanan ekstra

### Layer 3 — Server Actions

**✅ Plus:**
- Format response konsisten: `{ success: boolean, data?, error? }` — ini luar biasa rapi
- Auth check + ownership check ada di setiap action — keamanan berlapis
- `checkout.actions.js` sudah melakukan DB transaction (atomic insert payments + orders + order_items + shipments) — ini menghindari data orphan
- `cached()` wrapper sudah digunakan di beberapa action (categories, platform settings)

**⚠️ Minus:**
- **Beberapa action terlalu besar** (checkout.actions.js = 13KB, cart.actions.js = 13KB). Ini menyulitkan maintenance. Pertimbangkan pecah menjadi sub-modules (misalnya `checkout/prepare.js`, `checkout/execute.js`)
- **Race condition pada cart** — Jika 2 tab browser menambahkan item bersamaan, ada kemungkinan duplikasi. Pertimbangkan `UPSERT` atau Redis lock
- **Tidak ada rate limiting** di level server action — Meskipun Better Auth sudah punya rate_limit table, server actions publik (addToCart, checkout) belum dibatasi

### Layer 4 — React Query Hooks

**✅ Plus:**
- QueryKey yang deskriptif (`["seller-products", filters, page, perPage]`) — otomatis refetch saat parameter berubah
- `invalidateQueries` setelah setiap mutasi — data selalu fresh
- Debounce search 1000ms — mengurangi API call yang tidak perlu

### Layer 5-7 — Feature Views, Pages, Layout

**✅ Plus:**
- Feature-sliced design (FSD) yang konsisten — setiap fitur mandiri
- Route groups (`(auth)`, `(public)`, `(protected)`) — sangat rapi
- Server Component digunakan untuk edit/create pages (fetch di server → pass props) — optimal untuk TTFB

**⚠️ Minus:**
- `navbar.jsx` (20KB) — ini terlalu besar. Navbar memuat badge keranjang, search bar, kategori dropdown, user menu. Semua digabung dalam satu file. **Harus dipecah**
- `chat-view.jsx` (26KB) — komponen monolith. Harus dipecah menjadi sub-components
- **Homepage (`app/(public)/page.jsx`)** — perlu diperiksa apakah sudah 100% Server Component atau ada `"use client"` yang tidak perlu

### Infrastruktur (Redis, WS, Docker)

**✅ Plus:**
- **Graceful degradation** pada Redis — Jika Redis mati, app tetap jalan tanpa cache. Ini SANGAT penting untuk reliability
- **WS Server terpisah** dari Next.js — arsitektur microservice yang benar. Next.js tidak dirancang untuk long-lived WebSocket connections
- **Redis Adapter** untuk Socket.IO — siap horizontal scaling (multi-instance WS server)
- **BullMQ Workers** untuk background jobs — auto-complete order setelah 7 hari, expire payment setelah 24 jam
- **Shared secret** antara Next.js dan WS Server — keamanan komunikasi internal
- `wsEmit()` helper dengan **timeout 3 detik** dan graceful error handling — pembayaran tidak boleh gagal hanya karena WS down

**⚠️ Minus:**
- Docker Compose belum include Next.js — ini berarti development butuh 2 terminal (`bun dev` + `docker compose up`). Pertimbangkan menambahkan script `dev:all` 
- Redis connection di Next.js menggunakan `process.env.REDIS_URL` langsung (bukan via `env` t3-oss) — inkonsisten dengan pola env validation lainnya

---

## 4. Gap Analysis: Pilar Bisnis

### 🏷️ HEMAT (Optimasi Ongkir di Level Checkout)

> [!IMPORTANT]
> **Klarifikasi "Smart Routing":** Routing fisik paket (rute kurir, titik drop-off, jalur antar kota) **sepenuhnya domain provider pengiriman** (JNE, SiCepat, Biteship). Platform marketplace **tidak bisa mengontrol** bagaimana kurir mengirimkan paket. Yang **bisa** dilakukan kawanbelanja di level aplikasi adalah **optimasi checkout** — membantu buyer mendapatkan ongkir termurah melalui logika di sisi platform.

| Aspek | Status | Keterangan |
|:------|:-------|:-----------|
| Biteship cek ongkir | ✅ Live | Sudah pakai `area_id` dari cache (hemat API hit) |
| Cache Area ID di DB | ✅ | `addresses.biteshipAreaId` tersimpan di database |
| Multi-kurir per toko | ✅ | `stores.enabledCouriers` → filter kurir saat checkout |
| **Auto-sort kurir termurah** | ⚠️ Parsial | Biteship sudah return multiple kurir, tapi UI belum menandai mana yang termurah secara otomatis |
| **Kurir instan (Gojek/Grab)** | ❌ | `addresses` sudah punya `latitude/longitude`, tapi belum ada flow khusus instant courier |
| **Subsidized shipping** | ❌ | Belum ada logika "ongkir ditanggung platform" atau "free shipping threshold" dari admin |

**Yang realistis bisa dikembangkan kawanbelanja untuk pilar HEMAT:**

1. **Auto-highlight kurir termurah** — Di checkout, kurir termurah ditandai label "🏷️ Termurah" secara otomatis
2. **Cache ongkir agresif** — Tarif kurir yang sama (origin + dest + weight) di-cache 30 menit di Redis agar tidak hit Biteship API berulang
3. **Free Shipping Threshold** — Admin bisa set "Belanja Rp X, gratis ongkir" via `platform_settings`
4. **Voucher Ongkir** — Kupon khusus yang memotong ongkir (sudah ada schema `vouchers`, tinggal tambah tipe `shipping`)
5. **Rekomendasi seller terdekat** — Saat buyer mencari produk, tampilkan seller yang areanya dekat (berdasarkan Biteship Area ID) agar ongkir lebih murah

### 🎯 NYAMAN (UI Cepat & Tanpa Bloatware)

| Aspek | Status | Gap |
|:------|:-------|:----|
| TailwindCSS v4 + Shadcn | ✅ | Stack UI modern dan ringan |
| React 19 + Next.js 16 | ✅ | Streaming SSR, Server Components |
| React Query caching | ✅ | Client-side data caching |
| Redis server-side cache | ✅ | `cached()` wrapper tersedia |
| **Tanpa pop-up/iklan** | ✅ | Tidak ada pop-up marketing. Clean. |
| **Lazy loading gambar** | ⚠️ Parsial | `next/image` digunakan di beberapa tempat, tapi perlu audit menyeluruh |
| **Skeleton loading** | ⚠️ Parsial | Beberapa komponen sudah ada skeleton, tapi belum 100% |
| **SEO optimization** | ⚠️ Parsial | `metadata` ada di root layout, tapi halaman produk & katalog belum punya dynamic metadata |
| **PWA / Offline support** | ❌ | Tidak ada service worker atau manifest.json |
| **Image optimization** | ⚠️ | Upload server terpisah (port 4004) tanpa CDN. Gambar tidak di-optimize (resize, WebP, compression) |

### 🔒 AMAN (Real-time Tracking & Verifikasi)

| Aspek | Status | Gap |
|:------|:-------|:----|
| Midtrans signature verify | ✅ | SHA512 verification di webhook handler |
| Better Auth RBAC | ✅ | 4 role dengan route protection via `proxy.js` |
| Session-based auth | ✅ | HTTP-only cookies, server-side session verification |
| WS authentication | ✅ | Socket.IO middleware verifikasi session dari PostgreSQL |
| **Real-time tracking UI** | ⚠️ Parsial | `tracking.actions.js` sudah ada + `order-detail.jsx` (42KB) menampilkan detail order. Bisa ditingkatkan dengan **timeline visual** status paket |
| **Push notification** | ✅ **Sudah Ada** | Bell icon 🔔 di navbar — Popover dropdown + unread badge + mark all read + BroadcastChannel real-time |
| **Verifikasi toko** | ✅ Parsial | `stores.isVerified` dan `stores.isOfficial` ada di schema, tapi **belum ada workflow admin untuk memverifikasi** |
| **CSRF protection** | ⚠️ | Better Auth handles ini, tapi perlu validasi apakah semua endpoint publik terlindungi |
| **Input sanitization** | ⚠️ | Zod validasi ada, tapi `text` fields bebas HTML — potensi XSS jika di-render tanpa escape |

### 🏪 SELLER FRIENDLY (0% Admin & Dashboard Analitik)

| Aspek | Status | Gap |
|:------|:-------|:----|
| Seller product CRUD | ✅ | Full CRUD dengan variant + images |
| Seller order management | ✅ | Terima/proses/kirim pesanan |
| Seller voucher | ✅ | Buat kupon diskon toko |
| Seller store profile | ✅ | Edit profil + bank info |
| Seller withdrawal | ✅ | Request penarikan dana |
| **Platform fee 0%** | ⚠️ Konfigurabel | `platform_settings.commission_tiers` — bisa di-set 0% oleh admin, tapi default BUKAN 0% |
| **Analytics dashboard** | ❌ **BELUM ADA** | Tidak ada grafik penjualan, revenue chart, top products, conversion rate |
| **Bulk product upload** | ❌ | Tidak ada fitur import CSV/Excel untuk upload produk massal |
| **Multi-warehouse** | ❌ | Satu toko = satu alamat. Seller besar butuh multi-gudang |
| **Seller onboarding guide** | ❌ | Tidak ada tutorial/wizard interaktif untuk seller baru |

---

## 5. Rekomendasi Peningkatan Kode

### 5A. Database — Tambah Index

```sql
-- CRITICAL: Index untuk query yang paling sering dipanggil
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops); -- Full-text search
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
```

> [!TIP]
> Untuk membuat index ini dengan Drizzle, tambahkan `.index()` pada definisi tabel, lalu jalankan `bun run db:generate` + `bun run db:migrate`.

### 5B. Pecah File Monolith

| File Saat Ini | Ukuran | Rekomendasi Split |
|:-------------|:-------|:------------------|
| `navbar.jsx` | 20KB | `navbar/index.jsx` + `navbar/search.jsx` + `navbar/cart-badge.jsx` + `navbar/user-menu.jsx` |
| `chat-view.jsx` | 26KB | `chat/chat-layout.jsx` + `chat/conversation-list.jsx` + `chat/message-bubble.jsx` + `chat/message-input.jsx` |
| `checkout.actions.js` | 13KB | `checkout/prepare-checkout.js` + `checkout/execute-payment.js` |
| `cart.actions.js` | 13KB | `cart/cart-read.js` + `cart/cart-write.js` |

### 5C. Redis Caching — Daftar Yang Harus Di-Cache

| Data | Redis Key | TTL | Impact |
|:-----|:----------|:----|:-------|
| Katalog homepage | `cache:home:products:{page}` | 5 min | Halaman utama < 50ms |
| Daftar kategori | `cache:categories:all` | 1 jam | Navbar load instan |
| Detail produk | `cache:product:{id}` | 2 min | Produk viral handled |
| Ongkir Biteship | `cache:ongkir:{origin}:{dest}:{weight}` | 30 min | Hemat Rp 5/call |
| Platform settings | `cache:platform:settings` | 1 jam | Jarang berubah |
| Store public profile | `cache:store:{slug}` | 5 min | Halaman toko |

### 5D. Tambahkan `updatedAt` pada Tabel Kritis

Tabel `orders` dan `shipments` **wajib** punya kolom `updatedAt` yang di-update setiap kali status berubah. Ini penting untuk:
- Audit trail
- Sorting "pesanan terbaru diupdate"
- Debugging webhook yang terlewat

---

## 6. Fitur yang MASIH KURANG (Killer Features)

### 🚀 Tier 1 — Harus Ada Untuk Launch

> [!NOTE]
> ~~Bell Notification UI~~ dan ~~Wishlist~~ sudah **selesai diimplementasikan**. Keduanya sudah ada action, UI, dan integrasi real-time.

| # | Fitur | Pilar | Deskripsi |
|:-:|:------|:------|:----------|
| 1 | **Tracking Timeline (Buyer)** | Aman | Upgrade `order-detail.jsx` — tambahkan visual timeline status paket (pending → picked → in_transit → delivered) |
| 2 | **Dynamic SEO Metadata** | Nyaman | Setiap halaman produk harus punya `<title>`, `<meta description>`, `og:image` yang dinamis berdasarkan data produk |
| 3 | **Seller Analytics Dashboard** | Seller Friendly | Chart penjualan (Recharts sudah terinstall), top products, revenue per bulan |
| 4 | **Auto-highlight kurir termurah** | Hemat | Di checkout, kurir termurah ditandai label "🏷️ Termurah" + sorting default by harga |
| 5 | **Redis Caching optimasi** | Nyaman | Implementasi cache agresif untuk ongkir, kategori, dan produk populer (Section 5C) |

### 🏎️ Tier 2 — Competitive Advantage

| # | Fitur | Pilar | Deskripsi |
|:-:|:------|:------|:----------|
| 6 | **Free Shipping Threshold** | Hemat | Admin bisa set "Belanja Rp X, gratis ongkir" via `platform_settings`. Subsidi ongkir sebagai strategi akuisisi buyer |
| 7 | **Voucher Ongkir** | Hemat | Tipe voucher baru khusus potongan ongkir (schema `vouchers` sudah ada, tambah type `shipping`) |
| 8 | **PWA Support** | Nyaman | `manifest.json` + service worker → bisa diinstall di HP tanpa app store |
| 9 | **Image CDN + Optimization** | Nyaman | Integrate dengan Cloudinary/Imagekit agar gambar produk di-serve dalam format WebP dan ukuran responsif |
| 10 | **Bulk Product Import** | Seller Friendly | Upload CSV/Excel → parse → batch insert products |

### 🌟 Tier 3 — Moonshot (Long-term)

| # | Fitur | Pilar | Deskripsi |
|:-:|:------|:------|:----------|
| 11 | **AI Product Recommendation** | Nyaman | "Produk Serupa", "Sering Dibeli Bersama" berdasarkan collaborative filtering |
| 12 | **Flash Sale Engine** | Nyaman | Countdown timer + limited stock + Redis-based real-time stock counter |
| 13 | **Affiliate / Referral System** | Seller Friendly | Seller bisa bikin link referral → buyer yang datang dari link dapat diskon, seller dapat komisi |
| 14 | **Multi-Language** | Nyaman | i18n support untuk ekspansi regional |
| 15 | **Seller Subscription Tiers** | Seller Friendly | Free → Pro → Enterprise dengan fitur bertingkat |

---

## 7. Roadmap Prioritas Eksekusi

### Phase 1: ⚡ Quick Wins & Optimasi (1-2 minggu)
- [ ] **Dynamic SEO** — `generateMetadata()` di halaman produk dan katalog
- [ ] **Tambah DB Index** — index pada `products`, `orders`, `cart_items`, `addresses`
- [ ] **Redis Caching** — implementasi cache untuk ongkir, kategori, produk populer (Section 5C)
- [ ] **Auto-highlight kurir termurah** — label "🏷️ Termurah" di checkout + sort by harga
- [ ] **Pecah `navbar.jsx`** — split menjadi 4 sub-components

### Phase 2: 📊 Seller Experience (2-3 minggu)
- [ ] **Seller Analytics Dashboard** — revenue chart, order chart, top products (Recharts)
- [ ] **Tracking Timeline** — visual timeline status paket di `order-detail.jsx`
- [ ] **Store Verification Workflow** — admin bisa approve/reject verifikasi toko
- [ ] **`updatedAt`** column pada tabel `orders` + `shipments`

### Phase 3: 🚚 Strategi Ongkir (2-3 minggu)
- [ ] **Free Shipping Threshold** — admin bisa set batas belanja untuk gratis ongkir di `platform_settings`
- [ ] **Voucher Ongkir** — tipe voucher baru khusus potongan/subsidi ongkir
- [ ] **Rekomendasi seller terdekat** — di hasil pencarian, tampilkan jarak area (berdasarkan Biteship Area ID) agar buyer bisa pilih seller yang ongkirnya lebih murah
- [ ] **Cache ongkir agresif** — tarif kurir yang sama di-cache 30 menit di Redis

### Phase 4: 🖼️ Performance & Polish (2-3 minggu)
- [ ] **Image CDN** — integrasi Cloudinary/Imagekit, auto-resize, WebP
- [ ] **PWA** — manifest.json + service worker + offline page
- [ ] **Bulk Product Import** — CSV parser + batch Drizzle insert

---

## User Review Required

> [!IMPORTANT]
> **Pertanyaan Kunci Sebelum Eksekusi:**
> 1. **Prioritas mana yang ingin dikerjakan duluan?** Phase 1 (Quick Wins & Optimasi) atau Phase 2 (Seller Analytics)?
> 2. **Image CDN**: Apakah Anda sudah punya akun Cloudinary/Imagekit, atau ingin tetap menggunakan upload server sendiri di port 4004?
> 3. **Platform Fee**: Apakah benar value proposition "0% potongan admin" hanya berlaku di awal launch? Jika iya, `commission_tiers` sudah bisa di-set 0% dari admin dashboard.
> 4. **Free Shipping**: Apakah kawanbelanja berencana mensubsidi ongkir sebagai strategi akuisisi buyer? Jika iya, kita perlu desain mekanisme `free_shipping_threshold` dan sumber dananya.
> 5. **Apakah ada fitur dari Tier 3 (Moonshot) yang ingin diprioritaskan?**

> [!NOTE]
> Dokumen ini akan terus di-update seiring progres pengembangan. Setiap fase yang selesai akan dipindahkan ke [walkthrough.md](file:///C:/Users/Hype/.gemini/antigravity-ide/brain/08e02695-5957-4553-adc7-5ea4bec1bea7/walkthrough.md) sebagai catatan perubahan.

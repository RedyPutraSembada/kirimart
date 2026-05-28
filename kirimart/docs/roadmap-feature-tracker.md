# KiriMart — Roadmap & Feature Tracker

> Dokumen ini mencatat semua fitur yang sudah selesai, sedang dikerjakan,
> dan yang direncanakan. Digunakan sebagai panduan untuk development selanjutnya.

---

## Daftar Isi

1. [Status Infrastruktur (Sudah Selesai)](#1-status-infrastruktur-sudah-selesai)
2. [Status Fitur Bisnis (Sudah Selesai)](#2-status-fitur-bisnis-sudah-selesai)
3. [Phase 5: Review & Rating System](#phase-5-review--rating-system)
4. [Phase 6: Search & Discovery Enhancement](#phase-6-search--discovery-enhancement)
5. [Phase 7: User Experience & Profile Polish](#phase-7-user-experience--profile-polish)
6. [Phase 8: Marketing & Analytics (Meta Pixel)](#phase-8-marketing--analytics-meta-pixel)
7. [Phase 9: Email Notification (Transactional Email)](#phase-9-email-notification-transactional-email)
8. [Phase 10: Security Hardening & Performance](#phase-10-security-hardening--performance)
9. [Phase 11: Deployment & CI/CD](#phase-11-deployment--cicd)
10. [Phase 12: Activity Log (Audit Trail)](#phase-12-activity-log-audit-trail)
11. [Prioritas Eksekusi](#prioritas-eksekusi)

---

## 1. Status Infrastruktur (Sudah Selesai)

| Komponen | Status | Dokumentasi |
|---|---|---|
| Docker Compose (Redis + WS Server) | ✅ | `docs/websocket-redis-docker.md` Phase 1 |
| WebSocket Server (Socket.IO + Redis Adapter) | ✅ | `docs/websocket-redis-docker.md` Phase 1 |
| Chat Real-Time (buyer ↔ seller) | ✅ | `docs/websocket-redis-docker.md` Phase 2 |
| Real-Time Notifications (sound + badge) | ✅ | `docs/websocket-redis-docker.md` Phase 3 |
| Redis Caching (ongkir, kategori, settings) | ✅ | `docs/websocket-redis-docker.md` Phase 4 |
| BullMQ Background Jobs (auto-complete, expire) | ✅ | `docs/websocket-redis-docker.md` Phase 4 |

---

## 2. Status Fitur Bisnis (Sudah Selesai)

### Buyer Flow
| Fitur | Status | File Utama |
|---|---|---|
| Register & Login (Better Auth) | ✅ | `src/lib/auth.js` |
| Homepage (hero, flash sale, rekomendasi) | ✅ | `src/app/(public)/page.jsx` |
| Katalog + Filter + Sort + Pagination | ✅ | `src/app/(public)/katalog/page.jsx` |
| Detail Produk (gambar, varian, opsi) | ✅ | `src/app/(public)/product/[id]/page.jsx` |
| Keranjang (add/update/remove) | ✅ | `src/app/(public)/cart/page.jsx` |
| Checkout (alamat, ongkir Biteship, voucher) | ✅ | `src/app/(public)/checkout/page.jsx` |
| Payment (Midtrans Snap + Core API) | ✅ | `src/actions/public/payment/payment.actions.js` |
| Order List + Detail | ✅ | `src/app/(protected)/user-dashboard/orders/` |
| Address Management (CRUD) | ✅ | `src/app/(protected)/user-dashboard/address/` |
| Chat dengan Seller | ✅ | `src/app/(public)/chat/page.jsx` |
| Halaman Toko (store view) | ✅ | `src/app/(public)/store/[slug]/page.jsx` |
| Follow/Unfollow Toko | ✅ | `src/actions/public/store-follow.actions.js` |

### Seller Flow
| Fitur | Status | File Utama |
|---|---|---|
| Seller Registration (bayar via Midtrans) | ✅ | `src/app/(protected)/seller-registration/` |
| Buat Toko | ✅ | `src/app/(protected)/create-store/` |
| Product CRUD (varian, opsi, gambar) | ✅ | `src/app/seller-dashboard/products/` |
| Order Management (proses, kirim, resi) | ✅ | `src/app/seller-dashboard/orders/` |
| Voucher CRUD | ✅ | `src/app/seller-dashboard/vouchers/` |
| Finance (saldo, withdrawal request) | ✅ | `src/app/seller-dashboard/finance/` |
| Store Settings | ✅ | `src/app/seller-dashboard/store/` |

### Admin Flow
| Fitur | Status | File Utama |
|---|---|---|
| User Management | ✅ | `src/app/admin-dashboard/users/` |
| Store Management (ban/unban) | ✅ | `src/app/admin-dashboard/stores/` |
| Product Moderation | ✅ | `src/app/admin-dashboard/products/` |
| Category Management | ✅ | `src/app/admin-dashboard/categories/` |
| Platform Settings (commission, fees) | ✅ | `src/app/admin-dashboard/settings/` |
| Voucher Platform | ✅ | `src/app/admin-dashboard/vouchers/` |
| Withdrawal Approval | ✅ | `src/app/admin-dashboard/withdrawals/` |

---

#### A. Buyer Menulis Review
| Task | Deskripsi | Status |
|---|---|---|
| Server Action `submitReview()` | Insert ke tabel `reviews`, update `products.rating` + `stores.rating` + `stores.totalReviews` | ✅ |
| UI Form Review | Di halaman order detail — muncul setelah order `completed`, rating bintang 1-5, komentar, upload foto | ✅ |
| Validasi | Hanya bisa review 1x per `orderItemId`, hanya setelah status `completed` | ✅ |

#### B. Tampilkan Review di Produk
| Task | Deskripsi | Status |
|---|---|---|
| Server Action `getProductReviews()` | Ambil reviews + user name + foto | ✅ |
| UI Review List | Di halaman detail produk — tampilkan rating summary (histogram 1-5), list review | ✅ |
| Lazy load | Tampilkan 5 review pertama, load more saat scroll | ✅ |

#### C. Tampilkan Rating di Store
| Task | Deskripsi | Status |
|---|---|---|
| Aggregate rating | Update `stores.rating` otomatis saat review baru | ✅ |
| UI Store Rating | Di halaman toko — tampilkan ⭐ rating + total review | ✅ |

#### D. Seller Dashboard — Review Section
| Task | Deskripsi | Status |
|---|---|---|
| List semua review | Seller bisa lihat semua review produknya | ✅ |
| Reply review | Seller bisa balas komentar buyer | ✅ |

### File yang Perlu Dibuat/Dimodifikasi
```
[NEW]    src/actions/public/review.actions.js (Done)
[NEW]    src/features/user-dashboard/orders/review-form.jsx (Merged in order-detail.jsx)
[NEW]    src/features/public/product/review-list.jsx (Done - product-review-list.jsx)
[MODIFY] src/features/public/product/product-detail.jsx — tambah tab Review (Done)
[MODIFY] src/features/user-dashboard/orders/order-detail.jsx — tambah tombol Review (Done)
[MODIFY] src/app/seller-dashboard/ — tambah halaman reviews (Done)
```

### Estimasi: ~4-6 jam

---

## Phase 6: Search & Discovery Enhancement ✅

> **Prioritas: TINGGI** — Selesai! Search Bar Autocomplete, Mega Menu Kategori, dan Infinite Scroll Katalog sudah terimplementasi.

### Fitur yang Perlu Dibuat

#### A. Search Bar di Navbar
| Task | Deskripsi |
|---|---|
| UI Search Bar | Input dengan autocomplete, icon search, keyboard shortcut (Ctrl+K) |
| Server Action `searchProducts()` | Full-text search di `products.name` + `products.description` |
| Search Result Dropdown | Tampilkan max 5 hasil saat mengetik (debounce 300ms) |
| Navigate ke Katalog | Tekan Enter → redirect ke `/katalog?search=keyword` |

#### B. Search Suggestions & History
| Task | Deskripsi |
|---|---|
| Recent searches | Simpan 10 terakhir di localStorage |
| Popular searches | Cache top 10 search query di Redis |

#### C. Kategori di Navbar (Mega Menu)
| Task | Deskripsi |
|---|---|
| Mega menu dropdown | Hover di "Kategori" → dropdown grid dengan ikon + nama |
| Mobile: bottom sheet | Tap "Kategori" → bottom sheet dengan list kategori |

#### D. Infinite Scroll Katalog
| Task | Deskripsi |
|---|---|
| Upgrade `useQuery` | Ganti `useQuery` menjadi `useInfiniteQuery` di halaman `/katalog` |
| Intersection Observer | Auto-fetch halaman berikutnya saat user men-scroll ke batas layar bawah |
| Hapus Paginasi Lama | Buang tombol "Sebelumnya" & "Selanjutnya" |

### File yang Perlu Dibuat/Dimodifikasi
```
[MODIFY] src/features/public/navbar.jsx — tambah search bar + mega menu
[NEW]    src/features/public/search-bar.jsx — search bar component
[NEW]    src/actions/public/search.actions.js — search + suggestions
[MODIFY] src/features/public/catalog/catalog-list.jsx — upgrade ke useInfiniteQuery
```

### Estimasi: ~3-4 jam

---

## Phase 7: User Experience & Profile Polish ✅

> **Prioritas: SEDANG** — Selesai! Wishlist, Ganti Password, Order Tracking, Konfirmasi Pesanan, dan BullMQ Cron sudah terimplementasi.

### Fitur yang Perlu Dibuat

#### A. Profile Page (Buyer)
| Task | Deskripsi |
|---|---|
| Edit profile | Ubah nama, foto, tanggal lahir, gender |
| Change password | Ganti password (Better Auth sudah support) |
| Account security | 2FA, active sessions, logout all devices |

#### B. Wishlist / Favorit
| Task | Deskripsi |
|---|---|
| Schema `wishlists` | `userId`, `productId`, `createdAt` |
| Action CRUD | `addToWishlist()`, `removeFromWishlist()`, `getWishlist()` |
| UI Button | Tombol ❤️ di ProductCard dan ProductDetail |
| Halaman Wishlist | `/user-dashboard/wishlist` |

#### C. Order Tracking Page
| Task | Deskripsi | Status |
|---|---|---|
| Tracking via Biteship | Call Biteship API `/v1/trackings/{waybill}` | ✅ |
| UI Timeline | Tampilkan progress bar: Dikemas → Dikirim → Dalam Perjalanan → Diterima | ✅ |

#### D. Real-time Notifications (Lanjutan)
| Task | Deskripsi | Status |
|---|---|---|
| Notifikasi Balasan Ulasan | Notifikasi sistem (di navbar) secara real-time saat penjual membalas ulasan pembeli | ⏳ |

#### E. Konfirmasi Pesanan Diterima
| Task | Deskripsi | Status |
|---|---|---|
| Tombol "Pesanan Diterima" | Di order detail, muncul saat status `shipped` + shipment `delivered` | ✅ |
| Action `confirmReceived()` | Update order → `completed`, tambah saldo seller, buka form review | ✅ |
| Auto-Complete (BullMQ) | Cron job otomatis selesaikan pesanan jika pembeli lupa | ✅ |

### File yang Perlu Dibuat/Dimodifikasi
```
[MODIFY] src/app/(protected)/user-dashboard/ — tambah profil, wishlist
[NEW]    src/config/db/schema/wishlist-schema.js
[NEW]    src/actions/user-dashboard/wishlist.actions.js
[NEW]    src/features/user-dashboard/wishlist/
[MODIFY] src/features/user-dashboard/orders/order-detail.jsx — tracking + konfirmasi
```

### Estimasi: ~3-4 jam

---

## Phase 8: Marketing & Analytics (Meta Pixel) ✅

> **Prioritas: SEDANG** — Selesai! Master Pixel, Store Pixel, dan Event Tracking utama (ViewContent, AddToCart, InitiateCheckout, Purchase) sudah terimplementasi.

### Fitur yang Perlu Dibuat

#### A. Meta Pixel Integration (Sistem Pelacak Iklan)

> **Catatan untuk Orang Awam (Non-Programmer):** 
> Meta Pixel adalah kode pelacak dari Facebook/Instagram. Karena KiriMart adalah aplikasi **Multi-Vendor** (seperti Tokopedia/Shopee), kita membutuhkan **Sistem Multi-Pixel**:
> 1. **Master Pixel**: Milik pemilik platform (KiriMart) untuk melacak seluruh transaksi di website.
> 2. **Seller Pixel**: Milik masing-masing penjual (Toko A, Toko B) agar mereka bisa mengiklankan toko mereka sendiri dengan uang/budget mereka sendiri.
> 
> **Cara Kerjanya:** Saat pembeli membeli produk dari Toko A, KiriMart akan mengirim 2 laporan sekaligus secara otomatis: satu laporan ke Facebook KiriMart, satu lagi ke Facebook Toko A.

| Alur Kerja / Task | Penjelasan Awam |
|---|---|
| **1. Persiapan Database** | Menyiapkan kotak kosong di sistem agar Admin KiriMart dan Seller bisa menyimpan "ID Pixel" (deretan angka dari Facebook) milik mereka masing-masing. |
| **2. Form Input Pixel** | Membuat kolom isian di halaman **Pengaturan Toko** (untuk Seller) dan **Pengaturan Platform** (untuk Admin) agar mereka bisa mengetik dan menyimpan ID Pixel. |
| **3. Base Script (Otak Pelacak)** | Memasang kode utama Facebook ke tulang punggung aplikasi KiriMart agar pelacak ini aktif siaga di seluruh halaman web. |
| **4. Event: `ViewContent`** | Memicu sinyal *"Ada yang masuk dan lihat-lihat barang ini lho!"* ke Facebook saat pembeli masuk ke halaman detail produk. |
| **5. Event: `AddToCart`** | Memicu sinyal *"Ada yang masukin barang ke keranjang!"* saat pembeli menekan tombol keranjang belanja. |
| **6. Event: `InitiateCheckout`** | Memicu sinyal *"Ada yang udah di kasir tapi belum bayar!"* saat pembeli masuk ke halaman pengisian alamat. Berguna untuk mengiklan ulang (retargeting) orang yang batal bayar. |
| **7. Event: `Purchase`** | Memicu sinyal *"Hore! Ada yang bayar lunas sejumlah Rp X!"* saat transaksi sukses. Laporan harga ini sangat penting agar Meta bisa menghitung seberapa untung iklan Anda (ROAS). |

### File yang Perlu Dibuat/Dimodifikasi
```
# Bagian Meta Pixel:
[MODIFY] src/config/db/schema/store-schema.js — tambah kolom metaPixelId
[MODIFY] src/config/db/schema/platform-setting-schema.js — tambah kolom masterPixelId
[MODIFY] src/app/seller-dashboard/store/page.jsx — tambah input form Pixel ID
[MODIFY] src/app/layout.jsx — injeksi script Meta Pixel Global
[MODIFY] src/features/public/product/product-detail.jsx — trigger ViewContent & AddToCart
[MODIFY] src/app/(public)/checkout/page.jsx — trigger InitiateCheckout
[MODIFY] src/actions/public/payment/payment.actions.js — trigger Purchase via webhook
```

### Estimasi: ~2-3 jam

---

## Phase 9: Email Notification (Transactional Email) ✅

> **Prioritas: SEDANG** — Selesai! Integrasi dengan Resend API telah dilakukan untuk notifikasi penting.

**Fitur:**
- [x] Setup Resend API (Kunci API diletakkan di ENV).
- [x] Template Email HTML Profesional.
- [x] Pengiriman email ke Buyer saat: 
      - [x] Pesanan/Pembayaran berhasil.
      - [x] Pesanan dikirim (Resi masuk).
      - [x] Pesanan sampai (Delivered).
- [x] Pengiriman email ke Seller saat:
      - [x] Ada pesanan baru masuk (berhasil dibayar).
      - [x] Penarikan dana (Withdrawal) disetujui / ditolak admin.

### File yang Perlu Dibuat
```
[NEW]    src/lib/email.js — email client (Resend SDK)
[NEW]    src/lib/email-templates/ — HTML templates
[MODIFY] src/actions/public/payment/payment.actions.js — trigger email
[MODIFY] src/app/api/biteship/webhook/route.js — trigger email
```

### Estimasi: ~3-4 jam

---

## Phase 10: Security Hardening & Performance ⏳

> **Prioritas: RENDAH (pre-production)** — Harus dilakukan sebelum launch production.

### Security

| Task | Deskripsi |
|---|---|
| Rate limiting | Batasi API calls per IP (webhook, auth) |
| Input sanitization | Sanitize semua user input (XSS prevention) |
| CSRF protection | Sudah ada via Better Auth, verifikasi |
| Environment audit | Pastikan semua secrets di .env, bukan hardcoded |
| Image upload validation | Validasi tipe file, ukuran, dimensi |
| SQL injection audit | Review semua raw query (terutama di ws-server worker) |

### Performance

| Task | Deskripsi |
|---|---|
| Image optimization | Next.js `<Image>` component, WebP format, lazy loading |
| Bundle analysis | `next build` + analyze, tree shake unused components |
| Database indexing | Index pada kolom yang sering di-query (storeId, userId, status) |
| CDN untuk gambar | Upload ke Cloudflare R2 atau AWS S3 + CloudFront |
| SSG halaman statis | Static generate halaman yang jarang berubah (about, terms) |

### Estimasi: ~4-5 jam

---

## Phase 11: Deployment & CI/CD ⏳

> **Prioritas: RENDAH (saat siap launch)** — Deployment ke production.

### Stack Rekomendasi (Hemat Budget)

| Komponen | Service | Biaya |
|---|---|---|
| Next.js App | Vercel (hobby plan) | Gratis |
| WS Server + Redis | Railway / Fly.io | ~$5/bulan |
| PostgreSQL | Neon / Supabase | Gratis (free tier) |
| File Storage | Cloudflare R2 | Gratis (10GB) |
| Domain + SSL | Cloudflare | Gratis |
| Email | Resend | Gratis (3000/bulan) |

### CI/CD Pipeline

```
1. Push ke GitHub main branch
2. Vercel auto-deploy Next.js
3. GitHub Actions → build & push Docker image → Railway/Fly.io
4. Database migration via drizzle-kit push
```

### File yang Perlu Dibuat
```
[NEW]    .github/workflows/deploy.yml — CI/CD pipeline
[MODIFY] docker-compose.yml — production config
[NEW]    docker-compose.prod.yml — production overrides
[NEW]    docs/deployment.md — deployment guide
```

### Estimasi: ~3-4 jam

---

## Phase 12: Activity Log (Audit Trail) ⏳

> **Prioritas: SEDANG** — Sangat penting untuk melacak riwayat tindakan sistem demi keamanan dan audit (mencegah saling lempar kesalahan antar user/penjual).

### Fitur yang Perlu Dibuat

#### A. Persiapan Database
| Task | Deskripsi |
|---|---|
| Schema `activity_logs` | Buat tabel dengan kolom `userId`, `storeId`, `action`, `entityType`, `entityId`, `details` (JSON), `ipAddress`, dan `userAgent`. |
| Helper `logActivity()` | Buat fungsi global untuk mencatat aktivitas ke dalam database. |

#### B. Pencatatan Otomatis (Triggers)
| Task | Deskripsi |
|---|---|
| Aksi Penting Pesanan | Catat saat status pesanan berubah, pembatalan pesanan, dan pencetakan resi. |
| Aksi Keuangan | Catat request penarikan dana dan persetujuan/penolakan oleh Admin. |
| Aksi Katalog | Catat penambahan, pengubahan, atau penghapusan produk. |
| Aksi Keamanan (Opsional) | Percobaan login gagal atau pergantian password. |

#### C. Tampilan Admin Dashboard (Master Audit Log)
| Task | Deskripsi |
|---|---|
| UI Tabel Master Log | Halaman baru di Admin untuk melihat seluruh log platform (Global). |
| Filter & Pencarian | Filter berdasarkan user, aksi, dan rentang tanggal untuk mempermudah investigasi. |

#### D. Tampilan Seller Dashboard (Log Toko Lokal)
| Task | Deskripsi |
|---|---|
| UI Log Aktivitas Toko | Halaman baru di dashboard penjual untuk melihat riwayat tindakan di dalam tokonya sendiri. |
| Timeline View | Tampilan riwayat secara kronologis (seperti timeline) yang rapi. |

### File yang Perlu Dibuat/Dimodifikasi
```
[NEW]    src/config/db/schema/activity-log-schema.js
[NEW]    src/lib/activity-logger.js — fungsi helper
[MODIFY] src/actions/seller-dashboard/order.actions.js — tambah trigger
[MODIFY] src/actions/admin-dashboard/withdrawal.actions.js — tambah trigger
[NEW]    src/app/admin-dashboard/activity-logs/
[NEW]    src/app/seller-dashboard/activity/
```

### Estimasi: ~4-5 jam

---

## Prioritas Eksekusi

> Urutkan berdasarkan dampak bisnis terbesar.

| Urutan | Phase | Prioritas | Alasan |
|---|---|---|---|
| 1️⃣ | **Phase 5: Review & Rating** | 🔴 TINGGI | Tanpa review, buyer tidak percaya → tidak beli |
| 2️⃣ | **Phase 6: Search & Discovery** | 🔴 TINGGI | Tanpa search bar, buyer tidak bisa cari produk → bounce |
| 3️⃣ | **Phase 7: UX & Profile** | 🟡 SEDANG | Wishlist & tracking tingkatkan engagement |
| 4️⃣ | **Phase 8: Meta Pixel Integration** | 🟡 SEDANG | Agar penjual bisa mulai beriklan via Meta Ads |
| 5️⃣ | **Phase 9: Email Notification** | 🟡 SEDANG | Selesai! Email penting untuk user yang tidak selalu online |
| 6️⃣ | **Phase 12: Activity Log** | 🟡 SEDANG | Penting untuk tracking dan troubleshooting masalah toko |
| 7️⃣ | **Phase 10: Security & Performance** | 🟢 PRE-PROD | Wajib sebelum launch, tapi tidak perlu sekarang |
| 8️⃣ | **Phase 11: Deployment** | 🟢 SAAT LAUNCH | Deployment terakhir saat semua fitur ready |

---

## Progress Keseluruhan

| Phase | Deskripsi | Status |
|---|---|---|
| **Phase 1** | Docker + Redis + WS Server | ✅ Selesai |
| **Phase 2** | Chat Real-Time | ✅ Selesai |
| **Phase 3** | Notifikasi Real-Time | ✅ Selesai |
| **Phase 4** | Redis Cache + BullMQ Jobs | ✅ Selesai |
| **Phase 5** | Review & Rating System | ✅ Selesai |
| **Phase 6** | Search & Discovery | ✅ Selesai |
| **Phase 7** | UX & Profile Polish | ✅ Selesai |
| **Phase 8** | Marketing & Analytics (Meta Pixel) | ✅ Selesai |
| **Phase 9** | Email Notification | ✅ Selesai |
| **Phase 10** | Security & Performance | ⏳ |
| **Phase 11** | Deployment & CI/CD | ⏳ |
| **Phase 12** | Activity Log (Audit Trail) | ⏳ |

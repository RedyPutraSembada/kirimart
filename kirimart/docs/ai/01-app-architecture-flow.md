# 🏛️ Arsitektur Aplikasi dan Alur Kerja (App Architecture & Flow)

Dokumen ini menjelaskan struktur fundamental, teknologi, dan arsitektur otorisasi KiriMart. Ini adalah ringkasan penting untuk memahami bagaimana data dan logika mengalir di aplikasi.

## 1. Tech Stack & Environment

KiriMart adalah platform **Multi-Vendor E-Commerce** (seperti Tokopedia/Shopee).

- **Frontend & Backend Utama**: Next.js 16 (App Router), React 19, dijalankan menggunakan **Bun** runtime.
- **Database**: PostgreSQL (dikelola dengan Drizzle ORM).
- **Authentication**: Better-Auth (Google OAuth + Email/Password).
- **State & Data Fetching**: TanStack React Query v5.
- **Styling**: Tailwind CSS v4, shadcn/ui.
- **Background Services (Docker)**: Terdapat arsitektur terpisah di folder `ws-server/` yang dijalankan via Docker Compose. Ini berisi:
  - **Node.js Express + Socket.IO**: Server untuk koneksi WebSocket realtime.
  - **Redis**: Digunakan untuk Adapter Socket.IO, Caching, dan antrean pekerjaan.
  - **BullMQ**: Queue worker untuk menjalankan pekerjaan otomatis di latar belakang (misal: otomatis membatalkan pesanan yang belum dibayar dalam 24 jam).

## 2. Arsitektur 7-Layer

Aplikasi ini menggunakan pola **7-Layer Architecture** untuk menjaga kebersihan kode. Anda **WAJIB** mengikuti struktur folder ini saat menambah fitur baru:

1. **Layer 1: Schema** (`src/config/db/schema/`): Definisi tabel Drizzle ORM.
2. **Layer 2: Validation** (`src/lib/validations/`): Schema Zod untuk validasi client & server.
3. **Layer 3: Server Actions** (`src/actions/`): Tempat query database (`"use server"`).
4. **Layer 4: Hooks / Data** (`src/app/data/` atau `src/hooks/`): `useQuery` dan `useMutation` (React Query).
5. **Layer 5: Feature View** (`src/features/`): Komponen React yang membungkus logika spesifik fitur (List, Form, Detail).
6. **Layer 6: Page Route** (`src/app/`): Endpoint route Next.js (`page.jsx`) yang merender komponen dari Layer 5.
7. **Layer 7: Layout** (`src/app/layout.jsx`, dll): Pembungkus halaman dengan navbar/sidebar/provider.

## 3. Pembagian Peran Pengguna (RBAC)

Akses dan otorisasi dikelola secara ketat melalui Better-Auth dan diperiksa di `proxy.js` (Route Protection middleware). Terdapat 3 peran utama:

### 👑 Admin (`/admin-dashboard`)
- Pengelola platform. Tidak belanja, tidak berjualan.
- **Tugas**: Moderasi toko, kelola *master data* (Kategori, Pengguna, Voucher Platform).

### 🏪 Seller (`/seller-dashboard`)
- User yang telah meng-*upgrade* akun/membuka toko.
- **Tugas**: Manajemen produk, memproses pesanan masuk, mengelola voucher toko.
- **Catatan Penting**: Seller **hanya** bisa melihat pesanan miliknya, meskipun pembeli melakukan *checkout* gabungan dengan barang dari toko lain.

### 🛒 Buyer / User (`/` dan `/user-dashboard`)
- Peran *default* pengguna.
- **Tugas**: Belanja, keranjang, *checkout*, profil, dan manajemen alamat.

## 4. Keamanan dan Route Protection

File `src/proxy.js` berfungsi sebagai pintu masuk yang mengecek `session` dari Better-Auth.
- `/admin-dashboard/*` wajib role `admin`.
- `/seller-dashboard/*` wajib role `seller`.
- `/user-dashboard/*` dan `/checkout` wajib login.
- Jangan letakkan komponen yang memanggil DB di public route tanpa otorisasi!

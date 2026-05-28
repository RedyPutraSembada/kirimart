# Dokumentasi Sistem KiriMart (Kawanbelanja)

Dokumen ini merupakan hasil analisis mendalam mengenai bagaimana aplikasi KiriMart berjalan, mencakup arsitektur, *tech stack*, struktur folder, hingga aturan *source code* (best practices). Analisis ini dilakukan dari level *root* (`docs/`) hingga ke level komponen terdalam di dalam direktori `kirimart/src/`.

---

## 1. Gambaran Umum Aplikasi (Overview)
**KiriMart** (atau secara branding disebut **Kawanbelanja**) adalah platform *multi-vendor e-commerce* modern. Platform ini memungkinkan banyak penjual (seller) untuk membuka toko, mengunggah produk, dan menerima pesanan, sementara pembeli (buyer) dapat melakukan transaksi, menggunakan *voucher*, dan melacak pengiriman.

Aplikasi ini menggunakan pola *Full-stack Serverless* dengan **Next.js (App Router)** di mana *frontend* dan *backend* logic (melalui Server Actions) disatukan dalam satu repositori (*monorepo*).

---

## 2. Tech Stack (Teknologi yang Digunakan)

Aplikasi ini dibangun menggunakan teknologi modern yang sangat fokus pada performa dan *Developer Experience* (DX):

| Bagian | Teknologi / Library | Keterangan |
| :--- | :--- | :--- |
| **Runtime & Package Manager**| **Bun** | Sangat cepat untuk instalasi dan *runtime* eksekusi JS/TS. |
| **Framework Utama** | **Next.js 16.2.4** (App Router) | Menggunakan *React Server Components* (RSC) & Server Actions. |
| **Database** | **PostgreSQL** | Database relasional utama yang tangguh. |
| **ORM** | **Drizzle ORM v0.45** | ORM yang sangat ringan dan cepat dengan penulisan skema yang mendekati SQL murni. |
| **Authentication** | **Better Auth v1.6** | Mengurus *session*, Google OAuth, kredensial lokal (Email/Password), dan manajemen peran (*role*). |
| **State Management (Client)**| **TanStack React Query v5** | Mengurus sinkronisasi data dari server ke *client*, *caching*, dan *invalidation* data. |
| **Styling & UI** | **Tailwind CSS v4** + **Shadcn UI** | Untuk desain antarmuka, *layouting*, dan komponen siap pakai (*primitives* dari Radix UI). |
| **Form & Validasi** | **React Hook Form** + **Zod v4** | Validasi ganda dilakukan di *client* (via resolver) dan di *server* (via *Server Actions*). |
| **Email Service** | **Resend** | Digunakan untuk mengirim email verifikasi dan notifikasi. |
| **Logistik (Shipping)** | **KiriminAja API** | Menghitung ongkos kirim (*mock* saat ini, akan diintegrasikan). |
| **Payment Gateway** | **Midtrans Sandbox** | Untuk pemrosesan pembayaran otomatis (sedang dalam tahap integrasi). |
| **File Upload** | **Custom Proxy Server** | Menggunakan server proxy terpisah pada port 4004. |

---

## 3. Cara Berjalan & Arsitektur (Data Flow)

KiriMart mengadopsi **Arsitektur 7-Layer** yang memisahkan tanggung jawab kode secara spesifik:

### Arsitektur 7-Layer
1. **Layer 1: DB Schema (`config/db/schema/`)**
   Deklarasi tabel menggunakan Drizzle ORM. Terdapat 18 tabel utama (*users, stores, products, carts, orders*, dll). Di sini juga didefinisikan Enum.
2. **Layer 2: Validation (`lib/validations/`)**
   Skema Zod didefinisikan secara terpusat untuk memvalidasi *payload* form.
3. **Layer 3: Server Actions (`actions/`)**
   Semua interaksi ke database (*CRUD*) wajib melewati fungsi `use server`. Format responsenya distandarisasi menggunakan objek `{ success: boolean, data?: any, error?: string }`.
4. **Layer 4: Data Hooks / React Query (`app/data/`)**
   *Custom hooks* pembungkus `useQuery` atau `useMutation` untuk memanggil Server Actions dari sisi *client*.
5. **Layer 5: Feature Views (`features/`)**
   Komponen utama UI (Tabel, Form Create/Edit, Dialog View, Halaman Katalog) diletakkan di sini. Semua logika tampilan (state management) dieksekusi di *client side* (`use client`).
6. **Layer 6: Route Pages (`app/`)**
   Fokus utamanya adalah sebagai *entry point* URL (App Router). Untuk halaman dinamis yang butuh *fetching* data statis di awal (seperti halaman *edit*), dilakukan *server fetch* di sini, lalu datanya dilempar ke Feature Views (Layer 5) sebagai *props*.
7. **Layer 7: Layout (`app/layout.jsx`)**
   Kerangka utama aplikasi yang memuat Navbar, Footer, Sidebar, serta *Providers* global (Theme, React Query).

### Alur Autentikasi & RBAC (Role-Based Access Control)
- **Login/Register**: Ditangani oleh Better Auth. Tersedia opsi lewat Email/Password maupun Google OAuth.
- **Sesi**: Disimpan menggunakan HTTP-only cookies.
- **Proteksi Akses (`proxy.js`)**: Ini adalah *middleware* Next.js yang mengecek sesi di setiap *request*. Ia akan me-routing pengguna berdasarkan *role*:
  - **Admin**: Akses ke `/admin-dashboard/*`
  - **Seller**: Akses ke `/seller-dashboard/*`
  - **User**: Akses publik dan `/user-dashboard/*`
  Jika belum login dan mengakses area terproteksi, pengguna diarahkan kembali.

---

## 4. Peraturan Source Code (Code Rules & Best Practices)

Berdasarkan dokumen standar di `05-Standard-CRUD.md`, setiap penulisan fitur di KiriMart **WAJIB** mengikuti panduan berikut:

1. **Struktur Folder Plural vs Singular**: 
   - Direktori *route* (`app/`) menggunakan kata jamak (contoh: `app/admin-dashboard/categories`).
   - Direktori *feature* (`features/`) menggunakan kata tunggal (contoh: `features/admin-dashboard/category`).

2. **Validasi Ganda (Double Validation)**:
   Data formulir **harus** divalidasi di *client* menggunakan resolver Zod (untuk UX instan) **DAN** divalidasi ulang di *server action* sebelum query ke database dijalankan.

3. **Format Respons Server Action**:
   Server actions **TIDAK BOLEH** melempar (*throw*) error langsung ke *client*. Semua respon harus mengikuti kontrak:
   - Sukses: `return { success: true, data: result }`
   - Gagal: `return { success: false, error: "Pesan error untuk user" }`

4. **React Query Caching & Invalidation**:
   - Setelah operasi *Create, Update,* atau *Delete* berhasil dimutasi, wajib memanggil `queryClient.invalidateQueries({ queryKey: ["prefix-entitas"] })` agar *client* melakukan penarikan data ulang (refetch) secara otomatis.
   - Penamaan *QueryKey* harus deskriptif. Untuk daftar tabel, biasanya menggunakan array seperti `["seller-products", filters, page, perPage]` agar saat state berubah, tabel langsung otomatis me-*refresh*.

5. **Pengolahan Angka (Harga & Berat)**:
   Karena *input* HTML bertipe string, form wajib menggunakan `z.coerce.number()` pada skema Zod. Semua harga disimpan dalam bentuk integer (tanpa desimal) ke database.

6. **Enum / Status**:
   Nilai-nilai berulang seperti status ("active", "draft") harus disimpan di DB sebagai *pgEnum* dan dikonfigurasikan di dalam `src/lib/const-data.js`.

---

## 5. Struktur Database & Data Flow Singkat

Aplikasi ini menggunakan sistem *Multi-Tenant (Multi-Vendor)* di mana tabel sangat terpusat pada Entitas **Store** dan **User**.
- Relasi `users` (1) ke (N) `stores` (Walau umumnya 1 toko per 1 user saat ini).
- `products` berelasi dengan `storeId` dan mendukung sistem Varian (Tabel: `product_options` dan `product_variants` dengan penyimpanan JSONB).
- `orders` dipecah per toko. Jika pembeli men-*checkout* dari 2 toko berbeda dalam 1 keranjang, sistem akan membentuk 2 baris `orders`.
- `cart_items` dan `order_items` mencatat snapshot barang, memastikan bahwa harga historis pada riwayat pesanan tidak ikut berubah jika sewaktu-waktu harga di katalog penjual diperbarui.

---

## 6. Kesimpulan

KiriMart sangat *opinionated* dalam struktur aplikasinya. Pendekatannya memisahkan *UI Logic* (di React Client Components) dan *Business Logic* (di Server Actions) menggunakan pola *7-layer architecture*. 

Hal terpenting dalam berkolaborasi di repositori ini adalah: **Jangan menyimpang dari struktur lapisan (layer) yang sudah ditentukan**. Jika menambahkan entitas baru (seperti pesanan/orders), maka urutannya selalu mulai dari penambahan *Schema* -> *Validation* -> *Server Actions* -> *Hooks* -> *Feature Views* -> lalu direkatkan ke dalam *Route Pages*.

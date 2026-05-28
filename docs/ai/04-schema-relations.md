# 🗄️ Aturan Skema Database dan Relasi

Dokumen ini menjelaskan rancangan Entity-Relationship Diagram (ERD) dan bagaimana setiap tabel direlasikan dalam aplikasi KiriMart (Total 26 Tabel).

## Prinsip Dasar Relasi
Aplikasi ini menggunakan **PostgreSQL** dengan **Drizzle ORM**. Jangan sembarangan mengubah relasi One-to-Many atau Many-to-Many tanpa memahami dampaknya. User ID yang digunakan merujuk pada tabel `user` bawaan Better-Auth yang bertipe *string*.

## Tabel Master & Relasi Utama

### 1. Entitas Autentikasi (Better-Auth)
- **`user`**: Tabel pusat pengguna. Memiliki kolom `role` (user, seller, admin).
- **`session`**: Menyimpan sesi login aktif.
- **`account`**: Menyimpan tautan akun OAuth (seperti Google).
- **`verification`**: Menyimpan token verifikasi email.
- **`rate_limit`**: Mencegah *spam* pada endpoint otentikasi.

### 2. Entitas Pengguna & Toko
- **`addresses`**: Menyimpan alamat (Provinsi, Kota, dll). Bisa berelasi dengan `user` (alamat pengiriman pembeli) ATAU berelasi dengan `store` (alamat pengiriman asal toko).
- **`stores`**: Berelasi One-to-One dengan `user` (pemilik toko) dan One-to-One dengan `addresses` (alamat toko).
- **`store_followers`**: Relasi Many-to-Many antara `user` (sebagai *follower*) dan `stores`.

### 3. Entitas Katalog
- **`categories`**: Bersifat hirarkis (punya `parentId`).
- **`products`**: Berelasi Many-to-One dengan `stores` dan `categories`. Memiliki atribut krusial: `price`, `stock`, `weight_gram` (wajib untuk hitung ongkir).
- **`product_images`**, **`product_options`**, **`product_variants`**: Relasi One-to-Many dengan `products`. Digunakan untuk sistem variasi produk (seperti ukuran, warna).

### 4. Entitas Keranjang & Transaksi (KRUSIAL)
Pemahaman yang salah tentang struktur transaksi akan merusak sistem pembayaran multi-vendor:
- **`carts` & `cart_items`**: Penyimpanan sementara keranjang belanja.
- **`payments`**: Entitas pembayaran global per sesi checkout. Terikat dengan `user`.
- **`orders`**: Entitas pesanan **per toko**. Satu `payments` bisa memiliki banyak `orders` (jika pembeli belanja di banyak toko). Terikat dengan `payments`, `user`, dan `store`.
- **`order_items`**: Detail produk dari `orders`. Menarik data dari `products` dan membuat **snapshot** (mengunci nilai `price_snapshot` dan `product_name_snapshot` saat dibeli).
- **`shipments`**: Data resi/pengiriman. Relasi One-to-One dengan `orders`.

### 5. Entitas Keuangan & Sistem
- **`withdrawals`**: Permintaan penarikan saldo oleh penjual (`seller`).
- **`platform_settings`**: Konfigurasi global aplikasi (misal: persentase komisi, biaya layanan).

### 6. Entitas Interaksi & Komunikasi
- **`vouchers`**: Kupon diskon yang dibuat oleh Toko atau oleh Platform (Admin).
- **`reviews`**: Ulasan produk. Berelasi langsung dengan `order_items`.
- **`conversations`**: Ruang obrolan antara `buyerId` dan `storeId` (One-to-One per relasi unik).
- **`messages`**: Isi pesan yang terikat dengan `conversations`.
- **`notifications`**: Menyimpan notifikasi sistem untuk pengguna (dibroadcast via websocket).

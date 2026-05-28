# Alur Kerja dan Peran Pengguna (User Roles & Flows)

Dokumen ini menjelaskan secara detail bagaimana sistem e-commerce KiriMart bekerja berdasarkan skema database (ERD) yang telah dibangun, serta batasan wewenang dari masing-masing peran pengguna (Admin, Seller, User/Buyer).

---

## 1. Pembagian Peran Pengguna (User Roles)

Sistem menggunakan kontrol akses (RBAC) melalui Better-Auth dengan 3 peran utama:

### 👑 Admin (Sistem Administrator)
Admin adalah pengelola utama platform. Mereka **tidak berbelanja** dan **tidak berjualan**, melainkan menjaga sistem tetap berjalan.
*   **Akses:** `/admin-dashboard`
*   **Wewenang Utama:**
    *   Mengelola Master Data: Menambah, mengubah, atau menghapus daftar Kategori Produk (`categories`).
    *   Memantau seluruh transaksi global (`payments` dan `orders` dari semua toko).
    *   Melakukan moderasi terhadap pengguna (User/Seller) atau toko yang melanggar aturan.
    *   (Masa depan) Mengelola banner promo global di halaman utama.

### 🏪 Seller (Penjual / Pemilik Toko)
Seller adalah *User* biasa yang telah meng- *upgrade* akunnya atau membuka toko. Setiap Seller terikat secara relasional ke tabel `stores`.
*   **Akses:** `/seller-dashboard` (Terkunci khusus role `seller`)
*   **Wewenang Utama:**
    *   **Manajemen Toko:** Mengubah profil toko (`stores`) dan alamat asal pengiriman toko (`addresses`).
    *   **Manajemen Produk:** Menambah, mengedit, menghapus produk (`products`) beserta foto-fotonya (`product_images`) yang *hanya* milik tokonya sendiri.
    *   **Manajemen Pesanan:** Melihat dan memproses pesanan (`orders`) yang masuk ke tokonya. Seller **tidak bisa** melihat pesanan toko lain, meskipun pesanan tersebut dibayar sekaligus oleh pembeli yang sama.
    *   **Pengiriman:** Menginput nomor resi dan kurir (`shipments`) untuk pesanan.
    *   **Promosi:** Membuat kupon diskon/voucher khusus untuk tokonya (`vouchers`).

### 🛒 User / Buyer (Pembeli)
Peran *default* ketika seseorang mendaftar ke aplikasi.
*   **Akses:** Halaman Publik (`/`) dan Profil Pembeli.
*   **Wewenang Utama:**
    *   Mencari dan melihat produk dari berbagai toko.
    *   Menambahkan produk ke dalam keranjang belanja (`carts` & `cart_items`).
    *   Melakukan *Checkout* dan Pembayaran (menghasilkan data di tabel `payments`, `orders`, dan `order_items`).
    *   Melacak status pesanan dan pengiriman mereka.
    *   Memberikan ulasan dan rating (`reviews`) setelah pesanan selesai.

---

## 2. Alur Transaksi Utama (Core Flows)

Berikut adalah urutan kronologis bagaimana data bergerak dari awal pengguna berinteraksi hingga transaksi selesai.

### A. Alur Pembuatan Toko (Store Onboarding)
1. **Daftar:** Pengguna mendaftar secara normal. Role awalnya adalah `user`.
2. **Buka Toko:** Pengguna mengisi form pendaftaran toko.
3. **Database Eksekusi:**
   *   Sistem memperbarui *Role* pengguna menjadi `seller`.
   *   Sistem membuat baris baru di tabel `addresses` (menyimpan provinsi & kota asal untuk penghitungan ongkir).
   *   Sistem membuat baris baru di tabel `stores` dan menyambungkannya dengan ID Address tadi.

### B. Alur Manajemen Katalog (oleh Seller)
1. Seller masuk ke `/seller-dashboard/products/new`.
2. Mengisi nama barang, memilih **Kategori** (yang dibuat Admin), harga, stok, dan **Berat** (penting untuk API RajaOngkir).
3. Mengunggah gambar produk.
4. **Database Eksekusi:** 
   * Menyimpan data utama ke tabel `products`.
   * Menyimpan URL gambar ke tabel `product_images`.

### C. Alur Belanja & Keranjang (oleh Buyer)
1. Pembeli melihat-lihat produk dan menekan "Tambah ke Keranjang".
2. **Database Eksekusi:**
   * Mengecek apakah pembeli sudah punya `carts`. Jika belum, sistem membuat keranjang baru.
   * Menambahkan barang tersebut ke tabel `cart_items` yang terhubung ke keranjang pembeli.

### D. Alur Checkout (Sangat Penting!)
Inilah keunggulan arsitektur *Multi-Vendor* yang kita gunakan.
1. Pembeli menekan tombol **"Checkout"**. Di keranjangnya ada barang dari **Toko A** dan **Toko B**.
2. Sistem menghitung ongkos kirim secara terpisah: (Alamat Toko A -> Alamat Pembeli) dan (Alamat Toko B -> Alamat Pembeli).
3. Pembeli menekan **"Bayar"**.
4. **Database Eksekusi (Transaction Mode):**
   *   Sistem membuat **1 baris `payments`** (Contoh: Total Rp500.000). Ini adalah *invoice* utama yang akan dibayar pembeli (misal via Midtrans/BCA).
   *   Sistem memecahnya dengan membuat **2 baris `orders`**. Satu untuk Toko A, satu untuk Toko B. Keduanya memiliki `payment_id` yang sama.
   *   Sistem memindahkan data keranjang ke tabel `order_items`. Di tahap ini, **Harga dan Nama Produk di-Snapshot!** (Dikunci agar jika besok harga barang naik, riwayat pesanan hari ini harganya tidak ikut naik).

### E. Alur Pemrosesan Pesanan (oleh Seller)
1. Pembeli berhasil membayar. Sistem *Webhook* mengubah status tabel `payments` menjadi `success` dan semua `orders` terkait menjadi `paid`.
2. **Toko A** mendapat notifikasi bahwa ada pesanan masuk.
3. Toko A mem- *packing* barang dan menyerahkannya ke kurir.
4. Di *Dashboard*, Toko A memasukkan nomor resi (AWB).
5. **Database Eksekusi:** Sistem membuat baris di tabel `shipments` dan mengubah status `orders` milik Toko A menjadi `shipped`. *(Pesanan Toko B tidak terpengaruh, masih bisa berstatus `paid` jika Toko B lambat memproses).*

### F. Alur Penyelesaian & Ulasan (oleh Buyer)
1. Pembeli menerima paket dari Toko A dan menekan "Pesanan Diterima".
2. Status `orders` berubah menjadi `completed`.
3. Pembeli menulis *review* bintang 5.
4. **Database Eksekusi:** Sistem mencatatnya di tabel `reviews` yang menunjuk ke `order_items` spesifik. Barulah rating toko bisa dihitung ulang.

# Dokumen Perencanaan MVP E-Commerce (Shopee/Tokopedia Clone)

## 1. Analisis Fitur MVP (Minimum Viable Product)
Pendekatan langkah demi langkah (step-by-step) sangat tepat. Untuk mencegah masalah skema database di masa depan, kita harus memastikan pondasi inti sudah dipikirkan dengan baik, terutama terkait data relasional multi-vendor (banyak toko), logistik, dan order.

Berdasarkan permintaan Anda, berikut adalah analisis fiturnya:

### A. Fitur yang Anda Sebutkan (Sudah Tepat)
1. **Menampilkan Produk:** Katalog produk (beranda, detail produk, pencarian dasar).
2. **Buat Toko (Multi-vendor):** User bisa mendaftar menjadi penjual (Seller) dan memiliki entitas toko sendiri.
3. **Manajemen Stok & Toko:** Seller bisa tambah, edit, hapus produk, serta mengatur stok.
4. **Manajemen Transaksi (Seller):** Seller bisa melihat pesanan masuk, menerima/menolak, dan input/melihat resi pengiriman.
5. **Melakukan Transaksi (Buyer):** Proses *Checkout* produk dari toko.
6. **Voucher:** Potongan harga (dari platform atau dari toko).
7. **Integrasi RajaOngkir:** Perhitungan ongkos kirim otomatis berdasarkan alamat asal (toko) dan tujuan (pembeli).
8. **Integrasi Payment Gateway:** Midtrans / Xendit / Tripay untuk pembayaran otomatis.
9. **Ulasan (Review):** Pembeli dapat memberikan rating (bintang) dan komentar.

### B. 💡 Masukan Fitur Tambahan yang **WAJIB** Ada untuk MVP (Yang Kurang):
Untuk mendukung ekosistem E-Commerce yang Anda sebutkan, Anda membutuhkan ini di awal:
1. **Sistem Autentikasi & Otorisasi (Better-Auth):** Tabel user dan *session* akan di-*generate* otomatis oleh sistem Better-Auth.
2. **Chat Realtime (Websocket):** Fitur komunikasi langsung pembeli dan penjual sangat wajib ada. Kita akan menggunakan **Websocket** (misalnya Socket.io) dan menyimpan riwayat pesan serta gambar obrolan langsung di dalam database utama.
3. **Manajemen Alamat (Address Book):** 
   - Ini **kunci utama** untuk integrasi RajaOngkir.
   - Pembeli butuh daftar alamat pengiriman (Provinsi, Kota/Kab, Kecamatan, Kode Pos).
   - Penjual butuh alamat asal pengiriman toko.
4. **Keranjang Belanja (Cart):** Pembeli harus bisa mengumpulkan barang sebelum checkout. Sistem harus bisa memisahkan keranjang berdasarkan toko.
5. **Kategori Produk & Atribut Berat:** Penting agar produk bisa dicari/difilter, dan **Wajib ada** berat produk (gram) untuk hitung RajaOngkir.

---

## 2. Gambaran Kasar Entitas Database (Kesiapan Skema)
Agar Anda tidak terjebak skema yang salah, ini pola standar industri untuk *e-commerce multi-vendor*:

*   **Users:** Data login, nama, kontak, role.
*   **Addresses:** Relasi ke User/Store. Berisi data alamat lengkap dan ID Kota/Provinsi dari RajaOngkir.
*   **Stores:** Relasi 1-to-1 dengan User (jika 1 user 1 toko). Menyimpan nama toko, domain, dan ID Alamat.
*   **Categories:** Kategori barang.
*   **Products:** Data barang (Harga, Stok, **Berat/Gram**, ID Toko, ID Kategori).
*   **ProductImages:** 1 Produk bisa punya banyak foto (1-to-Many).
*   **Carts & CartItems:** Data keranjang belanja yang belum dicheckout.
*   **Orders (Pesanan):** *PENTING!* Order harus dipecah per toko. Jika Buyer checkout dari 2 toko sekaligus, sistem akan membuat 2 *Order* yang berbeda.
*   **OrderItems:** Mencatat harga barang *pada saat dibeli* (Snapshot harga). Jika besok harga barang naik, harga di riwayat order tidak boleh ikut berubah.
*   **Payments:** Berelasi dengan proses Checkout secara keseluruhan (bisa gabungan dari beberapa Order jika checkout sekaligus).
*   **Shipments (Pengiriman):** Berelasi dengan Order, menyimpan resi (AWB), kurir, ongkir dari RajaOngkir.
*   **Vouchers:** Data diskon.
*   **Reviews:** Ulasan produk.

---

## 3. Langkah Selanjutnya (Roadmap)

Agar terstruktur, saya mengusulkan alur kerja berikut:

- [x] **Step 1:** Merumuskan scope MVP (Dokumen ini).
- [x] **Step 2:** Merancang visual ERD (Entity Relationship Diagram). Saya bisa membuatkan diagramnya menggunakan sintaks teks agar mudah dibaca dan dievaluasi tipe datanya.
- [x] **Step 3:** Menentukan *Tech Stack* (Terkunci: Next.js JSX, PostgreSQL, Drizzle, Better-Auth, Shadcn).
- [x] **Step 4:** Membuat *Project* & *Database Migration* berdasarkan ERD yang sudah matang.
- [ ] **Step 5:** Mulai *coding* fitur per fitur sesuai prioritas (Auth -> Toko -> Produk -> Cart -> Checkout).

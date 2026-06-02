# 🔄 Standar Alur Fitur Bisnis (Feature Workflow)

Kawan Belanja memiliki beberapa alur sistem (workflows) yang cukup kompleks. Bagian ini menjelaskan secara rinci bagaimana fitur-fitur tersebut berjalan.

## 1. Alur Transaksi & Checkout Multi-Vendor

Arsitektur keranjang (cart) dan checkout di Kawan Belanja mendukung pembelian dari banyak toko sekaligus dalam satu kali bayar.

1. **Keranjang (`carts` & `cart_items`)**: Keranjang pembeli menampung produk-produk dari berbagai toko berbeda.
2. **Checkout & Pembayaran (`payments`)**: Saat checkout, sistem menghitung total keseluruhan (termasuk total semua ongkir). Sistem membuat **satu baris** di tabel `payments` (satu invoice) agar pengguna hanya perlu transfer/bayar satu kali via Midtrans.
3. **Pemisahan Order (`orders`)**: Meskipun pembayarannya disatukan, di latar belakang sistem memecah pesanan menjadi beberapa `orders` (satu order untuk setiap toko).
4. **Snapshot Harga (`order_items`)**: Saat order dibuat, nama dan harga produk disalin (di-*snapshot*) ke dalam `order_items`. Hal ini memastikan jika harga asli diubah oleh penjual besok hari, harga di riwayat belanja tidak akan berubah.

## 2. Alur Pengiriman & Resi (Biteship/KiriminAja)

1. **Ongkos Kirim**: Dihitung berdasarkan relasi alamat asal (Toko) ke tujuan (Pembeli) menggunakan API RajaOngkir / Biteship. Berat produk wajib dimasukkan (`weight_gram`).
2. **Input Resi**: Ketika seller memproses pesanan, mereka akan menginput nomor resi. Data ini akan disimpan di tabel `shipments` yang berelasi dengan `orders`. Terdapat webhook dari pihak ekspedisi yang akan memperbarui status pengiriman secara otomatis.

## 3. Sistem Chat Realtime (Websocket)

Kawan Belanja memiliki fitur obrolan antara Pembeli dan Penjual menggunakan Node.js Express, Socket.IO, dan Redis Adapter yang berjalan di Docker Container terpisah (`ws-server/`).

1. **Tabel `conversations`**: Setiap ruang obrolan (relasi unik antara satu `buyerId` dan satu `storeId`) hanya disimpan SATU KALI. Ini sangat ringan dan digunakan untuk melisting kotak masuk (Inbox).
2. **Tabel `messages`**: Menampung isi percakapan (teks dan gambar). Menyambung ke ID dari `conversations`.

## 4. Pekerjaan Latar Belakang & Queue (BullMQ)

Sistem menggunakan **BullMQ** (via Redis) di `ws-server` untuk menjalankan tugas-tugas otomatis (cron-like):
1. **Timeout Pembayaran**: Membatalkan pesanan jika pembeli tidak membayar dalam waktu 24 jam.
2. **Konfirmasi Otomatis**: Menyelesaikan pesanan secara otomatis jika pembeli tidak menekan "Pesanan Diterima" setelah beberapa hari paket berstatus terkirim.

## 5. Sistem Keuangan (Finance) & Penarikan Dana (Withdrawal)

1. Saat status `orders` berubah menjadi `completed` (Pesanan Diterima), sistem akan **menambahkan Saldo Seller** secara otomatis (memperbarui atribut saldo di tabel `stores` atau memicu mutasi).
2. Seller dapat mengajukan **Withdrawal** (Penarikan Dana). Request ini akan masuk ke tabel `withdrawals` dengan status `pending`.
3. Admin akan menyetujui request tersebut, yang kemudian mengubah status menjadi `approved` dan mengirimkan notifikasi.

## 6. Sistem Penilaian (Review & Rating)

1. Review hanya bisa diberikan setelah pesanan berstatus `completed`.
2. Satu `order_items` hanya bisa diulas sebanyak satu kali.
3. Begitu ulasan masuk (`reviews`), rating produk (`products.rating`) dan rating toko (`stores.rating`) harus dihitung ulang (agregasi) melalui mekanisme otomatis atau Server Action.

## 7. Katalog & Pencarian (Search & Discovery)

Pencarian produk terbagi menjadi dua level interaksi UI untuk menjaga performa:
1. **Pencarian Cepat (Autocomplete Navbar)**: Hanya menggunakan `useQuery` biasa. Saat user mengetik, sistem mencari dan mengembalikan maksimal 5 hasil teratas (debounce 300ms) untuk ditampilkan di dalam *dropdown* melayang. Ini tidak memerlukan *infinite scroll*.
2. **Katalog Utama (Infinite Scroll)**: Halaman detail katalog (`/katalog`) wajib menggunakan `useInfiniteQuery` (TanStack React Query) berpadu dengan *Intersection Observer*. Saat user men-scroll ke bagian paling bawah produk, sistem secara otomatis mengambil halaman berikutnya (Page 2, Page 3, dst.) dan menumpuk datanya tanpa *reload* layar. Mekanisme ini menggantikan sistem tombol paginasi "Sebelumnya / Selanjutnya" tradisional.
3. **URL sebagai Single Source of Truth (SSOT)**: Seluruh state filter (keyword pencarian, kategori, urutan, harga) pada halaman `/katalog` **tidak boleh** hanya disimpan di `useState` lokal. Semua perubahan filter harus di-push ke URL Param (misal: `?search=baju&categoryId=2`), dan komponen Katalog + komponen Search Bar di Navbar harus me-render/membaca *state* mereka dari URL tersebut. Ini memastikan sinkronisasi antara Navbar, Sidebar Filter, dan URL.

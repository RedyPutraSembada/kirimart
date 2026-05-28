# Implementasi Fitur Keranjang Dinamis & Checkout Aman

Sebagai *Senior Fullstack Developer*, saya sangat sepakat dengan *sense* produk Anda. Pengalaman pengguna (UX) harus persis seperti e-commerce raksasa agar pembeli merasa familiar dan nyaman.

Berikut adalah bagaimana kita akan mengimplementasikan UX di halaman Keranjang (`/cart`) sesuai standar e-commerce (seperti Tokopedia/Shopee):

## Standar UX Keranjang (The "Standard E-Commerce" Experience)

1. **Navigasi Balik ke Detail Produk**: 
   Gambar produk dan nama produk di dalam keranjang akan dibuat bisa diklik (*clickable link*). Jika pembeli mengkliknya, mereka akan dibawa kembali ke halaman `/product/[id]` yang spesifik untuk melihat detailnya lagi.
2. **Ubah Kuantitas (Qty) Langsung**:
   Pembeli bisa langsung menambah (`+`) atau mengurangi (`-`) jumlah barang langsung di keranjang tanpa perlu balik ke halaman produk. Angka ini akan otomatis tersimpan ke database secara asinkron (di latar belakang).
3. **Ubah Varian dari Keranjang (Saran Senior UX)**:
   Ini adalah pembeda e-commerce standar dan premium. Daripada memaksa pembeli menghapus barang, lalu balik ke halaman produk untuk memilih warna lain, kita akan memberikan tombol **"Ubah"** berbentuk kecil (seperti lambang panah bawah di sebelah nama varian). Jika diklik, akan muncul *dropdown/modal kecil* yang memungkinkan pembeli langsung mengubah ukuran atau warna dari dalam keranjang!

---

## Proposed Technical Changes

### 1. Database & Security (Sesuai kesepakatan sebelumnya)
- `cart_items` akan ditambahkan `variantId`.
- `order_items` akan mencetak *snapshot* dari harga dan nama barang/varian (`priceSnapshot`, `variantNameSnapshot`) saat checkout agar tagihan terkunci permanen.

### 2. Backend Server Actions
- `addToCart(productId, variantId, qty)`: Logic tambah ke keranjang.
- `updateCartItemQty(cartItemId, action)`: Menambah/mengurangi qty langsung.
- `updateCartItemVariant(cartItemId, newVariantId)`: **[NEW]** Logic khusus untuk mengubah varian tanpa membuat item baru (kecuali item dengan varian tersebut sudah ada di keranjang, maka akan digabung/di-*merge* jumlahnya).
- `removeCartItem(cartItemId)`: Menghapus item.

### 3. Frontend Integrations (Fokus UX Keranjang)
#### [MODIFY] `src/features/public/cart/cart-view.jsx`
- Membungkus Nama Produk dan Gambar Produk dengan komponen `<Link href="/product/{id}">`.
- Menghubungkan tombol `+` dan `-` dengan fungsi `updateCartItemQty` yang melakukan sinkronisasi *real-time* dengan server tanpa *loading screen* penuh (hanya *spinner* kecil atau optimistik UI).
- Menambahkan tombol interaktif pada *Badge* varian. Jika diklik, muncul *popup/drawer* untuk mengganti warna/ukuran, memanggil `updateCartItemVariant`.

#### [MODIFY] `src/features/public/navbar.jsx`
- *Badge* angka keranjang reaktif dengan `useQuery`.

#### [MODIFY] `src/features/public/product/product-detail.jsx`
- Tombol `+ Keranjang` difungsikan dengan `useMutation`.

> [!TIP]
> **Saran Pendekatan Eksekusi**
> Karena fiturnya cukup banyak, saya menyarankan kita mengeksekusinya dalam **dua tahap**:
> 1. **Tahap 1**: Menghidupkan *backend* (Database & Actions), tombol *Add to Cart* di halaman produk, dan menyalakan notifikasi angka di Navbar.
> 2. **Tahap 2**: Menghidupkan halaman `/cart` dengan semua fitur premiumnya (Klik nama produk, ubah Qty, ubah Varian, hapus).
> 
> Apakah Anda setuju dengan UX Keranjang yang saya usulkan dan pendekatan 2 tahap ini?

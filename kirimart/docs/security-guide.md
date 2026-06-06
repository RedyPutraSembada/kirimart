# Panduan Keamanan (Security Hardening) Kawan Belanja

Dokumen ini menjelaskan pustaka (library) dan mekanisme yang digunakan untuk melindungi aplikasi dari serangan umum seperti XSS dan Spam/DDoS.

## 1. Pencegahan Cross-Site Scripting (XSS)

XSS terjadi ketika penyerang berhasil menyuntikkan kode HTML/JavaScript berbahaya ke dalam aplikasi (misalnya lewat formulir ulasan atau deskripsi produk). Ketika pengguna lain membuka halaman tersebut, kode tersebut dieksekusi di browser mereka.

**Library yang digunakan:**
- `isomorphic-dompurify`: Merupakan wrapper dari DOMPurify yang bisa berjalan di sisi Server (Node.js) maupun Klien (Browser). DOMPurify adalah standar industri yang sangat aman dan terpercaya untuk membersihkan kode HTML.

**Cara Kerja:**
Setiap kali pengguna memasukkan teks (seperti Ulasan Produk atau Deskripsi Produk), teks tersebut akan melewati fungsi `sanitize()` di `src/lib/sanitize.js`. Tag berbahaya seperti `<script>` atau `<img onerror=...>` akan dihapus secara otomatis sebelum disimpan ke database.

## 2. Pembatasan Permintaan (Rate Limiting)

Rate Limiting digunakan untuk membatasi seberapa sering pengguna atau IP tertentu dapat mengakses fungsi-fungsi sensitif (misalnya mengirim ulasan berkali-kali dalam sedetik atau melakukan spam pencarian).

**Library yang digunakan:**
- `ioredis`: Karena kita sudah menggunakan Redis untuk Caching dan antrean (BullMQ), kita menggunakan `ioredis` untuk menyimpan penghitung (*counter*) jumlah permintaan per IP/User di RAM. Ini sangat ringan dan tidak membebani database utama PostgreSQL.

**Cara Kerja:**
Fungsi `checkRateLimit()` di `src/lib/rate-limit.js` dipanggil pada awal fungsi Server Actions (contoh: `submitReview`). Kami membatasi pengguna untuk melakukan maksimal **10 permintaan per menit**. Jika melewati batas, sistem akan menolak permintaan dan mengembalikan pesan "Terlalu banyak permintaan".

## 3. Validasi Unggahan File (Upload Validation)

Untuk mencegah pengguna mengunggah file berbahaya (seperti skrip PHP/EXE) atau file berukuran sangat besar yang menguras penyimpanan server.

**Mekanisme:**
Semua alur unggah gambar saat ini dikumpulkan melalui satu gerbang di `src/lib/upload.js`. Sebelum dikirim ke server penyimpanan eksternal, file akan dicek:
- Ukuran tidak boleh lebih dari **5MB**.
- Tipe file harus berupa **JPEG, PNG, atau WEBP**.

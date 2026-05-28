# Dokumentasi Integrasi KiriminAja untuk KiriMart

Dokumen ini memetakan daftar API resmi dari **KiriminAja (v3)** dan bagaimana masing-masing *endpoint* tersebut akan dihubungkan (*wiring*) dengan fitur-fitur di dalam ekosistem platform **KiriMart** (Baik untuk sisi Pembeli maupun Penjual).

> [!NOTE]
> KiriMart bertindak sebagai sistem *Multi-Vendor*. Artinya, setiap toko (Seller) memiliki alamat asal (Origin) yang berbeda-beda. Karena itu, perhitungan ongkos kirim dilakukan per toko (Seller), bukan dari satu gudang terpusat.

---

## 1. Daftar API Utama KiriminAja (v3)

Berikut adalah *endpoints* krusial yang perlu kita implementasikan di server KiriMart:

### A. Master Data Wilayah (Regional API)
KiriminAja menggunakan ID khusus untuk setiap wilayah. Kita tidak bisa menggunakan teks manual.
- **GET** `/api/mitra/province` → Mengambil daftar provinsi.
- **GET** `/api/mitra/city?provinsi_id={id}` → Mengambil daftar kota/kabupaten.
- **GET** `/api/mitra/kecamatan?city_id={id}` → Mengambil daftar kecamatan.
> [!IMPORTANT]
> **Kecamatan ID** adalah parameter paling penting. Ongkos kirim KiriminAja dihitung berdasarkan ID Kecamatan asal dan tujuan, bukan nama kota.

### B. Cek Ongkos Kirim (Pricing API)
- **POST** `/api/mitra/shipping_price`
- **Fungsi:** Mendapatkan daftar kurir (JNE, SiCepat, dll), tipe layanan (REG, YES, dll), harga ongkir, dan estimasi waktu sampai (ETA).
- **Payload Wajib:**
  - `origin`: ID Kecamatan Toko Penjual.
  - `destination`: ID Kecamatan Pembeli.
  - `weight`: Berat total barang dalam hitungan gram (misal: 1500).

### C. Booking Resi & Penjemputan Kurir (Transaction API)
- **POST** `/api/mitra/v3/transactions`
- **Fungsi:** Mengirim data pesanan ke sistem kurir agar kurir datang menjemput paket ke toko penjual (*pickup*). KiriminAja akan merespons dengan **Nomor Resi (AWB)** otomatis.
- **Payload Wajib:** Data lengkap pengirim (nama, no hp, alamat, kecamatan), penerima (nama, no hp, alamat, kecamatan), deskripsi barang, berat barang, dan kode layanan kurir yang dipilih.

### D. Cetak Label Pengiriman (Waybill / AWB API)
- **POST** `/api/mitra/v3/waybills`
- **Fungsi:** Menghasilkan file cetak PDF/HTML barcode resi pengiriman yang siap diprint dan ditempel di kardus paket oleh Seller.

### E. Pelacakan Paket (Tracking API & Webhook)
- **GET** `/api/mitra/tracking?order_id={kiriminaja_order_id}` (Manual Pull)
- **POST Webhook** (Automatic Push) → Server KiriminAja akan menembak *endpoint* backend KiriMart setiap kali kurir mengupdate status paket (misal dari *In Transit* menjadi *Delivered*).

---

## 2. Pemetaan Implementasi di App KiriMart

Bagaimana API di atas dihidupkan di aplikasi KiriMart? Berikut pemetaannya berdasarkan *User Journey*:

### A. Sisi Pembeli (Buyer)
1. **Halaman Profil / Setting Alamat:**
   - Pembeli mengisi alamat rumah. *Dropdown* Provinsi, Kota, dan Kecamatan mengambil data langsung dari **Regional API** KiriminAja. ID Kecamatan disimpan ke tabel `addresses` KiriMart.
2. **Halaman Checkout:**
   - Saat pembeli mau bayar, sistem KiriMart memanggil **Pricing API** secara *real-time*.
   - KiriMart menampilkan list harga kurir. Pembeli memilih (misal: JNE REG - Rp 15.000). Total bayar (Grand Total) otomatis ditambahkan dengan ongkir ini.

### B. Sisi Penjual (Seller Dashboard)
1. **Menu Pengaturan Toko (Store Profile):**
   - Seller wajib menentukan alamat titik penjemputan barang menggunakan **Regional API** agar toko punya *origin* ID Kecamatan yang sah.
2. **Menu Pesanan (Orders) - Tombol "Proses Pesanan":**
   - Saat pembeli sudah bayar, pesanan masuk ke Seller. Seller mengklik "Proses".
   - KiriMart memanggil **Transaction API** KiriminAja. Nomor Resi (AWB) langsung terbit dan tersimpan di database `shipments`. Status pesanan berubah jadi "Dikirim".
3. **Menu Pesanan (Orders) - Tombol "Cetak Label":**
   - Seller mengklik tombol cetak. Sistem memanggil **Waybill API**, lalu memunculkan PDF resi KiriminAja di layar untuk di-print.

### C. Sisi Sistem Internal KiriMart (Background Process)
1. **Webhook Listener (`/api/webhooks/kiriminaja`):**
   - KiriMart membuka satu jalur khusus (API Route). Ketika paket sudah sampai di rumah pembeli, kurir mengklik "Selesai" di HP-nya. KiriminAja mengirim webhook ke KiriMart.
   - KiriMart mendeteksi status "Delivered", lalu otomatis mengubah status pesanan (`orders`) di database menjadi "Selesai", dan mengalihkan saldo dari *escrow* (tertahan) ke dompet Seller.

---

## 3. Persiapan Kunci (Environment Variables)

Untuk memulai integrasi ini nantinya, pastikan Anda menyiapkan:
```env
# Mode Sandbox (Testing) / Production
NEXT_PUBLIC_KIRIMINAJA_API_URL="https://api-sandbox.kiriminaja.com" 

# Token Rahasia yang didapat dari Dashboard Developer KiriminAja
KIRIMINAJA_API_KEY="kunci_rahasia_anda" 
```

> [!TIP]
> Integrasi ini sangat direkomendasikan dikerjakan bertahap. Mulailah dari membangun komponen **Dropdown Alamat (Regional API)** terlebih dahulu, karena ini adalah akar dari segala proses perhitungan ongkir di tahap selanjutnya.

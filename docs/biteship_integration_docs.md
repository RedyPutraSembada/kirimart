# Biteship Integration: Comprehensive Documentation

*Dokumentasi ini disusun secara komprehensif berdasarkan penelusuran langsung ke DOM dan website resmi Biteship (https://biteship.com/en/docs/intro) beserta knowledge base terkait integrasi KiriMart.*

---

## 1. Lingkungan (Environments): Sandbox vs Production

Biteship **tidak membedakan URL endpoint** antara environment Sandbox dan Production. Perbedaan murni ditentukan dari **API Key** yang digunakan pada header `Authorization`.

### A. Sandbox (Testing Environment)
- **API Key Format:** Dimulai dengan `biteship_test_...`
- **Cara Aktivasi Sandbox:**
  1. Daftar/Login ke Dashboard Biteship (https://dashboard.biteship.com/).
  2. Buka menu API.
  3. Aktifkan toggle **"Mode Testing"** di sidebar.
  4. Generate API Key untuk Sandbox.
- **Kondisi Sandbox:**
  - **Orders API:** Disimulasikan (Simulated). Tidak ada kurir asli yang menjemput barang.
  - **Maps, Rates, & Tracking API:** Karena bersifat GET (mengambil data asli), penggunaan di Sandbox **dianggap Paid (berbayar)** dan akan memotong kuota/saldo jika berlebihan.
  - Sangat disarankan untuk melakukan testing pembuatan order (Create Order) dan Webhook di sini sebelum Go Live.

### B. Production (Go Live)
- **API Key Format:** Dimulai dengan `biteship_live_...`
- **Cara Aktivasi Production (Go Live):**
  1. Pastikan seluruh testing di Sandbox sudah berhasil.
  2. Masuk ke Dashboard, matikan toggle "Mode Testing".
  3. Selesaikan proses verifikasi KYC (Identitas Bisnis/KTP/NPWP) jika diminta oleh Biteship.
  4. Generate API Key Production.
  5. Isi Saldo (Top-up) untuk mulai menggunakan layanan non-COD.

---

## 2. Mekanisme Saldo & COD (Cash on Delivery)

Sistem keuangan Biteship untuk seller (KiriMart) terbagi menjadi manajemen Saldo Top-Up dan Saldo COD.

### A. Saldo Top-Up (Reguler / Non-COD)
- **Fungsi:** Digunakan untuk membayar ongkos kirim (ongkir) di depan saat membuat order non-COD.
- **Mekanisme:** Saat order berhasil dibuat, saldo Top-Up akan langsung terpotong sebesar tarif ongkir kurir.
- **Kondisi:** Wajib diisi (Top-up via Dashboard) sebelum membuat order reguler.

### B. Saldo COD (Cash on Delivery)
- **Fungsi:** Menampung uang pembayaran dari pembeli yang ditagihkan oleh kurir.
- **Mekanisme:** 
  - Saat order COD dibuat, **saldo Top-Up TIDAK dipotong**.
  - Ongkos kirim COD akan dipotong secara otomatis dari hasil pencairan dana COD (pembayaran pembeli) sebelum diteruskan ke Saldo COD Anda.
  - Dana COD yang sudah cair di Dashboard Biteship kemudian dapat ditarik (withdraw) ke rekening bank Anda.
- **Testing COD di Lokal:** Anda **BISA** melakukan test flow COD di local server (localhost) dengan menggunakan `biteship_test_...` API Key. Order akan berstatus simulasi dan tidak membutuhkan uang asli.

---

## 3. Core API Endpoints

Semua request menggunakan Base URL: `https://api.biteship.com/v1`

### A. Rates API (Cek Ongkir)
Digunakan untuk mengecek tarif kurir sebelum order dibuat. Tersedia 5 mode endpoint:
- `POST /v1/rates/couriers` (By Coordinates)
- `POST /v1/rates/couriers` (By Postal Codes)
- `POST /v1/rates/couriers` (By Area ID - *Rekomendasi untuk akurasi tertinggi*)
- `POST /v1/rates/couriers` (By Mix)
- `POST /v1/rates/couriers` (By Type)

### B. Orders API (Pembuatan Pengiriman)
Digunakan untuk membuat AWB (Resi) dan memanggil kurir.
- `POST /v1/orders` : Membuat order baru.
- `GET /v1/orders/:id` : Mengambil detail order berdasarkan Biteship Order ID.
- `POST /v1/orders/:id` : Update order.
- `POST /v1/orders/:id/cancel` : Membatalkan order (hanya bisa sebelum status `picked`).

**Siklus Status Order (Status Flow):**
1. `confirmed` : Order siap, resi (AWB) dibuat. *(Bisa dibatalkan)*
2. `scheduled` : Order dijadwalkan untuk penjemputan. *(Bisa dibatalkan)*
3. `allocated` : Kurir dialokasikan. *(Bisa dibatalkan)*
4. `picking_up` : Kurir dalam perjalanan ke lokasi pickup (First Mile). *(Bisa dibatalkan)*
5. `picked` : Paket diambil oleh kurir. *(TIDAK BISA dibatalkan)*
6. `in_transit` / `dropping_off` : Paket sedang dikirim.
7. `delivered` : Paket berhasil diterima pembeli.
8. `return_in_transit` / `returned` : Paket gagal kirim dan dikembalikan ke seller.
9. `cancelled` / `rejected` / `disposed` : Order dibatalkan, ditolak kurir, atau dihancurkan.

### C. Trackings API (Lacak Paket)
- `GET /v1/trackings/:id` : Melacak berdasarkan ID Order Biteship.
- `GET /v1/trackings/:waybill_id/couriers/:courier_code` : Public tracking menggunakan nomor resi asli dan kode kurir (misal: JNE, SICEPAT).

---

## 4. Webhook (Automasi Notifikasi)

Biteship menyediakan Webhook agar sistem Anda tidak perlu melakukan *polling* (menembak API terus menerus) untuk mengecek status. Konfigurasi Webhook dilakukan di Dashboard Biteship.

**Tipe Event Webhook:**
1. `order.status` : Ter-trigger setiap ada perubahan status pengiriman (misal dari `picking_up` menjadi `picked` atau `delivered`). Sangat krusial untuk otomatisasi update status pesanan di database KiriMart.
2. `order.price` : Ter-trigger jika ada perubahan harga (biasanya karena selisih berat/dimensi aktual di gerai kurir dibandingkan input sistem).
3. `order.waybill_id` : Ter-trigger jika ada perubahan nomor resi (waybill_id), misalnya karena paket dipindah-tangankan antar vendor kurir.

**Contoh Payload Webhook `order.status`:**
```json
{
    "event": "order.status",
    "courier_tracking_id": "XYZ-123-PQS",
    "courier_waybill_id": "SKS-XXXXX",
    "courier_company": "JNE",
    "courier_type": "REG",
    "courier_driver_name": "Maulana Imran",
    "courier_driver_phone": "088888888888",
    "order_id": "5dd6da88f43bd430ecd5aa2e",
    "order_price": 100000,
    "status": "confirmed"
}
```

---

## 5. Penanganan Error & Edge Cases (Kondisi Khusus)

Dalam implementasi, KiriMart harus bersiap menangani kondisi (Edge Cases) berikut:

1. **Selisih Berat/Dimensi (Order Price Webhook):**
   - **Kondisi:** Seller input berat 1kg, tapi kurir menimbang 2kg.
   - **Tindakan Sistem:** Biteship akan memotong saldo tambahan dan menembak webhook `order.price`. Sistem KiriMart harus mencatat kerugian/penyesuaian biaya ini di log keuangan seller.

2. **Pembatalan Order oleh Kurir (Rejected / Courier Not Found):**
   - **Kondisi:** Kurir tidak tersedia atau menolak paket (`courier_not_found` / `rejected`).
   - **Tindakan Sistem:** Sistem KiriMart harus otomatis mengganti status pesanan menjadi "Need Action/Retry" agar seller bisa memilih kurir pengganti.

3. **Gagal Kirim COD (Return in Transit / Returned):**
   - **Kondisi:** Pembeli COD menolak membayar atau alamat palsu. Status menjadi `return_in_transit`.
   - **Tindakan Sistem:** Ongkir retur biasanya tetap dibebankan. KiriMart harus menangani pemotongan biaya kegagalan COD dari Saldo seller / menahan pencairan dana COD lainnya.

4. **Rate Limit API (HTTP 429):**
   - **Kondisi:** Terlalu banyak request (terutama pada Rates API / Tracking).
   - **Tindakan Sistem:** Pastikan implementasi backend menggunakan caching untuk Rates (simpan hasil cek ongkir sementara) dan utamakan penggunaan Webhook daripada melakukan GET API Tracking berulang kali.

## Rekomendasi Alur Integrasi untuk KiriMart
1. **Lengkapi `store-profile.jsx`:** Pastikan pengaturan kurir tersinkron dengan kurir yang diaktifkan pada Dashboard Biteship KiriMart.
2. **Endpoint Webhook:** Buat Route Handler di Next.js (misal: `app/api/webhooks/biteship/route.js`) yang menangani POST request dari webhook Biteship untuk mengubah status pesanan otomatis di database (Drizzle).
3. **Database Schema:** Pastikan tabel pesanan memiliki kolom `biteship_order_id`, `waybill_id`, `courier_driver_info`, dan `shipping_status` yang selaras dengan status Biteship di atas.

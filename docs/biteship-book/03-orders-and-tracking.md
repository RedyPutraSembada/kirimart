# Bab 3: Orders, Couriers, & Trackings API

Inti dari sistem pengiriman adalah pembuatan Order dan pelacakan paket (Tracking).

## 1. Draft Orders API
Draft Orders berguna untuk memvalidasi kelengkapan data pengiriman tanpa benar-benar memanggil kurir atau membuat resi.
- Cocok diimplementasikan ketika user berada di halaman keranjang/checkout sebelum pembayaran dikonfirmasi, memastikan alamat valid.

## 2. Orders API (Pembuatan Pesanan)
Ini adalah endpoint utama untuk membuat, mengambil detail, mengupdate, dan membatalkan pesanan. Setiap order diidentifikasi menggunakan `ID` acak unik dari Biteship.

### Endpoints
- `POST /v1/orders` : Membuat order baru.
- `GET /v1/orders/:id` : Mengambil detail order.
- `POST /v1/orders/:id` : Update data order.
- `POST /v1/orders/:id/cancel` : Membatalkan order.

### Status Flow Order (Siklus Pengiriman)
Status pesanan di Biteship akan terus berubah mengikuti pergerakan paket. Berikut adalah status utamanya:
1. `confirmed`: Order dikonfirmasi, AWB (Resi) di-generate. *(Bisa dicancel)*
2. `scheduled`: Jadwal penjemputan dibuat. *(Bisa dicancel)*
3. `allocated`: Kurir sudah dialokasikan ke pesanan ini. *(Bisa dicancel)*
4. `picking_up`: Kurir sedang menuju lokasi penjemputan (First Mile). *(Bisa dicancel)*
5. `picked`: Paket **SUDAH DIAMBIL** oleh kurir. *(TIDAK BISA DICANCEL)*
6. `in_transit`: Paket sedang transit di gudang sortir (Middle Mile).
7. `dropping_off`: Kurir dalam perjalanan mengirim ke pembeli (Last Mile).
8. `delivered`: Paket berhasil diterima pembeli.
9. *Status Kegagalan:* `return_in_transit`, `returned`, `cancelled`, `rejected`, `disposed`, `courier_not_found`.

## 3. Couriers API (Daftar Kurir)

API ini digunakan untuk mengambil daftar kurir dan layanan mereka (misal: JNE Reguler, Sicepat Best, Grab Instant) yang secara resmi terhubung dengan Biteship. Ini sangat berguna jika Anda ingin menyinkronkan data master kurir ke dalam database KiriMart.

### Endpoint
- `GET /v1/couriers` : Mengambil daftar seluruh kurir yang tersedia di ekosistem Biteship.

*Rekomendasi:* Hit endpoint ini satu kali, lalu simpan respon JSON-nya (seperti `courier_code`, `courier_service_code`, dan `courier_service_name`) ke dalam tabel master `couriers` di database lokal KiriMart Anda, agar Anda tidak perlu memanggil API ini berulang-ulang di frontend.

## 4. Trackings API (Pelacakan)
Digunakan untuk melihat histori riwayat pergerakan paket (seperti "Paket tiba di gudang Jakarta").

### Endpoints
- `GET /v1/trackings/:id` : Lacak berdasarkan Order ID Biteship. (Untuk sistem internal).
- `GET /v1/trackings/:waybill_id/couriers/:courier_code` : Public Tracking (Untuk diberikan ke Pembeli jika mereka ingin melacak dengan No. Resi JNE/SiCepat).

*Catatan: Hit API Tracking akan dikenakan biaya. Sangat disarankan untuk menggunakan **Webhook** daripada menembak API Tracking berulang kali secara polling.*

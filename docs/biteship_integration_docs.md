# Biteship API - Comprehensive Developer Integration Guide
Untuk E-Commerce KiriMart (Kawanbelanja)

Dokumen ini merupakan hasil ekstraksi lengkap dari dokumentasi resmi API Biteship (https://biteship.com/docs/api). Digunakan sebagai panduan utama untuk mengimplementasikan *Layer 3 (Server Actions)* di aplikasi KiriMart.

---

## 1. Authentication & Environment

Setiap *request* HTTP ke Biteship wajib menyertakan API Key pada *headers*. Biteship tidak membedakan URL untuk mode *Sandbox* (Testing) dan *Production* (Live). Penentuan mode sepenuhnya bergantung pada API Key yang digunakan.

*   **Base URL**: `https://api.biteship.com` (Hanya mendukung HTTPS).
*   **Header**:
    ```json
    {
      "authorization": "<<YOUR_API_KEY>>"
    }
    ```

### Kode Error Autentikasi:
Penting untuk menangani *error code* berikut pada *Server Actions*:
*   `40000001`: Autentikasi gagal. Pastikan format API Key benar.
*   `40101001`: *Authorization failed*.
*   `40101002`: Tidak ada akun yang terhubung dengan API Key tersebut.
*   `40101003`: Server Biteship tidak dapat memproses otorisasi.
*   `40301001`: Token tidak cocok dengan kunci rahasia.

---

## 2. Couriers API (Daftar Kurir)
Digunakan untuk menarik daftar kurir aktif yang didukung.

*   **Endpoint**: `GET /v1/couriers`
*   **Kurir Populer di Indonesia & Kode Layanannya (`courier_service_code`)**:
    *   **Gojek (`gojek`)**: `instant` (motor instan), `same_day`
    *   **Grab (`grab`)**: `instant`, `same_day`
    *   **JNE (`jne`)**: `reg` (Reguler), `yes` (Yakin Esok Sampai), `oke` (Ekonomis), `jtr` (Kargo)
    *   **SiCepat (`sicepat`)**: `reg` (Reguler), `best` (Besok Sampai Tujuan), `gokil` (Kargo)
    *   **AnterAja (`anteraja`)**: `reg`, `same_day`, `next_day`
    *   **J&T (`jnt`)**: `ez` (Reguler)
    *   **SAP (`sap`)**: `reg`, `ods`, `sds`, `cargo`
    *   **Paxel (`paxel`)**: `small`, `medium`, `large`, `paxel_big`

---

## 3. Maps & Locations API (Pencarian Wilayah)
Sangat penting untuk fitur *Checkout* dan pendataan alamat toko (*Origin*).

*   **Endpoint Search**: `GET /v1/maps/areas`
*   **Query Params**:
    *   `countries` (default: `ID`)
    *   `input` (Contoh: `Pesanggrahan` atau `Jakarta Selatan`)
*   **Biteship Area ID Format**: `IDNP{prov_id}IDNC{city_id}IDND{dist_id}IDZ{zip}` (ID unik wilayah, wajib disimpan di *database* `addresses` kita).

---

## 4. Rates API (Cek Ongkos Kirim)
*   **Endpoint**: `POST /v1/rates/couriers`
*   **Metode Pengecekan**:
    1.  **Berdasarkan Titik Koordinat (Wajib untuk Gojek/Grab):** Menggunakan `origin_latitude`, `origin_longitude`, `destination_latitude`, dan `destination_longitude`.
    2.  **Berdasarkan Area ID (Bagus untuk Reguler):** Menggunakan `origin_area_id` dan `destination_area_id`.
    3.  **Berdasarkan Kode Pos**: Menggunakan `origin_postal_code` dan `destination_postal_code`.

*   **Contoh Response Item**:
    Data kembalian akan berisi *array* `pricing` yang memuat `courier_name`, `duration` (misal: "1 - 2 days", "3 hours"), `shipping_fee`, `cash_on_delivery_fee`, `price` (total), dan `available_collection_method` (apakah mendukung `pickup` atau `drop_off`).

---

## 5. Orders API (Pembuatan Pengiriman / Checkout Selesai)

**PERINGATAN (Developer Gotcha)**: Endpoint `DELETE /v1/orders/:id` sudah **DEPRECATED (Ditinggalkan)**. Jika ingin membatalkan pesanan kurir, WAJIB menggunakan `POST /v1/orders/:id/cancel`.

*   **Create Order**: `POST /v1/orders` (Gunakan setelah pembayaran Midtrans sukses).
*   **Cancel Order**: `POST /v1/orders/:id/cancel`
*   **Get Cancellation Reasons**: `GET /v1/orders/cancellation_reasons?lang=id`

### Order Status Enum (`snake_case`)
Daftar status ini adalah siklus hidup (*lifecycle*) pesanan dari awal sampai akhir:
1.  `confirmed`: AWB/Resi sudah dibuat. (Bisa dibatalkan).
2.  `scheduled`: Penjemputan terjadwal. (Bisa dibatalkan).
3.  `allocated`: Kurir ditugaskan. (Bisa dibatalkan).
4.  `picking_up`: Kurir menuju toko/asal. (Bisa dibatalkan).
5.  `picked`: Paket sudah di tangan kurir. **(TIDAK BISA DIBATALKAN)**.
6.  `in_transit`: Sedang transit antar kota.
7.  `dropping_off`: Paket sedang diantar ke tujuan (Last Mile).
8.  `delivered`: Paket berhasil diterima.
9.  `return_in_transit` / `returned`: Retur.
10. `rejected` / `cancelled`: Dibatalkan.

---

## 6. Trackings API (Lacak Resi Spesifik)
API untuk memberikan UI pelacakan yang mulus bagi pengguna tanpa Webhook.

*   **Lacak Order Biteship (Internal)**: `GET /v1/trackings/:id`
*   **Lacak Resi Eksternal (Public Waybill)**: `GET /v1/trackings/:waybill_id/couriers/:courier_code`

### Tracking Status Enum (`camelCase`)
Catatan: Status saat pelacakan menggunakan format *camelCase* (berbeda dengan Order Status).
*   `confirmed`, `allocated`, `pickingUp`, `picked`, `inTransit`, `droppingOff`, `delivered`, `courierNotFound`, `cancelled`, dll.

---

## 7. Webhooks & Callbacks (Wajib untuk Sistem Produksi)

Untuk menghindari sistem KiriMart melakukan *polling* terus-menerus ke server Biteship, kita wajib membuat *API Route* (misal: `app/api/biteship/webhook/route.js`) untuk menerima 3 jenis *event* ini:

### A. Event `order.status`
Memicu setiap ada pergantian status pengiriman (Sangat penting untuk meng-update tabel `orders`).
```json
{
  "courier_tracking_id": "ASjsd92Asd2d1ASdj91",
  "courier_waybill_id": "Abc-123",
  "event": "order.status",
  "order_id": "ASjsd92Asd2d1ASdj91",
  "status": "in_transit",
  "courier_code": "jne",
  "courier_service_code": "reg"
}
```

### B. Event `order.price`
Memicu ketika ada penyesuaian harga (misalnya, penjual memasukkan berat 1kg, tapi pihak kurir menimbang ulang jadi 2kg, sehingga ada selisih biaya).
```json
{
  "cash_on_delivery_fee": 100000,
  "courier_waybill_id": "Abc-123",
  "event": "order.price",
  "order_id": "ASjsd92Asd2d1ASdj91",
  "price": 100000,
  "shippment_fee": 10000,
  "status": "picked"
}
```

### C. Event `order.waybill_id`
Memicu tepat saat nomor resi terbit, atau saat terjadi perubahan (swap) nomor resi/kurir oleh sistem Biteship.
```json
{
  "courier_waybill_id": "Abc-123",
  "event": "order.waybill_id",
  "order_id": "ASjsd92Asd2d1ASdj91",
  "status": "confirmed"
}
```

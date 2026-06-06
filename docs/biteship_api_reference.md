# Dokumentasi Biteship API (Bahasa Indonesia)

Dokumen ini merupakan rangkuman komprehensif dari dokumentasi resmi Biteship API untuk developer. 

## 1. Introduction (Pendahuluan)
Biteship adalah API pengiriman (*shipping API*) yang menghubungkan Anda dengan berbagai kurir, memungkinkan Anda untuk menyederhanakan proses pengiriman, menghitung tarif, membuat pengiriman, dan melacak paket semua dari satu platform terpusat.

**Fitur Utama:**
* **Multi-carrier Integration**: Akses berbagai kurir pengiriman melalui satu API.
* **Real-time Rate Calculation**: Dapatkan tarif pengiriman yang akurat dan *up-to-date*.
* **Shipment Creation and Management**: Buat dan kelola pengiriman dengan detail informasi.
* **Package Tracking**: Berikan informasi pelacakan *real-time* kepada pelanggan Anda.
* **Flexible API**: Integrasikan Biteship dengan mudah ke sistem Anda.

## 2. Get Started (Memulai)
Untuk mulai menggunakan Biteship, Anda perlu:
1. **Mengaktifkan akun**: Buat akun Biteship untuk mulai mengelola pengiriman atau pengujian.
2. **Autentikasi API**: Pelajari cara mengautentikasi permintaan API menggunakan API key Biteship Anda.
3. **Kelola Kurir**: Konfigurasikan kurir dan opsi pengiriman pilihan Anda.

Langkah-langkah berikutnya meliputi pengelolaan pengiriman (menghitung tarif, membuat pesanan, melacak paket) serta merencanakan integrasi.

## 3. API Usage Flow (Alur Penggunaan API)
Alur standar untuk menggunakan Biteship API adalah:
1. Menghitung tarif pengiriman (*Calculate Rates*).
2. Membuat pesanan (*Create Order*).
3. Melacak paket (*Track Package*).

## 4. Base URL
Semua URL yang direferensikan dalam dokumentasi API memiliki *base URL* berikut:
`https://api.biteship.com`

API ini dilayani menggunakan HTTPS untuk memastikan privasi data. Anda dapat menggunakan Biteship API dalam mode *test* (pengujian) yang tidak memengaruhi data langsung atau berinteraksi dengan mode pengiriman sebenarnya. Kunci API (*API Key*) yang Anda gunakan menentukan apakah Anda berada di *live mode* atau *test mode*.

## 5. Authentication (Autentikasi)
Permintaan HTTP ke REST API Biteship dilindungi dengan autentikasi *HTTP Basic*.
Anda menggunakan Token Autentikasi (API Key) sebagai kata sandi (*password*) untuk autentikasi HTTP Basic ini.

Token Biteship memiliki prefiks:
* `biteship_live.` untuk *live mode*.
* `biteship_test.` untuk *test mode*.

**Contoh Penggunaan Header (cURL):**
```bash
curl --request POST \
--url https://api.biteship.com/v1/rates/couriers \
--header 'authorization: <<YOUR_API_KEY>>' \
--header 'content-type: application/json' \
```

**Cara Men-generate API Key Baru:**
1. Buka *dashboard* Biteship di menu Integrasi (`https://dashboard.biteship.com/integrations`).
2. Klik "Pengaturan".
3. Klik "Tambah Kunci API" (*Generate new API key*).
4. Beri nama API Key Anda. API Key akan muncul hanya satu kali, pastikan Anda menyimpannya dengan aman.
5. Untuk API Pesanan (*Order API*), Anda perlu mengajukan permintaan aktivasi terlebih dahulu jika berada di mode *live*.
6. Untuk mode pengujian (*Testing Mode*), API Pesanan sudah aktif secara default.

**Kode Error Autentikasi:**
| Kode | Pesan | Penjelasan |
|---|---|---|
| 40000001 | Authentication for your key has failed | Kunci API salah atau gagal autentikasi. |
| 40101001 | Authorization failed | Gagal otorisasi. |
| 40101002 | No account found with associated key | Akun tidak ditemukan untuk kunci tersebut. |
| 40101003 | Cannot process authorization | Tidak dapat memproses otorisasi. |
| 40301001 | There's no match token for this key | Token tidak cocok. |
| 40301002 | User information not found. | Informasi pengguna tidak ditemukan. |

---

## 6. Rates (Tarif Pengiriman)
Digunakan untuk mendapatkan daftar harga/tarif pengiriman dari berbagai kurir secara *real-time*.

**Endpoint Mengecek Tarif:**
`POST /v1/rates/couriers`

**Parameter Penting (Request Body):**
* `origin_latitude`, `origin_longitude` (Atau bisa menggunakan `origin_postal_code` / `origin_area_id`)
* `destination_latitude`, `destination_longitude` (Atau bisa menggunakan `destination_postal_code` / `destination_area_id`)
* `couriers`: Daftar kurir, contoh: `"grab,jne,sicepat"`
* `items`: Array objek barang (harus berisi `name`, `value` dalam Rupiah, `quantity`, dan `weight` dalam gram).

**Jenis Akurasi Pengecekan:**
1. **By Coordinates (Akurasi Tinggi):** Wajib jika menggunakan kurir Instan (Grab, Gojek, Lalamove, Borzo). Bisa juga untuk kurir reguler.
2. **By Postal Code (Akurasi Menengah):** Lebih mudah diimplementasi (cukup kodepos), tapi rentan selisih harga karena satu kodepos bisa mencakup area yang luas.

## 7. Orders (Membuat Pesanan)
Membuat pesanan (*order*) untuk memerintahkan kurir menjemput barang di titik asal (*pickup*). Jika Anda menggunakan mode "Staging", kurir asli tidak akan datang.

**Endpoint Membuat Pesanan:**
`POST /v1/orders`

**Parameter Penting (Request Body):**
* **Origin:** `origin_contact_name`, `origin_contact_phone`, `origin_address`, `origin_postal_code`, `origin_coordinate`
* **Destination:** `destination_contact_name`, `destination_contact_phone`, `destination_address`, `destination_postal_code`, `destination_coordinate`
* **Courier & Delivery:** 
    * `courier_company` (misal: `"jne"`)
    * `courier_type` (misal: `"reg"`)
    * `delivery_type` (`"now"` untuk penjemputan instan, atau `"scheduled"`)
* **Items:** Array barang persis seperti saat mengecek tarif (Rates).

**Endpoint Mengambil Detail Pesanan (Retrieve Order):**
`GET /v1/orders/:id`
Akan mengembalikan detail pesanan termasuk nomor resi sementara, riwayat pelacakan, informasi detail kontak, harga, dan identitas kurir.

## 8. Trackings (Pelacakan)
Layanan untuk melacak pergerakan dan status paket secara *real-time*. Biteship secara otomatis men-generate `tracking_id` saat sebuah Order berhasil dibuat melalui API.

**Endpoint Melacak Paket:**
`GET /v1/trackings/:id`

**Informasi dalam Response:**
* `waybill_id`: Nomor Resi Asli dari kurir (AWB).
* `status`: Status pelacakan saat ini (contoh: `allocated`, `picking_up`, `picked`, `dropping_off`, `delivered`).
* `history`: Array berisi semua riwayat pergerakan logistik (dilengkapi tanggal `updated_at`, status, dan `note` / catatan pergerakan).
* `courier`: Menyediakan detail kurir termasuk data pengemudi (jika kurir instan) seperti nama driver, plat nomor, dan foto driver.

## 9. Couriers (Informasi Kurir)
API ini berguna untuk melihat semua daftar layanan kurir yang diaktifkan atau didukung oleh Biteship di akun Anda.

**Endpoint Daftar Kurir:**
`GET /v1/couriers`

**Informasi dalam Response:**
Mengembalikan Array dari seluruh layanan kurir dengan data seperti:
* `courier_name` (misal: Grab)
* `courier_code` (misal: grab)
* `courier_service_name` (misal: Instant)
* `courier_service_code` (misal: instant)
* `shipment_duration_range` (contoh: "1 - 3") & `shipment_duration_unit` (contoh: "hours")
* `available_for_cash_on_delivery`: Apakah mendukung COD.
* Fitur lainnya seperti asuransi dan Instant Waybill.

---

## 10. Maps (Peta & Wilayah)
Menyediakan Maps API untuk mempermudah dan menstandarisasi nama lokasi/area, yang sangat berguna untuk integrasi *autocomplete* alamat.

### 10.1 Search Area (Pencarian Area)
**Endpoint:** `GET /v1/maps/areas`
Mencari nama area berdasarkan input teks untuk kebutuhan autocomplete yang efisien pada website/aplikasi Anda.

**Parameter Request (Query Parameters):**
* `countries` (string, REQUIRED): Kode negara (contoh: `ID`).
* `input` (string, REQUIRED): Input kata kunci pencarian area (contoh: `Jakarta+Selatan`).
* `type` (string, OPTIONAL): Tipe pencarian area (contoh: `single`).

**Response Format (Contoh):**
```json
{
  "success": true,
  "areas": [
    {
      "id": "IDNP6IDNC148IDND843IDZ12250",
      "name": "Pesanggrahan, Jakarta Selatan, DKI Jakarta. 12250",
      "country_code": "ID",
      "administrative_division_level_1_name": "DKI Jakarta",
      "postal_code": 12250
    }
  ]
}
```
*(Catatan: Sebaiknya panggil API ini dengan teknik 'debounce' setelah pengguna selesai mengetik untuk mencegah request berlebihan ke server Biteship)*

---

## 11. Locations (Manajemen Lokasi)
Layanan API untuk membuat, mengubah, dan menghapus daftar lokasi penyimpanan pengirim atau penerima langsung melalui API call. Lokasi ini nantinya akan mendapatkan `location_id` yang bisa dipakai berulang kali.

### 11.1 Create a Location (Membuat Lokasi)
**Endpoint:** `POST /v1/locations`
Membuat lokasi baru yang akan disimpan pada *dashboard* Biteship. Lokasi ini nantinya bisa digunakan sebagai ID asal (origin) atau tujuan saat membuat pesanan pengiriman tanpa perlu mengisi ulang alamat detail.

**Parameter Request (JSON Body):**
* `name` (string, REQUIRED): Nama tempat (contoh: `Gudang Utama`).
* `contact_name` (string, REQUIRED): Nama penanggung jawab (contoh: `Ahmad`).
* `contact_phone` (string, REQUIRED): Nomor telepon (contoh: `08123456789`).
* `address` (string, REQUIRED): Detail alamat lengkap.
* `postal_code` (integer, REQUIRED): Kode pos.
* `latitude` & `longitude` (double, REQUIRED): Koordinat lokasi.
* `type` (string, REQUIRED): `'origin'` (pengirim) atau `'destination'` (penerima).

### 11.2 Retrieve a Location (Mengambil Detail Lokasi)
**Endpoint:** `GET /v1/locations/:id`
Mengambil detail informasi data lokasi berdasarkan `location_id`. Parameter request cukup `id` di dalam URL path.

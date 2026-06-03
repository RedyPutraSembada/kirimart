# Bab 2: Maps, Locations, & Rates API

Sebelum membuat pesanan (order), sistem sering kali perlu mencari koordinat area dan menghitung estimasi ongkos kirim (ongkir). Bab ini membahas Maps, Locations, dan Rates API.

## 1. Maps & Locations API
Biteship memiliki database pemetaan area yang mendetail untuk wilayah Indonesia, yang diperlukan untuk menghitung tarif pengiriman secara akurat.

- **Fungsi:** Mengkonversi input alamat dari user (Kecamatan/Kota/Provinsi) menjadi `area_id` spesifik milik Biteship.
- **Rekomendasi Integrasi:** Gunakan endpoint pencarian area saat user mengetikkan alamat di halaman Checkout (Autocomplete Search) agar ID area valid tersimpan di database KiriMart. Menggunakan `area_id` jauh lebih akurat daripada sekadar Kodepos (Postal Code).

## 2. Rates API (Cek Ongkir)
Rates API mengembalikan berbagai opsi logistik beserta harganya. Biteship menyediakan 5 metode pencarian ongkir:

1. **By Coordinates (Latitude/Longitude):** Berdasarkan titik koordinat pengirim dan penerima.
2. **By Area ID (Rekomendasi):** Menggunakan ID Area Biteship hasil dari pencarian Maps API.
3. **By Postal Codes (Kodepos):** Pencarian ongkir standar (kurang akurat untuk beberapa kurir).
4. **By Mix:** Kombinasi koordinat, kodepos, dan alamat.
5. **By Type:** Mengambil harga untuk tipe layanan kurir tertentu secara spesifik.

### Endpoint Setup
```http
POST /v1/rates/couriers
```

### Tips Penggunaan
- Selalu **cache** hasil dari Rates API (simpan di memori sementara KiriMart selama beberapa menit/jam) jika user melakukan pencarian yang sama. Ini akan menghemat biaya hit API Anda.
- Di environment Sandbox, memanggil endpoint Rates API akan memotong kuota hit API karena tetap menggunakan data rute asli dari kurir.

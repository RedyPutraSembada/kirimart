# Bab 5: Label Pengiriman & Penanganan Error

Bab terakhir membahas pencetakan resi dan cara membaca error dari Biteship.

## 1. Shipping Label (Label Pengiriman / Resi)

**PERHATIAN PENTING:** Biteship **TIDAK** menyediakan API untuk mencetak Shipping Label (misal, mereturn file PDF).
- Oleh karena itu, KiriMart harus **membangun sistem cetak labelnya sendiri** menggunakan data JSON dari respons API (menata CSS/HTML Print sendiri di frontend seller-dashboard).
- Alternatif: Seller KiriMart dapat men-download label yang sudah didesain oleh Biteship melalui Dashboard Biteship (tidak direkomendasikan jika ingin flow di dalam web KiriMart saja).

**Data yang Wajib Ada di Resi Cetak Mandiri:**
- Informasi Kurir (Nama, Logo, Routing Code).
- Informasi Tracking (Barcode/QR Code, Tracking Number/Waybill ID).
- Informasi Pengirim (Nama, Alamat Lengkap).
- Informasi Penerima (Nama, Alamat Lengkap, Nomor HP).
- Detail Paket (Berat, Dimensi, Tipe Layanan Pengiriman).
- **Nilai COD (Cash on Delivery)** wajib dicetak besar jika order berjenis COD.

## 2. Struktur Error

Biteship menggunakan struktur HTTP Response standard.

### List HTTP Status
- `200` : Berhasil (OK).
- `400` : Bad Request (Kesalahan input KiriMart, misal ada parameter yang tertinggal atau salah format data).
- `401` : Unauthorized (API Key salah/belum disertakan).
- `402` : Request Failed (Biasanya karena saldo top-up tidak mencukupi untuk membuat order reguler).
- `403` : Forbidden (Kunci API tidak punya akses ke endpoint tersebut).
- `404` : Not Found (Resource/Order ID tidak ada).
- `500` : Internal Server Error (Server Biteship sedang down / bermasalah).

### Format Response JSON saat Error
Setiap error 4xx selalu mengembalikan JSON dengan struktur berikut yang bisa di-parsing untuk ditampilkan ke user:
```json
{
     "success": false,
     "error": "Required parameter is missing"
}
```
Pastikan sistem frontend KiriMart (misalnya menggunakan React Toast) selalu menangkap `.error` dari response body untuk menampilkan pesan kesalahan (seperti "Alamat tidak valid") kepada seller atau pembeli.

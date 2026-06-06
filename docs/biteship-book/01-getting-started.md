# Bab 1: Getting Started & Authentication

Bab ini membahas dasar-dasar untuk memulai integrasi dengan Biteship, termasuk pengaturan lingkungan (environment) dan cara melakukan autentikasi API.

## 1. Lingkungan (Environments)

Biteship menyediakan dua lingkungan utama yang dibedakan hanya melalui **API Key**, bukan melalui URL endpoint yang berbeda. Semua request tetap mengarah ke `https://api.biteship.com/v1`.

### Sandbox (Testing)
Sandbox adalah lingkungan aman untuk menguji integrasi sebelum live.
- **Ciri API Key:** Dimulai dengan prefix `biteship_test_...`
- **Cara Aktivasi:** Nyalakan toggle "Mode Testing" di sidebar Dashboard Biteship, lalu buat kunci API.
- **Kondisi Khusus Sandbox:**
  - **Orders API:** Disimulasikan. Paket tidak akan benar-benar dijemput kurir.
  - **Maps, Rates, & Tracking API:** Menggunakan data asli. Oleh karena itu, *request ke endpoint ini di sandbox tetap dihitung berbayar (Paid)* jika melebihi kuota gratis.

### Production (Go Live)
Lingkungan nyata di mana kurir asli akan dipanggil dan saldo asli akan dipotong.
- **Ciri API Key:** Dimulai dengan prefix `biteship_live_...`
- **Syarat Aktivasi:** Memerlukan verifikasi bisnis (KYC) dan mematikan toggle "Mode Testing" di dashboard.

## 2. Authentication (Autentikasi API)

Setiap request ke REST API Biteship dilindungi dengan **HTTP Basic Authentication**.
Anda harus menyisipkan API Key di dalam header request.

### Format Request Header
```http
POST /v1/rates/couriers HTTP/1.1
Host: api.biteship.com
authorization: <<YOUR_API_KEY>>
content-type: application/json
```
*(Catatan: Token Biteship dapat langsung dimasukkan ke header `authorization` tanpa keyword `Bearer` di depannya, cukup token aslinya).*

### Daftar Error Autentikasi
Biteship akan mengembalikan kode error spesifik jika terjadi masalah autentikasi:
- `40000001` : Autentikasi gagal. API Key salah.
- `40101001` : Authorization failed.
- `40101002` : Tidak ada akun yang terhubung dengan API Key tersebut.
- `40301001` : Tidak ada token yang cocok.
- `40301002` : Informasi user tidak ditemukan.

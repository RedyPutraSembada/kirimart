# 📚 Biteship Integration Handbook

Selamat datang di Buku Panduan Lengkap Integrasi API Biteship untuk sistem E-Commerce KiriMart. Buku ini disusun secara eksklusif berdasarkan seluruh halaman dokumentasi resmi Biteship dan dirancang untuk menjadi referensi utama (Single Source of Truth) bagi tim developer frontend dan backend.

## 📑 Daftar Isi (Chapters)

1. [Bab 1: Getting Started & Authentication](./01-getting-started.md)
   - Lingkungan Sandbox vs Production
   - Cara Generate API Key
   - Autentikasi (HTTP Basic)
2. [Bab 2: Maps, Locations, & Rates API](./02-rates-and-maps.md)
   - Mencari Area dan Lokasi
   - Menghitung Tarif Pengiriman (Cek Ongkir)
3. [Bab 3: Orders, Couriers, & Trackings API](./03-orders-and-tracking.md)
   - Draft Orders vs Real Orders
   - Siklus Status Pengiriman (Status Flow)
   - Melacak Paket (Tracking)
4. [Bab 4: Webhooks & Automasi](./04-webhooks-and-events.md)
   - `order.status`
   - `order.price`
   - `order.waybill_id`
5. [Bab 5: Label Pengiriman & Penanganan Error](./05-shipping-labels-and-errors.md)
   - Struktur HTTP Error
   - Kebutuhan Label Pengiriman (Shipping Label)

---
*Disusun untuk kemudahan tim KiriMart dalam mengimplementasikan logistik cerdas bersama Biteship.*

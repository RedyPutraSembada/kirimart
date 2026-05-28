# Rencana Implementasi: Sistem Keuangan Toko & Penarikan Dana (Withdrawal)

Fitur ini merupakan inti dari sebuah *marketplace*, yaitu mendistribusikan uang pembayaran dari pembeli ke masing-masing penjual. Berikut adalah analisis dan rancangan fitur yang sangat krusial ini.

## 1. Hubungan dengan Midtrans (Midtrans IRIS)
Saat ini Anda menggunakan **Midtrans Core/Snap** yang berfungsi menerima pembayaran (*Pay-In*). Semua uang dari pembeli akan masuk dan mengendap di akun Midtrans **milik Platform (Admin)**. 

Untuk mentransfer uang dari Platform ke rekening Penjual secara otomatis (*Pay-Out*), Midtrans memiliki layanan bernama **Midtrans IRIS**. 
**Namun**, perlu diketahui bahwa:
1. Midtrans IRIS membutuhkan aktivasi terpisah, verifikasi KYC badan usaha (PT/CV), dan saldo *top-up* di akun IRIS Anda.
2. Untuk E-Commerce yang baru berjalan, **SANGAT DISARANKAN** menggunakan metode **Penarikan Manual (Manual Payout)** terlebih dahulu di fase awal.

**Rencana Alur Manual (Direkomendasikan saat ini):**
1. Penjual menekan tombol "Tarik Saldo" di dasbornya.
2. Permintaan tersebut masuk ke Dasbor Admin.
3. Admin memproses transfer uang secara manual melalui *Internet Banking* ke rekening penjual.
4. Admin mengklik tombol "Selesai" di sistem, lalu saldo penjual akan otomatis terpotong dan riwayat tercatat.

## 2. Perubahan Skema Database (Dampak ke Data Lain)
Kita perlu membuat tabel baru dan menambahkan kolom pada tabel yang sudah ada. Ini adalah rancangan skemanya:

#### [MODIFY] `store-schema.js`
Menambahkan dompet digital untuk setiap toko:
- `balance` (integer) - Total saldo yang bisa ditarik.
- `withdrawnAmount` (integer) - Total saldo yang sudah berhasil ditarik selama ini.

#### [NEW] `store-bank-schema.js`
Menyimpan informasi rekening bank penjual:
- `storeId`, `bankName` (misal: BCA, Mandiri), `accountNumber`, `accountHolderName`.

#### [NEW] `withdrawal-schema.js`
Mencatat riwayat penarikan dana:
- `storeId`, `amount`, `status` (`pending`, `completed`, `rejected`), `createdAt`, `completedAt`.

## 3. Perubahan Alur Logika Pesanan (Crucial!)
Fitur ini berdampak langsung pada **Alur Penyelesaian Pesanan** yang baru saja kita buat.
- Di dalam fungsi `completeOrderAndReview` (saat pembeli klik "Pesanan Diterima"), sistem harus **otomatis menambahkan uang (`grandTotal`) ke dalam `balance` toko tersebut**. 
- Uang **TIDAK BOLEH** masuk ke saldo penjual sebelum pembeli mengklik "Pesanan Diterima". Ini adalah standar keamanan *Zero-Trust marketplace* agar uang tidak dibawa lari penjual jika barang tidak dikirim.

## 4. Rencana Pembuatan UI (User Interface)
- **Seller Dashboard (`/seller-dashboard/finance`)**: Halaman baru bertema "Keuangan". Menampilkan kartu Saldo Aktif, formulir pengaturan Rekening Bank, tombol "Tarik Dana", dan tabel Riwayat Penarikan.
- **Admin Dashboard (`/admin-dashboard/withdrawals`)**: Halaman khusus untuk Super Admin melihat antrean permintaan penarikan dana dari semua penjual, beserta tombol "Approve/Reject".

## User Review Required

> [!IMPORTANT]
> **Keputusan Metode Penarikan**
> Apakah Anda setuju kita menggunakan metode **Manual Payout** (Admin transfer manual lalu konfirmasi di sistem) untuk fase ini? Metode otomatis (Midtrans IRIS) sebaiknya diimplementasikan nanti jika legalitas platform dan akun Midtrans Corporate Anda sudah sepenuhnya disetujui oleh pihak Midtrans.

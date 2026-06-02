# Panduan Sistem Activity Log (Audit Trail)

Dokumen ini memuat detail seluruh aksi (aktivitas) di platform Kawan Belanja yang secara otomatis direkam ke dalam database. Tujuan utamanya adalah memudahkan investigasi saat terjadi masalah keamanan, perselisihan (dispute) pesanan, atau pelacakan rekam jejak keuangan.

Semua log di bawah ini akan menyimpan data:
- **Pelaku**: `userId` (atau null jika anonim), `ipAddress`, `userAgent`.
- **Lokasi**: `storeId` (jika aktivitas terjadi di dalam konteks sebuah toko).
- **Detail**: Perubahan data spesifik (misalnya, status pesanan berubah dari *pending* ke *processing*).

---

## 1. Otentikasi, Keamanan & Administrasi
Aktivitas yang berkaitan dengan akses masuk, keamanan akun, dan moderasi tingkat Admin.

| Aksi (`action`) | Keterangan | Pelaku | `entityType` |
|---|---|---|---|
| `LOGIN_SUCCESS` | Pengguna berhasil masuk ke sistem | User | `auth` |
| `LOGIN_FAILED` | Percobaan login gagal (password salah/user tidak ada) | Anonim / User | `auth` |
| `LOGOUT` | Pengguna keluar dari sistem | User | `auth` |
| `PASSWORD_CHANGED` | Pengguna mengubah kata sandi mereka | User | `auth` |
| `BAN_USER` | Admin memblokir pengguna / toko | Admin | `user` |
| `UNBAN_USER` | Admin membuka blokir pengguna / toko | Admin | `user` |
| `DELETE_USER` | Admin menghapus pengguna secara permanen | Admin | `user` |

## 2. Toko & Akun (Store Management)
Aktivitas yang berkaitan dengan pengaturan dan kepemilikan toko. Titik rawan untuk keamanan finansial.

| Aksi (`action`) | Keterangan | Pelaku | `entityType` |
|---|---|---|---|
| `CREATE_STORE` | Pembuatan toko baru oleh penjual | Seller | `store` |
| `UPDATE_STORE_INFO` | Perubahan pengaturan toko (nama, domain, dll) | Seller | `store` |
| `UPDATE_BANK_INFO` | **KRITIKAL:** Perubahan nomor rekening bank untuk pencairan dana | Seller | `store` |

## 3. Produk & Katalog (Product Management)
Aktivitas yang mengubah ketersediaan barang di etalase toko.

| Aksi (`action`) | Keterangan | Pelaku | `entityType` |
|---|---|---|---|
| `CREATE_PRODUCT` | Menambahkan produk baru ke etalase | Seller | `product` |
| `UPDATE_PRODUCT` | Mengubah detail produk (harga, stok, deskripsi, gambar) | Seller | `product` |
| `DELETE_PRODUCT` | Menghapus produk dari etalase | Seller | `product` |

## 4. Pesanan & Transaksi (Order Management)
Pencatatan siklus hidup sebuah pesanan (sangat krusial untuk perselisihan).

| Aksi (`action`) | Keterangan | Pelaku | `entityType` |
|---|---|---|---|
| `CREATE_ORDER` | Pembeli membuat pesanan baru (Checkout) | Buyer | `payment` |
| `UPDATE_ORDER_STATUS` | Perubahan status pesanan (misal: memproses pesanan) | Seller | `order` |
| `SUBMIT_SHIPPING_AWB` | Penjual memasukkan nomor resi pengiriman | Seller | `order` |
| `CONFIRM_RECEIVED` | Pembeli mengonfirmasi bahwa barang telah diterima | Buyer | `order` |
| `SYSTEM_AUTO_COMPLETE` | Sistem otomatis menyelesaikan pesanan (Cron Job) | Sistem | `order` |
| `CANCEL_ORDER` | Pembatalan pesanan | Buyer / Seller | `order` |

## 5. Keuangan (Finance & Withdrawal)
Pencatatan pergerakan dana keluar dari platform.

| Aksi (`action`) | Keterangan | Pelaku | `entityType` |
|---|---|---|---|
| `REQUEST_WITHDRAWAL` | Penjual mengajukan pencairan saldo dompet | Seller | `withdrawal` |
| `APPROVE_WITHDRAWAL` | Admin mentransfer dana dan menyetujui pencairan | Admin | `withdrawal` |
| `REJECT_WITHDRAWAL` | Admin menolak permohonan pencairan dana penjual | Admin | `withdrawal` |

## 6. Komplain & Retur (Complaint & Refund)
Pencatatan penyelesaian masalah pesanan.

| Aksi (`action`) | Keterangan | Pelaku | `entityType` |
|---|---|---|---|
| `SUBMIT_COMPLAINT` | Pembeli mengajukan komplain barang rusak/tidak sesuai | Buyer | `complaint` |
| `RESPOND_COMPLAINT` | Penjual menerima atau menolak komplain | Seller | `complaint` |
| `SUBMIT_RETURN_AWB` | Pembeli memasukkan resi pengembalian barang | Buyer | `complaint` |
| `PROCESS_REFUND` | Admin memproses pengembalian dana (refund) ke pembeli | Admin | `refund` |

---
*Catatan: Semua daftar aksi di atas bersifat final dan sudah diimplementasikan (di-inject) langsung ke server actions di Kawan Belanja.*

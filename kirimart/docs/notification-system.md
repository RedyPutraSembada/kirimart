# Sistem Notifikasi Real-Time Kawan Belanja

Dokumen ini menjelaskan arsitektur dan perilaku sistem notifikasi real-time yang ada pada aplikasi Kawan Belanja, khususnya mengenai siklus pengiriman pesan melalui WebSocket (Socket.io) dan pemanggilan suara notifikasi (`notif.wav`).

## Arsitektur Singkat

Kawan Belanja menggunakan pendekatan **Event-Driven WebSocket** untuk notifikasi. 
1. **Server (`ws-server`)** memantau perubahan status transaksi atau aksi pengguna, lalu memancarkan (*emit*) event `"notification"` ke *namespace* `/notifications`.
2. **Client (`Next.js`)** menggunakan *custom hook* `useNotificationSocket` yang otomatis terkoneksi ke `/notifications` saat *User* atau *Seller* berhasil login (memiliki `sessionToken`).
3. Saat *Client* menerima event `"notification"`, aplikasi akan:
   - Memperbarui badge counter notifikasi melalui React Query.
   - Menampilkan pop-up Toast (dari Sonner).
   - Membunyikan suara peringatan (`notif.wav` atau bunyi beep fallback).

## Daftar Pemicu (Trigger) Notifikasi & Suara

Suara notifikasi akan otomatis berbunyi di browser pengguna (jika tidak diblokir oleh *browser autoplay policy*) saat kondisi-kondisi di bawah ini terpenuhi:

### 1. Untuk Pembeli (Buyer)
Pembeli akan menerima notifikasi dan suara ketika:
- **Pembayaran Berhasil:** Gateway pembayaran (Midtrans) mengirimkan webhook sukses.
- **Pesanan Diproses:** Penjual mengonfirmasi pesanan dan mulai menyiapkan barang.
- **Pesanan Dikirim:** Penjual telah menyerahkan barang ke kurir (menginput nomor resi).
- **Update Kurir (Biteship):** Kurir memperbarui status paket (contoh: paket sedang dalam perjalanan atau sudah tiba di tujuan).
- **Balasan Ulasan:** Penjual merespons/membalas ulasan (*review*) yang diberikan oleh pembeli.
- **Status Komplain/Retur:** Penjual memberikan tanggapan atas pengajuan komplain (disetujui/ditolak).
- **Refund Selesai:** Admin aplikasi telah berhasil mentransfer dan mengonfirmasi pengembalian dana pembeli.

### 2. Untuk Penjual (Seller)
Penjual akan menerima notifikasi dan suara ketika:
- **Pesanan Baru Masuk:** Seorang pembeli telah berhasil melakukan pembayaran untuk produk di tokonya.
- **Pesanan Diselesaikan:** Pembeli mengklik tombol "Selesaikan Pesanan" atau "Terima Barang" sehingga dana diteruskan ke saldo penjual.
- **Komplain Baru:** Pembeli mengajukan komplain atau pengembalian barang (*retur*) atas pesanan yang sudah sampai.

## Permasalahan "Mute" pada Suara Notifikasi

Di aplikasi web (bukan PWA atau Native App), browser modern seperti Chrome, Edge, dan Safari menerapkan **Autoplay Policy**. Artinya, elemen suara/audio tidak boleh diputar secara otomatis melalui script (seperti pada Socket.io event) jika pengguna belum melakukan interaksi apa pun dengan halaman web tersebut (contoh: belum melakukan klik atau tap).

Itulah mengapa terkadang notifikasi pop-up muncul tetapi **suaranya tidak berbunyi**.
Solusi permanen untuk mengatasi batasan ini adalah dengan merombak aplikasi web menjadi **Progressive Web App (PWA)** dan memanfaatkan fitur **Web Push Notifications**, di mana notifikasi ditangani langsung oleh level Sistem Operasi (Android/Windows/iOS).

# 🚀 Panduan Deployment VPS KawanBelanja

Dokumen ini berisi panduan langkah demi langkah untuk melakukan deployment aplikasi KawanBelanja ke VPS (Virtual Private Server) menggunakan arsitektur Docker terpisah yang baru.

## 📋 Persyaratan Sistem VPS
- **OS**: Ubuntu 20.04 / 22.04 LTS (disarankan)
- **RAM**: Minimal 4GB (Disarankan 8GB untuk performa optimal Next.js build)
- **CPU**: 2 vCPU atau lebih
- **Software**: Git, Docker, dan Docker Compose V2 sudah terinstall.

---

## 🛠️ Langkah 1: Persiapan Awal (Hanya Sekali)

1. **Login ke VPS** via SSH:
   ```bash
   ssh root@IP_VPS_ANDA
   ```

2. **Clone Repositori**:
   Aplikasi dan file uploader harus berada di path yang sama agar Docker Compose bisa menemukannya.
   ```bash
   mkdir -p /home/deploy/kawanbelanja
   cd /home/deploy/kawanbelanja
   
   # Clone repo utama (Kirimart)
   git clone git@github.com:RedyPutraSembada/kirimart.git
   
   # Clone repo file uploader
   git clone git@github.com:USERNAME_GITHUB_ANDA/file-uploader-kawanbelanja.git
   ```
   *(Pastikan nama folder persis `kirimart` dan `file-uploader-kawanbelanja`)*

3. **Masuk ke direktori deploy**:
   ```bash
   cd /home/deploy/kawanbelanja/kirimart/deploy
   ```

4. **Beri hak akses eksekusi ke semua bash script**:
   ```bash
   chmod +x *.sh
   ```

5. **Buat Docker Network Utama**:
   Jalankan script ini untuk membuat jaringan komunikasi antar container.
   ```bash
   ./create-network.sh
   ```

---

## ⚙️ Langkah 2: Konfigurasi Environment

Semua service (Next.js, Websocket, Database, Uploader, dll) kini hanya membaca **satu file environment** yang terpusat.

1. **Cek file `.env.production`**:
   Di dalam folder `deploy/`, pastikan file `.env.production` sudah memiliki nilai yang benar.
   ```bash
   nano .env.production
   ```
2. **Pastikan bagian Midtrans & API Key benar**:
   Karena ini untuk VPS produksi, pastikan Anda menggunakan Production Key dari Midtrans dan layanan pihak ketiga lainnya.

---

## 🚀 Langkah 3: Start Semua Service

Gunakan script otomatis yang telah dibuat agar urutan *startup* (Database -> Redis -> App) tidak bentrok.

1. **Jalankan script start**:
   ```bash
   ./start-all.sh
   ```
   *Catatan: Pada saat pertama kali dijalankan, proses ini akan memakan waktu cukup lama (bisa 5-10 menit) karena VPS harus mengunduh image database dan melakukan proses "build" untuk Next.js dan Websocket Server.*

2. **Periksa Status Container**:
   Setelah selesai, cek apakah semua container berjalan normal dan tidak ada yang "Restarting".
   ```bash
   ./status.sh
   ```

---

## 🗄️ Langkah 4: Migrasi Database

Karena container database (PostgreSQL) baru saja dibuat fresh, tabel-tabelnya masih kosong. Kita perlu melakukan "Push Schema" menggunakan Drizzle.

1. **Jalankan script migrasi**:
   ```bash
   ./migrate.sh
   ```
   *Ini akan membaca schema dari aplikasi Next.js dan menerapkannya ke PostgreSQL di VPS.*

---

## 🌐 Langkah 5: Konfigurasi Domain (Nginx Proxy Manager)

Aplikasi sudah berjalan di internal server, tapi belum bisa diakses dari internet. Kita perlu mengatur routing domain.

1. **Buka Nginx Proxy Manager** di browser Anda:
   Akses `http://IP_VPS_ANDA:81`
2. **Login Default**:
   - Email: `admin@example.com`
   - Password: `changeme`
   *(Ubah password segera setelah login!)*
3. **Tambahkan Proxy Hosts**:
   Masuk ke menu **Hosts > Proxy Hosts** dan tambahkan 3 domain berikut:

   **A. Aplikasi Utama (Next.js)**
   - Domain Names: `kawanbelanja.com`, `www.kawanbelanja.com`
   - Scheme: `http`
   - Forward Hostname / IP: `kb-nextjs`
   - Forward Port: `3000`
   - Centang: `Block Common Exploits`
   - SSL: Request sertifikat baru, centang `Force SSL`.

   **B. WebSocket Server (Penting untuk Realtime Chat & Notif)**
   - Domain Names: `ws.kawanbelanja.com`
   - Scheme: `http`
   - Forward Hostname / IP: `kb-ws`
   - Forward Port: `3001`
   - Centang: `Block Common Exploits` & **`Websockets Support`** (WAJIB CENTANG!)
   - SSL: Request sertifikat baru, centang `Force SSL`.

   **C. File Uploader Server**
   - Domain Names: `upload.kawanbelanja.com`
   - Scheme: `http`
   - Forward Hostname / IP: `kb-uploader`
   - Forward Port: `4004`
   - Centang: `Block Common Exploits`
   - SSL: Request sertifikat baru, centang `Force SSL`.

---

## 🔄 Cara Update Aplikasi (Setelah Git Push)

Setiap kali Anda selesai ngoding di lokal dan melakukan push ke GitHub, ikuti langkah berikut di VPS untuk update:

1. **Pull kode terbaru**:
   ```bash
   cd /home/deploy/kawanbelanja/kirimart
   git pull origin main
   ```
2. **Build ulang aplikasi (Pilih salah satu)**:
   
   Jika **Aplikasi Next.js** yang berubah:
   ```bash
   cd deploy/4-nextjs
   docker compose up -d --build
   ```
   
   Jika **Websocket Server** yang berubah:
   ```bash
   cd deploy/5-ws-server
   docker compose up -d --build
   ```

   Jika **File Uploader** yang berubah:
   ```bash
   cd /home/deploy/kawanbelanja/file-uploader-kawanbelanja
   git pull origin main
   cd /home/deploy/kawanbelanja/kirimart/deploy/6-file-uploader
   docker compose up -d --build
   ```

*Anda tidak perlu menghentikan database atau redis! Ini kelebihan arsitektur terpisah.*

---

## 🛑 Cara Stop Aplikasi
Jika Anda perlu menghentikan semua layanan (misalnya untuk maintenance OS):
```bash
cd /home/deploy/kawanbelanja/kirimart/deploy
./stop-all.sh
```
*(Tenang, data database PostgreSQL dan gambar file uploader tidak akan hilang karena sudah menggunakan Docker Volumes persisten).*

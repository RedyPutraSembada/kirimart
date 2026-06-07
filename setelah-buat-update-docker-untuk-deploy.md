# Walkthrough: Setup Deployment Docker Terpisah

Setup deployment untuk VPS Anda telah berhasil dirancang ulang agar **jauh lebih stabil, terstruktur, dan bersih**. Semua file konfigurasi deployment lama sudah dihapus, dan kini kita memiliki folder `deploy/` khusus sebagai pusat kendali.

## Apa Saja yang Berubah?

### 1. 🧹 Repo Lebih Bersih
Saya telah menghapus konfigurasi lama yang menyebabkan konflik dan kebingungan:
- `docker-compose.prod.yml` & `docker-compose.yml` lama di `kirimart/` telah dihapus.
- `docker-compose.prod-id.yml`, `prod-v2`, `stg-id`, dll di dalam `file-uploader` telah dihapus.
- Kini hanya ada **satu sumber kebenaran** untuk deployment.

### 2. 📁 Struktur Folder `deploy/` Terpusat
Di dalam root repo `kirimart/`, sekarang terdapat folder `deploy/` yang berisi:
- `1-postgres/docker-compose.yml`
- `2-redis/docker-compose.yml`
- `3-nginx/docker-compose.yml`
- `4-nextjs/docker-compose.yml` (menggunakan Next.js + Bun)
- `5-ws-server/docker-compose.yml`
- `6-file-uploader/docker-compose.yml`

> [!TIP]
> Dengan struktur ini, jika ada satu service yang bermasalah (misal: WebSocket mati), Anda cukup masuk ke `5-ws-server/` dan menjalankan `docker compose restart`. Service lain (seperti Next.js atau Nginx) **tidak akan terganggu sama sekali**.

### 3. 🔐 Satu `.env.production` Untuk Semua
Di dalam `deploy/.env.production`, saya telah menyatukan semua variabel.
- Tidak perlu lagi buat `.env` terpisah untuk `file-uploader`. Semuanya, termasuk `UPLOAD_API_KEY`, `MAX_FILE_SIZE`, dan `PORT=4004`, diatur secara terpusat di sini.
- Variabel **Midtrans** sudah diset `MIDTRANS_IS_PRODUCTION=true`.
- Next.js akan membaca variabel ini secara otomatis saat proses build (melalui instruksi penyalinan `cp` di script start).

### 4. 🧰 Script Otomatisasi
Menghindari salah urutan startup yang menjadi kelemahan setup lama:
- **`create-network.sh`**: Membuat jaringan `kawanbelanja-net`.
- **`start-all.sh`**: Memulai service secara berurutan dan menunggu _health check_ (Postgres siap -> Redis siap -> Nginx -> Next.js -> dll).
- **`stop-all.sh`**: Menghentikan semua service.
- **`status.sh`**: Mengecek status RAM dan CPU yang sedang dipakai tiap container Docker.
- **`migrate.sh`**: Perintah shortcut untuk menjalankan `bun run db:push`.

---

## 🚀 Cara Eksekusi di VPS Nanti

Bila Anda sudah melakukan `git push` perubahan ini ke GitHub dan melakukan `git pull` di VPS, urutan menjalankannya adalah:

1. Masuk ke folder deploy:
   ```bash
   cd /home/deploy/kawanbelanja/kirimart/deploy
   ```

2. Buat network (Cukup jalankan sekali seumur hidup):
   ```bash
   bash create-network.sh
   ```

3. Jalankan semua (Script ini akan mem-build docker otomatis secara berurutan):
   ```bash
   bash start-all.sh
   ```

4. Lakukan Migrasi Database:
   ```bash
   bash migrate.sh
   ```

> [!IMPORTANT]
> **Ingat**, domain Anda belum akan menyambung ke aplikasi jika Anda belum melakukan setup di Nginx Proxy Manager! Akses `http://IP_VPS_ANDA:81`, dan arahkan **Proxy Hosts** ke:
> - `kawanbelanja.com` -> Forward ke `kb-nextjs` port `3000`
> - `ws.kawanbelanja.com` -> Forward ke `kb-ws` port `3001` (Aktifkan centang Websocket)
> - `upload.kawanbelanja.com` -> Forward ke `kb-uploader` port `4004`

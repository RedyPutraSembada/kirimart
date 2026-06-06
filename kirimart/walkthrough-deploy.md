# 🚀 Walkthrough: Deploy KawanBelanja ke VPS

## File yang Dibuat & Dimodifikasi

### File Baru
| File | Fungsi |
|------|--------|
| [.dockerignore](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/.dockerignore) | Exclude node_modules, .next, dll dari Docker build context |
| [Dockerfile](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/Dockerfile) | Multi-stage build Next.js (deps → builder → runner ~200MB) |
| [docker-compose.prod.yml](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/docker-compose.prod.yml) | Semua 6 service + migration tool |
| [.env.production](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/.env.production) | Template environment production |
| [scripts/setup-vps.sh](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/scripts/setup-vps.sh) | One-time VPS setup (Docker, user, firewall, swap) |
| [scripts/deploy.sh](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/scripts/deploy.sh) | Deploy script (pull, build, migrate, start) |
| [scripts/backup-db.sh](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/scripts/backup-db.sh) | Database backup + auto-cleanup 7 hari |

### File Dimodifikasi
| File | Perubahan |
|------|-----------|
| [next.config.mjs](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/next.config.mjs) | Tambah `output: 'standalone'` untuk Docker |
| [ws-server/src/index.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/ws-server/src/index.js) | `ALLOWED_ORIGINS` bisa diset via environment variable |

---

## Arsitektur Production

```mermaid
graph TB
    subgraph "🌐 Internet"
        DNS["DNS A Records<br/>kawanbelanja.com → IP VPS<br/>ws.kawanbelanja.com → IP VPS<br/>upload.kawanbelanja.com → IP VPS"]
    end

    subgraph "🖥️ VPS Ubuntu (2CPU / 4GB RAM)"
        NPM["🔒 Nginx Proxy Manager<br/>:80 / :443 / :81 (admin)<br/><b>50MB RAM</b>"]

        subgraph "Docker Network: kirimart-net"
            APP["📦 Next.js App<br/>kirimart-app:3000<br/><b>800MB RAM</b>"]
            WS["⚡ WS Server<br/>kirimart-ws:3001<br/><b>256MB RAM</b>"]
            PG["🐘 PostgreSQL 16<br/>kirimart-postgres:5432<br/><b>512MB RAM</b>"]
            REDIS["🔴 Redis 7<br/>kirimart-redis:6379<br/><b>256MB RAM</b>"]
            UP["📂 File Uploader<br/>kirimart-uploader:4004<br/><b>128MB RAM</b>"]
        end
    end

    DNS --> NPM
    NPM -->|"kawanbelanja.com"| APP
    NPM -->|"ws.kawanbelanja.com<br/>(WebSocket)"| WS
    NPM -->|"upload.kawanbelanja.com"| UP

    APP --> PG
    APP --> REDIS
    APP -->|"HTTP internal"| WS
    WS --> REDIS
    WS --> PG
```

---

## Panduan Step-by-Step

### STEP 1: DNS Setup

Di panel domain registrar Anda (Niagahoster/Namecheap/Cloudflare), buat **3 A record** yang mengarah ke IP VPS:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `IP_VPS_ANDA` | 3600 |
| A | `ws` | `IP_VPS_ANDA` | 3600 |
| A | `upload` | `IP_VPS_ANDA` | 3600 |

> [!TIP]
> Alternatif: Buat 1 wildcard record `*.kawanbelanja.com` → IP VPS untuk mencakup semua subdomain.

---

### STEP 2: Setup VPS (Satu Kali)

```bash
# SSH ke VPS sebagai root
ssh root@IP_VPS_ANDA

# Download & jalankan setup script
# (atau upload file setup-vps.sh ke server)
apt install -y git
mkdir -p /home/deploy/kawanbelanja
cd /home/deploy/kawanbelanja

# Clone repositories
git clone https://github.com/USERNAME/kirimart.git kirimart
git clone https://github.com/USERNAME/file-uploader.git file-uploader

# Jalankan setup
cd kirimart
chmod +x scripts/setup-vps.sh
sudo bash scripts/setup-vps.sh
```

Setup script akan otomatis:
- ✅ Install Docker & Docker Compose
- ✅ Buat user `deploy` (non-root)
- ✅ Setup firewall (port 22, 80, 443, 81)
- ✅ Buat 2GB swap file
- ✅ Install git, curl, htop, nano

---

### STEP 3: Konfigurasi Environment

```bash
# Switch ke user deploy
su - deploy
cd ~/kawanbelanja/kirimart

# Edit .env.production — ISI SEMUA NILAI "GANTI_INI"
nano .env.production
```

**Yang perlu diisi:**

| Variable | Cara Dapat |
|----------|------------|
| `PG_PASSWORD` | Buat password acak: `openssl rand -base64 32` |
| `BETTER_AUTH_SECRET` | Buat secret acak: `openssl rand -base64 32` |
| `WS_SECRET` | Buat secret acak: `openssl rand -base64 24` |
| `UPLOAD_API_KEY` | Copy dari .env development Anda |
| `GOOGLE_CLIENT_ID/SECRET` | Copy dari .env development Anda |
| `RESEND_API_KEY` | Copy dari .env development Anda |
| `MIDTRANS_*` | Copy dari .env development (sandbox dulu) |
| `BITESHIP_API_KEY` | Copy dari .env development Anda |

> [!IMPORTANT]
> Pastikan `DATABASE_URL` di .env.production menggunakan password yang **sama** dengan `PG_PASSWORD`.
> Contoh: jika `PG_PASSWORD=abc123`, maka `DATABASE_URL=postgres://kirimart:abc123@postgres:5432/kirimart`

---

### STEP 4: Deploy!

```bash
# Pertama kali — build + migrate + start
cd ~/kawanbelanja/kirimart
bash scripts/deploy.sh --migrate

# Tunggu beberapa menit untuk build...
# Build Next.js bisa memakan waktu 3-5 menit di VPS 2CPU
```

**Cek semua container berjalan:**
```bash
docker compose -f docker-compose.prod.yml ps
```

Output yang diharapkan:
```
NAME                STATUS           PORTS
kirimart-app        Up (healthy)     3000/tcp
kirimart-ws         Up (healthy)     3001/tcp
kirimart-redis      Up (healthy)     6379/tcp
kirimart-postgres   Up (healthy)     5432/tcp
kirimart-uploader   Up               4004/tcp
kirimart-npm        Up (healthy)     0.0.0.0:80->80, 0.0.0.0:443->443, 0.0.0.0:81->81
```

---

### STEP 5: Konfigurasi Nginx Proxy Manager

Buka browser: `http://IP_VPS_ANDA:81`

**Login pertama kali:**
- Email: `admin@example.com`
- Password: `changeme`
- (Anda akan diminta ganti setelah login)

#### 5A. Proxy Host: kawanbelanja.com → Next.js

1. Klik **"Proxy Hosts"** → **"Add Proxy Host"**
2. Tab **Details**:
   - Domain Names: `kawanbelanja.com`
   - Scheme: `http`
   - Forward Hostname: `kirimart-app`
   - Forward Port: `3000`
   - ✅ Cache Assets
   - ✅ Block Common Exploits
   - ✅ Websockets Support
3. Tab **SSL**:
   - SSL Certificate: **"Request a new SSL Certificate"**
   - ✅ Force SSL
   - ✅ HTTP/2 Support
   - Email: `email_anda@gmail.com`
   - ✅ I Agree (Terms of Service)
4. Klik **Save**

#### 5B. Proxy Host: ws.kawanbelanja.com → WS Server

1. **"Add Proxy Host"**
2. Tab **Details**:
   - Domain Names: `ws.kawanbelanja.com`
   - Scheme: `http`
   - Forward Hostname: `kirimart-ws`
   - Forward Port: `3001`
   - ✅ **Websockets Support** ← PENTING!
   - ✅ Block Common Exploits
3. Tab **SSL**:
   - Request new SSL Certificate
   - ✅ Force SSL
   - ✅ HTTP/2 Support
4. Klik **Save**

#### 5C. Proxy Host: upload.kawanbelanja.com → File Uploader

1. **"Add Proxy Host"**
2. Tab **Details**:
   - Domain Names: `upload.kawanbelanja.com`
   - Scheme: `http`
   - Forward Hostname: `kirimart-uploader`
   - Forward Port: `4004`
   - ✅ Block Common Exploits
3. Tab **Custom Locations** (opsional — untuk serve static files):
   - Bisa tambahkan custom nginx directive untuk caching gambar
4. Tab **SSL**:
   - Request new SSL Certificate
   - ✅ Force SSL
   - ✅ HTTP/2 Support
5. Klik **Save**

> [!NOTE]
> NPM menggunakan **nama container Docker** (`kirimart-app`, `kirimart-ws`, `kirimart-uploader`) sebagai hostname karena semua container ada di **network yang sama** (`kirimart-net`).

---

### STEP 6: Verifikasi

```bash
# Test dari server
curl -I https://kawanbelanja.com          # Harus return 200
curl https://kawanbelanja.com/ws/health    # Redirect ke ws server health? 
curl -I https://upload.kawanbelanja.com    # Harus return 200

# Cek resource usage
docker stats --no-stream

# Cek logs jika ada error
docker compose -f docker-compose.prod.yml logs -f nextjs
docker compose -f docker-compose.prod.yml logs -f ws-server
```

---

### STEP 7: Update Webhook URLs

Setelah server production berjalan, update webhook di dashboard pihak ketiga:

| Service | Dashboard | Webhook URL Baru |
|---------|-----------|-----------------|
| **Midtrans** | [dashboard.midtrans.com](https://dashboard.midtrans.com) → Settings → Notification URL | `https://kawanbelanja.com/api/midtrans/notification/payment` |
| **Biteship** | [dashboard.biteship.com](https://dashboard.biteship.com) → Webhook | `https://kawanbelanja.com/api/biteship/webhook` |
| **Google OAuth** | [console.cloud.google.com](https://console.cloud.google.com) → Credentials | Tambah `https://kawanbelanja.com` di Authorized redirect URIs |

---

## Maintenance

### Update Aplikasi
```bash
cd ~/kawanbelanja/kirimart
bash scripts/deploy.sh           # Pull + rebuild + restart
bash scripts/deploy.sh --migrate # Jika ada perubahan schema database
bash scripts/deploy.sh --rebuild # Force rebuild tanpa cache
```

### Backup Database
```bash
# Manual
bash scripts/backup-db.sh

# Otomatis (cron — setiap hari jam 3 pagi)
crontab -e
# Tambahkan baris:
0 3 * * * /home/deploy/kawanbelanja/kirimart/scripts/backup-db.sh >> /home/deploy/kawanbelanja/kirimart/backups/backup.log 2>&1
```

### Restore Database
```bash
# Decompress dan restore
gunzip -c backups/kirimart_backup_YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U kirimart -d kirimart
```

### Monitoring
```bash
# Resource usage real-time
docker stats

# Log per service
docker compose -f docker-compose.prod.yml logs -f nextjs
docker compose -f docker-compose.prod.yml logs -f ws-server
docker compose -f docker-compose.prod.yml logs -f postgres

# Disk usage
df -h
du -sh /var/lib/docker/volumes/*
```

### Restart Service Tertentu
```bash
docker compose -f docker-compose.prod.yml restart nextjs
docker compose -f docker-compose.prod.yml restart ws-server
```

---

## Troubleshooting

| Problem | Solusi |
|---------|--------|
| Build Next.js OOM (kehabisan RAM) | Tambah swap: `fallocate -l 4G /swapfile2 && mkswap /swapfile2 && swapon /swapfile2` |
| NPM tidak bisa generate SSL | Pastikan DNS A record sudah pointing ke IP VPS & port 80/443 terbuka |
| WebSocket tidak connect dari browser | Pastikan `NEXT_PUBLIC_WS_URL=wss://ws.kawanbelanja.com` dan NPM proxy host punya ✅ Websockets Support |
| PostgreSQL connection refused | Cek health: `docker compose exec postgres pg_isready`, cek password di .env.production |
| File upload gagal | Cek `ALLOWED_ORIGINS` di file-uploader dan `NEXT_PUBLIC_UPLOAD_URI` di Next.js |
| Container restart loop | Cek logs: `docker compose -f docker-compose.prod.yml logs <service>` |
| Disk penuh | Bersihkan Docker: `docker system prune -a`, cek upload volume |

---

## Ringkasan Perbedaan: Development vs Production

| Aspek | Development (Windows) | Production (VPS) |
|-------|----------------------|-------------------|
| Next.js | `bun dev` di host | Docker container (standalone build) |
| PostgreSQL | Windows service | Docker container |
| Redis | Docker container | Docker container |
| WS Server | Docker container | Docker container |
| File Uploader | `npm start` di host lain | Docker container |
| Reverse Proxy | Ngrok tunnel | Nginx Proxy Manager |
| SSL | Tidak ada | Auto Let's Encrypt via NPM |
| URL | `localhost:3000` | `https://kawanbelanja.com` |
| WS URL | `ws://localhost:3001` | `wss://ws.kawanbelanja.com` |
| Upload URL | `http://localhost:4004` | `https://upload.kawanbelanja.com` |
| DB Host | `localhost` | `postgres` (Docker DNS) |
| Redis Host | `localhost` | `redis` (Docker DNS) |
| WS Internal | `localhost:3001` | `ws-server:3001` (Docker DNS) |

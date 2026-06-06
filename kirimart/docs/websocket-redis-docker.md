# WebSocket, Redis & Docker — Panduan Lengkap Kawan Belanja

> Dokumen ini dibuat untuk developer yang **belum pernah** menggunakan WebSocket, Redis,
> maupun Docker. Setiap konsep dijelaskan dari nol dengan analogi sederhana.

---

## Daftar Isi

1. [Apa itu WebSocket?](#1-apa-itu-websocket)
2. [Apa itu Redis?](#2-apa-itu-redis)
3. [Apa itu Docker?](#3-apa-itu-docker)
4. [Apa itu BullMQ?](#4-apa-itu-bullmq)
5. [Mengapa Kawan Belanja Butuh Semua Ini?](#5-mengapa-kawanbelanja-butuh-semua-ini)
6. [Arsitektur Kawan Belanja (Sebelum vs Sesudah)](#6-arsitektur-kawanbelanja)
7. [Cara Menjalankan (Step by Step)](#7-cara-menjalankan)
8. [Penjelasan Setiap File di ws-server/](#8-penjelasan-file)
9. [Cara Kerja Komunikasi Next.js ↔ WebSocket](#9-cara-kerja-komunikasi)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Apa itu WebSocket?

### Analogi Sederhana

Bayangkan Anda pesan makanan via GoFood:

- **HTTP biasa (tanpa WebSocket):** Anda harus tekan "Refresh" setiap 10 detik
  untuk cek apakah driver sudah pickup makanan atau belum. Capek kan?

- **WebSocket:** Seperti telepon yang tetap tersambung. Begitu driver pickup,
  HP Anda langsung bunyi "Dring!" tanpa perlu refresh. Begitu driver sampai,
  notifikasi langsung muncul.

### Penjelasan Teknis

```
HTTP Biasa:
  Browser → "Ada update?" → Server → "Belum"
  Browser → "Ada update?" → Server → "Belum"
  Browser → "Ada update?" → Server → "Ada! Pesanan dikirim"
  (Boros bandwidth, lambat, tidak efisien)

WebSocket:
  Browser ←→ Server (koneksi tetap terbuka)
  Server → "Pesanan dikirim!" (langsung push tanpa diminta)
  Server → "Driver sudah sampai!" (langsung push lagi)
  (Hemat, cepat, real-time)
```

### Kenapa Tidak Bisa Pakai Next.js Langsung?

Next.js App Router berjalan secara **serverless** — artinya setiap request
membuat "server mini" yang hidup sesaat lalu mati. WebSocket butuh koneksi
yang hidup terus-menerus (persistent). Ibarat telepon, Anda tidak bisa
menelepon kalau HP-nya mati tiap 10 detik.

**Solusi:** Buat server Node.js terpisah (`ws-server/`) yang tugasnya hanya
menahan koneksi WebSocket. Server ini hidup 24/7 di dalam Docker container.

---

## 2. Apa itu Redis?

### Analogi Sederhana

Bayangkan Redis seperti **papan pengumuman digital** di kantor:

- **Database PostgreSQL** = Lemari arsip. Menyimpan semua dokumen permanen
  (data user, produk, pesanan). Cari dokumen butuh waktu.

- **Redis** = Papan pengumuman di lobi. Informasi yang sering dilihat
  (jam buka, menu hari ini) ditempel di sini supaya semua orang bisa
  baca langsung tanpa perlu ke lemari arsip.

### Kapan Redis Digunakan di Kawan Belanja?

| Kegunaan | Analogi | Contoh di Kawan Belanja |
|----------|---------|---------------------|
| **Cache** | Papan pengumuman | Daftar kategori disimpan di Redis 1 jam, jadi navbar tidak query DB terus |
| **Pub/Sub** | Interkom kantor | WS Server Container-1 bilang ke Container-2: "Hey, ada chat baru untuk user X!" |
| **Queue (BullMQ)** | Antrian loket | "7 hari dari sekarang, selesaikan pesanan #123 otomatis" |
| **Rate Limiting** | Satpam | "User ini sudah login gagal 5x, blokir 1 menit" |

### Data di Redis = Sementara

Redis menyimpan data di **RAM** (memori), bukan di hard disk. Jadi kalau
Redis di-restart, data hilang. Tapi tidak masalah karena:
- Data permanen tetap di PostgreSQL
- Redis hanya menyimpan "shortcut" yang bisa di-rebuild kapan saja

---

## 3. Apa itu Docker?

### Analogi Sederhana

Bayangkan Anda punya 3 aplikasi yang harus jalan bersamaan:
1. Next.js (Kawan Belanja)
2. Redis (cache & queue)
3. WebSocket Server (real-time chat)

**Tanpa Docker:** Anda harus install Redis di Windows (ribet!), install
Node.js versi yang tepat, konfigurasi port, dan berharap semuanya
tidak konflik satu sama lain. Pindah ke laptop lain? Setup ulang semuanya.

**Dengan Docker:** Setiap aplikasi dimasukkan ke dalam "kotak" (container)
yang sudah berisi semua yang dibutuhkan. Anda cukup ketik satu perintah:

```bash
docker compose up
```

Dan BOOM — Redis + WebSocket Server langsung jalan. Mau pindah laptop?
Copy folder → `docker compose up` → jalan lagi. Sesimple itu.

### File Penting Docker

| File | Fungsi |
|------|--------|
| `Dockerfile` | "Resep" untuk membangun satu container (misal: ws-server) |
| `docker-compose.yml` | "Daftar belanjaan" — mendefinisikan semua container yang harus jalan bareng |

---

## 4. Apa itu BullMQ?

### Analogi Sederhana

BullMQ seperti **sekretaris yang sangat teratur**. Anda bilang:
> "Tolong 7 hari dari sekarang, cek pesanan #123. Kalau pembeli belum
> konfirmasi, selesaikan otomatis dan transfer uang ke penjual."

Sekretaris ini (BullMQ) akan:
1. Catat tugas di agenda (Redis Queue)
2. Pasang alarm 7 hari dari sekarang
3. Saat alarm bunyi, kerjakan tugas tersebut
4. Kalau gagal, coba lagi (retry otomatis)

### Kenapa Lebih Baik dari Cron Job?

| | Cron Job (lama) | BullMQ (baru) |
|---|---|---|
| **Jadwal** | Jalankan setiap 6 jam, cek SEMUA pesanan | Jadwalkan per pesanan, tepat 7 hari setelah delivered |
| **Presisi** | Pesanan bisa menunggu sampai 6 jam | Pesanan diselesaikan tepat waktu |
| **Di lokal** | ❌ Butuh server Linux | ✅ Jalan di Docker |
| **Retry** | ❌ Harus handle manual | ✅ Otomatis retry jika gagal |

### Bisa Jalan di Lokal? YA!

BullMQ bukan cron job Linux. BullMQ adalah **worker Node.js** yang hidup
di dalam Docker container bersama WebSocket Server. Selama `docker compose up`
berjalan di laptop Anda, BullMQ juga berjalan.

---

## 5. Mengapa Kawan Belanja Butuh Semua Ini?

### Masalah yang Diselesaikan

| Masalah Saat Ini | Solusi |
|---|---|
| Chat menggunakan **MOCK_CONVERSATIONS** (data palsu) | WebSocket → Chat real-time dengan database |
| Pembeli harus **refresh** untuk lihat update status pesanan | WebSocket → Status berubah otomatis di layar |
| Seller tidak tahu ada **pesanan masuk** kecuali buka halaman orders | WebSocket → Notifikasi real-time "🔔 Pesanan baru!" |
| **Cron job** auto-complete tidak bisa jalan di lokal | BullMQ → Background job jalan di Docker lokal |
| Halaman katalog **lambat** kalau banyak pengunjung bersamaan | Redis Cache → Response < 50ms |
| Ongkir Biteship **Rp 5/call**, boros kalau ribuan checkout | Redis Cache → Cache rate 30 menit per rute |

---

## 6. Arsitektur Kawan Belanja

### SEBELUM (Saat Ini)

```
Browser ──HTTP──► Next.js ──SQL──► PostgreSQL
                     │
                     ├── Midtrans Webhook (masuk, update DB, selesai)
                     └── Biteship Webhook (masuk, update DB, selesai)
                         ↑
                         └── Browser tidak tahu ada update (harus refresh!)
```

### SESUDAH (Dengan WebSocket + Redis)

```
Browser ──WebSocket──► WS-SERVER ──Redis Pub/Sub──► WS-SERVER (scalable)
   ▲                       ▲
   │ (real-time push)      │ (REST: POST /emit)
   │                       │
   └──HTTP──► NEXT.JS ─────┘──SQL──► PostgreSQL
                │
                ├── Midtrans Webhook → update DB → trigger WS → buyer tahu!
                └── Biteship Webhook → update DB → trigger WS → buyer tahu!
```

### Port yang Digunakan

| Service | Port | Keterangan |
|---------|------|------------|
| Next.js (Kawan Belanja) | 3000 | Sudah ada, tidak berubah |
| File Uploader | 4004 | Sudah ada, tidak berubah |
| **WebSocket Server** | **3001** | BARU — Socket.IO + REST API |
| **Redis** | **6379** | BARU — Cache, Pub/Sub, Queue |

---

## 7. Cara Menjalankan (Step by Step)

### Prasyarat
- ✅ Docker Desktop sudah terinstall (sudah dikonfirmasi)
- ✅ Docker Desktop harus **running** (buka app Docker Desktop)

### Langkah 1: Jalankan Redis + WS Server

```bash
# Buka terminal BARU di folder project kawanbelanja
cd c:\Putra\Ngoding AntiGravity\set-ecomerce\kawanbelanja

# Jalankan semua container
docker compose up --build
```

> **Apa yang terjadi saat `docker compose up`?**
> 1. Docker download image `redis:7-alpine` (±30MB, hanya pertama kali)
> 2. Docker build image `ws-server` dari Dockerfile kita
> 3. Redis start di port 6379
> 4. WS Server start di port 3001
> 5. Anda akan melihat log: `[WS-SERVER] Running on port 3001`
> 6. Dan log: `[WS-SERVER] Connected to Redis`

### Langkah 2: Jalankan Next.js (seperti biasa)

```bash
# Di terminal lain (yang sudah ada)
bun dev
```

### Langkah 3: Test Koneksi WebSocket

Buka browser → Console (F12) → ketik:

```javascript
const socket = io("http://localhost:3001", { 
  auth: { sessionToken: "test" } 
})
socket.on("connect", () => console.log("✅ WebSocket Connected!"))
socket.on("connect_error", (err) => console.log("❌ Error:", err.message))
```

Jika muncul `✅ WebSocket Connected!` → Phase 1 berhasil!

### Langkah 4: Stop Semua Container

```bash
# Tekan Ctrl+C di terminal docker compose
# Atau jalankan:
docker compose down
```

---

## 8. Penjelasan Setiap File di ws-server/

### `ws-server/package.json`
Daftar dependency (pustaka) yang dibutuhkan WS Server:
- `socket.io` — Library WebSocket untuk Node.js
- `ioredis` — Client Redis untuk Node.js
- `@socket.io/redis-adapter` — Jembatan antara Socket.IO dan Redis (untuk scaling)
- `express` — Mini HTTP server untuk REST endpoint `/emit`
- `pg` — PostgreSQL client (untuk verifikasi session user)

### `ws-server/Dockerfile`
Resep Docker untuk membangun container WS Server. Menggunakan Node.js 22
versi Alpine (ringan, ±50MB).

### `ws-server/src/index.js`
File utama yang:
1. Membuat HTTP server + Socket.IO
2. Connect ke Redis dan pasang Redis Adapter
3. Setup namespace `/chat` dan `/notifications`
4. Setup REST endpoint `POST /emit` untuk menerima trigger dari Next.js
5. Verifikasi setiap koneksi WebSocket via session database

### `ws-server/src/auth.js`
Modul autentikasi yang:
1. Menerima `sessionToken` dari cookie browser
2. Query tabel `session` di PostgreSQL
3. Jika valid → izinkan koneksi, kembalikan data user
4. Jika tidak valid → tolak koneksi

### `ws-server/src/namespaces/chat.js`
Handler untuk fitur chat:
- `join-conversation` — User masuk ke "ruang chat" tertentu
- `send-message` — Kirim pesan ke semua orang di ruang yang sama
- `typing` — Notifikasi "sedang mengetik..."
- `leave-conversation` — Keluar dari ruang chat

### `ws-server/src/namespaces/notifications.js`
Handler untuk notifikasi real-time:
- Setiap user yang login otomatis join room `user:{userId}`
- Setiap seller otomatis join room `store:{storeId}`
- Event yang bisa diterima: `new-order`, `order-status-changed`, `new-message`

### `ws-server/src/api/emit.js`
REST endpoint yang HANYA boleh dipanggil oleh Next.js (dilindungi secret key).
Next.js mengirim request ke sini setiap kali ada event penting, contoh:

```
POST http://localhost:3001/emit
Header: x-ws-secret: kawanbelanja-ws-secret-2026
Body: {
  "namespace": "notifications",
  "room": "store:5",
  "event": "new-order",
  "data": { "orderId": 123, "buyerName": "Putra" }
}
```

WS Server akan meneruskan data ini ke semua client yang terhubung di room `store:5`.

---

## 9. Cara Kerja Komunikasi Next.js ↔ WebSocket

### Contoh: Pembeli Bayar → Seller Dapat Notifikasi

```
1. Pembeli klik "Bayar" di checkout
   │
2. Midtrans proses pembayaran
   │
3. Midtrans kirim webhook ke Next.js:
   POST /api/midtrans/notification/payment
   │
4. Next.js update database (status: paid)
   │
5. Next.js panggil WS Server via helper `wsEmit()`:
   POST http://localhost:3001/emit
   {
     namespace: "notifications",
     room: "store:5",
     event: "new-order",
     data: { orderId: 42, total: 139000 }
   }
   │
6. WS Server terima dan broadcast ke room "store:5"
   │
7. Browser seller (yang sedang buka dashboard)
   menerima event "new-order"
   │
8. UI seller otomatis muncul notifikasi:
   "🔔 Pesanan baru dari Putra — Rp 139.000"
```

### Contoh: Chat Real-Time

```
1. Pembeli ketik pesan "Stok masih ada kak?"
   │
2. Browser kirim via WebSocket:
   socket.emit("send-message", { conversationId: 1, body: "Stok masih ada kak?" })
   │
3. WS Server terima → panggil Next.js Server Action (atau simpan langsung ke DB)
   │
4. WS Server broadcast ke room "conversation:1"
   │
5. Browser seller (yang buka halaman chat)
   menerima event "new-message"
   │
6. Pesan langsung muncul di layar seller tanpa refresh
```

---

## 10. Troubleshooting

### "docker compose up" error: port already in use
Redis default port 6379 mungkin sudah dipakai. Solusi:
```bash
# Cek apa yang pakai port 6379
netstat -aon | findstr :6379
# Kill process tersebut atau ganti port di docker-compose.yml
```

### "Cannot connect to WebSocket server"
1. Pastikan Docker Desktop **sedang running** (cek icon di system tray)
2. Pastikan `docker compose up` sudah dijalankan
3. Cek log: `docker compose logs ws-server`

### "Authentication failed" saat connect WebSocket
1. Pastikan Anda sudah login di Kawan Belanja (ada session di database)
2. Cek apakah `DATABASE_URL` di docker-compose.yml sama dengan yang di `.env`

### "Redis connection refused"
Redis belum start. Jalankan `docker compose up` dan tunggu sampai muncul
log `[WS-SERVER] Connected to Redis`.

---

## Referensi Belajar

- **Socket.IO Docs:** https://socket.io/docs/v4/
- **Redis Docs:** https://redis.io/docs/
- **BullMQ Docs:** https://docs.bullmq.io/
- **Docker Compose Docs:** https://docs.docker.com/compose/

---

## Phase 2: Chat Real-Time ✅ SELESAI

> Phase ini telah selesai diimplementasikan. Semua fitur di bawah sudah berjalan.

### File yang Ditambah/Dimodifikasi

| File | Fungsi | Status |
|------|--------|--------|
| `src/actions/public/chat.actions.js` | Server Actions: CRUD conversations & messages, unread count | ✅ |
| `src/hooks/use-socket.js` | Custom React hook untuk koneksi Socket.IO client | ✅ |
| `src/features/public/chat-view.jsx` | UI chat lengkap (sidebar + room chat + real-time) | ✅ |
| `src/app/(public)/chat/page.jsx` | Server component: extract session token dari cookie | ✅ |
| `src/features/public/navbar.jsx` | Badge unread chat di icon 💬 navbar | ✅ |
| `src/features/public/product/product-detail.jsx` | Kirim product context saat buka chat dari produk | ✅ |
| `src/components/layout/seller-dashboard/seller-nav-main.jsx` | Badge unread chat di sidebar seller | ✅ |
| `src/app/(protected)/user-dashboard/layout.jsx` | Badge unread chat di sidebar user | ✅ |
| `src/config/db/schema/conversation-schema.js` | Tambah kolom product context ke tabel conversations | ✅ |
| `ws-server/src/namespaces/chat.js` | Auto-join user room + typing indicator | ✅ |

### Alur Chat Real-Time (Lengkap)

```
1. User buka /chat
   │
2. page.jsx (Server Component):
   ├── Baca session dari Better Auth cookie
   ├── Extract session token: split(".")[0] (hapus CSRF signature)
   └── Kirim ke <ChatView sessionToken="..." currentUserId="..." />

3. ChatView mount:
   ├── useQuery("chat-conversations") → getMyConversations() → PostgreSQL
   ├── useSocket("/chat", { sessionToken }) → connect Socket.IO ke WS Server
   └── WS Server:
       ├── Verifikasi token → query tabel session PostgreSQL
       ├── Auto-join room: user:{userId} (untuk notifikasi sidebar)
       └── Status: "connected" / "rejected"

4. User klik conversation:
   ├── useQuery("chat-messages", convId) → getConversationMessages(convId)
   ├── socket.emit("join-conversation", { conversationId })
   └── Product context ditampilkan dari DB (buyer & seller sama-sama lihat)

5. User kirim pesan:
   ├── Optimistic update (3 tempat sekaligus):
   │   ├── Bubble chat → langsung muncul (opacity 70%)
   │   ├── Sidebar lastMessage → langsung berubah via setQueryData
   │   └── Conversation di-sort ke atas
   ├── sendMessage(convId, body) → simpan ke PostgreSQL
   ├── wsEmit("chat", "conversation:X", "new-message", data) → broadcast ke room
   ├── wsEmit("chat", "user:receiverId", "sidebar-update", data) → update sidebar lawan
   └── wsEmit("chat", "user:senderId", "sidebar-update", data) → update sidebar sendiri

6. Lawan bicara menerima:
   ├── socket.on("new-message") → tambah ke localMessages (deduplicated)
   ├── socket.on("sidebar-update") → setQueryData langsung (optimistic)
   ├── Unread badge di navbar di-increment via setQueryData
   ├── BroadcastChannel("kawanbelanja-chat") → navbar di halaman lain juga update
   └── Delayed refetch (2 detik) sebagai backup sync dari server
```

### Fitur yang Sudah Implementasi

#### 1. Dual Perspective (Buyer & Seller)

Chat mendukung **dua perspektif** dalam satu halaman yang sama:

| Perspektif | Daftar Chat | Header Chat | Identifikasi |
|---|---|---|---|
| **Sebagai Buyer** | Tampil nama toko + logo toko | Nama toko + badge Star | `conv.isSeller = false` |
| **Sebagai Seller** | Tampil nama pembeli + foto pembeli | Nama pembeli + badge "Pembeli" | `conv.isSeller = true` |

User yang punya toko akan melihat **kedua jenis chat** di sidebar (chat ke toko lain + chat dari pembeli ke toko mereka).

#### 2. Pinned Product Context (Buyer & Seller)

Saat buyer klik "Chat" dari halaman detail produk:
- Product context (nama, gambar, harga) disimpan ke **database** (tabel `conversations`)
- Kolom: `product_id`, `product_name`, `product_image`, `product_price`
- Tampil sebagai **pinned card** di atas area chat — untuk **kedua pihak** (buyer & seller)
- Seller bisa tahu produk mana yang ditanyakan buyer

```
┌─────────────────────────────────┐
│ 📦 Product A          Rp 1.000 │  ← Pinned product card
├─────────────────────────────────┤
│                                 │
│   Halo kak, ini ready?    23:07 │  ← Pesan dari buyer
│                                 │
│              Ready kak!   23:08 │  ← Pesan dari seller
│                                 │
└─────────────────────────────────┘
```

#### 3. Sidebar Real-Time Update (Optimistic Cache)

**Masalah sebelumnya:** Sidebar menampilkan lastMessage yang sudah lama/beda dari isi chat.

**Solusi:** Menggunakan `queryClient.setQueryData()` untuk **langsung update cache React Query**:

```javascript
// Saat kirim pesan → sidebar langsung update
queryClient.setQueryData(["chat-conversations"], (old) => {
  const updated = old.data.map(conv =>
    conv.id === activeConvId
      ? { ...conv, lastMessage: body, lastTime: "Baru saja" }
      : conv
  )
  // Conversation terbaru di atas
  updated.sort((a, b) => a.id === activeConvId ? -1 : b.id === activeConvId ? 1 : 0)
  return { ...old, data: updated }
})
```

**Penting:** `invalidateQueries` di-delay 2 detik agar tidak menimpa optimistic update:

```javascript
// ❌ SALAH — langsung refetch menimpa optimistic data
queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })

// ✅ BENAR — delay 2 detik sebagai backup sync
setTimeout(() => {
  queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
}, 2000)
```

#### 4. Unread Chat Badge (Navbar + Sidebar)

Badge angka unread chat muncul di 3 tempat:

| Lokasi | Mekanisme Update |
|--------|------------------|
| **Navbar icon 💬** | `useQuery("chat-unread-count")` + `BroadcastChannel` dari halaman chat |
| **Seller sidebar "Chat"** | `useQuery("chat-unread-count")` + polling 10 detik |
| **User dashboard sidebar "Chat"** | `useQuery("chat-unread-count")` + polling 10 detik |

**BroadcastChannel** digunakan agar halaman chat bisa memberi tahu navbar (yang tidak punya socket) untuk update badge:

```javascript
// Di chat-view.jsx: broadcast saat terima pesan baru
const channel = new BroadcastChannel('kawanbelanja-chat')
channel.postMessage({ type: 'unread-update' })

// Di navbar.jsx: listen broadcast
const channel = new BroadcastChannel('kawanbelanja-chat')
channel.onmessage = (event) => {
  if (event.data?.type === 'unread-update') {
    queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] })
  }
}
```

#### 5. Typing Indicator

Saat user mengetik, lawan bicara melihat "sedang mengetik..." di bawah nama:

```
┌─ Chat Header ──────────────────┐
│ 👤 Kawan Belanja               │
│ 🟢 sedang mengetik...          │  ← Animasi pulse hijau
└────────────────────────────────┘
```

Mekanisme:
- Client emit `socket.emit("typing", { conversationId, isTyping: true/false })`
- Server broadcast `user-typing` ke semua member room kecuali pengirim
- Auto-stop setelah 2 detik tidak ada keystroke

#### 6. Online/Offline Status

- **Online:** Socket.IO connected → tampil "Online" + dot hijau
- **Offline:** Socket.IO disconnected → tampil "Offline"
- Auto-reconnect saat koneksi kembali

#### 7. Better Auth Token Extraction

Better Auth menyimpan cookie `better-auth.session_token` dengan format:
```
tokenABC123.csrfSignature456
```

Di database, hanya `tokenABC123` yang disimpan. Fix:
```javascript
const rawCookieValue = cookieStore.get("better-auth.session_token")?.value
const sessionToken = rawCookieValue?.split(".")[0]  // ← Ambil bagian sebelum titik
```

### Cara Test Chat

1. Buka 2 browser (atau 1 browser + 1 incognito)
2. Login sebagai user berbeda di masing-masing
3. User A buka halaman produk → klik "Chat" di section toko
4. Otomatis redirect ke `/chat?conv=X&productId=Y&...`
5. Kirim pesan → pesan harus muncul di kedua browser secara real-time!
6. Cek sidebar: lastMessage harus langsung update
7. Cek navbar: badge angka harus bertambah
8. Cek seller dashboard sidebar: badge "Chat" harus bertambah
9. Cek pinned product card: harus muncul di **kedua** sisi (buyer & seller)

### Database Schema (Update)

Tabel `conversations` sekarang punya kolom tambahan:

```sql
ALTER TABLE conversations
  ADD COLUMN product_id INTEGER,
  ADD COLUMN product_name TEXT,
  ADD COLUMN product_image TEXT,
  ADD COLUMN product_price INTEGER;
```

---

## Phase 3: Real-Time Events dari Webhook ⏳ BELUM DIMULAI

> Phase ini memanfaatkan **webhook yang sudah jalan** (Biteship & Midtrans)
> untuk men-trigger event real-time ke browser user/seller.

### Tujuan

Saat ini, setelah pembayaran berhasil atau kurir update status, user harus
**refresh halaman** untuk melihat perubahan. Phase 3 akan membuat semua
perubahan status **langsung muncul tanpa refresh**.

### Yang Akan Diimplementasi

#### 3.1 Notifikasi Pesanan Baru untuk Seller

**Trigger:** Midtrans webhook `settlement` (pembayaran berhasil)

```
Buyer bayar → Midtrans webhook → Update DB → wsEmit ke seller
                                                    ↓
                              Seller dashboard: 🔔 lonceng berkedip
                              + toast: "Pesanan baru dari Kawan Belanja"
                              + sound: ding!
```

**File yang dimodifikasi:**
- `src/app/api/midtrans/notification/payment/route.js` — tambah `wsEmit` setelah update DB
- `src/features/seller-dashboard/` — tambah listener notifikasi

#### 3.2 Update Status Pengiriman Real-Time untuk Buyer

**Trigger:** Biteship webhook (status kurir berubah)

```
Kurir pickup → Biteship webhook → Update DB → wsEmit ke buyer
                                                    ↓
                              Halaman pesanan buyer: status langsung berubah
                              "Dikirim" → "Dalam Pengiriman" → "Sampai"
```

**File yang dimodifikasi:**
- `src/app/api/biteship/webhook/route.js` — tambah `wsEmit` setelah update status
- `src/app/(protected)/user-dashboard/orders/` — tambah socket listener

#### 3.3 Notifikasi Resi Input oleh Seller

**Trigger:** Seller klik "Proses Pesanan" / "Input Resi"

```
Seller input resi → Update DB → wsEmit ke buyer
                                      ↓
                  Buyer: toast "Pesanan Anda sedang diproses!"
                  + halaman pesanan update otomatis
```

**File yang dimodifikasi:**
- `src/actions/seller-dashboard/order.actions.js` — tambah `wsEmit`
- Client-side listener di halaman pesanan buyer

#### 3.4 Notifikasi Umum (Navbar Bell Icon)

Semua notifikasi dikumpulkan di icon 🔔 navbar:

| Event | Target | Pesan |
|---|---|---|
| Pesanan baru masuk | Seller | "Pesanan baru dari {buyer} — Rp {total}" |
| Pembayaran berhasil | Buyer | "Pembayaran Anda berhasil — pesanan diproses" |
| Pesanan dikirim | Buyer | "Pesanan Anda sedang dikirim — resi: {awb}" |
| Pesanan sampai | Buyer | "Pesanan Anda sudah sampai — beri review!" |
| Review masuk | Seller | "Review baru ⭐{rating} dari {buyer}" |

### Arsitektur Phase 3

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Biteship │────►│  Next.js API │────►│  WS Server   │────►│ Browser  │
│ Midtrans │     │  (Webhook)   │     │  /emit REST  │     │ (Socket) │
└──────────┘     └──────────────┘     └──────────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────────┐
                 │  PostgreSQL  │
                 │  (update DB) │
                 └──────────────┘
```

**Prinsip:** Webhook → Update DB dulu → Baru trigger WS event.
Ini memastikan data selalu konsisten antara DB dan UI.

### Estimasi Perubahan

| Komponen | Perkiraan |
|---|---|
| Webhook modifications (Biteship + Midtrans) | ~30 baris per file |
| Notification bell UI + listener | Komponen baru |
| Seller dashboard notification panel | Komponen baru |
| Buyer order detail real-time listener | ~20 baris |

### Prasyarat

- ✅ Phase 1 (Docker + WS Server) — sudah selesai
- ✅ Phase 2 (Chat Real-Time) — sudah selesai
- ✅ WS Server `/emit` REST endpoint — sudah ada dan berfungsi
- ✅ Webhook Biteship & Midtrans — sudah jalan

---

## Phase 4: Redis Caching & Background Jobs ✅ SELESAI

> Phase ini menggunakan Redis untuk cache data yang sering diakses
> dan BullMQ untuk background job scheduling.

### Arsitektur Phase 4

```
┌────────────────────────────────────────────────────────────────┐
│                    NEXT.JS (Server Actions)                     │
│                                                                 │
│   cached("categories:all", queryFn, 3600)                       │
│     ↓                                                           │
│   ┌──────────────────┐    Cache MISS?    ┌──────────────────┐  │
│   │  Redis Cache      │ ──────────────── │  PostgreSQL DB    │  │
│   │  (ioredis)        │ ◄── store result │                   │  │
│   │                   │                  └──────────────────┘  │
│   │  TTL auto-expire  │                                        │
│   └──────────────────┘                                         │
│                                                                 │
│   scheduleAutoComplete(orderId)                                 │
│     ↓ POST /jobs/schedule                                       │
│   ┌──────────────────┐    delayed job    ┌──────────────────┐  │
│   │  WS Server        │ ──────────────── │  BullMQ Worker    │  │
│   │  REST API         │                  │  (7 hari / 24 jam)│  │
│   └──────────────────┘                   └────────┬─────────┘  │
│                                                    │             │
│                                          ┌────────▼─────────┐  │
│                                          │  PostgreSQL DB    │  │
│                                          │  (update order)   │  │
│                                          └──────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Redis Cache — File & Konfigurasi

| File | Fungsi |
|---|---|
| `src/lib/redis.js` | Redis client singleton (ioredis) untuk Next.js |
| `src/lib/cache.js` | Cache helper: `cached()`, `invalidateCache()`, `invalidateCachePattern()` |

### Data yang Di-cache

| Data | Key | TTL | File |
|---|---|---|---|
| Daftar kategori | `categories:all` | 1 jam | `product.actions.js` → `getCategories()` |
| Platform fee config | `platform:fee-config` | 1 jam | `checkout.actions.js` → `getPlatformFeeConfig()` |
| Payment methods | `platform:payment-methods` | 1 jam | `checkout.actions.js` → `getPaymentMethodsConfig()` |
| Ongkir Biteship | `ongkir:{origin}:{dest}:{weight}:{couriers}` | 30 menit | `biteship.actions.js` → `getBiteshipRates()` |

### Pola Cache (Cache-Aside Pattern)

```javascript
import { cached, invalidateCache } from "@/lib/cache"

// 1. Baca data — otomatis cek Redis dulu
const data = await cached("key", async () => {
  return await db.select().from(table)  // Hanya dipanggil jika cache MISS
}, 3600)  // TTL 1 jam

// 2. Hapus cache saat data berubah
await invalidateCache("key")

// 3. Hapus banyak cache sekaligus
await invalidateCachePattern("ongkir:*")
```

### Graceful Degradation

Jika Redis mati atau tidak tersedia:
- ❌ Cache tidak jalan
- ✅ App TETAP berfungsi normal (fallback ke query DB langsung)
- ✅ Tidak ada error/crash

---

### BullMQ Background Jobs — File & Konfigurasi

| File | Fungsi |
|---|---|
| `ws-server/src/jobs/worker.js` | BullMQ worker + queue + job processors |
| `ws-server/src/api/jobs.js` | REST API: `POST /jobs/schedule`, `GET /jobs/stats` |
| `src/lib/jobs.js` | Next.js helper: `scheduleAutoComplete()`, `scheduleExpirePayment()`, `cancelExpirePayment()` |

### Daftar Jobs

| Job | Trigger | Delay | Action |
|---|---|---|---|
| `auto-complete` | Biteship webhook `delivered` | **7 hari** | Order → `completed`, saldo seller ditambah, soldCount di-increment |
| `expire-payment` | Payment dibuat (Snap/Core API) | **24 jam** | Payment → `expired`, order → `cancelled`, stok dikembalikan |
| `cancel-expire-payment` | Payment berhasil (settlement) | Instant | Hapus scheduled expire job agar tidak dieksekusi |

### Alur Auto-Complete Order

```
1. Biteship webhook "delivered"
   └→ src/app/api/biteship/webhook/route.js
      └→ import("@/lib/jobs").scheduleAutoComplete(orderId)
         └→ POST http://ws-server:3001/jobs/schedule
            └→ BullMQ: orderQueue.add("auto-complete", { orderId }, { delay: 7 hari })

2. Setelah 7 hari berlalu...
   └→ BullMQ Worker memproses job
      └→ Cek: order.status masih "shipped"?
         ├→ Ya: UPDATE orders SET status='completed', tambah saldo seller
         └→ Tidak: Skip (buyer sudah konfirmasi manual)
```

### Alur Expire Payment

```
1. User checkout → createPaymentTransaction()
   └→ import("@/lib/jobs").scheduleExpirePayment(paymentId, orderId)
      └→ BullMQ: paymentQueue.add("expire-payment", { delay: 24 jam })

2. Skenario A: User BAYAR dalam 24 jam
   └→ Midtrans webhook "settlement"
      └→ cancelExpirePayment(paymentId)  ← Hapus scheduled job
      └→ Order berjalan normal

3. Skenario B: User TIDAK BAYAR dalam 24 jam
   └→ BullMQ Worker memproses job
      └→ UPDATE payments SET status='expired'
      └→ UPDATE orders SET status='cancelled'
      └→ Kembalikan stok produk
```

---

### Cara Melihat Status Queue

```bash
# Dari terminal (perlu WS_SECRET)
curl -H "x-ws-secret: kawanbelanja-ws-secret-2026" http://localhost:3001/jobs/stats

# Output:
{
  "orders": { "waiting": 0, "active": 0, "completed": 5, "failed": 0, "delayed": 2 },
  "payments": { "waiting": 0, "active": 0, "completed": 10, "failed": 0, "delayed": 3 }
}
```

---

## Progress Keseluruhan

| Phase | Deskripsi | Status |
|---|---|---|
| **Phase 1** | Docker Compose + Redis + WS Server Foundation | ✅ Selesai |
| **Phase 2** | Chat Real-Time (WebSocket + optimistic UI) | ✅ Selesai |
| **Phase 3** | Real-Time Events dari Webhook (notifikasi, sound, badge) | ✅ Selesai |
| **Phase 4** | Redis Caching & Background Jobs (BullMQ) | ✅ Selesai |


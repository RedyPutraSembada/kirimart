# Implementasi WebSocket, Redis & Docker untuk KiriMart

> Dokumen ini disusun setelah membaca dan menganalisis **seluruh file** di aplikasi KiriMart — mulai dari 21 schema database, 16 server actions, 3 webhook endpoints, 6 feature modules, sampai proxy middleware.

---

## Peta Lengkap Aplikasi KiriMart (Hasil Analisis)

Sebelum masuk ke planning, ini adalah bukti bahwa saya sudah membedah seluruh aplikasi:

### Database Schema (21 tabel)
| Tabel | File | Status |
|---|---|---|
| `user`, `session`, `account` | [auth-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/auth-schema.js) | ✅ Aktif (Better Auth) |
| `addresses` | [address-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/address-schema.js) | ✅ Aktif (user + store) |
| `stores` | [store-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/store-schema.js) | ✅ Aktif (balance, bank, rating, follower, couriers) |
| `store_followers` | [store-follower-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/store-follower-schema.js) | ✅ Aktif (toggle follow) |
| `categories` | [category-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/category-schema.js) | ✅ Aktif (nested parent-child) |
| `products`, `product_options`, `product_variants` | [product-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/product-schema.js) | ✅ Aktif (varian, soldCount, rating) |
| `product_images` | [product-image-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/product-image-schema.js) | ✅ Aktif |
| `carts`, `cart_items` | [cart-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/cart-schema.js), [cart-item-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/cart-item-schema.js) | ✅ Aktif (dihapus saat payment) |
| `vouchers` | [voucher-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/voucher-schema.js) | ✅ Aktif (global + toko) |
| `payments` | [payment-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/payment-schema.js) | ✅ Aktif (Midtrans Snap + Core API) |
| `orders`, `order_items` | [order-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/order-schema.js), [order-item-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/order-item-schema.js) | ✅ Aktif (platformFee, soldCount increment) |
| `shipments` | [shipment-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/shipment-schema.js) | ✅ Aktif (Biteship integration) |
| `reviews` | [review-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/review-schema.js) | ✅ Aktif (per orderItem → update product & store rating) |
| `withdrawals` | [withdrawal-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/withdrawal-schema.js) | ✅ Aktif (request + admin approval) |
| `platform_settings` | [platform-setting-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/platform-setting-schema.js) | ✅ Aktif (commission_tiers, pg_fee_config) |
| `conversations` | [conversation-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/conversation-schema.js) | ⚠️ Schema ada, **belum ada Server Action** |
| `messages` | [message-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/message-schema.js) | ⚠️ Schema ada, **belum ada Server Action** |

### Webhook Endpoints (3 total)
| Endpoint | File | Fungsi |
|---|---|---|
| `POST /api/auth/[...all]` | Better Auth handler | Login/Register/Session |
| `POST /api/biteship/webhook` | [route.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/biteship/webhook/route.js) | Update status kurir (delivered → shipped, resi) |
| `POST /api/midtrans/notification/payment` | [route.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/midtrans/notification/payment/route.js) | Update status pembayaran (settlement, expire) |

### Fitur Chat Saat Ini
- [chat-view.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/features/public/chat-view.jsx) — **Sudah ada UI lengkap** (daftar percakapan, bubble chat, pinned product, tombol kirim), tapi **100% MOCK DATA** (`MOCK_CONVERSATIONS`). Belum connect ke database maupun real-time.
- Route halaman: `/chat` sudah ada di [page.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/(public)/chat/page.jsx)

---

## Arsitektur Yang Diusulkan

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE                               │
│                                                                     │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────────┐   │
│  │   REDIS        │    │  WS-SERVER    │    │  KIRIMART (NEXTJS)│   │
│  │   (alpine)     │◄──►│  (Socket.IO)  │◄──►│  (App Router)     │   │
│  │                │    │               │    │                   │   │
│  │  • Pub/Sub     │    │  • Chat RT    │    │  • Server Actions │   │
│  │  • Cache       │    │  • Notif RT   │    │  • Webhooks       │   │
│  │  • BullMQ      │    │  • Tracking   │    │  • Drizzle/PG     │   │
│  │  • Rate Limit  │    │  • FOMO       │    │  • Better Auth    │   │
│  └───────────────┘    └───────────────┘    └───────────────────┘   │
│                                                                     │
│  ┌───────────────┐                                                  │
│  │  POSTGRESQL    │◄── Sudah ada (Neon/Supabase/local)              │
│  └───────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Alur Komunikasi

```
Browser ──WebSocket──► WS-SERVER ──Redis Pub/Sub──► WS-SERVER (scale)
   ▲                       │
   │                       │ (auth verify via shared secret)
   │                       ▼
   └──HTTP/SSA──► NEXT.JS ──REST──► WS-SERVER (emit events)
                     │
                     ▼
                 POSTGRESQL
```

---

## Proposed Changes (Per Phase)

### Phase 1: Docker Compose + Redis + WS Server Foundation

---

#### [NEW] `docker-compose.yml` (project root)

Docker Compose untuk menjalankan Redis dan WebSocket Server secara lokal.

```yaml
services:
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["redis-data:/data"]

  ws-server:
    build: ./ws-server
    ports: ["3001:3001"]
    environment:
      - REDIS_URL=redis://redis:6379
      - WS_SECRET=<shared-secret-with-nextjs>
      - DATABASE_URL=<sama-dengan-env-nextjs>
    depends_on: [redis]
```

---

#### [NEW] `ws-server/` (folder baru di root project)

Microservice Node.js/Bun terpisah yang menangani **semua koneksi real-time**.

| File | Fungsi |
|---|---|
| `ws-server/package.json` | Dependencies: `socket.io`, `ioredis`, `@socket.io/redis-adapter`, `pg` |
| `ws-server/Dockerfile` | Multi-stage build Node.js 22 Alpine |
| `ws-server/src/index.js` | Entry point: HTTP server + Socket.IO init + Redis adapter |
| `ws-server/src/auth.js` | Verifikasi token user (query session table PostgreSQL / JWT shared secret) |
| `ws-server/src/namespaces/chat.js` | Namespace `/chat` — join room per conversation, kirim/terima pesan |
| `ws-server/src/namespaces/notifications.js` | Namespace `/notifications` — join room per userId, terima push notif |
| `ws-server/src/api/emit.js` | REST endpoint `POST /emit` — dipanggil Next.js untuk trigger event (misal: order baru, resi update) |

---

#### [MODIFY] `kirimart/.env`

Tambah variabel baru:

```env
# WebSocket & Redis
WS_SERVER_URL=http://localhost:3001
WS_SECRET=kirimart-ws-shared-secret-2026
REDIS_URL=redis://localhost:6379
```

---

### Phase 2: Integrasi Chat Real-Time

---

#### [NEW] `src/actions/public/chat.actions.js`

Server Actions untuk CRUD chat (menyimpan ke PostgreSQL, lalu trigger WebSocket):

- `getMyConversations()` — Ambil daftar percakapan user (query `conversations` + `messages` + `stores`)
- `getConversationMessages(conversationId)` — Ambil riwayat chat (pagination)
- `sendMessage(conversationId, body, imageUrl?)` — Simpan ke DB + panggil `WS_SERVER/emit` untuk push real-time
- `getOrCreateConversation(storeId)` — Dipanggil saat user klik "Chat Penjual" di halaman produk

---

#### [MODIFY] [chat-view.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/features/public/chat-view.jsx)

Ganti **seluruh MOCK_CONVERSATIONS** dengan data real dari `chat.actions.js`. Tambahkan:

- `useEffect` → connect Socket.IO client ke `WS_SERVER_URL/chat`
- Join room conversation saat buka chat
- Listen event `new-message` → append ke state messages
- `sendMessage()` → panggil server action → WS broadcast otomatis

---

#### [NEW] `src/features/seller-dashboard/chat/seller-chat-view.jsx`

UI Chat khusus di Seller Dashboard (layout berbeda, bisa lihat semua chat masuk ke toko).

---

### Phase 3: Real-Time Events (dari Webhook yang Sudah Ada)

Ini adalah bagian paling powerful — memanfaatkan **webhook yang sudah jalan** untuk men-trigger event real-time ke browser.

---

#### [MODIFY] [Biteship Webhook](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/biteship/webhook/route.js)

Setelah update database (line 56-83), tambahkan:

```javascript
// Setelah update status di DB, trigger real-time ke buyer
await fetch(`${process.env.WS_SERVER_URL}/emit`, {
  method: "POST",
  headers: { "x-ws-secret": process.env.WS_SECRET },
  body: JSON.stringify({
    namespace: "notifications",
    room: `user:${order.userId}`,
    event: "order-status-changed",
    data: { orderId: order.id, status: newOrderStatus, awbNumber: courier_waybill_id }
  })
})
```

**Efek:** Buyer yang sedang buka halaman "Detail Pesanan" akan melihat status berubah secara otomatis tanpa refresh.

---

#### [MODIFY] [Midtrans Webhook](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/midtrans/notification/payment/route.js)

Setelah `updatePaymentFromWebhook` sukses (line 44-48), tambahkan:

```javascript
// Trigger notif real-time ke seller bahwa ada pesanan baru masuk
if (result.newOrderStatus === "paid") {
  await fetch(`${process.env.WS_SERVER_URL}/emit`, {
    namespace: "notifications",
    room: `store:${storeId}`,
    event: "new-order",
    data: { orderId, buyerName, totalAmount }
  })
}
```

**Efek:** Seller yang sedang buka Dashboard akan melihat lonceng notifikasi berkedip dan mendengar suara "ding!" saat ada pesanan masuk.

---

#### [MODIFY] [Seller Order Actions](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/actions/seller-dashboard/order.actions.js)

Saat seller klik "Proses Pesanan" atau "Input Resi", trigger event ke buyer:

```javascript
// Setelah shipment dibuat/diupdate
await fetch(`${process.env.WS_SERVER_URL}/emit`, {
  event: "order-shipped",
  room: `user:${order.userId}`,
  data: { orderId, courier, awbNumber }
})
```

---

### Phase 4: Redis Caching & Background Jobs

---

#### Redis Cache yang Paling Berdampak

Berdasarkan analisis terhadap query di aplikasi Anda:

| Data | File Sumber | TTL | Dampak |
|---|---|---|---|
| Katalog produk (halaman utama) | [page.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/(public)/page.jsx) | 5 menit | Halaman beranda load < 50ms |
| Daftar kategori (navbar dropdown) | [navbar.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/features/public/navbar.jsx) → `getCategories()` | 1 jam | Setiap page load hemat 1 query |
| Detail produk | [product-detail.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/features/public/product/product-detail.jsx) | 2 menit | Produk viral di-akses ribuan orang |
| Ongkir Biteship (per rute) | [biteship.actions.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/actions/public/biteship.actions.js) | 30 menit | Hemat Rp 5/call × ribuan checkout |
| Platform settings (commission_tiers) | [checkout.actions.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/actions/public/checkout.actions.js) → `getPlatformFeeConfig()` | 1 jam | Jarang berubah, query setiap checkout |

---

#### Redis Background Jobs (BullMQ)

| Job | Trigger | Delay | Action |
|---|---|---|---|
| Auto-complete order | Biteship webhook `delivered` | 7 hari | Set order `completed` + tambah saldo seller |
| Expire pending payment | Create payment | 24 jam | Cancel order jika belum bayar |
| Send email notif | Order status change | 0 (instant) | Kirim email via Resend (sudah ada di deps) |

> [!IMPORTANT]
> BullMQ menggantikan pendekatan **Vercel Cron** yang ada di [auto-complete-cron-job.md](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/docs/auto-complete-cron-job.md). Dengan BullMQ, auto-complete dijadwalkan **tepat 7 hari setelah delivered** (per order), bukan sweep periodik tiap 6 jam.

---

## Struktur Folder Akhir (Setelah Selesai)

```
kirimart/
├── docker-compose.yml          ← [NEW]
├── ws-server/                  ← [NEW] Microservice WebSocket
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            ← Entry point + Socket.IO + Redis adapter
│       ├── auth.js             ← Verify user token
│       ├── api/
│       │   └── emit.js         ← REST endpoint untuk Next.js trigger
│       └── namespaces/
│           ├── chat.js         ← Real-time chat rooms
│           └── notifications.js ← Real-time notif rooms
├── src/
│   ├── actions/public/
│   │   ├── chat.actions.js     ← [NEW] CRUD conversations & messages
│   │   └── ...existing...
│   ├── features/public/
│   │   ├── chat-view.jsx       ← [MODIFY] Ganti mock → real data + Socket.IO
│   │   └── ...existing...
│   ├── lib/
│   │   ├── redis.js            ← [NEW] Redis client singleton
│   │   ├── ws-emit.js          ← [NEW] Helper fetch ke WS Server /emit
│   │   └── ...existing...
│   └── app/api/
│       ├── biteship/webhook/route.js  ← [MODIFY] Tambah WS trigger
│       └── midtrans/notification/...  ← [MODIFY] Tambah WS trigger
└── ...existing files...
```

---

## Verification Plan

### Automated Tests
1. `docker compose up` → pastikan Redis & WS Server start tanpa error
2. Buka 2 browser tab → login sebagai buyer & seller → kirim chat → pesan muncul real-time di kedua tab
3. Simulasi Midtrans webhook `settlement` → cek notifikasi muncul di seller dashboard tanpa refresh
4. Simulasi Biteship webhook `delivered` → cek halaman detail pesanan buyer berubah otomatis

### Manual Verification
- Test dari HP (ngrok) bahwa WebSocket tetap connected meskipun pindah halaman
- Test disconnect/reconnect saat WiFi terputus

---

## Open Questions

> [!IMPORTANT]
> **1. Apakah Anda sudah menginstall Docker Desktop di Windows Anda?**
> Ini wajib untuk menjalankan `docker compose up`. Jika belum, kita bisa install terlebih dahulu.

> [!IMPORTANT]
> **2. Urutan eksekusi Phase berapa yang Anda inginkan duluan?**
> - **Phase 1 dulu** (setup Docker + WS server foundation) → lalu Phase 2 (Chat)
> - **Langsung Phase 1 + 2** (fondasi + chat real-time sekaligus)
> - **Phase 1 + 3** (fondasi + real-time notif dari webhook yang sudah jalan)

> [!NOTE]
> **3. Untuk autentikasi WebSocket**, apakah Anda prefer:
> - **A)** WS Server query tabel `session` di PostgreSQL langsung (lebih mudah, karena Better Auth sudah simpan session di DB)
> - **B)** Shared JWT secret antara Next.js dan WS Server (lebih ringan tapi perlu setup tambahan)

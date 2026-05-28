# Integrasi Midtrans Snap Payment — KiriMart Checkout

Implementasi pembayaran Midtrans Snap pada halaman checkout KiriMart. Menggunakan **data statis/testing** untuk item & ongkir, tapi pembayaran **real sandbox Midtrans**. Semua data checkout disimpan ke `metadata_local` (JSONB), semua response webhook disimpan ke `metadata_pg` (JSONB).

## User Review Required

> [!IMPORTANT]
> **Snap Popup vs Drawer**: Secara teknis, `window.snap.pay()` membuat overlay/iframe sendiri di atas halaman. Kita **tidak bisa** memasukkan Snap di dalam Drawer shadcn karena Snap mengontrol DOM-nya sendiri. Pendekatan yang saya usulkan:
> 1. User klik **"Bayar Sekarang"** → Drawer muncul dari bawah dengan **ringkasan order final + konfirmasi**
> 2. User klik **"Konfirmasi & Bayar"** di dalam Drawer → Drawer tertutup → **Snap popup** langsung muncul
> 3. Ini memberikan UX dua langkah: konfirmasi → pembayaran
>
> Apakah flow ini sesuai? Atau mau langsung Snap popup tanpa Drawer?

> [!IMPORTANT]
> **Environment Variable Naming**: `.env` saat ini menggunakan `CLIENT_KEY`, `SERVER_KEY`, `PAYMENT_URL`, `MERCHANCT_ID` (typo). Saya akan me-rename ke standar yang lebih jelas:
> - `MIDTRANS_SERVER_KEY` (server-side)
> - `MIDTRANS_CLIENT_KEY` (server-side)  
> - `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (client-side, untuk Snap JS)
> - `MIDTRANS_IS_PRODUCTION=false`
>
> Key lama bisa dihapus setelah migrasi. Setuju?

## Open Questions

> [!NOTE]
> **Order ID Format**: Saya usulkan format `KM-{paymentId}-{timestamp}` contoh: `KM-42-1715700000`. Apakah ada preferensi format lain?

> [!NOTE]
> **Static Data Checkout**: Karena belum ada cart system terintegrasi, checkout akan menggunakan mock data yang sudah ada (2 toko, 3 item). Apakah ini OK atau mau ditambahkan data lain?

---

## Proposed Changes

### 1. Database Schema

#### [MODIFY] [payment-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/payment-schema.js)

Memperluas tabel `payments` dengan kolom yang dibutuhkan Midtrans + metadata:

```diff
 export const payments = pgTable("payments", {
   id: serial("id").primaryKey(),
+  orderId: text("order_id").notNull().unique(),       // ID unik untuk Midtrans (KM-42-xxx)
   userId: text("user_id").notNull(),
   totalAmount: integer("total_amount").notNull(),
   status: text("status").notNull().default("pending"),
+  snapToken: text("snap_token"),                       // Token dari Snap API
+  snapRedirectUrl: text("snap_redirect_url"),           // URL redirect Snap
+  midtransTransactionId: text("midtrans_transaction_id"), // Transaction ID dari Midtrans
+  paymentType: text("payment_type"),                    // bank_transfer, gopay, credit_card, dll
+  paymentMethod: text("payment_method"),                // bca, bni, gopay, dll
+  metadataLocal: jsonb("metadata_local"),               // Semua data checkout saat dibuat
+  metadataPg: jsonb("metadata_pg"),                     // Response webhook dari Midtrans
+  expiresAt: timestamp("expires_at"),                   // Batas waktu pembayaran
+  paidAt: timestamp("paid_at"),                         // Waktu pembayaran berhasil
+  createdAt: timestamp("created_at").defaultNow().notNull(),
+  updatedAt: timestamp("updated_at").defaultNow().notNull(),
 })
```

#### [MODIFY] [order-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/order-schema.js)

Tambah timestamp dan catatan:

```diff
 export const orders = pgTable("orders", {
   ...existing columns...
+  notes: text("notes"),
+  createdAt: timestamp("created_at").defaultNow().notNull(),
 })
```

---

### 2. Environment Configuration

#### [MODIFY] [.env](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/.env)

Rename dan tambah env variables Midtrans:

```diff
-# Midtrans
-# PAYMENT_URL=https://app.midtrans.com
-PAYMENT_URL=https://app.sandbox.midtrans.com
-MERCHANCT_ID=G305864633
-CLIENT_KEY=SB-Mid-client-9Jq4qhCOxQTZh3Qh
-SERVER_KEY=SB-Mid-server-3AhBEUoEwfQm91Mr8ijYsmcK
+# Midtrans Payment Gateway
+MIDTRANS_SERVER_KEY=SB-Mid-server-3AhBEUoEwfQm91Mr8ijYsmcK
+MIDTRANS_CLIENT_KEY=SB-Mid-client-9Jq4qhCOxQTZh3Qh
+MIDTRANS_IS_PRODUCTION=false
+MIDTRANS_MERCHANT_ID=G305864633
+NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-9Jq4qhCOxQTZh3Qh
```

#### [MODIFY] [env/index.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/env/index.js)

Tambah validasi Midtrans keys ke t3-env:

```diff
 server: {
   ...existing...
+  MIDTRANS_SERVER_KEY: z.string().min(1),
+  MIDTRANS_CLIENT_KEY: z.string().min(1),
+  MIDTRANS_IS_PRODUCTION: z.string().default("false"),
+  MIDTRANS_MERCHANT_ID: z.string().min(1),
 },
 client: {
   ...existing...
+  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(1),
 },
```

---

### 3. Server Actions (Payment)

#### [NEW] [payment.actions.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/actions/public/payment/payment.actions.js)

Server Actions untuk operasi payment yang menyentuh DB:

| Function | Deskripsi |
|:---------|:----------|
| `createPaymentTransaction(checkoutData)` | Buat record `payments` + `orders` + `order_items` di DB, panggil Midtrans Snap API untuk dapat `snapToken`, simpan semua data ke `metadata_local` |
| `getPaymentByOrderId(orderId)` | Ambil data payment berdasarkan orderId untuk pengecekan status |
| `updatePaymentFromWebhook(notification)` | Dipanggil oleh webhook handler — update status payment, simpan response ke `metadata_pg` |

**Flow `createPaymentTransaction`:**
1. Cek autentikasi (Better Auth session)
2. Validasi data checkout
3. DB Transaction:
   - Insert `payments` (status=pending, metadata_local=semua data)
   - Insert `orders` (1 per toko)
   - Insert `order_items` (per item dengan price snapshot)
4. Generate orderId: `KM-{payment.id}-{timestamp}`
5. Panggil Midtrans Snap API: `snap.createTransaction(params)`
6. Update payment record dengan `snapToken` + `snapRedirectUrl`
7. Return `{ success: true, snapToken, orderId }`

---

### 4. API Routes — Webhook Handlers

Berdasarkan screenshot Midtrans Dashboard, ada **6 URL endpoint** yang perlu disediakan:

#### Webhook Endpoints (Server-to-server dari Midtrans)

| # | Midtrans Field | Route Kita | Method | Fungsi |
|:-:|:---------------|:-----------|:-------|:-------|
| 1 | Payment Notification URL | `/api/midtrans/notification/payment` | POST | ⭐ Utama — menerima update status transaksi (settlement, pending, cancel, expire, refund, dll) |
| 2 | Recurring Notification URL | `/api/midtrans/notification/recurring` | POST | Untuk subscription/recurring payments |
| 3 | Pay Account Notification URL | `/api/midtrans/notification/pay-account` | POST | Untuk GoPay tokenization |

#### Redirect URLs (Browser redirect setelah payment di Snap)

| # | Midtrans Field | Route Kita | Method | Fungsi |
|:-:|:---------------|:-----------|:-------|:-------|
| 4 | Finish Redirect URL | `/checkout/status?status=finish` | GET (page) | Halaman setelah payment berhasil |
| 5 | Unfinish Redirect URL | `/checkout/status?status=unfinish` | GET (page) | Halaman ketika user klik "Kembali" di Snap |
| 6 | Error Redirect URL | `/checkout/status?status=error` | GET (page) | Halaman ketika payment error |

#### File yang Dibuat:

#### [NEW] [route.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/midtrans/notification/payment/route.js)

```
POST /api/midtrans/notification/payment
```
- Terima JSON payload dari Midtrans
- Verifikasi `signature_key` (SHA512)
- Handle semua `transaction_status`: capture, settlement, pending, deny, cancel, expire, refund, partial_refund
- Panggil `updatePaymentFromWebhook()` untuk update DB
- Simpan **seluruh payload** ke `metadata_pg`
- Return HTTP 200

#### [NEW] [route.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/midtrans/notification/recurring/route.js)

```
POST /api/midtrans/notification/recurring
```
- Terima dan log payload
- Simpan ke `metadata_pg` jika ada orderId terkait
- Return HTTP 200 (placeholder, fitur recurring belum digunakan)

#### [NEW] [route.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/midtrans/notification/pay-account/route.js)

```
POST /api/midtrans/notification/pay-account
```
- Terima dan log payload
- Simpan ke `metadata_pg` jika ada orderId terkait
- Return HTTP 200 (placeholder, fitur pay-account belum digunakan)

---

### 5. Checkout Result Page

#### [NEW] [page.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/(public)/checkout/status/page.jsx)

Halaman yang ditampilkan setelah user selesai di Snap popup. Menangani 3 status:

| Query Param | Tampilan |
|:------------|:---------|
| `?status=finish` | ✅ "Pembayaran Berhasil" — dengan link ke order detail |
| `?status=unfinish` | ⏳ "Menunggu Pembayaran" — instruksi untuk menyelesaikan |
| `?status=error` | ❌ "Pembayaran Gagal" — dengan opsi coba lagi |

---

### 6. Frontend — Snap JS & Checkout Integration

#### [MODIFY] [layout.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/layout.jsx)

Load Midtrans Snap JS script via `next/script`:

```diff
+import Script from "next/script"

 export default function RootLayout({ children }) {
   return (
     <html ...>
       <body ...>
         <Providers>{children}</Providers>
+        <Script
+          src={`https://app.sandbox.midtrans.com/snap/snap.js`}
+          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
+          strategy="lazyOnload"
+        />
       </body>
     </html>
   )
 }
```

#### [MODIFY] [checkout-view.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/features/public/checkout/checkout-view.jsx)

Ubah checkout flow dari demo `alert()` menjadi integrasi Midtrans:

**Perubahan utama:**
1. ~~`PAYMENT_METHODS` manual~~ → Hapus selection (Snap handle semua metode pembayaran)
2. Tambah **Drawer konfirmasi** sebelum bayar
3. `handleCheckout()` → panggil `createPaymentTransaction()` server action
4. Setelah dapat `snapToken` → panggil `window.snap.pay(token, callbacks)`
5. Callback `onSuccess/onPending/onError/onClose` → redirect ke `/checkout/status?status=xxx`

**Flow UI:**
```
User klik "Bayar Sekarang"
        ↓
Drawer slide up (ringkasan final)
        ↓
User klik "Konfirmasi & Bayar"
        ↓
Loading state → Server Action berjalan
        ↓
Snap Token received → Drawer tutup
        ↓
Snap Popup muncul (Midtrans native)
        ↓
User bayar di Snap
        ↓
Redirect ke /checkout/status
```

**Catatan**: Section **Metode Pembayaran** di checkout dihapus/disederhanakan karena Snap sudah menyediakan UI lengkap untuk pilih metode pembayaran (VA, GoPay, QRIS, CC, dll). Kita hanya perlu menampilkan badge "Powered by Midtrans" sebagai indikator.

---

### 7. Package Installation

```bash
bun add midtrans-client
```

Library resmi Midtrans untuk Node.js — menangani pembuatan Snap token dan verifikasi.

---

### 8. DB Migration

```bash
bun run db:push
```

Push schema changes ke PostgreSQL (kolom baru di `payments` dan `orders`).

---

## Ringkasan File Changes

| Action | Path | Deskripsi |
|:-------|:-----|:----------|
| MODIFY | `src/config/db/schema/payment-schema.js` | +10 kolom baru termasuk `metadata_local`, `metadata_pg` |
| MODIFY | `src/config/db/schema/order-schema.js` | +2 kolom: `notes`, `createdAt` |
| MODIFY | `.env` | Rename & tambah Midtrans env vars |
| MODIFY | `src/config/env/index.js` | Tambah validasi Midtrans keys |
| **NEW** | `src/actions/public/payment/payment.actions.js` | Server Actions: create, get, update payment |
| **NEW** | `src/app/api/midtrans/notification/payment/route.js` | Webhook: payment notification |
| **NEW** | `src/app/api/midtrans/notification/recurring/route.js` | Webhook: recurring notification |
| **NEW** | `src/app/api/midtrans/notification/pay-account/route.js` | Webhook: pay-account notification |
| **NEW** | `src/app/(public)/checkout/status/page.jsx` | Halaman result setelah pembayaran |
| MODIFY | `src/app/layout.jsx` | Load Snap JS script |
| MODIFY | `src/features/public/checkout/checkout-view.jsx` | Integrasi Snap + Drawer konfirmasi |

**Total: 7 file baru, 5 file dimodifikasi**

---

## Verification Plan

### Automated Tests
- `bun run build` — pastikan tidak ada compile error
- Test API webhook endpoint dengan `curl` mock payload

### Manual Verification
1. Buka halaman `/checkout`
2. Klik "Bayar Sekarang" → Drawer muncul
3. Klik "Konfirmasi & Bayar" → Snap popup muncul (sandbox)
4. Verifikasi record `payments` + `orders` + `order_items` terbuat di database
5. Verifikasi `metadata_local` berisi semua data checkout
6. Cek log di terminal — Snap token berhasil dibuat
7. **(Nanti setelah webhook URL di-set di Dashboard):** Test webhook → verifikasi `metadata_pg` terisi + status updated

### URL yang Perlu Diisi di Midtrans Dashboard (Nanti)

| Field | URL |
|:------|:----|
| Payment Notification URL | `https://{domain}/api/midtrans/notification/payment` |
| Recurring Notification URL | `https://{domain}/api/midtrans/notification/recurring` |
| Pay Account Notification URL | `https://{domain}/api/midtrans/notification/pay-account` |
| Finish Redirect URL | `https://{domain}/checkout/status?status=finish` |
| Unfinish Redirect URL | `https://{domain}/checkout/status?status=unfinish` |
| Error Redirect URL | `https://{domain}/checkout/status?status=error` |

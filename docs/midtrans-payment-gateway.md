# Midtrans Payment Gateway — Dokumentasi Lengkap

> Dokumen ini berisi panduan integrasi **Midtrans** sebagai payment gateway untuk platform **KiriMart**.

---

## Daftar Isi

1. [Apa itu Midtrans?](#1-apa-itu-midtrans)
2. [Dokumentasi Resmi & Dashboard](#2-dokumentasi-resmi--dashboard)
3. [API Keys (Credential)](#3-api-keys-credential)
4. [Base URL — Sandbox vs Production](#4-base-url--sandbox-vs-production)
5. [Snap API vs Core API](#5-snap-api-vs-core-api)
6. [Daftar Endpoint API](#6-daftar-endpoint-api)
7. [Webhook (Notification URL)](#7-webhook-notification-url)
8. [Verifikasi Signature Key](#8-verifikasi-signature-key)
9. [Metode Pembayaran yang Didukung](#9-metode-pembayaran-yang-didukung)
10. [Integrasi dengan Next.js (KiriMart)](#10-integrasi-dengan-nextjs-kirimart)
11. [Transaction Status Flow](#11-transaction-status-flow)
12. [Best Practices & Security](#12-best-practices--security)

---

## 1. Apa itu Midtrans?

**Midtrans** (bagian dari GoTo Financial) adalah payment gateway terbesar di Indonesia yang menyediakan solusi pembayaran online untuk berbagai jenis bisnis. Midtrans mendukung lebih dari 25+ metode pembayaran termasuk kartu kredit, e-wallet, QRIS, transfer bank, dan lainnya.

---

## 2. Dokumentasi Resmi & Dashboard

| Resource                  | URL                                                    |
| :------------------------ | :----------------------------------------------------- |
| **Dokumentasi Resmi**     | https://docs.midtrans.com                              |
| **Dashboard Sandbox**     | https://dashboard.sandbox.midtrans.com                 |
| **Dashboard Production**  | https://dashboard.midtrans.com                         |
| **Snap JS (Sandbox)**     | https://app.sandbox.midtrans.com/snap/snap.js          |
| **Snap JS (Production)**  | https://app.midtrans.com/snap/snap.js                  |
| **Postman Collection**    | Tersedia di GitHub resmi Midtrans                      |
| **NPM Package**           | `midtrans-client` — https://www.npmjs.com/package/midtrans-client |
| **Support Email**         | support@midtrans.com                                   |

---

## 3. API Keys (Credential)

Midtrans menggunakan 2 jenis key:

| Key                | Fungsi                                            | Visibilitas     |
| :----------------- | :------------------------------------------------ | :-------------- |
| **Server Key**     | Autentikasi server-to-server (backend)            | ❌ RAHASIA       |
| **Client Key**     | Identifikasi merchant di frontend (Snap JS)       | ✅ Public        |

### Environment Variables (`.env`)

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false

# Public (untuk client-side Snap JS)
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **PENTING**: `SERVER_KEY` hanya boleh digunakan di backend (Server Actions / API Routes). Jangan pernah expose ke client-side!

### Cara Mendapatkan Key

1. Login ke [Dashboard Midtrans](https://dashboard.sandbox.midtrans.com)
2. Buka **Settings → Access Keys**
3. Salin `Server Key` dan `Client Key`

---

## 4. Base URL — Sandbox vs Production

### API Base URL

| Environment    | Base URL                                |
| :------------- | :-------------------------------------- |
| **Sandbox**    | `https://api.sandbox.midtrans.com`      |
| **Production** | `https://api.midtrans.com`              |

### Snap API URL

| Environment    | Snap Transaction URL                                    |
| :------------- | :------------------------------------------------------ |
| **Sandbox**    | `https://app.sandbox.midtrans.com/snap/v1/transactions` |
| **Production** | `https://app.midtrans.com/snap/v1/transactions`         |

### Snap JS Script

| Environment    | Script URL                                         |
| :------------- | :------------------------------------------------- |
| **Sandbox**    | `https://app.sandbox.midtrans.com/snap/snap.js`    |
| **Production** | `https://app.midtrans.com/snap/snap.js`            |

---

## 5. Snap API vs Core API

### Perbandingan

| Fitur                | Snap API                         | Core API                          |
| :------------------- | :------------------------------- | :-------------------------------- |
| **Kecepatan Dev**    | ⚡ Cepat (Recommended)           | 🔧 Butuh development lebih       |
| **UI Pembayaran**    | Popup/redirect siap pakai        | Harus build sendiri               |
| **Payment Flow**     | Dihandle Midtrans                | Full kontrol developer            |
| **PCI DSS**          | Tidak perlu                      | Wajib untuk kartu kredit          |
| **Update Otomatis**  | ✅ Metode baru otomatis tersedia | ❌ Harus update manual            |
| **Cocok Untuk**      | Mayoritas bisnis                 | Custom UI, POS, IoT               |

### ✅ Rekomendasi untuk KiriMart: **Snap API**

Alasan:
- Setup lebih cepat
- UI sudah dioptimasi untuk konversi tinggi
- Mobile-friendly
- Tidak perlu PCI DSS compliance
- Metode pembayaran baru otomatis tersedia

---

## 6. Daftar Endpoint API

### Snap API Endpoints

| Action                      | Method | URL                                                           |
| :-------------------------- | :----- | :------------------------------------------------------------ |
| **Create Transaction**      | POST   | `{SNAP_URL}/snap/v1/transactions`                             |

### Core API Endpoints

| Action                      | Method | URL                                                           |
| :-------------------------- | :----- | :------------------------------------------------------------ |
| **Charge (Buat Transaksi)** | POST   | `{BASE_URL}/v2/charge`                                        |
| **Get Status**              | GET    | `{BASE_URL}/v2/{ORDER_ID}/status`                             |
| **Cancel**                  | POST   | `{BASE_URL}/v2/{ORDER_ID}/cancel`                             |
| **Approve**                 | POST   | `{BASE_URL}/v2/{ORDER_ID}/approve`                            |
| **Refund**                  | POST   | `{BASE_URL}/v2/{ORDER_ID}/refund`                             |
| **Expire**                  | POST   | `{BASE_URL}/v2/{ORDER_ID}/expire`                             |
| **Deny**                    | POST   | `{BASE_URL}/v2/{ORDER_ID}/deny`                               |

### Autentikasi

Semua request API menggunakan **Basic Auth**:
- **Username**: `Server Key`
- **Password**: (kosong)

```
Authorization: Basic base64(SERVER_KEY + ":")
```

Contoh header:
```
Authorization: Basic U0ItTWlkLXNlcnZlci14eHh4eHh4Ojo=
```

---

## 7. Webhook (Notification URL)

### Apa itu Webhook?

Webhook adalah mekanisme server-to-server dimana **Midtrans mengirim notifikasi** ke server kita setiap kali status transaksi berubah (misalnya: pembayaran berhasil, expired, dll).

### URL Webhook yang Harus Kita Sediakan

Kita perlu membuat endpoint di server kita yang bisa menerima HTTP POST dari Midtrans.

#### Untuk KiriMart (Next.js)

| Environment    | Webhook URL (Contoh)                                          |
| :------------- | :------------------------------------------------------------ |
| **Development**| Gunakan **ngrok** → `https://xxxx.ngrok.io/api/midtrans/notification` |
| **Staging**    | `https://staging.kirimart.com/api/midtrans/notification`      |
| **Production** | `https://kirimart.com/api/midtrans/notification`              |

#### Route yang Harus Dibuat

```
src/app/api/midtrans/notification/route.js
```

### Cara Set Notification URL di Dashboard Midtrans

1. Login ke [Dashboard Midtrans](https://dashboard.sandbox.midtrans.com)
2. Buka **Settings → Configuration**
3. Isi field **Payment Notification URL** dengan URL webhook kita
4. (Opsional) Isi **Recurring Notification URL** & **Pay Account Notification URL**
5. Klik **Update**

### Syarat Notification URL

- ✅ Harus **publicly accessible** (bisa diakses dari internet)
- ✅ Sebaiknya menggunakan **HTTPS**
- ❌ Tidak boleh `localhost`
- ❌ Tidak boleh di belakang VPN / password-protected
- ❌ Tidak boleh mengembalikan redirect (3xx)

### Contoh JSON Payload dari Midtrans

```json
{
  "transaction_time": "2025-01-15 10:30:00",
  "transaction_status": "settlement",
  "transaction_id": "abc123-def456-ghi789",
  "status_message": "midtrans payment notification",
  "status_code": "200",
  "signature_key": "fe1234567890abcdef...",
  "settlement_time": "2025-01-15 10:35:00",
  "payment_type": "bank_transfer",
  "order_id": "ORDER-20250115-001",
  "merchant_id": "M123456",
  "gross_amount": "150000.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

### Transaction Status yang Dikirim

| Status          | Deskripsi                                              |
| :-------------- | :----------------------------------------------------- |
| `capture`       | Transaksi kartu kredit berhasil di-capture              |
| `settlement`    | Pembayaran berhasil diselesaikan (✅ uang masuk)        |
| `pending`       | Menunggu pembayaran dari customer                       |
| `deny`          | Transaksi ditolak                                       |
| `cancel`        | Transaksi dibatalkan                                    |
| `expire`        | Transaksi kadaluarsa                                    |
| `refund`        | Transaksi di-refund                                     |
| `partial_refund`| Transaksi di-refund sebagian                            |
| `failure`       | Gagal (error di payment provider)                       |

---

## 8. Verifikasi Signature Key

### Mengapa Harus Verifikasi?

Untuk memastikan bahwa notifikasi benar-benar datang dari Midtrans, bukan dari pihak ketiga yang mencoba memanipulasi data transaksi.

### Formula

```
SHA512(order_id + status_code + gross_amount + ServerKey)
```

### Contoh Implementasi (JavaScript)

```javascript
import crypto from "crypto";

function verifySignature(notification, serverKey) {
  const { order_id, status_code, gross_amount, signature_key } = notification;

  const input = order_id + status_code + gross_amount + serverKey;
  const calculatedSignature = crypto
    .createHash("sha512")
    .update(input)
    .digest("hex");

  return calculatedSignature === signature_key;
}
```

### Langkah Verifikasi

1. Terima JSON dari Midtrans webhook
2. Ambil `order_id`, `status_code`, `gross_amount`, dan `signature_key` dari payload
3. Gabungkan: `order_id + status_code + gross_amount + SERVER_KEY`
4. Hash dengan **SHA512**
5. Bandingkan hasil hash dengan `signature_key` dari payload
6. Jika **cocok** → proses update status transaksi
7. Jika **tidak cocok** → tolak/ignore request

---

## 9. Metode Pembayaran yang Didukung

### E-Wallets

| Metode       | Payment Type         |
| :----------- | :------------------- |
| GoPay        | `gopay`              |
| ShopeePay    | `shopeepay`          |
| DANA         | Via QRIS             |
| OVO          | Via QRIS             |
| LinkAja      | Via QRIS             |

### QRIS

| Metode       | Payment Type         |
| :----------- | :------------------- |
| QRIS         | `qris`               |

> QRIS mendukung pembayaran dari semua e-wallet yang sudah terdaftar QRIS.

### Bank Transfer (Virtual Account)

| Bank         | Payment Type              |
| :----------- | :------------------------ |
| BCA          | `bank_transfer` → `bca`  |
| BNI          | `bank_transfer` → `bni`  |
| BRI          | `bank_transfer` → `bri`  |
| Mandiri      | `echannel` (Mandiri Bill) |
| Permata      | `bank_transfer` → `permata` |
| CIMB Niaga   | `bank_transfer` → `cimb` |

### Kartu Kredit / Debit

| Metode          | Payment Type       |
| :-------------- | :------------------ |
| Visa             | `credit_card`      |
| Mastercard       | `credit_card`      |
| JCB              | `credit_card`      |
| American Express | `credit_card`      |

### Convenience Store

| Metode       | Payment Type         |
| :----------- | :------------------- |
| Alfamart     | `cstore` → `alfamart`|
| Indomaret    | `cstore` → `indomaret`|

---

## 10. Integrasi dengan Next.js (KiriMart)

### Arsitektur Integrasi

```
┌──────────────┐     ┌────────────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Server Action /  │────▶│   Midtrans   │
│  (Snap JS)   │     │   API Route        │     │   API        │
│              │◀────│                    │◀────│              │
└──────────────┘     └────────────────────┘     └──────────────┘
                              │ ▲
                              │ │  Webhook
                              ▼ │
                     ┌────────────────────┐
                     │   Database         │
                     │   (Order Status)   │
                     └────────────────────┘
```

### Step 1: Install Package

```bash
bun add midtrans-client
```

### Step 2: Setup Environment Variables

```env
# .env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxxxxx
```

### Step 3: Load Snap JS di Layout

```jsx
// src/app/layout.jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
```

### Step 4: Server Action — Create Snap Token

```javascript
// src/features/checkout/actions/payment-action.js
"use server";

import Midtrans from "midtrans-client";

const snap = new Midtrans.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export async function createSnapToken(orderData) {
  const {
    orderId,
    grossAmount,
    customerName,
    customerEmail,
    customerPhone,
    items,
  } = orderData;

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    item_details: items.map((item) => ({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      name: item.name,
    })),
  };

  try {
    const token = await snap.createTransactionToken(parameter);
    return { success: true, token };
  } catch (error) {
    console.error("Midtrans Error:", error);
    return { success: false, error: error.message };
  }
}
```

### Step 5: Frontend — Trigger Snap Payment

```jsx
// Dalam checkout-view.jsx
"use client";

import { createSnapToken } from "@/features/checkout/actions/payment-action";

function CheckoutButton({ orderData }) {
  const handlePayment = async () => {
    const result = await createSnapToken(orderData);

    if (!result.success) {
      alert("Gagal membuat transaksi: " + result.error);
      return;
    }

    // Trigger Snap popup
    window.snap.pay(result.token, {
      onSuccess: (result) => {
        console.log("Payment success:", result);
        // Redirect ke halaman sukses
        // JANGAN update DB di sini, tunggu webhook!
      },
      onPending: (result) => {
        console.log("Payment pending:", result);
        // Redirect ke halaman pending
      },
      onError: (result) => {
        console.log("Payment error:", result);
        // Tampilkan error
      },
      onClose: () => {
        console.log("Payment popup closed");
      },
    });
  };

  return <button onClick={handlePayment}>Bayar Sekarang</button>;
}
```

### Step 6: Webhook Handler

```javascript
// src/app/api/midtrans/notification/route.js
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const notification = await request.json();

    // 1. Verifikasi Signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const { order_id, status_code, gross_amount, signature_key } = notification;

    const input = order_id + status_code + gross_amount + serverKey;
    const calculatedSignature = crypto
      .createHash("sha512")
      .update(input)
      .digest("hex");

    if (calculatedSignature !== signature_key) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // 2. Handle berdasarkan transaction_status
    const { transaction_status, fraud_status } = notification;

    switch (transaction_status) {
      case "capture":
        if (fraud_status === "accept") {
          // Update order status → PAID
          await updateOrderStatus(order_id, "PAID");
        }
        break;

      case "settlement":
        // Update order status → PAID
        await updateOrderStatus(order_id, "PAID");
        break;

      case "pending":
        // Update order status → PENDING_PAYMENT
        await updateOrderStatus(order_id, "PENDING_PAYMENT");
        break;

      case "deny":
      case "cancel":
      case "expire":
        // Update order status → CANCELLED / EXPIRED
        await updateOrderStatus(order_id, "CANCELLED");
        break;

      case "refund":
      case "partial_refund":
        // Update order status → REFUNDED
        await updateOrderStatus(order_id, "REFUNDED");
        break;
    }

    // 3. Respond 200 OK agar Midtrans tidak retry
    return NextResponse.json({ status: "OK" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function updateOrderStatus(orderId, status) {
  // TODO: Implement database update
  // Gunakan Drizzle ORM untuk update tabel orders
  console.log(`Updating order ${orderId} to status: ${status}`);
}
```

---

## 11. Transaction Status Flow

```
                            ┌─────────┐
                            │  START   │
                            └────┬────┘
                                 │
                                 ▼
                            ┌─────────┐
                      ┌─────│ pending  │─────┐
                      │     └────┬────┘      │
                      │          │           │
                      ▼          ▼           ▼
                 ┌─────────┐ ┌─────────┐ ┌─────────┐
                 │  deny   │ │ capture │ │ expire  │
                 └─────────┘ └────┬────┘ └─────────┘
                                  │
                                  ▼
                            ┌───────────┐
                            │settlement │ ←── Uang berhasil masuk
                            └─────┬─────┘
                                  │
                          ┌───────┴───────┐
                          ▼               ▼
                    ┌──────────┐   ┌──────────────┐
                    │  refund  │   │partial_refund│
                    └──────────┘   └──────────────┘
```

---

## 12. Best Practices & Security

### ✅ Do's

1. **Selalu verifikasi `signature_key`** sebelum memproses webhook
2. **Update status order hanya dari webhook**, bukan dari callback frontend
3. **Gunakan HTTPS** untuk webhook URL
4. **Implementasi idempotency** — Midtrans bisa mengirim notifikasi duplikat
5. **Return HTTP 200** segera dari webhook handler (proses async jika perlu)
6. **Gunakan GET Status API** sebagai fallback/double-check
7. **Simpan seluruh payload** webhook untuk audit trail / debugging
8. **Gunakan environment variable** terpisah untuk sandbox dan production

### ❌ Don'ts

1. **Jangan expose `SERVER_KEY`** di client-side / frontend
2. **Jangan rely pada frontend callback** (`onSuccess`) untuk update database
3. **Jangan hardcode** API keys di source code
4. **Jangan ignore** fraud_status pada transaksi kartu kredit
5. **Jangan return error (5xx)** dari webhook tanpa alasan jelas — Midtrans akan retry

### Testing dengan Sandbox

1. Gunakan **Sandbox Dashboard** untuk monitor transaksi test
2. Gunakan **ngrok** atau **Cloudflare Tunnel** untuk expose localhost ke internet
3. Midtrans menyediakan **test card numbers** dan **test VA** di dokumentasi
4. Cek log notifikasi di Dashboard → **Settings → Configuration → Notification**

---

## Referensi

- 📖 [Midtrans Official Docs](https://docs.midtrans.com)
- 🔧 [Dashboard Sandbox](https://dashboard.sandbox.midtrans.com)
- 📦 [midtrans-client NPM](https://www.npmjs.com/package/midtrans-client)
- 🧪 [Postman Collection](https://github.com/Midtrans/Midtrans-Payment-API-Postman-Collections)

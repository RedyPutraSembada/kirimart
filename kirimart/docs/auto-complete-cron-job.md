# Auto-Complete Pesanan (Cron Job)

## Latar Belakang

Setelah kurir mengirimkan paket dan Biteship mengirim webhook `order.status = "delivered"`,
status pesanan di KiriMart berubah menjadi `completed` (lewat webhook handler di `/api/biteship/webhook`).

Namun, **ada masalah**: bagaimana jika webhook Biteship gagal terkirim atau 
pembeli tidak pernah menekan tombol "Pesanan Diterima"?

Solusinya: **Cron Job Auto-Complete** yang secara periodik mengecek pesanan 
yang sudah lama berstatus `shipped` dan otomatis menyelesaikannya.

## Alur Auto-Complete

```
Pesanan status: "shipped"
       ↓
Biteship webhook → status: "delivered"
       ↓
Webhook handler update shipments.status = "delivered"
Webhook handler update orders.status = "completed"  ← IDEALNYA
       ↓
Namun jika webhook gagal / buyer tidak konfirmasi:
       ↓
Cron Job (tiap 6 jam) → cek pesanan "shipped" yang:
  - Sudah lebih dari 7 hari sejak dikirim (shipped_at)
  - ATAU shipments.status = "delivered" tapi orders.status masih "shipped"
       ↓
Auto-complete:
  - Update orders.status → "completed"
  - Tambah saldo seller (grandTotal - ongkir - platformFee)
  - Insert review default (rating 5, tanpa komentar) jika belum ada review
```

## Implementasi Teknis

### Opsi 1: Vercel Cron (Recommended untuk Next.js di Vercel)

File: `src/app/api/cron/auto-complete/route.js`

```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/auto-complete",
      "schedule": "0 */6 * * *"  // Setiap 6 jam
    }
  ]
}
```

```javascript
// src/app/api/cron/auto-complete/route.js
import { db } from "@/config/db"
import { orders, shipments, stores, reviews, orderItems } from "@/config/db/schema"
import { eq, and, lt, sql, isNull } from "drizzle-orm"

const AUTO_COMPLETE_DAYS = 7  // Auto-complete setelah 7 hari shipped
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request) {
  // 1. Verifikasi secret (agar tidak bisa dipanggil sembarangan)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_COMPLETE_DAYS)

    // 2. Cari pesanan shipped yang sudah lewat batas waktu
    const staleOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, "shipped"),
        lt(orders.createdAt, cutoffDate)
      ),
      with: {
        shipment: true,
        items: true,
      },
      limit: 50,  // Proses batch 50 pesanan per run
    })

    let completedCount = 0

    for (const order of staleOrders) {
      await db.transaction(async (tx) => {
        // A. Update status order → completed
        await tx.update(orders)
          .set({ status: "completed" })
          .where(eq(orders.id, order.id))

        // B. Tambah saldo seller
        const sellerIncome = order.grandTotal - (order.totalShipping || 0) - (order.platformFee || 0)
        if (sellerIncome > 0) {
          await tx.update(stores)
            .set({ balance: sql`balance + ${sellerIncome}` })
            .where(eq(stores.id, order.storeId))
        }

        // C. Insert review default (5 bintang, tanpa komentar)
        // Hanya jika belum ada review untuk order items ini
        for (const item of order.items) {
          const existingReview = await tx.query.reviews.findFirst({
            where: eq(reviews.orderItemId, item.id),
          })
          if (!existingReview) {
            await tx.insert(reviews).values({
              orderItemId: item.id,
              productId: item.productId,
              userId: order.userId,
              rating: 5,
              comment: null,
            })
          }
        }
      })
      completedCount++
    }

    console.log(`[AUTO-COMPLETE CRON] Completed ${completedCount} orders`)
    return Response.json({ success: true, completedCount })
  } catch (error) {
    console.error("[AUTO-COMPLETE CRON] Error:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}
```

### Opsi 2: External Cron (Jika tidak deploy di Vercel)

Menggunakan layanan cron external seperti:
- **cron-job.org** (gratis, reliable)
- **Railway** (scheduled tasks)
- **Upstash QStash** (serverless cron)

Setup: Hit endpoint `/api/cron/auto-complete` setiap 6 jam dengan header 
`Authorization: Bearer {CRON_SECRET}`.

## Environment Variables yang Dibutuhkan

```env
# .env
CRON_SECRET=random-secret-string-untuk-verifikasi-cron
```

## Konfigurasi Waktu

| Variabel | Default | Keterangan |
|----------|---------|------------|
| AUTO_COMPLETE_DAYS | 7 | Jumlah hari setelah shipped sebelum auto-complete |
| Cron Schedule | `0 */6 * * *` | Jalankan setiap 6 jam (00:00, 06:00, 12:00, 18:00) |

## Catatan Penting

1. **Tokopedia** menggunakan 2 hari setelah delivered, **Shopee** menggunakan 3 hari
2. Kita menggunakan **7 hari setelah shipped** sebagai default karena belum pasti 
   kapan Biteship mengirim status `delivered` di mode sandbox
3. Setelah production, bisa diperketat menjadi **2-3 hari setelah delivered** 
   (berdasarkan `shipments.status = "delivered"`)
4. Cron job ini bersifat **idempotent** — aman dijalankan berkali-kali tanpa efek samping

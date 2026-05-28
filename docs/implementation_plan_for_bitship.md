# Integrasi Biteship ke KiriMart — Implementation Plan

Dokumen ini berisi rencana implementasi penuh untuk mengganti sistem logistik dari Mock/KiriminAja ke **Biteship API**, mencakup perubahan database, form alamat, cek ongkir di checkout, pembuatan order pengiriman, dan tracking resi.

---

## User Review Required

> [!IMPORTANT]
> **Biaya per API Hit = Rp 5.** Untuk menekan biaya, kita menggunakan strategi **"Cache Area ID di Database"**. Saat user memilih alamat (baik Buyer maupun Seller), kita panggil Biteship Maps API **sekali saja** untuk mendapatkan `area_id`, lalu simpan di kolom `biteshipAreaId` pada tabel `addresses`. Untuk cek ongkir di checkout, kita gunakan `area_id` yang sudah tersimpan — **bukan** memanggil Maps API lagi.

> [!WARNING]
> **Breaking Change pada Database:** Tabel `addresses` dan `shipments` akan mendapat kolom baru. Perlu menjalankan `drizzle-kit push` atau `generate` + `migrate` setelah perubahan schema.

## Open Questions

> [!IMPORTANT]
> 1. **API Key Biteship:** Apakah Anda sudah memiliki API Key Biteship (Sandbox)? Jika sudah, siapkan nilainya untuk dimasukkan ke `.env`.
> 2. **Kurir yang Diaktifkan:** Kurir mana saja yang ingin ditampilkan saat checkout? Rekomendasi awal: `jne,sicepat,jnt,anteraja` (reguler). Grab/Gojek bisa ditambahkan nanti jika sudah siap dengan koordinat.
> 3. **Form Alamat Toko (Seller):** Saat ini form `create-store-form.jsx` hanya menggunakan input teks biasa (`province` dan `city`) tanpa terhubung ke `addresses` table. Apakah kita sekaligus memperbaiki ini agar Seller juga menggunakan komponen `AddressForm` yang sama + Biteship Maps autocomplete?

---

## Strategi Hemat API Hit (Rp 5/hit)

Berikut adalah pemetaan kapan Biteship API dipanggil dan strategi cache-nya:

| Aksi User | API yang Dipanggil | Frekuensi | Strategi Hemat |
|:----------|:-------------------|:----------|:---------------|
| **Buyer buat alamat baru** | `GET /v1/maps/areas` (autocomplete) | 1x per alamat | Debounce 1 detik + simpan `biteshipAreaId` ke DB |
| **Seller buat/edit alamat toko** | `GET /v1/maps/areas` (autocomplete) | 1x per toko | Sama — simpan `biteshipAreaId` ke tabel `addresses` |
| **Buyer checkout (cek ongkir)** | `POST /v1/rates/couriers` | 1x per toko per checkout | Gunakan `area_id` dari DB, **bukan** hit Maps lagi |
| **Pembayaran sukses → buat order kurir** | `POST /v1/orders` | 1x per order toko | Hanya setelah Midtrans callback sukses |
| **Tracking resi** | `GET /v1/trackings/:id` | On-demand | **Tidak perlu polling.** Gunakan Webhook |
| **Webhook (status update)** | Biteship → KiriMart | Gratis (incoming) | Tidak dihitung biaya |

**Estimasi biaya per transaksi:** ~Rp 15–25 (1 Maps saat buat alamat + 1 Rates saat checkout + 1 Create Order saat bayar). **Sangat hemat** dibanding polling tracking setiap 5 menit.

---

## Proposed Changes

### Komponen 1: Database Schema

Perubahan pada 2 tabel existing + 1 tabel baru (cache kurir opsional).

---

#### [MODIFY] [address-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/address-schema.js)

Menambahkan kolom `biteshipAreaId` dan `label` (nama tampilan singkat untuk UI):

```diff
 export const addresses = pgTable("addresses", {
   id: serial("id").primaryKey(),
   userId: text("user_id"),
   storeId: integer("store_id"),
+  label: text("label"),                       // "Rumah", "Kantor", "Gudang"
+  biteshipAreaId: text("biteship_area_id"),    // Cache: "IDNP6IDNC148IDND836IDZ12410"
   provinceId: text("province_id"),
+  provinceName: text("province_name"),         // Cache: "DKI Jakarta"
   cityId: text("city_id"),
+  cityName: text("city_name"),                 // Cache: "Jakarta Selatan"
   kecamatanId: text("kecamatan_id"),
+  kecamatanName: text("kecamatan_name"),       // Cache: "Pesanggrahan"
   kelurahanId: text("kelurahan_id"),
   zipcode: text("zipcode"),
   detailAddress: text("detail_address").notNull(),
   recipientName: text("recipient_name"),
   recipientPhone: text("recipient_phone"),
+  isDefault: boolean("is_default").default(false),
 })
```

**Alasan:** Kolom `biteshipAreaId` adalah kunci utama untuk memanggil Rates API tanpa harus hit Maps API lagi. Kolom `provinceName`, `cityName`, `kecamatanName` berguna agar UI bisa langsung menampilkan nama wilayah tanpa lookup tambahan.

---

#### [MODIFY] [shipment-schema.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/db/schema/shipment-schema.js)

Mengganti referensi KiriminAja ke Biteship:

```diff
 export const shipments = pgTable("shipments", {
   id: serial("id").primaryKey(),
   orderId: integer("order_id").notNull(),
   courier: text("courier").notNull(),
+  courierType: text("courier_type"),           // "reg", "yes", "instant"
   service: text("service"),
   awbNumber: text("awb_number"),
-  kiriminajaOrderId: text("kiriminaja_order_id"),
+  biteshipOrderId: text("biteship_order_id"),  // ID order di Biteship
+  biteshipTrackingId: text("biteship_tracking_id"),
   status: text("status").default("pending"),
   pickupMethod: text("pickup_method"),
   receiptPdfUrl: text("receipt_pdf_url"),
+  shippingFee: integer("shipping_fee"),        // Tarif ongkir final (dari Biteship)
+  estimatedDays: text("estimated_days"),       // "1-2 hari"
+  createdAt: timestamp("created_at").defaultNow(),
 })
```

---

### Komponen 2: Server Actions (Biteship API Layer)

Seluruh interaksi dengan Biteship API diletakkan di satu file *Server Action* yang terpusat.

---

#### [NEW] [biteship.actions.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/actions/public/biteship.actions.js)

File ini berisi 4 fungsi utama:

| Fungsi | Kegunaan | API Hit |
|:-------|:---------|:--------|
| `searchBiteshipArea(query)` | Autocomplete wilayah untuk form alamat | `GET /v1/maps/areas` |
| `getBiteshipRates(originAreaId, destAreaId, items)` | Cek ongkir saat checkout | `POST /v1/rates/couriers` |
| `createBiteshipOrder(orderData)` | Buat order pengiriman ke kurir | `POST /v1/orders` |
| `cancelBiteshipOrder(biteshipOrderId)` | Batalkan order pengiriman | `POST /v1/orders/:id/cancel` |

Semua fungsi mengikuti kontrak standar KiriMart: `{ success: true/false, data?, error? }`.

---

#### [MODIFY] [checkout.actions.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/actions/public/checkout.actions.js)

Mengganti fungsi `generateMockShipping()` dengan panggilan ke `getBiteshipRates()`:

```diff
- // 5. Hitung opsi ongkos kirim mock per toko
- const storesData = Array.from(storeMap.values()).filter(s => s.items.length > 0).map(store => {
-   const totalWeight = store.items.reduce(...)
-   return { ...store, shipping: generateMockShipping(totalWeight) }
- })
+ // 5. Hitung opsi ongkir LIVE dari Biteship
+ const storesData = []
+ for (const store of Array.from(storeMap.values()).filter(s => s.items.length > 0)) {
+   const destAreaId = selectedAddress?.biteshipAreaId
+   const originAreaId = store.originAddress?.biteshipAreaId
+   let shipping = []
+   if (destAreaId && originAreaId) {
+     const ratesResult = await getBiteshipRates(originAreaId, destAreaId, store.items)
+     if (ratesResult.success) shipping = ratesResult.data
+   }
+   storesData.push({ ...store, shipping })
+ }
```

---

#### [MODIFY] [address.actions.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/actions/user-dashboard/address.actions.js)

Update `saveUserAddressAction` untuk menyimpan kolom baru (`biteshipAreaId`, `provinceName`, `cityName`, `kecamatanName`, `label`, `isDefault`).

---

### Komponen 3: Webhook API Route

---

#### [NEW] [route.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/app/api/biteship/webhook/route.js)

API Route untuk menerima 3 event Webhook dari Biteship:
- **`order.status`**: Update kolom `status` di tabel `shipments` dan `orders`.
- **`order.waybill_id`**: Update kolom `awbNumber` di tabel `shipments`.
- **`order.price`**: Update kolom `shippingFee` jika ada koreksi harga.

```
POST /api/biteship/webhook
```

---

### Komponen 4: UI — Form Alamat (Shared Component)

Komponen form alamat yang digunakan di 3 tempat: **User Dashboard**, **Create Store**, dan **Checkout** (ganti alamat).

---

#### [MODIFY] [address-form.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/components/shared/address-form.jsx)

Mengganti sistem dropdown mock (Provinsi → Kota → Kecamatan → Kelurahan) menjadi **satu input autocomplete** yang memanggil `searchBiteshipArea()` dengan debounce 1 detik:

**Alur UX baru:**
1. User mengetik nama wilayah (misal: "Pesanggrahan Jakarta")
2. Setelah 1 detik berhenti mengetik → hit `searchBiteshipArea()`
3. Muncul dropdown hasil (Kecamatan, Kota, Provinsi, Kode Pos)
4. User pilih → otomatis mengisi: `biteshipAreaId`, `provinceName`, `cityName`, `kecamatanName`, `zipcode`
5. User lanjut isi `detailAddress`, `recipientName`, `recipientPhone`

**Keuntungan:** Hanya **1 API hit** per alamat (vs 4 hit jika dropdown bertingkat per level).

---

### Komponen 5: UI — Checkout Shipping Options

---

#### [MODIFY] [checkout-view.jsx](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/features/public/checkout/checkout-view.jsx)

- Opsi pengiriman per toko sekarang menampilkan data **live** dari Biteship (`courier_name`, `duration`, `price`).
- Jika alamat belum punya `biteshipAreaId` atau toko belum punya alamat origin, tampilkan pesan: "Alamat belum lengkap, tidak bisa menghitung ongkir."

---

### Komponen 6: Environment Variables

---

#### [MODIFY] [.env](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/.env)

```env
# Biteship
BITESHIP_API_KEY="biteship_test_xxxxx"
BITESHIP_API_URL="https://api.biteship.com"
BITESHIP_WEBHOOK_SECRET=""  # Opsional, untuk verifikasi webhook
BITESHIP_DEFAULT_COURIERS="jne,sicepat,jnt,anteraja"
```

#### [MODIFY] [env/index.js](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kirimart/src/config/env/index.js)

Tambahkan validasi t3-env untuk variabel Biteship.

---

## Peta Menu / Halaman yang Terdampak

| No | Halaman / Menu | Role | Perubahan |
|:--:|:---------------|:-----|:----------|
| 1 | **User Dashboard → Alamat → Tambah Alamat** | Buyer | Form alamat pakai Biteship autocomplete |
| 2 | **User Dashboard → Alamat → Edit Alamat** | Buyer | Sama (edit alamat + update `biteshipAreaId`) |
| 3 | **Create Store (Onboarding Toko)** | Seller | Alamat toko pakai Biteship autocomplete (menyimpan ke tabel `addresses` dengan `storeId`) |
| 4 | **Seller Dashboard → Profil Toko** | Seller | Edit alamat toko (update `biteshipAreaId`) |
| 5 | **Public → Checkout** | Buyer | Ongkir live dari Biteship (bukan mock) |
| 6 | **Public → Checkout → Payment Method** | Buyer | Tidak berubah (Midtrans tetap) |
| 7 | **User Dashboard → Pesanan Saya → Detail** | Buyer | Tampilkan tracking resi dari Biteship |
| 8 | **Seller Dashboard → Pesanan → Detail** | Seller | Tombol "Kirim Pesanan" → create Biteship order |
| 9 | **API Route: `/api/biteship/webhook`** | System | Endpoint baru untuk menerima status update |

---

## Urutan Eksekusi (Tahapan Kerja)

### Tahap 1: Fondasi (Database + API Layer)
- [ ] Modifikasi `address-schema.js` (tambah kolom)
- [ ] Modifikasi `shipment-schema.js` (ganti KiriminAja → Biteship)
- [ ] Update `relations.js` jika diperlukan
- [ ] Jalankan `drizzle-kit push`
- [ ] Tambah env variables Biteship
- [ ] Buat `biteship.actions.js` (4 fungsi inti)

### Tahap 2: Form Alamat (Shared Component)
- [ ] Refactor `address-form.jsx` ke Biteship autocomplete
- [ ] Update `create-address-form.jsx` (Buyer)
- [ ] Update `create-store-form.jsx` (Seller) agar pakai komponen yang sama
- [ ] Update `address.actions.js` (save kolom baru)

### Tahap 3: Checkout Live Ongkir
- [ ] Modifikasi `checkout.actions.js` — ganti mock → `getBiteshipRates()`
- [ ] Update `checkout-view.jsx` — tampilkan data kurir live

### Tahap 4: Create Shipment + Webhook
- [ ] Buat API Route webhook (`/api/biteship/webhook/route.js`)
- [ ] Integrasi `createBiteshipOrder()` setelah pembayaran sukses
- [ ] Update order status berdasarkan webhook

### Tahap 5: Tracking UI
- [ ] Halaman detail pesanan Buyer → tampilkan status tracking
- [ ] Halaman detail pesanan Seller → tombol kirim pesanan + status

---

## Verification Plan

### Automated Tests
- Panggil `searchBiteshipArea("Jakarta Selatan")` → pastikan return `biteshipAreaId` valid
- Panggil `getBiteshipRates(origin, dest, items)` → pastikan return array `pricing`
- Simpan alamat baru → pastikan kolom `biteshipAreaId` terisi di DB
- Buka halaman checkout → pastikan ongkir bukan mock

### Manual Verification
- Buat alamat baru di User Dashboard → autocomplete berfungsi
- Buat toko baru → alamat toko tersimpan dengan `biteshipAreaId`
- Checkout → opsi kurir muncul dengan harga live
- Simulasi webhook via Postman → status order berubah di DB

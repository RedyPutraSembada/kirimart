# Laporan Audit Biteship Integration — KiriMart (Kawan Belanja)

Hasil analisis mendalam terhadap seluruh file kode aplikasi, dibandingkan dengan dokumentasi Biteship API.

---

## A. RINGKASAN STATUS

| # | Fitur Biteship | Status | Catatan |
|---|---|---|---|
| 1 | Maps / Search Area (Autocomplete) | ✅ Lengkap | `searchBiteshipArea` di `biteship.actions.js` |
| 2 | Rates / Cek Ongkir | ✅ Lengkap | `getBiteshipRates` + caching 30 menit |
| 3 | Couriers / Daftar Kurir | ✅ Lengkap | `getBiteshipCouriers` + cache 24 jam |
| 4 | Orders / Create Order | ✅ Lengkap | `createBiteshipOrder` → `shipOrderViaBiteship` |
| 5 | Orders / Cancel Order | ⚠️ **Tersedia tapi tidak tersambung** | Fungsi `cancelBiteshipOrder` ada, tapi `cancelOrder` di seller tidak memanggilnya |
| 6 | Orders / Retrieve Order | ❌ **Belum ada** | Tidak ada fungsi sync manual dari Biteship |
| 7 | Trackings / Public Tracking | ✅ Lengkap | `trackOrderShipment` + fallback data lokal |
| 8 | Locations API | ❌ **Belum dipakai** | Alamat dikirim manual setiap kali order |
| 9 | Webhook (order.status) | ✅ Lengkap | `app/api/biteship/webhook/route.js` |
| 10 | Webhook (order.waybill_id) | ✅ Lengkap | Update AWB otomatis |
| 11 | Webhook (order.price) | ✅ Lengkap | Update shipping fee otomatis |
| 12 | **COD (Cash on Delivery)** | ❌ **Belum ada sama sekali** | Tidak ada flow, schema, maupun UI |
| 13 | **Grab/Gojek Instant** | ⚠️ **Tidak muncul di checkout** | Butuh `origin_coordinate` (lat/long), saat ini hanya kirim `area_id` |

---

## B. MASALAH: GRAB & GOJEK TIDAK MUNCUL DI CHECKOUT

### Penyebab Utama
Kurir **instan** (Grab, Gojek, Lalamove, Borzo) **wajib** menggunakan **koordinat (latitude/longitude)** untuk kalkulasi tarif. Biteship akan **menolak** menghitung ongkir kurir instan jika hanya menerima `area_id`.

### Alur Saat Ini (Bermasalah)

```
getBiteshipRates()
  → POST /v1/rates/couriers
  → payload: { origin_area_id, destination_area_id, couriers: "grab,gojek,jne,..." }
```

Biteship menerima ini → Mengembalikan tarif untuk JNE, SiCepat, dll → **Grab & Gojek di-skip** karena **tidak ada `origin_latitude`/`origin_longitude`** dan **`destination_latitude`/`destination_longitude`**.

### Yang Perlu Diubah

#### File yang HARUS berubah:

1. **`biteship.actions.js`** → `getBiteshipRates()`
   - Tambah parameter `originCoord` dan `destCoord` (opsional).
   - Jika koordinat tersedia, kirim `origin_latitude` + `origin_longitude` dan `destination_latitude` + `destination_longitude` di payload.

2. **`checkout.actions.js`** → `getCheckoutData()`
   - Saat memanggil `getBiteshipRates()`, tambahkan `store.address.latitude` & `store.address.longitude` (origin) dan `selectedAddress.latitude` & `selectedAddress.longitude` (destination).

3. **`address-schema.js`** → Sudah ada `latitude` & `longitude` ✅
   - Field sudah tersedia di schema, tapi **saat ini kemungkinan besar belum terisi** karena form alamat (`address-form.jsx`) tidak mewajibkan pengisian koordinat.

4. **`address-form.jsx`** (Shared Component)
   - Sebaiknya tambahkan integrasi dengan **Geolocation API** atau **Google Maps Picker** agar latitude/longitude otomatis terisi saat user memilih alamat.
   - Alternatif murah: Gunakan `navigator.geolocation.getCurrentPosition()` di browser.

#### Pengaturan di Dashboard Biteship:
- ✅ Pastikan Grab & Gojek sudah **diaktifkan** di Dashboard Biteship → Pengaturan Kurir.
- ✅ Pastikan saldo Biteship cukup (API Maps/Rates berbayar Rp 5 per hit).
- ⚠️ Kurir Instan hanya tersedia untuk **rute dalam kota yang sama** (misal: Jakarta → Jakarta). Jika alamat toko di Yogyakarta dan pembeli di Jakarta, Grab/Gojek **memang tidak akan muncul**.

---

## C. MASALAH: COD (Cash on Delivery) BELUM DIDUKUNG

### Status Saat Ini
Fitur COD **sama sekali belum ada** di aplikasi KiriMart. Tidak ditemukan:
- ❌ Tidak ada opsi "Bayar di Tempat" di UI checkout.
- ❌ Tidak ada kolom `paymentMethod: "cod"` di `order-schema.js` atau `payment-schema.js`.
- ❌ Tidak ada parameter `destination_cash_on_delivery` di payload `createBiteshipOrder`.
- ❌ Tidak ada flow pencairan dana COD di seller dashboard.

### Flow COD yang Dibutuhkan (Berdasarkan Dokumentasi Biteship)

```
1. Checkout → User pilih "Bayar di Tempat (COD)"
2. Order dibuat TANPA pembayaran Midtrans
3. createBiteshipOrder() → tambah parameter:
   - destination_cash_on_delivery: grandTotal (harga barang + ongkir)
   - destination_cash_on_delivery_type: 1 (uang diterima kurir → masuk saldo COD Biteship)
4. Kurir menagih uang ke pembeli saat pengiriman
5. Dana masuk ke Saldo COD di Dashboard Biteship
6. Seller withdraw dari Dashboard Biteship → ke rekening bank
```

### File yang HARUS Berubah/Bertambah untuk COD:

| # | File | Perubahan |
|---|---|---|
| 1 | `order-schema.js` | Tambah kolom `paymentMethod` (`"online"` / `"cod"`) |
| 2 | `checkout-view.jsx` | Tambah UI pilihan "Bayar di Tempat (COD)" jika kurir mendukung |
| 3 | `biteship.actions.js` → `getBiteshipRates()` | Response sudah mengembalikan `available_for_cash_on_delivery` dari Biteship, tapi **belum di-expose ke frontend** |
| 4 | `biteship.actions.js` → `createBiteshipOrder()` | Tambah `destination_cash_on_delivery` dan `destination_cash_on_delivery_type` di payload jika mode COD |
| 5 | `checkout.actions.js` / payment flow | Buat flow alternatif: jika COD, skip Midtrans, langsung buat order + Biteship order |
| 6 | `payment-schema.js` | Tambah support `method: "cod"` dan `status: "cod_pending"` |
| 7 | `app/api/biteship/webhook/route.js` | Handle status `"delivered"` untuk COD → update payment status jadi `"paid"` (karena uang sudah diterima kurir) |
| 8 | **[NEW]** Seller Dashboard → COD Management | UI untuk melihat saldo COD & status pencairan dari Biteship |

### Pengaturan di Dashboard Biteship untuk COD:
- Buka Dashboard Biteship → **Pengaturan COD**.
- Aktifkan fitur COD dan pilih kurir yang mendukung COD (biasanya: JNE, SiCepat, J&T, AnterAja).
- Isi data rekening bank untuk pencairan dana COD.
- **Grab & Gojek TIDAK mendukung COD**.

---

## D. MASALAH: Cancel Order Tidak Tersambung ke Biteship

### Kondisi Saat Ini
Di `order.actions.js` → fungsi `cancelOrder()`:
- ✅ Mengubah status order di database → `cancelled_by_seller`
- ✅ Mengembalikan stok produk
- ✅ Membuat refund request
- ❌ **TIDAK memanggil `cancelBiteshipOrder()`**

### File yang HARUS Berubah:

| # | File | Perubahan |
|---|---|---|
| 1 | `order.actions.js` → `cancelOrder()` | Tambah: jika `order.shipment?.biteshipOrderId` ada, panggil `cancelBiteshipOrder(biteshipOrderId)` sebelum update DB |

Kode yang perlu ditambahkan (sekitar baris 647 di `order.actions.js`):
```javascript
// Jika sudah ada order di Biteship, batalkan juga di sana
if (order.shipment?.biteshipOrderId) {
    const { cancelBiteshipOrder } = await import("@/actions/public/biteship.actions")
    const cancelResult = await cancelBiteshipOrder(order.shipment.biteshipOrderId, reason)
    if (!cancelResult.success) {
        console.warn("[cancelOrder] Gagal cancel di Biteship:", cancelResult.error)
        // Lanjut cancel lokal meskipun Biteship gagal
    }
}
```

---

## E. MASALAH: Retrieve Order Biteship Belum Ada

### File yang HARUS Bertambah:

| # | File | Perubahan |
|---|---|---|
| 1 | `biteship.actions.js` | **[BARU]** Tambah fungsi `retrieveBiteshipOrder(biteshipOrderId)` → `GET /v1/orders/:id` |
| 2 | `order.actions.js` | **[BARU]** Tambah fungsi `syncOrderWithBiteship(orderId)` untuk seller → ambil status terbaru dari Biteship dan update DB |
| 3 | `order-list.jsx` (Seller Dashboard) | **[OPSIONAL]** Tambah tombol "🔄 Sync Status" untuk seller jika webhook gagal |

---

## F. RINGKASAN TOTAL FILE YANG BERUBAH/BERTAMBAH

### Untuk memperbaiki semua masalah di atas:

| # | File | Tipe | Deskripsi |
|---|---|---|---|
| 1 | `src/actions/public/biteship.actions.js` | MODIFY | Tambah koordinat di Rates, COD di Order, Retrieve Order baru |
| 2 | `src/actions/public/checkout.actions.js` | MODIFY | Kirim koordinat saat panggil getBiteshipRates |
| 3 | `src/actions/seller-dashboard/order.actions.js` | MODIFY | Sambungkan cancelOrder → cancelBiteshipOrder, tambah syncOrder |
| 4 | `src/config/db/schema/order-schema.js` | MODIFY | Tambah kolom `paymentMethod` |
| 5 | `src/features/public/checkout/checkout-view.jsx` | MODIFY | Tambah opsi COD jika kurir mendukung |
| 6 | `src/components/shared/address-form.jsx` | MODIFY | Otomatis isi latitude/longitude |
| 7 | `src/app/api/biteship/webhook/route.js` | MODIFY | Handle COD delivery = payment completed |
| 8 | `src/features/seller-dashboard/order/order-list.jsx` | MODIFY | Tombol sync status (opsional) |
| 9 | **Migration SQL** | NEW | `ALTER TABLE orders ADD COLUMN payment_method ...` |

### Prioritas Implementasi:
1. 🔴 **Grab/Gojek** → Paling mudah (tambah koordinat di 2 file)
2. 🔴 **Cancel Order** → Paling kritis (1 file, ~5 baris kode)
3. 🟡 **Retrieve Order / Sync** → Medium (2-3 file baru)
4. 🟠 **COD** → Paling besar (8+ file, flow baru, schema baru, UI baru)

# Bab 4: Webhooks & Automasi

Webhook adalah cara terbaik untuk mendapatkan update status pengiriman secara *Real-Time* tanpa membebani server dengan request API (polling). Biteship akan menembak (POST) ke endpoint URL KiriMart setiap kali ada kejadian (event).

## Keuntungan Webhook
1. **Real-time Updates:** Data mutakhir seketika saat status kurir berubah.
2. **Reduced API Load:** Menghemat resource dan menghindari batasan limit API (Rate Limiting HTTP 429).
3. **Automasi Transaksi:** Ketika webhook mengirim status `delivered`, sistem KiriMart bisa otomatis menyelesaikan pesanan dan mencairkan uang ke Saldo Seller.

## Event Tipe Webhook Biteship

### 1. `order.status`
Trigger: Setiap kali status order berubah (misal dari `picking_up` menjadi `picked`).
```json
{
    "event": "order.status",
    "courier_tracking_id": "XYZ-123-PQS",
    "courier_waybill_id": "SKS-XXXXX",
    "courier_driver_name": "Maulana Imran",
    "courier_driver_phone": "088888888888",
    "order_id": "5dd6da88f43bd430ecd5aa2e",
    "status": "confirmed"
}
```

### 2. `order.price`
Trigger: Ketika terjadi perbedaan harga. Ini biasa terjadi jika berat aktual barang yang ditimbang kurir berbeda dengan berat input seller. Harga yang dikirimkan di sini adalah harga yang akan ditagihkan secara nyata (memotong saldo/mengurangi pendapatan COD).
```json
{
    "event": "order.price",
    "shippment_fee": 10000,
    "cash_on_delivery_fee": 100000,
    "order_id": "ASjsd92Asd2d1ASdj91",
    "status": "picked"
}
```

### 3. `order.waybill_id`
Trigger: Ketika terjadi perubahan Nomor Resi (Waybill ID) oleh kurir. Sering terjadi ketika paket dipindahtangankan (handover) antar pihak kurir.
```json
{
    "event": "order.waybill_id",
    "courier_waybill_id": "abc-1234",
    "order_id": "AbSASD12213dadas",
    "status": "picked"
}
```

## Konfigurasi
Untuk mengaktifkannya, KiriMart perlu menyediakan Route Endpoint di Next.js (contoh: `POST /api/webhooks/biteship`). URL tersebut harus didaftarkan di Dashboard Biteship KiriMart bagian pengaturan Webhook.

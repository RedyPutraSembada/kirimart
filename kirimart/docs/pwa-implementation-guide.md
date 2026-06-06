# Panduan Integrasi PWA (Progressive Web App) di Next.js

Dokumen ini adalah panduan lengkap (*tutorial developer*) tentang cara mengubah aplikasi Next.js (seperti Kawan Belanja) yang sudah berjalan menjadi **Progressive Web App (PWA)**. 

PWA memungkinkan website Anda di-*install* (diunduh) oleh pengguna langsung dari browser ke beranda (Homescreen) HP atau Desktop mereka layaknya aplikasi asli (Native App). PWA juga memberikan akses ke fitur perangkat keras seperti Push Notifications yang mengatur suara notifikasi langsung melalui Sistem Operasi.

---

## 1. Persiapan Tools & Library

Di Next.js modern (versi 13+ App Router), library lawas seperti `next-pwa` sudah mulai usang. Kita akan menggunakan **Serwist** (`@serwist/next`), standar modern untuk PWA di Next.js.

### Apa yang harus diinstall?
Kita perlu menjalankan perintah ini di terminal proyek:
```bash
npm i @serwist/next serwist
```
*Atau jika menggunakan bun:* `bun add @serwist/next serwist`

---

## 2. Bagian yang Akan Diubah & Sintaksnya

Berikut adalah file-file yang harus diubah atau dibuat. Jangan khawatir, prosesnya sangat aman dan **tidak merusak logika aplikasi yang sudah ada**.

### A. Modifikasi `next.config.mjs`
**Apa yang berubah?** Kita "membungkus" konfigurasi Next.js dengan plugin Serwist.
**Efeknya:** Setiap kali aplikasi di-build, Serwist akan otomatis membuatkan file *Service Worker* (otak dari PWA) di folder `public`.

```javascript
// next.config.mjs
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts", // Lokasi source Service Worker kita
  swDest: "public/sw.js", // Lokasi file akhir setelah di-build
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... (konfigurasi Anda sebelumnya biarkan saja)
};

// Bungkus nextConfig Anda dengan withSerwist
export default withSerwist(nextConfig);
```

### B. Membuat File Manifest (`public/manifest.json`)
**Apa fungsinya?** File ini memberitahu browser (Chrome, Safari, dll) bahwa website ini adalah PWA. File ini berisi nama aplikasi, warna tema, dan ikon-ikon yang akan muncul di layar HP.
**Efeknya:** Saat diakses di browser HP, browser akan memunculkan banner "Install App".

```json
{
  "name": "Kawan Belanja",
  "short_name": "Kawan Belanja",
  "description": "Platform e-commerce terbaik dan terpercaya",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```
*(Anda harus menyiapkan logo aplikasi ukuran 192x192 dan 512x512 di dalam folder `public/icons`)*.

### C. Mendaftarkan Metadata di `layout.jsx`
**Apa fungsinya?** Memberitahu HTML untuk memanggil `manifest.json` dan mengatur warna tema di area *status bar* HP pengguna.

Tambahkan sintaks berikut di file `src/app/layout.jsx`:
```javascript
export const metadata = {
  title: "Kawan Belanja - E-commerce",
  description: "Belanja puas harga pas",
  manifest: "/manifest.json", // <-- Ini yang paling penting
  themeColor: "#ffffff",      // <-- Warna tema PWA
  appleWebApp: {              // <-- Dukungan khusus untuk iPhone (iOS)
    capable: true,
    statusBarStyle: "default",
    title: "Kawan Belanja",
  },
};
```

### D. Membuat Source File Service Worker (`src/app/sw.ts` atau `.js`)
**Apa fungsinya?** Service Worker adalah program background yang terus berjalan meskipun browser sudah ditutup. Ia bertugas mengunduh file secara diam-diam (cache) agar aplikasi tetap terbuka meski sedang *Offline* (tidak ada internet), dan menerima **Push Notifications** dari server.

```typescript
// src/app/sw.ts
import { defaultCache } from "@serwist/next/worker";
import { installSerwist } from "@serwist/sw";

installSerwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});
```

---

## 3. Apa Pengaruh/Manfaatnya Jika Ini Diterapkan?

Jika langkah-langkah di atas sudah diterapkan, berikut adalah perubahan nyata yang akan terjadi pada aplikasi Kawan Belanja Anda:

1. **Tombol "Install App" (Add to Homescreen):** 
   Pengguna akan melihat penawaran dari browser untuk menginstall Kawan Belanja. Jika ditekan, ikon Kawan Belanja akan muncul di layar HP layaknya aplikasi dari PlayStore/AppStore.
2. **Tampilan Fullscreen (Standalone):**
   Saat pengguna membuka Kawan Belanja dari ikon di Homescreen, aplikasi akan terbuka penuh (*full screen*) tanpa ada bar URL di bagian atas (seperti Chrome/Safari). Terasa 100% seperti aplikasi native asli.
3. **Mendukung Fitur Offline (Caching):**
   Jika pengguna masuk ke tempat susah sinyal, halaman yang sebelumnya sudah pernah mereka buka akan tetap bisa diakses karena Service Worker sudah menyimpannya di Cache lokal. Halaman tidak akan menampikan gambar Dinosaurus Google Chrome.
4. **Notifikasi yang Mengatasi Isu Suara Mute:**
   Untuk mengaktifkan suara notifikasi agar 100% berbunyi (tanpa diblokir fitur *browser autoplay policy*), Service Worker ini akan kita hubungkan dengan **Web Push API** (menggunakan service seperti VAPID keys). Ketika ada notifikasi pesanan baru masuk, server akan mengirim sinyal Push, lalu Service Worker akan memunculkan banner notifikasi ala Android/iOS lengkap dengan suara *Ting!* khas sistem operasi—meskipun pengguna sedang membuka aplikasi TikTok atau WhatsApp!

---

## Kesimpulan

Menambahkan PWA pada aplikasi yang sudah berjalan **sangat aman**. PWA hanyalah **"lapisan tambahan" (wrapper)**. Ia tidak merubah struktur database, tidak merubah API, dan tidak merubah desain UI (kecuali menyembunyikan URL bar saat di-install).

Jika Anda ingin menerapkan ini, pastikan Anda sudah menyiapkan **Logo Persegi (Minimal ukuran 512x512 px)**. Sisanya (menginstal library, menulis kode konfigurasi), semuanya bisa dikerjakan dengan aman dalam waktu singkat.

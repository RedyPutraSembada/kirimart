# 🤖 MASTER AI INSTRUCTIONS — Kawan Belanja

Selamat datang di repository Kawan Belanja! File ini adalah **titik masuk (entry point) utama** untuk Anda (AI) setiap kali memulai sesi baru atau menganalisis aplikasi ini.

Tujuan dari folder `docs/ai/` ini adalah memberikan konteks utuh tentang aplikasi kepada Anda secara instan, sehingga pengguna tidak perlu menjelaskan ulang dari nol setiap kali memulai percakapan baru.

## 📋 Langkah Wajib Anda (AI) Sebelum Menulis Kode

1. **Pahami Arsitektur & Peran:** Baca file [01-app-architecture-flow.md](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kawanbelanja/docs/ai/01-app-architecture-flow.md). Pahami bahwa ini adalah aplikasi E-Commerce Multi-Vendor berbasis Next.js App Router, Drizzle, dan Better-Auth.
2. **Pahami Aturan CRUD Mutlak:** Baca file [02-standard-crud.md](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kawanbelanja/docs/ai/02-standard-crud.md). Setiap kali Anda diminta membuat fitur CRUD baru, Anda **WAJIB** mengikuti standar 7-Layer ini (Zod validation ganda, format response Action, pola React Query).
3. **Pahami Alur Fitur Bisnis:** Baca file [03-feature-workflow.md](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kawanbelanja/docs/ai/03-feature-workflow.md). Pelajari bagaimana alur checkout multi-vendor, sistem websocket chat, dan background jobs berjalan di aplikasi ini.
4. **Pahami Skema Database & Relasi:** Baca file [04-schema-relations.md](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kawanbelanja/docs/ai/04-schema-relations.md). Jangan buat asumsi soal relasi. Perhatikan pemisahan `payments` (global) dan `orders` (per-toko), serta pentingnya `price_snapshot` pada `order_items`.
5. **Cek Roadmap:** Setelah memahami 4 dokumen di atas, bacalah [roadmap-feature-tracker.md](file:///c:/Putra/Ngoding%20AntiGravity/set-ecomerce/kawanbelanja/docs/roadmap-feature-tracker.md) untuk melihat fitur apa yang sudah selesai dan apa prioritas (Phase) selanjutnya yang sedang atau akan dikerjakan.

> [!IMPORTANT]
> Jika Anda sudah membaca dan memahami semua file di atas, Anda siap menerima instruksi selanjutnya dari pengguna. Jangan tanyakan hal-hal yang sudah dijelaskan secara mendetail di dokumen-dokumen tersebut. Patuhi secara ketat arsitektur dan pola penulisan kodenya.

# Dokumen Tech Stack (Step 3)

Pada langkah ini, kita harus mengunci teknologi apa saja yang akan digunakan untuk mengeksekusi arsitektur yang sudah kita buat. 

Karena Anda sebelumnya sudah secara spesifik menyebutkan **Better-Auth** (di mana *library* ini lahir dan sangat optimal di ekosistem JavaScript/TypeScript), berikut adalah rekomendasi *Tech Stack* modern yang paling relevan:

## 1. Framework Utama (Fullstack)
Rekomendasi Utama: **Next.js (App Router)** atau **Nuxt.js** (Jika Anda lebih terbiasa dengan Vue).
*Kenapa?* 
- E-Commerce **wajib** menggunakan SSR (Server Side Rendering) agar katalog produk mudah terindeks oleh Google (SEO).
- Better-Auth memiliki dukungan dan integrasi bawaan yang luar biasa untuk Next.js dan Nuxt.
- Anda bisa menyatukan kode *Frontend* UI dan *Backend* (API) di satu repositori (*monorepo*).

## 2. Database & ORM (Penghubung Database)
- **Database Utama:** **PostgreSQL** atau **MySQL**. Keduanya sangat tangguh, namun PostgreSQL lebih direkomendasikan karena relasinya lebih ketat.
- **ORM:** **Prisma** atau **Drizzle ORM**.
  - *Prisma:* Sangat mudah dibaca (deklaratif). Jika Anda melihat ERD kita sebelumnya, mengubah ERD itu menjadi skema Prisma sangatlah mudah.
  - *Drizzle:* Lebih cepat dan performanya tinggi, penulisannya sedikit lebih mirip SQL murni. 
  *(Keduanya didukung secara resmi oleh Better-Auth).*

## 3. Realtime Chat (Pengganti Convex)
Karena kita menggunakan Websocket, Anda butuh *server realtime*:
- **Pusher (atau Soketi):** Paling disarankan untuk arsitektur *serverless* seperti Next.js. Sangat mudah, stabil, dan ada *tier* gratis.
- **Socket.io Custom Server:** Gratis sepenuhnya, tetapi Anda harus mengurus *deployment* (hosting) satu server Node.js khusus tambahan hanya untuk menangani *chat*.

## 4. Penyimpanan Media (Gambar Produk, Chat, Logo)
- **UploadThing:** Paling mulus untuk TypeScript dan Next.js.
- **Cloudinary / Supabase Storage:** Pilihan klasik yang sangat handal dengan kuota gratis yang besar.

## 5. UI & Styling
- **Tailwind CSS:** Standar modern untuk merancang antarmuka.
- **Shadcn UI:** Sangat cocok digabungkan dengan Tailwind untuk membuat komponen UI (Tombol, Input, Modal) yang premium tanpa harus membuat dari nol.

---

### ✅ Pilihan Final Tech Stack (Telah Dikunci):
Berdasarkan diskusi, berikut adalah *Tech Stack* yang akan kita gunakan untuk membangun E-Commerce ini:

- **Framework Utama:** Fullstack Next.js (menggunakan JSX/JavaScript murni).
- **Authentication:** Better-Auth.
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **Realtime Chat:** Websocket.
- **Styling UI:** Tailwind CSS + Shadcn UI.
- **Image Uploader:** Menggunakan server *uploader* terpisah milik Anda (hanya menyimpan string URL di *database* kita).

Kombinasi ini sangat brutal kecepatannya (Drizzle sangat ngebut) dan secara arsitektur sangat rapi karena file *storage* terpisah dari aplikasi. Kita siap menuju **Step 4**!

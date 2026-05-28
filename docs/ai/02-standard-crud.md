# 📝 Standar Implementasi CRUD (Wajib Diikuti)

Setiap fitur CRUD baru (seperti Entitas A, Entitas B) **harus** mengikuti standar 7-Layer ini untuk menjaga konsistensi. Jika Anda (AI) ditugaskan membuat fitur CRUD baru, jangan keluar dari pola ini.

## Aturan Mutlak Layer 1 - 7

### Layer 1: Schema Database (`src/config/db/schema/{entity}-schema.js`)
- Definisi tabel menggunakan Drizzle ORM (`pgTable`).
- Gunakan `pgEnum` jika ada kolom status dengan opsi tetap.
- Export tabel dan enum secara terpisah.

### Layer 2: Zod Validation (`src/lib/validations/{dashboard}/{entity}/{entity}.js`)
- Buat file `.js` untuk Zod Schema.
- Gunakan `z.coerce.number()` untuk input form yang aslinya berupa *string* namun dimasukkan ke DB sebagai *integer*.
- Schema ini dipakai **dua kali**: di client (React Hook Form) dan di server (Server Action).

### Layer 3: Server Actions (`src/actions/{dashboard}/...`)
- Gunakan direktif `"use server"`.
- Anda dapat mengelompokkan file berdasarkan folder (misal: `src/actions/admin-dashboard/category/category.actions.js`) atau file flat jika fiturnya spesifik (misal: `src/actions/seller-dashboard/finance.actions.js`).
- Setiap file CRUD standar minimal memiliki 5 fungsi: `getAll`, `getById`, `create`, `update`, `delete`.
- **Wajib melakukan pengecekan sesi** (`auth.api.getSession`).
- **Wajib melakukan validasi ulang** dengan schema Zod.
- **Pekerjaan Latar Belakang**: Jika aksi memerlukan *background job* (seperti jeda waktu kedaluwarsa pesanan), panggil REST API internal Node.js di `/jobs/schedule`.
- **Format Return Wajib**: `{ success: true, data: result }` atau `{ success: false, error: "Pesan" }`. Jangan lempar (*throw*) error langsung ke client tanpa ditangkap try-catch.

### Layer 4: Data Hooks (`src/app/data/{dashboard}/{entity}/{entity}-data.js`)
- Bungkus Server Actions menggunakan **React Query** (`useQuery`).
- Gunakan parameter yang lengkap pada `queryKey` (misal: `["entity-name", filters, page, perPage]`) agar query refetch otomatis saat filter berubah.

### Layer 5: Feature Components (`src/features/{dashboard}/{entity}/`)
Di sini logika UI klien berjalan.
- **List Page**: Gunakan state untuk *pagination* dan *filter*, lengkapi dengan `useDebounce` untuk pencarian, panggil query dari Layer 4, sediakan komponen tabel, *PaginationBar*, *ActionMenu*, dan *ConfirmationDialog* (untuk Delete). Delete menggunakan `useMutation`.
- **Create / Edit Form**: Gunakan `useForm` (React Hook Form) + `zodResolver`. Mutasi dilakukan dengan `useMutation`.
- **Wajib memanggil `queryClient.invalidateQueries(...)`** dan menampilkan toast sukses/error setelah setiap aksi mutasi (Create/Update/Delete).
- Setelah sukses create/update, lakukan `router.push()` untuk redirect kembali ke list.

### Layer 6: Route Pages (`src/app/{dashboard}/{entity}/`)
- **Page List (`page.jsx`)**: Sebatas *Client Component* pembungkus feature `List` dari Layer 5.
- **Page Create (`create/page.jsx`)**: Sebagai *Server Component* untuk fetching data pendukung (seperti daftar kategori untuk dropdown), lalu melempar data tersebut sebagai `props` ke form.
- **Page Edit (`[id]/edit/page.jsx`)**: Sebagai *Server Component*, ambil data existing by ID (`getById`), ambil data pendukung, lalu jadikan `props` di form edit.

### Layer 7: Const Data / Shared
- Simpan opsi dropdown (seperti enum) di `src/lib/const-data.js` dalam bentuk array of `{ value, label }`.

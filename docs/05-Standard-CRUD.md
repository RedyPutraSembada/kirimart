# Standar Implementasi CRUD pada Dashboard

Dokumen ini adalah **referensi utama** untuk membangun fitur CRUD pada dashboard. Standar ini diekstraksi dari implementasi **Product CRUD** pada Seller Dashboard yang sudah berjalan dan teruji. Setiap CRUD baru (voucher, order, dll.) **wajib** mengikuti pola ini agar konsisten.

---

## Daftar Isi

1. [Stack & Teknologi](#stack--teknologi)
2. [Arsitektur & Struktur Direktori](#arsitektur--struktur-direktori)
3. [Layer 1 — DB Schema (Drizzle ORM)](#layer-1--db-schema-drizzle-orm)
4. [Layer 2 — Zod Validation Schema](#layer-2--zod-validation-schema)
5. [Layer 3 — Constant Data](#layer-3--constant-data)
6. [Layer 4 — Server Actions](#layer-4--server-actions)
7. [Layer 5 — Data Hooks (React Query)](#layer-5--data-hooks-react-query)
8. [Layer 6 — Route Pages (App Router)](#layer-6--route-pages-app-router)
9. [Layer 7 — Feature Components](#layer-7--feature-components)
10. [Shared / Reusable Components](#shared--reusable-components)
11. [Best Practices & Checklist](#best-practices--checklist)

---

## Stack & Teknologi

| Tool | Peran |
|---|---|
| **Drizzle ORM** | Definisi schema tabel & query database |
| **Zod** | Validasi data (client + server) |
| **React Hook Form** + `@hookform/resolvers/zod` | Manajemen state form |
| **React Query** (`@tanstack/react-query`) | Async state management, caching, invalidation |
| **Server Actions** (Next.js) | Backend logic, selalu return `{ success, data?, error? }` |
| **Sonner** | Toast notification |
| **use-debounce** | Debounce input pencarian |
| **Shadcn UI** | Komponen UI (Table, Dialog, Card, Form, dll.) |

---

## Arsitektur & Struktur Direktori

Setiap entitas CRUD terdiri dari **7 layer** yang tersebar di lokasi spesifik:

```
src/
├── config/db/schema/
│   └── {entity}-schema.js              ← Layer 1: DB Schema
│
├── lib/
│   ├── validations/
│   │   └── seller-dashboard/{entity}/
│   │       └── {entity}.js             ← Layer 2: Zod Schema
│   └── const-data.js                   ← Layer 3: Constant Data (enum label)
│
├── actions/
│   └── seller-dashboard/{entity}/
│       └── {entity}.actions.js         ← Layer 4: Server Actions (CRUD)
│
├── app/
│   ├── data/
│   │   └── seller-dashboard/{entity}/
│   │       └── {entity}-data.js        ← Layer 5: React Query Hooks
│   │
│   └── seller-dashboard/{entities}/
│       ├── page.jsx                    ← Layer 6: List Page
│       ├── create/page.jsx             ← Layer 6: Create Page
│       └── [id]/edit/page.jsx          ← Layer 6: Edit Page
│
├── features/
│   └── seller-dashboard/{entity}/
│       ├── {entity}-list.jsx           ← Layer 7: List + Table + Delete
│       ├── create/
│       │   └── form-create-{entity}.jsx ← Layer 7: Create Form
│       ├── edit/
│       │   └── form-edit-{entity}.jsx   ← Layer 7: Edit Form
│       └── view/
│           └── view-{entity}.jsx        ← Layer 7: View Modal
│
└── components/
    ├── table/
    │   ├── pagination-bar.jsx          ← Shared: Pagination
    │   └── action-menu.jsx             ← Shared: Action Dropdown
    └── ui/
        └── confirmation-dialog.jsx     ← Shared: Delete Confirmation
```

> **Konvensi penamaan:** Folder route menggunakan **plural** (`products/`), sedangkan folder feature menggunakan **singular** (`product/`).

---

## Layer 1 — DB Schema (Drizzle ORM)

**Lokasi:** `src/config/db/schema/{entity}-schema.js`

Definisikan tabel dan enum di sini. Contoh dari Product:

```javascript
// src/config/db/schema/product-schema.js
import { pgTable, serial, text, integer, pgEnum } from "drizzle-orm/pg-core"

// 1. Definisikan Enum terlebih dahulu
export const productStatusEnum = pgEnum("status", [
  "active", "out_of_stock", "low_stock", "draft", "inactive", "deleted", "sold_out"
]);

// 2. Definisikan Tabel
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull().default(0),
  weightGram: integer("weight_gram").notNull(),
  description: text("description"),
  status: productStatusEnum("status").default("active"),
});
```

**Aturan:**
- Satu file per entitas utama
- Gunakan `pgEnum` untuk kolom yang punya opsi tetap
- Export tabel & enum agar bisa dipakai di Server Actions

---

## Layer 2 — Zod Validation Schema

**Lokasi:** `src/lib/validations/seller-dashboard/{entity}/{entity}.js`

Schema Zod digunakan **dua kali**: di client (React Hook Form resolver) dan di server (validasi ulang di Server Action).

```javascript
// src/lib/validations/seller-dashboard/product/product.js
import { z } from "zod"

export const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(255),
  description: z.string().optional(),
  categoryId: z.coerce.number({ required_error: "Kategori wajib dipilih" }),
  weightGram: z.coerce.number({ required_error: "Berat wajib diisi" }).min(1, "Berat minimal 1 gram"),
  price: z.coerce.number({ required_error: "Harga wajib diisi" }).min(1, "Harga minimal Rp 1"),
  stock: z.coerce.number({ required_error: "Stok wajib diisi" }).min(0, "Stok minimal 0"),
  images: z.array(z.string().url("URL gambar tidak valid")).min(1, "Minimal 1 foto"),
  status: z.enum(["active","out_of_stock","low_stock","draft","inactive","deleted","sold_out"]).default("active"),
})
```

**Aturan:**
- Gunakan `z.coerce.number()` untuk field numerik dari input HTML (yang selalu string)
- Schema yang sama bisa dipakai untuk Create & Update (jika strukturnya identik)
- Pesan error dalam Bahasa Indonesia

---

## Layer 3 — Constant Data

**Lokasi:** `src/lib/const-data.js`

Data statis untuk dropdown/select yang terkait enum database:

```javascript
export const statusProduct = [
  { value: "active", label: "Aktif" },
  { value: "out_of_stock", label: "Habis" },
  { value: "low_stock", label: "Stok Menipis" },
  { value: "draft", label: "Draft" },
  { value: "inactive", label: "Tidak Aktif" },
  { value: "deleted", label: "Hapus" },
  { value: "sold_out", label: "Terjual Habis" },
]
```

**Aturan:**
- Format selalu `{ value, label }`
- `value` harus sesuai dengan enum di DB Schema & Zod
- Diimpor oleh komponen form (Create & Edit)

---

## Layer 4 — Server Actions

**Lokasi:** `src/actions/seller-dashboard/{entity}/{entity}.actions.js`

Setiap file harus mengandung **5 fungsi standar** untuk CRUD lengkap:

```
"use server"

1. getAll{Entity}s(filters, page, perPage)  → List + Pagination
2. get{Entity}ById(id)                      → Detail satu record
3. create{Entity}(data)                     → Insert baru
4. update{Entity}(id, data)                 → Update by ID
5. delete{Entity}(id)                       → Delete by ID
```

### Pola Standar Setiap Action

Semua action mengikuti pola yang sama:

```javascript
"use server"

import { db } from "@/config/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function namaAction(params) {
  try {
    // 1. Autentikasi — cek session
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return { success: false, error: "Unauthorized" }
    }

    // 2. Otorisasi — cek kepemilikan (misal: cari store milik user)
    const [store] = await db.select().from(stores)
      .where(eq(stores.userId, session.user.id)).limit(1)
    if (!store) {
      return { success: false, error: "Toko tidak ditemukan" }
    }

    // 3. Validasi data (untuk create/update) — validasi ulang di server
    const parsed = createSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: "Data tidak valid" }
    }

    // 4. Eksekusi query database
    // ... insert / update / delete / select

    // 5. Return response standar
    return { success: true, data: result }
  } catch (error) {
    console.error("namaAction error", error)
    return { success: false, error: "Terjadi kesalahan server" }
  }
}
```

### Contoh: List dengan Filter & Pagination

```javascript
export async function getSellerProducts(filters = {}, page = 1, perPage = 10) {
  try {
    // ... auth & otorisasi ...

    const offset = (page - 1) * perPage

    // 1. Bangun where conditions secara dinamis
    const whereConditions = [eq(products.storeId, store.id)];

    if (filters.name_product) {
      whereConditions.push(ilike(products.name, `%${filters.name_product}%`));
    }

    const finalWhere = and(...whereConditions);

    // 2. Query total (untuk pagination)
    const totalResult = await db
      .select({ value: count() })
      .from(products)
      .where(finalWhere);
    const total = totalResult[0].value;

    // 3. Query data (dengan relasi, limit, offset)
    const storeProducts = await db.query.products.findMany({
      where: finalWhere,
      with: { category: true, images: true },
      orderBy: (products, { desc }) => [desc(products.id)],
      limit: perPage,
      offset: offset,
    })

    // 4. Hitung next page
    const nextPage = offset + perPage < total ? page + 1 : null

    return { success: true, data: storeProducts, total, page, perPage, nextPage }
  } catch (error) {
    return { success: false, error: "Gagal mengambil data" }
  }
}
```

### Format Response Standar

| Operasi | Response Success | Response Error |
|---|---|---|
| **List** | `{ success: true, data: [], total, page, perPage, nextPage }` | `{ success: false, error: "..." }` |
| **GetById** | `{ success: true, data: {...} }` | `{ success: false, error: "..." }` |
| **Create** | `{ success: true }` | `{ success: false, error: "..." }` |
| **Update** | `{ success: true }` | `{ success: false, error: "..." }` |
| **Delete** | `{ success: true }` | `{ success: false, error: "..." }` |

---

## Layer 5 — Data Hooks (React Query)

**Lokasi:** `src/app/data/seller-dashboard/{entity}/{entity}-data.js`

Satu file berisi semua `useQuery` hooks untuk satu entitas:

```javascript
import { getCategories, getProductById, getSellerProducts } from "@/actions/seller-dashboard/product/product.actions"
import { useQuery } from "@tanstack/react-query"

// Hook untuk list data (dengan filter & pagination sebagai queryKey)
export function useGetSellerProducts(filters, page, perPage) {
  return useQuery({
    queryFn: async () => getSellerProducts(filters, page, perPage),
    queryKey: ["seller-products", filters, page, perPage],
  })
}

// Hook untuk detail by ID
export function useGetProductById(productId) {
  return useQuery({
    queryFn: async () => getProductById(productId),
    queryKey: ["seller-products", productId],
  })
}

// Hook untuk data pendukung (dropdown, relasi)
export function useGetCategories() {
  return useQuery({
    queryFn: async () => getCategories(),
    queryKey: ["categories"],
  })
}
```

**Aturan QueryKey:**
- List hook: `["entity-list", filters, page, perPage]` — berubah otomatis saat filter/page berubah
- Detail hook: `["entity-list", entityId]` — agar bisa di-invalidate bersama list
- Saat `invalidateQueries`, gunakan prefix: `queryKey: ["seller-products"]` akan invalidate **semua** query yang dimulai dengan key tersebut

---

## Layer 6 — Route Pages (App Router)

Route pages berfungsi sebagai **connector** antara server data-fetching dan client components.

### List Page — `page.jsx` (Client Component via Feature)

```javascript
// src/app/seller-dashboard/products/page.jsx
import { ProductList } from "@/features/seller-dashboard/product/product-list"

export default function ProductsPage() {
  return <ProductList />
}
```

> List page cukup render feature component saja. Semua fetching dilakukan di client via React Query.

### Create Page — `create/page.jsx` (Server Component)

```javascript
// src/app/seller-dashboard/products/create/page.jsx
import { getCategories } from "@/actions/seller-dashboard/product/product.actions"
import { FormCreateProduct } from "@/features/seller-dashboard/product/create/form-create-product"

export default async function NewProductPage() {
  // Fetch data pendukung (dropdown) di server
  const categoriesProduct = await getCategories()
  if (!categoriesProduct.success) {
    return <div>Error loading categories</div>
  }
  return <FormCreateProduct categories={categoriesProduct.data} />
}
```

### Edit Page — `[id]/edit/page.jsx` (Server Component)

```javascript
// src/app/seller-dashboard/products/[id]/edit/page.jsx
import { getCategories, getProductById } from "@/actions/seller-dashboard/product/product.actions"
import { FormEditProduct } from "@/features/seller-dashboard/product/edit/form-edit-product"

export default async function EditProductPage({ params }) {
  const id = (await params).id

  // Fetch data existing + data pendukung di server
  const dataProduct = await getProductById(id)
  if (!dataProduct.success) return <div>Error loading product</div>

  const categoriesProduct = await getCategories()
  if (!categoriesProduct.success) return <div>Error loading categories</div>

  return <FormEditProduct categories={categoriesProduct.data} dataProduct={dataProduct.data} />
}
```

**Pola Route Pages:**
- **List**: Client-side fetching (via React Query di feature component)
- **Create**: Server-side fetch data pendukung → pass sebagai props
- **Edit**: Server-side fetch existing data + data pendukung → pass sebagai props
- **View**: Tidak punya route sendiri — ditampilkan sebagai **Dialog/Modal** di list page

---

## Layer 7 — Feature Components

### 7A. List Component (`{entity}-list.jsx`)

Komponen utama yang menggabungkan: **Tabel Data + Search/Filter + Pagination + View Modal + Delete Confirmation**.

**Pola state management:**

```javascript
"use client"

export function ProductList() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // --- State Management ---
  const [deleteConfirm, setDeleteConfirm] = useState(null)   // { id } atau null
  const [viewProduct, setViewProduct] = useState(null)        // productId atau null
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const resPerPage = [5, 10, 20, 50]

  // Filter state
  const [filters, setFilters] = useState({ name_product: '' })
  const [debouncedNameProduct] = useDebounce(filters.name_product, 1000)

  // --- Data Fetching ---
  const { data: products, isLoading, error } = useGetSellerProducts(
    { ...filters, name_product: debouncedNameProduct },
    page, pageSize
  );

  // --- Delete Mutation ---
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] })
      toast.success("Produk berhasil dihapus")
    },
    onError: (error) => toast.error(error.message)
  })

  // --- Handlers ---
  const handleViewProduct = (id) => setViewProduct(id)
  const handleEditProduct = (id) => router.push(`/seller-dashboard/products/${id}/edit`)
  const handleDeleteProduct = (id) => setDeleteConfirm({ id })

  return (
    <div>
      {/* 1. Header + Tombol Tambah */}
      {/* 2. Summary Cards (opsional) */}
      {/* 3. Search/Filter Bar */}
      {/* 4. Data Table */}
      {/* 5. PaginationBar component */}
      {/* 6. ViewModal component */}
      {/* 7. ConfirmationDialog component */}
    </div>
  )
}
```

**Status Badge Config** — definisikan di luar komponen:

```javascript
const statusCfg = {
  active: { label: "Aktif", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 ..." },
  out_of_stock: { label: "Habis", cls: "border-red-300 text-red-700 bg-red-50 ..." },
  // ... status lainnya
}
const DEFAULT_STATUS = { label: "Tidak Diketahui", cls: "border-gray-300 ..." }
```

### 7B. Create Form (`form-create-{entity}.jsx`)

```javascript
"use client"

export function FormCreateProduct({ categories }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  // 1. Setup React Hook Form + Zod
  const form = useForm({
    resolver: zodResolver(createProductSchema),
    defaultValues: { name: "", price: "", stock: "", images: [], ... },
  })

  // 2. Create Mutation
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] })
      toast.success("Produk berhasil ditambahkan!")
      router.push("/seller-dashboard/products")  // redirect ke list
    },
    onError: (error) => {
      toast.error(error?.message ?? "Gagal menambahkan produk.")
      setIsPending(false)
    },
  })

  // 3. Submit handler
  async function onSubmit(data) {
    setIsPending(true)
    try { await createMutation.mutateAsync(data) }
    catch { setIsPending(false) }
  }

  // 4. Render: Header + Form + Sidebar Summary
}
```

### 7C. Edit Form (`form-edit-{entity}.jsx`)

Perbedaan utama dari Create Form:

```javascript
export function FormEditProduct({ categories, dataProduct }) {
  // 1. Default values diisi dari dataProduct
  const form = useForm({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: dataProduct.name || "",
      categoryId: dataProduct.categoryId ? String(dataProduct.categoryId) : "",
      images: dataProduct?.images?.map((img) => img.imageUrl) || [],
      // ... field lainnya
    },
  })

  // 2. Mutation memanggil updateProduct(id, data)
  const updateMutation = useMutation({
    mutationFn: (data) => updateProduct(dataProduct.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] })
      toast.success("Produk berhasil diperbarui!")
      router.push("/seller-dashboard/products")
    },
  })

  // 3. Image state menyimpan { previewUrl, serverUrl } untuk sinkronisasi
  const [images, setImages] = useState(
    dataProduct?.images?.map((img) => ({
      previewUrl: img.imageUrl,
      serverUrl: img.imageUrl,
    })) || []
  )
}
```

### 7D. View Modal (`view-{entity}.jsx`)

View menggunakan **Dialog** (bukan halaman terpisah), ditrigger dari list:

```javascript
export function ViewProductModal({ productId, open, onClose }) {
  const [activeImg, setActiveImg] = useState(0)
  const { data, isLoading, error } = useGetProductById(productId)
  const product = data?.data

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { setActiveImg(0); onClose() } }}>
      <DialogContent>
        {isLoading && <ProductViewSkeleton />}
        {error && <p>Gagal memuat data.</p>}
        {!isLoading && product && (
          <div>
            {/* Image Gallery (main + thumbnails) */}
            {/* Product Info Grid */}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

## Shared / Reusable Components

### PaginationBar (`src/components/table/pagination-bar.jsx`)

Komponen pagination yang bisa digunakan di semua tabel list:

```jsx
<PaginationBar
  pageSize={pageSize}
  page={page}
  handlePerPage={handlePerPageChange}
  pageCount={Math.ceil((data?.total || 0) / pageSize)}
  pageIndex={page - 1}
  handlePage={handlePageChange}
  resPerPage={[5, 10, 20, 50]}
/>
```

### ConfirmationDialog (`src/components/ui/confirmation-dialog.jsx`)

Dialog konfirmasi untuk aksi destruktif (delete):

```jsx
<ConfirmationDialog
  open={!!deleteConfirm}
  onClose={() => setDeleteConfirm(null)}
  title="Are you sure?"
  description="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  isLoading={deleteMutation.isPending}
  onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
/>
```

### ActionMenu (`src/components/table/action-menu.jsx`)

Dropdown menu standar untuk kolom Aksi di tabel (opsional, bisa juga inline):

```jsx
<ActionMenu
  onView={() => handleView(id)}
  onEdit={() => handleEdit(id)}
  onDelete={() => handleDelete(id)}
  isView={true}
  isEdit={true}
  isDelete={true}
/>
```

---

## Best Practices & Checklist

### Checklist Membuat CRUD Baru

- [ ] **Layer 1**: Buat DB schema di `src/config/db/schema/{entity}-schema.js`
- [ ] **Layer 2**: Buat Zod schema di `src/lib/validations/seller-dashboard/{entity}/{entity}.js`
- [ ] **Layer 3**: Tambah constant data (enum labels) di `src/lib/const-data.js`
- [ ] **Layer 4**: Buat 5 Server Actions di `src/actions/seller-dashboard/{entity}/{entity}.actions.js`
- [ ] **Layer 5**: Buat React Query hooks di `src/app/data/seller-dashboard/{entity}/{entity}-data.js`
- [ ] **Layer 6**: Buat route pages (list, create, `[id]/edit`)
- [ ] **Layer 7**: Buat feature components (list, create form, edit form, view modal)
- [ ] Pastikan semua action return format `{ success, data?, error? }`
- [ ] Pastikan `invalidateQueries` dipanggil setelah setiap mutasi sukses
- [ ] Pastikan validasi Zod dilakukan **dua kali** (client + server)

### Aturan Mutasi (Create / Update / Delete)

| Aturan | Penjelasan |
|---|---|
| **Format Response** | Selalu `{ success: true/false, data?, error? }` — jangan throw error ke client |
| **Validasi Ganda** | Zod di client (UX instan) + Zod di server (keamanan) |
| **Invalidate Cache** | `queryClient.invalidateQueries({ queryKey: ["entity-prefix"] })` setelah mutasi sukses |
| **Toast Notification** | `toast.success()` untuk sukses, `toast.error()` untuk gagal |
| **Redirect** | `router.push()` ke halaman list setelah create/update sukses |

### Aturan Query (Read / GET Data)

| Aturan | Penjelasan |
|---|---|
| **Pisahkan Hook** | File terpisah di `src/app/data/` — reusable, bersih |
| **QueryKey Deskriptif** | `["seller-products", filters, page]` — otomatis refetch saat params berubah |
| **Loading State** | Gunakan `isLoading` untuk Skeleton, bukan useState manual |
| **Debounce Search** | Gunakan `useDebounce` (1000ms) untuk filter pencarian |
| **Akses Data** | Selalu via `response?.data` karena server return `{ success, data }` |

### Aturan Image Upload

| Aturan | Penjelasan |
|---|---|
| **Upload ke server eksternal** | Via `fetch` ke `UPLOAD_URI` dengan API key |
| **Validasi ukuran** | Cek `file.size` sebelum upload, bandingkan dengan `MAX_FILE_SIZE_MB` |
| **Preview vs Server URL** | Create: `imagesPreviews[]` + `field.value[]` terpisah. Edit: gabung jadi `{ previewUrl, serverUrl }[]` |
| **Form value = URL array** | Yang disimpan ke form field adalah array of string URL (bukan file object) |
| **Loading indicator** | Tampilkan `<Loader2 />` spinner saat upload sedang berjalan |

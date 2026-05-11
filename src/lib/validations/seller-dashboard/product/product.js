import { z } from "zod"

export const createProductSchema = z.object({
	name: z.string().min(1, "Nama produk wajib diisi").max(255),
	description: z.string().optional(),
	categoryId: z.coerce.number({ required_error: "Kategori wajib dipilih" }),
	weightGram: z.coerce.number({ required_error: "Berat wajib diisi" }).min(1, "Berat minimal 1 gram"),
	price: z.coerce.number({ required_error: "Harga wajib diisi" }).min(1, "Harga minimal Rp 1"),
	stock: z.coerce.number({ required_error: "Stok wajib diisi" }).min(0, "Stok minimal 0"),
	images: z.array(z.string().url("URL gambar tidak valid")).min(1, "Minimal harus ada 1 foto produk"),
	status: z.enum(["active", "out_of_stock", "low_stock", "draft", "inactive", "deleted", "sold_out"]).default("active"),
})

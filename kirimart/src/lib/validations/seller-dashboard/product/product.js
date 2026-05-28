import { z } from "zod"

export const createProductSchema = z.object({
	name: z.string().min(1, "Nama produk wajib diisi").max(255),
	description: z.string().optional(),
	categoryId: z.coerce.number({ required_error: "Kategori wajib dipilih" }),
	weightGram: z.coerce.number({ required_error: "Berat wajib diisi" }).min(1, "Berat minimal 1 gram"),

	// Harga utama
	basePrice: z.coerce.number({ required_error: "Harga wajib diisi" }).min(1, "Harga minimal Rp 1"),
	// Harga coret (opsional) — "" → null, angka valid → number
	originalPrice: z.preprocess(
		(val) => (val === "" || val === null || val === undefined ? null : Number(val)),
		z.number().min(1).nullable().optional()
	),

	baseStock: z.coerce.number({ required_error: "Stok wajib diisi" }).min(0, "Stok minimal 0"),
	images: z.array(z.string().url("URL gambar tidak valid")).min(1, "Minimal harus ada 1 foto produk"),
	status: z.enum(["active", "out_of_stock", "low_stock", "draft", "inactive", "deleted", "sold_out"]).default("active"),

	// Variants support
	hasVariants: z.boolean().default(false),
	options: z.array(z.object({
		name: z.string().min(1, "Nama opsi wajib diisi"),
		values: z.array(z.string().min(1)).min(1, "Minimal 1 nilai opsi"),
		displayType: z.enum(["text", "image"]).default("text"),
	})).optional(),

	// Variants: setiap baris = 1 kombinasi nyata yang ada stoknya
	variants: z.array(z.object({
		attributes: z.record(z.string()),
		price: z.coerce.number().min(1, "Harga varian minimal Rp 1"),
		originalPrice: z.preprocess(
			(val) => (val === "" || val === null || val === undefined ? null : Number(val)),
			z.number().min(1).nullable().optional()
		),
		stock: z.coerce.number().min(0, "Stok varian minimal 0"),
		sku: z.string().optional().nullable(),
		imageUrl: z.string().optional().nullable(),
	})).optional(),

}).superRefine((data, ctx) => {
	// Validasi: originalPrice harus > basePrice jika diisi
	if (data.originalPrice && data.originalPrice <= data.basePrice) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Harga coret harus lebih besar dari harga jual",
			path: ["originalPrice"],
		})
	}

	// Validasi: jika hasVariants, wajib ada minimal 1 opsi dan 1 varian
	if (data.hasVariants) {
		if (!data.options || data.options.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Tambahkan minimal 1 opsi varian",
				path: ["options"],
			})
		}
		if (!data.variants || data.variants.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Minimal harus ada 1 kombinasi varian yang aktif",
				path: ["variants"],
			})
		}
	}
})

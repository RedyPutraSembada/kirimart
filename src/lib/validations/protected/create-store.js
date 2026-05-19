import * as z from "zod"

export const createStoreSchema = z.object({
	name: z.string().min(3, "Nama toko minimal 3 karakter").max(50, "Nama toko maksimal 50 karakter"),
	domainSlug: z
		.string()
		.min(3, "Domain minimal 3 karakter")
		.max(30, "Domain maksimal 30 karakter")
		.regex(/^[a-z0-9-]+$/, "Domain hanya boleh berisi huruf kecil, angka, dan strip (-)"),
	province: z.string().min(3, "Provinsi harus diisi"),
	city: z.string().min(3, "Kota harus diisi"),
	detailAddress: z.string().min(10, "Alamat detail minimal 10 karakter"),
	logo: z.string().nullable().optional(),
	banner: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	// Informasi Rekening Bank (Wajib saat mendaftar)
	bankName: z.string().min(2, "Nama bank wajib diisi"),
	bankAccountNumber: z.string().min(5, "Nomor rekening minimal 5 digit").max(30, "Nomor rekening terlalu panjang"),
	bankAccountHolder: z.string().min(3, "Nama pemilik rekening wajib diisi"),
})


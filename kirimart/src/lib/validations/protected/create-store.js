import * as z from "zod"

export const createStoreSchema = z.object({
	name: z.string().min(3, "Nama toko minimal 3 karakter").max(50, "Nama toko maksimal 50 karakter"),
	domainSlug: z
		.string()
		.min(3, "Domain minimal 3 karakter")
		.max(30, "Domain maksimal 30 karakter")
		.regex(/^[a-z0-9-]+$/, "Domain hanya boleh berisi huruf kecil, angka, dan strip (-)"),
	recipientName: z.string().min(3, "Nama penerima wajib diisi"),
	recipientPhone: z.string().min(9, "Nomor handphone wajib diisi"),
	label: z.string().optional(),
	biteshipAreaId: z.string().min(1, "Wilayah wajib dipilih"),
	provinceName: z.string().optional(),
	cityName: z.string().optional(),
	kecamatanName: z.string().optional(),
	provinceId: z.string().optional(),
	cityId: z.string().optional(),
	kecamatanId: z.string().optional(),
	kelurahanId: z.string().optional(),
	zipcode: z.string().optional(),
	detailAddress: z.string().min(10, "Alamat detail minimal 10 karakter"),
	latitude: z.number().nullable().optional(),
	longitude: z.number().nullable().optional(),
	logo: z.string().nullable().optional(),
	banner: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	// Informasi Rekening Bank (Wajib saat mendaftar)
	bankName: z.string().min(2, "Nama bank wajib diisi"),
	bankAccountNumber: z.string().min(5, "Nomor rekening minimal 5 digit").max(30, "Nomor rekening terlalu panjang"),
	bankAccountHolder: z.string().min(3, "Nama pemilik rekening wajib diisi"),
})
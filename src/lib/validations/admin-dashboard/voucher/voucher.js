import { z } from "zod"

export const createVoucherAdminSchema = z.object({
	name: z.string().min(1, "Nama voucher wajib diisi").max(100, "Nama voucher maksimal 100 karakter"),
	code: z.string().min(3, "Kode voucher minimal 3 karakter").max(20, "Kode voucher maksimal 20 karakter"),
	discountType: z.enum(["fixed", "percentage", "free_shipping"], {
		required_error: "Tipe diskon wajib dipilih"
	}),
	discountValue: z.coerce.number({ required_error: "Nilai diskon wajib diisi" }).min(1, "Nilai diskon minimal 1"),
	maxDiscount: z.coerce.number().min(0).optional().nullable(),
	minPurchase: z.coerce.number({ required_error: "Minimum belanja wajib diisi" }).min(0, "Minimum belanja minimal 0").default(0),
	quota: z.coerce.number({ required_error: "Kuota wajib diisi" }).min(1, "Kuota minimal 1").default(100),
	startDate: z.coerce.date({ required_error: "Tanggal mulai wajib diisi" }),
	endDate: z.coerce.date({ required_error: "Tanggal berakhir wajib diisi" }),
	status: z.enum(["active", "inactive", "expired"]).default("active"),
	imageUrl: z.string().url("URL gambar tidak valid").optional().nullable(),
}).refine((data) => data.endDate > data.startDate, {
	message: "Tanggal berakhir harus setelah tanggal mulai",
	path: ["endDate"],
})

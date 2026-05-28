import { z } from "zod"

export const updateProfileSchema = z.object({
	name: z.string().min(1, "Nama wajib diisi").max(255),
	image: z.string().url("URL foto tidak valid").optional().nullable(),
	phoneNumber: z.string().min(10, "Nomor telepon minimal 10 digit").max(15).optional().nullable().or(z.literal("")),
})

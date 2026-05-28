import { z } from "zod"

export const banStoreSchema = z.object({
	banReason: z.string().min(3, "Alasan pemblokiran minimal 3 karakter").optional().nullable(),
})

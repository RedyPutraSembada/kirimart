import { z } from "zod"

export const banProductSchema = z.object({
	banReason: z.string().min(3, "Alasan pemblokiran minimal 3 karakter").optional().nullable(),
})

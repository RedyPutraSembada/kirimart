import { z } from "zod"

export const updateUserRoleSchema = z.object({
	role: z.string().min(1, "Role wajib diisi"),
})

export const banUserSchema = z.object({
	banReason: z.string().min(3, "Alasan ban minimal 3 karakter").optional().nullable(),
	banExpires: z.coerce.date().optional().nullable(),
})

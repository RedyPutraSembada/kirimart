import { z } from "zod"

export const categorySchema = z.object({
	parentId: z.coerce.number().optional().nullable(),
	name: z.string().min(2, "Nama kategori minimal 2 karakter"),
	slug: z.string().regex(/^[a-z0-9-]+$/, "Slug hanya boleh berisi huruf kecil, angka, dan strip (-)"),
	iconUrl: z.string().url("URL gambar tidak valid").optional().nullable().or(z.literal("")),
	description: z.string().optional().nullable(),
	isActive: z.boolean().default(true),
})

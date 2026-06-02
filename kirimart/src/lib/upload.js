import { env } from "@/config/env"
import { toast } from "sonner"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY
const MAX_FILE_SIZE_MB = 5
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Upload file ke server upload dan mengembalikan URL publik.
 * Digunakan oleh form produk, form review, dan komponen lainnya.
 *
 * @param {File} file
 * @returns {Promise<string>} URL publik dari file yang diupload, atau "" jika gagal.
 */
export async function uploadFile(file) {
	if (!file) return ""

	// Validation
	if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
		toast.error(`Ukuran file maksimal ${MAX_FILE_SIZE_MB}MB`)
		return ""
	}
	if (!ALLOWED_TYPES.includes(file.type)) {
		toast.error("Format file harus JPEG, PNG, atau WEBP")
		return ""
	}

	const formData = new FormData()
	formData.append("file", file)
	try {
		const response = await fetch(`${uriUpload}/upload`, {
			method: "POST",
			headers: { "x-api-key": uploadApiKey ?? "" },
			body: formData,
		})
		if (!response.ok) throw new Error(response.statusText)
		const data = await response.json()
		return data?.file?.url ?? ""
	} catch (error) {
		console.error("Upload error:", error)
		toast.error("Gagal mengunggah gambar")
		return ""
	}
}

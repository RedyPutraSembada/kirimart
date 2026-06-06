import { env } from "@/config/env"
import { toast } from "sonner"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY
const MAX_IMAGE_SIZE_MB = 5
const MAX_VIDEO_SIZE_MB = 50
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

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
	const isVideo = file.type.startsWith("video/")
	const isImage = file.type.startsWith("image/")

	if (!isImage && !isVideo) {
		toast.error("Format file tidak didukung. Gunakan gambar (JPEG/PNG/WEBP) atau video (MP4/WEBM/MOV).")
		return ""
	}

	if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
		toast.error("Format gambar harus JPEG, PNG, atau WEBP")
		return ""
	}

	if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
		toast.error("Format video harus MP4, WEBM, atau MOV")
		return ""
	}

	const maxSizeMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB
	if (file.size > maxSizeMB * 1024 * 1024) {
		toast.error(`Ukuran ${isVideo ? "video" : "gambar"} maksimal ${maxSizeMB}MB`)
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
		toast.error("Gagal mengunggah file")
		return ""
	}
}

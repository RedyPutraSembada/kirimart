import { env } from "@/config/env"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY

/**
 * Upload file ke server upload dan mengembalikan URL publik.
 * Digunakan oleh form produk, form review, dan komponen lainnya.
 *
 * @param {File} file
 * @returns {Promise<string>} URL publik dari file yang diupload, atau "" jika gagal.
 */
export async function uploadFile(file) {
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
	} catch {
		return ""
	}
}

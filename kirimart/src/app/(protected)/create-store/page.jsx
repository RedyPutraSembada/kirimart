import { CreateStoreForm } from "@/features/create-store/create-store-form"

export const metadata = {
	title: "Buka Toko | KiriMart",
	description: "Daftar untuk mulai berjualan di KiriMart.",
}

export default function CreateStorePage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-muted/40 py-12 px-4 sm:px-6 lg:px-8">
			<CreateStoreForm />
		</div>
	)
}

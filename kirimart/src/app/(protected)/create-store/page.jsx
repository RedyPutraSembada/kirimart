import { CreateStoreForm } from "@/features/create-store/create-store-form"
import { Store, Sparkles } from "lucide-react"

export const metadata = {
	title: "Buka Toko | Kawan Belanja",
	description: "Daftar untuk mulai berjualan di Kawan Belanja.",
}

export default function CreateStorePage() {
	return (
		<div className="min-h-screen flex w-full">
			{/* Kiri: Bagian Branding/Dekoratif - Dibuat sticky */}
			<div className="hidden lg:flex w-1/2 relative bg-primary/5 border-r overflow-hidden items-center justify-center sticky top-0 h-screen">
				{/* Background dekoratif */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/5" />
				<div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-60" />
				<div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-60" />
				
				<div className="relative z-10 flex flex-col items-center justify-center px-12 text-center max-w-lg">
					<div className="mb-8 relative flex items-center justify-center w-48 h-48 bg-background/50 rounded-full drop-shadow-2xl border border-primary/20 shadow-[0_0_60px_rgba(0,0,0,0.05)] backdrop-blur-sm hover:scale-105 transition-transform duration-500">
						<Store className="w-24 h-24 text-primary drop-shadow-md" />
						<div className="absolute top-4 right-4 bg-background p-2 rounded-full shadow-lg border border-border/50 animate-bounce">
							<Sparkles className="w-6 h-6 text-yellow-500" />
						</div>
					</div>
					<h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
						Jadilah Bagian dari <span className="text-primary">Kawan Belanja</span>
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed">
						Buka tokomu sekarang dan jangkau jutaan pelanggan. Kembangkan bisnismu dengan platform yang mudah, cepat, dan aman.
					</p>
					
					<div className="mt-10 grid grid-cols-2 gap-4 w-full">
						<div className="bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-sm text-left hover:shadow-md transition-shadow">
							<h3 className="font-semibold text-primary mb-1">Mudah Digunakan</h3>
							<p className="text-sm text-muted-foreground">Sistem manajemen yang ramah pengguna</p>
						</div>
						<div className="bg-background/80 backdrop-blur-sm p-4 rounded-xl border shadow-sm text-left hover:shadow-md transition-shadow">
							<h3 className="font-semibold text-primary mb-1">Aman & Terpercaya</h3>
							<p className="text-sm text-muted-foreground">Transaksi dijamin aman 100%</p>
						</div>
					</div>
				</div>
			</div>

			{/* Kanan: Form Pembuatan Toko */}
			<div className="w-full lg:w-1/2 flex flex-col justify-center min-h-screen bg-muted/20 relative">
				{/* Header Mobile - Menampilkan ikon di mobile karena panel kiri di-hidden */}
				<div className="lg:hidden flex flex-col items-center justify-center pt-10 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
					<div className="mb-6 relative flex items-center justify-center w-32 h-32 bg-background/50 rounded-full drop-shadow-xl border border-primary/20 backdrop-blur-sm">
						<Store className="w-16 h-16 text-primary" />
						<div className="absolute top-1 right-1 bg-background p-1.5 rounded-full shadow-lg border border-border/50">
							<Sparkles className="w-4 h-4 text-yellow-500" />
						</div>
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground text-center px-4">
						Mulai Berjualan di Kawan Belanja
					</h1>
				</div>

				<div className="flex-1 overflow-y-auto py-8 lg:py-12 px-4 sm:px-6 lg:px-12 xl:px-16">
					<div className="max-w-2xl mx-auto">
						<CreateStoreForm />
					</div>
				</div>
			</div>
		</div>
	)
}

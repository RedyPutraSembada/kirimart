"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUserWishlists, toggleWishlist } from "@/actions/user-dashboard/wishlist.actions"
import { ProductCard } from "@/components/public/product-card"
import { Button } from "@/components/ui/button"
import { Heart, Loader2, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Konversi format data wishlist → format yang diterima ProductCard
function toProductCardFormat(item) {
	const p = item.product
	if (!p) return null
	return {
		id: p.id,
		name: p.name,
		price: p.basePrice,
		originalPrice: p.originalPrice,
		img: p.images?.[0]?.imageUrl || null,
		rating: p.rating,
		totalReviews: p.totalReviews,
		soldCount: p.soldCount,
		store: p.store,
		location: p.store?.city,
	}
}

export function WishlistPage() {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery({
		queryKey: ["my-wishlists"],
		queryFn: getUserWishlists,
	})

	const removeMutation = useMutation({
		mutationFn: (productId) => toggleWishlist(productId),
		onSuccess: (result, productId) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["my-wishlists"] })
				// Sinkronkan status di ProductCard juga
				queryClient.invalidateQueries({ queryKey: ["wishlist-status", productId] })
			} else {
				toast.error(result.error || "Gagal menghapus dari wishlist.")
			}
		},
		onError: () => toast.error("Terjadi kesalahan."),
	})

	const wishlists = data?.data || []

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-3">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat wishlist...</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Wishlist Saya</h1>
				<p className="text-muted-foreground">
					{wishlists.length > 0
						? `${wishlists.length} produk tersimpan`
						: "Produk favorit Anda akan muncul di sini"}
				</p>
			</div>

			{wishlists.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-20 gap-4 text-center border rounded-xl bg-muted/30">
					<div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
						<Heart className="h-8 w-8 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<p className="font-semibold">Wishlist masih kosong</p>
						<p className="text-sm text-muted-foreground">
							Klik ikon ❤️ di produk yang Anda suka untuk menyimpannya di sini.
						</p>
					</div>
					<Button asChild variant="outline" className="rounded-full mt-2">
						<Link href="/katalog">
							<ShoppingBag className="h-4 w-4 mr-2" />
							Jelajahi Produk
						</Link>
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
					{wishlists.map((item) => {
						const product = toProductCardFormat(item)
						if (!product) return null
						return (
							<div key={item.id} className="relative group">
								<ProductCard product={product} />
								{/* Tombol hapus dari wishlist */}
								<button
									onClick={() => removeMutation.mutate(product.id)}
									disabled={removeMutation.isPending}
									aria-label="Hapus dari wishlist"
									className="absolute top-2 right-2 z-20 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-sm hover:bg-destructive hover:text-white hover:border-destructive transition-all duration-200"
								>
									<Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 group-hover:fill-white group-hover:text-white transition-colors" />
								</button>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

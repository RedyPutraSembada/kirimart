"use client"

import Link from "next/link"
import Image from "next/image"
import { Star, MapPin, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toggleWishlist, checkIsWishlisted } from "@/actions/user-dashboard/wishlist.actions"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function ProductCard({ product, className }) {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price
  const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0
  const isStar = product.isStar || product.store?.isStar
  const location = product.location || product.store?.city || "Indonesia"

  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  // Cek status wishlist untuk produk ini
  const { data: wishlistData } = useQuery({
    queryKey: ["wishlist-status", product.id, session?.user?.id],
    queryFn: () => checkIsWishlisted(product.id),
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 menit
  })
  const isWishlisted = wishlistData?.isWishlisted ?? false

  // Optimistic update toggle wishlist
  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlist(product.id),
    onMutate: async () => {
      // Optimistic update — langsung ubah UI sebelum server merespons
      await queryClient.cancelQueries({ queryKey: ["wishlist-status", product.id, session?.user?.id] })
      const previous = queryClient.getQueryData(["wishlist-status", product.id, session?.user?.id])
      queryClient.setQueryData(["wishlist-status", product.id, session?.user?.id], (old) => ({
        ...old,
        isWishlisted: !old?.isWishlisted,
      }))
      return { previous }
    },
    onSuccess: (result) => {
      if (!result.success) {
        if (result.requireLogin) {
          toast.info("Silakan login untuk menambahkan ke wishlist.")
        } else {
          toast.error(result.error)
        }
      } else {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: ["my-wishlists"] })
      }
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic update jika gagal
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["wishlist-status", product.id, session?.user?.id], context.previous)
      }
      toast.error("Gagal memperbarui wishlist.")
    },
  })

  const handleWishlistClick = (e) => {
    e.preventDefault() // Jangan trigger Link navigasi
    e.stopPropagation()
    wishlistMutation.mutate()
  }

  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-xl overflow-hidden border border-border/40 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5 transition-all duration-300 hover:-translate-y-0.5",
      className
    )}>
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-black flex items-center justify-center">
        {product.img ? (
          product.img.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
            <video src={product.img} className="w-full h-full object-cover" muted loop autoPlay playsInline />
          ) : (
            <Image
              src={product.img}
              alt={product.name}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
            📦
          </div>
        )}
        {discountPercent > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-500 text-white text-[9px] font-bold h-5 px-1.5 border-none rounded-md">
            {discountPercent}%
          </Badge>
        )}
        {isStar && (
          <Badge className="absolute top-2 right-2 bg-primary hover:bg-primary text-[8px] font-black h-4 px-1.5 border-none rounded shadow-sm italic tracking-tight">
            STAR
          </Badge>
        )}

        {/* Tombol Wishlist ❤️ — muncul saat hover */}
        <button
          onClick={handleWishlistClick}
          aria-label={isWishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
          className={cn(
            "absolute bottom-2 right-2 z-20 h-7 w-7 rounded-full flex items-center justify-center shadow-md border transition-all duration-200",
            "opacity-0 group-hover:opacity-100", // Muncul saat hover kartu
            isWishlisted
              ? "bg-rose-500 border-rose-500 text-white opacity-100" // Selalu tampil jika sudah di-wishlist
              : "bg-background/80 backdrop-blur-sm border-border/50 hover:bg-rose-500 hover:border-rose-500 hover:text-white"
          )}
        >
          <Heart className={cn(
            "h-3.5 w-3.5 transition-all",
            isWishlisted ? "fill-white text-white" : "fill-none text-foreground"
          )} />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 space-y-1.5">
        <h3 className="text-xs font-medium leading-snug text-foreground line-clamp-2 min-h-[32px] group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        <div className="space-y-0.5">
          <p className="text-sm font-bold text-foreground tracking-tight">{fmt(product.price)}</p>
          {hasDiscount && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground line-through">{fmt(product.originalPrice)}</span>
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border/30 mt-auto">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-semibold">{product.rating || "5.0"}</span>
            {product.totalReviews > 0 && (
              <span className="text-[10px] text-muted-foreground">({product.totalReviews})</span>
            )}
            <span className="text-[10px] text-muted-foreground">| {product.soldCount || "0"} terjual</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5" />
          <span className="truncate max-w-[80px]">{location}</span>
        </div>
      </div>

      <Link href={`/product/${product.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">Lihat {product.name}</span>
      </Link>
    </div>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { Star, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function ProductCard({ product, className }) {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price
  const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0
  const isStar = product.isStar || product.store?.isStar
  const location = product.location || product.store?.city || "Indonesia"

  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-xl overflow-hidden border border-border/40 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5 transition-all duration-300 hover:-translate-y-0.5",
      className
    )}>
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        {product.img ? (
          <Image
            src={product.img}
            alt={product.name}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
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
            <span className="text-[10px] text-muted-foreground">| {product.sold || "0"} terjual</span>
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

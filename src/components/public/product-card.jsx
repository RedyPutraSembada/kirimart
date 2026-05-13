"use client"

import Link from "next/link"
import { Star, MapPin, Truck, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ProductCard({ product, className }) {
  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price).replace("IDR", "Rp")
  }

  // Calculate discount if applicable
  const hasDiscount = product.originalPrice && product.originalPrice > product.price
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  // Logic: Generate Promo Text from JSON discountRules
  // Example: { min_qty: 2, discount: 5 } -> "Beli 2 Diskon 5%"
  let generatedPromo = product.promoText || ""
  if (product.discountRules && typeof product.discountRules === 'object') {
    const { min_qty, discount } = product.discountRules
    if (min_qty && discount) {
      generatedPromo = `Beli ${min_qty} Diskon ${discount}%`
    }
  }

  const isStar = product.isStar || (product.store && product.store.isStar)
  const location = product.location || (product.store && product.store.city) || "Indonesia"

  return (
    <div className={cn(
      "group relative flex flex-col bg-card rounded-2xl overflow-hidden border border-border/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1",
      className
    )}>
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/30">
        <img 
          src={product.img || "/images/placeholder.png"} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isStar && (
            <Badge className="bg-primary hover:bg-primary text-[9px] font-black h-5 px-2 border-none rounded-md shadow-lg shadow-primary/20 italic tracking-tighter">
              STAR+
            </Badge>
          )}
          {discountPercent > 0 && (
            <Badge className="bg-foreground text-background hover:bg-foreground text-[10px] font-black h-5 px-2 border-none rounded-md shadow-lg italic">
              -{discountPercent}%
            </Badge>
          )}
        </div>
      </div>

      {/* Info Container */}
      <div className="flex flex-col flex-1 p-4 space-y-3 relative">
        {/* Category & Title */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{product.cat || "Produk"}</p>
          <h3 className="text-xs font-bold leading-tight text-foreground line-clamp-2 h-[32px] transition-colors group-hover:text-primary">
            {product.name}
          </h3>
        </div>

        {/* Price Section */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-black text-foreground tracking-tighter">
              {formatPrice(product.price)}
            </span>
          </div>
          {hasDiscount && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <span className="line-through opacity-50">{formatPrice(product.originalPrice)}</span>
            </div>
          )}
        </div>

        {/* Metadata: Rating & Sold */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30 mt-auto">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 text-amber-500">
              <Star className="h-3 w-3 fill-amber-500" />
              <span className="text-[10px] font-black text-foreground">{product.rating || "5.0"}</span>
            </div>
            <span className="text-[10px] text-muted-foreground/50">|</span>
            <span className="text-[10px] text-muted-foreground font-bold">{product.sold || product.soldCount || "0"} terjual</span>
          </div>
          
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <MapPin className="h-2.5 w-2.5 text-primary" />
            <span className="max-w-[60px] truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Link Overlay */}
      <Link href={`/product/${product.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">Lihat Detail {product.name}</span>
      </Link>
    </div>
  )
}

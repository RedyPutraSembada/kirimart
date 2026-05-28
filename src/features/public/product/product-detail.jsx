"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { Star, MapPin, ChevronRight, Heart, Share2, Plus, Minus, ShieldCheck, Truck, MessageCircle, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { addToCart } from "@/actions/public/cart.actions"
import { setCheckoutItems } from "@/actions/public/checkout.actions"
import { getOrCreateConversation } from "@/actions/public/chat.actions"
import { toggleWishlist, checkIsWishlisted } from "@/actions/user-dashboard/wishlist.actions"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ProductReviewList } from "@/features/public/product/product-review-list"
import { pixelViewContent, pixelAddToCart } from "@/lib/pixel"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
const fmtNum = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")} jt`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} rb`
  return String(n)
}

export function ProductDetail({ product }) {
  // Prepare data from DB shape
  const images = product.images?.map(img => img.imageUrl) || []
  const options = product.options || []
  const variants = product.variants || []
  const store = product.store || {}
  const hasVariants = options.length > 0 && variants.length > 0

  const [activeImgUrl, setActiveImgUrl] = useState(images[0])

  // Sync image when product changes (for Next.js soft navigation)
  useEffect(() => {
    setActiveImgUrl(images[0])
    
    // Trigger Pixel ViewContent
    const timer = setTimeout(() => {
      pixelViewContent(
        {
          id: product.id,
          name: product.name,
          price: product.basePrice,
          category: product.category?.name || "Uncategorized"
        },
        product.store?.metaPixelId
      )
    }, 500)
    return () => clearTimeout(timer)
  }, [product.id])

  const [selectedAttributes, setSelectedAttributes] = useState(() => {
    if (!hasVariants) return {}
    const init = {}
    options.forEach(o => { init[o.name] = o.values[0] })
    return init
  })
  const [qty, setQty] = useState(1)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: session } = authClient.useSession()

  // Cek status wishlist
  const { data: wishlistData } = useQuery({
    queryKey: ["wishlist-status", product.id],
    queryFn: () => checkIsWishlisted(product.id),
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 menit
  })
  const isWishlisted = wishlistData?.isWishlisted ?? false

  // Optimistic update toggle wishlist
  const wishlistMutation = useMutation({
    mutationFn: () => toggleWishlist(product.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["wishlist-status", product.id] })
      const previous = queryClient.getQueryData(["wishlist-status", product.id])
      queryClient.setQueryData(["wishlist-status", product.id], (old) => ({
        ...old,
        isWishlisted: !old?.isWishlisted,
      }))
      return { previous }
    },
    onSuccess: (result) => {
      if (!result.success) {
        if (result.requireLogin) toast.info("Silakan login untuk menambahkan ke wishlist.")
        else toast.error(result.error)
      } else {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: ["my-wishlists"] })
      }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["wishlist-status", product.id], context.previous)
      }
      toast.error("Gagal memperbarui wishlist.")
    },
  })

  // Mutation: Add to Cart
  const addToCartMutation = useMutation({
    mutationFn: addToCart,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: ["cart-summary"] })
        // Trigger Pixel AddToCart
        pixelAddToCart(
          {
            id: product.id,
            name: product.name,
            price: selectedVariant ? selectedVariant.price : product.basePrice,
            qty: qty
          },
          product.store?.metaPixelId
        )
      } else {
        if (result.requireLogin) {
          toast.info("Silakan login untuk menambahkan ke keranjang.")
          router.push(`/login?callbackUrl=/product/${product.id}`)
        } else {
          toast.error(result.error)
        }
      }
    },
    onError: () => {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    },
  })

  const handleAddToCart = () => {
    addToCartMutation.mutate({
      productId: product.id,
      variantId: hasVariants && selectedVariant ? selectedVariant.id : null,
      qty,
    })
  }

  // Mutation: Buy Now
  const buyNowMutation = useMutation({
    mutationFn: async (payload) => {
      // 1. Tambahkan ke keranjang
      const res = await addToCart(payload)
      if (!res.success) throw new Error(res.error)

      // 2. Set checkout cookie dengan item ini saja
      const res2 = await setCheckoutItems([res.cartItemId])
      if (!res2.success) throw new Error(res2.error)

      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart-summary"] })
      queryClient.invalidateQueries({ queryKey: ["cart-details"] })
      queryClient.invalidateQueries({ queryKey: ["checkout-data"] })
      // Redirect ke checkout
      router.push("/checkout")
    },
    onError: (error) => {
      toast.error(error.message || "Gagal memproses pembelian langsung.")
    }
  })

  const handleBuyNow = () => {
    buyNowMutation.mutate({
      productId: product.id,
      variantId: hasVariants && selectedVariant ? selectedVariant.id : null,
      qty,
    })
  }

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null
    return variants.find(v =>
      Object.entries(selectedAttributes).every(([key, val]) => v.attributes[key] === val)
    )
  }, [selectedAttributes, variants, hasVariants])

  // Automatically update main image when a variant is selected
  useEffect(() => {
    if (selectedVariant?.imageUrl) {
      setActiveImgUrl(selectedVariant.imageUrl)
    }
  }, [selectedVariant])

  const isOptionDisabled = (optionName, value) => {
    if (!hasVariants) return false
    const potentialSelection = { ...selectedAttributes, [optionName]: value }
    return !variants.some(v =>
      Object.entries(potentialSelection).every(([key, val]) => v.attributes[key] === val)
    )
  }

  const currentPrice = hasVariants && selectedVariant ? selectedVariant.price : product.basePrice
  const currentStock = hasVariants ? (selectedVariant ? selectedVariant.stock : 0) : (product.baseStock || 0)
  const discountPercent = product.originalPrice ? Math.round((1 - currentPrice / product.originalPrice) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 overflow-x-auto">
          <Link href="/" className="hover:text-primary transition-colors whitespace-nowrap">Home</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href={`/katalog${product.category ? `?categoryId=${product.category.id}` : ''}`} className="hover:text-primary transition-colors whitespace-nowrap">{product.category?.name || 'Katalog'}</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[250px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ─── LEFT: Image Gallery ─── */}
          <div className="lg:col-span-5 space-y-3">
            {/* Main Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-card border border-border/50 relative group">
              {activeImgUrl ? (
                <Image
                  src={activeImgUrl}
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-muted-foreground">📦</div>
              )}
              {store.isStar && (
                <Badge className="absolute top-4 left-4 bg-primary hover:bg-primary text-[10px] font-black px-2.5 py-1 shadow-lg">STAR+</Badge>
              )}
              {discountPercent > 0 && (
                <Badge className="absolute top-4 right-4 bg-red-500 hover:bg-red-500 text-white text-[10px] font-bold px-2 py-1">{discountPercent}%</Badge>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImgUrl(img)}
                    className={cn(
                      "h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 relative",
                      activeImgUrl === img ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/40"
                    )}
                  >
                    <Image src={img} alt={`Preview ${i + 1}`} fill unoptimized className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── CENTER: Product Info ─── */}
          <div className="lg:col-span-4 space-y-5">

            {/* Title */}
            <div>
              <h1 className="text-lg md:text-xl font-bold leading-snug text-foreground">{product.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-muted-foreground">Terjual <span className="font-semibold text-foreground">{fmtNum(product.soldCount || 0)}+</span></span>
                <Separator orientation="vertical" className="h-3" />
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{product.rating || "5.0"}</span>
                  {(product.totalReviews || 0) > 0 && (
                    <span className="text-muted-foreground">({product.totalReviews} ulasan)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-1">
              {product.originalPrice && discountPercent > 0 && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white hover:bg-red-500 text-[10px] font-bold px-1.5 py-0 h-5">{discountPercent}%</Badge>
                  <span className="text-sm text-muted-foreground line-through">{fmt(product.originalPrice)}</span>
                </div>
              )}
              <p className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{fmt(currentPrice)}</p>
            </div>

            <Separator />

            {/* Dynamic Options (hanya jika ada varian) */}
            {hasVariants && (
              <>
                <div className="space-y-5">
                  {options.map((option) => (
                    <div key={option.id} className="space-y-2.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-foreground">{option.name}:</span>
                        <span className="text-muted-foreground">{selectedAttributes[option.name]}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((val) => {
                          const disabled = isOptionDisabled(option.name, val)
                          const selected = selectedAttributes[option.name] === val
                          return (
                            <button
                              key={val}
                              disabled={disabled}
                              onClick={() => setSelectedAttributes(prev => ({ ...prev, [option.name]: val }))}
                              className={cn(
                                "relative px-3 py-1.5 rounded-lg border transition-all text-xs font-medium flex items-center gap-1.5",
                                selected
                                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                                  : "border-border hover:border-primary/40 text-foreground",
                                disabled && "opacity-30 cursor-not-allowed line-through bg-muted"
                              )}
                            >
                              {option.displayType === "image" && images[0] && (
                                <div className="h-5 w-5 rounded overflow-hidden bg-muted border relative">
                                  <Image src={images[0]} alt={val} fill unoptimized className="object-cover" />
                                </div>
                              )}
                              {val}
                              {selected && (
                                <Check className="h-3 w-3 text-primary" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />
              </>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Detail Produk</h3>
              <div className={cn("text-sm text-muted-foreground whitespace-pre-line leading-relaxed", !showFullDesc && "line-clamp-5")}>
                {product.description || "Tidak ada deskripsi."}
              </div>
              {product.description && product.description.length > 200 && (
                <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-primary text-xs font-semibold hover:underline">
                  {showFullDesc ? "Sembunyikan" : "Lihat Selengkapnya"}
                </button>
              )}
            </div>

            {/* Shipping & Info */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <span>Berat: <span className="font-semibold text-foreground">{product.weightGram || 0}g</span></span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Proteksi Pesanan: Garansi 100% uang kembali</span>
              </div>
            </div>

            {/* Review Section */}
            <Separator />
            <ProductReviewList productId={product.id} />
          </div>

          {/* ─── RIGHT: Sticky Purchase Card ─── */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Buy Card */}
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Atur jumlah</h3>

                  {/* Selected variant summary */}
                  {hasVariants && selectedVariant && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedVariant.attributes).map(([, val]) => (
                        <Badge key={val} variant="secondary" className="text-[10px] font-medium">{val}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Qty */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border rounded-lg">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-lg" onClick={() => setQty(Math.max(1, qty - 1))} disabled={hasVariants && !selectedVariant}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-10 text-center text-sm font-semibold select-none">{qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-lg" onClick={() => setQty(Math.min(currentStock, qty + 1))} disabled={hasVariants && !selectedVariant}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Stok: <span className={cn("font-semibold", currentStock <= 10 ? "text-red-500" : "text-foreground")}>
                        {hasVariants ? (selectedVariant ? currentStock : "-") : currentStock}
                      </span>
                    </span>
                  </div>

                  {hasVariants && !selectedVariant && (
                    <p className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">Kombinasi varian tidak tersedia. Pilih opsi lain.</p>
                  )}

                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-bold text-foreground">{fmt(currentPrice * qty)}</span>
                  </div>

                  {/* Buttons */}
                  <div className="space-y-2">
                    <Button
                      className="w-full h-10 font-bold text-sm"
                      disabled={(hasVariants && !selectedVariant) || addToCartMutation.isPending || buyNowMutation.isPending}
                      onClick={handleAddToCart}
                    >
                      {addToCartMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menambahkan...</>
                      ) : (
                        "+ Keranjang"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-10 font-bold text-sm border-primary text-primary hover:bg-primary/5"
                      disabled={(hasVariants && !selectedVariant) || addToCartMutation.isPending || buyNowMutation.isPending}
                      onClick={handleBuyNow}
                    >
                      {buyNowMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                      ) : (
                        "Beli Langsung"
                      )}
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-6 pt-1">
                    <button
                      onClick={() => wishlistMutation.mutate()}
                      className={cn(
                        "flex items-center gap-1.5 text-xs transition-colors",
                        isWishlisted ? "text-rose-500 hover:text-rose-600" : "text-muted-foreground hover:text-primary"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isWishlisted && "fill-rose-500")} />
                      {isWishlisted ? "Tersimpan" : "Wishlist"}
                    </button>
                    <Separator orientation="vertical" className="h-4" />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href)
                        toast.success("Link produk disalin!")
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Share2 className="h-4 w-4" /> Share
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Store Card */}
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-white border shrink-0 relative">
                      {store.logoUrl ? (
                        <Image src={store.logoUrl} alt={store.name || "Toko"} fill unoptimized className="object-contain" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-lg">🏪</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold truncate">{store.name || "Toko"}</h4>
                        {store.isStar && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[9px] font-bold px-1.5 py-0 h-4 border-none">Star</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {store.address?.cityId || "Indonesia"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs font-semibold rounded-lg"
                      onClick={async () => {
                        try {
                          const productCtx = {
                            id: product.id,
                            name: product.name,
                            image: images[0] || "",
                            price: currentPrice || product.basePrice || 0,
                          }
                          const result = await getOrCreateConversation(store.id, productCtx)
                          if (result.success) {
                            const chatUrl = new URL("/chat", window.location.origin)
                            chatUrl.searchParams.set("conv", result.data.conversationId)
                            chatUrl.searchParams.set("productId", product.id)
                            chatUrl.searchParams.set("productName", product.name)
                            chatUrl.searchParams.set("productImage", images[0] || "")
                            chatUrl.searchParams.set("productPrice", currentPrice || product.basePrice || 0)
                            router.push(chatUrl.pathname + chatUrl.search)
                          } else {
                            toast.error(result.error || "Gagal membuka chat")
                          }
                        } catch {
                          toast.error("Silakan login terlebih dahulu")
                        }
                      }}
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Chat
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-semibold rounded-lg" asChild>
                      <Link href={`/store/${store.domainSlug || store.id}`}>Kunjungi Toko</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

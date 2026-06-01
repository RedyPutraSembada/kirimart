"use client"

import { useState, useMemo, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { toggleFollowStore, checkIsFollowingStore } from "@/actions/public/store-follow.actions"

import { MapPin, Globe, Star, ShoppingBag, Clock, ShieldCheck, UserPlus, UserCheck, MessageCircle } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { ProductCard } from "@/components/public/product-card"
import { getOrCreateConversation } from "@/actions/public/chat.actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"



export function StoreView({ store = {} }) {
  const [sortBy, setSortBy] = useState("newest")
  const [isFollowing, setIsFollowing] = useState(false)
  const router = useRouter()

  // Cek status follow saat pertama kali load
  useEffect(() => {
    if (store.id) {
      checkIsFollowingStore(store.id).then(res => setIsFollowing(res.isFollowing))
    }
  }, [store.id])

  const followMutation = useMutation({
    mutationFn: () => toggleFollowStore(store.id),
    onSuccess: (result) => {
      if (result.success) {
        setIsFollowing(result.isFollowing)
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    },
    onError: () => toast.error("Gagal memproses permintaan."),
  })

  const sortedProducts = useMemo(() => {
    if (!store.products || store.products.length === 0) return []

    return [...store.products].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.soldCount || 0) - (a.soldCount || 0)
        case "price_asc":
          return (a.price || 0) - (b.price || 0)
        case "price_desc":
          return (b.price || 0) - (a.price || 0)
        case "newest":
        default:
          return (b.id || 0) - (a.id || 0)
      }
    })
  }, [store.products, sortBy])

  const handlePriceSort = () => {
    setSortBy(current => current === "price_asc" ? "price_desc" : "price_asc")
  }

  const storeRating = store.rating ? parseFloat(store.rating) : 5.0
  const totalReviews = store.totalReviews || 0

  return (
    <div className="space-y-10 pb-20">
      {/* ... Store Header Code ... */}
      <div className="relative">
        <div className="relative h-48 md:h-64 lg:h-80 w-full overflow-hidden">
          <Image
            src={store.bannerUrl || "/images/bannerml.png"}
            alt={`${store.name} Banner`}
            fill
            sizes="100vw"
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Store Profile Info (Overlapping) */}
        <div className="container mx-auto px-6">
          <div className="relative flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 md:-mt-16 pb-4">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 shadow-2xl">
              <AvatarImage src={store.logoUrl || "/images/ml.png"} alt="Store Logo" className="object-cover" />
              <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">{store.name ? store.name.charAt(0).toUpperCase() : "S"}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3 mb-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter">{store.name || "Nama Toko"}</h1>
                {store.isStar && (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-3 py-1 rounded-full text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Terverifikasi
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
                {store.address?.cityId && <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {store.address.cityId}</div>}
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> {storeRating.toFixed(1)}
                  <span className="opacity-60">({totalReviews} ulasan)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-500" /> {store.openTime || "09:00"} - {store.closeTime || "21:00"}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mb-2">
              <Button
                className={`rounded-full px-8 h-12 font-bold shadow-xl transition-transform hover:scale-105 ${isFollowing
                  ? "bg-muted text-foreground hover:bg-muted/80 shadow-none border"
                  : "shadow-primary/20"
                  }`}
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                {isFollowing ? (
                  <><UserCheck className="h-4 w-4 mr-2" /> Mengikuti</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" /> Ikuti Toko</>
                )}
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-8 h-12 font-bold border-2 hover:bg-muted transition-all"
                onClick={async () => {
                  try {
                    const result = await getOrCreateConversation(store.id)
                    if (result.success) {
                      router.push(`/chat?conv=${result.data.conversationId}`)
                    } else {
                      toast.error(result.error || "Gagal membuka chat")
                    }
                  } catch {
                    toast.error("Silakan login terlebih dahulu")
                  }
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" /> Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-4 gap-12 mt-10">
        {/* Store Sidebar Info */}
        <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
          <Card className="rounded-[2.5rem] border-border/50 bg-card shadow-sm overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div>
                <h3 className="font-bold text-lg mb-3">Tentang Toko</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {store.description || "Belum ada deskripsi untuk toko ini."}
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Produk</span>
                  <span className="font-bold text-foreground">{store.products?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pengikut</span>
                  <span className="font-bold text-foreground">{store.followerCount || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-bold text-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    {storeRating.toFixed(1)}
                  </span>
                </div>
              </div>

              {(store.isVerified || store.isOfficial) && (
                <div className="space-y-3 pt-6 border-t">
                  {store.isVerified && (
                    <div className="flex items-center gap-3 text-xs text-emerald-600 font-bold bg-emerald-500/10 px-4 py-2 rounded-xl">
                      <ShieldCheck className="h-4 w-4" /> Penjual Tepercaya
                    </div>
                  )}
                  {store.isOfficial && (
                    <div className="flex items-center gap-3 text-xs text-blue-600 font-bold bg-blue-500/10 px-4 py-2 rounded-xl">
                      <ShoppingBag className="h-4 w-4" /> Produk Original 100%
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Store Products Grid */}
        <div className="lg:col-span-3 space-y-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-6">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Semua Produk</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortBy("newest")}
                className={`rounded-full px-4 ${sortBy === "newest" ? "font-bold text-primary bg-primary/10" : ""}`}
              >
                Terbaru
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortBy("popular")}
                className={`rounded-full px-4 ${sortBy === "popular" ? "font-bold text-primary bg-primary/10" : ""}`}
              >
                Terlaris
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePriceSort}
                className={`rounded-full px-4 ${(sortBy === "price_asc" || sortBy === "price_desc") ? "font-bold text-primary bg-primary/10" : ""}`}
              >
                Harga {sortBy === "price_asc" ? "↑" : sortBy === "price_desc" ? "↓" : ""}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-8">
            {sortedProducts.length > 0 ? (
              sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/20">
                <span className="text-6xl mb-4">🛒</span>
                <p className="text-muted-foreground font-medium">Toko ini belum menambahkan produk.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

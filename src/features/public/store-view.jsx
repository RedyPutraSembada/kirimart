"use client"

import { MapPin, Globe, Star, ShoppingBag, Clock, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { ProductCard } from "@/components/public/product-card"

const STORE_PRODUCTS = [
  { 
    id: 1, 
    name: "Top Up Diamond Mobile Legends - Fast Process", 
    cat: "Game", 
    price: 50000, 
    originalPrice: 65000,
    img: "/images/ml.png",
    isStar: true,
    rating: 4.9,
    soldCount: 1200,
    location: "Jakarta Selatan",
    discountRules: { min_qty: 2, discount: 5 }
  },
  { 
    id: 4, 
    name: "Diamond ML - Weekly Pass (Instant)", 
    cat: "Game", 
    price: 30000, 
    originalPrice: 45000,
    img: "/images/ml.png",
    isStar: true,
    rating: 5.0,
    soldCount: 850,
    location: "Jakarta Selatan",
    discountRules: { min_qty: 3, discount: 10 }
  },
  { 
    id: 2, 
    name: "Robux Roblox Gift Card 1000 Robux", 
    cat: "Game", 
    price: 150000, 
    img: "/images/roblox.png",
    rating: 4.8,
    soldCount: 300,
    location: "Jakarta Selatan"
  },
]

export function StoreView({ store = {} }) {
  return (
    <div className="space-y-10 pb-20">
      {/* ... Store Header Code ... */}
      <div className="relative">
        <div className="relative h-48 md:h-64 lg:h-80 w-full overflow-hidden">
          <img 
            src="/images/bannerml.png" 
            alt="Store Banner" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Store Profile Info (Overlapping) */}
        <div className="container mx-auto px-6">
          <div className="relative flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 md:-mt-16 pb-4">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 shadow-2xl rounded-[2.5rem]">
              <AvatarImage src="/images/ml.png" alt="Store Logo" className="object-cover" />
              <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">V</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-3 mb-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter">Voucher Store</h1>
                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none px-3 py-1 rounded-full text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Terverifikasi
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> Jakarta Selatan</div>
                <div className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /> 4.9 <span className="opacity-60">(1.2rb ulasan)</span></div>
                <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-blue-500" /> 09:00 - 21:00</div>
              </div>
            </div>

            <div className="flex gap-3 mb-2">
              <Button className="rounded-full px-8 h-12 font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                Ikuti Toko
              </Button>
              <Button variant="outline" className="rounded-full px-8 h-12 font-bold border-2 hover:bg-muted transition-all">
                Chat
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
                  Voucher Store adalah mitra terpercaya untuk segala kebutuhan voucher game dan digital Anda. Proses kilat, aman, dan harga bersahabat.
                </p>
              </div>
              
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bergabung sejak</span>
                  <span className="font-bold text-foreground">Mei 2024</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Produk Terjual</span>
                  <span className="font-bold text-foreground">5.4rb+</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Waktu Respon</span>
                  <span className="font-bold text-foreground">~5 Menit</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-center gap-3 text-xs text-emerald-600 font-bold bg-emerald-500/10 px-4 py-2 rounded-xl">
                  <ShieldCheck className="h-4 w-4" /> Penjual Tepercaya
                </div>
                <div className="flex items-center gap-3 text-xs text-blue-600 font-bold bg-blue-500/10 px-4 py-2 rounded-xl">
                  <ShoppingBag className="h-4 w-4" /> Produk Original 100%
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Store Products Grid */}
        <div className="lg:col-span-3 space-y-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-6">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Semua Produk</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="font-bold text-primary bg-primary/10 rounded-full px-4">Terbaru</Button>
              <Button variant="ghost" size="sm" className="rounded-full px-4">Terlaris</Button>
              <Button variant="ghost" size="sm" className="rounded-full px-4">Harga</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
            {STORE_PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

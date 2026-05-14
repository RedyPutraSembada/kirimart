"use client"

import { useState, useMemo } from "react"
import { Star, MapPin, ChevronRight, Heart, Share2, Plus, Minus, ShieldCheck, Truck, MessageCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link"

const MOCK_PRODUCT = {
  id: 101,
  name: "Loco Polo Cartiera Scuba 280 GSM Boxy Polo Shirt Pria",
  cat: "Fashion Pria",
  basePrice: 139885,
  originalPrice: 199000,
  images: [
    "/images/ml.png",
    "/images/ml.png",
    "/images/ml.png",
    "/images/ml.png",
  ],
  rating: 4.9,
  reviewCount: 15800,
  soldCount: 50000,
  description: `Loco Polo Cartiera Scuba 280 GSM Boxy Polo Shirt Pria

• Bahan Scuba premium 280 GSM, tebal & tidak mudah kusut
• Kerah polo klasik dengan kancing berkualitas
• Potongan boxy fit, nyaman untuk segala aktivitas
• Cocok untuk casual maupun semi-formal
• Tersedia dalam berbagai warna dan ukuran

Panduan Ukuran:
S  : Lebar 52cm, Panjang 68cm
M  : Lebar 54cm, Panjang 70cm
L  : Lebar 56cm, Panjang 72cm
XL : Lebar 58cm, Panjang 74cm
XXL: Lebar 60cm, Panjang 76cm`,
  store: {
    name: "Cartiera Official",
    logo: "/images/kawanbelanja.png",
    city: "Jakarta Selatan",
    isStar: true,
    slug: "cartiera-official",
    productCount: 128,
    responseRate: 98,
  },
  options: [
    { id: 1, name: "Pilih warna", displayType: "image", values: ["Jet Black", "Brown", "White", "Grey", "Maroon", "Emerald Green", "Marine Blue"], position: 1 },
    { id: 2, name: "Pilih ukuran", displayType: "text", values: ["S", "M", "L", "XL", "XXL"], position: 2 },
  ],
  variants: [
    { id: 1, attributes: { "Pilih warna": "Jet Black", "Pilih ukuran": "S" }, price: 139885, stock: 1192, img: "/images/ml.png" },
    { id: 2, attributes: { "Pilih warna": "Jet Black", "Pilih ukuran": "M" }, price: 139885, stock: 500, img: "/images/ml.png" },
    { id: 3, attributes: { "Pilih warna": "Jet Black", "Pilih ukuran": "L" }, price: 139885, stock: 300, img: "/images/ml.png" },
    { id: 4, attributes: { "Pilih warna": "Brown", "Pilih ukuran": "S" }, price: 145000, stock: 200, img: "/images/ml.png" },
    { id: 5, attributes: { "Pilih warna": "Brown", "Pilih ukuran": "M" }, price: 145000, stock: 100, img: "/images/ml.png" },
    { id: 6, attributes: { "Pilih warna": "White", "Pilih ukuran": "M" }, price: 142000, stock: 80, img: "/images/ml.png" },
    { id: 7, attributes: { "Pilih warna": "White", "Pilih ukuran": "L" }, price: 142000, stock: 60, img: "/images/ml.png" },
  ],
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
const fmtNum = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")} jt`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} rb`
  return String(n)
}

export function ProductDetail({ id }) {
  const product = MOCK_PRODUCT
  const [activeImg, setActiveImg] = useState(0)
  const [selectedAttributes, setSelectedAttributes] = useState(() => {
    const init = {}
    product.options.forEach(o => { init[o.name] = o.values[0] })
    return init
  })
  const [qty, setQty] = useState(1)
  const [showFullDesc, setShowFullDesc] = useState(false)

  const selectedVariant = useMemo(() => {
    return product.variants.find(v =>
      Object.entries(selectedAttributes).every(([key, val]) => v.attributes[key] === val)
    )
  }, [selectedAttributes, product.variants])

  const isOptionDisabled = (optionName, value) => {
    const potentialSelection = { ...selectedAttributes, [optionName]: value }
    return !product.variants.some(v =>
      Object.entries(potentialSelection).every(([key, val]) => v.attributes[key] === val)
    )
  }

  const currentPrice = selectedVariant ? selectedVariant.price : product.basePrice
  const currentStock = selectedVariant ? selectedVariant.stock : 0
  const discountPercent = product.originalPrice ? Math.round((1 - currentPrice / product.originalPrice) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 overflow-x-auto">
          <Link href="/" className="hover:text-primary transition-colors whitespace-nowrap">Home</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href="/katalog" className="hover:text-primary transition-colors whitespace-nowrap">{product.cat}</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[250px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ─── LEFT: Image Gallery ─── */}
          <div className="lg:col-span-5 space-y-3">
            {/* Main Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-card border border-border/50 relative group">
              <img
                src={selectedVariant?.img || product.images[activeImg]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.store.isStar && (
                <Badge className="absolute top-4 left-4 bg-primary hover:bg-primary text-[10px] font-black px-2.5 py-1 shadow-lg">STAR+</Badge>
              )}
              {discountPercent > 0 && (
                <Badge className="absolute top-4 right-4 bg-red-500 hover:bg-red-500 text-white text-[10px] font-bold px-2 py-1">{discountPercent}%</Badge>
              )}
            </div>
            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "h-16 w-16 md:h-20 md:w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0",
                    activeImg === i ? "border-primary ring-2 ring-primary/20" : "border-border/50 hover:border-primary/40"
                  )}
                >
                  <img src={img} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ─── CENTER: Product Info ─── */}
          <div className="lg:col-span-4 space-y-5">

            {/* Title */}
            <div>
              <h1 className="text-lg md:text-xl font-bold leading-snug text-foreground">{product.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-muted-foreground">Terjual <span className="font-semibold text-foreground">{fmtNum(product.soldCount)}+</span></span>
                <Separator orientation="vertical" className="h-3" />
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-foreground">{product.rating}</span>
                  <span className="text-muted-foreground">({fmtNum(product.reviewCount)} rating)</span>
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

            {/* Dynamic Options */}
            <div className="space-y-5">
              {product.options.map((option) => (
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
                          {option.displayType === "image" && (
                            <div className="h-5 w-5 rounded overflow-hidden bg-muted border">
                              <img src={product.images[0]} alt={val} className="h-full w-full object-cover" />
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

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Detail Produk</h3>
              <div className={cn("text-sm text-muted-foreground whitespace-pre-line leading-relaxed", !showFullDesc && "line-clamp-5")}>
                {product.description}
              </div>
              <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-primary text-xs font-semibold hover:underline">
                {showFullDesc ? "Sembunyikan" : "Lihat Selengkapnya"}
              </button>
            </div>

            {/* Shipping & Info */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <span>Ongkir Reguler mulai <span className="font-semibold text-foreground">Rp 9.000</span></span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Proteksi Pesanan: Garansi 100% uang kembali</span>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Sticky Purchase Card ─── */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Buy Card */}
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Atur jumlah</h3>

                  {/* Selected variant summary */}
                  {selectedVariant && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedVariant.attributes).map(([, val]) => (
                        <Badge key={val} variant="secondary" className="text-[10px] font-medium">{val}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Qty */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border rounded-lg">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-lg" onClick={() => setQty(Math.max(1, qty - 1))} disabled={!selectedVariant}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-10 text-center text-sm font-semibold select-none">{qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-lg" onClick={() => setQty(Math.min(currentStock, qty + 1))} disabled={!selectedVariant}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Stok: <span className={cn("font-semibold", currentStock <= 10 ? "text-red-500" : "text-foreground")}>{selectedVariant ? currentStock : "-"}</span>
                    </span>
                  </div>

                  {!selectedVariant && (
                    <p className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">Kombinasi varian tidak tersedia. Pilih opsi lain.</p>
                  )}

                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-bold text-foreground">{fmt(currentPrice * qty)}</span>
                  </div>

                  {/* Buttons */}
                  <div className="space-y-2">
                    <Button className="w-full h-10 font-bold text-sm" disabled={!selectedVariant}>+ Keranjang</Button>
                    <Button variant="outline" className="w-full h-10 font-bold text-sm border-primary text-primary hover:bg-primary/5" disabled={!selectedVariant}>
                      Beli Langsung
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-6 pt-1">
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Heart className="h-4 w-4" /> Wishlist
                    </button>
                    <Separator orientation="vertical" className="h-4" />
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Share2 className="h-4 w-4" /> Share
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Store Card */}
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-white border shrink-0">
                      <img src={product.store.logo} alt={product.store.name} className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold truncate">{product.store.name}</h4>
                        {product.store.isStar && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[9px] font-bold px-1.5 py-0 h-4 border-none">Star</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {product.store.city}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-muted/40 rounded-lg py-1.5 px-2">
                      <p className="text-xs font-bold text-foreground">{product.store.productCount}</p>
                      <p className="text-[10px] text-muted-foreground">Produk</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg py-1.5 px-2">
                      <p className="text-xs font-bold text-foreground">{product.store.responseRate}%</p>
                      <p className="text-[10px] text-muted-foreground">Chat Dibalas</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-semibold rounded-lg">
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Chat
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs font-semibold rounded-lg" asChild>
                      <Link href={`/store/${product.store.slug}`}>Kunjungi Toko</Link>
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

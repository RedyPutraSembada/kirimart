"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, ChevronDown, Grid3X3, LayoutList, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductCard } from "@/components/public/product-card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const ALL_PRODUCTS = [
  { id: 1, name: "Polo Shirt Pria Scuba Premium 280 GSM", cat: "Fashion Pria", price: 139885, originalPrice: 199000, img: "/images/ml.png", isStar: true, rating: 4.9, sold: "2.5rb+", location: "Jakarta" },
  { id: 2, name: "Sepatu Running Ultra Boost DNA 5.0", cat: "Sepatu", price: 1250000, originalPrice: 1899000, img: "/images/roblox.png", rating: 4.8, sold: "1.2rb", location: "Bandung" },
  { id: 3, name: "Tas Ransel Laptop Anti Air 15.6 inch", cat: "Tas", price: 189000, originalPrice: 259000, img: "/images/byu.png", isStar: true, rating: 4.7, sold: "3.1rb+", location: "Surabaya" },
  { id: 4, name: "Headphone Bluetooth ANC 40 Jam Battery", cat: "Elektronik", price: 449000, originalPrice: 699000, img: "/images/ml.png", rating: 4.9, sold: "850", location: "Tangerang" },
  { id: 5, name: "Skincare Set Brightening & Moisturizing", cat: "Kecantikan", price: 175000, img: "/images/roblox.png", rating: 5.0, sold: "5.5rb+", location: "Semarang" },
  { id: 6, name: "Celana Jogger Slim Fit Premium Cotton", cat: "Fashion Pria", price: 159000, originalPrice: 225000, img: "/images/byu.png", rating: 4.8, sold: "2.1rb", location: "Yogyakarta" },
  { id: 7, name: "Mouse Gaming RGB Wireless Rechargeable", cat: "Gaming", price: 285000, originalPrice: 450000, img: "/images/ml.png", isStar: true, rating: 4.9, sold: "1.8rb", location: "Jakarta" },
  { id: 8, name: "Vitamin C 1000mg + Zinc 60 Tablet", cat: "Kesehatan", price: 89000, img: "/images/roblox.png", rating: 4.6, sold: "10rb+", location: "Medan" },
  { id: 9, name: "Kaos Oversize Unisex Cotton Combed 30s", cat: "Fashion Pria", price: 79000, originalPrice: 120000, img: "/images/byu.png", rating: 4.7, sold: "15rb+", location: "Bandung" },
  { id: 10, name: "Parfum Pria EDT 100ml Fresh Aquatic", cat: "Kecantikan", price: 245000, originalPrice: 350000, img: "/images/ml.png", rating: 4.8, sold: "920", location: "Jakarta" },
  { id: 11, name: "Keyboard Mechanical RGB Hot-Swappable", cat: "Gaming", price: 425000, originalPrice: 599000, img: "/images/roblox.png", rating: 4.9, sold: "670", location: "Surabaya" },
  { id: 12, name: "Jaket Windbreaker Waterproof Ultralight", cat: "Fashion Pria", price: 289000, originalPrice: 399000, img: "/images/byu.png", rating: 4.7, sold: "1.5rb", location: "Malang" },
]

const FILTER_CATEGORIES = ["Fashion Pria", "Fashion Wanita", "Elektronik", "Kecantikan", "Kesehatan", "Gaming", "Sepatu", "Tas"]

export function CatalogList({ initialCategories = [] }) {
  const [search, setSearch] = useState("")
  const [selectedCats, setSelectedCats] = useState(new Set())
  const [sortBy, setSortBy] = useState("popular")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [showFilter, setShowFilter] = useState(false)

  const toggleCat = (cat) => setSelectedCats(prev => {
    const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n
  })

  const clearFilters = () => { setSelectedCats(new Set()); setPriceMin(""); setPriceMax(""); setSearch("") }

  // Filter & sort
  let filtered = ALL_PRODUCTS.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCats.size > 0 && !selectedCats.has(p.cat)) return false
    if (priceMin && p.price < Number(priceMin)) return false
    if (priceMax && p.price > Number(priceMax)) return false
    return true
  })

  if (sortBy === "price_asc") filtered.sort((a, b) => a.price - b.price)
  else if (sortBy === "price_desc") filtered.sort((a, b) => b.price - a.price)
  else if (sortBy === "newest") filtered.sort((a, b) => b.id - a.id)

  const hasActiveFilter = selectedCats.size > 0 || priceMin || priceMax

  const categories = FILTER_CATEGORIES.length > 0 ? FILTER_CATEGORIES : initialCategories.map(c => c.name)

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <h1 className="text-xl md:text-2xl font-bold">Katalog Produk</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-10 rounded-xl lg:hidden gap-2 font-medium" onClick={() => setShowFilter(!showFilter)}>
              <SlidersHorizontal className="h-4 w-4" /> Filter
              {hasActiveFilter && <span className="h-2 w-2 rounded-full bg-primary" />}
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-10 rounded-xl text-xs">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Terpopuler</SelectItem>
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="price_asc">Harga Terendah</SelectItem>
                <SelectItem value="price_desc">Harga Tertinggi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasActiveFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter aktif:</span>
            {[...selectedCats].map(cat => (
              <Badge key={cat} variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleCat(cat)}>
                {cat} <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
            {(priceMin || priceMax) && (
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => { setPriceMin(""); setPriceMax("") }}>
                Harga: {priceMin || "0"} - {priceMax || "∞"} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            <button onClick={clearFilters} className="text-[10px] text-red-500 font-semibold hover:underline ml-1">Hapus Semua</button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filter — Desktop always, Mobile toggled */}
        <aside className={`w-56 shrink-0 space-y-6 ${showFilter ? "block" : "hidden"} lg:block`}>
          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Kategori</h3>
            <div className="space-y-1.5">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-2.5 py-1 cursor-pointer text-sm group">
                  <Checkbox checked={selectedCats.has(cat)} onCheckedChange={() => toggleCat(cat)} />
                  <span className={`text-xs transition-colors ${selectedCats.has(cat) ? "font-semibold text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Harga</h3>
            <div className="space-y-2">
              <Input placeholder="Minimum" type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="h-8 text-xs rounded-lg" />
              <Input placeholder="Maksimum" type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="h-8 text-xs rounded-lg" />
            </div>
          </div>

          <Separator />

          {/* Quick Filters */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Lainnya</h3>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                <Checkbox />
                <span className="text-xs text-muted-foreground">Star Seller</span>
              </label>
              <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                <Checkbox />
                <span className="text-xs text-muted-foreground">Gratis Ongkir</span>
              </label>
              <label className="flex items-center gap-2.5 py-1 cursor-pointer">
                <Checkbox />
                <span className="text-xs text-muted-foreground">Diskon</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">{filtered.length} produk ditemukan</p>
          </div>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-3">
              <p className="text-4xl">😕</p>
              <p className="font-semibold">Produk tidak ditemukan</p>
              <p className="text-sm text-muted-foreground">Coba ubah kata kunci atau filter pencarian</p>
              <Button variant="outline" size="sm" className="rounded-full" onClick={clearFilters}>Reset Filter</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

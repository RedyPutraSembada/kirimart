"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ProductCard } from "@/components/public/product-card"
import Link from "next/link"

const DEMO_PRODUCTS = [
  { 
    id: 1, 
    name: "Top Up Diamond Mobile Legends - 100% Aman", 
    cat: "Game", 
    price: 50000, 
    originalPrice: 65000,
    img: "/images/ml.png",
    isStar: true,
    rating: 4.9,
    sold: "5rb+",
    location: "Jakarta",
    promo: "Terlaris"
  },
  { 
    id: 2, 
    name: "Robux Roblox Gift Card Global", 
    cat: "Game", 
    price: 150000, 
    img: "/images/roblox.png",
    rating: 5.0,
    sold: "1.2rb",
    location: "Bandung"
  },
  { 
    id: 3, 
    name: "Pulsa By.U 50.000 (Langsung Masuk)", 
    cat: "Pulsa", 
    price: 51000, 
    img: "/images/byu.png",
    rating: 4.7,
    sold: "20rb+",
    location: "Online"
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
    sold: "850",
    location: "Jakarta Selatan",
    promo: "Hemat"
  },
]

export function CatalogList({ initialCategories = [] }) {
  const [activeCategory, setActiveCategory] = useState("Semua")

  const categories = ["Semua", ...initialCategories.map(c => c.name)]

  return (
    <div className="container mx-auto px-6 py-10 space-y-10">
      {/* Banner Memanjang */}
      <div className="relative w-full h-48 md:h-64 rounded-[2.5rem] overflow-hidden shadow-2xl group border border-primary/10">
        <img 
          src="/images/bannerml.png" 
          alt="Promotion Banner" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent flex flex-col justify-center p-10 text-white">
          <Badge className="w-fit mb-4 bg-primary text-primary-foreground border-none">Promo Terbatas</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Top Up Games <br/> Jadi Lebih Mudah!</h2>
          <Button className="w-fit rounded-full px-8">Cek Sekarang</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 space-y-8">
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" /> Filter
            </h3>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground mb-3">Kategori</p>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                    activeCategory === cat 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold translate-x-1" 
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t">
            <p className="text-sm font-semibold text-muted-foreground mb-4">Rentang Harga</p>
            <div className="flex items-center gap-2">
              <Input placeholder="Min" className="h-9 rounded-lg" />
              <div className="h-px w-4 bg-border" />
              <Input placeholder="Max" className="h-9 rounded-lg" />
            </div>
            <Button className="w-full mt-4 rounded-lg" variant="secondary">Terapkan</Button>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Ketik produk yang Anda cari..." className="pl-10 h-11 rounded-2xl bg-muted/50 border-none" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Urutkan: 
              <Button variant="ghost" className="h-9 rounded-lg gap-1 font-medium">
                Terpopuler <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {DEMO_PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

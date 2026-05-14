import { HeroSection } from "@/features/public/hero-section"
import { Truck, ShieldCheck, Zap, Headphones, ChevronRight, Star } from "lucide-react"
import { ProductCard } from "@/components/public/product-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const PRODUCTS = [
  { id: 1, name: "Polo Shirt Pria Scuba Premium 280 GSM Boxy Fit", cat: "Fashion", price: 139885, originalPrice: 199000, img: "/images/ml.png", isStar: true, rating: 4.9, sold: "2.5rb+", location: "Jakarta" },
  { id: 2, name: "Sepatu Running Ultra Boost DNA 5.0 - Triple White", cat: "Sepatu", price: 1250000, originalPrice: 1899000, img: "/images/roblox.png", rating: 4.8, sold: "1.2rb", location: "Bandung" },
  { id: 3, name: "Tas Ransel Laptop Anti Air 15.6 inch - Business", cat: "Tas", price: 189000, originalPrice: 259000, img: "/images/byu.png", isStar: true, rating: 4.7, sold: "3.1rb+", location: "Surabaya" },
  { id: 4, name: "Headphone Bluetooth ANC - 40 Jam Playtime", cat: "Elektronik", price: 449000, originalPrice: 699000, img: "/images/ml.png", rating: 4.9, sold: "850", location: "Tangerang" },
  { id: 5, name: "Skincare Set Lengkap - Brightening & Moisturizing", cat: "Kecantikan", price: 175000, img: "/images/roblox.png", rating: 5.0, sold: "5.5rb+", location: "Semarang" },
  { id: 6, name: "Celana Jogger Slim Fit Premium Cotton Blend", cat: "Fashion", price: 159000, originalPrice: 225000, img: "/images/byu.png", rating: 4.8, sold: "2.1rb", location: "Yogyakarta" },
  { id: 7, name: "Mouse Gaming RGB 16000 DPI Wireless Rechargeable", cat: "Gaming", price: 285000, originalPrice: 450000, img: "/images/ml.png", isStar: true, rating: 4.9, sold: "1.8rb", location: "Jakarta" },
  { id: 8, name: "Vitamin C 1000mg + Zinc - 60 Tablet Kunyah", cat: "Kesehatan", price: 89000, img: "/images/roblox.png", rating: 4.6, sold: "10rb+", location: "Medan" },
  { id: 9, name: "Kaos Oversize Unisex Cotton Combed 30s Distro", cat: "Fashion", price: 79000, originalPrice: 120000, img: "/images/byu.png", rating: 4.7, sold: "15rb+", location: "Bandung" },
  { id: 10, name: "Parfum Pria Eau de Toilette 100ml - Fresh Aquatic", cat: "Kecantikan", price: 245000, originalPrice: 350000, img: "/images/ml.png", rating: 4.8, sold: "920", location: "Jakarta" },
]

const CATEGORIES = [
  { name: "Fashion Pria", icon: "👕", color: "bg-blue-500/10 hover:bg-blue-500/15" },
  { name: "Fashion Wanita", icon: "👗", color: "bg-pink-500/10 hover:bg-pink-500/15" },
  { name: "Elektronik", icon: "📱", color: "bg-indigo-500/10 hover:bg-indigo-500/15" },
  { name: "Kecantikan", icon: "✨", color: "bg-purple-500/10 hover:bg-purple-500/15" },
  { name: "Kesehatan", icon: "💊", color: "bg-green-500/10 hover:bg-green-500/15" },
  { name: "Makanan", icon: "🍜", color: "bg-orange-500/10 hover:bg-orange-500/15" },
  { name: "Olahraga", icon: "⚽", color: "bg-emerald-500/10 hover:bg-emerald-500/15" },
  { name: "Gaming", icon: "🎮", color: "bg-red-500/10 hover:bg-red-500/15" },
]

export default function Home() {
  return (
    <div className="space-y-16 pb-20">
      <HeroSection />

      {/* Trust Bar */}
      <section className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, title: "Proses Cepat", desc: "Pengiriman instan" },
            { icon: ShieldCheck, title: "100% Aman", desc: "Transaksi terenkripsi" },
            { icon: Truck, title: "Gratis Ongkir", desc: "Untuk pesanan tertentu" },
            { icon: Headphones, title: "Customer Care", desc: "Bantuan 24/7" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg md:text-xl font-bold">Kategori</h2>
          <Button variant="ghost" asChild className="text-xs font-semibold text-primary hover:text-primary h-8">
            <Link href="/katalog" className="flex items-center gap-1">Lihat Semua <ChevronRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {CATEGORIES.map((cat, i) => (
            <Link key={i} href={`/katalog?category=${cat.name.toLowerCase().replace(/\s/g, "-")}`} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 transition-all cursor-pointer group ${cat.color}`}>
              <span className="text-2xl md:text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-[10px] md:text-xs font-semibold text-center leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Flash Sale */}
      <section className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-900 dark:to-orange-900 rounded-2xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-white fill-white" />
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Flash Sale</h2>
                <div className="flex gap-1.5 ml-2">
                  {["02", "14", "55"].map((t, i) => (
                    <span key={i} className="bg-white/20 backdrop-blur rounded-md px-2 py-1 font-mono font-bold text-sm text-white">{t}</span>
                  ))}
                </div>
              </div>
              <Button variant="secondary" size="sm" asChild className="rounded-full px-6 font-semibold bg-white text-red-500 hover:bg-white/90 h-9">
                <Link href="/katalog?promo=flash-sale">Lihat Semua</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {PRODUCTS.filter(p => p.originalPrice).slice(0, 5).map(product => (
                <div key={product.id} className="bg-white dark:bg-card rounded-xl overflow-hidden">
                  <ProductCard product={product} className="border-none shadow-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg md:text-xl font-bold">Rekomendasi Untukmu</h2>
          <Button variant="ghost" asChild className="text-xs font-semibold text-primary hover:text-primary h-8">
            <Link href="/katalog" className="flex items-center gap-1">Lihat Semua <ChevronRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {[...PRODUCTS, ...PRODUCTS.slice(0, 5)].map((product, i) => (
            <ProductCard key={`rec-${i}`} product={product} />
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button variant="outline" asChild className="rounded-full px-8 h-10 font-semibold border-border">
            <Link href="/katalog">Lihat Katalog Lengkap <ChevronRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Newsletter */}
      <section className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="bg-primary dark:bg-primary/20 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          <div className="relative z-10 max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dapatkan Promo Eksklusif</h2>
            <p className="text-sm text-white/80">Daftarkan email untuk info promo & diskon menarik langsung ke inbox Anda.</p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input type="email" placeholder="Masukkan email Anda" className="flex-1 rounded-full px-5 py-2.5 bg-white/15 border border-white/20 text-white placeholder:text-white/50 outline-none text-sm backdrop-blur" />
              <Button className="rounded-full px-6 bg-white text-primary hover:bg-white/90 font-bold text-sm">Daftar</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

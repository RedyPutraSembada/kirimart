import { HeroSection } from "@/features/public/hero-section"
import { Truck, ShieldCheck, Zap, Headphones, ChevronRight, Star } from "lucide-react"
import { ProductCard } from "@/components/public/product-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { getHomepageProducts, getPublicCategories } from "@/actions/public/storefront.actions"

export default async function Home() {
  // Fetch data real dari database (server component — no client JS)
  const [categoriesRes, flashSaleRes, recommendedRes] = await Promise.all([
    getPublicCategories(),
    getHomepageProducts({ type: "flash_sale", limit: 5 }),
    getHomepageProducts({ type: "recommended", limit: 15 }),
  ])

  const categories = categoriesRes.success ? categoriesRes.data : []
  const flashSaleProducts = flashSaleRes.success ? flashSaleRes.data : []
  const recommendedProducts = recommendedRes.success ? recommendedRes.data : []

  // Fallback color mapping untuk kategori
  const categoryColors = [
    "bg-blue-500/10 hover:bg-blue-500/15",
    "bg-pink-500/10 hover:bg-pink-500/15",
    "bg-indigo-500/10 hover:bg-indigo-500/15",
    "bg-purple-500/10 hover:bg-purple-500/15",
    "bg-green-500/10 hover:bg-green-500/15",
    "bg-orange-500/10 hover:bg-orange-500/15",
    "bg-emerald-500/10 hover:bg-emerald-500/15",
    "bg-red-500/10 hover:bg-red-500/15",
  ]

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

      {/* Categories — dari database */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 md:px-6 max-w-7xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg md:text-xl font-bold">Kategori</h2>
            <Button variant="ghost" asChild className="text-xs font-semibold text-primary hover:text-primary h-8">
              <Link href="/katalog" className="flex items-center gap-1">Lihat Semua <ChevronRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {categories.slice(0, 8).map((cat, i) => (
              <Link key={cat.id} href={`/katalog?categoryId=${cat.id}`} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border/40 transition-all cursor-pointer group ${categoryColors[i % categoryColors.length]}`}>
                {cat.iconUrl ? (
                  <div className="relative h-7 w-7 md:h-8 md:w-8 group-hover:scale-110 transition-transform">
                    <Image src={cat.iconUrl} alt={cat.name} fill sizes="32px" unoptimized className="object-contain" />
                  </div>
                ) : (
                  <span className="text-2xl md:text-3xl group-hover:scale-110 transition-transform">📦</span>
                )}
                <span className="text-[10px] md:text-xs font-semibold text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Flash Sale — dari database */}
      {flashSaleProducts.length > 0 && (
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
                {flashSaleProducts.map(product => (
                  <div key={product.id} className="bg-white dark:bg-card rounded-xl overflow-hidden">
                    <ProductCard product={product} className="border-none shadow-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recommendations — dari database */}
      <section className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg md:text-xl font-bold">Rekomendasi Untukmu</h2>
          <Button variant="ghost" asChild className="text-xs font-semibold text-primary hover:text-primary h-8">
            <Link href="/katalog" className="flex items-center gap-1">Lihat Semua <ChevronRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        {recommendedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {recommendedProducts.map((product, i) => (
              <ProductCard key={`rec-${product.id}-${i}`} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <p className="text-4xl">🛍️</p>
            <p className="font-semibold">Belum ada produk</p>
            <p className="text-sm text-muted-foreground">Produk akan tampil setelah seller menambahkan produk ke toko mereka.</p>
          </div>
        )}
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
            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto w-full">
              <input type="email" placeholder="Masukkan email Anda" className="flex-1 w-full rounded-full px-5 py-2.5 bg-white/15 border border-white/20 text-white placeholder:text-white/50 outline-none text-sm backdrop-blur" />
              <Button className="w-full sm:w-auto rounded-full px-6 bg-white text-primary hover:bg-white/90 font-bold text-sm">Daftar</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

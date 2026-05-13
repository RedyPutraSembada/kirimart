import { HeroSection } from "@/features/public/hero-section"
import { Truck, ShieldCheck, Zap, Headphones, ChevronRight, Star } from "lucide-react"
import { ProductCard } from "@/components/public/product-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const FEATURED_PRODUCTS = [
  { 
    id: 1, 
    name: "Top Up Diamond Mobile Legends - Flash Sale", 
    cat: "Game", 
    price: 50000, 
    originalPrice: 75000, 
    img: "/images/ml.png",
    isStar: true,
    rating: 4.9,
    sold: "2.5rb+",
    location: "Jakarta",
    promo: "Flash Sale"
  },
  { 
    id: 2, 
    name: "Robux Roblox Gift Card 2000 Robux", 
    cat: "Game", 
    price: 250000, 
    img: "/images/roblox.png",
    rating: 5.0,
    sold: "500",
    location: "Bandung"
  },
  { 
    id: 3, 
    name: "Pulsa By.U 50.000 - Instant Sent", 
    cat: "Pulsa", 
    price: 51000, 
    originalPrice: 55000, 
    img: "/images/byu.png",
    isStar: true,
    rating: 4.7,
    sold: "10rb+",
    location: "Surabaya",
    promo: "Cashback 5%"
  },
  { 
    id: 4, 
    name: "Diamond ML - Weekly Pass Super Hemat", 
    cat: "Game", 
    price: 30000, 
    originalPrice: 40000, 
    img: "/images/ml.png",
    rating: 4.8,
    sold: "1.1rb",
    location: "Tangerang"
  },
  { 
    id: 5, 
    name: "Genshin Impact Welkin Moon - Fast Delivery", 
    cat: "Game", 
    price: 75000, 
    img: "/images/roblox.png",
    rating: 4.9,
    sold: "3.2rb",
    location: "Jakarta Barat"
  },
  { 
    id: 6, 
    name: "Spotify Premium 1 Bulan Individual", 
    cat: "Voucher", 
    price: 54990, 
    img: "/images/byu.png",
    rating: 5.0,
    sold: "5.5rb",
    location: "Online"
  },
  { 
    id: 7, 
    name: "Voucher Google Play Rp 100.000", 
    cat: "Voucher", 
    price: 105000, 
    img: "/images/roblox.png",
    rating: 4.8,
    sold: "1.2rb",
    location: "Jakarta Pusat"
  },
  { 
    id: 8, 
    name: "Mobile Legends - 1000 Diamonds", 
    cat: "Game", 
    price: 235000, 
    img: "/images/ml.png",
    rating: 4.9,
    sold: "850",
    location: "Medan"
  },
]

const CATEGORIES = [
  { name: "Mobile Legends", img: "/images/ml.png", color: "bg-blue-500/10" },
  { name: "Roblox", img: "/images/roblox.png", color: "bg-purple-500/10" },
  { name: "Pulsa By.U", img: "/images/byu.png", color: "bg-red-500/10" },
  { name: "Free Fire", img: "/images/ml.png", color: "bg-orange-500/10" },
  { name: "PUBG Mobile", img: "/images/ml.png", color: "bg-emerald-500/10" },
  { name: "Steam Wallet", img: "/images/roblox.png", color: "bg-indigo-500/10" },
]

export default function Home() {
  return (
    <div className="space-y-20 pb-24">
      <HeroSection />

      {/* Trust Bar - Capsule Style */}
      <section className="container mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 py-8 px-10 rounded-full bg-card/50 border border-border/50 shadow-sm backdrop-blur-sm">
          {[
            { icon: Zap, title: "Proses Cepat", desc: "Produk langsung masuk" },
            { icon: ShieldCheck, title: "100% Aman", desc: "Transaksi terenkripsi" },
            { icon: Truck, title: "Layanan 24/7", desc: "Selalu ada untuk Anda" },
            { icon: Headphones, title: "Customer Care", desc: "Bantuan kapan saja" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold text-[11px] uppercase tracking-wider">{item.title}</h4>
                <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Bento */}
      <section className="container mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black tracking-tighter">Kategori Populer</h2>
            <p className="text-xs text-muted-foreground font-semibold">Temukan produk favorit berdasarkan kategorinya</p>
          </div>
          <Button variant="ghost" asChild className="font-bold text-primary hover:text-primary hover:bg-primary/5 rounded-full text-xs">
            <Link href="/katalog" className="flex items-center gap-1">Lihat Semua <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {CATEGORIES.map((cat, i) => (
            <div key={i} className="group flex flex-col items-center gap-4 cursor-pointer">
              <div className="relative aspect-square w-full rounded-3xl bg-card border border-border/50 overflow-hidden group-hover:shadow-xl group-hover:shadow-primary/10 transition-all duration-500">
                <div className={`absolute inset-0 ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative h-full flex items-center justify-center p-8">
                  <img src={cat.img} alt={cat.name} className="h-full w-full object-contain group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500" />
                </div>
              </div>
              <span className="text-xs font-bold tracking-tight group-hover:text-primary transition-colors">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Flash Sale Section - Theme Aware */}
      <section className="container mx-auto px-6">
        <div className="bg-primary dark:bg-[#1A120B] rounded-[3rem] p-8 md:p-12 overflow-hidden relative border border-white/10 shadow-2xl shadow-primary/20 dark:shadow-none transition-colors duration-500">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 dark:bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <div className="h-10 w-10 rounded-full bg-white/20 dark:bg-primary/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Zap className="h-5 w-5 fill-white" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase text-white">Flash Sale</h2>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-white/80 dark:text-white/40 text-xs font-bold uppercase tracking-widest">Berakhir dalam:</p>
                <div className="flex gap-2">
                  {['02', '14', '55'].map((t, i) => (
                    <div key={i} className="bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 font-mono font-black text-xl text-white dark:text-primary border border-white/20 dark:border-white/5 shadow-lg">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button variant="secondary" asChild className="rounded-full px-8 h-12 font-bold bg-white dark:bg-primary dark:text-white text-primary hover:bg-white/90 dark:hover:bg-primary/90 border-none shadow-xl">
              <Link href="/katalog?promo=flash-sale">Lihat Semua Flash Sale</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-12 relative z-10">
            {FEATURED_PRODUCTS.slice(0, 6).map((product) => (
              <div key={product.id} className="bg-white dark:bg-[#2B1E13] rounded-2xl p-1.5 shadow-xl border border-white/10 dark:border-white/5 group hover:-translate-y-1 transition-transform duration-300">
                <ProductCard product={product} className="border-none shadow-none bg-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-6">
        <div className="flex flex-col items-center text-center mb-16 space-y-4">
          <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 px-4 py-1">Semua Produk</Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter">Rekomendasi Untukmu</h2>
          <p className="text-muted-foreground max-w-xl font-medium leading-relaxed">
            Temukan produk terbaik dengan harga paling kompetitif di pasar. Kami kurasi khusus untuk kebutuhan belanja Anda.
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {[...FEATURED_PRODUCTS, ...FEATURED_PRODUCTS].map((product, i) => (
            <ProductCard key={`${product.id}-${i}`} product={product} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <Button size="lg" variant="outline" asChild className="rounded-full px-12 h-14 font-bold border-2 hover:bg-primary hover:text-white transition-all group">
            <Link href="/katalog">
              Lihat Katalog Lengkap <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Newsletter / Marketing - Theme Aware */}
      <section className="container mx-auto px-6">
        <div className="bg-primary dark:bg-[#1A120B] rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden border border-white/10 dark:border-white/5 shadow-2xl shadow-primary/20 dark:shadow-none transition-colors duration-500">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 dark:bg-primary/5 rounded-full blur-[120px]" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-10">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                Jangan Lewatkan Promo <br /> <span className="text-white/80 dark:text-primary italic">Menarik</span> Lainnya!
              </h2>
              <p className="text-white/90 dark:text-white/40 text-base md:text-lg font-medium max-w-xl mx-auto">
                Gabung dengan ribuan pembeli lainnya dan dapatkan info promo eksklusif langsung ke email Anda.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto bg-white/10 dark:bg-white/5 p-2 rounded-full border border-white/20 dark:border-white/10 backdrop-blur-sm">
              <input 
                type="email" 
                placeholder="Masukkan email Anda" 
                className="flex-1 rounded-full px-6 py-3 bg-transparent text-white placeholder:text-white/60 outline-none text-sm font-medium" 
              />
              <Button size="lg" className="rounded-full px-8 bg-white dark:bg-primary text-primary dark:text-white hover:bg-white/90 dark:hover:bg-primary/90 font-bold h-12 shadow-xl">
                Berlangganan
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}


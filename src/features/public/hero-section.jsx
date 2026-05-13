"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,rgba(196,82,10,0.05)_0%,rgba(255,248,242,0)_100%)]" />
      
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="h-3 w-3" />
              <span>Solusi Belanja Cerdas & Hemat</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-[0.95]">
              Belanja Produk <br />
              <span className="text-primary italic">Terbaik</span> dengan <br />
              Sentuhan <span className="text-foreground">Modern</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed font-medium">
              KawanBelanja menghubungkan Anda dengan kurasi produk terbaik, pengiriman yang andal, dan pengalaman belanja yang tak terlupakan.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button asChild size="lg" className="rounded-full px-10 h-14 text-sm font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 bg-primary hover:bg-primary/90">
                <Link href="/katalog" className="flex items-center gap-2">
                  Mulai Belanja <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" className="rounded-full px-8 h-14 text-sm font-bold hover:bg-primary/5">
                <Link href="/tentang">Pelajari Lebih Lanjut</Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="pt-10 flex items-center gap-12 border-t border-border/50">
              <div>
                <p className="text-3xl font-black tracking-tighter">50K+</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">Produk Aktif</p>
              </div>
              <div className="h-10 w-px bg-border/50" />
              <div>
                <p className="text-3xl font-black tracking-tighter">10K+</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">Penjual Terverifikasi</p>
              </div>
            </div>
          </div>

          {/* Right Banner Area */}
          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
            <div className="relative aspect-[4/3] rounded-[3rem] overflow-hidden border-[12px] border-white dark:border-white/5 shadow-2xl group bg-muted">
              <img 
                src="/images/bannerml.png" 
                alt="Marketplace Banner" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-10 left-10 text-white">
                <p className="text-[10px] font-bold opacity-80 mb-2 uppercase tracking-[0.3em]">Penawaran Spesial</p>
                <h3 className="text-3xl font-black tracking-tighter leading-none">Top Up Game Favoritmu <br /> Diskon Hingga 50%</h3>
              </div>
            </div>

            {/* Decorative Glow */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />
          </div>
        </div>
      </div>
    </section>
  )
}


"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-8 lg:pt-20 lg:pb-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_50%,hsl(var(--primary)/0.04)_0%,transparent_100%)]" />

      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-widest">
              <Sparkles className="h-3 w-3" />
              <span>Belanja Cerdas & Hemat</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Temukan Produk<br />
              <span className="text-primary">Terbaik</span> untuk<br />
              Kebutuhanmu
            </h1>

            <p className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
              Marketplace terpercaya dengan ribuan produk berkualitas dari penjual terverifikasi. Belanja aman dengan jaminan uang kembali.
            </p>

            <div className="flex items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-8 h-11 text-sm font-semibold shadow-lg shadow-primary/20">
                <Link href="/katalog">Mulai Belanja <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="rounded-full px-6 h-11 text-sm font-semibold">
                <Link href="/tentang">Pelajari Lebih</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-6 border-t border-border/50">
              <div>
                <p className="text-2xl font-bold tracking-tight">50K+</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Produk Aktif</p>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div>
                <p className="text-2xl font-bold tracking-tight">10K+</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Penjual Terverifikasi</p>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div>
                <p className="text-2xl font-bold tracking-tight">99%</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Kepuasan</p>
              </div>
            </div>
          </div>

          {/* Right Banner */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted shadow-xl">
              <img
                src="/images/bannerml.png"
                alt="Marketplace Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wider mb-1">Penawaran Spesial</p>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight leading-snug">Diskon Hingga 50%<br />untuk Produk Pilihan</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

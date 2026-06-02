"use client"

import * as React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

export function HeroSection() {
  const [api, setApi] = React.useState(null)
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  )

  React.useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  const banners = [
    {
      id: 1,
      image: "/images/bannerml.png",
      badge: "GADGET ZONE",
      title: "GADGET IMPIAN,\nCASHBACK 1JT!",
      discount: "CASHBACK HINGGA\n1 JUTA",
    },
    {
      id: 2,
      image: "/images/bannerml.png",
      badge: "FASHION",
      title: "TAMPIL GAYA\nSETIAP HARI",
      discount: "FASHION HINGGA\n30% OFF",
    },
    {
      id: 3,
      image: "/images/bannerml.png",
      badge: "SPESIAL",
      title: "DISKON HINGGA 50%\nPRODUK PILIHAN",
      discount: "PENAWARAN SPESIAL",
    }
  ]

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

          {/* Right Banner Carousel */}
          <div className="relative w-full max-w-full">
            <Carousel
              setApi={setApi}
              plugins={[plugin.current]}
              className="w-full relative"
              onMouseEnter={plugin.current.stop}
              onMouseLeave={() => plugin.current.play()}
            >
              <CarouselContent>
                {banners.map((banner, index) => (
                  <CarouselItem key={banner.id}>
                    <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden bg-white dark:bg-muted shadow-2xl border border-border/50 group">
                      <Image
                        src={banner.image}
                        alt={`Banner ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-black/10 to-transparent" />

                      {/* <div className="absolute top-6 right-6 z-10 text-right">
                        <p className="text-[10px] md:text-xs font-bold bg-white/90 backdrop-blur-sm text-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                          {banner.badge}
                        </p>
                      </div>

                      <div className="absolute bottom-8 left-6 md:left-8 right-6 z-10">
                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug whitespace-pre-line drop-shadow-lg mb-4">
                          {banner.title}
                        </h3>
                        <div className="inline-flex flex-col items-center justify-center bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-2xl shadow-xl shadow-primary/20 border-2 border-white/20 hover:scale-105 transition-transform cursor-pointer">
                          <span className="text-[10px] uppercase tracking-wider opacity-90 text-center whitespace-pre-line">{banner.discount}</span>
                        </div>
                      </div> */}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Navigation and Pagination */}
              <div className="flex items-center justify-center gap-6 mt-6 px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                  onClick={() => api?.scrollPrev()}
                  disabled={!api?.canScrollPrev()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex justify-center gap-2">
                  {Array.from({ length: count }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => api?.scrollTo(index)}
                      className={`transition-all duration-300 rounded-full h-1.5 ${current === index + 1
                          ? "bg-primary w-6"
                          : "bg-primary/20 w-1.5 hover:bg-primary/40"
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary text-secondary-foreground"
                  onClick={() => api?.scrollNext()}
                  disabled={!api?.canScrollNext()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  )
}

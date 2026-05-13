"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, Search, Menu, User, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { getCategories } from "@/actions/seller-dashboard/product/product.actions"
import { ThemeToggle } from "@/components/global/theme-toggle"

export function Navbar() {
  const [categories, setCategories] = useState([])
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await getCategories()
      if (res.success) {
        setCategories(res.data)
      }
    }
    fetchCategories()

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ${isScrolled ? 'p-2' : 'p-4'} pointer-events-none`}>
      <nav className={`flex items-center justify-between w-full max-w-7xl h-14 px-6 rounded-full border border-border/50 bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-sm pointer-events-auto transition-all duration-300 ${isScrolled ? 'max-w-6xl' : ''}`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="h-7 w-7 rounded-lg overflow-hidden">
            <img src="/images/kawanbelanja.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex items-center gap-0">
            <span className="text-xl font-black tracking-tighter text-primary">kawan</span>
            <span className="text-xl font-black tracking-tighter text-foreground">belanja</span>
          </div>
        </Link>

        {/* Desktop Nav - Centered */}
        <div className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="text-xs font-bold hover:text-primary transition-colors">Beranda</Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-xs font-bold hover:text-primary transition-colors outline-none cursor-pointer">
              Katalog <ChevronDown className="h-3 w-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl p-2 shadow-xl border-border/50 backdrop-blur-lg">
              {categories.map((cat) => (
                <DropdownMenuItem key={cat.id} asChild className="rounded-lg cursor-pointer">
                  <Link href={`/katalog?category=${cat.slug || cat.id}`}>{cat.name}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild className="rounded-lg border-t mt-1 cursor-pointer font-semibold text-primary">
                <Link href="/katalog">Lihat Semua</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/tentang" className="text-xs font-bold hover:text-primary transition-colors">Tentang</Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Cari produk impianmu..." 
              className="pl-9 h-9 w-40 rounded-full bg-muted/50 border-none text-xs focus-visible:ring-1 focus-visible:ring-primary/50 transition-all focus:w-56"
            />
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors relative">
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">0</span>
          </Button>
          <Button asChild variant="default" size="sm" className="rounded-full px-6 h-9 text-xs font-bold shadow-md shadow-primary/20 transition-transform active:scale-95 bg-primary hover:bg-primary/90">
            <Link href="/sign-in">Masuk</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}

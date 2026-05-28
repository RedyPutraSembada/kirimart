"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useInfiniteQuery } from "@tanstack/react-query"
import { SlidersHorizontal, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductCard } from "@/components/public/product-card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import { getCatalogProducts } from "@/actions/public/storefront.actions"
import { useDebouncedCallback } from "use-debounce"

// ============================================
// CATALOG LIST — URL-driven (single source of truth)
// Semua filter dibaca dari URL search params.
// Perubahan filter → push ke URL → komponen re-render otomatis.
// ============================================

export function CatalogList({
  initialCategories = [],
  initialProducts = [],
  initialTotal = 0,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Baca semua filter dari URL
  const search = searchParams.get("search") || ""
  const categoryId = searchParams.get("categoryId") || ""
  const sort = searchParams.get("sort") || "popular"
  const priceMin = searchParams.get("priceMin") || ""
  const priceMax = searchParams.get("priceMax") || ""

  // Ref untuk sentinel infinite scroll
  const sentinelRef = useRef(null)

  // ============================================
  // Helper: update URL params
  // ============================================
  const updateParams = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  // ============================================
  // Debounced search — update URL setelah 400ms
  // ============================================
  const debouncedUpdateSearch = useDebouncedCallback((value) => {
    updateParams({ search: value })
  }, 400)

  // ============================================
  // useInfiniteQuery — dikunci ke URL params
  // ============================================
  const queryFilters = { search, categoryId, priceMin, priceMax, sort, perPage: 20 }

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["catalog-products-infinite", queryFilters],
    queryFn: ({ pageParam = 1 }) =>
      getCatalogProducts({ ...queryFilters, page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialData:
      !search && !categoryId && !priceMin && !priceMax
        ? {
            pages: [{
              success: true,
              data: initialProducts,
              total: initialTotal,
              page: 1,
              perPage: 20,
              nextPage: initialTotal > 20 ? 2 : null,
            }],
            pageParams: [1],
          }
        : undefined,
  })

  const products = data?.pages.flatMap((page) => page.data) || []
  const total = data?.pages[0]?.total || 0

  // ============================================
  // Intersection Observer — auto-fetch next page
  // ============================================
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: "0px 0px 300px 0px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ============================================
  // Action Handlers
  // ============================================
  const toggleCategory = (catId) => {
    updateParams({ categoryId: categoryId === catId ? "" : catId })
  }

  const clearAllFilters = () => {
    router.push(pathname, { scroll: false })
  }

  const hasActiveFilter = search || categoryId || priceMin || priceMax
  const selectedCatName = categoryId
    ? initialCategories.find((c) => String(c.id) === String(categoryId))?.name
    : null

  // ============================================
  // Filter Panel (dipakai di sidebar & sheet)
  // ============================================
  const FilterContent = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Kategori</h3>
        <div className="space-y-1.5">
          {initialCategories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2.5 py-1 cursor-pointer text-sm group"
              onClick={() => toggleCategory(String(cat.id))}
            >
              <Checkbox
                checked={String(categoryId) === String(cat.id)}
                onCheckedChange={() => toggleCategory(String(cat.id))}
              />
              <span
                className={`text-xs transition-colors ${
                  String(categoryId) === String(cat.id)
                    ? "font-semibold text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Harga</h3>
        <div className="space-y-2">
          <Input
            placeholder="Minimum"
            type="number"
            defaultValue={priceMin}
            onBlur={(e) => updateParams({ priceMin: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && updateParams({ priceMin: e.target.value })}
            className="h-8 text-xs rounded-lg"
          />
          <Input
            placeholder="Maksimum"
            type="number"
            defaultValue={priceMax}
            onBlur={(e) => updateParams({ priceMax: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && updateParams({ priceMax: e.target.value })}
            className="h-8 text-xs rounded-lg"
          />
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
    </div>
  )

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <h1 className="text-xl md:text-2xl font-bold">Katalog Produk</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input — terikat ke URL */}
          <div className="relative flex-1 max-w-lg">
            <Input
              placeholder="Cari produk..."
              defaultValue={search}
              key={search} // re-mount saat search di-clear dari luar
              onChange={(e) => debouncedUpdateSearch(e.target.value)}
              className="pl-4 h-10 rounded-xl"
            />
            {isFetching && !isFetchingNextPage && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter sheet (mobile) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 rounded-xl lg:hidden gap-2 font-medium">
                  <SlidersHorizontal className="h-4 w-4" /> Filter
                  {hasActiveFilter && <span className="h-2 w-2 rounded-full bg-primary" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px]">
                <SheetHeader className="mb-6">
                  <SheetTitle>Filter Produk</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto h-[calc(100vh-100px)] pr-2">
                  {FilterContent}
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <Select
              value={sort}
              onValueChange={(val) => updateParams({ sort: val })}
            >
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

        {/* Active Filter Badges */}
        {hasActiveFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter aktif:</span>
            {selectedCatName && (
              <Badge
                variant="secondary"
                className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => updateParams({ categoryId: "" })}
              >
                {selectedCatName} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {search && (
              <Badge
                variant="secondary"
                className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => updateParams({ search: "" })}
              >
                &ldquo;{search}&rdquo; <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {(priceMin || priceMax) && (
              <Badge
                variant="secondary"
                className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => updateParams({ priceMin: "", priceMax: "" })}
              >
                Harga: {priceMin || "0"} - {priceMax || "∞"} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-[10px] text-red-500 font-semibold hover:underline ml-1"
            >
              Hapus Semua
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filter — Desktop */}
        <aside className="w-56 shrink-0 hidden lg:block">
          {FilterContent}
        </aside>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Memuat..." : `${total} produk ditemukan`}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Sentinel — Intersection Observer */}
              <div ref={sentinelRef} className="mt-8 flex justify-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Memuat lebih banyak...</span>
                  </div>
                ) : hasNextPage ? (
                  <div className="h-4 w-full" />
                ) : (
                  <p className="text-xs text-muted-foreground py-4">
                    Semua produk sudah ditampilkan ({products.length} produk)
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 space-y-3">
              <p className="text-4xl">😕</p>
              <p className="font-semibold">Produk tidak ditemukan</p>
              <p className="text-sm text-muted-foreground">Coba ubah kata kunci atau filter pencarian</p>
              <Button variant="outline" size="sm" className="rounded-full" onClick={clearAllFilters}>
                Reset Filter
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

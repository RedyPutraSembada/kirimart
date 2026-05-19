"use client"

import { useState, useTransition } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { ProductCard } from "@/components/public/product-card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { getCatalogProducts } from "@/actions/public/storefront.actions"
import { useDebouncedCallback } from "use-debounce"

export function CatalogList({
  initialCategories = [],
  initialProducts = [],
  initialTotal = 0,
  initialFilters = {},
}) {
  const [search, setSearch] = useState(initialFilters.search || "")
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search || "")
  const [selectedCatId, setSelectedCatId] = useState(initialFilters.categoryId || "")
  const [sortBy, setSortBy] = useState(initialFilters.sort || "popular")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [page, setPage] = useState(1)
  const [showFilter, setShowFilter] = useState(false)

  // Debounce search input
  const debouncedSetSearch = useDebouncedCallback((value) => {
    setDebouncedSearch(value)
    setPage(1)
  }, 400)

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    debouncedSetSearch(e.target.value)
  }

  // Build query filters
  const queryFilters = {
    search: debouncedSearch,
    categoryId: selectedCatId,
    priceMin: priceMin || undefined,
    priceMax: priceMax || undefined,
    sort: sortBy,
    page,
    perPage: 20,
  }

  // TanStack Query — fetch products
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["catalog-products", queryFilters],
    queryFn: () => getCatalogProducts(queryFilters),
    placeholderData: (previousData) => previousData, // Keep showing previous while loading
    initialData: page === 1 && !debouncedSearch && !selectedCatId && !priceMin && !priceMax
      ? { success: true, data: initialProducts, total: initialTotal, page: 1, perPage: 20, nextPage: initialTotal > 20 ? 2 : null }
      : undefined,
  })

  const products = data?.data || []
  const total = data?.total || 0
  const nextPage = data?.nextPage || null

  const toggleCat = (catId) => {
    setSelectedCatId(prev => prev === catId ? "" : catId)
    setPage(1)
  }

  const clearFilters = () => {
    setSelectedCatId("")
    setPriceMin("")
    setPriceMax("")
    setSearch("")
    setDebouncedSearch("")
    setPage(1)
  }

  const hasActiveFilter = selectedCatId || priceMin || priceMax || debouncedSearch
  const selectedCatName = selectedCatId ? initialCategories.find(c => String(c.id) === String(selectedCatId))?.name : null

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
              onChange={handleSearchChange}
              className="pl-10 h-10 rounded-xl"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-10 rounded-xl lg:hidden gap-2 font-medium" onClick={() => setShowFilter(!showFilter)}>
              <SlidersHorizontal className="h-4 w-4" /> Filter
              {hasActiveFilter && <span className="h-2 w-2 rounded-full bg-primary" />}
            </Button>
            <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1) }}>
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
            {selectedCatName && (
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleCat(selectedCatId)}>
                {selectedCatName} <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {debouncedSearch && (
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => { setSearch(""); setDebouncedSearch("") }}>
                "{debouncedSearch}" <X className="h-2.5 w-2.5" />
              </Badge>
            )}
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
              {initialCategories.map(cat => (
                <label key={cat.id} className="flex items-center gap-2.5 py-1 cursor-pointer text-sm group">
                  <Checkbox checked={String(selectedCatId) === String(cat.id)} onCheckedChange={() => toggleCat(String(cat.id))} />
                  <span className={`text-xs transition-colors ${String(selectedCatId) === String(cat.id) ? "font-semibold text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Harga</h3>
            <div className="space-y-2">
              <Input placeholder="Minimum" type="number" value={priceMin} onChange={e => { setPriceMin(e.target.value); setPage(1) }} className="h-8 text-xs rounded-lg" />
              <Input placeholder="Maksimum" type="number" value={priceMax} onChange={e => { setPriceMax(e.target.value); setPage(1) }} className="h-8 text-xs rounded-lg" />
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
            <p className="text-xs text-muted-foreground">
              {isFetching ? "Memuat..." : `${total} produk ditemukan`}
            </p>
          </div>
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 mt-8">
                {page > 1 && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPage(page - 1)}>
                    ← Sebelumnya
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">Halaman {page}</span>
                {nextPage && (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPage(nextPage)}>
                    Selanjutnya →
                  </Button>
                )}
              </div>
            </>
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

"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Loader2, RefreshCw, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCartDetails, updateCartItemQty, updateCartItemVariant, removeCartItem } from "@/actions/public/cart.actions"
import { setCheckoutItems } from "@/actions/public/checkout.actions"
import { toast } from "sonner"
import Image from "next/image"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

// ─── Variant Switcher Component ───
function VariantSwitcher({ item, onChangeVariant, isPending }) {
  const [isOpen, setIsOpen] = useState(false)

  const hasVariants = item.options?.length > 0 && item.allVariants?.length > 0
  if (!hasVariants) return null

  // Cari varian aktif saat ini
  const currentVariant = item.allVariants.find(v => v.id === item.variantId)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-transparent hover:border-primary/30"
      >
        {item.variant || "Pilih varian"}
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-xl shadow-lg p-3 min-w-[220px] max-w-[280px] space-y-3">
            <p className="text-xs font-semibold text-foreground">Ubah Varian</p>
            
            {item.options.map((option) => (
              <div key={option.id} className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground">{option.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {option.values.map((val) => {
                    // Cek apakah ada varian aktif dengan value ini
                    const isCurrentValue = currentVariant?.attributes?.[option.name] === val
                    
                    // Cek apakah ada varian yang cocok jika memilih value ini
                    const potentialAttributes = { ...(currentVariant?.attributes || {}), [option.name]: val }
                    const matchingVariant = item.allVariants.find(v =>
                      v.status === "active" &&
                      Object.entries(potentialAttributes).every(([k, vv]) => v.attributes[k] === vv)
                    )
                    const isDisabled = !matchingVariant || matchingVariant.stock === 0

                    return (
                      <button
                        key={val}
                        disabled={isDisabled || isPending}
                        onClick={() => {
                          if (matchingVariant && matchingVariant.id !== item.variantId) {
                            onChangeVariant(item.cartItemId, matchingVariant.id)
                            setIsOpen(false)
                          }
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-md border text-[10px] font-medium transition-all flex items-center gap-1",
                          isCurrentValue
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40 text-foreground",
                          isDisabled && "opacity-30 cursor-not-allowed line-through"
                        )}
                      >
                        {val}
                        {isCurrentValue && <Check className="h-2.5 w-2.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Cart View ───
export function CartView() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(new Set())
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // 1. Fetch data dari server
  const { data: queryData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["cart-details"],
    queryFn: getCartDetails,
  })

  const cartStores = queryData?.data?.stores || []
  const allItems = useMemo(() => cartStores.flatMap(s => s.items), [cartStores])

  // Filter hanya item yang valid (stok mencukupi) untuk bisa di-checkout
  const validItems = useMemo(() => allItems.filter(i => i.stock > 0 && i.qty <= i.stock), [allItems])
  const allValidChecked = validItems.length > 0 && validItems.every(i => selected.has(i.cartItemId))

  // Lacak item yang sudah pernah dilihat user — agar tidak auto-select ulang item yang sengaja di-uncheck
  const [hasInitialized, setHasInitialized] = useState(false)
  const knownItemIds = useRef(new Set())

  useEffect(() => {
    if (!isLoading && allItems.length > 0) {
      const currentIds = new Set(allItems.map(i => i.cartItemId))

      if (!hasInitialized) {
        // Pertama kali: select semua yang valid
        setSelected(new Set(validItems.map(i => i.cartItemId)))
        knownItemIds.current = currentIds
        setHasInitialized(true)
      } else {
        // Re-fetch: hanya auto-select item yang BENAR-BENAR baru (belum pernah terlihat)
        setSelected(prev => {
          const newSet = new Set(prev)
          // Hapus yang sudah tidak ada di cart
          for (const id of newSet) {
            if (!currentIds.has(id)) newSet.delete(id)
          }
          // Hapus yang stoknya habis
          for (const item of allItems) {
            if (item.stock === 0 || item.qty > item.stock) newSet.delete(item.cartItemId)
          }
          // Hanya auto-select item yang BARU (belum pernah ada di knownItemIds)
          for (const item of validItems) {
            if (!knownItemIds.current.has(item.cartItemId)) {
              newSet.add(item.cartItemId)
            }
          }
          return newSet
        })
        // Update known items
        knownItemIds.current = currentIds
      }
    }
    if (!isLoading && allItems.length === 0) {
      setSelected(new Set())
    }
  }, [queryData])

  // 2. Mutations
  const qtyMutation = useMutation({
    mutationFn: ({ cartItemId, action }) => updateCartItemQty(cartItemId, action),
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error)
      queryClient.invalidateQueries({ queryKey: ["cart-details"] })
      queryClient.invalidateQueries({ queryKey: ["cart-summary"] })
    },
    onError: () => toast.error("Gagal memperbarui jumlah.")
  })

  const variantMutation = useMutation({
    mutationFn: ({ cartItemId, newVariantId }) => updateCartItemVariant(cartItemId, newVariantId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
      queryClient.invalidateQueries({ queryKey: ["cart-details"] })
      queryClient.invalidateQueries({ queryKey: ["cart-summary"] })
    },
    onError: () => toast.error("Gagal mengubah varian.")
  })

  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: (result) => {
      if (result.success) toast.success(result.message)
      else toast.error(result.error)
      queryClient.invalidateQueries({ queryKey: ["cart-details"] })
      queryClient.invalidateQueries({ queryKey: ["cart-summary"] })
    },
    onError: () => toast.error("Gagal menghapus barang.")
  })

  // 3. Handlers
  const toggleItem = (cartItemId, item) => {
    if (item.stock === 0 || item.qty > item.stock) {
      toast.warning("Sesuaikan jumlah dengan stok yang tersedia terlebih dahulu.")
      return
    }
    setSelected(prev => {
      const n = new Set(prev)
      n.has(cartItemId) ? n.delete(cartItemId) : n.add(cartItemId)
      return n
    })
  }

  const toggleStore = (storeId) => {
    const store = cartStores.find(s => s.id === storeId)
    if (!store) return
    const validStoreItems = store.items.filter(i => i.stock > 0 && i.qty <= i.stock)
    const validIds = validStoreItems.map(i => i.cartItemId)
    const allSelected = validIds.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      validIds.forEach(id => allSelected ? n.delete(id) : n.add(id))
      return n
    })
  }

  const toggleAll = (checked) => {
    setSelected(checked ? new Set(validItems.map(i => i.cartItemId)) : new Set())
  }

  const updateQty = (cartItemId, delta, currentQty, stock) => {
    if (delta > 0 && currentQty >= stock) {
      toast.error(`Stok tersedia hanya ${stock}`)
      return
    }
    if (delta < 0 && currentQty <= 1) return
    qtyMutation.mutate({ cartItemId, action: delta > 0 ? "increase" : "decrease" })
  }

  const handleChangeVariant = (cartItemId, newVariantId) => {
    variantMutation.mutate({ cartItemId, newVariantId })
  }

  const removeItem = (cartItemId) => {
    setSelected(prev => { const n = new Set(prev); n.delete(cartItemId); return n })
    removeMutation.mutate(cartItemId)
  }

  // 4. Perhitungan Ringkasan
  const selectedItems = allItems.filter(i => selected.has(i.cartItemId))
  const totalPrice = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const totalOriginal = selectedItems.reduce((sum, i) => sum + (i.originalPrice || i.price) * i.qty, 0)
  const totalSaved = totalOriginal - totalPrice
  const totalQty = selectedItems.reduce((sum, i) => sum + i.qty, 0)

  // 5. Loading State
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memuat keranjang...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-16 text-center space-y-4">
        <p className="text-red-500 font-semibold">Gagal memuat keranjang.</p>
        <Button onClick={() => refetch()} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi</Button>
      </div>
    )
  }

  // 6. Empty State
  if (allItems.length === 0) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-16 max-w-4xl text-center space-y-4">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40" />
        <h2 className="text-xl font-bold">Keranjang Kosong</h2>
        <p className="text-sm text-muted-foreground">Belum ada barang di keranjang. Yuk mulai belanja!</p>
        <Button asChild><Link href="/">Mulai Belanja</Link></Button>
      </div>
    )
  }

  // 7. Main Render
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Keranjang Belanja</h1>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-8 space-y-4">
          {/* Select All */}
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <Checkbox checked={allValidChecked} onCheckedChange={toggleAll} disabled={validItems.length === 0} />
              <span className="text-sm font-medium">Pilih Semua ({validItems.length} produk tersedia)</span>
            </CardContent>
          </Card>

          {/* Store Groups */}
          {cartStores.map((store) => {
            const validStoreItems = store.items.filter(i => i.stock > 0 && i.qty <= i.stock)
            const storeItemIds = validStoreItems.map(i => i.cartItemId)
            const storeChecked = storeItemIds.length > 0 && storeItemIds.every(id => selected.has(id))

            return (
              <Card key={store.id} className="border-border/60">
                <CardHeader className="pb-3 px-4 pt-4">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={storeChecked} onCheckedChange={() => toggleStore(store.id)} disabled={validStoreItems.length === 0} />
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-white border shrink-0 relative">
                      {store.logo ? (
                        <Image src={store.logo} alt={store.name} fill unoptimized className="object-contain" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px]">🏪</div>
                      )}
                    </div>
                    <span className="text-sm font-bold">{store.name}</span>
                    {store.isStar && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[9px] font-bold px-1.5 py-0 h-4 border-none">Star</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-0 divide-y">
                  {store.items.map((item) => {
                    const isOutOfStock = item.stock === 0
                    const isQtyExceedsStock = item.qty > item.stock
                    const isInvalid = isOutOfStock || isQtyExceedsStock
                    const isQtyWorking = qtyMutation.isPending && qtyMutation.variables?.cartItemId === item.cartItemId
                    const isVariantWorking = variantMutation.isPending && variantMutation.variables?.cartItemId === item.cartItemId
                    const isWorking = isQtyWorking || isVariantWorking

                    return (
                      <div key={item.cartItemId} className={cn(
                        "flex gap-3 py-4 first:pt-0 transition-opacity",
                        isWorking && "opacity-50",
                        isInvalid && "bg-red-50/50 dark:bg-red-950/10 px-2 -mx-2 rounded-lg"
                      )}>
                        <div className="flex items-start gap-3 pt-1 shrink-0">
                          <Checkbox
                            checked={selected.has(item.cartItemId) && !isInvalid}
                            onCheckedChange={() => toggleItem(item.cartItemId, item)}
                            disabled={isInvalid || isWorking}
                          />
                          <Link href={`/product/${item.productId}`} className="h-20 w-20 rounded-xl overflow-hidden bg-muted border shrink-0 block relative">
                            {item.img ? (
                              <Image src={item.img} alt={item.name} fill unoptimized className="object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">📦</div>
                            )}
                          </Link>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <Link href={`/product/${item.productId}`} className="hover:text-primary transition-colors block">
                            <p className="text-sm font-medium line-clamp-2 leading-snug">{item.name}</p>
                          </Link>

                          {/* Variant Switcher — klik untuk ubah varian langsung dari keranjang */}
                          <VariantSwitcher
                            item={item}
                            onChangeVariant={handleChangeVariant}
                            isPending={isVariantWorking}
                          />

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{fmt(item.price)}</span>
                            {item.originalPrice && <span className="text-xs text-muted-foreground line-through">{fmt(item.originalPrice)}</span>}
                          </div>

                          {isOutOfStock ? (
                            <p className="text-xs font-semibold text-red-500">Stok habis</p>
                          ) : isQtyExceedsStock ? (
                            <p className="text-xs font-semibold text-red-500">Stok hanya sisa {item.stock}</p>
                          ) : null}

                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeItem(item.cartItemId)}
                                disabled={removeMutation.isPending && removeMutation.variables === item.cartItemId}
                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              >
                                {removeMutation.isPending && removeMutation.variables === item.cartItemId
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4" />}
                              </button>
                            </div>

                            <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 rounded-none"
                                onClick={() => updateQty(item.cartItemId, -1, item.qty, item.stock)}
                                disabled={item.qty <= 1 || isWorking || removeMutation.isPending}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 rounded-none"
                                onClick={() => updateQty(item.cartItemId, 1, item.qty, item.stock)}
                                disabled={item.qty >= item.stock || isWorking || removeMutation.isPending}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">Ringkasan Belanja</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Harga ({totalQty} barang)</span>
                  <span className="font-medium">{fmt(totalOriginal)}</span>
                </div>
                {totalSaved > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hemat</span>
                    <span className="font-medium text-red-500">-{fmt(totalSaved)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">{fmt(totalPrice)}</span>
                </div>
                <Button
                  className="w-full h-11 font-bold text-sm"
                  disabled={selected.size === 0 || isCheckingOut}
                  onClick={async () => {
                    setIsCheckingOut(true)
                    try {
                      const result = await setCheckoutItems(Array.from(selected))
                      if (result.success) {
                        router.push("/checkout")
                      } else {
                        toast.error(result.error || "Gagal memproses checkout.")
                        setIsCheckingOut(false)
                      }
                    } catch {
                      toast.error("Terjadi kesalahan. Silakan coba lagi.")
                      setIsCheckingOut(false)
                    }
                  }}
                >
                  {isCheckingOut ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                  ) : (
                    <>Checkout ({selected.size}) <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </CardContent>
            </Card>
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Transaksi dilindungi proteksi pembeli KiriMart</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, ShieldCheck, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import Link from "next/link"

const MOCK_CART = {
  stores: [
    {
      id: 1, name: "Cartiera Official", slug: "cartiera-official", logo: "/images/kawanbelanja.png", isStar: true,
      items: [
        { id: 1, name: "Loco Polo Cartiera Scuba 280 GSM Boxy Polo Shirt Pria", img: "/images/ml.png", variant: "Jet Black, M", price: 139885, originalPrice: 199000, qty: 2, stock: 500 },
        { id: 2, name: "Cartiera Essential Jogger Pants - Relaxed Fit", img: "/images/ml.png", variant: "Grey, L", price: 189000, originalPrice: null, qty: 1, stock: 120 },
      ],
    },
    {
      id: 2, name: "Nike Indonesia", slug: "nike-indonesia", logo: "/images/kawanbelanja.png", isStar: false,
      items: [
        { id: 3, name: "Nike Air Max 270 React - Triple Black Edition", img: "/images/ml.png", variant: "Black, 42", price: 1899000, originalPrice: 2499000, qty: 1, stock: 15 },
      ],
    },
  ],
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function CartView() {
  const [cart, setCart] = useState(MOCK_CART)
  const [selected, setSelected] = useState(new Set(MOCK_CART.stores.flatMap(s => s.items.map(i => i.id))))

  const allItems = cart.stores.flatMap(s => s.items)
  const allChecked = allItems.length > 0 && selected.size === allItems.length

  const toggleItem = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleStore = (storeId) => {
    const store = cart.stores.find(s => s.id === storeId)
    if (!store) return
    const ids = store.items.map(i => i.id)
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => allSelected ? n.delete(id) : n.add(id)); return n })
  }
  const toggleAll = (checked) => setSelected(checked ? new Set(allItems.map(i => i.id)) : new Set())

  const updateQty = (itemId, delta) => {
    setCart(prev => ({
      ...prev,
      stores: prev.stores.map(s => ({
        ...s,
        items: s.items.map(i => i.id === itemId ? { ...i, qty: Math.max(1, Math.min(i.stock, i.qty + delta)) } : i),
      })),
    }))
  }

  const removeItem = (itemId) => {
    setCart(prev => ({
      ...prev,
      stores: prev.stores.map(s => ({ ...s, items: s.items.filter(i => i.id !== itemId) })).filter(s => s.items.length > 0),
    }))
    setSelected(prev => { const n = new Set(prev); n.delete(itemId); return n })
  }

  const selectedItems = allItems.filter(i => selected.has(i.id))
  const totalPrice = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  const totalOriginal = selectedItems.reduce((sum, i) => sum + (i.originalPrice || i.price) * i.qty, 0)
  const totalSaved = totalOriginal - totalPrice
  const totalQty = selectedItems.reduce((sum, i) => sum + i.qty, 0)

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

  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Keranjang Belanja</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-8 space-y-4">
          {/* Select All */}
          <Card className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
              <span className="text-sm font-medium">Pilih Semua ({allItems.length} produk)</span>
            </CardContent>
          </Card>

          {/* Store Groups */}
          {cart.stores.map((store) => {
            const storeItemIds = store.items.map(i => i.id)
            const storeChecked = storeItemIds.every(id => selected.has(id))
            return (
              <Card key={store.id} className="border-border/60">
                <CardHeader className="pb-3 px-4 pt-4">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={storeChecked} onCheckedChange={() => toggleStore(store.id)} />
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-white border shrink-0">
                      <img src={store.logo} alt={store.name} className="h-full w-full object-contain" />
                    </div>
                    <span className="text-sm font-bold">{store.name}</span>
                    {store.isStar && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[9px] font-bold px-1.5 py-0 h-4 border-none">Star</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-0 divide-y">
                  {store.items.map((item) => (
                    <div key={item.id} className="flex gap-3 py-4 first:pt-0">
                      <div className="flex items-start gap-3 pt-1 shrink-0">
                        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                        <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted border shrink-0">
                          <img src={item.img} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium line-clamp-2 leading-snug">{item.name}</p>
                        <Badge variant="secondary" className="text-[10px] font-medium">{item.variant}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{fmt(item.price)}</span>
                          {item.originalPrice && <span className="text-xs text-muted-foreground line-through">{fmt(item.originalPrice)}</span>}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1"><Trash2 className="h-4 w-4" /></button>
                          </div>
                          <div className="flex items-center border rounded-lg">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
                <Button className="w-full h-11 font-bold text-sm" disabled={selected.size === 0} asChild>
                  <Link href="/checkout">
                    Checkout ({selected.size}) <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
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

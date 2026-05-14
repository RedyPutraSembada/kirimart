"use client"

import { useState } from "react"
import { MapPin, Truck, ShieldCheck, ChevronDown, CreditCard, Wallet, Building2, Tag, ChevronRight, Clock, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import Link from "next/link"

const MOCK_ADDRESS = {
  label: "Rumah",
  name: "Budi Santoso",
  phone: "08123456789",
  detail: "Jl. Merdeka No. 123, RT 05/RW 02, Kel. Menteng, Kec. Menteng",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postalCode: "10310",
}

const MOCK_CHECKOUT = {
  stores: [
    {
      id: 1, name: "Cartiera Official", slug: "cartiera-official", logo: "/images/kawanbelanja.png",
      items: [
        { id: 1, name: "Loco Polo Cartiera Scuba 280 GSM Boxy Polo Shirt Pria", img: "/images/ml.png", variant: "Jet Black, M", price: 139885, qty: 2, weight: 300 },
        { id: 2, name: "Cartiera Essential Jogger Pants - Relaxed Fit", img: "/images/ml.png", variant: "Grey, L", price: 189000, qty: 1, weight: 450 },
      ],
      shipping: [
        { id: "regular", name: "Reguler", courier: "J&T Express", price: 15000, eta: "3-5 hari" },
        { id: "express", name: "Express", courier: "JNE YES", price: 28000, eta: "1-2 hari" },
        { id: "same_day", name: "Same Day", courier: "GoSend", price: 45000, eta: "Hari ini" },
      ],
    },
    {
      id: 2, name: "Nike Indonesia", slug: "nike-indonesia", logo: "/images/kawanbelanja.png",
      items: [
        { id: 3, name: "Nike Air Max 270 React - Triple Black Edition", img: "/images/ml.png", variant: "Black, 42", price: 1899000, qty: 1, weight: 800 },
      ],
      shipping: [
        { id: "regular", name: "Reguler", courier: "SiCepat REG", price: 18000, eta: "3-4 hari" },
        { id: "express", name: "Express", courier: "SiCepat BEST", price: 32000, eta: "1-2 hari" },
      ],
    },
  ],
}

const PAYMENT_METHODS = [
  { id: "va_bca", name: "BCA Virtual Account", icon: Building2, group: "Transfer Bank" },
  { id: "va_bni", name: "BNI Virtual Account", icon: Building2, group: "Transfer Bank" },
  { id: "va_mandiri", name: "Mandiri Virtual Account", icon: Building2, group: "Transfer Bank" },
  { id: "ewallet_gopay", name: "GoPay", icon: Wallet, group: "E-Wallet" },
  { id: "ewallet_ovo", name: "OVO", icon: Wallet, group: "E-Wallet" },
  { id: "ewallet_dana", name: "DANA", icon: Wallet, group: "E-Wallet" },
  { id: "cc", name: "Kartu Kredit / Debit", icon: CreditCard, group: "Kartu" },
]

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function CheckoutView() {
  const [selectedShipping, setSelectedShipping] = useState(() => {
    const init = {}
    MOCK_CHECKOUT.stores.forEach(s => { init[s.id] = s.shipping[0].id })
    return init
  })
  const [selectedPayment, setSelectedPayment] = useState("va_bca")
  const [notes, setNotes] = useState({})
  const [voucherCode, setVoucherCode] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const address = MOCK_ADDRESS

  // Calculate totals
  const subtotal = MOCK_CHECKOUT.stores.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.price * i.qty, 0), 0)
  const totalShipping = MOCK_CHECKOUT.stores.reduce((sum, s) => {
    const ship = s.shipping.find(sh => sh.id === selectedShipping[s.id])
    return sum + (ship?.price || 0)
  }, 0)
  const serviceFee = 1000
  const grandTotal = subtotal + totalShipping + serviceFee

  const handleCheckout = () => {
    setIsProcessing(true)
    setTimeout(() => { setIsProcessing(false); alert("Pesanan berhasil dibuat! (Demo)") }, 1500)
  }

  const paymentGroups = PAYMENT_METHODS.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = []
    acc[m.group].push(m)
    return acc
  }, {})

  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
      <h1 className="text-xl md:text-2xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-4">

          {/* Address */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Alamat Pengiriman</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold h-7">Ganti Alamat</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{address.name}</span>
                <Badge variant="outline" className="text-[10px] h-5">{address.label}</Badge>
                <span className="text-sm text-muted-foreground">{address.phone}</span>
              </div>
              <p className="text-sm text-muted-foreground">{address.detail}, {address.city}, {address.province} {address.postalCode}</p>
            </CardContent>
          </Card>

          {/* Store Orders */}
          {MOCK_CHECKOUT.stores.map((store, sIdx) => (
            <Card key={store.id} className="border-border/60">
              <CardHeader className="pb-3 px-4 pt-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-white border shrink-0">
                    <img src={store.logo} alt={store.name} className="h-full w-full object-contain" />
                  </div>
                  <span className="text-sm font-bold">{store.name}</span>
                  <span className="text-[10px] text-muted-foreground">Pesanan {sIdx + 1}</span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {store.items.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted border shrink-0">
                        <img src={item.img} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.variant}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold">{fmt(item.price)}</span>
                          <span className="text-xs text-muted-foreground">&times;{item.qty}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Catatan untuk penjual (opsional)</label>
                  <Textarea
                    placeholder="Contoh: Packing rapih, warna jangan sampai salah ya..."
                    className="min-h-[60px] text-xs resize-none"
                    value={notes[store.id] || ""}
                    onChange={e => setNotes(prev => ({ ...prev, [store.id]: e.target.value }))}
                  />
                </div>

                {/* Shipping */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Opsi Pengiriman</span>
                  </div>
                  <div className="space-y-2">
                    {store.shipping.map(ship => (
                      <button
                        key={ship.id}
                        onClick={() => setSelectedShipping(prev => ({ ...prev, [store.id]: ship.id }))}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                          selectedShipping[store.id] === ship.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div>
                          <p className="text-xs font-semibold">{ship.name} <span className="font-normal text-muted-foreground">- {ship.courier}</span></p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> Estimasi {ship.eta}</p>
                        </div>
                        <span className="text-xs font-bold">{fmt(ship.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Payment */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Metode Pembayaran</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(paymentGroups).map(([group, methods]) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group}</p>
                  <div className="space-y-1.5">
                    {methods.map(m => {
                      const Icon = m.icon
                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedPayment(m.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            selectedPayment === m.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">{m.name}</span>
                          {selectedPayment === m.id && <div className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Voucher */}
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary shrink-0" />
                  <Input placeholder="Kode Voucher" value={voucherCode} onChange={e => setVoucherCode(e.target.value)} className="h-9 text-xs" />
                  <Button variant="outline" size="sm" className="h-9 text-xs font-semibold shrink-0 px-4">Pakai</Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-border/60">
              <CardHeader className="pb-3"><CardTitle className="text-base">Ringkasan Pembayaran</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Produk</span>
                  <span className="font-medium">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Ongkir</span>
                  <span className="font-medium">{fmt(totalShipping)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biaya Layanan</span>
                  <span className="font-medium">{fmt(serviceFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-bold">Total Pembayaran</span>
                  <span className="text-lg font-bold text-primary">{fmt(grandTotal)}</span>
                </div>

                <Button className="w-full h-11 font-bold text-sm" onClick={handleCheckout} disabled={isProcessing}>
                  {isProcessing ? "Memproses..." : "Bayar Sekarang"}
                </Button>

                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                  Dengan menekan tombol di atas, kamu menyetujui <span className="text-primary font-medium">Syarat & Ketentuan</span> KiriMart
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Pembayaran aman & terenkripsi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

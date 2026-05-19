"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Truck, ShieldCheck, Tag, Clock, Package, Loader2, AlertCircle, ChevronRight, ArrowLeft, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import { getCheckoutData, getPlatformFeeConfig } from "@/actions/public/checkout.actions"
import { validateVoucherCode } from "@/actions/public/voucher.actions"
import { calculateCommission } from "@/lib/platform-fee"
import Image from "next/image"
import Link from "next/link"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

// ============================================
// CHECKOUT VIEW COMPONENT
// ============================================

export function CheckoutView() {
  const router = useRouter()

  // Fetch data checkout dari server (cart items + alamat + ongkir)
  const { data: queryData, isLoading, isError, refetch } = useQuery({
    queryKey: ["checkout-data"],
    queryFn: getCheckoutData,
  })

  // Fetch platform fee config (komisi & biaya layanan)
  const { data: feeConfigData } = useQuery({
    queryKey: ["platform-fee-config"],
    queryFn: getPlatformFeeConfig,
  })
  const commissionTiers = feeConfigData?.data?.commissionTiers || []

  const checkoutStores = queryData?.data?.stores || []
  const userAddresses = queryData?.data?.addresses || []
  const defaultAddressId = queryData?.data?.selectedAddressId || null

  // State
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [selectedShipping, setSelectedShipping] = useState({})
  const [notes, setNotes] = useState({})
  const [voucherCode, setVoucherCode] = useState("")
  const [appliedVouchers, setAppliedVouchers] = useState([]) // Max 2 (1 Global + 1 Store)

  // Payment state
  const [isProcessing, setIsProcessing] = useState(false)
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false)

  // Set initial selected address & shipping ketika data pertama kali dimuat
  useEffect(() => {
    if (defaultAddressId && !selectedAddressId) {
      setSelectedAddressId(defaultAddressId)
    }
  }, [defaultAddressId, selectedAddressId])

  useEffect(() => {
    if (checkoutStores.length > 0 && Object.keys(selectedShipping).length === 0) {
      const init = {}
      checkoutStores.forEach(s => {
        if (s.shipping?.[0]) init[s.id] = s.shipping[0].id
      })
      setSelectedShipping(init)
    }
  }, [checkoutStores, selectedShipping])

  // Ambil alamat terpilih
  const address = userAddresses.find(a => a.id === selectedAddressId) || userAddresses[0] || null

  // Calculate totals
  const subtotal = checkoutStores.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.price * i.qty, 0), 0)
  const totalShipping = checkoutStores.reduce((sum, s) => {
    const ship = s.shipping?.find(sh => sh.id === selectedShipping[s.id])
    return sum + (ship?.price || 0)
  }, 0)
  // Hitung biaya layanan (komisi platform saja — biaya PG dihitung di halaman payment method)
  const serviceFee = checkoutStores.reduce((sum, store) => {
    const storeSubtotal = store.items.reduce((s, i) => s + i.price * i.qty, 0)
    return sum + calculateCommission(storeSubtotal, commissionTiers)
  }, 0)

  // Total Diskon dari Vouchers
  const totalDiscount = appliedVouchers.reduce((sum, v) => sum + v.discountAmount, 0)
  
  // Grand total di halaman ini belum termasuk biaya PG (dihitung di halaman berikutnya)
  const grandTotal = Math.max(0, subtotal + totalShipping + serviceFee - totalDiscount)

  // Checkout Data State (untuk mempermudah passing ke server)
  const currentCheckoutState = {
    stores: checkoutStores.map(store => ({
      ...store,
      selectedShipping: store.shipping?.find(s => s.id === selectedShipping[store.id]) || null,
    }))
  }

  // ============================================
  // VOUCHER LOGIC
  // ============================================

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return

    setIsApplyingVoucher(true)
    try {
      const res = await validateVoucherCode(voucherCode.trim(), currentCheckoutState)
      
      if (!res.success) {
        toast.error(res.error)
        setIsApplyingVoucher(false)
        return
      }

      const newVoucher = res.data
      
      // Slotting Logic: Max 1 Global + 1 Store. (Tidak bisa 2 Store / 2 Global)
      let newApplied = [...appliedVouchers]

      if (newVoucher.voucher.isGlobal) {
        // Replace existing global voucher if any
        newApplied = newApplied.filter(v => !v.voucher.isGlobal)
        newApplied.push(newVoucher)
        toast.success("Voucher platform berhasil dipasang!")
      } else {
        // Replace existing store voucher if any
        newApplied = newApplied.filter(v => v.voucher.isGlobal)
        newApplied.push(newVoucher)
        toast.success("Voucher toko berhasil dipasang!")
      }

      setAppliedVouchers(newApplied)
      setVoucherCode("")
    } catch (error) {
      toast.error("Terjadi kesalahan saat memvalidasi voucher.")
    } finally {
      setIsApplyingVoucher(false)
    }
  }

  const handleRemoveVoucher = (voucherCodeToRemove) => {
    setAppliedVouchers(prev => prev.filter(v => v.voucher.code !== voucherCodeToRemove))
    toast.success("Voucher dilepas.")
  }

  // Open payment method selection page
  const handleCheckout = () => {
    if (!address) {
      toast.error("Tambahkan alamat pengiriman terlebih dahulu.")
      return
    }
    setIsProcessing(true)
    router.push("/checkout/payment")
  }

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Memuat data checkout...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-16 text-center space-y-4">
        <p className="text-red-500 font-semibold">Gagal memuat data checkout.</p>
        <Button onClick={() => refetch()} variant="outline">Coba Lagi</Button>
      </div>
    )
  }

  // ============================================
  // EMPTY STATE (tidak ada barang untuk di-checkout)
  // ============================================
  if (checkoutStores.length === 0) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-16 max-w-4xl text-center space-y-4">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
        <h2 className="text-xl font-bold">Tidak Ada Barang untuk Checkout</h2>
        <p className="text-sm text-muted-foreground">Pilih barang dari keranjang terlebih dahulu, atau keranjang Anda mungkin kosong.</p>
        <Button asChild><Link href="/cart">Kembali ke Keranjang</Link></Button>
      </div>
    )
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Checkout</h1>
      </div>

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
                {userAddresses.length > 1 && (
                  <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold h-7">Ganti Alamat</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {address ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{address.recipientName || "Penerima"}</span>
                    <span className="text-sm text-muted-foreground">{address.recipientPhone || "-"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{address.detailAddress} {address.zipcode && `(${address.zipcode})`}</p>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">Belum ada alamat pengiriman.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/user/addresses">Tambah Alamat</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Store Orders */}
          {checkoutStores.map((store, sIdx) => (
            <Card key={store.id} className="border-border/60">
              <CardHeader className="pb-3 px-4 pt-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-white border shrink-0 relative">
                    {store.logo ? (
                      <Image src={store.logo} alt={store.name} fill unoptimized className="object-contain" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px]">🏪</div>
                    )}
                  </div>
                  <span className="text-sm font-bold">{store.name}</span>
                  {store.isStar && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[9px] font-bold px-1.5 py-0 h-4 border-none">Star</Badge>}
                  <span className="text-[10px] text-muted-foreground">Pesanan {sIdx + 1}</span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Items */}
                <div className="space-y-3">
                  {store.items.map(item => (
                    <div key={item.cartItemId} className="flex gap-3">
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted border shrink-0 relative">
                        {item.img ? (
                          <Image src={item.img} alt={item.name} fill unoptimized className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                        {item.variant && <p className="text-xs text-muted-foreground mt-0.5">{item.variant}</p>}
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
                    {store.shipping?.map(ship => (
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

          {/* Payment Info — Powered by Midtrans */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Metode Pembayaran</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/60">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Midtrans Payment Gateway</p>
                  <p className="text-xs text-muted-foreground">
                    Transfer Bank, GoPay, QRIS, ShopeePay, Kartu Kredit & lainnya
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">Secure</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 px-1">
                Pilih metode pembayaran setelah menekan tombol &quot;Bayar Sekarang&quot;
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Voucher */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary shrink-0" />
                  <Input 
                    placeholder="Kode Voucher" 
                    value={voucherCode} 
                    onChange={e => setVoucherCode(e.target.value.toUpperCase())} 
                    className="h-9 text-xs uppercase" 
                    onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 text-xs font-semibold shrink-0 px-4"
                    onClick={handleApplyVoucher}
                    disabled={isApplyingVoucher || !voucherCode.trim()}
                  >
                    {isApplyingVoucher ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pakai"}
                  </Button>
                </div>

                {appliedVouchers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground">Voucher Terpakai:</p>
                    {appliedVouchers.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-primary truncate">{v.voucher.code}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {v.voucher.isGlobal ? "Voucher Platform" : "Voucher Toko"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-green-600">-{fmt(v.discountAmount)}</span>
                          <button 
                            onClick={() => handleRemoveVoucher(v.voucher.code)}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                            title="Hapus Voucher"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <span className="text-muted-foreground">Biaya Layanan & Penanganan</span>
                  <span className="font-medium">{fmt(serviceFee)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Diskon Voucher</span>
                    <span className="font-bold text-green-600">-{fmt(totalDiscount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-bold">Total Pembayaran</span>
                  <span className="text-lg font-bold text-primary">{fmt(grandTotal)}</span>
                </div>

                <Button
                  className="w-full h-11 font-bold text-sm"
                  onClick={handleCheckout}
                  disabled={isProcessing || !address}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Lanjut ke Pembayaran →"
                  )}
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

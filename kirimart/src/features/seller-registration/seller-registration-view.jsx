"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Store, CheckCircle2, Zap, Shield, TrendingUp, Loader2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { toast } from "sonner"
import { createSellerPayment } from "@/actions/protected/seller-registration.actions"

const SELLER_FEE = 50000
const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const BENEFITS = [
  { icon: Store, title: "Toko Online Profesional", desc: "Miliki toko dengan halaman khusus dan branding sendiri" },
  { icon: TrendingUp, title: "Jangkau Jutaan Pembeli", desc: "Produk Anda tampil di marketplace Kawanbelanja" },
  { icon: Shield, title: "Pembayaran Aman", desc: "Transaksi dijamin aman melalui payment gateway terpercaya" },
  { icon: Zap, title: "Dashboard Lengkap", desc: "Kelola produk, pesanan, dan analitik penjualan" },
]

export function SellerRegistrationView() {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleOpenDrawer = () => setDrawerOpen(true)

  const handleConfirmPayment = async () => {
    setIsProcessing(true)

    try {
      const result = await createSellerPayment()

      if (!result.success) {
        toast.error(result.error || "Gagal membuat pembayaran")
        setIsProcessing(false)
        return
      }

      setDrawerOpen(false)

      if (typeof window.snap === 'undefined') {
        toast.error("Sistem pembayaran sedang dimuat. Silakan coba lagi.")
        setIsProcessing(false)
        return
      }

      window.snap.pay(result.snapToken, {
        onSuccess: () => {
          toast.success("Pembayaran berhasil! Anda sekarang menjadi seller.")
          router.push("/create-store")
        },
        onPending: () => {
          router.push(`/checkout/status?status=unfinish&order_id=${result.orderId}`)
        },
        onError: () => {
          router.push(`/checkout/status?status=error&order_id=${result.orderId}`)
        },
        onClose: () => {
          toast.info("Pembayaran belum selesai. Silakan coba lagi.")
          setIsProcessing(false)
        },
      })
    } catch (error) {
      console.error("[SELLER_REG] Error:", error)
      toast.error("Terjadi kesalahan.")
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-16 max-w-2xl">
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Buka Toko di Kawanbelanja</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Mulai berjualan dan jangkau jutaan pembeli dengan biaya pendaftaran yang terjangkau
        </p>
      </div>

      {/* Benefits */}
      <Card className="border-border/60 mb-6">
        <CardContent className="p-6">
          <h2 className="text-sm font-bold mb-4">Yang Anda Dapatkan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="border-primary/30 bg-primary/5 mb-6">
        <CardContent className="p-6 text-center space-y-4">
          <Badge variant="default" className="text-xs">Sekali Bayar</Badge>
          <div>
            <p className="text-3xl font-black text-primary">{fmt(SELLER_FEE)}</p>
            <p className="text-xs text-muted-foreground mt-1">Biaya pendaftaran seller — akses selamanya</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Tidak ada biaya bulanan</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Akses dashboard seller lengkap</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Upload produk tanpa batas</div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button
        className="w-full h-12 rounded-xl font-bold text-sm"
        onClick={handleOpenDrawer}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
        ) : (
          <><Store className="mr-2 h-4 w-4" /> Bayar & Mulai Jualan</>
        )}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground mt-3">
        Dengan mendaftar, Anda menyetujui <span className="text-primary font-medium">Syarat & Ketentuan Seller</span>
      </p>

      {/* Drawer Konfirmasi */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="text-lg">Konfirmasi Pendaftaran Seller</DrawerTitle>
              <DrawerDescription>Anda akan melakukan pembayaran untuk menjadi seller</DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-2 space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biaya Pendaftaran Seller</span>
                  <span className="font-bold">{fmt(SELLER_FEE)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-bold text-primary">{fmt(SELLER_FEE)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                <CreditCard className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Midtrans Payment Gateway</p>
                  <p className="text-[11px] text-muted-foreground">Transfer Bank, GoPay, QRIS, ShopeePay & lainnya</p>
                </div>
              </div>
            </div>

            <DrawerFooter>
              <Button onClick={handleConfirmPayment} disabled={isProcessing} className="w-full h-11 font-bold">
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membuat Transaksi...</>
                ) : (
                  `Bayar ${fmt(SELLER_FEE)}`
                )}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full" disabled={isProcessing}>Batal</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

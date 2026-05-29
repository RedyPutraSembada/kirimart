"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { CheckCircle2, Clock, XCircle, ArrowLeft, ShoppingBag, Copy, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Suspense } from "react"
import { toast } from "sonner"
import { getPaymentByOrderId } from "@/actions/public/payment/payment.actions"
import { pixelPurchase } from "@/lib/pixel"

const STATUS_CONFIG = {
  finish: {
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    ringColor: "ring-emerald-500/20",
    title: "Pembayaran Berhasil!",
    description: "Pesanan Anda sedang diproses oleh penjual. Anda akan menerima notifikasi ketika pesanan dikirim.",
    badge: "Berhasil",
    badgeVariant: "default",
  },
  unfinish: {
    icon: Clock,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
    ringColor: "ring-amber-500/20",
    title: "Menunggu Pembayaran",
    description: "Anda belum menyelesaikan pembayaran. Silakan selesaikan pembayaran sebelum batas waktu berakhir.",
    badge: "Menunggu",
    badgeVariant: "secondary",
  },
  error: {
    icon: XCircle,
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
    ringColor: "ring-red-500/20",
    title: "Pembayaran Gagal",
    description: "Terjadi kesalahan saat memproses pembayaran Anda. Silakan coba lagi atau gunakan metode pembayaran lain.",
    badge: "Gagal",
    badgeVariant: "destructive",
  },
}

function CheckoutStatusContent() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const status = searchParams.get("status") || "unfinish"
  const orderId = searchParams.get("order_id") || "-"

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unfinish
  const Icon = config.icon

  // Invalidate cache yang berhubungan dengan pesanan dan cart saat halaman status dimuat
  useEffect(() => {
    if (status === "finish") {
      queryClient.invalidateQueries({ queryKey: ["cart-summary"] })
    }
    // Selalu invalidate my-transactions karena ada pesanan baru (entah pending, finish, error)
    queryClient.invalidateQueries({ queryKey: ["my-transactions"] })
  }, [status, queryClient])

  // Fetch payment data to get total value and items for Purchase tracking
  const { data: paymentQuery } = useQuery({
    queryKey: ["payment-status-detail", orderId],
    queryFn: () => getPaymentByOrderId(orderId),
    enabled: status === "finish" && orderId !== "-",
    staleTime: Infinity,
  })
  
  const payment = paymentQuery?.data

  const [hasTrackedPurchase, setHasTrackedPurchase] = useState(false)

  useEffect(() => {
    if (status === "finish" && payment && !hasTrackedPurchase) {
      const orders = payment.orders || []
      
      let grandTotal = payment.totalAmount || 0
      let totalItemsCount = 0
      let allItems = []
      
      orders.forEach(order => {
        const storeTotal = order.grandTotal || 0
        const storeItemsCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0
        totalItemsCount += storeItemsCount
        
        const currentItems = order.items?.map(i => ({ id: i.productId })) || []
        allItems = [...allItems, ...currentItems]
        
        // Track for individual store pixels
        if (order.store?.metaPixelId) {
          pixelPurchase({
            orderId: order.id,
            totalValue: storeTotal,
            items: currentItems
          }, order.store.metaPixelId)
        }
      })
      
      // Track for master pixel
      pixelPurchase({
        orderId: orderId,
        totalValue: grandTotal,
        items: allItems
      })
      
      setHasTrackedPurchase(true)
    }
  }, [status, payment, hasTrackedPurchase])

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId)
    toast.success("Order ID disalin!")
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-16 max-w-lg">
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-6 md:p-8 text-center space-y-6">
          {/* Icon */}
          <div className={`mx-auto h-20 w-20 rounded-full ${config.bgColor} ring-4 ${config.ringColor} flex items-center justify-center`}>
            <Icon className={`h-10 w-10 ${config.iconColor}`} />
          </div>

          {/* Status Badge */}
          <Badge variant={config.badgeVariant} className="text-xs">
            {config.badge}
          </Badge>

          {/* Title & Description */}
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold">{config.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
          </div>

          {/* Order ID */}
          {orderId !== "-" && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Order ID</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-sm font-mono font-bold">{orderId}</code>
                <button onClick={handleCopyOrderId} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {status === "error" && (
              <Button asChild className="w-full">
                <Link href="/checkout">
                  Coba Lagi
                </Link>
              </Button>
            )}

            {status === "unfinish" && orderId !== "-" && (
              <Button asChild className="w-full">
                <Link href={`/checkout/payment/instruction?order_id=${orderId}`}>
                  Lihat Instruksi Pembayaran
                </Link>
              </Button>
            )}

            {status === "finish" && (
              <Button asChild className="w-full">
                <Link href="/user-dashboard/orders">
                  <Package className="mr-2 h-4 w-4" />
                  Lihat Pesanan Saya
                </Link>
              </Button>
            )}

            <Button variant={status === "finish" ? "outline" : "default"} asChild className="w-full">
              <Link href="/">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Lanjut Belanja
              </Link>
            </Button>

            <Button variant="ghost" asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Beranda
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutStatusPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Memuat status pembayaran...</p>
      </div>
    }>
      <CheckoutStatusContent />
    </Suspense>
  )
}
